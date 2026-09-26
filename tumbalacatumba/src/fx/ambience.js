import * as THREE from 'three';
import { Builder, S } from '../render/builder.js';
import { MAT } from '../render/toon.js';
import { Halos, LightPool } from './lights.js';
import { RNG } from '../util/rng.js';

const BULB_COLORS = ['#ff9a3a', '#b86aff', '#8aff6a', '#ffd84a', '#ff6a8a'];
const FLAG_COLORS = ['#d8662a', '#5a2a6a', '#1e1a22', '#c9a24a'];

export class Ambience {
  constructor(game, populated) {
    this.game = game;
    const scene = game.scene;
    const rng = new RNG(31);
    this.halos = new Halos(scene);
    this.pool = new LightPool(scene, 4);
    for (const p of populated.lampPositions) {
      this.halos.add(p, 3.2, '#ffc46b');
      this.pool.sources.push({ x: p.x, y: p.y, z: p.z, i: 1 });
    }
    for (const l of populated.lights) {
      if (l.candle) this.halos.add(new THREE.Vector3(l.x, l.y, l.z), 0.8, '#ffb04a');
      else if (l.lantern) {
        this.halos.add(new THREE.Vector3(l.x, l.y, l.z), 2.2, l.color ?? '#ffc46b');
        this.pool.sources.push({ x: l.x, y: l.y + 0.3, z: l.z, i: 0.8 });
      } else if (l.r > 4 && l.r < 5 && l.y) this.halos.add(new THREE.Vector3(l.x, l.y, l.z), 1.3, '#ffb35c');
    }
    // varal de luzinhas e bandeirolas na praça
    const cable = new Builder();
    const bulbs = new Builder();
    for (const s of populated.stringLights ?? []) {
      const pts = [];
      const N = 24;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        pts.push(new THREE.Vector3().lerpVectors(s.a, s.b, t).add(new THREE.Vector3(0, -2.2 * 4 * t * (1 - t), 0)));
      }
      cable.add(S.tube(pts, 0.018, 3, { segments: N * 2 }), '#1a1820');
      const curve = new THREE.CatmullRomCurve3(pts);
      const L = curve.getLength();
      for (let d = 0.8; d < L - 0.5; d += 0.9) {
        const p = curve.getPointAt(d / L);
        const col = rng.pick(BULB_COLORS);
        bulbs.add(S.sphere(0.07, 6, 5), col, { p: [p.x, p.y - 0.08, p.z] });
        this.halos.add(new THREE.Vector3(p.x, p.y - 0.08, p.z), 0.9, col);
        if (Math.round(d / 0.9) % 2 === 0) {
          const tan = curve.getTangentAt(d / L);
          const yaw = Math.atan2(tan.x, tan.z) + Math.PI / 2;
          cable.add(S.cone(0.22, 0.42, 3), rng.pick(FLAG_COLORS), { p: [p.x, p.y - 0.26, p.z], r: [Math.PI, yaw, 0], s: [1, 1, 0.12] });
        }
      }
    }
    if (!cable.empty) {
      const m = new THREE.Mesh(cable.build(), MAT.vcDouble);
      m.castShadow = true;
      scene.add(m);
    }
    this.bulbMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    if (!bulbs.empty) scene.add(new THREE.Mesh(bulbs.build(), this.bulbMat));
    this.halos.build();
  }

  update(dt) {
    const g = this.game;
    const lamps = g.dayNight.lamps;
    this.halos.update(lamps, g.renderer.domElement.height);
    this.bulbMat.color.setScalar(0.35 + lamps * 2.6);
    const focus = g.state === 'play' ? g.player.pos : g.cam.pivot;
    this.pool.update(dt, focus, lamps);
  }
}
