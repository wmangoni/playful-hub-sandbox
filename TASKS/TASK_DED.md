# 📝 TASK-DED: Sistema de Inventário Visual e Combates Baseados em Atributos (Rolagem D20)

## 👤 User Story
*   **Como** jogador do minijogo **RPG Adventure Quest**,
*   **Eu quero** gerenciar itens em um inventário visual e ver combates resolvidos com testes de rolagens de dados (D20) baseados nos meus atributos (Força, Destreza, Inteligência, Sabedoria),
*   **Para que** a experiência de jogo se aproxime de uma verdadeira mesa de Dungeons & Dragons, com escolhas mais estratégicas e aleatoriedade emocionante.

---

## 🎯 Critérios de Aceitação
1.  **Ficha de Personagem & Modificadores**:
    *   Exibir uma ficha compacta do personagem no topo ou canto lateral da tela contendo: Força (STR), Destreza (DEX), Inteligência (INT), Sabedoria (WIS) e Pontos de Vida (HP).
    *   Os modificadores devem afetar diretamente as opções de escolha da história (ex: "[Teste de Força] Tentar arrombar a porta pesada").
2.  **Sistema de Inventário Visual**:
    *   Criar um modal ou área na tela que exiba slots de itens (limite de 6 slots).
    *   O jogador deve poder coletar armas (ex: Espada Longa, Cajado), armaduras (ex: Cota de Malha) e consumíveis (ex: Poção de Cura) ao longo dos eventos.
    *   Consumíveis podem ser clicados para restaurar HP ou conceder bônus temporários.
3.  **Animação e Resolução de Rolagem de Dados (D20)**:
    *   Ao selecionar uma ação que envolva teste (ex: combate ou persuasão), exibir uma animação curta de um dado de 20 lados (D20) girando.
    *   Calcular o resultado: `Valor Rolado + Modificador de Atributo` versus a Classe de Dificuldade (Difficulty Class - DC) do desafio.
    *   Exibir mensagens vibrantes para "Sucesso Decisivo (Natural 20)" e "Falha Crítica (Natural 1)".

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/ded/index.html` (e scripts internos).
*   **Estrutura de Dados do Jogador**:
    ```javascript
    const playerState = {
      attributes: { str: 12, dex: 15, int: 10, wis: 14 },
      hp: 20,
      maxHp: 20,
      inventory: [],
      equippedWeapon: null,
      equippedArmor: null
    };
    ```
*   **Interface Gráfica (UI)**:
    *   Usar CSS Grid/Flexbox para o painel lateral de ficha e inventário.
    *   Design retro/glassmorphic com bordas douradas elegantes combinando com o tema fantástico.
    *   Para o dado 3D/2D, usar animações CSS `@keyframes` simulando a rolagem ou um canvas de rotação simples.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Mecânica principal para transformar a aventura textual em um RPG completo).
*   **Esforço Estimado**: Alta (Requer refatoração do fluxo narrativo para suportar testes de atributos).
*   **Área**: Front-end / State Management / UI.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os passos, a modelagem de dados, as regras matemáticas do sistema D20 e as estruturas de código necessárias para a implementação premium de **Ficha de Personagem**, **Inventário Visual por Slots** e **Rolagem de D20 Animada**.

### 1. Ficha de Personagem (Character Sheet) e Modificadores
*   **Fórmula do Modificador D&D 5e**:
    O modificador de atributo é calculado como: `Math.floor((atributo - 10) / 2)`.
    Devemos expor uma função utility `getStatModifier(stat)` no escopo principal:
    ```javascript
    function getStatModifier(statName) {
        const playerStats = gameState.player.stats;
        const statValue = playerStats[statName];
        if (statValue === undefined) return 0;
        return Math.floor((statValue - 10) / 2);
    }
    ```

*   **Estrutura de UI da Ficha de Personagem**:
    Substituir ou enriquecer o painel `#game-screen .stats` para incluir uma seção lateral dedicada à ficha do herói com seu respectivo modificador visual.
    
    ```html
    <!-- Painel de Atributos e Vida Compacto -->
    <div class="character-panel">
        <div class="character-stats-grid">
            <div class="stat-card" title="Força">
                <span class="stat-emoji">💪</span>
                <span class="stat-label">FOR (STR)</span>
                <span class="stat-val" id="val-str">10</span>
                <span class="stat-mod" id="mod-str">(+0)</span>
            </div>
            <div class="stat-card" title="Destreza">
                <span class="stat-emoji">🏹</span>
                <span class="stat-label">DES (DEX)</span>
                <span class="stat-val" id="val-dex">10</span>
                <span class="stat-mod" id="mod-dex">(+0)</span>
            </div>
            <div class="stat-card" title="Inteligência">
                <span class="stat-emoji">🧠</span>
                <span class="stat-label">INT (INT)</span>
                <span class="stat-val" id="val-int">10</span>
                <span class="stat-mod" id="mod-int">(+0)</span>
            </div>
            <div class="stat-card" title="Sabedoria">
                <span class="stat-emoji">👁️</span>
                <span class="stat-label">SAB (WIS)</span>
                <span class="stat-val" id="val-wis">10</span>
                <span class="stat-mod" id="mod-wis">(+0)</span>
            </div>
        </div>
    </div>
    ```

*   **Estilização HSL / Glassmorphic Premium**:
    ```css
    .character-panel {
        background: rgba(45, 38, 30, 0.65);
        border: 2px solid #c5a880;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }
    .character-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
    }
    .stat-card {
        background: linear-gradient(135deg, rgba(80, 65, 50, 0.4), rgba(40, 32, 25, 0.4));
        border: 1px solid rgba(197, 168, 128, 0.3);
        border-radius: 4px;
        padding: 6px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: all 0.2s ease;
    }
    .stat-card:hover {
        border-color: #ffd700;
        transform: translateY(-2px);
    }
    .stat-label {
        font-size: 0.75rem;
        color: #a0907c;
        font-weight: bold;
    }
    .stat-val {
        font-size: 1.1rem;
        font-weight: bold;
        color: #ffffff;
    }
    .stat-mod {
        font-size: 0.8rem;
        color: #ffd700;
        font-weight: bold;
    }
    ```

*   **Modificadores Visuais nas Escolhas da Narrativa**:
    Na função `addChoiceInCurrentScene(scene, diceContainer, choicesElement)`, ao iterar sobre as escolhas, se `choice.requiresCheck` for verdadeiro, adicionar de forma rica o modificador no texto do botão:
    ```javascript
    scene.choices.forEach(choice => {
        const button = document.createElement('button');
        let buttonText = choice.text;
        
        if (choice.requiresCheck && choice.checkType && choice.checkType !== 'luck' && choice.checkType !== 'combat') {
            const mod = getStatModifier(choice.checkType);
            const sign = mod >= 0 ? `+${mod}` : `${mod}`;
            buttonText = `[Teste de ${choice.checkType.toUpperCase()} ${sign}] ${choice.text}`;
            button.classList.add('btn-check-choice');
        }
        button.textContent = buttonText;
        ...
    });
    ```

### 2. Sistema de Inventário Visual com Limite de 6 Slots
O inventário deixará de ser uma simples lista de texto e passará a ser uma matriz visual baseada em slots.

*   **Definição dos Tipos de Itens (Database)**:
    Mapearemos os atributos e efeitos de consumíveis e equipamentos:
    ```javascript
    const ITEM_DATABASE = {
        "Poção de Vida": { type: "consumable", subtype: "heal", value: 10, emoji: "🫙", desc: "Recupera 10 HP" },
        "Poção de cura": { type: "consumable", subtype: "heal", value: 10, emoji: "🫙", desc: "Recupera 10 HP" },
        "Carne Seca": { type: "consumable", subtype: "heal", value: 4, emoji: "🍖", desc: "Recupera 4 HP" },
        "Cantil de Água": { type: "consumable", subtype: "heal", value: 2, emoji: "🍶", desc: "Recupera 2 HP" },
        "Espada": { type: "weapon", value: 3, emoji: "⚔️", desc: "+3 Ataque" },
        "Machado": { type: "weapon", value: 4, emoji: "🪓", desc: "+4 Ataque" },
        "Adaga": { type: "weapon", value: 2, emoji: "💀", desc: "+2 Ataque" },
        "Escudo": { type: "armor", value: 4, emoji: "🛡️", desc: "+4 Defesa" },
        "Corda": { type: "utility", emoji: "🪢", desc: "Item utilitário" },
        "Tocha": { type: "utility", emoji: "🔦", desc: "Item utilitário" }
    };
    ```

*   **Lógica de Slots do Inventário**:
    O inventário possuirá tamanho fixo de **6 slots**.
    ```javascript
    const INVENTORY_CAPACITY = 6;
    
    function addToInventory(item) {
        if (gameState.player.inventory.length >= INVENTORY_CAPACITY) {
            addToLog("🎒 Sua mochila está cheia! Não há slots livres.");
            alert("Mochila Cheia! Remova algum item para liberar espaço.");
            return false;
        }
        gameState.player.inventory.push(item);
        updateInventoryDisplay();
        addToLog(`Adicionado ${item} ao seu inventário.`);
        return true;
    }
    ```

*   **Renderização e Uso de Consumíveis na UI**:
    O jogador poderá clicar em itens consumíveis diretamente na tela para consumi-los e regenerar vida.
    
    ```javascript
    function updateInventoryDisplay() {
        const inventoryItemsElement = document.getElementById('inventory-items');
        if (!inventoryItemsElement) return;
        inventoryItemsElement.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.className = 'inventory-slots-grid';
        
        for (let i = 0; i < INVENTORY_CAPACITY; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot-box';
            
            const item = gameState.player.inventory[i];
            if (item) {
                const dbItem = ITEM_DATABASE[item] || { emoji: "📦", desc: "Item", type: "utility" };
                slot.classList.add('occupied');
                slot.innerHTML = `
                    <span class="item-emoji">${dbItem.emoji}</span>
                    <span class="item-name">${item}</span>
                    <div class="item-tooltip">${dbItem.desc}</div>
                `;
                
                // Se for consumível, permite clicar para usar
                if (dbItem.type === 'consumable') {
                    slot.classList.add('usable');
                    slot.onclick = () => useConsumableItem(item, i);
                }
            } else {
                slot.innerHTML = `<span class="empty-slot-text">Vazio</span>`;
            }
            grid.appendChild(slot);
        }
        inventoryItemsElement.appendChild(grid);
    }
    
    function useConsumableItem(itemName, index) {
        const dbItem = ITEM_DATABASE[itemName];
        if (!dbItem || dbItem.type !== 'consumable') return;
        
        if (dbItem.subtype === 'heal') {
            if (gameState.player.health >= gameState.player.maxHealth) {
                addToLog("❤️ Sua saúde já está no máximo!");
                return;
            }
            
            // Consumir
            gameState.player.inventory.splice(index, 1);
            changeHealth(dbItem.value); // Função interna que adiciona HP
            addToLog(`✨ Você usou ${itemName} e recuperou ${dbItem.value} HP!`);
            updateInventoryDisplay();
        }
    }
    ```

*   **CSS dos Slots Gráficos**:
    ```css
    .inventory-slots-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 8px;
    }
    .inventory-slot-box {
        background: rgba(30, 25, 20, 0.6);
        border: 2px dashed rgba(197, 168, 128, 0.4);
        border-radius: 5px;
        height: 65px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        font-family: inherit;
        transition: all 0.2s ease;
        box-sizing: border-box;
    }
    .inventory-slot-box.occupied {
        border: 2px solid #c5a880;
        background: linear-gradient(to bottom, #504030, #382c20);
        cursor: default;
    }
    .inventory-slot-box.usable {
        cursor: pointer;
    }
    .inventory-slot-box.usable:hover {
        border-color: #ffd700;
        box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
        transform: scale(1.05);
    }
    .empty-slot-text {
        font-size: 0.75rem;
        color: #605040;
        font-style: italic;
    }
    .item-emoji {
        font-size: 1.4rem;
        margin-bottom: 2px;
    }
    .item-name {
        font-size: 0.65rem;
        color: #e0dacd;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap;
        width: 90%;
    }
    /* Tooltip flutuante estilizado */
    .item-tooltip {
        display: none;
        position: absolute;
        bottom: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a120b;
        border: 1px solid #c5a880;
        color: #f0e0d0;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 0.7rem;
        white-space: nowrap;
        z-index: 50;
        pointer-events: none;
        box-shadow: 0 3px 6px rgba(0,0,0,0.5);
    }
    .inventory-slot-box:hover .item-tooltip {
        display: block;
    }
    ```

### 3. Animação D20 e Resolução de Críticos (Natural 20 & 1)
Substituir o dado 2D de texto estático por uma experiência dinâmica com Blur de rotação de alta performance visual.

*   **CSS da Animação do Dado**:
    ```css
    @keyframes d20-epic-roll {
        0% { transform: scale(1) rotate(0deg); filter: blur(0); }
        20% { transform: scale(1.3) rotate(180deg); filter: blur(2px); color: #c5a880; }
        40% { transform: scale(1.4) rotate(540deg); filter: blur(3px); color: #ffd700; }
        60% { transform: scale(1.3) rotate(900deg); filter: blur(2px); }
        85% { transform: scale(1.1) rotate(1150deg); filter: blur(1px); }
        100% { transform: scale(1) rotate(1260deg); filter: blur(0); }
    }
    
    .dice {
        width: 65px;
        height: 65px;
        background: linear-gradient(135deg, #8b0000, #4a0000);
        border: 2px solid #ffd700;
        color: #ffffff;
        font-family: 'MedievalSharp', cursive, serif;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        font-weight: bold;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.3);
    }
    
    .dice.rolling-animation {
        animation: d20-epic-roll 1.3s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    }
    
    /* Classes de feedback visual imediato na rolagem */
    .critical-success-bg {
        animation: crit-glow 1.5s infinite alternate;
    }
    
    @keyframes crit-glow {
        from { box-shadow: 0 0 10px #ffd700; }
        to { box-shadow: 0 0 25px #ff8c00, 0 0 10px #ffd700; }
    }
    ```

*   **JS de Resolução e Animação**:
    Ajustar a função `rollDice()` para implementar os efeitos cinemáticos e tratar regras críticas clássicas de D&D:
    
    ```javascript
    function rollDice() {
        disactiveDiceButton();
        
        const diceElement = document.getElementById('dice');
        const resultMessageElement = document.getElementById('result-message');
        const diceContainer = document.getElementById('dice-container');
        
        // Ativar animação de rotação
        diceElement.classList.add('rolling-animation');
        diceElement.textContent = "?";
        resultMessageElement.classList.add('hidden');
        
        // Simular o delay dramático do giro físico
        setTimeout(() => {
            // Parar animação e calcular resultado real
            diceElement.classList.remove('rolling-animation');
            
            const diceResult = Math.floor(Math.random() * 20) + 1;
            diceElement.textContent = diceResult;
            
            let checkSuccess = false;
            let logMessage = "";
            let resultText = "";
            
            const checkType = gameState.mem.checkType;
            
            // 1. Resolução de Críticos Naturais (Regra Oficial D&D)
            if (diceResult === 20) {
                // Natural 20 é Sucesso Decisivo automático!
                checkSuccess = true;
                resultText = "💥 SUCESSO DECISIVO! (Natural 20)";
                resultMessageElement.className = "result-message success critical-success-bg";
                logMessage = `🎲 ROLAGEM: Natural 20! Sucesso Crítico automático no teste de ${checkType.toUpperCase()}!`;
            } else if (diceResult === 1) {
                // Natural 1 é Falha Crítica automática!
                checkSuccess = false;
                resultText = "💀 FALHA CRÍTICA! (Natural 1)";
                resultMessageElement.className = "result-message failure";
                logMessage = `🎲 ROLAGEM: Natural 1! Falha Crítica automática no teste de ${checkType.toUpperCase()}!`;
            } else {
                // 2. Resolução Regular de Testes com Modificadores
                let modifiedRoll = diceResult;
                let statBonus = 0;
                
                if (checkType !== 'luck' && checkType !== 'combat') {
                    statBonus = getStatModifier(checkType);
                    modifiedRoll += statBonus;
                }
                
                const difficulty = gameState.checkDifficulty;
                const bonusString = statBonus >= 0 ? `+${statBonus}` : `${statBonus}`;
                
                if (modifiedRoll >= difficulty) {
                    checkSuccess = true;
                    resultText = `Sucesso! (${modifiedRoll} vs DC ${difficulty})`;
                    resultMessageElement.className = "result-message success";
                    logMessage = `🎲 ROLAGEM: ${diceResult} ${bonusString} = ${modifiedRoll} vs Dificuldade ${difficulty}. 👍 Sucesso!`;
                } else {
                    checkSuccess = false;
                    resultText = `Falha! (${modifiedRoll} vs DC ${difficulty})`;
                    resultMessageElement.className = "result-message failure";
                    logMessage = `🎲 ROLAGEM: ${diceResult} ${bonusString} = ${modifiedRoll} vs Dificuldade ${difficulty}. 👎 Falha!`;
                }
            }
            
            // Exibir mensagens visuais e logs
            resultMessageElement.textContent = resultText;
            resultMessageElement.classList.remove('hidden');
            addToLog(logMessage);
            
            // Transição suave de cena pós-resultado
            setTimeout(() => {
                diceContainer.classList.add('hidden');
                resultMessageElement.classList.add('hidden');
                choicesElement.classList.remove('hidden');
                
                const nextScene = checkSuccess ? 
                    (gameState.mem.nextSceneSuccess || `${gameState.currentScene}_success`) :
                    (gameState.mem.nextSceneFailure || `${gameState.currentScene}_failure`);
                
                loadScene(nextScene);
                gameState.pendingCheck = null;
                diceElement.textContent = "🎲";
                activeDiceButton();
            }, 2000); // 2 segundos para o jogador apreciar o resultado crítico
            
        }, 1300); // Duração da animação d20
    }
    ```

