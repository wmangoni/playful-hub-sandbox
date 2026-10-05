/**
 * Testes do card de combatente (TASK_010): o modelo (`js/rules/card30.js`) para os 74 do catálogo
 * e para personagens das 11 classes, e o glossário de textos (`data/glossario-combate.json`).
 * Executar: node tests/ded_make_character_card.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
const dado = nome => require(path.join(root, 'data', `${nome}.json`));
const { TALENTOS_EXTRAS } = require(path.join(root, 'tools', 'validar-catalogo.js'));
const cat = dado('catalogo-combate');
const glossarioJson = dado('glossario-combate');
const todos = [...cat.monstros, ...cat.holy_avenger];

const norm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Toda folha (número, texto ou true) de um objeto, com a chave onde ela está. */
function folhas(o, chave = '', saida = []) {
  if (o == null || o === false) return saida;
  if (Array.isArray(o)) o.forEach(x => folhas(x, chave, saida));
  else if (typeof o === 'object') Object.entries(o).forEach(([k, v]) => folhas(v, k, saida));
  else saida.push({ chave, valor: o });
  return saida;
}

/** Os campos do modelo que não são texto de tela (identificadores e chaves de estilo). */
const INTERNOS = new Set(['id', 'categoria', 'origem', 'tema', 'icone', 'chave', 'sigla', 'fichaHref',
  // texto escrito à mão (catálogo, compêndio, glossário): o lint confere o que o card formata, não a prosa
  'descricao', 'adaptacao', 'tatica', 'resumo', 'beneficio', 'normal', 'requisitos', 'url', 'referencia']);

/** Todo texto de tela de um modelo de card, para o lint. */
function textos(o, saida = []) {
  if (o == null) return saida;
  if (Array.isArray(o)) o.forEach(x => textos(x, saida));
  else if (typeof o === 'object') Object.entries(o).forEach(([k, v]) => !INTERNOS.has(k) && textos(v, saida));
  else saida.push(String(o));
  return saida;
}

async function run() {
  const C = await load('js/rules/combat30.js');
  const K = await load('js/rules/card30.js');
  const { MAGIAS } = await load('js/rules/magias30.js');
  const { grantedFeats } = await load('js/rules/choices30.js');
  const { montarPersonagem, CLASSES, RACAS } = await load('tools/ia/personagens.mjs');
  const talentosRows = dado('talentos').rows;
  const compendio = K.indiceDeTalentos(talentosRows);
  const glossario = K.criarGlossario(glossarioJson);
  const ctx = { compendio, glossario };
  const cards = new Map(todos.map(e => [e.id, K.montarCardCatalogo(e, ctx)]));

  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Card: partes e glossário ---');

  test('separarParametro: parâmetro simples, aninhado, repetido e sem parêntese', () => {
    assert.deepStrictEqual(K.separarParametro('Foco em Arma (espada longa)'), { base: 'Foco em Arma', parametro: 'espada longa' });
    assert.deepStrictEqual(K.separarParametro('Foco em Perícia (Conhecimento (história)) (regional: Deheon)'), { base: 'Foco em Perícia', parametro: 'Conhecimento (história); regional: Deheon' });
    assert.deepStrictEqual(K.separarParametro('Bola de Fogo (maximizada)'), { base: 'Bola de Fogo', parametro: 'maximizada' });
    assert.deepStrictEqual(K.separarParametro('Mísseis Mágicos (maximizados, 2 mísseis)'), { base: 'Mísseis Mágicos', parametro: 'maximizados, 2 mísseis' });
    assert.deepStrictEqual(K.separarParametro('Prontidão'), { base: 'Prontidão', parametro: '' });
    assert.deepStrictEqual(K.separarParametro('Aberto (sem fechar'), { base: 'Aberto', parametro: 'sem fechar' });
  });

  test('humanizar: nenhuma chave vira texto cru', () => {
    assert.strictEqual(K.humanizar('ca_interna'), 'CA interna');
    assert.strictEqual(K.humanizar('pv_para_sair'), 'PV para sair');
    assert.strictEqual(K.humanizar('bonus_ataque'), 'Bônus ataque');
    assert.strictEqual(K.humanizar('duracao'), 'Duração');
    assert.strictEqual(K.humanizar('efeitos_por_dv'), 'Efeitos por DV');
    assert.strictEqual(K.humanizar('nivel_conjurador'), 'Nível conjurador');
    assert.strictEqual(K.humanizar('von'), 'Vontade');
  });

  test('o glossário casa o maior nome que abre o texto, só em fronteira de palavra', () => {
    const g = K.criarGlossario({ classe: [{ nome: 'Fúria', resumo: 'a' }, { nome: 'Fúria maior', resumo: 'b' }, { nome: 'Forma selvagem', resumo: 'c' }, { nome: 'Forma selvagem elemental', resumo: 'd' }] });
    assert.strictEqual(g.habilidade('Fúria 6/dia (+4 For)').resumo, 'a');
    assert.strictEqual(g.habilidade('Fúria maior: +6 For').resumo, 'b');
    assert.strictEqual(g.habilidade('Forma selvagem 3/dia (animal Pequeno)').resumo, 'c');
    assert.strictEqual(g.habilidade('Forma selvagem elemental 3/dia').resumo, 'd');
    assert.strictEqual(g.habilidade('Furiosa'), null);
    assert.strictEqual(g.habilidade('Fúriam'), null);
  });

  test('o texto da magia vem da lista curada primeiro, e variantes e aliases acham a magia-base', () => {
    const curada = MAGIAS.find(m => m.nome === 'Bola de Fogo');
    assert.strictEqual(K.textoDaMagia('Bola de Fogo (maximizada)', glossario).resumo, curada.resumo);
    assert.strictEqual(K.textoDaMagia('Bola de Fogo', glossario).fonte, curada.fonte);
    const outra = K.textoDaMagia('Luz Cegante', glossario);
    assert.ok(outra && outra.resumo.length > 30, 'uma magia que só o glossário tem');
    assert.strictEqual(K.textoDaMagia('Magia que não existe', glossario), null);
  });

  console.log('--- Card: os 74 do catálogo (TASK_010 §4.2, §5) ---');

  test('o glossário: uma fonte por magia, textos de 15 a 450 caracteres e nenhum marcador', () => {
    const curadas = new Set(MAGIAS.map(m => norm(m.nome)));
    const vistos = new Set();
    for (const m of glossarioJson.magias) {
      assert.ok(!curadas.has(norm(m.nome)), `${m.nome} já está em magias30.js: não repita no glossário`);
      assert.ok(!vistos.has(norm(m.nome)), `${m.nome} repetida no glossário`);
      vistos.add(norm(m.nome));
    }
    const lista = [
      ...glossarioJson.magias.map(m => [m.nome, m.resumo]),
      ...glossarioJson.talentos.map(t => [t.nome, t.beneficio]),
      ...glossarioJson.classe.map(c => [c.nome, c.resumo]),
      ...glossarioJson.racas.map(r => [r.nome, r.resumo]),
    ];
    for (const [nome, texto] of lista) {
      assert.ok(typeof texto === 'string' && texto.length >= 15 && texto.length <= 450, `${nome}: ${texto?.length} caracteres`);
      assert.ok(!/\bTODO\b|\blorem ipsum\b|\.\.\.|…$/.test(texto), `${nome}: marcador no texto`);
    }
    for (const m of glossarioJson.magias) assert.ok(!m.fonte || /^http:\/\/www\.dragon\.ee\/30srd\//.test(m.fonte), `${m.nome}: fonte`);
  });

  test('toda magia do catálogo tem texto (lista curada ou glossário), e nenhuma entrada do glossário fica sem uso', () => {
    const usadas = new Set();
    for (const e of todos) {
      for (const m of e.magias?.lista || []) usadas.add(norm(K.separarParametro(m.nome).base));
      for (const s of [...e.ataques_especiais, ...e.qualidades_especiais]) if (s.mecanica?.efeito === 'magia' && s.mecanica.magia) usadas.add(norm(K.separarParametro(s.mecanica.magia).base));
    }
    const semTexto = [...usadas].filter(n => !K.textoDaMagia(n, glossario));
    assert.deepStrictEqual(semTexto, [], `sem texto: ${semTexto.join(', ')}`);
    const sobrando = glossarioJson.magias.filter(m => !usadas.has(norm(m.nome))).map(m => m.nome);
    assert.deepStrictEqual(sobrando, [], `no glossário e sem uso: ${sobrando.join(', ')}`);
  });

  test('todo talento do catálogo tem benefício (compêndio ou glossário), e as entradas do glossário têm uso', () => {
    const usados = new Set();
    for (const e of todos) {
      for (const t of K.descreverTalentos(e.talentos, ctx)) {
        usados.add(norm(t.nome));
        assert.ok(t.beneficio, `${e.id}: ${t.nome} sem benefício`);
      }
    }
    for (const t of glossarioJson.talentos) {
      assert.ok(!compendio.has(norm(t.nome)), `${t.nome} já está no compêndio`);
      assert.ok(usados.has(norm(t.nome)), `${t.nome} no glossário e sem uso`);
    }
  });

  test('os talentos fora do compêndio são os de TALENTOS_EXTRAS, e cada um tem entrada', async () => {
    const extras = TALENTOS_EXTRAS; // a fonte única (o validador do catálogo)
    const usadosFora = new Set();
    for (const e of todos) for (const t of e.talentos) {
      const base = K.separarParametro(t).base;
      if (!compendio.has(norm(t)) && !compendio.has(norm(base))) usadosFora.add(norm(base));
    }
    for (const n of usadosFora) assert.ok(extras.map(norm).includes(n), `${n} está fora do compêndio e de TALENTOS_EXTRAS`);
    for (const n of usadosFora) assert.ok(glossario.talento(n), `${n} sem entrada no glossário`);
    // os 3 de TALENTOS_EXTRAS que o catálogo não usa (Ataque em Voo, Multidestreza, Combater com Múltiplas Armas) são de monstro e ficam sem texto até um monstro os usar
    const semUso = extras.filter(n => !usadosFora.has(norm(n)));
    assert.ok(semUso.length <= 3, `TALENTOS_EXTRAS sem uso: ${semUso.join(', ')}`);
  });

  test('toda folha da mecânica de toda habilidade aparece no card (número, texto ou o texto da descrição)', () => {
    const faltas = [];
    for (const e of todos) {
      const card = cards.get(e.id);
      const modelos = [...card.habilidades.ataques, ...card.habilidades.qualidades];
      for (const s of [...e.ataques_especiais, ...e.qualidades_especiais]) {
        if (!s.mecanica) continue;
        const h = modelos.find(x => x.id === s.id);
        assert.ok(h, `${e.id}: ${s.id} sumiu do card`);
        const texto = norm(JSON.stringify(h));
        for (const { chave, valor } of folhas(s.mecanica)) {
          if (['efeito', 'nota', 'magia'].includes(chave)) continue;
          const nomeDoId = [...e.ataques_especiais, ...e.qualidades_especiais].find(x => x.id === valor)?.nome;
          // "0d0+8" é dano fixo: o card mostra "8" (e "0d0+0" e "0d0", "sem dano"), como número inteiro, nunca dentro de outro
          const fixoN = typeof valor === 'string' && /^0d0([+-]\d+)?$/.test(valor) ? valor.replace(/^0d0\+?/, '') : null;
          const fixoRe = fixoN == null ? null : fixoN === '' || fixoN === '0' ? /sem dano/ : new RegExp('(?<![\\d+])' + fixoN + '(?!\\d)');
          const formas = typeof valor === 'number' ? [String(valor), String(valor).replace('.', ',')] : fixoRe ? [] : valor === true ? [norm(K.humanizar(chave))] : [norm(valor), norm(valor).replace(/-/g, ' '), norm({ fort: 'Fortitude', ref: 'Reflexos', von: 'Vontade' }[valor] || valor), norm(nomeDoId || valor)];
          if (fixoRe ? !fixoRe.test(texto) : !formas.some(f => texto.includes(f))) faltas.push(`${e.id}/${s.id}: ${chave}=${valor}`);
        }
      }
    }
    assert.deepStrictEqual(faltas, [], `${faltas.length} valores da mecânica fora do card:\n${faltas.slice(0, 25).join('\n')}`);
  });

  test('toda habilidade, ataque, magia e talento do registro está no card, com a descrição inteira', () => {
    for (const e of todos) {
      const c = cards.get(e.id);
      assert.strictEqual(c.habilidades.ataques.length, e.ataques_especiais.length, e.id);
      assert.strictEqual(c.habilidades.qualidades.length, e.qualidades_especiais.length, e.id);
      for (const s of [...e.ataques_especiais, ...e.qualidades_especiais]) {
        const h = [...c.habilidades.ataques, ...c.habilidades.qualidades].find(x => x.id === s.id);
        assert.strictEqual(h.descricao, s.descricao, `${e.id}/${s.id}: descrição`);
        assert.strictEqual(h.nome, s.nome);
      }
      assert.strictEqual(c.ataques.unico.length, e.ataques.length, e.id);
      assert.strictEqual(c.ataques.total.length, e.ataque_total.length, e.id);
      assert.strictEqual(c.ataques.distancia.length, (e.ataque_total_distancia || []).length, e.id);
      assert.strictEqual(c.talentos.reduce((soma, t) => soma + t.vezes, 0), e.talentos.length, `${e.id}: talentos (o repetido vira "×N")`);
      assert.strictEqual(c.pericias.length, e.pericias.length, e.id);
      assert.strictEqual((c.magias?.grupos || []).reduce((s, g) => s + g.itens.length, 0), (e.magias?.lista || []).length, e.id);
      assert.strictEqual(c.resumo, e.resumo);
    }
  });

  test('o card dá o texto de cada magia e de cada habilidade de magia', () => {
    for (const e of todos) {
      const c = cards.get(e.id);
      for (const g of c.magias?.grupos || []) for (const i of g.itens) assert.ok(i.resumo, `${e.id}: ${i.nome} sem resumo`);
      for (const h of [...c.habilidades.ataques, ...c.habilidades.qualidades]) {
        const s = [...e.ataques_especiais, ...e.qualidades_especiais].find(x => x.id === h.id);
        if (s.mecanica?.efeito === 'magia' && s.mecanica.magia) assert.ok(h.magia?.resumo, `${e.id}/${h.id}: a magia ${s.mecanica.magia} sem texto`);
      }
    }
  });

  /** O sinal como o card escreve: "+2", "−2", "0". */
  const sg = n => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0");

  test('os números do card batem com o combatente que o motor monta (PV, CA, deslocamento, resistências, ataques, magias…)', () => {
    for (const e of todos) {
      const c = cards.get(e.id);
      const b = C.createBattle({ ladoA: [C.fromCatalog(e)], ladoB: [C.fromCatalog(e)], semente: 1, distancia: 9 });
      const x = b.combatentes[0];
      const num = rotulo => c.numeros.find(n => n.rotulo === rotulo);
      assert.strictEqual(num('PV').valor, String(x.pvMax), e.id + ": PV");
      assert.strictEqual(num('CA').valor, String(x.ca.total), e.id + ": CA");
      assert.ok(num('CA').detalhe.includes("toque " + x.ca.toque) && num('CA').detalhe.includes("surpresa " + x.ca.surpresa), e.id + ": CA de toque e de surpresa");
      assert.strictEqual(num('Iniciativa').valor, sg(x.iniciativa), e.id + ": iniciativa");
      assert.strictEqual(num('BBA / Agarrar').valor, sg(x.bba) + " / " + sg(x.agarrar), e.id + ": BBA e agarrar");
      assert.strictEqual(num('Resistências').valor, "Fort " + sg(x.resistencias.fort) + ", Ref " + sg(x.resistencias.ref) + ", Von " + sg(x.resistencias.von), e.id + ": resistências");
      assert.strictEqual(num('Espaço / Alcance').valor, String(x.espaco).replace('.', ',') + " m / " + String(x.alcance).replace('.', ',') + " m", e.id + ": espaço e alcance");
      const desloc = num('Deslocamento').valor;
      for (const [k, rotulo] of [['terrestre', 'terrestre'], ['voo', 'voo'], ['natacao', 'natação'], ['escalada', 'escalada'], ['escavacao', 'escavação']]) {
        if (x.deslocamento[k] != null) assert.ok(desloc.includes(rotulo + " " + String(x.deslocamento[k]).replace('.', ',') + " m"), e.id + ": deslocamento " + k);
      }
      const modAttr = v => (v == null ? '—' : sg(Math.floor((v - 10) / 2)));
      for (const a of c.atributos) {
        assert.strictEqual(a.valor, x.atributos[a.chave] == null ? '—' : String(x.atributos[a.chave]), e.id + ": " + a.chave);
        assert.strictEqual(a.mod, modAttr(x.atributos[a.chave]), e.id + ": modificador de " + a.chave);
      }
      // os ataques: bônus, dano, crítico e o dano extra, nas 3 listas
      for (const [chave, fonte] of [['unico', x.ataques], ['total', x.ataqueTotal], ['distancia', x.ataqueTotalDistancia || []]]) {
        assert.strictEqual(c.ataques[chave].length, fonte.length, e.id + ": " + chave);
        for (const [i, a] of c.ataques[chave].entries()) {
          const f = fonte[i];
          assert.strictEqual(a.nome, f.nome, e.id);
          assert.strictEqual(a.bonus, sg(f.bonus), e.id + ": bônus de " + a.nome);
          assert.strictEqual(a.critico, (f.critico.margem >= 20 ? '20' : f.critico.margem + "–20") + "/×" + f.critico.multiplicador, e.id + ": crítico de " + a.nome);
          const fixo = f.dano.replace(/^0d0\+?/, ''); // "0d0+8" é dano fixo (8); "0d0+0" e "0d0", nenhum
          assert.strictEqual(a.dano, /^0d0/.test(f.dano) ? (fixo === '' || fixo === '0' ? 'sem dano' : fixo) : f.dano, e.id + ": dano de " + a.nome);
          assert.strictEqual(a.extras.filter(t => /^\+.* de /.test(t)).length, (f.dano_extra || []).length, e.id + ": dano extra de " + a.nome);
        }
      }
      // defesas
      const mostradas = c.defesas.filter(d => /^Imunidades/.test(d.rotulo)).flatMap(d => d.valor.split(', '));
      for (const i of x.imunidades) assert.ok(mostradas.includes(i), e.id + ": imunidade " + i + " fora do card");
      const defesa = rotulo => c.defesas.find(d => d.rotulo === rotulo)?.valor;
      assert.strictEqual(defesa('Resistência à magia'), x.rm == null ? undefined : String(x.rm), e.id + ": RM");
      assert.strictEqual(defesa('Redução de dano'), x.rd ? x.rd.valor + "/" + x.rd.exceto : undefined, e.id + ": RD");
      assert.strictEqual(defesa('Vulnerabilidades'), x.vulnerabilidades.length ? x.vulnerabilidades.join(', ') : undefined, e.id + ": vulnerabilidades");
      assert.strictEqual(defesa('Cura acelerada'), x.curaAcelerada == null ? undefined : String(x.curaAcelerada), e.id + ": cura acelerada");
      // magias: a mesma CD que o motor usa (mecanica.cd ou cd_base + nível)
      for (const g of c.magias?.grupos || []) {
        for (const [i, item] of g.itens.entries()) {
          const orig = x.magias.lista.filter(m => m.nivel === g.nivel)[i];
          assert.strictEqual(item.quantidade, orig.quantidade, e.id + ": quantidade de " + orig.nome);
          const teste = item.numeros.find(n => n.rotulo === 'Teste');
          if (orig.mecanica?.resistencia) assert.ok(teste.valor.includes("CD " + (orig.mecanica.cd ?? x.magias.cd_base + orig.nivel)), e.id + ": CD de " + orig.nome + " (card: " + teste.valor + ")");
        }
      }
    }
  });

  test('lint: nenhum card tem undefined, NaN, [object Object] nem chave crua', () => {
    const ruins = [];
    for (const [id, c] of cards) {
      for (const t of textos(c)) {
        if (/undefined|NaN|\[object|null/.test(t)) ruins.push(`${id}: "${t.slice(0, 60)}"`);
        if (/\b[a-z]{2,}_[a-z_]+\b/.test(t)) ruins.push(`${id}: chave crua em "${t.slice(0, 60)}"`);
        if (/\b0d0\b/.test(t)) ruins.push(`${id}: dano fixo cru em "${t.slice(0, 60)}"`);
      }
      // rótulos e valores de chip: sem a forma sem acento das palavras que o catálogo escreve sem acento
      const chips = [...c.habilidades.ataques, ...c.habilidades.qualidades, ...(c.magias?.grupos || []).flatMap(g => g.itens)].flatMap(h => h.numeros);
      for (const n of chips) {
        if (/\b(acao|acoes|area|bonus|condicao|constricao|duracao|etico|nivel|niveis|resistencia|secundario|senao|tendencia|so)\b/i.test(n.rotulo)) ruins.push(`${id}: rótulo sem acento "${n.rotulo}"`);
        if (/^[a-z]+(-[a-z0-9]+)+$/.test(n.valor)) ruins.push(`${id}: valor em forma de chave "${n.rotulo} ${n.valor}"`);
        if (/^(con|for|des|int|sab|car)$/.test(n.valor)) ruins.push(`${id}: atributo cru "${n.rotulo} ${n.valor}"`);
      }
    }
    assert.deepStrictEqual(ruins, [], ruins.slice(0, 15).join('\n'));
  });

  test('o cabeçalho, as defesas e o resto dos campos do registro aparecem', () => {
    const e = todos.find(x => x.id === 'tarrasque');
    const c = cards.get('tarrasque');
    assert.strictEqual(c.selo, 'ND 20');
    assert.strictEqual(c.subtitulo, 'Besta Mágica colossal · Neutro');
    assert.ok(c.defesas.some(d => d.rotulo === 'Redução de dano'), 'RD');
    assert.ok(c.defesas.some(d => d.rotulo === 'Regeneração' && /efeito de morte só o derruba/.test(d.valor)), 'a regeneração do Tarrasque');
    assert.ok(c.rodape.fonte.url.startsWith('http'), 'fonte');
    assert.strictEqual(c.rodape.tatica, e.tatica);
    const tork = cards.get(todos.find(x => x.condicoes_iniciais)?.id);
    assert.ok(tork.defesas.some(d => d.rotulo === 'Começa' && /cego/.test(d.valor)), 'condições iniciais');
    const morto = [...cards.values()].find(c2 => /Morto-Vivo/.test(c2.subtitulo));
    const doTipo = morto.defesas.filter(d => /^Imunidades/.test(d.rotulo)).flatMap(d => d.valor.split(', '));
    for (const i of ['veneno', 'sono', 'paralisia', 'efeitos de morte']) assert.ok(doTipo.includes(i), `o tipo Morto-Vivo dá imunidade a ${i}`);
  });


  test('as notas do catálogo, a restrição de alvo do dano extra, a divisão por tendência e o "à distância" aparecem', () => {
    const luz = cards.get('naga-guardia').magias.grupos.flatMap(g => g.itens).find(i => i.nome === 'Luz Cegante');
    assert.match(luz.nota, /contra mortos-vivos 9d6/);
    const pal = cards.get('ha-paladino-de-arton');
    assert.ok(pal.ataques.unico[0].extras.includes('+2d6 de sagrado (moral mau)'), 'o dano extra só contra o mau');
    const sagrada = [...pal.habilidades.ataques, ...pal.habilidades.qualidades].find(h => h.nome === 'Destruição Sagrada');
    assert.strictEqual(sagrada.numeros.find(n => n.rotulo === 'Dano por tendência').valor, 'moral: mau total, neutro metade, bom nenhum');
    assert.strictEqual(sagrada.numeros.find(n => n.rotulo === 'Condição afeta').valor, 'moral mau');
    assert.deepStrictEqual(cards.get('gigante-do-gelo').ataques.unico.map(a => a.tipo), ['corpo a corpo', 'à distância']);
    // as notas de quem mantém o catálogo (citam chaves e o motor) não vão para a tela
    for (const [id, c] of cards) for (const h of [...c.habilidades.ataques, ...c.habilidades.qualidades]) if (h.nota) assert.ok(!/_|\bmotor\b/.test(h.nota), id + '/' + h.id + ': nota de manutenção na tela');
  });

  console.log('--- Card: personagens do jogador (TASK_010 §4.1) ---');

  const entradaDe = (classe, raca, nivel, extra = {}) => {
    const r = montarPersonagem({ classe, raca, nivel, talentos: [{ nome: 'Ataque Poderoso' }], ...extra });
    return {
      r,
      entrada: { id: 'p:9000', nome: `${classe} ${nivel}`, sheet: r.sheet, personagem: { tendencia: 'LB' }, ficha: r.ficha, equipamento: r.equipamento || {}, erros: r.erros, avisos: r.avisos, talentos: [{ nome: 'Ataque Poderoso', parametro: '' }] },
    };
  };
  const cardDoPersonagem = (classe, raca, nivel) => {
    const { r, entrada } = entradaDe(classe, raca, nivel);
    return { r, card: K.montarCardPersonagem(entrada, { ...ctx, concedidos: grantedFeats(nivel, r.sheet.classKey, r.sheet.raceKey) }) };
  };

  test('toda habilidade de classe (11 classes, níveis 1 a 20) e todo traço de raça (7 raças) tem texto', () => {
    const sem = new Set();
    for (const classe of Object.keys(CLASSES)) {
      for (let n = 1; n <= 20; n++) {
        const { card } = cardDoPersonagem(classe, 'humano', n);
        for (const h of card.habilidades.classe) if (!h.descricao) sem.add(`${classe}: ${h.nome}`);
      }
    }
    for (const raca of Object.keys(RACAS)) {
      const { card } = cardDoPersonagem('guerreiro', raca, 1);
      for (const h of card.habilidades.racas) if (!h.descricao) sem.add(`${raca}: ${h.nome}`);
    }
    assert.deepStrictEqual([...sem], [], `sem texto:\n${[...sem].slice(0, 20).join('\n')}`);
  });

  test('o glossário de classe e de raça não tem entrada sem uso', () => {
    const usados = new Set();
    for (const classe of Object.keys(CLASSES)) {
      for (let n = 1; n <= 20; n++) {
        const { r } = entradaDe(classe, 'humano', n);
        for (const h of r.sheet.habilidadesClasse) usados.add(glossario.habilidade(h)?.nome);
      }
    }
    for (const raca of Object.keys(RACAS)) for (const h of montarPersonagem({ classe: 'guerreiro', raca, nivel: 1 }).sheet.tracosRaciais) usados.add(glossario.traco(h)?.nome);
    const sobra = [...glossario.nomes.classe, ...glossario.nomes.racas].filter(n => !usados.has(n));
    assert.deepStrictEqual(sobra, [], `no glossário e sem uso: ${sobra.join(', ')}`);
  });

  test('o card do personagem: números da ficha, atributos, talentos (escolhidos e concedidos), magias e lint', () => {
    const ruins = [];
    for (const classe of Object.keys(CLASSES)) {
      for (const nivel of [1, 4, 9, 14, 20]) {
        const { r, card } = cardDoPersonagem(classe, 'elfo', nivel);
        const b = r.ficha && C.createBattle({ ladoA: [r.ficha], ladoB: [C.fromCatalog(todos[0])], semente: 1, distancia: 9 });
        if (r.ficha) {
          const x = b.combatentes[0];
          assert.strictEqual(card.numeros.find(n => n.rotulo === 'PV').valor, String(x.pvMax), `${classe} ${nivel}: PV`);
          assert.strictEqual(card.numeros.find(n => n.rotulo === 'CA').valor, String(x.ca.total), `${classe} ${nivel}: CA`);
          assert.strictEqual(card.ataques.unico.length, x.ataques.length, `${classe} ${nivel}: ataques`);
        }
        assert.strictEqual(card.atributos.length, 6);
        assert.strictEqual(card.selo, `Nível ${nivel}`);
        assert.ok(card.talentos.some(t => t.nome === 'Ataque Poderoso' && t.origem === 'escolhido' && t.beneficio), `${classe}: o talento escolhido, com benefício`);
        for (const t of card.talentos) if (!t.beneficio) ruins.push(`${classe} ${nivel}: talento ${t.nome} sem benefício`);
        for (const g of card.magias?.grupos || []) for (const i of g.itens) if (!i.resumo) ruins.push(`${classe} ${nivel}: magia ${i.nome} sem resumo`);
        for (const t of textos(card)) {
          if (/undefined|NaN|\[object|null/.test(t)) ruins.push(`${classe} ${nivel}: "${t.slice(0, 60)}"`);
          if (/\b[a-z]{2,}_[a-z_]+\b/.test(t)) ruins.push(`${classe} ${nivel}: chave crua "${t.slice(0, 60)}"`);
        }
      }
    }
    assert.deepStrictEqual(ruins, [], ruins.slice(0, 12).join('\n'));
  });

  test('o talento "Usar Armadura (leve)" é do compêndio (o nome inteiro vale antes do parêntese)', () => {
    const { card } = cardDoPersonagem('guerreiro', 'humano', 1);
    const t = card.talentos.find(x => /Usar Armadura \(leve\)/i.test(x.nome));
    assert.ok(t && t.beneficio && t.origem.startsWith('concedido'), 'Usar Armadura (leve) concedido, com benefício');
    assert.strictEqual(card.talentos.filter(x => /Usar Armadura/i.test(x.nome)).length, 3, 'as três (leve, média, pesada) ficam separadas');
  });

  test('personagem que não pode lutar: o card abre, com o aviso e os números da ficha impressa', () => {
    const { r, entrada } = entradaDe('mago', 'humano', 3);
    const semFicha = { ...entrada, ficha: null, erros: ['sem PV cadastrados e sem dado de vida'], avisos: [] };
    const card = K.montarCardPersonagem(semFicha, { ...ctx, concedidos: [] });
    assert.ok(/Não pode lutar/.test(card.avisoDeLuta));
    assert.strictEqual(card.numeros.find(n => n.rotulo === 'CA').valor, String(r.sheet.ca.total));
    assert.deepStrictEqual(card.ataques.unico, []);
    assert.ok(card.rodape.fichaHref.endsWith('/ficha'));
  });

  test('sem o glossário (a busca falhou), o card sai sem os textos e sem quebrar', () => {
    const sem = K.montarCardCatalogo(cat.monstros[0], { compendio, glossario: null });
    assert.ok(sem.nome);
    const mago = todos.find(e => e.magias);
    const m = K.montarCardCatalogo(mago, { compendio, glossario: null });
    assert.ok(m.magias.grupos.length);
    const { entrada } = entradaDe('clerigo', 'humano', 5);
    assert.ok(K.montarCardPersonagem(entrada, { compendio: null, glossario: null, concedidos: [] }).nome);
  });


  test('o card do personagem bate com o combatente do motor (11 classes, 4 níveis, 2 raças) e não repete magia nem mostra ×99', () => {
    for (const classe of Object.keys(CLASSES)) {
      for (const raca of ['humano', 'anao']) {
        for (const nivel of [1, 5, 12, 20]) {
          const { r, card } = cardDoPersonagem(classe, raca, nivel);
          const nome = classe + ' ' + raca + ' ' + nivel;
          if (!r.ficha) continue;
          const x = C.createBattle({ ladoA: [r.ficha], ladoB: [C.fromCatalog(todos[0])], semente: 1, distancia: 9 }).combatentes[0];
          const num = rotulo => card.numeros.find(n => n.rotulo === rotulo);
          assert.strictEqual(num('PV').valor, String(x.pvMax), nome + ': PV');
          assert.strictEqual(num('CA').valor, String(x.ca.total), nome + ': CA');
          assert.strictEqual(num('Iniciativa').valor, sg(x.iniciativa), nome + ': iniciativa');
          assert.strictEqual(num('BBA / Agarrar').valor, sg(x.bba) + ' / ' + sg(x.agarrar), nome + ': BBA e agarrar');
          assert.strictEqual(num('Resistências').valor, 'Fort ' + sg(x.resistencias.fort) + ', Ref ' + sg(x.resistencias.ref) + ', Von ' + sg(x.resistencias.von), nome + ': resistências');
          assert.ok(num('Deslocamento').valor.includes('terrestre ' + String(x.deslocamento.terrestre).replace('.', ',') + ' m'), nome + ': deslocamento');
          for (const a of card.atributos) assert.strictEqual(a.mod, sg(Math.floor((x.atributos[a.chave] - 10) / 2)), nome + ': modificador de ' + a.chave);
          const defesa = rotulo => card.defesas.find(d => d.rotulo === rotulo)?.valor;
          assert.strictEqual(defesa('Redução de dano'), x.rd ? x.rd.valor + '/' + x.rd.exceto : undefined, nome + ': RD');
          assert.strictEqual(defesa('Resistência à magia'), x.rm == null ? undefined : String(x.rm), nome + ': RM');
          for (const [i, a] of card.ataques.unico.entries()) {
            assert.strictEqual(a.bonus, sg(x.ataques[i].bonus), nome + ': bônus de ' + a.nome);
            assert.strictEqual(a.dano, x.ataques[i].dano, nome + ': dano de ' + a.nome);
          }
          // as magias: sem a mesma duas vezes, sem "×99" e com a CD que o motor usa
          for (const g of card.magias?.grupos || []) {
            const chaves = g.itens.map(i => i.nome + '|' + i.variante);
            assert.strictEqual(new Set(chaves).size, chaves.length, nome + ': magia repetida no nível ' + g.nivel);
            for (const i of g.itens) {
              assert.ok(i.quantidade == null || i.quantidade < 99, nome + ': ' + i.nome + ' ×' + i.quantidade);
              const orig = x.magias.lista.find(m => m.nome === i.nome && m.nivel === g.nivel);
              const teste = i.numeros.find(n => n.rotulo === 'Teste');
              if (orig.mecanica?.resistencia) assert.ok(teste.valor.includes('CD ' + (x.magias.cd_base + orig.nivel)), nome + ': CD de ' + i.nome);
            }
          }
        }
      }
    }
    // o paladino com duas "Curar Ferimentos Leves" (um espaço de 1º e outro de 2º) soma ×2; o clérigo converte em cura sem "×N"
    const pal = cardDoPersonagem('paladino', 'humano', 12).card.magias.grupos.flatMap(g => g.itens).filter(i => i.nome === 'Curar Ferimentos Leves');
    assert.deepStrictEqual(pal.map(i => i.quantidade), [2]);
    const cle = cardDoPersonagem('clerigo', 'humano', 5).card.magias.grupos.flatMap(g => g.itens).filter(i => i.nome === 'Curar Ferimentos Leves');
    assert.deepStrictEqual(cle.map(i => [i.quantidade, i.variante]), [[2, null], [null, 'troca por uma magia preparada']]);
    const bardo = cardDoPersonagem('bardo', 'humano', 7).card.magias.grupos.flatMap(g => g.itens);
    assert.ok(bardo.every(i => i.quantidade == null && /conhecida/.test(i.variante)), 'quem conhece as magias não tem "×N"');
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
