# 📂 Arquitetura e Padrões - The Archer

Um jogo interativo de arco e flecha em duas dimensões (2D) baseado em física balística elemental, construído utilizando elementos estilizados do DOM (HTML/CSS) com renderizações SVG nativas para o arqueiro e o arco, controlado por eventos de mouse/toque.

## 🏗️ Arquitetura do Código

O jogo é estruturado de forma compacta em um único arquivo HTML que centraliza toda a interface visual, animações estilizadas e o motor de física balística em Javascript.

- **Estrutura de Arquivos**: 
  - `index.html`: Responsável por hospedar os estilos visuais de pergaminho clássico, definições de animações CSS, elementos do cenário baseados em vetores SVG, rastreamento de pontuação e flechas restantes, e toda a lógica de física e interações.

- **Fluxo de Inicialização e Execução**:
  1. Carregamento do DOM, configurando cenários como nuvens oscilantes (`.cloud`), solo (`#ground`) e o balão de alvo inicial (`#balloon`).
  2. Execução da função `positionBalloon()` para sortear aleatoriamente as coordenadas horizontais (`right`) e verticais (`bottom`) do balão e seu respectivo fio.
  3. Registro dos ouvintes de eventos para controle de mira (`mousedown`, `touchstart` no container).
  4. Quando o jogador tensiona o arco, ativa-se o indicador de potência (`#power-indicator`) e a barra de força (`#power-bar`).
  5. Ao soltar, a função `handleFire()` calcula os vetores de velocidade inicial e ativa a física contínua da flecha através do laço `updateArrow()`.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop Local / Física (Ciclo de Voo)**: Utilização de `requestAnimationFrame(updateArrow)` para atualizar as coordenadas balísticas da flecha durante seu voo. O motor balístico aplica gravidade constante (`gravity = 0.25`) sobre o vetor de velocidade vertical (`arrowVelocityY -= gravity`) e recalcula o ângulo da flecha a cada quadro com `Math.atan2(arrowVelocityY, arrowVelocityX)`.
- **State Pattern (Padrão Estado)**: Controle de fluxo simples com variáveis globais como `gameOver`, `arrowFired` e `isDragging`. Transições de estado atualizam a interface exibindo painéis como o pop-up `#game-over` e resetando os atributos do projétil via `resetArrow()`.
- **Event-Driven (Programação Dirigida a Eventos)**: Interações de usuário totalmente coordenadas por eventos de ponteiro para suportar desktop e dispositivos móveis:
  - Início da mira: `mousedown` e `touchstart`.
  - Ajuste de ângulo e força: `mousemove` e `touchmove` calculando a distância euclidiana entre o ponto inicial e o cursor (clamped em `maxPull = 150`).
  - Lançamento: `mouseup` e `touchend`.
  - Cancelamento da ação: `mouseleave` e `touchcancel`.
- **Detecção de Colisão AABB (Axis-Aligned Bounding Box)**: Executada na função `checkCollision()` via `getBoundingClientRect()` do balão e da flecha. Se houver interseção nas quatro bordas, ativa-se o efeito visual de explosão e adiciona-se `100` pontos ao placar.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **SVG (Scalable Vector Graphics)**: Empregado nativamente no HTML para desenhar o corpo do arqueiro (`#archer`) e a curvatura do arco de madeira (`#bow`).
- **Animações e Efeitos CSS3**:
  - Translação de nuvens via `@keyframes slideCloud`.
  - Flutuação leve (bobbing) do balão via `@keyframes bobbingBalloon`.
  - Rastro e faíscas criados dinamicamente via injeção DOM de divs temporárias (`.launch-spark`, `.arrow-trail-dot`, `.balloon-fragment`) com animações de dissipação e fade-out.

## 🔑 Funções e Estruturas Principais

- `handleAimMove(clientX, clientY)`: Calcula a distância de puxada e o ângulo radiano `arrowAngle` a partir da diferença das coordenadas. Ajusta a curvatura visual da corda (`bowStringVisual`) e escala a barra de força correspondente (`powerBar`).
- `handleFire()`: Dispara a flecha configurando suas velocidades balísticas (`arrowVelocityX` e `arrowVelocityY`) baseadas no seno/cosseno do ângulo multiplicado pela força calculada. Aciona a faísca `createLaunchSpark()`.
- `updateArrow()`: Aplica a força de gravidade à flecha e atualiza suas posições em tela. Desenha o rastro (`createTrailDot`) e invoca `checkCollision()`.
- `checkCollision()`: Testa a colisão geométrica da flecha com o balão. Se colidirem, invoca `createBalloonPopEffect()` para despedaçar o balão em fragmentos dinâmicos (`.balloon-fragment`) usando propriedades CSS variáveis (`--tx`, `--ty`, `--rot`).
- `positionBalloon()`: Coloca o balão de forma aleatória em zonas seguras no lado direito da tela e reativa sua exibição.
- `endGame()`: Finaliza a partida e exibe a tela de estatísticas finais.
