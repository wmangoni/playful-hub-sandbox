// Mobília e decoração de cada cômodo da Mansão Dentúcio, luzes, objetos animados e coisas clicáveis.
import * as THREE from 'three';
import { S } from '../../render/builder.js';
import { PAL } from '../props/palette.js';
import { RNG } from '../../util/rng.js';
import { TAU, clamp, damp } from '../../util/math.js';
import { Interactable } from '../../quests/interact.js';
import { makeSparkle } from '../../entities/npc.js';
import { IKit, at } from './kit.js';
import * as F from './furniture.js';
import { PORTRAITS } from './textures.js';
import { INTERIOR, LV, ROOM, WINDOWS } from './plan.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = (lv) => LV[lv].y;
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

export class Decor {
  constructor(io, kits, M) {
    this.io = io;
    this.kits = kits;
    this.M = M;
    this.rng = new RNG(4242);
    this.objects = []; // grupos soltos (animados) adicionados ao interior
    this.mapItems = []; // silhuetas para a planta
    this.anchors = {}; // pontos do mundo para as missões (coordenadas do mundo)
    this.flavor = []; // coisas clicáveis só pela graça
  }

  // ------------------------------------------------------------ ajudantes
  /** monta fn num kit local e mescla no cômodo; devolve o retorno de fn com pontos já no espaço do interior */
  put(room, fn, x, y, z, ry = 0, s = 1, ...args) {
    const k = new IKit();
    const ret = fn(k, ...args);
    const m = at(x, y, z, ry, s);
    this.kits[room].merge(k, m);
    return transformRet(ret, m);
  }
  /** chama de vela/lareira: luz real (LightPool) + halo */
  light(p, { i = 0.55, dist = 9, color = null, halo = 0.5, haloColor = '#ffb04a', pool = true, dy = 0 } = {}) {
    const w = this.io.toWorld(p.x, p.y + dy, p.z);
    if (pool) this.io.lightSources.push({ x: w.x, y: w.y, z: w.z, i, dist, color });
    if (halo) this.io.halos.add(p.clone(), halo, haloColor);
  }
  lights(list, opts = {}) {
    // só a primeira de cada grupo acende uma luz de verdade (as outras só brilham)
    list.forEach((p, idx) => this.light(p, { ...opts, pool: opts.pool !== false && idx === 0 }));
  }
  /** lamparina pendurada por um fio a 1 m do forro do porão */
  hangingLamp(R, x, z, { i = 0.85, dist = 10, color = '#ffd8a0' } = {}) {
    const f = this.put(R, (k) => {
      k.b.add(S.cyl(0.005, 0.005, 0.8, 3), '#3a3a42', { p: [0, 0.4, 0] });
      k.b.add(S.cylB(0.09, 0.12, 0.2, 8, true), '#3a3a42');
      return [F.candle(k, this.M, { h: 0.1, r: 0.03, y: 0.02 })];
    }, x, LV.B.y + LV.B.h - 1.0, z);
    // a luz fica abaixo da cúpula (acima, ela estourava a própria cúpula e o que estivesse ao lado)
    this.lights(f, { i, dist, color, dy: -0.6 });
  }
  /** colisor retangular (cx, cz no espaço do interior) */
  box(level, cx, cz, hw, hd, h = 1.2, rot = 0) {
    const y = Y(level);
    this.io.game.world.colliders.addBox(INTERIOR.x + cx, INTERIOR.z + cz, hw, hd, rot, { y0: INTERIOR.y + y - 0.1, y1: INTERIOR.y + y + h, camera: false });
    this.mapItems.push({ level, x: cx, z: cz, w: hw * 2, d: hd * 2, rot });
  }
  circle(level, cx, cz, r, h = 1.2) {
    const y = Y(level);
    this.io.game.world.colliders.addCircle(INTERIOR.x + cx, INTERIOR.z + cz, r, { y0: INTERIOR.y + y - 0.1, y1: INTERIOR.y + y + h });
    this.mapItems.push({ level, x: cx, z: cz, r });
  }
  /** objeto separado (para animar): monta fn num kit e cria um grupo */
  obj(level, fn, x, y, z, ry = 0, ...args) {
    const k = new IKit();
    const ret = fn(k, ...args);
    const g = new THREE.Group();
    for (const m of k.meshes()) {
      m.matrixAutoUpdate = true;
      g.add(m);
    }
    g.position.set(x, y, z);
    g.rotation.y = ry;
    g.userData.level = level;
    this.objects.push(g);
    return { g, ret };
  }
  /** coisa clicável (só pela graça ou para a missão) */
  inter(p, opts) {
    const it = new Interactable({ kind: 'object', reaction: 'neutral', radius: 0.7, height: 1.6, range: 3.2, cursor: 'use', selectable: false, ...opts, pos: this.io.toWorld(p.x, p.y, p.z) });
    this.io.game.interaction.add(it);
    this.io.interactables.push(it);
    return it;
  }
  say(p, text, dur = 3.2) {
    const g = this.io.game;
    g.ui?.bubble({ pos: this.io.toWorld(p.x, p.y, p.z) }, text, dur);
  }
  flavorObj(p, name, subtitle, lines, { sfx = null, h = 1.6, r = 0.7, range = 3.2, onUse } = {}) {
    let i = 0;
    return this.inter(p, {
      name, subtitle, height: h, radius: r, range, hint: 'Clique com o botão direito para examinar', verb: 'Examinar',
      onInteract: () => {
        const g = this.io.game;
        const line = typeof lines === 'function' ? lines() : lines[i++ % lines.length];
        g.ui?.info(line);
        g.ui?.chat(line, 'system');
        if (sfx) g.audio?.sfx(sfx);
        onUse?.();
      },
    });
  }
  anchor(name, p) {
    this.anchors[name] = this.io.toWorld(p.x, p.y, p.z);
    this.anchors[name].local = p.clone();
    return this.anchors[name];
  }
  cobweb(room, x, y, z, ry, s = 1) {
    this.put(room, (k) => F.cobweb(k, this.M, s), x, y, z, ry);
  }

  // ------------------------------------------------------------ montagem
  build() {
    this.saguao();
    this.jantar();
    this.estar();
    this.cozinha();
    this.musica();
    this.biblioteca();
    this.quarto();
    this.banheiro();
    this.cripta();
    this.lavanderia();
    this.adega();
    this.sotao();
    this.windowShafts();
    this.dust();
  }

  // ============================================================ TÉRREO
  saguao() {
    const R = 'saguao', y = 0, M = this.M, rng = this.rng;
    // lustre grande (objeto separado: balança devagar)
    const ch = this.obj('G', (k) => F.chandelier(k, M, { R: 1.5, drop: 3.4, tiers: 3, n: 14 }), 0, ROOM.saguao.top, 3.6);
    const flames = ch.ret.map((p) => p.clone().add(ch.g.position));
    this.lights([flames[0]], { i: 1.35, dist: 18, halo: 0.9, dy: -0.6 });
    this.light(flames[Math.floor(flames.length / 2)], { i: 0, halo: 0.9, pool: false });
    for (const p of flames.slice(1)) this.light(p, { pool: false, halo: 0.75 });
    // luz da galeria: clareia as paredes altas do saguão (antes era uma segunda luz no mesmo ponto do lustre)
    this.io.lightSources.push({ ...this.io.toWorld(0, LV.U.y + 2.0, 0.5), i: 0.8, dist: 14 });
    for (const s of [-1, 1]) {
      for (const z of [0.5, 5.5]) {
        const f = this.put(R, (k) => F.sconce(k, M), s * 4.84, 7.4, z, -s * Math.PI / 2);
        this.lights(f, { pool: false, halo: 0.55 });
      }
    }
    this.io.anim.push({ update: (dt, t) => { ch.g.rotation.y = Math.sin(t * 0.3) * 0.06; ch.g.rotation.z = Math.sin(t * 0.7) * 0.012; } });
    // tapetes: grande no meio e passadeira da porta até a escada
    this.put(R, (k) => F.rug(k, M, 0, 3.6, 4.6), 0, y, 4.4);
    this.put(R, (k) => F.rug(k, M, 2, 1.6, 2.0), 0, y + 0.004, 7.8);
    // armaduras guardando a escadaria
    for (const s of [-1, 1]) {
      this.put(R, (k) => F.suitOfArmor(k), s * 3.25, y, 1.7, s < 0 ? 0.35 : -0.35);
      this.circle('G', s * 3.25, 1.7, 0.42, 2.8);
    }
    this.flavorObj(V3(-3.25, 0, 1.7), 'Armadura Sir Mordisco', 'Guarda da Escadaria', ['Clanc! Tem alguém aí dentro? ...Não. Só um morcego fazendo ninho no elmo.', 'A placa diz: "Sir Mordisco, o Destemido. Morreu de susto em 1512."'], { sfx: 'rattle', h: 2.4 });
    this.flavorObj(V3(3.25, 0, 1.7), 'Armadura Dom Caninos', 'Guarda da Escadaria', ['A viseira range sozinha. Parece um bocejo.', '"Não toque. Nem com os olhos." — Anselmo'], { sfx: 'rattle', h: 2.4 });
    // relógio de pé perto da entrada (pêndulo animado)
    const clockAt = V3(4.45, y, 7.9);
    const gc = this.put(R, (k) => F.grandfatherClock(k), clockAt.x, y, clockAt.z, -Math.PI / 2);
    this.box('G', clockAt.x, clockAt.z, 0.24, 0.35, 2.9);
    const pend = this.obj('G', (k) => {
      k.b.add(S.cyl(0.012, 0.012, 0.75, 4), '#c8a24a', { p: [0, -0.375, 0] });
      k.b.add(S.cyl(0.12, 0.12, 0.03, 16), '#d8b04a', { p: [0, -0.78, 0], r: [Math.PI / 2, 0, 0] });
    }, gc.pendulum.x, gc.pendulum.y + 0.45, gc.pendulum.z, -Math.PI / 2);
    this.anchor('clock', clockAt);
    let tickSide = 0;
    this.io.anim.push({
      update: (dt, t, io) => {
        pend.g.rotation.z = Math.sin(t * Math.PI) * 0.28;
        const s = Math.sin(t * Math.PI) > 0 ? 1 : -1;
        if (s !== tickSide) {
          tickSide = s;
          const d = io.game.player.pos.distanceTo(this.io.toWorld(clockAt.x, 1.5, clockAt.z, _v));
          if (d < 12) io.game.audio?.sfx(s > 0 ? 'tick' : 'tock', clamp(1.2 - d / 10, 0.1, 1));
        }
      },
    });
    this.flavorObj(V3(clockAt.x, 0, clockAt.z), 'Relógio de Pé', 'Adiantado três séculos', () => `Tic-tac. O relógio marca ${this.io.game.dayNight.clockText()}. E uma data: "o fim do mundo, mais ou menos".`, { sfx: 'chime', h: 2.8 });
    // cabideiro (primeira pista cai aqui) e porta-guarda-chuvas
    this.put(R, (k) => F.coatRack(k), -3.9, y, 7.7, 0.4);
    this.circle('G', -3.9, 7.7, 0.3, 2);
    this.put(R, (k) => F.umbrellaStand(k), -3.2, y, 8.35);
    this.anchor('rack', V3(-3.9, 0, 7.7));
    // caixa do presente aberta (papel de seda roxo e laço) no chão, perto do cabideiro
    this.put(R, (k) => {
      k.b.add(S.boxB(0.5, 0.26, 0.4), '#2a1a3a');
      k.b.add(S.box(0.52, 0.06, 0.08), '#c8a24a', { p: [0, 0.2, 0] });
      k.b.add(S.box(0.08, 0.06, 0.42), '#c8a24a', { p: [0, 0.2, 0] });
      k.b.add(S.box(0.5, 0.04, 0.4), '#2a1a3a', { p: [0.1, 0.02, 0.45], r: [0, 0.6, 0] });
      for (let i = 0; i < 5; i++) k.d.add(new THREE.PlaneGeometry(0.3, 0.2), '#b88ad8', { p: [-0.1 + i * 0.05, 0.3, -0.05 + i * 0.02], r: [-0.6 + i * 0.3, i, 0.3] });
    }, -3.0, y, 7.2, -0.3);
    // bustos na entrada
    for (const s of [-1, 1]) {
      this.put(R, (k) => F.bust(k), s * 2.35, y, 8.35, s * -0.4);
      this.circle('G', s * 2.35, 8.35, 0.28, 1.8);
    }
    // consoles com candelabro nas paredes laterais (debaixo dos retratos)
    for (const s of [-1, 1]) {
      const cx = s * 4.55, cz = 0.4;
      this.put(R, (k) => F.table(k, { w: 1.5, d: 0.45, h: 0.9, wood: '#2a1420' }), cx, y, cz, s < 0 ? Math.PI / 2 : -Math.PI / 2);
      const fl = this.put(R, (k) => F.candelabra(k, M, { arms: 5, h: 0.55, span: 0.34 }), cx, y + 0.9, cz, s < 0 ? Math.PI / 2 : -Math.PI / 2);
      this.lights(fl, { i: 0.38, dist: 8, halo: 0.5 });
      this.box('G', cx, cz, 0.24, 0.76, 1.1);
    }
    this.put(R, (k) => F.bookStack(k, rng, 3), -4.55, y + 0.9, 1.0);
    this.put(R, (k) => {
      k.b.add(S.sphere(0.11, 10, 8), PAL.bone, { s: [1, 1.1, 1.05] });
      for (const e of [-1, 1]) k.b.add(S.sphere(0.03, 5, 4), PAL.ink, { p: [e * 0.04, 0.02, 0.09] });
    }, 4.55, y + 1.02, -0.1);
    // retratos: Tia Morcegália e Vovô nas laterais; o Conde imponente acima do patamar
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.tia, { w: 1.1, h: 1.6, y: 2.9 }), -4.85, y, 0.4, Math.PI / 2);
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.vovo, { w: 1.1, h: 1.6, y: 2.9 }), 4.85, y, 0.4, -Math.PI / 2);
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.conde, { w: 1.9, h: 2.6, y: 7.4, frame: '#d8b04a' }), 0, 0, -8.83, 0);
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.mansao, { w: 0.9, h: 1.3, y: 2.7 }), -3.5, y, -5.76, 0);
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.familia, { w: 0.9, h: 1.3, y: 2.7 }), 3.5, y, -5.76, 0);
    // placa dourada do retrato do Conde
    this.put(R, (k) => F.label(k, M, 11, 0.8, 0.28), 0, 5.9, -8.8);
    this.portraitEyes(V3(0, 7.72, -8.79), 0.13, 0.062, 0);
    this.portraitEyes(V3(-4.83, 3.02, 0.4), 0.075, 0.03, Math.PI / 2);
    this.flavorObj(V3(-4.6, 2.2, 0.4), 'Retrato da Tia Morcegália', 'Óleo sobre tela, 1701', ['Os olhos da Tia Morcegália seguem você pela sala. Ela sempre foi curiosa.', 'Na moldura: "Para o sobrinho mais dentuço. Com amor e presas."'], { h: 1.6 });
    this.flavorObj(V3(0, 5.35, -8.3), 'Retrato do Conde Dentúcio', 'Autorretrato (ele posou 40 anos)', ['"O pintor morreu de velhice antes de terminar. Eu fiquei paradinho."', 'O Conde pintado parece mais novo. E com mais cabelo.'], { h: 2.2 });
    // arandelas nas paredes do saguão e do patamar
    for (const [x, z, ry, yy] of [[-4.84, -2.4, Math.PI / 2, 2.9], [-4.84, 3.2, Math.PI / 2, 2.9], [4.84, -2.4, -Math.PI / 2, 2.9], [4.84, 3.2, -Math.PI / 2, 2.9], [-4.84, -7.4 + 1.3, Math.PI / 2, 7.2], [4.84, -7.4 + 1.3, -Math.PI / 2, 7.2]]) {
      const f = this.put(R, (k) => F.sconce(k, M), x, yy, z, ry);
      this.lights(f, { i: 0.45, dist: 8, halo: 0.6 });
    }
    // plantas secas e teias
    this.put(R, (k) => F.plantDead(k, rng), -4.4, y, -5.2);
    this.put(R, (k) => F.plantDead(k, rng), 4.4, y, -5.2);
    this.circle('G', -4.4, -5.2, 0.22, 1);
    this.circle('G', 4.4, -5.2, 0.22, 1);
    this.cobweb(R, -4.85, 9.2, -8.85, 0, 1.4);
    this.cobweb(R, 4.85, 9.2, 8.85, Math.PI, 1.2);
    this.cobweb(R, 4.85, 4.8, -5.9, -Math.PI / 2, 0.8);
    // patamar: banco, gárgulas, candelabro
    this.put(R, (k) => {
      k.b.add(S.boxB(1.4, 0.45, 0.45), '#3a1a2a');
      k.b.add(S.box(1.4, 0.1, 0.45), '#6a1a2a', { p: [0, 0.5, 0] });
      k.b.add(S.box(1.4, 0.5, 0.06), '#3a1a2a', { p: [0, 0.8, -0.2] });
    }, -3.5, LV.U.y, -8.55);
    this.box('U', -3.5, -8.55, 0.72, 0.25, 1.0);
    for (const s of [-1, 1]) {
      this.put(R, (k) => {
        k.b.add(S.boxB(0.5, 0.9, 0.5), PAL.stoneDark);
        k.b.add(S.sphere(0.28, 10, 8), PAL.stone, { p: [0, 1.2, 0], s: [1, 1.1, 1] });
        for (const e of [-1, 1]) {
          k.b.add(S.cone(0.1, 0.3, 4), PAL.stone, { p: [e * 0.18, 1.5, 0], r: [0, 0, e * -0.5] });
          k.b.add(S.box(0.5, 0.3, 0.04), PAL.stoneDark, { p: [e * 0.4, 1.2, -0.1], r: [0, e * 0.5, e * 0.4] });
          k.b.add(S.sphere(0.04, 5, 4), '#ffd84a', { p: [e * 0.1, 1.25, 0.24] });
        }
      }, s * 4.4, LV.U.y, -8.5, 0);
      this.box('U', s * 4.4, -8.5, 0.28, 0.28, 1.6);
    }
    const lf = this.put(R, (k) => F.candelabra(k, M, { arms: 3, h: 1.4, span: 0.3, metal: '#24202c' }), 3.4, LV.U.y, -8.55);
    this.lights(lf, { i: 0.55, dist: 9 });
    // luz de preenchimento do patamar: visto lá de baixo, sem ela o patamar ficava quase preto
    this.io.lightSources.push({ ...this.io.toWorld(0, LV.U.y + 2.0, -7.2), i: 0.75, dist: 11, pri: 300 });
    this.circle('U', 3.4, -8.55, 0.2, 1.8);
  }

  jantar() {
    const R = 'jantar', y = 0, M = this.M, rng = this.rng;
    const cx = -9, cz = -4;
    this.put(R, (k) => F.rug(k, M, 1, 3.6, 6.8), cx, y, cz);
    this.put(R, (k) => F.table(k, { w: 1.5, d: 5.4, h: 0.8, wood: '#2a1410', cloth: '#4a0e1a' }), cx, y, cz);
    this.box('G', cx, cz, 0.8, 2.75, 0.9);
    for (let i = 0; i < 5; i++) {
      const z = cz - 2.2 + i * 1.1;
      for (const s of [-1, 1]) {
        this.put(R, (k) => F.chair(k, { wood: '#2a1410', seat: '#6a1a2a' }), cx + s * 1.1, y, z, s < 0 ? Math.PI / 2 : -Math.PI / 2);
        this.circle('G', cx + s * 1.1, z, 0.25, 1.4);
      }
    }
    // trono do Conde na cabeceira e cadeira de visita na outra ponta
    this.put(R, (k) => {
      F.chair(k, { wood: '#1a0a10', seat: '#8a1a2a' });
      k.b.add(S.box(0.6, 0.7, 0.06), '#8a1a2a', { p: [0, 1.75, -0.2] });
      k.b.add(S.sphere(0.07, 6, 5), '#d8b04a', { p: [0, 2.15, -0.2] });
      for (const e of [-1, 1]) k.b.add(S.box(0.35, 0.3, 0.04), '#1a0a10', { p: [e * 0.4, 1.9, -0.22], r: [0, 0, e * 0.6] });
    }, cx, y, cz - 3.3, 0, 1.15);
    this.circle('G', cx, cz - 3.3, 0.32, 2.4);
    this.put(R, (k) => F.chair(k, { wood: '#2a1410', seat: '#6a1a2a' }), cx, y, cz + 3.3, Math.PI);
    this.circle('G', cx, cz + 3.3, 0.25, 1.4);
    // pratos, taças de "suco de tomate", talheres e sopeiras
    const top = y + 0.81;
    for (let i = 0; i < 5; i++) {
      const z = cz - 2.2 + i * 1.1;
      for (const s of [-1, 1]) {
        this.put(R, (k) => {
          k.b.add(S.cyl(0.14, 0.12, 0.02, 14), '#e8e0d8');
          k.b.add(S.cyl(0.1, 0.09, 0.03, 12), '#c8401a', { p: [0, 0.015, 0] });
          k.b.add(S.box(0.02, 0.005, 0.18), '#c8c8d0', { p: [0.2, 0.0, 0] });
          k.b.add(S.box(0.02, 0.005, 0.18), '#c8c8d0', { p: [-0.2, 0.0, 0] });
          k.b.add(S.lathe([[0.001, 0], [0.04, 0], [0.01, 0.02], [0.01, 0.1], [0.045, 0.14], [0.05, 0.2], [0.001, 0.12]], 8), '#b8c8d8', { p: [0.16, 0, -0.16] });
          k.glow(M.bloodGlow).add(S.cyl(0.036, 0.03, 0.04, 8), '#fff', { p: [0.16, 0.155, -0.16] });
        }, cx + s * 0.5, top, z, s < 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }
    for (const z of [cz - 1.6, cz + 1.6]) {
      this.put(R, (k) => {
        k.b.add(S.lathe([[0.001, 0], [0.18, 0.02], [0.22, 0.12], [0.2, 0.2], [0.001, 0.22]], 12), '#e8e0d8');
        k.b.add(S.sphere(0.05, 6, 5), '#d8b04a', { p: [0, 0.25, 0] });
      }, cx, top, z);
    }
    for (const z of [cz - 2.4, cz, cz + 2.4]) {
      const fl = this.put(R, (k) => F.candelabra(k, M, { arms: 5, h: 0.5, span: 0.3 }), cx, top, z);
      this.lights(fl, { i: 0.34, dist: 7, halo: 0.38 });
    }
    this.label(R, 20, cx - 0.35, top + 0.13, cz + 1.6, 0.28, 0.14, -Math.PI / 2);
    // lustre sobre a mesa
    const ch = this.obj('G', (k) => F.chandelier(k, M, { R: 0.9, drop: 1.5, tiers: 2, n: 8 }), cx, ROOM.jantar.top ?? 5.0, cz);
    const cf = ch.ret.map((p) => p.clone().add(ch.g.position));
    this.light(cf[0], { i: 0.9, dist: 12, halo: 0.8, dy: -0.6 });
    for (const p of cf.slice(1)) this.light(p, { pool: false, halo: 0.65 });
    this.io.anim.push({ update: (dt, t) => (ch.g.rotation.y = Math.sin(t * 0.4 + 1) * 0.05) });
    // aparador entre as janelas, cristaleira e carrinho com a "sopa"
    this.put(R, (k) => {
      k.b.add(S.boxB(1.9, 0.9, 0.5), '#2a1410');
      for (let i = 0; i < 3; i++) k.b.add(S.box(0.55, 0.6, 0.02), '#3a1e16', { p: [-0.62 + i * 0.62, 0.45, 0.26] });
      for (let i = 0; i < 3; i++) k.b.add(S.sphere(0.02, 5, 4), '#d8b04a', { p: [-0.62 + i * 0.62, 0.5, 0.28] });
      k.b.add(S.box(2.0, 0.05, 0.56), '#3a1e16', { p: [0, 0.92, 0] });
      // jogo de chá de prata
      k.b.add(S.lathe([[0.001, 0], [0.1, 0], [0.12, 0.1], [0.08, 0.2], [0.05, 0.24], [0.001, 0.25]], 10), '#c8c8d0', { p: [-0.4, 0.95, 0] });
      k.b.add(S.tube([V3(-0.28, 1.05, 0), V3(-0.18, 1.12, 0), V3(-0.15, 1.18, 0)], 0.015, 4), '#c8c8d0');
      for (let i = 0; i < 3; i++) k.b.add(S.cylB(0.04, 0.035, 0.07, 8), '#e8e0d8', { p: [0.1 + i * 0.14, 0.95, 0.1] });
    }, -12.55, y, -4.2, Math.PI / 2);
    this.box('G', -12.55, -4.2, 0.26, 0.95, 1.2);
    const af = this.put(R, (k) => F.candelabra(k, M, { arms: 3, h: 0.4, span: 0.2 }), -12.55, y + 0.95, -3.4);
    this.lights(af, { i: 0.35, dist: 6 });
    this.put(R, (k) => {
      k.b.add(S.boxB(1.4, 2.4, 0.5), '#2a1410');
      for (let i = 0; i < 4; i++) {
        k.b.add(S.box(1.3, 0.03, 0.45), '#3a1e16', { p: [0, 0.5 + i * 0.5, 0] });
        for (let j = 0; j < 4; j++) k.b.add(S.cyl(0.13, 0.13, 0.02, 12), '#e8e0d8', { p: [-0.45 + j * 0.3, 0.68 + i * 0.5, -0.05], r: [Math.PI / 2 - 0.2, 0, 0] });
      }
      k.b.add(S.box(1.36, 2.3, 0.02), '#6a7a88', { p: [0, 1.2, 0.26] });
      k.b.add(S.box(0.04, 2.3, 0.04), '#2a1410', { p: [0, 1.2, 0.27] });
      k.b.add(S.cone(0.3, 0.3, 4), '#2a1410', { p: [0, 2.55, 0], r: [0, Math.PI / 4, 0] });
    }, -11.7, y, 0.62, Math.PI);
    this.box('G', -11.7, 0.62, 0.72, 0.27, 2.5);
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.bisa, { w: 0.9, h: 1.4, y: 2.6 }), -11.3, y, -8.83);
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.gato, { w: 0.8, h: 1.2, y: 2.6 }), -6.7, y, -8.83);
    for (const z of [-7.6, -0.6]) {
      const f = this.put(R, (k) => F.sconce(k, M), -5.16, 2.6, z, -Math.PI / 2);
      this.lights(f, { i: 0.35, dist: 6, halo: 0.55 });
    }
    this.cobweb(R, -12.85, 4.9, -8.85, 0, 1.0);
    this.flavorObj(V3(cx, 0.8, cz), 'Mesa de Jantar', 'Para 12 convidados (nenhum voltou)', ['Sopa de tomate em todos os pratos. O Conde jura que é "só por hoje". Faz 300 anos.', 'Uma plaquinha: "Proibido alho. Proibido espelho. Proibido falar de sol."'], { h: 1.2, r: 1.4, range: 3.6 });
  }

  estar() {
    const R = 'estar', y = 0, M = this.M, rng = this.rng;
    // lareira na parede oeste
    const fz = 6.3;
    const fp = this.put(R, (k) => F.fireplace(k, M, { w: 2.3, h: 1.65 }), -12.85, y, fz, Math.PI / 2);
    this.box('G', -12.45, fz, 0.45, 1.3, 2);
    const fire = fp.fire;
    this.io.lightSources.push({ ...this.io.toWorld(fire.x + 1.1, fire.y + 0.5, fire.z), i: 0.9, dist: 12, color: '#ff6a24' });
    this.io.halos.add(fire.clone(), 0.9, '#ff6a24');
    this.anchor('fire', fire);
    const mf = this.put(R, (k) => F.mantelDecor(k, M, rng, 2.4, 1.87), -12.6, y, fz, Math.PI / 2);
    for (const p of mf) this.light(p, { pool: false, halo: 0.55 });
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.formatura, { w: 1.0, h: 1.5, y: 3.15 }), -12.52, y, fz, Math.PI / 2); // na frente da coifa
    // faíscas subindo da lareira e estalos
    let sparkT = 0;
    this.io.anim.push({
      update: (dt, t, io) => {
        sparkT -= dt;
        if (sparkT > 0) return;
        sparkT = 0.12 + Math.random() * 0.25;
        const w = io.toWorld(fire.x + 0.1, fire.y, fire.z + (Math.random() - 0.5) * 0.6);
        io.game.fx?.glowB.spawn({ p: w, v: new THREE.Vector3(0.3 + Math.random() * 0.3, 1.2 + Math.random(), (Math.random() - 0.5) * 0.4), life: 0.9 + Math.random() * 0.6, size: 0.06 + Math.random() * 0.05, g: -0.4, drag: 1.2, c: new THREE.Color('#ffa040'), a: 1 });
        const d = io.game.player.pos.distanceTo(w);
        if (d < 9 && Math.random() < 0.3) io.game.audio?.sfx('fire', clamp(1 - d / 9, 0.1, 1));
      },
    });
    this.flavorObj(V3(-12.3, 0, fz), 'Lareira', 'Quentinha (raridade nesta casa)', ['O fogo crepita. Pela primeira vez hoje, você não sente um arrepio.', 'Dentro da lareira, um marshmallow esquecido desde 1850.'], { sfx: 'fire', h: 1.6, r: 1.1 });
    this.put(R, (k) => F.rug(k, M, 0, 3.4, 4.2), -10.0, y, fz);
    // poltronas, sofá e mesa de centro em forma de caixão
    this.put(R, (k) => F.armchair(k, { col: '#5a1a3a' }), -10.7, y, fz - 1.35, -Math.PI / 2 - 0.45);
    this.put(R, (k) => F.armchair(k, { col: '#2a4a3a' }), -10.7, y, fz + 1.35, -Math.PI / 2 + 0.45);
    this.circle('G', -10.7, fz - 1.35, 0.5, 1.2);
    this.circle('G', -10.7, fz + 1.35, 0.5, 1.2);
    this.put(R, (k) => F.sofa(k, { col: '#1e4a3e', len: 2.3 }), -7.9, y, fz, -Math.PI / 2);
    this.box('G', -7.9, fz, 0.44, 1.2, 1.1);
    this.put(R, (k) => {
      const s = new THREE.Shape([[0, -0.6], [0.2, -0.6], [0.32, 0.15], [0.2, 0.6], [-0.2, 0.6], [-0.32, 0.15], [-0.2, -0.6]].map(([a, b]) => new THREE.Vector2(a, b)));
      k.b.add(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0.45, 0), '#3a1e16', { flat: true });
      for (const [x, z] of [[-0.15, -0.45], [0.15, -0.45], [-0.15, 0.45], [0.15, 0.45]]) k.b.add(S.cylB(0.03, 0.03, 0.37, 5), '#2a1410', { p: [x, 0, z] });
      k.b.add(S.box(0.06, 0.004, 0.3), '#d8b04a', { p: [0, 0.455, 0] });
      k.b.add(S.box(0.2, 0.004, 0.06), '#d8b04a', { p: [0, 0.455, -0.1] });
      // xícara e livro aberto
      k.b.add(S.cylB(0.04, 0.035, 0.07, 8), '#a89888', { p: [0.1, 0.46, 0.25] });
      k.b.add(S.box(0.28, 0.02, 0.2), '#a08a6a', { p: [-0.05, 0.47, -0.2], r: [0, 0.3, 0] });
    }, -9.6, y, fz, Math.PI / 2);
    this.box('G', -9.6, fz, 0.35, 0.62, 0.5);
    // luminárias de pé (candelabros altos) e estante
    for (const z of [fz - 2.4, fz + 2.3]) {
      const fl = this.put(R, (k) => F.candelabra(k, M, { arms: 3, h: 1.45, span: 0.25, metal: '#24202c' }), -11.9, y, z);
      this.lights(fl, { i: 0.62, dist: 9 });
      this.circle('G', -11.9, z, 0.18, 1.8);
    }
    this.put(R, (k) => F.bookshelf(k, rng, { w: 1.7, h: 2.4 }), -5.35, y, 2.55, -Math.PI / 2);
    this.box('G', -5.35, 2.55, 0.2, 0.85, 2.5);
    this.put(R, (k) => F.gramophone(k), -11.9, y + 0.75, 8.3, 0.5);
    this.put(R, (k) => F.table(k, { w: 0.7, d: 0.6, h: 0.75, wood: '#2a1410' }), -11.9, y, 8.3);
    this.box('G', -11.9, 8.3, 0.38, 0.33, 1.2);
    let gramo = 0;
    this.flavorObj(V3(-11.9, 0.9, 8.3), 'Gramofone', 'Toca "Valsa dos Defuntos"', () => (++gramo % 2 ? 'O gramofone arranha uma valsa antiga... Tumbalacatumba tumba tá!' : 'O disco pula sempre na mesma parte. Ninguém liga.'), { sfx: 'dance', h: 1.3 });
    this.put(R, (k) => F.plantDead(k, rng), -5.6, y, 8.4);
    this.circle('G', -5.6, 8.4, 0.22, 1);
    // caminha do gato-morcego com retrato
    this.put(R, (k) => {
      k.b.add(S.torus(0.3, 0.12, 6, 14), '#6a1a3a', { p: [0, 0.1, 0], r: [Math.PI / 2, 0, 0] });
      k.b.add(S.cyl(0.3, 0.3, 0.06, 14), '#8a2a4a', { p: [0, 0.04, 0] });
      k.b.add(S.sphere(0.07, 6, 5), '#e8dcc0', { p: [0.1, 0.1, 0.05] });
    }, -8.4, y, 8.35);
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.gato, { w: 0.55, h: 0.8, y: 1.6 }), -7.3, y, 8.83, Math.PI);
    this.cobweb(R, -12.85, 4.9, 8.85, Math.PI / 2, 0.9);
  }

  cozinha() {
    const R = 'cozinha', y = 0, M = this.M, rng = this.rng;
    // fogão de ferro na parede leste, com coifa
    const st = this.put(R, (k) => F.stove(k, M), 12.45, y, -0.95, -Math.PI / 2);
    this.box('G', 12.45, -0.95, 0.42, 0.95, 1.5);
    this.put(R, (k) => {
      k.b.add(S.boxB(0.9, 0.8, 2.0), '#3a3444', { p: [0, 0, 0] });
      k.b.add(S.boxB(0.5, 2.2, 0.6), '#3a3444', { p: [0.2, 0.8, 0] });
    }, 12.55, 2.4, -0.95);
    this.io.lightSources.push({ ...this.io.toWorld(11.9, 0.35, -0.95), i: 0.5, dist: 6, color: '#ff7a3a' });
    // caldeirão com a "sopa do dia" borbulhando
    const cd = this.put(R, (k) => F.cauldron(k, M), 9.2, y, -3.6);
    this.circle('G', 9.2, -3.6, 0.55, 1.2);
    this.io.lightSources.push({ ...this.io.toWorld(9.2, 0.3, -3.6), i: 0.45, dist: 5, color: '#ff6a2a' });
    this.flavorObj(V3(9.2, 0.5, -3.6), 'Caldeirão', 'Sopa do Dia (de novo)', ['Sopa de tomate. Claro que é sopa de tomate.', 'Você prova. Tem gosto de "quase sangue". O Conde deve estar de dieta.'], { sfx: 'glub', h: 1.2 });
    const steamPts = [cd.top, ...st.steam].map((p) => this.io.toWorld(p.x, p.y, p.z));
    let stT = 0;
    this.io.anim.push({
      update: (dt, t, io) => {
        stT -= dt;
        if (stT > 0 || io.level !== 'G') return;
        stT = 0.18;
        const p = steamPts[Math.floor(Math.random() * steamPts.length)];
        io.game.fx?.smokeB.spawn({ p: p.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.2), life: 2.2, size: 0.3, grow: 3, drag: 0.4, c: new THREE.Color('#c8c0c8'), a: 0.28, fadeIn: 0.3 });
      },
    });
    // mesa de trabalho com tábua, tomates e facas; panelas penduradas
    this.put(R, (k) => {
      F.table(k, { w: 2.0, d: 0.9, h: 0.85, wood: '#6a4a32', legs: 'square' });
      k.b.add(S.box(0.5, 0.04, 0.35), '#8a6a4a', { p: [0.3, 0.87, 0] });
      for (let i = 0; i < 5; i++) k.b.add(S.sphere(0.06, 8, 6), '#c8201a', { p: [-0.5 + i * 0.12, 0.91, 0.2 - (i % 2) * 0.1], s: [1, 0.85, 1] });
      k.b.add(S.box(0.28, 0.01, 0.04), '#c8c8d0', { p: [0.3, 0.9, 0.05], r: [0, 0.3, 0] });
      k.b.add(S.cyl(0.03, 0.03, 0.4, 6), '#8a6a4a', { p: [-0.1, 0.9, -0.25], r: [0, 0, Math.PI / 2] });
      k.b.add(S.cylB(0.12, 0.1, 0.12, 10), '#e8e0d0', { p: [-0.6, 0.85, -0.2] });
    }, 8.3, y, -0.9);
    this.box('G', 8.3, -0.9, 1.0, 0.45, 1.0);
    this.put(R, (k) => F.potRack(k), 8.3, 3.4, -0.9);
    // despensa com potes rotulados na parede sul
    this.put(R, (k) => F.shelfJars(k, M, rng, { w: 1.7 }), 9.8, y, 0.62, Math.PI);
    this.box('G', 9.8, 0.62, 0.9, 0.2, 2.2);
    this.put(R, (k) => F.shelfJars(k, M, rng, { w: 1.5 }), 6.3, y, 0.62, Math.PI);
    this.box('G', 6.3, 0.62, 0.8, 0.2, 2.2);
    // alho preso numa gaiola com placa de PERIGO
    this.put(R, (k) => F.table(k, { w: 0.7, d: 0.6, h: 0.7, wood: '#4a3426', legs: 'square' }), 5.75, y, -2.4);
    this.put(R, (k) => F.garlicCage(k, M), 5.75, y + 0.7, -2.4, Math.PI / 2);
    this.box('G', 5.75, -2.4, 0.36, 0.32, 1.6);
    this.flavorObj(V3(5.75, 0.8, -2.4), 'Alho Aprisionado', 'Condenado a prisão perpétua', ['O alho está preso. Para a segurança de todos.', '"Ele sabe o que fez." — Anselmo'], { h: 1.2 });
    // pia com bomba d'água perto da janela
    this.put(R, (k) => {
      k.b.add(S.boxB(1.2, 0.85, 0.6), '#8a8478');
      k.b.add(S.box(1.0, 0.1, 0.5), '#5a5a64', { p: [0, 0.82, 0] });
      k.b.add(S.cylB(0.04, 0.05, 0.5, 8), '#3a4a3a', { p: [0.4, 0.85, -0.15] });
      k.b.add(S.tube([V3(0.4, 1.35, -0.15), V3(0.4, 1.4, 0.05), V3(0.4, 1.3, 0.12)], 0.03, 5), '#3a4a3a');
      k.b.add(S.box(0.3, 0.04, 0.04), '#3a4a3a', { p: [0.4, 1.38, -0.3], r: [0, 0, 0.4] });
      for (let i = 0; i < 4; i++) k.b.add(S.cyl(0.12, 0.12, 0.02, 12), '#e8e0d8', { p: [-0.3, 0.9 + i * 0.03, 0], r: [0.5, 0, 0] });
    }, 12.55, y, -3.3, -Math.PI / 2);
    this.box('G', 12.55, -3.3, 0.32, 0.62, 1.2);
    // sacos e barris perto da escada do porão
    for (const [x, z] of [[12.2, -6.3], [11.4, -6.6]]) {
      this.put(R, (k) => F.barrel(k, { r: 0.35, h: 0.85 }), x, y, z);
      this.circle('G', x, z, 0.38, 1);
    }
    this.put(R, (k) => {
      for (let i = 0; i < 3; i++) {
        k.b.add(S.sphere(0.3, 8, 6), '#c8b890', { p: [i * 0.45, 0.28, (i % 2) * 0.2], s: [1, 0.95, 0.8] });
        k.b.add(S.cone(0.1, 0.2, 6), '#c8b890', { p: [i * 0.45, 0.62, (i % 2) * 0.2] });
      }
      F.label(k, M, 13, 0.34, 0.17, { p: [0, 0.35, 0.25] });
    }, 9.6, y, -6.6);
    this.box('G', 10.1, -6.5, 0.8, 0.35, 0.8);
    // vassoura, balde e toca de rato com portinha
    this.put(R, (k) => {
      k.b.add(S.cylB(0.02, 0.02, 1.4, 5), '#6a4a32', { p: [0, 0, 0], r: [0, 0, 0.12] });
      k.b.add(S.cone(0.14, 0.4, 8), '#c9a24a', { p: [-0.02, 0.1, 0], r: [Math.PI, 0, 0] });
      k.b.add(S.cylB(0.16, 0.13, 0.3, 10, true), '#6a6a74', { p: [0.35, 0, 0.1] });
    }, 5.4, y, -6.8);
    this.put(R, (k) => {
      k.glow(this.M.dark).add(new THREE.CircleGeometry(0.1, 10, 0, Math.PI), '#fff', { p: [0, 0.0, 0.01] });
      k.b.add(S.box(0.1, 0.12, 0.02), '#6a3a2a', { p: [0.05, 0.06, 0.03], r: [0, -0.8, 0] });
    }, 7.5, 0.01, -7.28, Math.PI);
    const kl = this.put(R, (k) => F.sconce(k, M), 5.16, 2.4, -0.6, Math.PI / 2);
    this.lights(kl, { i: 0.4, dist: 8 });
    const kl2 = this.put(R, (k) => F.sconce(k, M), 9.0, 2.4, -7.3, 0);
    this.lights(kl2, { i: 0.4, dist: 8 });
    this.cobweb(R, 12.85, 4.9, -8.85, -Math.PI / 2, 0.9);
    // réstia de pimentas e ervas secas no teto
    for (let i = 0; i < 5; i++) {
      this.put(R, (k) => {
        k.b.add(S.cyl(0.005, 0.005, 0.6, 3), '#6a5a3a', { p: [0, -0.3, 0] });
        for (let j = 0; j < 6; j++) k.b.add(S.cone(0.03, 0.12, 5), j % 2 ? '#8a3a1a' : '#4a6a2a', { p: [(j % 2) * 0.04 - 0.02, -0.35 - j * 0.07, 0], r: [Math.PI, 0, 0] });
      }, 6.4 + i * 1.3, 5.0, -5.2);
    }
  }

  musica() {
    const R = 'musica', y = 0, M = this.M, rng = this.rng;
    const og = this.put(R, (k) => F.pipeOrgan(k, M, rng), 9, y, 1.45);
    this.box('G', 9, 1.45 + 0.1, 1.85, 0.7, 4.5);
    this.box('G', 9, 2.7, 0.72, 0.2, 0.6);
    this.anchor('organ', V3(9, 1, 2.2));
    const of = this.put(R, (k) => F.candelabra(k, M, { arms: 3, h: 0.35, span: 0.16 }), 7.6, y + 1.1, 1.8);
    this.lights(of, { i: 0.5, dist: 8, halo: 0.38 });
    const of2 = this.put(R, (k) => F.candelabra(k, M, { arms: 3, h: 0.35, span: 0.16 }), 10.4, y + 1.1, 1.8);
    this.lights(of2, { i: 0, pool: false });
    this.flavorObj(V3(9, 1, 2.6), 'Órgão de Tubos', 'Afinado em Ré menor (sempre)', ['Você aperta todas as teclas de uma vez. BWAAAAMMM! Três morcegos desmaiam.', 'Na estante de partitura: "Tocata e Fuga do Sótão", por Anônimo. Rabiscado: "não sou eu. — o Conde"'], { sfx: 'organ', h: 2.5, r: 1.6, range: 3.8 });
    // à noite o órgão toca sozinho (quando você está perto)
    let oT = 3;
    this.io.anim.push({
      update: (dt, t, io) => {
        if (io.level !== 'G' || !io.game.dayNight.isNight) return;
        oT -= dt;
        if (oT > 0) return;
        oT = 0.6 + Math.random() * 0.9;
        const d = io.game.player.pos.distanceTo(io.toWorld(9, 1.5, 2, _v));
        if (d < 13) io.game.audio?.sfx('organNote', clamp(1.1 - d / 13, 0.1, 1));
      },
    });
    void og;
    this.put(R, (k) => F.rug(k, M, 3, 3.6, 3.6), 9.2, y, 6.0);
    this.put(R, (k) => F.grandPiano(k), 9.6, y, 6.1, 0.5);
    this.circle('G', 9.5, 6.0, 0.85, 1.2);
    this.put(R, (k) => F.chair(k, { wood: '#101014', seat: '#3a1a2a', high: false }), 9.1, y, 7.1, Math.PI + 0.5);
    this.flavorObj(V3(9.6, 0.9, 6.1), 'Piano de Cauda', 'Com três teclas mordidas', ['Plim. Plom. Plim. A tecla dó está molhada de... melhor não saber.', 'Alguém escreveu na partitura: "Sonata ao Luar (de verdade)".'], { sfx: 'chime', h: 1.1, r: 1.0 });
    this.put(R, (k) => F.harp(k), 12.2, y, 7.9, -0.6);
    this.circle('G', 12.25, 7.9, 0.4, 1.8);
    for (const [x, z, ry] of [[6.5, 6.8, 0.3], [7.4, 4.3, -0.4]]) {
      this.put(R, (k) => F.musicStand(k), x, y, z, ry);
      this.circle('G', x, z, 0.18, 1.3);
    }
    // bustos de compositores-morcego nos pedestais
    for (const [x, z] of [[5.7, 8.3], [12.3, 3.2]]) {
      this.put(R, (k) => F.bust(k, { stone: '#d8d0c0' }), x, y, z, 0.6);
      this.circle('G', x, z, 0.28, 1.8);
    }
    // estojo de violino aberto e metrônomo
    this.put(R, (k) => {
      k.b.add(S.box(0.3, 0.1, 0.8), '#1a1418');
      k.b.add(S.box(0.26, 0.02, 0.76), '#8a1a2a', { p: [0, 0.06, 0] });
      k.b.add(S.sphere(0.1, 8, 6), '#8a4a1a', { p: [0, 0.1, 0.12], s: [1, 0.35, 1.3] });
      k.b.add(S.sphere(0.08, 8, 6), '#8a4a1a', { p: [0, 0.1, -0.12], s: [1, 0.35, 1.2] });
      k.b.add(S.box(0.03, 0.02, 0.3), '#1a1418', { p: [0, 0.12, -0.3] });
    }, 6.2, y, 2.8, 0.6);
    for (const [x, z, ry] of [[5.16, 3.0, Math.PI / 2], [12.84, 7.0, -Math.PI / 2]]) {
      const f = this.put(R, (k) => F.sconce(k, M), x, 2.6, z, ry);
      this.lights(f, { i: 0.4, dist: 8 });
    }
    // violoncelo no canto do órgão, partituras e um sofazinho para a plateia (de fantasmas)
    this.put(R, (k) => F.cello(k), 12.2, y, 1.75, -0.6);
    this.circle('G', 12.2, 1.75, 0.3, 1.6);
    this.flavorObj(V3(12.2, 0.8, 1.75), 'Violoncelo', 'Afinado em "Ré-quiem"', ['Você dedilha uma corda. O som desce até o porão e alguém lá embaixo aplaude.'], { sfx: 'organ', h: 1.6, r: 0.5 });
    this.put(R, (k) => F.sheetMusic(k, rng), 11.4, y, 2.4, 0.3);
    this.put(R, (k) => F.sofa(k, { col: '#4a2a4a', len: 1.6 }), 8.6, y, 8.4, Math.PI);
    this.box('G', 8.6, 8.4, 0.85, 0.44, 1.1);
    this.flavorObj(V3(8.6, 0.6, 8.3), 'Sofá da Plateia', 'Lugares reservados', ['Três cartõezinhos no assento: "Reservado — Fantasma", "Reservado — Fantasma", "Reservado — Você?".'], { h: 1.1, r: 0.9 });
    this.cobweb(R, 12.85, 4.9, 8.85, Math.PI, 1.0);
    this.cobweb(R, 5.15, 4.9, 1.15, 0, 0.8);
  }

  // ============================================================ ANDAR DE CIMA
  biblioteca() {
    const R = 'biblioteca', y = LV.U.y, M = this.M, rng = this.rng;
    const H = 3.55;
    // estantes do chão ao teto nas paredes oeste, norte e sul
    for (const z of [-8.0, -6.3, -2.7, -0.95, 0.8, 2.55, 6.2, 7.95]) {
      this.put(R, (k) => F.bookshelf(k, rng, { w: 1.7, h: H, shelves: 9, gap: z === 0.8 }), -12.62, y, z, Math.PI / 2);
      this.box('U', -12.62, z, 0.2, 0.86, H);
    }
    for (const x of [-11.6, -9.9, -8.2, -6.5]) {
      this.put(R, (k) => F.bookshelf(k, rng, { w: 1.7, h: H, shelves: 9 }), x, y, -8.62, 0);
      this.box('U', x, -8.62, 0.86, 0.2, H);
    }
    for (const x of [-11.6, -9.9, -8.2]) {
      this.put(R, (k) => F.bookshelf(k, rng, { w: 1.7, h: H, shelves: 9 }), x, y, 8.62, Math.PI);
      this.box('U', x, 8.62, 0.86, 0.2, H);
    }
    // escada de biblioteca encostada
    this.put(R, (k) => F.ladder(k, 3.4), -12.2, y, -1.8, Math.PI / 2 - 0.25);
    // escrivaninha com o livro aberto (segunda pista)
    const df = this.put(R, (k) => F.desk(k, M, rng), -9.3, y, -2.4, 0);
    this.lights(df, { i: 0.6, dist: 7 });
    this.box('U', -9.3, -2.4, 0.82, 0.42, 1.0);
    this.put(R, (k) => F.chair(k, { wood: '#2a1410', seat: '#3a4a2a' }), -9.3, y, -1.55, Math.PI);
    this.circle('U', -9.3, -1.55, 0.25, 1.3);
    this.anchor('book', V3(-9.3, y + 0.82, -2.3));
    this.put(R, (k) => F.rug(k, M, 3, 3.4, 5.2), -9.2, y, -1.4);
    // globo, luneta, poltronas de leitura, pilhas de livros e bola de cristal
    this.put(R, (k) => F.globe(k), -7.2, y, 1.2);
    this.circle('U', -7.2, 1.2, 0.36, 1.5);
    this.flavorObj(V3(-7.2, y + 0.8, 1.2), 'Globo Terrestre', 'Mapa-múndi de 1640', ['Você gira o globo. Ele para sempre na Transilvânia. Sempre.', 'Onde deveria estar o Brasil está escrito: "aqui tem sol demais".'], { sfx: 'whiff', h: 1.4 });
    this.put(R, (k) => F.telescope(k), -12.0, y, -4.5, Math.PI / 2 + 0.3);
    this.circle('U', -11.95, -4.45, 0.3, 1.6);
    this.flavorObj(V3(-12.0, y + 1.1, -4.5), 'Luneta', 'Aponta sempre para a lua', () => (this.io.game.dayNight.isNight ? 'Você vê a lua. Ela pisca de volta. Que estranho.' : 'De dia a luneta mostra... a cortina. O Conde prefere assim.'), { h: 1.6 });
    for (const [z, ry] of [[3.8, Math.PI / 2 + 0.5], [5.3, Math.PI / 2 - 0.4]]) {
      this.put(R, (k) => F.armchair(k, { col: '#3a2a1a' }), -11.4, y, z, ry);
      this.circle('U', -11.4, z, 0.48, 1.2);
    }
    const rf = this.put(R, (k) => {
      F.table(k, { w: 0.6, d: 0.6, h: 0.7, wood: '#2a1410' });
      return F.candelabra(k, M, { arms: 1, h: 0.3 }).map((p) => p.add(V3(0, 0.7, 0)));
    }, -12.2, y, 4.55);
    this.lights(rf, { i: 0.45, dist: 6 });
    for (const [x, z] of [[-8.0, 5.8], [-10.4, -6.4], [-6.3, -4.2], [-12.0, 0.1]]) this.put(R, (k) => F.bookStack(k, rng, rng.int(4, 8)), x, y, z, rng.range(0, 3));
    this.put(R, (k) => {
      F.table(k, { w: 0.5, d: 0.5, h: 0.9, wood: '#2a1410' });
      k.b.add(S.cylB(0.1, 0.13, 0.08, 10), '#d8b04a', { p: [0, 0.9, 0] });
    }, -6.3, y, -1.0);
    this.put(R, (k) => k.glow(M.crystal).add(S.sphere(0.16, 16, 12), '#fff'), -6.3, y + 1.14, -1.0);
    this.light(V3(-6.3, y + 1.14, -1.0), { i: 0.35, dist: 5, color: '#9a7aff', halo: 0.8, haloColor: '#9a7aff' });
    this.box('U', -6.3, -1.0, 0.28, 0.28, 1.2);
    this.flavorObj(V3(-6.3, y + 1.0, -1.0), 'Bola de Cristal', 'Previsão do tempo: nublado com chance de morcegos', ['Você vê seu futuro: uma capinha... e muito vento no rosto.', 'A bola de cristal mostra o Anselmo passando roupa. Ele acena.'], { sfx: 'clue', h: 1.4 });
    // lombadas engraçadas (clicar numa estante)
    const titles = ['"Mordidas para Iniciantes"', '"Mil e Uma Receitas sem Alho"', '"Como Dormir de Cabeça para Baixo"', '"Espelhos: Uma Conspiração"', '"O Mordomo que Guardava Tudo"', '"Transilvânia: Guia de Férias Noturnas"'];
    let ti = 0;
    this.flavorObj(V3(-12.4, y + 1.2, -6.3), 'Estante', 'Milhares de livros', () => `Um título chama sua atenção: ${titles[ti++ % titles.length]}.`, { h: 2.6, r: 0.9 });
    // lustre e teias
    const ch = this.obj('U', (k) => F.chandelier(k, M, { R: 0.8, drop: 1.0, tiers: 1, n: 8 }), -9.2, ROOM.saguao.top, 1.5);
    const cf = ch.ret.map((p) => p.clone().add(ch.g.position));
    this.light(cf[0], { i: 0.8, dist: 11, halo: 0.7, dy: -0.6 });
    for (const p of cf.slice(1)) this.light(p, { pool: false, halo: 0.6 });
    this.io.anim.push({ update: (dt, t) => (ch.g.rotation.y = Math.sin(t * 0.5 + 2) * 0.05) });
    this.cobweb(R, -12.85, 9.25, -8.85, 0, 1.1);
    this.cobweb(R, -12.85, 9.25, 8.85, Math.PI / 2, 0.8);
    // corvo empalhado e caveira com vela na estante do norte
    this.put(R, (k) => {
      k.b.add(S.sphere(0.12, 8, 6), '#16121c', { s: [1, 1.2, 1.4] });
      k.b.add(S.sphere(0.07, 8, 6), '#16121c', { p: [0, 0.16, 0.1] });
      k.b.add(S.cone(0.03, 0.1, 4), '#3a3a3a', { p: [0, 0.16, 0.2], r: [Math.PI / 2, 0, 0] });
      k.b.add(S.sphere(0.012, 4, 3), '#ffd84a', { p: [0.035, 0.18, 0.15] });
    }, -9.9, y + 3.62, -8.55);
  }

  quarto() {
    const R = 'quarto', y = LV.U.y, M = this.M, rng = this.rng;
    // cama-caixão com a cabeceira na parede leste
    this.put(R, (k) => F.coffinBed(k), 11.2, y, -0.45, -Math.PI / 2);
    this.box('U', 11.2, -0.45, 1.6, 1.05, 3.4);
    this.flavorObj(V3(10.4, y + 0.8, -0.45), 'Cama-Caixão', 'Forro de cetim, travesseiro de terra da Transilvânia', ['Não, obrigado. Você ainda está vivo.', 'Debaixo do travesseiro: um bilhete. "Anselmo, NÃO arrume minha capa nova. — C."'], { h: 1.4, r: 1.3 });
    // móbile de morcegos girando sobre a cama
    const mob = this.obj('U', (k) => {
      k.b.add(S.cyl(0.005, 0.005, 0.5, 3), '#c8a24a', { p: [0, -0.25, 0] });
      k.b.add(S.torus(0.35, 0.01, 3, 16), '#c8a24a', { p: [0, -0.5, 0], r: [Math.PI / 2, 0, 0] });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        k.b.add(S.cyl(0.003, 0.003, 0.3, 3), '#c8a24a', { p: [Math.cos(a) * 0.35, -0.65, Math.sin(a) * 0.35] });
        k.b.add(S.sphere(0.05, 6, 5), '#1e1826', { p: [Math.cos(a) * 0.35, -0.82, Math.sin(a) * 0.35], s: [1, 1.2, 1] });
        for (const e of [-1, 1]) k.b.add(S.cone(0.06, 0.12, 3), '#1e1826', { p: [Math.cos(a) * 0.35 + e * 0.06, -0.8, Math.sin(a) * 0.35], r: [0, 0, e * 1.3] });
      }
    }, 11.2, y + 3.1, -0.45);
    this.io.anim.push({ update: (dt) => (mob.g.rotation.y += dt * 0.35) });
    // criados-mudos com vela, pantufas de morcego
    for (const s of [-1, 1]) {
      const z = -0.45 + s * 1.55;
      this.put(R, (k) => F.table(k, { w: 0.5, d: 0.5, h: 0.65, wood: '#2a1418', legs: 'square' }), 12.3, y, z);
      const f = this.put(R, (k) => [F.candle(k, M, { h: 0.2, r: 0.035 })], 12.3, y + 0.65, z);
      this.lights(f, { i: 0.55, dist: 7 });
      this.box('U', 12.3, z, 0.26, 0.26, 0.8);
    }
    this.put(R, (k) => {
      for (const s of [-1, 1]) {
        k.b.add(S.sphere(0.08, 8, 6), '#1e1826', { p: [s * 0.1, 0.05, 0], s: [0.8, 0.6, 1.6] });
        for (const e of [-1, 1]) k.b.add(S.cone(0.05, 0.08, 3), '#1e1826', { p: [s * 0.1 + e * 0.05, 0.1, 0.1], r: [0, 0, e * 0.8] });
        k.b.add(S.cone(0.012, 0.04, 3), '#ffffff', { p: [s * 0.1, 0.06, 0.14], r: [Math.PI / 2, 0, 0] });
      }
    }, 9.4, y, -0.9, -Math.PI / 2);
    this.put(R, (k) => F.trunk(k, { col: '#2a1418' }), 9.25, y, -0.45, -Math.PI / 2);
    this.box('U', 9.25, -0.45, 0.32, 0.52, 0.6);
    // guarda-roupa aberto: sete capas pretas iguais e um cabide vazio
    this.put(R, (k) => F.wardrobe(k), 5.5, y, -3.5, Math.PI / 2);
    this.box('U', 5.5, -3.5, 0.34, 0.82, 2.6);
    this.flavorObj(V3(5.7, y + 1.2, -3.5), 'Guarda-roupa', 'Sete capas pretas idênticas', ['Sete capas pretas iguaizinhas e um cabide vazio com a etiqueta "CAPA NOVA — NÃO MEXER".', 'Todas as capas têm a mesma etiqueta: "Preta. Clássica. Dramática."'], { h: 2.2, r: 0.9 });
    // penteadeira com espelho que não reflete ninguém
    this.put(R, (k) => F.vanity(k, M), 7.3, y, 1.62, Math.PI);
    this.box('U', 7.3, 1.62, 0.56, 0.26, 1.0);
    this.put(R, (k) => F.chair(k, { wood: '#2a1418', seat: '#8a1a2a', high: false }), 7.3, y, 0.9, 0);
    this.flavorObj(V3(7.3, y + 1.3, 1.6), 'Espelho da Penteadeira', 'Não reflete vampiros', ['Você se olha no espelho... e ele mostra só o quarto. Você também não aparece. Estranho.', 'Um post-it no canto: "Não adianta. Já tentei. — C."'], { h: 1.6 });
    this.put(R, (k) => F.portrait(k, M, PORTRAITS.conde, { w: 0.9, h: 1.3, y: 2.35 }), 12.84, y, -0.45, -Math.PI / 2);
    this.put(R, (k) => F.rug(k, M, 1, 2.2, 3.0), 8.4, y + 0.01, -5.0);
    // lustre no medalhão do forro, divã sobre o tapete, mesinha e biombo no canto do guarda-roupa
    const qc = this.put(R, (k) => F.chandelier(k, M, { R: 0.75, drop: 1.05, tiers: 1, n: 8, metal: '#2a1a22' }), 9, ROOM.saguao.top, -3.5);
    this.light(qc[0], { i: 0.85, dist: 12, halo: 0.6, dy: -1.0 });
    for (const p of qc.slice(1)) this.light(p, { pool: false, halo: 0.5 });
    this.put(R, (k) => F.chaise(k), 8.5, y, -4.9, 0.35);
    this.box('U', 8.5, -4.9, 0.95, 0.42, 0.9, -0.35);
    this.flavorObj(V3(8.5, y + 0.6, -4.9), 'Divã de Veludo', 'Onde o Conde "descansa os olhos"', ['A almofada ainda tem o formato da cabeça do Conde. E um fio de cabelo engomado.', 'Debaixo do divã: um pé de meia, um livro "Como Parecer Mais Assustador" e poeira de 1840.'], { h: 1.0, r: 1.0 });
    this.put(R, (k) => F.sideTable(k), 7.1, y, -5.7);
    this.circle('U', 7.1, -5.7, 0.3, 0.8);
    this.put(R, (k) => F.foldingScreen(k), 6.2, y, -7.4, 0.8);
    this.box('U', 6.2, -7.4, 0.8, 0.25, 1.8, -0.8);
    // cômoda com gavetas, caixa de "chocolates" em coração
    this.put(R, (k) => {
      k.b.add(S.boxB(1.4, 1.0, 0.55), '#2a1418');
      for (let i = 0; i < 3; i++) {
        k.b.add(S.box(1.3, 0.28, 0.02), '#3a1e20', { p: [0, 0.18 + i * 0.3, 0.28] });
        for (const s of [-1, 1]) k.b.add(S.sphere(0.02, 5, 4), '#d8b04a', { p: [s * 0.35, 0.2 + i * 0.3, 0.3] });
      }
      k.b.add(S.box(1.46, 0.04, 0.6), '#3a1e20', { p: [0, 1.02, 0] });
      k.b.add(S.box(0.3, 0.06, 0.25), '#b0203a', { p: [0.3, 1.07, 0], r: [0, 0.3, 0] });
      k.b.add(S.cylB(0.05, 0.05, 0.25, 8), '#b8c8d8', { p: [-0.4, 1.04, 0] });
      k.b.add(S.sphere(0.07, 7, 5), '#3a1a2a', { p: [-0.4, 1.33, 0] });
    }, 9.0, y, -8.6);
    this.box('U', 9.0, -8.6, 0.72, 0.3, 1.1);
    const f = this.put(R, (k) => F.candelabra(k, M, { arms: 5, h: 0.5, span: 0.3 }), 8.4, y + 1.04, -8.6);
    this.lights(f, { i: 0.55, dist: 8 });
    this.cobweb(R, 12.85, 9.25, -8.85, -Math.PI / 2, 1.0);
  }

  banheiro() {
    const R = 'banheiro', y = LV.U.y, M = this.M, rng = this.rng;
    this.put(R, (k) => F.clawTub(k), 11.4, y, 6.1);
    this.box('U', 11.4, 6.1, 0.5, 1.0, 0.9);
    this.flavorObj(V3(11.4, y + 0.8, 6.1), 'Banheira', 'Espuma vermelha', ['Espuma vermelha. Melhor nem perguntar.', 'O patinho de borracha tem presinhas. Ele sabe coisas.'], { sfx: 'glub', h: 1.2, r: 1.0 });
    // velas num banquinho ao lado da banheira (na borda, a luz colava na louça e estourava)
    this.put(R, (k) => F.stool(k), 10.35, y, 4.75);
    this.circle('U', 10.35, 4.75, 0.22, 0.6);
    for (let i = 0; i < 3; i++) {
      const p = this.put(R, (k) => [F.candle(k, M, { h: 0.12 + i * 0.05, r: 0.028, x: Math.cos(i * 2.1) * 0.09, z: Math.sin(i * 2.1) * 0.09, y: 0.52 })], 10.35, y, 4.75);
      this.lights(p, { i: i === 0 ? 0.2 : 0, dist: 5, pool: i === 0, halo: 0.22 });
    }
    this.put(R, (k) => F.sink(k, M), 5.4, y, 5.4, Math.PI / 2);
    this.circle('U', 5.45, 5.4, 0.3, 1.2);
    this.flavorObj(V3(5.5, y + 1.5, 5.4), 'Espelho do Banheiro', 'Também não reflete ninguém', ['Um recado escrito no vapor do espelho: "NÃO ME PERGUNTE COMO EU FAÇO A BARBA."'], { h: 1.4 });
    this.put(R, (k) => F.towelRack(k), 9.4, y, 8.6, Math.PI);
    this.put(R, (k) => F.rug(k, M, 1, 1.4, 0.9), 10.2, y + 0.01, 6.1, Math.PI / 2);
    // armarinho de poções (aberto, frascos à mostra) e planta
    this.put(R, (k) => F.potionCabinet(k, M), 7.2, y, 8.78, Math.PI);
    this.box('U', 7.2, 8.7, 0.44, 0.2, 1.7);
    this.flavorObj(V3(7.2, y + 1.0, 8.5), 'Armarinho de Poções', 'Tônicos capilares do Conde', ['"Tônico Asa de Morcego: para uma capa sempre brilhante." Está quase vazio.', 'Um frasco rosa diz: "Anti-alho. Tomar antes do jantar com os Van Helsing."'], { sfx: 'glub', h: 1.8, r: 0.5 });
    this.put(R, (k) => F.plantDead(k, rng), 12.4, y, 8.4);
    // privada de corrente no canto nordeste (o trono do Conde)
    this.put(R, (k) => F.toilet(k), 12.52, y, 3.2, -Math.PI / 2);
    this.box('U', 12.45, 3.2, 0.36, 0.24, 0.8);
    this.flavorObj(V3(12.5, y + 0.6, 3.2), 'Trono de Porcelana', 'Com descarga de corrente', ['Você puxa a corrente. Lá do porão, alguém grita: "ANSELMO, A CAIXA D\'ÁGUA DE NOVO!"', 'Vampiros não precisam disso. O Conde diz que é "para as visitas".'], { sfx: 'glub', h: 1.1, r: 0.5 });
    this.put(R, (k) => F.rug(k, M, 3, 0.8, 0.6), 11.8, y + 0.01, 3.2, Math.PI / 2);
    // cesto de roupas e prateleira de toalhas no canto noroeste
    this.put(R, (k) => F.hamper(k), 5.6, y, 2.6);
    this.circle('U', 5.6, 2.6, 0.26, 0.8);
    this.put(R, (k) => {
      k.b.add(S.box(0.9, 0.04, 0.3), '#3a2218', { p: [0, 1.6, 0] });
      for (const s of [-1, 1]) k.b.add(S.box(0.04, 0.2, 0.26), '#3a2218', { p: [s * 0.4, 1.5, -0.02] });
      const cols = ['#6a1a3a', '#e8dce0', '#4a1228', '#1a1418'];
      for (let i = 0; i < 4; i++) k.b.add(S.box(0.2, 0.07, 0.24), cols[i], { p: [-0.3 + i * 0.2, 1.655, 0] });
      for (let i = 0; i < 3; i++) k.b.add(S.box(0.2, 0.07, 0.24), cols[(i + 2) % 4], { p: [-0.2 + i * 0.2, 1.725, 0] });
      k.b.add(S.sphere(0.05, 8, 6), '#e8e0d8', { p: [0.36, 1.68, 0.02], s: [1.3, 0.8, 1] });
    }, 6.6, y, 2.18, 0);
    const f = this.put(R, (k) => F.sconce(k, M), 5.16, 2.2 + y - 0.1 + 0.2, 7.4, Math.PI / 2);
    this.lights(f, { i: 0.4, dist: 7 });
  }

  // ============================================================ PORÃO
  cripta() {
    const R = 'cripta', y = LV.B.y, M = this.M;
    const names = [7, 8, 9, 19];
    const spots = [[-10.8, -5.6], [-10.8, -0.8], [-10.8, 4.0], [-7.4, 5.8]];
    spots.forEach(([x, z], i) => {
      this.put(R, (k) => F.sarcophagus(k, M, names[i]), x, y, z, i === 3 ? -Math.PI / 2 : 0);
      if (i === 3) this.box('B', x, z, 1.15, 0.5, 1.2);
      else this.box('B', x, z, 0.5, 1.15, 1.2);
    });
    // nichos de ossário com caveiras na parede oeste
    this.put(R, (k) => {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
        const z = -7.5 + c * 1.35, yy = 0.7 + r * 0.9;
        k.glow(M.dark).add(S.box(0.02, 0.55, 0.9), '#fff', { p: [0, yy, z] });
        k.b.add(S.box(0.3, 0.06, 0.95), '#5a5462', { p: [0.12, yy - 0.3, z] });
        if ((r + c) % 3 !== 1) {
          k.b.add(S.sphere(0.12, 8, 6), PAL.bone, { p: [0.14, yy - 0.16, z], s: [1, 1.1, 1] });
          for (const e of [-1, 1]) k.b.add(S.sphere(0.03, 4, 3), PAL.ink, { p: [0.25, yy - 0.14, z + e * 0.05] });
        }
      }
    }, -12.85, y, 0, 0);
    // candelabros altos de ferro com velas verdes
    for (const [x, z] of [[-8.6, -7.6], [-8.6, -2.4], [-8.6, 2.2], [-12.2, 7.9]]) {
      const f = this.put(R, (k) => F.candelabra(k, M, { arms: 3, h: 1.5, span: 0.26, metal: '#24202c' }), x, y, z);
      this.lights(f, { i: 0.55, dist: 8, color: '#9affc8', haloColor: '#9affc8' });
      this.circle('B', x, z, 0.2, 1.8);
    }
    // estandarte da família e urnas
    this.put(R, (k) => {
      k.d.add(new THREE.PlaneGeometry(1.2, 2.0, 1, 4).translate(0, -1, 0), '#4a0e1e');
      k.b.add(S.cyl(0.03, 0.03, 1.5, 5), '#c8a24a', { r: [0, 0, Math.PI / 2] });
      k.b.add(S.sphere(0.25, 8, 6), '#c8a24a', { p: [0, -0.9, 0.02], s: [1, 1, 0.2] });
    }, -5.2, y + 3.4, -6.0, -Math.PI / 2);
    for (const z of [-3.5, 3.5]) {
      this.put(R, (k) => {
        k.b.add(S.boxB(0.5, 0.9, 0.5), '#5a5462');
        k.b.add(S.lathe([[0.001, 0], [0.15, 0], [0.2, 0.15], [0.12, 0.35], [0.15, 0.42], [0.001, 0.45]], 10), '#8a7a5a', { p: [0, 0.9, 0] });
      }, -5.5, y, z);
      this.circle('B', -5.5, z, 0.3, 1.4);
    }
    this.cobweb(R, -12.85, -0.4, -8.85, 0, 1.3);
    this.cobweb(R, -5.15, -0.4, 8.85, Math.PI, 1.0);
    this.anchor('crypt', V3(-8.8, y, 0));
  }

  lavanderia() {
    const R = 'lavanderia', y = LV.B.y, M = this.M, rng = this.rng;
    this.put(R, (k) => F.washtub(k), -2.6, y, -5.2);
    this.circle('B', -2.6, -5.2, 0.55, 1.1);
    this.flavorObj(V3(-2.6, y + 0.8, -5.2), 'Tanque de Lavar', 'Espuma de sabão fantasma', ['A espuma forma a palavra "BU". Fofo.', 'Tem uma meia de 1802 aqui. Ainda molhada.'], { sfx: 'glub', h: 1.2 });
    this.put(R, (k) => F.ironingBoard(k), 1.4, y, -4.6, -0.2);
    this.box('B', 1.4, -4.6, 0.9, 0.3, 1.0, 0.2);
    this.anchor('note', V3(1.2, y + 0.9, -4.55));
    // varal atravessando a lavanderia
    this.put(R, (k) => F.clothesline(k, 9.0, rng), -4.5, y + 2.6, 2.4);
    for (const x of [-4.6, 4.6]) this.put(R, (k) => k.b.add(S.cylB(0.04, 0.04, 2.7, 5), '#5a4a3a'), x, y, 2.4);
    // caldeira com brasa, cesto de roupas, caixas de sabão, rolo de espremer
    const bl = this.put(R, (k) => F.boiler(k, M), 3.6, y, 6.9, Math.PI);
    this.circle('B', 3.6, 6.9, 0.7, 3);
    this.io.lightSources.push({ ...this.io.toWorld(bl.glow.x, bl.glow.y, bl.glow.z), i: 0.6, dist: 7, color: '#ff7a3a' });
    this.put(R, (k) => {
      k.b.add(S.cylB(0.35, 0.28, 0.45, 12, true), '#b89a6a');
      for (let i = 0; i < 7; i++) k.b.add(S.sphere(0.12, 6, 5), rng.pick(['#e8e0d8', '#16121c', '#8a1a2a', '#6a3a8a']), { p: [rng.range(-0.15, 0.15), 0.42 + (i % 3) * 0.05, rng.range(-0.15, 0.15)], s: [1.3, 0.6, 1] });
    }, -0.8, y, -7.6);
    this.circle('B', -0.8, -7.6, 0.38, 0.6);
    this.put(R, (k) => {
      for (let i = 0; i < 3; i++) {
        k.b.add(S.boxB(0.4, 0.3, 0.3), '#d8e8f0', { p: [i * 0.45, 0, 0] });
        F.label(k, M, 6, 0.3, 0.15, { p: [i * 0.45, 0.16, 0.152] });
      }
      k.b.add(S.boxB(0.4, 0.3, 0.3), '#d8e8f0', { p: [0.2, 0.3, 0] });
    }, -4.3, y, -8.5);
    this.box('B', -3.85, -8.5, 0.72, 0.2, 0.7);
    this.put(R, (k) => {
      k.b.add(S.boxB(0.8, 0.9, 0.5), '#5a4a3a');
      for (const yy of [1.0, 1.15]) k.b.add(S.cyl(0.08, 0.08, 0.7, 10), '#c8c0b0', { p: [0, yy, 0], r: [0, 0, Math.PI / 2] });
      k.b.add(S.torus(0.18, 0.02, 4, 12), '#3a3a42', { p: [0.42, 1.05, 0], r: [0, Math.PI / 2, 0] });
    }, 4.2, y, -7.8);
    this.box('B', 4.2, -7.8, 0.42, 0.28, 1.2);
    // tábua de passar do Anselmo: cestinho de capas limpas (vazio)
    this.put(R, (k) => {
      k.b.add(S.boxB(0.6, 0.3, 0.4), '#b89a6a');
      F.label(k, M, 22, 0.3, 0.15, { p: [0, 0.18, 0.205] });
    }, 2.6, y, -3.5, -0.2);
    for (const [x, z] of [[-3.2, -1.2], [2.6, -1.0], [0, 7.8]]) this.hangingLamp(R, x, z);
    // metade sul: capinhas secando, balde com esfregão e o cantinho de costura do Anselmo
    this.put(R, (k) => F.dryingRack(k), -2.4, y, 5.6, 0.35);
    this.box('B', -2.4, 5.6, 0.62, 0.34, 1.5, 0.35);
    this.put(R, (k) => F.bucketMop(k), 1.3, y, 8.4, 0.4);
    this.circle('B', 1.3, 8.4, 0.22, 0.6);
    this.put(R, (k) => F.sewingTable(k), -3.6, y, 8.35, Math.PI);
    {
      const f = this.put(R, (k) => {
        k.b.add(S.cylB(0.07, 0.05, 0.06, 10), '#b8a060');
        k.b.add(S.torus(0.04, 0.008, 3, 8, Math.PI), '#b8a060', { p: [0.08, 0.04, 0], r: [0, 0, Math.PI / 2] });
        return [F.candle(k, M, { h: 0.1, r: 0.025, y: 0.05 })];
      }, -3.95, y + 0.74, 8.3);
      this.lights(f, { i: 0.45, dist: 6, halo: 0.35 });
      this.io.lightSources[this.io.lightSources.length - 1].pri = 40;
    }
    this.box('B', -3.6, 8.35, 0.44, 0.3, 0.9);
    this.put(R, (k) => F.chair(k, { wood: '#4a3426', seat: '#3a4a6a' }), -3.6, y, 7.5, 0);
    this.box('B', -3.6, 7.5, 0.25, 0.25, 0.9);
    this.put(R, (k) => F.mannequin(k, { cape: '#16121c' }), -1.6, y, 8.3, -0.3);
    this.circle('B', -1.6, 8.3, 0.3, 1.8);
    this.flavorObj(V3(-3.6, y + 0.9, 8.35), 'Mesinha de Costura', 'Do Anselmo', ['Uma capa pela metade, com o bilhete: "Reserva, caso o Conde perca a nova." Previdente, esse Anselmo.', 'A almofada de alfinetes tem o formato do Conde. Ninguém comenta.'], { h: 1.2, r: 0.6 });
    this.cobweb(R, 4.85, -0.4, -8.85, -Math.PI / 2, 0.9);
    // caixinha de esquecidos do Anselmo
    this.flavorObj(V3(-0.8, y + 0.5, -7.6), 'Cesto de Roupas', 'Separado por cor (preto, preto e preto)', ['Meias sem par. Ceroulas. Uma capa infantil que não é sua... ainda.'], { h: 0.8 });
  }

  adega() {
    const R = 'adega', y = LV.B.y, M = this.M, rng = this.rng;
    for (const z of [-3.5, -0.9, 1.7, 4.3]) {
      this.put(R, (k) => F.bottleRack(k, M, rng, { w: 2.2, h: 2.4 }), 12.6, y, z, -Math.PI / 2);
      this.box('B', 12.6, z, 0.25, 1.12, 2.4);
    }
    // barris deitados em berços e empilhados
    for (let i = 0; i < 3; i++) {
      const z = 6.0 + (i - 1) * 1.05;
      this.put(R, (k) => {
        for (const e of [-1, 1]) k.b.add(S.boxB(0.12, 0.5, 0.9), '#4a3426', { p: [e * 0.5, 0, 0] });
        F.barrel(k, { r: 0.5, h: 1.3, lying: true });
      }, 8.0, y, z, 0);
      this.box('B', 8.65, z, 0.7, 0.5, 1.2);
    }
    for (const [x, z] of [[6.0, 8.2], [6.9, 8.4], [6.4, 7.5]]) {
      this.put(R, (k) => F.barrel(k, { r: 0.4, h: 1.0 }), x, y, z);
      this.circle('B', x, z, 0.42, 1.1);
    }
    for (const [x, z, s] of [[11.2, 7.8, 0.7], [11.9, 7.9, 0.6], [11.5, 7.8, 0.5]]) this.put(R, (k) => F.crate(k, { s }), x, y + (s === 0.5 ? 0.7 : 0), z, rng.range(-0.3, 0.3));
    this.box('B', 11.6, 7.85, 0.75, 0.4, 1.3);
    // mesa de degustação
    this.put(R, (k) => {
      F.table(k, { w: 1.2, d: 0.7, h: 0.8, wood: '#4a3426', legs: 'square' });
      for (let i = 0; i < 3; i++) k.b.add(S.lathe([[0.001, 0], [0.04, 0], [0.01, 0.02], [0.01, 0.1], [0.045, 0.14], [0.05, 0.2], [0.001, 0.12]], 8), '#b8c8d8', { p: [-0.3 + i * 0.25, 0.8, 0.1] });
      k.b.add(S.cyl(0.05, 0.05, 0.3, 8), '#3a0a14', { p: [0.2, 0.95, -0.15] });
    }, 8.0, y, -2.0, 0.2);
    this.box('B', 8.0, -2.0, 0.62, 0.38, 1.0, 0.2);
    const f = this.put(R, (k) => [F.candle(k, M, { h: 0.18, r: 0.04 })], 7.7, y + 0.8, -2.2);
    this.lights(f, { i: 0.55, dist: 8 });
    const f2 = this.put(R, (k) => F.sconce(k, M), 5.16, y + 2.2, 4.5, Math.PI / 2);
    this.lights(f2, { i: 0.45, dist: 8 });
    const f3 = this.put(R, (k) => F.sconce(k, M), 9.5, y + 2.2, -7.35, 0);
    this.lights(f3, { i: 0.45, dist: 8 });
    // lamparinas: uma sobre o corredor das garrafas, outra sobre os barris
    this.hangingLamp(R, 11.0, 0.4, { i: 0.7, dist: 9 });
    this.hangingLamp(R, 9.2, 5.6, { i: 0.6, dist: 8 });
    this.flavorObj(V3(12.3, y + 1.2, -0.9), 'Adega', 'Safra 1703', ['Todas as garrafas dizem "Safra 1703". O Conde não gosta de novidade.', 'Uma garrafa tem um bilhete: "Reserva especial para o casamento do Suspiro."'], { h: 2.2, r: 1.1 });
    this.cobweb(R, 12.85, -0.4, 8.85, Math.PI, 1.2);
    this.cobweb(R, 5.15, -0.4, -8.85, 0, 0.9);
  }

  // ============================================================ SÓTÃO
  sotao() {
    const R = 'sotao', y = LV.A.y, M = this.M, rng = this.rng;
    // tralha nos beirais (onde o telhado é baixo)
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const z = -7.8 + i * 2.5 + rng.range(-0.4, 0.4);
        const kind = (i + (s > 0 ? 1 : 0)) % 4;
        const x = s * rng.range(11.4, 12.2);
        if (kind === 0) this.put(R, (k) => F.trunk(k, { col: rng.pick(['#5a3a26', '#3a2a3a', '#4a3a2a']) }), x, y, z, s * Math.PI / 2 + rng.range(-0.2, 0.2));
        else if (kind === 1) this.put(R, (k) => F.crate(k, { s: 0.6 }), x, y, z, rng.range(0, 1));
        else if (kind === 2) this.put(R, (k) => F.sheetCovered(k, { w: 0.9, h: 0.8, d: 0.6 }), x, y, z, rng.range(0, 1));
        else this.put(R, (k) => F.bookStack(k, rng, 6), x, y, z, rng.range(0, 3));
      }
    }
    // móveis cobertos por lençóis (parecem fantasmas)
    for (const [x, z, w, h] of [[-8.5, -6.8, 1.4, 1.1], [-10.3, 6.6, 1.0, 1.7], [7.2, -3.0, 1.8, 0.9]]) {
      this.put(R, (k) => F.sheetCovered(k, { w, h, d: 0.8 }), x, y, z, rng.range(-0.4, 0.4));
      this.box('A', x, z, w / 2 + 0.05, 0.45, h);
    }
    this.flavorObj(V3(-10.3, y + 0.9, 6.6), 'Lençol Suspeito', 'É só um móvel coberto... né?', ['Você levanta o lençol: é só um relógio velho. O lençol te olha feio.', 'O lençol se mexeu. Foi o vento. Com certeza foi o vento.'], { h: 1.8 });
    // cavalinho de balanço (balança quando você cutuca)
    const horse = this.obj('A', (k) => F.rockingHorse(k), -3.2, y, -5.4, 0.6);
    let rock = 0;
    this.io.anim.push({ update: (dt, t) => { rock = Math.max(0, rock - dt * 0.25); horse.g.rotation.z = Math.sin(t * 5) * 0.2 * rock; } });
    this.box('A', -3.2, -5.4, 0.55, 0.3, 1.0, 0.6);
    this.flavorObj(V3(-3.2, y + 0.6, -5.4), 'Cavalinho de Balanço', 'Brinquedo do Conde (1710)', ['Você empurra o cavalinho. Ele balança sozinho por tempo demais.'], { sfx: 'creak', h: 1.1, onUse: () => (rock = 1) });
    // manequim com capas antigas, gaiola, espelho empoeirado, cadeiras empilhadas
    this.put(R, (k) => F.mannequin(k, { cape: '#3a1a2a' }), 3.8, y, 5.6, -0.4);
    this.circle('A', 3.8, 5.6, 0.3, 1.9);
    this.put(R, (k) => F.birdcage(k), -1.8, y + 2.9, 3.6);
    this.put(R, (k) => k.b.add(S.cyl(0.005, 0.005, 1.6, 3), '#c8a24a', { p: [0, 0.8, 0] }), -1.8, y + 3.66, 3.6);
    this.put(R, (k) => {
      F.mirror(k, M, { w: 0.9, h: 1.6, y: 0.95, oval: false, frame: '#8a7a5a' });
    }, 5.3, y, -7.2, -0.5);
    for (let i = 0; i < 3; i++) this.put(R, (k) => F.chair(k, { wood: '#4a3426', seat: '#5a4a3a' }), -5.8, y + i * 0.5, -7.6, i * 0.4 + (i === 1 ? Math.PI : 0));
    this.box('A', -5.8, -7.6, 0.35, 0.35, 1.8);
    // quadros velhos encostados
    for (const [x, z, idx, ry] of [[1.2, -8.3, PORTRAITS.vovo, 0.1], [-3.4, 8.3, PORTRAITS.mansao, Math.PI - 0.2]]) {
      this.put(R, (k) => F.portrait(k, M, idx, { w: 0.7, h: 1.0, y: 0.62 }), x, y, z, ry);
    }
    // geladeira do sangue de reserva (a festa dos morcegos foi aqui)
    this.put(R, (k) => F.bloodFridge(k, M), 8.2, y, 3.2, -Math.PI / 2 - 0.2);
    // o centro do sótão: tapete velho, sofá coberto, cabideiro, caixas empilhadas, gramofone e a mesa da festa
    this.put(R, (k) => F.rug(k, M, 3, 3.4, 2.6), 1.4, y + 0.004, 0.6, 0.15);
    this.put(R, (k) => F.sheetCovered(k, { w: 2.1, h: 0.95, d: 0.9, col: '#cfc8d4' }), -1.4, y, -2.4, 0.25);
    this.box('A', -1.4, -2.4, 1.1, 0.5, 1.0, 0.25);
    this.put(R, (k) => F.coatRack(k), 4.9, y, -2.2, 0.8);
    this.circle('A', 4.9, -2.2, 0.28, 2);
    this.put(R, (k) => F.partyTable(k, rng), 2.9, y, -1.2, -0.2);
    this.box('A', 2.9, -1.2, 0.65, 0.45, 1.2, -0.2);
    this.flavorObj(V3(2.9, y + 1.0, -1.2), 'Bolo da Festa', 'Recheio de... melhor não', ['Sobrou bolo! A cobertura é vermelha e a fatia que falta tem marquinhas de presas.', 'Um cartão: "Feliz aniversário, Conde! 612 anos e nenhum dia a mais." — Os Morcegos'], { h: 1.3, r: 0.7 });
    this.put(R, (k) => F.gramophone(k), 0.1, y, 2.9, 2.6);
    this.circle('A', 0.1, 2.9, 0.3, 0.8);
    this.flavorObj(V3(0.1, y + 0.5, 2.9), 'Gramofone', 'O disco da festa', ['O disco é "Valsa das Presas, vol. 3". Está arranhado bem no refrão.'], { sfx: 'dance', h: 0.9, r: 0.5 });
    for (const [x, z, sz, yy] of [[5.4, 1.2, 0.7, 0], [5.4, 1.2, 0.55, 0.7], [6.2, 1.5, 0.6, 0], [5.8, 0.4, 0.5, 0]]) {
      this.put(R, (k) => F.crate(k, { s: sz, wood: rng.pick(['#7a5a3a', '#6a4a32', '#8a6a4a']) }), x, y + yy, z, rng.range(-0.3, 0.3));
    }
    this.box('A', 5.8, 1.0, 0.75, 0.7, 1.3);

    this.box('A', 8.2, 3.2, 0.4, 0.5, 1.9, 0.2);
    this.flavorObj(V3(8.2, y + 1.0, 3.2), 'Geladeira de Sangue', 'Reserva de emergência do Conde', ['Vazia. Só sobrou um bilhete dos morcegos: "Valeu pela festa! Bj."', 'Na porta, a lista de compras: "sangue, sangue, tomate (disfarce)".'], { sfx: 'chest', h: 1.9 });
    // restos da festa: bandeirinhas, faixa, chapeuzinhos e confete
    this.put(R, (k) => F.banner(k, M, 4.5), 0, y + 3.5, 1.9);
    for (const [x, z, c] of [[1.8, 2.6, '#e8b020'], [2.4, 1.6, '#ff4a8a'], [-0.6, 0.4, '#4ab8e8'], [3.4, -1.0, '#9aff5a']]) this.put(R, (k) => F.partyHat(k, c), x, y, z, rng.range(0, 3));
    this.put(R, (k) => F.confetti(k, rng, 180, 4, 4), 1.2, y + 0.016, 1.0); // acima do tapete
    for (let i = 0; i < 5; i++) this.put(R, (k) => k.b.add(S.sphere(0.18, 8, 6), rng.pick(['#8a1a3a', '#3a2a6a', '#1a4a3a']), { s: [1, 0.35, 1] }), rng.range(-2, 5), y + 0.06, rng.range(-3, 4));
    // morcegos dormindo de cabeça para baixo nas tesouras
    for (const z of [-6.5, -2.3, 1.9, 6.1]) {
      for (let i = 0; i < 5; i++) {
        const x = rng.range(-8, 8);
        this.put(R, (k) => F.hangingBat(k, rng.range(0.8, 1.2)), x, y + LV.A.h + 1.19, z, rng.range(0, TAU));
      }
    }
    let squeakT = 4;
    this.io.anim.push({
      update: (dt, t, io) => {
        if (io.level !== 'A') return;
        squeakT -= dt;
        if (squeakT > 0) return;
        squeakT = 4 + Math.random() * 7;
        io.game.audio?.sfx('squeak', 0.35);
      },
    });
    // luz: lampiões pendurados e o luar pelas janelas redondas
    for (const [x, z] of [[-4, -3.5], [3.5, 3.5], [-6, 3.2]]) {
      const f = this.put(R, (k) => {
        k.b.add(S.cyl(0.005, 0.005, 1.0, 3), '#3a3a42', { p: [0, 0.5, 0] });
        k.b.add(S.cylB(0.08, 0.1, 0.25, 6, true), '#3a3a42');
        k.b.add(S.cone(0.12, 0.12, 6), '#3a3a42', { p: [0, 0.3, 0] });
        return [F.candle(k, M, { h: 0.1, r: 0.03, y: 0.03 })];
      }, x, y + LV.A.h + 2.4, z);
      this.lights(f, { i: 0.95, dist: 11, color: '#ffc080', dy: -0.6 });
    }
    this.cobweb(R, -5.5, y + 4.6, -8.8, 0, 1.6);
    this.cobweb(R, 5.5, y + 4.6, 8.8, Math.PI, 1.6);
    this.cobweb(R, 0.2, y + ATTIC_Y(0) - 0.35, 3.4, Math.PI / 2, 1.2);
    // baú especial (onde o Anselmo guardou a capa nova) perto da janela norte
    this.anchor('trunk', V3(2.4, y, -7.6));
    {
      const f = this.put(R, (k) => {
        k.b.add(S.cyl(0.005, 0.005, 1.0, 3), '#3a3a42', { p: [0, 0.5, 0] });
        k.b.add(S.cylB(0.08, 0.1, 0.25, 6, true), '#3a3a42');
        k.b.add(S.cone(0.12, 0.12, 6), '#3a3a42', { p: [0, 0.3, 0] });
        return [F.candle(k, M, { h: 0.1, r: 0.03, y: 0.03 })];
      }, 2.4, y + 2.7, -6.9);
      this.lights(f, { i: 0.9, dist: 8, color: '#ffd090', dy: -0.6 });
      this.io.lightSources[this.io.lightSources.length - 1].pri = 60;
    }
    this.put(R, (k) => {
      k.b.add(S.boxB(1.4, 0.08, 0.9), '#4a3828');
    }, 2.4, y, -7.6);
  }

  // ------------------------------------------------------------ olhos que seguem o jogador
  portraitEyes(p, sep, r, ry) {
    const { g } = this.obj(p.y > 5 ? 'U' : 'G', (k) => {
      for (const s of [-1, 1]) k.b.add(S.sphere(r, 8, 6), '#1a0a10', { p: [s * sep, 0, 0], s: [1, 1, 0.4] });
    }, p.x, p.y, p.z, ry);
    const base = g.position.clone();
    const right = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
    this.io.anim.push({
      update: (dt, t, io) => {
        const pl = io.game.player.pos;
        const lx = pl.x - INTERIOR.x - base.x, lz = pl.z - INTERIOR.z - base.z, ly = pl.y - INTERIOR.y + 1.5 - base.y;
        const d = Math.hypot(lx, lz) || 1;
        const side = clamp((lx * right.x + lz * right.z) / d, -1, 1);
        const up = clamp(ly / (d + 2), -1, 1);
        g.position.set(base.x + right.x * side * r * 0.9, base.y + up * r * 0.7, base.z + right.z * side * r * 0.9);
      },
    });
  }

  label(room, idx, x, y, z, w, h, ry = 0) {
    this.put(room, (k) => F.label(k, this.M, idx, w, h), x, y, z, ry);
  }

  // ------------------------------------------------------------ fachos de luz pelas janelas
  windowShafts() {
    const M = this.M;
    for (const w of this.io.arch.windowInfo) {
      if (w.kind === 'grate' && w.level !== 'B') continue;
      const k = new IKit();
      const len = w.kind === 'rose' ? 7 : w.level === 'B' ? 3.2 : 4.5;
      const wd = w.kind === 'rose' ? w.w * 0.95 : w.w * 0.9;
      // plano cruzado inclinado para baixo, entrando no cômodo
      // dois planos que se cruzam ao longo do facho (gira em Y) e depois inclinam para o chão (gira em X)
      for (const a of [0, Math.PI / 2]) {
        const g = new THREE.PlaneGeometry(wd, len).translate(0, -len / 2, 0);
        k.glow(M.shaft).addRaw(g, { r: [-0.95, a, 0], order: 'XYZ' });
      }
      const grp = new THREE.Group();
      for (const m of k.meshes()) grp.add(m);
      grp.position.set(w.pos[0], w.pos[1] + (w.kind === 'rose' ? 0.4 : w.h * 0.3), w.pos[2]);
      grp.rotation.y = Math.atan2(w.n[0], w.n[2]);
      grp.userData.level = w.level;
      grp.renderOrder = 3;
      this.objects.push(grp);
    }
  }
  /** poeira dançando no ar (pontinhos aditivos) */
  dust() {
    const rng = this.rng;
    const n = 420;
    const pos = new Float32Array(n * 3);
    const lv = ['G', 'U', 'A', 'B'];
    for (let i = 0; i < n; i++) {
      const L = lv[i % 4];
      const r = [ROOM.saguao, ROOM.biblioteca, ROOM.sotao, ROOM.adega][i % 4];
      pos[i * 3] = rng.range(r.x0 + 0.5, r.x1 - 0.5);
      pos[i * 3 + 1] = LV[L].y + rng.range(0.5, L === 'G' ? 8 : 3.5);
      pos[i * 3 + 2] = rng.range(r.z0 + 0.5, r.z1 - 0.5);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const base = pos.slice();
    const m = new THREE.PointsMaterial({ size: 0.05, color: '#d8c8a8', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, map: makeSparkle(1).material.map, fog: false });
    const pts = new THREE.Points(g, m);
    pts.layers.set(1);
    pts.frustumCulled = false;
    this.objects.push(pts);
    this.io.anim.push({
      update: (dt, t) => {
        const a = g.attributes.position;
        for (let i = 0; i < n; i++) {
          const ph = i * 1.7;
          a.array[i * 3] = base[i * 3] + Math.sin(t * 0.13 + ph) * 0.6;
          a.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.21 + ph * 0.7) * 0.4;
          a.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + ph) * 0.6;
        }
        a.needsUpdate = true;
      },
    });
  }
}

const ATTIC_Y = (x) => LV.A.h + 4.8 * (1 - Math.abs(x) / 13);

/** aplica a matriz aos pontos devolvidos por uma função de móvel */
function transformRet(ret, m) {
  if (!ret) return ret;
  if (ret.isVector3) return ret.clone().applyMatrix4(m);
  if (Array.isArray(ret)) return ret.map((p) => (p?.isVector3 ? p.clone().applyMatrix4(m) : p));
  if (typeof ret === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(ret)) out[k] = transformRet(v, m);
    return out;
  }
  return ret;
}
export { damp, WINDOWS };
