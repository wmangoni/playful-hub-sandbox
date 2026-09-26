import * as THREE from 'three';
import { Terrain } from './terrain.js';
import { Water } from './water.js';
import { Colliders } from './colliders.js';
import { DECKS, PLAY_LIMIT, WATER_LEVEL, SUBZONES } from './layout.js';
import { sampleCurve, segDist, clamp } from '../util/math.js';

export class World {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.colliders = new Colliders(8);
    this.terrain = new Terrain();
    this.decks = DECKS.map((d) => ({ ...d, hw: d.w / 2, samples: sampleCurve(d.pts, 0.5) }));
    for (const d of this.decks) {
      const L = d.samples[d.samples.length - 1].s;
      for (const s of d.samples) s.t = s.s / L;
    }
    this.animated = []; // coisas com update(dt, t)
  }

  /** etapa 1: terreno base (antes de posicionar construções) */
  buildTerrain() {
    this.terrain.generateBase();
  }

  /** etapa 2: depois dos "pads", fecha o terreno e cria água */
  finishTerrain() {
    this.terrain.applyPads();
    this.terrain.finalize(this.game.renderer);
    this.scene.add(this.terrain.mesh);
    this.water = new Water(this.terrain);
    this.scene.add(this.water.mesh);
  }

  deckHeightAt(d, x, z) {
    const sm = d.samples;
    let best = Infinity, bt = 0, bi = 0;
    for (let i = 0; i < sm.length - 1; i++) {
      const a = sm[i], b = sm[i + 1];
      if (Math.abs(x - a.x) > 6 && Math.abs(x - b.x) > 6) continue;
      const r = segDist(x, z, a.x, a.z, b.x, b.z);
      if (r.d < best) {
        best = r.d;
        bt = r.t;
        bi = i;
      }
    }
    if (best > d.hw) return -Infinity;
    const t = sm[bi].t + (sm[bi + 1].t - sm[bi].t) * bt;
    return d.h + (d.arch ? Math.sin(t * Math.PI) * d.arch : 0);
  }

  groundHeight(x, z) {
    let h = this.terrain.heightAt(x, z);
    for (const d of this.decks) {
      const dh = this.deckHeightAt(d, x, z);
      if (dh > h) h = dh;
    }
    return h;
  }

  onDeck(x, z) {
    for (const d of this.decks) if (this.deckHeightAt(d, x, z) > this.terrain.heightAt(x, z)) return true;
    return false;
  }

  /** move um círculo com colisão, rampa máxima, água funda e limites do mapa */
  moveCircle(from, tx, tz, r) {
    const tryMove = (x, z) => {
      const g0 = this.groundHeight(from.x, from.z);
      const g1 = this.groundHeight(x, z);
      const d = Math.hypot(x - from.x, z - from.z);
      if (d < 1e-6) return true;
      if (g1 - g0 > 0.2 && (g1 - g0) / d > 1.15 && g1 > from.y + 0.25) return false; // íngreme demais
      if (WATER_LEVEL - g1 > 1.0 && g1 < g0) return false; // água funda (só bloqueia se piorar)
      return true;
    };
    let x = tx, z = tz;
    if (!tryMove(x, z)) {
      if (tryMove(tx, from.z)) z = from.z;
      else if (tryMove(from.x, tz)) x = from.x;
      else { x = from.x; z = from.z; }
    }
    const [rx, rz] = this.colliders.resolve(x, z, r, from.y);
    // a resolução de colisão não pode jogar ninguém em água funda / precipício
    if (tryMove(rx, rz)) {
      x = rx;
      z = rz;
    } else {
      x = from.x;
      z = from.z;
    }
    x = clamp(x, -PLAY_LIMIT, PLAY_LIMIT);
    z = clamp(z, -PLAY_LIMIT, PLAY_LIMIT);
    return [x, z];
  }

  zoneAt(x, z) {
    for (const s of SUBZONES) if (Math.hypot(x - s.x, z - s.z) < s.r) return s;
    return null;
  }

  update(dt, t) {
    for (const a of this.animated) a.update(dt, t, this.game);
  }
}
