# 📝 TASK-IT_SIMULATOR: Sistema de Estresse/Burnout, Crises Satíricas em Produção e Contratação de Freelancers

## 👤 User Story
*   **Como** gerente de projetos e líder de TI no minijogo **Company Simulator**,
*   **Eu quero** gerenciar o nível de estresse e burnout dos desenvolvedores da equipe, resolver eventos surpresa de crises de produção e contratar desenvolvedores temporários (freelancers),
*   **Para que** a simulação corporativa de TI ganhe mecânicas divertidas de gerenciamento de recursos humanos e retrate os desafios reais da área de forma cômica e viciante.

---

## 🎯 Critérios de Aceitação
1.  **Barra de Estresse e Mecânica de Burnout**:
    *   Cada desenvolvedor contratado na equipe agora possui um indicador visual de Estresse (0% a 100%).
    *   O estresse aumenta quando o desenvolvedor faz horas extras, quando o projeto está atrasado ou quando ocorrem bugs severos.
    *   Ao atingir 100%, o desenvolvedor entra em estado de *Burnout* (fica inutilizado por 3 rodadas/dias da simulação, e sua barra cai lentamente para 20%).
    *   Ações para reduzir estresse: Oferecer "Dia de Folga (Day Off)", comprar cafeteira premium ou mesa de pebolim para o escritório.
2.  **Eventos Aleatórios de Crise (Production Outage)**:
    *   A cada ciclo semanal da simulação, existe uma chance de 10% de um evento inesperado ocorrer via modal pop-up interativo.
    *   *Exemplo de Crise*: "O Estagiário rodou `DELETE FROM users` sem WHERE na base oficial."
    *   Oferecer 3 opções de escolha com diferentes consequências (ex: 1. Gastar dinheiro com consultoria externa; 2. Forçar a equipe a trabalhar no final de semana, aumentando estresse geral em 40%; 3. Ignorar o problema e perder 20% da confiança dos clientes).
3.  **Contratação de Freelancers (Outsourcing)**:
    *   Criar um menu "Freelas" na aba de contratações.
    *   Permite contratar temporariamente desenvolvedores por um número fixo de dias. Eles entregam código muito rápido, mas custam uma diária elevada e não geram valor de longo prazo para a equipe corporativa fixa.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/it_simulator/index.html` (que centraliza HTML, CSS e JavaScript).
*   **Estrutura da Equipe**:
    *   Adicionar as propriedades `stress`, `isBurnedOut`, `burnoutCooldown` em cada objeto do array de desenvolvedores.
*   **Interface e UI**:
    *   Exibir uma barra de progresso vermelha para o estresse abaixo do avatar de cada desenvolvedor.
    *   Adicionar um painel "Descanso" para permitir enviar funcionários específicos para folga remunerada.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Adiciona humor e melhora significativamente a profundidade e complexidade da simulação de negócios).
*   **Esforço Estimado**: Média (Principalmente lógica de gerenciamento de estado e criação de modals de eventos aleatórios).
*   **Área**: Front-end / Simulação Matemática / UI.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os passos de implementação, estruturas de dados de equipe, regras de estresse corporativo e modelos visuais necessários para introduzir a mecânica premium de **Barra de Estresse**, **Burnout de Desenvolvedores**, **Crises Interativas em Produção** e **Contratação de Freelancers** no minijogo **Company Simulator**.

---

### 1. Modelagem da Equipe (Developer Object & Array Structure)

Para abandonar o simples valor inteiro `this.employees` e passar a gerenciar a saúde de cada membro da equipe, criaremos uma estrutura orientada a objetos para cada desenvolvedor.

*   **Definição da Classe ou Modelo de Dados `Developer`**:
    Cada desenvolvedor na simulação será um objeto com propriedades de identificação, stress e contrato (no caso de freelancers):

    ```javascript
    class Developer {
        constructor(id, name, avatar, stress = 0, isBurnedOut = false, burnoutCooldown = 0, type = 'full-time', daysRemaining = null) {
            this.id = id;
            this.name = name;
            this.avatar = avatar;
            this.stress = stress;
            this.isBurnedOut = isBurnedOut;
            this.burnoutCooldown = burnoutCooldown; // Turnos restantes de inatividade por burnout
            this.type = type; // 'full-time' ou 'freelancer'
            this.daysRemaining = daysRemaining; // Turnos/dias restantes para freelancers (null para full-time)
            this.onDayOff = false; // Flag para indicar se está de folga neste turno
        }
    }
    ```

*   **Inicialização do State (`TechCompanySimulation` Constructor)**:
    Substituir a atribuição simplificada `this.employees = 5;` pela inicialização do array de desenvolvedores base da startup:

    ```javascript
    // No constructor de TechCompanySimulation:
    this.developers = [
        new Developer(1, "Gabi (Frontend)", "👩‍💻", 10),
        new Developer(2, "Bruno (Backend)", "👨‍💻", 20),
        new Developer(3, "Lucas (DevOps)", "🧙‍♂️", 15),
        new Developer(4, "Carla (QA)", "👩‍🔬", 5),
        new Developer(5, "Estagiário (DB)", "👶", 35)
    ];
    
    // Upgrades/Melhorias de Escritório
    this.hasCoffeeMachine = false;
    this.hasFoosballTable = false;

    // Getter para retrocompatibilidade
    Object.defineProperty(this, 'employees', {
        get: function() {
            return this.developers.filter(dev => dev.type === 'full-time').length;
        }
    });
    ```

---

### 2. Ações de Redução de Estresse e Melhorias no Escritório

Adicionar opções na interface e lógica corporativa para diminuir a tensão no dia a dia da equipe, permitindo a compra de itens permanentes de escritório ou o envio de desenvolvedores específicos para descanso.

*   **Lógica de Ações e Reduções (`processDecision`)**:
    
    ```javascript
    processDecision(decision) {
        switch(decision) {
            case 'hire':
                if (this.money >= 10000) {
                    const newId = this.developers.length + 1;
                    const names = ["Carol (Tech Lead)", "Pedro (Fullstack)", "Julia (Mobile)", "Mateus (Cloud)", "Aline (UI/UX)"];
                    const name = names[Math.floor(Math.random() * names.length)] + ` #${newId}`;
                    const avatars = ["👩‍💻", "👨‍💻", "🧑‍💻", "🦊", "🦁"];
                    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
                    
                    this.developers.push(new Developer(newId, name, avatar));
                    this.money -= 10000;
                    this.expenses += Math.floor(Math.random()*5500) + 4500;
                    this.messages.push(`Hired a new permanent developer: ${name}!`);
                } else {
                    this.messages.push("Not enough money to hire a new employee.");
                }
                break;

            case 'buy_coffee':
                if (this.money >= 5000) {
                    if (!this.hasCoffeeMachine) {
                        this.hasCoffeeMachine = true;
                        this.money -= 5000;
                        this.messages.push("☕ Purchased a Premium Coffee Machine! Base stress accumulation reduced by 5% per month.");
                    } else {
                        this.messages.push("You already have a Premium Coffee Machine!");
                    }
                } else {
                    this.messages.push("Not enough money to buy a Premium Coffee Machine ($5,000).");
                }
                break;

            case 'buy_foosball':
                if (this.money >= 8000) {
                    if (!this.hasFoosballTable) {
                        this.hasFoosballTable = true;
                        this.money -= 8000;
                        this.messages.push("⚽ Purchased a Foosball Table! Reduces 8% stress of all active employees every month.");
                    } else {
                        this.messages.push("You already have a Foosball Table!");
                    }
                } else {
                    this.messages.push("Not enough money to buy a Foosball Table ($8,000).");
                }
                break;
                
            // Mantém os demais comportamentos (develop, marketing, research, security)...
        }
    }
    ```

*   **Ação de Enviar para Dia de Folga (Day Off)**:
    Método específico para o painel "Descanso", permitindo aliviar o burnout de um dev de cada vez:

    ```javascript
    giveDayOff(devId) {
        if (this.isGameOver) return;
        const dev = this.developers.find(d => d.id === devId);
        if (!dev) return;
        
        if (dev.isBurnedOut) {
            this.messages.push(`🏖️ ${dev.name} is in severe burnout! A normal Day Off won't help, they need complete isolation for ${dev.burnoutCooldown} rounds.`);
            return;
        }
        
        if (dev.onDayOff) {
            this.messages.push(`${dev.name} is already resting!`);
            return;
        }
        
        dev.onDayOff = true;
        this.messages.push(`🏖️ Sent ${dev.name} on a paid day off. They will not work this round, and stress will fall by 50%!`);
    }
    ```

---

### 3. Mecânica de Simulação de Estresse e Ciclo de Burnout

A cada avanço de tempo (`advanceTime`), a engine atualizará o nível de estresse com base nas compras do escritório e nas tarefas exercidas na rodada.

*   **Atualização do Estresse a cada Turno (`advanceTime`)**:
    
    ```javascript
    // No método advanceTime(), processar a lista de desenvolvedores:
    this.developers.forEach((dev, index) => {
        // 1. Processar desenvolvedores em Burnout
        if (dev.isBurnedOut) {
            dev.burnoutCooldown--;
            // O estresse diminui lentamente de volta para 20%
            dev.stress = Math.max(20, dev.stress - 30);
            
            if (dev.burnoutCooldown <= 0) {
                dev.isBurnedOut = false;
                this.messages.push(`⚡ ${dev.name} has recovered from Burnout and is ready to work again!`);
            }
            return;
        }
        
        // 2. Processar desenvolvedores de folga (Day Off)
        if (dev.onDayOff) {
            dev.stress = Math.max(0, dev.stress - 50);
            dev.onDayOff = false; // Volta a trabalhar no próximo mês
            return;
        }
        
        // 3. Processar desenvolvedores trabalhando normalmente
        let baseStressIncrease = Math.floor(Math.random() * 11) + 7; // Aumento base de 7% a 17%
        
        // Reduzir aumento por conta da cafeteira
        if (this.hasCoffeeMachine) {
            baseStressIncrease = Math.max(2, baseStressIncrease - 5);
        }
        
        // Mesa de pebolim reduz o estresse acumulado acumulando alívio
        if (this.hasFoosballTable) {
            dev.stress = Math.max(0, dev.stress - 8);
        }
        
        dev.stress = Math.min(100, dev.stress + baseStressIncrease);
        
        // 4. Verificar se o desenvolvedor estourou o limite e entrou em Burnout
        if (dev.stress >= 100) {
            dev.isBurnedOut = true;
            dev.burnoutCooldown = 3; // Fica inutilizado por 3 rodadas
            dev.stress = 100;
            this.messages.push(`💥 BURN OUT! ${dev.name} collapsed due to stress and is out of service for 3 months!`);
        }
    });

    // Processamento de expiração de Freelancers:
    this.developers = this.developers.filter(dev => {
        if (dev.type === 'freelancer') {
            dev.daysRemaining--;
            if (dev.daysRemaining <= 0) {
                this.expenses -= 2000; // Reduz o custo mensal de diária
                this.messages.push(`🥷 Freelancer ${dev.name}'s contract expired and they left the project.`);
                return false; // Remove do array
            }
        }
        return true;
    });
    ```

*   **Penalidade na Ação "Develop Product"**:
    Os desenvolvedores ativos no desenvolvimento têm seu estresse acrescido em **20% adicionais** devido a horas extras.
    Se a maior parte da equipe estiver fora de combate (Burnout ou Day Off), a qualidade do produto gerado sofrerá uma penalidade de 30% devido à falta de braço técnico.

---

### 4. Menu "Freelas" (Contratação de Freelancers)

Permitir a contratação temporária de freelancers sob alta demanda para turbinar a entrega de projetos sem aumentar a folha de pagamento permanente.

*   **Ação de Contratar Freelancer**:
    Adicionar um submenu para contratar consultores temporários:

    ```javascript
    case 'hire_freelancer':
        if (this.money >= 4000) {
            const newId = this.developers.length + 1;
            const freelaNames = ["Xavier (Guru JS)", "Victor (Sniper Cloud)", "Marta (Python Ninja)", "Claudio (DB Guru)"];
            const name = freelaNames[Math.floor(Math.random() * freelaNames.length)] + ` (Freela)`;
            const avatar = "🥷";
            
            // Dura 3 meses/turnos na equipe
            this.developers.push(new Developer(newId, name, avatar, 0, false, 0, 'freelancer', 3));
            this.money -= 4000;
            this.expenses += 2000; // Acresce despesa recorrente de R$ 2.000 por turno ativo
            this.messages.push(`🥷 Contracted ${name} for 3 months! Quality of products developed during this time will increase.`);
        } else {
            this.messages.push("Not enough money to hire a freelancer ($4,000).");
        }
        break;
    ```

*   **Bônus do Freelancer**:
    Durante o desenvolvimento do produto (`develop`), se houver pelo menos um freelancer contratado na equipe:
    - O produto recebe **+15 pontos de qualidade** garantida.
    - O lucro gerado pelo produto aumenta em **20%** devido ao lançamento extremamente veloz.

---

### 5. Mecânica de Crise e Incidentes Críticos (Production Outages)

A cada avanço de tempo (`advanceTime`), haverá 10% de chance de disparar um incidente inesperado em produção, exigindo uma escolha tática do jogador com diferentes consequências.

*   **Modelo de Modal para Crises**:
    O modal será inserido no HTML de forma elegante e terá seu estilo definido com vidro escuro e bordas vermelhas chamativas.

    ```html
    <!-- Modal de Crises Críticas -->
    <div class="crisis-modal-overlay" id="crisis-modal-overlay" style="display: none;"></div>
    <div class="crisis-modal" id="crisis-modal" style="display: none;">
        <div class="crisis-icon">🚨</div>
        <div class="crisis-title" id="crisis-title">Production Outage!</div>
        <div class="crisis-desc" id="crisis-desc">O estagiário dropou a tabela errada.</div>
        <div class="crisis-options" id="crisis-options">
            <!-- Botões gerados dinamicamente -->
        </div>
    </div>
    ```

*   **Database de Crises e Lógica em JS**:
    
    ```javascript
    const CRISES_DATABASE = [
        {
            title: "🔥 DELETE sem WHERE em Produção!",
            desc: "O estagiário rodou um script de limpeza diretamente na base oficial e apagou toda a tabela de usuários ativos. Nossos clientes não conseguem logar!",
            options: [
                {
                    text: "💸 Contratar consultoria externa de recuperação emergencial (Custa $30,000)",
                    action: (game) => {
                        game.money = Math.max(0, game.money - 30000);
                        game.messages.push("Database restored by high-cost consultants. Crisis averted but cash hit!");
                    }
                },
                {
                    text: "💥 Forçar a equipe a trabalhar no final de semana (Estresse geral aumenta em 40%)",
                    action: (game) => {
                        game.developers.forEach(dev => {
                            dev.stress = Math.min(100, dev.stress + 40);
                        });
                        game.messages.push("Team worked 48 hours straight on pizza and energy drinks. Database restored, but stress exploded!");
                    }
                },
                {
                    text: "🤷‍♂️ Ignorar e deixar os devs consertarem sozinhos no ritmo normal (Perde 25 de Reputação)",
                    action: (game) => {
                        game.reputation = Math.max(0, game.reputation - 25);
                        game.messages.push("Outage ignored for days. Reputation plummeted due to massive customer complaints.");
                    }
                }
            ]
        },
        {
            title: "💻 Bug Gravíssimo no Fluxo de Checkout",
            desc: "Um bug bizarro está cobrando os clientes em dobro. Centenas de transações duplicadas foram identificadas e o gateway ameaça bloquear nossa chave!",
            options: [
                {
                    text: "💸 Efetuar o estorno total imediato e arcar com as tarifas bancárias (Custa $20,000)",
                    action: (game) => {
                        game.money = Math.max(0, game.money - 20000);
                        game.messages.push("Transactions refunded. Financial hit, but users and gateway are calm.");
                    }
                },
                {
                    text: "🔥 Convocar Devs Seniores para plantão 36h ininterrupto (Aumenta o estresse de 3 devs aleatórios em 45%)",
                    action: (game) => {
                        let shuffled = [...game.developers].sort(() => 0.5 - Math.random());
                        shuffled.slice(0, 3).forEach(dev => {
                            dev.stress = Math.min(100, dev.stress + 45);
                        });
                        game.messages.push("Seniores worked in shifts to deploy hotfix. checkout issue resolved, but devs are on the edge.");
                    }
                },
                {
                    text: "🤐 Tentar abafar o caso culpando instabilidade técnica externa (Perde 15 de reputação)",
                    action: (game) => {
                        game.reputation = Math.max(0, game.reputation - 15);
                        game.messages.push("PR department blamed global infrastructure. Many users remained unsatisfied. Reputation fell.");
                    }
                }
            ]
        }
    ];

    function checkAndTriggerCrisis() {
        if (!game || game.isGameOver) return;
        if (Math.random() < 0.10) { // 10% de chance a cada avanço
            const crisis = CRISES_DATABASE[Math.floor(Math.random() * CRISES_DATABASE.length)];
            
            document.getElementById('crisis-title').textContent = crisis.title;
            document.getElementById('crisis-desc').textContent = crisis.desc;
            
            const optionsDiv = document.getElementById('crisis-options');
            optionsDiv.innerHTML = '';
            
            crisis.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'crisis-option-btn';
                btn.textContent = opt.text;
                btn.onclick = () => {
                    opt.action(game);
                    closeCrisisModal();
                    updateGameDisplay();
                };
                optionsDiv.appendChild(btn);
            });
            
            document.getElementById('crisis-modal-overlay').style.display = 'block';
            document.getElementById('crisis-modal').style.display = 'block';
        }
    }

    function closeCrisisModal() {
        document.getElementById('crisis-modal-overlay').style.display = 'none';
        document.getElementById('crisis-modal').style.display = 'none';
    }
    ```

---

### 6. Interface Visual e Estilização HSL / Glassmorphic Premium

Apresentaremos a equipe em uma seção de gerenciamento rica e fluida. Cada funcionário terá um card contendo avatar, barra de estresse que altera de cor dinamicamente e controles de bem-estar.

*   **Markup da Aba de Equipe (HTML)**:
    Inserir a seção de gestão de equipe logo abaixo do painel de ações da empresa:

    ```html
    <div class="team-panel">
        <h3>💻 Engineering Team Management</h3>
        <div id="team-list" class="team-list">
            <!-- Populado dinamicamente -->
        </div>
        
        <!-- Ações Globais de RH -->
        <div class="office-upgrades-section" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="upgrade-btn-sm" id="btn-coffee-machine" onclick="buyOfficeUpgrade('buy_coffee')">☕ Cafeteira Premium ($5,000)</button>
                <button class="upgrade-btn-sm" id="btn-foosball" onclick="buyOfficeUpgrade('buy_foosball')">⚽ Mesa de Pebolim ($8,000)</button>
                <button class="upgrade-btn-sm" id="btn-hire-freela" onclick="buyOfficeUpgrade('hire_freelancer')">🥷 Contratar Freelancer ($4,000)</button>
            </div>
        </div>
    </div>
    ```

*   **Estilização Premium (CSS)**:
    
    ```css
    .team-panel {
        background: rgba(30, 30, 46, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 15px;
        margin-top: 20px;
        backdrop-filter: blur(10px);
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    }
    
    .team-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .team-member-card {
        display: flex;
        align-items: center;
        background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 6px;
        padding: 10px;
        border-left: 5px solid #2ecc71;
        transition: all 0.25s ease;
        justify-content: space-between;
    }
    
    .team-member-card.burned-out {
        border-left-color: #f38ba8;
        background: rgba(243, 139, 168, 0.08);
        animation: pulse-outage 2s infinite alternate;
    }
    
    .team-member-card.on-day-off {
        border-left-color: #89b4fa;
        background: rgba(137, 180, 250, 0.08);
    }
    
    .dev-avatar-display {
        font-size: 2rem;
        margin-right: 15px;
    }
    
    .dev-details {
        flex-grow: 1;
        margin-right: 15px;
    }
    
    .dev-name-title {
        font-weight: 700;
        font-size: 0.95rem;
        color: #cdd6f4;
    }
    
    .dev-status-badge {
        font-size: 0.75rem;
        color: #a6adc8;
        font-style: italic;
    }
    
    .stress-wrapper {
        margin-top: 6px;
    }
    
    .stress-status-line {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #bac2de;
    }
    
    .stress-progress-bg {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        margin-top: 3px;
        overflow: hidden;
    }
    
    .stress-progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s cubic-bezier(0.1, 1, 0.1, 1);
    }
    
    .upgrade-btn-sm {
        background: #313244;
        border: 1px solid rgba(255,255,255,0.1);
        color: #cdd6f4;
        font-size: 0.8rem;
        padding: 8px 12px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .upgrade-btn-sm:hover:not(:disabled) {
        background: #f5c2e7;
        color: #11111b;
        border-color: #f5c2e7;
    }

    .upgrade-btn-sm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    @keyframes pulse-outage {
        from { box-shadow: 0 0 5px rgba(243, 139, 168, 0.1); }
        to { box-shadow: 0 0 15px rgba(243, 139, 168, 0.3); }
    }
    ```

*   **Atualização Visual da UI (`updateGameDisplay`)**:
    
    ```javascript
    function updateTeamListUI() {
        const teamListDiv = document.getElementById('team-list');
        if (!teamListDiv || !game) return;
        teamListDiv.innerHTML = '';
        
        game.developers.forEach(dev => {
            const card = document.createElement('div');
            card.className = `team-member-card ${dev.isBurnedOut ? 'burned-out' : ''} ${dev.onDayOff ? 'on-day-off' : ''}`;
            
            // Decidir cor do stress
            let color = '#a6e3a1'; // Verde
            if (dev.stress > 75) color = '#f38ba8'; // Vermelho
            else if (dev.stress > 45) color = '#f9e2af'; // Amarelo/Laranja
            
            let statusLabel = '💻 Working';
            if (dev.isBurnedOut) {
                statusLabel = `💥 BURNOUT (${dev.burnoutCooldown}m)`;
            } else if (dev.onDayOff) {
                statusLabel = '🏖️ Day Off';
            } else if (dev.type === 'freelancer') {
                statusLabel = `🥷 Freelancer (${dev.daysRemaining}m remaining)`;
            }
            
            card.innerHTML = `
                <div class="dev-avatar-display">${dev.avatar}</div>
                <div class="dev-details">
                    <div class="dev-name-title">${dev.name}</div>
                    <div class="dev-status-badge">${statusLabel}</div>
                    <div class="stress-wrapper">
                        <div class="stress-status-line">
                            <span>Stress Level</span>
                            <span>${dev.stress}%</span>
                        </div>
                        <div class="stress-progress-bg">
                            <div class="stress-progress-fill" style="width: ${dev.stress}%; background-color: ${color};"></div>
                        </div>
                    </div>
                </div>
                <div class="dev-controls">
                    <button class="upgrade-btn-sm" 
                        onclick="sendDevOnDayOff(${dev.id})" 
                        ${dev.isBurnedOut || dev.onDayOff || game.isGameOver ? 'disabled' : ''}>
                        🏖️ Day Off
                    </button>
                </div>
            `;
            teamListDiv.appendChild(card);
        });
        
        // Atualizar estado das melhorias globais nos botões
        document.getElementById('btn-coffee-machine').disabled = game.hasCoffeeMachine || game.isGameOver;
        if (game.hasCoffeeMachine) document.getElementById('btn-coffee-machine').textContent = '☕ Coffee Machine (Active)';
        
        document.getElementById('btn-foosball').disabled = game.hasFoosballTable || game.isGameOver;
        if (game.hasFoosballTable) document.getElementById('btn-foosball').textContent = '⚽ Foosball Active';
    }

    // Handlers expostos ao escopo global
    window.sendDevOnDayOff = function(id) {
        if (game) {
            game.giveDayOff(id);
            updateGameDisplay();
        }
    };

    window.buyOfficeUpgrade = function(action) {
        if (game) {
            game.processDecision(action);
            updateGameDisplay();
        }
    };
    ```

A inclusão deste refinamento de alta precisão técnica deixará a tarefa perfeitamente clara e desenhada, garantindo que qualquer desenvolvedor possa implementá-la com o máximo de fidelidade e perfeição visual.

---

## ❓ Dúvidas para o TL ou o PO

Durante a análise técnica aprofundada da base de código legada em [index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/it_simulator/index.html) e dos requisitos de arquitetura especificados na tarefa, identifiquei alguns pontos críticos de consistência de dados e engenharia de software que requerem o alinhamento e decisão do Tech Lead ou Product Owner antes de prosseguirmos com a codificação.

### 1. Retrocompatibilidade e Modificação Direta de `this.employees`
No código original de [index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/it_simulator/index.html), a variável `this.employees` sofre atribuições diretas de incremento e decremento em pontos críticos da simulação (como `this.employees += 1` ao contratar, ou `this.employees -= 1` em eventos aleatórios de demissão). 
Ao converter `this.employees` em um **getter procedural** (para manter a consistência com o novo array `this.developers`), qualquer tentativa de reatribuir ou decrementar essa variável diretamente falhará silenciosamente (ou gerará um erro de execução em strict mode).
*   **Pergunta**: Devemos implementar também um **setter** para `this.employees` ou refatorar todas as ocorrências de alteração direta no código?
*   **Proposta do Desenvolvedor**: O mais elegante e robusto é implementar um `setter` para interceptar reatribuições e gerenciar o array de forma inteligente:
    *   **Se decrementado (`this.employees--` ou `employees = valor_menor`)**: Removemos automaticamente o desenvolvedor com maior nível de estresse da equipe (representando um pedido de demissão voluntária por esgotamento) ou o último contratado.
    *   **Se incrementado (`this.employees++` ou `employees = valor_maior`)**: Instanciamos um novo desenvolvedor permanente com dados aleatórios procedurais e adicionamos ao array.
    *   Desta forma, garantimos retrocompatibilidade com qualquer modificação futura ou legado sem quebrar a reatividade.

### 2. Persistência de Dados (Save/Load com `localStorage`)
O jogo possui mecanismos de save e load do estado da empresa através do `localStorage` (linhas 1726-1727 e 1810-1811). A serialização atual salva e restaura dados primitivos. Com a introdução do array complexo `this.developers` de instâncias da classe `Developer`, precisamos garantir que o carregamento reconstrói os objetos corretamente e não perca os dados de estresse, burnout ou status de freelancers.
*   **Pergunta**: O escopo desta tarefa deve abranger a refatoração do Save/Load para serializar/desserializar o array `this.developers` reconstruindo as instâncias da classe `Developer`?
*   **Proposta do Desenvolvedor**: Sim, devemos atualizar a serialização para incluir o array de desenvolvedores e, no carregamento, mapear o JSON cru de volta para instâncias da classe `Developer` para preservar os métodos e propriedades em runtime.

### 3. Aplicação do Estresse Adicional na Ação "Develop Product"
A especificação dita que a ação "Develop Product" aplica **20% de estresse adicional** nos desenvolvedores ativos.
*   **Pergunta**: Esse estresse adicional deve ser aplicado apenas à equipe fixa permanente, ou também aos freelancers temporários que estiverem ativos? E os profissionais que já estão de folga (`onDayOff = true`) ou em Burnout devem ser poupados desse acréscimo?
*   **Proposta do Desenvolvedor**: Aplicar a penalidade a todos os desenvolvedores cujo status atual seja de trabalho ativo (ou seja, que não estejam em Burnout nem de Day Off), incluindo freelancers, pois todos sofrem com o crunch time de entrega do produto.

### 4. Bloqueio e Escopo do Modal de Crises (Production Outages)
Os eventos aleatórios com modais pop-up adicionam excelente dinamismo à jogabilidade.
*   **Pergunta**: O modal de crise deve ser **bloqueante (modal síncrono)**, impedindo que o jogador continue clicando em outras ações ou avance o tempo até que tome uma decisão?
*   **Proposta do Desenvolvedor**: Sim, o modal deve cobrir a tela e bloquear interações de fundo com uma overlay escura glassmorphic para forçar a resolução do incidente, simulando com fidelidade o pânico de uma queda em produção de verdade.

---

## 💬 Decisão e Direcionamento do Tech Lead (TL)

Como **Tech Lead** do projeto, analisei os desafios de engenharia e as dúvidas apresentadas pela equipe de desenvolvimento para a implementação do Sistema de Estresse, Burnout, Crises e Freelancers. Abaixo estão as diretrizes arquiteturais oficiais para a execução segura da tarefa:

### 1. Retrocompatibilidade com `this.employees` ✅ APROVADO
*   **Decisão**: **Implementar o `setter` de `this.employees`**, exatamente como proposto pela engenharia.
*   **Diretriz Técnica**:
    *   Ao interceptar um decremento (`this.employees--`), remova do array `this.developers` o desenvolvedor permanente com maior estresse (pedindo demissão) ou o último adicionado.
    *   Ao interceptar um incremento (`this.employees++`), adicione um novo desenvolvedor permanente procedimental com nome/avatar randômico.
    *   Isso protege a integridade do estado legado e facilita a manutenção do código sem acoplamento de arquivos externos.

### 2. Persistência de Dados (Save/Load com `localStorage`) ✅ APROVADO
*   **Decisão**: **Sim, o escopo deve abranger a atualização completa de serialização e desserialização**.
*   **Diretriz Técnica**:
    *   No método que salva o jogo no `localStorage`, garanta a serialização de `this.developers`, preservando as propriedades (`stress`, `isBurnedOut`, `burnoutCooldown`, `type`, `daysRemaining`, etc.).
    *   No carregamento (`load`), o JSON bruto deve ser mapeado de volta para instâncias completas da classe `Developer`. Não aceitaremos objetos crus sem protótipo, pois isso inviabiliza o uso de métodos em runtime e gera riscos de regressão e bugs de tipagem implícita.

### 3. Stress Crunch em "Develop Product" ✅ APROVADO
*   **Decisão**: **A penalidade de +20% de estresse deve ser aplicada a todos os profissionais que de fato estiverem codando no produto nesta rodada**.
*   **Diretriz Técnica**:
    *   Aplica-se a desenvolvedores permanentes e freelancers ativos.
    *   **Exclusão**: Desenvolvedores em **Burnout** ou que foram enviados para **Day Off** no início da rodada **não** sofrem esse incremento, pois não estão trabalhando.

### 4. Bloqueio e Escopo do Modal de Crises (Production Outages) ✅ APROVADO
*   **Decisão**: **O modal de crises deve ser estritamente bloqueante (modal síncrono)**.
*   **Diretriz Técnica**:
    *   A overlay escura com desfoque de fundo (glassmorphic blur) deve impedir cliques e eventos em qualquer outra aba da interface (Develop, Hire, Upgrade, etc.) até que a decisão seja processada.
    *   Isso é vital do ponto de vista de sincronização do estado e jogabilidade: uma crise em produção consome toda a atenção operacional da startup.

---

**Com estas respostas, a tarefa é direcionada para execução. Status alterado para `In Progress` no backlog central.**

*Assinado: Tech Lead do Playful Hub*

---

## 🧪 Observação QA

**Data**: 31/05/2026  
**Analista de QA**: Antigravity (QA)  

### 📋 Status da Validação
*   **Testável**: ❌ Não
*   **Motivo**: A funcionalidade (Sistema de Estresse/Burnout, Crises Satíricas em Produção e Contratação de Freelancers) ainda está no status **`In Progress`** no backlog global e **não foi implementada** no código-fonte do jogo (`it_simulator/index.html`).
*   **Ação**: A tarefa deve ser concluída pelo desenvolvedor, passar por Code Review pelo Tech Lead, ser aprovada e movida para `Ready for QA` antes que os testes em navegador possam ser efetuados e suas evidências registradas.

### 🎯 Plano de Testes Futuro (Critérios a validar)
Quando a tarefa estiver pronta para QA, as seguintes validações deverão ser realizadas no navegador:
1.  **Gerenciamento de Estresse & Burnout**:
    *   Verificar se a aba "Engineering Team Management" exibe corretamente a lista de desenvolvedores com seus avatares, nomes, status reativos e barras de estresse coloridas dinamicamente (verde, amarelo, vermelho).
    *   Testar se a ação "Develop Product" adiciona corretamente a penalidade de +20% de estresse para desenvolvedores em atividade de código.
    *   Validar o acionamento do estado de Burnout quando o estresse de um desenvolvedor atinge 100%, reduzindo a produtividade geral, desativando os controles individuais e iniciando a contagem regressiva de recuperação (burnoutCooldown).
    *   Confirmar se a ação de enviar um desenvolvedor para "Day Off" zera seu estresse e o remove temporariamente do fluxo de trabalho sem aplicar a penalidade de estresse do desenvolvimento do produto.
2.  **Melhorias do Escritório (Coffee Machine & Foosball)**:
    *   Verificar se a compra da "Cafeteira Premium" e "Mesa de Pebolim" reduz o saldo da empresa ($5,000 e $8,000 respectivamente) e se o bônus passivo de redução de estresse por turno é aplicado corretamente no estado global.
    *   Garantir o bloqueio reativo dos botões de compra após a aquisição ativa.
3.  **Contratação de Freelancers**:
    *   Verificar se a contratação de freelancers ($4,000) adiciona um novo desenvolvedor temporário ao array global por 3 turnos e se ele é removido e limpo automaticamente da memória e do DOM ao término do contrato.
4.  **Sistema de Crises de Quedas de Produção (Production Outages)**:
    *   Simular o disparo de eventos aleatórios de crises (10% de chance a cada avanço) e validar se a overlay glassmorphic bloqueia completamente a interação de fundo com as outras abas.
    *   Testar as consequências de cada opção nas estatísticas do jogo (Reputação, Dinheiro e Estresse dos desenvolvedores), fechando o modal e atualizando a tela reativamente ao selecionar uma opção.
5.  **Retrocompatibilidade e Persistência**:
    *   Garantir a integridade da propriedade legacy `this.employees` através de seu setter procedural ao incrementar ou decrementar a equipe.
    *   Validar a persistência completa do array complexo `this.developers` de objetos instanciados da classe `Developer` ao salvar e carregar via `localStorage`.


