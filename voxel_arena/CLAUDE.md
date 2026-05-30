# 📂 Arquitetura e Padrões - Voxel Arena

Um jogo 3D de ação e sobrevivência em arena (Voxel-Art Hack 'n' Slash) com câmera orbital livre (Pointer Lock API), inimigos procedurais com Inteligência Artificial perseguidora, combate direcional baseado em cone de visão, habilidades especiais com cooldowns visuais e sistema de drops flutuantes.

## 🏗️ Arquitetura do Código

O jogo é desenvolvido como um módulo ES6 modular centralizado em um único arquivo:
- **`index.html`**: Carrega a estrutura de interfaces de HUD (sobreposição de paralelogramo para vida, stamina e XP) e slots de skills com gradiente de cooldown cônico, além de importar o motor gráfico 3D Three.js e implementar toda a estrutura de física vetorial, inputs tridimensionais, geração procedural de barreiras e o game loop.

### Fluxo de Inicialização e Execução:
1. **Configuração da Tela e Pointer Lock**: Ao clicar em "Enter Arena" (`#start-btn`), o jogo solicita a trava do cursor do mouse (`requestPointerLock`) para habilitar rotação orbital livre 360 e oculta a tela de introdução.
2. **Setup do Universo 3D WebGL**: Instanciação da cena, câmera perspectiva de terceira pessoa e renderizador WebGL com sombras ativas (`renderer.shadowMap.enabled = true`).
3. **Construção da Arena**: O construtor `Arena` monta o piso verde texturizado (`PlaneGeometry`), adiciona um helper de grade para referência espacial, gera quatro paredes limite sólidas e espalha proceduralmente 20 árvores cúbicas voxel e 15 rochas dodecaédricas com escala pseudo-aleatória.
4. **Instanciação do Jogador e Inimigos**: O jogador (montado inteiramente com blocos voxel 3D acoplados) é posicionado no centro e o `EnemyManager` começa a coordenar o spawn contínuo de ondas.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (WebGL Render Loop)**: Método `animate` executado via `requestAnimationFrame`. Ele calcula o tempo decorrido (`delta time`), atualiza o estado de inputs dinâmicos, rotaciona os itens flutuantes, move os inimigos em direção ao jogador, executa interpolações de ataque e desenha os gráficos WebGL.
- **Event-Driven (Programação Dirigida a Eventos)**: Controla a cinemática de inputs registrando listeners no DOM para `keydown`/`keyup`, cliques de mouse (`mousedown`/`mouseup`), rotações (`mousemove` coletando `movementX`/`movementY`) e scroll da roda do mouse (`wheel`) para controle de aproximação do zoom da câmera orbital.
- **State Pattern (Padrão Estado)**: A tela de transição `#game-over-screen` congela o loop de renderização física e abre opções de escolha de bônus incidentais (`bonus-selection`) que alteram os multiplicadores do herói antes de permitir o recarregamento rápido da arena.
- **Voxel Character Composition (Design Estrutural)**:
  - O jogador e inimigos são construídos de forma procedural agrupando malhas cúbicas (`THREE.BoxGeometry`) em um grupo pivotado (`THREE.Group`) simulando cabeça, olhos, capacete, corpo, braços articulados e pernas.
  - A espada é indexada diretamente como filho da malha do braço direito (`rightArm.add(sword)`). Durante ataques, um temporizador interpola suavemente a rotação local do braço (`rightArm.rotation.x`) usando a função LERP (`THREE.MathUtils.lerp`) com atenuação senoidal.
- **Cone-Based Collision & Combat Physics**:
  - **Dano direcional**: O ataque com o botão esquerdo não atinge todos ao redor. Ele calcula a projeção do vetor para frente da câmera (`playerFwd` rotacionando a coordenada padrão `(0, 0, -1)` pelo ângulo yaw do mouse). Ao testar impacto (`checkHit`), o sistema calcula a distância euclidiana e o produto escalar entre o vetor de visão e a direção do inimigo. O golpe é validado apenas se o inimigo estiver no alcance e dentro de um cone de visão frontal de 60 graus (`Math.PI / 3`).
- **Mecânicas de Habilidades Complexas (Active Skills)**:
  - `Spin (1)`: Efetua ataque circular 360 em área com alcance estendido, instanciando visualmente um disco dourado translúcido (`RingGeometry`).
  - `Dash (2)`: Multiplica temporariamente o vetor frontal translacionando a malha do herói no espaço instantaneamente.
  - `Heal (3)`: Restaura regeneração imediata de pontos de vida.
  - `Ultimate (4)`: Libera dano massivo em raio extremo, materializando uma cúpula de energia roxa translúcida em formato wireframe (`SphereGeometry`).
- **Inteligência Artificial Perseguidora**: A classe `Enemy` rastreia continuamente a posição do herói no espaço de coordenadas tridimensionais, anulando a variação Y para deslizar horizontalmente e calculando a rotação de faceamento (`mesh.lookAt(playerPos)`).

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Three.js (0.160.0)**: Motor WebGL de alta performance responsável por toda a infraestrutura matemática, renderização de luzes direcionais que projetam sombras dinâmicas (`castShadow`), geometrias voxel e materiais realistas (`MeshStandardMaterial`).
- **Pointer Lock API**: API nativa do navegador para captura completa do ponteiro do mouse, essencial para controles de visão e giro de jogos arcades e primeira/terceira pessoa.

## 🔑 Funções e Estruturas Principais

- `Input.resetFrame()`: Limpa os deltas de rotação do mouse a cada frame para evitar giros infinitos.
- `Player.update(dt, input)`: Desloca o jogador considerando a yaw da câmera orbital e orienta a malha na direção do caminhar.
- `Enemy.update(dt, playerPos)`: Conduz o rastreamento cinemático dos inimigos e executa ataques físicos de proximidade a menos de 2.5 unidades de distância.
- `EnemyManager.checkHit(...)`: Executa varreduras angulares e espaciais determinando colisões e aplicando danos aos oponentes.
- `Item.createMesh()`: Inicializa itens com comportamento senoidal que levitam acima do piso da arena.
