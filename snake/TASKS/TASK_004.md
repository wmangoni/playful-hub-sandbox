# 📝 TASK-SNAKE: Modo Campanha de Fases (Campaign Mode), Chefão Medusa Grid Core e Loja de Upgrades Estéticos & Habilidades (Cyber-Shop)

## 👤 User Story
*   **Como** jogador habilidoso e colecionador no minijogo **Snake Game**,
*   **Eu quero** progredir através de um Modo Campanha com fases geométricas e mecânicas dinâmicas, desafiar um chefão digital gigante ("Medusa Grid Core") com ataques coreografados, e acumular moedas virtuais para adquirir skins cosméticas persistentes e habilidades ativas em uma loja ciber-neon,
*   **Para que** o jogo ganhe uma forte sensação de progressão e conquistas, loops de risco e recompensa variados, e uma experiência audiovisual procedural envolvente de alta qualidade.

---

## 🎯 Critérios de Aceitação

1.  **Estrutura do Modo Campanha (Campaign Mode)**:
    *   No menu inicial de seleção de mapas/labirintos, o jogador deve poder alternar entre o **Modo Infinito (Endless Mode)** (comportamento atual do jogo) e o **Modo Campanha (Campaign Mode)**.
    *   O Modo Campanha é composto por **4 fases progressivas**:
        *   **Fase 1: Neon Outskirts (Grid Limpo)** - Objetivo: Atingir 15 pontos. Velocidade padrão.
        *   **Fase 2: Sector Shift (Barreiras Móveis)** - Objetivo: Atingir 20 pontos. Spawna 2 barreiras horizontais de 3 blocos cada que se movem de forma alternada (oscilando verticalmente de 1 tile a cada 3 segundos).
        *   **Fase 3: Rival Sector (Invasão de Grid)** - Objetivo: Atingir 25 pontos. Portais dimensionais e a Cobra Rival IA são ativados imediatamente desde o início da fase.
        *   **Fase 4: Medusa's Lair (A Batalha contra o Chefão)** - Objetivo: Reduzir os 100 HP do Chefão "Medusa Grid Core" a zero.
    *   **Feedback de Transição de Nível**:
        *   Ao atingir o objetivo de pontos das fases 1 a 3, o jogo entra em pausa parcial por 2 segundos.
        *   Exibe um banner DOM overlay glassmorphic com tipografia brilhante anunciando "PHASE COMPLETED! PREPARING SECTOR X...".
        *   A cor das bordas e grades do canvas transiciona suavemente (CSS transition e cores HSL reativas).
        *   A cobra do jogador é reposicionada no centro para a próxima fase.

2.  **Batalha contra o Chefão (Medusa Grid Core)**:
    *   Ao iniciar a Fase 4, a trilha sonora e o ambiente de iluminação do grid mudam para tons carmesim e roxo escuro.
    *   O chefe **Medusa Grid Core** surge na metade superior do tabuleiro. Ele é composto por:
        *   **Núcleo Principal**: Bloco de colisão 2x2.
        *   **Apêndices de Código**: Um corpo de 6 a 8 segmentos (1x1) que o seguem em movimentos ondulatórios (seno/cosseno).
        *   O chefe possui **100 HP**, exibidos no HUD em uma barra de progresso neon vermelha com moldura glassmorphic.
    *   **Padrões de Ataque**:
        *   **Eye Lasers (Feixe Linear)**: A cada 6 segundos, o chefe carrega energia por 1.5s (dois feixes guias amarelos finos piscam na tela) e dispara um laser vertical ou horizontal vermelho neon de 2 tiles de largura, cobrindo o grid de ponta a ponta. Ficar no caminho do laser causa Game Over instantâneo. O asfalto atingido fica com um efeito de cinzas e faíscas por 3 segundos (sendo intransitável).
        *   **Corrupted Orbs (Projéteis)**: Dispara de seu núcleo 2 esferas de dados corrompidos (círculos magenta neon 1x1) que se movem de forma retilínea e ricocheteiam nas bordas do grid por 5 segundos antes de sumirem. Tocar em um orb custa 1 vida (se escudo ativo) ou causa Game Over instantâneo.
    *   **Mecânica de Derrota do Chefe**:
        *   Frutas especiais roxas explosivas (**Detonation Fruits / D-Fruits**) surgem uma de cada vez em locais seguros do grid.
        *   Ao comer a D-Fruta, a ponta da cauda do jogador fica envolta em chamas elétricas ciano.
        *   O jogador deve manobrar para colidir com a cabeça ou qualquer segmento do Medusa Grid Core.
        *   O impacto consome a carga elétrica, causa **25 de dano** ao chefe, desencadeia um tremor de tela (screen shake) de 400ms, emite uma explosão de partículas e toca um estrondo procedural.

3.  **Cyber-Shop e Economia (Upgrades & Cosméticos)**:
    *   **Ciber-Moedas (C-Coins, 🪙)**: Surgem aleatoriamente no grid (5% de chance ao coletar frutas comuns no modo infinito ou campanha). Têm cor amarela e ícone de moeda neon. São salvas no `localStorage` sob a chave `snakeCCoins`.
    *   No menu principal, deve haver o botão de acesso à **Cyber-Shop** (modal glassmorphic elegante com blur e bordas pulsantes neon).
    *   **Customizações Estéticas (Skins de Cobra)**:
        *   *RGB Pulse Skin*: Custo: `100 C-Coins`. Faz os segmentos da cobra mudarem de cor em ciclo HSL contínuo (efeito arco-íris).
        *   *Cyber-Ghost Skin*: Custo: `150 C-Coins`. A cobra adquire opacidade de 60% e rastro neon ciano persistente.
    *   **Habilidades Ativas (Consumíveis)**: O jogador pode comprar e equipar **apenas 1 habilidade por partida** (ativada pressionando a tecla `Space`):
        *   *Energy Shield (Escudo)*: Custo: `40 C-Coins`. Protege contra 1 colisão com parede, cauda ou orbe do chefe, gerando um domo azul ao redor da cabeça da cobra.
        *   *Fruit Magnet (Ímã)*: Custo: `60 C-Coins`. Atrai frutas normais e especiais a até 4 tiles de distância fisicamente por 10 segundos.
        *   *Time Warp (Desacelerador)*: Custo: `30 C-Coins`. Reduz a velocidade de atualização de frames (velocidade da cobra) pela metade por 8 segundos.

4.  **Web Audio API Synth Adaptativa**:
    *   **Trilha Sonora Procedural**:
        *   *Ambient Beat (Fases 1-3)*: Linha de baixo minimalista sub-grave alternando frequências de $65\text{Hz}$ e $82\text{Hz}$ a cada 1.5s com percussão sintetizada por pulsos curtos de ruído branco.
        *   *Boss Combat (Fase 4)*: Um oscilador dente-de-serra rápido a $110\text{Hz}$ com modulação de filtro para criar batidas rápidas (Estilo Cyberpunk 2077).
    *   **Efeitos de Áudio Procedurais**:
        *   *Disparo de Laser*: Sweeps exponenciais descendentes ($1500\text{Hz} \to 200\text{Hz}$) usando osciladores dente-de-serra.
        *   *Detonação / Hit no Chefe*: Ruído branco denso com filtro passa-baixa e decay de ganho longo.
        *   *Compra de Skin*: Arpejo em escala maior rápida com ondas senoidais ($523\text{Hz} \to 659\text{Hz} \to 784\text{Hz} \to 1046\text{Hz}$).

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/snake/index.html`.
*   **Modo de Jogo & Estrutura de Progresso**:
    ```javascript
    let gameMode = 'endless'; // 'endless' ou 'campaign'
    let currentPhase = 1;     // 1 a 4
    let coins = parseInt(localStorage.getItem('snakeCCoins')) || 0;
    
    // Loja de Skins compradas e equipadas
    let purchasedSkins = JSON.parse(localStorage.getItem('snakePurchasedSkins')) || ['default'];
    let equippedSkin = localStorage.getItem('snakeEquippedSkin') || 'default';
    
    // Habilidade ativa comprada (quantidade no inventário)
    let equippedSkill = null; // 'shield', 'magnet', 'timewarp'
    let skillCooldown = false;
    ```
*   **Modelagem de Dados do Chefe (Medusa Grid Core)**:
    ```javascript
    const boss = {
        active: false,
        x: 9, y: 3,         // Posição no grid (ocupa 2x2: x..x+1, y..y+1)
        width: 2, height: 2,
        hp: 100,
        maxHp: 100,
        laserTimer: 0,
        laserActive: false,
        laserDirection: 'vertical', // 'vertical' ou 'horizontal'
        laserCoords: [], // Coordenadas temporárias do feixe
        orbs: [],        // Array de projéteis {x, y, vx, vy, size}
        body: [],        // Segmentos da cauda do chefe para visual e colisão
        phase: 1
    };
    ```
*   **Injeção DOM de Estilo para a Cyber-Shop**:
    Adicionar classes CSS dinâmicas para a interface glassmorphism da loja. Utilizar `backdrop-filter: blur(15px)` e sombras `box-shadow` pulsantes.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Cria um loop de progressão de longo prazo, monetização virtual baseada em moedas e batalha de chefe memorável de nível AAA).
*   **Esforço Estimado**: Alta (Requer controle refinado de estados complexos, colisões de entidades de múltiplos blocos, persistência robusta em `localStorage` e mixer complexo de áudio sintetizado).
*   **Área**: Front-end / UI Overlay / Lógica de Colisão / Web Audio API.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Colisão Bounding Box do Chefe (2x2)
Para checar a colisão da cabeça da cobra do jogador com o Medusa Grid Core (ou para aplicar a D-Fruta explosiva):
```javascript
function checkBossCollision(headX, headY) {
    if (!boss.active) return false;
    // O chefe ocupa a área x até x+1 e y até y+1
    if (headX >= boss.x && headX < boss.x + boss.width &&
        headY >= boss.y && headY < boss.y + boss.height) {
        return true;
    }
    // Opcional: verificar colisão com os apêndices de código (segmentos do chefe)
    return boss.body.some(seg => seg.x === headX && seg.y === headY);
}
```

### 2. Algoritmo de Movimento do Ímã de Frutas (Fruit Magnet)
Se a habilidade `Fruit Magnet` estiver ativa e a distância Manhattan $\Delta d = |x_{head} - x_{food}| + |y_{head} - y_{food}| \le 4$:
```javascript
function applyFruitMagnet(dt) {
    if (!equippedSkill === 'magnet' || !skillActive) return;
    
    const head = snake[0];
    const dx = Math.sign(head.x - food.x);
    const dy = Math.sign(head.y - food.y);
    
    // A fruta é "puxada" 1 tile em direção à cobra a cada 2 ticks
    if (Math.random() < 0.5) {
        const nextX = food.x + dx;
        const nextY = food.y + dy;
        // Impedir que a fruta seja arrastada para cima de paredes
        const maze = getCurrentMaze();
        if (!maze.some(w => w.x === nextX && w.y === nextY)) {
            food.x = nextX;
            food.y = nextY;
            createPortalBurst(food.x, food.y);
        }
    }
}
```

### 3. Síntese do Eye Laser do Chefe
```javascript
function playLaserSound() {
    if (!audioContext || audioContext.state === 'suspended') return;
    
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, audioContext.currentTime + 1.2);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 1.2);
    
    gainNode.gain.setValueAtTime(0.18, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1.2);
    
    osc.connect(filter).connect(gainNode).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 1.2);
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Persistência da Habilidade Ativa**: Se o jogador comprar consumíveis (Escudo, Ímã) na Cyber-Shop, a quantidade comprada deve ser consumida imediatamente ao carregar a partida ou apenas quando o jogador pressionar `Space` e ativar a habilidade? 
    *   *Direcionamento do PO*: Apenas 1 slot de habilidade ativa pode ser equipado por partida. A habilidade é consumida ao iniciar a partida (prevenindo abusos de reiniciar sem perder o item).
2.  **Obstáculos Móveis na Fase 2**: O movimento das barreiras físicas móveis deve empurrar a cobra do jogador se houver colisão física, ou deve tratá-la como uma parede comum, matando instantaneamente o jogador em caso de sobreposição?
    *   *Direcionamento do PO*: Tratar como parede comum. O movimento deve ser previsível (com avisos visuais no grid como contornos ciano antes de se moverem) para que o jogador use sua velocidade de reflexo para contornar.
3.  **Tamanho Máximo da Cobra na Fase 4**: A batalha contra o chefe exige maior precisão de manobra. A cobra continuará crescendo se o jogador pegar D-Frutas?
    *   *Direcionamento do PO*: Sim, o crescimento da cobra continua a ocorrer, adicionando o desafio clássico de se contorcer enquanto desvia dos lasers do Medusa Grid Core.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Conflito de Teclas**: **Decisão:** Mude a ativação do item (habilidade especial) para a tecla `Shift` ou `E`. A barra de espaço continua como Speed Boost padrão.
2. **Colisão de Ataque com o Chefão**: **Decisão:** Qualquer parte da cobra carrega a imunidade da D-Fruta enquanto o efeito estiver ativo, e o impacto anula a colisão letal. Porém, idealmente a colisão pela **cabeça** contra a hitbox do chefe causará o dano.
3. **Padrão de Movimento do Chefão**: **Decisão:** Movimento lateral oscilatório senoidal leve na metade superior da tela, para dificultar o timing do ataque.
4. **Barreiras na Fase 2**: **Decisão:** Surgem a um quarto e a três quartos da altura da tela, oscilando num espaço vertical de $\pm 2$ blocos em relação ao seu eixo original.
5. **Spawn das Ciber-Moedas**: **Decisão:** A ciber-moeda spawna *fisicamente* no grid junto com a fruta e o jogador deve escolhê-la coletar (risco extra). Se recolher, soma ao `localStorage`.

---

## 🔍 Code Review

- **Data da Revisão**: 2026-08-02
- **Revisor**: Tech Lead (TL)
- **Resultado**: ✅ **Aprovado para QA (Ready for QA)**

### 📊 Avaliação Geral do Código
1. **Modo Campanha de 4 Fases**: Fases 1 a 3 com transições elegantes, avisos visuais de barreiras móveis e reposicionamento central da cobra.
2. **Chefão Medusa Grid Core**: Hitbox 2x2 com movimento senoidal, lasers de varredura com estresse telegrafado e cinzas permanentes, orbes corrompidos com quique físico e D-Frutas explosivas para causar 25 HP de dano por acerto.
3. **Cyber-Shop & Economia**: Persistência de `snakeCCoins` em `localStorage`, skins cosméticas (RGB Pulse, Cyber-Ghost) e habilidades ativas (Energy Shield, Fruit Magnet, Time Warp) via tecla `Shift`.
4. **Áudio Adaptativo**: Web Audio API com synth sub-grave para fases normais, batida acelerada Cyberpunk para chefão e FX procedurais (laser, detonação, compra).

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `snake`
* **Status do Backlog**: Transicionado para `Ready for QA` em `BACKLOG.md`.


