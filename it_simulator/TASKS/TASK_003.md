# 📝 TASK-IT_SIMULATOR: Sistema de Projetos Ativos (Contratos), Dívida Técnica (Tech Debt) e Áudio Procedural Synthesizer

## 👤 User Story
*   **Como** gerente de engenharia e arquiteto de software no minijogo **Company Simulator**,
*   **Eu quero** gerenciar projetos ativos baseados em contratos com clientes (prazos, escopo e multas), lidar com o acúmulo de Dívida Técnica (Tech Debt) gerada por decisões apressadas e ativar um sintetizador de áudio procedural para ambientação sonora,
*   **Para que** a simulação corporativa tenha um ciclo estratégico de entrega realista, forçando o balanceamento entre velocidade de desenvolvimento e sustentabilidade de código, acompanhado de feedback sonoro imersivo e premium.

---

## 🎯 Critérios de Aceitação

1.  **Sistema de Contratos e Projetos Ativos**:
    *   Substituir ou complementar a ação genérica "Develop Product" por um **Quadro de Contratos (Bidding Board)** contendo 3 opções de projetos rotativas (regeneradas a cada mês).
    *   Cada contrato possui:
        *   **Nome Temático**: ex: "E-Commerce de Alta Performance", "Plataforma de IA Generativa", "Integração de ERP Legado".
        *   **Requisitos de Competência**: Nível mínimo requerido de habilidades do jogador (ex: Backend Nível 3, Javascript Nível 2) ou tamanho mínimo da equipe.
        *   **Prazos e Metas**: Duração em meses (3 a 6 meses) e Pontos de Esforço necessários (ex: 80 a 200 pontos de entrega).
        *   **Financeiro**: Pagamento ao concluir ($40.000 a $150.000) e Multa por atraso ($15.000 a $50.000), além de perda de reputação (-15).
    *   O jogador pode ter até **2 contratos ativos simultaneamente**.
    *   A cada turno (mês), a força de trabalho ativa (desenvolvedores não-burnout e não-folga) gera **Pontos de Entrega (Delivery Points)** baseados em suas habilidades e bônus de freelancers.
    *   Mecânica de **Rushing (Aceleração)**: O jogador pode marcar um projeto ativo para "Rushed". Isso dobra os pontos entregues pelo turno, mas adiciona 15% de estresse extra a todos os devs envolvidos e aumenta a dívida técnica da empresa.

2.  **Mecânica de Dívida Técnica (Tech Debt)**:
    *   Introduzir o indicador estatístico de **Dívida Técnica (Tech Debt)** de 0% a 100% no painel da empresa.
    *   **Acúmulo de Tech Debt**:
        *   Cada mês com projeto marcado como "Rushed": +8% de Tech Debt.
        *   Cada mês em que um Freelancer trabalha no código: +4% de Tech Debt (pela pressa e falta de padronização).
        *   Opções rápidas/baratas tomadas em modais de crises (TASK_002): acumulam de +10% a +20% de Tech Debt.
    *   **Impacto de Tech Debt**:
        *   **Custo Operacional (Expenses)**: Aumento passivo nos custos mensais em +$300 para cada 10% de Tech Debt acumulado (custo de manutenção/refatoração de código mal escrito).
        *   **Desempenho da Equipe**: Aceleração de desenvolvimento reduzida em 0.4% para cada 1% de Tech Debt (código confuso atrasa as entregas).
        *   **Segurança (Security Risk)**: Aumenta a chance base de Data Breaches/Hacking em até 2.0x quando a dívida está em 100%.
    *   **Ação de Refatoração (Refactor Systems)**:
        *   Adicionar um novo botão de ação no menu: `🛠️ Refactor Systems ($15,000)`.
        *   Esta ação consome $15.000, não avança o progresso dos contratos do turno (devs focados em limpeza), mas reduz a Dívida Técnica em **25%** absolutos.

3.  **Áudio Procedural via Web Audio API (Office Synth Engine)**:
    *   Desenhar uma engine de som nativa baseada inteiramente em osciladores (`OscillatorNode`), filtros (`BiquadFilterNode`) e envelopes de ganho, sem usar arquivos MP3 externos.
    *   **Música de Fundo (Office BGM)**: Uma melodia lo-fi relaxante estilo "elevador corporativo" em loop (escala pentatônica maior, notas suaves com onda senoidal/triangular e batida sintetizada suave por ruído filtrado). Deve haver um botão toggle `🔊 Sound: ON/OFF` no topo da UI.
    *   **Efeitos Sonoros (SFX)**:
        *   *Assinar Contrato*: Som de papel deslizando seguido de um acorde harmônico.
        *   *Contrato Entregue (Sucesso)*: Arpejo brilhante ascendente rápido acompanhado de som de caixa registradora.
        *   *Falha de Prazo (Multa)*: Som metálico descendente dissonante.
        *   *Alerta de Crise/Outage*: Sinal sonoro de aviso duplo (frequência baixa e alta alternadas).
        *   *Burnout de Dev*: Ruído branco modulado por filtro passa-baixa (efeito de "sopro desanimado").

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/it_simulator/index.html` (HTML, CSS e scripts unificados).
*   **Modelagem de Contratos**:
    *   Estrutura de dados para representar um contrato em andamento:
    ```javascript
    class ClientContract {
        constructor(id, name, type, effortNeeded, reward, penalty, duration, requiredSkill = null, requiredLevel = 0) {
            this.id = id;
            this.name = name;
            this.type = type; // 'app', 'web', 'ai', 'database'
            this.effortNeeded = effortNeeded;
            this.effortDelivered = 0;
            this.reward = reward;
            this.penalty = penalty;
            this.duration = duration; // Meses restantes
            this.isRushed = false;
        }
    }
    ```
*   **Integração no Loop Principal (`advanceTime`)**:
    *   Calcular a geração de pontos de esforço da equipe por turno:
        $$\text{Fator Equipe} = \sum_{\text{devs ativos}} (\text{Produtividade Base} \times \text{Bônus Freelancer})$$
        $$\text{Produtividade Real} = \text{Fator Equipe} \times (1.0 - (\text{TechDebt} \times 0.004))$$
    *   Distribuir os pontos gerados entre os contratos ativos. Se "Rushed" estiver ativo para um contrato, dobrar a entrega naquele contrato e somar estresse aos devs envolvidos.
    *   Decrementar o prazo dos contratos ativos. Se `effortDelivered >= effortNeeded` dentro do prazo, pagar a recompensa, somar reputação e encerrar o projeto. Se `duration <= 0` e o projeto não estiver concluído, cobrar a multa, remover reputação e cancelar.
*   **Controle de Dívida Técnica**:
    *   Adicionar propriedade `this.techDebt` (iniciando em 15%) na classe `TechCompanySimulation`.
    *   Incluir no cálculo financeiro mensal: `this.expenses += Math.floor(this.techDebt * 30);`.
*   **Engine de Áudio Procedural**:
    *   Criar uma classe singleton `CorporateAudioEngine` contendo o `AudioContext`.
    *   Instanciar o loop do BGM através de um sequenciador de tempo simples (`setInterval` ou `AudioContext.currentTime` scheduling).
    *   Disparar SFX chamando `CorporateAudioEngine.playSFX(type)`.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Completa o ciclo de design de sistemas do Company Simulator, criando um loop tático real de risco-recompensa sobre qualidade do código vs. prazos de entrega).
*   **Esforço Estimado**: Alta (Requer sincronização fina de prazos, distribuição de pontos de esforço de devs, persistência no localStorage e síntese Web Audio API robusta).
*   **Área**: Front-end / Simulação Matemática / Áudio / UI.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os métodos, algoritmos e estilos necessários para integrar o Quadro de Contratos, Dívida Técnica e o Sintetizador de Áudio.

---

### 1. Modelagem do Quadro de Contratos (Client Contracts Board)

Para substituir a lógica aleatória de "Develop Product", a classe `TechCompanySimulation` manterá uma lista de contratos ativos e um pool de contratos disponíveis.

*   **Estruturas de Dados no State (`TechCompanySimulation` Constructor)**:

    ```javascript
    this.techDebt = 15; // Dívida técnica inicial
    this.activeContracts = []; // Max 2
    this.availableContracts = []; // Exatamente 3
    this.completedContractsCount = 0;
    
    // Gerar os contratos iniciais disponíveis
    this.regenerateAvailableContracts();
    ```

*   **Gerador Procedural de Contratos**:
    A cada mês, se houver espaços vazios no quadro de disponíveis, preencher com novos contratos aleatórios coerentes com a reputação atual:

    ```javascript
    regenerateAvailableContracts() {
        const types = [
            { name: "Fintech App Core", type: "backend", baseEffort: 100, reward: 60000, penalty: 20000, duration: 4, reqSkill: "backend", reqLevel: 2 },
            { name: "SaaS Landing Page", type: "web", baseEffort: 60, reward: 35000, penalty: 12000, duration: 3, reqSkill: "html_css", reqLevel: 1 },
            { name: "AI Recommendation Engine", type: "ai", baseEffort: 150, reward: 110000, penalty: 45000, duration: 5, reqSkill: "javascript", reqLevel: 3 },
            { name: "Cyber-Security Audit Tool", type: "database", baseEffort: 120, reward: 85000, penalty: 30000, duration: 4, reqSkill: "networks", reqLevel: 3 },
            { name: "Crypto Trading Dashboard", type: "web", baseEffort: 90, reward: 55000, penalty: 18000, duration: 3, reqSkill: "javascript", reqLevel: 2 }
        ];

        while (this.availableContracts.length < 3) {
            const proto = types[Math.floor(Math.random() * types.length)];
            const modifier = 0.9 + Math.random() * 0.3; // Flutuação de 30%
            
            const id = 'contract_' + Math.random().toString(36).substr(2, 9);
            const effort = Math.floor(proto.baseEffort * modifier);
            const reward = Math.floor(proto.reward * modifier);
            const penalty = Math.floor(proto.penalty * modifier);
            
            this.availableContracts.push({
                id: id,
                name: proto.name,
                type: proto.type,
                effortNeeded: effort,
                effortDelivered: 0,
                reward: reward,
                penalty: penalty,
                duration: proto.duration,
                initialDuration: proto.duration,
                requiredSkill: proto.reqSkill,
                requiredLevel: proto.reqLevel
            });
        }
    }
    ```

---

### 2. Algoritmo de Delivery e Aceleração (Rushing)

Durante o `advanceTime`, processar a geração de pontos de código e atualizar os contratos.

*   **Processamento de Pontos de Entrega e Impacto da Dívida Técnica**:

    ```javascript
    processContractsDelivery() {
        if (this.activeContracts.length === 0) return;
        
        // 1. Calcular poder de entrega da equipe nesta rodada
        let totalForcePoints = 0;
        this.developers.forEach(dev => {
            if (!dev.isBurnedOut && !dev.onDayOff) {
                let devContribution = 10; // Contribuição base
                
                // Desenvolvedores experientes e freelancers dão mais pontos
                if (dev.type === 'freelancer') {
                    devContribution = 18;
                } else {
                    // Contribuição baseada no nível geral (exemplo de aproximação)
                    devContribution += (dev.stress < 40) ? 4 : 0;
                }
                totalForcePoints += devContribution;
            }
        });
        
        // Integrar bônus do jogador principal baseada em suas skills
        if (player) {
            const playerBonus = (player.skills.javascript + player.skills.backend + player.skills.html_css) * 2;
            totalForcePoints += playerBonus;
        }
        
        // Redução por dívida técnica: cada 1% de Tech Debt reduz produtividade em 0.4%
        const debtModifier = Math.max(0.4, 1.0 - (this.techDebt * 0.004));
        let finalEffortAvailable = Math.floor(totalForcePoints * debtModifier);
        
        if (this.activeContracts.length === 0) return;
        
        // Dividir os pontos disponíveis igualmente ou focar nos contratos
        const pointsPerContract = Math.floor(finalEffortAvailable / this.activeContracts.length);
        
        this.activeContracts.forEach(contract => {
            let delivered = pointsPerContract;
            
            // Se estiver em Rushing, dobra a entrega
            if (contract.isRushed) {
                delivered = delivered * 2;
                this.techDebt = Math.min(100, this.techDebt + 4); // Rushing gera Tech Debt adicional
                
                // Acrescer estresse adicional nos desenvolvedores
                this.developers.forEach(dev => {
                    if (!dev.isBurnedOut && !dev.onDayOff) {
                        dev.stress = Math.min(100, dev.stress + 15);
                    }
                });
                this.messages.push(`🔥 Crunch Mode! Rushed development on ${contract.name}. Team stress and Tech Debt increased!`);
            }
            
            contract.effortDelivered = Math.min(contract.effortNeeded, contract.effortDelivered + delivered);
        });
    }
    ```

*   **Ciclo de Vida do Contrato (Verificação de Prazo)**:

    ```javascript
    updateContractsTimeline() {
        for (let i = this.activeContracts.length - 1; i >= 0; i--) {
            const contract = this.activeContracts[i];
            contract.duration--;
            
            // Verificar Conclusão
            if (contract.effortDelivered >= contract.effortNeeded) {
                this.money += contract.reward;
                this.reputation = Math.min(100, this.reputation + 8);
                this.completedContractsCount++;
                this.messages.push(`🎉 Contract Complete! Delivered '${contract.name}' successfully. Earned $${contract.reward.toLocaleString()}!`);
                
                if (typeof window.playSFX === 'function') window.playSFX('success');
                
                // Remover do array
                this.activeContracts.splice(i, 1);
            }
            // Verificar Estouro de Prazo (Falha)
            else if (contract.duration <= 0) {
                this.money = Math.max(0, this.money - contract.penalty);
                this.reputation = Math.max(0, this.reputation - 15);
                this.messages.push(`🚨 Contract Failed! Missed deadline for '${contract.name}'. Paid penalty of $${contract.penalty.toLocaleString()}.`);
                
                if (typeof window.playSFX === 'function') window.playSFX('failure');
                
                this.activeContracts.splice(i, 1);
            }
        }
        
        // Aumentar Tech Debt por freelancers
        const freelancerCount = this.developers.filter(d => d.type === 'freelancer').length;
        if (freelancerCount > 0) {
            this.techDebt = Math.min(100, this.techDebt + (freelancerCount * 2));
        }
    }
    ```

---

### 3. Síntese de Áudio Procedural (Web Audio Engine)

Para fornecer imersão profissional, desenharemos um sintetizador puro que roda nativo no navegador através da Web Audio API.

*   **Estrutura do Sintetizador (`CorporateAudioEngine`)**:

    ```javascript
    class CorporateAudioEngine {
        constructor() {
            this.ctx = null;
            this.isEnabled = false;
            this.bgmInterval = null;
            this.masterGain = null;
        }

        init() {
            if (this.ctx) return;
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime); // Volume geral suave
            this.masterGain.connect(this.ctx.destination);
            this.isEnabled = true;
            
            this.startBGMLoop();
        }

        toggle(state) {
            if (!this.ctx) this.init();
            this.isEnabled = state;
            if (this.masterGain) {
                this.masterGain.gain.setValueAtTime(state ? 0.15 : 0, this.ctx.currentTime);
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        playSFX(type) {
            if (!this.isEnabled || !this.ctx) return;
            
            const now = this.ctx.currentTime;
            
            if (type === 'click') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.05);
            } 
            else if (type === 'success') {
                // Arpejo de sucesso brilhante
                const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    
                    gain.gain.setValueAtTime(0, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
                    
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.3);
                });
            }
            else if (type === 'failure') {
                // Som descendente dissonante
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.linearRampToValueAtTime(90, now + 0.4);
                
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.4);
            }
            else if (type === 'burnout') {
                // Ruído filtrado descendente
                const bufferSize = this.ctx.sampleRate * 0.5;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1200, now);
                filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);
                
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterGain);
                noise.start(now);
                noise.stop(now + 0.5);
            }
            else if (type === 'crisis') {
                // Alarme duplo intermitente
                [0, 0.2].forEach(delay => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(delay === 0 ? 440 : 380, now + delay);
                    
                    gain.gain.setValueAtTime(0.1, now + delay);
                    gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
                    
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(now + delay);
                    osc.stop(now + delay + 0.2);
                });
            }
        }

        startBGMLoop() {
            // Sequenciador de notas Lofi Pentatônico Maior em Dó (C D E G A)
            const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
            const progression = [
                [0, 2, 4], // C major vibes
                [1, 3, 5], // D minor vibes
                [2, 4, 0], // E minor
                [3, 5, 2]  // F / G major style
            ];
            let currentStep = 0;

            this.bgmInterval = setInterval(() => {
                if (!this.isEnabled || !this.ctx) return;
                
                const now = this.ctx.currentTime;
                const chordIdx = Math.floor(currentStep / 4) % progression.length;
                const chord = progression[chordIdx];
                const note = scale[chord[currentStep % chord.length]];
                
                // Tocar a nota principal suave
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(note, now);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.04, now + 0.2);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.9);
                
                currentStep++;
            }, 1000); // 60 BPM
        }
    }

    const audioEngine = new CorporateAudioEngine();
    window.playSFX = (type) => audioEngine.playSFX(type);
    window.toggleSound = (state) => audioEngine.toggle(state);
    ```

---

### 4. Layout CSS e HTML Premium (Glassmorphism & Neon)

Abaixo estão detalhadas as inclusões visuais para exibir os Contratos Ativos e Disponíveis, e a barra brilhante de Dívida Técnica.

*   **Markup da Aba de Contratos (HTML)**:
    Substituir o botão antigo `#actions button[data-action="develop"]` ou adaptá-lo para abrir a aba/seção de contratos e projetos:

    ```html
    <!-- Nova Seção de Contratos e Tech Debt -->
    <div class="contracts-panel">
        <div class="panel-header-row" style="display: flex; justify-content: space-between; align-items: center;">
            <h3>💼 Client Contracts Board</h3>
            <div class="tech-debt-container" style="text-align: right; min-width: 150px;">
                <span class="tech-debt-label">Tech Debt: <span id="techDebtDisplay">15%</span></span>
                <div class="tech-debt-progress-bg">
                    <div class="tech-debt-progress-fill" id="techDebtBar" style="width: 15%;"></div>
                </div>
            </div>
        </div>
        
        <!-- Lista de Contratos Disponíveis para Assinar -->
        <div class="contracts-sub-section">
            <h4>Available Contracts (Select to sign)</h4>
            <div class="available-contracts-grid" id="available-contracts-list">
                <!-- Populado dinamicamente -->
            </div>
        </div>
        
        <!-- Lista de Projetos Ativos em Desenvolvimento -->
        <div class="contracts-sub-section" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
            <h4>Active Projects (<span id="active-contracts-count">0</span>/2)</h4>
            <div class="active-contracts-list" id="active-contracts-list">
                <!-- Populado dinamicamente -->
            </div>
        </div>
        
        <!-- Ação Especial de Refatoração -->
        <div style="margin-top: 12px; text-align: center;">
            <button class="upgrade-btn-sm" id="btn-refactor-code" onclick="refactorCodebase()">
                🛠️ Refactor Codebase ($15,000)
                <span style="display:block; font-size: 0.7rem; opacity: 0.8;">Reduces Tech Debt by 25%</span>
            </button>
        </div>
    </div>
    ```

*   **Estilização Estética CSS**:

    ```css
    .contracts-panel {
        background: rgba(30, 30, 46, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 15px;
        margin-top: 20px;
        backdrop-filter: blur(10px);
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
    }
    
    .tech-debt-container {
        font-size: 0.8rem;
        font-weight: bold;
    }
    
    .tech-debt-progress-bg {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        margin-top: 3px;
        overflow: hidden;
    }
    
    .tech-debt-progress-fill {
        height: 100%;
        background-color: #f38ba8; /* Vermelho/Magenta Neon */
        box-shadow: 0 0 8px rgba(243, 139, 168, 0.6);
        border-radius: 3px;
        transition: width 0.4s ease;
    }
    
    .available-contracts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
        margin-top: 8px;
    }
    
    .contract-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 6px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: all 0.2s ease;
    }
    
    .contract-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: #89b4fa;
        transform: translateY(-2px);
    }
    
    .contract-title {
        font-weight: 700;
        font-size: 0.85rem;
        color: #cdd6f4;
    }
    
    .contract-meta {
        font-size: 0.75rem;
        color: #a6adc8;
        margin-top: 4px;
        line-height: 1.3;
    }
    
    .contract-btn-sm {
        margin-top: 8px;
        width: 100%;
        padding: 5px;
        font-size: 0.75rem;
        background: #313244;
        border: 1px solid rgba(255,255,255,0.08);
        color: #cdd6f4;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    
    .contract-btn-sm:hover:not(:disabled) {
        background: #a6e3a1;
        color: #11111b;
    }
    
    /* Layout do Projeto Ativo */
    .active-project-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 10px;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    
    .project-progress-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: #bac2de;
    }
    
    .project-bar-bg {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
    }
    
    .project-bar-fill {
        height: 100%;
        background-color: #89b4fa; /* Ciano/Azul Neon */
        border-radius: 4px;
        transition: width 0.3s ease;
    }
    
    /* Toggle de som no cabeçalho */
    .sound-toggle-btn {
        background: none;
        border: 1px solid rgba(255,255,255,0.2);
        color: #cdd6f4;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .sound-toggle-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: #f5c2e7;
    }
    ```

---

### 5. Guia de Integração e Testabilidade

1.  **Geração e Assinatura de Contratos**:
    *   No início de cada turno, invocar `game.regenerateAvailableContracts()` para manter o pool com 3 contratos disponíveis.
    *   Verificar se a assinatura consome o slot correto (`game.activeContracts.push(chosenContract)`) e retira-o do quadro de disponíveis, emitindo o sinal sonoro `playSFX('click')`.
2.  **Lógica do Progresso**:
    *   Em `advanceTime()`, chamar `game.processContractsDelivery()` para calcular e aplicar a força de trabalho ativa nos projetos e gerar Tech Debt se estiver em modo Rushed.
    *   Em seguida, chamar `game.updateContractsTimeline()` para decrescer os timers e checar se o projeto foi entregue com lucro ou estourou o prazo sob multa.
3.  **Persistência**:
    *   Estender as funções de Save/Load do localStorage para abranger as novas propriedades do jogo: `this.techDebt`, `this.activeContracts` e `this.availableContracts`.

Este escopo eleva a complexidade do **Company Simulator** para um padrão de excelência de simulador de estúdio, garantindo diversão e imersão total!

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Dependência Crítica da TASK_002**: **Decisão:** Você pode começar o front-end visual e a estrutura paralela (Quadro de Contratos e Audio engine), mockando as variáveis de freelancer até que a TASK_002 seja mesclada. Evite refatoração de arrays da `this.developers` até o merge.
2. **Valores da Dívida Técnica**: **Decisão:** Siga o detalhamento técnico: `+4%` para Rushing e `+2%` por Freelancer ativo. A diferença será retificada na história de usuário no próximo refinamento de regras.
3. **Custo Operacional Adicional**: **Decisão:** Adote a fórmula contínua (`this.techDebt * 30`). É melhor computacionalmente e distribui a penalidade suavemente para o jogador em vez de solavancos agressivos de custo.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `it_simulator`
* **Status do Backlog**: Transicionado para `✅ Refined` em `BACKLOG.md`.
