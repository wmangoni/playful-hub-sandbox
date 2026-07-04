# 📂 Arquitetura e Padrões - Tetris Moderno

Uma implementação fiel e moderna do clássico jogo de quebra-cabeça "Tetris". O jogador manipula blocos geométricos em queda livre (Tetraminós) para completar linhas horizontais e acumular pontuação, sob um sistema progressivo de velocidade e níveis.

## 🏗️ Arquitetura do Código

O projeto adota uma arquitetura de arquivo único (`index.html`) modularizada que integra estilos escuros estilizados, canvas duplos (painel principal e visualizador da próxima peça) e inteligência lógica puramente em JavaScript Vanilla.

- **Estrutura de Arquivos**:
  - `index.html`: Centraliza o estilo escuro moderno, as duas tags `<canvas>` (`#tetris` para a arena de jogo e `#nextPiece` para pré-visualização) e a engine de regras em JavaScript.

- **Fluxo de Inicialização e Execução**:
  1. A página inicia em modo estático aguardando a interação do usuário.
  2. Ao clicar em "Novo Jogo" (`startGame()`), o tabuleiro 2D de 10x20 (`board`) é limpo e as peças inicial e consecutiva são sorteadas (`getRandomPiece()`).
  3. O loop principal `update()` é iniciado recursivamente sob a tutela de `requestAnimationFrame`.
  4. Conforme o tempo avança (`dropCounter`), a peça é deslocada verticalmente para baixo até colidir com a base ou peças fixas.
  5. Se uma colisão ocorre, a peça é incorporada à grade estática (`mergePiece()`), linhas cheias são removidas (`clearLines()`), pontuações são recalculadas e a próxima peça entra na arena.
  6. O jogo se encerra se uma nova peça surgir já colidindo com blocos consolidados na linha zero (`gameOver = true`).

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo com Delta Time)**: O jogo é atualizado continuamente através da chamada de `requestAnimationFrame(update)`. A velocidade de queda das peças baseia-se na contagem de tempo delta em milissegundos (`dropCounter += deltaTime`), garantindo precisão de renderização independente da taxa de atualização (Hz) do monitor.
- **State Pattern (Padrão Estado)**: A interface reage dinamicamente aos estados `gameOver` e `paused`. O clique na tecla `P` aciona `togglePause()`, o qual interrompe ou retoma o laço de animação (`cancelAnimationFrame` / `requestAnimationFrame`) e congela a captura de entradas físicas do teclado.
- **Física de Colisões Rígidas na Grade (Grid Collision)**: A validação cinemática baseia-se na leitura posicional de matrizes em `checkCollision()`. O método avalia cada bloco ocupado da peça atual transpondo suas coordenadas locais na matriz para o tabuleiro global e rejeita movimentos (deslocamentos horizontais, quedas ou giros de rotação) caso as bordas sejam violadas ou haja sobreposição de blocos.
- **Rotina de Transformação de Matriz (Rotação Dinâmica)**: A rotação da peça é executada matematicamente no método `rotatePiece()`, que clona a matriz da forma geométrica e transpõe suas linhas em colunas invertidas para realizar uma rotação anti-horária de 90°. Se a rotação violar barreiras físicas de blocos vizinhos, a alteração é revertida imediatamente.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Dois contextos Canvas escalados via `ctx.scale(BLOCK_SIZE, BLOCK_SIZE)` para permitir que o desenho físico ocorra usando coordenadas simplificadas de 1x1 por bloco em vez de pixels reais.
- **JavaScript Vanilla (ES6+)**: Manipulações de arrays bidimensionais declarativos para modelagem do tabuleiro e tetraminós.

## 🔑 Funções e Estruturas Principais

- `board`: Matriz bidimensional de 20x10 que armazena os valores inteiros (`0` a `7`) que representam a cor de cada bloco consolidado na arena.
- `SHAPES`: Mapa literal contendo as matrizes de geometria dos 7 tetraminós clássicos (*Z, L, O, S, I, T, J*).
- `createBoard(cols, rows)`: Gera a matriz bidimensional vazia preenchida com zeros.
- `draw()`: Limpa o canvas e redesenha o tabuleiro e as peças com sombreamento volumétrico.
- `drawBoard()` & `drawPiece()`: Métodos de desenho que clareiam as bordas superiores esquerdas (`lightenColor`) e escurecem as bordas inferiores direitas (`darkenColor`) de cada bloco individual, conferindo um relevo chanfrado 3D realista na tela 2D.
- `dropPiece()`: Incrementa a posição Y da peça e, em caso de colisão, chama as rotinas de fusão, eliminação de linhas e sorteio de novas peças.
- `clearLines()`: Varre a matriz de baixo para cima buscando linhas completas, removendo-as via `.splice()` e inserindo novas linhas zeradas no topo via `.unshift()`.
- `updateScore(linesCleared)`: Multiplica os pontos clássicos de eliminação simultânea de linhas (40, 100, 300, 1200) pelo nível ativo. A cada 10 linhas, o nível sobe e o tempo de queda (`dropInterval`) é encurtado para elevar o desafio.
