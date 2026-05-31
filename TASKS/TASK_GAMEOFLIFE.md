# 📝 TASK-GAMEOFLIFE: Biblioteca de Padrões Clássicos, Gradiente por Idade Celular e Customização de Regras

## 👤 User Story
*   **Como** estudante ou entusiasta de simulações de autômatos celulares no minijogo **Conway's Game of Life**,
*   **Eu quero** inserir facilmente figuras e estruturas complexas clássicas (como Gliders e Glider Guns), ver as células mudarem de cor conforme envelhecem através de várias gerações e alterar as regras lógicas de nascimento e sobrevivência,
*   **Para que** eu possa criar, testar e analisar experimentos matemáticos de autômatos de forma visualmente rica e altamente customizável.

---

## 🎯 Critérios de Aceitação
1.  **Biblioteca Lateral de Estruturas Clássicas**:
    *   Criar um menu de "Estruturas Prontas" na interface lateral do canvas.
    *   Incluir pelo menos 3 presets essenciais de autômatos:
        1.  *Glider* (estrutura móvel diagonal simples).
        2.  *Pulsar* (lindo oscilador simétrico de período 3).
        3.  *Gosper Glider Gun* (geradora infinita de gliders).
    *   Ao selecionar um padrão na biblioteca, o cursor do mouse no grid deve exibir uma silhueta da estrutura. Ao clicar, desenhar a estrutura inteira centrada na coordenada clicada.
2.  **Degradê de Envelhecimento Celular (Aging Effect)**:
    *   Cada célula no grid deve armazenar seu valor de vida atual em gerações consecutivas (`age`).
    *   Células recém-nascidas (`age == 1`): Azul ciano neon vibrante.
    *   Células adultas (`age` entre 2 e 9): Transição gradual (gradiente linear) para violeta e magenta.
    *   Células ancestrais (`age >= 10`): Dourado/laranja neon brilhante.
    *   Células mortas limpam a cor instantaneamente ou desvanecem com uma leve sombra.
3.  **Editor de Regras Lógicas de Sobrevivência (B/S Editor)**:
    *   Exibir campos de input para configurar as regras clássicas de nascimento e sobrevivência (formato clássico B/S).
    *   *Default*: B3/S23 (Nasce com exatamente 3 vizinhos, sobrevive com 2 ou 3).
    *   Oferecer presets rápidos em um menu dropdown:
        *   *HighLife* (B36/S23): Gera geradores de padrões autorreplicantes.
        *   *Seeds* (B2/S): Expansão caótica extremamente rápida.
        *   *Day & Night* (B3678/S34678): Cria simetrias de campos cheios e vazios.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/gameoflife/index.html`.
*   **Armazenamento do Grid**:
    *   Substituir a matriz binária bidimensional simples `grid[x][y]` (onde `0` = morta, `1` = viva) por uma matriz numérica de idades:
        `0` (morta), ou `age` >= 1 (viva).
    *   Na atualização lógica de geração:
        *   Se a célula sobrevive: `nextGrid[x][y] = grid[x][y] + 1;`
        *   Se a célula nasce: `nextGrid[x][y] = 1;`
        *   Se morre: `nextGrid[x][y] = 0;`
*   **Interface**:
    *   Utilizar CSS moderno para o painel de presets e entradas numéricas das regras, com fontes limpas e visual futurista de laboratório de simulação científica.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Média (Muito instrutivo e aumenta muito o valor educacional da simulação).
*   **Esforço Estimado**: Média (A lógica de iteração do Conway é simples de estender para checar inputs customizados de regras B/S).
*   **Área**: Front-end / Canvas / Lógica Matemática de Autômatos.
