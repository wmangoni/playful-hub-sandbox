# 📝 TASK-TETRIS: Modo Duelo contra CPU (Local AI Battle), Sistema de Ataque de Linhas de Lixo (Garbage Send) e Interface Dividida (Split Screen Dual HUD)

## 👤 User Story
*   **Como** jogador experiente de Tetris que adora desafios competitivos e de alta tensão,
*   **Eu quero** competir localmente contra uma inteligência artificial em tela dividida, onde limpar várias linhas simultaneamente, realizar T-Spins ou combos consecutivos envia linhas de lixo (garbage lines) para sabotar o tabuleiro adversário,
*   **Para que** a jogabilidade ganhe uma nova dimensão competitiva e estratégica de "duelo", com feedback visual dinâmico neon e alertas de ataques iminentes em tempo real.

---

## 🎯 Critérios de Aceitação

1.  **Interface de Duelo em Tela Dividida (Split Screen Dual HUD)**:
    *   Adicionar a opção "**Duelo contra CPU**" no seletor de modo de jogo (`#gameModeSelect`).
    *   Ao ativar este modo, a tela deve se reconfigurar em um layout de tela dividida (split screen) usando CSS Flexbox/Grid responsivo:
        *   **Lado Esquerdo (Jogador)**: Tabuleiro principal (`240x480px`), painel de Próxima Peça, Placar de Pontuação/Linhas e Barra de Alerta de Ataques.
        *   **Lado Direito (CPU)**: Tabuleiro da IA (`240x480px`), painel de Próxima Peça da IA, Placar de Nível/Pontuação da IA e Barra de Alerta de Ataques da IA.
    *   Ambos os tabuleiros e painéis devem ser renderizados paralelamente a 60 FPS.
    *   Incluir um painel central de status ou barra divisória estilizada com gradientes neon que indique quem está na liderança da partida em tempo real.

2.  **Inteligência Artificial (Heurística baseada em Pierre Dellacherie)**:
    *   A CPU deve movimentar e posicionar suas peças de forma autônoma baseada em um algoritmo heurístico clássico de avaliação de tabuleiro.
    *   A cada spawn de nova peça para a CPU, a IA deve simular internamente todas as posições horizontais ($x$) e todas as orientações de rotação possíveis, calculando um "score de qualidade" para cada estado resultante.
    *   A função de avaliação heurística deve balancear os seguintes atributos:
        $$\text{Qualidade} = (w_1 \times \text{Alturas}) + (w_2 \times \text{LinhasLimpas}) + (w_3 \times \text{Buracos}) + (w_4 \times \text{Irregularidade})$$
        *   **Alturas (Aggregate Height)**: Soma das alturas de todas as colunas. Peso padrão ($w_1$): $-0.51$.
        *   **Linhas Limpas (Lines Cleared)**: Quantidade de linhas eliminadas pela jogada. Peso padrão ($w_2$): $+0.76$.
        *   **Buracos (Holes)**: Células vazias que têm pelo menos um bloco consolidado acima delas. Peso padrão ($w_3$): $-0.36$.
        *   **Irregularidade (Bumpiness)**: Soma das diferenças absolutas de altura entre colunas adjacentes. Peso padrão ($w_4$): $-0.18$.
    *   **Simulação de Movimento Suave (UX Rule)**: A CPU não deve "teletransportar" a peça diretamente para a coluna final. Ela deve executar movimentos e rotações intervaladas (ex: a cada $80\text{ms}$ a $120\text{ms}$, escalando com a dificuldade escolhida) para que o jogador consiga visualizar e prever a jogada da IA.

3.  **Sistema de Envio e Cancelamento de Ataques (Garbage Attack & Counter)**:
    *   Sempre que um jogador (ou a CPU) eliminar linhas ou executar manobras especiais, ele envia **Linhas de Lixo** para o oponente:
        *   *Double*: Envia 1 linha.
        *   *Triple*: Envia 2 linhas.
        *   *Tetris*: Envia 4 linhas.
        *   *T-Spin Single*: Envia 2 linhas.
        *   *T-Spin Double*: Envia 4 linhas.
        *   *T-Spin Triple*: Envia 6 linhas.
        *   *Bônus de Combo*: $+1$ linha a partir de `comboCount >= 1` (Combo x2).
    *   As linhas de lixo devem ser inseridas na base do tabuleiro adversário. Elas utilizam o índice de cor `8` (cinza chumbo `#424242`) e contêm exatamente **1 buraco livre** em uma coluna. Para ataques sucessivos no mesmo turno, o buraco deve ser posicionado na mesma coluna para permitir contra-ataques táticos.
    *   **Fila de Ataque (Garbage Queue) & Cancelamento**:
        *   As linhas recebidas não entram imediatamente no tabuleiro. Elas são colocadas em uma "Fila de Linhas Pendentes" (`incomingGarbageQueue`).
        *   Se o jogador sofrer um ataque, mas conseguir limpar linhas na sua jogada seguinte, ele **cancela** as linhas de lixo pendentes em proporção direta (1:1). As linhas canceladas são removidas da fila.
        *   Se a peça consolidar sem limpar linhas, as linhas restantes da fila são empurradas para cima a partir da base do tabuleiro.
    *   **HUD de Perigo**: Exibir uma barra vertical vermelha neon ao lado de cada tabuleiro. Ela cresce proporcionalmente à quantidade de linhas acumuladas na fila de lixo, piscando quando ultrapassa 4 linhas pendentes.

4.  **Game Feel e Efeitos Premium (Juiciness)**:
    *   **Partículas de Ataque**: Ao enviar linhas de lixo, disparar fagulhas de luz neon vermelhas/magenta saindo do tabuleiro de quem atacou em direção à barra de fila do oponente.
    *   **Alerta de Pressão Estéreo**: Quando a fila de lixo de um jogador ultrapassar 4 linhas, disparar bipes de batimento cardíaco graves nos alto-falantes de forma contínua usando a Web Audio API.
    *   **Banners de Nocaute**: Celebrar vitórias com efeitos textuais gigantes no estilo "K.O." com tipografia em gradientes metálicos e faíscas.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/tetris/index.html`.
*   **Modularização do Estado**:
    Para gerenciar duas instâncias concorrentes de jogo (Player e CPU), o código precisará migrar de variáveis globais dispersas para uma estrutura orientada a objetos ou duplicar contextos de jogo em um objeto gerenciador:
    ```javascript
    class TetrisBoardInstance {
        constructor(canvasElement, isCPU = false) {
            this.canvas = canvasElement;
            this.ctx = canvasElement.getContext('2d');
            this.isCPU = isCPU;
            this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
            this.score = 0;
            this.level = 1;
            this.lines = 0;
            this.piece = null;
            this.nextPiece = null;
            this.incomingGarbage = 0; // Linhas pendentes na fila
            this.comboCount = -1;
            // ... propriedades de controle de tempo locais
        }
        // Métodos de movimentação, rotação, colisão e renderização específicos desta instância
    }
    ```
*   **Heurística do resolvedor da IA**:
    A CPU deve avaliar o tabuleiro clonado após cada simulação física de descida de peça em todas as colunas válidas ($x \in [-2, COLS-1]$) e rotações ($r \in [0, 3]$):
    ```javascript
    function evaluateBoardState(simulatedBoard) {
        const heights = getHeights(simulatedBoard);
        const aggHeight = heights.reduce((sum, h) => sum + h, 0);
        const holes = countHoles(simulatedBoard);
        const bumpiness = calculateBumpiness(heights);
        const linesCleared = countFullRows(simulatedBoard);
        
        return (-0.515 * aggHeight) + (0.760 * linesCleared) - (0.360 * holes) - (0.180 * bumpiness);
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Muito Alta (Mecânica clássica multiplayer, adiciona imensa vida útil e jogabilidade competitiva local à plataforma).
*   **Esforço Estimado**: Alta (Requer reestruturação de escopo global para suportar duas instâncias de motor, simulação lógica de IA e rotinas matemáticas de avaliação espacial).
*   **Área**: Front-end / Inteligência Artificial / Refatoração Arquitetural / Canvas Dual Rendering.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Layout de Duelo Dual-Canvas (CSS & DOM)
Para suportar o duelo sem quebrar a proporção do canvas ou sobrepor painéis, utilizaremos uma div flexível contendo ambos os grids:

```html
<style>
    .duel-arena {
        display: none; /* Ativado via JS apenas no Modo Duelo */
        flex-direction: row;
        gap: 40px;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 900px;
        perspective: 1000px;
    }

    .board-wrapper {
        position: relative;
        background: rgba(30, 30, 30, 0.7);
        border: 2px solid #333;
        border-radius: 12px;
        padding: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        transition: transform 0.3s ease;
    }

    .board-wrapper.active-turn {
        border-color: #00ffff;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    }

    .garbage-bar {
        position: absolute;
        left: -15px;
        top: 10px;
        width: 8px;
        height: calc(100% - 20px);
        background: #222;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid #444;
    }

    .garbage-fill {
        width: 100%;
        height: 0%; /* Controlado dinamicamente por JS de 0% a 100% */
        background: linear-gradient(180deg, #ff1744, #ff5252);
        box-shadow: 0 0 8px #ff1744;
        transition: height 0.2s ease;
    }
</style>
```

### 2. Algoritmo de Cálculo de Heurísticas para a CPU

*   **Identificação de Buracos**: Um buraco é definido como qualquer espaço vazio que possua pelo menos uma célula ocupada em qualquer linha acima dele na mesma coluna:
    ```javascript
    function countHoles(tempBoard) {
        let holes = 0;
        for (let col = 0; col < COLS; col++) {
            let blockFound = false;
            for (let row = 0; row < ROWS; row++) {
                if (tempBoard[row][col] !== 0) {
                    blockFound = true;
                } else if (tempBoard[row][col] === 0 && blockFound) {
                    holes++;
                }
            }
        }
        return holes;
    }
    ```

*   **Cálculo da Irregularidade (Bumpiness)**: A soma das diferenças de altura entre colunas vizinhas:
    ```javascript
    function calculateBumpiness(heights) {
        let bumpiness = 0;
        for (let i = 0; i < COLS - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        return bumpiness;
    }
    ```

*   **Função de Decisão da IA (Best Move Selector)**:
    A IA simula todas as rotações possíveis (normalmente 4) e todas as translações horizontais. A melhor jogada é armazenada para execução suave:
    ```javascript
    function findBestMove(aiInstance) {
        let bestScore = -Infinity;
        let bestX = 0;
        let bestRot = 0;
        
        const pieceCloned = JSON.parse(JSON.stringify(aiInstance.piece));
        
        // Simular 4 orientações de rotação
        for (let rot = 0; rot < 4; rot++) {
            // Mover para o limite esquerdo para iniciar varredura
            let minX = -3;
            let maxX = COLS;
            
            for (let targetX = minX; targetX < maxX; targetX++) {
                // Instanciar tabuleiro clone
                let tempBoard = cloneBoard(aiInstance.board);
                let testPiece = {
                    shape: pieceCloned.shape,
                    pos: { x: targetX, y: 0 }
                };
                
                // Rotacionar peça rot vezes
                for (let r = 0; r < rot; r++) {
                    testPiece.shape = rotateMatrix(testPiece.shape);
                }
                
                // Verificar se posição X inicial é válida
                if (checkSimulatedCollision(testPiece, tempBoard)) continue;
                
                // Simular queda rígida (Hard Drop)
                while (!checkSimulatedCollision(testPiece, tempBoard)) {
                    testPiece.pos.y++;
                }
                testPiece.pos.y--; // Recuar uma posição de colisão
                
                // Inserir peça simulada no tabuleiro clone
                mergeSimulatedPiece(testPiece, tempBoard);
                
                // Avaliar qualidade do estado resultante
                const currentScore = evaluateBoardState(tempBoard);
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestX = targetX;
                    bestRot = rot;
                }
            }
        }
        
        return { targetX: bestX, targetRot: bestRot };
    }
    ```

### 3. Cancelamento e Envio Dinâmico de Linhas de Lixo (Garbage Cancellation)
A lógica de combate de Tetris Versus baseia-se na defesa ativa. Se o oponente enviou 3 linhas para a sua fila (`incomingGarbage = 3`), e você executa um **Triple** (gera 2 linhas de ataque), a fila de lixo deve ser reduzida para 1 linha, em vez de enviar 2 linhas ao inimigo:

```javascript
function processGarbageCombat(attacker, defender, linesGenerated) {
    if (linesGenerated <= 0) return;
    
    // 1. Checar se o atacante tem lixo pendente na sua própria fila para cancelar
    if (attacker.incomingGarbage > 0) {
        const cancelled = Math.min(attacker.incomingGarbage, linesGenerated);
        attacker.incomingGarbage -= cancelled;
        linesGenerated -= cancelled; // Sobra de linhas de ataque
        updateGarbageHUD(attacker);
    }
    
    // 2. Se ainda restarem linhas de ataque após o cancelamento, enviá-las para a fila do defensor
    if (linesGenerated > 0) {
        defender.incomingGarbage += linesGenerated;
        updateGarbageHUD(defender);
        triggerAttackParticles(attacker, defender, linesGenerated);
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

Para garantir que a performance e a experiência de combate local estejam 100% alinhadas, registramos as seguintes dúvidas estratégicas:

1.  **Dificuldade Dinâmica da CPU**:
    *   *Dúvida*: Devemos fixar um único nível de velocidade para a IA ou permitir que o jogador selecione a dificuldade (Fácil, Médio, Impossível) no menu de configuração?
    *   *Proposta*: Adicionar um seletor de dificuldade no HUD central, alterando o intervalo de ação da IA (Fácil: $180\text{ms}$ por movimento; Médio: $100\text{ms}$; Impossível: $40\text{ms}$ + uso de lookahead da próxima peça).
2.  **Sincronismo do Áudio nos Motores Concorrentes**:
    *   *Dúvida*: Com dois tabuleiros gerando ações de consolidação e rotações simultâneas, os efeitos sonoros podem se sobrepor em excesso, poluindo a mixagem.
    *   *Proposta*: Mudar a rotação da CPU para ser silenciosa e manter apenas efeitos de quedas rápidas e de envio/recebimento de lixo (bipes) no AudioContext compartilhado, para não confundir a percepção do jogador.
3.  **Compartilhamento da Próxima Peça**:
    *   *Dúvida*: No Tetris competitivo, o gerador de peças (Bag de 7) deve ser idêntico para ambos os competidores para garantir a paridade esportiva da partida?
    *   *Proposta*: Instanciar um gerador de peças sincronizado por uma semente (seed) idêntica, de forma que o jogador e a CPU recebam exatamente a mesma sequência de peças.
4.  **Mapeamento de Controles do Jogador no Modo Dividido**:
    *   *Dúvida*: Os controles de teclado do jogador (setas direcionais, Space para Hard Drop, C/Shift para Hold) devem influenciar apenas a sua própria instância de jogo, enquanto a CPU é controlada de forma puramente virtual pelo planejador da IA?
    *   *Proposta*: Sim, o tratador de eventos de teclado deve ser acoplado apenas à instância do jogador local, garantindo que as ações da CPU não sejam afetadas por pressionamentos de tecla.
5.  **Refatoração Geral do Estado do Jogo**:
    *   *Dúvida*: A base de código atual de Tetris utiliza variáveis globais para a grade (`board`), pontuação (`score`), linhas (`lines`), e peça atual. Para habilitar o modo Duelo sem duplicação de lógica massiva, deveríamos refatorar o jogo de modo que o modo Single Player clássico também utilize a nova classe `TetrisBoardInstance`?
    *   *Proposta*: Sim, migrar todo o jogo para uma estrutura orientada a objetos baseada em instâncias (`TetrisBoardInstance`). O modo clássico apenas instanciará um tabuleiro único (humano), enquanto o modo Duelo instanciará dois tabuleiros paralelos (humano e CPU).
6.  **Ajuste de Velocidade da CPU por Nível**:
    *   *Dúvida*: Além da dificuldade padrão, o intervalo de ações da CPU deve diminuir progressivamente com o aumento do nível do jogo (assim como a gravidade acelera para o jogador)?
    *   *Proposta*: Sim, o atraso de simulação de movimento da IA pode ser reduzido em 5% por nível alcançado, simulando uma IA que joga de forma mais rápida e estressante à medida que a partida avança.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Dificuldade Dinâmica da CPU**: **Decisão:** Adicione o seletor de dificuldade no HUD central. Interações de nível (Fácil, Médio, Impossível) aumentam muito o apelo.
2. **Sincronismo do Áudio nos Motores**: **Decisão:** Concordo, silencie rotações/movimentações laterais da IA. Deixe apenas os bipes de combate (envio/recebimento de lixo e quedas finais).
3. **Compartilhamento da Próxima Peça**: **Decisão:** Sim, o RNG deve ter a mesma *seed* (mesmo gerador PRNG) para garantir partidas iguais para ambos.
4. **Mapeamento de Controles**: **Decisão:** Correto, desacople eventos de teclado do input da IA. Deixe cada instância `TetrisBoardInstance` ter seu input controller isolado.
5. **Refatoração Geral do Estado**: **Decisão:** Refatore totalmente o código para orientação a objetos com `TetrisBoardInstance`.
6. **Ajuste de Velocidade da CPU por Nível**: **Decisão:** Sim, a redução de 5% de tempo de delay por nível é uma ótima forma de impor uma curva de dificuldade ascendente contínua.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `tetris`
* **Status do Backlog**: Transicionado para `✅ Refined` em `BACKLOG.md`.
