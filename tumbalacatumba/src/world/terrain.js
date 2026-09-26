import * as THREE from 'three';
import {
  WORLD_SIZE, HALF, SEG, WATER_LEVEL, ROADS, STREAM, LAKE, ISLAND, SWAMP, PLAZA, BUMPS,
  CEMETERY, WOODS, SPIRAL_HILL, VENTS, PUMPKIN_FIELD, CROP_FIELD, MANOR,
} from './layout.js';
import { noise2, noise2b, fbm2 } from '../util/noise.js';
import { clamp, lerp, smoothstep, sampleCurve, segDist } from '../util/math.js';
import { GRADIENT } from '../render/toon.js';
import { bakeTexture, bakeTileNoise, bakeVoronoi, NOISE_GLSL } from '../render/bake.js';

const N = SEG + 1;
const CELL = WORLD_SIZE / SEG;
const SPLAT_RES = 1024;
const LAMP_RES = 512;

function lin(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}
const PAL = {
  grassA: lin('#4b6c55'), grassB: lin('#5f7d56'), grassC: lin('#3d5c56'), dry: lin('#7c7852'),
  cem: lin('#5a6860'), swamp: lin('#4a5935'), woods: lin('#2f4c47'), farm: lin('#6e7a48'),
  manor: lin('#3c4648'), spiral: lin('#50706a'), vents: lin('#5e3b2f'),
  rock: lin('#5f5a6c'), mountain: lin('#3a3650'), peak: lin('#5c5878'),
  shore: lin('#6e6450'), under: lin('#3a3a2e'),
};

function mix3(o, a, t) {
  o[0] += (a[0] - o[0]) * t;
  o[1] += (a[1] - o[1]) * t;
  o[2] += (a[2] - o[2]) * t;
}

export class Terrain {
  constructor() {
    this.N = N;
    this.cell = CELL;
    this.h = new Float32Array(N * N);
    this.roadD = new Float32Array(N * N).fill(999);
    this.streamD = new Float32Array(N * N).fill(999);
    this.roads = ROADS.map((r) => ({ ...r, hw: r.w / 2, samples: sampleCurve(r.pts, 1) }));
    this.stream = { ...STREAM, hw: STREAM.w / 2, samples: sampleCurve(STREAM.pts, 1) };
    this.pads = [];
    this.lamps = [];
  }

  // ---------- consultas ----------
  heightAt(x, z) {
    const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
    let ix = Math.floor(fx), iz = Math.floor(fz);
    if (ix < 0) ix = 0; else if (ix > SEG - 1) ix = SEG - 1;
    if (iz < 0) iz = 0; else if (iz > SEG - 1) iz = SEG - 1;
    const tx = clamp(fx - ix, 0, 1), tz = clamp(fz - iz, 0, 1);
    const i = iz * N + ix;
    const h00 = this.h[i], h10 = this.h[i + 1], h01 = this.h[i + N], h11 = this.h[i + N + 1];
    // mesma triangulação da malha (diagonal v00→v11)
    if (tz >= tx) return h00 + (h11 - h01) * tx + (h01 - h00) * tz;
    return h00 + (h10 - h00) * tx + (h11 - h10) * tz;
  }

  normalAt(x, z, out = new THREE.Vector3()) {
    const e = 0.8;
    const hx = this.heightAt(x - e, z) - this.heightAt(x + e, z);
    const hz = this.heightAt(x, z - e) - this.heightAt(x, z + e);
    return out.set(hx, 2 * e, hz).normalize();
  }

  _gridBilinear(arr, x, z) {
    const fx = clamp((x + HALF) / CELL, 0, SEG - 0.001), fz = clamp((z + HALF) / CELL, 0, SEG - 0.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    const i = iz * N + ix;
    return lerp(lerp(arr[i], arr[i + 1], tx), lerp(arr[i + N], arr[i + N + 1], tx), tz);
  }

  /** distância com sinal à borda da estrada mais próxima (negativo = em cima da estrada) */
  roadDistAt(x, z) { return this._gridBilinear(this.roadD, x, z); }
  streamDistAt(x, z) { return this._gridBilinear(this.streamD, x, z); }
  waterDepthAt(x, z) { return WATER_LEVEL - this.heightAt(x, z); }

  // ---------- geração ----------
  _base(x, z) {
    let h = 2.7 + fbm2(x * 0.0095, z * 0.0095, 4) * 3.3;
    h += noise2b(x * 0.045, z * 0.045) * 0.45;
    const e = Math.max(Math.abs(x), Math.abs(z)) + noise2(x * 0.025 + 40, z * 0.025) * 7;
    const m = smoothstep(124, 164, e);
    if (m > 0) {
      const ridge = 1 - Math.abs(noise2(x * 0.018, z * 0.018));
      h += m * m * (20 + 26 * ridge + 8 * noise2b(x * 0.06, z * 0.06));
    }
    for (const b of BUMPS) {
      const d = Math.hypot(x - b.x, z - b.z) / b.r;
      if (d < 1) {
        const k = 1 - d * d;
        h += b.h * k * k;
      }
    }
    return h;
  }

  _basins(x, z, h) {
    // Lago Lamentoso
    {
      const dx = x - LAKE.x, dz = z - LAKE.z;
      const ang = Math.atan2(dz, dx);
      const rr = LAKE.r * (1 + 0.12 * noise2(Math.cos(ang) * 1.1 + 10, Math.sin(ang) * 1.1 + 10));
      const t = Math.hypot(dx, dz) / rr;
      if (t < 1.4) {
        const target = lerp(-3.4, 1.2, smoothstep(0.3, 1.0, t));
        const w = 1 - smoothstep(1.0, 1.4, t);
        h = lerp(h, Math.min(h, target), w);
      }
    }
    // ilhota do coreto
    {
      const di = Math.hypot(x - ISLAND.x, z - ISLAND.z) / ISLAND.r;
      if (di < 1.6) h = Math.max(h, 1.25 - di * di * 1.65);
    }
    // Pântano: bacia rasa e irregular com ilhotas de lama
    {
      const ds = Math.hypot(x - SWAMP.x, z - SWAMP.z) / (SWAMP.r * (1 + 0.15 * noise2(x * 0.03 + 7, z * 0.03)));
      if (ds < 1.3) {
        const mud = -0.5 + 0.72 * fbm2(x * 0.07 + 3, z * 0.07 - 5, 3) + 0.22 * noise2b(x * 0.2, z * 0.2) + ds * 0.35;
        const w = 1 - smoothstep(0.72, 1.3, ds);
        h = lerp(h, Math.min(h, mud), w);
      }
    }
    // cratera das fendas
    {
      const dv = Math.hypot(x - VENTS.x, z - VENTS.z) / VENTS.r;
      if (dv < 1.5) h += -1.2 * Math.exp(-dv * dv * 2.2) + 0.9 * Math.exp(-((dv - 1.05) ** 2) * 12);
    }
    return h;
  }

  _raster(samples, hwFn, maxR, cb) {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], b = samples[i + 1];
      const x0 = Math.min(a.x, b.x) - maxR, x1 = Math.max(a.x, b.x) + maxR;
      const z0 = Math.min(a.z, b.z) - maxR, z1 = Math.max(a.z, b.z) + maxR;
      const ix0 = Math.max(0, Math.floor((x0 + HALF) / CELL)), ix1 = Math.min(SEG, Math.ceil((x1 + HALF) / CELL));
      const iz0 = Math.max(0, Math.floor((z0 + HALF) / CELL)), iz1 = Math.min(SEG, Math.ceil((z1 + HALF) / CELL));
      for (let iz = iz0; iz <= iz1; iz++) {
        const pz = iz * CELL - HALF;
        for (let ix = ix0; ix <= ix1; ix++) {
          const px = ix * CELL - HALF;
          const { d, t } = segDist(px, pz, a.x, a.z, b.x, b.z);
          cb(iz * N + ix, d - hwFn(i, t), i, t);
        }
      }
    }
  }

  generateBase() {
    const h = this.h;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const x = ix * CELL - HALF, z = iz * CELL - HALF;
        h[iz * N + ix] = this._basins(x, z, this._base(x, z));
      }
    }
    this._blur(1);

    // praça plana
    const h0 = this.heightAt(PLAZA.x, PLAZA.z);
    this.plazaHeight = h0;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const x = ix * CELL - HALF, z = iz * CELL - HALF;
        const d = Math.hypot(x - PLAZA.x, z - PLAZA.z);
        const w = 1 - smoothstep(PLAZA.r + 2, PLAZA.r + 12, d);
        if (w > 0) h[iz * N + ix] = lerp(h[iz * N + ix], h0, w);
      }
    }

    // estradas: altura suavizada ao longo do eixo
    for (const r of this.roads) {
      const hs = r.samples.map((s) => this.heightAt(s.x, s.z));
      r.hs = hs.map((_, i) => {
        let s = 0, n = 0;
        for (let k = -7; k <= 7; k++) {
          s += hs[clamp(i + k, 0, hs.length - 1)];
          n++;
        }
        return Math.max(s / n, 0.35);
      });
    }
    const bestH = new Float32Array(N * N);
    for (const r of this.roads) {
      this._raster(r.samples, () => r.hw, r.hw + 5, (idx, sd, i, t) => {
        if (sd < this.roadD[idx]) {
          this.roadD[idx] = sd;
          bestH[idx] = lerp(r.hs[i], r.hs[i + 1], t);
        }
      });
    }
    for (let i = 0; i < N * N; i++) {
      const sd = this.roadD[i];
      if (sd < 4) {
        const w = 1 - smoothstep(-0.5, 4, sd);
        h[i] = lerp(h[i], bestH[i], w * 0.9);
      }
    }

    // riacho
    const s = this.stream;
    this._raster(s.samples, () => 0, s.hw + 7, (idx, d) => {
      if (d < this.streamD[idx]) this.streamD[idx] = d;
    });
    for (let i = 0; i < N * N; i++) {
      const d = this.streamD[i];
      if (d < s.hw + 7) {
        let target;
        if (d < s.hw) target = -0.95 + 1.0 * (d / s.hw) ** 2;
        else target = lerp(0.12, h[i], smoothstep(s.hw, s.hw + 7, d));
        h[i] = Math.min(h[i], target);
      }
    }
  }

  _blur(iter) {
    const h = this.h;
    const tmp = new Float32Array(N * N);
    for (let k = 0; k < iter; k++) {
      for (let iz = 0; iz < N; iz++) {
        for (let ix = 0; ix < N; ix++) {
          let s = 0, n = 0;
          for (let dz = -1; dz <= 1; dz++) {
            const zz = iz + dz;
            if (zz < 0 || zz >= N) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = ix + dx;
              if (xx < 0 || xx >= N) continue;
              s += h[zz * N + xx];
              n++;
            }
          }
          tmp[iz * N + ix] = s / n;
        }
      }
      h.set(tmp);
    }
  }

  /** achata o chão sob construções */
  addPad(x, z, r, blend = 3, height = null) {
    this.pads.push({ x, z, r, blend, height });
  }

  applyPads() {
    const h = this.h;
    for (const p of this.pads) {
      const ph = p.height ?? this.heightAt(p.x, p.z);
      p.h = ph;
      const R = p.r + p.blend;
      const ix0 = Math.max(0, Math.floor((p.x - R + HALF) / CELL)), ix1 = Math.min(SEG, Math.ceil((p.x + R + HALF) / CELL));
      const iz0 = Math.max(0, Math.floor((p.z - R + HALF) / CELL)), iz1 = Math.min(SEG, Math.ceil((p.z + R + HALF) / CELL));
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const x = ix * CELL - HALF, z = iz * CELL - HALF;
          const d = Math.hypot(x - p.x, z - p.z);
          const w = 1 - smoothstep(p.r, R, d);
          if (w > 0) h[iz * N + ix] = lerp(h[iz * N + ix], ph, w);
        }
      }
    }
  }

  _vertexColor(x, z, hgt, ny, out) {
    out[0] = PAL.grassA[0]; out[1] = PAL.grassA[1]; out[2] = PAL.grassA[2];
    mix3(out, PAL.grassB, noise2(x * 0.018, z * 0.018) * 0.5 + 0.5);
    mix3(out, PAL.grassC, smoothstep(0.25, 0.85, noise2b(x * 0.05 + 9, z * 0.05) * 0.5 + 0.5) * 0.55);
    mix3(out, PAL.dry, smoothstep(0.4, 0.95, noise2(x * 0.03 - 40, z * 0.03 + 11) * 0.5 + 0.5) * 0.6);
    const zt = (cx, cz, r, col, amt) => {
      const d = Math.hypot(x - cx, z - cz);
      const w = 1 - smoothstep(r * 0.6, r * 1.05, d + noise2(x * 0.08, z * 0.08) * 4);
      if (w > 0) mix3(out, col, w * amt);
    };
    zt(CEMETERY.x, CEMETERY.z, 34, PAL.cem, 0.85);
    zt(SWAMP.x, SWAMP.z, 46, PAL.swamp, 0.9);
    zt(WOODS.x, WOODS.z, 40, PAL.woods, 0.85);
    zt(8, 98, 44, PAL.farm, 0.55);
    zt(MANOR.x - 4, MANOR.z, 34, PAL.manor, 0.65);
    zt(SPIRAL_HILL.x, SPIRAL_HILL.z, 32, PAL.spiral, 0.7);
    zt(VENTS.x, VENTS.z, 22, PAL.vents, 0.95);
    // montanhas
    const edge = Math.max(Math.abs(x), Math.abs(z));
    const mt = smoothstep(126, 150, edge) * smoothstep(6, 16, hgt);
    if (mt > 0) {
      mix3(out, PAL.mountain, mt);
      mix3(out, PAL.peak, smoothstep(32, 46, hgt) * 0.6);
    }
    // encostas íngremes viram rocha
    mix3(out, PAL.rock, smoothstep(0.86, 0.62, ny) * 0.9);
    // margens e fundo d'água
    mix3(out, PAL.shore, smoothstep(0.7, 0.05, hgt) * 0.8);
    mix3(out, PAL.under, smoothstep(-0.1, -1.2, hgt));
  }

  finalize(renderer) {
    this.patternTex = bakeTexture(renderer, 2048, PATTERN_BAKE, { uWorldSize: { value: WORLD_SIZE } });
    this.tileTex = bakeTileNoise(renderer, 256, 32);
    this.voroTex = bakeVoronoi(renderer, 512, 16);
    const pos = new Float32Array(N * N * 3);
    const nor = new Float32Array(N * N * 3);
    const col = new Float32Array(N * N * 3);
    const h = this.h;
    const c = [0, 0, 0];
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const i = iz * N + ix;
        const x = ix * CELL - HALF, z = iz * CELL - HALF;
        pos[i * 3] = x; pos[i * 3 + 1] = h[i]; pos[i * 3 + 2] = z;
        const hl = h[iz * N + Math.max(ix - 1, 0)], hr = h[iz * N + Math.min(ix + 1, SEG)];
        const hu = h[Math.max(iz - 1, 0) * N + ix], hd = h[Math.min(iz + 1, SEG) * N + ix];
        let nx = hl - hr, ny = 2 * CELL, nz = hu - hd;
        const l = Math.hypot(nx, ny, nz);
        nx /= l; ny /= l; nz /= l;
        nor[i * 3] = nx; nor[i * 3 + 1] = ny; nor[i * 3 + 2] = nz;
        this._vertexColor(x, z, h[i], ny, c);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
    }
    const idx = new Uint32Array(SEG * SEG * 6);
    let k = 0;
    for (let iz = 0; iz < SEG; iz++) {
      for (let ix = 0; ix < SEG; ix++) {
        const v00 = iz * N + ix, v10 = v00 + 1, v01 = v00 + N, v11 = v01 + 1;
        idx[k++] = v00; idx[k++] = v01; idx[k++] = v11;
        idx[k++] = v00; idx[k++] = v11; idx[k++] = v10;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    this.geometry = geo;

    this._buildSplat();
    this._buildHeightTex();
    this.lampTex = new THREE.DataTexture(new Uint8Array(LAMP_RES * LAMP_RES), LAMP_RES, LAMP_RES, THREE.RedFormat);
    this.lampTex.magFilter = this.lampTex.minFilter = THREE.LinearFilter;
    this.lampTex.needsUpdate = true;

    this.material = createTerrainMaterial(this);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'terreno';
  }

  _buildSplat() {
    const R = SPLAT_RES, texel = WORLD_SIZE / R;
    const data = new Uint8Array(R * R * 4);
    const road = new Float32Array(R * R);
    // estradas: "dentro-idade" com borda em 0.5
    for (const r of this.roads) {
      const maxR = r.hw + 2;
      const sm = r.samples;
      for (let i = 0; i < sm.length - 1; i++) {
        const a = sm[i], b = sm[i + 1];
        const x0 = Math.min(a.x, b.x) - maxR, x1 = Math.max(a.x, b.x) + maxR;
        const z0 = Math.min(a.z, b.z) - maxR, z1 = Math.max(a.z, b.z) + maxR;
        const ix0 = Math.max(0, Math.floor((x0 + HALF) / texel)), ix1 = Math.min(R - 1, Math.ceil((x1 + HALF) / texel));
        const iz0 = Math.max(0, Math.floor((z0 + HALF) / texel)), iz1 = Math.min(R - 1, Math.ceil((z1 + HALF) / texel));
        for (let iz = iz0; iz <= iz1; iz++) {
          const pz = (iz + 0.5) * texel - HALF;
          for (let ix = ix0; ix <= ix1; ix++) {
            const px = (ix + 0.5) * texel - HALF;
            const { d } = segDist(px, pz, a.x, a.z, b.x, b.z);
            const v = clamp(0.5 + (r.hw - d) / 2.4, 0, 1);
            const j = iz * R + ix;
            if (v > road[j]) road[j] = v;
          }
        }
      }
    }
    const circles = [
      { x: PLAZA.x, z: PLAZA.z, r: PLAZA.r },
      { x: MANOR.x - 12, z: MANOR.z + 1, r: 6 },
    ];
    const fields = [PUMPKIN_FIELD, CROP_FIELD];
    for (let iz = 0; iz < R; iz++) {
      const z = (iz + 0.5) * texel - HALF;
      for (let ix = 0; ix < R; ix++) {
        const x = (ix + 0.5) * texel - HALF;
        const j = iz * R + ix;
        let g = 0;
        for (const c of circles) g = Math.max(g, clamp(0.5 + (c.r - Math.hypot(x - c.x, z - c.z)) / 2.4, 0, 1));
        let b = 0;
        for (const f of fields) {
          const dx = x - f.x, dz = z - f.z;
          const cs = Math.cos(-f.rot), sn = Math.sin(-f.rot);
          const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
          const sd = Math.max(Math.abs(lx) - f.hw, Math.abs(lz) - f.hd);
          b = Math.max(b, clamp(0.5 - sd / 2.4, 0, 1));
        }
        const hh = this.heightAt(x, z);
        let a = 0;
        const ds = Math.hypot(x - SWAMP.x, z - SWAMP.z) / SWAMP.r;
        if (ds < 1.2) a = Math.max(a, (1 - smoothstep(0.1, 0.55, hh)) * (1 - smoothstep(0.9, 1.2, ds)));
        a = Math.max(a, (1 - smoothstep(0.0, 0.4, hh)) * 0.85);
        data[j * 4] = road[j] * 255;
        data[j * 4 + 1] = g * 255;
        data[j * 4 + 2] = b * 255;
        data[j * 4 + 3] = a * 255;
      }
    }
    this.splatData = data;
    this.splatRes = R;
    const tex = new THREE.DataTexture(data, R, R, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    this.splatTex = tex;
  }

  splatAt(x, z) {
    const R = this.splatRes;
    const ix = clamp(Math.floor(((x + HALF) / WORLD_SIZE) * R), 0, R - 1);
    const iz = clamp(Math.floor(((z + HALF) / WORLD_SIZE) * R), 0, R - 1);
    const j = (iz * R + ix) * 4;
    const d = this.splatData;
    return [d[j] / 255, d[j + 1] / 255, d[j + 2] / 255, d[j + 3] / 255];
  }

  _buildHeightTex() {
    const data = new Uint16Array(N * N);
    for (let i = 0; i < N * N; i++) data[i] = THREE.DataUtils.toHalfFloat(this.h[i]);
    const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.HalfFloatType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.heightTex = tex;
  }

  /** poças de luz dos postes no chão (assadas numa textura) */
  bakeLamps(lamps) {
    const R = LAMP_RES, texel = WORLD_SIZE / R;
    const data = this.lampTex.image.data;
    const acc = new Float32Array(R * R);
    for (const l of lamps) {
      const rad = l.r ?? 7;
      const ix0 = Math.max(0, Math.floor((l.x - rad + HALF) / texel)), ix1 = Math.min(R - 1, Math.ceil((l.x + rad + HALF) / texel));
      const iz0 = Math.max(0, Math.floor((l.z - rad + HALF) / texel)), iz1 = Math.min(R - 1, Math.ceil((l.z + rad + HALF) / texel));
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const x = (ix + 0.5) * texel - HALF, z = (iz + 0.5) * texel - HALF;
          const d = Math.hypot(x - l.x, z - l.z) / rad;
          if (d < 1) {
            const f = (1 - d) * (1 - d);
            acc[iz * R + ix] += f * (l.i ?? 1);
          }
        }
      }
    }
    for (let i = 0; i < R * R; i++) data[i] = Math.min(255, acc[i] * 200);
    this.lampTex.needsUpdate = true;
  }
}

const TERRAIN_PARS = /* glsl */ `
varying vec3 vWPos;
uniform sampler2D uSplat;
uniform sampler2D uPattern;
uniform sampler2D uTile;
uniform sampler2D uVoro;
uniform sampler2D uLampMap;
uniform vec3 uLampColor;
uniform float uLampFactor;
uniform float uWorldSize;
uniform vec3 uDirtA, uDirtB, uCobA, uCobB, uMortar, uSoilA, uSoilB, uMud;
`;

const TERRAIN_COLOR = /* glsl */ `
{
  vec2 wp = vWPos.xz;
  vec2 wuv = wp / uWorldSize + 0.5;
  vec4 sp = texture2D(uSplat, wuv);
  vec4 pat = texture2D(uPattern, wuv);
  vec4 tile = texture2D(uTile, wp / 13.9);
  float nHi = tile.r;
  float nMid = pat.g;
  vec3 col = diffuseColor.rgb * pat.r * 2.0;
  // lama
  float mudM = smoothstep(0.35, 0.75, sp.a + (nMid - 0.5) * 0.35);
  col = mix(col, uMud * (0.8 + 0.4 * nHi), mudM);
  // estradas de terra
  float edgeN = (nMid - 0.5) * 0.26 + (nHi - 0.5) * 0.08;
  float pr = sp.r + edgeN;
  float pathM = smoothstep(0.44, 0.54, pr);
  vec3 dirt = mix(uDirtA, uDirtB, pat.b) * (0.85 + 0.3 * nHi);
  if (pathM > 0.001) {
    vec2 pv = texture2D(uVoro, wp * (5.2 / 16.0)).rg;
    float pebble = smoothstep(0.62, 0.78, pv.x) * step(0.9, pv.y);
    dirt = mix(dirt, uCobB * (0.75 + 0.3 * nHi), pebble * 0.35);
    dirt *= 1.0 - 0.12 * smoothstep(0.2, 0.04, pv.x) * step(0.6, pv.y);
    float rut = abs(fract(pr * 3.0) - 0.5);
    dirt *= 0.94 + 0.06 * smoothstep(0.0, 0.2, rut);
  }
  col = mix(col, dirt, pathM);
  col *= 1.0 - 0.24 * smoothstep(0.30, 0.44, pr) * (1.0 - pathM);
  // praça de paralelepípedos
  float plazaM = smoothstep(0.46, 0.54, sp.g + edgeN * 0.3);
  if (plazaM > 0.001) {
    vec2 v = texture2D(uVoro, wp * vec2(1.35 / 16.0, 1.9 / 16.0)).rg;
    vec3 stone = mix(uCobA, uCobB, v.y) * (0.85 + 0.3 * nHi);
    float mortar = smoothstep(0.06, 0.2, v.x);
    col = mix(col, mix(uMortar, stone, mortar), plazaM);
  }
  // campo arado
  float farmM = smoothstep(0.46, 0.54, sp.b + edgeN * 0.5);
  if (farmM > 0.001) {
    float furrow = 0.5 + 0.5 * sin(wp.x * 2.2 + pat.a * 3.0);
    vec3 soil = mix(uSoilA, uSoilB, smoothstep(0.2, 0.8, furrow)) * (0.9 + 0.2 * nHi);
    col = mix(col, soil, farmM);
  }
  col *= mix(0.55, 1.0, smoothstep(-0.15, 0.55, vWPos.y));
  diffuseColor.rgb = col;
}
`;

const TERRAIN_EMISSIVE = /* glsl */ `
{
  float lampL = texture2D(uLampMap, vWPos.xz / uWorldSize + 0.5).r;
  totalEmissiveRadiance += uLampColor * lampL * uLampFactor * (diffuseColor.rgb * 2.4 + 0.02);
}
`;

const PATTERN_BAKE = /* glsl */ `
${NOISE_GLSL}
uniform float uWorldSize;
varying vec2 vUv;
float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * bNoise(p); p = p * 2.03 + vec2(5.3, 1.7); a *= 0.5; } return s / 0.875; }
void main() {
  vec2 wp = (vUv - 0.5) * uWorldSize;
  float nLo = bFbm(wp * 0.035);
  float nMid2 = bNoise(wp * 0.2);
  float strokes = bNoise(vec2(wp.x * 0.7 + wp.y * 0.25, wp.y * 2.6 - wp.x * 0.1));
  vec2 q = wp * 0.022;
  q += vec2(fbm3(q * 1.3 + 3.0), fbm3(q * 1.3 - 5.0)) * 2.2;
  float f = fbm3(q);
  float ln = abs(fract(f * 6.0) - 0.5);
  float lines = 1.0 - smoothstep(0.02, 0.06, ln);
  float m = (0.74 + 0.5 * nLo) * (0.92 + 0.16 * nMid2) * (0.93 + 0.14 * strokes) * (1.0 - 0.22 * lines);
  gl_FragColor = vec4(m * 0.5, bNoise(wp * 0.35), bNoise(wp * 0.9), nLo);
}
`;

export function createTerrainMaterial(terrain) {
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT });
  const u = {
    uSplat: { value: terrain.splatTex },
    uPattern: { value: terrain.patternTex },
    uTile: { value: terrain.tileTex },
    uVoro: { value: terrain.voroTex },
    uLampMap: { value: terrain.lampTex },
    uLampColor: { value: new THREE.Color('#ffae5c') },
    uLampFactor: { value: 0 },
    uWorldSize: { value: WORLD_SIZE },
    uDirtA: { value: new THREE.Color('#5a4a3e') },
    uDirtB: { value: new THREE.Color('#6e5c4a') },
    uCobA: { value: new THREE.Color('#5d5868') },
    uCobB: { value: new THREE.Color('#7b7486') },
    uMortar: { value: new THREE.Color('#2a2530') },
    uSoilA: { value: new THREE.Color('#3b2a20') },
    uSoilB: { value: new THREE.Color('#5a4030') },
    uMud: { value: new THREE.Color('#3f3a28') },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TERRAIN_PARS)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + TERRAIN_COLOR)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + TERRAIN_EMISSIVE);
  };
  mat.customProgramCacheKey = () => 'terrain-v2';
  mat.userData.u = u;
  return mat;
}
