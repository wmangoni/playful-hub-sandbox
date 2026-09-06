# 📝 TASK-TETRIS: Progresso e Gravidade Inteligente, Detecção de T-Spin e Modo Desafio "Sobrevivência sob Pressão"

## 👤 User Story
*   **Como** jogador altamente competitivo e focado em pontuação no minijogo **Tetris**,
*   **Eu quero** uma curva de velocidade de gravidade fiel aos clássicos, detecção precisa de jogadas avançadas como T-Spins e multiplicadores de Combo com efeitos visuais neon flutuantes reativos, e um Modo de Sobrevivência com subida periódica de linhas de lixo (garbage rows),
*   **Para que** minha habilidade técnica seja altamente recompensada, a jogabilidade tenha um ritmo eletrizante e estratégico, e a experiência visual seja estimulante, premium e extremamente polida.

---

## 🎯 Critérios de Aceitação

1.  **Curva de Gravidade e Transição de Nível (Dynamic Leveling & Speed Curve)**:
    *   O nível do jogador deve subir a cada **10 linhas eliminadas** acumuladas.
    *   A velocidade de queda (gravidade) deve seguir a fórmula de progressão exponencial clássica adaptada para quadros de renderização de forma suave:
        $$\text{dropInterval} = 1000 \times (0.8 - ((\text{level} - 1) \times 0.007))^{\text{level} - 1} \text{ milissegundos}$$
        com um limite mínimo absoluto de **50ms** para evitar travamentos do motor.
    *   Ao subir de nível, disparar um efeito visual premium na tela: um banner flutuante ("*LEVEL UP! NÍVEL X*") translúcido com brilho neon pulsante que escala e desvanece suavemente ao centro usando animações CSS `@keyframes`.

2.  **Detecção de T-Spin e Combo Multiplier**:
    *   Implementar a **Regra dos 3 Cantos (3-Corner Rule)** para detecção de T-Spin:
        *   A peça ativa deve ser estritamente o **T-tetromino** (tipo `6`).
        *   O último movimento bem-sucedido efetuado pelo jogador deve ter sido uma **rotação**.
        *   Dos 4 cantos da caixa delimitadora $3\times3$ que envolve o T-tetromino, pelo menos **3 cantos** devem estar preenchidos (seja por blocos consolidados no tabuleiro ou pelas bordas/limites físicos do tabuleiro).
    *   A detecção deve diferenciar entre:
        *   *T-Spin Sem Linhas*: 400 pontos.
        *   *T-Spin Single* (1 linha limpa com T-Spin): 800 pontos.
        *   *T-Spin Double* (2 linhas limpas com T-Spin): 1200 pontos.
        *   *T-Spin Triple* (3 linhas limpas com T-Spin): 1600 pontos.
    *   **Multiplicador de Combos**: Monitorar limpezas consecutivas de linhas. Cada peça consecutiva que resulte em eliminação de linhas incrementa o `comboCount`. Cada combo adiciona uma pontuação extra de $50 \times \text{comboCount} \times \text{level}$ pontos.
    *   **Floating Score Popups**: Exibir textos flutuantes temporários na tela do jogo (ex: "+1200 T-SPIN!" em roxo neon, ou "x3 COMBO!" em azul neon) no exato ponto de consolidação da peça, que flutuam para cima verticalmente e desaparecem em fade-out ao longo de 1.2 segundos.

3.  **Modo Sobrevivência sob Pressão (Survival Garbage Mode)**:
    *   Disponibilizar o botão de seleção do novo modo no menu lateral: *Modo Sobrevivência*.
    *   Ao iniciar o Modo Sobrevivência:
        *   O tabuleiro deve ser pré-populado com **4 a 6 linhas de lixo (garbage rows)** na base. Cada linha de lixo deve conter blocos cinza translúcidos (`#555555`) em 9 das 10 colunas (deixando apenas uma coluna vazia aleatória por linha).
        *   Exibir uma barra de progresso de "Pressão" vertical ou um cronômetro regressivo destacado de **12 segundos**.
        *   Ao zerar o cronômetro, empurrar todas as linhas do tabuleiro uma unidade para cima e gerar uma nova linha de lixo na base (com 1 buraco aleatório).
        *   Tocar um som tenso/agudo sintetizado nos últimos 3 segundos para alertar o jogador sobre a subida eminente.
        *   Caso qualquer bloco seja empurrado para além do limite superior (Y < 0), disparar imediatamente o fim de jogo (Game Over).

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/tetris/index.html` (e/ou scripts acoplados).
*   **Estrutura de Rastreamento do T-Spin**:
    *   Criar propriedades no objeto da peça ativa para monitorar seu histórico:
        ```javascript
        let lastAction = ''; // 'move', 'rotate', 'drop'
        ```
    *   No evento de teclado, setar `lastAction = 'rotate'` no sucesso de `rotatePiece()`, e `lastAction = 'move'` em `movePiece()`.
*   **Algoritmo de Detecção do T-Spin**:
    *   No momento do `mergePiece()`, se `piece.type === 6` (T-piece) e `lastAction === 'rotate'`:
        *   Definir as coordenadas relativas dos 4 cantos da caixa delimitadora do T-tetromino.
        *   Checar quantas destas 4 posições estão ocupadas no tabuleiro (`board[y][x] !== 0` ou fora dos limites do grid).
        *   Se ocupadas $\ge 3$, sinalizar `isTSpin = true`.
*   **Gerenciador de Textos Flutuantes (`FloatingTextManager`)**:
    *   Manter um array global de objetos textuais ativos:
        ```javascript
        let floatingTexts = [];
        // Estrutura: { text: "+1200 T-SPIN!", x: canvasX, y: canvasY, alpha: 1.0, color: '#9C5AFF' }
        ```
    *   Inserir elementos no array e atualizá-los a cada frame decrementando `alpha` e subindo a posição `y`. Desenhá-los no Canvas principal antes do overlay de pause/gameover.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Muito Alta (Garante o apelo de jogo clássico competitivo e desafiador).
*   **Esforço Estimado**: Média-Alta (Exige controle preciso do histórico de rotações e renderização avançada).
*   **Área**: Front-end / Lógica de Jogo / Canvas Rendering / UI-UX Animations.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Curva de Gravidade Inteligente e Animação de Level Up
A transição de níveis deve ser celebrada para aumentar a dopamina do jogador. Usaremos transições CSS puras acopladas a uma div overlay que é injetada temporariamente no DOM.

*   **Cálculo Fiel de Velocidade**:
    ```javascript
    function calculateDropInterval(lvl) {
        // Fórmula clássica adaptada para suavidade digital
        const baseSpeed = 1000;
        const speedFactor = 0.8 - ((lvl - 1) * 0.007);
        const interval = Math.round(baseSpeed * Math.pow(speedFactor, lvl - 1));
        return Math.max(50, interval); // Cap mínimo de 50ms para jogabilidade humana limite (Level 15+)
    }
    ```

*   **HTML & CSS Overlay do Level Up**:
    Adicionar ao cabeçalho do `index.html` as regras CSS para animação premium de impacto visual:
    ```html
    <style>
        .level-up-banner {
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            background: linear-gradient(135deg, rgba(156, 90, 255, 0.9), rgba(255, 82, 170, 0.9));
            border: 2px solid #fff;
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(156, 90, 255, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.5);
            color: #ffffff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-weight: 900;
            font-size: 28px;
            padding: 15px 40px;
            text-align: center;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
            pointer-events: none;
            opacity: 0;
            z-index: 100;
            animation: levelUpPop 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes levelUpPop {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) rotate(-5deg);
            }
            15% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1) rotate(2deg);
            }
            30% {
                transform: translate(-50%, -50%) scale(1.0) rotate(0deg);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.0) translateY(-10px);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8) translateY(-40px);
            }
        }
    </style>
    ```

*   **Injeção Dinâmica via JS**:
    ```javascript
    function triggerLevelUpEffects(newLevel) {
        // Tocar som festivo arpejado especial
        if (typeof SoundSynth !== 'undefined' && SoundSynth.playLine) {
            SoundSynth.playLine(); // Arpejo alegre
        }
        
        // Criar elemento HTML dinâmico
        const banner = document.createElement('div');
        banner.className = 'level-up-banner';
        banner.innerHTML = `<span style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; display: block; opacity: 0.8;">Excelente!</span>NÍVEL ${newLevel}`;
        document.body.appendChild(banner);
        
        // Remover do DOM após a conclusão da animação
        setTimeout(() => {
            banner.remove();
        }, 1600);
    }
    ```

### 2. Detecção Matemática do T-Spin (3-Corner Rule)
O T-Spin é a manobra mais gloriosa do Tetris moderno. O T-tetromino (T-Piece) é representado pelo índice de tipo `6`. Ele tem um bloco central estável ao redor do qual a rotação ocorre.

```
Caixa Delimitadora 3x3 do T-Piece:
[ A ]  [   ]  [ B ]    <-- A e B são os "cantos superiores" da peça
[   ]  [ C ]  [   ]    <-- C é o centro físico de rotação da peça
[ D ]  [   ]  [ E ]    <-- D e E são os "cantos inferiores" da peça
```

*   **Coordenadas dos Cantos**:
    Seja `(px, py)` a coordenada de canto superior esquerdo da matriz $3\times3$ da peça no grid do tabuleiro. Os 4 cantos da caixa delimitadora são mapeados em coordenadas absolutas do tabuleiro:
    1.  Canto Superior Esquerdo: $A = (px + 0, py + 0)$
    2.  Canto Superior Direito: $B = (px + 2, py + 0)$
    3.  Canto Inferior Esquerdo: $D = (px + 0, py + 2)$
    4.  Canto Inferior Direito: $E = (px + 2, py + 2)$

*   **Algoritmo de Validação**:
    ```javascript
    function detectTSpin(piece, board) {
        if (piece.type !== 6) return false; // Deve ser T-piece
        if (lastAction !== 'rotate') return false; // Última ação bem sucedida deve ser rotação
        
        const px = piece.pos.x;
        const py = piece.pos.y;
        
        let occupiedCorners = 0;
        
        // Definição dos 4 cantos relativos
        const corners = [
            { x: 0, y: 0 }, // Superior Esquerdo (A)
            { x: 2, y: 0 }, // Superior Direito (B)
            { x: 0, y: 2 }, // Inferior Esquerdo (D)
            { x: 2, y: 2 }  // Inferior Direito (E)
        ];
        
        corners.forEach(c => {
            const boardX = px + c.x;
            const boardY = py + c.y;
            
            // Fora dos limites laterais ou inferiores é considerado "ocupado" (paredes atuam como apoios de T-Spin)
            if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                occupiedCorners++;
            } else if (boardY >= 0 && board[boardY][boardX] !== 0) {
                // Bloco travado existente no board
                occupiedCorners++;
            }
        });
        
        return occupiedCorners >= 3;
    }
    ```

*   **Atribuição Tática de Pontos**:
    Ao computar as linhas no `mergePiece()`:
    ```javascript
    const isTSpin = detectTSpin(piece, board);
    const linesCleared = clearLines();
    
    let baseScore = 0;
    let textFeedback = "";
    
    if (isTSpin) {
        if (linesCleared === 0) {
            baseScore = 400;
            textFeedback = "T-SPIN";
        } else if (linesCleared === 1) {
            baseScore = 800;
            textFeedback = "T-SPIN SINGLE";
        } else if (linesCleared === 2) {
            baseScore = 1200;
            textFeedback = "T-SPIN DOUBLE";
        } else if (linesCleared === 3) {
            baseScore = 1600;
            textFeedback = "T-SPIN TRIPLE!";
        }
        
        // Tocar som de T-Spin especial
        if (typeof SoundSynth !== 'undefined' && SoundSynth.playTSpin) {
            SoundSynth.playTSpin();
        } else if (typeof SoundSynth !== 'undefined' && SoundSynth.playLine) {
            SoundSynth.playLine();
        }
    } else {
        // Pontuação clássica normal
        const linePoints = [0, 100, 300, 500, 800];
        baseScore = linePoints[linesCleared];
        if (linesCleared === 4) textFeedback = "TETRIS!";
    }
    
    // Combo Handler
    if (linesCleared > 0) {
        comboCount++;
        if (comboCount > 0) {
            const comboBonus = 50 * comboCount * level;
            score += comboBonus;
            if (comboCount >= 2) {
                spawnFloatingText(`COMBO x${comboCount}! +${comboBonus}`, piece.pos.x + 1, piece.pos.y, '#4C9CFF');
            }
        }
    } else {
        comboCount = -1; // Quebra o combo se colocou peça sem limpar linha
    }
    
    if (baseScore > 0) {
        score += baseScore * level;
        if (textFeedback) {
            spawnFloatingText(`${textFeedback} +${baseScore * level}`, piece.pos.x + 1, piece.pos.y, isTSpin ? '#9C5AFF' : '#FFEA2E');
        }
    }
    ```

### 3. Sistema de Floating Scores Popups (Canvas-based Particles)
Para desenhar os feedbacks diretamente no Canvas do jogo, acompanhando a física do tabuleiro:

```javascript
let floatingTexts = [];

function spawnFloatingText(text, gridX, gridY, color) {
    // Converter posições do grid para coordenadas reais de pixels do canvas
    const x = gridX * BLOCK_SIZE + (BLOCK_SIZE / 2);
    const y = gridY * BLOCK_SIZE;
    
    floatingTexts.push({
        text: text,
        x: x,
        y: y,
        vy: -1.2,          // Velocidade de subida (pixels por frame)
        alpha: 1.0,         // Opacidade inicial
        life: 70,           // Ciclos de vida do texto flutuante (~1.2s a 60fps)
        color: color
    });
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        
        // Começa a desvanecer na metade da vida útil
        if (ft.life < 35) {
            ft.alpha = Math.max(0, ft.life / 35);
        }
        
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawFloatingTexts(context) {
    context.save();
    floatingTexts.forEach(ft => {
        context.globalAlpha = ft.alpha;
        context.font = "bold 13px 'Segoe UI', Arial, sans-serif";
        context.textAlign = "center";
        
        // Efeito premium de brilho neon
        context.shadowColor = ft.color;
        context.shadowBlur = 10;
        
        // Contorno preto para máxima legibilidade
        context.strokeStyle = "#000000";
        context.lineWidth = 3;
        context.strokeText(ft.text, ft.x / BLOCK_SIZE, ft.y / BLOCK_SIZE);
        
        // Preenchimento de cor neon
        context.fillStyle = ft.color;
        context.fillText(ft.text, ft.x / BLOCK_SIZE, ft.y / BLOCK_SIZE);
    });
    context.restore();
}
```

### 4. Modo Sobrevivência (Survival/Garbage Shift Grid)
*   **Controle de Tempo e Injeção de Linhas**:
    No Modo Sobrevivência, manteremos uma variável `survivalTimer = 12.0` (segundos). O cronômetro decrementa a cada tick do loop `update(time)`.
    *   **Indicador Visual**: Adicionar caixa do cronômetro de pressão abaixo do placar lateral:
        ```html
        <div id="survivalBox" class="lines-box" style="display: none; background-color: #d32f2f; box-shadow: 0 0 15px rgba(211, 47, 47, 0.4);">
            <h2>SUBIDA DE LIXO</h2>
            <div id="survivalTimer" class="value">12.0s</div>
        </div>
        ```
    *   **Lógica de Inserção de Linhas de Lixo**:
        ```javascript
        function insertGarbageRow() {
            // Deslocar todo o tabuleiro uma linha para cima
            // Se houver qualquer bloco na linha 0 (superior), empurrá-lo causará Game Over imediato
            for (let x = 0; x < COLS; x++) {
                if (board[0][x] !== 0) {
                    gameOver = true;
                    showGameOver();
                    return;
                }
            }
            
            // Remover linha superior física e deslizar
            board.shift();
            
            // Criar uma nova linha de lixo cinza na base com apenas 1 buraco aleatório
            const newRow = Array(COLS).fill(8); // Código de cor 8 será cinza escuro/chumbo
            const emptyCol = Math.floor(Math.random() * COLS);
            newRow[emptyCol] = 0; // O buraco livre
            
            board.push(newRow);
            
            // Reposicionar a peça ativa temporariamente para evitar colisão imediata de spawn se necessário
            if (checkCollision()) {
                piece.pos.y--; // Tentar recuar verticalmente
                if (checkCollision()) {
                    // Colisão inevitável pós-shifter: Fim de jogo
                    gameOver = true;
                    showGameOver();
                }
            }
            
            // Tocar efeito sonoro seco e grave de terremoto/impacto
            if (typeof SoundSynth !== 'undefined' && SoundSynth.playDrop) {
                SoundSynth.playDrop(); // Som de encaixe forte simulado
            }
        }
        ```

---

## ❓ Dúvidas para o TL ou o PO

Abaixo estão listadas algumas dúvidas estratégicas e técnicas relativas à física clássica do Tetris e compatibilidade de UI para alinhamento:

1.  **Suporte a Rotações em Paredes (Wall Kicks) no Algoritmo de T-Spin**:
    *   *Dúvida:* Ao executar rotações encostadas em paredes laterais ou outros blocos, o Tetris clássico realiza "Wall Kicks" (desloca a peça 1 coluna para o lado para acomodar o giro). Se implementarmos a detecção estrita de T-Spin sem Wall Kicks, giros complexos podem falhar devido à colisão do modelo de rotação simples atual do jogo.
    *   *Proposta:* Devemos incluir um sistema simplificado de Wall Kick de 1 célula (se colidir ao rotacionar, tentar mover `piece.pos.x` para +1 ou -1 antes de abortar a rotação) para viabilizar jogabilidade avançada de T-Spins?

2.  **Criação de Novo Código de Cor para os Blocos de Lixo (Garbage Tiles)**:
    *   *Dúvida:* A paleta de cores original possui 7 índices (`1` a `7`). Os blocos de lixo devem usar um novo índice `8` cinza estático no array `COLORS`, ou devem ter cores vibrantes aleatórias como blocos normais quebrados?
    *   *Proposta:* Criar a cor `#555555` (Cinza chumbo fosco) sob o índice `8` no array `COLORS` para diferenciar categoricamente os blocos de lixo (sujos) dos blocos coloridos do jogador.

3.  **Controle de Audio dos 3 Segundos Finais do Contador de Sobrevivência**:
    *   *Dúvida:* Para criar tensão, a especificação sugere tocar um som de alerta nos últimos 3 segundos do timer de subida. Como a síntese do Web Audio é puramente programática, disparar osciladores consecutivamente sem controle pode saturar os alto-falantes e estourar a mixagem.
    *   *Proposta:* Disparar bips sinusoidais curtos de alta frequência (`900Hz`) a cada 1 segundo quando o tempo estiver $\le 3.0s$ (ex: no segundo 3, no segundo 2 e no segundo 1), com um tempo de duração curto de `0.05` segundos e volume extremamente moderado (`gain = 0.02`).

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

Abaixo estão as definições oficiais de arquitetura homologadas para o desenvolvimento da tarefa:

### 1. Sistema Simplificado de Wall Kicks (Aprovado)
*   **Decisão**: **Aprovado.** Para tornar a experiência de T-Spins dinâmica e fluida, implementaremos uma lógica simplificada de compensação lateral e vertical de 1 bloco durante giros.
*   **Diretriz**:
    Atualizar o método `rotatePiece()` para que, caso a rotação resulte em colisão, o motor tente aplicar compensações na seguinte ordem:
    1. Tentar mover para a esquerda: `piece.pos.x - 1` e revalidar colisão.
    2. Tentar mover para a direita: `piece.pos.x + 1` e revalidar colisão.
    3. Tentar mover para cima (Floor Kick): `piece.pos.y - 1` e revalidar colisão.
    Se todas as tentativas colidirem, reverter a rotação para o estado original. Isso viabiliza giros táticos sob o teto ou paredes e maximiza o game feel premium.

### 2. Tratamento dos Blocos de Lixo (Garbage Rows)
*   **Decisão**: **Design Chumbo Fosco Integrado.** O índice `8` será oficializado como cinza chumbo `#424242` com bordas estilizadas em tons ligeiramente metálicos para diferenciar o lixo de forma elegante.
*   **Diretriz**:
    * Adicionar o elemento `'#424242'` (cinza chumbo) como o índice `8` de `COLORS`.
    * Na função `drawBoard()`, certificar-se de renderizar o lixo aplicando sombras e relevo semelhantes às outras cores para manter a coesão visual tridimensional da interface de blocos.

### 3. Mixagem do Alerta de Pressão (Audio Synth Mix)
*   **Decisão**: **Sintetizador Controlado por Fases (Phase Locked Alert).**
*   **Diretriz**:
    * Criar um método utilitário `SoundSynth.playAlertTick(frequency)` acoplado à classe de áudio.
    * O tick de aviso de pressão deve tocar estritamente quando a parte inteira do segundo mudar de `4` para `3`, `3` para `2` e `2` para `1`.
    * Usar uma onda quadrada (`square`) de frequência `880Hz` suavizada por um envelope de ganho muito rápido (decay de `40ms`) a um volume extremamente contido (`0.03` de ganho) para simular um bip de radar tático sutil e estiloso.

---

## 💻 Notas de Desenvolvimento (Dev complete)

Implementado em `tetris/index.html` sobre a base da TASK_002 (ghost piece, time attack, SoundSynth). Todos os critérios e decisões do TL atendidos e validados localmente (preview + testes da lógica via console). Nenhum erro de runtime.

### O que foi entregue
1.  **Curva de gravidade + Level Up**: `calculateDropInterval(lvl)` (fórmula exponencial clássica, cap de 50ms); nível sobe a cada 10 linhas; banner CSS `.level-up-banner` animado (`triggerLevelUpEffects`).
2.  **T-Spin + Combo + Floating Texts**: `detectTSpin()` pela Regra dos 3 Cantos — robusta à matriz 4x4 e à rotação (acha o centro do T dinamicamente via `findTCenter` e checa os 4 cantos diagonais; bordas contam como apoio). Pontuação T-Spin (400/800/1200/1600 × nível), combo (`50·combo·nível`) e popups flutuantes (`spawnFloatingText`/`drawFloatingTexts`, desenhados em espaço de pixels com `setTransform` para não herdar a escala do canvas).
3.  **Modo Sobrevivência**: opção no seletor; pré-popula 4–6 linhas de lixo (1 buraco aleatório cada); cronômetro de 12s no `update()`; ao zerar, `insertGarbageRow()` empurra tudo para cima e adiciona lixo na base (Game Over se transbordar o topo); bips de alerta nos segundos 3/2/1.

### Decisões do TL implementadas
*   **Wall Kicks** em `rotatePiece()`: tenta esquerda (−1), direita (+1) e floor kick (−1 em Y) antes de reverter.
*   **Lixo cinza chumbo** `#424242` no índice `8` de `COLORS`.
*   **`SoundSynth.playAlertTick(880)`**: onda quadrada, ganho 0.03, decay ~40ms. Adicionei também `playTSpin` (acorde ascendente).

### Validações executadas (console, via hook `window.__tetris`)
*   Gravidade: nível 1→1000ms, 2→793ms, 10→64ms, 20→50ms (cap).
*   T-Spin: detectado em slot real de 3 cantos; ignora se último ato foi `move` ou se a peça não é T.
*   Scoring: T-Spin Double = 1200×nível; combo encadeado soma `50·combo·nível`; combo zera ao não limpar linha; floating text criado.
*   Lixo: pré-população de 5–6 linhas com 1 buraco cada; `insertGarbageRow` desloca o tabuleiro e adiciona lixo na base.
*   Banner de Level Up injetado no DOM ao subir de nível.

### Decisão de implementação (atenção do TL)
*   **Detecção de T-Spin adaptada**: o exemplo do refinamento assumia matriz 3×3 com cantos fixos em (0,0)/(2,0)/(0,2)/(2,2). Como as `SHAPES` aqui são matrizes 4×4 com o T deslocado, implementei a detecção encontrando o **centro do T dinamicamente** e checando os 4 cantos diagonais ao redor dele — equivalente e robusto a rotações.
*   **Bug latente corrigido**: o `update()` era chamado com `time=0` na 1ª frame, gerando `deltaTime` enorme/negativo (`0 - performance.now()`). Inofensivo para o `dropCounter`, mas corrompia o cronômetro de sobrevivência. Adicionei um clamp de `deltaTime` (descarta valores <0 ou >1000ms → 16ms), o que também previne saltos ao retomar a aba.
*   **T-Spin pós-rotação**: hard drop e gravidade preservam o `lastAction='rotate'` (movimentos horizontais e a próxima peça o resetam), tornando os T-Spins viáveis e recompensadores.
*   Hook `window.__tetris` deixado exposto (debug/QA), removível no cleanup.

---

## 🔍 Code Review e Aprovação (TL)

**Status**: Aprovado (Aprovado pelo Tech Lead) ✅

### Análise Técnica:
1. **Curva de Gravidade e Progressão**: A fórmula exponencial de queda `calculateDropInterval` está matematicamente precisa e evita o travamento do jogo com o cap mínimo de 50ms. A exibição do banner de level up dinamiza a jogabilidade e atende ao critério de feedback visual.
2. **Detecção de T-Spin e Sistema de Combos**: A adaptação para encontrar o centro do T dinamicamente na matriz foi uma excelente solução para suportar o formato da peça sem introduzir bugs de rotação. A verificação da "Regra dos 3 Cantos" está correta e a integração com o combo progressivo e os textos flutuantes no canvas (com reinicialização de transform para evitar escalonamento incorreto) funciona de forma brilhante.
3. **Modo Sobrevivência (Garbage Rows)**: A pré-população e a inserção periódica de linhas de lixo com buraco aleatório funcionam de maneira robusta, com a verificação de Game Over correta quando os blocos tocam o topo.
4. **Sons e Sincronização**: O sintetizador Web Audio API está livre de estouro de polifonia e o tratamento de autoplay respeita a interação do usuário. O clamp no `deltaTime` protege o jogo contra oscilações de abas em segundo plano e resolve o problema de inicialização.

O código está limpo, performático e bem arquitetado para jogos HTML5 no canvas. Pronto para QA.

---

## 🧪 Evidências de Testes (QA Report)

*Data da Execução:* 15/08/2026  
*Ambiente:* Navegador Headless (Puppeteer v25.1.0) / Servidor Express Local (Porta 3099)  
*Script de Automação:* `tests/qa_tetris_task003.test.js`  
*Status Geral dos Testes:* **APROVADO (100% dos testes passaram com sucesso)**

### 📋 Itens e Critérios de Aceitação Testados:

1. **Curva de Gravidade e Level Up**:
   - Validação da fórmula exponencial clássica `calculateDropInterval(level)` (Nível 1 = 1000ms, Nível 2 = 793ms, Nível 5 = 355ms, Nível 10 = 64ms, com cap de segurança em 50ms).
   - Injeção e renderização da animação CSS do banner `.level-up-banner` no DOM ao avançar de nível.
   - **Resultado:** ✅ Aprovado.

2. **Detecção de T-Spin e Sistema de Combos**:
   - Implementação da **Regra dos 3 Cantos (3-Corner Rule)** validada para a peça T (índice 6) sob condição de rotação como última ação.
   - Diferenciação precisa de T-Spins sem linhas (400), Single (800), Double (1200) e Triple (1600).
   - Multiplicador de combo ($50 \times \text{comboCount} \times \text{level}$) acumulativo em limpezas consecutivas.
   - Renderização dos popups flutuantes (`floatingTexts`) no canvas sem distorções de coordenadas.
   - **Resultado:** ✅ Aprovado.

3. **Modo Sobrevivência (Garbage Rows & Pressão)**:
   - Opção "Modo Sobrevivência" ativa no seletor `#gameModeSelect`.
   - Inicialização do tabuleiro pré-populado com 5 linhas de blocos de lixo cinza (`#424242` / índice 8), cada uma com 1 buraco livre aleatório.
   - Mecânica de `insertGarbageRow()` empurrando as linhas para cima e adicionando nova linha na base.
   - Cronômetro de 12 segundos e exibição de `#survivalBox` e `#survivalTimer`.
   - **Resultado:** ✅ Aprovado.

4. **Wall Kicks e Áudio Synth**:
   - Rotações com compensação lateral e vertical funcionais sem travar o motor de colisão.
   - Efeitos sonoros procedurais (`SoundSynth.playAlertTick` e `SoundSynth.playTSpin`) acionados sem erros.
   - **Resultado:** ✅ Aprovado.

5. **Estabilidade Geral**:
   - $0$ erros no console do navegador durante toda a execução.
   - **Resultado:** ✅ Aprovado.

