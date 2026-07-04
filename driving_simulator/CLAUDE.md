# 📂 Arquitetura e Padrões - Simulador de Carro 3D

Um jogo de corrida em ambiente tridimensional onde o jogador disputa contra um carro controlado por Inteligência Artificial para ver quem coleta 30 moedas primeiro em um mapa aberto contendo obstáculos dinâmicos, como um trem em movimento circular.

## 🏗️ Arquitetura do Código

O jogo é implementado inteiramente em um arquivo monolítico de controle:
- **`index.html`**: Configura a interface visível por cima do cenário (HUD), importa o motor gráfico 3D Three.js e executa o Game Loop principal, cuidando da física do carro, algoritmos de comportamento da IA, colisões tridimensionais, geração de partículas e desenho do painel velocímetro 2D.

### Fluxo de Inicialização e Execução:
1. **Configuração da Cena 3D**: Criação do contexto de renderização WebGL (`THREE.WebGLRenderer`), câmera perspectiva (`THREE.PerspectiveCamera`), efeitos de neblina (`THREE.Fog`) e iluminação direcional projetora de sombras.
2. **Construção do Cenário**: Geração procedimental de elementos estáticos (montanhas, árvores, nuvens, estrada reta central) e a via férrea circular.
3. **Instanciação dos Veículos e Elementos Dinâmicos**: O carro do jogador (azul), o carro da IA (vermelho), o trem e as moedas (`coins`) tridimensionais.
4. **Disparo do Game Loop**: Ativação do loop contínuo de renderização por quadros que atualiza as coordenadas e verifica estados de vitória/derrota.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo)**: Utiliza a API `requestAnimationFrame(animate)` para conduzir a simulação em tempo real, atualizando a cinemática física dos carros, a órbita do trem, a detecção de colisões, o acompanhamento dinâmico da câmera e a renderização da cena 3D a cada quadro.
- **Event-Driven (Programação Dirigida a Eventos)**: Escuta eventos de input do teclado nativos (`keydown` e `keyup`), mapeando o estado de pressionamento das teclas direcionais ou W/A/S/D no mapa global `keys`. Pressionar `Espaço` é associado ao reinício e início de novos jogos.
- **State Pattern (Padrão Estado)**: A variável global `gameState` gerencia as transições lógicas da aplicação:
  - **Não Iniciado / Pausado**: Mostra overlay com mensagem `#message` e congela movimentos.
  - **Jogando**: Oculta mensagens, processa físicas e inputs de corrida.
  - **Fim de Jogo**: Detecta se algum competidor alcançou a constante `MAX_SCORE = 30`, congela as físicas e exibe a mensagem de vencedor.
- **Steering Behavior / Inteligência Artificial Baseada em Alvos**: O carro controlado pela IA calcula a distância euclidiana para todas as moedas ativas na tela, define a moeda mais próxima como alvo (`gameState.aiTarget`) e rotaciona sua direção gradativamente em direção ao vetor da moeda usando cálculos trigonométricos (`Math.atan2`).
- **Física de Movimento e Colisões (Distância Euclidiana)**:
  - **Cinemática**: Aceleração linear com atrito simplificado (decaimento de velocidade multiplicando por `0.95` ao soltar aceleradores). O deslocamento é calculado decompondo vetores angulares: `position.x += Math.sin(rotation.y) * speed`.
  - **Colisão**: Usa a distância euclidiana tridimensional (`THREE.Vector3.distanceTo`) para detectar colisões entre os carros e as moedas/trem.
- **Sistema de Partículas (Explosão)**: Ao colidir com o trem, o veículo sofre uma explosão visual gerada pela função `explode`, que cria pequenas esferas laranjas temporárias com vetores de velocidade tridimensionais aleatórios, sendo removidas do cenário após 500 milissegundos.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Three.js (r128)**: Biblioteca JavaScript de alto nível para renderização WebGL 3D, sombras, neblina, câmeras e malhas geométricas (`BoxGeometry`, `CylinderGeometry`, `TorusGeometry`, etc.).
- **HTML5 Canvas 2D API**: Utilizado em um canvas separado para desenhar em tempo real os ponteiros, marcas, textos e a moldura circular do velocímetro (`#speedometer`).

## 🔑 Funções e Estruturas Principais

- `animate()`: Core do Game Loop que processa física do jogador, lógica de perseguição de moedas da IA, translação do trem, movimento de câmera orbital traseira (`camera.lookAt`) e invoca o renderer.
- `createCar(color)`: Construtor que agrupa a malha 3D composta do chassis, capota e rodas do carro em um grupo de transformação (`THREE.Group`).
- `checkCollision(obj1, obj2, distance)`: Retorna um booleano validando a proximidade linear entre dois objetos com base no limite estipulado.
- `drawSpeedometer(speed)`: Limpa e desenha o velocímetro na tela do jogador com ponteiro vermelho e marcador em km/h baseado no canvas 2D.
- `resetGame()`: Reinicializa as variáveis de controle, reposiciona os carros em seus spawns iniciais, remove moedas antigas do cenário e distribui novas de forma espalhada pelo mapa.
