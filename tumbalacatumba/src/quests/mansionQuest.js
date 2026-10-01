// Missão "A Capa Sumida": mordomo, antepassados da cripta, pistas pela mansão e o baú do sótão.
import * as THREE from 'three';
import { NPC, makeSparkle } from '../entities/npc.js';
import * as NM from '../entities/npcModels.js';
import { Interactable } from './interact.js';
import { Builder, S } from '../render/builder.js';
import { MAT, toonMat } from '../render/toon.js';
import { CAPE_CLUES } from './data.js';
import { LV } from '../world/interior/plan.js';
import { clamp, damp, TAU } from '../util/math.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function mesh(b, mat = MAT.vc) {
  const m = new THREE.Mesh(b.build(), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class MansionQuest {
  constructor(qw) {
    this.qw = qw;
    const g = (this.game = qw.game);
    this.P = qw.P;
    const io = (this.io = g.indoors);
    const A = io.decor.anchors;
    this.clues = [];
    // mordomo e antepassados (PNJs de verdade: conversam, têm placa de nome e falas)
    const spot = (lx, ly, lz, yaw) => {
      const w = io.toWorld(lx, ly, lz);
      return { x: w.x, y: w.y, z: w.z, yaw };
    };
    const mk = (id, rig, s) => {
      const n = new NPC(g, id, rig, s);
      n.inter.vRange = 3;
      qw.npcs[id] = n;
      qw.npcList.push(n);
      return n;
    };
    this.butler = mk('anselmo', NM.createButler(), spot(3.4, 0, 3.6, -0.57));
    this.vovo = mk('vovo', NM.createAncestor('vovo'), spot(-8.9, LV.B.y, -3.2, -1.2));
    this.bisa = mk('bisa', NM.createAncestor('bisa'), spot(-11.0, LV.B.y, 6.4, 1.3));
    this.butler.indoorLevel = 'G';
    this.vovo.indoorLevel = this.bisa.indoorLevel = 'B';
    this.butler.barkList = () => this.butlerBarks();

    // pista 1: etiqueta do presente, caída perto do cabideiro
    {
      const b = new Builder();
      b.add(S.box(0.2, 0.012, 0.13), '#f0e6d0');
      b.add(S.box(0.16, 0.014, 0.012), '#8a2a4a', { p: [0, 0.001, 0.03] });
      b.add(S.torus(0.04, 0.012, 4, 10), '#8a4ab8', { p: [-0.1, 0.012, -0.02], r: [Math.PI / 2, 0, 0] });
      b.add(S.box(0.02, 0.006, 0.2), '#8a4ab8', { p: [-0.18, 0.008, 0.02], r: [0, 0.6, 0] });
      this.addClue(0, mesh(b), A.rack.local.clone().add(V3(0.55, 0.012, -0.35)), { name: 'Etiqueta do Presente', subtitle: 'Caída no chão' });
    }
    // pista 2: Manual do Mordomo Perfeito, aberto na escrivaninha
    {
      const b = new Builder();
      b.add(S.box(0.46, 0.03, 0.32), '#6a1a2a');
      for (const s of [-1, 1]) b.add(S.box(0.21, 0.02, 0.29), '#f0e6d0', { p: [s * 0.11, 0.03, 0], r: [0, 0, s * -0.06] });
      for (let i = 0; i < 6; i++) b.add(S.box(0.16, 0.002, 0.008), '#5a4a3a', { p: [-0.11, 0.045, -0.1 + i * 0.04] });
      b.add(S.box(0.02, 0.004, 0.2), '#b01020', { p: [0.02, 0.05, 0.04] });
      this.addClue(1, mesh(b), A.book.local.clone().add(V3(0.15, 0.01, 0.05)), { name: 'Manual do Mordomo Perfeito', subtitle: 'Aberto no capítulo 13' });
    }
    // pista 3: bilhete espetado na tábua de passar
    {
      const b = new Builder();
      b.add(S.box(0.16, 0.2, 0.006), '#f4ecd8');
      for (let i = 0; i < 5; i++) b.add(S.box(0.11, 0.006, 0.002), '#3a2a4a', { p: [0, 0.06 - i * 0.03, 0.004] });
      b.add(S.sphere(0.012, 5, 4), '#b01020', { p: [0, 0.09, 0.008] });
      const m = mesh(b);
      this.addClue(2, m, A.note.local.clone().add(V3(0, 0.14, 0)), { name: 'Bilhete do Anselmo', subtitle: 'Espetado na tábua de passar', rot: [-1.25, 0.2, 0] });
    }
    this.setupTrunk(A.trunk.local);
    this.P.on((type, q) => {
      if (type === 'turnin' && q.id === 'capa') this.onTurnIn();
      if (type === 'accept' && q.id === 'capa') this.onAccept();
      if (type === 'abandon' && q.id === 'capa') this.onAbandon();
    });
  }

  // ------------------------------------------------------------ pistas
  addClue(i, m, local, { name, subtitle, rot }) {
    const g = this.game, io = this.io;
    const grp = new THREE.Group();
    grp.add(m);
    if (rot) m.rotation.set(...rot);
    grp.position.copy(local);
    const sp = makeSparkle(0.9);
    sp.position.y = 0.2;
    grp.add(sp);
    io.root.add(grp);
    const pos = io.toWorld(local.x, local.y, local.z);
    const c = { i, grp, sp, pos, name };
    c.inter = g.interaction.add(
      new Interactable({
        kind: 'item', name, subtitle, reaction: 'neutral', pos, radius: 0.5, height: 0.6, range: 3.2, vRange: 2.5, cursor: 'loot', selectable: false,
        enabled: () => this.clueOpen(i), hint: 'Clique com o botão direito para examinar a pista',
        onInteract: () => this.readClue(c),
      })
    );
    this.clues.push(c);
  }
  /** a pista i está disponível? (em ordem: só a próxima) */
  clueOpen(i) {
    return this.P.status('capa') === 'active' && this.P.count('capa', 'pista') === i;
  }
  readClue(c) {
    const g = this.game, def = CAPE_CLUES[c.i];
    if (!this.clueOpen(c.i)) return;
    g.audio?.sfx('clue');
    g.fx?.sparkleBurst(c.pos.clone().add(V3(0, 0.15, 0)), '#d8b0ff', 16);
    g.ui.dialog.openNote(def.title, def.text, 'Seguir a pista');
    this.P.progress('pista');
    setTimeout(() => {
      g.ui.chat(`Pista: ${def.hint}`, 'system');
      g.ui.info(def.hint);
    }, 400);
  }

  // ------------------------------------------------------------ baú do sótão
  setupTrunk(local) {
    const g = this.game, io = this.io;
    const root = new THREE.Group();
    root.position.copy(local);
    root.rotation.y = 0.15;
    const wood = '#3a2230', band = '#c8a24a';
    const body = new Builder();
    body.add(S.boxB(1.1, 0.55, 0.66), wood);
    for (const x of [-0.38, 0.38]) body.add(S.box(0.07, 0.56, 0.67), band, { p: [x, 0.275, 0] });
    body.add(S.box(1.12, 0.06, 0.68), band, { p: [0, 0.05, 0] });
    body.add(S.box(0.14, 0.16, 0.03), band, { p: [0, 0.45, 0.34] });
    // etiqueta "NÃO ABRIR" (o Anselmo adora placas)
    body.add(S.box(0.3, 0.12, 0.01), '#e8dcc0', { p: [-0.25, 0.3, 0.335] });
    body.add(S.box(1.0, 0.02, 0.6), '#5a1a2a', { p: [0, 0.5, 0] });
    root.add(mesh(body));
    // tampa abaulada presa na dobradiça de trás
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.55, -0.33);
    const lid = new Builder();
    // meio cilindro deitado (eixo em x, cúpula para cima): a tampa abaulada
    lid.add(new THREE.CylinderGeometry(0.33, 0.33, 1.1, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood, { p: [0, 0, 0.33], s: [1, 0.55, 1] });
    for (const x of [-0.38, 0.38]) lid.add(new THREE.CylinderGeometry(0.335, 0.335, 0.07, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), band, { p: [x, 0, 0.33], s: [1, 0.56, 1] });
    const lidMesh = new THREE.Mesh(lid.build(), toonMat({ vertexColors: true, side: THREE.DoubleSide }));
    lidMesh.castShadow = true;
    lidPivot.add(lidMesh);
    root.add(lidPivot);
    // capa nova dobrada e o morceguinho dormindo em cima
    const cape = new Builder();
    cape.add(S.box(0.8, 0.1, 0.46), '#9a1426', { p: [0, 0.56, 0] });
    cape.add(S.box(0.78, 0.02, 0.44), '#e8b848', { p: [0, 0.615, 0.01] });
    cape.add(S.cyl(0.16, 0.16, 0.46, 12), '#9a1426', { p: [-0.34, 0.62, 0], r: [Math.PI / 2, 0, 0] });
    cape.add(S.sphere(0.04, 6, 5), '#ffd84a', { p: [0.3, 0.64, 0.18] });
    const capeMesh = mesh(cape);
    root.add(capeMesh);
    const bat = NM.createBabyBat();
    bat.root.position.set(0.1, 0.63, 0.02);
    bat.root.rotation.y = -0.4;
    root.add(bat.root);
    const sp = makeSparkle(0.7);
    sp.position.set(0, 0.95, 0);
    root.add(sp);
    io.root.add(root);
    const pos = io.toWorld(local.x, local.y, local.z);
    this.trunk = { root, lidPivot, capeMesh, bat, sp, pos, open: 0, target: 0, wake: 0 };
    this.trunk.inter = g.interaction.add(
      new Interactable({
        kind: 'object', name: 'Baú do Anselmo', subtitle: '"NÃO ABRIR"', reaction: 'neutral', pos, radius: 0.8, height: 1.0, range: 3.4, vRange: 2.5, cursor: 'use', selectable: false,
        enabled: () => this.trunkOpenable() || this.trunk.open > 0.5, hint: 'Clique com o botão direito para abrir o baú',
        onInteract: () => this.openTrunk(),
      })
    );
  }
  trunkOpenable() {
    return this.P.status('capa') === 'active' && this.P.count('capa', 'pista') >= 3 && this.P.wants('capanova');
  }
  openTrunk() {
    const g = this.game, t = this.trunk;
    if (!this.trunkOpenable()) {
      if (t.open > 0.5) this.bubble(t.bat, ['(ronc... ronc...)', '(o morceguinho abraça o travesseiro)', 'Zzz... piu... zzz'][Math.floor(Math.random() * 3)]);
      return;
    }
    g.ui.cast('Abrindo o baú', 1.4, {
      icon: 'capanova',
      onDone: () => {
        if (!this.trunkOpenable()) return;
        t.target = 1;
        t.seq = 0; // sequência no tempo do jogo (sem setTimeout: funciona também no e2e)
        g.audio?.sfx('chest');
      },
    });
  }
  /** abre a tampa → o morceguinho boceja → devolve a capa */
  trunkSequence(dt) {
    const g = this.game, t = this.trunk;
    if (t.seq === undefined || t.seq < 0) return;
    const before = t.seq;
    t.seq += dt;
    if (before < 0.7 && t.seq >= 0.7) {
      t.wake = 2.2;
      t.bat.eyesOpen.visible = true;
      t.bat.eyesClosed.visible = false;
      g.audio?.sfx('yawn');
      this.bubble(t.bat, 'Piu...? (o morceguinho boceja, devolve a capa e volta a dormir)', 3.4);
    }
    if (before < 1.5 && t.seq >= 1.5) {
      t.seq = -1;
      t.capeMesh.visible = false;
      g.fx?.sparkleBurst(t.pos.clone().add(V3(0, 0.8, 0)), '#ff4a6a', 22);
      // só entrega a capa se a missão ainda contava com ela (abandonar no meio da sequência não dá item)
      if (this.P.progress('capanova')) {
        this.P.addItem('capanova', 1);
        g.ui.info('Você encontrou a Capa Nova do Conde! Leve-a para ele no portão da mansão.');
      }
    }
  }
  bubble(rig, text, dur = 2.6) {
    const w = new THREE.Vector3();
    rig.root.getWorldPosition(w);
    this.game.ui.bubble({ pos: w, rig }, text, dur);
  }

  // ------------------------------------------------------------ eventos e estado
  onAccept() {
    const t = this.trunk;
    t.open = t.target = 0;
    t.capeMesh.visible = true;
    this.applyState();
  }
  onAbandon() {
    // a capa volta para o baú: sem isso, aceitar de novo daria uma segunda Capa Nova
    while (this.P.hasItem('capanova')) this.P.removeItem('capanova', 99);
    this.trunk.seq = -1;
    this.applyState();
  }
  onTurnIn() {
    const g = this.game;
    this.P.removeItem('capanova');
    this.P.setFlag('condeCape');
    this.applyState();
    const c = this.qw.npcs.conde;
    c.action = 'cheer';
    setTimeout(() => (c.action = null), 5000);
    setTimeout(() => c.say('Veludo carmim! Olhem só como eu fico DRAMÁTICO!', 4), 1200);
    setTimeout(() => {
      g.ui.chat(g.touchMode
        ? 'Você aprendeu a VOAR! Toque no 8 da barra (ou use a Capinha na mochila). Os botões Subir e Descer controlam a altura; segure Descer rente ao chão para pousar.'
        : 'Você aprendeu a VOAR! Aperte 8 (ou use a Capinha na mochila). Espaço sobe, X desce; segure X rente ao chão para pousar.', 'system');
      g.ui.info(g.touchMode ? 'Novo poder: Voar (botão 8)' : 'Novo poder: Voar (tecla 8)');
    }, 2200);
  }
  applyState() {
    const P = this.P, t = this.trunk;
    const got = P.count('capa', 'capanova') >= 1 || P.status('capa') === 'done' || P.status('capa') === 'complete';
    t.target = got ? 1 : 0;
    t.open = t.target;
    t.capeMesh.visible = !got;
    t.bat.eyesOpen.visible = false;
    t.bat.eyesClosed.visible = true;
    const conde = this.qw.npcs.conde.rig;
    const newCape = P.status('capa') === 'done';
    if (conde.capeNew) {
      conde.capeNew.visible = newCape;
      conde.capeOld.visible = !newCape;
    }
  }

  /** para onde o marcador de objetivo aponta quando o jogador está dentro da mansão */
  indoorTarget() {
    if (this.P.status('capa') !== 'active') return null;
    const n = this.P.count('capa', 'pista');
    if (n < 3) return this.clues[n].pos;
    if (this.P.wants('capanova')) return this.trunk.pos;
    return null;
  }
  /** marcadores para o minimapa de dentro: [{ pos, kind, title }] */
  indoorMarkers() {
    const out = [];
    const tg = this.indoorTarget();
    if (tg) out.push({ pos: tg, kind: 'clue', title: this.P.count('capa', 'pista') < 3 ? 'Próxima pista' : 'Baú do Anselmo' });
    return out;
  }

  butlerBarks() {
    const P = this.P;
    if (P.status('capa') === 'active') {
      const n = P.count('capa', 'pista');
      return [
        ['Capa? Que capa? Eu guardo tantas coisas...', 'Pendurei no cabideiro, eu acho. Ou foi no livro? Deixe-me consultar o manual.'],
        ['O manual é muito claro sobre veludo, senhor. Muito claro.', 'Água fria, sabão fantasma e muito carinho.'],
        ['Lavada, passada e guardada. Longe das traças!', 'As traças não sobem escadas, senhor. É ciência.'],
        ['Lá em cima tem um baú que eu nunca abro. Por isso guardo coisas nele.', 'Cuidado com os morceguinhos do sótão. Eles dormem de dia.'],
      ][Math.min(3, n + (P.count('capa', 'capanova') ? 1 : 0))];
    }
    if (P.status('capa') === 'done') return ['O patrão está radiante com a capa nova. Radiante como um vampiro pode ficar.', 'Da próxima vez, eu guardo no lugar ERRADO. Assim o patrão acha.'];
    return this.butler.info.barks;
  }

  update(dt, t) {
    const P = this.P, io = this.io;
    const active = P.status('capa') === 'active';
    const n = P.count('capa', 'pista');
    for (const c of this.clues) {
      // cada pista aparece com a missão e some depois de lida (a etiqueta e o bilhete); o livro fica
      const read = n > c.i || P.status('capa') === 'done';
      c.grp.visible = c.i === 1 ? true : active && !read;
      c.sp.visible = this.clueOpen(c.i);
      if (c.sp.visible) {
        c.sp.material.rotation = t * 0.8 + c.i;
        c.sp.scale.setScalar(0.9 + Math.sin(t * 4 + c.i) * 0.2);
      }
    }
    const tr = this.trunk;
    this.trunkSequence(dt);
    tr.open = damp(tr.open, tr.target, 3, dt);
    tr.lidPivot.rotation.x = -tr.open * 1.9;
    // com a tampa fechada, o morceguinho e a capa ficam guardados lá dentro
    tr.bat.root.visible = tr.open > 0.12;
    if (tr.open <= 0.12) tr.capeMesh.visible = false;
    else if (tr.target === 1 && tr.seq !== -1 && !this.P.count('capa', 'capanova') && this.P.status('capa') !== 'done') tr.capeMesh.visible = true;
    tr.sp.visible = this.trunkOpenable() && tr.target === 0; // some ao abrir: a revelação é do morceguinho
    if (tr.sp.visible) tr.sp.material.rotation = t * 0.8;
    if (tr.wake > 0) {
      tr.wake -= dt;
      if (tr.wake <= 0) {
        tr.bat.eyesOpen.visible = false;
        tr.bat.eyesClosed.visible = true;
      }
    }
    if (io.active && io.level === 'A') tr.bat.animate(dt, {});
    void clamp;
    void TAU;
  }
}
