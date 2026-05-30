# 📂 Arquitetura e Padrões - Voxel City Delivery

Um jogo de simulação e entrega tridimensional estilizado em arte Voxel, implementado sob a biblioteca Three.js (WebGL). O jogador explora uma cidade procedural a pé ou dirigindo veículos, localiza pedestres, coleta mercadorias e efetua entregas contra o relógio, sob efeito de ciclo dia/noite e iluminação inteligente.

## 🏗️ Arquitetura do Código

O projeto adota uma arquitetura orientada a componentes tridimensionais integrados a um arquivo único modular (`index.html`) que subdivide a lógica de física de colisões, controle cinemático do trânsito, simulação de pedestres e radar 2D.

- **Estrutura de Arquivos**:
  - `index.html`: Contém todos os estilos, marcação HTML de HUD e telas de transição, importação canônica do Three.js (r160) e a lógica de execução.

- **Fluxo de Inicialização e Execução**:
  1. A página executa a classe mestre `Game` ao carregar (`window.onload`).
  2. Inicializa o renderizador WebGL com sombras ativas (`PCFSoftShadowMap`), câmera de perspectiva e neblina volumétrica (`THREE.Fog`).
  3. A classe `World` gera programaticamente o solo da cidade, os prédios volumétricos coloridos e a malha de postes públicos de iluminação.
  4. São instanciadas a classe de controle físico `Player`, a simulação de tráfego de veículos `TrafficSystem`, 40 transeuntes autônomos `Pedestrian`, a lógica de objetivos `MissionManager` e a tela de radar do minimapa `HUD`.
  5. Dispara-se o loop principal `animate()`, que computa a contagem de tempo delta do relógio (`THREE.Clock`), atualiza a cinemática de cada entidade e renderiza a cena tridimensional.
  6. O jogo se encerra após a regressão de 5 minutos, exibindo a tela de Game Over e o score final.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Laço de Animação com Delta Time)**: Rodado via `requestAnimationFrame(animate)` utilizando `THREE.Clock.getDelta()` para sincronizar os deslocamentos espaciais e a transição astronômica independentemente da taxa de atualização do processador.
- **AABB 3D Collision (Resolução de Colisão por Limites Geométricos)**: A classe `World` armazena a estrutura espacial dos edifícios usando caixas delimitadoras tridimensionais alinhadas aos eixos (`THREE.Box3`). O método `checkCollision(position)` expande as caixas no tamanho do raio do avatar e valida de forma estrita o avanço das entidades, impedindo a sobreposição de malhas com edifícios.
- **Dynamic Vehicle Hijack (Entrada e Saída Dinâmica de Veículos)**: Um padrão de estado que permite ao jogador alternar entre os modos a pé (velocidade 10) e motorizado (velocidade 40) ao pressionar a tecla `SPACE` próximo a qualquer carro do trânsito:
  - **A Pé**: O avatar do jogador (`Player.mesh`) fica visível e colide contra edifícios.
  - **Em Veículo**: O avatar é ocultado e acoplado ao veículo (`state.inCar = true`), a câmera orbita o carro selecionado (`state.currentCar`), e os comandos direcionais operam a aceleração, frenagem e rotação (`yaw`) física do próprio carro no tráfego.
- **Ciclo Dinâmico de Luz e Sombra (Day/Night Orbit)**: A luz solar simula uma transição astronômica senoidal no eixo espacial Y. Na fase noturna, o céu escurece para `0x0a1428`, a neblina se fecha, e os postes e faróis de veículos acendem via `setNightFactor`. Para otimização de renderização, a intensidade das luzes é ponderada pela proximidade posicional da câmera do jogador.
- **Radar em Vetor de Bússola (Minimapa 2D)**: O radar renderiza a cidade no plano bidimensional a partir de um canvas secundário (`#minimap-canvas`). O minimapa translada as coordenadas globais de estradas e alvos, rotaciona os eixos verticais baseando-se no ângulo orbital do jogador (`ctx.rotate(this.player.yaw)`) e traça a seta central representando a direção norte do vetor do jogador.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Three.js (r160)**: Renderizador gráfico de geometrias volumétricas procedurais e iluminação por sombras suaves.
- **HTML5 Canvas 2D API**: Gerenciador do desenho de radar e rotas dinâmicas do minimapa.
- **Pointer Lock API**: Captura o ponteiro do cursor do mouse do usuário para rotacionar com precisão fluida os ângulos de yaw (olhar horizontal) e pitch (altura vertical) da câmera em órbita.

## 🔑 Funções e Estruturas Principais

- `World`: Gera o mapa municipal, estradas X e Z, edifícios procedurais HSL e as caixas `Box3` de obstáculo.
- `Car`: Classe dos carros do tráfego. Controla faróis cônicos (`SpotLight`) e traseiros, o movimento em trilhos lineares, e as frenagens de segurança antes de colidir na traseira de outro veículo ou violar sinal vermelho em cruzamentos.
- `TrafficSystem`: Spawna 50 carros autônomos e coordena a alteração periódica de 5 segundos de semáforos verdes e vermelhos nas interseções.
- `Pedestrian`: Executa rotinas Monte Carlo de movimentação, fazendo 40 pedestres caminharem de forma segura desviando de prédios até alvos aleatórios.
- `MissionManager`: Seleciona pedestres de origem e destino, orienta a rota do jogador com um cone indicador giratório de coloração mutável (Verde para coleta de pacote, Vermelho para destino de entrega) e contabiliza a pontuação por entrega (+10 pts).
- `HUD`: Renderiza o cronômetro decrescente e desenha a geometria vetorial de rotas e alvos no minimapa rotativo.
