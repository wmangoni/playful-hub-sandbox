import * as THREE from 'three';
import { World } from './world/world.js';
import { planWorld, populateWorld } from './world/populate.js';
import { Sky } from './world/sky.js';
import { DayNight } from './world/daynight.js';
import { PostFX, LAYER_FX } from './render/postfx.js';
import { SHARED, useRadialFog } from './render/toon.js';
import { FarCull } from './render/farCull.js';
import { InstanceSet } from './world/props/batch.js';
import { grassMat } from './world/props/small.js';
import { Input } from './core/input.js';
import { TouchControls, prefersTouch } from './core/touch.js';
import { TouchBar } from './ui/touchBar.js';
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
import { Indoors } from './world/interior/indoors.js';
import { ZONE_NAME } from './world/layout.js';
import { BOOT_TIPS } from './quests/data.js';

const nextFrame = () => new Promise((r) => setTimeout(r, 16));

export const QUALITY = {
  baixa: { scale: 0.7, shadow: 1024, bloom: false, msaa: false, maxPR: 1, grass: 0.45 },
  media: { scale: 1.0, shadow: 2048, bloom: true, msaa: false, maxPR: 1, grass: 0.75 },
  alta: { scale: 1.0, shadow: 2048, bloom: true, msaa: true, maxPR: 1.5, grass: 1.0 },
  // celular: sombra menor e mais curta; grama rala que afunda no chão e some com a distância; cenário longe
  // cortado (a neblina fica um pouco mais densa e esconde o corte) e fora do contorno; PNJs, criaturas e bichos
  // aparecem mais perto (lod); no máximo 60 quadros (telas de 90/120 Hz) e resolução adaptativa que só cai abaixo
  // dos 30 FPS. O bloom fica: roda em meia resolução ou menos e é o que faz a noite brilhar
  movel: {
    scale: 1.0, shadow: 1024, shadowBox: 30, bloom: true, msaa: false, maxPR: 1, grass: 0.35,
    grassFar: 55, outlineFar: 100, viewFar: 170, fogMin: 0.0068, lod: 0.75, cap: 60,
    adapt: { min: 0.75, down: 28, up: 42 },
  },
};
// resolução adaptativa dos presets de desktop: mira 60, aceita 48
const ADAPT = { min: 0.62, down: 48, up: 58.5 };

// controls: 'auto' (toque quando a tela de toque é a entrada principal), 'on' (sempre) ou 'off' (nunca)
const DEFAULT_SETTINGS = { master: 0.8, music: 0.45, sfx: 0.8, sens: 0.0045, invertY: false, pointerLock: false, uiScale: 1, showFps: false, daySpeed: 1, controls: 'auto' };
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
    // sem qualidade escolhida: no celular/tablet (tela de toque como entrada principal) o preset leve
    this.qualityName = this.params.get('q') || lsGet('tbl-quality') || (prefersTouch() ? 'movel' : 'media');
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
    this._watchContext(renderer.domElement);

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
    const sb = q.shadowBox ?? 44;
    sc.left = -sb; sc.right = sb; sc.top = sb; sc.bottom = -sb; sc.near = 1; sc.far = 260;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
    scene.add(sun, sun.target);
    const hemi = new THREE.HemisphereLight(0x8888ff, 0x221133, 1.2);
    scene.add(hemi);
    this.sun = sun;
    this.hemi = hemi;

    // celular (antes de compilar qualquer material): a grama afunda no chão com a distância e a neblina conta a
    // distância até a câmera, igual ao corte do cenário longe
    if (q.grassFar) grassMat.defines = { ...grassMat.defines, GRASS_FAR: q.grassFar.toFixed(1) };
    if (q.viewFar) useRadialFog();
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
    this.dayNight.fogMin = q.fogMin ?? 0;

    this.ambience = new Ambience(this, this.populated);
    // tudo o que é cenário de fora vai para um grupo: dentro da mansão ele nem é desenhado
    this.outdoor = new THREE.Group();
    this.outdoor.name = 'mundo-de-fora';
    for (const o of [...scene.children]) {
      if (o.isLight || o === sun.target) continue;
      this.outdoor.add(o);
    }
    scene.add(this.outdoor);
    if (q.viewFar) {
      this.farCull = new FarCull(InstanceSet.batch.meshes, { viewFar: q.viewFar, grassFar: q.grassFar, outlineFar: q.outlineFar, grassMat, loose: this.populated.loose });
      this.post.normalPass.cull = this.farCull;
      this.post.setOutlineFar(q.outlineFar);
    }
    this.input = new Input(renderer.domElement);
    this.input.lastPointer = prefersTouch() ? 'touch' : 'mouse';
    this.setupTouch();
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
    for (const k of ['fireflies', 'wisps', 'leaves', 'embers', 'bubbles', 'bats']) if (this.fx[k]?.points) this.outdoor.add(this.fx[k].points);
    progress(0.91, 'Arrumando a mansão do Conde…');
    await nextFrame();
    this.indoors = new Indoors(this);
    await this.indoors.build((m) => progress(0.92, m));
    this.world.interior = this.indoors;
    progress(0.93, 'Acordando os vizinhos…');
    await nextFrame();
    const early = new Set(scene.children);
    this.questWorld = new QuestWorld(this);
    this.life = new AmbientLife(this);
    this.combat = new Combat(this);
    this.questWorld.npcList.push(this.life.zombie);
    // o que as missões, a vida ambiente e o combate puseram na cena também é de fora (menos os PNJs da mansão)
    const indoorNpcs = new Set(this.questWorld.npcList.filter((n) => n.indoorLevel).map((n) => n.rig.root));
    for (const o of [...scene.children]) {
      if (!early.has(o) && !o.isLight && !indoorNpcs.has(o)) this.outdoor.add(o);
    }
    this.ui = new UI(this);
    this.progress.extraSave = () => {
      // salvou dentro da mansão: volta na frente da porta (o interior não é carregado direto)
      const o = this.indoors?.active ? this.indoors.outsidePos() : null;
      const x = o ? o.x : this.player.pos.x, z = o ? o.z : this.player.pos.z, yaw = o ? o.yaw : this.player.yaw;
      return { pos: [+x.toFixed(2), +z.toFixed(2)], yaw: +yaw.toFixed(3), time: +this.dayNight.time.toFixed(2) };
    };
    this.player.onStep = () => {
      const p = this.player;
      if (p.wading > 0.1) this.fx.splash(p.pos);
      else if (this.world.terrain.roadDistAt(p.pos.x, p.pos.z) < 0) this.fx.dust(p.pos);
      this.audio.sfx(p.wading > 0.1 ? 'stepWater' : 'step', 0.7);
    };
    this.player.onLand = (k) => this.audio.sfx('land', 0.4 + k);
    this.player.onFlap = () => this.audio.sfx('flap', 0.8);
    this.input.onKey = (code, e) => this.onKey(code, e);

    this.player.teleport(START.x, START.z, START.yaw);
    this.cam.snapBehind(this.player);
    window.addEventListener('resize', () => this.resize());
    progress(0.97, 'Afiando as presas do Conde…');
    await nextFrame();
    // compila também os materiais do interior (senão a primeira entrada dá um tranco)
    const wasIn = this.indoors.root.visible;
    this.indoors.root.visible = true;
    renderer.compile(scene, camera);
    this.indoors.root.visible = wasIn;
    progress(1, 'Pronto!');
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
  }

  /**
   * o sistema pode tirar a placa de vídeo do jogo (no celular: outro app pesado, muito tempo em segundo plano).
   * Salva, avisa e recarrega quando ela volta: o que foi desenhado só na GPU (como a luz dos postes no chão)
   * não voltaria sozinho
   */
  _watchContext(cv) {
    cv.addEventListener('webglcontextlost', (e) => this._onContextLost(e));
    cv.addEventListener('webglcontextrestored', () => location.reload());
  }
  _onContextLost(e) {
    e.preventDefault(); // deixa o navegador devolver o contexto depois
    this.contextLost = true;
    if (this.state === 'play') this.progress?.save();
    if (document.getElementById('ctxlost')) return;
    const el = document.createElement('div');
    el.id = 'ctxlost';
    el.innerHTML = '<b>O vale piscou…</b><span>O aparelho precisou da placa de vídeo para outra coisa. Seu progresso foi salvo.</span><button class="wbtn">Recarregar</button>';
    el.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(el);
  }

  start() {
    this.last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      this._frame(now);
    };
    this._raf = requestAnimationFrame(loop);
    const p = this.params;
    if (p.has('play') || p.has('pos')) this.beginPlay(p.has('cont'));
    else this.showTitle();
  }

  /**
   * um quadro do requestAnimationFrame. Celular com tela de 90/120 Hz: no máximo q.cap quadros (bateria e
   * aquecimento), sempre no mesmo ritmo (120 Hz → 60, 90 Hz → 45). A folga de 22% deixa passar todo quadro de
   * uma tela de até 75 Hz (com 2 ms, uma tela de 75 Hz caía para 37,5) e segura a variação do relógio a 60 Hz.
   * Devolve se desenhou
   */
  _frame(now) {
    const raw = (now - this.last) / 1000;
    if (this.quality.cap && raw < 0.78 / this.quality.cap) return false;
    this.last = now;
    this.tick(Math.min(0.05, Math.max(0, raw)), raw);
    return true;
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
      <div class="hint hint-mouse">Controles de <b>MMO clássico</b>: <b>W A S D</b> para andar · segure o <b>botão direito</b> do mouse para girar câmera e personagem · <b>botão esquerdo</b> gira só a câmera · <b>clique direito</b> em alguém para conversar · roda do mouse = zoom.</div>
      <div class="hint hint-touch">Arraste o <b>lado esquerdo</b> da tela para andar · arraste o <b>lado direito</b> para girar a câmera · <b>pinça</b> = zoom · <b>toque</b> em alguém para conversar · <b>toque longo</b> mostra o que é.</div>
      <div class="credit">feito com three.js · 100% procedural</div>`;
    document.body.appendChild(el);
    this.titleEl = el;
    // a trilha começa no primeiro gesto (regra de autoplay dos navegadores)
    const wake = () => {
      this.audio.init();
      for (const k of ['master', 'music', 'sfx']) this.audio.setVolume(k, this.settings[k]);
    };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('touchend', wake, { once: true }); // iOS só libera áudio em touchend/click
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
    if (!this._saveHooks) {
      this._saveHooks = true;
      // no celular o beforeunload quase nunca chega (o sistema mata a aba em segundo plano): salva ao sair do app
      const save = () => this.state === 'play' && this.progress.save();
      window.addEventListener('beforeunload', save);
      window.addEventListener('pagehide', save);
      document.addEventListener('visibilitychange', () => document.hidden && save());
    }
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

  applySetting(k, v, { confirmed = false } = {}) {
    const s = this.settings;
    if (k === 'controls' && v === 'off' && this.touchMode && !confirmed) {
      const sel = document.querySelector('#options [data-k=controls]');
      if (sel) sel.value = s.controls; // só muda se o jogador confirmar
      this.ui.confirm('Sem os controles de toque, só dá para jogar com teclado e mouse. Desligar mesmo?', () => {
        this.applySetting('controls', 'off', { confirmed: true });
        if (sel) sel.value = 'off';
      }, { yes: 'Desligar', no: 'Cancelar' });
      return;
    }
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
    if (k === 'controls') this.setupTouch();
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
    if (this.contextLost) return;
    this.time += dt;
    SHARED.uTime.value = this.time;
    this.update(dt);
    if (this.farCull && !this.indoors?.active) this.farCull.update(this.camera.position);
    // antes de desenhar: se a resolução adaptativa mudar, o redimensionamento limpa o canvas, e depois do
    // render o quadro apresentado saía todo preto (uma piscada a cada troca de escala)
    // em pé não desenha: os quadros ficariam baratos e a resolução adaptativa subiria à toa
    if (!this.portraitPaused) this._trackPerf(raw);
    this.renderer.info.reset();
    if (!this.portraitPaused) this.post.render(dt, this.time);
    this.input.endFrame();
  }

  _trackPerf(raw) {
    // quadro de volta do segundo plano (ou de um travamento longo) não é medida de desempenho: no celular ele
    // derrubava a média e a resolução a cada volta ao app
    if (raw > 0.25) {
      this._fpsAcc = 0;
      this._fpsN = 0;
      return;
    }
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
    const cur = this.dynScale ?? 1, A = this.quality.adapt ?? ADAPT;
    let next = cur;
    if (avg < A.down && cur > A.min) next = Math.max(A.min, cur - 0.1);
    else if (avg > A.up && cur < 1) next = Math.min(1, cur + 0.05);
    if (next !== cur) {
      this.dynScale = next;
      this._fpsHist = [];
      const q = this.quality;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.maxPR) * q.scale * next);
      this.resize();
    }
  }

  /** cria (ou desliga) os controles de toque conforme a opção 'controls' */
  setupTouch() {
    const c = this.settings.controls;
    const capable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!this.touch && (c === 'on' || (c === 'auto' && capable))) this.touch = new TouchControls(this.input, this);
    this.touch?.setEnabled(c !== 'off');
    if (c === 'off') this.input.lastPointer = 'mouse';
  }
  /** joystick e botões na tela? ('auto' segue o último jeito que o jogador usou: dedo ou mouse) */
  get touchMode() {
    const c = this.settings.controls;
    return !!this.touch?.enabled && (c === 'on' || (c === 'auto' && this.input.lastPointer === 'touch'));
  }
  _syncTouchMode() {
    const tm = this.touchMode, show = tm && this.state === 'play';
    if (tm !== this._tm) {
      this._tm = tm;
      document.body.classList.toggle('touch', tm);
      if (!tm) this.touch?.reset();
      if (this.ui) {
        if (tm && !this.touchBar) this.touchBar = new TouchBar(this, this.ui, this.touch.root);
        this.ui.setTouchLayout(tm);
      }
    }
    if (show !== this._tmShow) {
      this._tmShow = show;
      this.touch?.root.classList.toggle('show', show);
    }
  }

  update(dt) {
    this.touch?.update(dt);
    this._syncTouchMode();
    // celular em pé (aviso "Vire o celular" na tela): o mundo espera e o tick nem desenha (bateria)
    this.portraitPaused = !!this._tm && this.state === 'play' && window.innerHeight > window.innerWidth;
    if (this.portraitPaused) return;
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
    this.indoors.update(dt);
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
      /** dicas da tela de carregamento (o e2e confere as de toque) */
      bootTips: () => BOOT_TIPS,
      /** liga/desliga o modo pacífico (criaturas não atacam) */
      peace: (v = !this.combat.peaceful) => (this.combat.peaceful = v),
      tp: (x, z) => this.player.teleport(x, z),
      /** entra/sai da mansão sem fade; room('biblioteca') leva ao centro do cômodo */
      enter: () => this.indoors.enter({ instant: true }),
      exit: () => this.indoors.exit({ instant: true }),
      room: (id) => this.indoors.debugGo(id),
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
