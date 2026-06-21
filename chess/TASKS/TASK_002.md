# 📝 TASK-CHESS: Motor de Análise (Stockfish.js), Importador/Exportador PGN e Temas de Tabuleiro

## 👤 User Story
*   **Como** enxadrista no minijogo **Chess**,
*   **Eu quero** visualizar a análise tática de meus lances com uma barra de vantagem em tempo real, poder importar ou exportar partidas no formato oficial PGN e alterar a skin visual do tabuleiro e peças,
*   **Para que** eu possa treinar táticas de xadrez de forma analítica, registrar e estudar minhas jogadas e personalizar a estética do jogo.

---

## 🎯 Critérios de Aceitação
1.  **Motor de Análise em Tempo Real (Stockfish.js)**:
    *   Integrar de forma assíncrona o **Stockfish.js** (executado localmente em um Web Worker para não travar a UI).
    *   Exibir uma "Barra de Vantagem" vertical ao lado do tabuleiro mostrando a avaliação estrita da posição (ex: +2.4 para Brancas, -1.5 para Pretas ou "#M3" para mate em 3).
    *   Exibir uma seta sutil no tabuleiro indicando qual é o lance tático recomendado pelo motor para o jogador no turno corrente.
2.  **Importador e Exportador PGN/FEN (Game History)**:
    *   Disponibilizar botões para:
        *   *Copiar FEN*: Copia a string de notação posicional do estado atual do jogo.
        *   *Exportar PGN*: Gera a string PGN contendo o histórico numerado de todos os lances realizados na partida ativa.
        *   *Carregar Partida (PGN/FEN)*: Caixa de texto para colar uma FEN ou PGN existente e carregar instantaneamente o estado no tabuleiro para replay passo a passo.
3.  **Hangar de Temas Visuais (Skins)**:
    *   Adicionar um dropdown de seleção de temas gráficos:
        *   *Classic Wood (Tradicional)*: Tabuleiro de madeira texturizado e peças esculpidas tradicionais.
        *   *Glassmorphism (Moderno)*: Elementos translúcidos estilo vidro fosco com brilho de bordas.
        *   *Neon Cyber (Playful Hub)*: Cores vibrantes verde e roxo neon com efeito glow nos blocos selecionados.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/chess/index.html`.
*   **Integração do Web Worker**:
    *   Instanciar o Stockfish via Worker: `const stockfish = new Worker('stockfish.js')` (ou apontando para uma CDN pública estável do Stockfish.js).
    *   Enviar comandos no padrão **UCI (Universal Chess Interface)**: `position fen ...` seguido por `go depth 10`.
*   **Parser de Histórico**:
    *   Utilizar ou estender uma biblioteca simples de xadrez em JS (como `chess.js`) para validar lances, detectar empates por repetição ou insuficiência de material e realizar o mapeamento PGN fiel.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (A elevação de uma IA simples de xadrez para uma suite analítica completa atrai enxadristas sérios).
*   **Esforço Estimado**: Alta (Sincronizar a engine assíncrona em Web Worker e gerenciar o histórico PGN sem quebrar a renderização manual exige alta proficiência).
*   **Área**: Front-end / Web Workers / Motores de Inteligência Artificial.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão definidos a arquitetura, modelagem de dados, diagramas de fluxo, trechos de código estruturados e modificações visuais necessárias para implementar todos os requisitos da história, garantindo excelente performance e estética premium.

### 1. Motor de Análise (Stockfish.js) com Web Worker e Barra de Vantagem

*   **Instanciação Segura sem CORS**:
    Para evitar problemas de segurança (CORS) ao carregar o Web Worker diretamente de uma CDN externa, utilizaremos a técnica do `Blob URL`. O script carregará de forma assíncrona o motor Stockfish.js oficial (v10.0.2) que executa 100% no cliente:
    ```javascript
    const STOCKFISH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
    let stockfishWorker = null;

    function initStockfish() {
        try {
            const blobCode = `importScripts('${STOCKFISH_CDN}');`;
            const blob = new Blob([blobCode], { type: 'application/javascript' });
            const blobURL = URL.createObjectURL(blob);
            stockfishWorker = new Worker(blobURL);

            stockfishWorker.onmessage = function(event) {
                handleStockfishMessage(event.data);
            };

            // Inicializar protocolo UCI
            stockfishWorker.postMessage('uci');
            stockfishWorker.postMessage('ucinewgame');
            stockfishWorker.postMessage('isready');
        } catch (e) {
            console.error("Erro ao inicializar o Stockfish.js:", e);
        }
    }
    ```

*   **Comunicação UCI e Captura de Avaliação**:
    Sempre que a posição do tabuleiro mudar (`updateStatus`), enviaremos a FEN atual para o motor analisar:
    ```javascript
    function requestAnalysis() {
        if (!stockfishWorker) return;
        const currentFen = game.fen();
        stockfishWorker.postMessage(`position fen ${currentFen}`);
        stockfishWorker.postMessage('go depth 10'); // Profundidade equilibrada para rapidez
    }
    ```

    O processador de mensagens filtrará as saídas do tipo `info` para ler o `score cp` (centipawns) ou `score mate` (mate forçado) e o `pv` (variação principal, contendo o melhor lance recomendado):
    ```javascript
    let bestMoveRecommended = null;

    function handleStockfishMessage(line) {
        // Exemplo: info depth 8 score cp 24 pv e2e4 e7e5...
        if (line.startsWith('info') && line.includes('score')) {
            const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
            if (scoreMatch) {
                const scoreType = scoreMatch[1]; // 'cp' ou 'mate'
                let scoreVal = parseInt(scoreMatch[2], 10);
                
                // O score do Stockfish é sob a perspectiva de quem joga no turno atual.
                // Convertemos para Perspectiva das Brancas para alimentar a Barra de Vantagem:
                if (game.turn() === 'b') {
                    scoreVal = -scoreVal;
                }
                
                updateAdvantageBar(scoreType, scoreVal);
            }
        }
        
        // Exemplo: bestmove e2e4 ponder e7e5
        if (line.startsWith('bestmove')) {
            const moveMatch = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])(?:[qrbn])?/);
            if (moveMatch) {
                const from = moveMatch[1];
                const to = moveMatch[2];
                bestMoveRecommended = { from, to };
                drawBestMoveArrow(from, to);
            }
        }
    }
    ```

*   **Barra de Vantagem (Advantage Bar) Dinâmica**:
    Será implementado um container vertical à esquerda do tabuleiro com largura de `25px` e altura de `400px` (mesma altura do tabuleiro), composto por dois painéis estilizados que aumentam/diminuem a proporção visual usando uma escala sigmoide ou linear limitada entre `-10` e `+10` pontos (peões):
    ```html
    <div class="advantage-bar-container">
        <div id="advantageBarWhite" class="bar-fill white-fill"></div>
        <div id="advantageBarBlack" class="bar-fill black-fill"></div>
        <span id="advantageBarLabel">0.0</span>
    </div>
    ```
    ```css
    .advantage-bar-container {
        position: relative;
        width: 25px;
        height: 400px;
        border: 2px solid #2d2d2d;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background-color: #111;
        margin-right: 15px; /* Alinhado ao lado do tabuleiro */
    }
    .bar-fill {
        width: 100%;
        transition: height 0.3s ease-in-out;
    }
    .white-fill {
        background-color: #ffffff;
        height: 50%;
    }
    .black-fill {
        background-color: #222222;
        height: 50%;
    }
    #advantageBarLabel {
        position: absolute;
        width: 100%;
        text-align: center;
        font-size: 10px;
        font-weight: bold;
        bottom: 50%;
        transform: translateY(50%);
        color: #888;
        mix-blend-mode: difference; /* Legível tanto em fundo branco quanto preto */
        pointer-events: none;
    }
    ```
    Função de atualização:
    ```javascript
    function updateAdvantageBar(type, scoreVal) {
        const label = document.getElementById('advantageBarLabel');
        const whiteBar = document.getElementById('advantageBarWhite');
        const blackBar = document.getElementById('advantageBarBlack');
        
        let labelText = '';
        let whiteHeight = 50; // default 50%
        
        if (type === 'mate') {
            const absMate = Math.abs(scoreVal);
            labelText = `#M${absMate}`;
            whiteHeight = scoreVal > 0 ? 100 : 0;
        } else {
            // Conversão de Centipawns para Pawns (ex: 250cp -> +2.5)
            const pawns = (scoreVal / 100).toFixed(1);
            labelText = scoreVal > 0 ? `+${pawns}` : pawns;
            
            // Limitador em +-10 pawns para evitar achatamento excessivo
            let clampedPawns = scoreVal / 100;
            if (clampedPawns > 10) clampedPawns = 10;
            if (clampedPawns < -10) clampedPawns = -10;
            
            // Mapeia -10..10 para 5%..95%
            whiteHeight = 50 + (clampedPawns / 10) * 45;
        }
        
        label.textContent = labelText;
        whiteBar.style.height = `${whiteHeight}%`;
        blackBar.style.height = `${100 - whiteHeight}%`;
    }
    ```

*   **Seta de Melhor Lance (Best Move Arrow) via SVG Overlay**:
    Criar uma camada de sobreposição SVG transparente exatamente sobre o tabuleiro `#myBoard` para renderizar uma seta vetorizada dinâmica (com efeitos de neon/sombra dependendo do tema selecionado):
    ```html
    <svg id="boardOverlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;">
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(0, 245, 212, 0.8)"></polygon>
            </marker>
        </defs>
        <line id="bestMoveLine" x1="0" y1="0" x2="0" y2="0" stroke="rgba(0, 245, 212, 0.8)" stroke-width="6" marker-end="url(#arrowhead)" style="display: none; stroke-dasharray: 8 4; animation: dash 1s linear infinite;" />
    </svg>
    ```
    ```javascript
    function drawBestMoveArrow(fromSquare, toSquare) {
        const fromPos = getSquareCenter(fromSquare);
        const toPos = getSquareCenter(toSquare);
        if (!fromPos || !toPos) return;

        const line = document.getElementById('bestMoveLine');
        line.setAttribute('x1', fromPos.x);
        line.setAttribute('y1', fromPos.y);
        line.setAttribute('x2', toPos.x);
        line.setAttribute('y2', toPos.y);
        line.style.display = 'block';
    }

    function getSquareCenter(squareName) {
        const squareEl = document.querySelector(`#myBoard .square-${squareName}`);
        if (!squareEl) return null;
        
        const boardEl = document.getElementById('myBoard');
        const boardRect = boardEl.getBoundingClientRect();
        const sqRect = squareEl.getBoundingClientRect();
        
        // Calcula as coordenadas locais em relação ao container do tabuleiro
        return {
            x: (sqRect.left + sqRect.width / 2) - boardRect.left,
            y: (sqRect.top + sqRect.height / 2) - boardRect.top
        };
    }

    function clearArrow() {
        document.getElementById('bestMoveLine').style.display = 'none';
    }
    ```

### 2. Importador/Exportador PGN e FEN com Controle de Replay Histórico

Será adicionado um novo painel lateral de utilitários de notação contendo botões de exportação rápida e uma área rica para importação interativa:

```html
<div class="notation-panel" style="background-color: #2b2b2b; padding: 15px; border-radius: 6px; width: 400px; margin-top: 15px;">
    <h3>Partida e Histórico (PGN/FEN)</h3>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <button id="copyFenBtn">Copiar FEN</button>
        <button id="exportPgnBtn">Exportar PGN</button>
    </div>
    
    <div style="margin-top: 10px;">
        <textarea id="importInput" placeholder="Cole aqui seu código FEN ou PGN para análise..." style="width: 95%; height: 60px; background: #1e1e1e; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 8px; font-family: monospace; font-size: 11px; resize: none;"></textarea>
        <button id="loadPartidaBtn" style="width: 100%; margin-top: 5px; background-color: #4caf50; color: white;">Carregar Partida</button>
    </div>

    <!-- Controles de Replay de Histórico PGN -->
    <div id="replayControls" style="display: none; align-items: center; justify-content: center; gap: 20px; margin-top: 12px; background: #1a1a1a; padding: 10px; border-radius: 4px;">
        <button id="prevMoveBtn" style="background: #333; color: white;">◀ Anterior</button>
        <span id="replayStatus" style="font-weight: bold; color: #ffeb3b; font-size: 13px;">Lance 0/0</span>
        <button id="nextMoveBtn" style="background: #333; color: white;">Próximo ▶</button>
    </div>
</div>
```

*   **Lógica de Replay Passo a Passo**:
    ```javascript
    let replayMoves = [];
    let replayIndex = -1;

    // Carregar FEN/PGN
    document.getElementById('loadPartidaBtn').addEventListener('click', function() {
        const input = document.getElementById('importInput').value.trim();
        if (!input) return;

        const tempGame = new Chess();
        
        // 1. Tentar como FEN
        if (tempGame.load(input)) {
            game = tempGame;
            board.position(game.fen());
            document.getElementById('replayControls').style.display = 'none';
            updateStatus();
            requestAnalysis();
            return;
        }

        // 2. Tentar como PGN
        if (tempGame.load_pgn(input)) {
            // Guarda o histórico completo carregado
            replayMoves = tempGame.history({ verbose: true });
            replayIndex = replayMoves.length - 1;
            
            game = tempGame;
            board.position(game.fen());
            
            // Exibir controles de replay
            document.getElementById('replayControls').style.display = 'flex';
            updateReplayStatus();
            updateStatus();
            requestAnalysis();
            return;
        }

        alert('Formato posicional (FEN) ou histórico (PGN) inválido!');
    });

    function updateReplayStatus() {
        document.getElementById('replayStatus').textContent = `Lance ${replayIndex + 1}/${replayMoves.length}`;
    }

    // Navegar nos lances do PGN
    document.getElementById('prevMoveBtn').addEventListener('click', function() {
        if (replayIndex >= 0) {
            game.undo();
            replayIndex--;
            board.position(game.fen());
            updateReplayStatus();
            updateStatus();
            requestAnalysis();
        }
    });

    document.getElementById('nextMoveBtn').addEventListener('click', function() {
        if (replayIndex < replayMoves.length - 1) {
            replayIndex++;
            game.move(replayMoves[replayIndex]);
            board.position(game.fen());
            updateReplayStatus();
            updateStatus();
            requestAnalysis();
        }
    });

    // Copiar FEN
    document.getElementById('copyFenBtn').addEventListener('click', function() {
        navigator.clipboard.writeText(game.fen());
        alert('FEN copiada para a área de transferência!');
    });

    // Exportar PGN
    document.getElementById('exportPgnBtn').addEventListener('click', function() {
        navigator.clipboard.writeText(game.pgn());
        alert('Histórico PGN copiado para a área de transferência!');
    });
    ```

### 3. Hangar de Temas Visuais (Skins)

Será adicionado um seletor visual premium no cabeçalho das opções, permitindo trocar instantaneamente o visual do tabuleiro e das peças sem recarregar o jogo, aplicando propriedades CSS de alta performance e filtros visuais dinâmicos.

*   **Estrutura HTML do Seletor**:
    ```html
    <div style="margin-top: 15px;">
        <label for="themeSelect" style="font-weight: bold; margin-right: 10px;">Tema Gráfico:</label>
        <select id="themeSelect" style="padding: 6px 12px; background: #2d2d2d; color: white; border: 1px solid #444; border-radius: 4px;">
            <option value="wood" selected>Classic Wood (Madeira)</option>
            <option value="glass">Glassmorphism (Translúcido)</option>
            <option value="cyber">Neon Cyber (Futurista)</option>
        </select>
    </div>
    ```

*   **Lógica de Troca de Classe do Tema**:
    ```javascript
    document.getElementById('themeSelect').addEventListener('change', function(e) {
        const theme = e.target.value;
        const container = document.querySelector('.game-container');
        
        // Remove classes antigas
        container.classList.remove('theme-wood', 'theme-glass', 'theme-cyber');
        
        // Adiciona a classe correspondente
        container.classList.add(`theme-${theme}`);
        
        // Modifica a cor do marcador da seta SVG para coincidir com a estética
        const arrowHead = document.querySelector('#arrowhead polygon');
        const arrowLine = document.getElementById('bestMoveLine');
        if (theme === 'cyber') {
            arrowHead.setAttribute('fill', '#00f5d4');
            arrowLine.setAttribute('stroke', '#00f5d4');
        } else if (theme === 'glass') {
            arrowHead.setAttribute('fill', '#ffffff');
            arrowLine.setAttribute('stroke', '#ffffff');
        } else {
            arrowHead.setAttribute('fill', '#ff9800');
            arrowLine.setAttribute('stroke', '#ff9800');
        }
    });
    ```

*   **Estilização Avançada de Temas (CSS Tokens)**:
    ```css
    /* Estilo Base da página e do tabuleiro */
    .game-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 25px;
        background: #1e1e24;
        border-radius: 12px;
        box-shadow: 0 15px 35px rgba(0,0,0,0.5);
        color: #ffffff;
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    /* 3.1 Classic Wood (Padrão e Orgânico) */
    .theme-wood {
        background: #2b1f17;
    }
    .theme-wood .board-b72b1 {
        border: 12px solid #5c381e;
        border-radius: 6px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .theme-wood .white-1e1d7 {
        background-color: #ebd0a7;
        background-image: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.05) 100%);
        box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
    }
    .theme-wood .black-3c85d {
        background-color: #96633e;
        background-image: radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.15) 100%);
        box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    }

    /* 3.2 Glassmorphism (Tecnológico e Clean) */
    .theme-glass {
        background: radial-gradient(circle at top left, #2c3e50, #000000);
    }
    .theme-glass .board-b72b1 {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 8px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
    }
    .theme-glass .white-1e1d7 {
        background-color: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .theme-glass .black-3c85d {
        background-color: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .theme-glass img.piece-4a2a4 {
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        transition: transform 0.2s ease;
    }
    .theme-glass img.piece-4a2a4:hover {
        transform: scale(1.08);
    }

    /* 3.3 Neon Cyber (Futurista e Vibrante) */
    .theme-cyber {
        background: #05010a;
    }
    .theme-cyber .board-b72b1 {
        background: #020205;
        border: 8px solid #00f5d4;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0, 245, 212, 0.3), inset 0 0 15px rgba(123, 44, 191, 0.3);
    }
    .theme-cyber .white-1e1d7 {
        background-color: #1a0826;
        border: 1px solid rgba(123, 44, 191, 0.3);
    }
    .theme-cyber .black-3c85d {
        background-color: #0c0812;
        border: 1px solid rgba(0, 245, 212, 0.2);
    }
    .theme-cyber img.piece-4a2a4 {
        filter: drop-shadow(0 0 4px #00f5d4) drop-shadow(0 0 8px #7b2cbf);
    }
    .theme-cyber .square-55d63.highlight-white,
    .theme-cyber .square-55d63.highlight-black {
        box-shadow: inset 0 0 15px #00f5d4, 0 0 10px #00f5d4 !important;
    }
    ```

