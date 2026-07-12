# 🏆 TASK-POKER: Mesa VIP High Roller (Customização de Feltros e Baralhos), Dealer Virtual Ativo, Analisador de Histórico de Jogadas (Hand Replay) e Síntese Sonora de Cassino

## 👤 User Story
* **Como** um jogador experiente e estratégico de Poker Texas Hold'em no Playful Hub,
* **Eu quero** gastar minhas moedas acumuladas em um clube VIP para personalizar o visual do feltro da mesa e o verso do baralho, contar com a orientação e comentários dinâmicos de um Dealer virtual proativo, e poder rever passo a passo a rodada anterior através de um analisador de replays visuais detalhados com as cartas dos oponentes reveladas,
* **Para que** a jogabilidade seja personalizada de acordo com meu estilo, a experiência de jogo seja extremamente divertida e instrutiva, e o jogo atinja o patamar de fidelidade e refinamento estético de um cassino de alta classe.

---

## 🎯 Critérios de Aceitação

1. **Clube de Customização VIP (Environment & Skins Shop)**:
   - **Menu do Feltro (VIP Lounge)**: Inserir um botão estilizado com um ícone de coroa ou "Clube VIP" no cabeçalho ou menu principal do feltro. Ao clicar, abrir uma modal glassmorphic que exibe o saldo de moedas do jogador da carteira global.
   - **Customização do Feltro da Mesa**:
     - *Classic Green* (Default, Grátis): O feltro verde tradicional da mesa.
     - *Neon Cyber-Den* (Custo: $800): Feltro roxo escuro com gradientes neon ciano e magenta brilhando nas bordas, e fundo escuro da sala.
     - *Gold Casino Royale* (Custo: $2,000): Feltro preto escovado com linhas delimitadoras douradas e bordas douradas neon.
   - **Customização do Verso das Cartas (Card Backs)**:
     - *Classic Navy* (Default, Grátis): O verso atual listrado em azul marinho.
     - *Vector Matrix* (Custo: $400): Verso preto com padrão de linhas de circuitos integrados neon ciano.
     - *Imperial Gold* (Custo: $1,200): Verso decorado com arabescos de ouro e efeito de gradiente dourado metálico.
   - **Persistência de Compras e Estado**:
     - As skins adquiridas e os itens equipados devem ser salvos sob a chave `playful_poker_tournament_data` no `localStorage`.
     - A aplicação das skins deve atualizar de forma dinâmica as variáveis CSS `:root` ou injetar classes apropriadas nos elementos `.table` e `.card-back`. Gastar moedas reduz o saldo global do jogador, forçando a gestão estratégica dos recursos.

2. **Dealer Virtual Interativo (Active Croupier)**:
   - **Visual do Dealer**: Criar uma área na borda superior central da mesa de feltro contendo um emoji representativo do Dealer (`🤵` ou `🤖`) com o nome "Dealer Jack" (ou "Croupier").
   - **Balão de Diálogo e Narração**:
     - O Dealer possui um balão de fala (`speech-bubble` com fundo preto e borda amarela neon) que aparece de forma fluida durante momentos chave para narrar o jogo:
       - Distribuição das cartas: "Cartas dadas! Que vença o melhor."
       - Revelação de cartas comunitárias: "Flop aberto na mesa!", "Temos o Turn! A tensão aumenta.", "River! O destino final."
       - Ações críticas de oponentes: "Arthur dá call.", "Diana aumenta com determinação!", "Erik joga tudo! ALL-IN!"
       - Showdown: "Showdown! Vamos revelar as cartas de todos."
   - **Dicas do Dealer**:
     - No turno do jogador humano, o Dealer pode ocasionalmente (20% de chance ou quando a mão possuir potencial forte) enviar balões de dicas úteis com duração de 3 segundos (ex: "Sua mão tem chances de buscar um Flush/Sequência!", "Par alto na mesa, tome cuidado!", "Caio parece estar hesitando nesta rodada...").

3. **Reprodutor de Replay de Mão (Visual Hand Replay Analyzer)**:
   - **Botão de Replay**: Adicionar um botão de ícone de claquete ou "Replay da Mão Anterior 🎬" no topo do painel de histórico lateral (`history-panel`). O botão deve ficar habilitado somente após o término de pelo menos uma mão na partida ativa.
   - **Modal de Replay**: Clicar no botão abre um painel overlay glassmorphic centralizado que simula as fases da mão recém-concluída.
   - **Controles de Reprodução**:
     - Botões para avançar passo a passo: `Anterior` ⏪, `Play/Pause` ⏯️, `Próximo` ⏩, e `Fechar` ❌.
   - **Fluxo do Replay**:
     - O replay exibe a mesa nas seguintes fases estruturadas da mão anterior:
       1. *Distribute*: Cartas iniciais distribuídas. As cartas secretas das IAs são mostradas viradas para cima com 50% de opacidade (mascaradas) para que o jogador compreenda o jogo deles de forma educativa.
       2. *Flop*: Cartas comunitárias reveladas até o Flop e as respectivas apostas daquela etapa.
       3. *Turn*: Carta comunitária do Turn revelada e apostas correspondentes.
       4. *River*: Carta comunitária do River revelada e as apostas da rodada final.
       5. *Showdown*: Mãos reveladas, o vencedor destacado e a indicação do pote ganho.
     - Um painel secundário de texto exibe o log linear de ações ocorridas (ex: "Jogador apostou $50", "Diana deu fold", "Arthur pagou $50").

4. **Sintetizador Web Audio API de Áudio de Cassino**:
   - Desenhar um sistema de síntese de som procedural sem carregar arquivos externos:
     - **Card Shuffle (Embaralhamento)**: Um som gerado por ruído rosa filtrado por passa-banda em frequência média, com oscilação rápida de volume por LFO durante 1.0 segundo para reproduzir o baralho de cartas sendo misturado.
     - **Card Deal (Deslize de Carta)**: Sweep senoidal de decaimento rápido (3200 Hz -> 500 Hz em 65ms) em volume baixo para simular a fricção física da carta deslizando no feltro.
     - **Chip Clink (Clique de Ficha)**: Dois tons senoidais muito curtos (15ms) em frequências altas desalinhadas (ex: 4800 Hz e 5100 Hz) tocados quase simultaneamente para simular o som característico de duas fichas de cassino se tocando.
     - **Win Fanfare (Comemoração de Vitória)**: Um arpejo ascendente e brilhante na escala pentatônica maior (Dó, Ré, Mi, Sol, Lá, Dó) sintetizado em onda triangular.

5. **Juiciness Premium de Cassino**:
   - **Glow de All-In**: Ao declarar All-In ou no showdown de um pote vencido acima de $1.000, as bordas do feltro da mesa devem emitir um feixe de luz neon pulsante, sincronizado com o tremor de tela (`screen-shake`).
   - **Chuva de Fichas (Winner Confetti)**:
     - Ao coletar o pote, instanciar dinamicamente de 15 a 20 pequenos elipsóides coloridos (vermelhos, azuis, verdes, pretos) e estrelas douradas CSS absolutas caindo em trajetórias parabólicas no feltro, girando e sumindo gradualmente por opacidade (`opacity: 0`).

---

## 🛠️ Detalhes Técnicos e Diretrizes Arquiteturais

* **Arquivo Alvo**: `/poker/index.html`.
* **Mapeamento de Estado VIP no LocalStorage**:
  - Estender a chave `playful_poker_tournament_data` para comportar a loja e customizações:
    ```json
    {
      "trophies": ["bronze_pub"],
      "unlockedStages": [1, 2],
      "stats": {
        "handsPlayed": 24,
        "handsWon": 8,
        "biggestPot": 450,
        "successfulBluffs": 2
      },
      "wallet": 1450,
      "unlockedFeltSkins": ["classic_green", "cyber_den"],
      "unlockedCardSkins": ["classic_navy", "vector_matrix"],
      "equippedFeltSkin": "cyber_den",
      "equippedCardSkin": "vector_matrix"
    }
    ```
* **Lógica de Gravação do Replay de Mão**:
  - Criar um objeto de log global de mão `gameState.lastHandLog` que armazena o histórico sequencial de ações do jogo em tempo de execução:
    ```javascript
    gameState.lastHandLog = {
      players: [
        { name: "Jogador", cards: [{value: "A", suit: "♥"}, {value: "K", suit: "♠"}], initialChips: 1000, finalChips: 1200 },
        { name: "Diana", cards: [{value: "J", suit: "♣"}, {value: "10", suit: "♦"}], initialChips: 1000, finalChips: 0 }
      ],
      communityCards: [], // Armazena as 5 cartas que saíram
      actions: [
        { phase: "preflop", actor: "Jogador", type: "bet", amount: 50 },
        { phase: "flop", actor: "Diana", type: "fold" }
      ],
      pot: 150,
      winners: ["Jogador"]
    };
    ```
  - Esse objeto deve ser limpo e preenchido novamente a cada nova mão que se inicia, guardando o estado fiel da mão imediatamente anterior para o painel de replay.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Personalização estética e o analisador de replay agregam valor de gameplay massivo, promovendo a retenção do jogador estratégico).
* **Esforço Estimado**: Média-Alta (Estruturação do buffer de log de jogadas para replay, sincronização dos estados do feltro reativo, modal VIP com transações financeiras locais e síntese de áudio físico).
* **Área**: Front-end / CSS / Engine de Áudio (Web Audio API) / Gestão de Estado de Jogo.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Product Owner sênior de jogos, colaborei com o Tech Lead para definir as especificações das fórmulas de síntese procedural de áudio para os efeitos físicos:

### 1. Síntese do Embaralhamento de Cartas (Card Shuffle FX)
Para reproduzir o atrito rápido de um deck sendo embaralhado, usamos ruído rosa e um envelope de ganho que oscila rapidamente para simular o passar das cartas:
```javascript
function playShuffleSound(audioCtx) {
    const bufferSize = audioCtx.sampleRate * 1.0; // 1 segundo
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Gerar Ruído Rosa (filtragem simples de ruído branco para amortecer agudos)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // normalizar volume
        b6 = white * 0.115926;
    }
    
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 1.5;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    
    // Simular o folhear das cartas oscilando a amplitude rapidamente
    for (let t = 0; t < 1.0; t += 0.08) {
        gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime + t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + t + 0.06);
    }
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseNode.start();
}
```

### 2. Síntese do Clique de Fichas (Chip Clink FX)
Para simular o impacto de duas fichas físicas ao apostar, usamos osciladores senoidais de frequências altas com decays curtos, tocados quase juntos para criar um efeito de ricochete metálico leve:
```javascript
function playChipClinkSound(audioCtx) {
    const now = audioCtx.currentTime;
    
    const playTone = (freq, delay) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);
        
        gainNode.gain.setValueAtTime(0.12, now + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.015);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.02);
    };
    
    // Dois cliques de fichas encadeados
    playTone(4900, 0);
    playTone(5150, 0.008);
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Escala dos feltros customizados**:
   - *Dúvida*: Os feltros temáticos devem alterar apenas o plano central da mesa (`.table`) ou redefinir a interface inteira do jogo (cores de botões e fundo do tabuleiro)?
   - *Proposta do PO*: Redefinir as cores de botões secundários e o fundo escuro (`body`) do jogo para criar uma imersão completa e harmônica baseada no tema VIP selecionado (ex: botões com bordas roxas e fundo sombrio no tema Cyber-Den).

2. **Dicas do Dealer**:
   - *Dúvida*: As dicas dadas pelo Dealer em tempo real sobre força de mãos ou prováveis saídas do bordo (Flops e Draws) violam as regras competitivas ou ajudam a ensinar novos jogadores?
   - *Proposta do PO*: Ajudam novos jogadores e tornam o game feel muito mais atrativo. Como as dicas são de texto estático, não alteram o motor interno de cartas nem dão vantagem injusta (já que o Tracker de mãos da TASK_002 já exibe a força em porcentagem). O Dealer apenas traduz a telemetria do jogo em comentários de voz divertidos.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

- **Feltro e Temas Completos**: Adotada a proposta de escopo amplo do feltro VIP. A alteração de tema injetará classes globais no `<body>` (ex: `theme-classic`, `theme-cyber`, `theme-gold`) para permitir que o CSS altere variáveis de paleta inteiras (bordas, fundos, texturas e cores de botões).
- **Visibilidade de Cartas de IA no Replay**: Confirmada a visibilidade semitransparente das cartas da IA no replay. Isso facilita a aprendizagem sem quebrar o segredo das cartas em tempo real durante a partida.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `poker` (Poker Texas Hold'em)
* **Ação**: Criação e especificação técnica de customização VIP de feltros e cartas, Dealer interativo de mesa, replay de mão e efeitos sonoros procedurais.
* **Status do Backlog**: Registrado com sucesso no [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.
* **Destino**: A `TASK_004.md` está homologada para desenvolvimento técnico futuro.

*Assinado: Product Owner (PO) - Antigravity*
