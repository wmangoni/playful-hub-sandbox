import * as THREE from 'three';
import { NPC, Walker, Pickup, makeSparkle } from '../entities/npc.js';
import * as NM from '../entities/npcModels.js';
import * as CM from '../entities/creatureModels.js';
import { Interactable } from './interact.js';
import { RNG } from '../util/rng.js';
import { damp, dampAngle, clamp, TAU } from '../util/math.js';
import {
  NPC_SPOTS, CAT_SPOTS, FROG_SPOT, EGG_SPOT, cemToWorld, PUMPKIN_FIELD,
  CROP_FIELD, VENTS, WOODS, WATER_LEVEL,
} from '../world/layout.js';

const rng = new RNG(777);

export class QuestWorld {
  constructor(game) {
    this.game = game;
    const P = (this.P = game.progress);
    this.npcs = {};
    const mk = (id, factory, opts) => (this.npcs[id] = new NPC(game, id, factory(), NPC_SPOTS[id], opts));
    mk('prefeito', NM.createMayor);
    mk('aranhilda', NM.createAranhilda);
    mk('juvenal', NM.createSkeleton);
    mk('tonico', NM.createGravedigger);
    mk('custodio', NM.createFarmer);
    mk('zepalha', NM.createScarecrow, { canTurn: false });
    mk('conde', NM.createVampire);
    mk('vesga', NM.createWitch);
    mk('suspiro', () => NM.createGhost('Suspiro'));
    mk('nevoa', () => NM.createGhost('Lady Névoa', { lady: true }));
    this.npcList = Object.values(this.npcs);
    this.npcs.juvenal.barkList = () => (P.status('ossos') === 'done' ? ['Tumbalacatumba tumba tá!', 'Inteiraço e dançando!', 'Quando o relógio bate a uma...'] : this.npcs.juvenal.info.barks);
    this.npcs.zepalha.barkList = () => (P.status('corvos') === 'done' ? ['Zzzzz...', 'Zzz... crá... zzz...', '(ronco de palha)'] : this.npcs.zepalha.info.barks);
    this.npcs.conde.barkList = () => (P.status('dentadura') === 'done' ? ['Olhem meu sorriso! OLHEM!', 'Finalmente, comida sólida.', 'Mwahahaha! ...com dentes!'] : this.npcs.conde.info.barks);
    this.npcs.suspiro.barkList = () => (P.status('resposta') === 'done' ? ['Ela disse sim! (suspiro feliz)', 'Estou nas nuvens! Literalmente, eu flutuo.'] : this.npcs.suspiro.info.barks);

    this.pickups = [];
    this.setupCat();
    this.setupPumpkins();
    this.setupCrows();
    this.setupFrog();
    this.setupEgg();
    this.setupPickups();
    this.pet = new Pet(game);
    P.on((type, data) => this.onEvent(type, data));
    this.applyState();
  }

  // ------------------------------------------------------------------ gato
  setupCat() {
    const g = this.game;
    const rig = CM.createCat();
    const s0 = CAT_SPOTS[0];
    const c = (this.cat = new Walker(g, rig, s0.x, s0.z, 1.2));
    c.spot = 0;
    c.state = 'wait';
    c.sparkle = makeSparkle(1.0);
    c.sparkle.position.y = 0.45;
    rig.root.add(c.sparkle);
    c.inter = g.interaction.add(
      new Interactable({
        kind: 'npc', name: 'Sr. Bigodes', subtitle: 'Gato de Três Olhos', level: '??', reaction: 'neutral', pos: c.pos, radius: 0.5, height: 0.8,
        range: 3.4, cursor: 'use', rig, enabled: () => rig.root.visible, hint: 'Clique com o botão direito para pegar o gato',
        onInteract: () => this.catInteract(),
      })
    );
  }
  catSay(t) {
    this.game.ui.bubble({ pos: this.cat.pos, rig: this.cat.rig }, t, 2.5);
  }
  catFlee() {
    const c = this.cat;
    c.spot = Math.min(2, c.spot + 1);
    c.state = 'run';
    this.catSay(rng.pick(['MIAU!', 'Mrrraaau!', 'Hsss! Miau!']));
    this.game.audio?.sfx('meow');
    if (c.spot === 2) this.game.ui.info('O Sr. Bigodes parece cansado de correr...');
  }
  catInteract() {
    const P = this.P, c = this.cat;
    if (P.flags.catHome) return this.catSay(rng.pick(['Miau.', 'Prrrr...', '(ele finge que não te conhece)']));
    if (!P.wants('gato')) return this.catSay(rng.pick(['Mrrrau?', '(O gato te encara com os três olhos.)', 'Hssss!']));
    if (c.spot < 2 || c.state === 'run') return this.catFlee();
    this.catSay('MIAAAU!!');
    this.game.audio?.sfx('meow');
    this.game.fx?.poof(c.pos, '#2a2438');
    c.rig.root.visible = false;
    P.progress('gato');
    this.game.ui.info('Você colocou o Sr. Bigodes na mochila. Ele não parece feliz.');
  }
  updateCat(dt) {
    const c = this.cat, P = this.P, g = this.game;
    if (P.flags.catHome) {
      c.sparkle.visible = false;
      const d = g.progress.flags.catHome && this.catHome;
      if (d) {
        c.pos.set(d.x, 0, d.z);
        c.rig.root.visible = true;
        c.speed = 0;
        c.yaw = d.yaw;
        c.sync(dt, { sit: true });
      }
      return;
    }
    const st = P.status('gato');
    if (st === 'complete' || st === 'done') {
      c.rig.root.visible = false;
      return;
    }
    c.rig.root.visible = true;
    c.sparkle.visible = P.wants('gato');
    c.sparkle.material.rotation = g.time;
    const pl = g.player.pos;
    const d = Math.hypot(pl.x - c.pos.x, pl.z - c.pos.z);
    if (c.state === 'wait') {
      if (P.wants('gato') && c.spot < 2 && d < 6.5) this.catFlee();
      c.speed = damp(c.speed, 0, 8, dt);
      if (d < 12) c.yaw = dampAngle(c.yaw, Math.atan2(pl.x - c.pos.x, pl.z - c.pos.z), 3, dt);
    } else {
      const s = CAT_SPOTS[c.spot];
      if (c.moveToward(s.x, s.z, 8.5, dt, 0.5)) c.state = 'wait';
    }
    c.sync(dt, { sit: c.state === 'wait' });
  }

  // ------------------------------------------------------------------ abóboras
  setupPumpkins() {
    const g = this.game;
    this.pumpkins = [];
    const f = PUMPKIN_FIELD;
    for (let i = 0; i < 7; i++) {
      const rig = CM.createRebelPumpkin(i);
      const hx = f.x + rng.range(-f.hw + 2, f.hw - 2), hz = f.z + rng.range(-f.hd + 2, f.hd - 2);
      const w = new Walker(g, rig, hx, hz, rng.range(0, TAU));
      w.home = { x: hx, z: hz };
      w.goal = { x: hx, z: hz };
      w.timer = 0;
      w.caught = false;
      w.inter = g.interaction.add(
        new Interactable({
          kind: 'npc', name: 'Abóbora Fujona', subtitle: 'Fugitiva da Prefeitura', level: 1, reaction: 'neutral', pos: w.pos, radius: 0.5, height: 0.8,
          range: 3.0, cursor: 'use', rig, enabled: () => rig.root.visible, hint: 'Clique com o botão direito para capturar',
          onInteract: () => this.catchPumpkin(w),
        })
      );
      rig.root.visible = false;
      w.sparkle = makeSparkle(1.3);
      w.sparkle.position.y = 0.6;
      rig.root.add(w.sparkle);
      this.pumpkins.push(w);
    }
  }
  resetPumpkins() {
    for (const w of this.pumpkins) {
      w.caught = false;
      w.pos.set(w.home.x, 0, w.home.z);
    }
  }
  catchPumpkin(w) {
    if (!this.P.wants('abobora')) return;
    w.caught = true;
    w.rig.root.visible = false;
    this.game.fx?.poof(w.pos, '#e8742a');
    this.game.audio?.sfx('boing');
    this.P.progress('abobora');
  }
  updatePumpkins(dt) {
    const active = this.P.wants('abobora');
    const pl = this.game.player.pos;
    const f = PUMPKIN_FIELD;
    for (const w of this.pumpkins) {
      w.rig.root.visible = active && !w.caught;
      if (!w.rig.root.visible) continue;
      const dx = w.pos.x - pl.x, dz = w.pos.z - pl.z;
      const d = Math.hypot(dx, dz);
      let speed = 1.8;
      w.timer -= dt;
      if (d < 5.5) {
        speed = 4.4;
        w.goal.x = clamp(w.pos.x + (dx / d) * 5, f.x - f.hw - 6, f.x + f.hw + 6);
        w.goal.z = clamp(w.pos.z + (dz / d) * 5, f.z - f.hd - 6, f.z + f.hd + 6);
      } else if (w.timer <= 0) {
        w.timer = rng.range(2, 5);
        w.goal.x = w.home.x + rng.range(-7, 7);
        w.goal.z = w.home.z + rng.range(-7, 7);
      }
      w.moveToward(w.goal.x, w.goal.z, speed, dt, 0.4);
      w.sync(dt);
      const pulse = 1.1 + Math.sin(this.game.time * 4 + w.home.x) * 0.25;
      w.sparkle.scale.setScalar(pulse);
      w.sparkle.material.rotation = this.game.time * 0.8;
    }
  }

  // ------------------------------------------------------------------ corvos
  setupCrows() {
    const g = this.game;
    this.crows = [];
    const perches = [];
    for (const fld of [PUMPKIN_FIELD, CROP_FIELD]) {
      const c = Math.cos(fld.rot), s = Math.sin(fld.rot);
      for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x0 = lx * (fld.hw + 0.8) * 0.97, z0 = lz * (fld.hd + 0.8) * 0.97;
        perches.push({ x: fld.x + x0 * c + z0 * s, z: fld.z - x0 * s + z0 * c, h: 1.2 });
      }
    }
    const zp = NPC_SPOTS.zepalha;
    perches[1] = { x: zp.x + 0.75, z: zp.z + 0.05, h: 2.08, abs: true };
    perches[5] = { x: 22, z: 112, h: 1.25 };
    for (const p of perches) {
      const rig = CM.createCrow();
      const baseY = p.abs ? g.world.groundHeight(p.x, p.z) + p.h : g.world.groundHeight(p.x, p.z) + p.h;
      rig.root.position.set(p.x, baseY, p.z);
      rig.root.rotation.y = rng.range(0, TAU);
      g.scene.add(rig.root);
      this.crows.push({ rig, home: new THREE.Vector3(p.x, baseY, p.z), state: 'perch', t: 0, vel: new THREE.Vector3(), cawT: rng.range(3, 12) });
    }
  }
  /** "Buu!" do jogador: espanta corvos no raio. Retorna quantos. */
  scareCrows(pos, radius = 10) {
    let n = 0;
    for (const c of this.crows) {
      if (c.state !== 'perch') continue;
      if (c.rig.root.position.distanceTo(pos) < radius) {
        this.flyAway(c, pos);
        n++;
        if (this.P.wants('corvo')) this.P.progress('corvo');
      }
    }
    return n;
  }
  flyAway(c, from) {
    c.state = 'fly';
    c.t = 0;
    const d = c.rig.root.position.clone().sub(from);
    d.y = 0;
    d.normalize();
    c.vel.set(d.x * 7, 5, d.z * 7);
    c.rig.flying = true;
    c.rig.root.rotation.y = Math.atan2(d.x, d.z);
    this.game.audio?.sfx('caw');
    this.game.ui.bubble({ pos: c.rig.root.position, rig: c.rig, yOff: 0.4 }, rng.pick(['CRÁ!', 'Crá crá!', 'CRÁÁÁ!']), 1.6);
  }
  updateCrows(dt) {
    const pl = this.game.player.pos;
    for (const c of this.crows) {
      const r = c.rig;
      if (c.state === 'perch') {
        r.root.visible = true;
        r.root.position.copy(c.home);
        if (r.root.position.distanceTo(pl) < 2.8) this.flyAway(c, pl);
        c.cawT -= dt;
        if (c.cawT < 0) {
          c.cawT = rng.range(8, 20);
          if (r.root.position.distanceTo(pl) < 25) this.game.ui.bubble({ pos: c.home, rig: r, yOff: 0.4 }, rng.pick(['Crá crá!', 'Crá! (risada de corvo)', 'Olha o espantalho, crá crá!']), 2);
        }
      } else if (c.state === 'fly') {
        c.t += dt;
        c.vel.y += dt * 1.5;
        r.root.position.addScaledVector(c.vel, dt);
        if (c.t > 3.5) {
          c.state = 'gone';
          c.t = 0;
          r.root.visible = false;
        }
      } else {
        c.t += dt;
        if (c.t > 45 && pl.distanceTo(c.home) > 28) {
          c.state = 'perch';
          r.flying = false;
        }
      }
      if (r.root.visible) r.animate(dt, {});
    }
  }

  // ------------------------------------------------------------------ sapo
  setupFrog() {
    const g = this.game;
    const rig = CM.createFrog(true);
    const y = Math.max(g.world.groundHeight(FROG_SPOT.x, FROG_SPOT.z), WATER_LEVEL + 0.02);
    rig.root.position.set(FROG_SPOT.x, y, FROG_SPOT.z);
    rig.root.rotation.y = 0.8;
    g.scene.add(rig.root);
    // vitória-régia gigante embaixo
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16, 0.3, TAU - 0.6).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: '#4a7a3a' }));
    pad.position.set(FROG_SPOT.x, y - 0.01, FROG_SPOT.z);
    g.scene.add(pad);
    this.frog = { rig, pos: rig.root.position };
    g.interaction.add(
      new Interactable({
        kind: 'npc', name: 'Sapo Sorridente', subtitle: 'Usando Dentes Emprestados', level: 2, reaction: 'neutral', pos: rig.root.position, radius: 0.6,
        height: 0.8, range: 3.5, cursor: 'use', rig, enabled: () => !!rig.dentures?.visible, hint: 'Clique com o botão direito',
        onInteract: () => {
          if (!this.P.wants('dentadura')) {
            g.ui.bubble({ pos: rig.root.position, rig }, rng.pick(['Croac? (sorriso dourado)', 'CROAC. (ele sorri orgulhoso)', 'Croooac!']), 2.5);
            g.audio?.sfx('croak');
            return;
          }
          g.ui.bubble({ pos: rig.root.position, rig }, 'CROOOAC?! (ptui!)', 2.5);
          g.audio?.sfx('croak');
          rig.dentures.visible = false;
          g.fx?.sparkleBurst(rig.root.position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffd84a');
          this.P.progress('dentadura');
          this.P.setFlag('frogDone');
        },
      })
    );
  }

  // ------------------------------------------------------------------ ovo
  setupEgg() {
    const g = this.game;
    const rig = CM.createEgg();
    const y = g.world.groundHeight(EGG_SPOT.x, EGG_SPOT.z) + 0.1;
    rig.root.position.set(EGG_SPOT.x, y, EGG_SPOT.z);
    g.scene.add(rig.root);
    this.egg = { rig, pos: rig.root.position, hatching: 0 };
    g.interaction.add(
      new Interactable({
        kind: 'npc', name: 'Ovo do Capeta', subtitle: 'Quentinho', level: '??', reaction: 'neutral', pos: rig.root.position, radius: 0.7, height: 1.6,
        range: 3.5, cursor: 'use', rig, enabled: () => rig.root.visible, hint: 'Clique com o botão direito para sentar no ovo',
        onInteract: () => this.sitOnEgg(),
      })
    );
  }
  sitOnEgg() {
    const g = this.game;
    if (!this.P.flags.braziers) {
      g.ui.bubble({ pos: this.egg.pos, rig: this.egg.rig, yOff: 0.2 }, '(O ovo está frio. Ele precisa de um ninho bem quente.)', 3);
      return;
    }
    if (!this.P.wants('ovo')) {
      g.ui.error('Você não sabe o que fazer com isso... ainda.');
      return;
    }
    const e = this.egg.pos;
    g.player.seatAt(e.x, e.y + 1.45, e.z);
    g.ui.cast('Chocando o ovo', 5, {
      icon: 'egg',
      onDone: () => this.hatch(),
      onCancel: () => g.player.leaveSeat(),
    });
  }
  hatch() {
    const g = this.game, e = this.egg;
    g.player.leaveSeat(true);
    e.rig.cracks.visible = true;
    e.hatching = 0.001;
    g.audio?.sfx('crack');
  }
  updateEgg(dt) {
    const e = this.egg;
    if (!e.rig.root.visible) return;
    if (e.hatching > 0) {
      e.hatching += dt;
      e.rig.wobble = 4 + e.hatching * 4;
      if (e.hatching > 1.6) {
        const g = this.game;
        e.rig.root.visible = false;
        g.fx?.poof(e.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffb040', 2);
        g.fx?.shells(e.pos);
        g.audio?.sfx('hatch');
        this.P.setFlag('hatched');
        this.P.progress('ovo');
        this.pet.summon(e.pos.x + 1, e.pos.z + 1);
        this.pet.say('PIU! ...Mamãe?');
        g.ui.info('Belzebuzinho nasceu! Ele acha que você é a mãe dele.');
      }
    } else {
      e.rig.wobble = this.P.flags.braziers ? 1 : 0.25;
    }
    e.rig.animate(dt, {});
  }

  // ------------------------------------------------------------------ itens de missão
  setupPickups() {
    const g = this.game;
    const add = (key, model, x, z, opts) => this.pickups.push(new Pickup(g, key, model(), x, z, opts));
    for (const [lx, lz] of [[-8, 8], [9, 11], [-15, -3], [17, 5], [-4, -8], [7, -13], [-19, 12], [13, -4]]) {
      const [x, z] = cemToWorld(lx, lz);
      add('osso', CM.ITEM_MODELS.bone, x, z, { name: 'Osso do Juvenal', lift: 0.15 });
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3, r = 4 + (i % 3) * 3.2;
      add('brasa', CM.ITEM_MODELS.ember, VENTS.x + Math.cos(a) * r, VENTS.z + Math.sin(a) * r, { name: 'Brasa Infernal', lift: 0.25 });
    }
    const mush = [[-96, 30], [-104, 18], [-118, 30], [-110, 40], [-126, 22], [-92, 8], [-100, -2], [-132, 8], [-88, 32]];
    for (const [x, z] of mush) add('cogumelo', CM.ITEM_MODELS.mushroom, x, z, { name: 'Cogumelo Risonho', lift: 0.02 });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU, r = 6 + (i % 4) * 5;
      add('vagalume', CM.ITEM_MODELS.firefly, WOODS.x + Math.cos(a) * r, WOODS.z + Math.sin(a) * r, { name: 'Vaga-lume', nightOnly: true, wander: 1.6, sparkle: 0.8 });
    }
  }
  resetPickups(keys) {
    for (const p of this.pickups) if (keys.includes(p.key)) p.reset();
  }

  // ------------------------------------------------------------------ eventos e estado
  onEvent(type, q) {
    const g = this.game;
    if (type === 'accept') {
      this.resetPickups(q.objectives.map((o) => o.key));
      if (q.id === 'aboboras') this.resetPumpkins();
      if (q.id === 'gato') {
        this.cat.spot = 0;
        this.cat.state = 'wait';
        const s = CAT_SPOTS[0];
        this.cat.pos.set(s.x, 0, s.z);
      }
      if (q.id === 'carta') this.npcs.suspiro.rig.letter.visible = false;
    }
    if (type === 'abandon' && q.id === 'carta') this.npcs.suspiro.rig.letter.visible = true;
    if (type === 'turnin') {
      if (q.id === 'ossos') {
        this.npcs.juvenal.action = 'dance';
        setTimeout(() => (this.npcs.juvenal.action = null), 9000);
      }
      if (q.id === 'resposta') {
        this.npcs.suspiro.action = 'cheer';
        setTimeout(() => (this.npcs.suspiro.action = null), 6000);
      }
      if (q.id === 'brasas') g.ui.info('Os braseiros ao redor do ninho se acendem!');
      const flagMap = { gato: 'catHome', brasas: 'braziers', aboboras: 'mayorHappy' };
      if (flagMap[q.id]) this.P.setFlag(flagMap[q.id]);
      this.applyState();
    }
    if (type === 'progress' && q.q?.id === 'carta') this.applyState();
  }

  /** aplica ao mundo tudo que já aconteceu (também ao carregar o jogo) */
  applyState() {
    const P = this.P, N = this.npcs;
    N.juvenal.rig.setComplete(P.status('ossos') === 'done');
    N.conde.rig.fangs.visible = P.status('dentadura') === 'done';
    const tonLantern = N.tonico.rig.lanternGlow;
    tonLantern.material.color.set(P.status('vagalumes') === 'done' ? '#9dff7a' : '#1a1a14');
    if (P.status('vagalumes') === 'done') tonLantern.material.color.multiplyScalar(3);
    N.suspiro.rig.letter.visible = P.status('carta') === 'available' || P.status('carta') === 'unavailable';
    N.prefeito.rig.mood = P.status('aboboras') === 'done' ? 0 : 1;
    if (this.frog.rig.dentures) this.frog.rig.dentures.visible = !P.flags.frogDone;
    if (P.flags.hatched) this.egg.rig.root.visible = false;
    for (const b of this.game.populated.braziers) {
      b.lit = !!P.flags.braziers;
      b.mesh.material.color.set(b.lit ? '#ff7a2a' : '#2a1810');
      if (b.lit) b.mesh.material.color.multiplyScalar(3);
    }
    const door = this.game.populated.anchors.aranhildaDoor;
    if (door) this.catHome = { x: door.x + 1.4, z: door.z - 0.3, yaw: 0.6 };
    this.game.player.setHat?.(!!P.flags.hat);
    if (P.flags.hatched && P.flags.petOut !== false) this.pet.summon();
  }

  update(dt, t) {
    for (const n of this.npcList) n.update(dt);
    this.updateCat(dt);
    this.updatePumpkins(dt);
    this.updateCrows(dt);
    this.updateEgg(dt);
    for (const p of this.pickups) p.update(dt, t);
    this.pet.update(dt);
    if (this.frog.rig.root.visible) this.frog.rig.animate(dt, {});
  }
}

// ---------------------------------------------------------------------------
class Pet {
  constructor(game) {
    this.game = game;
    this.rig = CM.createChick();
    this.w = new Walker(game, this.rig, 0, 0, 0);
    this.active = false;
    this.rig.root.visible = false;
    this.barkT = 12;
  }
  say(t) {
    this.game.ui?.bubble({ pos: this.w.pos, rig: this.rig }, t, 2.5);
  }
  summon(x, z) {
    const p = this.game.player.pos;
    this.w.pos.set(x ?? p.x - 1.5, 0, z ?? p.z - 1.5);
    this.active = true;
    this.rig.root.visible = true;
    this.game.fx?.poof(this.w.pos, '#ff6a3a');
  }
  dismiss() {
    this.active = false;
    this.rig.root.visible = false;
    this.game.fx?.poof(this.w.pos, '#ff6a3a');
  }
  update(dt) {
    if (!this.active) return;
    const pl = this.game.player;
    const yaw = pl.yaw;
    const tx = pl.pos.x - Math.sin(yaw) * 1.8 + Math.cos(yaw) * 1.3;
    const tz = pl.pos.z - Math.cos(yaw) * 1.8 - Math.sin(yaw) * 1.3;
    const d = Math.hypot(tx - this.w.pos.x, tz - this.w.pos.z);
    if (d > 40) this.w.pos.set(tx, 0, tz);
    const sp = d > 6 ? pl.runSpeed * (pl.mounted ? 1.9 : 1.25) : d > 1.2 ? 3.5 : 0;
    this.w.moveToward(tx, tz, sp, dt, 0.6);
    if (d < 1.2) this.w.yaw = dampAngle(this.w.yaw, yaw, 2, dt);
    this.w.sync(dt);
    this.barkT -= dt;
    if (this.barkT < 0) {
      this.barkT = 25 + Math.random() * 30;
      this.say(['Piu!', 'PIU PIU!', '(soluço de fogo)', 'Mamãe, fome!', 'Piu? (morde seu sapato)'][Math.floor(Math.random() * 5)]);
    }
  }
}
