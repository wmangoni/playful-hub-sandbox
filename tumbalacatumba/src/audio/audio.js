// Áudio 100% procedural (WebAudio): trilha, efeitos e ambiência. Nenhum arquivo externo.
import { SWAMP, WOODS, CEMETERY } from '../world/layout.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Valsa em Ré menor (3/4). Cada compasso: [[nota, tempos], ...]
const A = [
  [[74, 1], [77, 1], [81, 1]], [[80, 1], [81, 2]], [[82, 1], [81, 1], [79, 1]], [[77, 1], [76, 2]],
  [[73, 1], [76, 1], [79, 1]], [[77, 1], [76, 1], [74, 1]], [[76, 1], [73, 1], [69, 1]], [[74, 3]],
];
const A2 = [...A.slice(0, 7), [[76, 2], [69, 1]]];
const B = [
  [[81, 1], [82, 1], [81, 1]], [[79, 1], [77, 2]], [[79, 1], [81, 1], [79, 1]], [[77, 1], [76, 2]],
  [[77, 1], [79, 1], [81, 1]], [[82, 1], [81, 1], [79, 1]], [[81, 1], [80, 1], [81, 1]], [[76, 3]],
];
const MELODY = [...A, ...A2, ...B, ...A];
const CH = {
  Dm: { root: 38, notes: [62, 65, 69] }, Gm: { root: 43, notes: [62, 67, 70] }, A7: { root: 45, notes: [61, 64, 67] },
  F: { root: 41, notes: [60, 65, 69] }, C7: { root: 36, notes: [60, 64, 70] },
};
const HA = ['Dm', 'Dm', 'Gm', 'A7', 'A7', 'Dm', 'A7', 'Dm'];
const HA2 = ['Dm', 'Dm', 'Gm', 'A7', 'A7', 'Dm', 'A7', 'A7'];
const HB = ['F', 'C7', 'C7', 'F', 'F', 'Gm', 'A7', 'A7'];
const HARMONY = [...HA, ...HA2, ...HB, ...HA];

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.45, sfx: 0.8 };
    this.muted = false;
    this.night = 0;
    this._amb = { t: 0 };
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    // se o navegador segurou o áudio, retoma no próximo gesto real
    // iOS: depois de uma ligação ou do bloqueio de tela o estado vira 'interrupted'
    const resume = () => ctx.state !== 'running' && ctx.state !== 'closed' && ctx.resume();
    // iOS: 'ambient' respeita a chave de silencioso e não pausa a música que o jogador já está ouvindo
    // ('playback' tocaria mesmo no silencioso e pararia o Spotify dele)
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'ambient';
    } catch {
      /* sem suporte */
    }
    window.addEventListener('pointerdown', resume);
    window.addEventListener('touchend', resume); // iOS: o gesto que libera o áudio é o touchend
    window.addEventListener('keydown', resume);
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 3;
    this.comp.connect(this.master);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.musicBus.connect(this.comp);
    this.sfxBus.connect(this.comp);
    this.ambBus.connect(this.comp);
    // reverb de catedral assombrada
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8, 2.2);
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.35;
    this.reverb.connect(this.revGain);
    this.revGain.connect(this.comp);
    this.noiseBuf = this.makeNoise(2);
    this.applyVolumes();
    this.startMusic();
    this.startAmbience();
  }

  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  makeNoise(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  setVolume(k, v) {
    this.vol[k] = v;
    this.applyVolumes();
  }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 1.25, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.sfx * 0.55, t, 0.1);
  }

  // ------------------------------------------------------------ síntese
  env(g, t, a, peak, d, sustain = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  osc(type, f, t, dur, peak, { a = 0.005, dest = this.sfxBus, f2 = null, detune = 0, rev = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    o.detune.value = detune;
    this.env(g, t, a, peak, dur);
    o.connect(g);
    g.connect(dest);
    if (rev) {
      const s = ctx.createGain();
      s.gain.value = rev;
      g.connect(s);
      s.connect(this.reverb);
    }
    o.start(t);
    o.stop(t + a + dur + 0.05);
    return o;
  }
  noise(t, dur, peak, { type = 'bandpass', f = 1000, q = 1, f2 = null, dest = this.sfxBus, a = 0.005 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, a, peak, dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + a + dur + 0.05);
  }
  bell(f, t, peak = 0.2, dur = 1.4, dest = this.sfxBus, rev = 0.4) {
    this.osc('sine', f, t, dur, peak, { dest, rev });
    this.osc('sine', f * 2.01, t, dur * 0.6, peak * 0.35, { dest, rev });
    this.osc('sine', f * 4.2, t, dur * 0.25, peak * 0.12, { dest, rev });
  }

  // ------------------------------------------------------------ trilha
  startMusic() {
    this.beat = 60 / 132;
    this.nextBar = this.ctx.currentTime + 0.3;
    this.bar = 0;
    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 1;
    this.melodyGain.connect(this.musicBus);
    const tick = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      while (this.nextBar < now + 0.4) {
        this.scheduleBar(this.bar % MELODY.length, this.nextBar);
        this.nextBar += this.beat * 3;
        this.bar++;
      }
    };
    this._musicTimer = setInterval(tick, 100);
  }
  scheduleBar(i, t0) {
    const b = this.beat;
    const mDest = this.melodyGain;
    // melodia (caixinha de música)
    let t = t0;
    for (const [n, beats] of MELODY[i]) {
      const f = midi(n);
      this.osc('sine', f, t, beats * b * 1.6, 0.16, { dest: mDest, rev: 0.45 });
      this.osc('triangle', f * 2, t, beats * b * 0.5, 0.035, { dest: mDest, rev: 0.3 });
      if (this.night < 0.5 && i >= 16 && i < 24) this.osc('sine', f * 0.5, t, beats * b * 0.9, 0.05, { dest: mDest });
      t += beats * b;
    }
    // baixo (pizzicato) + "pá-pá" da valsa
    const ch = CH[HARMONY[i]];
    this.osc('triangle', midi(ch.root), t0, b * 0.9, 0.22, { dest: this.musicBus });
    this.osc('sine', midi(ch.root + 12), t0, b * 0.5, 0.08, { dest: this.musicBus });
    for (const k of [1, 2]) {
      for (const n of ch.notes) this.osc('square', midi(n), t0 + k * b, b * 0.28, 0.022, { dest: this.musicBus, rev: 0.2 });
    }
    // coral fantasmagórico à noite
    if (this.night > 0.3) {
      const ctx = this.ctx;
      for (const n of ch.notes) {
        for (const det of [-9, 9]) {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = midi(n);
          o.detune.value = det;
          const f = ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = 520;
          f.Q.value = 3;
          const g = ctx.createGain();
          const dur = b * 3;
          const pk = 0.018 * this.night;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(pk, t0 + dur * 0.4);
          g.gain.linearRampToValueAtTime(0.0001, t0 + dur * 1.05);
          o.connect(f);
          f.connect(g);
          g.connect(this.musicBus);
          const s = ctx.createGain();
          s.gain.value = 0.5;
          g.connect(s);
          s.connect(this.reverb);
          o.start(t0);
          o.stop(t0 + dur * 1.1);
        }
      }
    }
    // xilofone de ossos (fim de cada frase)
    if (i % 8 === 7) {
      [86, 81, 77, 74].forEach((n, k) => this.osc('triangle', midi(n), t0 + b * 1.5 + k * b * 0.25, 0.12, 0.05, { dest: this.musicBus, rev: 0.3 }));
    }
  }

  // ------------------------------------------------------------ ambiência
  startAmbience() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(4);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.05;
    src.connect(f);
    f.connect(this.windGain);
    this.windGain.connect(this.ambBus);
    src.start();
    this.windFilter = f;
  }
  /** dentro da mansão: vento abafado atrás das paredes e rangidos da casa velha */
  setIndoors(v) {
    this.indoors = v;
  }
  update(dt, game) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.night = game.dayNight.night;
    const p = game.player.pos;
    // voando rápido, o vento aumenta
    const fly = game.player.flying ? Math.min(1, game.player.speedNow / 10) + Math.max(0, game.player.vel.y) * 0.05 : 0;
    const wind = this.indoors ? 0.018 + 0.01 * Math.sin(t * 0.19) : 0.035 + 0.03 * Math.sin(t * 0.21) + 0.02 * Math.sin(t * 0.07) + fly * 0.09;
    this.windGain.gain.setTargetAtTime(wind, t, 0.5);
    this.windFilter.frequency.setTargetAtTime(this.indoors ? 160 : 300 + 150 * Math.sin(t * 0.13) + fly * 500, t, 0.5);
    const A = this._amb;
    A.t -= dt;
    if (A.t > 0) return;
    A.t = 0.25 + Math.random() * 0.5;
    if (this.indoors) {
      if (Math.random() < 0.035) this.sfx('creak', 0.5 + Math.random() * 0.5);
      return;
    }
    const dSwamp = Math.hypot(p.x - SWAMP.x, p.z - SWAMP.z);
    const dWoods = Math.hypot(p.x - WOODS.x, p.z - WOODS.z);
    const dCem = Math.hypot(p.x - CEMETERY.x, p.z - CEMETERY.z);
    if (this.night > 0.5 && Math.random() < 0.55) this.cricket(t, 0.02 * this.night);
    if (dSwamp < 55 && Math.random() < 0.18) this.sfx('croak', 0.25 * (1 - dSwamp / 55));
    if (this.night > 0.6 && dWoods < 60 && Math.random() < 0.03) this.sfx('owl', 0.6 * (1 - dWoods / 60));
    if (this.night < 0.4 && Math.random() < 0.012) this.sfx('caw', 0.18);
    if (dCem < 45 && this.night > 0.4 && Math.random() < 0.015) this.sfx('ghostMoan', 0.35 * (1 - dCem / 45));
  }
  cricket(t, v) {
    const f = 4200 + Math.random() * 600;
    for (let i = 0; i < 3; i++) this.osc('sine', f, t + i * 0.055, 0.03, v, { dest: this.ambBus, a: 0.004 });
  }

  // ------------------------------------------------------------ efeitos
  sfx(name, vol = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.005;
    const v = vol;
    switch (name) {
      case 'jump': this.osc('sine', 260, t, 0.14, 0.12 * v, { f2: 520 }); break;
      case 'land': this.osc('sine', 120, t, 0.12, 0.2 * v, { f2: 55 }); this.noise(t, 0.08, 0.1 * v, { type: 'lowpass', f: 600 }); break;
      case 'step': this.noise(t, 0.05, 0.05 * v, { type: 'lowpass', f: 700 + Math.random() * 400 }); break;
      case 'stepWater': this.noise(t, 0.12, 0.08 * v, { type: 'bandpass', f: 1400, q: 0.8, f2: 600 }); break;
      case 'loot': this.bell(1318, t, 0.1 * v, 0.4); this.bell(1976, t + 0.08, 0.08 * v, 0.5); break;
      case 'progress': this.bell(880, t, 0.1 * v, 0.5); this.bell(1318, t + 0.07, 0.09 * v, 0.6); break;
      case 'accept': [523, 659, 784].forEach((f, i) => this.bell(f, t + i * 0.09, 0.12 * v, 1.2)); this.noise(t, 0.25, 0.04 * v, { f: 2500, q: 0.6 }); break;
      case 'ready': [784, 1046].forEach((f, i) => this.bell(f, t + i * 0.12, 0.13 * v, 1.2)); break;
      case 'complete': {
        [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36]].forEach(([f, d]) => {
          this.osc('sawtooth', f, t + d, 0.5, 0.05 * v, { rev: 0.4 });
          this.osc('square', f / 2, t + d, 0.4, 0.025 * v);
        });
        [523, 659, 784, 1046].forEach((f) => this.osc('sawtooth', f, t + 0.5, 1.4, 0.035 * v, { a: 0.05, rev: 0.6 }));
        this.bell(2093, t + 0.5, 0.08 * v, 1.6);
        break;
      }
      case 'levelup': {
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.bell(f, t + i * 0.09, 0.12 * v, 1.6));
        [262, 330, 392, 523].forEach((f) => this.osc('sawtooth', f, t + 0.45, 2.2, 0.03 * v, { a: 0.3, rev: 0.8 }));
        this.osc('sine', 1500, t + 0.3, 1.8, 0.04 * v, { f2: 3200, rev: 0.6 });
        break;
      }
      case 'error': this.osc('square', 150, t, 0.14, 0.06 * v, { f2: 110 }); break;
      case 'open': case 'map': this.noise(t, 0.18, 0.08 * v, { f: 2600, q: 0.7, f2: 1400 }); break;
      case 'close': this.noise(t, 0.12, 0.06 * v, { f: 1800, q: 0.7, f2: 900 }); break;
      case 'click': this.noise(t, 0.02, 0.06 * v, { type: 'highpass', f: 3000 }); break;
      case 'target': this.osc('sine', 1200, t, 0.05, 0.04 * v); break;
      case 'bag': this.noise(t, 0.2, 0.08 * v, { f: 800, q: 1.2, f2: 2400 }); break;
      case 'zone': this.bell(294, t, 0.1 * v, 2.2, this.sfxBus, 0.8); this.bell(440, t + 0.15, 0.06 * v, 2.2, this.sfxBus, 0.8); break;
      case 'castStart': this.osc('sine', 330, t, 0.4, 0.03 * v, { f2: 660, rev: 0.4 }); break;
      case 'castFail': this.osc('sawtooth', 240, t, 0.25, 0.04 * v, { f2: 120 }); break;
      case 'boo': {
        const o = this.osc('sine', 260, t, 0.9, 0.22 * v, { f2: 150, a: 0.04, rev: 0.6 });
        const lfo = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lfo.frequency.value = 7;
        lg.gain.value = 18;
        lfo.connect(lg);
        lg.connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + 1);
        this.noise(t, 0.6, 0.06 * v, { f: 500, q: 2, f2: 300 });
        break;
      }
      case 'meow': {
        const o = this.osc('sawtooth', 620, t, 0.45, 0.07 * v, { a: 0.04 });
        o.frequency.setValueAtTime(620, t);
        o.frequency.linearRampToValueAtTime(920, t + 0.15);
        o.frequency.linearRampToValueAtTime(520, t + 0.45);
        this.osc('sine', 1240, t, 0.35, 0.05 * v, { a: 0.04, f2: 1000 });
        break;
      }
      case 'caw': for (let i = 0; i < 2; i++) { this.osc('sawtooth', 700, t + i * 0.2, 0.14, 0.06 * v, { f2: 480 }); this.noise(t + i * 0.2, 0.12, 0.05 * v, { f: 1400, q: 3 }); } break;
      case 'croak': {
        const o = this.osc('square', 110 + Math.random() * 40, t, 0.28, 0.08 * v, { dest: this.ambBus });
        const am = this.ctx.createOscillator();
        const ag = this.ctx.createGain();
        am.frequency.value = 26;
        ag.gain.value = 60;
        am.connect(ag);
        ag.connect(o.frequency);
        am.start(t);
        am.stop(t + 0.35);
        break;
      }
      case 'owl': [0, 0.35, 0.55].forEach((d, i) => this.osc('sine', i === 0 ? 420 : 380, t + d, 0.28, 0.06 * v, { a: 0.05, dest: this.ambBus, rev: 0.6 })); break;
      case 'ghostMoan': this.osc('sine', 330, t, 1.8, 0.04 * v, { a: 0.5, f2: 220, dest: this.ambBus, rev: 0.9 }); break;
      case 'boing': this.osc('sine', 180, t, 0.3, 0.14 * v, { f2: 620 }); this.osc('sine', 360, t + 0.05, 0.25, 0.05 * v, { f2: 900 }); break;
      case 'crack': for (let i = 0; i < 4; i++) this.noise(t + i * 0.09, 0.05, 0.12 * v, { type: 'highpass', f: 2500 }); break;
      case 'hatch': this.sfx('crack'); [2000, 2400, 2900].forEach((f, i) => this.osc('sine', f, t + 0.3 + i * 0.12, 0.08, 0.08 * v, { f2: f * 1.3 })); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(t + i * 0.13, 0.07, 0.1 * v, { f: 1200, q: 0.8 }); break;
      case 'giggle': [900, 1000, 1150].forEach((f, i) => this.osc('sine', f, t + i * 0.09, 0.07, 0.05 * v, { f2: f * 1.2 })); break;
      case 'hearth': this.osc('sine', 400, t, 1.2, 0.05 * v, { f2: 1600, rev: 0.8 }); this.noise(t, 1.0, 0.05 * v, { f: 3000, q: 0.5, f2: 800 }); break;
      case 'mount': this.noise(t, 0.5, 0.1 * v, { f: 600, q: 0.7, f2: 2400 }); break;
      case 'dance': [74, 77, 81].forEach((n, i) => this.osc('triangle', midi(n), t + i * 0.12, 0.12, 0.06 * v)); break;
      case 'lantern': this.osc('sine', 1800, t, 0.06, 0.04 * v); this.noise(t, 0.08, 0.04 * v, { type: 'highpass', f: 4000 }); break;
      case 'poof': this.noise(t, 0.35, 0.1 * v, { f: 900, q: 0.8, f2: 300 }); break;
      // ---- combate
      case 'swing': this.noise(t, 0.2, 0.1 * v, { f: 700, q: 1.4, f2: 2600 }); this.osc('sine', 180, t, 0.16, 0.04 * v, { f2: 90 }); break;
      case 'whiff': this.noise(t, 0.14, 0.06 * v, { f: 1400, q: 1.2, f2: 600 }); break;
      case 'hit':
        this.osc('sine', 190, t, 0.14, 0.24 * v, { f2: 55 });
        this.noise(t, 0.09, 0.16 * v, { type: 'lowpass', f: 1100 });
        this.osc('triangle', 520, t, 0.05, 0.05 * v, { f2: 300 });
        break;
      case 'crit':
        this.sfx('hit', v * 1.2);
        this.bell(1318, t + 0.02, 0.08 * v, 0.5);
        this.osc('square', 880, t + 0.02, 0.08, 0.03 * v, { f2: 1760 });
        break;
      case 'hurt': this.osc('sawtooth', 330, t, 0.14, 0.06 * v, { f2: 190 }); this.noise(t, 0.1, 0.1 * v, { type: 'lowpass', f: 700 }); break;
      case 'mobDie': this.osc('sine', 420, t, 0.45, 0.07 * v, { f2: 110, rev: 0.3 }); this.noise(t + 0.1, 0.3, 0.07 * v, { f: 900, q: 0.8, f2: 300 }); break;
      case 'death':
        [659, 523, 440, 330, 247].forEach((f, i) => this.bell(f, t + i * 0.28, 0.1 * v, 1.8, this.sfxBus, 0.7));
        this.osc('sawtooth', 110, t, 2.2, 0.03 * v, { a: 0.3, f2: 55, rev: 0.6 });
        break;
      case 'fireball': this.noise(t, 0.3, 0.1 * v, { f: 500, q: 1.2, f2: 1800 }); this.osc('sine', 140, t, 0.2, 0.08 * v, { f2: 70 }); break;
      case 'fireHit': for (let i = 0; i < 4; i++) this.noise(t + i * 0.05, 0.06, 0.08 * v, { type: 'highpass', f: 1800 + i * 300 }); this.osc('sine', 120, t, 0.18, 0.1 * v, { f2: 50 }); break;
      case 'drink': [0, 0.14, 0.28].forEach((d, i) => this.osc('sine', 420 + i * 90, t + d, 0.1, 0.07 * v, { f2: 700 + i * 90 })); break;
      case 'squeak': [0, 0.11].forEach((d) => this.osc('sine', 2100, t + d, 0.08, 0.06 * v, { f2: 2900 })); break;
      case 'rattle': for (let i = 0; i < 6; i++) this.noise(t + i * 0.045, 0.03, 0.1 * v, { type: 'bandpass', f: 1800 + (i % 2) * 700, q: 4 }); break;
      case 'hiss': this.noise(t, 0.55, 0.07 * v, { type: 'highpass', f: 3200, a: 0.06 }); break;
      case 'screech': [0, 0.07, 0.14].forEach((d, i) => this.osc('sine', 2600 + i * 300, t + d, 0.06, 0.05 * v, { f2: 3600 })); break;
      case 'glub': [0, 0.13, 0.24].forEach((d, i) => this.osc('sine', 260 + i * 60, t + d, 0.09, 0.09 * v, { f2: 620 + i * 80 })); break;
      // ---------------- mansão e voo
      case 'door':
        // dobradiça rangendo + baque da folha
        this.osc('sawtooth', 190, t, 0.55, 0.035 * v, { f2: 330, a: 0.08, rev: 0.4 });
        this.osc('sawtooth', 240, t + 0.12, 0.4, 0.025 * v, { f2: 170, a: 0.05, rev: 0.4 });
        this.noise(t + 0.62, 0.22, 0.16 * v, { type: 'lowpass', f: 420 });
        this.osc('sine', 70, t + 0.62, 0.3, 0.14 * v, { f2: 45 });
        break;
      case 'creak': {
        const f = 150 + Math.random() * 90;
        this.osc('sawtooth', f, t, 0.35, 0.018 * v, { f2: f * (1.2 + Math.random() * 0.4), a: 0.06, dest: this.ambBus, rev: 0.6 });
        break;
      }
      case 'tick': this.noise(t, 0.025, 0.06 * v, { type: 'bandpass', f: 3200, q: 6 }); break;
      case 'tock': this.noise(t, 0.03, 0.06 * v, { type: 'bandpass', f: 2100, q: 6 }); break;
      case 'chime': [659, 523, 587, 392].forEach((f, i) => this.bell(f, t + i * 0.5, 0.07 * v, 2.2, this.sfxBus, 0.7)); break;
      case 'organ': {
        // acorde de órgão de tubos (Ré menor com a quinta embaixo)
        const notes = [38, 50, 57, 62, 65, 69];
        for (const n of notes) for (const det of [-4, 4]) this.osc('square', midi(n), t, 2.4, 0.012 * v, { a: 0.18, detune: det, rev: 0.9 });
        this.osc('sine', midi(26), t, 2.6, 0.06 * v, { a: 0.3, rev: 0.6 });
        break;
      }
      case 'organNote': {
        const n = [62, 65, 69, 74, 72, 70, 69, 65][Math.floor(Math.random() * 8)];
        this.osc('square', midi(n), t, 0.9, 0.012 * v, { a: 0.06, rev: 0.9 });
        this.osc('square', midi(n - 12), t, 0.9, 0.01 * v, { a: 0.06, rev: 0.9 });
        break;
      }
      case 'fire': for (let i = 0; i < 3; i++) this.noise(t + Math.random() * 0.25, 0.03, 0.05 * v, { type: 'highpass', f: 2200 + Math.random() * 1800 }); break;
      case 'flap': this.noise(t, 0.12, 0.09 * v, { type: 'bandpass', f: 520, q: 0.9, f2: 260 }); break;
      case 'whoosh': this.noise(t, 0.6, 0.12 * v, { type: 'bandpass', f: 400, q: 0.7, f2: 1800 }); this.osc('sine', 220, t, 0.4, 0.04 * v, { f2: 660 }); break;
      case 'clue': [784, 988, 1175, 1568].forEach((f, i) => this.bell(f, t + i * 0.07, 0.07 * v, 1.1, this.sfxBus, 0.6)); break;
      case 'chest': this.osc('sawtooth', 140, t, 0.5, 0.03 * v, { f2: 260, a: 0.1, rev: 0.3 }); this.noise(t + 0.45, 0.12, 0.1 * v, { type: 'lowpass', f: 600 }); break;
      case 'yawn': this.osc('sine', 900, t, 0.7, 0.04 * v, { f2: 420, a: 0.1 }); break;
      default: break;
    }
  }
}
