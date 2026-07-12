# 📝 TASK-CHESS-004: Modo Duelo Pass-and-Play com Rotação 3D do Tabuleiro, Análise de Partida com Classificação de Lances (Game Review) e Mural de Conquistas (Achievements)

## 👤 User Story
*   **Como** jogador enxadrista entusiasta do minijogo **Chess**,
*   **Eu quero** poder disputar partidas presenciais com um amigo no modo Pass-and-Play com o tabuleiro rotacionando 180° a cada turno, obter uma análise pós-jogo detalhada classificando a precisão dos meus lances com badges visuais (Brilhante, Excelente, Imprecisão, Blunder, etc.), e colecionar conquistas no meu mural com base nos meus triunfos competitivos,
*   **Para que** eu possa desfrutar de partidas locais imersivas, evoluir meu nível de jogo aprendendo com meus erros através de uma análise visual interativa e ter um senso contínuo de progressão e maestria.

---

## 🎯 Critérios de Aceitação

1.  **Duelo Local Pass-and-Play com Rotação 3D**:
    *   Adicionar um seletor de modo de jogo no painel de opções/garagem: *Contra Computador (IA)* ou *Duelo Local (Pass & Play)*.
    *   No modo **Pass-and-Play**, ao final de cada lance validado e após a consolidação do incremento de Fischer:
        *   Rotacionar o tabuleiro de xadrez (`#myBoard`) em 180° usando CSS3D `transform: rotate(180deg)` de forma suave com uma transição de `0.6s` com curva de velocidade `cubic-bezier(0.4, 0, 0.2, 1)`.
        *   Para manter as peças legíveis e com a cabeça para cima para o jogador ativo da vez, aplicar uma contra-rotação de `-180°` (ou `180°`) em cada quadrado de peça (`.piece-4a2a4`) de modo que a imagem da peça permaneça na orientação vertical padrão em relação à tela.
        *   A barra de vantagem (Advantage Bar) e o HUD lateral devem permanecer fixos e estáticos (não rotacionar) para não prejudicar a usabilidade.
    *   O modo de tempo deve suportar o controle normal dos relógios digitais para ambos os lados no Duelo Local.

2.  **Análise de Partida Pós-Jogo e Classificação de Lances (Stockfish Game Review)**:
    *   Ao término de uma partida (por mate, tempo, empate ou desistência), desabilitar novos lances e exibir um botão proeminente **"Análise Pós-Jogo"** no painel lateral.
    *   Ao clicar em "Análise Pós-Jogo", o motor Stockfish.js em Web Worker deve processar de forma assíncrona todas as posições da partida salvadas no histórico, calculando a variação do score de centipeões (cp) entre o lance executado pelo jogador e o melhor lance calculado pelo motor.
    *   Classificar cada lance individual da partida sob os seguintes critérios FIDE adaptados:
        *   **Brilhante (Brilliant 💎)**: O único lance vencedor em uma posição difícil ou sacrifício correto com aumento substancial de vantagem ($> 150$ centipeões). Borda azul ciano brilhante (`#00f5d4`) e efeito de partículas neon.
        *   **Excelente (Excellent ⭐)**: Melhor lance sugerido pela IA ou perda mínima de avaliação ($< 15$ centipeões). Cor verde neon brilhante (`#00e676`).
        *   **Bom (Good 👍)**: Lance jogável e seguro que mantém a vantagem equilibrada (perda entre $15$ e $40$ centipeões). Cor verde suave (`#81c784`).
        *   **Imprecisão (Inaccuracy ❓)**: Perda sutil de vantagem estratégica (perda de $40$ a $90$ centipeões). Cor amarela (`#ffd54f`).
        *   **Erro (Mistake ❌)**: Perda evidente de vantagem ou material recuperável (perda de $90$ a $200$ centipeões). Cor laranja (`#ff9800`).
        *   **Erro Crítico (Blunder 🚨)**: Perda crítica de xeque-mate ou perda massiva de material imediata (perda $> 200$ centipeões). Cor vermelha vermelha pulsante (`#ff3b30`).
    *   **Painel de Revisão (Game Review Board)**: Exibir uma modal ou painel lateral glassmorphic consolidando as estatísticas em barras coloridas horizontais (ex: Brancas vs Pretas, listando a contagem de lances de cada tipo).
    *   Ao navegar pelas jogadas passadas na barra de replay, exibir um **Badge Neon Flutuante** sobre a casa onde a peça se moveu com o ícone correspondente à classificação do lance.

3.  **Mural de Conquistas (Achievements Panel)**:
    *   Criar um mural de conquistas estilizado em CSS Glassmorphism persistido localmente no `localStorage` sob a chave `chessAchievements`.
    *   Conquistas obrigatórias a serem programadas:
        *   *Relâmpago Neon*: Vencer uma partida no modo Bullet (1+0).
        *   *Gênio Tático*: Resolver 3 puzzles seguidos sem erros na mesma sessão de jogo.
        *   *Mestre do Tempo*: Vencer uma partida restando menos de 2 segundos no relógio de xadrez.
        *   *Sacrifício Brilhante*: Obter pelo menos 1 lance classificado como "Brilhante" durante a análise de uma partida.
        *   *Resiliência do Rei*: Vencer uma partida em que a avaliação esteve abaixo de $-3.0$ peões em algum momento (recuperação épica).
    *   Ao desbloquear uma conquista:
        *   Spawnhar um toast de notificação neon estilizado no canto superior direito com animação de slide-in e fade-out automático após 4s.
        *   Tocar uma fanfarra triunfal sintetizada por osciladores na Web Audio API em tempo real.
        *   Disponibilizar um botão "Conquistas" no menu principal para visualizar o mural de medalhas coloridas ou opacas (caso bloqueadas).

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/chess/index.html`.
*   **Mecanismo de Rotação 3D**:
    *   Adicionar classe `.board-rotated` ao container do tabuleiro `#myBoard` que aplica `transform: rotate(180deg)`.
    *   Adicionar classe `.piece-counter-rotated` às peças `.piece-4a2a4` que aplica `transform: rotate(-180deg)` para que fiquem de cabeça para cima.
*   **Análise em Lote do Histórico**:
    *   Para evitar travar o navegador ou enviar requisições massivas em loop, o analisador pós-jogo deve processar o histórico em fila de forma sequencial com promessas (`Promises`) ou fila assíncrona de Web Worker, avaliando no máximo 1 lance a cada 150ms.
*   **Web Audio API Synth**:
    *   Utilizar os osciladores do `AudioContext` existentes no projeto para a síntese sonora de desbloqueio de conquistas.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (A rotação 3D otimiza drasticamente o modo Pass-and-Play em tablets/computadores de mesa e a análise de partida adiciona profundidade educacional de nível Chess.com).
*   **Esforço Estimado**: Alta (O processamento em fila das avaliações do Stockfish.js para partidas de 40+ lances sem causar gargalos e a contra-rotação dinâmica de peças exigem manipulação precisa de CSS e manipulação assíncrona do Web Worker).
*   **Área**: Web Workers / Front-end CSS3D / Gestão de Estado de Jogo / Web Audio API.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Rotação Suave do Tabuleiro e Peças

Para implementar a rotação sem quebrar a responsividade ou posicionamento absoluto dos elementos da biblioteca Chessboard.js, aplicaremos transformações CSS.

*   **CSS Adicional**:
    ```css
    /* Transição suave de rotação de 180° */
    #myBoard {
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #myBoard.board-rotated {
        transform: rotate(180deg);
    }
    
    /* Contra-rotação das peças e letras de coordenadas */
    .board-rotated .piece-4a2a4,
    .board-rotated .notation-322f9 {
        transform: rotate(-180deg);
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Seletor de modo na interface */
    .game-mode-selector {
        display: flex;
        gap: 10px;
        margin-bottom: 12px;
    }
    .game-mode-btn {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    .game-mode-btn.active {
        background: #00f5d4;
        color: #000;
        border-color: #00f5d4;
        box-shadow: 0 0 10px rgba(0, 245, 212, 0.3);
    }
    ```

*   **Lógica JavaScript de Rotação de Turno**:
    ```javascript
    let gameMode = 'cpu'; // 'cpu' ou 'pass_and_play'

    function checkRotation() {
        const boardEl = document.getElementById('myBoard');
        if (gameMode !== 'pass_and_play') {
            boardEl.classList.remove('board-rotated');
            return;
        }
        
        // Turno das Pretas ('b') rotaciona 180°, das Brancas ('w') volta a 0°
        if (game.turn() === 'b') {
            boardEl.classList.add('board-rotated');
        } else {
            boardEl.classList.remove('board-rotated');
        }
    }
    
    // Integrar a chamada de checkRotation() na callback afterMove()
    ```

---

### 2. Motor de Análise Pós-Jogo (Fila Assíncrona de Lances)

A análise consome CPU. Para não engasgar o worker nem acumular mensagens concorrentes, processaremos os lances em uma fila sequencial baseada em recursão e promessas.

*   **Algoritmo do Game Reviewer**:
    ```javascript
    let matchHistoryAnalysis = []; // Armazena { fen, move, scoreBefore, scoreAfter, classification }
    let isAnalyzing = false;

    async function runGameReview(moveHistoryList) {
        if (isAnalyzing) return;
        isAnalyzing = true;
        matchHistoryAnalysis = [];
        showAnalysisLoader(true);
        
        // moveHistoryList é o vetor de FENs geradas na partida
        // Ex: const moves = game.history({ verbose: true });
        
        const evaluations = [];
        
        for (let i = 0; i < moveHistoryList.length; i++) {
            const step = moveHistoryList[i];
            
            // FEN antes do lance
            const fenBefore = i === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : moveHistoryList[i-1].fen;
            const fenAfter = step.fen;
            
            // Avaliar posição anterior e posterior
            const scoreBefore = await evaluateFenWithStockfish(fenBefore);
            const scoreAfter = await evaluateFenWithStockfish(fenAfter);
            
            const diff = calculateEvaluationDiff(scoreBefore, scoreAfter, step.color);
            const classification = classifyMove(diff, scoreAfter, step);
            
            evaluations.push({
                num: i + 1,
                moveStr: step.san,
                from: step.from,
                to: step.to,
                color: step.color,
                scoreBefore,
                scoreAfter,
                diff,
                classification
            });
            
            updateAnalysisProgress(i + 1, moveHistoryList.length);
        }
        
        matchHistoryAnalysis = evaluations;
        isAnalyzing = false;
        showAnalysisLoader(false);
        renderGameReviewSummary();
        checkAchievementsFromAnalysis(evaluations);
    }
    
    function evaluateFenWithStockfish(fen) {
        return new Promise((resolve) => {
            if (!stockfishWorker) return resolve(0);
            
            const tempListener = (event) => {
                const line = event.data;
                if (line.startsWith('info') && line.includes('score')) {
                    const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                    if (scoreMatch) {
                        const type = scoreMatch[1];
                        let val = parseInt(scoreMatch[2], 10);
                        resolve({ type, value: val });
                        stockfishWorker.removeEventListener('message', tempListener);
                    }
                }
            };
            
            stockfishWorker.addEventListener('message', tempListener);
            stockfishWorker.postMessage(`position fen ${fen}`);
            stockfishWorker.postMessage('go depth 8'); // Menor profundidade para rodar a fila rapidamente
        });
    }

    function calculateEvaluationDiff(before, after, turnColor) {
        // Normaliza para peões (0.01 peão = 1 centipawn)
        const valBefore = before.type === 'mate' ? (before.value > 0 ? 1000 : -1000) : before.value;
        const valAfter = after.type === 'mate' ? (after.value > 0 ? 1000 : -1000) : after.value;
        
        // Diferença sob a perspectiva de quem executou o lance
        if (turnColor === 'w') {
            return valAfter - valBefore;
        } else {
            return valBefore - valAfter; // Pretas ganham se a avaliação pós-lance das brancas caiu
        }
    }

    function classifyMove(diff, scoreAfter, step) {
        // Se der xeque-mate, é sempre Excelente ou melhor
        if (step.san.endsWith('#')) return 'excellent';
        
        if (diff >= 150) return 'brilliant';
        if (diff >= -15) return 'excellent';
        if (diff >= -40) return 'good';
        if (diff >= -90) return 'inaccuracy';
        if (diff >= -200) return 'mistake';
        return 'blunder';
    }
    ```

---

### 3. Síntese Sonora da Fanfarra de Conquista (Web Audio API)

Para a fanfarra neon de conquistas, usaremos o sintetizador existente combinando 3 osciladores senoidais com um leve vibrato e decay brilhante.

```javascript
function playAchievementSFX() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6
        
        frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            gain.gain.setValueAtTime(0, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.4);
        });
    } catch (e) {
        console.error("Falha ao tocar som de conquista:", e);
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Distorção de Proporção nas Coordenadas**:
    *   *Dúvida*: Com o tabuleiro rotacionado a 180°, as letras de coordenadas (`a-h` e `1-8`) ao redor do tabuleiro estarão invertidas/espelhadas se rotacionarmos as casas inteiras. Como proceder?
    *   *Proposta*: Aplicar a contra-rotação CSS `.board-rotated .notation-322f9` nas divs de coordenada (classe padrão do chessboardjs para anotação nas bordas) para que o texto retorne à orientação vertical padrão de forma transparente.
    *   *Direcionamento do Tech Lead (TL)*: **Aprovada**. A aplicação de contra-rotação nas anotações é essencial para manter a ergonomia visual do tabuleiro.
2.  **Limite de Lances Analisáveis**:
    *   *Dúvida*: Partidas extremamente longas (e.g. 80+ lances) podem demorar muito para serem processadas em lote no pós-jogo. Devemos limitar a análise aos primeiros 50 lances ou dar a opção de cancelar?
    *   *Proposta*: Exibir uma barra de progresso em tempo real (`Analisando lances: X / Y`) e permitir que o jogador clique em "Parar Análise" a qualquer momento, consolidando as estatísticas calculadas até ali.
    *   *Direcionamento do Tech Lead (TL)*: **Aprovada**. A barra de progresso interativa com botão de cancelamento dinâmico evita a sensação de travamento do browser e garante excelente UX.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

*   **Persistência Compacta**: O mural de conquistas deve ser armazenado como um array simples de IDs em formato string serializado JSON, ex: `['speed_demon', 'tactical_genius']` no `localStorage`.
*   **Limpeza de Badges**: Ao iniciar um "Novo Jogo" ou alternar de volta para o modo IA, todos os overlays e badges de classificação de lances no tabuleiro devem ser removidos e as FENs salvas da partida devem ser limpas da RAM.
*   **Partículas Neon de Lance Brilhante**: Para lances brilhantes, emitir partículas douradas e azul ciano da coordenada de destino usando a função de partículas existente, porém duplicando a quantidade e aplicando velocidade 1.5x maior para sensação de impacto superior.

---

*Assinado: Antigravity - Senior Game Product Owner (PO)*
