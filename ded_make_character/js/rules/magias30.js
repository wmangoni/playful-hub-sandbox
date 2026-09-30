/**
 * Magias dos personagens do jogador na Arena (TASK_006 §5.7, etapa E7): a lista curada do Livro do
 * Jogador 3.0, com os números do SRD 3.0 calculados pelo nível de conjurador, os espaços do dia
 * (os de `spellcasting()` da ficha), a preparação padrão por classe e a conversão para o formato de
 * magias do catálogo (`magias.lista`), que o motor já sabe usar. Funções puras, sem DOM.
 *
 * Quem prepara (mago, clérigo, druida, paladino, ranger) escolhe quantas de cada magia em cada
 * espaço; quem conhece (feiticeiro, bardo) escolhe as conhecidas e as lança com qualquer espaço do
 * nível dela ou acima. O clérigo que não é maligno troca uma magia preparada por uma cura do mesmo
 * nível ou menor (3.0). Os espaços de domínio e as magias de nível 0 ficam de fora.
 */
const SRD = arquivo => `http://www.dragon.ee/30srd/${arquivo}.htm`;
const metros = m => `${String(Math.round(m * 10) / 10).replace('.', ',')} m`;
/** "1 minuto", "5 minutos" (o motor lê as durações com parseDuracao). */
const dur = (n, unidade) => `${n} ${unidade}${n === 1 ? '' : 's'}`;
/** Alcance curto do SRD (25 pés + 5 pés a cada 2 níveis), em metros. */
const curto = cl => 7.5 + 1.5 * Math.floor(cl / 2);
/** Alcance médio (100 pés + 10 pés por nível), em metros. */
const medio = cl => 30 + 3 * cl;

/**
 * A lista curada. `classes`: o nível da magia em cada classe (3.0). `mecanica(cl, ctx)` devolve a
 * mecânica no vocabulário do catálogo (`efeito: 'magia'`), já com os números deste nível de
 * conjurador; `ctx` traz o que depende do personagem (bônus de armadura, melhoria da arma).
 */
export const MAGIAS = [
  {
    id: 'misseis-magicos', nome: 'Mísseis Mágicos', classes: { fei: 1, mag: 1 }, fonte: SRD('spellsm'),
    resumo: 'Mísseis de energia que acertam sempre: 1d4+1 cada, um a mais a cada 2 níveis (máx. 5).',
    mecanica: cl => {
      const n = Math.min(5, Math.floor((cl + 1) / 2));
      return { efeito: 'magia', dano: `${n}d4+${n}`, tipo_energia: 'energia', resistencia: null, acerto_automatico: true };
    },
  },
  {
    id: 'maos-flamejantes', nome: 'Mãos Flamejantes', classes: { fei: 1, mag: 1 }, fonte: SRD('spellsb'),
    resumo: 'Leque de fogo de 3 m: 1d4 por nível (máx. 5d4), Reflexos para metade.',
    mecanica: cl => ({ efeito: 'magia', dano: `${Math.min(5, cl)}d4`, tipo_energia: 'fogo', area: 'semicírculo de 3 m', resistencia: 'ref', metade_se_passar: true }),
  },
  {
    id: 'armadura-arcana', nome: 'Armadura Arcana', classes: { bad: 1, fei: 1, mag: 1 }, fonte: SRD('spellsm'),
    resumo: '+4 de armadura na CA (não vale contra toque nem soma com a armadura vestida), por 1 hora por nível.',
    // bônus de armadura não somam (3.0): vale o maior, então só entra o que passa da armadura vestida
    mecanica: (cl, ctx) => {
      const ca = Math.max(0, 4 - (ctx.bonusArmadura || 0));
      return ca ? { efeito: 'magia', bonus: { ca_armadura: ca }, duracao: dur(cl, 'hora') } : null;
    },
    semEfeito: 'a armadura vestida já dá +4 ou mais',
  },
  {
    id: 'escudo-arcano', nome: 'Escudo Arcano', classes: { fei: 1, mag: 1 }, fonte: SRD('spellss'),
    resumo: 'Disco de força: +7 na CA e +3 em Reflexos contra áreas; anula Mísseis Mágicos.',
    // cobertura de três quartos (+7 na CA, também contra toque) de uma direção; aqui, de todas (§8.5)
    mecanica: cl => ({ efeito: 'magia', bonus: { ca: 7, ref_area: 3, anula: 'Mísseis Mágicos' }, duracao: dur(cl, 'minuto') }),
  },
  {
    id: 'arma-magica', nome: 'Arma Mágica', classes: { bad: 1, cle: 1, fei: 1, mag: 1, pal: 1 }, fonte: SRD('spellsm'),
    resumo: '+1 de melhoria no ataque e no dano da arma da mão principal (não soma com a melhoria da arma; vence RD x/+1).',
    mecanica: (cl, ctx) => {
      const arma = ctx.armaPrincipal;
      if (!arma || arma.desarmado || (arma.melhoria || 0) >= 1) return null;
      return { efeito: 'magia', bonus: { ataque: 1, dano: 1 }, melhoria_arma: 1, somente_arma: { id: arma.id, mao: 'principal', nome: arma.nome }, duracao: dur(cl, 'minuto') };
    },
    semEfeito: 'precisa de uma arma na mão principal sem bônus de melhoria (não vale em golpe desarmado)',
  },
  {
    id: 'bencao', nome: 'Bênção', classes: { cle: 1, pal: 1 }, fonte: SRD('spellsb'),
    resumo: 'Os aliados ganham +1 no ataque e +1 contra medo.',
    // bônus de moral: não soma com inspirar coragem (vale o maior)
    mecanica: cl => ({ efeito: 'magia', alvo: 'aliados', tipo_bonus: 'moral', bonus: { ataque: 1, contra_medo: 1 }, duracao: dur(cl, 'minuto') }),
  },
  {
    id: 'sono', nome: 'Sono', classes: { bad: 1, fei: 1, mag: 1, ran: 2 }, fonte: SRD('spellss'),
    resumo: 'Adormece 2d4 DV de criaturas (as de menos DV primeiro, nenhuma com 5 DV ou mais) numa explosão de 4,5 m (Vontade anula); ferir acorda.',
    mecanica: cl => ({ efeito: 'magia', area: 'raio 4,5 m', resistencia: 'von', condicao: 'inconsciente', duracao: dur(cl, 'minuto'), afeta: { dv_max: 4 }, limite_dv: '2d4' }),
  },
  {
    id: 'curar-leves', nome: 'Curar Ferimentos Leves', classes: { bad: 1, cle: 1, dru: 1, pal: 1, ran: 2 }, fonte: SRD('spellsc'),
    resumo: 'Cura 1d8 +1 por nível (máx. +5).',
    mecanica: cl => ({ efeito: 'magia', cura: `1d8+${Math.min(5, cl)}` }),
  },
  {
    id: 'esfera-flamejante', nome: 'Esfera Flamejante', classes: { dru: 2, fei: 2, mag: 2 }, fonte: SRD('spellsf'),
    resumo: 'Bola de fogo dirigida até um alvo por rodada, 1 rodada por nível: 2d6 de fogo (Reflexos anula).',
    mecanica: cl => ({ efeito: 'magia', dano: '2d6', tipo_energia: 'fogo', resistencia: 'ref', persistente: true, duracao: dur(cl, 'rodada') }),
  },
  {
    id: 'flecha-acida', nome: 'Flecha Ácida', classes: { fei: 2, mag: 2 }, fonte: SRD('spellsa'),
    resumo: 'Toque à distância: 2d4 de ácido, e mais 2d4 por rodada extra (1 a cada 3 níveis, máx. 7 rodadas).',
    // 2d4 ao acertar; o ácido dura 1 rodada a mais a cada 3 níveis (até o 18º: 7 rodadas no total)
    mecanica: cl => {
      const extras = Math.min(6, Math.floor(cl / 3));
      return { efeito: 'magia', dano: '2d4', tipo_energia: 'ácido', ataque: 'toque a distancia', resistencia: null, ...(extras ? { continuo: { dano: '2d4', tipo: 'ácido', rodadas: extras } } : {}) };
    },
  },
  {
    id: 'forca-do-touro', nome: 'Força do Touro', classes: { bad: 2, cle: 2, fei: 2, mag: 2 }, fonte: SRD('spellsb'),
    resumo: '+1d4+1 de Força, por 1 hora por nível.',
    mecanica: cl => ({ efeito: 'magia', bonus: { for: '1d4+1' }, duracao: dur(cl, 'hora') }),
  },
  {
    id: 'pele-de-arvore', nome: 'Pele de Árvore', classes: { dru: 2 }, fonte: SRD('spellsb'),
    resumo: '+3 de armadura natural na CA (+4 no 6º nível, +5 no 12º).',
    mecanica: cl => ({ efeito: 'magia', bonus: { ca_natural: cl >= 12 ? 5 : cl >= 6 ? 4 : 3 }, duracao: dur(10 * cl, 'minuto') }),
  },
  {
    id: 'produzir-chamas', nome: 'Produzir Chamas', classes: { dru: 2 }, fonte: SRD('spellsp'),
    resumo: 'Chamas na mão por 1 rodada por nível, arremessadas (toque à distância) a cada rodada: 1d4 +1 a cada 2 níveis (máx. +10) de fogo.',
    mecanica: cl => {
      const b = Math.min(10, Math.floor(cl / 2));
      return { efeito: 'magia', dano: b ? `1d4+${b}` : '1d4', tipo_energia: 'fogo', ataque: 'toque a distancia', resistencia: null, repete: true, duracao: dur(cl, 'rodada') };
    },
  },
  {
    id: 'curar-moderados', nome: 'Curar Ferimentos Moderados', classes: { bad: 2, cle: 2, dru: 3, pal: 3, ran: 3 }, fonte: SRD('spellsc'),
    resumo: 'Cura 2d8 +1 por nível (máx. +10).',
    mecanica: cl => ({ efeito: 'magia', cura: `2d8+${Math.min(10, cl)}` }),
  },
  {
    id: 'imobilizar-pessoa', nome: 'Imobilizar Pessoa', classes: { bad: 2, cle: 2, fei: 3, mag: 3 }, fonte: SRD('spellsh'),
    resumo: 'Um humanoide Médio ou menor fica imobilizado, 1 rodada por nível (Vontade anula).',
    mecanica: cl => ({ efeito: 'magia', resistencia: 'von', condicao: 'imobilizado', duracao: dur(cl, 'rodada'), afeta: { tipo: ['Humanoide'], tamanho_max: 'Médio' } }),
  },
  {
    id: 'bola-de-fogo', nome: 'Bola de Fogo', classes: { fei: 3, mag: 3 }, fonte: SRD('spellsf'),
    resumo: 'Explosão de 6 m: 1d6 por nível (máx. 10d6) de fogo, Reflexos para metade.',
    mecanica: cl => ({ efeito: 'magia', dano: `${Math.min(10, cl)}d6`, tipo_energia: 'fogo', area: 'raio 6 m', resistencia: 'ref', metade_se_passar: true }),
  },
  {
    id: 'relampago', nome: 'Relâmpago', classes: { fei: 3, mag: 3 }, fonte: SRD('spellsjkl'),
    resumo: 'Linha de 1,5 m até o alcance médio: 1d6 por nível (máx. 10d6) de eletricidade, Reflexos para metade.',
    mecanica: cl => ({ efeito: 'magia', dano: `${Math.min(10, cl)}d6`, tipo_energia: 'eletricidade', area: `linha 1,5 m × ${metros(medio(cl))}`, resistencia: 'ref', metade_se_passar: true }),
  },
  {
    id: 'curar-graves', nome: 'Curar Ferimentos Graves', classes: { bad: 3, cle: 3, dru: 4, pal: 4, ran: 4 }, fonte: SRD('spellsc'),
    resumo: 'Cura 3d8 +1 por nível (máx. +15).',
    mecanica: cl => ({ efeito: 'magia', cura: `3d8+${Math.min(15, cl)}` }),
  },
  {
    id: 'tempestade-glacial', nome: 'Tempestade Glacial', classes: { dru: 5, fei: 4, mag: 4 }, fonte: SRD('spellsi'),
    resumo: 'Granizo num cilindro de 6 m: 3d6 de impacto e 2d6 de frio, sem teste.',
    mecanica: () => ({ efeito: 'magia', dano: '3d6', dano_extra: [{ dano: '2d6', tipo: 'frio' }], area: 'cilindro de 6 m de raio', resistencia: null }),
  },
  {
    id: 'curar-criticos', nome: 'Curar Ferimentos Críticos', classes: { bad: 4, cle: 4, dru: 5 }, fonte: SRD('spellsc'),
    resumo: 'Cura 4d8 +1 por nível (máx. +20).',
    mecanica: cl => ({ efeito: 'magia', cura: `4d8+${Math.min(20, cl)}` }),
  },
  {
    id: 'coluna-de-chamas', nome: 'Coluna de Chamas', classes: { cle: 5, dru: 4 }, fonte: SRD('spellsf'),
    resumo: 'Cilindro de 3 m: 1d6 por nível (máx. 15d6), metade fogo e metade divino, Reflexos para metade.',
    mecanica: cl => ({ efeito: 'magia', dano: `${Math.min(15, cl)}d6`, tipo_energia: ['fogo', 'divino'], area: 'cilindro de 3 m de raio', resistencia: 'ref', metade_se_passar: true }),
  },
  {
    id: 'cone-de-frio', nome: 'Cone de Frio', classes: { fei: 5, mag: 5 }, fonte: SRD('spellsc'),
    resumo: 'Cone até o alcance curto: 1d6 por nível (máx. 15d6) de frio, Reflexos para metade.',
    mecanica: cl => ({ efeito: 'magia', dano: `${Math.min(15, cl)}d6`, tipo_energia: 'frio', area: `cone de ${metros(curto(cl))}`, resistencia: 'ref', metade_se_passar: true }),
  },
];

export const magiaPorId = id => MAGIAS.find(m => m.id === id) || null;
export const nivelNaClasse = (magia, classKey) => magia?.classes[classKey] ?? null;

/** Quem prepara e quem conhece (3.0). */
export const MODO = { mag: 'preparo', cle: 'preparo', dru: 'preparo', pal: 'preparo', ran: 'preparo', fei: 'conhece', bad: 'conhece' };
const ARCANOS = ['mag', 'fei', 'bad'];

/** Nível de conjurador (3.0): o nível da classe; paladino e ranger, metade dele. */
export const nivelDeConjurador = (classKey, nivel) => (['pal', 'ran'].includes(classKey) ? Math.floor(nivel / 2) : nivel);

/** Espaços do dia por nível de magia (1 a 9), com os adicionais do atributo; sem o de domínio. */
export function espacosDoDia(sheet) {
  const out = {};
  for (const n of sheet.magias?.niveis || []) if (n.nivel >= 1 && n.total > 0) out[n.nivel] = n.total;
  return out;
}

/** Magias conhecidas por nível (feiticeiro e bardo), pela tabela da classe. */
export function conhecidasDoNivel(sheet) {
  const out = {};
  for (const n of sheet.magias?.niveis || []) if (n.nivel >= 1 && n.conhecidas > 0 && n.total > 0) out[n.nivel] = n.conhecidas;
  return out;
}

/** As magias da lista para a classe, até o nível de magia `max`, por nível e nome. */
export const daClasse = (classKey, max = 9) => MAGIAS
  .filter(m => nivelNaClasse(m, classKey) != null && nivelNaClasse(m, classKey) <= max)
  .sort((x, y) => nivelNaClasse(x, classKey) - nivelNaClasse(y, classKey) || x.nome.localeCompare(y.nome, 'pt-BR'));

/**
 * Ordem da preparação padrão (e das conhecidas) por classe e nível de magia. Quem prepara segue a
 * sequência e, se sobram espaços, repete o último item (os reforços não somam consigo mesmos,
 * então não vale preparar dois). Nível sem sequência usa a do nível abaixo mais alto (3.0: dá para
 * preparar uma magia menor num espaço maior). Quem conhece pega os primeiros da lista do nível.
 */
const PADRAO = {
  mag: { 1: ['misseis-magicos', 'escudo-arcano', 'sono', 'misseis-magicos'], 2: ['flecha-acida', 'esfera-flamejante', 'flecha-acida'], 3: ['bola-de-fogo', 'relampago', 'imobilizar-pessoa', 'bola-de-fogo'], 4: ['tempestade-glacial'], 5: ['cone-de-frio'] },
  fei: { 1: ['misseis-magicos', 'escudo-arcano', 'sono', 'maos-flamejantes', 'armadura-arcana'], 2: ['flecha-acida', 'esfera-flamejante', 'forca-do-touro'], 3: ['bola-de-fogo', 'relampago', 'imobilizar-pessoa'], 4: ['tempestade-glacial'], 5: ['cone-de-frio'] },
  cle: { 1: ['bencao', 'arma-magica', 'curar-leves'], 2: ['imobilizar-pessoa', 'forca-do-touro', 'curar-moderados'], 3: ['curar-graves'], 4: ['curar-criticos'], 5: ['coluna-de-chamas'] },
  dru: { 1: ['curar-leves'], 2: ['produzir-chamas', 'pele-de-arvore', 'esfera-flamejante', 'produzir-chamas'], 3: ['curar-moderados'], 4: ['coluna-de-chamas', 'curar-graves', 'coluna-de-chamas'], 5: ['tempestade-glacial', 'curar-criticos', 'tempestade-glacial'] },
  pal: { 1: ['bencao', 'curar-leves', 'arma-magica', 'curar-leves'], 2: ['curar-leves'], 3: ['curar-moderados'], 4: ['curar-graves'] },
  ran: { 2: ['curar-leves', 'sono', 'curar-leves'], 3: ['curar-moderados'], 4: ['curar-graves'] },
  bad: { 1: ['curar-leves', 'sono', 'armadura-arcana', 'arma-magica'], 2: ['curar-moderados', 'imobilizar-pessoa', 'forca-do-touro'], 3: ['curar-graves'], 4: ['curar-criticos'] },
};

function sequencia(classKey, nivel) {
  const tabela = PADRAO[classKey] || {};
  for (let n = nivel; n >= 1; n--) if (tabela[n]) return tabela[n];
  return [];
}

/** Posição na lista curada: a ordem fixa das escolhas (padrão e normalizadas). */
const ORDEM = new Map(MAGIAS.map((m, i) => [m.id, i]));
const pelaLista = (x, y) => ORDEM.get(x) - ORDEM.get(y);

/** A i-ésima magia da preparação padrão: a sequência e, depois dela, o último item de novo. */
const daSequencia = (seq, i) => seq[Math.min(i, seq.length - 1)];

/**
 * Escolha padrão, no formato salvo em `fichas.magias`:
 * - quem prepara: `{ preparadas: { "1": { "misseis-magicos": 2, … }, … } }` (espaço → magia → quantas);
 * - quem conhece: `{ conhecidas: ["misseis-magicos", …] }`.
 */
export function magiasPadrao(sheet) {
  const ck = sheet.classKey;
  if (!MODO[ck]) return null;
  const espacos = espacosDoDia(sheet);
  if (MODO[ck] === 'conhece') {
    const conhecidas = [];
    for (const [nivel, n] of Object.entries(conhecidasDoNivel(sheet))) {
      const lista = (PADRAO[ck][nivel] || []).filter(id => nivelNaClasse(magiaPorId(id), ck) === Number(nivel));
      conhecidas.push(...lista.slice(0, n));
    }
    return { conhecidas: conhecidas.sort(pelaLista) };
  }
  const preparadas = {};
  for (const [nivel, total] of Object.entries(espacos)) {
    const seq = sequencia(ck, Number(nivel));
    if (!seq.length) continue;
    const conta = {};
    for (let i = 0; i < total; i++) conta[daSequencia(seq, i)] = (conta[daSequencia(seq, i)] || 0) + 1;
    preparadas[nivel] = Object.fromEntries(Object.keys(conta).sort(pelaLista).map(id => [id, conta[id]]));
  }
  return { preparadas };
}

/**
 * Normaliza o que veio do store: ids desconhecidos ou de outra classe saem, quantidades que passam
 * dos espaços são cortadas, conhecidas que passam do limite do nível saem. Sem nada salvo, o padrão.
 * A ordem sai sempre a da lista curada: a mesma escolha dá o mesmo JSON (o diálogo compara o antes
 * e o depois, e o lote da Arena usa a escolha na assinatura).
 */
export function normalizarMagias(salvo, sheet) {
  const ck = sheet.classKey;
  if (!MODO[ck]) return null;
  if (!salvo || typeof salvo !== 'object') return magiasPadrao(sheet);
  if (MODO[ck] === 'conhece') {
    if (!Array.isArray(salvo.conhecidas)) return magiasPadrao(sheet);
    const limite = conhecidasDoNivel(sheet);
    const porNivel = {};
    const conhecidas = [];
    for (const id of salvo.conhecidas) {
      const n = nivelNaClasse(magiaPorId(id), ck);
      if (n == null || !limite[n] || conhecidas.includes(id)) continue;
      porNivel[n] = (porNivel[n] || 0) + 1;
      if (porNivel[n] <= limite[n]) conhecidas.push(id);
    }
    return { conhecidas: conhecidas.sort(pelaLista) };
  }
  if (!salvo.preparadas || typeof salvo.preparadas !== 'object') return magiasPadrao(sheet);
  const espacos = espacosDoDia(sheet);
  const preparadas = {};
  for (const [nivel, total] of Object.entries(espacos)) {
    const conta = {};
    let usados = 0;
    for (const [id, qtd] of Object.entries(salvo.preparadas[nivel] || {})) {
      const n = nivelNaClasse(magiaPorId(id), ck);
      const q = Math.max(0, Math.floor(Number(qtd) || 0));
      if (n == null || n > Number(nivel) || !q) continue;
      const cabe = Math.min(q, total - usados);
      if (cabe > 0) conta[id] = cabe;
      usados += cabe;
    }
    const ids = Object.keys(conta).sort(pelaLista);
    if (ids.length) preparadas[nivel] = Object.fromEntries(ids.map(id => [id, conta[id]]));
  }
  return { preparadas };
}

/**
 * Alguma magia da lista cabe nos espaços deste personagem? O ranger do 4º ao 7º só tem espaços de
 * 1º nível, e as magias dele na lista começam no 2º: tem espaços, mas nada a escolher.
 */
export function temMagiasDaLista(sheet) {
  const ck = sheet.classKey;
  if (!MODO[ck]) return false;
  if (MODO[ck] === 'conhece') return Object.keys(conhecidasDoNivel(sheet)).some(n => daClasse(ck, Number(n)).some(m => nivelNaClasse(m, ck) === Number(n)));
  return Object.keys(espacosDoDia(sheet)).some(n => daClasse(ck, Number(n)).length > 0);
}

/** O clérigo que não é maligno converte magias preparadas em curas (3.0); o maligno, em infligir (fora da lista). */
export const converteEmCura = (classKey, tendencia) => classKey === 'cle' && !/M$/.test(String(tendencia || '').toUpperCase());

/**
 * Magias no formato do catálogo para o motor, mais o que avisar. `ctx`: { bonusArmadura,
 * armaPrincipal: { id, nome, desarmado, melhoria }, falhaArcana (armadura + escudo) }.
 * - `espacos`: um "poço" por nível de espaço (`n1`, `n2`…), gasto a cada magia lançada: os espaços
 *   do dia de quem conhece, ou as magias preparadas naquele nível;
 * - cada magia da lista diz de que poços pode sair (`espaco`, em ordem: o menor primeiro).
 */
export function magiasDeCombate({ sheet, escolha, tendencia, ctx = {} }) {
  const ck = sheet.classKey;
  const avisos = [];
  const espacos = espacosDoDia(sheet);
  if (!MODO[ck] || !Object.keys(espacos).length) return { magias: null, especiais: [], avisos };
  const cl = nivelDeConjurador(ck, sheet.nivel);
  const modAtributo = sheet.magias.modificador ?? 0;
  const e = normalizarMagias(escolha, sheet);
  // o "poço" de cada nível: quem conhece gasta os espaços do dia; quem prepara, só as magias que
  // preparou naquele nível (mesmo as que o simulador deixa de fora, como Arma Mágica com arma +1:
  // o clérigo pode trocá-las por cura). Um espaço vazio não vira cura (3.0: perde a preparada).
  const tamanho = MODO[ck] === 'conhece'
    ? espacos
    : Object.fromEntries(Object.entries(e.preparadas).map(([n, conta]) => [n, Object.values(conta).reduce((s, q) => s + q, 0)]));
  const pocos = Object.keys(tamanho).map(Number).filter(p => tamanho[p] > 0).sort((a, b) => a - b);
  const deAte = n => pocos.filter(p => p >= n).map(p => `n${p}`);
  const lista = [];
  const entrada = (magia, nivelMagia, quantidade, espaco) => {
    const mecanica = magia.mecanica(cl, ctx);
    if (!mecanica) {
      avisos.push(`${magia.nome} fica de fora: ${magia.semEfeito}`);
      return;
    }
    lista.push({ nome: magia.nome, nivel: nivelMagia, quantidade, espaco, mecanica, id: magia.id });
  };
  if (MODO[ck] === 'conhece') {
    for (const id of e.conhecidas) {
      const m = magiaPorId(id);
      entrada(m, nivelNaClasse(m, ck), 99, deAte(nivelNaClasse(m, ck)));
    }
  } else {
    for (const [nivel, conta] of Object.entries(e.preparadas)) {
      for (const [id, qtd] of Object.entries(conta)) {
        const m = magiaPorId(id);
        entrada(m, nivelNaClasse(m, ck), qtd, [`n${nivel}`]);
      }
    }
    if (converteEmCura(ck, tendencia)) {
      for (const m of daClasse(ck).filter(x => /^curar-/.test(x.id) && pocos.some(p => p >= nivelNaClasse(x, ck)))) {
        lista.push({ nome: m.nome, nivel: nivelNaClasse(m, ck), quantidade: 99, espaco: deAte(nivelNaClasse(m, ck)), mecanica: m.mecanica(cl, ctx), id: m.id, conversao: true });
      }
    }
  }
  const especiais = [];
  if (ARCANOS.includes(ck) && ctx.falhaArcana > 0) {
    especiais.push({ id: 'falha-arcana', nome: `Falha arcana da armadura (${ctx.falhaArcana}%)`, natureza: 'Ext', descricao: '', mecanica: { efeito: 'falha-de-magia', chance_pct: ctx.falhaArcana }, grupo: 'qualidade' });
    avisos.push(`de armadura ou escudo, as magias arcanas falham ${ctx.falhaArcana}% das vezes`);
  }
  return {
    magias: {
      classe: sheet.identidade.classe,
      nivel_conjurador: cl,
      atributo: sheet.magias.atributo,
      cd_base: 10 + modAtributo,
      espacos: Object.fromEntries(pocos.map(p => [`n${p}`, tamanho[p]])),
      lista,
    },
    especiais,
    avisos,
  };
}

/** "Mísseis Mágicos ×2, Escudo Arcano" (resumo das magias escolhidas para o cartão). */
export function resumoDasMagias(escolha, classKey) {
  if (!escolha) return '';
  if (escolha.conhecidas) return escolha.conhecidas.map(id => magiaPorId(id)?.nome).filter(Boolean).join(', ');
  const soma = {};
  for (const conta of Object.values(escolha.preparadas || {})) for (const [id, q] of Object.entries(conta)) soma[id] = (soma[id] || 0) + q;
  return Object.entries(soma)
    .sort((a, b) => nivelNaClasse(magiaPorId(a[0]), classKey) - nivelNaClasse(magiaPorId(b[0]), classKey))
    .map(([id, q]) => `${magiaPorId(id)?.nome}${q > 1 ? ` ×${q}` : ''}`)
    .join(', ');
}

const RESISTENCIA = { fort: 'Fortitude', ref: 'Reflexos', von: 'Vontade' };
const sinal = n => (typeof n === 'number' ? `${n < 0 ? '−' : '+'}${Math.abs(n)}` : `+${n}`);
const BONUS = {
  ca: v => `${sinal(v)} CA`,
  ca_armadura: v => `${sinal(v)} CA de armadura (não contra toque)`,
  ca_natural: v => `${sinal(v)} CA de armadura natural (não contra toque)`,
  ref_area: v => `${sinal(v)} em Reflexos contra área`,
  ataque: v => `${sinal(v)} no ataque`,
  dano: v => `${sinal(v)} no dano`,
  for: v => `${sinal(v)} de Força`,
  contra_medo: v => `${sinal(v)} contra medo`,
  anula: v => `anula ${v}`,
};

/**
 * Os números de uma magia, em uma linha: "5d6 de fogo · raio 6 m · Reflexos CD 16 para metade".
 * `cd`: a CD dela (cd_base + nível da magia).
 */
export function detalheDaMagia(m, cd) {
  if (!m) return '';
  const partes = [];
  const tipos = [].concat(m.tipo_energia || []);
  if (m.dano) partes.push(`${m.dano}${tipos.length ? ` de ${tipos.join(' e ')}` : ''}${(m.dano_extra || []).map(d => ` + ${d.dano} de ${d.tipo}`).join('')}`);
  if (m.continuo) partes.push(`mais ${m.continuo.dano} por rodada em ${m.continuo.rodadas === 1 ? '1 rodada' : `${m.continuo.rodadas} rodadas`}`);
  if (m.cura) partes.push(`cura ${m.cura}`);
  if (m.limite_dv) partes.push(`${m.limite_dv} DV`);
  if (m.condicao) partes.push(`${m.condicao}${m.duracao ? ` por ${m.duracao}` : ''}`);
  if (m.bonus) partes.push(Object.entries(m.bonus).map(([k, v]) => (BONUS[k] ? BONUS[k](v) : `${k} ${v}`)).join(', ') + (m.somente_arma ? ` (${m.somente_arma.nome})` : ''));
  if (m.alvo === 'aliados') partes.push('em todos os aliados');
  if (m.ataque) partes.push(m.ataque === 'toque a distancia' ? 'toque à distância' : m.ataque);
  if (m.acerto_automatico) partes.push('acerta sempre');
  if (m.area) partes.push(m.area);
  if (m.resistencia) partes.push(`${RESISTENCIA[m.resistencia]} CD ${cd} ${m.metade_se_passar ? 'para metade' : 'anula'}`);
  if ((m.bonus || m.persistente || m.repete) && m.duracao) partes.push(m.duracao);
  return partes.join(' · ');
}
