import * as THREE from 'three';
import { Interactable } from '../quests/interact.js';
import { NPC_INFO } from '../quests/data.js';
import { LAYER_FX } from '../render/postfx.js';
import { damp, dampAngle, TAU } from '../util/math.js';
import { RNG } from '../util/rng.js';

const rng = new RNG(4040);

/** textura de brilho de item de missão (estrela de 4 pontas) */
let sparkleTex = null;
export function getSparkleTexture() {
  if (sparkleTex) return sparkleTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,250,210,1)');
  grd.addColorStop(0.15, 'rgba(255,220,120,0.6)');
  grd.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,255,230,0.95)';
  for (const [w, h] of [[6, S * 0.46], [S * 0.46, 6]]) {
    g.beginPath();
    g.ellipse(S / 2, S / 2, w, h, 0, 0, TAU);
    g.fill();
  }
  sparkleTex = new THREE.CanvasTexture(c);
  sparkleTex.colorSpace = THREE.SRGBColorSpace;
  return sparkleTex;
}

export function makeSparkle(scale = 1.2) {
  const m = new THREE.SpriteMaterial({ map: getSparkleTexture(), color: '#ffe8a0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  s.layers.set(LAYER_FX);
  s.renderOrder = 6;
  return s;
}

// ---------------------------------------------------------------------------
export class NPC {
  constructor(game, id, rig, spot, opts = {}) {
    this.game = game;
    this.id = id;
    this.info = NPC_INFO[id] ?? { name: rig.root.name, title: '', level: 1, barks: [] };
    this.rig = rig;
    this.pos = new THREE.Vector3(spot.x, game.world.groundHeight(spot.x, spot.z), spot.z);
    this.homeYaw = spot.yaw ?? 0;
    this.yaw = this.homeYaw;
    this.canTurn = opts.canTurn ?? !rig.fixedPose;
    this.talking = false;
    this.action = null;
    this.barkT = rng.range(6, 20);
    rig.root.position.copy(this.pos);
    rig.root.rotation.y = this.yaw;
    game.scene.add(rig.root);
    this.inter = game.interaction.add(
      new Interactable({
        kind: 'npc', name: this.info.name, subtitle: this.info.title, level: this.info.level, reaction: 'friendly',
        pos: this.pos, radius: 0.75, height: rig.height ?? 2, range: 5, cursor: 'talk', rig,
        npc: this, hint: 'Clique com o botão direito para conversar',
        onInteract: (g) => g.dialog.openNPC(this),
      })
    );
  }

  say(text, dur = 5) {
    this.game.ui?.bubble(this, text, dur);
    this.game.ui?.chat(`[${this.info.name}] diz: ${text}`, 'say');
  }

  update(dt) {
    const g = this.game;
    const p = g.player.pos;
    const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    const camD = g.camera.position.distanceTo(this.pos);
    this.rig.root.visible = camD < 110;
    if (!this.rig.root.visible) return;
    this.rig.lookTarget = d < 10 && !this.rig.fixedPose ? _t.set(p.x, p.y + 1.5, p.z) : null;
    if (this.canTurn) {
      const face = this.talking || (d < 6 && this.game.interaction.target === this.inter);
      const ty = face ? Math.atan2(p.x - this.pos.x, p.z - this.pos.z) : this.homeYaw;
      this.yaw = dampAngle(this.yaw, ty, 4, dt);
      this.rig.root.rotation.y = this.yaw;
    }
    this.rig.animate(dt, { speed: this.talking ? 0 : this.moveSpeed ?? 0, action: this.talking ? 'talk' : this.action });
    if (d < 16 && !this.talking) {
      this.barkT -= dt;
      if (this.barkT < 0) {
        this.barkT = rng.range(22, 45);
        const barks = this.barkList ? this.barkList() : this.info.barks;
        if (barks?.length) this.say(rng.pick(barks), 4.5);
      }
    }
  }
}
const _t = new THREE.Vector3();

// ---------------------------------------------------------------------------
/** criatura que anda no chão (gato, abóbora, pet) */
export class Walker {
  constructor(game, rig, x, z, yaw = 0) {
    this.game = game;
    this.rig = rig;
    this.pos = new THREE.Vector3(x, game.world.groundHeight(x, z), z);
    this.yaw = yaw;
    this.speed = 0;
    this.target = null;
    rig.root.position.copy(this.pos);
    game.scene.add(rig.root);
  }
  moveToward(tx, tz, maxSpeed, dt, stopDist = 0.3) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < stopDist) {
      this.speed = damp(this.speed, 0, 8, dt);
      return true;
    }
    this.speed = damp(this.speed, maxSpeed, 6, dt);
    const step = Math.min(d, this.speed * dt);
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 10, dt);
    return false;
  }
  sync(dt, extra = {}) {
    this.pos.y = this.game.world.groundHeight(this.pos.x, this.pos.z);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
    this.rig.animate(dt, { speed: this.speed, ...extra });
  }
}

// ---------------------------------------------------------------------------
/** Item de missão no chão: brilha só quando a missão precisa dele. */
export class Pickup {
  constructor(game, key, mesh, x, z, opts = {}) {
    this.game = game;
    this.key = key;
    this.mesh = mesh;
    // procura chão seco por perto (nada de item debaixo d'água)
    const W = game.world;
    let bx = x, bz = z;
    if (W.groundHeight(x, z) < 0.12) {
      let best = null;
      for (let r = 1; r < 14 && !best; r += 1) {
        for (let a = 0; a < 12; a++) {
          const tx = x + Math.cos((a / 12) * TAU) * r, tz = z + Math.sin((a / 12) * TAU) * r;
          if (W.groundHeight(tx, tz) > 0.15 && !W.colliders.overlaps(tx, tz, 0.4)) {
            best = [tx, tz];
            break;
          }
        }
      }
      if (best) [bx, bz] = best;
    }
    this.home = new THREE.Vector3(bx, Math.max(W.groundHeight(bx, bz), 0.05) + (opts.lift ?? 0.2), bz);
    this.pos = this.home.clone();
    this.taken = false;
    this.anim = 0;
    this.nightOnly = opts.nightOnly ?? false;
    this.wander = opts.wander ?? 0;
    this.phase = rng.range(0, TAU);
    this.group = new THREE.Group();
    this.group.add(mesh);
    this.sparkle = makeSparkle(opts.sparkle ?? 1.1);
    this.sparkle.position.y = 0.2;
    this.group.add(this.sparkle);
    this.group.position.copy(this.pos);
    mesh.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    game.scene.add(this.group);
    this.name = opts.name ?? 'Item';
    this.inter = game.interaction.add(
      new Interactable({
        kind: 'item', name: this.name, subtitle: 'Item de missão', reaction: 'neutral', pos: this.pos, radius: 0.55, height: 0.9,
        range: 3.2, cursor: 'loot', selectable: false, enabled: () => this.available(), hint: 'Clique com o botão direito para pegar',
        onInteract: () => this.collect(),
      })
    );
    this.onCollect = opts.onCollect;
  }
  available() {
    if (this.taken || this.anim > 0) return false;
    if (this.nightOnly && !this.game.dayNight.isNight) return false;
    return this.game.progress.wants(this.key);
  }
  reset() {
    this.taken = false;
    this.anim = 0;
    this.pos.copy(this.home);
    this.mesh.scale.setScalar(1);
  }
  collect() {
    this.anim = 0.001;
    this.game.audio?.sfx('loot');
    this.onCollect?.(this);
  }
  update(dt, t) {
    const vis = this.available() || this.anim > 0;
    this.group.visible = vis;
    if (!vis) return;
    if (this.wander) {
      const a = t * 0.6 + this.phase;
      this.pos.set(this.home.x + Math.cos(a) * this.wander, this.home.y + 1.0 + Math.sin(t * 1.7 + this.phase) * 0.4, this.home.z + Math.sin(a * 1.3) * this.wander);
    }
    if (this.anim > 0) {
      // voa para o jogador e some
      this.anim += dt * 2.8;
      const p = this.game.player.pos;
      this.pos.lerp(_t.set(p.x, p.y + 1.2, p.z), Math.min(1, dt * 9));
      const s = Math.max(0, 1 - this.anim);
      this.mesh.scale.setScalar(s);
      this.sparkle.scale.setScalar(1.1 * s + 0.01);
      if (this.anim >= 1) {
        this.taken = true;
        this.anim = 0;
        this.game.progress.progress(this.key);
      }
    } else {
      this.mesh.rotation.y += dt * 1.2;
      this.mesh.position.y = Math.sin(t * 2.2 + this.phase) * 0.06;
      const pulse = 0.9 + Math.sin(t * 4 + this.phase) * 0.25;
      this.sparkle.scale.setScalar(1.1 * pulse);
      this.sparkle.material.rotation = t * 0.8 + this.phase;
    }
    this.group.position.copy(this.pos);
  }
}
