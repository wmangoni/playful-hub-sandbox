/**
 * Armas, armaduras e escudos do Livro do Jogador 3.0 (SRD 3.0, "Equipment, Weapons" e
 * "Equipment, Armor"), o kit padrão por classe e as proficiências (TASK_006 §6, etapa E4).
 *
 * Na 3.0 o dano é da arma, não de quem a usa. O tamanho da arma comparado ao do portador diz
 * se ela é leve (menor), de uma mão (igual), de duas mãos (uma categoria maior) ou grande
 * demais (duas ou mais). Um halfling com espada longa (Média) a usa com as duas mãos.
 * Distâncias em metros (5 pés = 1,5 m). Funções puras, sem DOM.
 * Ficam de fora: shuriken (dano fixo 1), rede, chicote, manoplas e armas duplas como duplas
 * (o bordão entra como arma de duas mãos).
 */
import { normalize as loose } from '../core/format.js';
import { T30 } from './tables30.js';

export const TAMANHOS_ARMA = ['Miúdo', 'Pequeno', 'Médio', 'Grande'];
const TAMANHOS_CRIATURA = ['Mínimo', 'Minúsculo', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme'];

const C = (margem, multiplicador) => ({ margem, multiplicador });
const P = ['perfurante'];
const S = ['cortante'];
const B = ['concussão'];

/**
 * `uso`: 'corpo a corpo', 'distancia' (projétil ou arremesso puro). `arremesso_m`: arma corpo a
 * corpo que também pode ser arremessada (incremento). `projetil`: arco, besta e funda (sem For
 * positiva no dano). `alcance_m` 3: arma de haste com alcance (3.0: glaive, guisarme, lança
 * longa, ranseur, corrente com cravos). `peso_lb`: o peso da tabela do SRD, em libras.
 */
export const ARMAS = [
  // simples, corpo a corpo
  { id: 'desarmado', nome: 'Desarmado', categoria: 'simples', uso: 'corpo a corpo', tamanho: null, dano: '1d3', critico: C(20, 2), tipo_dano: B, desarmado: true, peso_lb: null },
  { id: 'adaga', nome: 'Adaga', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Miúdo', dano: '1d4', critico: C(19, 2), tipo_dano: P, arremesso_m: 3, peso_lb: 1 },
  { id: 'adaga-de-soco', nome: 'Adaga de soco', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Miúdo', dano: '1d4', critico: C(20, 3), tipo_dano: P, peso_lb: 2 },
  { id: 'maca-leve', nome: 'Maça leve', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(20, 2), tipo_dano: B, peso_lb: 6 },
  { id: 'foice-curta', nome: 'Foice curta', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(20, 2), tipo_dano: S, peso_lb: 3 },
  { id: 'clava', nome: 'Clava', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d6', critico: C(20, 2), tipo_dano: B, arremesso_m: 3, peso_lb: 3 },
  { id: 'meia-lanca', nome: 'Meia-lança', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d6', critico: C(20, 3), tipo_dano: P, arremesso_m: 6, peso_lb: 3 },
  { id: 'maca-pesada', nome: 'Maça pesada', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d8', critico: C(20, 2), tipo_dano: B, peso_lb: 12 },
  { id: 'maca-estrela', nome: 'Maça-estrela', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d8', critico: C(20, 2), tipo_dano: ['concussão', 'perfurante'], peso_lb: 8 },
  { id: 'bordao', nome: 'Bordão', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d6', critico: C(20, 2), tipo_dano: B, dupla: true, peso_lb: 4 },
  { id: 'lanca-curta', nome: 'Lança curta', categoria: 'simples', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d8', critico: C(20, 3), tipo_dano: P, arremesso_m: 6, peso_lb: 5 },
  // simples, à distância
  { id: 'besta-leve', nome: 'Besta leve', categoria: 'simples', uso: 'distancia', tamanho: 'Pequeno', dano: '1d8', critico: C(19, 2), tipo_dano: P, incremento_m: 24, projetil: true, peso_lb: 6 },
  { id: 'dardo', nome: 'Dardo', categoria: 'simples', uso: 'distancia', tamanho: 'Pequeno', dano: '1d4', critico: C(20, 2), tipo_dano: P, incremento_m: 6, peso_lb: 0.5 },
  { id: 'funda', nome: 'Funda', categoria: 'simples', uso: 'distancia', tamanho: 'Pequeno', dano: '1d4', critico: C(20, 2), tipo_dano: B, incremento_m: 15, projetil: true, peso_lb: 0 },
  { id: 'besta-pesada', nome: 'Besta pesada', categoria: 'simples', uso: 'distancia', tamanho: 'Médio', dano: '1d10', critico: C(19, 2), tipo_dano: P, incremento_m: 36, projetil: true, peso_lb: 9 },
  { id: 'azagaia', nome: 'Azagaia', categoria: 'simples', uso: 'distancia', tamanho: 'Médio', dano: '1d6', critico: C(20, 2), tipo_dano: P, incremento_m: 9, peso_lb: 2 },
  // comuns, corpo a corpo
  { id: 'machado-de-arremesso', nome: 'Machado de arremesso', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(20, 2), tipo_dano: S, arremesso_m: 3, peso_lb: 4 },
  { id: 'martelo-leve', nome: 'Martelo leve', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d4', critico: C(20, 2), tipo_dano: B, arremesso_m: 6, peso_lb: 2 },
  { id: 'machadinha', nome: 'Machadinha', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(20, 3), tipo_dano: S, peso_lb: 5 },
  { id: 'picareta-leve', nome: 'Picareta leve', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d4', critico: C(20, 4), tipo_dano: P, peso_lb: 4 },
  { id: 'espada-curta', nome: 'Espada curta', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(19, 2), tipo_dano: P, peso_lb: 3 },
  { id: 'machado-de-batalha', nome: 'Machado de batalha', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d8', critico: C(20, 3), tipo_dano: S, peso_lb: 7 },
  { id: 'mangual-leve', nome: 'Mangual leve', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d8', critico: C(20, 2), tipo_dano: B, peso_lb: 5 },
  { id: 'espada-longa', nome: 'Espada longa', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d8', critico: C(19, 2), tipo_dano: S, peso_lb: 4 },
  { id: 'picareta-pesada', nome: 'Picareta pesada', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d6', critico: C(20, 4), tipo_dano: P, peso_lb: 6 },
  { id: 'rapieira', nome: 'Rapieira', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d6', critico: C(18, 2), tipo_dano: P, peso_lb: 3 },
  { id: 'cimitarra', nome: 'Cimitarra', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d6', critico: C(18, 2), tipo_dano: S, peso_lb: 4 },
  { id: 'tridente', nome: 'Tridente', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d8', critico: C(20, 2), tipo_dano: P, arremesso_m: 3, peso_lb: 5 },
  { id: 'martelo-de-guerra', nome: 'Martelo de guerra', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d8', critico: C(20, 3), tipo_dano: B, peso_lb: 8 },
  { id: 'falcione', nome: 'Falcione', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '2d4', critico: C(18, 2), tipo_dano: S, peso_lb: 16 },
  { id: 'mangual-pesado', nome: 'Mangual pesado', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d10', critico: C(19, 2), tipo_dano: B, peso_lb: 20 },
  { id: 'glaive', nome: 'Glaive', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d10', critico: C(20, 3), tipo_dano: S, alcance_m: 3, peso_lb: 15 },
  { id: 'machado-grande', nome: 'Machado grande', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d12', critico: C(20, 3), tipo_dano: S, peso_lb: 20 },
  { id: 'clava-grande', nome: 'Clava grande', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d10', critico: C(20, 2), tipo_dano: B, peso_lb: 10 },
  { id: 'espada-grande', nome: 'Espada grande', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '2d6', critico: C(19, 2), tipo_dano: S, peso_lb: 15 },
  { id: 'guisarme', nome: 'Guisarme', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '2d4', critico: C(20, 3), tipo_dano: S, alcance_m: 3, peso_lb: 15 },
  { id: 'alabarda', nome: 'Alabarda', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d10', critico: C(20, 3), tipo_dano: ['perfurante', 'cortante'], peso_lb: 15 },
  { id: 'lanca-longa', nome: 'Lança longa', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '1d8', critico: C(20, 3), tipo_dano: P, alcance_m: 3, peso_lb: 9 },
  { id: 'ranseur', nome: 'Ranseur', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '2d4', critico: C(20, 3), tipo_dano: P, alcance_m: 3, peso_lb: 15 },
  { id: 'gadanho', nome: 'Gadanho', categoria: 'comum', uso: 'corpo a corpo', tamanho: 'Grande', dano: '2d4', critico: C(20, 4), tipo_dano: ['perfurante', 'cortante'], peso_lb: 12 },
  // comuns, à distância
  { id: 'arco-curto', nome: 'Arco curto', categoria: 'comum', uso: 'distancia', tamanho: 'Médio', dano: '1d6', critico: C(20, 3), tipo_dano: P, incremento_m: 18, projetil: true, peso_lb: 2 },
  { id: 'arco-curto-composto', nome: 'Arco curto composto', categoria: 'comum', uso: 'distancia', tamanho: 'Médio', dano: '1d6', critico: C(20, 3), tipo_dano: P, incremento_m: 21, projetil: true, peso_lb: 2 },
  { id: 'arco-longo', nome: 'Arco longo', categoria: 'comum', uso: 'distancia', tamanho: 'Grande', dano: '1d8', critico: C(20, 3), tipo_dano: P, incremento_m: 30, projetil: true, peso_lb: 3 },
  { id: 'arco-longo-composto', nome: 'Arco longo composto', categoria: 'comum', uso: 'distancia', tamanho: 'Grande', dano: '1d8', critico: C(20, 3), tipo_dano: P, incremento_m: 33, projetil: true, peso_lb: 3 },
  // exóticas
  { id: 'kama', nome: 'Kama', categoria: 'exotica', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(20, 2), tipo_dano: S, monge: true, peso_lb: 2 },
  { id: 'nunchaku', nome: 'Nunchaku', categoria: 'exotica', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(20, 2), tipo_dano: B, monge: true, peso_lb: 2 },
  { id: 'siangham', nome: 'Siangham', categoria: 'exotica', uso: 'corpo a corpo', tamanho: 'Pequeno', dano: '1d6', critico: C(20, 2), tipo_dano: P, monge: true, peso_lb: 1 },
  { id: 'espada-bastarda', nome: 'Espada bastarda', categoria: 'exotica', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d10', critico: C(19, 2), tipo_dano: S, peso_lb: 10 },
  { id: 'machado-de-guerra-anao', nome: 'Machado de guerra anão', categoria: 'exotica', uso: 'corpo a corpo', tamanho: 'Médio', dano: '1d10', critico: C(20, 3), tipo_dano: S, peso_lb: 15 },
  { id: 'corrente-com-cravos', nome: 'Corrente com cravos', categoria: 'exotica', uso: 'corpo a corpo', tamanho: 'Grande', dano: '2d4', critico: C(20, 2), tipo_dano: P, alcance_m: 3, peso_lb: 15 },
  { id: 'besta-de-mao', nome: 'Besta de mão', categoria: 'exotica', uso: 'distancia', tamanho: 'Miúdo', dano: '1d4', critico: C(19, 2), tipo_dano: P, incremento_m: 9, projetil: true, peso_lb: 3 },
];

/**
 * `tipo`: leve, média, pesada ou escudo. `metal: false` são as permitidas ao druida. `peso_lb`: o
 * peso da tabela do SRD para Médio, em libras (a de Pequeno pesa a metade).
 */
export const ARMADURAS = [
  { id: 'acolchoada', nome: 'Armadura acolchoada', tipo: 'leve', bonus: 1, desMax: 8, penalidade: 0, falhaArcana: 5, metal: false, peso_lb: 10 },
  { id: 'couro', nome: 'Armadura de couro', tipo: 'leve', bonus: 2, desMax: 6, penalidade: 0, falhaArcana: 10, metal: false, peso_lb: 15 },
  { id: 'couro-batido', nome: 'Couro batido', tipo: 'leve', bonus: 3, desMax: 5, penalidade: -1, falhaArcana: 15, metal: true, peso_lb: 20 },
  { id: 'camisao-de-malha', nome: 'Camisão de cota de malha', tipo: 'leve', bonus: 4, desMax: 4, penalidade: -2, falhaArcana: 20, metal: true, peso_lb: 25 },
  { id: 'gibao-de-peles', nome: 'Gibão de peles', tipo: 'média', bonus: 3, desMax: 4, penalidade: -3, falhaArcana: 20, metal: false, peso_lb: 25 },
  { id: 'brunea', nome: 'Brunea', tipo: 'média', bonus: 4, desMax: 3, penalidade: -4, falhaArcana: 25, metal: true, peso_lb: 30 },
  { id: 'cota-de-malha', nome: 'Cota de malha', tipo: 'média', bonus: 5, desMax: 2, penalidade: -5, falhaArcana: 30, metal: true, peso_lb: 40 },
  { id: 'peitoral', nome: 'Peitoral de aço', tipo: 'média', bonus: 5, desMax: 3, penalidade: -4, falhaArcana: 20, metal: true, peso_lb: 30 },
  { id: 'cota-de-talas', nome: 'Cota de talas', tipo: 'pesada', bonus: 6, desMax: 0, penalidade: -7, falhaArcana: 40, metal: true, peso_lb: 45 },
  { id: 'cota-de-placas', nome: 'Cota de placas', tipo: 'pesada', bonus: 6, desMax: 1, penalidade: -6, falhaArcana: 35, metal: true, peso_lb: 35 },
  { id: 'meia-armadura', nome: 'Meia-armadura', tipo: 'pesada', bonus: 7, desMax: 0, penalidade: -7, falhaArcana: 40, metal: true, peso_lb: 50 },
  { id: 'armadura-completa', nome: 'Armadura completa', tipo: 'pesada', bonus: 8, desMax: 1, penalidade: -6, falhaArcana: 35, metal: true, peso_lb: 50 },
  { id: 'broquel', nome: 'Broquel', tipo: 'escudo', bonus: 1, desMax: null, penalidade: -1, falhaArcana: 5, metal: true, peso_lb: 5 },
  { id: 'escudo-pequeno-madeira', nome: 'Escudo pequeno de madeira', tipo: 'escudo', bonus: 1, desMax: null, penalidade: -1, falhaArcana: 5, metal: false, peso_lb: 5 },
  { id: 'escudo-pequeno-aco', nome: 'Escudo pequeno de aço', tipo: 'escudo', bonus: 1, desMax: null, penalidade: -1, falhaArcana: 5, metal: true, peso_lb: 6 },
  { id: 'escudo-grande-madeira', nome: 'Escudo grande de madeira', tipo: 'escudo', bonus: 2, desMax: null, penalidade: -2, falhaArcana: 15, metal: false, peso_lb: 10 },
  { id: 'escudo-grande-aco', nome: 'Escudo grande de aço', tipo: 'escudo', bonus: 2, desMax: null, penalidade: -2, falhaArcana: 15, metal: true, peso_lb: 15 },
];

export const armaPorId = id => ARMAS.find(a => a.id === id) || null;
export const armaduraPorId = id => ARMADURAS.find(a => a.id === id) || null;

/**
 * Peso em kg (a edição brasileira usa 1 libra ≈ 0,5 kg). Na 3.0 a arma tem tamanho próprio e pesa o
 * mesmo para qualquer portador; a armadura e o escudo feitos para Pequeno pesam a metade (SRD 3.0,
 * "Armor fitted for Small characters weighs half as much"). Sem peso na tabela, null.
 */
export function pesoKg(item, tamanhoPortador = 'Médio') {
  if (item?.peso_lb == null) return null;
  const metade = item.tipo && tamanhoPortador === 'Pequeno' ? 0.5 : 1;
  return item.peso_lb * metade * T30.kgPorLibra;
}

/**
 * Penalidade de armadura de uma armadura ou escudo (≤ 0). A mágica é sempre obra-prima, e a
 * penalidade dela é 1 menor (SRD 3.0, "all magic armor is also masterwork armor").
 */
export const penalidadeDoItem = (base, x) => (base.penalidade < 0 && x?.melhoria ? base.penalidade + 1 : base.penalidade);

/**
 * Quantas categorias a arma é maior que o portador: < 0 leve, 0 de uma mão, 1 de duas mãos,
 * 2 ou mais grande demais. O ataque desarmado conta como duas categorias menor (leve).
 */
export function empunhadura(arma, tamanhoPortador = 'Médio') {
  if (!arma) return null;
  if (arma.desarmado) return 'leve';
  const d = TAMANHOS_CRIATURA.indexOf(arma.tamanho) - TAMANHOS_CRIATURA.indexOf(tamanhoPortador);
  return d < 0 ? 'leve' : d === 0 ? 'uma mão' : d === 1 ? 'duas mãos' : 'grande demais';
}

// ---------------------------------------------------------------------------------------------
// proficiências (SRD 3.0, "Weapon and Armor Proficiency" de cada classe)

const LISTAS = {
  bad: ['arco-longo', 'arco-longo-composto', 'espada-longa', 'rapieira', 'espada-curta', 'arco-curto', 'arco-curto-composto'],
  dru: ['clava', 'adaga', 'dardo', 'meia-lanca', 'lanca-longa', 'bordao', 'cimitarra', 'foice-curta', 'lanca-curta', 'funda'],
  mon: ['clava', 'besta-leve', 'besta-pesada', 'adaga', 'machadinha', 'azagaia', 'kama', 'nunchaku', 'bordao', 'siangham', 'funda'],
  lad: ['besta-de-mao', 'besta-leve', 'adaga', 'adaga-de-soco', 'dardo', 'maca-leve', 'arco-curto', 'arco-curto-composto', 'espada-curta'],
  ladMedio: ['clava', 'besta-pesada', 'maca-pesada', 'maca-estrela', 'bordao', 'rapieira'],
  mag: ['clava', 'adaga', 'besta-pesada', 'besta-leve', 'bordao'],
  elfo: ['espada-longa', 'rapieira', 'arco-longo', 'arco-longo-composto', 'arco-curto', 'arco-curto-composto'],
};

/** O parâmetro de um talento ("Foco em Arma (espada longa)") é esta arma? Comparação exata, sem acento. */
export function mesmaArma(parametro, arma) {
  const p = loose(parametro || '');
  return Boolean(p && arma) && (p === loose(arma.nome) || (Boolean(arma.desarmado) && /desarmad/.test(p)));
}

/**
 * Proficiências que vêm de talentos escolhidos (Livro do Jogador 3.0): Usar Armadura (leve, média,
 * pesada), Usar Escudo, Usar Arma Simples, e Usar Arma Comum e Exótica, cada uma para UMA arma
 * (o parâmetro). `talentos` = [{ nome, parametro }].
 */
export function proficienciasDeTalentos(talentos = []) {
  const out = { armaduras: new Set(), escudo: false, simples: false, comuns: [], exoticas: [] };
  for (const t of talentos) {
    const n = loose(t.nome).replace(/\s+/g, ' ');
    const armadura = /^usar armadura \((leve|media|pesada)\)$/.exec(n);
    if (armadura) out.armaduras.add({ leve: 'leve', media: 'média', pesada: 'pesada' }[armadura[1]]);
    else if (n === 'usar escudo') out.escudo = true;
    else if (n === 'usar arma simples') out.simples = true;
    else if (n === 'usar arma comum' && t.parametro) out.comuns.push(t.parametro);
    else if (n === 'usar arma exotica' && t.parametro) out.exoticas.push(t.parametro);
  }
  return out;
}

/**
 * O personagem sabe usar a arma? `extras`: `proficienciasDeTalentos`. Classes de prestígio e
 * personalizadas (`classKey` null): não dá para saber, e o simulador considera que sim. O bardo
 * 3.0 escolhe UMA arma comum da lista; aqui vale qualquer uma delas.
 */
export function proficienteArma(arma, { classKey, raceKey = null, tamanho = 'Médio', extras = null, duasMaos = false } = {}) {
  if (!arma || arma.desarmado || !classKey) return true;
  if (raceKey === 'elfo' && LISTAS.elfo.includes(arma.id)) return true;
  // a espada bastarda com as duas mãos é arma comum (3.0)
  const categoria = arma.id === 'espada-bastarda' && duasMaos ? 'comum' : arma.categoria;
  if (extras?.simples && categoria === 'simples') return true;
  if (categoria === 'comum' && extras?.comuns.some(p => mesmaArma(p, arma))) return true;
  if (categoria === 'exotica' && extras?.exoticas.some(p => mesmaArma(p, arma))) return true;
  switch (classKey) {
    case 'bar': case 'gue': case 'pal': case 'ran':
      return categoria !== 'exotica';
    case 'bad': return arma.categoria === 'simples' || LISTAS.bad.includes(arma.id);
    case 'cle': case 'fei': return arma.categoria === 'simples';
    case 'dru': return LISTAS.dru.includes(arma.id);
    case 'mon': return LISTAS.mon.includes(arma.id);
    case 'lad': return LISTAS.lad.includes(arma.id) || (tamanho !== 'Pequeno' && LISTAS.ladMedio.includes(arma.id));
    case 'mag': return LISTAS.mag.includes(arma.id);
    default: return true;
  }
}

const ARMADURA_CLASSE = {
  bar: ['leve', 'média', 'escudo'], bad: ['leve', 'média', 'escudo'], cle: ['leve', 'média', 'pesada', 'escudo'],
  dru: ['leve', 'média', 'escudo'], gue: ['leve', 'média', 'pesada', 'escudo'], mon: [], pal: ['leve', 'média', 'pesada', 'escudo'],
  ran: ['leve', 'média', 'escudo'], lad: ['leve'], fei: [], mag: [],
};

export function proficienteArmadura(armadura, { classKey, extras = null } = {}) {
  if (!armadura || !classKey) return true;
  if (armadura.tipo === 'escudo' ? extras?.escudo : extras?.armaduras.has(armadura.tipo)) return true;
  return (ARMADURA_CLASSE[classKey] || []).includes(armadura.tipo);
}

// ---------------------------------------------------------------------------------------------
// kit padrão

const KITS = {
  bar: { principal: 'machado-grande', distancia: 'arco-curto', armadura: 'couro-batido' },
  bad: { principal: 'rapieira', distancia: 'besta-leve', armadura: 'couro' },
  cle: { principal: 'maca-pesada', distancia: 'besta-leve', armadura: 'brunea', escudo: 'escudo-grande-madeira' },
  dru: { principal: 'cimitarra', distancia: 'funda', armadura: 'gibao-de-peles', escudo: 'escudo-pequeno-madeira' },
  gue: { principal: 'espada-longa', distancia: 'arco-longo', armadura: 'cota-de-malha', escudo: 'escudo-grande-madeira' },
  mon: { principal: 'desarmado', distancia: 'funda' },
  pal: { principal: 'espada-longa', distancia: 'besta-leve', armadura: 'brunea', escudo: 'escudo-grande-madeira' },
  ran: { principal: 'espada-longa', secundaria: 'espada-curta', distancia: 'arco-longo', armadura: 'couro-batido' },
  lad: { principal: 'espada-curta', distancia: 'besta-leve', armadura: 'couro' },
  fei: { principal: 'adaga', distancia: 'besta-leve' },
  mag: { principal: 'bordao', distancia: 'besta-leve' },
  outra: { principal: 'espada-longa', distancia: 'besta-leve', armadura: 'couro-batido' },
};

/** Para quem é Pequeno, a mesma função numa arma menor (a Grande seria grande demais). */
const PARA_PEQUENO = {
  'machado-grande': 'machado-de-batalha', 'espada-longa': 'espada-curta', 'arco-longo': 'arco-curto', bordao: 'clava', rapieira: 'espada-curta', 'maca-pesada': 'maca-leve', cimitarra: 'foice-curta',
};

const item = id => (id ? { id, melhoria: 0, material: null } : null);

/**
 * Kit padrão da classe: `{ principal, secundaria, escudo, armadura, distancia }`, cada um
 * `{ id, melhoria, material }` ou null.
 */
export function kitPadrao(classKey, tamanho = 'Médio') {
  const kit = KITS[classKey] || KITS.outra;
  const troca = id => (tamanho === 'Pequeno' && PARA_PEQUENO[id]) || id;
  return {
    principal: item(troca(kit.principal)),
    // a segunda arma do ranger Pequeno é a adaga: a espada curta é de uma mão para ele, não leve
    secundaria: item(kit.secundaria ? (tamanho === 'Pequeno' ? 'adaga' : kit.secundaria) : null),
    escudo: item(kit.escudo),
    armadura: item(kit.armadura),
    distancia: item(kit.distancia ? troca(kit.distancia) : null),
  };
}

const MELHORIAS = [0, 1, 2, 3, 4, 5];
const MATERIAIS = [null, 'prata'];

/** Normaliza o que veio do store (ids desconhecidos viram null; melhoria entre 0 e 5). */
export function normalizarEquipamento(eq, classKey, tamanho) {
  const base = kitPadrao(classKey, tamanho);
  if (!eq || typeof eq !== 'object') return base;
  const limpa = (x, existe, comMaterial) => {
    if (x == null) return null;
    if (!existe(x.id)) return null;
    const melhoria = MELHORIAS.includes(Number(x.melhoria)) ? Number(x.melhoria) : 0;
    return { id: x.id, melhoria, material: comMaterial && MATERIAIS.includes(x.material) ? x.material : null };
  };
  const out = {};
  for (const k of ['principal', 'secundaria', 'distancia']) out[k] = k in eq ? limpa(eq[k], id => Boolean(armaPorId(id)), true) : base[k];
  for (const k of ['escudo', 'armadura']) out[k] = k in eq ? limpa(eq[k], id => Boolean(armaduraPorId(id)) && (k === 'escudo') === (armaduraPorId(id).tipo === 'escudo'), false) : base[k];
  return out;
}

/**
 * O juramento do druida (3.0) proíbe armadura e escudo de metal e as armas fora da lista dele; com
 * qualquer um, ele não usa os poderes mágicos (as magias). Devolve o item proibido, ou null.
 */
export function proibidoAoDruida(eq) {
  for (const k of ['principal', 'secundaria', 'distancia']) {
    const a = armaPorId(eq?.[k]?.id);
    if (a && !a.desarmado && !LISTAS.dru.includes(a.id)) return a;
  }
  for (const k of ['armadura', 'escudo']) {
    const a = armaduraPorId(eq?.[k]?.id);
    if (a?.metal) return a;
  }
  return null;
}

/**
 * Problemas do equipamento para este personagem: arma grande demais, arma de duas mãos com
 * escudo ou segunda arma, segunda arma sem uma mão livre, escudo e segunda arma juntos,
 * falta de proficiência, armadura de metal ou arma proibida no druida, monge de armadura.
 * Devolve `{ erros, avisos }`: erro impede a combinação; aviso só explica a penalidade.
 */
export function problemasDoEquipamento(eq, { classKey, raceKey, tamanho = 'Médio', extras = null }) {
  const erros = [];
  const avisos = [];
  const principal = armaPorId(eq.principal?.id);
  const secundaria = armaPorId(eq.secundaria?.id);
  const distancia = armaPorId(eq.distancia?.id);
  const escudo = armaduraPorId(eq.escudo?.id);
  const armadura = armaduraPorId(eq.armadura?.id);
  for (const [slot, a] of [['arma principal', principal], ['segunda arma', secundaria], ['arma à distância', distancia]]) {
    if (!a) continue;
    if (empunhadura(a, tamanho) === 'grande demais') erros.push(`${a.nome} é grande demais para um personagem ${tamanho.toLowerCase()} (${slot}).`);
    const duasMaos = a === principal && !escudo && !secundaria;
    if (!proficienteArma(a, { classKey, raceKey, tamanho, extras, duasMaos })) avisos.push(`sem proficiência com ${a.nome.toLowerCase()}: −4 no ataque.`);
  }
  if (principal && empunhadura(principal, tamanho) === 'duas mãos' && (escudo || secundaria)) erros.push(`${principal.nome} pede as duas mãos: tire o escudo e a segunda arma.`);
  if (secundaria && escudo) erros.push('A segunda arma e o escudo ocupam a mesma mão: escolha um dos dois.');
  if (secundaria && empunhadura(secundaria, tamanho) === 'duas mãos') erros.push(`${secundaria.nome} pede as duas mãos e não serve de segunda arma.`);
  if (secundaria && secundaria.uso !== 'corpo a corpo') erros.push(`${secundaria.nome} não é arma corpo a corpo.`);
  if (distancia && distancia.uso !== 'distancia' && !distancia.arremesso_m) erros.push(`${distancia.nome} não é arma de ataque à distância.`);
  if (principal && principal.uso !== 'corpo a corpo') erros.push(`${principal.nome} é arma de ataque à distância: ponha-a na arma à distância.`);
  for (const a of [armadura, escudo]) {
    if (!a) continue;
    if (!proficienteArmadura(a, { classKey, extras }) && a.penalidade < 0) avisos.push(`sem proficiência com ${a.nome.toLowerCase()}: a penalidade de armadura (−${-a.penalidade}) vale também no ataque.`);
    if (classKey === 'dru' && a.metal) avisos.push(`${a.nome} é de metal: o druida que a usa perde as magias e as habilidades sobrenaturais.`);
  }
  if (classKey === 'dru') {
    for (const a of [principal, secundaria, distancia]) if (a && !a.desarmado && !LISTAS.dru.includes(a.id)) avisos.push(`${a.nome}: o juramento do druida proíbe a arma; com ela, ele perde as magias e as habilidades sobrenaturais.`);
  }
  if (classKey === 'mon' && armadura) avisos.push('De armadura, o monge perde o bônus de CA, o deslocamento extra e os ataques desarmados extras (a coluna própria e a rajada).');
  return { erros, avisos };
}

/** Rótulo curto do item: "Espada longa +1 de prata". */
export function rotuloItem(x, porId = id => armaPorId(id) || armaduraPorId(id)) {
  const base = x && porId(x.id);
  if (!base) return null;
  return `${base.nome}${x.melhoria ? ` +${x.melhoria}` : ''}${x.material ? ` de ${x.material}` : ''}`;
}
