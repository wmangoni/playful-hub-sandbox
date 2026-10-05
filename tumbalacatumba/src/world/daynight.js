import * as THREE from 'three';
import { updateGlows, SHARED } from '../render/toon.js';
import { smoothstep, lerp, clamp, DEG } from '../util/math.js';

// Keyframes do dia (cores em hex sRGB). li = intensidade da luz direcional (sol ou lua).
const RAW = [
  { t: 0.0, top: '#0a0d2a', hor: '#2a2355', bot: '#141026', fog: '#211b40', fd: 0.0092, fh: 0.55, lc: '#c4c6ee', li: 1.75, hs: '#5c5c92', hg: '#33284a', hi: 1.9, lamps: 1, stars: 1, cl: '#4c4c84', cd: '#1d1b3c', exp: 1.22, st: '#3a2470', sp: 0.16, sat: 0.9 },
  { t: 4.8, top: '#0e1232', hor: '#3a2c62', bot: '#171228', fog: '#2a2248', fd: 0.0092, fh: 0.7, lc: '#c4c6ee', li: 1.6, hs: '#5c5c92', hg: '#33284a', hi: 1.85, lamps: 1, stars: 0.9, cl: '#4c4c84', cd: '#1d1b3c', exp: 1.22, st: '#3a2470', sp: 0.16, sat: 0.9 },
  { t: 5.8, top: '#2a3470', hor: '#b86c7c', bot: '#3a2a3a', fog: '#6e4c6c', fd: 0.0085, fh: 0.95, lc: '#ffb090', li: 0.6, hs: '#8a7ab0', hg: '#3a2a3a', hi: 1.35, lamps: 0.7, stars: 0.3, cl: '#ffb0a0', cd: '#5a4a7a', exp: 1.05, st: '#4a2a60', sp: 0.12, sat: 1.05 },
  { t: 7.0, top: '#5a7ab8', hor: '#f0b890', bot: '#6a5a5a', fog: '#c2a8a0', fd: 0.0072, fh: 0.75, lc: '#ffcf9a', li: 2.0, hs: '#a8b8d8', hg: '#4a4238', hi: 1.35, lamps: 0.0, stars: 0, cl: '#fff0e0', cd: '#b0a0b8', exp: 1.0, st: '#4a3a60', sp: 0.08, sat: 1.06 },
  { t: 9.0, top: '#4f86c8', hor: '#dde4c8', bot: '#7a8480', fog: '#b8c6b8', fd: 0.0046, fh: 0.26, lc: '#fff0dc', li: 2.45, hs: '#b0c8e0', hg: '#4a4a3c', hi: 1.35, lamps: 0, stars: 0, cl: '#ffffff', cd: '#b8c0d0', exp: 1.0, st: '#3a3a60', sp: 0.06, sat: 1.14 },
  { t: 13.0, top: '#4a8acc', hor: '#dfe6cc', bot: '#7a8480', fog: '#bcc8bc', fd: 0.0042, fh: 0.18, lc: '#fff6e8', li: 2.55, hs: '#b8cce0', hg: '#4c4c40', hi: 1.38, lamps: 0, stars: 0, cl: '#ffffff', cd: '#c0c8d8', exp: 1.0, st: '#3a3a60', sp: 0.05, sat: 1.14 },
  { t: 16.5, top: '#4f6eb4', hor: '#eecca0', bot: '#7a7068', fog: '#c2ae98', fd: 0.0052, fh: 0.3, lc: '#ffcc90', li: 2.3, hs: '#a8a8c8', hg: '#4a3e3a', hi: 1.35, lamps: 0, stars: 0, cl: '#ffe0c0', cd: '#9a90b0', exp: 1.0, st: '#4a3060', sp: 0.08, sat: 1.14 },
  { t: 17.8, top: '#3a3c80', hor: '#ff8a5a', bot: '#5a3a44', fog: '#b0707a', fd: 0.007, fh: 0.5, lc: '#ff9a60', li: 1.9, hs: '#9a7ab0', hg: '#3a2a38', hi: 1.4, lamps: 0.35, stars: 0, cl: '#ffa070', cd: '#6a4a7a', exp: 1.02, st: '#5a2a60', sp: 0.12, sat: 1.1 },
  { t: 18.6, top: '#262466', hor: '#a24a78', bot: '#2e1a34', fog: '#6a3a64', fd: 0.008, fh: 0.65, lc: '#ff8a7a', li: 0.9, hs: '#7466aa', hg: '#34243c', hi: 1.8, lamps: 0.85, stars: 0.25, cl: '#d07090', cd: '#3a2a5a', exp: 1.05, st: '#4a2468', sp: 0.14, sat: 1.08 },
  { t: 19.6, top: '#121440', hor: '#45306a', bot: '#181228', fog: '#2e2450', fd: 0.0088, fh: 0.6, lc: '#c0c2ee', li: 1.6, hs: '#5a5a90', hg: '#2e2442', hi: 1.85, lamps: 1, stars: 0.8, cl: '#5a5a90', cd: '#221f44', exp: 1.22, st: '#3a2470', sp: 0.16, sat: 1.04 },
  { t: 21.0, top: '#0a0d2a', hor: '#2a2355', bot: '#141026', fog: '#211b40', fd: 0.0092, fh: 0.55, lc: '#c4c6ee', li: 1.75, hs: '#5c5c92', hg: '#33284a', hi: 1.9, lamps: 1, stars: 1, cl: '#4c4c84', cd: '#1d1b3c', exp: 1.22, st: '#3a2470', sp: 0.16, sat: 0.9 },
];
const KEYS = [...RAW, { ...RAW[0], t: 24 }].map((k) => {
  const o = { t: k.t };
  for (const [n, v] of Object.entries(k)) if (n !== 't') o[n] = typeof v === 'string' ? new THREE.Color(v) : v;
  return o;
});

function dirFrom(az, el, out) {
  const ce = Math.cos(el);
  return out.set(ce * Math.cos(az), Math.sin(el), ce * Math.sin(az));
}

export class DayNight {
  constructor({ scene, sky, sun, hemi, post, renderer, terrain }) {
    Object.assign(this, { scene, sky, sun, hemi, post, renderer, terrain });
    this.time = 17.2;
    this.speed = 1;
    this.dayLengthSec = 720; // um dia inteiro = 12 minutos
    this.sunDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3();
    this.lightDir = new THREE.Vector3(0, 1, 0);
    this.cur = {};
    for (const [n, v] of Object.entries(KEYS[0])) this.cur[n] = v?.isColor ? v.clone() : v;
    this.night = 0;
    this.lamps = 0;
    this.listeners = [];
    this.apply();
  }

  get hour() { return Math.floor(this.time); }
  get minute() { return Math.floor((this.time % 1) * 60); }
  get isNight() { return this.time >= 19.3 || this.time < 5.2; }
  clockText() { return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`; }

  nightFor(t) {
    return t >= 19 || t < 5 ? 1 : t >= 17.5 ? (t - 17.5) / 1.5 : t < 6.5 ? 1 - (t - 5) / 1.5 : 0;
  }

  setTime(h) {
    this.time = ((h % 24) + 24) % 24;
    this.apply();
  }

  update(dt) {
    this.time = (this.time + (dt * this.speed * 24) / this.dayLengthSec) % 24;
    this.apply();
  }

  apply() {
    const t = this.time;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].t <= t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = smoothstep(0, 1, (t - a.t) / (b.t - a.t));
    const c = this.cur;
    for (const n of Object.keys(a)) {
      if (n === 't') continue;
      if (a[n].isColor) c[n].copy(a[n]).lerp(b[n], f);
      else c[n] = lerp(a[n], b[n], f);
    }

    // sol: nasce no leste às 6h, passa pelo norte, se põe no oeste às 18h
    const sp = (t - 6) / 12;
    dirFrom(-Math.PI * sp, Math.sin(Math.PI * sp) * 62 * DEG, this.sunDir);
    // lua: nasce a oes-noroeste (atrás da Colina Espiral) às 18:36 e cruza o céu norte
    const tm = (((t - 18.6) % 24) + 24) % 24;
    const mEl = tm <= 10 ? Math.sin((Math.PI * tm) / 10) * 32 * DEG : -Math.sin((Math.PI * (tm - 10)) / 14) * 25 * DEG;
    dirFrom((-150 + 100 * Math.min(tm, 10) / 10) * DEG, mEl, this.moonDir);

    const sunVis = smoothstep(-0.05, 0.1, this.sunDir.y);
    const moonVis = smoothstep(-0.05, 0.08, this.moonDir.y) * (1 - sunVis);
    const useSun = sunVis >= moonVis;
    const src = useSun ? this.sunDir : this.moonDir;
    // luz nunca rasante demais (sombras enormes e chão escuro)
    const el = Math.max(Math.asin(clamp(src.y, -1, 1)), 16 * DEG);
    const az = Math.atan2(src.z, src.x);
    dirFrom(az, el, this.lightDir);

    this.sun.color.copy(c.lc);
    this.sun.intensity = c.li * (useSun ? sunVis : moonVis);
    this.hemi.color.copy(c.hs);
    this.hemi.groundColor.copy(c.hg);
    this.hemi.intensity = c.hi;

    const fog = this.scene.fog;
    fog.color.copy(c.fog);
    fog.near = Math.max(c.fd, this.fogMin ?? 0); // no celular, um piso (esconde o corte do cenário longe)
    fog.far = c.fh;

    const u = this.sky.uniforms;
    u.uTop.value.copy(c.top);
    u.uHorizon.value.copy(c.hor);
    u.uBottom.value.copy(c.bot);
    u.uSunDir.value.copy(this.sunDir);
    u.uSunColor.value.copy(c.lc).multiplyScalar(useSun ? 1 : 0);
    u.uMoonDir.value.copy(this.moonDir);
    u.uStars.value = c.stars;
    u.uCloudLit.value.copy(c.cl);
    u.uCloudDark.value.copy(c.cd);
    u.uSunVis.value = sunVis;
    u.uMoonVis.value = smoothstep(-0.12, 0.02, this.moonDir.y) * (0.35 + 0.65 * (1 - sunVis));

    // luz de contorno: azulada à noite, quente e fraquinha de dia
    SHARED.uRim.value.copy(c.lc).multiplyScalar(0.25 + this.nightFor(t) * 1.1);
    this.lamps = c.lamps;
    this.night = clamp(1 - smoothstep(0.0, 0.25, this.sunDir.y + 0.05), 0, 1);
    SHARED.uNight.value = this.night;
    updateGlows(c.lamps);
    if (this.terrain?.material) this.terrain.material.userData.u.uLampFactor.value = c.lamps;

    this.renderer.toneMappingExposure = c.exp;
    if (this.post) {
      const g = this.post.grade;
      g.uShadowTint.value.copy(c.st).convertLinearToSRGB();
      g.uSplit.value = c.sp;
      g.uSaturation.value = c.sat;
    }
    for (const fn of this.listeners) fn(this);
  }
}
