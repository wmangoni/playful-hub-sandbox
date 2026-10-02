// Interior da Mansão Dentúcio: construção, entrada/saída pela porta, física dos andares e clima de dentro.
import * as THREE from 'three';
import { SHARED, updateGlows } from '../../render/toon.js';
import { Halos } from '../../fx/lights.js';
import { Interactable } from '../../quests/interact.js';
import { clamp, damp, lerp } from '../../util/math.js';
import { MANOR } from '../layout.js';
import { IKit } from './kit.js';
import { makeInteriorTextures, TEX_TILE } from './textures.js';
import { makeInteriorMaterials } from './materials.js';
import { Architecture, rampY } from './architecture.js';
import { Decor } from './decor.js';
import { paintPlan } from './plan-map.js';
import { INTERIOR, BOUNDS, LV, ROOMS, ROOM, ENTRY, FRONT_DOOR, WALL_T, atticRoofY } from './plan.js';

const STEP = 0.6; // degrau máximo que o pé sobe sozinho
const LEVEL_ORDER = ['B', 'G', 'U', 'A'];
// clima de cada andar: luz-chave, céu/chão da luz ambiente, neblina, exposição
const MOOD = {
  B: { key: '#b8d0b0', ki: 0.85, hs: '#7a8a9a', hg: '#22222c', hi: 1.45, fog: '#10141a', fd: 0.026, exp: 1.26, st: '#1e3a3a', sat: 0.98 },
  G: { key: '#ffcf9a', ki: 1.05, hs: '#a08aa0', hg: '#2e1e28', hi: 1.3, fog: '#1a1220', fd: 0.014, exp: 1.12, st: '#3a2440', sat: 1.08 },
  U: { key: '#ffc890', ki: 1.0, hs: '#9a88a0', hg: '#2e1c24', hi: 1.3, fog: '#1a1018', fd: 0.016, exp: 1.14, st: '#40203a', sat: 1.08 },
  A: { key: '#f0d0a8', ki: 1.05, hs: '#8a8098', hg: '#2a2020', hi: 1.45, fog: '#1c1612', fd: 0.02, exp: 1.2, st: '#3a2a2a', sat: 1.02 },
};
// queda das luzes do LightPool dentro da mansão (ver LightPool.decay)
const INDOOR_DECAY = 1.0, INDOOR_ISCALE = 0.4;
const _v = new THREE.Vector3();
const _c = new THREE.Color();
const _c2 = new THREE.Color();

export class Indoors {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.root = new THREE.Group();
    this.root.name = 'interior-mansao';
    this.root.position.set(INTERIOR.x, INTERIOR.y, INTERIOR.z);
    this.root.visible = false;
    game.scene.add(this.root);
    this.rooms = {}; // id → { group, meshes, level }
    this.level = 'G';
    this.room = null;
    this.cool = 0; // tempo mínimo entre entradas/saídas
    this.anim = []; // coisas animadas do interior: { update(dt, t, io) }
    this.lightSources = []; // velas/lareiras (coordenadas do mundo) para o LightPool
    this.interactables = [];
    this.mood = { ...MOOD.G };
    for (const [k, v] of Object.entries(this.mood)) if (typeof v === 'string') this.mood[k] = new THREE.Color(v);
  }

  // ------------------------------------------------------------ construção
  async build(progress = () => {}) {
    const g = this.game;
    const T = (this.T = await makeInteriorTextures(g.renderer));
    for (const [k, t] of Object.entries(TEX_TILE)) if (T[k]) T[k].repeat.set(1 / t, 1 / t);
    T.woodPanel.repeat.set(1 / TEX_TILE.panel, 1 / TEX_TILE.panel);
    const M = (this.M = makeInteriorMaterials(T));
    progress('Arrumando a mansão do Conde…');
    this.kits = Object.fromEntries(ROOMS.map((r) => [r.id, new IKit()]));
    this.halos = new Halos(this.root);
    const arch = (this.arch = new Architecture(this, this.kits, M));
    arch.build();
    this.surfaces = arch.surfaces;
    this.ceilings = arch.ceilings;
    this.decor = new Decor(this, this.kits, M);
    this.decor.build();
    for (const r of ROOMS) {
      const group = new THREE.Group();
      group.name = 'comodo-' + r.id;
      const meshes = this.kits[r.id].meshes();
      for (const m of meshes) group.add(m);
      this.root.add(group);
      this.rooms[r.id] = { group, meshes, level: r.level, def: r };
    }
    for (const o of this.decor.objects) this.root.add(o);
    // cada luz sabe de que cômodo é (o LightPool prefere as do cômodo atual)
    for (const s of this.lightSources) {
      s.room ??= this.roomAt(s.x, s.z, s.y + 0.05).id;
      // o LightPool põe a luz 0,35 m abaixo da fonte (pensado para postes). Aqui ela fica um pouco ACIMA da chama:
      // abaixo, caía no eixo do candelabro ou dentro do tampo da mesa e deixava um ponto estourado em branco
      s.y += 0.35 + 0.18;
      // arandelas e velas junto à parede: a luz fica a pelo menos 0,6 m dela (colada, a parede estoura em branco)
      const r = ROOMS.find((o) => o.id === s.room);
      if (r) {
        const m = 0.6 + WALL_T / 2;
        s.x = INTERIOR.x + clamp(s.x - INTERIOR.x, r.x0 + m, r.x1 - m);
        s.z = INTERIOR.z + clamp(s.z - INTERIOR.z, r.z0 + m, r.z1 - m);
      }
    }
    this.halos.build();
    this.kits = null;
    this.maps = paintPlan(this);
    this.makeDoors();
    this.setLevel('G', true);
  }

  // ------------------------------------------------------------ coordenadas
  toLocal(x, z) {
    return [x - INTERIOR.x, z - INTERIOR.z];
  }
  toWorld(lx, ly, lz, out = new THREE.Vector3()) {
    return out.set(lx + INTERIOR.x, ly + INTERIOR.y, lz + INTERIOR.z);
  }
  contains(x, z) {
    const lx = x - INTERIOR.x, lz = z - INTERIOR.z;
    return lx > BOUNDS.x0 && lx < BOUNDS.x1 && lz > BOUNDS.z0 && lz < BOUNDS.z1;
  }

  /** piso mais alto em (x,z) que o pé alcança a partir da altura y (coordenadas do mundo) */
  floorAt(x, z, y = Infinity) {
    const lx = x - INTERIOR.x, lz = z - INTERIOR.z, ly = y - INTERIOR.y;
    let best = -Infinity;
    for (const s of this.surfaces) {
      let h;
      if (s.ramp) {
        h = rampY(s, lx, lz);
        if (Number.isNaN(h)) continue;
      } else {
        if (lx < s.x0 || lx > s.x1 || lz < s.z0 || lz > s.z1) continue;
        if (s.holes && s.holes.some((o) => lx > o.x0 && lx < o.x1 && lz > o.z0 && lz < o.z1)) continue;
        h = s.y;
      }
      if (h <= ly + STEP && h > best) best = h;
    }
    if (best === -Infinity) best = LV.B.y - 2;
    return best + INTERIOR.y;
  }
  /** forro logo acima de y (para a cabeça e a câmera) */
  ceilAt(x, z, y) {
    const lx = x - INTERIOR.x, lz = z - INTERIOR.z, ly = y - INTERIOR.y;
    let best = Infinity;
    for (const c of this.ceilings) {
      if (lx < c.x0 || lx > c.x1 || lz < c.z0 || lz > c.z1 || c.y <= ly + 0.05 || c.y >= best) continue;
      if (c.holes.some((o) => lx > o.x0 && lx < o.x1 && lz > o.z0 && lz < o.z1)) continue;
      best = c.y;
    }
    if (ly > LV.A.y - 0.3 && Math.abs(lx) < 13.2) best = Math.min(best, atticRoofY(lx));
    return best + INTERIOR.y;
  }
  /** movimento com colisão dentro da mansão (rampas, degraus e vãos) */
  moveCircle(from, tx, tz, r) {
    const W = this.game.world;
    const tryMove = (x, z) => {
      const g0 = this.floorAt(from.x, from.z, from.y), g1 = this.floorAt(x, z, from.y);
      const d = Math.hypot(x - from.x, z - from.z);
      if (d < 1e-6) return true;
      if (g1 - g0 > 0.2 && (g1 - g0) / d > 1.3 && g1 > from.y + 0.25) return false;
      return true;
    };
    let x = tx, z = tz;
    if (!tryMove(x, z)) {
      if (tryMove(tx, from.z)) z = from.z;
      else if (tryMove(from.x, tz)) x = from.x;
      else {
        x = from.x;
        z = from.z;
      }
    }
    const [rx, rz] = W.colliders.resolve(x, z, r, from.y);
    if (tryMove(rx, rz)) {
      x = rx;
      z = rz;
    } else {
      x = from.x;
      z = from.z;
    }
    return [x, z];
  }
  levelAt(y) {
    const ly = y - INTERIOR.y;
    return ly < -0.3 ? 'B' : ly < LV.U.y - 0.25 ? 'G' : ly < LV.A.y - 0.25 ? 'U' : 'A';
  }
  roomAt(x, z, y) {
    const lx = x - INTERIOR.x, lz = z - INTERIOR.z;
    const lv = this.levelAt(y);
    for (const r of ROOMS) {
      const lvOk = r.level === lv || (r.id === 'saguao' && lv === 'U');
      if (!lvOk) continue;
      if (lx >= r.x0 && lx <= r.x1 && lz >= r.z0 && lz <= r.z1) return r;
    }
    return ROOM.saguao;
  }
  /** zona para a interface (nome do cômodo no minimapa e letreiro ao entrar) */
  zoneAt(x, z, y) {
    const r = this.roomAt(x, z, y ?? this.game.player.pos.y);
    return { id: 'm-' + r.id, name: r.name, flavor: `(Mansão Dentúcio · ${LV[r.level === 'G' && this.levelAt(y ?? this.game.player.pos.y) === 'U' ? 'U' : r.level].name})` };
  }

  // ------------------------------------------------------------ portas de entrar e sair
  makeDoors() {
    const g = this.game, W = g.world;
    // porta da frente da mansão (lado de fora)
    const c = Math.cos(MANOR.rot), s = Math.sin(MANOR.rot);
    const lz = 5.05, lz2 = 7.6;
    const dx = MANOR.x + lz * s, dz = MANOR.z + lz * c;
    const gy = W.terrain.heightAt(MANOR.x, MANOR.z);
    this.outDoor = new THREE.Vector3(dx, gy + 0.8, dz);
    // sai na frente da escadaria, de costas para a porta
    this.outSpot = { x: MANOR.x + lz2 * s, z: MANOR.z + lz2 * c, yaw: Math.atan2(s, c) };
    const outer = new Interactable({
      kind: 'object', name: 'Porta da Mansão', subtitle: 'Mansão Dentúcio', reaction: 'neutral', pos: this.outDoor, radius: 1.4, height: 3.2, range: 4.2,
      cursor: 'use', selectable: false, hint: 'Clique com o botão direito para entrar', onInteract: () => this.enter(),
    });
    g.interaction.add(outer);
    // porta da frente (lado de dentro)
    const inPos = this.toWorld(FRONT_DOOR.x, FRONT_DOOR.y, FRONT_DOOR.z);
    const inner = new Interactable({
      kind: 'object', name: 'Porta da Frente', subtitle: 'Sair da mansão', reaction: 'neutral', pos: inPos, radius: 1.3, height: 3.4, range: 3.6,
      cursor: 'use', selectable: false, hint: 'Clique com o botão direito para sair', onInteract: () => this.exit(),
    });
    g.interaction.add(inner);
    this.doorIn = inPos;
  }

  /** entrar (com fade). opts.instant pula o fade (testes) */
  enter(opts = {}) {
    const g = this.game, p = g.player;
    if (this.active || this.busy) return;
    if (g.combat?.dead) return;
    this.busy = true;
    p.frozen = true;
    g.audio?.sfx('door');
    const go = () => {
      if (p.mounted) {
        p.setMounted(false);
        g.ui?.info('Você deixou a vassoura no capacho.');
      }
      if (p.flying) p.stopFlying?.(true);
      const pet = g.questWorld?.pet;
      this.petWasOut = !!pet?.active;
      if (pet?.active) {
        pet.active = false;
        pet.rig.root.visible = false;
        setTimeout(() => g.ui?.chat('Belzebuzinho ficou esperando na porta. Ele morre de medo do mordomo.', 'system'), 900);
      }
      const e = this.toWorld(ENTRY.x, ENTRY.y, ENTRY.z, _v);
      p.teleport(e.x, e.z, ENTRY.yaw, e.y + 0.3);
      g.cam.snapBehind(p);
      this.setActive(true);
      this.busy = false;
      this.cool = 1.2;
      if (opts.instant) p.frozen = false;
      else setTimeout(() => (p.frozen = false), 250);
    };
    if (opts.instant) go();
    else g.fade(0.2, go);
  }
  exit(opts = {}) {
    const g = this.game, p = g.player;
    if (!this.active || this.busy) return;
    this.busy = true;
    p.frozen = true;
    g.audio?.sfx('door');
    const go = () => {
      const o = this.outSpot;
      p.teleport(o.x, o.z, o.yaw);
      g.cam.snapBehind(p);
      this.setActive(false);
      this.busy = false;
      this.cool = 1.2;
      if (opts.instant) p.frozen = false;
      else setTimeout(() => (p.frozen = false), 250);
    };
    if (opts.instant) go();
    else g.fade(0.2, go);
  }

  /** liga/desliga o "modo dentro" (esconde o mundo de fora e ajusta câmera, luzes e som) */
  setActive(v) {
    const g = this.game;
    if (this.active === v) return;
    this.active = v;
    this.root.visible = v;
    if (g.outdoor) g.outdoor.visible = !v;
    const pool = g.ambience?.pool;
    if (v) {
      this.savedCam = { target: g.cam.targetDist, max: g.cam.maxDist };
      g.cam.maxDist = 7.5;
      g.cam.targetDist = Math.min(g.cam.targetDist, 5.2);
      if (pool) {
        this.outSources = pool.sources;
        pool.sources = this.lightSources;
        pool.yWeight = 6;
        pool.decay = INDOOR_DECAY;
        pool.iScale = INDOOR_ISCALE;
        pool._t = 0;
      }
      this.level = null;
      this.setLevel(this.levelAt(g.player.pos.y), true);
      g.audio?.setIndoors?.(true);
    } else {
      if (this.savedCam) {
        g.cam.maxDist = this.savedCam.max;
        g.cam.targetDist = this.savedCam.target;
      }
      if (pool && this.outSources) {
        pool.sources = this.outSources;
        pool.yWeight = 0;
        pool.decay = 1.7;
        pool.iScale = 1;
        pool.focusRoom = null;
        pool._t = 0;
      }
      g.audio?.setIndoors?.(false);
      const pet = g.questWorld?.pet;
      if (this.petWasOut && pet) {
        pet.summon(g.player.pos.x - 1.5, g.player.pos.z + 1.5);
        pet.say('PIU! PIU! (pula no seu colo aliviado)');
      }
      this.petWasOut = false;
    }
  }

  /**
   * Andar/cômodo atual: só o andar atual projeta sombra, e só se desenha o que dá para ver daqui
   * (o próprio andar, o saguão de pé-direito duplo e o que aparece pelos vãos das escadas).
   */
  setLevel(lv, force = false, roomId = this.room?.id ?? 'saguao') {
    if (lv === this.level && roomId === this._visRoom && !force) return;
    this.level = lv;
    this._visRoom = roomId;
    const cur = LEVEL_ORDER.indexOf(lv);
    const see = new Set();
    for (const r of ROOMS) if (r.level === lv) see.add(r.id);
    if (lv === 'G' || lv === 'U') see.add('saguao');
    if (lv === 'B') see.add('cozinha'); // pelo vão da escada
    if (lv === 'G' && roomId === 'saguao') for (const id of ['biblioteca', 'quarto']) see.add(id); // portas do patamar
    if (lv === 'G' && roomId === 'cozinha') see.add('adega');
    if (lv === 'U' && roomId === 'biblioteca') see.add('sotao');
    if (lv === 'U' && roomId === 'saguao') for (const id of ['estar', 'jantar', 'cozinha', 'musica']) see.add(id); // do patamar, pelas portas lá embaixo
    if (lv === 'A') see.add('biblioteca');
    if (lv === 'U') {
      // no andar de cima o térreo só aparece pelo vão do saguão
      for (const id of ['estar', 'jantar', 'cozinha', 'musica']) if (roomId !== 'saguao') see.delete(id);
    }
    const seeLv = new Set([...see].map((id) => ROOM[id].level));
    if (see.has('saguao')) seeLv.add('U');
    for (const r of Object.values(this.rooms)) {
      r.group.visible = see.has(r.def.id);
      const hall = r.def.id === 'saguao';
      const casts = hall ? cur === 1 || cur === 2 : LEVEL_ORDER.indexOf(r.level) === cur;
      for (const m of r.meshes) m.castShadow = casts && m.userData.canCast;
    }
    for (const o of this.decor?.objects ?? []) {
      if (o.userData.level) o.visible = seeLv.has(o.userData.level) && Math.abs(LEVEL_ORDER.indexOf(o.userData.level) - cur) <= 1;
    }
  }

  // ------------------------------------------------------------ por quadro
  /** chamado logo depois do DayNight: sobrepõe luz, neblina e cores quando estamos dentro */
  update(dt) {
    const g = this.game, p = g.player;
    this.cool = Math.max(0, this.cool - dt);
    if (!this.active) {
      this.checkEnterByWalking();
      return;
    }
    // saiu por outro caminho (Lápide de Regresso, morte, teleporte): volta ao normal
    if (!this.contains(p.pos.x, p.pos.z)) {
      this.setActive(false);
      return;
    }
    this.room = this.roomAt(p.pos.x, p.pos.z, p.pos.y);
    this.setLevel(this.levelAt(p.pos.y), false, this.room.id);
    const dn = g.dayNight;
    const target = MOOD[this.level];
    const k = 1 - Math.exp(-dt * 3);
    const m = this.mood;
    for (const n of ['key', 'hs', 'hg', 'fog', 'st']) m[n].lerp(_c.set(target[n]), k);
    for (const n of ['ki', 'hi', 'fd', 'exp', 'sat']) m[n] = lerp(m[n], target[n], k);
    const sun = g.sun, hemi = g.hemi;
    sun.color.copy(m.key);
    sun.intensity = m.ki;
    hemi.color.copy(m.hs);
    hemi.groundColor.copy(m.hg);
    hemi.intensity = m.hi;
    const fog = g.scene.fog;
    fog.color.copy(m.fog);
    fog.near = m.fd;
    fog.far = 0;
    dn.lightDir.set(0.28, 1, 0.42).normalize();
    SHARED.uRim.value.set('#7a6a9a').multiplyScalar(0.3);
    g.renderer.toneMappingExposure = m.exp;
    const gr = g.post.grade;
    gr.uShadowTint.value.copy(m.st).convertLinearToSRGB();
    gr.uSplit.value = 0.13;
    gr.uSaturation.value = m.sat;
    dn.lamps = 1;
    updateGlows(1);
    // janelas mostram o céu de agora
    const night = dn.night;
    const M = this.M;
    M.viewNight.visible = night >= 0.5;
    M.viewDay.visible = night < 0.5;
    const vb = night >= 0.5 ? 1.1 + 0.5 * night : 1.35;
    M.viewNight.color.setScalar(vb);
    M.viewDay.color.setScalar(vb);
    // vitral: à noite o luar atravessa o vidro (cores vivas), de dia ele brilha forte
    M.rose.color.copy(_c.set(night >= 0.5 ? '#d8d8ff' : '#ffffff')).multiplyScalar(night >= 0.5 ? 1.7 : 2.4);
    M.shaft.color.copy(_c.set(night >= 0.5 ? '#6a78c8' : '#ffd8a0')).multiplyScalar(night >= 0.5 ? 0.35 : 0.5);
    this.halos.update(1, g.renderer.domElement.height);
    // cômodo atual (para o minimapa, o mordomo e as luzes)
    const pool = g.ambience?.pool;
    if (pool && pool.focusRoom !== this.room.id) {
      pool.focusRoom = this.room.id;
      pool._t = 0;
    }
    const t = g.time;
    for (const a of this.anim) a.update(dt, t, this);
    this.checkExitByWalking();
  }

  /** encostar na porta andando também entra (como abrir a porta com o ombro) */
  checkEnterByWalking() {
    const g = this.game, p = g.player;
    if (this.cool > 0 || this.busy || g.state !== 'play' || !(p.isMoving || p.wantMove) || p.flying) return;
    const d = Math.hypot(p.pos.x - this.outDoor.x, p.pos.z - this.outDoor.z);
    if (d > 1.35) return;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    const tx = (this.outDoor.x - p.pos.x) / d, tz = (this.outDoor.z - p.pos.z) / d;
    if (fx * tx + fz * tz > 0.55) this.enter();
  }
  checkExitByWalking() {
    const g = this.game, p = g.player;
    if (this.cool > 0 || this.busy || !(p.isMoving || p.wantMove)) return;
    const [lx, lz] = this.toLocal(p.pos.x, p.pos.z);
    const ly = p.pos.y - INTERIOR.y;
    if (ly > 1 || Math.abs(lx - FRONT_DOOR.x) > 1.3 || lz < FRONT_DOOR.z - 0.75) return;
    if (Math.cos(p.yaw) > 0.55) this.exit();
  }

  /** posição "de fora" do jogador (para o mapa-múndi e para salvar) */
  outsidePos() {
    return this.outSpot;
  }

  /** depuração: leva ao centro de um cômodo (entra se preciso) */
  debugGo(id) {
    const r = ROOM[id];
    if (!r) return Object.keys(ROOM);
    if (!this.active) this.enter({ instant: true });
    const y = LV[r.level].y;
    const p = this.toWorld((r.x0 + r.x1) / 2, y + 0.3, (r.z0 + r.z1) / 2, _v);
    this.game.player.teleport(p.x, p.z, this.game.player.yaw, p.y);
    this.game.cam.snapBehind(this.game.player);
    return r.name;
  }
}

export { clamp, damp };
