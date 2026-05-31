# 📝 TASK-RUBIKS_CUBE: Resolvedor Automático de Cubo Mágico, Cronômetro Oficial Speedcubing e Estatísticas (Ao5 / Ao12)

## 👤 User Story
*   **Como** praticante iniciante ou avançado de Speedcubing no minijogo 3D **Rubik's Cube**,
*   **Eu quero** acionar um resolvedor automático baseado em algoritmos inteligentes que me guie passo a passo, treinar com um cronômetro no padrão oficial da WCA e registrar meu histórico pessoal de tempos de resolução com cálculo de médias,
*   **Para que** eu aprenda o método de montagem e possa mensurar e aprimorar minha velocidade de resolução na prática.

---

## 🎯 Critérios de Aceitação
1.  **Resolvedor Automático (Auto-Solver)**:
    *   Criar um botão "Auto-Resolver" na barra de ferramentas lateral.
    *   O algoritmo deve ler a matriz de cores tridimensional atual do cubo misturado e gerar a lista de movimentos de rotação oficiais (Notação da World Cube Association: U, D, R, L, F, B, e suas versões horárias/anti-horárias com apóstrofo).
    *   Executar as animações de rotação 3D correspondentes de forma suave e controlável pelo jogador (ex: botões de Play, Pause, e velocidade da animação).
2.  **Cronômetro Estilo WCA Stackmat**:
    *   Integrar um cronômetro na tela principal ativado pelo teclado:
        *   *Preparação*: O jogador mantém pressionada a barra de espaço. O visor do cronômetro acende em vermelho e, após 1 segundo, fica verde, indicando que está pronto.
        *   *Início*: Ao soltar a barra de espaço, o cronômetro começa a contar milissegundos instantaneamente.
        *   *Parada*: Ao concluir a resolução do cubo, o jogador pressiona qualquer tecla para congelar o cronômetro.
3.  **Histórico e Médias de Velocidade (Solves Logger)**:
    *   Ao parar o cronômetro, salvar o tempo em milissegundos e a data no `localStorage`.
    *   Exibir uma tabela lateral listando os últimos 10 tempos resolvidos.
    *   Calcular e atualizar em tempo real as métricas clássicas de competição:
        *   **Ao5 (Average of 5)**: Média aritmética dos últimos 5 tempos, descartando o melhor e o pior tempo do grupo de 5.
        *   **Ao12 (Average of 12)**: Média aritmética dos últimos 12 tempos, descartando o melhor e o pior.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/rubiks_cube/index.html`.
*   **Motor Lógico do Cubo**:
    *   Integrar um script resolvedor simples (ex: método de camadas simplificado ou algoritmo de duas fases Kociemba portado em JavaScript leve) que resolve o estado lógico do cubo em menos de 100 milissegundos de processamento local.
*   **Controles 3D e Animações**:
    *   Na animação do solver, garantir que as rotações de faces 3D não entrem em conflito com inputs manuais do mouse do jogador (desabilitar rotação manual durante a execução do auto-solver).
*   **Interface Gráfica**:
    *   Design moderno, minimalista e focado no speedcubing, com fontes de display digital de LED de alta legibilidade para o cronômetro.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Fator de engajamento definitivo para os fãs de cubo mágico 3D).
*   **Esforço Estimado**: Alta (O resolvedor lógico exige tratamento matricial complexo de permutações de arestas e cantos do cubo).
*   **Área**: Front-end / Computação Gráfica 3D (WebGL/ThreeJS se aplicável) / Algoritmos de Busca.
