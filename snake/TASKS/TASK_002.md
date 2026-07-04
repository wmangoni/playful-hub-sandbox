# 📝 TASK-SNAKE: Modo Labirinto (Grid Obstacles), Frutas Especiais Temporárias e Speed Boost

## 👤 User Story
*   **Como** fã de jogos retrô no minijogo **Snake Game**,
*   **Eu quero** selecionar layouts de mapas com obstáculos fixos no grid, consumir comidas que aplicam efeitos temporários (atravessar paredes, acelerar ou encolher cauda) e acelerar manualmente a cobrinha,
*   **Para que** a mecânica de jogo clássica traga mais dinamismo, agilidade e desafio tático.

---

## 🎯 Critérios de Aceitação
1.  **Modo de Jogo com Labirintos (Maze Mode)**:
    *   No menu inicial, o jogador deve poder escolher entre: *Clássico (Sem Paredes Internas)*, *Caixa Fechada*, *Quatro Cantos* e *Grande Espiral*.
    *   Os labirintos devem ser gerados desenhando blocos de parede intransponíveis no grid (usando cores neon distintas, como magenta ou azul ciano).
    *   Colidir com qualquer bloco de labirinto resulta em Game Over instantâneo.
2.  **Frutas com Efeitos Especiais (Power Food)**:
    *   A cada 5 frutas normais consumidas, spawnar uma fruta especial brilhante com 1 das seguintes propriedades aleatórias:
        1.  *Fruta Fantasma (Roxa)*: Permite que a cobra atravesse paredes e o próprio corpo sem morrer por 5 segundos (exibir cobra piscando).
        2.  *Fruta Aceleração (Azul)*: Dobra a velocidade de movimento da cobra e dobra toda pontuação obtida nos próximos 8 segundos.
        3.  *Fruta Cortadora (Verde)*: Remove instantaneamente 3 segmentos da cauda da cobra (apenas se a cobra tiver tamanho maior que 6).
3.  **Speed Boost Manual (Barra de Espaço)**:
    *   Enquanto o jogador mantiver a barra de espaço pressionada, a cobra se move no dobro da velocidade da taxa padrão do jogo.
    *   Para equilibrar, o uso da aceleração consome 1 ponto de pontuação a cada 1.5 segundos.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/snake/index.html`.
*   **Lógica do Loop do Jogo**:
    *   Definir arrays bidimensionais representando as posições dos labirintos no grid: `mazeGrid = [{x: 5, y: 10}, {x: 6, y: 10}, ...]`.
    *   Na validação da colisão da cabeça da cobra, verificar se a nova coordenada pertence a `mazeGrid`.
*   **Controle de Estados**:
    *   Variáveis globais `isGhostMode` (boolean) e `speedMultiplier` (number) controladas por cronômetros decrescentes em milissegundos dentro do loop principal (`update`).

---

*   **Área**: Front-end / Canvas 2D / Grid Movement.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os passos, a modelagem e os trechos de código estruturados necessários para implementar cada um dos requisitos da história de usuário, garantindo total compatibilidade com o loop de jogo existente no arquivo [index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/snake/index.html) e mantendo a estética premium e neon do minijogo.

### 1. Sistema de Labirintos (Maze Mode)
*   **Definição dos Mapas (Coordenadas no Grid 20x20)**:
    No escopo do jogo, o canvas possui tamanho 400x400 e tamanho de célula `gridSize = 20`, resultando em `tileCount = 20` colunas e linhas (coordenadas de `0` a `19`).
    Definiremos uma estrutura de dados `MAZES` mapeando as coordenadas `(x, y)` dos blocos intransponíveis de cada padrão:
    
    ```javascript
    const MAZES = {
        classic: [],
        box: [
            // Bordas externas do grid mapeadas como paredes
            ...Array.from({ length: 20 }, (_, i) => ({ x: i, y: 0 })),
            ...Array.from({ length: 20 }, (_, i) => ({ x: i, y: 19 })),
            ...Array.from({ length: 18 }, (_, i) => ({ x: 0, y: i + 1 })),
            ...Array.from({ length: 18 }, (_, i) => ({ x: 19, y: i + 1 }))
        ],
        corners: [
            // Cantos em formato de "L" (espaço central livre)
            // Superior Esquerdo
            { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 3 }, { x: 5, y: 3 },
            // Superior Direito
            { x: 16, y: 3 }, { x: 16, y: 4 }, { x: 16, y: 5 }, { x: 15, y: 3 }, { x: 14, y: 3 },
            // Inferior Esquerdo
            { x: 3, y: 16 }, { x: 3, y: 15 }, { x: 3, y: 14 }, { x: 4, y: 16 }, { x: 5, y: 16 },
            // Inferior Direito
            { x: 16, y: 16 }, { x: 16, y: 15 }, { x: 16, y: 14 }, { x: 15, y: 16 }, { x: 14, y: 16 }
        ],
        spiral: [
            // Espiral central aberta para permitir circulação estratégica
            { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 }, { x: 10, y: 5 }, { x: 11, y: 5 }, { x: 12, y: 5 }, { x: 13, y: 5 }, { x: 14, y: 5 },
            { x: 14, y: 6 }, { x: 14, y: 7 }, { x: 14, y: 8 }, { x: 14, y: 9 }, { x: 14, y: 10 }, { x: 14, y: 11 }, { x: 14, y: 12 }, { x: 14, y: 13 }, { x: 14, y: 14 },
            { x: 13, y: 14 }, { x: 12, y: 14 }, { x: 11, y: 14 }, { x: 10, y: 14 }, { x: 9, y: 14 }, { x: 8, y: 14 }, { x: 7, y: 14 }, { x: 6, y: 14 }, { x: 5, y: 14 },
            { x: 5, y: 13 }, { x: 5, y: 12 }, { x: 5, y: 11 }, { x: 5, y: 10 }, { x: 5, y: 9 }, { x: 5, y: 8 }, { x: 5, y: 7 },
            { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 }, { x: 10, y: 7 }, { x: 11, y: 7 }, { x: 11, y: 8 }, { x: 11, y: 9 }, { x: 11, y: 10 }, { x: 11, y: 11 },
            { x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }
        ]
    };
    ```

*   **HTML/Interface de Seleção**:
    Adicionar um painel de configuração de mapas na interface acima do container do canvas, permitindo a seleção do labirinto antes do início do jogo (ou reiniciando-o na troca):
    
    ```html
    <div class="menu-selection" style="background-color: rgba(0, 0, 0, 0.4); border-radius: 8px; padding: 10px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.2); width: 90%; max-width: 600px; display: flex; justify-content: space-around; align-items: center; gap: 10px;">
        <div style="display: flex; flex-direction: column;">
            <label for="mazeSelect" style="font-family: 'Press Start 2P', cursive; font-size: 10px; color: var(--score-color); margin-bottom: 5px;">LABIRINTO / MAPA:</label>
            <select id="mazeSelect" style="padding: 6px; font-family: 'Roboto', sans-serif; font-weight: bold; background: #16213e; color: #fff; border: 1px solid var(--score-color); border-radius: 4px; outline: none; cursor: pointer;">
                <option value="classic">Clássico (Sem Paredes)</option>
                <option value="box">Caixa Fechada</option>
                <option value="corners">Quatro Cantos</option>
                <option value="spiral">Grande Espiral</option>
            </select>
        </div>
    </div>
    ```

*   **Renderização e Estilo Neon**:
    No método `draw()`, pintar cada bloco de parede do labirinto ativo com um visual neon correspondente. Utilizaremos **Magenta (#ff00ff)** para manter a paleta Cyberpunk.
    
    ```javascript
    function drawMaze() {
        const selectedMaze = document.getElementById('mazeSelect').value;
        const walls = MAZES[selectedMaze] || [];
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 0, 255, 0.7)';
        ctx.fillStyle = '#ff00ff';
        
        walls.forEach(wall => {
            drawRoundedRect(ctx, wall.x * gridSize + 1, wall.y * gridSize + 1, gridSize - 2, gridSize - 2, 4);
        });
        
        ctx.shadowBlur = 0; // Reset
    }
    ```

*   **Validação de Colisão**:
    Integrar o validador de colisão dentro do método `update()` para analisar se o `head` colidiu com alguma coordenada do array de paredes do mapa selecionado:
    
    ```javascript
    const selectedMaze = document.getElementById('mazeSelect').value;
    const currentMaze = MAZES[selectedMaze] || [];
    const hitWall = currentMaze.some(wall => wall.x === head.x && wall.y === head.y);
    
    if (hitWall && !isGhostMode) {
        triggerGameOver();
        return;
    }
    ```

---

### 2. Frutas Especiais Temporárias (Power Food)
*   **Variáveis de Controle de Estado**:
    Para dar suporte a essa funcionalidade, inicializaremos os seguintes estados na tag `<script>`:
    
    ```javascript
    let normalFoodEaten = 0; // Contador de frutas comuns
    let isGhostMode = false; // Estado Fantasma (atravessa paredes)
    let isSpeedBoostActive = false; // Estado Aceleração (2x pontos, 2x velocidade)
    let ghostTimeout = null;
    let speedTimeout = null;
    ```

*   **Modelagem do Objeto `food`**:
    Atualizar o gerador de comida para suportar frutas normais e especiais, garantindo também que as frutas não spawnam em cima das paredes do labirinto ou do corpo da cobra:
    
    ```javascript
    function generateFood() {
        let foodX, foodY;
        let validPosition = false;
        const selectedMaze = document.getElementById('mazeSelect').value;
        const currentMaze = MAZES[selectedMaze] || [];
        
        while (!validPosition) {
            foodX = Math.floor(Math.random() * tileCount);
            foodY = Math.floor(Math.random() * tileCount);
            
            const inSnake = snake.some(segment => segment.x === foodX && segment.y === foodY);
            const inMaze = currentMaze.some(wall => wall.x === foodX && wall.y === foodY);
            
            if (!inSnake && !inMaze) {
                validPosition = true;
            }
        }
        
        // Verifica se é o momento de criar uma fruta especial (a cada 5 normais)
        if (normalFoodEaten >= 5) {
            normalFoodEaten = 0;
            const specialTypes = ['ghost', 'speed', 'shrink'];
            const chosenType = specialTypes[Math.floor(Math.random() * specialTypes.length)];
            return {
                x: foodX,
                y: foodY,
                isSpecial: true,
                type: chosenType
            };
        }
        
        return {
            x: foodX,
            y: foodY,
            isSpecial: false
        };
    }
    ```

*   **Cores e Estilos Neon da Fruta Especial**:
    Atualizar o renderizador de comida no método `draw()` para desenhar cada tipo especial com cores e gradientes únicos:
    
    ```javascript
    // No método draw()
    const foodX = (food.x + 0.5) * gridSize;
    const foodY = (food.y + 0.5) * gridSize;
    const baseFoodRadius = gridSize / 2.5;
    const pulse = 0.1 * Math.sin(Date.now() / 150);
    const foodRadius = baseFoodRadius * (1 + pulse);
    
    let colorPrimary = foodColor;
    let colorGlow = foodGlowColor;
    let colorInner = 'white';
    
    if (food.isSpecial) {
        if (food.type === 'ghost') {
            colorPrimary = '#9b59b6'; // Roxo
            colorGlow = 'rgba(155, 89, 182, 0.8)';
        } else if (food.type === 'speed') {
            colorPrimary = '#2980b9'; // Azul
            colorGlow = 'rgba(41, 128, 185, 0.8)';
        } else if (food.type === 'shrink') {
            colorPrimary = '#2ecc71'; // Verde Claro
            colorGlow = 'rgba(46, 204, 113, 0.8)';
        }
    }
    
    ctx.shadowBlur = 20;
    ctx.shadowColor = colorGlow;
    const gradient = ctx.createRadialGradient(
        foodX - foodRadius * 0.2, foodY - foodRadius * 0.2, foodRadius * 0.1,
        foodX, foodY, foodRadius * 1.2
    );
    gradient.addColorStop(0, colorInner);
    gradient.addColorStop(0.7, colorPrimary);
    gradient.addColorStop(1, colorPrimary);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
    ```

*   **Piscamento da Cobra no Modo Fantasma**:
    Durante a renderização do corpo da cobra, se `isGhostMode` estiver ativo, implementar um efeito translúcido piscante para indicar visualmente a imunidade:
    
    ```javascript
    snake.forEach((segment, index) => {
        const segmentX = segment.x * gridSize;
        const segmentY = segment.y * gridSize;
        
        if (isGhostMode && Math.floor(Date.now() / 150) % 2 === 0) {
            ctx.globalAlpha = 0.3; // Efeito translúcido piscante
        } else {
            ctx.globalAlpha = 1.0;
        }
        
        // ... (Desenho do segmento)
    });
    ctx.globalAlpha = 1.0; // Garantir reset
    ```

*   **Comportamento de Transposição de Telas (Screen Wrap)**:
    Se `isGhostMode` estiver ativo, a colisão com as bordas do canvas deve fazer a cobra atravessar e reaparecer na extremidade oposta em vez de disparar Game Over:
    
    ```javascript
    // No loop update()
    if (isGhostMode) {
        if (head.x < 0) head.x = tileCount - 1;
        else if (head.x >= tileCount) head.x = 0;
        if (head.y < 0) head.y = tileCount - 1;
        else if (head.y >= tileCount) head.y = 0;
    } else {
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            triggerGameOver();
            return;
        }
    }
    ```

*   **Processamento da Comida Especial e Efeitos**:
    Quando a cobra consome a fruta especial:
    
    ```javascript
    if (head.x === food.x && head.y === food.y) {
        const pointsAwarded = isSpeedBoostActive ? 2 : 1;
        
        if (food.isSpecial) {
            if (food.type === 'ghost') {
                isGhostMode = true;
                showStatusBadge('FANTASMA 👻', '#9b59b6', 5);
                if (ghostTimeout) clearTimeout(ghostTimeout);
                ghostTimeout = setTimeout(() => {
                    isGhostMode = false;
                    hideStatusBadge();
                }, 5000);
            } else if (food.type === 'speed') {
                isSpeedBoostActive = true;
                showStatusBadge('ACELERAÇÃO ⚡', '#2980b9', 8);
                if (speedTimeout) clearTimeout(speedTimeout);
                speedTimeout = setTimeout(() => {
                    isSpeedBoostActive = false;
                    hideStatusBadge();
                }, 8000);
            } else if (food.type === 'shrink') {
                if (snake.length > 6) {
                    snake = snake.slice(0, -3); // Encolhe 3 segmentos da cauda
                    showStatusBadge('CORTE DE CAUDA ✂️', '#2ecc71', 1.5);
                } else {
                    showStatusBadge('TAMANHO MÍNIMO!', '#7f8c8d', 1.5);
                }
            }
        } else {
            normalFoodEaten++;
        }
        
        score += pointsAwarded;
        scoreElement.textContent = `Score: ${score}`;
        food = generateFood();
        // ... (Efeitos de zoom na pontuação)
    }
    ```

*   **HTML para Feedback Visual dos Power-ups**:
    Inserir uma etiqueta visual (Badge) acima do score que exibe dinamicamente o power-up ativo e seu tempo restante:
    
    ```html
    <div id="statusBadge" style="display: none; font-family: 'Press Start 2P', cursive; font-size: 10px; padding: 8px 12px; border-radius: 6px; text-align: center; margin-bottom: 10px; border: 2px solid white; transition: all 0.3s ease;">
        ATIVO: <span id="statusText">NENHUM</span>
    </div>
    ```

---

### 3. Acelerador Manual (Speed Boost Manual)
*   **Monitoramento de Entrada de Teclado**:
    Utilizaremos a barra de espaço para acionar a aceleração. Registraremos se a tecla está ativamente pressionada:
    
    ```javascript
    let isSpacePressed = false;
    let lastScoreDeductionTime = 0;
    
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            if (!isGameOver) {
                if (!isSpacePressed) {
                    lastScoreDeductionTime = Date.now();
                }
                isSpacePressed = true;
                e.preventDefault(); // Impede rolagem lateral/vertical da página
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            isSpacePressed = false;
        }
    });
    ```

*   **Ajuste Dinâmico de Velocidade no Game Loop**:
    O loop de jogo calcula a taxa de atualização (`setTimeout`) dinamicamente. Reduziremos o atraso pela metade caso a aceleração manual (Barra de Espaço) ou o Power-up de Aceleração estejam ativos:
    
    ```javascript
    function gameLoop() {
        if (isGameOver) return;
        update();
        draw();
        
        let baseSpeed = 150 - Math.min(score * 2, 80);
        let speedMultiplier = 1.0;
        
        if (isSpacePressed) speedMultiplier *= 0.5; // Dobra a velocidade (corta o delay pela metade)
        if (isSpeedBoostActive) speedMultiplier *= 0.5; // Dobra a velocidade
        
        let finalSpeed = baseSpeed * speedMultiplier;
        gameLoopTimeout = setTimeout(gameLoop, finalSpeed);
    }
    ```

*   **Punição Dinâmica de Pontos (Equilíbrio de Jogo)**:
    Conforme o critério de aceitação, acelerar manualmente consome 1 ponto de pontuação a cada 1,5 segundos. Validaremos este decréscimo dentro do método `update()`:
    
    ```javascript
    if (isSpacePressed && score > 0) {
        const now = Date.now();
        if (now - lastScoreDeductionTime >= 1500) {
            score = Math.max(0, score - 1);
            scoreElement.textContent = `Score: ${score}`;
            lastScoreDeductionTime = now;
            
            // Microefeito visual na pontuação ao perder pontos
            scoreElement.style.color = '#ff4757';
            setTimeout(() => {
                scoreElement.style.color = 'var(--score-color)';
            }, 200);
        }
    }
    ```

---

### 4. Fluxo de Reset do Estado
Ao disparar `restartGame()`, redefinir todas as variáveis de estado de power-ups, limpando cronômetros pendentes para evitar comportamento inconsistente entre rodadas:

```javascript
function resetPowerUps() {
    isGhostMode = false;
    isSpeedBoostActive = false;
    isSpacePressed = false;
    normalFoodEaten = 0;
    if (ghostTimeout) clearTimeout(ghostTimeout);
    if (speedTimeout) clearTimeout(speedTimeout);
    hideStatusBadge();
}
```
Essa chamada deve ser adicionada no início de `restartGame()`.

---

## 💻 Notas de Desenvolvimento (Dev complete)

Implementado em `snake/index.html`. Todos os critérios atendidos e validados localmente (preview + testes unitários das mecânicas via console). Nenhum erro de runtime.

### O que foi entregue
1.  **Maze Mode**: `MAZES` (classic/box/corners/spiral) + `<select id="mazeSelect">` no menu. `drawMaze()` pinta paredes em magenta neon; `update()` dispara Game Over ao colidir com parede. Trocar o mapa reinicia a partida (`change` → `restartGame()`), com `clearTimeout` para não duplicar o game loop.
2.  **Frutas especiais (a cada 5 normais)**: `generateFood()` evita paredes e corpo, e gera fruta especial (`ghost`/`speed`/`shrink`) com cores/gradientes próprios. Efeitos em `applySpecialFood()`: Fantasma (5s, atravessa paredes/corpo + screen-wrap + cobra piscando), Aceleração (8s, 2× velocidade e 2× pontos), Corte (−3 segmentos se `length > 6`).
3.  **Speed Boost manual**: barra de espaço dobra a velocidade (multiplicador 0.5 no delay do loop) e consome 1 ponto a cada 1.5s. Badge `#statusBadge` mostra o power-up ativo com contagem regressiva.
4.  **Reset de estado**: `resetPowerUps()` chamado no início de `restartGame()` limpa flags, cronômetros e o badge.

### Validações executadas (console)
*   Colisão com parede (box) → Game Over; modo fantasma atravessa parede e faz wrap de tela.
*   Fruta de aceleração ativa boost e dobra pontos das frutas seguintes (normal → +2).
*   Fruta de corte: cobra 8 → 6 segmentos.
*   `generateFood` em 200 amostras nunca caiu sobre parede; fruta especial garantida após 5 normais.
*   Multiplicador de velocidade (espaço + boost) = 0.25× do delay base.

### Decisão de implementação (atenção do TL)
*   **Spawn seguro**: a cobra nasce em (10,10) virada para a direita por padrão, mas no labirinto **Espiral** a célula (11,10) é parede — isso causava morte instantânea no 1º frame. Adicionei `pickSafeStartDirection()` que escolhe uma direção inicial livre conforme o mapa ativo (mantém "right" quando possível). O Espiral continua desafiador (corredor estreito), mas é navegável e não mata na largada. Decisão conservadora para preservar a jogabilidade sem alterar as coordenadas do mapa definidas no refinamento.

### 🔧 Correção pós-feedback (bug do modo "Sem Paredes")
*   **Reportado**: no modo **Clássico (Sem Paredes)** a cobra morria ao tocar a borda do canvas, em vez de atravessar para o lado oposto.
*   **Causa**: o `update()` só fazia *screen wrap* no modo Fantasma; nos demais casos, a borda disparava Game Over (comportamento herdado do jogo original).
*   **Correção**: a borda agora **sempre** faz wrap para o lado oposto. O mapa **Caixa Fechada** continua matando na borda porque suas paredes de perímetro são tratadas pela colisão de labirinto (a cobra morre na parede em x/y=19, um passo antes do wrap). Validado: Clássico atravessa as 4 bordas; Caixa Fechada continua morrendo na parede.

