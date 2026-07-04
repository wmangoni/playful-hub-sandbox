# 📂 Arquitetura e Padrões - Space Shooter

Um clássico jogo de combate espacial (Space Shooter / Arcade) com movimentação fluida, sistema de fases com boss battles alternadas, múltiplos tipos de inimigos e projéteis teleguiados (Homing), escudo protetor, sistema de partículas e trilha sonora imersiva.

## 🏗️ Arquitetura do Código

A aplicação utiliza uma estrutura híbrida baseada no DOM do navegador para posicionamento e renderização de elementos individuais:
- **`index.html`**: Arquivo monolítico contendo a folha de estilos responsiva, a marcação HTML para HUDs (vida, pontuação, energia do especial e barra de vida do Boss), tags de áudio nativo e toda a programação lógica da cinemática espacial.
- **`assets/sounds/`**: Repositório de efeitos sonoros (disparos, explosões, power-ups, danos) e trilhas sonoras orquestradas de fundo.
- **`images/`**: Armazenamento opcional para texturas adicionais.

### Fluxo de Inicialização e Execução:
1. **Montagem do Cosmos**: A função `createStars` instancia proceduralmente estrelas divididas em 3 camadas de paralaxe (`star-layer1`, `star-layer2`, `star-layer3`) que se deslocam verticalmente com velocidades distintas para criar uma ilusão de profundidade 2.5D.
2. **Setup do Jogador e HUD**: O caça do jogador (um gráfico vetorial Inline SVG `#player`) é posicionado na base da tela, acompanhado pelas barras de status sincronizadas. A trilha sonora dramática de batalha (`bgmGame`) é carregada.
3. **Loop Principal (Game Loop)**: Inicia o loop de animação contínuo no navegador para processar cinemática, inputs, IA de inimigos e detecção de colisões.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo)**: Utiliza `requestAnimationFrame` para coordenar o frame rate. O loop principal recalcula a posição do jogador, atualiza a descida das estrelas do paralaxe, move projéteis normais e inimigos, controla recarga de tiros e renderiza explosões a cada frame.
- **Event-Driven (Programação Dirigida a Eventos)**: Controla a movimentação lateral e os disparos ouvindo eventos de teclado (`keydown` e `keyup`) para gerenciar buffers booleanos de estado (`isLeftPressed`, `isRightPressed`, `isFirePressed`, `isSpecialPressed`), permitindo inputs simultâneos e resposta de milissegundos sem travamento do navegador.
- **State Pattern (Padrão Estado - Sistema de Fases)**:
  - O fluxo do jogo progride por meio das variáveis `currentPhase` e `phaseProgress` contra os objetivos definidos em `phaseGoals`.
  - **Fases Ímpares**: Fases clássicas onde o jogador precisa eliminar uma cota fixa de naves inimigas normais e atiradoras (tipo 0, 1 e 2).
  - **Fases Pares (Boss Fight)**: A geração de inimigos comuns cessa e o Boss (`#boss`) é ativado, revelando sua própria barra de status (`#boss-hp-bar-container`). O Boss possui comportamento autônomo de movimentação lateral sinoidal, ataques múltiplos e invocação de minions de suporte (`summonedEnemies`).
- **Detecção de Colisão por AABB baseada em DOM**:
  - Como as entidades são elementos HTML posicionados de forma absoluta, as colisões físicas são resolvidas obtendo os retângulos delimitadores exatos na janela usando a API do navegador `element.getBoundingClientRect()` em relação às dimensões de contorno do `#game-container`.
- **Física de Projéteis Teleguiados (Homing Target)**:
  - Ao coletar o item teleguiado (`isHomingActive`), as balas normais adquirem a classe `.homing` e buscam ativamente no vetor de entidades o inimigo mais próximo. O algoritmo recalcula o rumo a cada frame calculando a distância euclidiana (`Math.hypot`) e o arco-tangente bidimensional (`Math.atan2`) em relação ao alvo para ajustar a velocidade vetorial linear (`speedX`, `speedY`).
- **Sistema de Partículas Procedurais**:
  - Quando um oponente ou jogador é atingido, faíscas geométricas coloridas (`createParticleBurst`) são criadas em posições relativas do container de jogo com ângulos senoidais/cossenoideais e dissipação por tempo (`@keyframes particleBurst`), gerando fagulhas que diminuem de opacidade.
- **Feedback de Impacto (Screen Shake & Invulnerabilidade)**:
  - **Terremoto visual**: Ao sofrer danos, o contêiner de jogo recebe a classe CSS `.shake` temporariamente para simular uma colisão de grande magnitude.
  - **Fase Invisível**: O jogador ganha invulnerabilidade piscante de 1.5s após ser atingido, protegendo-o de múltiplas colisões seguidas.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Inline SVG (Scalable Vector Graphics)**: Renderiza em tempo real o vetor vetorial da nave do jogador e do Boss, aplicando animações CSS como o propulsor de fogo pulsante (`@keyframes thrust`).
- **Web Audio API**: tags de áudio nativas com preload para mixagem e controle em tempo real da música ambiente e efeitos sonoros incidentais.

## 🔑 Funções e Estruturas Principais

- `gameLoop()`: Loop principal de animação e atualização física de elementos.
- `fireBullet()` / `activateSpecial()`: Controlam o comportamento de tiro padrão, teleguiado e rajadas triplas do tiro especial.
- `updateBullets()` / `updateEnemies()`: Atualizam as coordenadas cinemáticas das entidades e computam caminhos teleguiados.
- `checkCollisions()`: Core resolvedor de colisões retangulares do jogo (`getBoundingClientRect`).
- `createExplosion(x, y)` / `createParticleBurst(x, y)`: Spawnam animações de fumaça e faíscas nos vetores correspondentes.
- `playerTakeDamage(amount)`: Trata danos sofridos, efeitos de tremor de tela, HP HUD e morte do caça.
