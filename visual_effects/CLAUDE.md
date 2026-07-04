# 📂 Arquitetura e Padrões - String Catcher & Vibrating Strings

Uma fusão inovadora de um simulador de física de cordas vibrantes com um jogo musical e rítmico interativo. O usuário pode relaxar ajustando variáveis das cordas ou engajar no modo arcade "String Catcher", no qual captura notas musicais que trafegam nas cordas na zona correta ao som de loops de áudio, desviando de obstáculos e quebrando recordes.

## 🏗️ Arquitetura do Código

A aplicação é contida inteiramente em um arquivo monolítico (`index.html`) dinamicamente gerenciável pelo DOM, dividindo a lógica matemática de ondas físicas e o loop de lógica de jogo.

- **Estrutura de Arquivos**:
  - `index.html`: Centraliza estilos em CSS3, o canvas HTML5, canais de áudio de efeitos e trilhas sonoras, e o script global em JavaScript Vanilla.

- **Fluxo de Inicialização e Execução**:
  1. A página inicia desenhando as cordas estáticas e gerando a tela de boas-vindas com o painel de instruções de jogo (`addStartGameButton`).
  2. O jogador pode optar por ajustar os parâmetros físicos das cordas no painel "String Parameters" ou iniciar o modo arcade ("Começar Jogo").
  3. No modo arcade (`initGame()`), as vidas, pontuação e combos são zerados. Disparam-se os temporizadores paralelos de spawn de notas musicais (`startNoteGenerator`) e de obstáculos vermelhos (`startObstacleGenerator`).
  4. O laço de animação `animate()` atualiza ciclicamente a física senoidal de oscilação das cordas e desenha as posições móveis das notas/obstáculos no Canvas.
  5. Entradas de mouse e toque são processadas na rotina de captura `checkNoteCapture(x, y)` para aplicar pontuações, feedbacks visuais flutuantes e persistir dados.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Animação Física)**: A cena roda sob `requestAnimationFrame(animate)`, limpando o canvas e renderizando a oscilação das cordas a cada frame com base em cálculos de tempo delta e amortecimento elástico de molas.
- **Modelagem Física de Ondas Harmônicas**: A classe `VibratingString` gerencia o comportamento das cordas:
  - Cada corda possui 100 nós posicionais (`points`).
  - O arrasto do cursor aplica uma aceleração reativa proporcional ao raio de ação (`influenceRadius`): `point.velocity += force * randomOffset`.
  - Vibração de repouso calcula uma função seno contínua: `Math.sin(time * speed + i * 0.1 + offset) * 2`.
  - Amortecimento físico de atrito simula perda de energia cinética (`velocity *= 0.95`).
  - Traçado suave das cordas usa interpolação quadrática de Bézier (`quadraticCurveTo`) no canvas para ligar os nós.
- **State Pattern (Padrão Estado)**: Controle estrito de interface a partir da flag `gameActive`. O jogo oculta os painéis de configuração física e exibe o dashboard flutuante de jogo (`score-display`) e a tela de Game Over quando as 3 vidas expiram.
- **Persistência de Dados (Active Record / LocalStorage)**: Mapeia e grava os 5 maiores recordes no browser na chave `stringCatcherHighScores`. Oferece formulário de nome para novos recordistas e renderiza tabelas dinâmicas em HTML5.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Desenho de linhas, preenchimentos brilhantes de partículas, e as zonas translúcidas de captura.
- **Web Audio API**: Gerenciamento e reprodução simultânea de trilha sonora relaxante (`happy-relaxing-loop.mp3`), som de estalo de captura (`sfx-pop.mp3`) e colisão com barreiras (`enemy_hit.mp3`).
- **JavaScript Vanilla (ES6)**: Sintaxe orientada a classes, tratamento de toque para plataformas mobile (`touchmove`), e manipulação de localStorage.

## 🔑 Funções e Estruturas Principais

- `VibratingString`: Classe modeladora da corda. Contém os métodos `update()` (física de gravidade, atrito e oscilação) e `draw()` (renderização colorida/arco-íris baseada em HSL no canvas).
- `initGame()`: Reinicia variáveis, inicia spawners e reseta a UI de jogo.
- `createNote()` & `createObstacle()`: Spawnam aleatoriamente partículas de nota (azul cyan = 10 pts, verde lime = 20 pts, ouro gold = 50 pts) ou obstáculos (vermelhos) que correm a corda com velocidade progressiva conforme o nível.
- `checkNoteCapture(x, y)`: Mapeia o vetor de toque do jogador. Verifica a proximidade matemática das notas em relação à zona (`precisionFactor`) e pune o jogador se colidir com esferas vermelhas.
- `notePassed(note)`: Aplica penalidade se a nota musical ultrapassar o limite lateral direito da tela sem captura, diminuindo uma vida.
- `updateScoreDisplay()`: Monta e gerencia programaticamente o placar de dados da partida: vidas (`❤️`), combos multiplicadores (até 5x) e nível de dificuldade.
