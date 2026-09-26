import * as THREE from 'three';
import { damp, clamp } from '../util/math.js';
import { toonMat } from '../render/toon.js';

/** Esqueleto simples de grupos (juntas) + animação procedural cartunesca. */
export class Rig {
  constructor(name = 'rig') {
    this.root = new THREE.Group();
    this.root.name = name;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.j = {};
    this.meshes = [];
    this.material = toonMat({ vertexColors: true });
    this.t = Math.random() * 10;
    this.phase = 0;
    this.squashV = 0;
    this.squash = 0;
    this.blinkT = 2 + Math.random() * 3;
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.lookTarget = null;
    this.highlight = 0;
    this._hl = 0;
    this.poseBias = {};
    this.extra = null; // função extra de animação (por personagem)
  }

  joint(name, parent, pos = [0, 0, 0]) {
    const g = new THREE.Group();
    g.position.set(...pos);
    (parent ? this.j[parent] ?? parent : this.body).add(g);
    g.name = name;
    this.j[name] = g;
    return g;
  }

  attach(jointName, geometry, material = this.material, { cast = true } = {}) {
    if (!geometry) return null;
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = cast;
    m.receiveShadow = true;
    const parent = typeof jointName === 'string' ? this.j[jointName] ?? this.body : jointName;
    parent.add(m);
    this.meshes.push(m);
    return m;
  }

  setHighlight(v) {
    this.highlight = v;
  }

  /** squash & stretch ao pousar */
  land(strength = 1) {
    this.squashV -= 5.5 * strength;
  }

  /**
   * s = { speed, back, strafe, air, vy, action, actionT, sit }
   */
  animate(dt, s = {}) {
    this.t += dt;
    const j = this.j;
    const speed = s.speed || 0;
    const moving = speed > 0.25 && !s.air;
    const run = clamp(speed / 6.5, 0, 1.3);
    if (moving) this.phase += dt * (3.2 + speed * 1.05) * (s.back ? -1 : 1);

    const P = {
      legL: 0, legR: 0, legLz: 0, legRz: 0, armL: 0, armR: 0, armLz: 0.14, armRz: -0.14,
      foreL: 0, foreR: 0, torsoX: 0.02, torsoY: 0, torsoZ: 0, headX: 0, headY: 0, headZ: 0, bodyY: 0, bodyZ: 0,
    };
    const ph = this.phase;
    if (moving) {
      const amp = (s.back ? 0.45 : 0.62) * Math.min(1, 0.45 + run);
      P.legL = -Math.sin(ph) * amp;
      P.legR = -P.legL;
      P.armL = Math.sin(ph) * amp * 0.95;
      P.armR = -P.armL;
      P.armLz = 0.2;
      P.armRz = -0.2;
      P.bodyY = Math.abs(Math.cos(ph)) * 0.075 * run;
      P.torsoX = (s.back ? -0.05 : 0.14) * run;
      P.torsoY = Math.sin(ph) * 0.14 * run;
      P.headX = -P.torsoX * 0.6;
      P.headZ = Math.sin(ph) * 0.04;
      if (s.strafe) P.torsoZ = -s.strafe * 0.12;
    } else if (!s.air) {
      const br = Math.sin(this.t * 2.2);
      P.torsoX = 0.03 + br * 0.018;
      P.armLz = 0.16 + br * 0.03;
      P.armRz = -P.armLz;
      P.headX = -br * 0.02;
      P.headZ = Math.sin(this.t * 0.7) * 0.04;
    }
    if (s.air) {
      const up = clamp((s.vy || 0) / 7, -1, 1);
      P.legL = -0.75;
      P.legR = 0.35;
      P.armL = -0.4 - up * 0.6;
      P.armR = -0.2 - up * 0.6;
      P.armLz = 0.7;
      P.armRz = -0.7;
      P.torsoX = 0.1;
      P.headX = -0.15;
    }
    if (s.sit) {
      P.legL = -1.5;
      P.legR = -1.5;
      P.legLz = 0.12;
      P.legRz = -0.12;
      P.bodyY = -0.34;
      P.torsoX = 0.08;
      P.armL = -0.5;
      P.armR = -0.5;
    }
    if (s.mounted) {
      P.legL = -1.2;
      P.legR = -1.2;
      P.legLz = 0.35;
      P.legRz = -0.35;
      P.armL = -0.9;
      P.armR = -0.9;
      P.armLz = 0.05;
      P.armRz = -0.05;
      P.torsoX = 0.25;
      P.headX = -0.2;
      P.bodyY = 0;
    }
    const at = s.actionT || 0;
    switch (s.action) {
      case 'dance': {
        const b = this.t * 7;
        P.armL = -2.6 + Math.sin(b) * 0.5;
        P.armR = -2.6 - Math.sin(b) * 0.5;
        P.armLz = 0.5 + Math.sin(b * 0.5) * 0.4;
        P.armRz = -0.5 + Math.sin(b * 0.5) * 0.4;
        P.legL = Math.max(0, Math.sin(b)) * -0.6;
        P.legR = Math.max(0, -Math.sin(b)) * -0.6;
        P.bodyY = Math.abs(Math.sin(b)) * 0.12;
        P.torsoZ = Math.sin(b * 0.5) * 0.25;
        P.torsoY = Math.sin(b * 0.5) * 0.4;
        P.headZ = -Math.sin(b * 0.5) * 0.3;
        break;
      }
      case 'scare': {
        const k = Math.min(1, at * 6);
        P.armL = -2.2 * k;
        P.armR = -2.2 * k;
        P.armLz = 0.9 * k;
        P.armRz = -0.9 * k;
        P.torsoX = 0.3 * k;
        P.headX = -0.35 * k;
        P.legLz = 0.25 * k;
        P.legRz = -0.25 * k;
        P.bodyY = Math.sin(Math.min(1, at * 3) * Math.PI) * 0.25;
        break;
      }
      case 'cast': {
        const w = Math.sin(this.t * 6);
        P.armL = -1.3 + w * 0.15;
        P.armR = -1.3 - w * 0.15;
        P.armLz = 0.35;
        P.armRz = -0.35;
        P.foreL = -0.6;
        P.foreR = -0.6;
        P.headX = 0.15;
        break;
      }
      case 'talk': {
        const w = Math.sin(this.t * 5.5);
        P.armR = -0.6 + w * 0.25;
        P.armRz = -0.35;
        P.foreR = -0.9;
        P.headX = Math.sin(this.t * 7) * 0.05;
        break;
      }
      case 'wave': {
        P.armR = -2.7;
        P.armRz = -0.3 + Math.sin(this.t * 12) * 0.35;
        break;
      }
      case 'cheer': {
        const b = this.t * 9;
        P.armL = -2.9;
        P.armR = -2.9;
        P.armLz = 0.3 + Math.sin(b) * 0.2;
        P.armRz = -0.3 - Math.sin(b) * 0.2;
        P.bodyY = Math.abs(Math.sin(b * 0.5)) * 0.35;
        break;
      }
      default:
        break;
    }
    for (const [k, v] of Object.entries(this.poseBias)) P[k] += v;

    // olhar para um alvo (PNJs olham o jogador)
    let ly = 0, lp = 0;
    if (this.lookTarget) {
      const wp = this.root.getWorldPosition(_v);
      const dx = this.lookTarget.x - wp.x, dz = this.lookTarget.z - wp.z;
      const ang = Math.atan2(dx, dz) - this.root.rotation.y;
      ly = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -1.1, 1.1);
      lp = clamp(-((this.lookTarget.y ?? wp.y + 1.5) - (wp.y + 1.5)) * 0.05, -0.3, 0.3);
    }
    this.lookYaw = damp(this.lookYaw, ly, 5, dt);
    this.lookPitch = damp(this.lookPitch, lp, 5, dt);

    const k = s.snap ? 40 : 15;
    const set = (joint, axis, v) => {
      if (joint) joint.rotation[axis] = damp(joint.rotation[axis], v, k, dt);
    };
    set(j.legL, 'x', P.legL);
    set(j.legR, 'x', P.legR);
    set(j.legL, 'z', P.legLz);
    set(j.legR, 'z', P.legRz);
    set(j.armL, 'x', P.armL);
    set(j.armR, 'x', P.armR);
    set(j.armL, 'z', P.armLz);
    set(j.armR, 'z', P.armRz);
    set(j.foreL, 'x', P.foreL);
    set(j.foreR, 'x', P.foreR);
    set(j.torso, 'x', P.torsoX);
    set(j.torso, 'y', P.torsoY);
    set(j.torso, 'z', P.torsoZ);
    set(j.head, 'x', P.headX + this.lookPitch);
    set(j.head, 'y', P.headY + this.lookYaw);
    set(j.head, 'z', P.headZ);
    this.body.position.y = damp(this.body.position.y, P.bodyY, k, dt);

    // mola do squash & stretch
    this.squashV += (-this.squash * 90 - this.squashV * 11) * dt;
    this.squash += this.squashV * dt;
    const sq = clamp(this.squash, -0.35, 0.35);
    this.body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);

    // piscar
    if (j.eyes) {
      this.blinkT -= dt;
      let sy = 1;
      if (this.blinkT < 0.12) sy = 0.12;
      if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
      j.eyes.scale.y = damp(j.eyes.scale.y, sy, 40, dt);
    }

    // destaque ao passar o mouse
    this._hl = damp(this._hl, this.highlight, 12, dt);
    const mats = this.extraMats ? [this.material, ...this.extraMats] : [this.material];
    for (const m of mats) {
      if (m.emissive) m.emissive.setScalar(this._hl * 0.09);
      else if (m.uniforms?.uHighlight) m.uniforms.uHighlight.value = this._hl;
    }

    if (this.extra) this.extra(dt, s, this);
  }
}

const _v = new THREE.Vector3();
