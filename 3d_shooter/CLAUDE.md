# 📂 Arquitetura e Padrões - Retro Shooter (Doom-Style)

Mecanismo de jogo de tiro em primeira pessoa tridimensional retrô (Doom-like) utilizando raycasting, renderizado inteiramente com a API Canvas 2D nativa do HTML5, com suporte para inimigos controlados por IA simples, coleta de itens e áudio posicional.

## 🏗️ Arquitetura do Código

O jogo é estruturado inteiramente em uma página única que coordena tanto o layout de interface do usuário, estilos visuais, quanto a lógica complexa do motor e de renderização.

- **Estrutura de Arquivos**: 
  - `index.html`: Contém a estrutura do DOM, estilização da HUD/telas do menu, dados estáticos do mapa tridimensional, definições de entidades e todas as rotinas em JavaScript que executam o loop de jogo, detecção de colisões, raycasting e o sistema de áudio posicional.
  - `assets/`: Armazena arquivos de som em formato `.mp3` para as armas (`Pistola22cal.mp3`, `Shotgun2.mp3`) e de inimigos (`Trol.mp3`).

- **Fluxo de Inicialização e Execução**:
  1. O DOM é carregado e inicializa elementos HTML (Canvas, Overlays para tela inicial, pausa, fim de jogo).
  2. `setupInputHandlers()` é invocado para escutar eventos de teclado (`keydown`, `keyup`), cliques do mouse (`mousedown`, `mouseup`), rotação via `mousemove` capturada com `Pointer Lock API`.
  3. Ao clicar no botão "BEGIN CARNAGE", chama-se `startGame()` que inicia a execução e ativa o áudio.
  4. `initializeGame()` limpa estados passados, inicializa o objeto do jogador (`player`), inimigos (`enemies`), reconstrói o mapa de jogo, limpa partículas, e executa a primeira chamada de `gameLoop()`.
  5. O loop do jogo então executa ciclicamente realizando o rastreamento do tempo decorrido (`deltaTime`) para manter a física independente do frame-rate.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo)**: Coordenação contínua através de `requestAnimationFrame(gameLoop)`. Calcula o `deltaTime` para suavizar e sincronizar a movimentação de acordo com o desempenho real da máquina. O loop aciona `update(deltaTime)` para lógica de atualização física e `render()` para desenhar o mundo tridimensional.
- **State Pattern (Padrão Estado)**: Gerenciamento dos estados globais de fluxo do jogo (`gameStarted`, `isPaused`, `isGameOver`) sincronizado com transições visuais de classes CSS nas tags `.overlay` (como `#startScreen`, `#pauseScreen`, `#gameOverScreen`). As entidades do jogo possuem subestados próprios como `enemy.state` que transiciona entre `'idle'`, `'chase'`, `'attack'`, `'dying'` e `'dead'`.
- **Event-Driven (Programação Dirigida a Eventos)**: Processamento assíncrono de interações humanas de periféricos através de ouvintes DOM em `'keydown'`, `'keyup'`, `'mousedown'`, `'mouseup'` e `'mousemove'`. A rotação de câmera é atrelada diretamente ao movimento do mouse capturado pela Pointer Lock API (`canvas.requestPointerLock()`).
- **Engine Raycasting / Colisão (AABB Adaptada)**:
  - O desenho tridimensional 3D é simulado por meio de raycasting por coluna (eixo X da tela), projetando raios a partir de `player.x`/`player.y` com ângulos definidos por `FOV`. A rotina `castRay()` encontra a interseção mais próxima com as paredes definidas em `mapData`.
  - A colisão física do jogador com as paredes do mapa de grade 2D é processada de maneira separada para os eixos X e Y em `processInput()`, mantendo um raio de colisão (`collisionRadius = 0.2`) para evitar transpassar paredes (deslizando suavemente ao longo delas). O mesmo se aplica aos inimigos no método `moveEnemy()`.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Responsável por desenhar pixel-a-pixel a perspectiva 3D, céu, chão com gradientes e a rasterização de sprites 2D simulados como billboards 3D (inimigos e itens), ordenados por profundidade através de uma matriz de Z-Buffer (`zBuffer`).
- **Web Audio API**: Motor de áudio de baixo nível com controle posicional estéreo 3D utilizando as classes nativas `AudioContext`, `StereoPannerNode` e `GainNode` para atenuação de volume baseada em distância física euclidiana e balanço de canal (pan esquerdo/direito) de acordo com o ângulo relativo do jogador em relação à fonte de ruído (`updatePositionalSound()`).
- **Pointer Lock API**: Utilizada para prender o cursor do mouse ao canvas possibilitando rotação irrestrita da visão em primeira pessoa a partir de deltas puros (`e.movementX`).

## 🔑 Funções e Estruturas Principais

- `initializeGame()`: Reinicia o mapa de jogo, configura os status de saúde/munição do jogador e cria a matriz inicial de instâncias de inimigos copiando atributos base da tabela `enemyTypes`.
- `gameLoop(timestamp)`: Ciclo mestre que calcula o `deltaTime`, executa `update(dt)` e `render()`.
- `update(dt)`: Encaminha as atualizações físicas delegando para `updatePlayer()`, `updateEnemies()`, `updatePickups()`, `updateParticles()` e `updateEnemySounds()`.
- `castRay(startX, startY, angle)`: Lógica principal do algoritmo DDA (Digital Differential Analysis) para rastrear os raios na grade 2D, retornando a distância perpendicular à parede para evitar o efeito olho de peixe.
- `render()`: Efetua a limpeza de quadro, recarrega o Z-buffer, desenha o céu e chão com gradientes dinâmicos (`renderBackgroundAndFloor`), renderiza as fatias verticais das paredes projetadas e desenha os sprites ordenados por distância (`renderSprites` ou `renderSpritesSimple` no modo otimizado).
- `playSound(name, volume, playbackRate, sourcePos, loop)`: Invoca a reprodução de um áudio espacializado, acoplando nós de ganho e panning dinâmicos ao mixer master.
