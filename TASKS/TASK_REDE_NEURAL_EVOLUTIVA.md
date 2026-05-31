# 📝 TASK-REDE_NEURAL_EVOLUTIVA: Visualizador de Topologia do Cérebro, Exportação de Genoma JSON e Gráficos Analíticos

## 👤 User Story
*   **Como** entusiasta e pesquisador de Inteligência Artificial no minijogo científico **Rede Neural Evolutiva**,
*   **Eu quero** inspecionar visualmente a estrutura cerebral (topologia da rede, neurônios e pesos sinápticos) do agente selecionado, salvar ou carregar modelos de cérebros treinados em formato JSON, e visualizar gráficos estatísticos de evolução de *fitness* interativos,
*   **Para que** eu consiga analisar a neuroevolução de forma empírica, compreender as estratégias dos agentes e reutilizar inteligências artificiais campeãs.

---

## 🎯 Critérios de Aceitação
1.  **Visualizador de Topologia Neural (Brain Inspector)**:
    *   Criar uma área ou modal dedicado na interface chamado "Cérebro do Agente Selecionado".
    *   Desenhar dinamicamente em um canvas circular/grafo as camadas de neurônios:
        *   *Nós de Entrada (Inputs)*: Ex: distância dos obstáculos, sensores de visão.
        *   *Nós Ocultos (Hidden Layers)*: Neurônios intermediários de processamento.
        *   *Nós de Saída (Outputs)*: Ações motoras (ex: acelerar, virar esquerda/direita).
    *   As sinapses (linhas conectando os nós) devem refletir seus pesos estatísticos:
        *   *Cor*: Verde para conexões positivas/excitatórias, vermelha para negativas/inibitórias.
        *   *Espessura*: Proporcional à força do peso (Weight).
        *   *Ativação*: Os nós devem pulsar com cores intensas no momento em que enviam sinal elétrico.
2.  **Exportação e Importação de Genomas (Cérebro Campeão)**:
    *   Botão "Exportar Cérebro do Campeão": Faz o download imediato de um arquivo `champion_brain.json` contendo o mapeamento completo de nós e pesos sinápticos do melhor agente da geração atual.
    *   Botão "Importar Cérebro": Permite fazer o upload de um arquivo JSON de cérebro. Ao ser injetado, clona este cérebro em 20% da população atual para acelerar o processo de aprendizado na nova simulação.
3.  **Painel Estatístico de Curvas Evolutivas (Analytics)**:
    *   Plotar um gráfico dinâmico (gráfico de linhas simples no canvas ou integrado via SVG) atualizado ao final de cada geração.
    *   Linha 1 (Azul): *Fitness Máximo* alcançado por geração.
    *   Linha 2 (Cinza): *Fitness Médio* da população por geração.
    *   Permite analisar a convergência evolutiva (Lei da Seleção Natural).

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/rede_neural_evolutiva/index.html`.
*   **Algoritmo de Desenho do Grafo**:
    *   Mapear os neurônios em coordenadas $(x, y)$ calculadas: a coordenada X é proporcional ao índice da camada (entrada = 0, ocultas = intermediárias, saída = 1), e a coordenada Y é espaçada igualmente pelo número de neurônios daquela camada específica.
    *   Na renderização:
        ```javascript
        ctx.beginPath();
        ctx.moveTo(neuronA.x, neuronA.y);
        ctx.lineTo(neuronB.x, neuronB.y);
        ctx.lineWidth = Math.abs(synapse.weight) * 2;
        ctx.strokeStyle = synapse.weight > 0 ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.6)";
        ctx.stroke();
        ```

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Aumenta de forma drástica o valor didático e científico do experimento de neuroevolução).
*   **Esforço Estimado**: Média-Alta (Desenhar grafos autoajustáveis e gerenciar uploads/downloads sem travar a simulação física exige cuidados).
*   **Área**: Front-end / Computação Científica / Visualização de Grafos.
