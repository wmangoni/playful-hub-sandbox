# 📝 TASK-DED-003: Combate Interativo por Turnos, Minimapa de Exploração da Masmorra e Efeitos Visuais & Áudio Procedural Premium

## 👤 User Story
*   **Como** jogador entusiasta de RPG no minijogo **RPG Adventure Quest**,
*   **Eu quero** participar de combates interativos por turnos com opções de ações táticas (Ataques, Magias e Uso de Itens) em uma interface dedicada, visualizar meu progresso em um minimapa interativo da masmorra com névoa de guerra e ouvir efeitos sonoros dinâmicos sintetizados em tempo real,
*   **Para que** a aventura ganhe profundidade mecânica, apelo estético premium e uma experiência auditiva rica e imersiva sem depender de carregamento de arquivos externos de áudio.

---

## 🎯 Critérios de Aceitação

1.  **Combate Interativo por Turnos (Combat Screen)**:
    *   **Transição de Tela**: Em vez do loop `do-while` síncrono que resolve o combate instantaneamente, iniciar um combate deve transicionar a interface para uma **Tela de Combate Dedicada** (usando overlays estilizados ou reestruturação dinâmica do painel principal).
    *   **Painel do Inimigo**: Exibir um card visual do inimigo contendo Nome, AC, barra de HP reativa (mudando de cor: verde > amarelo > vermelho) e ícone/emoji correspondente.
    *   **Painel de Ações do Jogador**:
        *   `Ataque Físico`: Rola D20 + Modificador de Atributo de ataque (FOR para Guerreiro/Mago, DES para Ladino) contra a AC do inimigo. Causa dano baseado na arma equipada no inventário + modificador de atributo.
        *   `Habilidades/Magias Especiais` (Diferenciadas por classe):
            *   *Guerreiro*: **Golpe Heroico** (Rola ataque com Vantagem, escolhendo o maior de 2 dados D20, com cooldown de 3 turnos).
            *   *Mago*: **Míssil Mágico** (Dano automático de `1d4 + mod_INT` sem chance de errar) ou **Curar Ferimentos** (Recupera `2d4 + mod_WIS` de HP, gasta 1 slot de magia).
            *   *Ladino*: **Ataque Furtivo** (Dispara um ataque com bônus de Destreza `+1d6` se o inimigo estiver com HP cheio).
        *   `Usar Item`: Permite abrir temporariamente o inventário de 6 slots durante o combate para usar consumíveis de cura, consumindo o turno do jogador.
        *   `Fugir`: Realiza um teste de Fuga (`D20 + mod_DEX` contra DC 12). Sucesso encerra o combate e retorna para a cena de exploração segura anterior. Falha consome o turno e dá vez ao ataque inimigo.
    *   **Turnos Alternados**: O fluxo deve alternar entre Turno do Jogador e Turno do Inimigo, atualizando o log de combate no final de cada ação e aplicando a animação do dado D20 para todas as jogadas de ataque/fuga.
    *   **Recompensas e Resolução**: Ao derrotar o inimigo (HP <= 0), o painel de combate é fechado, o XP e Ouro são concedidos, e a cena `nextSceneSuccess` correspondente é carregada. Se a vida do jogador zerar, transiciona para a cena de morte (`death`).

2.  **Minimapa de Exploração da Masmorra (Dynamic Dungeon Map)**:
    *   **Visualizador da Masmorra**: Exibir na interface um minimapa estilizado (grafo de salas ou grade interativa) representando os caminhos da Masmorra de Drakmor.
    *   **Névoa de Guerra & Progresso**:
        *   Salas já visitadas pelo jogador ficam completamente visíveis com destaque temático.
        *   A sala atual pulsa com brilho neon/dourado.
        *   Salas adjacentes não visitadas são reveladas como nós selecionáveis (ícones sombreados).
        *   Salas mais distantes ficam cobertas por Névoa de Guerra (escondidas ou representadas apenas por pontos de interrogação).
    *   **Tipologia de Nós**: Cada nó do mapa deve conter um ícone ilustrando sua natureza:
        *   ⚔️ *Combate* (ex: Encontro com Goblin, Lobo, Aranha)
        *   🪙 *Mercador/Lojinha* (ex: Alcova do Mercador)
        *   ❓ *Evento/Mistério* (ex: Travessia do Riacho, Baú de Tesouro, Charada)
        *   💀 *Chefe/Boss* (Câmara do Spectro de Drakmor)
    *   **Navegação Direta**: Ao clicar em um nó adjacente válido no mapa, o jogo deve navegar automaticamente para a respectiva cena e atualizar a posição visual no minimapa.

3.  **Juiciness Premium & Áudio Procedural (Web Audio API)**:
    *   **Tremor e Impacto Visual**:
        *   Aplicar screen shake de 200ms e flash vermelho rápido na tela do combate ao receber dano.
        *   Exibir uma animação curta de impacto de corte (slash) ou feixe de energia (magia) sobre o card do alvo (jogador ou inimigo) quando um ataque for bem-sucedido.
    *   **Sintetizador de Áudio Retrô**: Implementar efeitos sonoros dinâmicos usando a Web Audio API do navegador, sem dependências de arquivos de áudio externos:
        *   *Ataque de Espada*: Ruído branco simulando o ar cortado, acoplado a uma queda rápida de frequência com filtro passa-faixa.
        *   *Magia Arcana*: Onda senoidal oscilante com modulação de frequência ascendente rápida (pitch sweep) e atraso (delay).
        *   *Efeito de Cura*: Tons puros ascendentes em arpejo curto e rápido com ressonância (bubbly/chime effect).
        *   *Som de Fuga*: Queda rápida de volume acompanhada de passos simulados por pulsos de ruído.
        *   *Som de Derrota*: Melodia descendente em escala menor com distorção gradual (detune).
        *   *Som de Vitória*: Fanfarra triunfante em arpejo maior (Dó - Mi - Sol - Dó maior) com alta sustentação.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/ded/index.html`, `/ded/assets/scenes.json`.
*   **DOM Overlay de Combate**:
    Criar uma div overlay contendo o status de batalha:
    ```html
    <div id="combat-screen" class="hidden">
        <div class="combat-grid">
            <!-- Informações do Oponente -->
            <div class="enemy-card">
                <h3 id="combat-enemy-name">Nome do Monstro</h3>
                <div class="health-bar-container">
                    <div id="combat-enemy-health" class="health-bar" style="width: 100%;"></div>
                </div>
                <div id="combat-enemy-hp-text">15/15 HP</div>
                <div class="enemy-details">AC: <span id="combat-enemy-ac">12</span></div>
            </div>
            
            <!-- Painel de Ações -->
            <div class="combat-actions">
                <button id="btn-combat-attack">⚔️ Ataque Físico</button>
                <button id="btn-combat-spell">✨ Magia/Especial</button>
                <button id="btn-combat-item">🎒 Usar Item</button>
                <button id="btn-combat-flee">🏃 Fugir</button>
            </div>
        </div>
    </div>
    ```
*   **Gerenciador de Áudio Procedural**:
    Implementar uma classe ou objeto `SoundEngine` usando o `AudioContext` nativo:
    ```javascript
    const AudioEngine = {
        ctx: null,
        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
        },
        playSlash() {
            this.init();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        }
        // Outros sons seguindo a mesma arquitetura de síntese FM/Aditiva básica
    };
    ```

*   **Estrutura de Nós do Minimapa**:
    Mapear cada cena de `scenes.json` para coordenadas no grafo de exploração:
    ```javascript
    const DUNGEON_MAP = {
        "start": { id: "start", label: "Entrada", x: 0, y: 2, type: "event", connections: ["corridor", "buy_supplies", "entrance_inspection"] },
        "corridor": { id: "corridor", label: "Corredor Escuro", x: 1, y: 2, type: "event", connections: ["goblin_encounter", "treasure_room"] },
        "goblin_encounter": { id: "goblin_encounter", label: "Goblin", x: 2, y: 1, type: "combat", connections: ["dark_chamber"] },
        "treasure_room": { id: "treasure_room", label: "Câmara Dourada", x: 2, y: 3, type: "event", connections: ["dark_chamber"] },
        "dark_chamber": { id: "dark_chamber", label: "Câmara de Madeira", x: 3, y: 2, type: "event", connections: ["cavern", "crypt"] }
        // Mapear recursivamente até a câmara final
    };
    ```

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Aumenta dramaticamente o valor estratégico, diversão do loop de combate e senso de exploração espacial).
*   **Esforço Estimado**: Alta (Requer refatoração do motor de decisões e criação do canvas/SVG para renderização do minimapa).
*   **Área**: Front-end / Web Audio / UI Design / Lógica de Gameplay.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhadas as etapas de implementação, equações de turnos e as especificações para o Minimapa e Síntese de Som.

### 1. Motor de Combate Interativo (Turn-based Combat State Machine)
*   **Modelagem de Turno**:
    O estado do combate deve ser armazenado em um objeto de sessão ativo no `gameState`:
    ```javascript
    gameState.combat = {
        active: false,
        enemy: null, // Cópia do objeto de inimigo da cena
        turn: 'player', // 'player' ou 'enemy'
        cooldowns: { heroStrike: 0 }
    };
    ```
*   **Algoritmo do Fluxo de Turno**:
    1. O combate inicia através de `gameState.mem.checkType === "combat"`.
    2. Em vez de chamar o loop síncrono `initFight`, ativa-se o painel `#combat-screen` limpando botões de escolhas padrão.
    3. **Turno do Jogador**: Ações habilitadas. O jogador escolhe uma das opções.
    4. Ao executar a ação, rola o D20 visual. O resultado é calculado e renderizado. Se atingir ou superar a AC do inimigo, calcula-se o dano. O HP do inimigo é atualizado na UI de forma animada (transição de CSS).
    5. O log de combate detalha o ocorrido: *"Você acertou o Goblin com Espada por 6 de dano!"*
    6. Se o HP do inimigo for <= 0, finaliza o combate: ativa animação de vitória, toca som de vitória, concede recompensas e carrega a cena de sucesso pós-atraso de 2 segundos.
    7. Se o inimigo sobreviver, passa o turno para o inimigo: `gameState.combat.turn = 'enemy'`. Desabilita botões de ações do jogador.
    8. **Turno do Inimigo**: Após delay dramático de 1.2 segundos, o inimigo realiza seu ataque. O log é atualizado: *"O Goblin ataca e rola 14 contra sua AC 13. Acertou! Você perdeu 4 HP."*
    9. Se o HP do jogador for <= 0, dispara morte: tela pisca vermelho, toca som de derrota e carrega a cena `death`.
    10. Se sobreviver, retorna ao Turno do Jogador, reduzindo cooldowns de habilidades.

### 2. Renderização do Minimapa (SVG / HTML Canvas Nodes)
*   O minimapa deve ser inserido em uma div retrátil na interface para não comprometer a legibilidade.
*   **Névoa de Guerra Dinâmica**:
    Manter no `gameState` uma lista de IDs de cenas visitadas: `gameState.visitedNodes = ['start']`.
    ```javascript
    function renderMinimap() {
        const mapContainer = document.getElementById('minimap-view');
        mapContainer.innerHTML = ''; // Limpa anterior
        
        // Criar elemento SVG flexível
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "150px");
        svg.setAttribute("viewBox", "0 0 800 200");
        
        // 1. Desenhar conexões de linhas primeiro (para ficarem atrás dos nós)
        Object.keys(DUNGEON_MAP).forEach(key => {
            const node = DUNGEON_MAP[key];
            const isVisited = gameState.visitedNodes.includes(node.id);
            
            node.connections.forEach(connId => {
                const target = DUNGEON_MAP[connId];
                if (!target) return;
                const isTargetVisited = gameState.visitedNodes.includes(target.id);
                
                // Só desenha conexões se pelo menos um dos nós foi visitado
                if (isVisited || isTargetVisited) {
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", node.x * 120 + 50);
                    line.setAttribute("y1", node.y * 40 + 30);
                    line.setAttribute("x2", target.x * 120 + 50);
                    line.setAttribute("y2", target.y * 40 + 30);
                    line.setAttribute("stroke", isVisited && isTargetVisited ? "#ffd700" : "#554433");
                    line.setAttribute("stroke-width", isVisited && isTargetVisited ? "3" : "1.5");
                    if (!isTargetVisited) {
                        line.setAttribute("stroke-dasharray", "4");
                    }
                    svg.appendChild(line);
                }
            });
        });
        
        // 2. Desenhar os nós da masmorra
        Object.keys(DUNGEON_MAP).forEach(key => {
            const node = DUNGEON_MAP[key];
            const isVisited = gameState.visitedNodes.includes(node.id);
            const isCurrent = gameState.currentScene === node.id;
            const isSelectable = !isVisited && isNeighborOfVisited(node.id);
            
            // Ignorar nós ocultos na Névoa de Guerra
            if (!isVisited && !isCurrent && !isSelectable) return;
            
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", node.x * 120 + 50);
            circle.setAttribute("cy", node.y * 40 + 30);
            circle.setAttribute("r", isCurrent ? "16" : "12");
            
            // Cores e estilos do nó
            let fillColor = "#221a15";
            let strokeColor = "#665544";
            
            if (isCurrent) {
                fillColor = "#8b0000";
                strokeColor = "#ffd700";
                circle.classList.add("pulse-neon");
            } else if (isVisited) {
                fillColor = "#ffd700";
                strokeColor = "#c5a880";
            } else if (isSelectable) {
                fillColor = "#554433";
                strokeColor = "#00d2ff";
                circle.style.cursor = "pointer";
                circle.onclick = () => loadScene(node.id);
            }
            
            circle.setAttribute("fill", fillColor);
            circle.setAttribute("stroke", strokeColor);
            circle.setAttribute("stroke-width", "2");
            svg.appendChild(circle);
            
            // Adicionar rótulos visuais curtos (Emojis) sobre os nós
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", node.x * 120 + 50);
            text.setAttribute("y", node.y * 40 + 35);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "10px");
            text.setAttribute("fill", isVisited ? "#111" : "#fff");
            
            let emoji = "❓";
            if (node.type === "combat") emoji = "⚔️";
            else if (node.id.includes("merchant")) emoji = "🪙";
            else if (node.id === "victory" || node.id === "pre_victory") emoji = "🏆";
            
            text.textContent = emoji;
            svg.appendChild(text);
        });
        
        mapContainer.appendChild(svg);
    }
    
    function isNeighborOfVisited(nodeId) {
        // Retorna verdadeiro se algum nó vizinho já foi visitado pelo jogador
        return Object.keys(DUNGEON_MAP).some(key => {
            const node = DUNGEON_MAP[key];
            return gameState.visitedNodes.includes(node.id) && node.connections.includes(nodeId);
        });
    }
    ```

### 3. Síntese de Efeitos de Áudio (Web Audio API Recipes)
Para evitar falhas de execução e atrasos de download de arquivos MP3, a síntese analógica pura garante alta performance e confiabilidade multiplataforma:

*   **Algoritmo do Som de Magia (Spell Cast)**:
    ```javascript
    function playSpellSound() {
        AudioEngine.init();
        const ctx = AudioEngine.ctx;
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = "sine";
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        // Pitch sweep ascendente rápido para simular carga mágica
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.35);
        
        // Filtro com ressonância alta
        filter.type = "peaking";
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(10, now);
        
        // Envelope de Ganho
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
    }
    ```

*   **Algoritmo do Som de Vitória (Victory Fanfare)**:
    ```javascript
    function playVictorySound() {
        AudioEngine.init();
        const ctx = AudioEngine.ctx;
        const now = ctx.currentTime;
        
        // Arpejo de C Major (C4 -> E4 -> G4 -> C5) em passos de 120ms
        const notes = [261.63, 329.63, 392.00, 523.25];
        
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = "triangle"; // Tom mais suave e retrô
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            const noteStart = now + (index * 0.15);
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0.01, noteStart);
            gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);
            
            osc.start(noteStart);
            osc.stop(noteStart + 0.4);
        });
    }
    ```

---

## 🚀 Status da Implementação (Implementation Status)
*   **Status**: `🧪 Ready for QA`
*   **Refinado por**: PO (Product Owner) e TL (Tech Lead)
*   **Implementado e Aprovado por**: TL (Tech Lead)
*   **Data de Conclusão**: 2026-06-23

---

## 🛡️ Diretrizes de Arquitetura e Segurança do Tech Lead (TL)

Para garantir a robustez, performance e segurança durante a implementação desta tarefa pelo desenvolvedor, as seguintes regras técnicas e padrões arquiteturais **devem ser seguidos obrigatoriamente**:

### 1. Prevenção de Condição de Corrida (Race Conditions) em Turnos de Combate
*   Durante a transição de turnos e enquanto a IA do inimigo realiza suas ações ou rola dados, **todas as interações de UI do jogador (botões de ação, itens, fuga, etc.) devem ser desabilitadas**.
*   A classe CSS `.disabled` ou o atributo `disabled` deve ser aplicado aos botões de controle para impedir double-clicking que poderia disparar múltiplos ataques simultâneos ou avançar turnos incorretamente.

### 2. Gerenciamento de Memória e Coleta de Lixo (Garbage Collection) do Minimapa
*   O minimapa em SVG deve ser reconstruído de forma eficiente. Ao limpar o container `#minimap-view` via `innerHTML = ''`, garanta que quaisquer referências de handlers de evento (como os callbacks `onclick` aplicados aos circles do SVG) sejam destruídos ou desvinculados para evitar vazamentos de memória (memory leaks).
*   Se o jogo for resetado para seleção de personagens ou nova partida, o estado `visitedNodes` deve ser completamente limpo e reinicializado com `['start']`.

### 3. Tratamento de Erros e Inicialização do AudioContext (Web Audio API)
*   Como a política de segurança de reprodução de áudio dos navegadores modernos (Autoplay Policy) impede a inicialização de som sem interação prévia do usuário, o `AudioContext` deve ser criado de maneira preguiçosa (lazy instantiation) a partir de um clique físico em qualquer elemento de jogo (ex: iniciar aventura, escolher preset, rolar dados, atacar).
*   Encapsule todas as manipulações de áudio (`ctx.resume()`, `createOscillator()`, etc.) dentro de blocos `try/catch`. O jogo **nunca** deve travar ou lançar exceções fatais que quebrem a UI se o áudio falhar ou estiver silenciado pelo navegador.

### 4. Consistência e Persistência do Grafo do Mapa
*   A navegação através do clique nos nós do minimapa deve ser restrita apenas a nós com status `isSelectable` (ou seja, vizinhos imediatos não visitados da sala atual).
*   Ao mudar de cena (por exemplo, ao clicar em um nó ou ao resolver um combate), a nova cena carregada deve ser adicionada dinamicamente ao array `gameState.visitedNodes` caso ainda não esteja presente, garantindo a revelação correta e progressiva do minimapa.

---

## 🔍 Code Review (Tech Lead)
*   **Estrutura de Combate**: Implementada como uma máquina de estados limpa no escopo do arquivo principal (`gameState.combat`). Os loops `do-while` síncronos foram totalmente extirpados e substituídos por um fluxo reativo controlado por eventos de clique e timeouts de turno do inimigo.
*   **Minimapa Dinâmico**: A renderização em SVG inline do minimapa está extremamente limpa e performática. Há micro-animações CSS e SVG de pulsação e brilho neon para indicação visual premium de posições e nós clicáveis.
*   **Áudio Procedural**: O `AudioEngine` sintetiza efeitos sonoros retrô analógicos nativos de forma leve, limpa e resiliente a falhas usando buffers e envelopes de ganho exponenciais. Unlocked corretamente nas primeiras interações de toque/clique.
*   **Robustez**: O estado do jogo (`visitedNodes` e `combat`) agora é serializado de forma limpa, permitindo consistência e navegabilidade dinâmica na masmorra sem vazamentos de memória ou bugs de turnos concorrentes.
*   *Código aprovado e qualificado para a esteira de QA.*

---

## 🧪 Evidencias de Testes (QA Test Evidence)
*   *Aguardando validação do QA para confirmação de deploy.*
