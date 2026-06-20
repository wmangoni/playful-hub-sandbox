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

## 🛠️ Detalhes Técnicos e Arquitetura Detalhada

Como Tech Lead, estabeleço as seguintes diretrizes arquiteturais para garantir a performance da simulação a 60 FPS, robustez na importação/exportação e alto apelo visual (Wow Factor):

### 1. Modelagem do Genoma (JSON Schema)

O arquivo de exportação `champion_brain.json` deve seguir uma estrutura limpa e conter metadados do processo evolutivo. Isso nos permitirá validar a integridade do modelo importado.

**Schema do JSON de Exportação:**
```json
{
  "metadata": {
    "game": "Rede Neural Evolutiva (ES)",
    "generation": 42,
    "fitness": 2840.50,
    "timestamp": "2026-05-31T02:00:00Z",
    "architecture": {
      "inputs": 3,
      "hidden1": 8,
      "hidden2": 4,
      "outputs": 1
    }
  },
  "genome": {
    "weights_in_h1": [[...], [...], [...]], 
    "bias_h1": [...],
    "weights_h1_h2": [[...], [...], ...],
    "bias_h2": [...],
    "weights_h2_out": [[...], [...], ...],
    "bias_out": [...]
  }
}
```

#### Mecanismo de Validação (Importar Cérebro):
Para evitar falhas silenciosas ou travamento do game loop caso o usuário envie um JSON corrompido ou de outra arquitetura, o método de carregamento deve validar rigorosamente a assinatura da rede:
1. Validar se as chaves principais (`metadata`, `genome`) existem.
2. Validar se a arquitetura bate exatamente com as constantes globais:
   - `weights_in_h1` deve ser uma matriz $[3 \times 8]$.
   - `bias_h1` deve ser um vetor de tamanho 8.
   - `weights_h1_h2` deve ser uma matriz $[8 \times 4]$.
   - `bias_h2` deve ser um vetor de tamanho 4.
   - `weights_h2_out` deve ser uma matriz $[4 \times 1]$.
   - `bias_out` deve ser um vetor de tamanho 1.
3. Se falhar na validação, disparar um alerta visual vermelho amigável e abortar a injeção.
4. **Mapeamento Genético na População**: Ao injetar o cérebro campeão, os genes devem ser copiados para **20%** dos indivíduos da população atual aleatoriamente no início da nova geração.

---

### 2. Algoritmo de Renderização e Lógica do Grafo (nnCanvas)

Para uma experiência visual premium e imersiva (Wow Factor), a visualização da rede neural deve ser extremamente viva e representativa:

#### 2.1 Posicionamento Espacial Dinâmico:
As coordenadas de cada neurônio no canvas do Grafo ($400 \times 800$) serão computadas com base em camadas estruturadas:
* **Camada 0 (Entrada)**: $X_0 = 50\text{px}$ (3 neurônios espaçados verticalmente em $y$).
* **Camada 1 (Oculta 1)**: $X_1 = 150\text{px}$ (8 neurônios espaçados verticalmente em $y$).
* **Camada 2 (Oculta 2)**: $X_2 = 250\text{px}$ (4 neurônios espaçados verticalmente em $y$).
* **Camada 3 (Saída)**: $X_3 = 350\text{px}$ (1 neurônio centralizado em $y$).

Equação de centralização de $y$ para uma camada com $N$ neurônios em um canvas de altura $H$:
$$y_i = \frac{H - (N - 1) \cdot S}{2} + i \cdot S$$
Onde $S$ é o espaçamento vertical entre neurônios ($S = 65\text{px}$ para equilibrar o layout).

#### 2.2 Efeitos de Ativação e Sinapses:
* **Neurônios (Nós)**: Devem pulsar em tons neon com base na sua ativação em tempo real:
  * Valor de ativação próximo a $0$: Cor azul escuro fosco (`#1b1b3a`).
  * Valor de ativação elevado ($>0.5$): Glow neon azul brilhante (`#00f0ff`) ou verde-neon (`#39ff14`).
  * Adicionar sombra de brilho usando `ctx.shadowBlur = 12` e `ctx.shadowColor = "#00f0ff"`.
* **Sinapses (Arestas)**:
  * Pesos positivos ($w > 0$): Linhas verdes translúcidas.
  * Pesos negativos ($w < 0$): Linhas vermelhas/magenta translúcidas.
  * A espessura da linha será proporcional a $|w| \cdot 2.5$.
  * **Pulsação de Sinais**: Para dar a sensação de processamento elétrico, adicione pequenas partículas neon brilhantes que deslizam ao longo das linhas de conexão mais fortes da entrada para a saída baseadas no tempo do game loop.

---

### 3. Seleção Interativa do Agente no Jogo

Em vez de fixar a visualização da rede neural apenas no "Jogador 0" (que pode morrer rapidamente):
* **Clique no Canvas**: O usuário pode clicar sobre qualquer agente ativo (jogador sobrevivente que está pulando os blocos no `gameCanvas`) para selecioná-lo.
* **Agente Focado**: O jogador selecionado receberá uma borda neon ou cor dourada de destaque.
* **Atualização em Tempo Real**: O `nnCanvas` passará a ler e renderizar instantaneamente os valores de ativação e pesos do cérebro deste agente selecionado! Se ele morrer, a seleção volta automaticamente para o jogador sobrevivente de maior pontuação na tela.

---

### 4. Gráfico Analítico de Linha Dupla (Convergence Tracker)

O canvas de estatísticas (`graphCanvas`) deve ser aprimorado para fornecer uma análise visual digna de uma simulação de nível científico:
* **Background moderno**: Fundo preto escuro/grafite com linhas de grade cinza finas.
* **Escalabilidade**: O gráfico deve se autoajustar no eixo Y conforme a maior pontuação histórica.
* **Legenda e Rótulos**: Legenda elegante no topo direito:
  * 🟩 **Verde Limão**: Melhor Fitness da Geração.
  * 🟪 **Roxo Neon / Azul**: Fitness Médio da Geração.
* Ao passar o mouse sobre o gráfico, mostrar um tooltip elegante com as estatísticas da geração sob o cursor.

---

### 5. Design Cyberpunk Premium (CSS e UI)

A interface atual do jogo com fundo cinza básico de navegador padrão deve ser transformada em um painel sci-fi digno de um simulador de inteligência artificial de alta tecnologia:
* **Estética Dark-Mode Glassmorphism**: Fundo da página em azul escuro espacial (`#080810`).
* **Bordas Neon**: Containers do jogo e dos canvases com bordas arredondadas e efeito de glow sutil (`box-shadow: 0 0 15px rgba(0, 240, 255, 0.2)`).
* **Botões Modernos**: Hover transitions suaves, com gradiente neon e fontes monoespaçadas de alta legibilidade (como *Courier New* ou Google Font *Orbitron/Roboto*).

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Aumenta de forma drástica o valor didático e científico do minijogo de neuroevolução).
*   **Esforço Estimado**: Média-Alta (Refatorar a estrutura visual e gerenciar uploads de arquivos sem congelar o loop físico).
*   **Área**: Front-end / Computação Científica / Visualização de Grafos.

---
*Status do Refinamento Técnico: ✅ Refined (Pronto para Desenvolvimento)*
*Responsável Técnico: Antigravity - Tech Lead*
