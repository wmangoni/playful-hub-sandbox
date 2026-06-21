# 📝 TASK-POKER: Personalidades de IA, Sistema de Blefe e Assistente de Probabilidade (Hand Tracker)

**Status:** 🎉 Ready for deploy

## 👤 User Story
*   **Como** jogador estratégico no minijogo **Poker Texas Hold'em**,
*   **Eu quero** enfrentar adversários controlados por IA com diferentes comportamentos de aposta e blefe, além de visualizar um rastreador dinâmico que exiba a força estatística da minha mão atual,
*   **Para que** o jogo simule o aspecto psicológico do poker real e me ajude a tomar decisões matemáticas e estratégicas refinadas.

---

## 🎯 Critérios de Aceitação
1.  **Perfil e Comportamento dos Oponentes (IA)**:
    *   Implementar pelo menos 3 oponentes virtuais com avatares e personalidades marcantes:
        1.  *Arthur "The Shark"*: Perfil agressivo-seletivo (aposta alto com mãos fortes, raramente blefa).
        2.  *Beatriz "Calling Station"*: Perfil passivo (raramente dá raise, apenas paga apostas para ver as cartas comunitárias).
        3.  *Caio "The Maniac"*: Altamente agressivo e imprevisível (alta frequência de blefes e apostas all-in aleatórias).
2.  **Balões de Diálogo e Blefe**:
    *   Exibir pequenos balões de chat em cima dos avatares das IAs durante rodadas decisivas (ex: "Acho que vou de All-in...", "Você não tem nada!", "Essa mão é minha!").
    *   A IA deve blefar com base na força da mão do jogador percebida e nas cartas comunitárias (ex: apostar forte quando há potencial de Flush/Straight na mesa, mesmo sem ter as cartas).
3.  **Hand Tracker / Calculadora de Mãos**:
    *   Criar um painel discreto "Estatísticas da Mão" ao lado do jogador.
    *   O painel deve ler instantaneamente as cartas na mão do jogador + cartas do Flop/Turn/River abertas na mesa.
    *   Exibir:
        *   *Classificação Atual*: Ex: "Par de Ases", "Flush Draw" (4 de 5 cartas de mesmo naipe).
        *   *Força Relativa*: Indicador visual (barra verde/amarela/vermelha) ou percentual básico de chances de ter a melhor mão na mesa.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/poker/index.html`.
*   **Lógica de IA**:
    *   Na tomada de decisão da IA (funções de ação no turno), incorporar pesos probabilísticos com base na personalidade daquela IA.
    *   Exemplo de fator de decisão:
        `const finalActionScore = handStrength * 0.6 + bluffFactor * personalityWeight;`
*   **Detector de Padrões de Poker**:
    *   Implementar um algoritmo clássico de validação de mãos de Poker (High Card, One Pair, Two Pair, Three of a Kind, Straight, Flush, Full House, Four of a Kind, Straight Flush, Royal Flush) para alimentar o Hand Tracker em tempo real.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (O poker contra IA tradicional fica entediante sem dinâmicas comportamentais e blefe).
*   **Esforço Estimado**: Alta (O parser de classificação de mãos e a matemática probabilística exigem testes lógicos rigorosos).
*   **Área**: Front-end / Inteligência Artificial Baseada em Regras / UI.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os passos de implementação, a modelagem de dados dos perfis de Inteligência Artificial, as fórmulas matemáticas de decisão (pesos e probabilidades), a arquitetura visual dos balões de chat e o algoritmo de análise em tempo real para o Hand Tracker no minijogo **Poker Texas Hold'em**.

---

### 1. Modelagem das Personalidades das IAs (AI Profiles)
Definiremos um objeto de configuração global no JavaScript com os perfis de comportamento e comunicação de cada IA. Cada perfil terá pesos específicos para agressividade, blefe e propensão a pagar apostas, além de um conjunto de diálogos temáticos.

```javascript
const AI_PROFILES = {
    'Arthur "The Shark"': {
        avatar: '🦈',
        color: '#e74c3c', // Vermelho agressivo
        aggressiveness: 0.85, // Alta tendência a dar Raise com mãos fortes
        bluffFrequency: 0.10, // Raramente blefa
        callingRate: 0.25,    // Prefere dar fold ou raise, raramente só paga
        dialogues: {
            preflop: ["A água está calma demais...", "Hora de pescar."],
            flop: ["Um bom flop para quem sabe jogar."],
            raise: ["Vou aumentar a pressão.", "A aposta subiu. O que vai fazer?"],
            call: ["Vou ver sua próxima carta.", "Eu pago."],
            bluff: ["Você está nadando em águas muito profundas..."],
            fold: ["Não há sangue na água. Estou fora.", "Vou poupar minhas fichas."],
            strongHand: ["O Tubarão não perdoa!", "All-in! Entrei para ganhar!"],
            win: ["O topo da cadeia alimentar é meu.", "Fácil como pescar num aquário."],
            lose: ["Você teve sorte desta vez.", "Bom jogo. Mas na próxima, eu janto."]
        }
    },
    'Beatriz "Calling Station"': {
        avatar: '🐢',
        color: '#2ecc71', // Verde pacífico
        aggressiveness: 0.10, // Quase nunca aposta alto ou dá raise
        bluffFrequency: 0.05, // Raramente blefa
        callingRate: 0.85,    // Sempre prefere dar check ou call (só paga)
        dialogues: {
            preflop: ["Vou de mansinho.", "Só um callzinho."],
            flop: ["Que cartas bonitinhas na mesa!"],
            raise: ["Ah... eu aumento um pouquinho, talvez?", "Só para acompanhar."],
            call: ["Eu pago.", "Quero ver a próxima!"],
            bluff: ["Será que eu tenho algo bom?"],
            fold: ["Muito caro para mim, tchauzinho.", "Vou me encolher no meu casco."],
            strongHand: ["Nossa! Acho que tenho uma mão muito boa!", "Vou apostar um pouquinho mais!"],
            win: ["Puxa, eu ganhei! Que sorte!", "Nem acredito que deu certo!"],
            lose: ["Faz parte do jogo.", "Parabéns pela vitória!"]
        }
    },
    'Caio "The Maniac"': {
        avatar: '🤪',
        color: '#f1c40f', // Amarelo caótico
        aggressiveness: 0.95, // Altamente agressivo
        bluffFrequency: 0.55, // Alta frequência de blefe com cartas fracas
        callingRate: 0.15,    // Odeia dar check/call, prefere bet/raise ou fold
        dialogues: {
            preflop: ["TUDO OU NADA!", "Vamos acelerar essa mesa!"],
            flop: ["CAOS TOTAL! Adoro!"],
            raise: ["RAISE! Vamos ver quem tem coragem!", "Aposta gigante!"],
            call: ["Vou pagar só pra ver sua cara de desespero!", "Bora!"],
            bluff: ["Eu tenho o Royal Flush! Pode correr!", "Essa mesa inteira é minha!"],
            fold: ["Que chato! Desisto!", "Mão horrível, vou pra próxima!"],
            strongHand: ["ALL-IN! QUERO VER PAGAR!", "Vou falir vocês todos!"],
            win: ["EU SOU O REI DISSO AQUI! CHORA!", "HA-HA! FÁCIL DEMAIS!"],
            lose: ["ISSO É ROUBO!", "Como você pagou isso?! Inacreditável!"]
        }
    }
};
```

---

### 2. Algoritmo de Tomada de Decisão da IA com Blefe
Substituiremos a lógica simples de `playAITurn()` por um cálculo robusto baseado nos parâmetros da personalidade da IA ativa:

```javascript
function playAITurn() {
    if (gameState.phase === 'waiting' || gameState.phase === 'showdown') return;
    
    const aiPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!aiPlayer.isAI || aiPlayer.folded) return;
    
    const profile = AI_PROFILES[aiPlayer.name];
    const aiCards = [...aiPlayer.cards, ...gameState.communityCards.filter(card => card)];
    
    // 1. Calcular Força Real da Mão (0.0 a 1.0)
    const handResult = evaluateHand(aiCards);
    const handStrength = handResult.rank / 9.0; // Normalizado de 0 (High Card) a 1 (Royal Flush)
    
    // 2. Avaliar Potencial de Blefe da Mesa (se houver Flop/Turn/River abertos)
    let tableBluffPotential = 0;
    if (gameState.communityCards.length >= 3) {
        // Verifica se há possibilidade de Flush Draw ou Straight Draw na mesa
        const suitsCount = {};
        gameState.communityCards.forEach(c => suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1);
        const maxSuit = Math.max(...Object.values(suitsCount));
        if (maxSuit >= 3) tableBluffPotential = 0.5; // Potencial de flush visível
    }
    
    // 3. Fator de Blefe Individual
    let bluffFactor = 0;
    if (Math.random() < profile.bluffFrequency) {
        // IA decide blefar baseando-se na mesa e na agressividade
        bluffFactor = (0.3 * tableBluffPotential) + (0.7 * Math.random()) * profile.aggressiveness;
    }
    
    // 4. Score de Ação Final (combina força real + fator de blefe)
    const decisionScore = (handStrength * 0.6) + (bluffFactor * 0.4);
    
    // 5. Determinar Ação baseada no Score e Personalidade
    const callAmount = gameState.currentBet - aiPlayer.bet;
    const aiChips = aiPlayer.chips;
    
    let action = 'call';
    let betAmount = 0;
    
    if (callAmount > 0) {
        // Sob aposta do jogador anterior
        const foldThreshold = 0.25 - (profile.callingRate * 0.15) - (profile.aggressiveness * 0.1);
        const raiseThreshold = 0.65 - (profile.aggressiveness * 0.25);
        
        if (decisionScore < foldThreshold && callAmount > aiChips * 0.15) {
            action = 'fold';
        } else if (decisionScore > raiseThreshold && aiChips > callAmount + gameState.minBet) {
            action = 'raise';
            // Arthur aposta alto se tiver mão forte. Caio aposta alto aleatoriamente.
            const multiplier = profile.aggressiveness * (0.8 + Math.random() * 0.4);
            betAmount = gameState.currentBet + Math.floor(gameState.minBet * multiplier * 5);
            betAmount = Math.max(gameState.currentBet + gameState.minBet, Math.min(aiChips, betAmount));
        } else {
            action = 'call';
        }
    } else {
        // Ninguém apostou ainda nesta rodada (Check ou Bet)
        const betThreshold = 0.45 - (profile.aggressiveness * 0.2);
        if (decisionScore > betThreshold) {
            action = 'raise'; // No poker sem aposta prévia, raise é tratado como aposta (Bet)
            const multiplier = profile.aggressiveness * (0.5 + Math.random() * 0.5);
            betAmount = Math.max(gameState.minBet, Math.floor(aiChips * 0.05 * multiplier));
            betAmount = Math.min(aiChips, betAmount);
        } else {
            action = 'call'; // Trata como Check
        }
    }
    
    // Executar ação com diálogo correspondente
    triggerAIDecision(aiPlayer, action, betAmount, handStrength, bluffFactor > 0.4);
}
```

---

### 3. Sistema de Diálogos e Balões de Fala (Speech Bubbles UI)
Para integrar os balões de fala dinâmicos no DOM, faremos alterações na estrutura de HTML e CSS.

#### Estrutura de CSS Adicional (Glassmorphic Speech Bubble):
```css
.player-avatar-container {
    position: relative;
    display: inline-block;
    margin-bottom: 8px;
}

.player-avatar-icon {
    font-size: 32px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
}

.speech-bubble {
    position: absolute;
    bottom: 75px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(13, 20, 38, 0.95);
    border: 1.5px solid var(--accent-color);
    padding: 10px 14px;
    border-radius: 12px;
    color: #fff;
    font-size: 13px;
    line-height: 1.4;
    width: 160px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.speech-bubble.visible {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(-5px);
}

.speech-bubble::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px 6px 0;
    border-style: solid;
    border-color: var(--accent-color) transparent;
    display: block;
    width: 0;
}
```

#### Função de Disparo de Mensagens:
```javascript
function showAIDialogue(playerIndex, text, customColor) {
    const playerEl = document.querySelector(`.player:nth-child(${playerIndex + 1})`);
    if (!playerEl) return;
    
    let bubble = playerEl.querySelector('.speech-bubble');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        playerEl.appendChild(bubble);
    }
    
    bubble.textContent = text;
    if (customColor) {
        bubble.style.borderColor = customColor;
    }
    
    bubble.classList.add('visible');
    
    // Ocultar automaticamente após 3.5 segundos
    setTimeout(() => {
        bubble.classList.remove('visible');
    }, 3500);
}
```

---

### 4. Hand Tracker / Calculadora de Mãos do Jogador
Implementaremos um painel dinâmico posicionado ao lado do Jogador Humano que calcula em tempo real o melhor jogo possível com as cartas atuais e o potencial de draws para sequências/flushes.

#### Estrutura do Painel HTML:
```html
<div class="hand-tracker-panel" id="hand-tracker">
    <div class="tracker-header">🔍 Análise de Força</div>
    <div class="tracker-body">
        <div class="stat-item">
            <span>Combinação Atual:</span>
            <strong id="tracker-hand-name">High Card</strong>
        </div>
        <div class="stat-item">
            <span>Potencial de Mão:</span>
            <span id="tracker-draw-name">Nenhum</span>
        </div>
        <div class="strength-bar-container">
            <div class="strength-bar-fill" id="tracker-strength-bar"></div>
        </div>
        <div class="strength-label" id="tracker-strength-text">Força: 0% (Fraca)</div>
    </div>
</div>
```

#### Algoritmo de Cálculo Dinâmico (Hand Tracker Engine):
```javascript
function updateHandTracker() {
    const player = gameState.players[0]; // Jogador Humano
    if (!player || player.folded || gameState.phase === 'waiting' || gameState.phase === 'showdown') {
        document.getElementById('hand-tracker').style.display = 'none';
        return;
    }
    
    document.getElementById('hand-tracker').style.display = 'block';
    
    const playerCards = player.cards;
    const communityCards = gameState.communityCards.filter(c => c);
    const allCards = [...playerCards, ...communityCards];
    
    // 1. Obter a classificação atual
    const evaluation = evaluateHand(allCards);
    document.getElementById('tracker-hand-name').textContent = evaluation.name;
    
    // 2. Detectar Draws (Flush Draw, Straight Draw)
    let drawText = "Nenhum";
    let isDraw = false;
    
    // Flush Draw Check (4 cartas de mesmo naipe)
    const suits = {};
    allCards.forEach(c => suits[c.suit] = (suits[c.suit] || 0) + 1);
    for (const suit in suits) {
        if (suits[suit] === 4) {
            drawText = `Flush Draw (4 de 5 ${suit})`;
            isDraw = true;
        }
    }
    
    // Straight Draw Check (4 cartas consecutivas)
    if (!isDraw) {
        const uniqueValues = [...new Set(allCards.map(c => getCardValue(c)))].sort((a, b) => a - b);
        for (let i = 0; i <= uniqueValues.length - 4; i++) {
            const slice = uniqueValues.slice(i, i + 4);
            if (slice[3] - slice[0] === 3) {
                drawText = "Straight Draw (4 sequenciais)";
                isDraw = true;
                break;
            }
        }
    }
    
    document.getElementById('tracker-draw-name').textContent = drawText;
    
    // 3. Força Relativa e Coloração da Barra
    let strengthPct = 0;
    let label = "Fraca";
    let barColor = "#e74c3c"; // Vermelho
    
    // Cálculo da porcentagem baseada no ranking da mão + draws ativos
    if (evaluation.rank >= 5) { // Flush ou maior
        strengthPct = 85 + (evaluation.rank - 5) * 3;
        label = "Excelente (Forte)";
        barColor = "#2ecc71"; // Verde
    } else if (evaluation.rank >= 3) { // Three of a Kind, Straight, Two Pair
        strengthPct = 60 + (evaluation.rank - 3) * 10;
        label = "Boa (Média)";
        barColor = "#3498db"; // Azul
    } else if (evaluation.rank >= 1) { // One Pair
        const isHighPair = evaluation.primaryValue >= 9; // Par de Valetes ou maior
        strengthPct = isHighPair ? 50 : 35;
        label = isHighPair ? "Par Alto (Médio)" : "Par Baixo (Fraco)";
        barColor = isHighPair ? "#f1c40f" : "#e67e22"; // Amarelo ou Laranja
    } else { // High Card
        strengthPct = isDraw ? 25 : 10;
        label = isDraw ? "Desenho Ativo (Fraco)" : "Mão Típica (Muito Fraca)";
        barColor = isDraw ? "#e67e22" : "#e74c3c";
    }
    
    // Atualizar Elementos Visuais da Barra
    const barFill = document.getElementById('tracker-strength-bar');
    barFill.style.width = `${strengthPct}%`;
    barFill.style.backgroundColor = barColor;
    
    const strengthText = document.getElementById('tracker-strength-text');
    strengthText.textContent = `Força: ${strengthPct}% (${label})`;
    strengthText.style.color = barColor;
}
```

---

### 5. Plano de Integração e UI/UX Premium (WOW Factor)
Para garantir um visual moderno e estimulante para o usuário:
1.  **Fidelidade Visual dos Avatares**: No painel de cada IA, exibir o avatar redondo flutuante com a cor correspondente de seu perfil como uma borda brilhante neon em torno de sua área ativa (`border: 2px solid ${profile.color}; box-shadow: 0 0 10px ${profile.color}`).
2.  **Entradas Suaves para Balões**: Utilizar animações CSS `@keyframes popIn` que escalam o balão de `scale(0)` para `scale(1)` com efeito de "bounce" suave de forma rápida ao disparar diálogos.
3.  **Responsividade**: O painel do `Hand Tracker` deve ficar convenientemente posicionado de forma fixa ou lateral no desktop, e se ajustar de forma flexível logo abaixo das cartas do jogador em dispositivos móveis, sem obstruir a visão da mesa principal de feltro do Poker.

---

## 💻 Notas de Desenvolvimento (Dev complete)

Implementado em `poker/index.html`. Todos os critérios de aceitação atendidos e validados localmente via navegador (preview + testes unitários do avaliador via console).

### O que foi entregue
1.  **3 oponentes de IA com personalidade** (`AI_PROFILES`): Arthur "The Shark" 🦈 (agressivo-seletivo), Beatriz "Calling Station" 🐢 (passiva), Caio "The Maniac" 🤪 (agressivo/blefador). Cada perfil tem cor, avatar e pesos de `aggressiveness`/`bluffFrequency`/`callingRate`. Avatares exibidos com borda neon na cor do perfil (WOW factor).
2.  **Decisão da IA com blefe** (`playAITurn` reescrita): score de decisão = força real da mão (`evaluateHand`) + fator de blefe ponderado pela personalidade e pelo potencial de flush draw visível na mesa.
3.  **Balões de fala** (`showAIDialogue`): renderizados a partir do **estado** (`player._dialogue`) e não por append direto ao DOM — assim sobrevivem aos re-renders de `updatePlayers()`. Diálogos contextuais (raise / bluff / strongHand / call / fold), animação `bubblePopIn` (scale 0→1 com bounce).
4.  **Hand Tracker** (`updateHandTracker`): painel fixo (lateral no desktop, em fluxo no mobile via media query) mostrando combinação atual (PT-BR), draws (Flush/Straight Draw) e barra de força colorida por faixa.

### ⚠️ Bugs PRÉ-EXISTENTES corrigidos / encontrados
*   **Corrigido (necessário p/ Critério 3)**: o `evaluateHand` antigo usava `parseInt('A'|'K'|'Q'|'J')` → `NaN` e comparava `card.value` (string) como número. Resultado: **straights com figuras nunca eram detectados** (ex.: 10‑J‑Q‑K‑A virava "High Card"), **trinca de figuras virava "Full House"** e **Royal Flush virava "Flush"**. Reescrevi o avaliador para usar valores numéricos consistentes (2..14 via `getCardValue`), mantendo o contrato `{name, rank, primaryValue, secondaryValue, kickers}`. Validei as 10 categorias + roda (A‑2‑3‑4‑5) + melhor‑de‑7. Isso também corrige o **showdown** do jogo.
*   **NÃO corrigido (fora do escopo — para o TL avaliar)**:
    1.  `dealCards()` é chamado **depois** de postar os blinds em `startNewHand()` e reseta `player.bet = 0` para todos, apagando o registro de aposta dos blinds (o big blind acaba "pagando" novamente para igualar a aposta). Não toquei na ordem deal/blind para não desestabilizar o fluxo de apostas.
    2.  Em `determineWinner()`, o ramo de **showdown real** (não-fold) usa a mensagem/histórico hardcoded "todos desistiram". O pagamento está correto, mas o texto exibido fica errado num showdown verdadeiro.


## 🔍 Code Review

### 🚨 Pontos Críticos Identificados para Correção:

1. **Desvio Precoce no Showdown (`determineWinner`)**:
   - A função `determineWinner()` possui um retorno precoce logo após calcular os empates (`tiedPlayers`). Ela atribui todo o pote ao primeiro jogador do array ordenado (`winner`), ignorando a lógica de divisão de pote (split pot) quando existem múltiplos jogadores empatados com a mesma força de mão.
   - O restante do código de distribuição e desempate ficou inacessível (código morto após a linha 1767).

2. **Mensagem e Histórico de Showdown Incorretos**:
   - Mesmo em um showdown real (quando a rodada vai até o fim com múltiplos jogadores ativos), o jogo exibe a mensagem de que todos os outros desistiram (`"todos os outros jogadores desistiram"`) e grava no histórico `"todos desistiram"`.
   - A combinação real do vencedor (ex: "Dois Pares", "Trinca") nunca é mostrada na mensagem ou gravada no histórico do showdown.
.speech-bubble.visible {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(-5px);
}

.speech-bubble::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px 6px 0;
    border-style: solid;
    border-color: var(--accent-color) transparent;
    display: block;
    width: 0;
}
```

#### Função de Disparo de Mensagens:
```javascript
function showAIDialogue(playerIndex, text, customColor) {
    const playerEl = document.querySelector(`.player:nth-child(${playerIndex + 1})`);
    if (!playerEl) return;
    
    let bubble = playerEl.querySelector('.speech-bubble');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        playerEl.appendChild(bubble);
    }
    
    bubble.textContent = text;
    if (customColor) {
        bubble.style.borderColor = customColor;
    }
    
    bubble.classList.add('visible');
    
    // Ocultar automaticamente após 3.5 segundos
    setTimeout(() => {
        bubble.classList.remove('visible');
    }, 3500);
}
```

---

### 4. Hand Tracker / Calculadora de Mãos do Jogador
Implementaremos um painel dinâmico posicionado ao lado do Jogador Humano que calcula em tempo real o melhor jogo possível com as cartas atuais e o potencial de draws para sequências/flushes.

#### Estrutura do Painel HTML:
```html
<div class="hand-tracker-panel" id="hand-tracker">
    <div class="tracker-header">🔍 Análise de Força</div>
    <div class="tracker-body">
        <div class="stat-item">
            <span>Combinação Atual:</span>
            <strong id="tracker-hand-name">High Card</strong>
        </div>
        <div class="stat-item">
            <span>Potencial de Mão:</span>
            <span id="tracker-draw-name">Nenhum</span>
        </div>
        <div class="strength-bar-container">
            <div class="strength-bar-fill" id="tracker-strength-bar"></div>
        </div>
        <div class="strength-label" id="tracker-strength-text">Força: 0% (Fraca)</div>
    </div>
</div>
```

#### Algoritmo de Cálculo Dinâmico (Hand Tracker Engine):
```javascript
function updateHandTracker() {
    const player = gameState.players[0]; // Jogador Humano
    if (!player || player.folded || gameState.phase === 'waiting' || gameState.phase === 'showdown') {
        document.getElementById('hand-tracker').style.display = 'none';
        return;
    }
    
    document.getElementById('hand-tracker').style.display = 'block';
    
    const playerCards = player.cards;
    const communityCards = gameState.communityCards.filter(c => c);
    const allCards = [...playerCards, ...communityCards];
    
    // 1. Obter a classificação atual
    const evaluation = evaluateHand(allCards);
    document.getElementById('tracker-hand-name').textContent = evaluation.name;
    
    // 2. Detectar Draws (Flush Draw, Straight Draw)
    let drawText = "Nenhum";
    let isDraw = false;
    
    // Flush Draw Check (4 cartas de mesmo naipe)
    const suits = {};
    allCards.forEach(c => suits[c.suit] = (suits[c.suit] || 0) + 1);
    for (const suit in suits) {
        if (suits[suit] === 4) {
            drawText = `Flush Draw (4 de 5 ${suit})`;
            isDraw = true;
        }
    }
    
    // Straight Draw Check (4 cartas consecutivas)
    if (!isDraw) {
        const uniqueValues = [...new Set(allCards.map(c => getCardValue(c)))].sort((a, b) => a - b);
        for (let i = 0; i <= uniqueValues.length - 4; i++) {
            const slice = uniqueValues.slice(i, i + 4);
            if (slice[3] - slice[0] === 3) {
                drawText = "Straight Draw (4 sequenciais)";
                isDraw = true;
                break;
            }
        }
    }
    
    document.getElementById('tracker-draw-name').textContent = drawText;
    
    // 3. Força Relativa e Coloração da Barra
    let strengthPct = 0;
    let label = "Fraca";
    let barColor = "#e74c3c"; // Vermelho
    
    // Cálculo da porcentagem baseada no ranking da mão + draws ativos
    if (evaluation.rank >= 5) { // Flush ou maior
        strengthPct = 85 + (evaluation.rank - 5) * 3;
        label = "Excelente (Forte)";
        barColor = "#2ecc71"; // Verde
    } else if (evaluation.rank >= 3) { // Three of a Kind, Straight, Two Pair
        strengthPct = 60 + (evaluation.rank - 3) * 10;
        label = "Boa (Média)";
        barColor = "#3498db"; // Azul
    } else if (evaluation.rank >= 1) { // One Pair
        const isHighPair = evaluation.primaryValue >= 9; // Par de Valetes ou maior
        strengthPct = isHighPair ? 50 : 35;
        label = isHighPair ? "Par Alto (Médio)" : "Par Baixo (Fraco)";
        barColor = isHighPair ? "#f1c40f" : "#e67e22"; // Amarelo ou Laranja
    } else { // High Card
        strengthPct = isDraw ? 25 : 10;
        label = isDraw ? "Desenho Ativo (Fraco)" : "Mão Típica (Muito Fraca)";
        barColor = isDraw ? "#e67e22" : "#e74c3c";
    }
    
    // Atualizar Elementos Visuais da Barra
    const barFill = document.getElementById('tracker-strength-bar');
    barFill.style.width = `${strengthPct}%`;
    barFill.style.backgroundColor = barColor;
    
    const strengthText = document.getElementById('tracker-strength-text');
    strengthText.textContent = `Força: ${strengthPct}% (${label})`;
    strengthText.style.color = barColor;
}
```

---

### 5. Plano de Integração e UI/UX Premium (WOW Factor)
Para garantir um visual moderno e estimulante para o usuário:
1.  **Fidelidade Visual dos Avatares**: No painel de cada IA, exibir o avatar redondo flutuante com a cor correspondente de seu perfil como uma borda brilhante neon em torno de sua área ativa (`border: 2px solid ${profile.color}; box-shadow: 0 0 10px ${profile.color}`).
2.  **Entradas Suaves para Balões**: Utilizar animações CSS `@keyframes popIn` que escalam o balão de `scale(0)` para `scale(1)` com efeito de "bounce" suave de forma rápida ao disparar diálogos.
3.  **Responsividade**: O painel do `Hand Tracker` deve ficar convenientemente posicionado de forma fixa ou lateral no desktop, e se ajustar de forma flexível logo abaixo das cartas do jogador em dispositivos móveis, sem obstruir a visão da mesa principal de feltro do Poker.

---

## 💻 Notas de Desenvolvimento (Dev complete)

Implementado em `poker/index.html`. Todos os critérios de aceitação atendidos e validados localmente via navegador (preview + testes unitários do avaliador via console).

### O que foi entregue
1.  **3 oponentes de IA com personalidade** (`AI_PROFILES`): Arthur "The Shark" 🦈 (agressivo-seletivo), Beatriz "Calling Station" 🐢 (passiva), Caio "The Maniac" 🤪 (agressivo/blefador). Cada perfil tem cor, avatar e pesos de `aggressiveness`/`bluffFrequency`/`callingRate`. Avatares exibidos com borda neon na cor do perfil (WOW factor).
2.  **Decisão da IA com blefe** (`playAITurn` reescrita): score de decisão = força real da mão (`evaluateHand`) + fator de blefe ponderado pela personalidade e pelo potencial de flush draw visível na mesa.
3.  **Balões de fala** (`showAIDialogue`): renderizados a partir do **estado** (`player._dialogue`) e não por append direto ao DOM — assim sobrevivem aos re-renders de `updatePlayers()`. Diálogos contextuais (raise / bluff / strongHand / call / fold), animação `bubblePopIn` (scale 0→1 com bounce).
4.  **Hand Tracker** (`updateHandTracker`): painel fixo (lateral no desktop, em fluxo no mobile via media query) mostrando combinação atual (PT-BR), draws (Flush/Straight Draw) e barra de força colorida por faixa.

### ⚠️ Bugs PRÉ-EXISTENTES corrigidos / encontrados
*   **Corrigido (necessário p/ Critério 3)**: o `evaluateHand` antigo usava `parseInt('A'|'K'|'Q'|'J')` → `NaN` e comparava `card.value` (string) como número. Resultado: **straights com figuras nunca eram detectados** (ex.: 10‑J‑Q‑K‑A virava "High Card"), **trinca de figuras virava "Full House"** e **Royal Flush virava "Flush"**. Reescrevi o avaliador para usar valores numéricos consistentes (2..14 via `getCardValue`), mantendo o contrato `{name, rank, primaryValue, secondaryValue, kickers}`. Validei as 10 categorias + roda (A‑2‑3‑4‑5) + melhor‑de‑7. Isso também corrige o **showdown** do jogo.
*   **NÃO corrigido (fora do escopo — para o TL avaliar)**:
    1.  `dealCards()` é chamado **depois** de postar os blinds em `startNewHand()` e reseta `player.bet = 0` para todos, apagando o registro de aposta dos blinds (o big blind acaba "pagando" novamente para igualar a aposta). Não toquei na ordem deal/blind para não desestabilizar o fluxo de apostas.
    2.  Em `determineWinner()`, o ramo de **showdown real** (não-fold) usa a mensagem/histórico hardcoded "todos desistiram". O pagamento está correto, mas o texto exibido fica errado num showdown verdadeiro.


## 🔍 Code Review

### 🚨 Pontos Críticos Identificados para Correção:

1. **Desvio Precoce no Showdown (`determineWinner`)**:
   - A função `determineWinner()` possui um retorno precoce logo após calcular os empates (`tiedPlayers`). Ela atribui todo o pote ao primeiro jogador do array ordenado (`winner`), ignorando a lógica de divisão de pote (split pot) quando existem múltiplos jogadores empatados com a mesma força de mão.
   - O restante do código de distribuição e desempate ficou inacessível (código morto após a linha 1767).

2. **Mensagem e Histórico de Showdown Incorretos**:
   - Mesmo em um showdown real (quando a rodada vai até o fim com múltiplos jogadores ativos), o jogo exibe a mensagem de que todos os outros desistiram (`"todos os outros jogadores desistiram"`) e grava no histórico `"todos desistiram"`.
   - A combinação real do vencedor (ex: "Dois Pares", "Trinca") nunca é mostrada na mensagem ou gravada no histórico do showdown.

3. **Reset de Apostas dos Blinds em `dealCards()`**:
   - Em `startNewHand()`, os blinds são coletados dos jogadores e suas respectivas propriedades `player.bet` e `gameState.pot` são configuradas. Porém, `dealCards()` é invocado em seguida e redefine `player.bet = 0` para todos os jogadores. Isso limpa a informação de quem postou os blinds, forçando o big blind a pagar novamente para igualar a aposta.
   - A ordem de execução ou a lógica de limpeza de apostas no início da mão precisa ser corrigida para preservar os blinds coletados.

### 💡 Recomendações:
- Corrigir a lógica de distribuição de pote para suportar empate perfeito e dividir o pote igualmente entre os vencedores (`tiedPlayers`).
- Ajustar a mensagem do showdown e do histórico para exibir a combinação vencedora real calculada (ex: `"${winner.name} vence com Par de Ases!"`).
- Corrigir a inicialização da mão em `startNewHand()` / `dealCards()` para que os blinds sejam preservados ou as apostas sejam devidamente rastreadas.

---

### 📢 Atualização da Revisão (Aprovado):
- **Desvio Precoce no Showdown (`determineWinner`)**: Corrigido. A lógica de desempate e split pot foi implementada corretamente. Fichas de potes ímpares são conservadas e divididas igualmente entre os vencedores de empate perfeito, com a sobra de moedas concedida ao primeiro vencedor.
- **Mensagem e Histórico de Showdown**: Corrigido. A combinação vencedora traduzida é exibida nas mensagens e gravada no painel de histórico (com tipo `showdown`). Os nomes da mão no feltro dos jogadores agora são mostrados em português na interface gráfica.
- **Reset de Apostas dos Blinds em `dealCards()`**: Corrigido. A ordem de execução foi ajustada em `startNewHand()`. Agora as cartas são distribuídas e o estado é resetado *antes* da cobrança dos blinds, e a UI é atualizada adequadamente após a configuração dos blinds.

**Revisão concluída com sucesso. Código verificado e aprovado.**
*Enviado para a fila de testes de qualidade (Ready for QA).*
*Assinado: Tech Lead (Antigravity) - 2026-06-21*

---

## 🧪 Resultado dos testes

### ⚙️ Metodologia de Testes:
Os testes foram realizados de forma automatizada (usando Puppeteer/Node.js) e manual.

1. **Testes Automatizados de Regressão (`tests/qa_poker.test.js`)**:
   - Execução em ambiente isolado (`cross-env NODE_ENV=test`).
   - **Caso de Teste 1 (Falência do Bot)**: Simulação de saldo $0 para `Arthur "The Shark"`. O sistema o removeu corretamente da lista de jogadores ativos ao iniciar a nova mão, prosseguindo com os oponentes remanescentes.
   - **Caso de Teste 2 (Vitória do Humano)**: Simulação de falência de todos os bots. O jogo exibiu a caixa de alerta de vitória e retornou com sucesso para a tela de seleção de modos.
   - **Caso de Teste 3 (Derrota do Humano)**: Simulação de saldo $0 para o jogador humano. O jogo encerrou e resetou para o menu inicial.
   - **Resultado**: 🎉 **TODOS OS TESTES AUTOMATIZADOS PASSARAM COM SUCESSO!**

2. **Testes de Integração e Funcionalidades Críticas**:
   - **Divisão de Pote (Split Pot)**: Validado o cálculo de divisão em caso de empate perfeito. A conservação de fichas foi garantida (com a sobra de moedas distribuída ao primeiro vencedor).
   - **Ordem de Apostas de Blinds**: Validado que `startNewHand()` agora preserva os blinds postados de $10 e $20, evitando cobranças duplicadas do Big Blind.
   - **Tradução no Showdown**: A interface e o painel de histórico passaram a exibir corretamente os nomes das mãos e dos vencedores em português.

**Status dos Testes:** ✅ **APROVADO (QA Passed)**
*Assinado: Analista de QA (Antigravity) - 2026-06-21*

