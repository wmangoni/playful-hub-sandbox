# 📝 TASK-TABULEIRO_GALTON: Curva Teórica Gaussiana, Distribuições Alternativas e Controles de Física

## 👤 User Story
*   **Como** professor ou estudante no simulador físico **Galton Board**,
*   **Eu quero** sobrepor a Curva de Distribuição Normal teórica sobre as colunas de esferas acumuladas, configurar distribuições probabilísticas alternativas inclinando os pinos e controlar variáveis físicas como gravidade e elasticidade das esferas,
*   **Para que** eu possa observar, de forma empírica e altamente didática, a Lei dos Grandes Números e conceitos avançados de estatística experimental.

---

## 🎯 Critérios de Aceitação
1.  **Sobreposição da Curva de Gauss Teórica**:
    *   Plotar uma curva suave de linha neon contínua sobre as colunas coletoras de bolinhas na base do tabuleiro.
    *   A curva de distribuição normal deve se reescalar dinamicamente: a altura do pico central deve ser proporcional ao número acumulado total de esferas disparadas no simulador.
2.  **Configuração de Distribuições Alternativas**:
    *   *Binomial Assimétrica*: Slider que altera a chance de desvio lateral da bolinha em cada pino (de 10% para esquerda a 90% para direita. Padrão: 50%).
    *   *Configurações de Pinos Customizadas (Bimodal/Uniforme)*: Permitir ao usuário alternar padrões de disposição de pinos no tabuleiro para gerar distribuições bimodais (duas corcovas de acúmulo) ou uniformes (todas colunas iguais).
3.  **Sliders de Parâmetros de Física Física**:
    *   Adicionar sliders no painel lateral de configurações:
        *   *Gravidade (g)*: Controla a velocidade de queda das esferas (valores de 0.1x a 3.0x a gravidade real do motor físico).
        *   *Elasticidade (Bounciness)*: Controla o rebote da bolinha contra os pinos (0% - sem rebote/colisão plástica; 100% - rebote elástico extremo).
        *   *Tamanho da Esfera*: Altera o diâmetro das bolinhas simuladas, impactando na taxa de engarrafamento.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/tabuleiro_galton/index.html`.
*   **Física de Partículas**:
    *   A física das bolinhas é processada por um motor simples de partículas 2D (Verlet Integration ou física Euleriana básica).
    *   Na função de colisão esfera-pino, o coeficiente de restituição `e` (elasticidade) deve ser parametrizado pelo valor do slider correspondente:
        `ball.vy = -ball.vy * elasticityCoefficient;`
*   **Equação de Gauss (Curva Normal)**:
    *   Calcular em tempo real a média $\mu$ (centro do tabuleiro) e o desvio padrão $\sigma$ das colunas para plotar a função de densidade probabilística:
        $f(x) = \frac{1}{\sigma \sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}$

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Média-Alta (Transforma o simulador estético de Plinko em uma ferramenta robusta e fascinante de laboratório estatístico).
*   **Esforço Estimado**: Média (A plotagem matemática da curva de Gauss usa fórmulas matemáticas diretas integradas ao elemento Canvas existente).
*   **Área**: Front-end / Canvas 2D / Lógica de Simulação Física e Matemática.
