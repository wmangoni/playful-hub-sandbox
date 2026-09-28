import * as THREE from 'three';
import { Mob } from './mob.js';
import { MOB_TYPES, PLAYER_REACH, mobDmg, mobXp } from './mobTypes.js';
import { MOB_SPAWNS, ZONE_LEVELS, NPC_SPOTS, HOME_SPOT } from '../world/layout.js';
import { XP_TABLE } from '../quests/data.js';
import { RNG } from '../util/rng.js';
import { clamp, hashStr, TAU } from '../util/math.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const _h = new THREE.Vector3();

/** Atributos do Vicente por nível: vida, dano, crítico, velocidade do golpe e resistência crescem juntos. */
export function playerStats(lv) {
  return {
    maxHp: 80 + lv * 20,
    min: Math.round(6 + lv * 4.5),
    max: Math.round(10 + lv * 5.5),
    crit: 0.08 + lv * 0.02,
    swing: Math.round((1.05 - lv * 0.04) * 100) / 100,
    armor: Math.min(0.3, lv * 0.035),
  };
}

const DEATH_LINES = [
  'O vale ganhou mais um fantasminha... temporariamente.',
  'O Coveiro Tonico já está medindo você para uma cova. Por via das dúvidas.',
  'Não se preocupe: aqui em Tumbalacatumba, morrer é só um contratempo.',
  'Suas meias listradas vão sentir sua falta.',
];

export class Combat {
  constructor(game) {
    this.game = game;
    this.mobs = [];
    this.peaceful = game.params.has('peaceful');
    this.dead = false;
    this.autoAttack = false;
    this.swingCd = 0;
    this.swingT = -1;
    this.lastCombat = -99;
    this.engagedN = 0;
    this.stLevel = game.progress.level;
    this.st = playerStats(this.stLevel);
    this.hp = this.st.maxHp;
    // criaturas hostis, região por região
    for (const sp of MOB_SPAWNS) {
      const T = MOB_TYPES[sp.type];
      for (const pt of this.findSpots(sp)) this.mobs.push(new Mob(this, T, T.model(), { ...pt, levels: ZONE_LEVELS[sp.zone] }));
    }
    // os corvos do sítio e os sapos do pântano viram criaturas neutras
    const qw = game.questWorld;
    qw.crows = qw.crows.map((c) => this.adopt('corvo', c.rig, c.home, 'sitio'));
    game.life.frogs = game.life.frogs.map((f) => this.adopt('sapo', f.rig, f.rig.root.position.clone().setY(f.base), 'pantano'));
    game.progress.on((type, d) => type === 'levelup' && this.onLevelUp(d));
  }

  adopt(id, rig, home, zone) {
    const m = new Mob(this, MOB_TYPES[id], rig, { x: home.x, y: home.y, z: home.z, yaw: rig.root.rotation.y, levels: ZONE_LEVELS[zone] });
    this.mobs.push(m);
    return m;
  }

  /** sorteia pontos de nascimento em chão seco, longe de construções e dos PNJs */
  findSpots(sp) {
    const W = this.game.world, rng = new RNG(hashStr(sp.zone + sp.type));
    const out = [];
    const safe = sp.safe ?? 15;
    const npcs = Object.values(NPC_SPOTS);
    for (let i = 0; i < 1200 && out.length < sp.count; i++) {
      const a = rng.range(0, TAU), d = Math.sqrt(rng.next()) * sp.r;
      const x = sp.x + Math.cos(a) * d, z = sp.z + Math.sin(a) * d;
      if (sp.maxZ !== undefined && z > sp.maxZ) continue;
      if (W.groundHeight(x, z) < 0.3 || W.onDeck(x, z) || W.colliders.overlaps(x, z, 1.1)) continue;
      if (npcs.some((n) => Math.hypot(n.x - x, n.z - z) < safe)) continue;
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 5.5)) continue;
      const h = (ox, oz) => W.groundHeight(x + ox, z + oz);
      if (Math.abs(h(1, 0) - h(-1, 0)) + Math.abs(h(0, 1) - h(0, -1)) > 1.6) continue;
      out.push({ x, z, yaw: rng.range(0, TAU) });
    }
    return out;
  }

  get inCombat() {
    return this.engagedN > 0 || this.game.time - this.lastCombat < 5;
  }

  /** a criatura selecionada (se for uma) */
  get target() {
    const t = this.game.interaction.target;
    return t?.kind === 'mob' && t.mob.targetable ? t.mob : null;
  }

  inReach(m, extra = 0) {
    const p = this.game.player.pos;
    return Math.hypot(m.pos.x - p.x, m.pos.z - p.z) <= PLAYER_REACH + m.radius + extra && Math.abs(m.pos.y - p.y) < 3;
  }

  headOf(m, jitter = 0.35) {
    const h = (m.rig.height ?? 1) * m.rig.root.scale.y;
    return _h.set(m.pos.x + (Math.random() - 0.5) * jitter, m.pos.y + h + 0.25, m.pos.z + (Math.random() - 0.5) * jitter).clone();
  }

  // ------------------------------------------------------------ o golpe do Vicente
  /** clique direito numa criatura: seleciona e liga o ataque automático */
  engage(mob) {
    if (this.dead) return;
    this.autoAttack = true;
    if (this.inReach(mob) && this.swingT < 0 && this.swingCd <= 0) this.swing();
  }

  /** tecla 7 (Lanternada) */
  manualAttack() {
    const g = this.game;
    if (this.dead) {
      g.ui.error('Você está morto.');
      return false;
    }
    let t = this.target;
    if (!t) {
      // sem alvo: pega a criatura mais próxima à frente
      const p = g.player, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      let best = null, bd = Infinity;
      for (const m of this.mobs) {
        if (!m.targetable || !this.inReach(m, 1.5)) continue;
        const dx = m.pos.x - p.pos.x, dz = m.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.1 && (dx * fx + dz * fz) / d < 0.3) continue;
        if (d < bd) {
          bd = d;
          best = m;
        }
      }
      if (best) {
        g.interaction.setTarget(best.inter);
        t = best;
      }
    }
    if (t) {
      this.autoAttack = true;
      if (!this.inReach(t)) {
        g.ui.error('Fora de alcance.');
        return false;
      }
    }
    if (this.swingT >= 0 || this.swingCd > 0) return true; // já está batendo: o próximo sai sozinho
    return this.swing();
  }

  swing() {
    const g = this.game, p = g.player;
    if (this.dead || this.swingT >= 0 || this.swingCd > 0) return false;
    if (p.mounted) {
      p.setMounted(false);
      g.fx.poof(p.pos, '#8a6aff');
      g.audio?.sfx('mount');
    }
    if (p.seat) p.leaveSeat(false);
    p.sitting = false;
    if (g.ui.casting) g.ui.cancelCast('Interrompido');
    // vira para o alvo (segurando o botão direito, quem manda é a câmera)
    const t = this.target;
    if (t && !g.input.right && this.inReach(t, 1.5)) p.yaw = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    p.setAction('attack', 0.56);
    this.swingT = 0;
    this.swingHit = false;
    this.swooshed = false;
    this.swingCd = this.st.swing;
    const slot = g.ui.slots.find((s) => s.id === 'attack');
    if (slot) {
      slot.cd = this.st.swing;
      slot.cdLeft = this.st.swing;
    }
    g.audio?.sfx('swing');
    return true;
  }

  updateSwing(dt) {
    const g = this.game, p = g.player;
    this.swingCd = Math.max(0, this.swingCd - dt);
    if (this.swingT >= 0) {
      if (p.hitStop <= 0) this.swingT += dt;
      if (!this.swooshed && this.swingT >= 0.13) {
        this.swooshed = true;
        g.fx.swoosh(p, g.progress.status('vagalumes') === 'done' ? '#b8ff8a' : '#ffc070');
      }
      if (!this.swingHit && this.swingT >= 0.21) {
        this.swingHit = true;
        this.resolveSwing();
      }
      if (this.swingT >= 0.5 || p.action !== 'attack') this.swingT = -1;
    }
    // ataque automático (como no WoW): segue batendo enquanto o alvo estiver ao alcance
    if (this.autoAttack) {
      const t = this.target;
      if (!t || this.dead || p.mounted) this.autoAttack = false;
      else if (this.swingT < 0 && this.swingCd <= 0 && this.inReach(t) && !g.ui.casting && !p.seat) this.swing();
    }
  }

  /** quem está no arco da Lanternada leva: o alvo inteiro, os vizinhos 60% (até 3) */
  resolveSwing() {
    const g = this.game, p = g.player, st = this.st, lv = g.progress.level;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    const tgt = this.target;
    const hits = [];
    for (const m of this.mobs) {
      if (!m.targetable) continue;
      const dx = m.pos.x - p.pos.x, dz = m.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > PLAYER_REACH + m.radius) continue;
      const dy = m.pos.y - p.pos.y;
      if (dy < -1.2 || dy > 2.8) continue;
      const c = d > 0.05 ? (dx * fx + dz * fz) / d : 1;
      if (c < (m === tgt ? -0.1 : 0.34)) continue;
      hits.push({ m, d: m === tgt ? -1 : d });
    }
    hits.sort((a, b) => a.d - b.d);
    let any = false, crit = false;
    hits.slice(0, 3).forEach(({ m }, i) => {
      const diff = lv - m.level;
      const at = this.headOf(m);
      if (Math.random() < clamp(0.04 - 0.05 * diff, 0.02, 0.3)) {
        g.ui.floaty('Errou', 'miss', at);
        return;
      }
      let dmg = (st.min + Math.random() * (st.max - st.min)) * clamp(1 + 0.1 * diff, 0.6, 1.4) * (i === 0 ? 1 : 0.6);
      const isCrit = Math.random() < st.crit;
      if (isCrit) dmg *= 1.75;
      dmg = Math.max(1, Math.round(dmg));
      if (!m.takeDamage(dmg, p.pos)) {
        g.ui.floaty('Evadiu', 'miss', at);
        return;
      }
      g.ui.floaty(isCrit ? `${dmg}!` : String(dmg), isCrit ? 'crit' : 'dmg', at);
      g.fx.hitSpark(_h.set((m.pos.x + p.pos.x) / 2 + (m.pos.x - p.pos.x) * 0.25, Math.max(p.pos.y + 1.0, m.pos.y + 0.3), (m.pos.z + p.pos.z) / 2 + (m.pos.z - p.pos.z) * 0.25), isCrit ? '#ffe070' : '#fff0c8', isCrit ? 16 : 10);
      any = true;
      crit ||= isCrit;
    });
    if (any) {
      this.lastCombat = g.time;
      p.hitStop = crit ? 0.09 : 0.055;
      p.rig.land(crit ? 0.35 : 0.2);
      g.cam.shake = Math.max(g.cam.shake, crit ? 0.3 : 0.16);
      g.audio?.sfx(crit ? 'crit' : 'hit');
    }
  }

  // ------------------------------------------------------------ o Vicente apanhando
  hitPlayer(m) {
    const g = this.game, p = g.player, lv = g.progress.level;
    if (this.dead || this.peaceful) return;
    this.lastCombat = g.time;
    const at = _h.set(p.pos.x + (Math.random() - 0.5) * 0.5, p.pos.y + 2.1, p.pos.z).clone();
    if (Math.random() < clamp(0.05 + 0.01 * (lv - m.level), 0.02, 0.12)) {
      g.ui.floaty('Esquivou', 'miss', at);
      g.audio?.sfx('whiff');
      return;
    }
    let dmg = mobDmg(m.level) * m.type.dmg * (0.85 + Math.random() * 0.3) * clamp(1 + 0.12 * (m.level - lv), 0.6, 1.6) * (1 - this.st.armor);
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;
    g.ui.floaty(`-${dmg}`, 'hurt', at);
    p.rig.flash = 0.4;
    if (p.action !== 'attack') p.setAction('hurt', 0.32);
    g.cam.shake = Math.max(g.cam.shake, 0.22);
    g.audio?.sfx('hurt');
    g.fx.hitSpark(_h.set(p.pos.x, p.pos.y + 1.1, p.pos.z), '#ff7a5a', 7, 0.55);
    if (m.type.splash) g.fx.splashBurst(p.pos, 10);
    if (g.ui.casting) g.ui.cancelCast('Interrompido');
    if (p.sitting && !p.seat) p.sitting = false;
    if (this.hp <= 0) this.die(m);
  }

  heal(n) {
    if (this.dead) return;
    const before = this.hp;
    this.hp = Math.min(this.st.maxHp, this.hp + n);
    const got = Math.round(this.hp - before);
    if (got > 0) this.game.ui.floaty(`+${got}`, 'heal', _h.set(this.game.player.pos.x, this.game.player.pos.y + 2.1, this.game.player.pos.z).clone());
  }

  die(killer) {
    const g = this.game, p = g.player;
    this.hp = 0;
    this.dead = true;
    this.autoAttack = false;
    this.swingT = -1;
    if (p.seat) p.leaveSeat(false);
    p.setMounted(false);
    p.sitting = false;
    p.autorun = false;
    p.dead = true;
    p.frozen = true;
    p.setAction('die');
    if (g.ui.casting) g.ui.cancelCast('Interrompido');
    for (const m of this.mobs) if (m.engaged) m.evade();
    g.interaction.setTarget(null);
    g.audio?.sfx('death');
    g.ui.chat(`${killer.type.name} derrotou você.`, 'system');
    g.ui.combatHud.showDeath(killer.type.name, pick(DEATH_LINES));
  }

  /** "Voltar à Praça": renasce na pedra de retorno com parte da vida */
  release() {
    if (!this.dead || this._releasing) return;
    const g = this.game, p = g.player;
    this._releasing = true;
    g.ui.combatHud.hideDeath();
    g.fade(0.3, () => {
      p.teleport(HOME_SPOT.x, HOME_SPOT.z, HOME_SPOT.yaw);
      g.cam.snapBehind(p);
      this.dead = false;
      this._releasing = false;
      p.dead = false;
      p.frozen = false;
      p.action = null;
      p.courage = 100;
      this.hp = Math.round(this.st.maxHp * 0.6);
      g.fx.hearthFx(p.pos);
      g.audio?.sfx('hearth');
      const pet = g.questWorld.pet;
      if (pet.active) pet.summon(p.pos.x - 1.5, p.pos.z + 1.5);
      g.ui.info('Você voltou do além. Com 60% da vida e 100% da vergonha.');
    });
  }

  // ------------------------------------------------------------ eventos das criaturas
  onAggro(m, quiet) {
    const g = this.game, T = m.type;
    // bicho que anda em bando chama os vizinhos
    if (T.social && !quiet) {
      for (const o of this.mobs) if (o !== m && o.type === T && o.state === 'idle' && o.pos.distanceTo(m.pos) < T.social) o.aggro(false, true);
    }
    if (!quiet && !this.peaceful && !g.progress.flags.tipCombat) {
      g.progress.setFlag('tipCombat');
      g.ui.info('Uma criatura quer briga! Aperte 7 ou clique nela com o botão direito.');
      g.ui.chat('Dica: clique com o botão direito numa criatura (ou aperte 7) para dar uma Lanternada. O "Buu!" (1) faz os inimigos fugirem de medo por alguns segundos.', 'system');
    }
  }

  onMobKilled(m) {
    const g = this.game, P = g.progress, T = m.type;
    this.lastCombat = g.time;
    g.audio?.sfx(T.sfx.die, 0.8);
    g.audio?.sfx('mobDie', 0.7);
    if (T.shatter) g.fx.bones(m.pos);
    else if (T.splash) g.fx.splashBurst(m.pos, 22);
    else g.fx.sparkleBurst(m.pos, '#fff0c0', 8);
    if (T.barks.die && Math.random() < 0.45) m.say(pick(T.barks.die));
    const xp = this.xpFor(m);
    if (xp > 0) P.addXP(xp);
    const coins = Math.round(m.level * (6 + Math.random() * 14) * (T.xp ?? 1));
    if (coins > 0) P.addMoney(coins);
    if (T.drop && Math.random() < T.drop.chance) P.addItem(T.drop.id, 1);
    if (g.interaction.target === m.inter) this.autoAttack = false;
  }

  xpFor(m) {
    const P = this.game.progress;
    if (P.level >= XP_TABLE.length - 1) return 0;
    const diff = m.level - P.level;
    if (diff <= -3) return 0; // criatura "cinza": fraca demais para ensinar alguma coisa
    return Math.round(mobXp(m.level) * (m.type.xp ?? 1) * clamp(1 + diff * 0.15, 0.4, 1.5));
  }

  onLevelUp(lv) {
    const g = this.game;
    this.stLevel = lv;
    this.st = playerStats(lv);
    this.hp = this.st.maxHp;
    const s = this.st;
    // depois do "Parabéns" da interface (que ouve o mesmo evento)
    queueMicrotask(() => g.ui?.chat(`Você ficou mais forte! Vida ${s.maxHp} · Lanternada ${s.min}–${s.max} de dano · Crítico ${Math.round(s.crit * 100)}% · Golpe a cada ${s.swing.toFixed(2).replace('.', ',')} s`, 'system'));
  }

  /** "Buu!": criaturas por perto fogem de medo (os corvos são espantados à parte, pela missão) */
  fearAround(pos, r = 8, t = 2.5) {
    let n = 0;
    for (const m of this.mobs) {
      if (m.type.move === 'perch' || m.pos.distanceTo(pos) > r) continue;
      if (m.fear(t)) {
        n++;
        this.game.ui.floaty('Apavorado!', 'fear', this.headOf(m));
      }
    }
    return n;
  }

  /** empurra criaturas que se amontoam em volta do jogador */
  separate() {
    const E = this.mobs.filter((m) => m.engaged && m.type.move !== 'perch');
    for (let i = 0; i < E.length; i++) {
      for (let j = i + 1; j < E.length; j++) {
        const a = E[i], b = E[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = (a.radius + b.radius) * 1.15;
        if (d >= min || d < 1e-4) continue;
        const k = ((min - d) * 0.5) / d;
        a.stepTo(a.pos.x - dx * k, a.pos.z - dz * k);
        b.stepTo(b.pos.x + dx * k, b.pos.z + dz * k);
      }
    }
  }

  update(dt) {
    const g = this.game, p = g.player, P = g.progress;
    if (P.level !== this.stLevel) {
      // carregou um jogo salvo: atributos do nível salvo, vida cheia
      this.stLevel = P.level;
      this.st = playerStats(P.level);
      this.hp = this.st.maxHp;
    }
    const ctx = { alive: !this.dead, level: P.level, peaceful: this.peaceful || g.state !== 'play' };
    let n = 0;
    for (const m of this.mobs) {
      m.update(dt, p.pos, ctx);
      if (m.engaged) n++;
    }
    this.engagedN = n;
    if (n > 1) this.separate();
    this.updateSwing(dt);
    // fora de combate a vida volta sozinha (sentado volta bem mais rápido)
    if (!this.dead && !this.inCombat && this.hp < this.st.maxHp) this.hp = Math.min(this.st.maxHp, this.hp + this.st.maxHp * (p.sitting ? 0.1 : 0.03) * dt);
  }
}
