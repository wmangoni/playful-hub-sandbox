# 📂 Arquitetura e Padrões - Tabuleiro de Galton

Uma simulação física e estatística bidimensional interativa do Tabuleiro de Galton (Bean Machine), projetada para ilustrar visualmente o Teorema Central do Limite e a convergência de caminhos aleatórios para uma Distribuição Normal (Gaussiana).

## 🏗️ Arquitetura do Código

O projeto é estruturado em um único arquivo indexado (`index.html`) que integra estilos de visual dark neon, painel de controle interativo, canvas e a simulação física das bolinhas em JavaScript.

- **Estrutura de Arquivos**:
  - `index.html`: Arquivo centralizado contendo o canvas HTML5, controles de parâmetros da simulação (Layout, Velocidade, Disparadores) e o motor físico-matemático.

- **Fluxo de Inicialização e Execução**:
  1. A simulação inicia com a chamada de `setup()`, que zera o estado das bolinhas, histograma e gera os pinos (`pegs`) baseando-se no layout selecionado (`triangle` ou `grid`).
  2. São inicializados os bins de coleta (`bins`) na base inferior do Canvas.
  3. O loop principal `gameLoop()` é acionado recursivamente a cada quadro via `requestAnimationFrame`.
  4. O jogador clica em "Adicionar 1" ou "Adicionar 10", disparando a rotina `createBall()` que spawna partículas com velocidade horizontal levemente oscilatória no topo central do tabuleiro.
  5. As partículas caem sob efeito de gravidade, chocam-se com os pinos e se acumulam nos bins coletores na parte inferior, gerando o gráfico do histograma.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo com Escala de Tempo)**: A animação contínua utiliza `requestAnimationFrame(gameLoop)` integrado a um cálculo de tempo decorrido delta (`effectiveDt = dt * simulationSpeed`). O jogador pode estender ou contrair a escala temporal de física via slider (`simulationSpeed`).
- **Motor de Física Vetorial e Colisão de Círculos (AABB/Euclidiana)**: A engine calcula a cinemática e as colisões em tempo real nas atualizações físicas (`update`):
  - **Aceleração por Gravidade**: `ball.vy += gravity * effectiveDt`.
  - **Colisão Circular Rígida**: Para cada bola em relação aos pinos circulares, calcula-se a distância euclidiana com Pitágoras. Se houver sobreposição (`distance < minDistance`), calcula-se o vetor unitário normal da colisão (`nx = dx/distance`, `ny = dy/distance`), aplica-se o impulso de reflexão com o coeficiente de restituição (`restitution = 0.6`) e desloca-se a partícula em `51%` do transpasse (`overlap`) para evitar penetração de malha física.
  - **Dispersão por Ruído Aleatório**: Aplica-se `horizontalRandomness` no choque dos pinos para maximizar a entropia e assegurar a bifurcação.
- **State Pattern (Padrão Estado)**: Mudanças no seletor de layout reconfiguram instantaneamente as estruturas e malhas de pinos no tabuleiro chamando `setup()`.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Responsável por limpar a tela a cada frame, renderizar os coletores, desenhar as partículas físicas e traçar o histograma.
- **Efeitos de Glow / Brilho Neon (Canvas Rendering Context 2D)**: Aplicação de brilho estilizado Dark Neon em tempo real utilizando propriedades nativas do contexto do Canvas:
  - `ctx.shadowBlur = 8;`
  - `ctx.shadowColor = '#00ccff';`

## 🔑 Funções e Estruturas Principais

- `setup()`: Limpa o tabuleiro de dados antigos, lê o estado do layout selecionado e preenche a matriz `pegs` e a lista `bins` de coletores.
- `createBall()`: Adiciona uma nova bolinha de raio de 5px (`ballRadius`) no topo central com velocidade horizontal randômica inicial.
- `update(dt)`: Executa a física de gravidade, detecção e resolução de colisões com paredes, pinos e captura das bolinhas na entrada dos coletores.
- `draw()`: Renderiza todos os pinos de cor cinza, aplica o histograma magenta de altura normalizada baseando-se no bin mais populoso (`barHeight = (bin.count / maxCount) * (binHeight - 5)`) e renderiza as esferas em queda brilhante azul neon.
- `add10BallsBtn.addEventListener('click')`: Spawna progressivamente um conjunto de 10 bolinhas espaçadas por um temporizador (`setInterval` com atraso de 50ms) para evitar obstrução física no bocal de entrada.
