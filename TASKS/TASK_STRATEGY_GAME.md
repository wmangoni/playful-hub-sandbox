# 📝 TASK-STRATEGY_GAME: Sistema de Névoa de Guerra (Fog of War) e Diplomacia Básica com IA

## 👤 User Story
*   **Como** imperador e general do minijogo **Strategy Empire**,
*   **Eu quero** explorar um mapa dinâmico coberto por uma névoa de guerra funcional e negociar tratados de paz ou alianças com outras facções controladas por IA,
*   **Para que** as campanhas militares exijam batedores e as vitórias possam ser alcançadas tanto por força bruta quanto por vias diplomáticas e econômicas.

---

## 🎯 Critérios de Aceitação
1.  **Névoa de Guerra (Fog of War)**:
    *   O mapa do jogo deve inicializar coberto por uma névoa preta (células não exploradas).
    *   Unidades e edifícios do jogador criam um raio de visão (ex: 2 células ao redor).
    *   Áreas exploradas anteriormente que não possuem visão atual ficam em tom cinza semi-transparente, mostrando apenas o terreno estático, mas ocultando exércitos e movimentações inimigas atuais.
2.  **Sistema de Diplomacia com Facções de IA**:
    *   Criar um painel de diplomacia acessível por um botão na interface do usuário.
    *   O jogador deve poder interagir com pelo menos 2 outras facções vizinhas.
    *   Níveis de Relacionamento: *Guerra* (IA ataca ativamente), *Neutro* (IA não ataca, mas impede comércio), e *Aliado* (IA concede visão compartilhada e bônus de comércio).
    *   Ações diplomáticas: Enviar Recursos (melhora relação), Declarar Guerra (rompe pactos), Propor Aliança (requer relacionamento > 75%).
3.  **Múltiplas Condições de Vitória**:
    *   Adicionar tela de fim de jogo customizada para o tipo de vitória alcançada:
        *   **Vitória Militar**: Conquistar todos os territórios inimigos.
        *   **Vitória Diplomática**: Manter aliança ativa com todas as facções vivas por 5 rodadas seguidas.
        *   **Vitória Econômica**: Acumular 5.000 de Ouro e 5.000 de Madeira nos estoques.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/strategy_game/script.js` e `/strategy_game/index.html`.
*   **Controle de Visibilidade das Células**:
    *   No grid bidimensional do mapa, armazenar o estado de visibilidade de cada célula: `0` (Oculto - Preto), `1` (Explorado, sem visão atual - Cinza), `2` (Visível - Colorido).
    *   Método `recalculateVision()` executado a cada final de turno, varrendo unidades do jogador e atualizando os estados de visibilidade vizinhos.
*   **IA de Relacionamento**:
    *   Manter um valor numérico `-100` a `100` para a relação de cada IA com o jogador. Enviar presentes aumenta o valor, enquanto ter tropas na fronteira reduz passivamente a cada turno.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Adiciona profundidade tática típica de jogos como Civilization ou Age of Empires).
*   **Esforço Estimado**: Alta (Requer controle visual complexo de renderização no canvas/HTML do mapa).
*   **Área**: Front-end / Engine de Turnos / UI.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os passos, a modelagem de dados e as alterações no código estruturado necessárias para implementar cada um dos requisitos da história de usuário, garantindo compatibilidade com o loop de jogo existente nos arquivos [/strategy_game/script.js](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/script.js) e [/strategy_game/index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/index.html), mantendo uma estética tática premium de simulação de impérios.

### 1. Sistema de Névoa de Guerra (Fog of War)
*   **Modelagem de Visibilidade (Grid 15x20)**:
    Mapearemos os estados de visibilidade do mapa através de um array `tileVisibility` de 300 elementos (correspondente a `15 * 20` células do mapa).
    Os estados possíveis para cada célula serão:
    *   `0` (Oculto / Unexplored - Totalmente preto)
    *   `1` (Neblina / Shrouded - Explorado, mas sem visão ativa. Mostra terreno estático, esconde inimigos)
    *   `2` (Visível / Visible - Totalmente colorido e com visão ativa)

    ```javascript
    let tileVisibility = []; // Array de tamanho 300 inicializado com 0 (Oculto)
    ```

*   **Atualização do Algoritmo de Visão (`recalculateVision`)**:
    Este método deve ser executado sempre que o jogador colocar uma construção ou no final do processamento de turnos/atualização de recursos.
    
    ```javascript
    function recalculateVision() {
        // Redefine células atualmente visíveis (2) para névoa de guerra (1)
        for (let i = 0; i < tileVisibility.length; i++) {
            if (tileVisibility[i] === 2) {
                tileVisibility[i] = 1;
            }
        }

        const tiles = document.querySelectorAll('.tile');
        
        // Define o raio de visão por tipo de construção
        const visionRadius = {
            castle: 2,
            temple: 2,
            barracks: 2,
            wall: 1,
            farm: 1,
            mine: 1,
            lumbercamp: 1
        };

        // Escaneia construções do jogador para projetar visão
        tiles.forEach((tile, index) => {
            const type = tile.dataset.type;
            // Se o tile pertence ao jogador (exclui grass, water, e estruturas inimigas)
            if (type && type !== 'grass' && type !== 'water' && !tile.dataset.enemy) {
                const radius = visionRadius[type] || 1;
                const tileX = index % 20;
                const tileY = Math.floor(index / 20);

                // Aplica a visão na vizinhança dentro do raio (distância de Chebyshev)
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const targetX = tileX + dx;
                        const targetY = tileY + dy;

                        if (targetX >= 0 && targetX < 20 && targetY >= 0 && targetY < 15) {
                            const targetIndex = targetY * 20 + targetX;
                            tileVisibility[targetIndex] = 2; // Visível
                        }
                    }
                }
            }
        });

        // Visão compartilhada de Aliados (Se houver aliança ativa)
        FACTIONS.forEach(faction => {
            if (faction.status === 'Aliado' && faction.capitalIndex !== undefined) {
                const cX = faction.capitalIndex % 20;
                const cY = Math.floor(faction.capitalIndex / 20);
                const radius = 3; // Aliados compartilham visão maior sobre sua capital
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const targetX = cX + dx;
                        const targetY = cY + dy;
                        if (targetX >= 0 && targetX < 20 && targetY >= 0 && targetY < 15) {
                            const targetIndex = targetY * 20 + targetX;
                            tileVisibility[targetIndex] = 2;
                        }
                    }
                }
            }
        });

        updateMapVisibilityUI();
    }
    ```

*   **Customização no CSS ([style.css](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/style.css))**:
    Implementação da renderização por atributos customizados de visibilidade no DOM:
    
    ```css
    /* Névoa de Guerra Preta (Inexplorado) */
    .tile[data-visibility="0"] {
        background: #0d0d0d !important;
        border: 1px solid #1a1a1a;
        cursor: not-allowed;
    }
    .tile[data-visibility="0"]::before {
        display: none !important;
    }

    /* Névoa de Guerra Cinza (Explorado anteriormente) */
    .tile[data-visibility="1"] {
        filter: brightness(35%) grayscale(80%);
    }

    /* Área com Visão Ativa */
    .tile[data-visibility="2"] {
        filter: none;
        transition: filter 0.3s ease;
    }
    ```

---

### 2. Recurso Adicional: Madeira (Wood)
*   **Variável de Estado e Interface**:
    Para dar suporte ao critério de vitória econômica, criaremos o recurso **Madeira** no script e adicionaremos sua exibição ao HTML.
    
    ```javascript
    let wood = 100;
    // Custos atualizados no objeto costs
    const costs = {
        castle: { gold: 110, food: 100, wood: 80 },
        farm: { gold: 50, food: 0, wood: 20 },
        barracks: { gold: 75, food: 25, wood: 40 },
        wall: { gold: 25, food: 20, wood: 10 },
        mine: { gold: 100, food: 50, wood: 50 },
        lumbercamp: { gold: 20, food: 30, wood: 10 },
        temple: { gold: 10, food: 60, wood: 20 }
    };
    ```

*   **Alteração no [index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/index.html)**:
    ```html
    <div class="resources">
        <div class="resource" id="gold">Gold: 100</div>
        <div class="resource" id="food">Food: 100</div>
        <div class="resource" id="wood">Wood: 100</div> <!-- Adicionado -->
        <div class="resource" id="game-timer">Time: 0:00</div>
    </div>
    ```

*   **Lógica de Produção**:
    O Acampamento Madeireiro (*Lumber Camp*) produzirá exclusivamente madeira, enquanto as fazendas focam em comida e minas em ouro.
    
    ```javascript
    // No método updateResources()
    const lumbercamps = document.querySelectorAll('[data-type="lumbercamp"]').length;
    wood += lumbercamps * 10; // +10 de madeira por cabana
    ```

---

### 3. Painel de Diplomacia e Relação com Facções IA
*   **Modelagem das Facções Vizinhas**:
    Inicializaremos duas facções controladas por IA e controlaremos seus castelos posicionados nos cantos opostos do grid para interação tática:
    
    ```javascript
    const FACTIONS = [
        {
            id: 'valoria',
            name: 'Ducado de Valoria',
            relation: 0,           // Escala: -100 a +100
            status: 'Neutro',      // Guerra, Neutro, Aliado
            capitalIndex: 0,       // Canto superior esquerdo
            color: '#b833ff'       // Roxo Real
        },
        {
            id: 'krugar',
            name: 'Horda de Krugar',
            relation: -25,
            status: 'Neutro',
            capitalIndex: 299,     // Canto inferior direito
            color: '#ff8800'       // Laranja Feroz
        }
    ];
    ```

*   **Criação do Painel de Diplomacia (HTML/Modal)**:
    Inseriremos um botão de acesso no painel lateral e criaremos o modal de interface de forma a impressionar o usuário com o design Cyber-medieval:
    
    ```html
    <!-- Botão no index.html acima de status-message -->
    <button id="diplomacy-btn" class="build-button" style="background: #3388aa; margin-top: 15px;">📜 Royal Diplomacy</button>

    <!-- Modal de Diplomacia -->
    <div id="diplomacy-modal" class="win-screen hidden" style="background: rgba(0, 0, 0, 0.85); justify-content: center; align-items: center;">
        <div style="background: #222; border: 2px solid #3388aa; padding: 25px; border-radius: 8px; max-width: 500px; width: 90%; text-align: left;">
            <h2 style="color: #3388aa; font-family: sans-serif; border-bottom: 1px solid #444; padding-bottom: 10px; margin-top: 0;">📜 Imperial Diplomacy</h2>
            <div id="diplomacy-content" style="margin: 20px 0;"></div>
            <button id="close-diplomacy-btn" style="background: #666; width: 100%; border: none; padding: 10px; color: white; border-radius: 4px; cursor: pointer;">Return to Map</button>
        </div>
    </div>
    ```

*   **Lógica de Interações e Efeitos**:
    *   **Tributo (Presente)**: Custa 150 Gold e aumenta relação em `+20`.
    *   **Declarar Guerra**: Define relação para `-100`, status `'Guerra'`.
    *   **Propor Aliança**: Exige relacionamento `>= 75`. Define status para `'Aliado'`.
    *   **Comportamento Pró-Ativo (Efeitos de Turno)**:
        *   **Guerra**: Se status for `'Guerra'`, a cada 4 turnos (ticks de recurso), há 15% de chance da facção realizar um ataque, gerando um evento destrutivo no painel e destruindo 1 construção aleatória nas fronteiras (substitui por `'grass'`). Se o jogador tiver *Barracks* ou *Wall* ativos no mapa, eles reduzem a chance de sucesso do ataque inimigo para 5%.
        *   **Aliado**: Concede `+5 Ouro` passivo por turno devido a tratados comerciais e aciona visão compartilhada no raio de 3 ao redor de sua respectiva capital.

---

### 4. Múltiplas Condições de Vitória
Monitoradas a cada atualização de recursos (loop principal de 5 segundos):
*   **Vitória Militar**:
    *   Para vencer militarmente, o jogador deve expandir seu território até as capitais inimigas (`index 0` e `index 299`) e conquistá-las.
    *   Isso é feito construindo um *Barracks* adjacente à capital e clicando na capital com recursos suficientes (ex: 200 Gold, 200 Food) para lançar um ataque vitorioso, eliminando a facção do mapa.
*   **Vitória Diplomática**:
    *   O jogador deve propor e manter alianças ativas com todas as facções vivas por **5 rodadas consecutivas** (durante 5 ticks consecutivos de atualização de recursos).
*   **Vitória Econômica**:
    *   O jogador deve possuir concomitantemente nos estoques do império: **5.000 Ouro** e **5.000 Madeira**.

Ao atingir qualquer uma das condições de vitória, o fluxo redireciona para a tela de fim de jogo com mensagens temáticas e exclusivas:
*   *Militar*: *"DOMÍNIO ABSOLUTO! Seus exércitos subjugaram todas as capitais do continente!"*
*   *Diplomática*: *"IMPÉRIO DA PAZ! O conselho imperial celebra a união eterna das facções sob sua coroa!"*
*   *Econômica*: *"RIQUEZA INESTIMÁVEL! Seus estoques transbordam recursos e sua dinastia governará pelo comércio!"*

