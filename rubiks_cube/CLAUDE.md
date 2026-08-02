# 📂 Arquitetura e Padrões - HTML Rubik's Cube

Um simulador interativo de Cubo Mágico (Cubo de Rubik 3x3x3) tridimensional completo com suporte a rotação por arrasto de mouse reativo (Raycasting), atalhos de notação internacional por teclado, rotação suave interpolada (Tweens) e embaralhamento procedural.

## 🏗️ Arquitetura do Código

O projeto está estruturado em um único arquivo de visualização e controle tridimensional:
- **`index.html`**: Cria a interface responsiva da aplicação, importa os scripts do motor gráfico 3D Three.js, a biblioteca Tween.js e a extensão OrbitControls, além de conter a lógica matemática e física para decomposição de vetores e manipulação estrutural das camadas do cubo.

### Fluxo de Inicialização e Execução:
1. **Configuração do WebGL**: Inicialização do renderizador 3D com antialias, da câmera perspectiva (`THREE.PerspectiveCamera`), iluminação ambiente/direcional e controles de órbita do usuário.
2. **Construção do Cubo Mágico**: A função `createCube` instancia 26 cubinhos externos (`Mesh` geométricos individuais de tamanho `CUBIE_SIZE = 1` com espaçamento `CUBIE_SPACING = 0.05`), aplicando cores específicas para cada face tridimensional (+X: verde, -X: azul, +Y: branco, -Y: amarelo, +Z: vermelho, -Z: laranja) e as faces internas ocultas em cinza escuro (`innerColor = 0x1a1a1a`).
3. **Escuta de Inputs e Game Loop**: Registro dos listeners de mouse e teclado para processamento do raycasting e início do loop de atualização (`TWEEN.update` e `controls.update`).

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo)**: O método `animate` gerencia o ciclo contínuo de quadros utilizando `requestAnimationFrame`. Ele atualiza a interpolação suave de rotação (TWEEN), o amortecimento inercial da câmera (`controls.enableDamping = true`) e redesenha a cena.
- **Event-Driven (Programação Dirigida a Eventos)**: Controla de maneira estrita a rotação das fatias e o controle orbital por meio de eventos clássicos do DOM:
  - Botão esquerdo do mouse + Arrastar: Dispara a rotação dinâmica da face selecionada.
  - Botão direito / scroll do mouse + Arrastar: Orbita a câmera ao redor do cubo.
  - Botões de interface (`scrambleBtn` e `resetBtn`): Processam embaralhamento e reset.
  - Keydown: Captura teclas de atalhos (U, D, L, R, F, B) com suporte a sentido reverso usando `Shift`.
- **Raycasting e Interação no Espaço 3D**:
  - **Detecção**: O sistema usa `THREE.Raycaster` com as coordenadas projetadas do mouse para descobrir qual dos 26 cubinhos (`cubie`) foi clicado e em qual de suas faces externas.
  - **Vetores de Rotação por Arraste**: No evento `onMouseUp`, o vetor de arrasto tridimensional (`dragVectorWorld`) é projetado no plano da face clicada (`projectOnPlane`). O produto vetorial (`THREE.Vector3.crossVectors`) entre a normal da face e o vetor de arraste projetado define o eixo exato de rotação física (`rotationAxis`) alinhado aos eixos globais.
- **Dynamic Pivot / Transição de Escopo de Transformação (State)**:
  - Para girar uma fatia de forma realista, os cubinhos correspondentes são temporariamente desvinculados do grupo global e atrelados (`pivot.attach(cubie)`) a um objeto pivô (`THREE.Group`) temporário posicionado na coordenada central da camada.
  - O pivô é rotacionado em 90 graus via Tween e, ao concluir, os cubinhos são devolvidos ao grupo do cubo (`cubeGroup.attach(cubie)`).
  - **Arredondamento e Alinhamento**: A função `snapCubieToGrid` limpa imprecisões decimais acumuladas de ponto flutuante arredondando as coordenadas espaciais após os movimentos.
- **Queue Pattern (Fila de Movimentos)**: O algoritmo de embaralhamento (`scrambleCube`) gera 25 jogadas randômicas de faces e eixos e as empilha em uma fila global (`moveQueue`). A função `processMoveQueue` desempilha e processa esses movimentos de forma assíncrona, aguardando a finalização da interpolação de cada giro para disparar o seguinte.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Three.js (r128)**: Motor 3D de alta performance usado para malhas, câmeras, raycasting e materiais padrão (`MeshStandardMaterial`).
- **Tween.js (18.6.4)**: Responsável pelas transições dinâmicas de rotação angulares usando atenuação cúbica (`TWEEN.Easing.Cubic.Out`).
- **THREE.OrbitControls**: Plugin para navegação e translação orbital intuitiva da câmera.

## 🔑 Funções e Estruturas Principais

- `createCube()`: Instancia os cubinhos calculando offsets de posição e aplicando materiais coloridos nas faces externas expostas.
- `onMouseDown(event)` / `onMouseUp(event)`: Capturam as coordenadas e o estado do clique, calculando os vetores direcionais do arraste do usuário.
- `determineMouseRotation(dragVectorWorld, intersectionData)`: Resolve a física tridimensional de qual camada e sentido de giro devem ser aplicados.
- `rotateLayer(cubiesToRotate, axis, angle)`: Executa a animação de rotação acoplando os cubos a um pivô temporário e rotacionando-o com Tween.
- `snapCubieToGrid(cubie)`: Arredonda a posição global dos cubos ao final do movimento para reajuste estrito no grid.
- `scrambleCube()` / `processMoveQueue()`: Preenchem e gerenciam a execução sequencial assíncrona da fila de movimentos de embaralhamento.
