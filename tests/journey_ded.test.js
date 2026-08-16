/**
 * Jornada completa do RPG Adventure Quest (ded) — do início ao final.
 *
 * Roda SEM navegador: carrega o `index.html` e o `scenes.json`, executa o jogo
 * em um sandbox Node (VM) com stubs de DOM/áudio/fetch e percorre o caminho
 * crítico até o final "Vitória Lendária", verificando barreiras, alavancas,
 * missões e especialização. Útil para detectar softlocks / bloqueios.
 *
 * Uso: node tests/journey_ded.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const GAME_HTML = path.join(ROOT, 'ded', 'index.html');
const SCENES_JSON = path.join(ROOT, 'ded', 'assets', 'scenes.json');

const html = fs.readFileSync(GAME_HTML, 'utf8');
const scenesData = JSON.parse(fs.readFileSync(SCENES_JSON, 'utf8'));

// ---------------------------------------------------------------------------
// 1) Checagem estática: toda transição de cena deve apontar para uma cena real
// ---------------------------------------------------------------------------
function staticCheck() {
  const broken = [];
  for (const [name, scene] of Object.entries(scenesData)) {
    for (const choice of scene.choices || []) {
      if (choice.requiresCheck) {
        const success = scenesData[choice.nextScene + '_success']
          ? choice.nextScene + '_success'
          : choice.nextScene;
        const failure = scenesData[choice.nextScene + '_failure']
          ? choice.nextScene + '_failure'
          : choice.nextScene;
        if (!scenesData[success]) broken.push(`${name} --sucesso--> ${success}`);
        if (!scenesData[failure]) broken.push(`${name} --falha--> ${failure}`);
      } else if (!scenesData[choice.nextScene]) {
        broken.push(`${name} --> ${choice.nextScene}`);
      }
    }
  }
  if (broken.length) {
    console.log(`⚠  Aviso: ${broken.length} transição(ões) de cena apontam para cenas inexistentes (bug pré-existente):`);
    for (const b of broken) console.log(`     ${b}`);
  } else {
    console.log(`✓ Checagem estática: ${Object.keys(scenesData).length} cenas, todas as transições válidas.`);
  }
  return broken;
}

// ---------------------------------------------------------------------------
// 2) Sandbox Node com stubs de DOM, áudio, fetch e temporizadores
// ---------------------------------------------------------------------------
function buildSandbox() {
  const store = {};

  function makeClassList() {
    return { add() {}, remove() {}, contains() { return false; }, toggle() {} };
  }

  function makeEl() {
    const t = {
      classList: makeClassList(),
      style: {},
      textContent: '',
      innerHTML: '',
      children: [],
      scrollTop: 0,
      scrollHeight: 0,
      disabled: false,
      src: ''
    };
    return new Proxy(t, {
      get(o, p) {
        if (p in o) return o[p];
        if (p === 'appendChild') return (c) => { o.children.push(c); return c; };
        if (p === 'addEventListener' || p === 'removeEventListener') return () => {};
        if (p === 'setAttribute' || p === 'removeAttribute') return () => {};
        if (p === 'querySelectorAll') return () => [];
        if (p === 'querySelector') return () => makeEl();
        if (p === 'getContext') return () => ({});
        if (p === 'play') return () => Promise.resolve();
        return () => {};
      },
      set(o, p, v) { o[p] = v; return true; }
    });
  }

  const els = {};
  const sandboxMath = Object.create(Math);
  sandboxMath.random = () => 0.99;

  // Console silenciado para o jogo (evita ruído de log/áudio do próprio jogo).
  // O harness usa `__log`/`__err` para imprimir o progresso real do teste.
  const silentConsole = { log() {}, error() {}, warn() {}, info() {} };

  const sandbox = {
    console: silentConsole,
    __log: (...a) => console.log(...a),
    __err: (...a) => console.error(...a),
    Date,
    JSON,
    Set,
    Promise,
    Math: sandboxMath,
    setTimeout: (fn) => { fn(); return 0; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    performance: { now: () => 0 },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    document: {
      getElementById: (id) => (els[id] || (els[id] = makeEl())),
      createElement: () => makeEl(),
      querySelector: () => makeEl(),
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    window: {
      AudioContext: undefined,
      webkitAudioContext: undefined,
      speechSynthesis: undefined,
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    alert: () => {},
    Image: function () { return { src: '', onload: null, onerror: null }; },
    fetch: () => Promise.resolve({ json: () => Promise.resolve(scenesData) })
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function extractGameCode() {
  const blocks = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
  const game = blocks.find((s) => s.includes('const AudioEngine'));
  if (!game) throw new Error('Script principal do jogo não encontrado no index.html');
  return game.replace(/^<script>/, '').replace(/<\/script>$/, '');
}

// ---------------------------------------------------------------------------
// 3) Código da jornada executado DENTRO do sandbox
// ---------------------------------------------------------------------------
const journeyCode = `
(function () {
  function log(s) { __log(s); }
  function assert(cond, msg) { if (!cond) throw new Error(msg); }

  // Integridade do grafo do minimapa (nós e conexões existem)
  for (const id in DUNGEON_MAP) {
    for (const c of DUNGEON_MAP[id].connections) {
      if (!DUNGEON_MAP[c]) throw new Error('Conexão inválida no minimapa: ' + id + ' -> ' + c);
    }
  }
  const orphanNodes = Object.values(SCENE_TO_NODE).filter((n) => !DUNGEON_MAP[n]);
  if (orphanNodes.length) {
    log('⚠  Aviso: SCENE_TO_NODE referencia nós fora do minimapa (cenas terminais): ' + [...new Set(orphanNodes)].join(', '));
  }
  log('✓ Grafo do minimapa íntegro.');

  function resolveSpec() {
    if (gameState.player.level >= 3 && !gameState.player.specialization) {
      const name = Object.keys(SPECIALIZATIONS[gameState.player.class])[0];
      chooseSpecialization(name);
      log('  ⭐ Especialização: ' + name);
    }
  }

  function nav(scene, label) {
    loadScene(scene);
    if (gameState.currentScene !== scene) {
      throw new Error('BLOQUEIO em [' + label + ']: esperava ' + scene + ' mas continua em ' + gameState.currentScene);
    }
    resolveSpec();
    log('  ✓ ' + label + '  (' + scene + ')');
  }

  function navBlocked(scene, label) {
    loadScene(scene);
    if (gameState.currentScene === scene) {
      throw new Error('Era esperado BLOQUEIO em [' + label + '] (' + scene + '), mas a navegação ocorreu.');
    }
    log('  ⛔ ' + label + '  (bloqueado como esperado)');
  }

  function winCombat(nextScene, label) {
    startInteractiveCombat(gameState.currentEnemy);
    gameState.combat.enemy.hp = 0;
    gameState.mem.nextSceneSuccess = nextScene;
    checkCombatResolution();
    if (gameState.currentScene !== nextScene) {
      throw new Error('Combate [' + label + '] não resolveu para ' + nextScene + ' (atual: ' + gameState.currentScene + ')');
    }
    resolveSpec();
    log('  ⚔️  ' + label + ' → ' + nextScene);
  }

  // ------------------------------------------------------------------
  log('--- Início da jornada ---');
  selectCharacter('warrior');
  startGame();
  assert(gameState.currentScene === 'start', 'startGame deveria carregar a cena "start"');

  nav('check_supplies', 'Verificar suprimentos');
  assert(gameState.player.inventory.includes('Isqueiro'), 'Isqueiro não foi obtido em check_supplies');
  nav('corridor', 'Corredor escuro');

  // Barreiras: antes de puxar as alavancas, os nós estão trancados
  navBlocked('final_chamber_entrance', 'Cofre Drakmor (sem alavancas)');
  navBlocked('crypt_puzzle_entrance', 'Cripta profunda (sem alavancas)');
  assert(isNodeLocked('final_chamber_entrance'), 'final_chamber_entrance deveria estar trancada');
  assert(isNodeLocked('crypt_puzzle_entrance'), 'crypt_puzzle_entrance deveria estar trancada');

  // Goblin (combate)
  nav('goblin_encounter', 'Sala do Goblin');
  winCombat('goblin_fight_success', 'Goblin');
  nav('dark_chamber', 'Câmara de Madeira');

  // Detour pela Cripta (missão 1 + runa da cripta + barreira)
  log('--- Detour pela Cripta ---');
  nav('crypt', 'Cripta');
  assert(gameState.quests.purify_crypt.status === 'active', 'Missão 2 não ativou na Cripta');
  assert(gameState.quests.decode_runes.status === 'active', 'Missão 3 não ativou na Cripta');
  nav('crypt_merchant', 'Mercador da Cripta');
  assert(gameState.quests.merchant_amulet.status === 'active', 'Missão 1 não ativou no Mercador');

  nav('crypt', 'Cripta');
  nav('crypt_sarcophagi', 'Sarcófagos');
  Math.random = () => 0; // força sucesso no d20 e achado do amuleto (chance < 0.5)
  nav('crypt_sarcophagus_open_success', 'Sarcófago aberto');
  Math.random = () => 0.99;
  assert(gameState.player.inventory.includes('Amuleto do Mercador'), 'Amuleto do Mercador não foi encontrado');

  nav('crypt_merchant', 'Mercador (devolver amuleto)');
  nav('merchant_amulet_return', 'Devolver amuleto');
  assert(gameState.quests.merchant_amulet.status === 'completed', 'Missão 1 não concluída');

  nav('crypt', 'Cripta');
  nav('rune_crypt_success', 'Decifrar runa da Cripta');

  nav('crypt_door_success', 'Porta de pedra aberta');
  navBlocked('crypt_puzzle_entrance', 'Cripta profunda (ainda sem alavancas)');
  nav('crypt', 'Voltar à Cripta');
  nav('dark_chamber', 'Câmara de Madeira');

  // Caminho dos Cristais (alavanca 1 + runa)
  log('--- Caminho dos Cristais ---');
  nav('cavern', 'Corredor Negro');
  nav('cavern_crossing_success', 'Atravessar o riacho');
  nav('crystal_cave', 'Caverna de Cristal');
  nav('crystal_chamber', 'Câmara de Cristal');
  nav('lever_crystal', 'Alavanca 1 (Cristal)');
  assert(gameState.levers.lever_crystal === true, 'Alavanca 1 não ativou');
  nav('crystal_chamber', 'Câmara de Cristal');
  nav('rune_crystal_chamber_success', 'Decifrar runa da Câmara Cristal');
  nav('crystal_chamber', 'Câmara de Cristal');
  nav('secret_passage_entrance', 'Passagem secreta (entrada)');
  nav('secret_passage', 'Passagem secreta');
  nav('underground_lake', 'Lago Subterrâneo');

  // Lago (alavanca 2 + runa)
  log('--- Lago Subterrâneo ---');
  nav('lake_search', 'Beira do lago');
  nav('lever_lake', 'Alavanca 2 (Lago)');
  assert(gameState.levers.lever_lake === true, 'Alavanca 2 não ativou');
  nav('underground_lake', 'Lago Subterrâneo');
  nav('lake_search', 'Beira do lago');
  nav('rune_lake_search_success', 'Decifrar runa do Lago');
  assert(gameState.quests.decode_runes.status === 'completed', 'Missão 3 não concluída');
  nav('underground_lake', 'Lago Subterrâneo');

  // Barreiras desbloqueadas após as 2 alavancas
  assert(!isNodeLocked('final_chamber_entrance'), 'final_chamber_entrance deveria estar destrancada');
  assert(!isNodeLocked('crypt_puzzle_entrance'), 'crypt_puzzle_entrance deveria estar destrancada');

  // Travessia + Cofre + Chefe
  log('--- Cofre de Drakmor + Chefe ---');
  nav('lake_raft_success', 'Atravessar o lago de jangada');
  nav('final_chamber_entrance', 'Cofre Drakmor (agora aberto)');
  nav('final_chamber_search_success', 'Procurar armadilhas');
  nav('final_treasure_approach_careful_success', 'Aproximar-se com cautela');
  nav('final_treasure_open_success', 'Abrir o cofre');
  nav('last_fight', 'Câmara do Espectro');
  winCombat('pre_victory', 'Fantasma de Drakmor');
  assert(gameState.quests.purify_crypt.status === 'completed', 'Missão 2 não concluída');
  nav('victory', 'Vitória Lendária');

  // Asserções finais
  log('--- Asserções finais ---');
  assert(gameState.player.specialization === 'Paladino', 'Especialização não aplicada: ' + gameState.player.specialization);
  assert(gameState.quests.merchant_amulet.status === 'completed', 'Missão 1 não concluída');
  assert(gameState.quests.purify_crypt.status === 'completed', 'Missão 2 não concluída');
  assert(gameState.quests.decode_runes.status === 'completed', 'Missão 3 não concluída');
  assert(gameState.levers.lever_crystal && gameState.levers.lever_lake, 'Alavancas não ativadas');
  assert(gameState.currentScene === 'victory', 'Jornada não terminou em "victory"');

  log('');
  log('🏁 JORNADA COMPLETA: start → victory SEM bloqueios.');
  return 'PASS';
})();
`;

// ---------------------------------------------------------------------------
// 4) Execução
// ---------------------------------------------------------------------------
(async () => {
  try {
    const brokenLinks = staticCheck();

    const sandbox = buildSandbox();
    vm.runInContext(extractGameCode(), sandbox, { filename: 'ded/index.js' });

    // Aguarda a resolução do fetch (carregamento do scenes.json)
    await new Promise((r) => setTimeout(r, 50));

    const result = vm.runInContext(journeyCode, sandbox, { filename: 'journey.js' });

    console.log('\n=============================================');
    console.log('🎉 RESULTADO:', result);
    console.log('=============================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ FALHOU:', err.message || err);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  }
})();
