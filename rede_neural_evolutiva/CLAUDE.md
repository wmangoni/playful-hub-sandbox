# 📂 Arquitetura e Padrões - Rede Neural Evolutiva (ES)

Um simulador de aprendizado de máquina onde uma população de agentes aprende a desviar de obstáculos de forma autônoma através de uma Rede Neural Artificial (MLP) treinada por uma Estratégia Evolutiva (Algoritmo Genético) com crossover, mutação e seleção adaptativa.

## 🏗️ Arquitetura do Código

A aplicação está contida em uma estrutura modular no frontend:
- **`index.html`**: O ponto central que define os containers visuais para o jogo, o gráfico geracional e o analisador em tempo real da rede neural. Implementa as classes matemáticas de álgebra de redes neurais, a heurística evolucionária, a renderização procedural no Canvas e o ciclo do game loop.
- **`best_player.json`**: Arquivo de backup serializado contendo os pesos sinápticos e vieses estruturais do melhor indivíduo treinado anteriormente para reinicialização rápida.

### Fluxo de Inicialização e Execução:
1. **Instanciação da População**: Ocorre o spawn inicial de 20 agentes (`NUM_PLAYERS`). Cada jogador possui um cérebro controlado por uma MLP com pesos inicializados através do método Xavier.
2. **Ciclo de Simulação Física**: Obstáculos são spawnados com dimensões e velocidades pseudo-aleatórias incrementais. Os agentes lêem os dados do sensor físico e decidem por pular.
3. **Avaliação da Geração (Showdown)**: Quando todos os indivíduos morrem por colisão, a Estratégia Evolutiva (`EvolutionaryStrategy`) calcula as métricas de fitness, aplica os operadores genéticos (seleção, crossover, mutação adaptativa) e spawna a nova geração `generation++`.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Loop de Jogo)**: Utiliza `requestAnimationFrame` para desenhar o ambiente de teste bidimensional no Canvas, atualizando a cinemática de gravidade (`GRAVITY = 0.6`) e salto (`JUMP_STRENGTH = -13`) dos agentes, a velocidade de aproximação dos obstáculos e a detecção de colisões.
- **State Pattern (Padrão Estado)**: O ciclo evolutivo alterna entre fases de execução física coletiva e transição de geração. Quando `activePlayers === 0`, o sistema congela a simulação, invoca o resolvedor evolutivo e reinicia o estado dos agentes mantendo o progresso geracional.
- **Rede Neural Multicamadas (Multi-Layer Perceptron - MLP)**:
  - **Estrutura de Neurônios**: 3 neurônios de entrada (`[distância do obstáculo normalizada, altura do obstáculo normalizada, velocidade do obstáculo]`), 2 camadas ocultas contendo `HIDDEN_UNITS_1 = 8` e `HIDDEN_UNITS_2 = 4` e 1 neurônio de saída (`[força de salto]`).
  - **Funções de Ativação**: ReLU nas camadas ocultas (evita vanishing gradient na evolução de muitos pesos) e Sigmoid na saída (se > 0.5, aciona `jump()`).
  - **Visualizador em Tempo Real**: Desenha o grafo neural (`drawNeuralNetwork`) atualizando dinamicamente a espessura e cor das conexões sinápticas (verde para pesos positivos, vermelho para pesos negativos) e o brilho dos neurônios ativos.
- **Algoritmo Evolutivo Adaptativo (Estratégia Evolutiva)**:
  - **Fitness Ajustado**: O fitness do agente baseia-se no tempo de sobrevivência somado a bônus por proximidade ao solo (penaliza saltos desnecessários) e penalidade de pesos L2 (regularização que prefere redes com pesos menores e mais estáveis).
  - **Elitismo**: Preserva os 10% melhores indivíduos sem qualquer mutação e seleciona os 20% melhores para procriação.
  - **Crossover Uniforme**: Recombina genes aleatoriamente entre dois pais selecionados para gerar novos descendentes.
  - **Mutação Adaptativa**: Aplica mutações graduais (`mutationAmount` decaindo em 0.5% por geração e `mutationRate` em 0.2%) para refinar os pesos à medida que a população converge.
- **AABB Collision Detection (Axis-Aligned Bounding Box)**: Colisão 2D retangular exata entre as caixas delimitadoras dos jogadores e dos obstáculos na esteira de corrida.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas 2D API**: Usado em três canvas separados:
  1. `#gameCanvas`: Renderiza os agentes e obstáculos físicos coloridos.
  2. `#nnCanvas`: Desenha o diagrama dinâmico de rede neural e ativações.
  3. `#graphCanvas`: Desenha um gráfico de barras comparativo do melhor (azul) e pior (vermelho) score ao longo das gerações.

## 🔑 Funções e Estruturas Principais

- `MLP.feedForward(inputs)`: Propaga os sinais dos sensores através das matrizes de pesos (`weights_in_h1`, `weights_h1_h2`, `weights_h2_out`) aplicando as funções ReLU e Sigmoid.
- `MLP.getGenes()` / `MLP.setGenes(genes)`: Serializa/desserializa toda a estrutura de pesos e vieses em um vetor linear de genes para manipulação genética.
- `Player.checkCollision(obstacle)`: Algoritmo AABB para verificar impacto.
- `EvolutionaryStrategy.generateNewPopulation()`: Coordena a seleção natural, crossover uniforme e a mutação dos genes da população.
- `drawFitnessGraph(...)`: Renderiza graficamente o histórico de desempenho das gerações (limitado às últimas 50 gerações para performance).
