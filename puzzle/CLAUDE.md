# 📂 Arquitetura e Padrões - Mind Labyrinth: Puzzle Adventure

Uma jornada narrativa e intelectual baseada em múltiplos quebra-cabeças lógicos interativos. O jogador decifra mistérios matemáticos, visuais, de memória e perspectiva 3D para desbloquear fragmentos de pergaminhos antigos de uma biblioteca lendária.

## 🏗️ Arquitetura do Código

O jogo adota uma arquitetura limpa de arquivo único (`index.html`) orientada a estados e injeção dinâmica de componentes de interface diretamente no DOM.

- **Estrutura de Arquivos**:
  - `index.html`: Contém todos os estilos de animação CSS3 (incluindo rotação 3D espacial), elementos básicos de layout, o inventário de textos da narrativa e a rotina inteligente em JavaScript.

- **Fluxo de Inicialização e Execução**:
  1. A página inicia exibindo uma descrição narrativa e um botão de introdução.
  2. Ao clicar em "Begin Journey", a função `startGame()` reseta o score, define o nível inicial e carrega o primeiro quebra-cabeça via `loadPuzzle(0)`.
  3. `loadPuzzle(index)` limpa o container central e executa a função de fábrica `setup()` correspondente ao puzzle da vez.
  4. O componente gerado constrói e insere dinamicamente os botões, grades e listeners do quebra-cabeça na tela.
  5. Concluída a solução com êxito, a pontuação é recalculada, a narrativa avança através da chamada `updateNarrative()` e o próximo enigma é enfileirado após um breve intervalo.

## 🧩 Padrões de Projeto Aplicados

- **Component Factory / Builder (Fábrica de Componentes)**: O array mestre de enigmas (`puzzles`) é estruturado de forma que cada objeto de puzzle funcione como uma mini-fábrica. O método `setup()` é responsável por instanciar programaticamente toda a sub-estrutura do DOM, atribuir classes CSS adequadas e plugar os listeners de clique locais, retornando um elemento Node unificado para renderização:
  - `const puzzleContent = puzzle.setup();`
  - `puzzleContainer.appendChild(puzzleContent);`
- **State Pattern (Padrão Estado)**: A evolução do jogo é controlada de forma estrita pelo dicionário reativo `gameState`, que sincroniza e atualiza dinamicamente as interfaces e exibições estatísticas do placar (`score`) e da narrativa atual.
- **Event-Driven (Programação Dirigida a Eventos)**: Interações orientadas a cliques do jogador para submeter respostas, selecionar cartas, girar faces e avançar telas de interface.
- **Transformações Espaciais 3D (CSS Perspective Engine)**: O minijogo de perspectiva projeta um cubo no espaço 3D usando propriedades CSS nativas como `perspective`, `transform-style: preserve-3d` e transições de transformações. O código controla os graus de rotação trigonométrica em tempo real e calcula as margens modulares de alinhamento matemático (módulo de 360°) para validar a solução.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5/CSS3 (CSS Variables, Flexbox, Perspective 3D)**: Renderização e estilização dos componentes de forma declarativa e animação de rotação tridimensional do cubo de perspectiva.
- **JavaScript (ES6+)**: Geração declarativa de Nodes do DOM em tempo de execução (`document.createElement`), manipulação de arrays e shuffle algorítmico.

## 🔑 Funções e Estruturas Principais

- `gameState`: Objeto central que rastreia os status da simulação: `level`, `score`, `currentPuzzle`, `puzzlesSolved` e `narrativeProgress`.
- `puzzles`: Array contendo a especificação técnica e comportamental de cada enigma:
  1. **Sequence Completion**: Identifica padrões geométricos simples de repetição periódica.
  2. **Pattern Recognition**: Matriz 2D de correspondência na qual o jogador seleciona o elemento que completa a lógica de disposição.
  3. **Memory Challenge**: Implementa um jogo da memória clássico 4x4. Embaralha os símbolos usando a técnica de Fisher-Yates, vigia os cliques e gerencia pares através do array temporário `flippedCards`.
  4. **Logic Puzzle**: Silogismo dedutivo de proposições declarativas no qual apenas uma opção é factível.
  5. **Perspective Puzzle**: Cria um modelo cúbico tridimensional manipulável. Transiciona as propriedades de rotação no plano cartesiano a cada clique em botões direcionais.
- `loadPuzzle(index)`: Despacha a montagem e limpeza do layout central para acomodar o quebra-cabeça subsequente.
- `completePuzzle(success)`: Efetua o julgamento lógico do palpite do jogador. Aplica bonificações de acertos (+100) ou dedução de penalidades (-50) e emite alertas visuais com classes temáticas (`feedback-success` / `feedback-error`).
- `showCompletion()`: Constrói a tela de conclusão, exibe a pontuação final de sabedoria e oferece a reinicialização da jornada.
