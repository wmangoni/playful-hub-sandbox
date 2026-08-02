# 🏆 TASK-REDE_NEURAL_EVOLUTIVA: Painel de Controle de Mutação em Tempo Real, Modo Sandbox (Editor de Obstáculos) e Eventos de Extinção em Massa com Áudio Sintetizado

## 👤 User Story
* **Como** um entusiasta de Inteligência Artificial e pesquisador de jogos interativos no minijogo **Rede Neural Evolutiva**,
* **Eu quero** ajustar os parâmetros de evolução (taxa de mutação, intensidade, taxa de elitismo e velocidade do tempo) em tempo real, alternar a função de ativação das camadas ocultas, criar pistas personalizadas (Sandbox Mode) posicionando obstáculos manualmente pelo clique no canvas de jogo, e disparar eventos dramáticos de Extinção em Massa com efeitos sonoros procedurais e tremores de tela,
* **Para que** eu consiga testar o limite de adaptação dos agentes inteligentes contra layouts customizados de pista, analisar a convergência sob diferentes hiperparâmetros instantaneamente, e ter uma experiência de simulação rica, tátil e extremamente imersiva (Wow Factor).

---

## 🎯 Critérios de Aceitação

1. **Painel de Hiperparâmetros da Evolução (Control Panel UI)**:
   - Adicionar uma nova seção ou aba elegante com Glassmorphism acrílico na HUD lateral chamada "Controle de Hiperparâmetros".
   - **Sliders de Controle Dinâmicos**:
     - *Taxa de Mutação (Mutation Rate)*: Ajustável de `0.0` (sem mutação) a `1.0` (mutação em 100% dos genes).
     - *Intensidade da Mutação (Mutation Amount)*: Ajustável de `0.05` a `2.0` (amplitude da perturbação no gene).
     - *Taxa de Elitismo (Elite Rate)*: Ajustável de `0.05` a `0.5` (percentual de melhores que sobrevivem intocados).
     - *Fator de Aceleração (Simulation Speed)*: Ajustável de `1x` a `5x` (aumentando a taxa de amostragem física do game loop por frame para acelerar o treinamento).
   - **Função de Ativação Dinâmica**:
     - Dropdown/Select para alterar a função de ativação das camadas ocultas da MLP entre:
       - `ReLU` (Retificadora Linear Unitária: $f(x) = \max(0, x)$).
       - `Sigmoid` (Função Logística: $f(x) = \frac{1}{1 + e^{-x}}$).
       - `Tanh` (Tangente Hiperbólica: $f(x) = \tanh(x)$).
     - Essa alteração deve ser aplicada dinamicamente à simulação. Ao mudar o dropdown, a nova função é adotada imediatamente na propagação direta (`feedForward`) do cérebro de todos os agentes vivos.

2. **Modo Sandbox Interativo (Level & Obstacle Editor)**:
   - Botão Toggle na interface: "Ativar Modo Sandbox".
   - Quando o Modo Sandbox estiver ativado:
     - O spawn automático de novos obstáculos é suspenso.
     - Clicar com o mouse sobre o canvas principal (`#gameCanvas`) instancia um obstáculo retangular personalizado posicionado exatamente na coordenada $X$ correspondente ao clique (e fixo no solo, ou seja, $Y$ é calculado com base no chão).
     - **Configuração do Obstáculo**: O painel do Sandbox permite selecionar a largura (de $20\text{px}$ a $100\text{px}$), altura (de $30\text{px}$ a $100\text{px}$) e velocidade de deslocamento (de $0$ para obstáculos estáticos a $10\text{px/frame}$ para obstáculos rápidos) do obstáculo a ser instanciado no próximo clique.
     - Botão "Limpar Obstáculos": Remove todos os obstáculos da tela.
     - Botão "Retomar Simulação": Libera a movimentação dos obstáculos e o avanço dos agentes no cenário editado.

3. **Eventos Climáticos e de Extinção em Massa (Mass Extinction & Event Engine)**:
   - **Gatilho Manual**: Botão vermelho neon brilhante na HUD: "Forçar Extinção em Massa".
   - **Gatilho Automático**: Se o recorde máximo de gerações (`bestScore`) não for superado por **5 gerações consecutivas**, a simulação entra em estagnação evolutiva e aciona automaticamente a extinção em massa ao fim da geração atual.
   - **Mecânica da Extinção**:
     - Eliminar instantaneamente os **80%** indivíduos com pior *fitness* da população atual.
     - Os **20%** sobreviventes (elites) são mantidos, e seus genes sofrem um choque mutacional imediato (a magnitude da mutação para a nova prole é duplicada provisoriamente em $2\times$ na próxima geração) para forçar o desvio de vales locais e acelerar a descoberta de novas estratégias.
     - **Efeitos de Juiciness (Wow Factor)**: Disparar um tremor de tela radial (`screen-shake`) de 600ms, piscar a iluminação de grade vetorial do canvas em vermelho neon e exibir um overlay central de alerta pulsante: `"CRITICAL WARNING: MASS EXTINCTION EVENT"`.

4. **Sintetizador de Áudio Procedural (Web Audio API)**:
   - Implementar efeitos sonoros dinâmicos sintetizados em tempo real diretamente via osciladores nativos do AudioContext (sem uso de arquivos MP3/WAV externos):
     - **Efeito de Pulo (Jump)**: Onda senoidal varrendo frequências de $200\text{Hz}$ a $850\text{Hz}$ em um envelope linear de $90\text{ms}$.
     - **Efeito de Colisão (Death)**: Ruído de impacto composto por uma varredura senoidal descendente ultra-rápida ($220\text{Hz} \to 60\text{Hz}$) misturada com um envelope de ruído branco (White Noise) de $150\text{ms}$ para dar peso físico à colisão.
     - **Efeito de Novo Recorde (New Record)**: Arpejo ascendente de 3 notas brilhantes ($\text{C}_5 - \text{E}_5 - \text{G}_5$) tocado usando uma onda triangular harmônica.
     - **Efeito de Extinção (Extinction)**: Tom dramático de sirene cibernética senoidal com modulação de frequência oscilante baixa ($120\text{Hz} \leftrightarrow 80\text{Hz}$) por 1.0 segundo.
   - O mixer de áudio deve respeitar políticas dos navegadores, instanciando o `AudioContext` apenas após o primeiro clique de interação do usuário com a página.

---

## 🛠️ Detalhes Técnicos e Diretrizes Arquiteturais

### 1. Retrocompatibilidade e Mapeamento de Ativações
A MLP do jogo evolutivo possui um formato fixo estabelecido na TASK_002 com duas camadas ocultas ($3$ inputs $\to$ $8$ hidden1 $\to$ $4$ hidden2 $\to$ $1$ output). Para evitar que a mudança de funções de ativação em tempo real quebre a escala de pesos ou corrompa genomas salvos:
- Implementar as 3 funções de ativação na classe `MLP`:
  ```javascript
  activation(x, type) {
      switch(type) {
          case 'sigmoid': return 1 / (1 + Math.exp(-x));
          case 'tanh':    return Math.tanh(x);
          case 'relu':
          default:        return Math.max(0, x);
      }
  }
  ```
- Na propagação direta `feedForward(inputs)`, os cálculos das camadas ocultas devem respeitar a opção ativa no painel global:
  ```javascript
  this.hiddenActivations1 = this.bias_h1.map((bias, i) => {
      const sum = inputs.reduce((acc, val, j) => acc + val * this.weights_in_h1[j][i], bias);
      return this.activation(sum, globalActivationType);
  });
  ```

---

### 2. Algoritmo de Edição Dinâmica de Obstáculos (Sandbox Canvas coordinate mapping)
Para calcular corretamente a coordenada do clique do jogador sobre o `#gameCanvas` e transformá-lo em uma entidade física:
```javascript
gameCanvas.addEventListener('mousedown', (event) => {
    if (!sandboxModeActive) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Converter dimensões e instanciar
    const width = parseInt(document.getElementById('sandboxWidth').value);
    const height = parseInt(document.getElementById('sandboxHeight').value);
    const speed = parseFloat(document.getElementById('sandboxSpeed').value);
    
    // Centralizar no clique horizontalmente e alinhar base com o solo
    const x = clickX - width / 2;
    const y = GROUND_Y - height;
    
    obstacles.push(new Obstacle(x, y, width, height, speed));
});
```

---

### 3. Modelo Matemático de Síntese Procedural de Impacto (Audio Engine)
A Web Audio API usará nós nativos (`OscillatorNode`, `BiquadFilterNode`, `GainNode`) e buffers de ruído para sintetizar os efeitos sonoros. Exemplo de síntese de colisão (morte):

```javascript
function playSynthCollision(audioCtx) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    // Oscilador de baixa frequência descendente
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.15);
    
    // Filtro Passa-Baixas para suavizar o dente de serra
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
    
    // Envelope de Volume
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    // Conexões
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
    
    // Síntese de Ruído Branco adicional
    const bufferSize = audioCtx.sampleRate * 0.15; // 150ms
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 300;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.15);
    
    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    noiseNode.start();
    noiseNode.stop(audioCtx.currentTime + 0.15);
}
```

---

### 4. Algoritmo de Choque de Mutação Pós-Extinção
Para aplicar o fator de mutação de $2\times$ na prole da elite após um evento de extinção em massa, a lógica da Geração deve rastrear a flag `extinctionOccurred`:
```javascript
class EvolutionaryStrategy {
    // ...
    generateNewPopulation() {
        let currentMutationAmount = this.mutationAmount;
        let currentMutationRate = this.mutationRate;
        
        if (extinctionOccurredGlobal) {
            // Dobrar intensidade e expandir taxa para a próxima rodada
            currentMutationAmount = Math.min(2.5, this.mutationAmount * 2.0);
            currentMutationRate = Math.min(0.8, this.mutationRate * 1.5);
            
            // Consumir a flag
            extinctionOccurredGlobal = false;
            
            triggerExtinctionToast("Genes da elite desestabilizados! Mutação acelerada.");
        }
        
        // ... (criação da nova geração aplicando currentMutationAmount e currentMutationRate)
    }
}
```

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (A interatividade tátil de sandbox e o controle direto da evolução elevam o jogo de uma simulação estática de assistir para uma plataforma interativa de game design de alta retenção).
* **Esforço Estimado**: Média-Alta (Criação de novos sliders, mapeamento de coordenadas dinâmicas de canvas, gerenciamento das flags de mutação e integração com Web Audio API).
* **Área**: Front-end / UI / Level Design / Áudio Procedural / Computação Científica.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `rede_neural_evolutiva` (Rede Neural Evolutiva)
* **Ação**: Elaboração técnica e refinamento da TASK_003.
* **Status do Backlog**: Registrado com sucesso no [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido ao alto nível de especificação de UI, fórmulas de ativação, algoritmos de renderização tátil e sintetização de áudio via osciladores nativos.
* **Destino**: A `TASK_003.md` está homologada para desenvolvimento técnico.

*Assinado: Product Owner (PO) - Antigravity*
