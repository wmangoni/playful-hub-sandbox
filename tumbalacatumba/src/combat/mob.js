import * as THREE from 'three';
import { Interactable } from '../quests/interact.js';
import { clamp, damp, dampAngle, wrapAngle, TAU } from '../util/math.js';
import { WATER_LEVEL } from '../world/layout.js';
import { LAYER_FX } from '../render/postfx.js';
import { mobHp, PLAYER_REACH } from './mobTypes.js';

const LEASH = 34; // distância máxima de casa antes de desistir e voltar
const ANNOY = 0.15; // chance de um neutro atacar só por se sentir incomodado
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const bell = (u, a, b) => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));
const _look = new THREE.Vector3();

/**
 * Criatura com IA simples no estilo WoW.
 * Estados: idle (passeia/pousa) → chase (persegue) ⇄ attack (bote) → return (desiste, volta e se cura);
 * dead (tomba) → gone (some até renascer). Corvos também têm flee (espantados pelo "Buu!").
 */
export class Mob {
  constructor(combat, type, rig, spawn) {
    const g = (this.game = combat.game);
    this.combat = combat;
    this.type = type;
    this.rig = rig;
    this.spawn = spawn;
    this.home = new THREE.Vector3(spawn.x, spawn.y ?? g.world.groundHeight(spawn.x, spawn.z), spawn.z);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.radius = type.radius;
    this.baseScale = type.scale ?? rig.root.scale.x;
    rig.root.rotation.order = 'YXZ';
    if (!rig.root.parent) g.scene.add(rig.root);
    // olhos e chamas (material próprio) ficam fora do contorno; guarda quais peças projetam sombra (usado pelo LOD)
    for (const m of rig.meshes) {
      m.userData.fx = m.material !== rig.material;
      m.userData.cast = m.castShadow && !m.userData.fx;
    }
    this.lod = -1;
    this.inter = g.interaction.add(
      new Interactable({
        kind: 'mob', mob: this, name: type.name, subtitle: '', family: type.family, level: 1,
        reaction: type.neutral ? 'neutral' : 'hostile', pos: this.pos, radius: Math.max(0.45, type.radius), height: rig.height ?? 1,
        range: PLAYER_REACH + type.radius, cursor: 'attack', rig, ringGround: true, portrait: type.model,
        enabled: () => this.targetable, hint: 'Clique com o botão direito para atacar',
        onInteract: () => combat.engage(this),
      })
    );
    this.revive();
  }

  get alive() {
    return this.state !== 'dead' && this.state !== 'gone';
  }
  get engaged() {
    return this.state === 'chase' || this.state === 'attack';
  }
  get targetable() {
    return this.alive && this.state !== 'flee' && this.rig.root.visible;
  }

  revive() {
    const T = this.type, [a, b] = this.spawn.levels;
    this.level = a + Math.floor(Math.random() * (b - a + 1));
    this.inter.level = this.level;
    this.maxHp = Math.round(mobHp(this.level) * T.hp);
    this.hp = this.maxHp;
    this.pos.copy(this.home);
    this.yaw = this.spawn.yaw ?? Math.random() * TAU;
    this.state = 'idle';
    this.st = 0;
    this.speed = 0;
    this.atk = -1;
    this.atkCd = 0;
    this.hurt = 0;
    this.fearT = 0;
    this.vy = 0;
    this.hop = 0;
    this.hopY = 0;
    this.hopT = rnd(1, 6);
    this.barkT = rnd(8, 20);
    this.wanderT = rnd(1, 6);
    this.goal = null;
    this.rolled = false;
    this.deadLift = 0;
    const r = this.rig;
    r.flying = false;
    r.lookTarget = null;
    r.root.scale.setScalar(this.baseScale * (1 + (this.level - a) * 0.08));
    r.root.rotation.set(0, this.yaw, 0);
    r.root.visible = true;
  }

  aggroRange(pl) {
    return clamp(this.type.aggro - (pl - this.level) * 0.8, 3, 11);
  }

  say(text, dur = 2.4) {
    this.game.ui?.bubble({ pos: this.pos, rig: this.rig, yOff: 0.55 }, text, dur);
  }

  // ------------------------------------------------------------ transições
  aggro(annoyed = false, quiet = false) {
    if (!this.alive || this.engaged || this.state === 'flee') return;
    const T = this.type;
    this.state = 'chase';
    this.st = 0;
    this.blockedT = 0;
    this.goal = null;
    this.hop = this.hopY = 0;
    if (T.move === 'perch') this.rig.flying = true;
    const lines = annoyed ? T.barks.annoyed : T.barks.aggro;
    if (!quiet && lines && Math.random() < (annoyed ? 1 : 0.55)) this.say(pick(lines));
    if (!quiet) this.game.audio?.sfx(T.sfx.aggro, 0.7);
    this.combat.onAggro(this, quiet);
  }

  evade() {
    if (!this.alive || this.state === 'return') return;
    this.state = 'return';
    this.st = 0;
    this.atk = -1;
    this.fearT = 0;
    this.goal = null;
  }

  fear(t) {
    if (!this.alive || this.state === 'return' || this.state === 'flee') return false;
    this.fearT = t;
    this.atk = -1;
    if (this.state === 'attack') this.state = 'chase';
    if (this.state === 'idle' && !this.type.neutral) this.aggro(false, true);
    return true;
  }

  /** corvos: o "Buu!" faz sair voando (conta para a missão do espantalho) */
  scare(from) {
    if (!this.alive || this.state === 'flee') return false;
    this.state = 'flee';
    this.st = 0;
    this.atk = -1;
    const d = this.pos.clone().sub(from);
    d.y = 0;
    if (d.lengthSq() < 1e-4) d.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    d.normalize();
    this.vel.set(d.x * 7, 5, d.z * 7);
    this.yaw = Math.atan2(d.x, d.z);
    this.rig.flying = true;
    this.game.audio?.sfx('caw');
    this.say(pick(['CRÁ!', 'Crá crá!', 'CRÁÁÁ!']), 1.6);
    return true;
  }

  /** leva dano; devolve false se não pegou (voltando pra casa = "Evadiu") */
  takeDamage(n, from) {
    if (!this.alive) return false;
    if (this.state === 'return') return false;
    this.hp -= n;
    this.hurt = 1;
    this.rig.flash = 0.8;
    this.rig.land(0.45);
    // empurrãozinho para trás
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    if (this.type.move !== 'perch' || this.rig.flying) this.stepTo(this.pos.x + (dx / d) * 0.3, this.pos.z + (dz / d) * 0.3);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    } else if (!this.engaged) this.aggro();
    return true;
  }

  die() {
    this.state = 'dead';
    this.st = 0;
    this.atk = -1;
    this.speed = 0;
    this.vy = 0;
    this.fearT = 0;
    this.goal = null;
    this.hopY = 0;
    this.rig.flying = false;
    this.rig.lookTarget = null;
    this.combat.onMobKilled(this);
  }

  // ------------------------------------------------------------ movimento
  face(yaw, dt, k = 10) {
    this.yaw = dampAngle(this.yaw, yaw, k, dt);
  }

  stepTo(nx, nz) {
    const T = this.type, W = this.game.world;
    const ox = this.pos.x, oz = this.pos.z;
    if (T.move === 'ground') {
      const [x, z] = W.moveCircle(this.pos, nx, nz, this.radius);
      this.pos.x = x;
      this.pos.z = z;
    } else if (T.move === 'water') {
      const [x, z] = W.colliders.resolve(nx, nz, this.radius, this.pos.y);
      this.pos.x = x;
      this.pos.z = z;
    } else {
      this.pos.x = nx;
      this.pos.z = nz;
    }
    this.lastStep = Math.hypot(this.pos.x - ox, this.pos.z - oz);
  }

  moveToward(tx, tz, speed, dt, stop = 0.3) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < stop) {
      this.speed = damp(this.speed, 0, 10, dt);
      this.lastStep = 0;
      return true;
    }
    this.speed = damp(this.speed, speed, 6, dt);
    this.face(Math.atan2(dx, dz), dt, 9);
    const step = Math.min(d - stop * 0.5, this.speed * dt);
    this.stepTo(this.pos.x + (dx / d) * step, this.pos.z + (dz / d) * step);
    return false;
  }

  runFrom(dt, dx, dz, d) {
    const k = d > 0.01 ? 4 / d : 0;
    this.moveToward(this.pos.x - dx * k, this.pos.z - dz * k, this.type.run * 0.8, dt, 0.2);
  }

  vertOk() {
    const py = this.game.player.pos.y;
    return this.type.move === 'fly' || this.type.move === 'perch' ? Math.abs(py + 1.1 - this.pos.y) < 2.4 : Math.abs(py - this.pos.y) < 1.8;
  }

  // ------------------------------------------------------------ comportamento
  update(dt, pl, P) {
    const T = this.type, g = this.game, r = this.rig;
    this.st += dt;
    if (this.state === 'gone') {
      r.root.visible = false;
      if (this.st > T.respawn && Math.hypot(pl.x - this.home.x, pl.z - this.home.z) > 30) this.revive();
      return;
    }
    const dx = pl.x - this.pos.x, dz = pl.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    // longe de tudo: nem pensa
    if (this.state === 'idle' && d > 95) {
      r.root.visible = false;
      return;
    }
    this.atkCd -= dt;
    this.hurt = Math.max(0, this.hurt - dt * 4);
    if (this.fearT > 0) this.fearT -= dt;
    switch (this.state) {
      case 'idle': this.idle(dt, d, dx, dz, P); break;
      case 'chase': this.chase(dt, d, dx, dz, P); break;
      case 'attack': this.attackTick(dt, d, dx, dz, P); break;
      case 'return': this.goHome(dt); break;
      case 'flee': this.fleeTick(dt); break;
      case 'dead': this.deadTick(dt); break;
      default: break;
    }
    if (this.state === 'gone') return;
    this.updateY(dt);
    const camD = g.camera.position.distanceTo(this.pos);
    // celular (lod < 1): tudo mais perto, e a visibilidade conta o mais perto entre câmera e jogador (com a câmera
    // afastada, a criatura à frente dele não some nem deixa de ser mirável, já que targetable exige o rig visível)
    const k = g.quality.lod ?? 1;
    r.root.visible = (k < 1 ? Math.min(camD, d) : camD) < 80 * k || this.engaged;
    if (!r.root.visible) return;
    // LOD: sombra só perto da câmera; de longe, sem o passe de contorno (1 draw call por peça)
    const lod = camD < 22 * k ? 0 : camD < 36 * k ? 1 : 2;
    if (lod !== this.lod) {
      this.lod = lod;
      for (const m of r.meshes) {
        m.castShadow = lod === 0 && m.userData.cast;
        m.layers.set(lod === 2 || m.userData.fx ? LAYER_FX : 0);
      }
    }
    r.lookTarget = T.humanoid && this.engaged ? _look.set(pl.x, pl.y + 1.5, pl.z) : null;
    r.root.position.set(this.pos.x, this.pos.y + this.hopY + this.deadLift, this.pos.z);
    r.root.rotation.y = this.yaw;
    r.animate(dt, { speed: this.speed, atk: this.atk, hurt: this.hurt, dead: this.state === 'dead' ? this.st : -1, reach: this.tongue });
  }

  idle(dt, d, dx, dz, P) {
    const T = this.type;
    if (P.alive && !P.peaceful) {
      if (T.neutral) {
        // chegou perto: 15% de chance de ficar incomodado (sorteia uma vez por aproximação)
        if (d < T.notice) {
          if (!this.rolled) {
            this.rolled = true;
            if (Math.random() < ANNOY) return this.aggro(true);
          }
        } else if (d > T.notice + 4) this.rolled = false;
      } else if (d < this.aggroRange(P.level) && this.vertOk()) return this.aggro();
    }
    if (this.fearT > 0) {
      this.hop = this.hopY = 0;
      this.runFrom(dt, dx, dz, d);
      if (this.fearT <= dt) this.evade();
      return;
    }
    if (T.move === 'perch') return this.perchIdle(dt, d);
    if (T.move === 'water') return this.frogIdle(dt, d);
    // passeia perto de casa
    this.wanderT -= dt;
    if (!this.goal && this.wanderT <= 0) {
      const W = this.game.world;
      for (let i = 0; i < 6 && !this.goal; i++) {
        const a = Math.random() * TAU, rr = rnd(1.5, T.move === 'fly' ? 3.5 : 4.5);
        const x = this.home.x + Math.cos(a) * rr, z = this.home.z + Math.sin(a) * rr;
        if (T.move === 'fly' || (W.groundHeight(x, z) > 0.15 && !W.colliders.overlaps(x, z, this.radius))) this.goal = { x, z, t: 0 };
      }
      if (!this.goal) this.wanderT = rnd(2, 4);
    }
    if (this.goal) {
      this.goal.t += dt;
      if (this.moveToward(this.goal.x, this.goal.z, T.speed, dt, 0.35) || this.goal.t > 8) {
        this.goal = null;
        this.wanderT = rnd(3, 8);
      }
    } else this.speed = damp(this.speed, 0, 8, dt);
  }

  perchIdle(dt, d) {
    this.pos.copy(this.home);
    this.speed = 0;
    this.rig.flying = false;
    this.barkT -= dt;
    if (this.barkT < 0) {
      this.barkT = rnd(8, 20);
      if (d < 25) this.say(pick(['Crá crá!', 'Crá! (risada de corvo)', 'Olha o espantalho, crá crá!']), 2);
    }
  }

  frogIdle(dt, d) {
    this.speed = 0;
    this.hopT -= dt;
    if (this.hopT < 0) {
      this.hopT = rnd(3, 9);
      this.hop = 0.001;
      if (d < 18) this.say(pick(['Croac.', 'Croac croac!', '(coaxar melancólico)', 'Croooac...']), 2);
    }
    if (this.hop > 0) {
      this.hop += dt * 2.2;
      this.hopY = Math.sin(Math.min(1, this.hop) * Math.PI) * 0.45;
      if (this.hop >= 1) this.hop = this.hopY = 0;
    }
  }

  chase(dt, d, dx, dz, P) {
    const T = this.type;
    if (!P.alive || P.peaceful) return this.evade();
    if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > LEASH) return this.evade();
    if (this.fearT > 0) return this.runFrom(dt, dx, dz, d);
    const pl = this.game.player.pos;
    if (d > T.reach * 0.8) {
      this.moveToward(pl.x, pl.z, T.run, dt, T.reach * 0.7);
      // travado (cerca, água funda, barranco) por muito tempo: desiste
      if (this.lastStep < T.run * dt * 0.25) this.blockedT += dt;
      else this.blockedT = Math.max(0, this.blockedT - dt);
      if (this.blockedT > 3) return this.evade();
    } else this.speed = damp(this.speed, 0, 10, dt);
    const ang = Math.atan2(dx, dz);
    this.face(ang, dt, 10);
    if (d <= T.reach && this.atkCd <= 0 && Math.abs(wrapAngle(ang - this.yaw)) < 0.7 && this.vertOk()) {
      this.state = 'attack';
      this.atk = 0;
      this.hitDone = false;
    }
  }

  attackTick(dt, d, dx, dz, P) {
    const T = this.type;
    this.speed = damp(this.speed, 0, 12, dt);
    if (this.atk < T.atk.hit) this.face(Math.atan2(dx, dz), dt, 12);
    this.atk += dt / T.atk.dur;
    this.tongue = Math.max(0.3, d - 0.45);
    if (!this.hitDone && this.atk >= T.atk.hit) {
      this.hitDone = true;
      if (P.alive && !P.peaceful && d <= T.reach * 1.35 && this.vertOk()) this.combat.hitPlayer(this);
      else this.game.audio?.sfx('whiff', 0.6);
    }
    if (this.atk >= 1) {
      this.atk = -1;
      this.state = 'chase';
      this.atkCd = T.atk.cd * rnd(0.85, 1.2);
    }
  }

  goHome(dt) {
    const T = this.type;
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.5 * dt);
    if (this.moveToward(this.home.x, this.home.z, T.run * 1.1, dt, 0.4) || this.st > 12) {
      this.pos.x = this.home.x;
      this.pos.z = this.home.z;
      this.state = 'idle';
      this.st = 0;
      this.hp = this.maxHp;
      this.speed = 0;
      this.rolled = true;
      this.wanderT = rnd(2, 5);
      if (T.move === 'perch') this.pos.copy(this.home);
    }
  }

  fleeTick(dt) {
    this.vel.y += dt * 1.5;
    this.pos.addScaledVector(this.vel, dt);
    this.speed = 0;
    if (this.st > 3.5) {
      this.state = 'gone';
      this.st = 0;
      this.rig.root.visible = false;
    }
  }

  deadTick(dt) {
    const T = this.type, r = this.rig;
    if (T.shatter) {
      this.state = 'gone';
      this.st = 0;
      r.root.visible = false;
      return;
    }
    r.root.rotation.z = damp(r.root.rotation.z, T.deathRoll ?? 0, 9, dt);
    r.root.rotation.x = damp(r.root.rotation.x, T.deathPitch ?? 0, 7, dt);
    const tgt = Math.abs(T.deathRoll || T.deathPitch || 1);
    const cur = Math.abs(T.deathRoll ? r.root.rotation.z : r.root.rotation.x);
    this.deadLift = (T.lift ?? 0) * clamp(cur / tgt, 0, 1) * r.root.scale.y;
    // depois de um tempinho afunda no chão e some numa fumacinha
    if (this.st > 2.6) {
      const k = clamp((this.st - 2.6) / 0.5, 0, 1);
      this.deadLift -= k * 0.5;
      r.root.scale.setScalar(this.baseScale * Math.max(0.05, 1 - k * 0.8));
      if (k >= 1) {
        this.game.fx?.poof(this.pos, T.color, 0.6);
        this.state = 'gone';
        this.st = 0;
        r.root.visible = false;
      }
    }
  }

  updateY(dt) {
    const T = this.type, W = this.game.world;
    if (this.state === 'flee') return;
    const gy = W.groundHeight(this.pos.x, this.pos.z);
    const floor = T.move === 'water' ? Math.max(gy, WATER_LEVEL) + 0.02 : gy;
    if (this.state === 'dead') {
      if (this.pos.y > floor + 0.01) {
        this.vy -= 22 * dt;
        this.pos.y = Math.max(floor, this.pos.y + this.vy * dt);
      } else this.pos.y = floor;
      return;
    }
    if (T.move === 'fly' || (T.move === 'perch' && this.rig.flying)) {
      let ty = gy + T.flyH + Math.sin(this.game.time * 2 + this.home.x) * 0.15;
      if (this.state === 'attack') ty -= T.dive * bell(this.atk, 0.3, 0.9);
      // corvo voltando: desce até o poleiro
      if (T.move === 'perch' && this.state === 'return' && Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) < 2.5) ty = this.home.y;
      this.pos.y = damp(this.pos.y, ty, this.state === 'attack' ? 9 : 4, dt);
    } else if (T.move === 'perch') this.pos.y = this.home.y;
    else this.pos.y = floor;
  }
}
