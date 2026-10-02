import * as THREE from 'three';
import { NPC } from './npc.js';
import * as NM from './npcModels.js';
import * as CM from './creatureModels.js';
import { NPC_INFO } from '../quests/data.js';
import { cemToWorld, SWAMP, WATER_LEVEL, FOUNTAIN } from '../world/layout.js';
import { RNG } from '../util/rng.js';
import { TAU, dampAngle } from '../util/math.js';
import { LAYER_FX } from '../render/postfx.js';

const rng = new RNG(1952);

NPC_INFO.zumbi = {
  name: 'Zé Zumbi', title: 'Maratonista (desde 1952)', level: 3,
  greet: 'Um, dois... um, dois... Não posso parar! Se eu parar eu desmonto! ...De novo.',
  barks: ['Faltam só 42 km!', 'Alguém viu meu dedão? Caiu na última volta.', 'Correr faz bem pro coração. O meu parou em 1952, mas faz bem.', 'Ufa... ufa...', 'Recorde pessoal: 70 anos sem parar!'],
  gossip: [{ text: 'Por que você corre tanto?', reply: 'Eu me inscrevi numa maratona em 1952. Ninguém me avisou que tinha acabado. Agora é questão de honra.' }],
};

/** PNJs, bichos e fantasminhas que só enfeitam o mundo */
export class AmbientLife {
  constructor(game) {
    this.game = game;
    const scene = game.scene, W = game.world;
    // Zé Zumbi correndo em volta da fonte
    const zr = NM.createZombie();
    this.zombie = new NPC(game, 'zumbi', zr, { x: FOUNTAIN.x + 10.5, z: FOUNTAIN.z, yaw: 0 }, { canTurn: false });
    this.zombie.ang = 0;
    this.zombie.moveSpeed = 2.1;
    // fantasminhas no cemitério
    this.ghosts = [];
    for (let i = 0; i < 4; i++) {
      const r = NM.createGhost('Fantasminha');
      r.letter.visible = false;
      r.root.scale.setScalar(0.55 + rng.next() * 0.2);
      for (const m of r.meshes) m.layers.set(LAYER_FX);
      scene.add(r.root);
      this.ghosts.push({ rig: r, a: rng.range(0, TAU), sp: rng.range(0.12, 0.25) * rng.sign(), rx: rng.range(6, 16), rz: rng.range(4, 11), ph: rng.range(0, TAU) });
    }
    // sapos nas vitórias-régias
    this.frogs = [];
    for (let i = 0, tries = 0; i < 7 && tries < 400; tries++) {
      const a = rng.range(0, TAU), d = Math.sqrt(rng.next()) * SWAMP.r * 0.9;
      const x = SWAMP.x + Math.cos(a) * d, z = SWAMP.z + Math.sin(a) * d;
      const h = W.groundHeight(x, z);
      if (h > -0.1 && h < 0.4) continue;
      const r = CM.createFrog(false);
      r.root.scale.setScalar(0.55);
      r.root.position.set(x, Math.max(h, WATER_LEVEL) + 0.02, z);
      r.root.rotation.y = rng.range(0, TAU);
      scene.add(r.root);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12, 0.3, TAU - 0.6).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: '#4a7a3a' }));
      pad.position.copy(r.root.position).y -= 0.015;
      scene.add(pad);
      this.frogs.push({ rig: r, base: r.root.position.y, t: rng.range(1, 6) });
      i++;
    }
    // coruja no bosque
    this.owls = [];
    for (const [x, z, y] of [[-84, 92, 4.2], [-66, 108, 3.6]]) {
      const r = NM.createOwl();
      const gy = W.groundHeight(x, z);
      r.root.position.set(x, gy + y, z);
      r.root.rotation.y = rng.range(0, TAU);
      scene.add(r.root);
      // galho onde ela pousa
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 5).rotateZ(Math.PI / 2), new THREE.MeshToonMaterial({ color: '#2f2733' }));
      branch.position.set(x, gy + y - 0.02, z);
      branch.rotation.y = r.root.rotation.y + Math.PI / 2;
      scene.add(branch);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, y + 0.3, 6), new THREE.MeshToonMaterial({ color: '#2f2733' }));
      post.position.set(x + Math.cos(r.root.rotation.y) * 0.6, gy + (y + 0.3) / 2 - 0.3, z - Math.sin(r.root.rotation.y) * 0.6);
      scene.add(post);
      game.world.colliders.addCircle(post.position.x, post.position.z, 0.25, { y0: gy - 1, y1: gy + y + 0.6 });
      this.owls.push(r);
    }
    // aranhas penduradas
    this.spiders = [];
    const spots = [[-74, 90], [-90, 104], [-70, 112], [62, -72], [86, -58], [-100, 88]];
    const threadMat = new THREE.LineBasicMaterial({ color: '#c8c8d8', transparent: true, opacity: 0.6 });
    for (const [x, z] of spots) {
      const gy = W.groundHeight(x, z);
      const top = gy + rng.range(4.5, 6);
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshToonMaterial({ color: '#16121c' }));
      body.scale.set(1, 0.8, 1.2);
      g.add(body);
      for (let k = 0; k < 8; k++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.26, 3), body.material);
        const s = k < 4 ? 1 : -1, i = k % 4;
        leg.position.set(s * 0.12, -0.02, -0.09 + i * 0.06);
        leg.rotation.z = s * (1.1 - i * 0.1);
        g.add(leg);
      }
      const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), new THREE.MeshBasicMaterial({ color: '#ff3a3a' }));
      eyes.position.set(0, 0.04, 0.12);
      g.add(eyes);
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]);
      const line = new THREE.Line(geo, threadMat);
      line.layers.set(LAYER_FX);
      scene.add(g, line);
      this.spiders.push({ g, line, x, z, top, ph: rng.range(0, TAU), len: rng.range(1.5, 3.2) });
    }
  }

  update(dt, t) {
    const g = this.game;
    // zumbi: trote lento em volta da fonte
    const zb = this.zombie;
    if (!zb.talking) {
      zb.ang += dt * 0.19;
      const r = 10.5;
      zb.pos.set(FOUNTAIN.x + Math.cos(zb.ang) * r, 0, FOUNTAIN.z + Math.sin(zb.ang) * r);
      zb.pos.y = g.world.groundHeight(zb.pos.x, zb.pos.z);
      zb.homeYaw = Math.atan2(-Math.sin(zb.ang), Math.cos(zb.ang));
      zb.yaw = dampAngle(zb.yaw, zb.homeYaw, 6, dt);
      zb.rig.root.position.copy(zb.pos);
      zb.rig.root.rotation.y = zb.yaw;
    } else {
      const p = g.player.pos;
      zb.yaw = dampAngle(zb.yaw, Math.atan2(p.x - zb.pos.x, p.z - zb.pos.z), 5, dt);
      zb.rig.root.rotation.y = zb.yaw;
    }

    // fantasminhas
    for (const gh of this.ghosts) {
      gh.a += dt * gh.sp;
      const [x, z] = cemToWorld(Math.cos(gh.a) * gh.rx, Math.sin(gh.a * 1.3 + gh.ph) * gh.rz);
      const y = g.world.groundHeight(x, z) + 0.4 + Math.sin(t * 1.2 + gh.ph) * 0.3;
      const r = gh.rig;
      const dx = x - r.root.position.x, dz = z - r.root.position.z;
      if (dx || dz) r.root.rotation.y = dampAngle(r.root.rotation.y, Math.atan2(dx, dz), 3, dt);
      r.root.position.set(x, y, z);
      r.root.visible = g.camera.position.distanceTo(r.root.position) < 80;
      if (r.root.visible) r.animate(dt, {});
    }
    // (os sapos pulam, coaxam e brigam em combat/: são criaturas neutras)
    for (const o of this.owls) if (g.camera.position.distanceTo(o.root.position) < 70) o.animate(dt, {});
    // aranhas sobem e descem
    for (const s of this.spiders) {
      const y = s.top - s.len * (0.5 + 0.5 * Math.sin(t * 0.5 + s.ph));
      s.g.position.set(s.x, y, s.z);
      s.g.rotation.y = Math.sin(t * 0.7 + s.ph) * 0.8;
      const pa = s.line.geometry.attributes.position;
      pa.setXYZ(0, s.x, s.top, s.z);
      pa.setXYZ(1, s.x, y + 0.08, s.z);
      pa.needsUpdate = true;
    }
  }
}
