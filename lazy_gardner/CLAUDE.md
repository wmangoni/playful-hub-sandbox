# 📂 Arquitetura e Padrões - Lazy Gardener (Jardim Zen)

Um simulador tridimensional (3D) relaxante estilo "Jardim Zen", no qual o jogador pode cultivar diferentes espécies de plantas e colher frutos. O jogo é construído sob a biblioteca Three.js (WebGL), integrando sistemas dinâmicos de passagem de tempo (dia/noite) e transição de climas (chuva/sol) que afetam diretamente o ecossistema.

## 🏗️ Arquitetura do Código

A aplicação utiliza uma abordagem moderna de importação de módulos ESM (import maps) nativa dos navegadores, organizando os estilos visuais de tela cheia, os canais de áudio nativos e a lógica de simulação em um único arquivo estruturado.

- **Estrutura de Arquivos**:
  - `index.html`: Centraliza elementos HTML (Canvas e painel da UI), declarações de áudio (`#ambientSoundDay`, `#ambientSoundNight`, `#rainSound`, `#notificationSound`), folhas de estilo CSS e todo o código modular em JavaScript.
  - `assets/`: Armazena os áudios ambientes de pássaros, chuva, noite e melodias de aviso (`birds-forest-spring.mp3`, `night-ambience.mp3`, `rain.mp3` e `notification.mp3`).

- **Fluxo de Inicialização e Execução**:
  1. O navegador processa a tag `<script type="importmap">` para resolver os mapeamentos da biblioteca externa Three.js de maneira canônica.
  2. Ao carregar a página, a rotina `init()` cria o container da cena (`scene`), câmera de perspectiva (`camera`), renderizador WebGL com mapeamento de tom de cor fílmico e sombras ativas (`renderer`).
  3. São adicionados à cena luzes direcionais/ambiente, o plano de solo (`ground`), a cúpula celeste (`sky`) e nuvens volumétricas criadas de forma procedural (`clouds`).
  4. O laço de animação `animate()` é disparado gerando frames a partir do relógio interno (`clock`).
  5. Interações do jogador são ouvidas na função `onPointerDown(event)` que faz a projeção de raios (raycasting) para detectar a posição de plantio ou toque sobre flores maduras.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo 3D)**: Executado de forma contínua através do método `requestAnimationFrame(animate)`. A cada iteração calcula-se o tempo decorrido com `clock.getDelta()` (`deltaTime`), que propaga as atualizações necessárias de estados:
  - Crescimento físico de vegetações (`updatePlantGrowth`).
  - Rolagem e transição de climas (`updateWeather`).
  - Ciclo astronômico da luz solar (`updateTimeOfDay`).
  - Deslocamento de nuvens volumétricas (`updateClouds`).
  - Voo aleatório e suave de vagalumes noturnos (`updateButterflies`).
  - Renderização final da perspectiva 3D na câmera.
- **State Pattern (Padrão Estado)**: Controle de estados geofísicos através das variáveis `simulatedWeather` (`'sunny'`, `'rainy'`) e `timeOfDay` (`'day'`, `'evening'`, `'night'`). O jogo transiciona dinamicamente as cores e iluminações da atmosfera na rotina `updateSkyColor()`. O ecossistema responde alterando os tempos de crescimento (`getGrowthDuration`) e habilitando/desabilitando spawns de vagalumes.
- **Event-Driven (Programação Dirigida a Eventos)**: Interações baseadas em eventos `'resize'` do navegador e cliques ou toques móveis mapeados em `'pointerdown'`.
- **Engine Raycasting / Colisão 3D**: Implementa a classe nativa `THREE.Raycaster` para mapear toques tridimensionais. O vetor 2D normalizado da tela é transformado em um raio de profundidade 3D:
  - Interseções com o solo (`ground`) definem o ponto vetorial exato para plantar sementes com `plantSeed()`.
  - Interseções com malhas de plantas ativas disparam a rotina de colheita ou tocam notas de áudio suave baseando-se no dicionário `userData`.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Three.js (r160)**: Renderizador WebGL nativo de alto desempenho utilizado para geometria procedural de árvores, arbustos, lótus e nuvens através de grupos de malhas agrupadas (`THREE.Group`), materiais com suavização física (`MeshStandardMaterial`), sombras dinâmicas e tonemapping fílmico.
- **Web Audio (HTML5 Audio Control)**: Gerenciamento e crossfading programático de múltiplos canais de som de fundo com base no clima e na hora da simulação.

## 🔑 Funções e Estruturas Principais

- `init()`: Constrói o universo virtual 3D, luzes principais/preenchimento e registra ouvintes do teclado e mouse.
- `plantSeed(position, type)`: Instancia um dicionário de propriedades físicas para a planta (incluindo tipo, estágio inicial de crescimento, fator de tamanho aleatório `sizeVariation` e cor da flor `bloomColor`) e adiciona a malha 3D correspondente na cena.
- `createPlantMesh(plantData)`: Método procedural que projeta malhas dinâmicas usando cilindros para troncos, esferas para copas e cones para folhagens de acordo com a espécie e estágio de crescimento (`seed`, `sapling`, `foliage`, `bloom`, etc.).
- `updatePlantGrowth(deltaTime)`: Monitora se o tempo de vida da planta ultrapassou os tempos limites de estágio (`growthTimes`), substituindo proceduralmente a malha da cena pelo próximo estágio visual.
- `updateTimeOfDay(deltaTime)`: Translada a luz direcional em um semicírculo simétrico simulando o movimento da órbita do sol/lua. Controla os estados de luz e transiciona a intensidade de brilho emissivo das flores de lótus (`emissiveIntensity`).
- `updateSkyColor()`: Executa transições de cores e interpolações lineares (`THREE.Color.lerp`) para suavizar o visual da atmosfera sob efeito do ciclo solar ou da chuva.
- `updateAudio()`: Controla a ativação e volume dos loops de som de pássaros, chuva e ruído noturno.
