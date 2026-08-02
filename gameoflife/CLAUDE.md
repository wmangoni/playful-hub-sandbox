# 📂 Arquitetura e Padrões - Conway's Game of Life

Uma simulação interativa e visual do clássico autômato celular "Jogo da Vida", concebido pelo matemático John Horton Conway, implementado sobre a API HTML5 Canvas e controlado em tempo de execução por eventos do DOM.

## 🏗️ Arquitetura do Código

A aplicação utiliza uma estrutura robusta de arquivo único (`index.html`) que integra a interface visual, botões de ação, controle deslizante de velocidade, o tabuleiro de desenho em Canvas e o interpretador lógico da simulação.

- **Estrutura de Arquivos**:
  - `index.html`: Centraliza os estilos CSS da interface, elementos estruturais (controles de simulação, Canvas e botões de moldes pré-programados) e os scripts JavaScript.

- **Fluxo de Inicialização e Execução**:
  1. O DOM é carregado completamente acionando o ouvinte `'DOMContentLoaded'`.
  2. São definidos parâmetros do tabuleiro como o tamanho das células (`cellSize = 15`), calculando as dimensões de linhas e colunas (`rows`, `cols`) a partir do tamanho do Canvas (600x600px).
  3. A grade é inicializada como vazia através da matriz bidimensional gerada por `createEmptyGrid()`.
  4. São vinculados ouvintes de eventos para os botões de simulação e o clique no Canvas para ativação manual de células.
  5. Ao clicar em "Start", ativa-se `startSimulation()` que inicia o laço contínuo `gameLoop()` aplicando as regras matemáticas e redesenhando o tabuleiro em cada ciclo.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo adaptado com Frequência Dinâmica)**: O laço de repetição é coordenado pela função `gameLoop()`, que calcula recursivamente o estado das gerações e se reagenda via `setTimeout(gameLoop, delay)` onde o atraso (`delay`) é calculado dinamicamente com base na frequência em FPS fornecida pelo controle deslizante (`delay = 1000 / speed`).
- **State Pattern (Padrão Estado)**: A simulação monitora ativamente as variáveis `isRunning`, `generationCount` e `grid` (a matriz de estados). A mudança desse estado de simulação altera propriedades no DOM, como habilitar/desabilitar botões (`start-btn`, `pause-btn`) e renderizar dados estatísticos em tempo real (placar de Geração e População).
- **Event-Driven (Programação Dirigida a Eventos)**: Todo o controle de fluxo da simulação e modelagem baseia-se em eventos de clique do usuário em botões de ação e na grade. A edição de células individuais é mapeada através de cliques no canvas no método `handleCanvasClick(event)` que calcula a célula correspondente de forma matemática baseando-se no retângulo delimitador `getBoundingClientRect()`.
- **Topologia Toroidal (Bordas Infinitas)**: O cálculo de células vizinhas em `countNeighbors(grid, row, col)` implementa condições de contorno periódicas usando operações aritméticas modulares. Isso permite que objetos ou naves (como Gliders) que saiam pelas extremidades do Canvas reapareçam de forma contínua no lado oposto:
  - `const r = (row + i + rows) % rows;`
  - `const c = (col + j + cols) % cols;`

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Consumida nativamente para limpar e redesenhar dinamicamente a malha quadriculada de cor `#ddd` e as células preenchidas de `#333` em tempo real.
- **JavaScript (ES6+)**: Estruturação de matrizes multidimensionais nativas de forma declarativa:
  - `Array(rows).fill().map(() => Array(cols).fill(0))`.

## 🔑 Funções e Estruturas Principais

- `createEmptyGrid()`: Cria e retorna uma nova matriz bidimensional preenchida com zeros (células mortas).
- `drawGrid()`: Limpa o Canvas, desenha as linhas que subdividem o tabuleiro e renderiza retângulos preenchidos para cada célula com estado `1` (viva).
- `countNeighbors(grid, row, col)`: Examina a vizinhança de Moore (8 células adjacentes) aplicando aritmética modular toroidal para retornar a quantidade total de células vivas vizinhas.
- `nextGeneration()`: Executa o núcleo das regras Conway:
  1. Cria um novo grid temporário (`newGrid`).
  2. Avalia cada célula aplicando as regras clássicas de sobrevivência, subpopulação, superpopulação e reprodução.
  3. Substitui a grade ativa pela nova e incrementa os contadores estatísticos.
- `placePattern(pattern, centerRow, centerCol)`: Copia um molde pré-programado (contido no mapa literal `patterns` como *Glider*, *Blinker*, *Toad*, *Beacon*, *Pulsar*, *Gosper*) transpondo suas coordenadas locais para o centro do tabuleiro do jogo.
