/**
 * Escolhas de perícias e talentos (D&D 3.0): vagas, pontos, requisitos e progressão.
 * Executar: node tests/ded_make_character_choices.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'ded_make_character', 'data');
const data = table => JSON.parse(fs.readFileSync(path.join(DATA, `${table}.json`), 'utf8')).rows;

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// Catálogo de exemplo no formato do compêndio (os talentos reais do LdJ 3.0 são testados no fim).
const F = (id, nome, requisitos, tipo = null, beneficio = '') => ({ id, nome, tipo, requisitos, beneficio, normal: null, fonte: 'Livro do Jogador 3.0 (SRD 3.0)' });
const catalog = [
  F(1, 'ATAQUE PODEROSO', 'For 13', 'GUE'),
  F(2, 'TRESPASSAR', 'For 13, Ataque Poderoso', 'GUE'),
  F(3, 'FOCO EM ARMA', 'Usar Arma Comum, bônus base de ataque +1', 'GUE', 'Pode ser escolhido várias vezes (outra arma).'),
  F(4, 'ESPECIALIZAÇÃO EM ARMA', 'Foco em Arma (arma escolhida), proficiência com a arma escolhida, 4º nível de guerreiro', 'GUE', 'Pode ser escolhido várias vezes (outra arma).'),
  F(5, 'ATAQUE ATORDOANTE', 'Des 13, Sab 13, Ataque Desarmado Aprimorado, bônus base de ataque +8', 'GUE'),
  F(6, 'ATAQUE DESARMADO APRIMORADO', 'Nenhum', 'GUE'),
  F(7, 'ESQUIVA', 'Des 13', 'GUE'),
  F(8, 'MOBILIDADE', 'Des 13, Esquiva', 'GUE'),
  F(9, 'MAXIMIZAR MAGIA', 'Nenhum', 'METAMÁGICO'),
  F(10, 'MÚSICA ADICIONAL', 'Habilidade de classe música de bardo'),
  F(11, 'FÔLEGO DRACÔNICO', 'Herança Dracônica, Con 13'),
  F(12, 'FORÇA ÉPICA', 'For 25', 'ÉPICO'),
  F(13, 'TALENTO DE ANÃO', 'Anão ou forjado bélico (warforged)'),
  F(14, 'CANÇÃO LONGA', 'Atuação 8 graduações, habilidade de classe música de bardo'),
  F(15, 'INICIATIVA APRIMORADA', 'Nenhum', 'GUE'),
  F(16, 'REFLEXOS RÁPIDOS', 'Nenhum'),
  F(17, 'PRONTIDÃO', 'Nenhum'),
  F(18, 'FOCO EM PERÍCIA', 'Nenhum', null, 'Pode ser escolhido várias vezes (outra perícia).'),
  F(19, 'GOLPE TARDIO', 'bônus base de ataque +4', 'GUE'),
  F(21, 'VITALIDADE', 'Nenhum', null, 'Pode ser escolhido várias vezes (os efeitos se acumulam).'),
  F(22, 'TOLERÂNCIA PROFANA', 'Habilidade de fascinar mortos-vivos'),
  F(23, 'EXPULSÃO ADICIONAL', 'habilidade de expulsar ou fascinar mortos-vivos', 'ESPECIAL', 'Pode ser escolhido várias vezes.'),
  F(24, 'LUZ SAGRADA', 'Capacidade de expulsar mortos-vivos'),
  F(25, 'SALTO FELINO', '5 graduações em Acrobacia'),
  F(26, 'SANGUE MISTO', 'Ascendência parcialmente humana (como meio-elfo ou meio-orc)'),
  F(27, 'ASAS DO VENTO', 'Deslocamento de voo'),
];

async function run() {
  const R = await import('../ded_make_character/js/rules/dnd30.js');
  const C = await import('../ded_make_character/js/rules/choices30.js');
  const races = data('races');
  const classes = data('classes');
  const pericias = data('pericias');
  const bbaRows = data('bba');
  const byName = (rows, nome) => rows.find(r => r.nome === nome);
  const base = { nome: 'T', nivel: 4, for: 18, des: 14, con: 14, int: 12, sab: 14, car: 10, iniciativa: 0, pvs: 30, tendencia: 'LB' };
  const setup = ({ cls = 'Guerreiro', race = 'Humano', nivel = 4, attrs = {}, chosen = [], ranks = {}, cat = catalog } = {}) => {
    const personagem = { ...base, ...attrs, nivel };
    const classe = byName(classes, cls);
    const sheet = R.computeSheet(personagem, { race: byName(races, race), classe, bbaRows, pericias });
    const ctx = C.buildContext({ sheet, personagem, classe, bbaRows, catalog: cat, chosen: chosen.map(c => (typeof c === 'number' ? { talento_id: c } : c)), ranks });
    return { sheet, ctx, ev: id => C.evaluateFeat(cat.find(f => f.id === id), ctx) };
  };

  console.log('--- Escolhas D&D 3.0 (perícias e talentos) ---');

  await test('vagas de talento por nível: gerais, humano, guerreiro e mago', () => {
    const g4 = C.featSlots(4, 'gue', true);
    assert.deepStrictEqual(g4.map(s => [s.nivel, s.tipo]), [[1, 'geral'], [1, 'geral'], [1, 'guerreiro'], [2, 'guerreiro'], [3, 'geral'], [4, 'guerreiro']]);
    assert.deepStrictEqual(C.featSlots(10, 'mag', false).map(s => [s.nivel, s.tipo]), [[1, 'geral'], [3, 'geral'], [5, 'mago'], [6, 'geral'], [9, 'geral'], [10, 'mago']]);
    assert.strictEqual(C.featSlots(20, 'lad', false).length, 1 + Math.floor(20 / 3));
  });

  await test('perícias: custo, graduação máxima, meia graduação e exclusivas', () => {
    const { sheet } = setup(); // guerreiro 4, humano, Int 12
    const rules = Object.fromEntries(C.skillRules(sheet).map(r => [r.key, r]));
    assert.deepStrictEqual([rules.escalar.custo, rules.escalar.max, rules.escalar.passo], [1, 7, 1]);
    assert.deepStrictEqual([rules.blefar.custo, rules.blefar.max, rules.blefar.passo], [2, 3.5, 0.5]);
    assert.strictEqual(rules['decifrar escrita'].bloqueada, true, 'exclusiva de bardo/ladino');
    assert.strictEqual(sheet.pontosPericia.total, (2 + 1) * 4 + 4 + (2 + 1 + 1) * 3, '(2 + Int 1) × 4 + humano 4 + 4 por nível');
    const ok = C.validateSkills(sheet, { escalar: 7, blefar: 1.5, natacao: 2 });
    assert.deepStrictEqual([ok.gastos, ok.erros], [7 + 3 + 2, []]);
    const bad = C.validateSkills(sheet, { escalar: 8, saltar: 2.5, blefar: 1.25, 'decifrar escrita': 1, cavalgar: 20 });
    assert.ok(bad.erros.some(e => /Escalar: no máximo 7/.test(e)));
    assert.ok(bad.erros.some(e => /Saltar: perícia de classe usa graduações inteiras/.test(e)));
    assert.ok(bad.erros.some(e => /Blefar: perícia de outra classe usa meias graduações/.test(e)));
    assert.ok(bad.erros.some(e => /Decifrar Escrita é perícia exclusiva/.test(e)));
    assert.ok(bad.erros.some(e => /acima do disponível/.test(e)));
  });

  await test('requisitos: atributo, talento, BBA, nível de classe e habilidade de classe', () => {
    assert.strictEqual(setup().ev(1).status, 'disponivel', 'For 18 ≥ 13');
    assert.deepStrictEqual(setup({ attrs: { for: 12 } }).ev(1).falta, ['For 13']);
    assert.deepStrictEqual(setup().ev(2).falta, ['Ataque Poderoso']);
    assert.strictEqual(setup({ chosen: [1] }).ev(2).status, 'disponivel');
    const esp4 = setup({ chosen: [{ talento_id: 3, parametro: 'espada longa' }] }).ev(4);
    assert.deepStrictEqual([esp4.status, esp4.nivel], ['disponivel', 4]);
    assert.strictEqual(setup({ nivel: 3, chosen: [3] }).ev(4).status, 'bloqueado', 'só no 4º nível de guerreiro');
    assert.strictEqual(setup({ cls: 'Bárbaro', chosen: [3] }).ev(4).status, 'bloqueado');
    // monge: Ataque Desarmado Aprimorado é concedido; BBA médio chega a +8 no 11º nível
    const monge10 = setup({ cls: 'Monge', nivel: 10, attrs: { des: 14, sab: 14 } }).ev(5);
    assert.deepStrictEqual(monge10.falta, ['bônus base de ataque +8']);
    const monge11 = setup({ cls: 'Monge', nivel: 11, attrs: { des: 14, sab: 14 } }).ev(5);
    assert.deepStrictEqual([monge11.status, monge11.nivel], ['disponivel', 11]);
    assert.strictEqual(setup({ cls: 'Bardo' }).ev(10).status, 'disponivel');
    assert.strictEqual(setup().ev(10).status, 'bloqueado', 'guerreiro não tem música de bardo');
  });

  await test('requisitos: graduações, raça, talento fora do compêndio e épico', () => {
    assert.deepStrictEqual(setup({ cls: 'Bardo', nivel: 5, ranks: { atuacao: 7 } }).ev(14).falta, ['Atuação 8 graduações']);
    const bardo = setup({ cls: 'Bardo', nivel: 5, ranks: { atuacao: 8 } }).ev(14);
    assert.deepStrictEqual([bardo.status, bardo.nivel], ['disponivel', 5], '8 graduações só a partir do 5º nível');
    assert.strictEqual(setup({ race: 'Anão' }).ev(13).status, 'disponivel');
    assert.strictEqual(setup().ev(13).status, 'bloqueado', 'humano do Livro do Jogador nunca é forjado bélico');
    const draco = setup().ev(11);
    assert.deepStrictEqual([draco.status, draco.confirmar], ['confirmar', ['Herança Dracônica']]);
    assert.strictEqual(setup({ attrs: { con: 12 } }).ev(11).status, 'bloqueado', 'Con 12 < 13 bloqueia mesmo com o resto a confirmar');
    assert.strictEqual(setup({ attrs: { for: 30 } }).ev(12).status, 'bloqueado', 'épico: só depois do 20º nível');
  });

  await test('progressão: vagas por nível, pré-requisito antes do dependente e vaga de mago', () => {
    // Guerreiro 4 humano: 3 gerais (1, 1, 3) + 3 de guerreiro (1, 2, 4)
    const full = setup({ chosen: [7, 8, 1, 2, 15, { talento_id: 3, parametro: 'espada longa' }] });
    const ok = C.validateFeats(full.ctx, true);
    assert.deepStrictEqual(ok.erros, []);
    assert.deepStrictEqual(ok.restantes, { geral: 0, guerreiro: 0, mago: 0 });
    const level = nome => ok.vagas.find(v => v.talento === nome)?.nivel;
    assert.ok(level('Esquiva') <= level('Mobilidade'), 'Esquiva não vem depois de Mobilidade');
    // Três talentos que exigem BBA +4: só há vagas do 4º nível em diante para um deles
    const late = setup({ chosen: [19, 1, 7] });
    assert.strictEqual(C.validateFeats(late.ctx, true).erros.length, 0, 'BBA +4 cabe na vaga de guerreiro do 4º nível');
    const cat2 = [...catalog, F(20, 'GOLPE TARDIO II', 'bônus base de ataque +4', 'GUE')];
    const tooLate = setup({ cat: cat2, chosen: [19, 20] });
    assert.ok(C.validateFeats(tooLate.ctx, true).erros.some(e => /a partir do 4º nível/.test(e)));
    // Especialização exige parâmetro; talento repetido sem ser múltiplo é erro
    const rep = setup({ chosen: [1, 1, { talento_id: 3 }] });
    const erros = C.validateFeats(rep.ctx, true).erros;
    assert.ok(erros.some(e => /Ataque Poderoso foi escolhido mais de uma vez/.test(e)));
    assert.ok(erros.some(e => /Foco em Arma: informe a arma/.test(e)));
    // Mago 5: vaga de mago aceita metamágico, não talento geral
    const mago = setup({ cls: 'Mago', nivel: 5, race: 'Elfo', attrs: { int: 16 }, chosen: [9, 16, 17] });
    const vm = C.validateFeats(mago.ctx, false);
    assert.deepStrictEqual(vm.erros, [], 'geral 1º + geral 3º + mago 5º (Maximizar)');
    assert.strictEqual(vm.vagas.find(v => v.tipo === 'mago').talento, 'Maximizar Magia');
    const mago2 = setup({ cls: 'Mago', nivel: 5, race: 'Elfo', attrs: { int: 16 }, chosen: [15, 16, 17] });
    assert.ok(C.validateFeats(mago2.ctx, false).erros.some(e => /não sobra vaga/.test(e)));
  });

  await test('repetição, "(arma escolhida)", expulsar × fascinar e casos que o verificador decide', () => {
    // talento cumulativo sem parâmetro (Vitalidade) pode ser escolhido de novo
    assert.deepStrictEqual(C.validateFeats(setup({ chosen: [21, 21] }).ctx, true).erros, []);
    // a Especialização exige Foco em Arma da MESMA arma
    const mix = setup({ chosen: [{ talento_id: 3, parametro: 'espada longa' }, { talento_id: 4, parametro: 'machado de batalha' }] });
    assert.ok(C.validateFeats(mix.ctx, true).erros.some(e => /Especialização em Arma \(machado de batalha\): falta Foco em Arma \(machado de batalha\)/.test(e)));
    const same = setup({ chosen: [{ talento_id: 3, parametro: 'espada longa' }, { talento_id: 4, parametro: 'Espada Longa' }] });
    assert.deepStrictEqual(C.validateFeats(same.ctx, true).erros, []);
    // foco com o mesmo parâmetro duas vezes é erro; com outra arma, não
    assert.ok(C.validateFeats(setup({ chosen: [{ talento_id: 3, parametro: 'adaga' }, { talento_id: 3, parametro: 'adaga' }] }).ctx, true).erros.some(e => /mesmo parâmetro/.test(e)));
    // SRD 3.0: clérigo bom expulsa, mau fascina, neutro escolhe; paladino só expulsa (3º nível)
    const st = (cls, tendencia, id, nivel = 5) => setup({ cls, nivel, attrs: { tendencia } }).ev(id).status;
    assert.deepStrictEqual(['LB', 'LM', 'N'].map(t => st('Clérigo', t, 22)), ['bloqueado', 'disponivel', 'confirmar'], 'fascinar');
    assert.deepStrictEqual(['LB', 'LM', 'N'].map(t => st('Clérigo', t, 24)), ['disponivel', 'bloqueado', 'confirmar'], 'expulsar');
    assert.deepStrictEqual(['LB', 'LM', 'N'].map(t => st('Clérigo', t, 23)), ['disponivel', 'disponivel', 'disponivel'], 'expulsar ou fascinar');
    assert.deepStrictEqual([st('Paladino', 'LB', 22), st('Paladino', 'LB', 24), st('Paladino', 'LB', 24, 2)], ['bloqueado', 'disponivel', 'bloqueado']);
    // singular/plural da perícia, ascendência (texto entre parênteses) e voo natural
    assert.deepStrictEqual(setup({ ranks: { acrobacias: 2 } }).ev(25).falta, ['5 graduações em Acrobacia']);
    assert.deepStrictEqual([setup({ race: 'Meio-elfo' }).ev(26).status, setup().ev(26).status], ['disponivel', 'bloqueado']);
    assert.strictEqual(setup().ev(27).status, 'bloqueado', 'nenhuma raça do Livro do Jogador voa');
  });

  await test('sinergias de perícia da 3.0 (+2 com 5 graduações)', () => {
    const sheet = R.computeSheet({ ...base }, { race: byName(races, 'Humano'), classe: byName(classes, 'Ladino'), bbaRows, pericias, escolhas: { ranks: { acrobacias: 5, blefar: 5, 'sentir motivacao': 5, 'adestrar animais': 4 } } });
    const misc = nome => sheet.pericias.find(p => p.nome === nome).diversos;
    assert.deepStrictEqual(
      ['Equilíbrio', 'Saltar', 'Intimidação', 'Prestidigitação', 'Diplomacia', 'Cavalgar'].map(misc),
      [2, 2, 2, 2, 2, 0],
      'Diplomacia recebe +2 uma vez (Blefar ou Sentir Motivação); Adestrar Animais com 4 não dá sinergia',
    );
    assert.ok(sheet.sinergias.some(s => /Disfarces/.test(s)), 'sinergia situacional vira nota');
  });

  await test('talentos concedidos pela classe e pela raça', () => {
    const g = C.grantedFeats(6, 'mon', 'elfo').map(x => `${x.nome}@${x.nivel}`);
    assert.deepStrictEqual(g, ['Ataque Desarmado Aprimorado@1', 'Desviar Objetos@2', 'Imobilização Aprimorada@6', 'Usar Arma Comum@1']);
    assert.ok(C.grantedFeats(1, 'gue', 'humano').some(x => x.nome === 'Usar Armadura (pesada)'));
    assert.ok(!C.grantedFeats(1, 'mag', 'humano').some(x => /Armadura/.test(x.nome)));
    assert.strictEqual(setup({ cls: 'Monge', nivel: 1 }).ev(6).status, 'disponivel', 'o popup mostra como concedido');
  });

  await test('a ficha soma graduações e os efeitos numéricos dos talentos 3.0', () => {
    const personagem = { ...base };
    const sheet = R.computeSheet(personagem, {
      race: byName(races, 'Humano'),
      classe: byName(classes, 'Guerreiro'),
      bbaRows,
      pericias,
      escolhas: { ranks: { escalar: 7, ouvir: 1 }, talentos: [{ nome: 'INICIATIVA APRIMORADA' }, { nome: 'REFLEXOS RÁPIDOS' }, { nome: 'PRONTIDÃO' }, { nome: 'FOCO EM PERÍCIA', parametro: 'Escalar' }, { nome: 'ESQUIVA' }] },
    });
    const skill = nome => sheet.pericias.find(p => p.nome === nome);
    assert.deepStrictEqual([skill('Escalar').graduacoes, skill('Escalar').diversos, skill('Escalar').total], [7, 2, 4 + 7 + 2]);
    assert.deepStrictEqual([skill('Ouvir').diversos, skill('Ouvir').total], [2, 2 + 1 + 2]);
    assert.strictEqual(sheet.iniciativa.total, 2 + 4);
    assert.strictEqual(sheet.resistencias[1].total, 1 + 2 + 2, 'Reflexos: base 1 + Des 2 + talento 2');
    assert.ok(sheet.condicionaisCombate.includes('+1 de esquiva na CA contra um oponente escolhido (Esquiva)'));
    const tres = R.computeSheet(personagem, { race: byName(races, 'Humano'), classe: byName(classes, 'Guerreiro'), bbaRows, pericias, escolhas: { talentos: [{ nome: 'VITALIDADE' }, { nome: 'VITALIDADE' }, { nome: 'VITALIDADE' }] } });
    assert.deepStrictEqual(tres.notasTalentos, ['+9 PV (Vitalidade ×3): confira se já estão nos PV cadastrados'], 'uma nota só');
  });

  await test('talentos do Livro do Jogador 3.0 no compêndio: requisitos todos resolvidos', () => {
    const talentos = data('talentos');
    const ldj = talentos.filter(t => /Livro do Jogador 3\.0/.test(t.fonte || ''));
    assert.strictEqual(ldj.length, 74);
    const { ctx } = setup({ cat: talentos, nivel: 20, attrs: { for: 30, des: 30, con: 30, int: 30, sab: 30, car: 30 } });
    // Requisitos dos talentos do LdJ citam só atributos, BBA, níveis e outros talentos do próprio compêndio
    for (const f of ldj) {
      const unresolved = C.splitAtoms(f.requisitos).filter(a => {
        const probe = C.evaluateFeat({ ...f, tipo: null, requisitos: a }, ctx);
        return probe.status === 'confirmar';
      });
      assert.deepStrictEqual(unresolved.filter(a => !/escolhida|habilidade de expulsar/.test(a)), [], `${f.nome}: ${f.requisitos}`);
    }
    // os nomes citados pelos talentos do dump agora existem (Tiro Certeiro, Ataque Poderoso…)
    for (const nome of ['Tiro Certeiro', 'Ataque Poderoso', 'Esquiva', 'Mobilidade', 'Especialização em Combate', 'Foco em Arma', 'Usar Escudo']) {
      assert.ok(ctx.catalogByKey.has(C.featKey(nome)), nome);
    }
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
