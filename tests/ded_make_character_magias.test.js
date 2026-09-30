/**
 * Testes das magias dos personagens do jogador (TASK_006 §5.7, etapa E7): a lista curada com os
 * números do SRD 3.0, os espaços do dia, a preparação padrão, e o que o motor faz com cada uma.
 * Executar: node tests/ded_make_character_magias.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
const rows = t => require(path.join(root, 'data', `${t}.json`)).rows;
const cat = require(path.join(root, 'data', 'catalogo-combate.json'));

/**
 * A linha "Level:" de cada magia no SRD 3.0 (dragon.ee/30srd/spells*.htm), transcrita. Os domínios
 * (Fire, Healing, Plant…) não contam: os espaços de domínio ficam de fora (§8.5).
 */
const SRD_NIVEL = {
  'misseis-magicos': 'Sor/Wiz 1',
  'maos-flamejantes': 'Fire 1, Sor/Wiz 1',
  'armadura-arcana': 'Brd 1, Sor/Wiz 1',
  'escudo-arcano': 'Sor/Wiz 1',
  'arma-magica': 'Brd 1, Clr 1, Pal 1, Sor/Wiz 1, War 1',
  bencao: 'Clr 1, Pal 1',
  sono: 'Brd 1, Rgr 2, Sor/Wiz 1',
  'curar-leves': 'Brd 1, Clr 1, Drd 1, Healing 1, Pal 1, Rgr 2',
  'esfera-flamejante': 'Drd 2, Sor/Wiz 2',
  'flecha-acida': 'Sor/Wiz 2',
  'forca-do-touro': 'Brd 2, Clr 2, Sor/Wiz 2, Strength 2',
  'pele-de-arvore': 'Drd 2, Plant 2',
  'produzir-chamas': 'Drd 2, Fire 2',
  'curar-moderados': 'Brd 2, Clr 2, Drd 3, Healing 2, Pal 3, Rgr 3',
  'imobilizar-pessoa': 'Brd 2, Clr 2, Sor/Wiz 3',
  'bola-de-fogo': 'Sor/Wiz 3',
  relampago: 'Sor/Wiz 3',
  'curar-graves': 'Brd 3, Clr 3, Drd 4, Pal 4, Rgr 4, Healing 3',
  'tempestade-glacial': 'Drd 5, Sor/Wiz 4, Water 5',
  'curar-criticos': 'Brd 4, Clr 4, Drd 5, Healing 4',
  'coluna-de-chamas': 'Clr 5, Drd 4, Sun 5, War 5',
  'cone-de-frio': 'Sor/Wiz 5, Water 6',
};
const CLASSE_SRD = { Brd: ['bad'], Clr: ['cle'], Drd: ['dru'], Pal: ['pal'], Rgr: ['ran'], 'Sor/Wiz': ['fei', 'mag'] };

async function run() {
  const { computeSheet } = await load('js/rules/dnd30.js');
  const { fromPersonagem } = await load('js/rules/personagem30.js');
  const M = await load('js/rules/magias30.js');
  const C = await load('js/rules/combat30.js');
  const SP = await load('js/rules/combat30-specials.js');
  const { scriptedRng } = await load('js/rules/dice.js');
  const K = C.rules;
  const [races, classes, bba, pericias] = ['races', 'classes', 'bba', 'pericias'].map(rows);
  const CLASSE = { barbaro: 1, bardo: 2, clerigo: 3, druida: 4, guerreiro: 5, monge: 6, paladino: 7, ranger: 8, ladino: 9, feiticeiro: 10, mago: 11 };
  const item = (id, melhoria = 0, material = null) => ({ id, melhoria, material });
  /** Personagem de teste: humano, For 12, Des 14, Con 14, Int 16, Sab 16, Car 16, 40 PV, NB. */
  function montar({ classe, nivel = 5, equipamento = null, magias = null, ...p }) {
    const personagem = { id: 99, nome: 'Conjurador', race_id: 1, classe_id: CLASSE[classe], tendencia: 'NB', nivel, for: 12, des: 14, con: 14, int: 16, sab: 16, car: 16, iniciativa: 0, pvs: 40, ...p };
    const sheet = computeSheet(personagem, { race: races.find(r => r.id === 1), classe: classes.find(c => c.id === personagem.classe_id), bbaRows: bba, pericias, escolhas: { ranks: {}, talentos: [] } });
    return { sheet, ...fromPersonagem({ personagem, sheet, talentos: [], equipamento, magias }) };
  }
  const entrada = id => [...cat.monstros, ...cat.holy_avenger].find(e => e.id === id);
  const ficha = (id, over = {}) => Object.assign(C.fromCatalog(entrada(id)), over);
  /** Alvo neutro: ogro de 1000 PV, sem RD nem especiais, Médio (para caber vários numa área). */
  const boneco = (over = {}) => ficha('ogro', { nome: 'Boneco', pvMax: 1000, rd: null, especiais: [], talentos: [], tamanho: 'Médio', espaco: 1.5, ...over });
  function luta(ladoA, ladoB, dados = [], distancia = 9) {
    const b = C.createBattle({ ladoA: [].concat(ladoA), ladoB: [].concat(ladoB), semente: 1, distancia });
    b.rng = scriptedRng(dados, 99);
    b.rodada = 2;
    return b;
  }
  const textos = b => b.eventos.map(e => e.texto).join('\n');
  /** Lista de magias sob medida para um combatente de teste (formato do motor). */
  const lista = (cl, espacos, entradas) => ({ classe: 'Mago', nivel_conjurador: cl, atributo: 'int', cd_base: 13, espacos, lista: entradas });
  const deLista = (id, cl, over = {}, ctx = {}) => ({ nome: M.magiaPorId(id).nome, nivel: M.magiaPorId(id).classes.mag ?? M.magiaPorId(id).classes.dru ?? M.magiaPorId(id).classes.cle, quantidade: 1, espaco: ['n1'], mecanica: M.magiaPorId(id).mecanica(cl, ctx), ...over });
  /** Conjura a primeira opção de magia com esse nome que a IA oferece. */
  function conjurar(b, c, nome, alvo = b.combatentes.find(x => x.lado !== c.lado)) {
    const acao = SP.options(K, b, c, alvo).find(o => o.tipo === 'magia' && o.s.nome === nome);
    assert.ok(acao, `${c.nome} deveria poder conjurar ${nome}`);
    SP.execute(K, b, c, acao);
    return acao;
  }
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Magias dos personagens (E7) ---');

  test('lista curada: as 22 magias de §5.7, com a URL do SRD 3.0 e o nível de cada classe igual à linha "Level:" do SRD', () => {
    assert.strictEqual(M.MAGIAS.length, 22);
    assert.deepStrictEqual(M.MAGIAS.map(m => m.id).sort(), Object.keys(SRD_NIVEL).sort());
    for (const m of M.MAGIAS) {
      const esperado = {};
      for (const parte of SRD_NIVEL[m.id].split(', ')) {
        const [classe, nivel] = [parte.slice(0, parte.lastIndexOf(' ')), Number(parte.slice(parte.lastIndexOf(' ') + 1))];
        for (const ck of CLASSE_SRD[classe] || []) esperado[ck] = nivel;
      }
      assert.deepStrictEqual(m.classes, esperado, m.id);
      assert.match(m.fonte, /^http:\/\/www\.dragon\.ee\/30srd\/spells[a-z]+\.htm$/, m.id);
      assert.ok(m.resumo && m.nome, m.id);
    }
  });

  test('fórmulas do SRD 3.0 por nível de conjurador: dano por nível e limites, área, resistência', () => {
    const mec = (id, cl, ctx = {}) => M.magiaPorId(id).mecanica(cl, ctx);
    // Mísseis Mágicos: 1 míssil + 1 a cada 2 níveis depois do 1º (máx. 5 no 9º)
    assert.deepStrictEqual([1, 2, 3, 5, 7, 9, 20].map(cl => mec('misseis-magicos', cl).dano), ['1d4+1', '1d4+1', '2d4+2', '3d4+3', '4d4+4', '5d4+5', '5d4+5']);
    assert.strictEqual(mec('misseis-magicos', 1).acerto_automatico, true);
    // Mãos Flamejantes: 1d4 por nível (máx. 5d4), semicírculo de 3 m, Reflexos metade
    assert.deepStrictEqual([1, 5, 9].map(cl => mec('maos-flamejantes', cl).dano), ['1d4', '5d4', '5d4']);
    assert.deepStrictEqual([mec('maos-flamejantes', 3).area, mec('maos-flamejantes', 3).resistencia, mec('maos-flamejantes', 3).metade_se_passar], ['semicírculo de 3 m', 'ref', true]);
    // Bola de Fogo e Relâmpago: 1d6 por nível (máx. 10d6); o relâmpago até o alcance médio (30 m + 3 m/nível)
    assert.deepStrictEqual([5, 10, 15].map(cl => mec('bola-de-fogo', cl).dano), ['5d6', '10d6', '10d6']);
    assert.strictEqual(mec('bola-de-fogo', 5).area, 'raio 6 m');
    assert.deepStrictEqual([5, 12].map(cl => [mec('relampago', cl).dano, mec('relampago', cl).area]), [['5d6', 'linha 1,5 m × 45 m'], ['10d6', 'linha 1,5 m × 66 m']]);
    // Cone de Frio: 1d6 por nível (máx. 15d6), cone até o alcance curto (7,5 m + 1,5 m a cada 2 níveis)
    assert.deepStrictEqual([9, 15, 20].map(cl => [mec('cone-de-frio', cl).dano, mec('cone-de-frio', cl).area]), [['9d6', 'cone de 13,5 m'], ['15d6', 'cone de 18 m'], ['15d6', 'cone de 22,5 m']]);
    // Coluna de Chamas: 1d6 por nível (máx. 15d6), metade fogo e metade divino, cilindro de 3 m de raio
    assert.deepStrictEqual([mec('coluna-de-chamas', 9).dano, mec('coluna-de-chamas', 20).dano], ['9d6', '15d6']);
    assert.deepStrictEqual(mec('coluna-de-chamas', 9).tipo_energia, ['fogo', 'divino']);
    assert.strictEqual(K.parseArea(mec('coluna-de-chamas', 9).area).tamanho, 3);
    // Tempestade Glacial: 3d6 de impacto + 2d6 de frio, sem teste, cilindro de 6 m de raio
    const tg = mec('tempestade-glacial', 7);
    assert.deepStrictEqual([tg.dano, tg.dano_extra, tg.resistencia, K.parseArea(tg.area).tamanho], ['3d6', [{ dano: '2d6', tipo: 'frio' }], null, 6]);
    // curas: 1d8 +1/nível (máx. +5), 2d8 (+10), 3d8 (+15), 4d8 (+20)
    assert.deepStrictEqual([1, 5, 9].map(cl => mec('curar-leves', cl).cura), ['1d8+1', '1d8+5', '1d8+5']);
    assert.deepStrictEqual([3, 10, 12].map(cl => mec('curar-moderados', cl).cura), ['2d8+3', '2d8+10', '2d8+10']);
    assert.deepStrictEqual([5, 15, 20].map(cl => mec('curar-graves', cl).cura), ['3d8+5', '3d8+15', '3d8+15']);
    assert.deepStrictEqual([7, 20].map(cl => mec('curar-criticos', cl).cura), ['4d8+7', '4d8+20']);
    // Flecha Ácida: 2d4 no toque à distância; +1 rodada de 2d4 a cada 3 níveis (7 rodadas no 18º)
    assert.deepStrictEqual([mec('flecha-acida', 3).dano, mec('flecha-acida', 3).ataque], ['2d4', 'toque a distancia']);
    assert.deepStrictEqual([2, 3, 6, 18, 20].map(cl => mec('flecha-acida', cl).continuo?.rodadas ?? 0), [0, 1, 2, 6, 6]);
    // Produzir Chamas: 1d4 +1 a cada 2 níveis (máx. +10), 1 rodada por nível
    assert.deepStrictEqual([1, 3, 20].map(cl => mec('produzir-chamas', cl).dano), ['1d4', '1d4+1', '1d4+10']);
    assert.deepStrictEqual([mec('produzir-chamas', 4).repete, mec('produzir-chamas', 4).duracao], [true, '4 rodadas']);
    // Esfera Flamejante: 2d6 de fogo, Reflexos anula, 1 rodada por nível
    assert.deepStrictEqual([mec('esfera-flamejante', 1).duracao, mec('esfera-flamejante', 5).persistente, mec('esfera-flamejante', 5).metade_se_passar], ['1 rodada', true, undefined]);
    // Pele de Árvore: +3 de armadura natural, +4 no 6º, +5 no 12º
    assert.deepStrictEqual([3, 5, 6, 11, 12].map(cl => mec('pele-de-arvore', cl).bonus.ca_natural), [3, 3, 4, 4, 5]);
    // Sono: 2d4 DV, nenhuma criatura com 5 DV ou mais; Imobilizar Pessoa: humanoide Médio ou menor
    assert.deepStrictEqual([mec('sono', 3).limite_dv, mec('sono', 3).afeta, mec('sono', 3).resistencia], ['2d4', { dv_max: 4 }, 'von']);
    assert.deepStrictEqual([mec('imobilizar-pessoa', 5).afeta, mec('imobilizar-pessoa', 5).duracao], [{ tipo: ['Humanoide'], tamanho_max: 'Médio' }, '5 rodadas']);
    // reforços: Armadura Arcana (+4 de armadura, não soma com a vestida), Escudo Arcano, Arma Mágica, Bênção, Força do Touro
    assert.deepStrictEqual([0, 2, 4, 6].map(ca => mec('armadura-arcana', 3, { bonusArmadura: ca })?.bonus.ca_armadura ?? null), [4, 2, null, null]);
    assert.deepStrictEqual(mec('escudo-arcano', 3).bonus, { ca: 7, ref_area: 3, anula: 'Mísseis Mágicos' });
    const espada = { id: 'espada-longa', nome: 'Espada longa', melhoria: 0 };
    assert.deepStrictEqual(mec('arma-magica', 3, { armaPrincipal: espada }).somente_arma, { id: 'espada-longa', mao: 'principal', nome: 'Espada longa' });
    assert.strictEqual(mec('arma-magica', 3, { armaPrincipal: { ...espada, melhoria: 1 } }), null, 'não soma com a melhoria da arma');
    assert.strictEqual(mec('arma-magica', 3, { armaPrincipal: { id: 'desarmado', desarmado: true } }), null, 'não vale em golpe desarmado');
    assert.deepStrictEqual([mec('bencao', 3).alvo, mec('bencao', 3).tipo_bonus, mec('bencao', 3).bonus], ['aliados', 'moral', { ataque: 1, contra_medo: 1 }]);
    assert.deepStrictEqual([mec('forca-do-touro', 1).bonus.for, mec('forca-do-touro', 1).duracao], ['1d4+1', '1 hora']);
  });

  test('nível de conjurador e espaços do dia (spellcasting): sem nível 0 nem domínio; paladino e ranger com metade do nível', () => {
    assert.deepStrictEqual([M.nivelDeConjurador('mag', 5), M.nivelDeConjurador('pal', 9), M.nivelDeConjurador('ran', 4)], [5, 4, 2]);
    // mago 5 com Int 16: 3/2/1 da tabela + 1 por nível do atributo
    assert.deepStrictEqual(M.espacosDoDia(montar({ classe: 'mago' }).sheet), { 1: 4, 2: 3, 3: 2 });
    // Int 12 não conjura magias de 3º nível (precisa de 13)
    assert.deepStrictEqual(M.espacosDoDia(montar({ classe: 'mago', int: 12 }).sheet), { 1: 4, 2: 2 });
    // clérigo 5: o espaço de domínio não entra
    assert.deepStrictEqual(M.espacosDoDia(montar({ classe: 'clerigo' }).sheet), { 1: 4, 2: 3, 3: 2 });
    // paladino 3 não conjura; no 4º, só o espaço extra da Sabedoria
    assert.strictEqual(montar({ classe: 'paladino', nivel: 3 }).ficha.magias, null);
    const pal = montar({ classe: 'paladino', nivel: 4 }).ficha.magias;
    assert.deepStrictEqual([pal.espacos, pal.nivel_conjurador], [{ n1: 1 }, 2]);
    assert.strictEqual(montar({ classe: 'guerreiro' }).ficha.magias, null);
    // o ranger 5 tem espaços de 1º nível, e as magias dele na lista começam no 2º
    assert.deepStrictEqual([M.espacosDoDia(montar({ classe: 'ranger' }).sheet), M.temMagiasDaLista(montar({ classe: 'ranger' }).sheet)], [{ 1: 1 }, false]);
    assert.ok(M.temMagiasDaLista(montar({ classe: 'ranger', nivel: 8 }).sheet));
    assert.ok(M.temMagiasDaLista(montar({ classe: 'feiticeiro', nivel: 6 }).sheet));
    assert.ok(!M.temMagiasDaLista(montar({ classe: 'guerreiro' }).sheet));
  });

  test('preparação padrão (quem prepara) e conhecidas (feiticeiro e bardo): enchem os espaços, sem repetir reforço à toa', () => {
    const mago = montar({ classe: 'mago' }).sheet;
    assert.deepStrictEqual(M.magiasPadrao(mago).preparadas, {
      1: { 'misseis-magicos': 2, 'escudo-arcano': 1, sono: 1 },
      2: { 'flecha-acida': 2, 'esfera-flamejante': 1 },
      3: { 'bola-de-fogo': 1, relampago: 1 },
    });
    const cle = M.magiasPadrao(montar({ classe: 'clerigo' }).sheet).preparadas;
    assert.deepStrictEqual(cle[1], { bencao: 1, 'arma-magica': 1, 'curar-leves': 2 });
    // o paladino prepara magias de 1º nos espaços de 2º (não há de 2º na lista)
    assert.deepStrictEqual(M.magiasPadrao(montar({ classe: 'paladino', nivel: 8 }).sheet).preparadas, { 1: { bencao: 1, 'curar-leves': 1 }, 2: { 'curar-leves': 1 } }, 'sem uma segunda Bênção (reforço não soma consigo)');
    const fei = montar({ classe: 'feiticeiro', nivel: 6 }).sheet;
    assert.deepStrictEqual(M.magiasPadrao(fei).conhecidas, ['misseis-magicos', 'maos-flamejantes', 'escudo-arcano', 'sono', 'esfera-flamejante', 'flecha-acida', 'bola-de-fogo'], 'as primeiras de cada nível, na ordem da lista curada');
    assert.strictEqual(M.magiasPadrao(montar({ classe: 'guerreiro' }).sheet), null);
  });

  test('escolha salva normalizada: id desconhecido ou de outra classe sai, magia maior que o espaço sai, o excesso é cortado', () => {
    const mago = montar({ classe: 'mago' }).sheet;
    const salvo = { preparadas: { 1: { 'bola-de-fogo': 1, 'misseis-magicos': 9, 'nao-existe': 1, 'curar-leves': 1 }, 3: { 'misseis-magicos': 2 }, 7: { 'misseis-magicos': 1 } } };
    assert.deepStrictEqual(M.normalizarMagias(salvo, mago), { preparadas: { 1: { 'misseis-magicos': 4 }, 3: { 'misseis-magicos': 2 } } });
    assert.deepStrictEqual(M.normalizarMagias('lixo', mago), M.magiasPadrao(mago), 'sem escolha válida, o padrão');
    assert.deepStrictEqual(M.normalizarMagias({ preparadas: {} }, mago), { preparadas: {} }, 'nada preparado é uma escolha');
    const fei = montar({ classe: 'feiticeiro', nivel: 6 }).sheet; // conhece 4 de 1º, 2 de 2º, 1 de 3º
    const conhecidas = ['bola-de-fogo', 'relampago', 'misseis-magicos', 'misseis-magicos', 'curar-leves', 'sono', 'escudo-arcano', 'maos-flamejantes', 'armadura-arcana'];
    assert.deepStrictEqual(M.normalizarMagias({ conhecidas }, fei).conhecidas, ['misseis-magicos', 'maos-flamejantes', 'escudo-arcano', 'sono', 'bola-de-fogo'], 'as 4 primeiras de 1º (a Armadura Arcana passa do limite), na ordem da lista curada');
    // a mesma escolha, em outra ordem, dá o mesmo JSON (o diálogo e a assinatura do lote comparam o JSON)
    const json = x => JSON.stringify(x);
    const padrao = M.magiasPadrao(fei);
    assert.strictEqual(json(M.normalizarMagias({ conhecidas: [...padrao.conhecidas].reverse() }, fei)), json(M.normalizarMagias(padrao, fei)));
    const prep = M.magiasPadrao(mago);
    const invertida = { preparadas: Object.fromEntries(Object.entries(prep.preparadas).reverse().map(([n, conta]) => [n, Object.fromEntries(Object.entries(conta).reverse())])) };
    assert.strictEqual(json(M.normalizarMagias(invertida, mago)), json(M.normalizarMagias(prep, mago)));
    // o padrão já sai normalizado: desfazer uma mudança sobre ele volta ao mesmo JSON
    for (const sheet of [mago, fei, montar({ classe: 'clerigo', nivel: 9 }).sheet, montar({ classe: 'bardo', nivel: 7 }).sheet]) {
      assert.strictEqual(json(M.magiasPadrao(sheet)), json(M.normalizarMagias(M.magiasPadrao(sheet), sheet)), sheet.classKey);
    }
  });

  test('adaptador: CD pelo nível da magia (também num espaço maior), conversão do clérigo em curas, falha arcana da armadura e do escudo', () => {
    const { ficha } = montar({ classe: 'mago', magias: { preparadas: { 3: { 'misseis-magicos': 1, 'bola-de-fogo': 1 } } } });
    assert.strictEqual(ficha.magias.cd_base, 13, '10 + Int 3');
    const mm = ficha.magias.lista.find(s => s.nome === 'Mísseis Mágicos');
    assert.deepStrictEqual([mm.nivel, mm.espaco, mm.quantidade], [1, ['n3'], 1]);
    // no motor: Sono num espaço de 3º tem a CD de 1º (13 + 1), e o teste de Vontade usa essa CD
    const sonoNo3 = montar({ classe: 'mago', magias: { preparadas: { 3: { sono: 1 } } } }).ficha;
    const bs = luta(sonoNo3, boneco({ nome: 'Fraco', dv: 2 }), [2, 2, 1]);
    const opcao = SP.options(K, bs, bs.get('A1'), bs.get('B1')).find(o => o.tipo === 'magia' && o.s.nome === 'Sono');
    assert.deepStrictEqual([opcao.s.cd, opcao.s.espaco], [14, 'n3']);
    SP.execute(K, bs, bs.get('A1'), opcao);
    assert.match(textos(bs), /conjura Sono \(espaço de 3º nível; 2d4 = 4 DV\) em Fraco\./);
    assert.match(textos(bs), /Fraco falha em Vontade \(Sono\): 1 \+ 1 = 2 contra CD 14/);
    // clérigo bom (ou neutro): cada cura da lista também sai de qualquer espaço do nível dela ou maior
    const cle = montar({ classe: 'clerigo' }).ficha.magias.lista.filter(s => s.conversao);
    assert.deepStrictEqual(cle.map(s => [s.nome, s.quantidade, s.espaco]), [
      ['Curar Ferimentos Leves', 99, ['n1', 'n2', 'n3']],
      ['Curar Ferimentos Moderados', 99, ['n2', 'n3']],
      ['Curar Ferimentos Graves', 99, ['n3']],
    ]);
    assert.ok(montar({ classe: 'clerigo', tendencia: 'N' }).ficha.magias.lista.some(s => s.conversao));
    // na luta, cada nível tem tantos espaços quanto magias preparadas nele: um espaço vazio não vira cura
    const soNoPrimeiro = montar({ classe: 'clerigo', magias: { preparadas: { 1: { bencao: 1, 'curar-leves': 1 } } } }).ficha.magias;
    assert.deepStrictEqual(soNoPrimeiro.espacos, { n1: 2 });
    assert.deepStrictEqual(soNoPrimeiro.lista.filter(s => s.conversao).map(s => [s.nome, s.espaco]), [['Curar Ferimentos Leves', ['n1']]]);
    const nada = montar({ classe: 'clerigo', magias: { preparadas: {} } }).ficha.magias;
    assert.deepStrictEqual([nada.espacos, nada.lista], [{}, []], 'nada preparado: nada a converter');
    // a preparada que o simulador deixa de fora (Arma Mágica com arma +1) ainda pode virar cura
    const comArmaMagica = montar({ classe: 'clerigo', equipamento: { principal: item('maca-pesada', 1) }, magias: { preparadas: { 1: { 'arma-magica': 1 } } } }).ficha.magias;
    assert.deepStrictEqual([comArmaMagica.espacos, comArmaMagica.lista.map(s => s.nome)], [{ n1: 1 }, ['Curar Ferimentos Leves']]);
    assert.ok(!montar({ classe: 'clerigo', tendencia: 'CM' }).ficha.magias.lista.some(s => s.conversao), 'o maligno converte em infligir (fora da lista)');
    // feiticeiro: conhecidas lançadas de qualquer espaço do nível delas ou acima
    const fei = montar({ classe: 'feiticeiro', nivel: 6 }).ficha.magias.lista;
    assert.deepStrictEqual(fei.find(s => s.nome === 'Flecha Ácida').espaco, ['n2', 'n3']);
    // mago de couro e broquel: 10% + 5% de falha arcana; clérigo de armadura, nenhuma
    const blindado = montar({ classe: 'mago', equipamento: { principal: item('adaga'), armadura: item('couro'), escudo: item('broquel') } });
    assert.deepStrictEqual(blindado.ficha.especiais.find(e => e.id === 'falha-arcana').mecanica, { efeito: 'falha-de-magia', chance_pct: 15 });
    assert.ok(blindado.avisos.some(a => /15%/.test(a)));
    assert.ok(!montar({ classe: 'clerigo' }).ficha.especiais.some(e => e.id === 'falha-arcana'));
    // Arma Mágica fica de fora com arma +1, com aviso; os ataques dizem de que arma e mão são
    const cleMagico = montar({ classe: 'clerigo', equipamento: { principal: item('maca-pesada', 1) } });
    assert.ok(!cleMagico.ficha.magias.lista.some(s => s.nome === 'Arma Mágica'));
    assert.ok(cleMagico.avisos.some(a => /Arma Mágica fica de fora/.test(a)));
    assert.deepStrictEqual([cleMagico.ficha.ataques[0].arma_id, cleMagico.ficha.ataques[0].mao], ['maca-pesada', 'principal']);
    // bardo de couro: Armadura Arcana só soma o que passa da armadura (+4 − 2)
    const bardo = montar({ classe: 'bardo', nivel: 4, equipamento: { armadura: item('couro') }, magias: { conhecidas: ['armadura-arcana'] } }).ficha.magias.lista;
    assert.deepStrictEqual(bardo[0].mecanica.bonus, { ca_armadura: 2 });
    // druida (3.0): de armadura de metal ou com arma fora da lista dele, não conjura
    assert.ok(montar({ classe: 'druida' }).ficha.magias, 'o kit do druida (couro de peles, escudo de madeira, cimitarra) não tira as magias');
    const metal = montar({ classe: 'druida', equipamento: { armadura: item('camisao-de-malha') } });
    assert.strictEqual(metal.ficha.magias, null);
    assert.ok(metal.avisos.some(a => /de metal: o druida que a usa perde as magias/.test(a)));
    const espada = montar({ classe: 'druida', equipamento: { principal: item('espada-longa') } });
    assert.strictEqual(espada.ficha.magias, null);
    assert.ok(espada.avisos.some(a => /juramento do druida proíbe/.test(a)));
  });

  test('motor: espaços por nível compartilhados; o espontâneo usa o menor livre e depois um maior (registro diz o espaço)', () => {
    const mm = deLista('misseis-magicos', 3, { quantidade: 99, espaco: ['n1', 'n2'] });
    const b = luta(boneco({ nome: 'Feiticeiro', magias: lista(3, { n1: 1, n2: 1 }, [mm]) }), boneco());
    const c = b.get('A1');
    conjurar(b, c, 'Mísseis Mágicos');
    assert.deepStrictEqual(c.espacosRestantes, { n1: 0, n2: 1 });
    conjurar(b, c, 'Mísseis Mágicos');
    assert.deepStrictEqual(c.espacosRestantes, { n1: 0, n2: 0 });
    assert.match(textos(b), /conjura Mísseis Mágicos \(espaço de 2º nível\) em Boneco/);
    assert.ok(!SP.options(K, b, c, b.get('B1')).some(o => o.tipo === 'magia'), 'sem espaço, sem magia');
  });

  test('motor: o clérigo converte uma magia preparada em cura (gasta o espaço, e a preparada que sobrar se perde)', () => {
    const bencao = deLista('bencao', 3, { quantidade: 1, espaco: ['n1'] });
    const cura = deLista('curar-leves', 3, { quantidade: 99, espaco: ['n1'], conversao: true });
    const b = luta(boneco({ nome: 'Clérigo', pvMax: 40, magias: lista(3, { n1: 1 }, [bencao, cura]) }), boneco(), [5]);
    const c = b.get('A1');
    c.pv = 10;
    const acao = SP.options(K, b, c, b.get('B1')).sort((x, y) => (y.prioridade || 0) - (x.prioridade || 0))[0];
    assert.strictEqual(acao.s.nome, 'Curar Ferimentos Leves');
    SP.execute(K, b, c, acao);
    assert.strictEqual(c.pv, 10 + 5 + 3);
    assert.ok(!SP.options(K, b, c, b.get('B1')).some(o => o.tipo === 'magia'), 'a Bênção preparada se perdeu com o espaço');
  });

  test('motor: Força do Touro rola 1d4+1; Bênção não soma com inspirar coragem (moral); a mesma magia renova em vez de somar', () => {
    const ft = deLista('forca-do-touro', 3, { nivel: 2, espaco: ['n2'] });
    const escudo = deLista('escudo-arcano', 3, { quantidade: 2 });
    const b = luta(boneco({ nome: 'Mago', atributos: { ...entrada('ogro').atributos, for: 10 }, magias: lista(3, { n1: 2, n2: 1 }, [ft, escudo]) }), boneco(), [3]);
    const c = b.get('A1');
    SP.execute(K, b, c, { tipo: 'magia', s: { tipo: 'lista', idx: 0, nome: ft.nome, nivel: 2, m: ft.mecanica, natureza: 'magia', cl: 3, cd: 15, espaco: 'n2' }, alvo: c });
    assert.strictEqual(c.buffs[0].atributos.for, 4);
    assert.strictEqual(K.deltaMod(c, 'for'), 2, 'For 10 → 14');
    assert.match(textos(b), /Força do Touro \(1d4\+1 = \+4 de Força; 1800 rodadas\)/);
    const s = { tipo: 'lista', idx: 1, nome: escudo.nome, nivel: 1, m: escudo.mecanica, natureza: 'magia', cl: 3, cd: 14, espaco: 'n1' };
    SP.execute(K, b, c, { tipo: 'magia', s, alvo: c });
    SP.execute(K, b, c, { tipo: 'magia', s, alvo: c });
    assert.strictEqual(K.somaBuff(c, 'ca'), 7, 'dois Escudos Arcanos não somam');
    assert.match(textos(b), /renova a duração/);
    // moral: vale o maior; sem tipo, soma
    c.buffs.push({ rotulo: 'Bênção', tipo_bonus: 'moral', bonus: { ataque: 1 }, expira: Infinity });
    c.buffs.push({ rotulo: 'Inspirar coragem', tipo_bonus: 'moral', bonus: { ataque: 1, dano: 1 }, expira: Infinity });
    assert.strictEqual(K.somaBuff(c, 'ataque'), 1);
    c.buffs.push({ rotulo: 'Favor Divino', bonus: { ataque: 3 }, expira: Infinity });
    assert.strictEqual(K.somaBuff(c, 'ataque'), 4);
  });

  test('motor: Armadura Arcana não vale contra toque; Escudo Arcano dá +3 em Reflexos só contra área e barra Mísseis Mágicos', () => {
    const b = luta(boneco(), boneco(), [10, 10]);
    const [a, alvo] = [b.get('A1'), b.get('B1')];
    const base = { normal: K.caContra(b, alvo, a, { tipo: 'corpo a corpo' }), toque: K.caContra(b, alvo, a, { tipo: 'toque' }) };
    alvo.buffs.push({ rotulo: 'Armadura Arcana', bonus: { ca_armadura: 4 }, expira: Infinity });
    assert.deepStrictEqual([K.caContra(b, alvo, a, { tipo: 'corpo a corpo' }), K.caContra(b, alvo, a, { tipo: 'toque' })], [base.normal + 4, base.toque]);
    alvo.buffs.push({ rotulo: 'Escudo Arcano', bonus: { ca: 7, ref_area: 3, anula: 'Mísseis Mágicos' }, expira: Infinity });
    assert.strictEqual(K.caContra(b, alvo, a, { tipo: 'toque' }), base.toque + 7, 'a cobertura vale contra toque');
    const ref = alvo.resistencias.ref;
    assert.strictEqual(K.teste(b, alvo, 'ref', 99, { area: true }).total, 10 + ref + 3);
    assert.strictEqual(K.teste(b, alvo, 'ref', 99).total, 10 + ref);
    const mm = deLista('misseis-magicos', 5);
    const b2 = luta(boneco({ magias: lista(5, { n1: 1 }, [mm]) }), boneco({ nome: 'Protegido' }));
    b2.get('B1').buffs.push({ rotulo: 'Escudo Arcano', bonus: { ca: 7, anula: 'Mísseis Mágicos' }, expira: Infinity });
    // a IA sabe que o escudo barra os mísseis e não gasta a magia
    assert.ok(!SP.options(K, b2, b2.get('A1'), b2.get('B1')).some(o => o.tipo === 'magia'));
    // se mesmo assim conjurar, o escudo barra
    SP.execute(K, b2, b2.get('A1'), { tipo: 'magia', s: { tipo: 'lista', idx: 0, nome: mm.nome, nivel: 1, m: mm.mecanica, natureza: 'magia', cl: 5, cd: 14, espaco: 'n1' }, alvo: b2.get('B1') });
    assert.match(textos(b2), /Protegido está protegido contra Mísseis Mágicos/);
    assert.strictEqual(b2.get('B1').pv, 1000);
  });

  test('motor: Arma Mágica só na arma da mão principal, e vence RD x/+1', () => {
    const { ficha } = montar({ classe: 'guerreiro', equipamento: { principal: item('espada-curta'), secundaria: item('adaga'), escudo: null } });
    const b = luta(ficha, boneco({ rd: { valor: 10, exceto: '+1' } }));
    const [c, alvo] = [b.get('A1'), b.get('B1')];
    const principal = c.ataqueTotal.find(x => x.mao === 'principal');
    const inabil = c.ataqueTotal.find(x => x.mao === 'inabil');
    const antes = [K.modsDeAtaque(b, c, alvo, principal).total, K.modsDeAtaque(b, c, alvo, inabil).total];
    assert.strictEqual(K.venceRD(c, principal, alvo.rd), false);
    const m = M.magiaPorId('arma-magica').mecanica(5, { armaPrincipal: { id: 'espada-curta', nome: 'Espada curta', melhoria: 0 } });
    SP.execute(K, b, c, { tipo: 'magia', s: { tipo: 'lista', idx: 0, nome: 'Arma Mágica', nivel: 1, m, natureza: 'magia', cl: 5, cd: 11 }, alvo: c });
    assert.deepStrictEqual([K.modsDeAtaque(b, c, alvo, principal).total, K.modsDeAtaque(b, c, alvo, inabil).total], [antes[0] + 1, antes[1]]);
    assert.strictEqual(K.modsDeDano(b, c, alvo, principal) - K.modsDeDano(b, c, alvo, inabil), 1);
    assert.strictEqual(K.venceRD(c, principal, alvo.rd), true);
    assert.strictEqual(K.venceRD(c, inabil, alvo.rd), false);
    assert.match(textos(b), /conjura Arma Mágica \(Espada curta; 50 rodadas\)/);
  });

  test('motor: Flecha Ácida continua nas rodadas seguintes (no turno do alvo), e acaba sozinha', () => {
    const fa = deLista('flecha-acida', 6, { nivel: 2, espaco: ['n2'] });
    // ataque de toque 20 (acerta), dano 2d4 = 1 + 1; depois 2 rodadas de 2d4 = 2 + 2 e 3 + 3
    const b = luta(boneco({ magias: lista(6, { n2: 1 }, [fa]) }), boneco({ nome: 'Alvo' }), [20, 1, 1, 2, 2, 3, 3]);
    const alvo = b.get('B1');
    conjurar(b, b.get('A1'), 'Flecha Ácida');
    assert.strictEqual(alvo.pv, 998);
    assert.match(textos(b), /Flecha Ácida continua a ferir Alvo por mais 2 rodadas/);
    SP.startOfTurn(K, b, alvo);
    SP.startOfTurn(K, b, alvo);
    SP.startOfTurn(K, b, alvo);
    assert.strictEqual(alvo.pv, 998 - 4 - 6);
    assert.strictEqual(alvo.continuos.length, 0);
    assert.match(textos(b), /Flecha Ácida continua em Alvo: 2d4 = 6 de ácido \(acaba\)/);
  });

  test('motor: Esfera Flamejante queima no turno do conjurador por 1 rodada/nível; troca de alvo quando o primeiro cai', () => {
    const esf = deLista('esfera-flamejante', 3, { nivel: 2, espaco: ['n2'] });
    const b = luta(boneco({ nome: 'Mago', magias: lista(3, { n2: 1 }, [esf]) }), [boneco({ nome: 'Um' }), boneco({ nome: 'Dois' })]);
    const c = b.get('A1');
    const idx = b.ordem.indexOf('A1');
    b.turno = idx;
    conjurar(b, c, 'Esfera Flamejante', b.get('B1'));
    assert.strictEqual(c.persistentes.length, 1);
    b.rodada = 3;
    SP.freeActions(K, b, c);
    b.get('B1').estado = 'morto';
    b.rodada = 4;
    SP.freeActions(K, b, c);
    b.rodada = 5;
    SP.freeActions(K, b, c);
    const t = textos(b);
    assert.strictEqual((t.match(/dirige a Esfera Flamejante até Um/g) || []).length, 1);
    assert.strictEqual((t.match(/dirige a Esfera Flamejante até Dois/g) || []).length, 1);
    assert.match(t, /A Esfera Flamejante de Mago se apaga/);
    assert.strictEqual(c.persistentes.length, 0);
    // sem ninguém que ela fira, a esfera fica parada: o golem de ferro, que o fogo cura, não é alvo
    const b3 = luta(boneco({ nome: 'Mago', magias: lista(3, { n2: 1 }, [esf]) }), [boneco({ nome: 'Um' }), ficha('golem-de-ferro', { nome: 'Golem' })]);
    const c3 = b3.get('A1');
    b3.turno = b3.ordem.indexOf('A1');
    conjurar(b3, c3, 'Esfera Flamejante', b3.get('B1'));
    b3.get('B1').estado = 'morto';
    const golem = b3.get('B2');
    golem.pv = 50;
    b3.rodada = 3;
    SP.freeActions(K, b3, c3);
    assert.doesNotMatch(textos(b3), /dirige a Esfera Flamejante até Golem/);
    assert.strictEqual(golem.pv, 50);
    assert.strictEqual(c3.persistentes.length, 1, 'a esfera continua (parada)');
    // barrada pela RM de um alvo, a esfera não fica presa nele: passa para quem ela pode ferir
    const b4 = luta(boneco({ nome: 'Mago', magias: lista(3, { n2: 1 }, [esf]) }), [boneco({ nome: 'Um' }), boneco({ nome: 'Barrado', rm: 99 }), boneco({ nome: 'Livre' })]);
    const c4 = b4.get('A1');
    b4.turno = b4.ordem.indexOf('A1');
    conjurar(b4, c4, 'Esfera Flamejante', b4.get('B1'));
    b4.get('B1').estado = 'morto';
    for (const rodada of [3, 4, 5]) {
      b4.rodada = rodada;
      SP.freeActions(K, b4, c4);
    }
    const t4 = textos(b4);
    assert.strictEqual((t4.match(/dirige a Esfera Flamejante até Barrado/g) || []).length, 1, 'uma vez só: a RM barra e fica guardada');
    assert.strictEqual((t4.match(/dirige a Esfera Flamejante até Livre/g) || []).length, 1);
    // uma esfera de cada vez: com uma ativa, a IA não conjura outra
    const b2 = luta(boneco({ magias: lista(3, { n2: 2 }, [{ ...esf, quantidade: 2 }]) }), boneco());
    conjurar(b2, b2.get('A1'), 'Esfera Flamejante');
    assert.ok(!SP.options(K, b2, b2.get('A1'), b2.get('B1')).some(o => o.tipo === 'magia'));
  });

  test('motor: Produzir Chamas arremessa de novo, sem gastar espaço nem ter falha arcana, enquanto dura', () => {
    const pc = deLista('produzir-chamas', 2, { nivel: 2, espaco: ['n2'] });
    const b = luta(boneco({ nome: 'Druida', magias: lista(2, { n2: 1 }, [pc]), especiais: [{ id: 'falha-arcana', nome: 'Falha', natureza: 'Ext', descricao: '', mecanica: { efeito: 'falha-de-magia', chance_pct: 99 }, grupo: 'qualidade' }] }), boneco(), [50]);
    const c = b.get('A1');
    b.turno = b.ordem.indexOf('A1');
    conjurar(b, c, 'Produzir Chamas');
    assert.match(textos(b), /falha \(99% de chance de falha\)/, 'conjurar tem a falha');
    assert.strictEqual(c.espacosRestantes.n2, 0);
    // falhou: as chamas não ficaram na mão
    assert.ok(!SP.options(K, b, c, b.get('B1')).some(o => o.tipo === 'magia'));
    const b2 = luta(boneco({ nome: 'Druida', magias: lista(2, { n2: 1 }, [pc]) }), boneco());
    const d = b2.get('A1');
    b2.turno = b2.ordem.indexOf('A1');
    conjurar(b2, d, 'Produzir Chamas');
    b2.rodada = 3;
    const de = SP.options(K, b2, d, b2.get('B1')).find(o => o.tipo === 'magia');
    assert.ok(de?.s.gratis, 'na rodada seguinte, arremessa de novo');
    SP.execute(K, b2, d, de);
    assert.match(textos(b2), /Druida arremessa de novo Produzir Chamas/);
    b2.rodada = 4;
    assert.ok(!SP.options(K, b2, d, b2.get('B1')).some(o => o.tipo === 'magia'), '2 rodadas no 2º nível: acabou');
  });

  test('motor: Sono afeta 2d4 DV, os de menos DV primeiro; 5 DV ou mais e imunes não gastam; ferir acorda', () => {
    const sono = deLista('sono', 3);
    const alvos = [boneco({ nome: 'DV3', dv: 3 }), boneco({ nome: 'DV1', dv: 1 }), boneco({ nome: 'DV6', dv: 6 }), ficha('carnical', { nome: 'Morto' }), boneco({ nome: 'DV2', dv: 2 })];
    // 2d4 = 2 + 2 = 4 DV: DV1 e DV2 (3), e o 1 que sobra não dá para o DV3; os dois falham em Vontade
    const b = luta(boneco({ nome: 'Mago', magias: lista(3, { n1: 1 }, [sono]) }), alvos, [2, 2, 1, 1]);
    conjurar(b, b.get('A1'), 'Sono', b.get('B1'));
    const t = textos(b);
    assert.match(t, /conjura Sono \(2d4 = 4 DV\) em DV1, DV2\./);
    const dv1 = b.combatentes.find(x => x.nome === 'DV1');
    assert.ok(dv1.cond.inconsciente?.sono && b.combatentes.find(x => x.nome === 'DV2').cond.inconsciente);
    assert.ok(!b.combatentes.find(x => x.nome === 'DV3').cond.inconsciente);
    K.causarDano(b, dv1, [{ valor: 1, tipo: 'fisico' }], { fonte: b.get('A1') });
    assert.ok(!dv1.cond.inconsciente, 'acordou');
    assert.match(textos(b), /DV1 acorda com o ferimento/);
    // a IA estima com a média (5 DV) e não conta quem não pode dormir: morto-vivo e 6 DV, nada a fazer
    const semAlvo = luta(boneco({ magias: lista(3, { n1: 1 }, [sono]) }), [ficha('carnical'), boneco({ dv: 6 })]);
    assert.ok(!SP.options(K, semAlvo, semAlvo.get('A1'), semAlvo.get('B1')).some(o => o.tipo === 'magia'));
    const comAlvo = luta(boneco({ magias: lista(3, { n1: 1 }, [sono]) }), [ficha('carnical'), boneco({ nome: 'Fraco', dv: 2 })]);
    const opcao = SP.options(K, comAlvo, comAlvo.get('A1'), comAlvo.get('B1')).find(o => o.tipo === 'magia');
    assert.deepStrictEqual(opcao?.alvos.map(x => x.nome), ['Fraco']);
  });

  test('motor: a falha arcana tira a magia (e gasta o espaço)', () => {
    const mm = deLista('misseis-magicos', 5);
    const arcano = { id: 'falha-arcana', nome: 'Falha arcana', natureza: 'Ext', descricao: '', mecanica: { efeito: 'falha-de-magia', chance_pct: 10 }, grupo: 'qualidade' };
    const b = luta(boneco({ magias: lista(5, { n1: 1 }, [mm]), especiais: [arcano] }), boneco(), [7]);
    conjurar(b, b.get('A1'), 'Mísseis Mágicos');
    assert.match(textos(b), /mas falha \(10% de chance de falha\)/);
    assert.strictEqual(b.get('A1').espacosRestantes.n1, 0);
    assert.strictEqual(b.get('B1').pv, 1000);
  });

  test('IA: reforço na 1ª rodada sem inimigo ao alcance; área com 2 ou mais alvos; cura o aliado abaixo de 50%', () => {
    const mago = montar({ classe: 'mago', magias: { preparadas: { 1: { 'escudo-arcano': 1 }, 3: { 'bola-de-fogo': 1, 'misseis-magicos': 1 } } } }).ficha;
    let b = C.createBattle({ ladoA: [mago], ladoB: [boneco({ nome: 'Ogro' }), boneco({ nome: 'Ogro' }), boneco({ nome: 'Ogro' })], semente: 7, distancia: 30 });
    C.runBattle(b);
    const t = textos(b);
    const i = { escudo: t.indexOf('conjura Escudo Arcano'), bola: t.search(/conjura Bola de Fogo em Ogro \d, Ogro \d/) };
    assert.ok(i.escudo >= 0 && i.bola > i.escudo, 'Escudo Arcano primeiro, depois a Bola de Fogo em vários');
    const cle = montar({ classe: 'clerigo', magias: { preparadas: { 1: { 'curar-leves': 1 } } } }).ficha;
    b = C.createBattle({ ladoA: [cle, boneco({ nome: 'Aliado', pvMax: 40 })], ladoB: [boneco({ nome: 'Inimigo', ataques: [], ataqueTotal: [] })], semente: 3, distancia: 30 });
    b.get('A2').pv = 12;
    for (let n = 0; n < 3; n++) C.nextTurn(b);
    // só a Curar Ferimentos Leves foi preparada: é ela (nada dos espaços de 2º e 3º, vazios)
    assert.match(textos(b), /conjura Curar Ferimentos Leves em Aliado/);
    // com uma magia (menor) preparada no espaço de 3º, a conversão cura mais: Curar Ferimentos Graves no lugar dela
    const cle3 = montar({ classe: 'clerigo', magias: { preparadas: { 1: { 'curar-leves': 1 }, 3: { 'curar-leves': 1 } } } }).ficha;
    assert.deepStrictEqual(cle3.magias.lista.filter(s => s.nome === 'Curar Ferimentos Graves').map(s => [s.conversao, s.espaco]), [[true, ['n3']]]);
    b = C.createBattle({ ladoA: [cle3, boneco({ nome: 'Aliado', pvMax: 40 })], ladoB: [boneco({ nome: 'Inimigo', ataques: [], ataqueTotal: [] })], semente: 3, distancia: 30 });
    b.get('A2').pv = 12;
    for (let n = 0; n < 3; n++) C.nextTurn(b);
    assert.match(textos(b), /conjura Curar Ferimentos Graves em Aliado/, '28 PV a curar: a cura que mais cura sem sobrar');
  });

  test('sanidade em lote: o mago 5 com as magias vence os ogros bem mais vezes do que sem elas', () => {
    const com = montar({ classe: 'mago' }).ficha;
    const sem = { ...com, magias: null };
    const ogros = [ficha('ogro'), ficha('ogro')];
    const vitorias = f => C.simulate({ ladoA: [f], ladoB: ogros, distancia: 18 }, { vezes: 300, semente: 5 }).vitoriasA;
    const [v1, v0] = [vitorias(com), vitorias(sem)];
    assert.ok(v1 > v0 + 0.2, `com magias ${v1}, sem ${v0} (fração das 300)`);
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
