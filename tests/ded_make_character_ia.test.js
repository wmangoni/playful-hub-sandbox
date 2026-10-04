/**
 * Testes da IA de combate (TASK_009): políticas por lado e `candidatas()` (E1).
 * O registro de referência completo (12.952 lutas) fica em
 * `ded_make_character/tools/ia/registro-referencia.mjs`; aqui roda uma amostra dele.
 * Executar: node tests/ded_make_character_ia.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
const cat = require(path.join(root, 'data', 'catalogo-combate.json'));

async function run() {
  const C = await load('js/rules/combat30.js');
  const { createRng } = await load('js/rules/dice.js');
  const { lutasDaReferencia, diferencaDaClassica } = await load('tools/ia/registro-referencia.mjs');
  const { montarPersonagem, CLASSES } = await load('tools/ia/personagens.mjs');
  const entrada = id => [...cat.monstros, ...cat.holy_avenger].find(e => e.id === id);
  const ficha = (id, over = {}) => Object.assign(C.fromCatalog(entrada(id)), over);
  const registro = b => b.eventos.map(e => `${e.rodada}|${e.ator}|${e.tipo}|${e.texto}`);
  const lutar = (l, politicas = null) => {
    const b = C.createBattle({ ladoA: l.ladoA, ladoB: l.ladoB, semente: l.semente, distancia: l.distancia, ...(politicas ? { politicas } : {}) });
    C.runBattle(b);
    return b;
  };
  // amostra da referência: 1 × 1 espalhados, as primeiras lutas em grupo e as duas em que a
  // clássica fica parada com o que fazer contra outro alvo (Helena, grupo:616 e grupo:871)
  const { lutas } = lutasDaReferencia();
  const amostra = [
    ...lutas.filter((_, i) => i < 10952 && i % 73 === 0),
    ...lutas.slice(10952, 10952 + 150),
    ...lutas.filter(l => ['grupo:616', 'grupo:871'].includes(l.id)),
  ];
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };
  const testeAssincrono = async (name, fn) => {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- IA de combate: políticas e candidatas (TASK_009, E1) ---');

  test('sem política, a IA clássica; uma política que devolve a escolha clássica dá a mesma luta', () => {
    const classica = (b, c, ia) => ia.classica(b, c);
    for (const l of amostra) assert.deepStrictEqual(registro(lutar(l, { A: classica, B: classica })), registro(lutar(l)), l.id);
  });

  test('listar as candidatas antes de cada decisão não muda nada; a escolha clássica vem marcada, igual', () => {
    let marcadas = 0;
    let parada = 0;
    const eco = (b, c, ia) => {
      const lista = ia.candidatas(b, c);
      const h = ia.classica(b, c);
      const m = lista.filter(x => x.heuristica);
      if (!h) {
        assert.strictEqual(m.length, 0, `${c.nome}: nada marcado quando a clássica não age`);
        if (lista.length) parada++;
        return null;
      }
      assert.strictEqual(m.length, 1, `${c.nome}: uma candidata marcada`);
      assert.strictEqual(diferencaDaClassica(m[0], h), null, `${c.nome}: a marcada é a ação que a clássica escolheu`);
      marcadas++;
      return h;
    };
    for (const l of amostra) assert.deepStrictEqual(registro(lutar(l, { A: eco, B: eco })), registro(lutar(l)), l.id);
    assert.ok(marcadas > 1000, `${marcadas} decisões conferidas`);
    assert.strictEqual(parada, 11, 'as 11 decisões em que Helena fica parada');
  });

  test('candidatas: todos os alvos; o que não depende do alvo e a área que pega os mesmos entram uma vez', () => {
    // o clérigo 9 decide, com o mago ferido; os ogros começam juntos, então a Coluna de Chamas pega os três
    const montar = ogros => {
      const clerigo = montarPersonagem({ classe: 'clerigo', nivel: 9 }).ficha;
      const mago = montarPersonagem({ classe: 'mago', nivel: 9 }).ficha;
      const b = C.createBattle({ ladoA: [clerigo, mago], ladoB: Array.from({ length: ogros }, () => ficha('ogro')), semente: 3, distancia: 9 });
      b.rodada = 1;
      b.get('A2').pv = 5; // abaixo da metade: o clérigo quer curar
      return b;
    };
    const b = montar(3);
    const c = b.get('A1');
    const lista = C.candidatas(b, c);
    assert.deepStrictEqual(lista.map(x => x.ordem), lista.map((_, i) => i));
    // o que não depende do alvo (curas e reforços) é o mesmo com 1 ou com 3 ogros
    const semAlvo = l => l.filter(x => x.tipo === 'magia' && x.alvo?.lado === 'A').map(x => x.chave).sort();
    const umOgro = montar(1);
    assert.deepStrictEqual(semAlvo(lista), semAlvo(C.candidatas(umOgro, umOgro.get('A1'))));
    const curas = lista.filter(x => x.tipo === 'magia' && x.s.m.cura);
    assert.ok(curas.length >= 1 && curas.every(x => x.alvo === b.get('A2')), 'curas no mago ferido');
    // a cura preparada e a convertida do mesmo espaço são a mesma ação; vêm de todos os alvos: origem null
    assert.strictEqual(new Set(curas.map(x => `${x.s.nome}:${x.s.espaco}`)).size, curas.length, 'cada cura uma vez só');
    assert.ok(curas.every(x => x.origem === null));
    const colunas = lista.filter(x => x.s?.nome === 'Coluna de Chamas');
    assert.strictEqual(colunas.length, 1, 'a área que pega os mesmos três ogros entra uma vez');
    assert.strictEqual(colunas[0].alvos.length, 3);
    for (const uid of ['B1', 'B2', 'B3']) assert.ok(lista.some(x => ['ataque', 'investida', 'mover-atacar'].includes(x.tipo) && x.alvo?.uid === uid), `ataque contra ${uid}`);
    assert.strictEqual(lista.filter(x => x.heuristica).length, 1);
  });

  test('a chave das ações não funde especiais nem magias diferentes das fichas', () => {
    // a chave identifica o especial pelo id e a magia da lista pelo nome, espaço e CD: dois especiais
    // com o mesmo id, ou duas linhas da lista com o mesmo nome, espaço e CD e mecânicas diferentes,
    // virariam uma ação só
    const pjs = Object.keys(CLASSES).flatMap(classe => [1, 10, 20].map(nivel => montarPersonagem({ classe, nivel, ranks: classe === 'bardo' ? { atuacao: nivel + 3 } : {} }).ficha));
    const fichas = [...[...cat.monstros, ...cat.holy_avenger].map(e => C.fromCatalog(e)), ...pjs];
    assert.strictEqual(pjs.length, 33);
    for (const f of fichas) {
      const ids = f.especiais.map(e => e.id);
      assert.strictEqual(new Set(ids).size, ids.length, `${f.nome}: id de especial repetido`);
      const porChave = new Map();
      for (const s of f.magias?.lista || []) {
        if (!s.mecanica) continue;
        const cd = s.mecanica.cd ?? f.magias.cd_base + s.nivel;
        const k = `${s.nome}:${s.espaco ?? ''}:${cd}`;
        const mecanica = JSON.stringify(s.mecanica);
        if (porChave.has(k)) assert.strictEqual(porChave.get(k), mecanica, `${f.nome}: duas linhas "${s.nome}" com mecânicas diferentes`);
        porChave.set(k, mecanica);
      }
    }
  });

  test('a política vale só para o lado dela; criarLote e simulate repassam as políticas', () => {
    const vistos = new Set();
    const espia = (b, c, ia) => {
      vistos.add(c.lado);
      return ia.classica(b, c);
    };
    const l = { ladoA: [ficha('ogro')], ladoB: [ficha('troll')], semente: 5, distancia: 9 };
    lutar(l, { A: espia });
    assert.deepStrictEqual([...vistos], ['A']);
    // um lado que nunca age perde sempre
    const parado = () => null;
    const r = C.simulate({ ladoA: [ficha('ogro')], ladoB: [ficha('ogro')], politicas: { A: parado } }, { vezes: 20, semente: 1 });
    assert.strictEqual(r.vitoriasB, 1);
  });

  test('política aleatória: o motor executa qualquer candidata sem erro nem texto quebrado', () => {
    const suspeito = /undefined|NaN|\bnull\b|\[object/;
    const tipos = new Set();
    for (const l of amostra) {
      const sorte = createRng(`aleatoria:${l.id}`);
      const aleatoria = (b, c, ia) => {
        const lista = ia.candidatas(b, c);
        if (!lista.length) return null;
        const a = lista[sorte.die(lista.length) - 1];
        tipos.add(a.tipo);
        return a;
      };
      const b = lutar(l, { A: aleatoria, B: aleatoria });
      assert.ok(b.fim, l.id);
      for (const e of b.eventos) assert.ok(!suspeito.test(e.texto), `${l.id}: ${e.texto}`);
    }
    for (const t of ['ataque', 'mover-atacar', 'investida', 'mover', 'magia', 'sopro']) assert.ok(tipos.has(t), `a amostra executou ${t}`);
  });

  // ---------------------------------------------------------------------------------------------
  console.log('--- IA de combate: perfis, entradas, rede e política (TASK_009, E2) ---');
  const I = await load('js/rules/ia30.js');
  const { redeAleatoria } = await load('tools/ia/medir-custo.mjs');
  const NE = I.NOMES_ESTADO.length;
  const NA = I.NOMES_ACAO.length;
  /** Rede feita à mão: a nota cresce com uma entrada da ação (e só com ela). */
  const redeQueGosta = (nome, sinal = 1) => {
    const linha = Array(NE + NA).fill(0);
    linha[NE + I.NOMES_ACAO.indexOf(nome)] = sinal;
    return {
      formato: 'ded-ia-rede', versaoEntradas: I.VERSAO_ENTRADAS, perfil: 'teste', geracao: 0, entradas: { estado: NE, acao: NA },
      normalizacao: { media: Array(NE + NA).fill(0), desvio: Array(NE + NA).fill(1) },
      camadas: [{ pesos: [linha, Array(NE + NA).fill(0)], vies: [0, 0] }, { pesos: [[1, 0], [0, 0]], vies: [0, 0] }],
    };
  };

  test('perfis: marcial só com armas; recursos com magias ou poderes ativos, pela ficha montada', () => {
    const todos = [...cat.monstros, ...cat.holy_avenger].map(e => C.fromCatalog(e));
    const contagem = { marcial: 0, recursos: 0 };
    for (const f of todos) contagem[I.perfilDe(f)]++;
    // Zed tem uma magia só, sem mecânica (o motor não a conjura): luta como marcial
    assert.deepStrictEqual(contagem, { marcial: 36, recursos: 38 });
    assert.strictEqual(I.perfilDe(C.fromCatalog(cat.holy_avenger.find(e => e.id === 'ha-zed'))), 'marcial');
    const perfil = (classe, nivel, extra = {}) => I.perfilDe(montarPersonagem({ classe, nivel, ...extra }).ficha);
    assert.strictEqual(perfil('guerreiro', 10), 'marcial');
    assert.strictEqual(perfil('ladino', 10), 'marcial');
    assert.strictEqual(perfil('mago', 1), 'recursos');
    assert.strictEqual(perfil('paladino', 2), 'recursos', 'cura pelas mãos (Car 12 ou mais: modificador positivo)');
    assert.strictEqual(perfil('bardo', 5), 'recursos', 'magias de bardo');
    assert.strictEqual(perfil('bardo', 1, { ranks: {} }), 'marcial', 'bardo 1 sem Atuação: sem magias de combate nem inspirar');
    // na luta, o mesmo perfil da ficha
    const b = C.createBattle({ ladoA: [ficha('dragao-vermelho-adulto')], ladoB: [ficha('ogro')], semente: 1 });
    assert.strictEqual(I.perfilDe(b.get('A1')), 'recursos');
    assert.strictEqual(I.perfilDe(b.get('B1')), 'marcial');
  });

  test('entradas: tamanho e nomes fixos, números finitos, sem rolar dados nem mudar a luta', () => {
    assert.strictEqual(new Set(I.NOMES_ESTADO).size, NE);
    assert.strictEqual(new Set(I.NOMES_ACAO).size, NA);
    let decisoes = 0;
    const conferir = (b, c, ia) => {
      const lista = ia.candidatas(b, c);
      const um = I.entradasDaDecisao(b, c, lista);
      const dois = I.entradasDaDecisao(b, c, lista);
      assert.deepStrictEqual(um, dois, 'determinístico');
      assert.strictEqual(um.estado.length, NE);
      for (const v of [um.estado, ...um.acoes]) {
        assert.ok(v.every(Number.isFinite), `${c.nome}: entrada não finita ${JSON.stringify(v)}`);
      }
      um.acoes.forEach(v => assert.strictEqual(v.length, NA));
      decisoes++;
      return ia.classica(b, c);
    };
    for (const l of amostra.slice(0, 120)) assert.deepStrictEqual(registro(lutar(l, { A: conferir, B: conferir })), registro(lutar(l)), l.id);
    assert.ok(decisoes > 500);
  });

  test('entradas, casos montados à mão: furtivo, coordenação, sopro, espaços de magia, teste e derrubar', () => {
    const valor = (b, c, nome, filtro = () => true) => {
      const lista = C.candidatas(b, c).filter(filtro);
      const { estado, acoes } = I.entradasDaDecisao(b, c, lista);
      if (I.NOMES_ESTADO.includes(nome)) return estado[I.NOMES_ESTADO.indexOf(nome)];
      return acoes.map(v => v[I.NOMES_ACAO.indexOf(nome)]);
    };
    const novaLuta = (ladoA, ladoB, rodada = 2) => {
      const b = C.createBattle({ ladoA, ladoB, semente: 1, distancia: 9 });
      b.rodada = rodada;
      return b;
    };
    // furtivo: ladino com besta contra um ogro surpreso (1ª rodada, sem ter agido); à distância só até 9 m
    const ladino = montarPersonagem({ classe: 'ladino', nivel: 10 }).ficha;
    let b = novaLuta([ladino], [ficha('ogro')], 1);
    const [c, ogro] = [b.get('A1'), b.get('B1')];
    const besta = x => x.tipo === 'ataque' && !C.rules.isMelee(x.golpes[0]);
    ogro.pos = c.pos + 6;
    assert.deepStrictEqual(valor(b, c, 'furtivo', besta), [1], 'a 6 m, surpreso');
    ogro.pos = c.pos + 12;
    assert.deepStrictEqual(valor(b, c, 'furtivo', besta), [0], 'a 12 m, fora dos 9 m');
    assert.ok(valor(b, c, 'furtivo', x => x.tipo === 'mover').every(v => v === 0), 'andar não é golpe');
    ogro.agiu = true;
    ogro.pos = c.pos + 6;
    assert.deepStrictEqual(valor(b, c, 'furtivo', besta), [0], 'quem já agiu tem a Destreza');
    // coordenação: o outro guerreiro age antes do próximo turno do ogro (ou depois)
    const guerreiro = () => montarPersonagem({ classe: 'guerreiro', nivel: 6 }).ficha;
    b = novaLuta([guerreiro(), guerreiro()], [ficha('ogro')]);
    for (const x of b.combatentes) x.pos = 0;
    b.ordem = ['A1', 'A2', 'B1'];
    b.turno = 0;
    const contraOgro = x => x.alvo?.uid === 'B1' && x.tipo === 'ataque' && C.rules.isMelee(x.golpes[0]);
    assert.deepStrictEqual(valor(b, b.get('A1'), 'aliados_antes', contraOgro), [1]);
    assert.ok(valor(b, b.get('A1'), 'aliados_dano_log', contraOgro)[0] > 0);
    b.ordem = ['A1', 'B1', 'A2'];
    assert.deepStrictEqual(valor(b, b.get('A1'), 'aliados_antes', contraOgro), [0], 'o aliado só age depois do ogro');
    // sopro: pronto e, depois de usado, recarregando
    b = novaLuta([ficha('dragao-vermelho-adulto')], [ficha('ogro')]);
    const dragao = b.get('A1');
    assert.strictEqual(valor(b, dragao, 'sopro_pronto'), 1);
    assert.strictEqual(valor(b, dragao, 'sopro_recarga'), 0);
    const sopro = dragao._esp.find(e => e.m?.efeito === 'sopro');
    dragao.recarga[sopro.id] = C.rules.tick(b) + 3;
    assert.strictEqual(valor(b, dragao, 'sopro_pronto'), 0);
    assert.strictEqual(valor(b, dragao, 'sopro_recarga'), 1);
    // espaços de magia de um personagem: a fração cai quando gasta um espaço de 1º nível
    const mago = montarPersonagem({ classe: 'mago', nivel: 5 }).ficha;
    b = novaLuta([mago], [ficha('ogro')]);
    const m5 = b.get('A1');
    assert.strictEqual(valor(b, m5, 'magia_0a3'), 1);
    const total = Object.values(m5.magias.espacos).reduce((s, n) => s + n, 0);
    m5.espacosRestantes.n1--;
    assert.ok(Math.abs(valor(b, m5, 'magia_0a3') - (total - 1) / total) < 1e-9);
    // teste: a Bola de Fogo pede Reflexos (com a chance de falhar do ogro); o golpe não pede teste
    const bola = x => x.s?.nome === 'Bola de Fogo';
    assert.deepStrictEqual(valor(b, m5, 'tem_teste', bola), [1]);
    const cd = C.candidatas(b, m5).find(bola).s.cd;
    assert.ok(Math.abs(valor(b, m5, 'falha_teste', bola)[0] - Math.min(0.95, Math.max(0.05, (cd - 1 - b.get('B1').resistencias.ref) / 20))) < 1e-9);
    assert.ok(valor(b, m5, 'tem_teste', x => x.tipo === 'ataque').every(v => v === 0));
    // derrubar: o golpe que tira os PV que restam; Sono não derruba (não causa dano)
    b = novaLuta([guerreiro()], [ficha('ogro')]);
    for (const x of b.combatentes) x.pos = 0;
    b.get('B1').pv = 2;
    assert.ok(valor(b, b.get('A1'), 'derruba_se_acertar', x => x.tipo === 'ataque').every(v => v === 1));
    b.get('B1').pv = 500;
    assert.ok(valor(b, b.get('A1'), 'derruba_se_acertar', x => x.tipo === 'ataque').every(v => v === 0));
    const mago1 = montarPersonagem({ classe: 'mago', nivel: 1, magias: { preparadas: { 1: { sono: 1, 'misseis-magicos': 1 } } } }).ficha;
    b = novaLuta([mago1], [ficha('ogro')]); // o carniçal, morto-vivo, é imune a Sono
    b.get('B1').pv = 1;
    const sono = valor(b, b.get('A1'), 'derruba_se_acertar', x => x.s?.nome === 'Sono');
    assert.ok(sono.length && sono.every(v => v === 0), 'Sono não derruba por dano');
    assert.deepStrictEqual(valor(b, b.get('A1'), 'derruba_se_acertar', x => x.s?.nome === 'Mísseis Mágicos'), [1], 'os mísseis tiram o 1 PV');
  });

  test('rede: a inferência com a primeira camada dividida dá o mesmo que a conta direta; formatos errados são recusados', () => {
    const json = redeAleatoria(7);
    const rede = I.criarRede(json);
    const rng = createRng('vetores');
    const vetor = n => Array.from({ length: n }, () => rng.float() * 4 - 2);
    const direta = entrada => {
      let atual = entrada;
      json.camadas.forEach((l, k) => {
        atual = l.pesos.map((linha, o) => {
          const s = l.vies[o] + linha.reduce((t, w, j) => t + w * atual[j], 0);
          return k === json.camadas.length - 1 || s > 0 ? s : 0;
        });
      });
      return 1 / (1 + Math.exp(-atual[0])) + I.PESO_MARGEM * Math.tanh(atual[1]);
    };
    for (let k = 0; k < 20; k++) {
      const estado = vetor(NE);
      const acoes = [vetor(NA), vetor(NA), vetor(NA)];
      const { notas } = rede.avaliar(estado, acoes);
      acoes.forEach((a, i) => assert.ok(Math.abs(notas[i] - direta([...estado, ...a])) < 1e-9));
    }
    assert.throws(() => I.criarRede({ ...json, versaoEntradas: 999 }), /entradas v999/);
    assert.throws(() => I.criarRede({ ...json, entradas: { estado: NE - 1, acao: NA } }), /entradas/);
    assert.throws(() => I.criarRede({ ...json, camadas: json.camadas.slice(-1) }), /camadas/);
    assert.throws(() => I.criarRede({ formato: 'outro' }), /não é uma rede/);
    assert.throws(() => I.criarRede({ ...json, normalizacao: { media: json.normalizacao.media.slice(1), desvio: json.normalizacao.desvio } }), /normalização/);
    const comNaN = JSON.parse(JSON.stringify(json));
    comNaN.camadas[1].vies[0] = null;
    assert.throws(() => I.criarRede(comNaN), /não é número/);
  });

  test('teto de candidatas: até 32, sempre com a escolha clássica, na ordem original', () => {
    const l = { ladoA: [montarPersonagem({ classe: 'mago', nivel: 12 }).ficha], ladoB: Array.from({ length: 10 }, () => ficha('ogro')), semente: 9, distancia: 9 };
    const b = C.createBattle({ ...l });
    b.rodada = 1;
    for (const x of b.combatentes.filter(x => x.lado === 'B')) x.pos = 1.5 * (2 + Number(x.uid.slice(1))); // espalhados
    const todas = C.candidatas(b, b.get('A1'));
    assert.ok(todas.length > 12, `${todas.length} candidatas`);
    const doze = I.limitarCandidatas(b, b.get('A1'), todas, 12);
    assert.strictEqual(doze.length, 12);
    assert.ok(doze.some(x => x.heuristica));
    assert.deepStrictEqual(doze.map(x => x.ordem), [...doze.map(x => x.ordem)].sort((x, y) => x - y));
    assert.strictEqual(I.limitarCandidatas(b, b.get('A1'), todas.slice(0, 5)).length, 5);
  });

  test('política "rede": sem a rede do perfil, a clássica; com uma rede, escolhe pela nota e é determinística', () => {
    // sem rede nenhuma: igual à clássica
    const vazia = I.politicaRede({});
    for (const l of amostra.slice(0, 60)) assert.deepStrictEqual(registro(lutar(l, { A: vazia, B: vazia })), registro(lutar(l)), l.id);
    // a rede que gosta de `ev`: Helena sopra no mago em vez de ficar parada diante do Tarrasque (grupo:616)
    const l = lutas.find(x => x.id === 'grupo:616');
    const helena = b => b.combatentes.find(x => /Helena/.test(x.nome)).uid;
    const contar = (b, tipo, texto) => b.eventos.filter(e => e.ator === helena(b) && e.tipo === tipo && texto.test(e.texto)).length;
    const classica = lutar(l);
    assert.ok(contar(classica, 'sem-acao', /não tem o que fazer/) >= 5, 'a clássica fica parada diante do Tarrasque');
    const decisoes = [];
    let paradaComCandidatas = 0;
    const gostaDeEv = I.politicaRede({ recursos: I.criarRede(redeQueGosta('ev_log')), marcial: I.criarRede(redeQueGosta('ev_log')) }, { delta: 0, aoDecidir: d => decisoes.push(d) });
    const espiada = (b, c, ia) => {
      const a = gostaDeEv(b, c, ia);
      if (!a && ia.candidatas(b, c).length) paradaComCandidatas++;
      return a;
    };
    const b = lutar(l, { A: espiada, B: espiada });
    assert.strictEqual(paradaComCandidatas, 0, 'com a rede, ninguém fica parado tendo o que fazer');
    assert.ok(contar(b, 'especial', /usa Sopro/) > contar(classica, 'especial', /usa Sopro/), 'Helena sopra mais que com a clássica');
    assert.ok(decisoes.length > 10 && decisoes.every(d => d.lista[d.escolhida] && d.notas.length === d.lista.length));
    // a mesma semente dá a mesma luta
    assert.deepStrictEqual(registro(lutar(l, { A: gostaDeEv, B: gostaDeEv })), registro(b));
    // delta: a clássica fica, a menos que a melhor nota passe a dela por delta
    const teimosa = I.politicaRede({ recursos: I.criarRede(redeQueGosta('ev_log')), marcial: I.criarRede(redeQueGosta('ev_log')) }, { delta: 10 });
    const fiel = lutas.slice(10952, 10972);
    for (const x of fiel) assert.deepStrictEqual(registro(lutar(x, { A: teimosa, B: teimosa })), registro(lutar(x)), `${x.id}: com delta enorme, só a clássica`);
  });

  // ---------------------------------------------------------------------------------------------
  console.log('--- IA de combate: personagens sintéticos, confrontos e ramificação (TASK_009, E3) ---');
  const S = await load('tools/ia/personagens-sinteticos.mjs');
  const F = await load('tools/ia/confrontos.mjs');
  const Rm = await load('tools/ia/ramificacao.mjs');

  test('personagens sintéticos: válidos, determinísticos, com as classes pedidas; outro nível mantém o resto', () => {
    const um = S.personagemSintetico(42);
    assert.strictEqual(JSON.stringify(S.personagemSintetico(42)), JSON.stringify(um), 'o mesmo número dá o mesmo personagem');
    for (let n = 0; n < 150; n++) assert.ok(S.personagemSintetico(n).ficha, `sintético ${n} sem erros`);
    for (let n = 0; n < 30; n++) assert.ok(F.CLASSES_RESERVADAS.includes(S.personagemSintetico(n, { classes: F.CLASSES_RESERVADAS }).classe));
    const vinte = S.personagemSintetico(42, { nivel: 20 });
    assert.deepStrictEqual([vinte.classe, vinte.raca, vinte.nivel], [um.classe, um.raca, 20]);
  });

  test('reserva de teste: 15 fichas, no máximo 1 Paladino, e toda mecânica continua no treino', () => {
    const reserva = F.reservaDeTeste();
    assert.strictEqual(reserva.length, 15);
    assert.deepStrictEqual(F.reservaDeTeste(), reserva, 'determinística');
    const porId = new Map(F.CATALOGO.map(e => [e.id, e]));
    assert.ok(reserva.filter(id => /^paladino/i.test(porId.get(id).nome)).length <= 1);
    const conta = ids => {
      const c = {};
      for (const id of ids) for (const m of F.marcasDe(porId.get(id))) c[m] = (c[m] || 0) + 1;
      return c;
    };
    const todas = conta(F.CATALOGO.map(e => e.id));
    const noTreino = conta(F.CATALOGO.map(e => e.id).filter(id => !reserva.includes(id)));
    for (const [m, n] of Object.entries(todas)) assert.ok((noTreino[m] || 0) >= Math.max(1, Math.ceil(0.6 * n)), `${m}: ${noTreino[m] || 0} de ${n} no treino`);
  });

  test('confrontos: dados de vida rolados, montagem determinística, pré-teste e equilíbrio', () => {
    const rng = createRng('dv');
    for (let k = 0; k < 50; k++) {
      const v = F.rolarDadosDeVida(rng, '3d10+1d4+4');
      assert.ok(v >= 8 && v <= 38, `3d10+1d4+4 = ${v}`);
    }
    const reserva = new Set(F.reservaDeTeste());
    const treino = F.CATALOGO.filter(e => !reserva.has(e.id));
    const conf = F.confrontoDeTreino(3, { catalogo: treino, ancora: 'troll' });
    assert.deepStrictEqual(F.confrontoDeTreino(3, { catalogo: treino, ancora: 'troll' }), conf, 'determinístico');
    assert.ok([...conf.ladoA, ...conf.ladoB].every(r => !r.ref.startsWith('cat:') || !reserva.has(r.ref.slice(4))), 'só fichas de treino');
    assert.ok(conf.ladoA.some(r => r.ref === 'cat:troll'), 'a âncora no lado A');
    assert.ok(conf.preTeste >= 0 && conf.preTeste <= 1 && conf.equilibrado === (conf.preTeste >= 0.2 && conf.preTeste <= 0.8));
    assert.ok(conf.ladoA.length <= 10 && conf.ladoB.length <= 10);
  });

  test('fluxo de dados por combatente: determinístico e diferente do gerador comum', () => {
    const l = { ladoA: [ficha('ogro'), ficha('ogro')], ladoB: [ficha('troll')], semente: 'fluxos' };
    const jogar = extra => {
      const b = C.createBattle({ ...l, ...extra });
      C.runBattle(b);
      return registro(b);
    };
    assert.deepStrictEqual(jogar({ rngPorCombatente: true }), jogar({ rngPorCombatente: true }));
    assert.notDeepStrictEqual(jogar({ rngPorCombatente: true }), jogar({}));
    // o que importa: mudar a ação de A1 não muda os dados que B1 tira (só quantos)
    // A1 é um mago 9 (várias candidatas na 1ª rodada), com um ogro ao lado, contra o troll
    const comMago = { ladoA: [montarPersonagem({ classe: 'mago', nivel: 9 }).ficha, ficha('ogro')], ladoB: [ficha('troll')], semente: 'fluxos' };
    const dadosPorUid = (porCombatente, escolha) => {
      const b = C.createBattle({ ...comMago, rngPorCombatente: porCombatente, politicas: { A: (bb, c, ia) => (c.uid === 'A1' && bb.rodada === 1 ? escolha(ia.candidatas(bb, c)) : ia.classica(bb, c)) } });
      const tirados = {};
      let atual = '_';
      const usar = b.rng.usar;
      if (usar) b.rng.usar = uid => (atual = uid, usar(uid));
      const die = b.rng.die;
      b.rng.die = n => {
        const v = die(n);
        (tirados[atual] ??= []).push(`${n}:${v}`);
        return v;
      };
      b.rng.chance = pct => b.rng.die(100) <= pct;
      C.runBattle(b);
      return tirados;
    };
    const escolhas = [];
    const primeira = lista => (escolhas.push(lista[0].chave), lista[0]);
    const ultima = lista => (escolhas.push(lista[lista.length - 1].chave), lista[lista.length - 1]);
    const x = dadosPorUid(true, primeira);
    const y = dadosPorUid(true, ultima);
    const prefixo = (p, q) => (p.length <= q.length ? q.slice(0, p.length).join() === p.join() : prefixo(q, p));
    assert.notStrictEqual(escolhas[0], escolhas[1], 'A1 fez coisas diferentes nos dois caminhos');
    assert.ok(x.B1?.length && y.B1?.length);
    assert.ok(prefixo(x.B1, y.B1), 'B1 tira a mesma sequência de dados nos dois caminhos');
  });

  test('confrontos (revisão): PV rolados centrados na ficha, a âncora fica, o cache separa os sintéticos reservados', () => {
    const rng = createRng('pv');
    for (const id of ['ha-tarso', 'ha-mestre-arsenal', 'troll']) {
      const e = F.CATALOGO.find(x => x.id === id);
      const media = Array.from({ length: 2000 }, () => F.pvRolados(rng, e)).reduce((s, v) => s + v, 0) / 2000;
      assert.ok(Math.abs(media - e.pv) / e.pv < 0.03, `${id}: média ${media.toFixed(1)} contra ${e.pv} da ficha`);
    }
    const reserva = new Set(F.reservaDeTeste());
    const treino = F.CATALOGO.filter(e => !reserva.has(e.id));
    for (let i = 0; i < 12; i++) {
      const ancora = treino[i * 3].id;
      const conf = F.confrontoDeTreino(1000 + i, { catalogo: treino, ancora });
      assert.ok(conf.ladoA.some(r => r.ref === `cat:${ancora}`), `confronto ${1000 + i}: a âncora ${ancora} continua`);
    }
    const reservado = F.fichaDe({ ref: 'sint:77', nivel: 5, reservado: true });
    const deTreino = F.fichaDe({ ref: 'sint:77', nivel: 5 });
    assert.notStrictEqual(reservado, deTreino);
  });

  test('ramificação: o caminho 0 é π, as linhas têm as colunas certas e o ponto é determinístico', () => {
    const fim = (vencedor, rodadas, cs) => ({ vencedor, rodadas, combatentes: cs.map(([lado, pv, pvMax, contusao = 0, estado = 'ativo']) => ({ lado, pv, pvMax, contusao, estado, condicoes: [] })) });
    // venceu na rodada 5 com metade dos PV (um terço deles de contusão): 1/3 − 0 + 0,2 × (1 − 5/50)
    const r = Rm.rotulo(fim('A', 5, [['A', 30, 60, 10], ['B', -5, 40, 0, 'morto']]), 'A');
    assert.strictEqual(r.vitoria, 1);
    assert.ok(Math.abs(r.margem - (20 / 60 + 0.2 * 0.9)) < 1e-9);
    assert.strictEqual(Rm.rotulo(fim(null, 50, [['A', 10, 10], ['B', 10, 10]]), 'B').vitoria, 0.5);
    const conf = { semente: 'teste-ramo', indice: 7, distancia: 9, ladoA: [{ ref: 'sint:5', nivel: 9 }, { ref: 'cat:ogro', pv: null }], ladoB: [{ ref: 'cat:troll', pv: null }, { ref: 'cat:ogro', pv: null }] };
    const pis = { A: { tipo: 'classica' }, B: { tipo: 'classica' } };
    const um = Rm.pontoDeRamificacao(conf, 0, { pis });
    assert.deepStrictEqual(Rm.pontoDeRamificacao(conf, 0, { pis }), um, 'determinístico');
    assert.ok(um.ramos.length >= 2 && um.ramos.length <= Rm.CAMINHOS, `${um.ramos.length} caminhos`);
    const col = n => Rm.COLUNAS_RAMOS.indexOf(n);
    for (const linha of um.ramos) {
      assert.strictEqual(linha.length, Rm.COLUNAS_RAMOS.length);
      assert.ok(linha.every(Number.isFinite));
      assert.ok([0, 0.5, 1].includes(linha[col('vitoria')]) && Math.abs(linha[col('margem')]) <= 1);
      assert.strictEqual(linha[col('confronto')], 7);
    }
    assert.deepStrictEqual(um.ramos.map(l => l[col('caminho')]), um.ramos.map((_, j) => j));
    assert.strictEqual(um.ramos[0][col('eh_pi')], 1);
    assert.strictEqual(um.ramos[0][col('eh_classica')], 1, 'na G0, π é a clássica');
    // o estado do ponto é o mesmo em todos os caminhos; as ações, diferentes
    const estado = l => JSON.stringify(l.slice(9, 9 + NE));
    assert.ok(um.ramos.every(l => estado(l) === estado(um.ramos[0])));
    assert.strictEqual(new Set(um.ramos.map(l => JSON.stringify(l.slice(9 + NE)))).size, um.ramos.length);
    for (const e of um.extras) assert.ok(e.length === Rm.COLUNAS_EXTRAS.length && e.every(Number.isFinite));
    // com uma rede, π decide pela rede, e a clássica entra entre as alternativas
    const rede = I.criarRede(redeQueGosta('ev_log'));
    const comRede = Rm.pontoDeRamificacao(conf, 1, { pis: { A: { tipo: 'rede', redes: { marcial: rede, recursos: rede }, delta: 0 }, B: { tipo: 'classica', adversario: true } }, geracao: 1 });
    assert.ok(comRede.ramos.length >= 2 && comRede.ramos.every(l => l.every(Number.isFinite)));
  });

  // ---------------------------------------------------------------------------------------------
  console.log('--- IA de combate: paridade com o treino (TASK_009, E4) ---');

  test('paridade: a inferência em JS dá as mesmas notas que o PyTorch (tools/ia/paridade.py)', () => {
    const { rede, casos } = require(path.join(__dirname, 'fixtures', 'ia-paridade.json'));
    const r = I.criarRede(rede);
    assert.strictEqual(casos.length, 100);
    for (const caso of casos) {
      const { notas } = r.avaliar(caso.estado, [caso.acao]);
      assert.ok(Math.abs(notas[0] - caso.nota) < 1e-4, `${notas[0]} × ${caso.nota}`);
    }
    // os nomes das entradas, quando a rede os traz, têm de bater na ordem
    const trocados = JSON.parse(JSON.stringify(rede));
    [trocados.entradas.nomes[0], trocados.entradas.nomes[1]] = [trocados.entradas.nomes[1], trocados.entradas.nomes[0]];
    assert.throws(() => I.criarRede(trocados), /outra ordem/);
  });

  // ---------------------------------------------------------------------------------------------
  console.log('--- IA de combate: na Arena (TASK_009, E6) ---');
  const A = await load('js/pages/arena-ia.js');

  test('Arena: rótulo das ações, "por que" no registro e as políticas só nos lados com a treinada', () => {
    const mago = montarPersonagem({ classe: 'mago', nivel: 9 }).ficha;
    const b = C.createBattle({ ladoA: [mago], ladoB: [ficha('ogro'), ficha('ogro')], semente: 2, distancia: 9 });
    b.rodada = 1;
    const c = b.get('A1');
    const lista = C.candidatas(b, c);
    const rotulos = lista.map(a => I.rotuloDaAcao(c, a));
    assert.ok(rotulos.every(r => typeof r === 'string' && r && !/undefined|null/.test(r)), rotulos.join(' | '));
    const bola = lista.find(a => a.s?.nome === 'Bola de Fogo');
    assert.strictEqual(I.rotuloDaAcao(c, bola), 'Bola de Fogo em Ogro 1 (2 alvos)');
    // "por que": só quando a rede troca a escolha clássica; diz a escolha e a clássica que ela deixou
    const antes = b.eventos.length;
    const h = lista.findIndex(a => a.heuristica);
    const outra = lista.findIndex(a => !a.heuristica);
    const vitoria = Float64Array.from(lista, (_, i) => (i === outra ? 0.7 : i === h ? 0.45 : 0.3));
    A.porQue({ b, c, lista, vitoria, escolhida: h });
    assert.strictEqual(b.eventos.length, antes, 'a rede manteve a clássica: nada no registro');
    A.porQue({ b, c, lista, vitoria, escolhida: outra });
    const ev = b.eventos.at(-1);
    assert.strictEqual(b.eventos.length, antes + 1);
    assert.strictEqual(ev.tipo, 'ia');
    assert.strictEqual(ev.texto, `IA treinada de ${c.nome}: ${rotulos[outra]}, com 70% de vitória estimada. A clássica faria ${rotulos[h]}, 45%.`);
    A.porQue({ b, c, lista: lista.slice(0, 1), vitoria: [1], escolhida: 0 });
    assert.strictEqual(b.eventos.length, antes + 1, 'uma candidata só: nada a explicar');
    // políticas: só nos lados com a treinada, e nenhuma sem as redes
    const rede = I.criarRede(redeQueGosta('ev_log'));
    const redes = { marcial: rede, recursos: rede };
    assert.deepStrictEqual(Object.keys(A.politicasDaArena({ A: 'rede', B: 'classica' }, redes)), ['A']);
    assert.strictEqual(A.politicasDaArena({ A: 'classica', B: 'classica' }, redes), null);
    assert.strictEqual(A.politicasDaArena({ A: 'rede', B: 'rede' }, null), null);
  });

  await testeAssincrono('Arena: as redes são buscadas uma vez; se a busca falha, a próxima tenta de novo', async () => {
    const json = redeQueGosta('ev_log');
    let buscas = 0;
    const falha = () => {
      buscas++;
      return Promise.resolve({ ok: false, status: 404 });
    };
    await assert.rejects(A.carregarRedes(falha), /HTTP 404/);
    const ok = url => {
      buscas++;
      assert.ok(/data\/ia\/rede-recursos\.json$/.test(String(url)), String(url));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(json) });
    };
    const r = await A.carregarRedes(ok);
    // só a rede de recursos (a marcial não ganhou nada na avaliação): os marciais ficam com a clássica
    assert.deepStrictEqual(A.PERFIS_DA_ARENA, ['recursos']);
    assert.ok(r.recursos && !r.marcial);
    assert.strictEqual(await A.carregarRedes(ok), r, 'a segunda vez é a mesma (sem buscar de novo)');
    assert.strictEqual(buscas, 2, '1 da tentativa que falhou + 1 da que deu certo');
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
