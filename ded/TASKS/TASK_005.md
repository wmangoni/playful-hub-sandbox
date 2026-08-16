# 📝 TASK-DED-005: Sistema de Companheiros/Mascotes de Combate (Pet System), Laboratório de Alquimia & Forja de Runas (Crafting) e Masmorra Volcânica do Dragão Vermelho (Red Dragon's Lair)

## 👤 User Story
*   **Como** jogador destemido e estrategista no minijogo **RPG Adventure Quest**,
*   **Eu quero** adotar e treinar companheiros de combate (Coruja Arcana, Lobo das Sombras e Golem de Pedra) com habilidades ativas e passivas, coletar ervas e minérios rúnicos para forjar elixires e encantar equipamentos em uma mesa de Alquimia/Crafting, e desbravar a Masmorra Volcânica enfrentando o mítico Dragão Vermelho ("Pyrothrax"),
*   **Para que** o jogo atinja uma nova camada de profundidade de RPG de ação/turnos, gerenciamento de inventário, customização de builds de personagem e um clímax apoteótico de combate com visual e áudio procedural inesquecíveis.

---

## 🎯 Critérios de Aceitação

1.  **Sistema de Companheiros/Mascotes de Combate (Pet System & Companion HUD)**:
    *   **Gatilho de Desbloqueio**: Ao encontrar o nó do santuário ancestral (`pet_sanctuary`), o jogador pode resgatar um companheiro à sua escolha para acompanhá-lo na jornada.
    *   **Opções de Companheiros**:
        *   **Coruja Arcana (Aethelgard 🦉)**:
            *   *Passiva (Foco Arcano)*: Restaura `+1` ponto de Mana a cada 2 turnos de combate e concede `+10%` de chance de Acerto Crítico para feitiços e ataques mágicos.
            *   *Ativa (Visão Astral - Tecla P)*: Revela os pontos fracos do inimigo atual, fazendo com que o próximo ataque ou feitiço do jogador cause `+50%` de dano adicional. Cooldown: 3 turnos.
        *   **Lobo das Sombras (Fenris 🐺)**:
            *   *Passiva (Instinto Caçador)*: Ataca automaticamente no final de cada turno do jogador, causando `1d6 + mod_DES` de dano físico ao inimigo ativo.
            *   *Ativa (Mordida Dilacerante - Tecla P)*: Inflige ferimento profundo no alvo, causando sangramento contínuo de `3` de dano por turno durante 3 turnos completos. Cooldown: 3 turnos.
        *   **Golem de Pedra (Granite 🗿)**:
            *   *Passiva (Escudo de Rocha)*: Absorve `20%` de todo o dano físico direto recebido pelo jogador e concede `+2` pontos permanentes na Classe de Armadura (AC).
            *   *Ativa (Provocação Rochosa - Tecla P)*: Intercepta totalmente o próximo ataque inimigo, absorvendo até `15` de dano no lugar do jogador. Cooldown: 4 turnos.
    *   **HUD & Feedback do Mascote**:
        *   Exibir uma moldura glassmorphic compacta com o avatar do mascote ao lado do painel do jogador na tela de combate.
        *   Exibir a barra de energia/lealdade do mascote (100%) e o estado de prontidão da habilidade ativa.

2.  **Laboratório de Alquimia & Forja de Runas (Crafting & Enchanting System)**:
    *   **Coleta de Ingredientes**: Durante a exploração da masmorra, ao vasculhar cenas, o jogador encontra materiais valiosos:
        *   *Erva Sangrenta (Blood Herb 🌿)*: Encontrada em jardins e brejos sombrios.
        *   *Pó de Cristal Arcano (Arcane Dust ✨)*: Extraído de cristais brilhantes e sarcófagos mágicos.
        *   *Minério de Obscuriana (Dark Ore 🪨)*: Coletado em veios rochosos nas profundezas da cripta.
        *   *Escama de Vulcano (Dragon Scale 🐉)*: Obtida em confrontos com vivernes e répteis de magma.
    *   **Mesa de Alquimia/Forja**:
        *   Interface modal glassmorphic (`#crafting-modal`) acessível em pontos seguros (Mercador ou Acampamento do Ferreiro).
        *   **Receitas de Alquimia**:
            *   *Elixir de Vida Absoluta*: `2 Ervas Sangrentas` + `1 Pó de Cristal Arcano` -> Restaura `50 HP` instantaneamente e remove status de veneno/sangramento.
            *   *Poção de Fúria Dracônica*: `1 Erva Sangrenta` + `1 Escama de Vulcano` -> Concede `+5` de dano em todos os ataques por 4 turnos.
        *   **Encantamento Rúnico de Equipamento**:
            *   *Encantamento Rúnico de Fogo*: `2 Minérios de Obscuriana` + `1 Escama de Vulcano` -> Aplica permanentemente `+1d4` de dano de fogo adicional a cada golpe da arma principal equipada.
            *   *Runa de Proteção Arcana*: `2 Pós de Cristal Arcano` + `1 Minério de Obscuriana` -> Concede `+3` de resistência contra danos elementais.

3.  **Masmorra Volcânica & Batalha contra o Dragão Vermelho ("Pyrothrax, o Flagelo de Magma")**:
    *   **Acesso ao Abismo Volcânico**: Após derrotar o chefe da cripta e desbloquear o selo mágico, o minimapa revela 3 novas cenas da Masmorra Volcânica:
        *   *Ponte de Basalto (Magma Surge)*: Ocorre um evento de travessia com jorros de magma. O jogador deve passar em um teste de `DES` (dificuldade 12) ou sofrer `10` de dano de queimadura.
        *   *Ninho de Vivernes*: Combate duplo contra 2 Vivernes de Magma (HP: 35 cada, ataque de baforada flamejante).
        *   *Câmara do Dragão (Pyrothrax's Lair)*: Covil do chefe final.
    *   **Chefão "Pyrothrax, o Flagelo de Magma"**:
        *   **Atributos**: HP: `150`, AC: `16`. Avatar colossal com animação de respiração incandescente.
        *   **Fase 1 (HP > 50%)**:
            *   *Garras de Incêndio*: Causa `2d8 + 4` de dano físico.
            *   *Sopro de Chamas*: Disparado a cada 3 turnos (avisado com faíscas no chão no turno anterior). Causa `3d6` de dano de fogo em área (reduzido pela metade se o jogador usar poção de proteção ou escudo do golem).
        *   **Fase 2 (HP <= 50% - Modo Berserker)**:
            *   A câmara entra em colapso com faíscas caindo do teto! A AC do dragão sobe para `18` e seu dano físico aumenta em `+3`.
            *   *Tempestade de Magma*: Habilidade devastadora usada a cada 2 turnos que causa `4d6` de dano de fogo.
    *   **Loot Lendário & Conquista**:
        *   Derrotar Pyrothrax concede a espada lendária *Lâmina do Destruidor de Dragões* (Dano base: `2d8 + 3`, bônus de `+2d6` contra dragões e répteis), `+500 Ouro`, `+300 XP` e desbloqueia o achievement *"Dragon Slayer"*.

4.  **Juiciness Premium, Partículas & Expansão Sonora Web Audio API**:
    *   **Partículas de Brasas (Magma Particle Engine)**: Renderizar um efeito sutil no Canvas de brasas e fuligem incandescentes subindo verticalmente nas cenas da Masmorra Volcânica.
    *   **Síntese Sonoro Procedural Nativa**:
        *   *Martelada da Forja*: Pulso metálico de alta frequência ($1800\text{Hz}$) seguido por um ruído branco descendente simulando vapor em água fria.
        *   *Rugido de Pyrothrax*: Oscilador dente-de-serra grave ($120\text{Hz} \to 50\text{Hz}$) modulado por ruído e filtro passa-baixa ruidoso simulando estrondo colossal.
        *   *Sopro de Fogo*: Varredura contínua de ruído rosa passa-faixa com envelope de ganho trêmulo simulando chamas.
        *   *Vozes dos Mascotes*: Pia de coruja (oscilador senoidal alto $1200\text{Hz}$ com vibrato), rosnado de lobo ($140\text{Hz}$ passa-baixa) e impacto de pedra ($80\text{Hz}$ com atenuação rápida).

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/ded/index.html`, `/ded/assets/scenes.json`.
*   **Modelo de Estado Global estendido (`gameState`)**:
    ```javascript
    gameState.pet = {
        active: null,            // 'owl', 'wolf', 'golem' ou null
        loyalty: 100,
        skillCooldown: 0,
        astralVisionActive: false
    };
    gameState.crafting = {
        materials: {
            blood_herb: 0,
            arcane_dust: 0,
            dark_ore: 0,
            dragon_scale: 0
        },
        weaponEnchantment: null // null ou { type: 'fire', bonusDamage: '1d4' }
    };
    gameState.bossPyrothrax = {
        active: false,
        hp: 150,
        maxHp: 150,
        phase: 1,
        flameBreathTelegraph: false
    };
    ```

*   **Estrutura da Modal de Crafting (HTML/CSS Glassmorphic)**:
    ```html
    <div id="crafting-modal" class="modal hidden">
        <div class="modal-content glassmorphic-panel">
            <h2>⚒️ Forja Rúnica & Laboratório de Alquimia</h2>
            <div class="materials-bar">
                <span>🌿 Erva: <strong id="cnt-herb">0</strong></span>
                <span>✨ Pó Arcano: <strong id="cnt-dust">0</strong></span>
                <span>🪨 Obscuriana: <strong id="cnt-ore">0</strong></span>
                <span>🐉 Escama: <strong id="cnt-scale">0</strong></span>
            </div>
            <div class="recipes-grid" id="recipes-container">
                <!-- Cards de receitas injetados via JavaScript -->
            </div>
            <button class="btn-close-modal" onclick="closeCraftingModal()">Fechar</button>
        </div>
    </div>
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Adiciona valor imenso de RPG clássico, variedade tática de companheiros, sistema de crafting engajante e uma batalha de chefe épica e memorável).
*   **Esforço Estimado**: Alta (Requer expansão do motor de combate para gerenciar ações automáticas de mascotes, novo sistema de receitas/inventário de materiais, renderizador de partículas de brasas e sintetizador procedural de áudio).
*   **Área**: Gameplay Systems / UI Design / Canvas Particle Effects / Web Audio API.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Ação Automática dos Mascotes no Combate
No final de cada turno do jogador (na função `endPlayerTurn()`):
```javascript
function processPetTurn() {
    if (!gameState.pet.active) return;
    
    // Decrementar cooldown da habilidade ativa
    if (gameState.pet.skillCooldown > 0) {
        gameState.pet.skillCooldown--;
    }
    
    // Passiva do Lobo: Ataque Automático
    if (gameState.pet.active === 'wolf' && gameState.combat.activeEnemy) {
        const dexMod = Math.floor((gameState.player.attributes.DEX - 10) / 2);
        const damage = (Math.floor(Math.random() * 6) + 1) + dexMod;
        gameState.combat.activeEnemy.hp -= damage;
        addToLog(`🐺 Fenris atacou ${gameState.combat.activeEnemy.name} causando ${damage} de dano físico!`);
        playWolfAttackSound();
    }
    
    // Passiva da Coruja: Recuperação de Mana
    if (gameState.pet.active === 'owl') {
        if (!gameState.pet.turnCount) gameState.pet.turnCount = 0;
        gameState.pet.turnCount++;
        if (gameState.pet.turnCount % 2 === 0) {
            gameState.player.mana = Math.min(gameState.player.maxMana, gameState.player.mana + 1);
            addToLog(`🦉 Aethelgard canalizou 1 ponto de Mana para você!`);
            playOwlSound();
        }
    }
}
```

### 2. Algoritmo de Encantamento Rúnico de Armas
Ao calcular o dano físico infligido pelo jogador a um inimigo:
```javascript
function calculateWeaponDamage() {
    let baseDamage = rollDice(gameState.player.weaponDice);
    const strMod = Math.floor((gameState.player.attributes.STR - 10) / 2);
    baseDamage += strMod;
    
    // Verificar Encantamento de Fogo (Crafting)
    if (gameState.crafting.weaponEnchantment && gameState.crafting.weaponEnchantment.type === 'fire') {
        const fireBonus = Math.floor(Math.random() * 4) + 1;
        baseDamage += fireBonus;
        createFireSparkParticle();
        addToLog(`🔥 Seu golpe encantado causa +${fireBonus} de dano de fogo adicional!`);
    }
    
    // Verificar Visão Astral da Coruja
    if (gameState.pet.astralVisionActive) {
        baseDamage = Math.floor(baseDamage * 1.5);
        gameState.pet.astralVisionActive = false; // Consome a carga
        addToLog(`✨ Visão Astral! Golpe crítico na vulnerabilidade do alvo!`);
    }
    
    return baseDamage;
}
```

### 3. Síntese Sonora do Rugido e Sopro do Dragão
```javascript
function playDragonRoarSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, audioCtx.currentTime + 1.2);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(1800, audioCtx.currentTime + 0.5);
    filter.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 1.2);
    
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.3);
    
    osc.connect(filter).connect(gainNode).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.3);
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Troca de Companheiro**: O jogador pode trocar de mascote a qualquer momento no Santuário ou a escolha feita ao resgatar o companheiro deve ser definitiva para a partida inteira?
    *   *Direcionamento do PO*: O jogador pode retornar ao Santuário (`pet_sanctuary`) e trocar de companheiro livremente fora de combate. No entanto, trocar de mascote reseta a barra de lealdade/cooldown para o valor inicial.
2.  **Acúmulo de Encantamentos Rúnicos**: É possível aplicar múltiplos encantamentos na mesma arma (ex: Fogo e Proteção simultaneamente)?
    *   *Direcionamento do PO*: Apenas 1 encantamento rúnico pode estar ativo na arma ao mesmo tempo. Aplicar um novo encantamento substitui o anterior, encorajando escolhas táticas.
3.  **Perigo Ambiental da Ponte de Basalto**: Se o jogador falhar no teste de destreza na ponte de basalto e seu HP cair para 0, dispara o Game Over tradicional?
    *   *Direcionamento do PO*: Sim, perigos ambientais devem respeitar a barra de HP do jogador e a tela de Game Over com a causa da morte ("Devorado pelas chamas de basalto").

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Gestão de Inventário de Materiais**: **Decisão:** Os materiais de crafting serão armazenados em um objeto dedicado `gameState.crafting.materials` separado do inventário de consumíveis normais, garantindo que não ocupem os slots do inventário de combate do jogador.
2. **Integração com o Minimapa SVG**: **Decisão:** Os nós da Masmorra Volcânica receberão estilo visual diferenciado no minimapa SVG (borda vermelha incandescente com sombra `box-shadow` pulsante) para indicar zona de alto perigo.
3. **Equilíbrio da Batalha contra Pyrothrax**: **Decisão:** O aviso telegrafado do Sopro de Chamas exibirá um indicador de alerta flamejante na HUD durante 1 turno inteiro, concedendo a oportunidade perfeita para o jogador usar poções defensivas ou ativar a habilidade do Golem.

---

## 🚀 Status da Especificação

*   **Identificação do Jogo**: `ded` (RPG Adventure Quest)
*   **Status no Backlog Global**: `✅ Refined`
*   **Especificador**: Senior Game Product Owner (PO) - Antigravity
*   **Revisor/Refinador Técnico**: Tech Lead - Antigravity

*Assinado: Antigravity - Tech Lead*

