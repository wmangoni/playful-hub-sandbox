// Planta baixa de cada andar (para o minimapa quando estamos dentro da mansão).
import { ROOMS, DOORS, WINDOWS, STAIRS, LANDING, HOLES, LV } from './plan.js';

export const MAP_PX = 36; // pixels por metro
export const MAP_X0 = -14, MAP_Z0 = -10, MAP_W = 28, MAP_D = 20;

const FLOOR_COL = {
  marble: '#3a3044', parquet: '#5a3e2c', stoneTile: '#58525a', carpet: '#5a1e2a', checker: '#6a6a70', stone: '#3e3a44', planks: '#5a4634',
};

/** pinta um canvas por andar; decor.mapItems traz as silhuetas dos móveis */
export function paintPlan(io) {
  const out = {};
  for (const lv of ['B', 'G', 'U', 'A']) {
    const c = document.createElement('canvas');
    c.width = MAP_W * MAP_PX;
    c.height = MAP_D * MAP_PX;
    const g = c.getContext('2d');
    const X = (x) => (x - MAP_X0) * MAP_PX, Z = (z) => (z - MAP_Z0) * MAP_PX;
    g.fillStyle = '#0c0a10';
    g.fillRect(0, 0, c.width, c.height);
    const rooms = ROOMS.filter((r) => r.level === lv || (lv === 'U' && r.id === 'saguao'));
    for (const r of rooms) {
      const hallVoid = lv === 'U' && r.id === 'saguao';
      g.fillStyle = hallVoid ? '#16101c' : FLOOR_COL[r.floor] ?? '#4a4050';
      g.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * MAP_PX, (r.z1 - r.z0) * MAP_PX);
      if (hallVoid) {
        // vão do saguão visto de cima: só o patamar é chão
        g.fillStyle = FLOOR_COL.parquet;
        g.fillRect(X(LANDING.x0), Z(LANDING.z0), (LANDING.x1 - LANDING.x0) * MAP_PX, (LANDING.z1 - LANDING.z0) * MAP_PX);
        g.strokeStyle = 'rgba(200,170,120,0.5)';
        g.setLineDash([6, 6]);
        g.lineWidth = 3;
        g.strokeRect(X(r.x0) + 6, Z(LANDING.z1) + 6, (r.x1 - r.x0) * MAP_PX - 12, (r.z1 - LANDING.z1) * MAP_PX - 12);
        g.setLineDash([]);
      }
    }
    for (const h of HOLES[lv] ?? []) {
      g.fillStyle = '#0c0a10';
      g.fillRect(X(h.x0), Z(h.z0), (h.x1 - h.x0) * MAP_PX, (h.z1 - h.z0) * MAP_PX);
    }
    // móveis
    for (const it of io.decor?.mapItems ?? []) {
      if (it.level !== lv) continue;
      g.fillStyle = it.color ?? 'rgba(20,14,24,0.55)';
      if (it.r) {
        g.beginPath();
        g.arc(X(it.x), Z(it.z), it.r * MAP_PX, 0, Math.PI * 2);
        g.fill();
      } else {
        g.save();
        g.translate(X(it.x), Z(it.z));
        g.rotate(-(it.rot ?? 0));
        g.fillRect((-it.w / 2) * MAP_PX, (-it.d / 2) * MAP_PX, it.w * MAP_PX, it.d * MAP_PX);
        g.restore();
      }
    }
    // escadas: degraus riscados e seta de subida
    for (const s of STAIRS) {
      const lo = Math.min(s.y0, s.y1), hi = Math.max(s.y0, s.y1);
      const onThis = LV[lv].y >= lo - 0.1 && LV[lv].y <= hi + 0.1;
      if (!onThis) continue;
      const along = s.along;
      const a0 = Math.min(s.from, s.to), a1 = Math.max(s.from, s.to);
      const [x0, x1, z0, z1] = along === 'z' ? [s.a0, s.a1, a0, a1] : [a0, a1, s.a0, s.a1];
      g.fillStyle = '#6a5040';
      g.fillRect(X(x0), Z(z0), (x1 - x0) * MAP_PX, (z1 - z0) * MAP_PX);
      g.strokeStyle = 'rgba(20,12,10,0.7)';
      g.lineWidth = 2;
      const n = Math.round((a1 - a0) / 0.35);
      for (let i = 1; i < n; i++) {
        const t = a0 + ((a1 - a0) * i) / n;
        g.beginPath();
        if (along === 'z') {
          g.moveTo(X(x0), Z(t));
          g.lineTo(X(x1), Z(t));
        } else {
          g.moveTo(X(t), Z(z0));
          g.lineTo(X(t), Z(z1));
        }
        g.stroke();
      }
      // seta: de onde sobe para onde
      const up = s.y1 > s.y0 ? [s.from, s.to] : [s.to, s.from];
      const m = (s.a0 + s.a1) / 2;
      const [ax, az, bx, bz] = along === 'z' ? [m, up[0], m, up[1]] : [up[0], m, up[1], m];
      g.strokeStyle = '#efe6d2';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(X(ax), Z(az));
      g.lineTo(X(bx), Z(bz));
      g.stroke();
      const ang = Math.atan2(Z(bz) - Z(az), X(bx) - X(ax));
      g.beginPath();
      g.moveTo(X(bx), Z(bz));
      g.lineTo(X(bx) - Math.cos(ang - 0.5) * 16, Z(bz) - Math.sin(ang - 0.5) * 16);
      g.lineTo(X(bx) - Math.cos(ang + 0.5) * 16, Z(bz) - Math.sin(ang + 0.5) * 16);
      g.closePath();
      g.fillStyle = '#efe6d2';
      g.fill();
    }
    // paredes com vãos de porta
    g.strokeStyle = '#e8dcc6';
    g.lineWidth = 7;
    g.lineCap = 'square';
    const segs = new Set();
    for (const r of rooms) {
      const doors = DOORS.filter((d) => d.rooms.includes(r.id) && Math.abs(d.y0 - LV[lv].y) < 0.2 && !d.closed);
      const edges = [
        ['z', r.z0, r.x0, r.x1], ['z', r.z1, r.x0, r.x1], ['x', r.x0, r.z0, r.z1], ['x', r.x1, r.z0, r.z1],
      ];
      for (const [axis, at, a, b] of edges) {
        const key = `${axis}${at}${a}${b}`;
        if (segs.has(key)) continue;
        segs.add(key);
        let spans = [[a, b]];
        for (const d of doors) {
          if (d.axis !== axis || Math.abs(d.at - at) > 0.01) continue;
          const lo = d.c - d.w / 2, hi = d.c + d.w / 2;
          spans = spans.flatMap(([s0, s1]) => (hi <= s0 || lo >= s1 ? [[s0, s1]] : [[s0, lo], [hi, s1]].filter(([p, q]) => q - p > 0.05)));
        }
        for (const [s0, s1] of spans) {
          g.beginPath();
          if (axis === 'z') {
            g.moveTo(X(s0), Z(at));
            g.lineTo(X(s1), Z(at));
          } else {
            g.moveTo(X(at), Z(s0));
            g.lineTo(X(at), Z(s1));
          }
          g.stroke();
        }
      }
    }
    // janelas
    g.strokeStyle = '#8ac8ff';
    g.lineWidth = 5;
    for (const w of WINDOWS) {
      const r = ROOMS.find((x) => x.id === w.room);
      if (!r || r.level !== lv) continue;
      g.beginPath();
      if (w.axis === 'z') {
        g.moveTo(X(w.c - w.w / 2), Z(w.at));
        g.lineTo(X(w.c + w.w / 2), Z(w.at));
      } else {
        g.moveTo(X(w.at), Z(w.c - w.w / 2));
        g.lineTo(X(w.at), Z(w.c + w.w / 2));
      }
      g.stroke();
    }
    // porta da frente (saída)
    if (lv === 'G') {
      g.fillStyle = '#ffb86a';
      g.fillRect(X(-1.2), Z(9) - 6, 2.4 * MAP_PX, 12);
    }
    // nomes dos cômodos
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '400 30px "Patrick Hand", sans-serif';
    for (const r of rooms) {
      if (lv === 'U' && r.id === 'saguao') continue;
      const cx = X((r.x0 + r.x1) / 2), cz = Z((r.z0 + r.z1) / 2);
      g.lineWidth = 6;
      g.strokeStyle = 'rgba(12,8,16,0.85)';
      g.strokeText(r.name, cx, cz);
      g.fillStyle = '#f3ead6';
      g.fillText(r.name, cx, cz);
    }
    out[lv] = c;
  }
  return out;
}
