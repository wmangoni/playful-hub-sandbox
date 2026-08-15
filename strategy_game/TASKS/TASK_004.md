# 📝 TASK-STRATEGY_GAME-004: Árvore de Tecnologias por Eras, Maravilha do Império com Cerco Final e Campeão Imperial Heroico

## 👤 User Story
*   **Como** imperador e estrategista soberano no minijogo **Strategy Empire**,
*   **Eu quero** evoluir meu império através de 3 Eras Tecnológicas distintas (Bronze, Ferro e Imperial), convocar um Campeão Imperial com habilidades táticas ativas, e construir a lendária Maravilha do Império defendendo-a contra uma onda de cerco final de todas as facções rivais e bárbaros,
*   **Para que** o jogo adquira um senso épico de progressão de longo prazo, profundidade tática na gestão de recursos e um clímax gratificante de vitória e hegemonia com rica imersão audiovisual.

---

## 🎯 Critérios de Aceitação

1.  **Árvore de Tecnologias por Eras (Tech Tree & Age Progression)**:
    *   **Painel da Árvore de Tecnologias**: No Castelo Principal (ou Centro Urbano), deve haver um botão para abrir o menu da Árvore Tecnológica em formato modal glassmorphic (`#tech-tree-modal`).
    *   **Progressão em 3 Eras**:
        *   **Era do Bronze (Bronze Age - Inicial)**: Todas as partidas começam nesta era.
            *   *Tecnologia 1: Irrigação de Canais* (Custo: `80 Ouro`, `80 Comida`) -> Aumenta a produção de Comida de todas as Fazendas em `+20%`.
            *   *Tecnologia 2: Mineração Profunda* (Custo: `100 Ouro`, `50 Comida`) -> Aumenta a produção de Ouro de todas as Minas em `+20%`.
            *   *Tecnologia 3: Armaduras Forjadas* (Custo: `100 Ouro`, `100 Madeira`) -> Concede `+1 de Defesa` e `+1 de Visão` para todas as tropas terrestres.
            *   *Avançar para Era do Ferro*: Requer ter pesquisado pelo menos 2 tecnologias do Bronze + Custo: `200 Ouro`, `200 Comida`.
        *   **Era do Ferro (Iron Age)**:
            *   *Tecnologia 4: Balística Superior* (Custo: `150 Ouro`, `150 Madeira`) -> Aumenta em `+1 o Alcance` (de 2 para 3 tiles) e `+2 o Dano` das Catapultas.
            *   *Tecnologia 5: Estradas Pavimentadas* (Custo: `200 Ouro`, `100 Madeira`) -> Concede `+1 Ponto de Movimento` por turno para todas as tropas em tiles de grama.
            *   *Tecnologia 6: Logística de Cerco* (Custo: `150 Ouro`, `200 Comida`) -> Reduz em `20%` o custo de recrutamento de todas as tropas.
            *   *Avançar para Era Imperial*: Requer ter pesquisado pelo menos 2 tecnologias do Ferro + Custo: `400 Ouro`, `400 Comida`.
        *   **Era Imperial (Imperial Age)**:
            *   Desbloqueia a capacidade de construir a **Maravilha do Império (🏛️/⚡)** e convocar a unidade heroica **Campeão Imperial (🛡️/👑)**.
    *   **Feedback Visual e Sonoro de Avanço**:
        *   Ao concluir a pesquisa de uma era, o Castelo emite um brilho dourado e uma notificação flutuante *"AGE ADVANCED: IMPERIAL AGE!"*.
        *   A moldura da UI e o topo da HUD transicionam para tons dourados aristocráticos.

2.  **Maravilha do Império (Imperial Wonder 🏛️/⚡) & Evento de Cerco Final (Final Siege Event)**:
    *   **Construção da Maravilha**:
        *   Disponível exclusivamente na Era Imperial.
        *   Custo: `500 Ouro`, `500 Comida`, `300 Madeira`.
        *   Exige uma área livre de 2x2 no grid (4 tiles de grama sem outras construções ou água).
        *   Ao posicionar a Maravilha, ela ocupa os 4 tiles no grid renderizando um token grandioso 2x2 com brilho neon pulsante e barra de vida própria de **200 HP**.
    *   **Evento de Cerco Final (Final Siege Event)**:
        *   Ao iniciar a construção da Maravilha, dispara um alarme sonoro dramático e inicia um **cronômetro regressivo de 60 segundos (12 ticks)** na HUD.
        *   **Aliança Desesperada Inimiga**: As facções de IA rivais (Valoria e Krugar) rompem imediatamente quaisquer acordos de paz/comércio e declaram guerra total ao jogador.
        *   **Invasão de Hordas**:
            *   Todos os Acampamentos Bárbaros ativos passam a spawnar Saqueadores a cada 5 segundos (em vez de 15s).
            *   As IAs rivais mobilizam tropas e as enviam diretamente em marcha em direção às coordenadas da Maravilha do Império.
        *   As tropas inimigas priorizam atacar e reduzir o HP da Maravilha.
    *   **Condição de Vitória Suprema por Hegemonia**:
        *   Se o jogador defender a Maravilha e o HP permanecer acima de 0 quando o tempo zerar, a Maravilha é concluída e dispara a **Vitória Suprema por Hegemonia**.
        *   Modal triunfal glassmorphic exibindo confetes neon no Canvas, pontuação total, resumo do império e salvamento da conquista no `localStorage`.
        *   Se a Maravilha for destruída antes do tempo zerar, explode em partículas vermelhas, o evento de cerco é cancelado e o jogador perde os recursos investidos.

3.  **Unidade Heroica - O Campeão Imperial (🛡️/👑 Hero Unit)**:
    *   Recrutado no Castelo na Era Imperial (Limite rígido de **1 Campeão simultâneo** por jogador).
    *   Custo: `200 Ouro`, `150 Comida`.
    *   **Atributos**: Movimento: `2 tiles/turno`, Visão: `3 tiles`, Força de Combate Base: `5`. Possui um brilho ciano/dourado reluzente e aura rotativa ao redor da ficha no grid.
    *   **Habilidade Ativa: Grito de Guerra (War Cry 🎺)**:
        *   Teclado: Tecla `W` (com o Campeão selecionado) ou botão dedicado na HUD.
        *   Ao ser ativado, o Campeão solta um brado de guerra que emite uma onda de choque radial dourada expansiva no Canvas.
        *   Concede `+2 de Força de Combate` para todas as tropas aliadas a até 3 tiles de distância por 2 turnos completos.
        *   Cooldown: 4 turnos (exibido como um cronômetro na ficha do herói e no botão da HUD).

4.  **Modo Campanha Tática (Tactical Campaign - 3 Capítulos de Level Design)**:
    *   No menu inicial, o jogador pode escolher entre **Modo Sandbox Infinito** e **Modo Campanha Tática**.
    *   **Capítulo 1: "O Cerco de Valoria"**:
        *   *Objetivo*: Sobreviver a 5 ondas consecutivas de ataques bárbaros em um vale estreito defensivo com recursos iniciais escassos.
    *   **Capítulo 2: "A Rota das Relíquias"**:
        *   *Objetivo*: Escoltar 2 Batedores carregando Relíquias Sagradas por um caminho montanhoso infestado de emboscadas até o Templo Imperial.
    *   **Capítulo 3: "A Guerra dos Três Tronos"**:
        *   *Objetivo*: Conquistar os Castelos das IAs Valoria e Krugar e erguer a Maravilha do Império no centro do mapa antes do minuto 10.
    *   Progresso e estrelas conquistadas são salvos no `localStorage` sob a chave `strategyGameCampaign`.

5.  **Web Audio API Synth Adaptativa & Juiciness**:
    *   **Trilha Sonora Adaptativa Procedural**:
        *   *Modo Paz*: Melodias serenas e suaves com osciladores senoidais em escala pentatônica.
        *   *Modo Cerco Final*: Batidas percussivas aceleradas com linhas de baixo dente-de-serra moduladas a $120\text{BPM}$ transmitindo urgência e adrenalina.
    *   **Efeitos Sonoros Procedurais**:
        *   *Grito de Guerra (War Cry)*: Sweep ressonante de frequência ascendente com vibrato acelerado ($200\text{Hz} \to 850\text{Hz}$).
        *   *Avanço de Era*: Arpejo majestoso em quinta justa ($261.6\text{Hz} \to 392.0\text{Hz} \to 523.2\text{Hz} \to 659.3\text{Hz}$).
        *   *Impacto na Maravilha*: Estrondo abafado com ruído branco e passa-baixa severo acompanhado de tremor de tela de 300ms.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/strategy_game/script.js`, `/strategy_game/index.html` e `/strategy_game/style.css`.
*   **Modelo de Estado Global da Árvore Tecnológica e Eras**:
    ```javascript
    let currentAge = 'bronze'; // 'bronze', 'iron', 'imperial'
    let researchedTechs = [];  // Array com IDs das tecnologias pesquisadas ex: ['irrigation', 'mining']
    
    let wonderState = {
        active: false,
        underConstruction: false,
        timer: 60, // segundos restantes para o cerco
        hp: 200,
        maxHp: 200,
        tiles: []  // Array com os 4 índices de tiles ocupados (ex: [124, 125, 144, 145])
    };
    
    let heroUnit = {
        active: false,
        entityId: null,
        warCryCooldown: 0,
        warCryActive: false,
        warCryDuration: 0
    };
    ```

*   **Validação e Injeção da Estrutura 2x2 da Maravilha**:
    Ao selecionar a construção da Maravilha, verificar se a célula clicada $(x, y)$ e suas vizinhas $(x+1, y)$, $(x, y+1)$ e $(x+1, y+1)$ são válidas:
    ```javascript
    function isValidWonderLocation(startIndex) {
        const x = startIndex % 20;
        const y = Math.floor(startIndex / 20);
        if (x >= 19 || y >= 14) return false; // Fora dos limites do grid (20x15)
        
        const indices = [
            startIndex,
            startIndex + 1,
            startIndex + 20,
            startIndex + 21
        ];
        
        const tiles = document.querySelectorAll('.tile');
        return indices.every(idx => {
            const tile = tiles[idx];
            return tile && tile.dataset.type === 'grass' && !getBuildingAt(idx) && !getEntityAt(idx);
        });
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Entrega o clímax definitivo de vitoria para a experiência do jogador, adicionando longevidade, escolhas tecnológicas táticas e um modo campanha altamente rejogável).
*   **Esforço Estimado**: Alta (Exige controle de estruturas multiblocos 2x2, motor de eventos com contagem regressiva e sincronização de IA hostil, além de transição dinâmica no mixer de áudio sintetizado).
*   **Área**: Front-end / Motor de Turnos e Eventos / UI Glassmorphism / Web Audio API.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Injeção de Estilos CSS para Maravilha e Campeão ([style.css](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/style.css))

```css
/* Token de Unidade Heroica (Campeão Imperial) */
.unit-hero {
    border: 2px solid #ffd700 !important;
    color: #ffd700 !important;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(20, 20, 20, 0.9) 100%);
    box-shadow: 0 0 15px #ffd700, inset 0 0 8px #ffffff;
    animation: heroAura 2s infinite alternate;
}

@keyframes heroAura {
    0% { box-shadow: 0 0 10px #ffd700; transform: scale(1); }
    100% { box-shadow: 0 0 20px #ffe600; transform: scale(1.1); }
}

/* Estrutura 2x2 da Maravilha do Império */
.wonder-tile-group {
    position: absolute;
    width: calc(200% + 4px);
    height: calc(200% + 4px);
    top: 0;
    left: 0;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(0, 255, 255, 0.25) 100%);
    border: 2px solid #ffd700;
    box-shadow: 0 0 25px rgba(255, 215, 0, 0.6);
    border-radius: 8px;
    z-index: 15;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
}

/* Modal da Árvore Tecnológica */
.tech-tree-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-top: 15px;
}

.tech-card {
    background: rgba(20, 25, 35, 0.85);
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.3s ease;
}

.tech-card.researched {
    border-color: #00ff88;
    background: rgba(0, 255, 136, 0.15);
}
```

### 2. Algoritmo de Execução do Cerco Final (Final Siege Loop)

```javascript
function updateFinalSiege(dt) {
    if (!wonderState.underConstruction) return;
    
    wonderState.timer -= dt;
    updateSiegeTimerHUD(Math.max(0, Math.ceil(wonderState.timer)));
    
    // Invasão acelerada de bárbaros a cada 5 segundos
    if (Math.floor(wonderState.timer) % 5 === 0 && Math.random() < 0.8) {
        spawnSiegeBarbarianRaider();
    }
    
    // Forçar IAs rivais a marcharem até a Maravilha
    entities.forEach(entity => {
        if (entity.owner === 'valoria' || entity.owner === 'krugar') {
            moveEntityTowardsWonder(entity);
        }
    });
    
    // Verificação de Vitória
    if (wonderState.timer <= 0) {
        wonderState.underConstruction = false;
        wonderState.active = true;
        triggerHegemonyVictory();
    }
}
```

### 3. Síntese Sonora do Grito de Guerra (War Cry)

```javascript
function playWarCrySound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.4);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.8);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2500, audioCtx.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
    
    osc.connect(filter).connect(gainNode).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.9);
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Destruição Parcial da Maravilha**: Se a Maravilha sofrer dano durante o Cerco Final mas não for destruída completamente, ela recupera HP automaticamente ou precisa ser reparada gastando recursos?
    *   *Direcionamento do PO*: Não recupera HP automaticamente. O jogador pode clicar na Maravilha e gastar `50 Madeira` e `50 Ouro` para reparar `50 HP` instantaneamente (com tempo de recarga de 5 segundos).
2.  **Persistência da Era no Salvamento Local**: As pesquisas completadas da Árvore de Tecnologias devem ser salvas ao fechar o navegador?
    *   *Direcionamento do PO*: Sim, o estado `currentAge` e o array `researchedTechs` devem ser persistidos no `localStorage` sob a chave `strategyGameSave`.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Estrutura 2x2 no Grid**: **Decisão:** A injeção da Maravilha usará o tile superior-esquerdo como âncora posicional e aplicará a classe `.wonder-tile-group` cobrindo visualmente os 4 tiles no CSS Grid. Todos os 4 tiles do grupo registrarão a propriedade `dataset.building = 'wonder'`, garantindo que ataques direcionados a qualquer uma das 4 células afetem o HP único da Maravilha.
2. **Pathfinding na Marcha das IAs Inimigas**: **Decisão:** Para evitar engasgos de performance com muitos agentes, a IA das tropas em marcha de cerco calculará a direção cartesiana direta (distância Manhattan) até as coordenadas do centro da Maravilha, contornando apenas a água.
3. **Equilíbrio da Habilidade War Cry**: **Decisão:** O bônus de `+2 de Força` do Campeão Imperial afeta apenas unidades terrestres em um raio de 3 tiles e não se acumula com múltiplos disparos, evitando exploits.

---

## 🚀 Status do Refinamento Técnico

* **Identificação do Jogo**: `strategy_game`
* **Status do Backlog**: Transicionado para `📋 Backlog` / `✅ Refined` em `BACKLOG.md`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*
