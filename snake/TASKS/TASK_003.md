# 📝 TASK-SNAKE: Portais Dimensionais (Grid Portals), Cobra Rival IA (Evolutive AI Rival) e Efeitos Estéticos de Juice (Neon Particle Trails & Screen Shake)

## 👤 User Story
*   **Como** fã entusiasta de jogos arcade no minijogo **Snake Game**,
*   **Eu quero** interagir com portais de teletransporte no grid, competir contra uma cobra rival controlada por inteligência artificial que consome a comida disponível, e vivenciar efeitos visuais de alto impacto (rastros de partículas neon e tremor de tela reativo),
*   **Para que** o jogo se transforme em uma experiência eletrizante, dinâmica, com profundidade estratégica e estética premium moderna.

---

## 🎯 Critérios de Aceitação
1.  **Portais Dimensionais (Grid Portals)**:
    *   Quando o jogador atinge uma pontuação mínima de **10 pontos**, dois portais neon (um Azul e outro Laranja/Âmbar) devem aparecer em coordenadas fixas e opostas do tabuleiro (ex: extremidades laterais ou cantos).
    *   Ao entrar com a cabeça da cobra em um dos portais (ex: Portal Azul), ela deve ser instantaneamente teletransportada para o outro portal (Portal Laranja), mantendo a mesma direção de movimento.
    *   Um portal não pode spawnar em cima do corpo da cobra, comida ativa ou paredes de labirinto do mapa. Eles devem ser posicionados de maneira segura e estratégica.
2.  **Cobra Rival IA (Evolutive AI Rival)**:
    *   Ao atingir **20 pontos**, spawnar no grid uma cobra rival controlada pelo computador.
    *   A cobra rival deve se mover de forma autônoma em direção à comida ativa (utilizando uma heurística de menor distância Manhattan entre sua cabeça e a comida, com desvio básico de obstáculos).
    *   Ela compete diretamente pela comida. Se a cobra rival comer a fruta, ela cresce e a comida respawna em outro local.
    *   **Condições de Morte**:
        *   Se a cobra do jogador colidir com a cabeça ou corpo da cobra rival, é Game Over instantâneo para o jogador.
        *   Se a cobra rival colidir com a própria cauda, com as paredes do labirinto ativo ou com o corpo da cobra do jogador, ela explode.
    *   **Recompensa**: Ao explodir, todos os segmentos do corpo da cobra rival se transformam em **Maçãs Douradas (Golden Apples)** que valem **3 pontos** cada e desaparecem após 8 segundos. A cobra rival respawna 15 segundos após sua eliminação com tamanho inicial (1 segmento).
3.  **Juiciness Premium (Neon Particles & Screen Shake)**:
    *   *Rastro de Partículas (Particle Trails)*: Ao se mover (e especialmente sob Speed Boost), emitir um rastro de partículas neon coloridas da cauda da cobra que decai rapidamente (efeito fade out).
    *   *Tremor de Tela (Screen Shake)*: O canvas de jogo deve vibrar por 200ms em situações de grande impacto visual: teletransporte por portais, consumo de frutas especiais/douradas e na explosão da cobra rival.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/snake/index.html`.
*   **Lógica dos Portais**:
    *   Variáveis globais `portalA = {x: 2, y: 10, color: '#00d2ff', glowColor: 'rgba(0, 210, 255, 0.8)'}` e `portalB = {x: 17, y: 10, color: '#ff9f43', glowColor: 'rgba(255, 159, 67, 0.8)'}`.
    *   Verificar a cada frame se `head.x === portalA.x && head.y === portalA.y` para teletransportar para `portalB` (e vice-versa), disparando o efeito visual correspondente.
*   **Cobra Rival IA**:
    *   Criar uma classe ou objeto literal `RivalAI` contendo `body` (array de segmentos), `direction` e uma função `updateDirection(foodPos, playerSnake, activeMaze)`.
    *   O algoritmo de decisão da IA deve avaliar os 4 movimentos possíveis (Cima, Baixo, Esquerda, Direita), descartar os que resultam em colisões imediatas com paredes, seu próprio corpo ou com a cobra do jogador, e dentre os válidos, selecionar o que minimiza $|x_{rival} - x_{food}| + |y_{rival} - y_{food}|$.
*   **Juice Engine**:
    *   Implementar um gerenciador de partículas simples `ParticleSystem` contendo um array global de objetos `{x, y, vx, vy, color, alpha, size}` atualizados e desenhados a cada frame no Canvas antes do desenho dos menus.
    *   Efeito `screenShakeTime` decrementado no loop principal que aplica um `ctx.translate(randomOffset, randomOffset)` no Canvas antes de desenhar os elementos de jogo e faz um `ctx.restore()` ao final do frame.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Essencial para enriquecer o loop avançado de gameplay e fornecer feedback de altíssimo impacto sensorial).
*   **Esforço Estimado**: Alta (Requer modelagem de IA de movimentação e gerenciamento de múltiplas entidades concorrentes em tempo real).
*   **Área**: Front-end / Canvas 2D / Lógica de Jogo e IA.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os passos de implementação, a arquitetura matemática das colisões e os algoritmos para a Inteligência Artificial e efeitos de partículas.

### 1. Portais Dimensionais (Grid Portals)
*   **Modelagem de Dados e Condição de Spawn**:
    Os portais serão ativados assim que `score >= 10`. Eles ocupam uma célula de grid cada.
    
    ```javascript
    let portalsActive = false;
    const portalA = { x: 2, y: 10, color: '#00d2ff', glowColor: 'rgba(0, 210, 255, 0.8)' };
    const portalB = { x: 17, y: 10, color: '#ff9f43', glowColor: 'rgba(255, 159, 67, 0.8)' };
    ```
    
*   **Algoritmo de Teletransporte**:
    No início do método `update()`, antes da detecção padrão de colisões, verificar a sobreposição da cabeça com os portais ativos:
    
    ```javascript
    if (portalsActive) {
        let teleported = false;
        if (head.x === portalA.x && head.y === portalA.y) {
            head.x = portalB.x;
            head.y = portalB.y;
            teleported = true;
        } else if (head.x === portalB.x && head.y === portalB.y) {
            head.x = portalA.x;
            head.y = portalA.y;
            teleported = true;
        }
        
        if (teleported) {
            triggerScreenShake(150); // Tremor de tela moderado
            createPortalBurst(head.x, head.y); // Partículas no portal de saída
            playPortalSound(); // Se áudio estiver implementado
        }
    }
    ```

*   **Renderização Gráfica**:
    Pintar os portais como elipses neon pulsantes e brilhantes para atrair visualmente o jogador:
    
    ```javascript
    function drawPortals() {
        if (!portalsActive) return;
        
        [portalA, portalB].forEach(portal => {
            const px = (portal.x + 0.5) * gridSize;
            const py = (portal.y + 0.5) * gridSize;
            const radiusX = gridSize * 0.4;
            const radiusY = gridSize * 0.6;
            const angle = Date.now() / 200; // Efeito rotativo
            
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.shadowBlur = 15;
            ctx.shadowColor = portal.glowColor;
            
            // Desenhar contorno brilhante
            ctx.strokeStyle = portal.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // Núcleo semi-transparente
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX - 2, radiusY - 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }
    ```

### 2. Cobra Rival IA (Evolutive AI Rival)
*   **Representação do Estado da IA**:
    A cobra rival possui estrutura similar à do jogador principal, mas com velocidade atualizada e IA de navegação tática:
    
    ```javascript
    let rivalSnake = null; // null até score >= 20
    let rivalDirection = 'left';
    let rivalRespawnTimer = 0;
    let goldenApples = []; // Armazena as frutas deixadas ao morrer
    ```

*   **Algoritmo de Movimento da IA (Navegação Manhattan Heurística)**:
    A cada tick do jogo, a IA analisa a direção mais promissora de aproximação da comida:
    
    ```javascript
    function updateRivalAI() {
        if (!rivalSnake || rivalSnake.length === 0) return;
        
        const head = rivalSnake[0];
        const possibleMoves = [
            { dir: 'up', x: head.x, y: head.y - 1 },
            { dir: 'down', x: head.x, y: head.y + 1 },
            { dir: 'left', x: head.x - 1, y: head.y },
            { dir: 'right', x: head.x + 1, y: head.y }
        ];
        
        // Filtrar movimentos válidos (evitar obstáculos imediatos)
        const validMoves = possibleMoves.filter(move => {
            // 1. Colisão com borda do mapa
            if (move.x < 0 || move.x >= tileCount || move.y < 0 || move.y >= tileCount) return false;
            
            // 2. Colisão com paredes do labirinto
            const inMaze = currentMaze.some(wall => wall.x === move.x && wall.y === move.y);
            if (inMaze) return false;
            
            // 3. Colisão com corpo do próprio rival
            const inSelf = rivalSnake.some(seg => seg.x === move.x && seg.y === move.y);
            if (inSelf) return false;
            
            // 4. Colisão com corpo do jogador (segurança contra morte acidental)
            const inPlayer = snake.some(seg => seg.x === move.x && seg.y === move.y);
            if (inPlayer) return false;
            
            return true;
        });
        
        if (validMoves.length === 0) {
            // Sem movimentos seguros, explode a IA
            triggerRivalDeath();
            return;
        }
        
        // Escolher o movimento válido que nos aproxima da comida
        let bestMove = validMoves[0];
        let minDistance = Infinity;
        
        validMoves.forEach(move => {
            const dist = Math.abs(move.x - food.x) + Math.abs(move.y - food.y);
            if (dist < minDistance) {
                minDistance = dist;
                bestMove = move;
            }
        });
        
        rivalDirection = bestMove.dir;
        
        // Mover Rival
        const newHead = { x: bestMove.x, y: bestMove.y };
        rivalSnake.unshift(newHead);
        
        // Comer fruta
        if (newHead.x === food.x && newHead.y === food.y) {
            food = generateFood(); // Respawna para o jogador
            createPortalBurst(newHead.x, newHead.y);
            // Rival cresce (não remove a cauda)
        } else {
            rivalSnake.pop(); // Remove cauda (mantém tamanho constante)
        }
    }
    ```

*   **Mecânica de Morte da IA e Maçãs Douradas**:
    Quando a IA morre, seus segmentos viram comida dourada que dão pontuação tripla ao jogador:
    
    ```javascript
    function triggerRivalDeath() {
        triggerScreenShake(300);
        
        // Transforma segmentos em Golden Apples
        rivalSnake.forEach(segment => {
            goldenApples.push({
                x: segment.x,
                y: segment.y,
                value: 3,
                spawnTime: Date.now()
            });
            createExplosionParticles(segment.x, segment.y, '#f1c40f');
        });
        
        rivalSnake = null;
        rivalRespawnTimer = Date.now() + 15000; // 15 segundos de cooldown
    }
    ```

*   **Verificação de Colisão Cruzada**:
    Verificar no `update()` padrão se o jogador bateu na cobra rival:
    
    ```javascript
    if (rivalSnake) {
        const playerHitRival = rivalSnake.some(seg => seg.x === head.x && seg.y === head.y);
        if (playerHitRival) {
            triggerGameOver();
            return;
        }
    }
    ```

### 3. Efeitos de Juice (Estética Premium)
*   **Gerenciador de Partículas Dinâmicas (Neon Trails)**:
    Implementar uma estrutura leve de partículas que são renderizadas a cada frame:
    
    ```javascript
    const particles = [];
    
    function spawnParticle(x, y, color) {
        particles.push({
            x: x * gridSize + gridSize/2,
            y: y * gridSize + gridSize/2,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 3 + 2,
            color: color,
            alpha: 1.0,
            decay: Math.random() * 0.05 + 0.02
        });
    }
    
    function updateAndDrawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            
            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 5;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    ```
    - Chamar `spawnParticle(tail.x, tail.y, snakeBodyColorEnd)` a cada frame para criar o rastro neon!

*   **Mecanismo de Tremor de Tela (Screen Shake)**:
    Manipular o contexto 2D para vibrar o Canvas:
    
    ```javascript
    let shakeDuration = 0;
    
    function triggerScreenShake(ms) {
        shakeDuration = ms;
    }
    
    // No início do método draw():
    ctx.save();
    if (shakeDuration > 0) {
        const dx = (Math.random() - 0.5) * 6;
        const dy = (Math.random() - 0.5) * 6;
        ctx.translate(dx, dy);
        shakeDuration -= 16.66; // Subtrai o equivalente a 1 frame (60fps)
    }
    
    // ... (Toda a renderização normal do jogo)
    
    // No final do método draw():
    ctx.restore();
    ```
