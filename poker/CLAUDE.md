# 📂 Arquitetura e Padrões - Poker Texas Hold'em

Um jogo clássico de Poker no estilo Texas Hold'em contra oponentes inteligentes (computador) em modo Single Player, com interface responsiva inspirada em mesas de cassino reais, histórico de rodadas e efeitos visuais animados.

## 🏗️ Arquitetura do Código

O jogo está consolidado em um arquivo principal:
- **`index.html`**: Contém toda a estrutura visual do feltro verde, baralho procedural, área de cartas comunitárias, área de bots, animações CSS3 de movimentação de fichas e a lógica complexa de classificação e desempate de mãos de poker.

### Fluxo de Inicialização e Execução:
1. **Modo de Jogo**: A partida inicia na janela de seleção de modos (`.mode-select`), oferecendo "Single Player" (completamente implementado) e indicando "Multiplayer" em desenvolvimento.
2. **Setup do Feltro**: Ao iniciar a partida, as variáveis de som e áudio são carregadas. A música de jazz jazzística de fundo (`#background-music`) inicia com volume restrito a 40% (`volume = 0.4`).
3. **Distribuição e Turnos**: O deck é embaralhado proceduralmente. Ocorre a distribuição das duas cartas exclusivas de cada participante e os rounds de apostas iniciam, progredindo reativamente através de eventos de clique e ações lógicas da Inteligência Artificial.

## 🧩 Padrões de Projeto Aplicados

- **Event-Driven (Programação Dirigida a Eventos)**: As decisões de apostas operam de forma reativa a cliques nos botões de controle (`.check-call`, `.bet-raise`, `.fold`, `.min-bet`, `.max-bet`). Não existe game loop por frames contínuos (tipo canvas); a interface é atualizada em cascata no DOM de acordo com a sequência de turnos.
- **State Pattern (Padrão Estado)**: O objeto global `gameState` funciona como a única fonte da verdade, controlando a fase atual da partida (`phase`: 'waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'), as cartas comunitárias expostas (`communityCards`), o montante no pote (`pot`), a aposta corrente (`currentBet`), os chips dos jogadores e a rodada ativa (`round`).
- **Mapeamento e Classificação de Mão (Poker Hand Evaluator)**:
  - **`evaluateHand(cards)`**: Algoritmo robusto de classificação que aceita as 2 cartas individuais do jogador mais as 5 cartas da mesa para calcular a melhor combinação possível.
  - **Hierarquização de Força**: A mão é rotulada com pesos numéricos (`rank` de 0 a 9) representando desde 'High Card' até 'Royal Flush'.
  - **Desempates Precisos**: O sistema computa `primaryValue`, `secondaryValue` e um array de `kickers` ordenados para realizar desempates refinados entre dois pares ou cartas altas semelhantes.
- **Inteligência Artificial (Bots de Poker)**: Os oponentes controlados por IA agem na sua vez analisando o valor heurístico intrínseco de suas cartas fechadas e a probabilidade de vitória, decidindo dinamicamente entre dar Check, Call, aumentar a aposta (Raise) ou desistir da rodada (Fold).
- **Animações Fluidas por CSS3**:
  - `winnerGlow`: Efeito pulsar dourado que destaca a área do jogador campeão da rodada.
  - `chipsFly`: Animação dinâmica de translação que faz as fichas douradas `#pot-chip` voarem do feltro central até o jogador vencedor.
  - `fadeInOut`: Mostra dinamicamente a flutuação do saldo de moedas ganhas.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 & CSS3 Variables**: Utilização de variáveis globais CSS (`:root`) para controle dinâmico do tema ( feltro, tons de cartas pretas/vermelhas e botões de ação).
- **Web Audio API (HTML5 Audio)**: Elemento de áudio nativo para execução de música jazzística de fundo.

## 🔑 Funções e Estruturas Principais

- `createDeck()` / `shuffleDeck()`: Cria um baralho padrão de 52 cartas estruturado em naipes (`SUITS`) e valores (`VALUES`), aplicando o algoritmo Fisher-Yates para embaralhamento randômico.
- `evaluateHand(cards)`: Core matemático que avalia e classifica a melhor combinação de cinco cartas.
- `dealCards()`: Reseta o estado da rodada, limpa as cartas da mesa e distribui as cartas da mão.
- `updateUI()`: Atualiza a interface do DOM, gerando as cartas graficamente com naipes coloridos e virando as cartas dos oponentes de cabeça para baixo (`.facedown`) até a hora do showdown.
- `history-panel`: Módulo dinâmico que armazena os vencedores e mãos vitoriosas das rodadas anteriores, permitindo minimização reativa na tela.
