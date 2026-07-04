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

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Tech Lead, estruturei a especificação detalhada da arquitetura e das fórmulas matemáticas necessárias para transformar o Tabuleiro de Galton em um simulador estatístico premium.

### 1. Modelo Matemático da Curva de Gauss Dinâmica (Normal Curve Overlay)

A plotagem da Curva de Distribuição Normal (Gaussiana) contínua no Canvas 2D sobre o histograma deve seguir a aproximação teórica da distribuição Binomial $B(n, p)$, onde $n$ é o número de níveis/passos de desvio e $p$ é a probabilidade de desvio à direita.

#### Parâmetros Estatísticos:
- **Número de Divisões (Bins)**: $M = \text{bins.length} = 16$ (baseado em `numRowsTriangle + 1`).
- **Média ($\mu$)**: Centro geométrico teórico da distribuição:
  $$\mu = (M - 1) \cdot p$$
- **Desvio Padrão ($\sigma$)**:
  $$\sigma = \sqrt{(M - 1) \cdot p \cdot (1 - p)}$$
  *(Para $p = 0.5$ e $M=16$, temos $\mu = 7.5$ e $\sigma = \sqrt{15 \cdot 0.25} \approx 1.936$)*

#### Função de Densidade de Probabilidade (PDF):
$$P(x) = \frac{1}{\sigma \sqrt{2\pi}} \exp\left( -\frac{(x - \mu)^2}{2\sigma^2} \right)$$

#### Escalonamento e Plotagem no Canvas:
Para que a curva se sobreponha perfeitamente às colunas de esferas acumuladas, devemos mapear o valor contínuo $x \in [0, M-1]$ para as coordenadas do Canvas:
1. **Total de Esferas Coletadas ($N_{collected}$)**: Soma do acúmulo de todas as colunas para evitar discrepâncias com bolinhas ainda em queda:
   $$N_{collected} = \sum_{i=0}^{M-1} \text{bins}[i].\text{count}$$
2. **Escalonador Vertical ($Scale_Y$)**: Deve corresponder exatamente à lógica de escala do Histograma:
   $$Scale_Y = \frac{\text{binHeight} - 5}{\max(1, \max_{i} \text{bins}[i].\text{count})}$$
3. **Equação do Ponto Y no Canvas**:
   Para um dado $x$ na largura do tabuleiro:
   - A coordenada X no Canvas correspondente a $x$ é:
     $$X_{canvas} = \left(\frac{x + 0.5}{M}\right) \cdot \text{canvasWidth}$$
   - A altura teórica esperada em contagem de esferas para a coordenada $x$ é:
     $$\text{ExpectedCount}(x) = N_{collected} \cdot P(x)$$
   - O Y no Canvas correspondente é:
     $$Y_{canvas} = (\text{canvasHeight} - \text{binHeight}) + \text{binHeight} - (\text{ExpectedCount}(x) \cdot Scale_Y)$$

#### Diretriz de Código (Canvas Rendering):
```javascript
function drawGaussianCurve() {
    const collectedBalls = bins.reduce((sum, b) => sum + b.count, 0);
    if (collectedBalls === 0) return;

    const M = bins.length;
    const p = probabilityRight; // Obtido do slider (0.1 a 0.9)
    const mean = (M - 1) * p;
    const variance = (M - 1) * p * (1 - p);
    const sigma = Math.sqrt(variance);

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00ffcc'; // Verde Neon brilhante
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0, 255, 204, 0.8)';

    const maxCount = Math.max(1, ...bins.map(b => b.count));
    const scaleY = (binHeight - 5) / maxCount;

    for (let xCanvas = 0; xCanvas <= canvasWidth; xCanvas += 2) {
        // Mapear x do Canvas para o espaço estatístico [0, M - 1]
        const xStat = (xCanvas / canvasWidth) * M - 0.5;
        
        // Densidade normal teórica
        const exponent = -Math.pow(xStat - mean, 2) / (2 * Math.pow(sigma, 2));
        const pdf = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
        
        // Escalar de acordo com as esferas coletadas e fator do histograma
        const expectedHeight = collectedBalls * pdf * scaleY;
        const yCanvas = (canvasHeight - binHeight) + binHeight - expectedHeight;

        if (xCanvas === 0) {
            ctx.moveTo(xCanvas, yCanvas);
        } else {
            ctx.lineTo(xCanvas, yCanvas);
        }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset
}
```

---

### 2. Configurações e Layouts de Distribuições Alternativas

#### A. Probabilidade de Desvio (Binomial Assimétrica)
- **Implementação**: Adicionar um slider no painel lateral `probabilitySlider` (0.1 a 0.9, padrão 0.5).
- **Lógica de Colisão Física**: Ao colidir com um pino, o desvio lateral da esfera deve receber um impulso horizontal direcionado baseado nessa probabilidade:
  ```javascript
  const goRight = Math.random() < probabilityRight;
  const driftSign = goRight ? 1 : -1;
  // Aplica força cinemática direcionada
  ball.vx = driftSign * horizontalRandomness * (0.6 + Math.random() * 0.8);
  ```

#### B. Layout Bimodal (Dois Picos Gaussianos)
- **Princípio**: Gerar duas subestruturas de pinos triangulares lado a lado, com um separador físico central (área sem pinos ou barreira de rebote) no topo para forçar a divisão equilibrada das esferas.
- **Implementação**:
  - Pinos do topo organizados para desviar esferas para os centros das duas subestruturas ($0.25 \cdot W$ e $0.75 \cdot W$).
  - Os geradores de partículas (spawners) ativam dois pontos de queda simultâneos.

#### C. Layout Uniforme (Distribuição Retangular Equilibrada)
- **Princípio**: Pinos dispostos em colunas perfeitamente alinhadas vertikalmente (formando canaletas que evitam difusão extrema) combinado com um gerador que distribui a queda de bolinhas de forma aleatória em toda a largura do topo.
- **Implementação**:
  - Layout `uniform` posicionará pinos em grade regular sem deslocamento de linhas.
  - A função `createBall()` gerará coordenadas X iniciais uniformemente distribuídas:
    ```javascript
    const startX = 0.1 * canvasWidth + Math.random() * (0.8 * canvasWidth);
    ```

---

### 3. Painel de Controles de Física e Ajustes Dinâmicos

Criar um painel lateral elegante (estilo glassmorphic, combinando com o design premium do hub) contendo os seguintes controles vinculados diretamente ao motor físico:

1. **Gravidade Multiplicadora**:
   - Slider de 0.1x a 3.0x (Padrão: 1.0x).
   - Multiplica o valor base `gravity = 0.15` na integração cinemática.
2. **Elasticidade (Bounciness)**:
   - Slider de 0% a 100% (Padrão: 60%).
   - Altera diretamente o coeficiente de restituição (`restitution` de 0.0 a 1.0) usado nos rebotes contra pinos e paredes.
3. **Diâmetro da Esfera**:
   - Slider de 3px a 10px (Padrão: 5px).
   - Atualiza `ballRadius`, permitindo simular maior densidade e colisões entre bolinhas (opcional) ou congestionamento nos coletores.

---

## ❓ Dúvidas para Alinhamento com PO ou TL

Antes de passarmos à codificação da tarefa, precisamos sanar algumas dúvidas sobre o comportamento esperado da simulação:

1. **Colisão entre Esferas**:
   - *Dúvida*: As bolinhas devem colidir apenas com os pinos e bordas (física de partículas independentes), ou o PO deseja a implementação de colisão elástica círculo-círculo entre as próprias esferas?
   - *Análise TL*: Colisão entre esferas cria um efeito visual espetacular de "engarrafamento", mas exige muito mais CPU e pode alterar ligeiramente o comportamento probabilístico puro idealizado matematicamente. **Recomendamos manter a colisão independente por padrão**, com uma opção toggle (liga/desliga) "Colisão entre Bolinhas" para fins recreativos.

2. **Acúmulo Físico Visual dos Coletores**:
   - *Dúvida*: Atualmente, as bolinhas desaparecem ao tocar a base e incrementam um histograma renderizado por retângulos. O PO deseja que as bolinhas físicas fiquem empilhadas umas sobre as outras dentro das colunas para criar um acúmulo analógico realista?
   - *Análise TL*: Empilhar esferas físicas reais na base cria uma sensação muito mais rica, porém exige gerenciar centenas de corpos rígidos estáticos na memória. **Sugestão**: Manter a renderização rápida por histograma neon, mas desenhar círculos empilhados simulados dentro de cada coluna para dar a ilusão de bolinhas reais preenchendo o espaço de forma leve.

---

## 🚀 Status do Desenvolvimento (Refinamento)

- [x] Especificação Matemática da Curva de Gauss detalhada.
- [x] Modelagem de Distribuições Binomiais Assimétricas, Bimodais e Uniformes definida.
- [x] Arquitetura de UI e integração dos controles físicos projetada.

**Status**: `Refined`
