import * as MM from '../entities/mobModels.js';
import * as CM from '../entities/creatureModels.js';

/** alcance da Lanternada (centro do jogador até a borda da criatura) */
export const PLAYER_REACH = 2.3;

// Base por nível da criatura; cada tipo multiplica (hp, dmg, xp).
export const mobHp = (lv) => 28 + lv * 22;
export const mobDmg = (lv) => 3 + lv * 3.4;
export const mobXp = (lv) => 25 + lv * 12;

// move: ground (anda com colisão), fly (voa acima do chão), perch (pousado; voa ao brigar), water (sapo: pula no raso)
// atk: dur = duração do bote (s), hit = fração em que o golpe acerta, cd = descanso até o próximo
// deathRoll = tombo de lado/barriga pra cima (rad); deathPitch = cai de costas; lift = quanto sobe para não afundar no chão
// social = raio em que os vizinhos do mesmo tipo entram juntos na briga (os ratos da zona fácil brigam sozinhos)
export const MOB_TYPES = {
  rato: {
    name: 'Rato-Zumbi', family: 'Morto-vivo', model: MM.createZombieRat, move: 'ground',
    hp: 0.8, dmg: 0.75, xp: 0.9, speed: 1.4, run: 5.2, radius: 0.35, aggro: 6, reach: 1.25,
    atk: { dur: 0.55, hit: 0.55, cd: 1.1 }, deathRoll: Math.PI, lift: 0.4, color: '#8a9a7a', respawn: 50,
    sfx: { aggro: 'squeak', hit: 'squeak', die: 'squeak' },
    barks: {
      aggro: ['Squiiik!', 'Nhac nhac nhac!', 'Queeeijo... ou cééérebro!', 'Esse é o meu buraco!'],
      die: ['Squik... (fica de patinhas pra cima)', 'Eu volto... eu sempre volto...'],
    },
  },
  caveira: {
    name: 'Caveira Saltitante', family: 'Morto-vivo', model: MM.createHoppingSkull, move: 'ground',
    hp: 0.9, dmg: 1.0, xp: 1, speed: 1.6, run: 4.6, radius: 0.4, aggro: 8, reach: 1.4, social: 7,
    atk: { dur: 0.7, hit: 0.6, cd: 1.3 }, shatter: true, color: '#ece4cc', respawn: 55,
    sfx: { aggro: 'rattle', hit: 'rattle', die: 'rattle' },
    barks: {
      aggro: ['Tac-tac-tac-tac!', 'Me dá um abraço... de osso!', 'Cabeça fria, pé na cova!', 'Sorria! Eu sempre sorrio.'],
      die: ['Tô aos pedaços...', 'Alguém junta meus dentes?'],
    },
  },
  aranha: {
    name: 'Aranha Cabeluda', family: 'Fera', model: MM.createHairySpider, move: 'ground',
    hp: 1.15, dmg: 1.05, xp: 1.05, speed: 1.5, run: 5.6, radius: 0.6, aggro: 9, reach: 1.9, social: 8,
    atk: { dur: 0.8, hit: 0.6, cd: 1.1 }, deathRoll: Math.PI, lift: 0.55, color: '#3a2848', respawn: 60,
    questDrop: { key: 'pelo', chance: 0.8, text: 'Você arrancou um Tufo de Pelo de Aranha.' },
    sfx: { aggro: 'hiss', hit: 'hiss', die: 'hiss' },
    barks: {
      aggro: ['Ssssss...', 'Oito pernas, zero paciência!', 'Fica pro jantar?', 'Visita! Vou buscar a teia boa.'],
      die: ['Minhas perninhas...', 'Ssss... (se enrola toda)'],
    },
  },
  morcego: {
    name: 'Morcego Dentuço', family: 'Fera', model: MM.createFangBat, move: 'fly', flyH: 1.9, dive: 0.7,
    hp: 0.85, dmg: 0.9, xp: 1, speed: 2.2, run: 6.2, radius: 0.45, aggro: 10, reach: 1.4, social: 9,
    atk: { dur: 0.7, hit: 0.58, cd: 1.0 }, deathRoll: Math.PI / 2, lift: 0.3, color: '#4a3456', respawn: 55,
    sfx: { aggro: 'screech', hit: 'screech', die: 'screech' },
    barks: {
      aggro: ['Iiiiiih!', 'Sangue tipo O... de ótimo!', 'O Conde tem dentadura. Eu tenho DENTÃO!', 'Visita às 3 da tarde? Que falta de educação!'],
      die: ['Iiih... (cai de asa quebrada)', 'Chama o dentista...'],
    },
  },
  marujo: {
    name: 'Marujo Afogado', family: 'Morto-vivo', model: MM.createDrownedSailor, move: 'ground', humanoid: true,
    hp: 1.3, dmg: 1.35, xp: 1.2, speed: 1.1, run: 4.4, radius: 0.5, aggro: 7, reach: 1.9, social: 8,
    atk: { dur: 1.0, hit: 0.62, cd: 1.2 }, deathPitch: -1.45, lift: 0.25, color: '#86ada2', respawn: 65, splash: true,
    sfx: { aggro: 'glub', hit: 'glub', die: 'glub' },
    barks: {
      aggro: ['Glub glub!', 'Terra à vista... tarde demais!', 'O farol tá torto e eu tô molhado!', 'Homem ao mar! Quer dizer... VOCÊ ao mar!'],
      die: ['Glub... (vira uma poça)', 'Avisa minha mãe... glub.'],
    },
  },
  // neutros: só brigam se atacados (ou 15% das vezes, quando incomodados ao chegar perto)
  corvo: {
    name: 'Corvo Debochado', family: 'Fera', model: CM.createCrow, move: 'perch', neutral: true, flyH: 1.8, dive: 0.5,
    hp: 0.55, dmg: 0.6, xp: 0.6, speed: 3, run: 6.8, radius: 0.3, notice: 6.5, reach: 1.25,
    atk: { dur: 0.6, hit: 0.55, cd: 1.4 }, deathRoll: Math.PI, lift: 0.3, color: '#2c2838', respawn: 45,
    sfx: { aggro: 'caw', hit: 'caw', die: 'caw' },
    drop: { id: 'pena', chance: 0.25 },
    barks: {
      annoyed: ['Tá olhando o quê, crá?!', 'CRÁ! Sai da minha cerca!', 'Chega mais perto não, crá!'],
      aggro: ['CRÁÁÁ!', 'Vai ter bicada, crá!', 'Crá crá, mexeu com o corvo errado!'],
      die: ['Crá... (pena voando)', 'Vou contar pro espantalho...'],
    },
  },
  sapo: {
    name: 'Sapo Tristonho', family: 'Anfíbio', model: () => CM.createFrog(false), move: 'water', neutral: true, scale: 0.55,
    hp: 0.9, dmg: 0.8, xp: 0.9, speed: 1.8, run: 4.2, radius: 0.35, notice: 6, reach: 2.4,
    atk: { dur: 0.7, hit: 0.5, cd: 1.5 }, deathRoll: Math.PI, lift: 0.3, color: '#5a8a3a', respawn: 50,
    sfx: { aggro: 'croak', hit: 'croak', die: 'croak' },
    barks: {
      annoyed: ['CROAC! Sai do meu brejo!', 'Croac... hoje não tô bem, viu?', 'Croooac! (cara de poucos amigos)'],
      aggro: ['CROAC!', 'Croac croac, agora é pessoal!'],
      die: ['Croac... (fica de barriga pra cima)', 'Pelo menos acabou a tristeza...'],
    },
  },
};

// o id do tipo é a chave dos objetivos de caça das missões (ex.: 'caveira')
for (const [id, t] of Object.entries(MOB_TYPES)) t.id = id;
