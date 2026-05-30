# 📂 Arquitetura e Padrões - Enhanced Snake Game

Uma versão moderna e aprimorada do clássico jogo da serpente (Snake) com efeitos visuais neon, curvas de corpo suavizadas, dificuldade progressiva com base no score, sistema de vibração física na colisão e recordes locais persistentes (`localStorage`).

## 🏗️ Arquitetura do Código

O jogo é executado inteiramente sob um fluxo monolítico no cliente:
- **`index.html`**: Centraliza a folha de estilos responsiva com variáveis CSS, o contêiner do Canvas retro, o painel de sobreposição condicional para Game Over e a lógica JavaScript para cinemática da cobra, pulsação dos itens, pontuação progressiva e persistência de dados de recordes.

### Fluxo de Inicialização e Execução:
1. **Configuração de Estilo e Elementos**: Leitura de variáveis do tema CSS Variables (`--snake-head`, `--snake-body1`, `--snake-body2`, `--food-color`, etc.) para sincronizar a paleta de desenho do Canvas com o estilo visual da página.
2. **Carga de Placar**: O sistema carrega os recordes salvos no armazenamento local do navegador (`localStorage.getItem('snakeHighScores')`) e renderiza a lista inicial no painel direito.
3. **Loop Principal (Game Loop)**: Inicia o temporizador recursivo (`setTimeout`) que coordena a atualização das posições no grid bidimensional.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo)**: Gerenciado por chamadas recursivas via `setTimeout` no método `gameLoop`. A taxa de quadros (dificuldade) é adaptativa, acelerando progressivamente o deslocamento físico com base na pontuação atual: `speed = 150 - Math.min(score * 2, 80)`.
- **Event-Driven (Programação Dirigida a Eventos)**: Controla as mudanças de direção através da escuta ao teclado (`keydown`).
  - O sistema usa uma variável intermediária `requestedDirection` para reter o input e atualizá-lo apenas no início do próximo frame físico (`direction = requestedDirection`), prevenindo que o jogador mude de rumo duas vezes rapidamente dentro do mesmo frame e colida contra o próprio corpo (anti-cheat natural).
- **State Pattern (Padrão Estado)**: A variável `isGameOver` altera drasticamente os modos de operação e o mapeamento de teclas:
  - **MENU / JOGANDO**: Setas direcionais controlam a cobra.
  - **GAME OVER**: Bloqueia setas; o `Enter` ou cliques interagem com o salvamento de recorde (`playerNameInput`) e o botão de reinicialização (`restartButton`).
- **Persistência de Dados (Data Persistence Pattern)**: Os recordes são guardados localmente via Web Storage API (`localStorage`), armazenando um JSON serializado com até 5 recordistas. O sistema detecta autonomamente se o score final do jogador supera a menor pontuação ativa no Top 5 (`isHighScore`) para acionar o formulário de gravação.
- **Suavização Cinemática e Estética (Visual Effects)**:
  - **Suavização de Curvas**: O algoritmo de desenho `drawRoundedRect` calcula bordas circulares para o corpo. Os segmentos da cauda analisam as coordenadas do item anterior (`prevSegment`) para preencher retângulos conectores, criando curvas suaves e visualmente contínuas ao virar nos blocos do grid.
  - **Efeito de Tremor (Camera Shake)**: Ao colidir com paredes ou consigo mesma, uma animação CSS `@keyframes shake` de 0.5s é aplicada temporariamente na tag canvas, simulando uma forte batida física.
  - **Pulsação da Comida**: O raio do item oscila dinamicamente a cada renderização utilizando uma função senoidal do tempo (`0.1 * Math.sin(Date.now() / 150)`) com sombra blur brilhante (`shadowBlur = 15`).

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Usado para renderizar o grid de jogo, a serpente de visual gradiente neon suave, comida reflexiva pulsante e efeitos de sombra neon.
- **Web Storage API (localStorage)**: Usado para reter localmente e de forma permanente os nomes e scores dos cinco melhores jogadores do console.

## 🔑 Funções e Estruturas Principais

- `gameLoop()`: Coordena a sequência de atualização física (`update`), renderização visual (`draw`) e temporização assíncrona.
- `update()`: Move a serpente no grid, verifica colisões de borda ou de autocontato e contabiliza a alimentação da cobra.
- `isHighScore(currentScore)`: Analisa se o jogador atingiu o ranking de recordes locais.
- `addHighScore(name, score)`: Grava e organiza o placar de recordistas no `localStorage`.
- `drawRoundedRect(ctx, x, y, width, height, radius)`: Utilitário para desenho de retângulos com cantos circulares suaves.
- `drawEyes(ctx, headX, headY, segmentSize)`: Desenha e posiciona proceduralmente os olhos da serpente na direção correspondente do movimento atual.
