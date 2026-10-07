const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- QA Test: Planning Poker Visuals & History Panel ---');

const htmlPath = path.join(__dirname, '../planning_poker/index.html');
assert.ok(fs.existsSync(htmlPath), 'planning_poker/index.html deve existir');

const html = fs.readFileSync(htmlPath, 'utf8');

// 1. Verificação de Elementos Visuais do Tema e Atmosfera
assert.ok(html.includes('--bg-page: #f8fafc'), 'Deve conter token de fundo claro');
assert.ok(html.includes('theme-dark'), 'Deve conter suporte ao tema escuro');
assert.ok(html.includes('id="theme-toggle"'), 'Deve conter botão de alternar tema');

// 2. Verificação da Anatomia de Cartas de Baralho Real
assert.ok(html.includes('card-corner top-left'), 'Deve conter canto superior esquerdo com valor e naipe');
assert.ok(html.includes('card-corner bottom-right'), 'Deve conter canto inferior direito invertido');
assert.ok(html.includes('card-center'), 'Deve conter centro ilustrado');
assert.ok(html.includes('card-back-pattern'), 'Deve conter verso ornamental de baralho');
assert.ok(html.includes('card-flipper'), 'Deve conter elemento 3D de flip');
assert.ok(html.includes('is-face-down'), 'Deve suportar estado de carta virada para baixo');
assert.ok(html.includes('is-face-up'), 'Deve suportar estado de carta virada para cima');

// 3. Verificação de Naipes e Ícones Especiais
assert.ok(html.includes('suit-red') && html.includes('suit-black'), 'Deve conter classes para naipes vermelhos e pretos');
assert.ok(html.includes('☕') && html.includes('🚀'), 'Deve conter ícones para café (?) e infinito');

// 4. Verificação do Painel de Histórico
assert.ok(html.includes('id="history-panel"'), 'Deve conter painel de histórico');
assert.ok(html.includes('id="history-cards-container"'), 'Deve conter lista de cards de rodadas anteriores');
assert.ok(html.includes('id="task-name-input"'), 'Deve conter input para nome da tarefa/história');
assert.ok(html.includes('id="copy-history-btn"'), 'Deve conter botão de cópia de resumo em Markdown');
assert.ok(html.includes('id="clear-history-btn"'), 'Deve conter botão de limpeza do histórico');
assert.ok(html.includes('localStorage.setItem(getHistoryStorageKey()'), 'Deve persistir histórico no localStorage');

// 5. Verificação de Consenso e Confetti
assert.ok(html.includes('id="consensus-banner"'), 'Deve conter banner de celebração de consenso');
assert.ok(html.includes('id="confetti-canvas"'), 'Deve conter canvas para efeito de confetti');

console.log('✅ Todos os 5 blocos de validação de UI, Baralho e Histórico passaram com sucesso!');
process.exit(0);
