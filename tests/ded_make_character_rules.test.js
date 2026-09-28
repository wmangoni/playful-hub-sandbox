/**
 * Testes do motor de regras D&D 3.0 da ficha de personagem.
 * Executar: node tests/ded_make_character_rules.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
const data = name => require(path.join(root, 'data', `${name}.json`)).rows;

async function run() {
  const R = await load('js/rules/dnd30.js');
  const races = data('races');
  const classes = data('classes');
  const bbaRows = data('bba');
  const pericias = data('pericias');
  const byName = (rows, nome) => rows.find(r => r.nome === nome);
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Regras D&D 3.0 (ficha) ---');

  test('modificador de atributo e sinal', () => {
    assert.deepStrictEqual([3, 8, 9, 10, 11, 12, 18, 25].map(R.mod), [-4, -1, -1, 0, 0, 1, 4, 7]);
    assert.strictEqual(R.signed(2), '+2');
    assert.strictEqual(R.signed(0), '+0');
    assert.strictEqual(R.signed(-1), '−1');
  });

  test('BBA pela tabela do banco (classes básicas) e por fórmula (prestígio)', () => {
    assert.strictEqual(R.baseAttackBonus(4, { classKey: 'gue', bbaRows }), 4);
    assert.strictEqual(R.baseAttackBonus(8, { classKey: 'mag', bbaRows }), 4);
    assert.strictEqual(R.baseAttackBonus(7, { classKey: 'lad', bbaRows }), 5);
    assert.strictEqual(R.baseAttackBonus(6, { bbaTipo: 'medio' }), 4);
    assert.strictEqual(R.baseAttackBonus(6, { bbaTipo: 'ruim' }), 3);
    assert.deepStrictEqual(R.iterativeAttacks(11), [11, 6, 1]);
    assert.deepStrictEqual(R.iterativeAttacks(20), [20, 15, 10, 5]);
    assert.deepStrictEqual(R.iterativeAttacks(5), [5]);
  });

  test('resistências base boas e ruins', () => {
    assert.deepStrictEqual([1, 4, 20].map(l => R.baseSave(l, true)), [2, 4, 12]);
    assert.deepStrictEqual([1, 4, 20].map(l => R.baseSave(l, false)), [0, 1, 6]);
  });

  test('XP, graduação máxima e aumentos de atributo', () => {
    assert.deepStrictEqual([1, 2, 4, 5, 20].map(R.xpForLevel), [0, 1000, 6000, 10000, 190000]);
    assert.deepStrictEqual(R.maxRanks(4), { classe: 7, cruzada: 3.5 });
    assert.strictEqual(R.abilityIncreases(12), 3);
  });

  test('pontos de perícia (×4 no 1º nível, mínimo 1 por nível, bônus humano)', () => {
    assert.deepStrictEqual(R.skillPoints(4, 'gue', 3, true), { base: 2, perLevel: 6, first: 24, total: 42 });
    assert.strictEqual(R.skillPoints(1, 'lad', 0, false).total, 32);
    assert.strictEqual(R.skillPoints(3, 'mag', -4, false).total, 6, 'mínimo de 1 ponto por nível');
    assert.strictEqual(R.skillPoints(3, null, 0, false), null, 'classe sem tabela');
  });

  test('talentos: gerais, humano e adicionais de guerreiro/mago', () => {
    assert.deepStrictEqual(R.featsAvailable(4, 'gue', true), { general: 3, bonus: 3, bonusLabel: 'talentos adicionais de guerreiro', total: 6 });
    assert.strictEqual(R.featsAvailable(10, 'mag', false).bonus, 2);
    assert.strictEqual(R.featsAvailable(1, 'lad', false).total, 1);
  });

  test('capacidade de carga em kg (For e tamanho)', () => {
    assert.deepStrictEqual(R.carryingCapacity(18, 1), { leve: 50, media: 100, pesada: 150, acimaCabeca: 150, doChao: 300, empurrar: 750 });
    assert.strictEqual(R.carryingCapacity(10, 0.75).pesada, 38);
    assert.strictEqual(R.carryingCapacity(39, 1).pesada, 2800, 'For > 29: ×4 a cada 10 pontos');
  });

  test('magias por dia com magias adicionais e CD', () => {
    const mago = R.spellcasting('mag', 5, 17);
    assert.deepStrictEqual(mago.niveis.slice(0, 4).map(l => l.total), [4, 4, 3, 2]);
    assert.strictEqual(mago.niveis[1].cd, 14);
    assert.strictEqual(mago.niveis[4].base, null);
    const clerigo = R.spellcasting('cle', 1, 15);
    assert.strictEqual(clerigo.niveis[1].dominio, 1);
    assert.strictEqual(R.spellcasting('pal', 3, 14), null, 'paladino conjura a partir do 4º nível');
    const baixo = R.spellcasting('mag', 3, 11);
    assert.strictEqual(baixo.niveis[2].bloqueado, true, 'Int 11 não lança magias de 2º nível');
    assert.strictEqual(R.spellcasting('gue', 5, 18), null);
  });

  test('ficha completa do seed (Jonh, Guerreiro 4, Humano)', () => {
    const jonh = data('personagens')[0];
    const sheet = R.computeSheet(jonh, { race: races.find(r => r.id === jonh.race_id), classe: classes.find(c => c.id === jonh.classe_id), bbaRows, pericias });
    assert.deepStrictEqual(sheet.atributos.map(a => [a.abbr, a.total, a.mod]), [['FOR', 18, 4], ['DES', 14, 2], ['CON', 15, 2], ['INT', 16, 3], ['SAB', 16, 3], ['CAR', 12, 1]]);
    assert.deepStrictEqual(sheet.resistencias.map(s => s.total), [6, 3, 4]);
    assert.strictEqual(sheet.bba.valor, 4);
    assert.strictEqual(sheet.corpoACorpo.total, 8);
    assert.strictEqual(sheet.distancia.total, 6);
    assert.strictEqual(sheet.ca.total, 12);
    assert.strictEqual(sheet.iniciativa.total, 2);
    assert.strictEqual(sheet.deslocamento, 9);
    assert.strictEqual(sheet.pontosPericia.total, 42);
    assert.strictEqual(sheet.pericias.length, 45);
    assert.ok(sheet.pericias.find(p => p.nome === 'Escalar').classe, 'Escalar é perícia de classe do guerreiro');
    assert.strictEqual(sheet.magias, null);
  });

  test('ajustes raciais, tamanho e traços (Anão e Halfling)', () => {
    const base = { nome: 'T', nivel: 1, for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10, iniciativa: 0, pvs: 8 };
    const anao = R.computeSheet(base, { race: byName(races, 'Anão'), classe: byName(classes, 'Guerreiro'), bbaRows, pericias });
    assert.strictEqual(anao.atributos.find(a => a.key === 'con').total, 12);
    assert.strictEqual(anao.atributos.find(a => a.key === 'car').total, 8);
    assert.strictEqual(anao.deslocamento, 6);
    const halfling = R.computeSheet(base, { race: byName(races, 'Halfling'), classe: byName(classes, 'Ladino'), bbaRows, pericias });
    assert.strictEqual(halfling.identidade.tamanho, 'Pequeno');
    assert.strictEqual(halfling.ca.total, 12, '10 + Des +1 (racial) + tamanho Pequeno +1');
    assert.strictEqual(halfling.distancia.total, 0 + 1 + 1, 'BBA 0 + Des +1 (racial) + tamanho +1');
    assert.deepStrictEqual(halfling.resistencias.map(s => s.total), [1, 4, 1], 'Ladino: Ref boa; +1 racial em todas');
    assert.strictEqual(halfling.pericias.find(p => p.nome === 'Esconder-se').diversos, 4, 'tamanho Pequeno +4');
    assert.strictEqual(halfling.pericias.find(p => p.nome === 'Furtividade').diversos, 2, 'bônus racial');
    assert.deepStrictEqual(halfling.divergenciasRaca, [], 'compêndio do halfling bate com a 3.0');
    const renomeada = R.computeSheet(base, { race: { ...byName(races, 'Anão'), nome: 'Anão da Montanha' }, classe: byName(classes, 'Guerreiro'), bbaRows, pericias });
    assert.strictEqual(renomeada.deslocamento, 6, 'raça renomeada mantém os traços pelo id');
    assert.strictEqual(R.raceKeyOf({ id: 8, nome: 'Tiefling' }), null, 'raça nova não herda traços');
  });

  test('raças seguem a 3.0 quando o compêndio diverge (Gnomo Pequeno, Meio-orc −2 Int)', () => {
    const base = { nome: 'T', nivel: 1, for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10, iniciativa: 0, pvs: 8 };
    const gnomo = R.computeSheet(base, { race: byName(races, 'Gnomo'), classe: byName(classes, 'Bardo'), bbaRows, pericias });
    assert.strictEqual(gnomo.identidade.tamanho, 'Pequeno');
    assert.strictEqual(gnomo.ca.total, 11, '10 + tamanho Pequeno +1');
    assert.deepStrictEqual(gnomo.divergenciasRaca, ['tamanho Pequeno (o compêndio registra Médio)']);
    const orc = R.computeSheet(base, { race: byName(races, 'Meio-orc'), classe: byName(classes, 'Bárbaro'), bbaRows, pericias });
    assert.deepStrictEqual(['for', 'int', 'car'].map(k => orc.atributos.find(a => a.key === k).total), [12, 8, 8]);
    assert.strictEqual(orc.divergenciasRaca.length, 1);
    assert.match(orc.divergenciasRaca[0], /^ajustes de atributo \+2 FOR, −2 INT, −2 CAR \(o compêndio registra \+2 FOR, −2 CAR\)$/);
  });

  test('classes básicas seguem a 3.0 e a ficha aponta divergências do compêndio (Ranger)', () => {
    const base = { nome: 'R', nivel: 5, for: 14, des: 14, con: 12, int: 10, sab: 12, car: 10, iniciativa: 0, pvs: 40 };
    const ranger = R.computeSheet(base, { race: byName(races, 'Humano'), classe: byName(classes, 'Ranger'), bbaRows, pericias });
    assert.strictEqual(ranger.pv.dadoVida, 'd10', '3.0: Ranger d10');
    assert.deepStrictEqual(ranger.resistencias.map(s => s.base), [4, 1, 1], '3.0: só Fortitude boa');
    assert.strictEqual(ranger.divergencias.length, 3);
    assert.match(ranger.divergencias[2], /^perícias de classe pela lista da 3\.0 \(o compêndio difere em \d+: /);
    assert.ok(ranger.habilidadesClasse.some(h => /Inimigo predileto: 2 inimigos/.test(h)));
  });

  test('Graça divina do paladino, CA e deslocamento do monge, fúria do bárbaro', () => {
    const base = { nome: 'P', nivel: 5, for: 14, des: 12, con: 12, int: 10, sab: 16, car: 16, iniciativa: 0, pvs: 40 };
    const humano = byName(races, 'Humano');
    const pal = R.computeSheet(base, { race: humano, classe: byName(classes, 'Paladino'), bbaRows, pericias });
    assert.deepStrictEqual(pal.resistencias.map(s => s.total), [4 + 1 + 3, 1 + 1 + 3, 1 + 3 + 3]);
    const monge = R.computeSheet(base, { race: humano, classe: byName(classes, 'Monge'), bbaRows, pericias });
    assert.strictEqual(monge.ca.total, 10 + 1 + 3 + 1, 'Des +1, Sab +3 e +1 no 5º nível');
    assert.strictEqual(monge.deslocamento, 12);
    assert.strictEqual(monge.habilidadesClasse[0], 'Ataque desarmado +5 (base +3 + For e tamanho) · dano 1d8');
    assert.ok(monge.habilidadesClasse.includes('Ataque atordoante 5/dia (Fortitude CD 15)'), '10 + ½ nível + Sab');
    // SRD 3.0: monges Pequenos e anões têm tabela própria de deslocamento; Pequenos, de dano desarmado
    const mongeHalfling = R.computeSheet({ ...base, nivel: 6 }, { race: byName(races, 'Halfling'), classe: byName(classes, 'Monge'), bbaRows, pericias });
    assert.strictEqual(mongeHalfling.deslocamento, 10.5, '35 pés no 6º nível');
    assert.ok(mongeHalfling.habilidadesClasse[0].endsWith('dano 1d6'));
    const mongeAnao = R.computeSheet({ ...base, nivel: 3 }, { race: byName(races, 'Anão'), classe: byName(classes, 'Monge'), bbaRows, pericias });
    assert.strictEqual(mongeAnao.deslocamento, 7.5, '25 pés no 3º nível');
    assert.ok(mongeAnao.habilidadesClasse[0].endsWith('dano 1d6'), 'anão é Médio: dano normal');
    const barb = R.computeSheet({ ...base, nivel: 8 }, { race: humano, classe: byName(classes, 'Bárbaro'), bbaRows, pericias });
    assert.strictEqual(barb.deslocamento, 12);
    assert.ok(barb.habilidadesClasse[0].startsWith('Fúria 3/dia'));
    const ladino = R.computeSheet({ ...base, nivel: 7 }, { race: humano, classe: byName(classes, 'Ladino'), bbaRows, pericias });
    assert.ok(ladino.habilidadesClasse.includes('Ataque furtivo +4d6'));
    const fei = R.spellcasting('fei', 1, 16);
    assert.strictEqual(fei.conhecidas, true);
    assert.strictEqual(fei.niveis[1].conhecidas, 2);
  });

  test('progressões de habilidades de classe seguem o SRD 3.0', () => {
    const feats = (cls, nivel) => R.computeSheet({ nome: 'X', nivel, for: 14, des: 12, con: 12, int: 12, sab: 14, car: 14, iniciativa: 0, pvs: 10 }, { race: byName(races, 'Humano'), classe: byName(classes, cls), bbaRows, pericias }).habilidadesClasse;
    const bar20 = feats('Bárbaro', 20);
    assert.ok(bar20.includes('Fúria 6/dia (+4 For, +4 Con, +2 em Vontade, −2 na CA)'));
    assert.ok(bar20.includes('Redução de dano 4/—'), 'RD 4/— no 20º');
    assert.ok(bar20.includes('Fúria maior: +6 For, +6 Con, +3 em Vontade'));
    assert.ok(feats('Bárbaro', 19).includes('Esquiva sobrenatural: mantém a Des na CA; não pode ser flanqueado; +4 contra armadilhas'));
    assert.ok(!feats('Bárbaro', 14).some(f => f.startsWith('Fúria maior')), 'fúria maior só no 15º');
    const wildShape = nivel => feats('Druida', nivel).find(f => f.startsWith('Forma selvagem '))?.match(/(\d)\/dia/)[1];
    assert.deepStrictEqual([5, 6, 7, 9, 10, 14, 18].map(wildShape), ['1', '2', '3', '3', '4', '5', '6']);
    assert.ok(feats('Paladino', 15).includes('Destruir o mal 1/dia (+Car no ataque, +15 no dano)'), 'sempre 1/dia na 3.0');
    assert.ok(feats('Paladino', 15).includes('Remover doença 5/semana'));
    assert.ok(feats('Paladino', 5).includes('Montaria especial'));
    const bardo14 = feats('Bardo', 14);
    assert.ok(bardo14.includes('Inspirar coragem: +2 contra enfeitiçar e medo, +1 no ataque e no dano (Atuação 3+)'), 'efeito fixo na 3.0');
    assert.ok(!bardo14.some(f => /coragem \+[34]/.test(f)));
    assert.ok(bardo14.includes('Inspirar grandeza (Atuação 12+)'));
    assert.ok(!feats('Bardo', 1).includes('Inspirar competência (Atuação 6+)'), 'graduação máxima 4 no 1º nível');
    const ladino13 = feats('Ladino', 13);
    assert.ok(ladino13.includes('Habilidades especiais de ladino: 2 à escolha'));
    assert.ok(ladino13.includes('Esquiva sobrenatural: mantém a Des na CA; não pode ser flanqueado; +1 contra armadilhas'));
  });

  test('perícias de classe pela lista da 3.0 (e não pelas flags 3.5 do compêndio)', () => {
    const base = { nome: 'S', nivel: 1, for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10, iniciativa: 0, pvs: 8 };
    const sheetOf = cls => R.computeSheet(base, { race: byName(races, 'Humano'), classe: byName(classes, cls), bbaRows, pericias });
    const classe = (sheet, nome) => sheet.pericias.find(p => p.nome === nome).classe;
    const guerreiro = sheetOf('Guerreiro');
    assert.strictEqual(classe(guerreiro, 'Intimidação'), false, 'Intimidação não é de guerreiro na 3.0');
    assert.match(guerreiro.divergencias.at(-1), /Intimidação/);
    assert.strictEqual(classe(sheetOf('Paladino'), 'Abrir Fechaduras'), false);
    const mago = sheetOf('Mago');
    assert.ok(mago.pericias.filter(p => p.nome.startsWith('Conhecimento')).every(p => p.classe), 'mago: todos os Conhecimentos');
    assert.strictEqual(classe(mago, 'Decifrar Escrita'), false);
    assert.strictEqual(classe(sheetOf('Bardo'), 'Usar Intrumento Mágico'), true, 'casa o nome com o erro do dump');
    assert.strictEqual(classe(sheetOf('Ranger'), 'Sobrevivência'), true, 'Wilderness Lore → Sobrevivência');
    const algoz = R.computeSheet(base, { race: byName(races, 'Humano'), classe: classes.find(c => c.id === 13), bbaRows, pericias });
    assert.ok(algoz.pericias.every(p => p.classe === null), 'classe de prestígio: sem marca de classe/outra classe');
  });

  test('dados ausentes ficam em branco e o nível é limitado a 1–20', () => {
    const base = { nome: 'B', nivel: 3, for: 12, des: 14, con: 10, int: 10, sab: 10, car: 10, iniciativa: 1, pvs: 20 };
    const orfao = R.computeSheet(base, { race: null, classe: null, bbaRows, pericias });
    assert.strictEqual(orfao.bba.valor, null);
    assert.deepStrictEqual(orfao.bba.ataques, []);
    assert.deepStrictEqual(orfao.resistencias.map(s => s.total), [null, null, null]);
    assert.strictEqual(orfao.ca.total, null, 'sem raça não há tamanho');
    assert.strictEqual(orfao.identidade.tamanho, null);
    assert.strictEqual(orfao.corpoACorpo.total, null);
    assert.strictEqual(orfao.carga, null);
    assert.strictEqual(orfao.pontosPericia, null);
    assert.strictEqual(orfao.iniciativa.total, 3, 'Des +2 + diversos 1 não depende de raça/classe');
    const semDes = R.computeSheet({ ...base, des: null }, { race: byName(races, 'Humano'), classe: byName(classes, 'Guerreiro'), bbaRows, pericias });
    assert.strictEqual(semDes.ca.total, null);
    assert.strictEqual(semDes.iniciativa.total, null);
    assert.strictEqual(semDes.distancia.total, null);
    assert.strictEqual(semDes.corpoACorpo.total, 3 + 1);
    assert.strictEqual(semDes.resistencias[1].total, null);
    const guerreiro = nivel => R.computeSheet({ ...base, nivel }, { race: byName(races, 'Humano'), classe: byName(classes, 'Guerreiro'), bbaRows, pericias });
    assert.strictEqual(guerreiro(0).nivel, 1);
    assert.strictEqual(guerreiro(0).nivelForaDaFaixa, true);
    const g25 = guerreiro(25);
    assert.deepStrictEqual([g25.nivel, g25.nivelForaDaFaixa, g25.bba.ataques.join('/'), g25.xp.proximo], [20, true, '20/15/10/5', null]);
    assert.strictEqual(guerreiro(7).nivelForaDaFaixa, false);
  });

  test('idiomas automáticos e condicionais separados por uso', () => {
    const base = { nome: 'I', nivel: 1, for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10, iniciativa: 0, pvs: 8 };
    const anao = R.computeSheet(base, { race: byName(races, 'Anão'), classe: byName(classes, 'Clérigo'), bbaRows, pericias });
    assert.deepStrictEqual(anao.idiomas.automaticos, ['Comum', 'Anão']);
    assert.deepStrictEqual(anao.condicionais, ['+2 contra venenos', '+2 contra magias e efeitos similares a magia']);
    assert.deepStrictEqual(anao.condicionaisCombate, ['+1 de ataque contra orcs e goblinoides', '+4 de esquiva na CA contra gigantes']);
  });

  test('monge em níveis altos, RD/RM nas caixas, inimigos prediletos e tamanhos da forma selvagem', () => {
    const base = { nome: 'M', nivel: 20, for: 12, des: 14, con: 12, int: 10, sab: 16, car: 10, iniciativa: 0, pvs: 90 };
    const sheet = (cls, nivel, race = 'Humano') => R.computeSheet({ ...base, nivel }, { race: byName(races, race), classe: byName(classes, cls), bbaRows, pericias });
    const monge = nivel => sheet('Monge', nivel);
    assert.ok(monge(7).habilidadesClasse.includes('Integridade corporal: cura 14 PV/dia em si mesmo'));
    assert.ok(monge(13).habilidadesClasse.includes('Alma de diamante: resistência à magia 23'));
    assert.ok(monge(15).habilidadesClasse.includes('Palma vibrante 1/semana (Fortitude CD 20)'), '10 + 7 + Sab 3');
    assert.ok(monge(20).habilidadesClasse.includes('Eu perfeito: extraplanar, redução de dano 20/+1'));
    assert.ok(!monge(6).habilidadesClasse.some(h => /Imobilização Aprimorada/.test(h)), 'talento concedido fica só em "Talentos concedidos"');
    assert.deepStrictEqual([monge(12).resistenciaMagia, monge(13).resistenciaMagia, monge(20).resistenciaMagia, monge(20).reducaoDano], [null, 23, 30, '20/+1']);
    assert.deepStrictEqual([10, 11, 14, 17, 20].map(n => sheet('Bárbaro', n).reducaoDano), [null, '1/—', '2/—', '3/—', '4/—']);
    assert.strictEqual(sheet('Guerreiro', 20).reducaoDano, null);
    assert.ok(sheet('Ranger', 10).habilidadesClasse.includes('Inimigo predileto: 3 inimigos (+3, +2 e +1 em Blefar, Ouvir, Sentir Motivação, Observar, Sobrevivência e no dano)'));
    assert.ok(sheet('Ranger', 1).habilidadesClasse.some(h => h.startsWith('Inimigo predileto: 1 inimigo (+1 em Blefar')));
    assert.ok(sheet('Druida', 15).habilidadesClasse.includes('Forma selvagem 5/dia (animal Miúdo, Pequeno, Médio, Grande, Enorme; atroz)'));
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
