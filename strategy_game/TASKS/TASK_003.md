# 📝 TASK-STRATEGY_GAME: Unidades Militares Ativas, Acampamentos Bárbaros e Captura de Relíquias Sagradas

## 👤 User Story
*   **Como** imperador e general do minijogo **Strategy Empire**,
*   **Eu quero** recrutar e comandar unidades militares no grid, combater incursões de saqueadores bárbaros que emergem de acampamentos ocultos e capturar relíquias sagradas para depositá-las em meus templos,
*   **Para que** o jogo se transforme em uma experiência tática interativa em tempo real, com ciclos ricos de risco, recompensa e feedbacks audiovisuais imersivos.

---

## 🎯 Critérios de Aceitação

1.  **Recrutamento e Movimentação de Unidades Militares**:
    *   O jogador deve poder treinar 3 tipos de unidades a partir de qualquer quartel (*Barracks*) de sua propriedade:
        *   **Batedor (Scout - 🕵️)**: Custo: `40 Ouro` e `20 Comida`. Movimento: `2 tiles/turno`. Visão: `3 tiles`. Força de Combate: `1`.
        *   **Soldado (Soldier - ⚔️)**: Custo: `60 Ouro` e `40 Comida`. Movimento: `1 tile/turno`. Visão: `2 tiles`. Força de Combate: `3`.
        *   **Catapulta (Trebuchet - 🎯)**: Custo: `100 Ouro` e `60 Madeira`. Movimento: `1 tile/turno` (não pode mover e atacar no mesmo turno). Visão: `1 tile`. Alcance de Ataque: `2 tiles` (ortogonal/diagonal). Força de Combate: `6`.
    *   **Controle de Seleção e Movimentação**:
        *   Clicar em uma unidade seleciona-a, exibindo um contorno neon ciano pulsante em torno do tile correspondente.
        *   Com a unidade selecionada, clicar em um tile válido adjacente (dentro do alcance de movimento) move a unidade para lá.
        *   Unidades não podem passar ou parar em tiles de Água (`water`).
        *   Os pontos de movimento das unidades são totalmente restaurados a cada ciclo de atualização de recursos (ticks de 5 segundos).
2.  **Acampamentos Bárbaros (⛺) e Saqueadores (🪓)**:
    *   No início do jogo, 2 a 3 **Acampamentos Bárbaros (⛺)** devem ser gerados de forma determinística em tiles de grama sob a névoa de guerra cinza (visibilidade `1` ou inexplorados `0`), distantes pelo menos 4 tiles do castelo inicial do jogador.
    *   A cada 15 segundos (3 ticks de recursos), cada acampamento tem **20% de chance** de spawnar um **Saqueador Bárbaro (🪓)** (Força de Combate: `2`, Movimento: `1 tile`).
    *   O Saqueador move-se ativamente em direção à construção mais próxima pertencente ao jogador ou facções vizinhas da IA.
    *   Ao atingir um prédio, o Saqueador o saqueia: destrói a construção (reverte o tile para `'grass'`), subtrai `50 de Ouro` e `50 de Comida` do estoque do proprietário (se for o jogador) e desintegra-se em seguida.
3.  **Captura e Depósito de Relíquias Sagradas (🏆)**:
    *   Quando um Acampamento Bárbaro é destruído por unidades do jogador, o tile do acampamento é limpo e uma **Relíquia Sagrada (🏆)** surge no local.
    *   Ao mover um Batedor (🕵️) ou Soldado (⚔️) para o tile da Relíquia, a unidade a coleta automaticamente (um pequeno ícone de troféu dourado `🏆` deve ser renderizado acima do caractere/avatar da unidade).
    *   A unidade carregando a relíquia deve ser escoltada de volta a um **Templo (Temple - 🏛️)** de propriedade do jogador.
    *   Ao entrar no Templo com a relíquia, o artefato é depositado e consome-se a relíquia da unidade.
    *   Cada Templo ativo comporta no máximo **1 Relíquia**.
    *   O depósito de uma Relíquia abre um pop-up elegante (glassmorphic modal) permitindo que o jogador selecione **1 Bênção Permanente** para seu império:
        *   *Bênção da Terra*: `+20%` na produção de Comida de todas as Fazendas.
        *   *Bênção do Comércio*: `+20%` na produção de Ouro de todas as Minas e Castelos.
        *   *Bênção da Força*: `+1` de Força de Combate para todas as unidades militares terrestres do jogador.
4.  **Combates Táticos, Efeitos de Juice e Áudio Procedural**:
    *   **Resolução de Combate**:
        *   Quando uma unidade do jogador move-se para o mesmo tile de um Saqueador Bárbaro ou Acampamento, inicia-se um combate.
        *   O resultado é baseado nos valores de Força de Combate, somados a modificadores de terreno (ex: unidades em tiles de Muralha `wall` ganham `+2 de defesa`).
        *   A unidade com menor poder acumulado é eliminada. Se houver empate, ambas sofrem dano e a defensora prevalece com 50% de chance.
    *   **Efeitos Visuais (Juiciness)**:
        *   Conflitos militares e saques de prédios devem disparar uma animação de faíscas/explosões vermelhas neon no Canvas de sobreposição e um tremor de tela (*screen shake*) por 200ms.
    *   **Áudio Procedural via Web Audio API**:
        *   *Disparo de Catapulta*: Ruído filtrado de baixa frequência simulando a tensão da corda seguido pelo impacto.
        *   *Confronto Militar*: Tons metálicos dissonantes simulando o tilintar de espadas.
        *   *Depósito de Relíquia*: Uma fanfarra harmônica ascendente relaxante baseada na escala pentatônica maior.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/strategy_game/script.js`, `/strategy_game/index.html` e `/strategy_game/style.css`.
*   **Modelagem de Dados de Entidades (Unidades e Acampamentos)**:
    Mapearemos todas as unidades e acampamentos ativos através de um array global `entities`:
    
    ```javascript
    let entities = [];
    // Estrutura de objeto de unidade:
    // {
    //     id: 'unit_123',
    //     type: 'soldier', // 'scout', 'soldier', 'trebuchet', 'barbarian', 'camp'
    //     owner: 'player', // 'player', 'barbarian', 'valoria', 'krugar'
    //     tileIndex: 45,   // Posição no grid (0-299)
    //     movesLeft: 1,
    //     maxMoves: 1,
    //     combatPower: 3,
    //     hasRelic: false
    // }
    ```

*   **Renderização sobre o Grid**:
    Para manter a integridade visual sem quebrar o layout CSS grid do mapa do jogo, as unidades e acampamentos devem ser injetados dinamicamente como **divs filhos absolutos** (`.unit-token`) dentro dos respectivos elementos `.tile` correspondentes no DOM.
    *   Isso evita a sobrescrita do `tile.dataset.type` do terreno subjacente (como `grass`, `wall` ou `captured-castle`), garantindo que o batedor possa caminhar sobre uma muralha ou mina sem desintegrar a estrutura física do grid.

*   **Lógica de Movimento do Saqueador Bárbaro (IA)**:
    A cada tick de turno da IA, o saqueador varre o grid em busca do prédio mais próximo que possua `tile.dataset.type` diferente de `'grass'`, `'water'` e `'enemy-castle'`.
    Utilizar o cálculo de distância Chebyshev para encontrar o alvo mais próximo e mover-se 1 passo em direção a ele:
    
    ```javascript
    function moveBarbarianRaider(raider) {
        const target = findClosestBuilding(raider.tileIndex);
        if (!target) return;
        
        const currentX = raider.tileIndex % 20;
        const currentY = Math.floor(raider.tileIndex / 20);
        const targetX = target.index % 20;
        const targetY = Math.floor(target.index / 20);
        
        // Determina a direção do passo (-1, 0, 1) nos eixos
        const dx = Math.sign(targetX - currentX);
        const dy = Math.sign(targetY - currentY);
        
        const nextX = currentX + dx;
        const nextY = currentY + dy;
        const nextIndex = nextY * 20 + nextX;
        
        // Verifica se o próximo tile é transitável (não é água)
        const nextTile = document.querySelectorAll('.tile')[nextIndex];
        if (nextTile && nextTile.dataset.type !== 'water') {
            executeEntityMove(raider, nextIndex);
        }
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Essencial para transformar o simulador de impérios estático em uma batalha tática ativa por recursos e domínio territorial).
*   **Esforço Estimado**: Alta (Requer controle rigoroso de sobreposição no DOM, movimentação coordenada de entidades e sintetizador de ondas Web Audio API).
*   **Área**: Front-end / Motor de Turnos / UI Dinâmica / Síntese de Áudio.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os métodos, estruturas de estilo e algoritmos necessários para a execução segura da TASK_003 pelo desenvolvedor responsável.

### 1. Injeção de CSS para Unidades e Relíquias ([style.css](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/style.css))

Adicionar ao arquivo de estilos do jogo as regras para exibição neon das fichas de unidades e partículas:

```css
/* Container de Ficha de Unidade */
.unit-token {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #111;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    box-shadow: 0 0 8px currentColor;
    z-index: 10;
    pointer-events: none; /* Permite clicar no tile por trás */
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Unidades do Jogador */
.unit-player {
    border: 2px solid #00ffff;
    color: #00ffff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
}

/* Unidades Bárbaras */
.unit-barbarian {
    border: 2px solid #ff3333;
    color: #ff3333;
    box-shadow: 0 0 10px rgba(255, 51, 51, 0.6);
}

/* Efeito de Unidade Selecionada no Grid */
.tile.unit-selected {
    outline: 2px dashed #00ffff;
    outline-offset: -3px;
    animation: pulseOutline 1s infinite alternate;
}

@keyframes pulseOutline {
    0% { outline-color: rgba(0, 255, 255, 0.4); }
    100% { outline-color: rgba(0, 255, 255, 1); }
}

/* Badge de Relíquia sobre a Unidade */
.relic-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 10px;
    background: #ffd700;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 5px #ffd700;
}
```

### 2. Algoritmo de Combate e Captura de Relíquias

```javascript
function resolveTacticalCombat(attacker, defender) {
    let attackPower = attacker.combatPower;
    let defensePower = defender.combatPower;
    
    // Modificadores de Terreno
    const defenderTile = document.querySelectorAll('.tile')[defender.tileIndex];
    if (defenderTile.dataset.type === 'wall') {
        defensePower += 2; // Bônus de muralha
        addEvent(`Defense bonus: Wall grants +2 defense to the defender!`);
    }
    
    // Bênção ativa
    if (attacker.owner === 'player' && activeBlessings.strength) {
        attackPower += 1;
    }
    if (defender.owner === 'player' && activeBlessings.strength) {
        defensePower += 1;
    }
    
    addEvent(`Combat! Attacker (${attacker.type}) Power: ${attackPower} vs Defender (${defender.type}) Power: ${defensePower}`);
    
    if (attackPower >= defensePower) {
        // Vitória do atacante
        eliminateEntity(defender);
        attacker.tileIndex = defender.tileIndex; // Atacante ocupa o espaço
        triggerScreenShake(200);
        playCombatSound();
        addEvent(`Victory! ${attacker.type} defeated ${defender.type}!`);
    } else {
        // Vitória do defensor
        eliminateEntity(attacker);
        triggerScreenShake(150);
        playCombatSound();
        addEvent(`Defeat! ${attacker.type} was repelled by ${defender.type}!`);
    }
    
    // Se o defensor era o Acampamento Bárbaro, gera a relíquia no tile
    if (defender.type === 'camp') {
        spawnRelic(defender.tileIndex);
    }
    
    recalculateVision();
    renderEntities();
}
```

### 3. Síntese de Efeitos Sonoros com Web Audio API

Para que a atmosfera sonora funcione perfeitamente sem o carregamento de arquivos externos grandes:

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playCombatSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Sintetiza um som metálico estourado
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.2);
    osc2.stop(audioCtx.currentTime + 0.2);
}
```

---

*Assinado: Antigravity - Senior Game Product Owner (PO)*

**Status**: `✅ Refined`

---

## 🔍 Homologação do Refinamento Técnico (Tech Lead)

### 1. Modelagem de Entidades no Grid DOM
* **Decisão**: A arquitetura de injeção absoluta `.unit-token` para unidades e acampamentos dentro dos elementos `.tile` do CSS Grid é impecável. Ela garante que o terreno (`dataset.type`) não seja sobrescrito e previne bugs de desintegração de estruturas físicas (ex: batedores passando sobre minas sem destruí-las).
* **Atenção no Dev**: Certificar de que `pointer-events: none` esteja ativo no container das unidades para que cliques de movimentação/seleção nos tiles subjacentes continuem funcionando normalmente.

### 2. Comportamento e IA de Saqueadores Bárbaros
* **Decisão**: A heurística Chebyshev é a escolha correta para movimentação em 8 direções no grid quadrado de 15x20.
* **Segurança**: Como Tech Lead, ordeno que o Castelo Principal/Inicial seja excluído das rotas de destruição aleatória dos Saqueadores caso seja a única estrutura restante do jogador, evitando Game Over instantâneo e frustrante.

### 3. Web Audio API e Otimização
* **Decisão**: A síntese pura de áudio deve respeitar a suspensão automática até o primeiro clique do usuário, conforme acordado nas diretrizes gerais de navegadores.

**Refinamento Aprovado e Homologado para Desenvolvimento.**

*Assinado: Tech Lead (TL) - Antigravity*

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Custo da Catapulta (Madeira vs. Outros Recursos)**: **Decisão:** Siga com a **Opção A**. Mude o custo para `60 Comida` e simplifique a implementação mantendo a UI inalterada por ora, já que gerenciar três recursos requererá maior design de balanceamento econômico que foge do escopo desta tarefa.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `strategy_game`
* **Status do Backlog**: Transicionado para `Ready for QA` em `BACKLOG.md`.

---

## 🔍 Code Review (Tech Lead)

### 📋 Resumo da Revisão de Código
* **Status do Code Review**: `APROVADO` ✅
* **Desenvolvedor**: Responsável pela TASK_003 do Strategy Empire
* **Revisor**: Tech Lead (Antigravity)

### 🛠️ Análise Técnica e Boas Práticas
1. **Arquitetura de Entidades e DOM**:
   - A injeção de tokens `.unit-token` como elementos absolutos mantendo a propriedade `pointer-events: none` foi implementada adequadamente. Preserva a integridade do CSS Grid e do `dataset.type` do terreno.
2. **Sistema de Combate e Ajuste Fino**:
   - Ajuste realizado durante a revisão: garantida a imobilidade posicional da Catapulta (`trebuchet`) durante o combate à distância, evitando que a unidade de cerco fosse teletransportada para o tile alvo atacado.
3. **Áudio Procedural e Efeitos Visuais**:
   - Módulos Web Audio API (tons metálicos de combate, disparo de catapulta e fanfarra de relíquia) bem isolados e protegidos com tratamento `try/catch` e checagem de estado `suspended/resume`.
   - Feedback de impacto visual com *screen shake* e modais *glassmorphic* fluidos e reativos.

**Conclusão**: O código atende plenamente aos critérios de aceitação, padrões arquiteturais e requisitos de performance. Tarefa aprovada para a etapa de Garantia de Qualidade (QA).


