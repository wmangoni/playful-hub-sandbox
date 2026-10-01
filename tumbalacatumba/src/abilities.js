import * as THREE from 'three';
import { HOME_SPOT } from './world/layout.js';
import { RNG } from './util/rng.js';

const rng = new RNG(31337);

const SCREAMS = {
  prefeito: ['AAAH! Minha cabeça quase caiu!', 'Isso é crime contra a autoridade!'],
  aranhilda: ['Credo! Quase engoli uma aranha!', 'Menino levado!'],
  juvenal: ['Ai! Desmontei de novo!', 'Que susto, parceiro! Meu coração... ah, eu não tenho.'],
  tonico: ['Rapaz, eu já tô velho pra isso!', 'Cuidado, que eu enterro você!'],
  custodio: ['Vôte! Que susto, sô!', 'Quase furei o pé com o forcado!'],
  zepalha: ['AAAH! Eu que devia assustar!', 'Tá bom, tá bom, você é assustador.'],
  conde: ['Mortal insolente! ...mas foi um bom susto.', 'Hmpf. Amador.'],
  vesga: ['HIHIHI! Faz de novo!', 'Você me pegou, docinho!'],
  suspiro: ['Ahhh! Mas EU sou o fantasma aqui!', '(suspiro assustado)'],
  nevoa: ['Que falta de modos.', 'Eu já morri de susto uma vez, obrigada.'],
};
const HELLOS = ['Olá, vivente!', 'Boa noite... ou dia. Tanto faz.', 'Oi! Você tem cara de quem precisa de uma missão.', 'Ah, olá!'];

export class Abilities {
  constructor(game) {
    this.game = game;
  }

  use(id) {
    const f = this[id];
    if (this.game.combat?.dead) {
      this.game.ui.error('Você está morto.');
      return false;
    }
    return f ? f.call(this) : false;
  }

  /** Lanternada (tecla 7) */
  attack() {
    return this.game.combat.manualAttack();
  }

  boo() {
    const g = this.game, p = g.player;
    if (p.dead) return false;
    if (p.mounted) {
      g.ui.error('Difícil assustar alguém montado numa vassoura.');
      return false;
    }
    if (p.courage < 20) {
      g.ui.error('Você não tem coragem suficiente.');
      return false;
    }
    p.courage -= 20;
    p.sitting = false;
    p.setAction('scare', 0.9);
    g.ui.floaty('BUU!', 'boo');
    g.audio?.sfx('boo');
    g.cam.shake = 0.35;
    const n = g.questWorld.scareCrows(p.pos, 10);
    g.combat.fearAround(p.pos, 8, 2.5);
    for (const npc of g.questWorld.npcList) {
      if (npc.pos.distanceTo(p.pos) < 7) npc.say(rng.pick(SCREAMS[npc.id] ?? ['Aaah!']), 2.6);
    }
    if (g.questWorld.pet.active && g.questWorld.pet.w.pos.distanceTo(p.pos) < 8) g.questWorld.pet.say('PIU?! (quase cospe fogo)');
    if (n === 0 && g.progress.wants('corvo')) g.ui.info('Nenhum corvo perto o bastante para se assustar.');
    return true;
  }

  dance() {
    const g = this.game, p = g.player;
    if (p.mounted || p.dead) return false;
    if (p.action === 'dance') {
      p.action = null;
      return true;
    }
    p.sitting = false;
    p.setAction('dance');
    g.audio?.sfx('dance');
    const j = g.questWorld.npcs.juvenal;
    if (j.pos.distanceTo(p.pos) < 14 && g.progress.status('ossos') === 'done') {
      j.action = 'dance';
      j.say('Isso aí! Tumbalacatumba tumba tá!', 3);
      setTimeout(() => (j.action = null), 8000);
    }
    return true;
  }

  lantern() {
    const p = this.game.player;
    p.lanternOn = !p.lanternOn;
    this.game.audio?.sfx('lantern');
    return true;
  }

  pet() {
    const g = this.game, pet = g.questWorld.pet;
    if (pet.active) pet.dismiss();
    else {
      pet.summon();
      pet.say('PIU!');
    }
    g.progress.flags.petOut = pet.active;
    g.progress.save();
    g.audio?.sfx('poof');
    return true;
  }

  mount() {
    const g = this.game, p = g.player;
    if (p.mounted) {
      p.setMounted(false);
      g.fx.poof(p.pos, '#8a6aff');
      g.audio?.sfx('mount');
      return true;
    }
    if (p.flying || p.gliding) {
      g.ui.error('Pouse antes de montar na vassoura.');
      return false;
    }
    if (!p.grounded || p.isMoving) {
      g.ui.error('Você não pode fazer isso enquanto se move.');
      return false;
    }
    if (g.combat.inCombat) {
      g.ui.error('Você está em combate.');
      return false;
    }
    g.ui.cast('Vassoura Velha', 1.5, {
      icon: 'broom',
      onDone: () => {
        p.setMounted(true);
        g.fx.poof(p.pos, '#8a6aff');
        g.audio?.sfx('mount');
      },
    });
    return true;
  }

  hearth() {
    const g = this.game, p = g.player;
    if (p.mounted) p.setMounted(false);
    if (p.isMoving) {
      g.ui.error('Você não pode fazer isso enquanto se move.');
      return false;
    }
    g.ui.cast('Lápide de Regresso', 4, {
      icon: 'hearth',
      onDone: () => {
        g.fx.hearthFx(p.pos);
        g.fade(0.35, () => {
          if (p.flying || p.gliding) p.stopFlying(true);
          p.teleport(HOME_SPOT.x, HOME_SPOT.z, HOME_SPOT.yaw);
          g.cam.snapBehind(p);
          g.fx.hearthFx(p.pos);
          const pet = g.questWorld.pet;
          if (pet.active) pet.summon(p.pos.x - 1.5, p.pos.z + 1.5);
        });
        g.audio?.sfx('hearth');
      },
    });
    this.game.audio?.sfx('castStart');
    return true;
  }

  sit() {
    const p = this.game.player;
    if (p.mounted || p.flying || !p.grounded || p.dead) return false; // voando, o X é "descer"
    p.sitting = !p.sitting;
    return true;
  }

  /** Voar com a Capinha de Morcego Filhote (tecla 8) */
  fly() {
    const g = this.game, p = g.player;
    if (!g.progress.hasItem('capinha')) {
      g.ui.error('Você ainda não tem isso.');
      return false;
    }
    if (p.flying) {
      if (p.overDeepWater()) {
        g.ui.error('Não dá para pousar na água funda!');
        return false;
      }
      p.stopFlying();
      g.audio?.sfx('whiff');
      return true;
    }
    if (g.indoors?.active) {
      g.ui.error('Aqui dentro o teto é baixo demais para voar.');
      return false;
    }
    if (p.dead) return false;
    if (p.mounted) g.fx.poof(p.pos, '#8a6aff');
    p.startFlying();
    g.fx.poof(p.pos, '#6a4a8a', 0.8);
    g.audio?.sfx('whoosh');
    if (!g.progress.flags.flewOnce) {
      g.progress.setFlag('flewOnce');
      g.ui.chat(g.touchMode
        ? 'Voando! O botão Subir sobe e o Descer desce. Segure Descer rente ao chão para pousar, ou toque no 8 no ar para descer planando.'
        : 'Voando! Espaço sobe, X desce. Segure X rente ao chão para pousar, ou aperte 8 no ar para descer planando.', 'system');
    }
    return true;
  }

  chat(text) {
    const g = this.game, ui = g.ui, p = g.player;
    if (text.startsWith('/')) {
      const [cmd, ...rest] = text.slice(1).toLowerCase().split(/\s+/);
      switch (cmd) {
        case 'ajuda':
        case 'help':
          ui.chat('Comandos: /dançar, /buu, /sentar, /acenar, /hora, /fps, /salvar', 'system');
          return;
        case 'dançar':
        case 'dancar':
        case 'dance':
          this.dance();
          return;
        case 'buu':
        case 'boo':
          this.boo();
          return;
        case 'sentar':
        case 'sit':
          this.sit();
          return;
        case 'acenar':
        case 'wave':
          p.setAction('wave', 2);
          ui.chat('Você acena.', 'me');
          return;
        case 'hora':
          ui.chat(`São ${g.dayNight.clockText()} no Vale Tumbalacatumba.`, 'system');
          return;
        case 'fps':
          g.applySetting('showFps', !g.settings.showFps);
          return;
        case 'salvar':
          g.progress.save();
          ui.chat('Jogo salvo.', 'system');
          return;
        default:
          ui.chat(`Comando desconhecido: /${cmd}. Digite /ajuda.`, 'system');
          return;
      }
    }
    ui.chat(`[${p.name}] diz: ${text}`, 'say');
    ui.bubble({ pos: p.pos, rig: p.rig }, text, 5);
    const low = text.toLowerCase();
    const near = g.questWorld.npcList.filter((n) => n.pos.distanceTo(p.pos) < 9);
    if (/tumbalacatumba/.test(low)) {
      const j = g.questWorld.npcs.juvenal;
      if (j.pos.distanceTo(p.pos) < 20 && g.progress.status('ossos') === 'done') {
        setTimeout(() => j.say('TUMBA TÁ!!!', 3), 600);
        j.action = 'dance';
        setTimeout(() => (j.action = null), 6000);
      }
    }
    if (near.length && /\b(oi|olá|ola|bom dia|boa tarde|boa noite|eai|e aí)\b/.test(low)) {
      setTimeout(() => near[0].say(rng.pick(HELLOS), 3.5), 700);
    }
  }
}
