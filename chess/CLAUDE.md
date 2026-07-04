# 📂 Arquitetura e Padrões - Jogo de Xadrez com IA

Um jogo de xadrez clássico contra o computador que utiliza algoritmos de busca e avaliação heurística avançada para tomada de decisões por parte da Inteligência Artificial.

## 🏗️ Arquitetura do Código

O jogo está estruturado em um único arquivo de interface e controle:
- **`index.html`**: Contém a estrutura da interface do usuário (HTML5), estilos visuais (CSS3), integração de bibliotecas de terceiros e a lógica completa de inteligência artificial e controle de estado do xadrez.

### Fluxo de Inicialização e Execução:
1. **Carregamento de Assets**: Recursos de som como áudios nativos (`Audio`) são inicializados em variáveis globais (`moveSound`, `victorySound`, `defeatSound`).
2. **Instanciação do Tabuleiro**: A biblioteca `chessboardjs` inicializa a representação gráfica do tabuleiro no elemento `#myBoard` e a biblioteca `chess.js` gerencia as regras do jogo e a representação lógica interna.
3. **Loop baseado em Turnos**: O jogo não utiliza um game loop contínuo de renderização por quadros (fps). Em vez disso, opera de forma reativa a eventos disparados por ações do jogador humano e processamentos assíncronos da Inteligência Artificial.

## 🧩 Padrões de Projeto Aplicados

- **Event-Driven (Programação Dirigida a Eventos)**: As interações de arrastar e soltar as peças no tabuleiro disparam funções callback da biblioteca `chessboardjs`, tais como `onDragStart` (valida se o jogador pode mover a peça), `onDrop` (processa a jogada), e `onSnapEnd` (atualiza o estado gráfico do tabuleiro após o movimento físico).
- **State Pattern (Padrão Estado)**: A engine interna do xadrez (`Chess`) gerencia o estado da partida (em xeque, mate, empate por repetição, empate por falta de material, afogamento), atualizando os elementos visuais `#status` e `#turn` conforme o estado atual.
- **Minimax Search com Poda Alpha-Beta e Busca Seletiva**:
  - **Minimax / Alpha-Beta**: O computador planeja suas jogadas simulando turnos futuros através do algoritmo Minimax. A poda Alpha-Beta (`alpha` e `beta`) corta ramificações de jogadas irrelevantes para otimizar o tempo de processamento.
  - **Selective Search / Beam Search**: A função `selectiveSearch` filtra os melhores candidatos a movimentos em cada nível (limitado por um `beamWidth` de 10 movimentos) e prioriza movimentos de captura para aprofundar a busca eficientemente.
- **Evaluation Function (Função de Avaliação)**: A função `evaluateBoard` avalia estaticamente uma posição sob a ótica das peças brancas usando:
  - **Material**: Valores estáticos atribuídos a cada peça (`PAWN_VALUE`, `KNIGHT_VALUE`, etc.).
  - **Piece-Square Tables (PST)**: Matrizes bidimensionais que definem bônus e penalidades posicionais para cada tipo de peça (como `knightTable` penalizando cavalos nas bordas e `kingTableEndGame` ativando o rei no centro durante finais).
  - **Heurísticas Estruturais**: Penalidades para peões dobrados/isolados e bônus para peões passados ou centralizados. Bônus de desenvolvimento de peças menores e de segurança do rei roqueado.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 & CSS3**: Para estruturar a interface e definir estilos como o destaque visual de rei em xeque (`.highlight-check`) e movimentos válidos (`.highlight-legal-move`).
- **jQuery (3.5.1)**: Utilizado como dependência da biblioteca de renderização do tabuleiro.
- **chessboardjs (1.0.0)**: Biblioteca cliente para desenhar e interagir com o tabuleiro de xadrez na tela.
- **chess.js (0.10.3)**: Biblioteca encarregada de computar movimentos válidos, detecção de xeque, mate, empate e validação de regras.
- **Web Audio API (HTML5 Audio)**: Para reproduzir efeitos sonoros na movimentação de peças e na conclusão do jogo.

## 🔑 Funções e Estruturas Principais

- `evaluateBoard(currentBoard, turn)`: Realiza a análise heurística de pontuação posicional, estrutural, material e tática da mesa.
- `determineIsEndGame(currentBoard)`: Avalia se o jogo entrou na fase final com base no material e presença de damas, mudando a heurística de posicionamento do rei.
- `minimaxRoot(depth, isMaximizingPlayer)`: Ponto de entrada da inteligência artificial que ordena e filtra os melhores movimentos iniciais usando a busca seletiva.
- `selectiveSearch(depth, alpha, beta, isMaximizingPlayer, beamWidth)`: Realiza a recursão profunda avaliando capturas prioritariamente.
- `onDrop(source, target)`: Captura a jogada feita pelo usuário, valida a jogada no objeto `game`, inicia o processamento assíncrono da IA mostrando um loading overlay (`#loadingOverlay`) e atualiza o estado do tabuleiro.
