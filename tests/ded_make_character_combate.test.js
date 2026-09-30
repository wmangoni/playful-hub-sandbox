/**
 * Testes do motor do simulador de combate (TASK_006 §9, regras 3.0).
 * Os dados são fixados com scriptedRng: cada teste diz exatamente o que cada d20/dado tira.
 * Executar: node tests/ded_make_character_combate.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
const cat = require(path.join(root, 'data', 'catalogo-combate.json'));

async function run() {
  const C = await load('js/rules/combat30.js');
  const SP = await load('js/rules/combat30-specials.js');
  const { scriptedRng, createRng, roll } = await load('js/rules/dice.js');
  const K = C.rules;
  const entrada = id => [...cat.monstros, ...cat.holy_avenger].find(e => e.id === id);
  const ficha = (id, over = {}) => Object.assign(C.fromCatalog(entrada(id)), over);
  /** Alvo neutro: um ogro de 1000 PV, sem RD nem especiais. */
  const boneco = (over = {}) => ficha('ogro', { nome: 'Boneco', pvMax: 1000, rd: null, especiais: [], talentos: [], ...over });
  const ataque = over => ({ nome: 'Golpe', tipo: 'corpo a corpo', bonus: 10, dano: '1d6+3', critico: { margem: 20, multiplicador: 2 }, tipo_dano: ['cortante'], natural: false, secundario: false, alcance_m: 1.5, incremento_m: null, magico: null, material: null, dano_extra: [], efeitos: [], ...over });
  /** Luta montada com os dados fixados; rodada 2, para ninguém estar surpreso. */
  function luta(ladoA, ladoB, dados = []) {
    const b = C.createBattle({ ladoA: [].concat(ladoA), ladoB: [].concat(ladoB), semente: 1 });
    b.rng = scriptedRng(dados, 99);
    b.rodada = 2;
    return b;
  }
  const textos = b => b.eventos.map(e => e.texto).join('\n');
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Motor de combate 3.0 ---');

  test('dados: a mesma semente repete a sequência; o crítico multiplica dados e bônus fixos', () => {
    const a = createRng('dragão-42');
    const b = createRng('dragão-42');
    assert.deepStrictEqual([1, 2, 3, 4, 5].map(() => a.die(20)), [1, 2, 3, 4, 5].map(() => b.die(20)));
    const r = roll(scriptedRng([2, 3, 4]), '1d6+3', { vezes: 3, bonus: 1 });
    assert.strictEqual(r.total, 2 + 3 + 4 + 4 * 3);
  });

  test('1 natural sempre erra e 20 natural sempre acerta; o mesmo nos testes de resistência', () => {
    let b = luta(ficha('tarrasque'), boneco(), [1]);
    assert.strictEqual(K.golpe(b, b.get('A1'), b.get('B1'), ataque({ bonus: 99 })).acertou, false);
    b = luta(ficha('carnical'), ficha('tarrasque'), [20, 1, 1]); // 20 natural, confirmação 1, dano 1
    assert.strictEqual(K.golpe(b, b.get('A1'), b.get('B1'), ataque({ bonus: -5 })).acertou, true);
    b = luta(boneco(), boneco(), [20, 1]);
    assert.strictEqual(K.teste(b, b.get('B1'), 'fort', 100).passou, true);
    assert.strictEqual(K.teste(b, b.get('B1'), 'fort', 2).passou, false);
  });

  test('crítico (3.0): multiplica dados e bônus do dano; o dano extra de energia não; imune a crítico não multiplica', () => {
    // 20 ameaça, 15 confirma, dano 1d6+3 ×3 = (2+3+4) + 9, fogo 1d6 = 5 (sem multiplicar)
    let b = luta(boneco(), boneco(), [20, 15, 2, 3, 4, 5]);
    const alvo = b.get('B1');
    const r = K.golpe(b, b.get('A1'), alvo, ataque({ critico: { margem: 20, multiplicador: 3 }, dano_extra: [{ dano: '1d6', tipo: 'fogo' }] }));
    assert.ok(r.critico);
    assert.strictEqual(1000 - alvo.pv, 18 + 5);
    // golem de ferro (constructo): 20 natural acerta, mas sem rolar confirmação nem multiplicar
    b = luta(boneco(), ficha('golem-de-ferro', { rd: null, pvMax: 500 }), [20, 6]);
    const golem = b.get('B1');
    const r2 = K.golpe(b, b.get('A1'), golem, ataque({ bonus: 40, critico: { margem: 20, multiplicador: 3 } }));
    assert.strictEqual(r2.critico, false);
    assert.strictEqual(500 - golem.pv, 9);
    assert.match(textos(b), /imune a crítico/);
  });

  test('RD 3.0: +N pela melhoria; arma mágica vence x/prata; arma natural conta como a RD do dono; magia e energia ignoram', () => {
    const b = luta(ficha('tarrasque'), [boneco({ rd: { valor: 10, exceto: '+1' } }), boneco({ rd: { valor: 10, exceto: 'prata' } }), ficha('balor')]);
    const [um, prata, balor] = ['B1', 'B2', 'B3'].map(b.get);
    const quinze = over => ataque({ dano: '0d0+15', ...over });
    const bater = (alvo, a) => K.causarDano(b, alvo, [{ valor: 15, tipo: 'fisico' }], { fonte: b.get('A1'), ataque: a });
    assert.strictEqual(bater(um, quinze()), 5);
    assert.strictEqual(bater(um, quinze({ magico: '+1' })), 15);
    assert.strictEqual(bater(prata, quinze()), 5);
    assert.strictEqual(bater(prata, quinze({ material: 'prata' })), 15);
    assert.strictEqual(bater(prata, quinze({ magico: '+1' })), 15);
    // mordida do Tarrasque (RD 25/+5) contra a RD 30/+3 do Balor: conta como +5 e passa inteira
    const mordida = entrada('tarrasque').ataque_total.find(a => a.nome === 'Mordida');
    assert.strictEqual(K.causarDano(b, balor, [{ valor: 40, tipo: 'fisico' }], { fonte: b.get('A1'), ataque: mordida }), 40);
    assert.strictEqual(K.venceRD(b.get('A1'), { ...mordida, natural: false }, balor.rd), false);
    // magia (dano sem tipo) e energia ignoram a RD
    assert.strictEqual(K.causarDano(b, um, [{ valor: 15, tipo: 'fisico' }], { fonte: b.get('A1'), ignoraRD: true }), 15);
    assert.strictEqual(K.causarDano(b, um, [{ valor: 15, tipo: 'fogo' }], { fonte: b.get('A1'), ataque: quinze() }), 15);
  });

  test('resistência a energia vale por rodada (4 × 10 de fogo contra resistência 20 perdem só 20); imunidade anula', () => {
    const b = luta(boneco(), [boneco({ resistEnergia: { fogo: 20 } }), boneco({ imunidades: ['fogo'] })]);
    const [resiste, imune] = [b.get('B1'), b.get('B2')];
    let total = 0;
    for (let i = 0; i < 4; i++) total += K.causarDano(b, resiste, [{ valor: 10, tipo: 'fogo' }], { fonte: b.get('A1') });
    assert.strictEqual(total, 20);
    K.inicioDoTurno(b, resiste); // começa o turno dele: a resistência volta a valer inteira
    assert.strictEqual(K.causarDano(b, resiste, [{ valor: 10, tipo: 'fogo' }], { fonte: b.get('A1') }), 0);
    assert.strictEqual(K.causarDano(b, imune, [{ valor: 50, tipo: 'fogo' }], { fonte: b.get('A1') }), 0);
  });

  test('RM: vale contra magia e habilidade similar a magia (SM), não contra sopro (Sob) nem Ext', () => {
    const b = luta(boneco(), boneco({ rm: 30 }), [5, 5]);
    const [c, alvo] = [b.get('A1'), b.get('B1')];
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'Sob'), true);
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'Ext'), true);
    assert.strictEqual(b.rng.restantes(), 2); // Sob e Ext não rolam
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'magia'), false); // 5 + 20 = 25 < 30
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'SM'), false);
  });

  test('morrendo (3.0): 10% de estabilizar por rodada, senão perde 1 PV; com −10, morre', () => {
    const b = luta(boneco(), [boneco(), boneco()], [5, 50]);
    const [x, y] = [b.get('B1'), b.get('B2')];
    x.pv = -3;
    x.estado = 'morrendo';
    K.inicioDoTurno(b, x);
    assert.strictEqual(x.estado, 'estavel');
    assert.strictEqual(x.pv, -3);
    y.pv = -9;
    y.estado = 'morrendo';
    K.inicioDoTurno(b, y);
    assert.strictEqual(y.estado, 'morto');
    // incapacitado com 0 PV e morrendo abaixo de 0 (menos de 50 por vez: sem dano maciço)
    const b2 = luta(boneco(), boneco({ pvMax: 30 }));
    const z = b2.get('B1');
    K.causarDano(b2, z, [{ valor: 30, tipo: 'fogo' }], { fonte: b2.get('A1') });
    assert.strictEqual(z.estado, 'incapacitado');
    K.causarDano(b2, z, [{ valor: 4, tipo: 'fogo' }], { fonte: b2.get('A1') });
    assert.strictEqual(z.estado, 'morrendo');
    assert.strictEqual(C.podeLutar(z), false);
  });

  test('regeneração do troll: espada vira contusão e o derruba sem matar; fogo mata', () => {
    const b = luta(boneco(), ficha('troll'));
    const troll = b.get('B1');
    K.causarDano(b, troll, [{ valor: 100, tipo: 'fisico' }], { fonte: b.get('A1'), ataque: ataque() });
    assert.strictEqual(troll.pv, troll.pvMax);
    assert.strictEqual(troll.contusao, 100);
    assert.strictEqual(troll.estado, 'inconsciente');
    K.inicioDoTurno(b, troll);
    assert.strictEqual(troll.contusao, 95);
    troll.contusao = 64; // 64 − 5 = 59, abaixo dos 63 PV: volta a lutar
    K.inicioDoTurno(b, troll);
    assert.strictEqual(troll.estado, 'ativo');
    K.causarDano(b, troll, [{ valor: 100, tipo: 'fogo' }], { fonte: b.get('A1') });
    assert.strictEqual(troll.estado, 'morto');
  });

  test('Tarrasque engole quem agarrou, tritura por dentro e é cortado para a vítima sair', () => {
    const b = luta(ficha('tarrasque'), boneco(), [20, 1, 1, 1, 1, 1, 15, 3, 3]);
    const [t, alvo] = [b.get('A1'), b.get('B1')];
    t.agarrando = alvo.uid;
    alvo.agarradoPor = t.uid;
    assert.strictEqual(SP.forcedTurn(K, b, t), true); // teste de agarrar 20 contra 1: engole
    assert.strictEqual(alvo.engolidoPor, t.uid);
    assert.strictEqual(t.agarrando, null);
    SP.startOfTurn(K, b, t); // 2d8+8 (1+1+8) de esmagamento e 2d8+6 (1+1+6) de ácido
    assert.strictEqual(1000 - alvo.pv, 10 + 8);
    alvo.danoInterno = 45;
    SP.forcedTurn(K, b, alvo); // 15 + 8 contra CA interna 20, dano 2d6+7 = 13: passa dos 50 e sai
    assert.strictEqual(alvo.engolidoPor, null);
    assert.match(textos(b), /abre caminho e sai de dentro de Tarrasque/);
  });

  test('medo acumula (3.0): abalado + abalado = amedrontado (foge); + abalado = apavorado', () => {
    const b = luta(boneco(), boneco());
    const x = b.get('B1');
    assert.strictEqual(K.aplicarCondicao(b, x, 'abalado', 5), 'abalado');
    assert.strictEqual(K.aplicarCondicao(b, x, 'abalado', 5), 'amedrontado');
    assert.strictEqual(x.fugindo, true);
    assert.strictEqual(C.podeLutar(x), false);
    assert.strictEqual(K.aplicarCondicao(b, x, 'abalado', 5), 'apavorado');
    assert.deepStrictEqual(Object.keys(x.cond), ['apavorado']);
  });

  test('dano por tendência (Praga Profana): NB conta como boa no eixo moral; neutro leva metade; mau, nada', () => {
    const glabrezu = entrada('glabrezu');
    const praga = glabrezu.ataques_especiais.concat(glabrezu.qualidades_especiais).find(e => e.id === 'praga-profana').mecanica;
    // cada alvo: teste (1, falha), dano 5d8 (1 em cada) e, no bom, a duração do enjoo (1d4 = 2)
    const b = luta(ficha('glabrezu'), [boneco({ tendencia: 'NB' }), boneco({ tendencia: 'N' }), boneco({ tendencia: 'CM' })], [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1]);
    const [bom, neutro, mau] = ['B1', 'B2', 'B3'].map(b.get);
    for (const x of [bom, neutro, mau]) K.efeitoComTeste(b, b.get('A1'), x, praga, { rotulo: 'Praga Profana' });
    assert.strictEqual(1000 - bom.pv, 5);
    assert.ok(bom.cond.enjoado);
    assert.strictEqual(1000 - neutro.pv, 2);
    assert.ok(!neutro.cond.enjoado);
    assert.strictEqual(mau.pv, 1000);
  });

  test('Blasfêmia só afeta quem não é mau (afeta com eixo moral)', () => {
    const balor = entrada('balor');
    const blas = balor.ataques_especiais.concat(balor.qualidades_especiais).find(e => e.id === 'blasfemia').mecanica;
    const b = luta(ficha('balor'), [boneco({ tendencia: 'CM' }), boneco({ tendencia: 'LB' })]);
    const [mau, bom] = [b.get('B1'), b.get('B2')];
    K.efeitoComTeste(b, b.get('A1'), mau, blas, { rotulo: 'Blasfêmia' });
    K.efeitoComTeste(b, b.get('A1'), bom, blas, { rotulo: 'Blasfêmia' });
    assert.deepStrictEqual(Object.keys(mau.cond), []);
    assert.ok(bom.cond.pasmo); // o boneco (ogro, 4 DV) também é enfraquecido, por 2d4 rodadas
    assert.ok(bom.buffs.some(bf => bf.atributos?.for < 0 && bf.expira !== Infinity));
    assert.strictEqual(bom.danoAtributo.for, 0);
  });

  test('área na distância abstrata: cone de 9 m pega até 4 criaturas Médias', () => {
    const b = C.createBattle({ ladoA: [ficha('dragao-vermelho-adulto')], ladoB: Array.from({ length: 6 }, () => ficha('carnical')), semente: 3 });
    const alvos = K.alvosNaArea(b, b.get('A1'), K.parseArea('cone', 9), b.get('B1'));
    assert.strictEqual(alvos.length, 4);
    assert.strictEqual(alvos[0].uid, 'B1');
    assert.deepStrictEqual(K.parseArea('esfera de 6 m de raio'), { forma: 'raio', tamanho: 6, copias: 1, noConjurador: false });
    assert.strictEqual(K.parseArea('linha de 1,5 m de largura').tamanho, 30);
  });

  test('presença aterradora: quem passa fica imune; com até 4 DV, falhar deixa apavorado; morto-vivo é imune', () => {
    let b = luta(ficha('dragao-vermelho-adulto'), boneco(), [20]);
    const d = b.get('A1');
    SP.onAttackAction(K, b, d);
    assert.deepStrictEqual(Object.keys(b.get('B1').cond), []);
    assert.ok(b.get('B1').imuneAPresenca.includes(d.uid));
    SP.onAttackAction(K, b, d); // não testa de novo
    assert.strictEqual(b.rng.restantes(), 0);
    b = luta(ficha('dragao-vermelho-adulto'), boneco(), [1, 3, 3, 3, 3]); // ogro de 4 DV
    SP.onAttackAction(K, b, b.get('A1'));
    assert.ok(b.get('B1').cond.apavorado);
    // morto-vivo é imune a medo (efeitos de ação mental): nem testa
    b = luta(ficha('dragao-vermelho-adulto'), ficha('carnical'), [1]);
    SP.onAttackAction(K, b, b.get('A1'));
    assert.deepStrictEqual(Object.keys(b.get('B1').cond), []);
    assert.strictEqual(b.rng.restantes(), 1);
    // a do Tarrasque ("até sair da área", raio sem limite) dura a luta toda
    b = luta(ficha('tarrasque'), boneco(), [1]);
    SP.onAttackAction(K, b, b.get('A1'));
    const medo = Object.entries(b.get('B1').cond).find(([n]) => ['abalado', 'amedrontado', 'apavorado'].includes(n));
    assert.ok(medo && medo[1].expira === Infinity);
  });

  test('ataque furtivo: só contra quem está sem a Destreza na CA e nunca contra imune a crítico', () => {
    const espada = entrada('ha-leon-galtran').ataques.find(a => a.tipo === 'corpo a corpo');
    let b = luta(ficha('ha-leon-galtran'), boneco(), [15]);
    b.rodada = 1; // o boneco ainda não agiu: está surpreso
    K.golpe(b, b.get('A1'), b.get('B1'), espada);
    assert.match(textos(b), /Ataque furtivo 5d6/);
    b = luta(ficha('ha-leon-galtran'), ficha('golem-de-ferro'), [15]);
    b.rodada = 1;
    K.golpe(b, b.get('A1'), b.get('B1'), { ...espada, bonus: 60 });
    assert.doesNotMatch(textos(b), /Ataque furtivo/);
  });

  test('veneno: Fortitude contra o inicial e, 10 rodadas depois, contra o secundário', () => {
    const b = luta(ficha('naga-guardia'), boneco(), [1, 4, 1, 3, 3]); // a naga não tem olhar (a medusa petrificaria no início do turno)
    const alvo = b.get('B1');
    SP.envenenar(K, b, b.get('A1'), alvo, { inicial: { atributo: 'for', dano: '1d6' }, secundario: { atributo: 'for', dano: '2d6' }, resistencia: 'fort', cd: 14, nome: 'veneno' });
    assert.strictEqual(alvo.danoAtributo.for, 4);
    SP.startOfTurn(K, b, alvo); // ainda não deu 1 minuto
    assert.strictEqual(alvo.danoAtributo.for, 4);
    b.rodada += 10; // 1 minuto depois, no turno do envenenado
    b.turno = b.ordem.indexOf(alvo.uid);
    SP.startOfTurn(K, b, alvo);
    assert.strictEqual(alvo.danoAtributo.for, 10);
  });

  test('espada vorpal do balor decepa no crítico confirmado', () => {
    const espada = entrada('balor').ataques.find(a => /vorpal/i.test(a.nome));
    const b = luta(ficha('balor'), boneco(), [20, 15]);
    K.golpe(b, b.get('A1'), b.get('B1'), espada);
    assert.strictEqual(b.get('B1').estado, 'morto');
    assert.match(textos(b), /decepa a cabeça/);
  });

  const especial = (c, id) => c.especiais.find(e => e.id === id);
  const mecanica = (id, esp) => {
    const e = entrada(id);
    return [...e.ataques_especiais, ...e.qualidades_especiais].find(x => x.id === esp)?.mecanica || e.magias?.lista.find(s => s.nome === esp)?.mecanica;
  };

  test('"morto" é morte (Implosão), não uma condição que passa; constructo é imune a efeitos de Fortitude', () => {
    const implosao = mecanica('balor', 'implosao');
    let b = luta(ficha('balor'), boneco(), [1]);
    K.efeitoComTeste(b, b.get('A1'), b.get('B1'), implosao, { rotulo: 'Implosão' });
    assert.strictEqual(b.get('B1').estado, 'morto');
    assert.doesNotMatch(textos(b), /morto por \d/);
    b = luta(ficha('balor'), ficha('golem-de-ferro'), [1]);
    K.efeitoComTeste(b, b.get('A1'), b.get('B1'), implosao, { rotulo: 'Implosão' });
    assert.strictEqual(b.get('B1').estado, 'ativo');
    assert.strictEqual(b.rng.restantes(), 1); // nem testa
    assert.match(textos(b), /imune a efeitos de Fortitude/);
  });

  test('confusão (3.0): 2–6 não faz nada, 10 age normalmente, 7–9 ataca o mais próximo; atacado, revida', () => {
    const b = luta(boneco(), [boneco(), boneco()], [3, 10, 8]);
    const x = b.get('B1');
    K.aplicarCondicao(b, x, 'confuso', 10);
    assert.strictEqual(SP.forcedTurn(K, b, x), true);
    assert.match(textos(b), /tira 3 e não faz nada/);
    assert.strictEqual(SP.forcedTurn(K, b, x), false); // 10: o turno segue normal
    SP.forcedTurn(K, b, x); // 8: ataca o mais próximo (o outro boneco do próprio lado, na mesma posição)
    assert.match(textos(b), /tira 8\) ataca Boneco 3, um aliado/);
  });

  test('olhar da medusa: golem (imune a sobrenatural) e carniçal (imune a Fortitude) não testam nem viram pedra', () => {
    for (const id of ['golem-de-ferro', 'carnical']) {
      const b = luta(ficha('medusa'), ficha(id), [1]);
      SP.startOfTurn(K, b, b.get('B1'));
      assert.ok(!b.get('B1').cond.petrificado, id);
      assert.strictEqual(b.rng.restantes(), 1, id);
    }
    const b = luta(ficha('medusa'), boneco(), [1]);
    SP.startOfTurn(K, b, b.get('B1'));
    assert.ok(b.get('B1').cond.petrificado);
  });

  test('fedor do Tork: um teste por luta; quem falha fica nauseado e perde For uma vez só', () => {
    const b = luta(ficha('ha-tork'), boneco(), [1, 4]);
    const [tork, alvo] = [b.get('A1'), b.get('B1')];
    SP.startOfTurn(K, b, tork);
    assert.ok(alvo.cond.nauseado);
    assert.strictEqual(alvo.danoAtributo.for, 4);
    SP.startOfTurn(K, b, tork);
    SP.startOfTurn(K, b, tork);
    assert.strictEqual(alvo.danoAtributo.for, 4);
  });

  test('vorpal não mata quem regenera com arma que não fura a regeneração (troll)', () => {
    const espada = entrada('ha-paladino-de-arton').ataques.find(a => /vorpal/i.test(a.nome));
    const b = luta(ficha('ha-paladino-de-arton'), ficha('troll'), [20, 20]);
    K.golpe(b, b.get('A1'), b.get('B1'), espada);
    assert.notStrictEqual(b.get('B1').estado, 'morto');
    assert.match(textos(b), /volta a se unir/);
  });

  test('curas e magias de toque precisam chegar ao alvo; quem é imune a magia ainda cura a si mesmo', () => {
    const b = luta([ficha('ha-lisandra'), ficha('ha-sandro-galtran')], boneco());
    const [lis, sandro] = [b.get('A1'), b.get('A2')];
    sandro.pv = 5;
    sandro.pos = -40;
    const curas = () => SP.options(K, b, lis, b.get('B1')).filter(o => o.tipo === 'magia' && o.s.m.cura);
    assert.strictEqual(curas().length, 0);
    sandro.pos = -3;
    assert.ok(curas().length > 0 && curas()[0].mover === 1.5);
    const b2 = luta(ficha('ha-paladino-de-arton'), boneco());
    const pal = b2.get('A1');
    pal.pv = 30;
    const cura = SP.options(K, b2, pal, b2.get('B1')).find(o => o.tipo === 'cura-maos' && o.alvo === pal);
    assert.ok(cura);
    SP.execute(K, b2, pal, cura);
    assert.match(textos(b2), /usa Cura pelas Mãos em si mesmo/i);
  });

  test('IA não gasta efeito contra quem é imune (gás paralisante no elemental, veneno no morto-vivo)', () => {
    let b = luta(ficha('dragao-de-prata-antigo'), ficha('elemental-do-fogo-anciao'));
    let d = b.get('A1');
    d.pos = 9;
    let ops = SP.options(K, b, d, b.get('B1')).filter(o => o.tipo === 'sopro');
    assert.ok(ops.some(o => o.e.id === 'sopro'));
    assert.ok(!ops.some(o => o.e.id === 'sopro-paralisante'));
    b = luta(ficha('golem-de-ferro'), ficha('carnical'));
    d = b.get('A1');
    d.pos = 9;
    ops = SP.options(K, b, d, b.get('B1')).filter(o => o.tipo === 'sopro');
    assert.strictEqual(ops.length, 0);
  });

  test('sopro: recarga compartilhada entre os dois sopros; o gás do golem deixa o secundário mesmo a quem passa', () => {
    const b = luta(ficha('dragao-de-prata-antigo'), boneco({ imunidades: ['medo'] })); // sem fugir da presença aterradora
    const d = b.get('A1');
    d.pos = 9;
    const sopro = d._esp.find(e => e.id === 'sopro');
    SP.execute(K, b, d, { tipo: 'sopro', e: sopro, alvo: b.get('B1'), alvos: [b.get('B1')], mover: 0 });
    assert.ok(d.recarga.sopro > K.tick(b));
    assert.strictEqual(d.recarga['sopro-paralisante'], d.recarga.sopro);
    assert.ok(!SP.options(K, b, d, b.get('B1')).some(o => o.tipo === 'sopro'));
    b.rodada += 5; // 1d4 rodadas depois, volta
    assert.ok(SP.options(K, b, d, b.get('B1')).some(o => o.tipo === 'sopro'));
    const b2 = luta(ficha('golem-de-ferro'), boneco(), [20]);
    K.efeitoComTeste(b2, b2.get('A1'), b2.get('B1'), mecanica('golem-de-ferro', 'sopro'), { rotulo: 'gás' });
    assert.strictEqual(b2.get('B1').venenos.length, 1);
  });

  test('RD que absorve todo o dano anula os efeitos do golpe (paralisia do carniçal no glabrezu)', () => {
    const mordida = entrada('carnical').ataques.find(a => a.nome === 'Mordida');
    const b = luta(ficha('carnical'), ficha('glabrezu'), [20, 1, 1]);
    K.golpe(b, b.get('A1'), b.get('B1'), mordida);
    assert.ok(!b.get('B1').cond.paralisado);
    assert.match(textos(b), /anula o golpe e, com ele, Paralisia\./);
    // o agarrar só precisa do acerto: a RD não o anula (e sem efeito anulado não há aviso)
    const b2 = luta(ficha('behir'), boneco({ rd: { valor: 100, exceto: '+5' } }), [19]);
    K.golpe(b2, b2.get('A1'), b2.get('B1'), entrada('behir').ataques.find(a => a.nome === 'Mordida'));
    assert.match(textos(b2), /tenta agarrar Boneco/);
    assert.doesNotMatch(textos(b2), /anula o golpe/);
    // o que passou da RD e ficou nos PV temporários é dano sofrido: a paralisia vale
    const b3 = luta(ficha('carnical'), boneco({ rd: { valor: 1, exceto: '+1' }, pvTemp: 50 }), [19, 6, 1]);
    K.golpe(b3, b3.get('A1'), b3.get('B1'), mordida);
    assert.ok(b3.get('B1').cond.paralisado, textos(b3));
  });

  test('agarrar do arbusto errante exige as duas pancadas; a constrição soma o dano da pancada; quem segura mantém a Des', () => {
    const b = luta(ficha('arbusto-errante'), [boneco(), boneco()], [20, 1, 20, 1]);
    const [arb, alvo, outro] = [b.get('A1'), b.get('B1'), b.get('B2')];
    const pancada = arb.ataqueTotal[0];
    SP.onHit(K, b, arb, alvo, pancada, { critico: false, natural: 15 });
    assert.strictEqual(arb.agarrando, null);
    SP.afterAttacks(K, b, arb, new Map([[alvo.uid, ['Pancada', 'Pancada']]]));
    assert.strictEqual(arb.agarrando, alvo.uid);
    assert.strictEqual(K.semDestreza(b, arb, outro), false);
    assert.strictEqual(K.semDestreza(b, alvo, outro), true);
    SP.forcedTurn(K, b, arb);
    assert.match(textos(b), /Dano do agarrão \(2d6\+5\) e da constrição/);
  });

  test('Raio do Enfraquecimento: nada se o alvo passa em Fortitude; se falha, penalidade temporária que não zera a Força', () => {
    const vlad = entrada('ha-vladislav-tpish');
    const idx = vlad.magias.lista.findIndex(s => /Enfraquec/.test(s.nome));
    const s = { tipo: 'lista', idx, nome: vlad.magias.lista[idx].nome, m: vlad.magias.lista[idx].mecanica, natureza: 'magia', cl: 10, cd: 17 };
    let b = luta(ficha('ha-vladislav-tpish'), boneco(), [20, 20]);
    SP.execute(K, b, b.get('A1'), { tipo: 'magia', s, alvo: b.get('B1'), alvos: [b.get('B1')], mover: 0 });
    assert.ok(!b.get('B1').buffs.some(bf => bf.atributos?.for));
    b = luta(ficha('ha-vladislav-tpish'), boneco({ atributos: { ...ficha('ogro').atributos, for: 8 } }), [20, 1, 6, 6]);
    SP.execute(K, b, b.get('A1'), { tipo: 'magia', s, alvo: b.get('B1'), alvos: [b.get('B1')], mover: 0 });
    const pen = b.get('B1').buffs.find(bf => bf.atributos?.for);
    assert.strictEqual(pen.atributos.for, -7); // 1d6+5 = 11, mas a For 8 só desce até 1
    assert.ok(pen.expira !== Infinity);
  });

  test('engolfar: quem falha em Reflexos fica dentro do cubo, paralisado, e sofre ácido no turno do cubo', () => {
    const b = luta(ficha('cubo-gelatinoso'), boneco(), [1, 1, 3, 4]);
    const [cubo, alvo] = [b.get('A1'), b.get('B1')];
    const e = cubo._esp.find(x => x.id === 'engolfar');
    SP.execute(K, b, cubo, { tipo: 'engolfar', e, alvos: [alvo] });
    assert.strictEqual(alvo.engolfadoPor, cubo.uid);
    assert.ok(alvo.cond.paralisado);
    const antes = alvo.pv;
    SP.startOfTurn(K, b, cubo);
    assert.ok(alvo.pv < antes);
  });

  test('queimar: a pancada do elemental põe fogo; quem o acerta com arma natural também se queima', () => {
    const pancada = entrada('elemental-do-fogo-anciao').ataque_total[0];
    const b = luta(ficha('elemental-do-fogo-anciao'), boneco(), [1, 2]);
    const [el, alvo] = [b.get('A1'), b.get('B1')];
    SP.onHit(K, b, el, alvo, pancada, { critico: false, natural: 15 });
    assert.ok(alvo.queimando);
    const antes = alvo.pv;
    SP.startOfTurn(K, b, alvo);
    assert.ok(alvo.pv < antes);
    const pv = alvo.pv;
    SP.onHit(K, b, alvo, el, { ...ataque(), natural: true }, { critico: false, natural: 15 });
    assert.ok(alvo.pv < pv);
  });

  test('fúria: PV extras enquanto dura; ao acabar, perde os PV e fica fatigado', () => {
    const b = luta(ficha('ha-tork'), boneco());
    const tork = b.get('A1');
    const [pv, pvMax] = [tork.pv, tork.pvMax];
    SP.freeActions(K, b, tork);
    const furia = tork.buffs.find(bf => bf.nome === 'furia');
    assert.ok(furia && furia.pvExtra > 0);
    assert.strictEqual(tork.pvMax, pvMax + furia.pvExtra);
    furia.expira = 0;
    b.turno = 0;
    K.inicioDoTurno(b, tork);
    for (const x of b.combatentes) x.buffs = x.buffs.filter(bf => (bf.expira > 0 ? true : (SP.onBuffEnd(K, b, x, bf), false)));
    assert.strictEqual(tork.pv, pv);
    assert.ok(tork.cond.fatigado);
  });

  test('Destruir o Mal só contra maligno; evasão aprimorada; dano maciço', () => {
    let b = luta(ficha('ha-paladino-de-arton'), [boneco({ tendencia: 'CM' }), boneco({ tendencia: 'LB' })]);
    const pal = b.get('A1');
    SP.beforeAttacks(K, b, pal, b.get('B2'));
    assert.strictEqual(pal._destruir, undefined);
    SP.beforeAttacks(K, b, pal, b.get('B1'));
    assert.strictEqual(pal._destruir.bonus_dano, 19);
    // evasão aprimorada: passar em Reflexos anula; falhar dá metade
    b = luta(boneco(), ficha('ha-leon-galtran', { pvMax: 1000 }), [20, 1]);
    const leon = b.get('B1');
    const bola = { dano: '0d0+20', tipo_energia: 'fogo', resistencia: 'ref', cd: 15, metade_se_passar: true };
    K.efeitoComTeste(b, b.get('A1'), leon, bola);
    assert.strictEqual(leon.pv, 1000);
    K.efeitoComTeste(b, b.get('A1'), leon, bola);
    assert.strictEqual(leon.pv, 990);
    // dano maciço: 50+ num golpe só e falha em Fortitude CD 15
    b = luta(boneco(), boneco(), [1]);
    K.causarDano(b, b.get('B1'), [{ valor: 60, tipo: 'fisico' }], { fonte: b.get('A1'), ataque: ataque() });
    assert.strictEqual(b.get('B1').estado, 'morto');
  });

  test('surpresa, investida, incremento de distância, disparo em corpo a corpo, Esquiva', () => {
    const b = luta([boneco({ talentos: ['esquiva'] }), boneco()], boneco());
    const [x, aliado, y] = [b.get('A1'), b.get('A2'), b.get('B1')];
    b.rodada = 1;
    assert.strictEqual(K.caContra(b, y, x, ataque()), y.ca.surpresa); // ainda não agiu
    y.agiu = true;
    assert.strictEqual(K.caContra(b, y, x, ataque()), y.ca.total);
    y.investidaAte = K.tick(b) + 5;
    assert.strictEqual(K.caContra(b, y, x, ataque()), y.ca.total - 2);
    assert.ok(K.modsDeAtaque(b, x, y, ataque(), { investida: true }).partes.some(([v, r]) => v === 2 && r === 'investida'));
    y.investidaAte = null;
    const arco = ataque({ tipo: 'distancia', incremento_m: 6, alcance_m: 60 });
    x.pos = 0;
    y.pos = 15; // 3 incrementos de 6 m: −4
    aliado.pos = 50;
    assert.strictEqual(K.modsDeAtaque(b, x, y, arco).total, -4);
    aliado.pos = 15; // o aliado está em corpo a corpo com o alvo: mais −4
    assert.strictEqual(K.modsDeAtaque(b, x, y, arco).total, -8);
    x.alvoEsquiva = y.uid;
    x.agiu = true;
    assert.strictEqual(K.caContra(b, x, y, ataque()), x.ca.total + 1);
  });

  test('Ataque Poderoso vale a rodada inteira; Trespassar dá um golpe extra ao derrubar', () => {
    const b = luta(ficha('gigante-do-gelo'), [boneco({ pvMax: 1 }), boneco({ pvMax: 1000 })], [15]); // qualquer dano derruba o 1º
    const g = b.get('A1');
    g.pos = 9;
    K.sequencia(b, g, b.get('B1'), g.ataqueTotal);
    const valores = [...textos(b).matchAll(/−(\d+) Ataque Poderoso/g)].map(m => m[1]);
    assert.ok(valores.length >= 2 && new Set(valores).size === 1, valores.join(','));
    assert.match(textos(b), /trespassa e ataca Boneco 2/);
  });

  test('imunidade a magia do golem: eletricidade deixa lento; fogo cura; carapaça do Tarrasque reflete ou anula cones', () => {
    const b = luta(ficha('dragao-azul-antigo'), ficha('golem-de-ferro'), [1, 1]);
    const [d, golem] = [b.get('A1'), b.get('B1')];
    const s = mag => ({ tipo: 'especial', e: { id: 'x' }, nome: mag.nome, m: mag.m, natureza: 'magia', cl: 10, cd: 18 });
    d._esp.push({ id: 'x', nome: 'x', m: { efeito: 'magia', usos: 'à vontade' } });
    d.usos.x = { n: Infinity };
    SP.execute(K, b, d, { tipo: 'magia', s: s({ nome: 'Raio', m: { efeito: 'magia', magia: 'Raio', usos: 'à vontade', dano: '5d6', tipo_energia: 'eletricidade' } }), alvo: golem, alvos: [golem] });
    assert.ok(golem.cond.lento);
    golem.pv = 50;
    SP.execute(K, b, d, { tipo: 'magia', s: s({ nome: 'Chama', m: { efeito: 'magia', magia: 'Chama', usos: 'à vontade', dano: '0d0+30', tipo_energia: 'fogo' } }), alvo: golem, alvos: [golem] });
    assert.ok(!golem.cond.lento);
    assert.strictEqual(golem.pv, 60);
    // carapaça: 30% de refletir o Cone de Frio de volta; senão, anula
    const cone = entrada('dragao-de-prata-antigo').magias.lista.find(x => x.nome === 'Cone de Frio');
    const b2 = luta(ficha('dragao-de-prata-antigo'), ficha('tarrasque'), [80]);
    const [p, t] = [b2.get('A1'), b2.get('B1')];
    const idx = p.magias.lista.findIndex(x => x.nome === 'Cone de Frio');
    SP.execute(K, b2, p, { tipo: 'magia', s: { tipo: 'lista', idx, nome: cone.nome, m: cone.mecanica, natureza: 'magia', cl: 11, cd: 20 }, alvo: t, alvos: [t] });
    assert.strictEqual(t.pv, t.pvMax);
    assert.match(textos(b2), /anula Cone de Frio/);
  });

  test('falha de magia do Olho de Sszzaas (50%): a magia se perde', () => {
    const b = luta(ficha('ha-niele'), boneco(), [40]);
    const niele = b.get('A1');
    const olho = niele._esp.find(e => e.id === 'olho-misseis');
    SP.execute(K, b, niele, { tipo: 'magia', s: { tipo: 'especial', e: olho, nome: olho.nome, m: olho.m, natureza: olho.natureza, cl: 10, cd: 16 }, alvo: b.get('B1'), alvos: [b.get('B1')] });
    assert.match(textos(b), /falha \(50% de chance de falha\)/);
    assert.strictEqual(b.get('B1').pv, 1000);
  });

  test('cura estabiliza quem está morrendo, mesmo abaixo de 0; explosão do balor ao morrer atinge quem está perto', () => {
    let b = luta(boneco(), boneco());
    const x = b.get('B1');
    x.pv = -8;
    x.estado = 'morrendo';
    K.curar(b, x, 3);
    assert.strictEqual(x.estado, 'estavel');
    assert.strictEqual(x.pv, -5);
    b = luta(ficha('balor'), boneco(), [1]);
    b.get('A1').pos = 9;
    K.morrer(b, b.get('A1'), b.get('B1'));
    assert.strictEqual(b.get('B1').stats.danoRecebido, 50);
  });

  test('o sopro nunca sai sem alvo (a presença aterradora não esvazia a área antes do sopro)', () => {
    for (let s = 1; s <= 30; s++) {
      const b = C.createBattle({ ladoA: [ficha('ogro'), ficha('ogro')], ladoB: [ficha('dragao-vermelho-adulto')], semente: s });
      C.runBattle(b);
      assert.doesNotMatch(textos(b), /usa Sopro [^\n]* em \./, `semente ${s}`);
    }
  });

  test('IA contra o golem de ferro: o fogo, que o cura, não é opção; a eletricidade, que o deixa lento, é', () => {
    let b = luta(ficha('dragao-vermelho-adulto'), ficha('golem-de-ferro'));
    let [c, g] = [b.get('A1'), b.get('B1')];
    g.pv = 50;
    const ops = SP.options(K, b, c, g);
    assert.ok(!ops.some(o => o.tipo === 'sopro'), 'sopro de fogo no golem');
    assert.ok(!ops.some(o => o.tipo === 'magia' && /fogo|chama/i.test(o.s.nome)), ops.map(o => o.s?.nome).join(', '));
    b = luta(ficha('ha-vladislav-tpish'), ficha('golem-de-ferro'));
    [c, g] = [b.get('A1'), b.get('B1')];
    assert.ok(SP.options(K, b, c, g).some(o => o.tipo === 'magia' && o.s.nome === 'Relâmpago' && o.ev > 0));
  });

  test('Palavra Sagrada: a paralisia respeita a imunidade (limo); "morto" destrói o morto-vivo e poupa o constructo', () => {
    const palavra = [...entrada('ha-paladino-de-arton').ataques_especiais, ...entrada('ha-paladino-de-arton').qualidades_especiais].find(e => e.id === 'palavra-sagrada').mecanica;
    const b = luta(ficha('ha-paladino-de-arton'), [ficha('cubo-gelatinoso'), ficha('carnical'), boneco({ nome: 'Estátua', tipo: 'Constructo', dv: 2, imunidades: [...ficha('golem-de-ferro').imunidades, 'efeitos de morte'], imuneFortitude: true })]);
    const [pal, cubo, carnical, estatua] = ['A1', 'B1', 'B2', 'B3'].map(id => b.get(id));
    for (const x of [cubo, carnical, estatua]) K.efeitoComTeste(b, pal, x, palavra, { rotulo: 'Palavra Sagrada' });
    assert.ok(!cubo.cond.paralisado, 'o limo é imune a paralisia');
    assert.strictEqual(carnical.estado, 'morto');
    assert.match(textos(b), /Carniçal: destruído\./);
    assert.notStrictEqual(estatua.estado, 'morto');
  });

  test('magia de morte não mata o Tarrasque (regenera: só o derruba); duração zero não impede a morte', () => {
    const b = luta(boneco(), [ficha('tarrasque'), boneco()]);
    const t = b.get('B1');
    K.aplicarCondicao(b, t, 'morto', Infinity, { fonte: b.get('A1') });
    assert.strictEqual(t.estado, 'inconsciente');
    K.aplicarCondicao(b, b.get('B2'), 'morto', 0);
    assert.strictEqual(b.get('B2').estado, 'morto');
    assert.strictEqual(b.get('B2').pv, -10);
  });

  test('resumo: quem morre depois de fugir aparece como morto; nome terminado em ponto não duplica o ponto', () => {
    const b = luta(ficha('ha-james-k'), boneco());
    const [james, alvo] = [b.get('A1'), b.get('B1')];
    alvo.fugindo = true;
    K.morrer(b, alvo, james);
    K.log(b, james, 'teste', `Vez de ${james.nome}.`);
    K.morrer(b, james, null);
    C.runBattle(b);
    assert.strictEqual(b.fim.combatentes.find(x => x.uid === 'B1').estado, 'morto');
    assert.match(textos(b), /Vez de Capitão James K\.$/m);
    assert.doesNotMatch(textos(b), /(?<!\.)\.\.(?!\.)/);
  });

  test('confuso engolido ou agarrado não ataca quem está de fora: se volta contra quem o prende', () => {
    const b = luta(ficha('tarrasque'), [ficha('ogro'), ficha('ogro')], [8, 10, 10, 10, 10]);
    const [t, o1] = [b.get('A1'), b.get('B1')];
    o1.engolidoPor = t.uid;
    K.aplicarCondicao(b, o1, 'confuso', 10);
    assert.strictEqual(SP.forcedTurn(K, b, o1), true);
    assert.match(textos(b), /tira 8 e se volta contra Tarrasque/);
    assert.match(textos(b), /ataca de dentro de Tarrasque/);
    assert.doesNotMatch(textos(b), /ataca Ogro 2/);
  });

  test('a mesma semente repete a luta; outra semente muda o registro', () => {
    const lutar = semente => {
      const b = C.createBattle({ ladoA: [ficha('ha-sandro-galtran'), ficha('ha-lisandra')], ladoB: [ficha('troll'), ficha('ogro')], semente });
      C.runBattle(b);
      return textos(b);
    };
    assert.strictEqual(lutar('arena-7'), lutar('arena-7'));
    assert.notStrictEqual(lutar('arena-7'), lutar('arena-8'));
  });

  test('sanidade em lote: o Tarrasque sempre vence o carniçal; lutas espelhadas ficam perto de 50%', () => {
    const t = ficha('tarrasque');
    const g = ficha('carnical');
    assert.strictEqual(C.simulate({ ladoA: [t], ladoB: [g] }, { vezes: 60, semente: 1 }).vitoriasA, 1);
    assert.strictEqual(C.simulate({ ladoA: [g], ladoB: [t] }, { vezes: 60, semente: 2 }).vitoriasB, 1);
    const o = ficha('ogro');
    const espelho = C.simulate({ ladoA: [o], ladoB: [o] }, { vezes: 600, semente: 3 });
    assert.ok(espelho.vitoriasA > 0.38 && espelho.vitoriasA < 0.62, `ogro × ogro: ${espelho.vitoriasA}`);
  });

  test('todo combatente do catálogo luta sem erro, e a luta sempre termina', () => {
    const todos = [...cat.monstros, ...cat.holy_avenger];
    const rivais = ['ogro', 'balor', 'ha-sandro-galtran', 'tarrasque'].map(id => ficha(id));
    let n = 0;
    for (const e of todos) for (const r of rivais) {
      const b = C.createBattle({ ladoA: [C.fromCatalog(e)], ladoB: [r], semente: ++n });
      const fim = C.runBattle(b);
      assert.ok(fim && fim.rodadas <= 50, `${e.id} × ${r.nome}`);
    }
    // lado com vários combatentes, nomes repetidos numerados
    const b = C.createBattle({ ladoA: [ficha('ogro'), ficha('ogro')], ladoB: [ficha('troll')], semente: 5 });
    assert.deepStrictEqual(b.combatentes.map(c => c.nome), ['Ogro 1', 'Ogro 2', 'Troll']);
    C.runBattle(b);
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
