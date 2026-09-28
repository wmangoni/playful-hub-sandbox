import * as THREE from 'three';
import { World } from './world/world.js';
import { planWorld, populateWorld } from './world/populate.js';
import { Sky } from './world/sky.js';
import { DayNight } from './world/daynight.js';
import { PostFX, LAYER_FX } from './render/postfx.js';
import { SHARED } from './render/toon.js';
import { Input } from './core/input.js';
import { Player } from './entities/player.js';
import { WowCamera } from './entities/camera.js';
import { Ambience } from './fx/ambience.js';
import { Effects } from './fx/effects.js';
import { Audio } from './audio/audio.js';
import { Abilities } from './abilities.js';
import { Interaction } from './quests/interact.js';
import { Progress } from './quests/progress.js';
import { QuestWorld } from './quests/questWorld.js';
import { UI } from './ui/hud.js';
import { AmbientLife } from './entities/ambientLife.js';
import { Combat } from './combat/combat.js';
import { ZONE_NAME } from './world/layout.js';

const nextFrame = () => new Promise((r) => setTimeout(r, 16));

export const QUALITY = {
  baixa: { scale: 0.7, shadow: 1024, bloom: false, msaa: false, maxPR: 1, grass: 0.45 },
  media: { scale: 1.0, shadow: 2048, bloom: true, msaa: false, maxPR: 1, grass: 0.75 },
  alta: { scale: 1.0, shadow: 2048, bloom: true, msaa: true, maxPR: 1.5, grass: 1.0 },
};

const DEFAULT_SETTINGS = { master: 0.8, music: 0.45, sfx: 0.8, sens: 0.0045, invertY: false, pointerLock: false, uiScale: 1, showFps: false, daySpeed: 1 };
const START = { x: 1.5, z: 19.5, yaw: Math.PI - 0.25 };

function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento */
  }
}

export class Game {
  constructor(container) {
    this.container = container;
    this.params = new URLSearchParams(location.search);
    this.qualityName = this.params.get('q') || lsGet('tbl-quality') || 'media';
    if (!QUALITY[this.qualityName]) this.qualityName = 'media';
    this.quality = QUALITY[this.qualityName];
    try {
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(lsGet('tbl-settings') || '{}') };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    this.time = 0;
    this.state = 'loading';
    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsN = 0;
    window.__game = this;
  }

  async init(progress = () => {}) {
    const q = this.quality;
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.maxPR) * q.scale);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.id = 'game-canvas';
    renderer.info.autoReset = false;
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x221c40, 0.008, 0.5);
    this.scene = scene;
    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.3, 1400);
    camera.layers.enable(LAYER_FX);
    this.camera = camera;

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    const sc = sun.shadow.camera;
    sc.left = -44; sc.right = 44; sc.top = 44; sc.bottom = -44; sc.near = 1; sc.far = 260;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
    scene.add(sun, sun.target);
    const hemi = new THREE.HemisphereLight(0x8888ff, 0x221133, 1.2);
    scene.add(hemi);
    this.sun = sun;
    this.hemi = hemi;

    progress(0.05, 'Cavando o terreno…');
    await nextFrame();
    this.world = new World(this);
    this.world.buildTerrain();
    progress(0.3, 'Planejando a vila…');
    await nextFrame();
    this.plan = planWorld(this.world);
    this.world.finishTerrain();
    this.populated = await populateWorld(this.world, this.plan, async (p, m) => {
      progress(p, m);
      await nextFrame();
    });
    progress(0.88, 'Acendendo as lanternas…');
    await nextFrame();

    this.sky = new Sky();
    this.sky.uniforms.uTile.value = this.world.terrain.tileTex;
    scene.add(this.sky.mesh);
    this.post = new PostFX(renderer, scene, camera, { msaa: q.msaa, bloom: q.bloom });
    this.dayNight = new DayNight({ scene, sky: this.sky, sun, hemi, post: this.post, renderer, terrain: this.world.terrain });
    this.dayNight.speed = this.settings.daySpeed;

    this.ambience = new Ambience(this, this.populated);
    this.input = new Input(renderer.domElement);
    this.input.pointerLock = this.settings.pointerLock;
    this.player = new Player(this);
    scene.add(this.player.object);
    this.cam = new WowCamera(camera, this.world);
    this.cam.sens = this.settings.sens;
    this.cam.invertY = this.settings.invertY;
    this.interaction = new Interaction(this);
    this.progress = new Progress();
    this.fx = new Effects(this);
    this.audio = new Audio();
    this.abilities = new Abilities(this);
    progress(0.93, 'Acordando os vizinhos…');
    await nextFrame();
    this.questWorld = new QuestWorld(this);
    this.life = new AmbientLife(this);
    this.combat = new Combat(this);
    this.questWorld.npcList.push(this.life.zombie);
    this.ui = new UI(this);
    this.progress.extraSave = () => ({ pos: [+this.player.pos.x.toFixed(2), +this.player.pos.z.toFixed(2)], yaw: +this.player.yaw.toFixed(3), time: +this.dayNight.time.toFixed(2) });
    this.player.onStep = () => {
      const p = this.player;
      if (p.wading > 0.1) this.fx.splash(p.pos);
      else if (this.world.terrain.roadDistAt(p.pos.x, p.pos.z) < 0) this.fx.dust(p.pos);
      this.audio.sfx(p.wading > 0.1 ? 'stepWater' : 'step', 0.7);
    };
    this.player.onLand = (k) => this.audio.sfx('land', 0.4 + k);
    this.input.onKey = (code, e) => this.onKey(code, e);

    this.player.teleport(START.x, START.z, START.yaw);
    this.cam.snapBehind(this.player);
    window.addEventListener('resize', () => this.resize());
    progress(0.97, 'Afiando as presas do Conde…');
    await nextFrame();
    renderer.compile(scene, camera);
    progress(1, 'Pronto!');
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
  }

  start() {
    this.last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const raw = (now - this.last) / 1000;
      this.last = now;
      this.tick(Math.min(0.05, Math.max(0, raw)), raw);
    };
    this._raf = requestAnimationFrame(loop);
    const p = this.params;
    if (p.has('play') || p.has('pos')) this.beginPlay(p.has('cont'));
    else this.showTitle();
  }

  // ------------------------------------------------------------ fluxo
  showTitle() {
    this.state = 'title';
    this.dayNight.setTime(18.35);
    const el = document.createElement('div');
    el.id = 'title';
    const has = Progress.hasSave();
    el.innerHTML = `<div class="logo"><h1>Tumbalacatumba</h1><p>Contos do Vale Assombrado</p></div>
      <div class="menu">${has ? '<button class="wbtn" data-a="cont">Continuar</button>' : ''}<button class="wbtn" data-a="new">${has ? 'Novo Jogo' : 'Jogar'}</button></div>
      <div class="hint">Controles como no <b>World of Warcraft</b>: <b>W A S D</b> para andar · segure o <b>botão direito</b> do mouse para girar câmera e personagem · <b>botão esquerdo</b> gira só a câmera · <b>clique direito</b> em alguém para conversar · roda do mouse = zoom.</div>
      <div class="credit">feito com three.js · 100% procedural</div>`;
    document.body.appendChild(el);
    this.titleEl = el;
    // a trilha começa no primeiro gesto (regra de autoplay dos navegadores)
    const wake = () => {
      this.audio.init();
      for (const k of ['master', 'music', 'sfx']) this.audio.setVolume(k, this.settings[k]);
    };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      if (b.dataset.a === 'new' && has) {
        this.ui.confirm('Começar um jogo novo? O progresso salvo será apagado.', () => this.beginPlay(false), { yes: 'Começar', no: 'Cancelar' });
        return;
      }
      this.beginPlay(b.dataset.a === 'cont');
    }));
  }

  beginPlay(cont) {
    if (this.state === 'play') return;
    this.audio.init();
    for (const k of ['master', 'music', 'sfx']) this.audio.setVolume(k, this.settings[k]);
    const P = this.progress;
    let restored = false;
    if (cont) {
      const d = P.load();
      if (d) {
        restored = true;
        if (d.pos) this.player.teleport(d.pos[0], d.pos[1], d.yaw ?? 0);
        if (d.time !== undefined) this.dayNight.setTime(d.time);
        this.questWorld.applyState();
        this.ui.renderTracker();
        this.ui.renderPlayer();
      }
    }
    if (!restored) {
      if (!this.params.has('cont')) Progress.clearSave();
      const t = parseFloat(this.params.get('t'));
      this.dayNight.setTime(Number.isNaN(t) ? 17.2 : t);
      const pos = this.params.get('pos');
      if (pos) {
        const [x, z] = pos.split(',').map(Number);
        this.player.teleport(x, z, parseFloat(this.params.get('yaw') ?? START.yaw));
      } else this.player.teleport(START.x, START.z, START.yaw);
    }
    this.cam.snapBehind(this.player);
    if (this.params.has('pitch')) this.cam.pitch = parseFloat(this.params.get('pitch'));
    if (this.params.has('dist')) this.cam.targetDist = this.cam.dist = this.cam.curDist = parseFloat(this.params.get('dist'));
    if (this.titleEl) {
      this.titleEl.classList.add('gone');
      setTimeout(() => this.titleEl?.remove(), 1300);
    }
    this.state = 'play';
    this.ui.show();
    setTimeout(() => this.ui.zoneText(ZONE_NAME, '(Território Levemente Assombrado)'), 400);
    if (!restored && !this.params.has('notut')) setTimeout(() => this.ui.startTutorial(), 2500);
    clearInterval(this._saveTimer);
    this._saveTimer = setInterval(() => this.progress.save(), 15000);
    window.addEventListener('beforeunload', () => this.progress.save());
  }

  titleCamera(dt) {
    this._titleA = (this._titleA ?? 0.9) + dt * 0.035;
    const a = this._titleA;
    this.camera.position.set(Math.cos(a) * 44, 20 + Math.sin(a * 0.7) * 3, Math.sin(a) * 44 + 4);
    this.camera.lookAt(0, 8, -2);
    this.cam.pivot.set(0, 3, 0);
  }

  fade(dur, mid) {
    const f = document.getElementById('fade');
    f.classList.add('on');
    setTimeout(() => {
      mid?.();
      setTimeout(() => f.classList.remove('on'), 150);
    }, dur * 1000 + 700);
  }

  onKey(code, e) {
    if (this.state !== 'play') return false;
    const ui = this.ui;
    if (code === 'Escape') {
      ui.escape();
      return true;
    }
    if (ui.chatOpen) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (code === 'Enter' || code === 'NumpadEnter') {
      ui.openChat();
      return true;
    }
    if (code === 'Slash') {
      ui.openChat();
      ui.chatInput.value = '/';
      return true;
    }
    if (code === 'KeyL') return ui.qlog.toggle(), true;
    if (code === 'KeyM') return ui.toggleMap(), true;
    if (code === 'KeyB') return ui.bags.toggle(), true;
    if (code === 'KeyX') return this.abilities.sit(), true;
    if (code === 'KeyZ') return ui.root.classList.toggle('hidden'), true;
    const slot = ui.slots.find((s) => s.code === code);
    if (slot) {
      ui.useSlot(slot);
      return true;
    }
    return false;
  }

  applySetting(k, v) {
    const s = this.settings;
    if (k === 'hour') return this.dayNight.setTime(v);
    if (k === 'quality') {
      lsSet('tbl-quality', v);
      if (v !== this.qualityName) {
        this.ui.confirm('A qualidade gráfica muda ao recarregar. Recarregar agora? (o progresso é salvo)', () => {
          this.progress.save();
          location.reload();
        }, { yes: 'Recarregar', no: 'Depois' });
      }
      return;
    }
    s[k] = v;
    if (k === 'master' || k === 'music' || k === 'sfx') this.audio.setVolume(k, v);
    if (k === 'sens') this.cam.sens = v;
    if (k === 'invertY') this.cam.invertY = v;
    if (k === 'pointerLock') this.input.pointerLock = v;
    if (k === 'uiScale') this.ui.applyScale();
    if (k === 'daySpeed') this.dayNight.speed = v;
    lsSet('tbl-settings', JSON.stringify(s));
  }

  // ------------------------------------------------------------ loop
  tick(dt, raw = dt) {
    this.time += dt;
    SHARED.uTime.value = this.time;
    this.update(dt);
    this.renderer.info.reset();
    this.post.render(dt, this.time);
    this.input.endFrame();
    this._trackPerf(raw);
  }

  _trackPerf(raw) {
    this._fpsAcc += raw;
    this._fpsN++;
    if (this._fpsAcc > 0.5) {
      this.fps = this._fpsN / this._fpsAcc;
      this._fpsAcc = 0;
      this._fpsN = 0;
      this._adapt();
    }
  }

  /** resolução adaptativa: se o FPS cair, renderiza um pouco menor (a interface continua nítida) */
  _adapt() {
    if (this.qualityName === 'alta' || this.state !== 'play' || document.hidden) return;
    this._fpsHist = [...(this._fpsHist ?? []), this.fps].slice(-6);
    if (this._fpsHist.length < 6) return;
    const avg = this._fpsHist.reduce((a, b) => a + b, 0) / 6;
    const cur = this.dynScale ?? 1;
    let next = cur;
    if (avg < 48 && cur > 0.62) next = Math.max(0.62, cur - 0.1);
    else if (avg > 58.5 && cur < 1) next = Math.min(1, cur + 0.05);
    if (next !== cur) {
      this.dynScale = next;
      this._fpsHist = [];
      const q = this.quality;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.maxPR) * q.scale * next);
      this.resize();
    }
  }

  update(dt) {
    const blocking = this.ui.blocking();
    if (this.state === 'play') {
      if (!blocking) this.cam.handleInput(this.input);
      this.player.update(dt, this.input, this.cam, !blocking);
      this.cam.update(dt, this.player, this.input);
      this.interaction.update();
    } else {
      this.titleCamera(dt);
      this.player.update(dt, this.input, this.cam, false);
    }
    this.dayNight.update(dt);
    this.sky.update(this.camera, this.time);
    this.world.water.update(this.dayNight);
    this.world.update(dt, this.time);
    this.questWorld.update(dt, this.time);
    this.life.update(dt, this.time);
    this.combat.update(dt);
    this.ambience.update(dt);
    this.fx.update(dt);
    this.updateClockHands();
    this._updateShadow();
    this.ui.update(dt);
    this.audio.update(dt, this);
  }

  updateClockHands() {
    const hands = this.populated.anchors.clockHands;
    if (!hands) return;
    const t = this.dayNight.time;
    const hr = -((t % 12) / 12) * Math.PI * 2;
    const mn = -((t % 1) * Math.PI * 2);
    for (const h of hands) {
      h.hh.rotation.z = hr;
      h.mh.rotation.z = mn;
    }
  }

  _updateShadow() {
    const sun = this.sun;
    const p = this.state === 'play' ? this.player.pos : this.cam.pivot;
    const L = this.dayNight.lightDir;
    const size = (sun.shadow.camera.right - sun.shadow.camera.left) / sun.shadow.mapSize.x;
    const up = Math.abs(L.y) > 0.99 ? _X : _Y;
    _r.crossVectors(up, L).normalize();
    _u.crossVectors(L, _r).normalize();
    const a = Math.round(p.dot(_r) / size) * size;
    const b = Math.round(p.dot(_u) / size) * size;
    const c = p.dot(L);
    _t.copy(_r).multiplyScalar(a).addScaledVector(_u, b).addScaledVector(L, c);
    sun.target.position.copy(_t);
    sun.position.copy(_t).addScaledVector(L, 120);
    sun.target.updateMatrixWorld();
  }

  get debug() {
    return {
      setTime: (h) => this.dayNight.setTime(h),
      /** liga/desliga o modo pacífico (criaturas não atacam) */
      peace: (v = !this.combat.peaceful) => (this.combat.peaceful = v),
      tp: (x, z) => this.player.teleport(x, z),
      cam: (yaw, pitch, dist) => {
        if (yaw !== undefined) this.cam.yaw = this.player.yaw = yaw;
        if (pitch !== undefined) this.cam.pitch = pitch;
        if (dist !== undefined) this.cam.dist = this.cam.targetDist = this.cam.curDist = dist;
      },
      frames: (n = 10, dt = 1 / 30) => {
        for (let i = 0; i < n; i++) this.tick(dt);
      },
      info: () => ({
        pos: this.player.pos.toArray().map((v) => +v.toFixed(2)),
        yaw: +this.player.yaw.toFixed(3),
        time: this.dayNight.clockText(),
        fps: Math.round(this.fps),
        calls: this.renderer.info.render.calls,
        tris: this.renderer.info.render.triangles,
        state: this.state,
      }),
    };
  }
}

const _X = new THREE.Vector3(1, 0, 0);
const _Y = new THREE.Vector3(0, 1, 0);
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
const _t = new THREE.Vector3();
