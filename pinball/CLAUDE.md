# 📂 Arquitetura e Padrões - Enhanced Pinball

Um jogo clássico de pinball aprimorado com efeitos visuais avançados, física de colisão vetorial elástica, controle de flippers rotacionais baseados em pivô e multiplicadores dinâmicos de pontuação.

## 🏗️ Arquitetura do Código

O jogo é implementado em um único arquivo de interface e motor físico:
- **`index.html`**: Define o estilo visual escuro com tema neon dourado, o container HTML5 Canvas (`#gameCanvas`) e o código completo do simulador físico, incluindo gravidade, detecção elástica contra segmentos de reta e círculos, sistema de partículas e o game loop.

### Fluxo de Inicialização e Execução:
1. **Configuração do Canvas**: Criação do contexto de desenho bidimensional (`ctx`) com gradientes suaves na mesa de pinball para simular relevo tridimensional.
2. **Definição de Parâmetros Físicos**: Inicialização da bola (`ball`), das propriedades de rigidez e alongamento da mola do lançador (`launcher`), dos flippers esquerdo e direito e das tabelas de colisões.
3. **Loop Principal (Game Loop)**: Executa frames contínuos para processar a gravidade, fricção, rotações angulares dos flippers e reflexões físicas da bola.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo)**: Coordena o avanço físico e visual do jogo a cada quadro, aplicando gravidade (`GRAVITY = 0.2`) e atrito do ar (`FRICTION = 0.995`), integrando as equações de velocidade e atualizando o renderizador (`requestAnimationFrame`).
- **Event-Driven (Programação Dirigida a Eventos)**: Controla de maneira reativa o acionamento de inputs pelo teclado nos estados `keydown` e `keyup`:
  - `Espaço`: Traciona a mola do lançador (`launcher.charging`).
  - `ArrowLeft` / `Z`: Ativa o flipper esquerdo (`leftFlipper.isActivating = true`).
  - `ArrowRight` / `/`: Ativa o flipper direito (`rightFlipper.isActivating = true`).
  - `Enter`: Reinicia a partida quando o jogador perde todas as vidas.
- **State Pattern (Padrão Estado)**: Modula as fases lógicas através de variáveis como `gameActive` (se a partida está rodando) e `gameStarted` (se a bola foi efetivamente posta em jogo no duto do lançador). Controla vidas (`lives = 3`) e o multiplicador ativo (`currentMultiplier`), que é zerado ao cair no duto de perigo inferior.
- **Detecção de Colisão e Reflexão Vetorial (Physics & Collision)**:
  - **Paredes Lineares**: A colisão é baseada na busca pelo ponto mais próximo em um segmento de reta (`closestPointOnSegment`), seguida por uma reflexão vetorial de velocidade elástica com amortecimento de restituição (`reflectVelocity`).
  - **Bumpers Circulares**: A colisão é resolvida calculando a soma dos raios dos círculos. Ao bater, a bola sofre aceleração baseada no coeficiente `BUMPER_BOUNCE = 1.05`, e gera fagulhas coloridas correspondentes ao bumper.
  - **Flipped Pivots (Oriented Bounding Box)**: Os flippers são tratados como retângulos rotacionados em torno de um pivô (`pivotX`, `pivotY`). A colisão calcula as posições dos quatro vértices rotacionados (`currentAngle`) em tempo de execução para computar a força adicional transmitida à bola (`FLIPPER_STRENGTH`).
- **Sistema de Partículas (Visual Effects)**: Gera partículas em posições de impacto (`createParticles`) com fator de dissipação (`decay`) e redução de tamanho a cada frame, criando fagulhas em colisões fortes.
- **Anti-Stuck (Segurança de Jogo)**: Utiliza as variáveis `ballStuckTimer` e `STUCK_VELOCITY_THRESHOLD` para identificar se a bola ficou travada em alguma dobra do cenário, efetuando o reset automático e seguro da bola de volta ao lançador caso o temporizador exceda 6 segundos.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Responsável pelo desenho procedural dos bumpers neon, paredes, molas mecânicas realistas com compressão de espiras, indicadores visuais de potência e a bola metálica com sombreamento reflexivo radial.

## 🔑 Funções e Estruturas Principais

- `resetBall()`: Reposiciona a bola no lançador inicial e restaura o multiplicador ativo para `1x`.
- `checkBallStuckOrOutOfBounds(deltaTime)`: Verifica continuamente se a velocidade linear está próxima de zero para destravar a bola de forma automatizada.
- `closestPointOnSegment(px, py, x1, y1, x2, y2)`: Algoritmo que calcula as projeções vetoriais projetando a bola sobre as superfícies limitadoras.
- `reflectVelocity(vx, vy, normalX, normalY)`: Executa a reflexão elástica de um vetor de velocidade bidimensional diante de uma normal de impacto.
- `checkFlipperCollisions()`: Avalia o contato entre a bola e os retângulos dos flippers rotacionados nos pivôs.
- `createParticles(x, y, count, color)`: Spawna novas partículas no vetor de colisão com cores customizadas para efeitos de faísca.
