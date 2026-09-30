/**
 * Testes do adaptador de personagem e do equipamento 3.0 (TASK_006 §5.1, §6 e §9, etapa E4).
 * Ataques, dano e CA conferidos à mão pelas regras do SRD 3.0.
 * Executar: node tests/ded_make_character_personagem.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
const rows = t => require(path.join(root, 'data', `${t}.json`)).rows;
const cat = require(path.join(root, 'data', 'catalogo-combate.json'));

async function run() {
  const { computeSheet } = await load('js/rules/dnd30.js');
  const { fromPersonagem, pvMedios } = await load('js/rules/personagem30.js');
  const E = await load('js/rules/equipamento30.js');
  const C = await load('js/rules/combat30.js');
  const SP = await load('js/rules/combat30-specials.js');
  const { scriptedRng } = await load('js/rules/dice.js');
  const [races, classes, bba, pericias] = ['races', 'classes', 'bba', 'pericias'].map(rows);
  const CLASSE = { barbaro: 1, bardo: 2, clerigo: 3, druida: 4, guerreiro: 5, monge: 6, paladino: 7, ranger: 8, ladino: 9, feiticeiro: 10, mago: 11 };
  const RACA = { humano: 1, anao: 2, elfo: 3, gnomo: 4, halfling: 7 };
  const T = (nome, parametro = null) => ({ nome, parametro });
  const item = (id, melhoria = 0, material = null) => ({ id, melhoria, material });
  /** Personagem de teste: humano de 10º nível, For 16, Des 14, Con 14, Int 10, Sab 14, Car 14, 70 PV. */
  function montar({ classe, raca = 'humano', talentos = [], equipamento = null, ranks = {}, ...p }) {
    const personagem = { id: 99, nome: 'Teste', race_id: RACA[raca], classe_id: CLASSE[classe], tendencia: 'NB', nivel: 10, for: 16, des: 14, con: 14, int: 10, sab: 14, car: 14, iniciativa: 0, pvs: 70, ...p };
    const sheet = computeSheet(personagem, { race: races.find(r => r.id === personagem.race_id), classe: classes.find(c => c.id === personagem.classe_id), bbaRows: bba, pericias, escolhas: { ranks, talentos } });
    return fromPersonagem({ personagem, sheet, talentos, equipamento });
  }
  const resumo = a => `${a.bonus} ${a.dano} ${a.critico.margem}/x${a.critico.multiplicador}`;
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Personagem na Arena (adaptador 3.0) ---');

  test('guerreiro 5 com espada longa +1, cota de malha e escudo grande de aço, Foco, Especialização e Sucesso Decisivo Aprimorado', () => {
    const { ficha, erros } = montar({
      classe: 'guerreiro', nivel: 5, talentos: [T('FOCO EM ARMA', 'espada longa'), T('ESPECIALIZAÇÃO EM ARMA', 'Espada Longa'), T('SUCESSO DECISIVO APRIMORADO', 'espada longa')],
      equipamento: { principal: item('espada-longa', 1), secundaria: null, escudo: item('escudo-grande-aco'), armadura: item('cota-de-malha'), distancia: null },
    });
    assert.deepStrictEqual(erros, []);
    // BBA 5 + For 3 + melhoria 1 + Foco 1 = +10; dano 1d8 + For 3 (uma mão, com escudo) + 1 + Especialização 2
    assert.strictEqual(resumo(ficha.ataques[0]), '10 1d8+6 17/x2');
    assert.strictEqual(ficha.ataques[0].magico, '+1');
    assert.deepStrictEqual(ficha.ataqueTotal.map(a => a.bonus), [10], 'BBA +5: um ataque só');
    // CA 10 + cota 5 + escudo 2 + Des 2 (máx. 2 na cota) = 19; toque 12; surpresa 17
    assert.deepStrictEqual(ficha.ca, { total: 19, toque: 12, surpresa: 17 });
    assert.strictEqual(ficha.deslocamento.terrestre, 6, 'armadura média: 9 m → 6 m');
    assert.strictEqual(ficha.ataqueTotalDistancia, null);
  });

  test('monge 10 desarmado: coluna própria de ataque, rajada (−2 em todos, 3.0), dano 1d10, golpe ki +1, CA com Sab e nível', () => {
    const { ficha } = montar({ classe: 'monge' });
    // ataque desarmado base 7/4/1 + For 3 = 10/7/4; rajada: +1 ataque no maior, todos −2
    assert.deepStrictEqual(ficha.ataqueTotal.map(a => a.bonus), [8, 8, 5, 2]);
    assert.strictEqual(resumo(ficha.ataques[0]), '10 1d10+3 20/x2');
    assert.strictEqual(ficha.ataques[0].magico, '+1', 'golpe ki conta como arma +1 para a RD');
    // CA 10 + Des 2 + Sab 2 + 10/5 = 16, também no toque
    assert.deepStrictEqual(ficha.ca, { total: 16, toque: 16, surpresa: 14 });
    assert.strictEqual(ficha.deslocamento.terrestre, 18);
    assert.ok(ficha.especiais.some(e => e.mecanica?.efeito === 'evasao' && e.mecanica.aprimorada));
    // de armadura (3.0): perde a CA de monge, o deslocamento e os ataques desarmados extras (a
    // coluna própria e a rajada): fica com o BBA de monge (médio, +7/+2) e For +3
    const blindado = montar({ classe: 'monge', equipamento: { principal: item('desarmado'), armadura: item('couro') } });
    assert.deepStrictEqual(blindado.ficha.ataqueTotal.map(a => a.bonus), [10, 5]);
    assert.strictEqual(blindado.ficha.ca.total, 14);
    assert.strictEqual(blindado.ficha.deslocamento.terrestre, 9);
    assert.ok(blindado.avisos.some(a => /monge perde/.test(a)));
    // com escudo (sem armadura), o texto 3.0 não tira nada do monge; vale só a penalidade no ataque
    const comEscudo = montar({ classe: 'monge', equipamento: { principal: item('desarmado'), escudo: item('broquel'), armadura: null } });
    assert.strictEqual(comEscudo.ficha.ataqueTotal.length, 4);
    assert.strictEqual(comEscudo.ficha.ca.total, 17, '16 + broquel 1');
  });

  test('bárbaro 8 com machado grande: For ×1,5; a fúria entra no motor (+4 For e Con, −2 CA, 3 + Con rodadas)', () => {
    const { ficha } = montar({ classe: 'barbaro', nivel: 8 });
    assert.strictEqual(resumo(ficha.ataques[0]), '11 1d12+4 20/x3');
    assert.deepStrictEqual(ficha.ataqueTotal.map(a => a.bonus), [11, 6]);
    const furia = ficha.especiais.find(e => e.mecanica?.efeito === 'furia');
    assert.deepStrictEqual(furia.mecanica, { efeito: 'furia', usos: '3/dia', for: 4, con: 4, von: 2, ca: -2, duracao_rodadas: 7, maior: false });
    assert.strictEqual(ficha.deslocamento.terrestre, 12, 'movimento rápido com armadura leve');
    assert.ok(ficha.esquivaSobrenatural);
    // no motor: a fúria sobe o ataque e o dano do machado (+2 no ataque, +3 no dano com as duas mãos)
    const b = C.createBattle({ ladoA: [ficha], ladoB: [C.fromCatalog(cat.monstros.find(m => m.id === 'ogro'))], semente: 1 });
    b.rng = scriptedRng([], 7);
    b.rodada = 2;
    const c = b.get('A1');
    const antes = C.rules.modsDeAtaque(b, c, b.get('B1'), ficha.ataques[0]).total;
    const danoAntes = C.rules.modsDeDano(b, c, b.get('B1'), ficha.ataques[0]);
    c.buffs.push({ nome: 'furia', rotulo: 'Fúria', atributos: { for: 4, con: 4 }, bonus: { von: 2, ca: -2 } });
    assert.strictEqual(C.rules.modsDeAtaque(b, c, b.get('B1'), ficha.ataques[0]).total - antes, 2);
    assert.strictEqual(C.rules.modsDeDano(b, c, b.get('B1'), ficha.ataques[0]) - danoAntes, 3, 'For +3 → +5: ×1,5 dá de +4 para +7');
    // mão inábil (×0,5): For +3 → +5 dá de +1 para +2
    const duas = montar({ classe: 'ranger', equipamento: { principal: item('espada-longa'), secundaria: item('espada-curta'), escudo: null, armadura: item('couro'), distancia: null } }).ficha;
    const b2 = C.createBattle({ ladoA: [duas], ladoB: [C.fromCatalog(cat.monstros.find(m => m.id === 'ogro'))], semente: 1 });
    const r = b2.get('A1');
    const inabil = duas.ataqueTotal.at(-1);
    const semFuria = C.rules.modsDeDano(b2, r, b2.get('B1'), inabil);
    r.buffs.push({ nome: 'furia', rotulo: 'Fúria', atributos: { for: 4 }, bonus: {} });
    assert.strictEqual(C.rules.modsDeDano(b2, r, b2.get('B1'), inabil) - semFuria, 1);
    // 20º nível: a fúria não deixa fatigado (no motor: `onBuffEnd` não aplica a fadiga)
    const vinte = montar({ classe: 'barbaro', nivel: 20 }).ficha;
    assert.strictEqual(vinte.especiais.find(e => e.mecanica?.efeito === 'furia').mecanica.sem_fadiga, true);
    for (const [ficha, fadiga] of [[vinte, false], [montar({ classe: 'barbaro', nivel: 19 }).ficha, true]]) {
      const bf = C.createBattle({ ladoA: [ficha], ladoB: [C.fromCatalog(cat.monstros.find(m => m.id === 'ogro'))], semente: 1 });
      bf.rodada = 2;
      const x = bf.get('A1');
      SP.freeActions(C.rules, bf, x);
      const buff = x.buffs.find(y => y.nome === 'furia');
      x.buffs = x.buffs.filter(y => y !== buff);
      SP.onBuffEnd(C.rules, bf, x, buff);
      assert.strictEqual(Boolean(x.cond.fatigado), fadiga, `${ficha.nivel}º nível`);
    }
  });

  test('duas armas (tabela 3.0): −6/−10, inábil leve −4/−8, Ambidestria tira 4 da inábil, o talento tira 2 das duas; o ranger ganha os dois só com armadura leve', () => {
    const eq = (secundaria, armadura = 'couro-batido') => ({ principal: item('espada-longa'), secundaria: item(secundaria), escudo: null, armadura: item(armadura), distancia: null });
    const bonus = r => r.ficha.ataqueTotal.map(a => a.bonus);
    // guerreiro 10: BBA 10/5, For +3
    assert.deepStrictEqual(bonus(montar({ classe: 'guerreiro', equipamento: eq('espada-longa') })), [7, 2, 3]);
    assert.deepStrictEqual(bonus(montar({ classe: 'guerreiro', equipamento: eq('espada-curta') })), [9, 4, 5]);
    assert.deepStrictEqual(bonus(montar({ classe: 'guerreiro', equipamento: eq('espada-curta'), talentos: [T('AMBIDESTRIA')] })), [9, 4, 9]);
    assert.deepStrictEqual(bonus(montar({ classe: 'guerreiro', equipamento: eq('espada-curta'), talentos: [T('AMBIDESTRIA'), T('COMBATER COM DUAS ARMAS'), T('COMBATER COM DUAS ARMAS APRIMORADO')] })), [11, 6, 11, 6]);
    assert.deepStrictEqual(bonus(montar({ classe: 'ranger', equipamento: eq('espada-curta') })), [11, 6, 11]);
    assert.deepStrictEqual(bonus(montar({ classe: 'ranger', equipamento: eq('espada-curta', 'cota-de-malha') })), [9, 4, 5], 'de armadura média o ranger perde os talentos');
    // dano: inábil soma metade da For; a espada longa sem escudo nem segunda arma vai com as duas mãos
    const ranger = montar({ classe: 'ranger', equipamento: eq('espada-curta') }).ficha;
    assert.strictEqual(ranger.ataqueTotal[2].dano, '1d6+1');
    assert.strictEqual(montar({ classe: 'guerreiro', equipamento: { principal: item('espada-longa'), secundaria: null, escudo: null, armadura: null } }).ficha.ataques[0].dano, '1d8+4');
    // o que não veio no equipamento salvo fica do kit (o do guerreiro tem escudo): de uma mão, For ×1
    assert.strictEqual(montar({ classe: 'guerreiro', equipamento: { principal: item('espada-longa') } }).ficha.ataques[0].dano, '1d8+3');
  });

  test('à distância: Des no ataque; arco só a For negativa; besta nenhuma; Tiro Rápido; besta e arremesso sem Saque Rápido: um disparo por rodada', () => {
    const arqueiro = montar({ classe: 'guerreiro', talentos: [T('TIRO CERTEIRO'), T('TIRO RÁPIDO')], equipamento: { principal: item('espada-longa'), distancia: item('arco-longo', 2) } }).ficha;
    // BBA 10 + Des 2 + 2 = 14; Tiro Rápido: +1 ataque no maior, todos −2 → 12/12/7
    assert.deepStrictEqual(arqueiro.ataqueTotalDistancia.map(a => a.bonus), [12, 12, 7]);
    assert.strictEqual(arqueiro.ataqueTotalDistancia[0].dano, '1d8+2');
    assert.deepStrictEqual(arqueiro.ataqueTotalDistancia[0].ate_9m, { ataque: 1, dano: 1, rotulo: 'Tiro Certeiro' });
    assert.strictEqual(arqueiro.ataqueTotalDistancia[0].alcance_m, 300);
    const fraco = montar({ classe: 'guerreiro', for: 6, equipamento: { principal: item('adaga'), distancia: item('arco-curto') } }).ficha;
    assert.strictEqual(fraco.ataqueTotalDistancia[0].dano, '1d6-2', 'For 6 (−2) tira do arco');
    const besteiro = montar({ classe: 'guerreiro', equipamento: { principal: item('espada-longa'), distancia: item('besta-pesada') } }).ficha;
    assert.deepStrictEqual(besteiro.ataqueTotalDistancia.map(a => [a.bonus, a.dano]), [[12, '1d10']]);
    const fundeiro = montar({ classe: 'guerreiro', equipamento: { principal: item('espada-longa'), distancia: item('funda') } }).ficha;
    assert.deepStrictEqual(fundeiro.ataqueTotalDistancia.map(a => a.bonus), [12, 7], 'na 3.0 a funda não recarrega: iterativos');
    const arremesso = montar({ classe: 'guerreiro', equipamento: { principal: item('espada-longa'), distancia: item('adaga') } }).ficha;
    assert.deepStrictEqual(arremesso.ataqueTotalDistancia.map(a => [a.nome, a.bonus, a.dano, a.incremento_m]), [['Adaga arremessada', 12, '1d4+3', 3]]);
  });

  test('halfling: as armas pela categoria (espada curta de uma mão, a longa com as duas, a grande não serve), +1 de tamanho no ataque e na CA, agarrar −4', () => {
    assert.strictEqual(E.empunhadura(E.armaPorId('espada-curta'), 'Pequeno'), 'uma mão');
    assert.strictEqual(E.empunhadura(E.armaPorId('espada-longa'), 'Pequeno'), 'duas mãos');
    assert.strictEqual(E.empunhadura(E.armaPorId('espada-grande'), 'Pequeno'), 'grande demais');
    assert.strictEqual(E.empunhadura(E.armaPorId('adaga'), 'Pequeno'), 'leve');
    const { ficha } = montar({ classe: 'ladino', raca: 'halfling', nivel: 5, des: 18, talentos: [T('ACUIDADE COM ARMA', 'adaga')], equipamento: { principal: item('adaga'), armadura: item('couro'), distancia: item('besta-leve') } });
    // Des 18 + 2 racial = 20 (+5); For 16 − 2 = 14 (+2). Adaga leve com Acuidade: BBA 3 + Des 5 + tamanho 1 = +9
    assert.strictEqual(resumo(ficha.ataques[0]), '9 1d4+2 19/x2');
    assert.deepStrictEqual(ficha.ca, { total: 18, toque: 16, surpresa: 13 });
    assert.strictEqual(ficha.agarrar, 1);
    assert.deepStrictEqual(E.kitPadrao('gue', 'Pequeno').principal, item('espada-curta'));
    assert.deepStrictEqual(E.kitPadrao('ran', 'Pequeno').secundaria, item('adaga'), 'a segunda arma do ranger Pequeno é leve');
    assert.match(montar({ classe: 'guerreiro', raca: 'halfling', equipamento: { principal: item('espada-grande') } }).erros[0], /grande demais/);
  });

  test('Acuidade com Arma (3.0): a penalidade do escudo vale no ataque; rapieira só com uma mão; Foco só na arma exata', () => {
    const esgrimista = montar({ classe: 'guerreiro', des: 18, talentos: [T('ACUIDADE COM ARMA', 'rapieira')], equipamento: { principal: item('rapieira'), escudo: item('broquel'), armadura: null } }).ficha;
    assert.strictEqual(esgrimista.ataques[0].bonus, 13, 'BBA 10 + Des 4 − broquel 1');
    assert.strictEqual(esgrimista.ataques[0].atributo_ataque, 'des');
    const pequeno = montar({ classe: 'guerreiro', raca: 'halfling', des: 18, talentos: [T('ACUIDADE COM ARMA', 'rapieira')], equipamento: { principal: item('rapieira'), escudo: null, armadura: null } }).ficha;
    assert.strictEqual(pequeno.ataques[0].atributo_ataque, 'for', 'para um Pequeno a rapieira é de duas mãos: sem Acuidade');
    const focoComposto = montar({ classe: 'guerreiro', talentos: [T('FOCO EM ARMA', 'arco longo composto')], equipamento: { principal: item('espada-longa'), distancia: item('arco-longo') } }).ficha;
    assert.strictEqual(focoComposto.ataqueTotalDistancia[0].bonus, 12, 'o Foco no arco composto não vale no arco longo comum');
  });

  test('proficiências por talento (Livro do Jogador 3.0): Usar Armadura, Usar Escudo, Usar Arma Simples; Usar Arma Comum e Exótica valem só para a arma escolhida', () => {
    const semTalento = montar({ classe: 'mago', equipamento: { principal: item('bordao'), armadura: item('couro-batido') } });
    assert.strictEqual(semTalento.ficha.ataques[0].bonus, 7, 'BBA 5 + For 3 − penalidade do couro batido 1');
    const comTalento = montar({ classe: 'mago', talentos: [T('USAR ARMADURA (LEVE)')], equipamento: { principal: item('bordao'), armadura: item('couro-batido') } });
    assert.strictEqual(comTalento.ficha.ataques[0].bonus, 8);
    assert.deepStrictEqual(comTalento.avisos, []);
    assert.strictEqual(montar({ classe: 'mago', talentos: [T('USAR ARMA SIMPLES')], equipamento: { principal: item('maca-pesada') } }).ficha.ataques[0].bonus, 8);
    assert.strictEqual(montar({ classe: 'mago', talentos: [T('USAR ARMA COMUM', 'espada longa')], equipamento: { principal: item('espada-longa'), armadura: null } }).ficha.ataques[0].bonus, 8);
    assert.strictEqual(montar({ classe: 'mago', talentos: [T('USAR ARMA COMUM', 'espada longa')], equipamento: { principal: item('espada-grande'), armadura: null } }).ficha.ataques[0].bonus, 4, 'outra arma comum: −4');
    const escudo = E.proficienciasDeTalentos([T('USAR ESCUDO')]);
    assert.ok(E.proficienteArmadura(E.armaduraPorId('broquel'), { classKey: 'mag', extras: escudo }));
    assert.ok(!E.proficienteArmadura(E.armaduraPorId('couro'), { classKey: 'mag', extras: escudo }));
  });

  test('proficiências (SRD 3.0): −4 com arma estranha; armadura sem proficiência põe a penalidade no ataque; druida de metal e monge de armadura avisam', () => {
    const mago = montar({ classe: 'mago', equipamento: { principal: item('espada-longa'), armadura: item('cota-de-malha') } });
    // BBA 5 + For 3 − 4 (arma) − 5 (penalidade da cota) = −1
    assert.strictEqual(mago.ficha.ataques[0].bonus, -1);
    assert.strictEqual(mago.avisos.length, 2);
    assert.ok(E.proficienteArma(E.armaPorId('rapieira'), { classKey: 'lad', tamanho: 'Médio' }));
    assert.ok(!E.proficienteArma(E.armaPorId('rapieira'), { classKey: 'lad', tamanho: 'Pequeno' }), 'ladino Pequeno não usa rapieira (3.0)');
    assert.ok(E.proficienteArma(E.armaPorId('arco-longo'), { classKey: 'mag', raceKey: 'elfo' }), 'elfo sabe usar arco longo');
    assert.ok(E.proficienteArma(E.armaPorId('espada-bastarda'), { classKey: 'gue', duasMaos: true }));
    assert.ok(!E.proficienteArma(E.armaPorId('espada-bastarda'), { classKey: 'gue' }), 'com uma mão, a bastarda é exótica');
    assert.ok(E.proficienteArma(E.armaPorId('espada-bastarda'), { classKey: 'gue', extras: E.proficienciasDeTalentos([T('USAR ARMA EXÓTICA', 'Espada Bastarda')]) }));
    assert.ok(!E.problemasDoEquipamento({ principal: item('espada-longa'), armadura: item('couro') }, { classKey: 'mag' }).avisos.some(a => /couro/.test(a)), 'couro não tem penalidade: sem aviso');
    assert.ok(montar({ classe: 'druida', equipamento: { principal: item('cimitarra'), armadura: item('cota-de-malha') } }).avisos.some(a => /de metal/.test(a)));
    const conflito = E.problemasDoEquipamento({ principal: item('espada-longa'), secundaria: item('adaga'), escudo: item('broquel') }, { classKey: 'gue' });
    assert.match(conflito.erros.join(' '), /mesma mão/);
  });

  test('paladino, ladino e bardo: destruir o mal, cura pelas mãos, imunidade a medo; ataque furtivo e evasão; inspirar coragem só com Atuação 3', () => {
    const pal = montar({ classe: 'paladino', nivel: 6, car: 16 }).ficha;
    const m = id => pal.especiais.find(e => e.id === id)?.mecanica;
    assert.deepStrictEqual(m('destruir-o-mal'), { efeito: 'destruir', usos: '1/dia', bonus_ataque: 3, bonus_dano: 6, alvo: 'maligno' });
    assert.deepStrictEqual(m('cura-pelas-maos'), { efeito: 'cura-pelas-maos', pv_por_dia: 18 });
    assert.ok(pal.imunidades.includes('medo'));
    const lad = montar({ classe: 'ladino', nivel: 7 }).ficha;
    assert.strictEqual(lad.especiais.find(e => e.id === 'ataque-furtivo').mecanica.dano, '4d6');
    assert.ok(lad.esquivaSobrenatural && lad.especiais.some(e => e.id === 'evasao'));
    const semAtuacao = montar({ classe: 'bardo', nivel: 5 });
    assert.ok(!semAtuacao.ficha.especiais.some(e => e.id === 'musica-de-bardo'));
    assert.ok(semAtuacao.avisos.some(a => /Atuação/.test(a)));
    const comAtuacao = montar({ classe: 'bardo', nivel: 5, ranks: { atuacao: 3 } }).ficha;
    assert.strictEqual(comAtuacao.especiais.find(e => e.id === 'musica-de-bardo').mecanica.usos, '5/dia');
    assert.ok(comAtuacao.especiais.some(e => e.id === 'magias-e7' && e.mecanica === null), 'as magias aparecem como não simuladas até a E7');
  });

  test('PV: os cadastrados; sem eles, o máximo do dado no 1º nível e a média para cima depois, + Con, com aviso; sem classe, não luta', () => {
    assert.strictEqual(pvMedios(10, 1, 2), 12);
    assert.strictEqual(pvMedios(4, 5, 2), 26);
    assert.strictEqual(pvMedios(4, 3, -3), 3, 'mínimo 1 por nível');
    const r = montar({ classe: 'mago', nivel: 5, pvs: null });
    assert.strictEqual(r.ficha.pvMax, 26);
    assert.ok(r.avisos.some(a => /média por nível/.test(a)));
    const semClasse = montar({ classe: 'inexistente' });
    assert.strictEqual(semClasse.ficha, null);
    assert.match(semClasse.erros.join(' '), /sem classe/);
    const semAtributo = montar({ classe: 'guerreiro', for: null });
    assert.match(semAtributo.erros.join(' '), /atributos/);
  });

  test('equipamento salvo com lixo vira o kit ou null; o kit padrão de cada classe não tem erro', () => {
    const eq = E.normalizarEquipamento({ principal: { id: 'nao-existe' }, escudo: { id: 'cota-de-malha' }, armadura: { id: 'brunea', melhoria: 9 } }, 'gue', 'Médio');
    assert.deepStrictEqual([eq.principal, eq.escudo, eq.armadura], [null, null, item('brunea')]);
    assert.deepStrictEqual(eq.distancia, item('arco-longo'), 'o que não veio salvo fica do kit');
    for (const ck of ['bar', 'bad', 'cle', 'dru', 'gue', 'mon', 'pal', 'ran', 'lad', 'fei', 'mag']) {
      for (const tam of ['Médio', 'Pequeno']) assert.deepStrictEqual(E.problemasDoEquipamento(E.kitPadrao(ck, tam), { classKey: ck, tamanho: tam }).erros, [], `${ck} ${tam}`);
    }
  });

  test('motor: destruir o mal só num golpe corpo a corpo (3.0: "one normal melee attack")', () => {
    const pal = montar({ classe: 'paladino', nivel: 6, car: 16 }).ficha;
    const carnical = C.fromCatalog(cat.monstros.find(m => m.id === 'carnical'));
    let b = C.createBattle({ ladoA: [pal], ladoB: [carnical], semente: 1, distancia: 30 });
    b.rodada = 2;
    C.rules.sequencia(b, b.get('A1'), b.get('B1'), [pal.ataqueTotalDistancia[0]]);
    assert.ok(!b.eventos.some(e => /Destruir/.test(e.texto)), 'com a besta, não');
    b = C.createBattle({ ladoA: [pal], ladoB: [carnical], semente: 1, distancia: 0 });
    b.rodada = 2;
    C.rules.sequencia(b, b.get('A1'), b.get('B1'), pal.ataqueTotal);
    assert.ok(b.eventos.some(e => /usa Destruir o mal/.test(e.texto)), 'com a espada, sim');
  });

  test('motor: Tiro Certeiro e Especialização à distância só até 9 m (ate_9m)', () => {
    const arqueiro = montar({ classe: 'guerreiro', talentos: [T('TIRO CERTEIRO'), T('ESPECIALIZAÇÃO EM ARMA', 'arco longo')], equipamento: { principal: item('espada-longa'), distancia: item('arco-longo') } }).ficha;
    const flecha = arqueiro.ataqueTotalDistancia[0];
    assert.deepStrictEqual(flecha.ate_9m, { ataque: 1, dano: 3, rotulo: 'Tiro Certeiro' });
    const b = C.createBattle({ ladoA: [arqueiro], ladoB: [C.fromCatalog(cat.monstros.find(m => m.id === 'ogro'))], semente: 1, distancia: 9 });
    b.rodada = 2;
    const [c, alvo] = [b.get('A1'), b.get('B1')];
    assert.strictEqual(C.rules.modsDeAtaque(b, c, alvo, flecha).total, 1);
    alvo.pos = 12;
    assert.strictEqual(C.rules.modsDeAtaque(b, c, alvo, flecha).total, 0, 'a 12 m (ainda no 1º incremento do arco longo), sem o +1');
  });

  test('sanidade em lote: guerreiro 20 bem equipado vence sempre um ND baixo; personagem de 1º nível perde sempre para o Tarrasque', () => {
    const heroi = montar({ classe: 'guerreiro', nivel: 20, for: 20, pvs: 200, talentos: [T('ATAQUE PODEROSO'), T('FOCO EM ARMA', 'espada grande'), T('ESPECIALIZAÇÃO EM ARMA', 'espada grande')], equipamento: { principal: item('espada-grande', 5), secundaria: null, escudo: null, armadura: item('armadura-completa', 5), distancia: item('arco-longo', 3) } }).ficha;
    assert.ok(heroi, 'o herói pode lutar');
    const ogro = C.fromCatalog(cat.monstros.find(m => m.id === 'ogro'));
    assert.strictEqual(C.simulate({ ladoA: [heroi], ladoB: [ogro] }, { vezes: 200, semente: 1 }).vitoriasA, 1);
    const novato = montar({ classe: 'guerreiro', nivel: 1, pvs: 12 }).ficha;
    const tarrasque = C.fromCatalog(cat.monstros.find(m => m.id === 'tarrasque'));
    assert.strictEqual(C.simulate({ ladoA: [novato], ladoB: [tarrasque] }, { vezes: 200, semente: 2 }).vitoriasB, 1);
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
