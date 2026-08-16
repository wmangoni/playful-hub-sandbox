# 📝 TASK-IT_SIMULATOR-004: Sistema de Oferta Pública Inicial (IPO), Departamentos Especializados (DevOps, QA, IA/ML), Investidores-Anjo & Rodadas M&A

## 👤 User Story
*   **Como** CEO e Founder Tecnológico no minijogo **Company Simulator**,
*   **Eu quero** abrir o capital da startup na Bolsa de Valores (IPO), gerenciar Departamentos Especializados (DevOps Squad, QA Guild, AI/ML Labs), negociar com Investidores-Anjo e Venture Capital, e realizar Fusões e Aquisições (M&A) de startups concorrentes,
*   **Para que** o jogo entregue uma experiência completa de endgame corporativo, alta profundidade estratégica de tomada de decisões C-Level, progressão financeira ilimitada e alta retenção com sonorização procedural inspiradora.

---

## 🎯 Critérios de Aceitação

1.  **Oferta Pública Inicial & Mercado de Ações (IPO & Wall Street Stock Market)**:
    *   **Pré-requisitos para IPO**:
        *   Valuation Corporativo $\ge \$500.000$.
        *   Reputação no mercado $\ge 80/100$.
        *   Pelo menos 3 produtos lançados no portfólio.
    *   **Abertura de Capital (Ringing the Bell 🔔)**:
        *   Botão na HUD `"Go Public (Launch IPO)"` habilitado quando os pré-requisitos forem atingidos.
        *   Ao clicar, aciona o ritual de toque do sino de Wall Street com animação modal triunfal de confetes, Notícias no Jornal Financeiro e lançamento do Ticker de Ações da empresa (ex: `$PLAY`).
    *   **Flutuação Dinâmica das Ações**:
        *   O preço da ação oscila a cada avanço mensal com base na receita trimestral, margem de lucro e nível de Dívida Técnica (Tech Debt).
        *   Fórmula de preço: $P_t = P_{t-1} \times \left(1 + \frac{\text{LucroMensal}}{\text{Valuation}} - 0.05 \times \frac{\text{TechDebt}}{100}\right) + \text{Noise}$.
    *   **Ações de Gestão de Capital**:
        *   *Recompra de Ações (Share Buyback)*: Recompra 5% das ações em circulação para inflar a cotação e recuperar controle acionário.
        *   *Distribuição de Dividendos*: Paga dividendos aos acionistas para ganhar $+10$ de Reputação instantânea.
        *   *Oferta Secundária (Follow-on)*: Emite mais ações para captar caixa imediato (com diluição acionária).

2.  **Departamentos Especializados (DevOps Squad, QA Guild & AI/ML Labs)**:
    *   No painel da empresa, o jogador pode fundar 3 departamentos estratégicos avançados:
    *   **Squad DevOps** (Custo: $\$25.000$ + custo fixo mensal de $\$3.000$):
        *   Automatiza a esteira de CI/CD.
        *   Reduz a probabilidade de Crises em Produção (Production Outages) em **60%**.
        *   Acelera a velocidade de desenvolvimento de novos produtos e contratos em **25%**.
    *   **QA Guild** (Custo: $\$20.000$ + custo fixo mensal de $\$2.500$):
        *   Reduz passivamente a Dívida Técnica (Tech Debt) em **5% a cada mês**.
        *   Garante imunidade contra bugs críticos em lançamentos.
    *   **AI/ML Innovation Lab** (Custo: $\$50.000$ + custo fixo mensal de $\$6.000$):
        *   Desbloqueia a criação de Produtos SaaS de Inteligência Artificial Generativa.
        *   Concede multiplicador de **1.5x na receita mensal de produtos** e aumenta o valuation da empresa em **+20%**.

3.  **Investidores-Anjo, Rodadas VC (Seed, Series A/B) e Fusões & Aquisições (M&A)**:
    *   **Captação de Investimentos (Pitching)**:
        *   O jogador pode aceitar aportes de Venture Capital (Seed $\$50.000$, Series A $\$200.000$, Series B $\$1.000.000$) em troca de porcentagem de Equity ($10\% \text{ a } 25\%$).
    *   **Painel de M&A (Acquisitions)**:
        *   Permite comprar startups concorrentes no mercado (ex: *ByteStack*, *QuantumCloud*, *CyberDyne Systems*).
        *   Ao adquirir uma concorrente, absorve instantaneamente sua base de usuários (+Receita), seus desenvolvedores seniores (+Equipe) e elimina um rival do mercado.

4.  **Web Audio API Executive Soundscape & Interface Glassmorphic**:
    *   **Sonorização Procedural C-Level**:
        *   *Trilha Lofi-Synth Corporativa*: Drones e acordes sintetizados relaxantes (escalas m7 e maj7 com osciladores senoidais sutis) para o ambiente de trabalho.
        *   *Sino da Bolsa (Wall Street Bell)*: Síntese de sino metálico cristalino com harmônicos brilhantes.
        *   *Ticker Sound Effect*: Cliques eletrônicos suaves sincronizados às oscilações de alta/baixa das ações.
    *   **Interface Financial Dashboard**:
        *   Modal glassmorphic contendo gráfico de velas/linha simples de desempenho de ações, relatórios de D&D e controle acionário.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/it_simulator/index.html`.
*   **Estrutura do Estado Global Expandido (`gameState`)**:
    ```javascript
    const ipoState = {
        isPublic: false,
        ticker: "PLAY",
        stockPrice: 10.00,
        historicalPrices: [10.00],
        sharesOutstanding: 100000,
        playerEquityPercent: 100, // % de controle do Founder
        dividendYield: 0.0,
        totalValuation: 1000000
    };

    const departmentsState = {
        devops: { founded: false, cost: 25000, upkeep: 3000, bonusCd: 0.25 },
        qa: { founded: false, cost: 20000, upkeep: 2500, debtReduction: 5 },
        aiml: { founded: false, cost: 50000, upkeep: 6000, revenueMult: 1.5 }
    };

    const acquisitionsMarket = [
        { id: "bytestack", name: "ByteStack Inc", price: 150000, devs: 3, revenue: 12000, bought: false },
        { id: "quantum", name: "QuantumCloud", price: 400000, devs: 5, revenue: 35000, bought: false },
        { id: "cyberdyne", name: "CyberDyne Systems", price: 1200000, devs: 10, revenue: 110000, bought: false }
    ];
    ```

*   **Algoritmo de Atualização do Preço da Ação no Ticker**:
    ```javascript
    function updateStockMarketPrice() {
        if (!ipoState.isPublic) return;

        const monthlyProfit = gameState.monthlyRevenue - gameState.monthlyExpenses;
        const profitRatio = monthlyProfit / Math.max(100000, ipoState.totalValuation);
        const techDebtPenalty = (gameState.techDebt || 0) * 0.001;
        const noise = (Math.random() - 0.48) * 0.04; // Flutuação estocástica leve

        let deltaPercent = profitRatio - techDebtPenalty + noise;
        deltaPercent = Math.max(-0.15, Math.min(0.20, deltaPercent)); // Cap entre -15% e +20%

        ipoState.stockPrice = parseFloat((ipoState.stockPrice * (1 + deltaPercent)).toFixed(2));
        if (ipoState.stockPrice < 1.00) ipoState.stockPrice = 1.00;

        ipoState.historicalPrices.push(ipoState.stockPrice);
        if (ipoState.historicalPrices.length > 20) ipoState.historicalPrices.shift();

        ipoState.totalValuation = Math.round(ipoState.stockPrice * ipoState.sharesOutstanding);
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Muito Alta (Conclui a jornada do jogador transformando a startup em um império de tecnologia de capital aberto).
*   **Esforço Estimado**: Alta (Modelagem financeira de ações, gerenciamento de acionistas, 3 novos departamentos sistêmicos e integração de gráficos financeiros).
*   **Área**: Front-end / UI / Modelagem Financeira / Web Audio API.

---

## 🛠️ Refinamento Técnico (Technical Refinement pelo Tech Lead)

### 1. Síntese Sonora do Sino de Wall Street (Web Audio API)
```javascript
function playWallStreetBellSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const now = audioCtx.currentTime;
    // Oscilador de tom principal metálico
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1470, now); // D6
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2940, now); // Harmonico alto

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);
}
```

### 2. Garantia de Retrocompatibilidade no Save/Load (`localStorage`)
*   **Diretriz Arquitetural**: Os objetos `ipoState`, `departmentsState` e `acquisitionsMarket` devem ser incluídos na chave de salvamento `techCompanySave`. Caso o jogador recarregue um save da `TASK_003` que não possua essas chaves, o inicializador aplicará os objetos padrão com sanitização automática (`Object.assign(ipoState, loadedSave.ipoState || {})`).

---

## ❓ Dúvidas para o TL ou o PO

1.  **Perda do Controle Acionário (Takeover Hostil)**: Se o jogador vender mais de 50% das ações para investidores e o preço da ação cair drasticamente, o conselho pode demiti-lo (Game Over por Hostile Takeover)?
    *   *Direcionamento do Tech Lead*: Sim! Se `playerEquityPercent < 50%` e a empresa tiver 3 meses consecutivos de prejuízo, dispara a modal "Fired by Board of Directors!", gerando um desfecho dramático e realista de Game Over.
2.  **Manutenção dos Departamentos**: Os custos fixos dos departamentos entram no cálculo das despesas mensais gerais?
    *   *Direcionamento do Tech Lead*: Sim. A função `calculateMonthlyExpenses()` deve iterar sobre os departamentos fundados e somar seus respectivos `upkeep` nas despesas fixas.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Estabilidade de Performance**: A renderização do gráfico de ações no Canvas deve ser efetuada com traços simples vetorizados (`ctx.lineTo`), evitando a inclusão de bibliotecas externas como Chart.js para manter zero dependências e velocidade de carregamento instantânea.
2. **Segurança de Fluxo Financeiro**: Recompra e emissão de ações devem atualizar reativamente os campos de Dinheiro (`money`) e Valuation, recalculando a reputação da empresa.

---

## 🚀 Status do Refinamento Técnico

* **Identificação do Jogo**: `it_simulator` (Company Simulator)
* **Status do Backlog**: Homologado pelo Tech Lead. Tarefa pronta e registrada no `BACKLOG.md` no status `✅ Refined`.

*Assinado: Antigravity - Tech Lead (TL)*
