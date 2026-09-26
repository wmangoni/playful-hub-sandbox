// Colisão no plano XZ: círculos (árvores, postes) e caixas orientadas (casas, muros).
export class Colliders {
  constructor(cell = 8) {
    this.cell = cell;
    this.grid = new Map();
    this.list = [];
    this._stamp = 0;
  }

  _key(ix, iz) {
    return (ix + 1000) * 4000 + (iz + 1000);
  }

  _insert(c) {
    const { cell } = this;
    const ix0 = Math.floor(c.minX / cell), ix1 = Math.floor(c.maxX / cell);
    const iz0 = Math.floor(c.minZ / cell), iz1 = Math.floor(c.maxZ / cell);
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const k = this._key(ix, iz);
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(c);
      }
    }
    this.list.push(c);
    return c;
  }

  addCircle(x, z, r, opts = {}) {
    return this._insert({ type: 'c', x, z, r, minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, y0: opts.y0 ?? -99, y1: opts.y1 ?? 99, tag: opts.tag });
  }

  /** caixa centrada em (x,z), meia-largura hw (eixo local x), meia-prof. hd, rotação rot (rad), altura y0..y1 */
  addBox(x, z, hw, hd, rot = 0, opts = {}) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const ex = Math.abs(hw * c) + Math.abs(hd * s), ez = Math.abs(hw * s) + Math.abs(hd * c);
    return this._insert({
      type: 'b', x, z, hw, hd, rot, cos: c, sin: s,
      minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez,
      y0: opts.y0 ?? -99, y1: opts.y1 ?? 99, camera: opts.camera !== false, tag: opts.tag,
    });
  }

  /** segmento com espessura (cercas, parapeitos) */
  addSegment(ax, az, bx, bz, thick = 0.2, opts = {}) {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const len = Math.hypot(bx - ax, bz - az);
    const rot = Math.atan2(-(bz - az), bx - ax);
    return this.addBox(mx, mz, len / 2, thick / 2, rot, { ...opts, camera: opts.camera ?? false });
  }

  query(minX, minZ, maxX, maxZ, out = []) {
    const { cell } = this;
    this._stamp++;
    const ix0 = Math.floor(minX / cell), ix1 = Math.floor(maxX / cell);
    const iz0 = Math.floor(minZ / cell), iz1 = Math.floor(maxZ / cell);
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const arr = this.grid.get(this._key(ix, iz));
        if (!arr) continue;
        for (const c of arr) {
          if (c._s === this._stamp) continue;
          c._s = this._stamp;
          out.push(c);
        }
      }
    }
    return out;
  }

  /** empurra um círculo (x,z,r) para fora dos colisores; y = altura dos pés (para ignorar coisas acima/abaixo) */
  resolve(x, z, r, y = 0, iterations = 3) {
    const near = this.query(x - r - 1, z - r - 1, x + r + 1, z + r + 1, []);
    for (let it = 0; it < iterations; it++) {
      let moved = false;
      for (const c of near) {
        if (y + 1.6 < c.y0 || y > c.y1) continue;
        if (c.type === 'c') {
          const dx = x - c.x, dz = z - c.z;
          const d2 = dx * dx + dz * dz, m = r + c.r;
          if (d2 < m * m) {
            const d = Math.sqrt(d2) || 1e-4;
            const push = m - d;
            x += (dx / d) * push;
            z += (dz / d) * push;
            moved = true;
          }
        } else {
          // para o espaço local da caixa
          const dx = x - c.x, dz = z - c.z;
          const lx = dx * c.cos - dz * c.sin;
          const lz = dx * c.sin + dz * c.cos;
          const cx = Math.max(-c.hw, Math.min(c.hw, lx));
          const cz = Math.max(-c.hd, Math.min(c.hd, lz));
          let ox = lx - cx, oz = lz - cz;
          const d2 = ox * ox + oz * oz;
          let nlx = lx, nlz = lz;
          if (d2 > 1e-8) {
            if (d2 < r * r) {
              const d = Math.sqrt(d2);
              nlx = cx + (ox / d) * r;
              nlz = cz + (oz / d) * r;
            } else continue;
          } else {
            // dentro da caixa: sai pelo lado mais próximo
            const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
            if (px < pz) nlx = Math.sign(lx || 1) * (c.hw + r);
            else nlz = Math.sign(lz || 1) * (c.hd + r);
          }
          // de volta ao mundo (rotação inversa)
          x = c.x + nlx * c.cos + nlz * c.sin;
          z = c.z - nlx * c.sin + nlz * c.cos;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return [x, z];
  }

  /** raio 3D contra caixas marcadas como "camera"; retorna t do impacto ou Infinity */
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    const ex = ox + dx * maxT, ez = oz + dz * maxT;
    const near = this.query(Math.min(ox, ex) - 1, Math.min(oz, ez) - 1, Math.max(ox, ex) + 1, Math.max(oz, ez) + 1, []);
    let best = Infinity;
    for (const c of near) {
      if (c.type !== 'b' || !c.camera) continue;
      // raio no espaço local da caixa
      const rx = ox - c.x, rz = oz - c.z;
      const lox = rx * c.cos - rz * c.sin, loz = rx * c.sin + rz * c.cos;
      const ldx = dx * c.cos - dz * c.sin, ldz = dx * c.sin + dz * c.cos;
      let t0 = 0, t1 = maxT;
      const slab = (o, d, mn, mx) => {
        if (Math.abs(d) < 1e-9) return o >= mn && o <= mx;
        let a = (mn - o) / d, b = (mx - o) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
        return t0 <= t1;
      };
      if (!slab(lox, ldx, -c.hw, c.hw)) continue;
      if (!slab(loz, ldz, -c.hd, c.hd)) continue;
      if (!slab(oy, dy, c.y0, c.y1)) continue;
      if (t0 < best) best = t0;
    }
    return best;
  }

  /** existe algo num círculo? (para posicionar props sem sobreposição) */
  overlaps(x, z, r) {
    const near = this.query(x - r, z - r, x + r, z + r, []);
    for (const c of near) {
      if (c.type === 'c') {
        if (Math.hypot(x - c.x, z - c.z) < r + c.r) return true;
      } else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
        if (Math.hypot(lx - cx, lz - cz) < r) return true;
      }
    }
    return false;
  }
}
