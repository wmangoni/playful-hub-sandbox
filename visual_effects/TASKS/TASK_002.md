# 📝 TASK-VISUAL_EFFECTS: Upload de Músicas Customizadas, Novas Notas Rítmicas e Efeitos Reativos de Áudio

## 👤 User Story
*   **Como** entusiasta de jogos rítmicos no minijogo **String Catcher** (String Catcher / Visual Effects),
*   **Eu quero** fazer o upload das minhas próprias faixas de áudio rítmicas, capturar novos tipos de notas (notas sustentadas e obstáculos) e ver o fundo da tela reagir fisicamente às frequências sonoras da música,
*   **Para que** a imersão de áudio e visual seja hipnótica, dinâmica e o jogo tenha alta longevidade com suporte a músicas infinitas.

---

## 🎯 Critérios de Aceitação
1.  **Mecanismo de Importação de Faixas Customizadas**:
    *   Criar um botão elegante "Carregar Música Customizada" no menu inicial.
    *   Permitir o upload de um arquivo de áudio (MP3/OGG) + um arquivo de mapeamento em JSON (contendo a lista de timestamps e canais/cordas das notas).
    *   Fornecer um template básico em JSON para os usuários compreenderem o mapeamento.
2.  **Novas Mecânicas de Notas**:
    *   *Nota Sustentada (Hold Note - Amarela)*: Possui uma cauda estendida na corda. O jogador deve segurar a tecla correta do início ao fim da nota para receber pontuação cheia.
    *   *Nota Mina (Obstáculo - Vermelha Piscante)*: Deve ser ativamente evitada pelo jogador. Se capturada, o jogador perde 150 pontos e quebra a sequência de combo.
3.  **Visualizador de Frequências de Fundo (Audio Reactive Web)**:
    *   Integrar a **Web Audio API** (`AnalyserNode`) com a música ativa.
    *   O background e os traçados das cordas vibrantes devem oscilar e emitir ondas de luz (neon glow) no ritmo exato dos graves (batida principal) e agudos da trilha sonora corrente.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/visual_effects/index.html`.
*   **Web Audio API Integration**:
    ```javascript
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Na função de renderização (requestAnimationFrame):
    analyser.getByteFrequencyData(dataArray);
    const lowFreqAverage = calculateAverage(dataArray, 0, 10); // Graves
    // Ajustar opacidade e intensidade do neon glow baseado no lowFreqAverage
    ```
*   **Parser de JSON Rítmico**:
    *   Formato esperado do mapeamento:
        ```json
        {
          "songName": "Custom Track",
          "notes": [
            { "time": 1.25, "lane": 0, "type": "normal" },
            { "time": 2.50, "lane": 2, "type": "hold", "duration": 1.5 }
          ]
        }
        ```

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Média (Muito atrativo visualmente, mas focado no nicho de jogos rítmicos).
*   **Esforço Estimado**: Alta (Requer sincronização estrita de milissegundos na reprodução de áudio e renderização no canvas).
*   **Área**: Front-end / Web Audio API / Sincronia de Renderização.

---

## ⚙️ Refinamento Técnico

Para implementar os requisitos descritos pelo PO no jogo **String Catcher**, utilizaremos uma arquitetura robusta voltada para jogos rítmicos na web e visualizações reativas. Abaixo estão as especificações detalhadas e o plano de implementação.

### 1. Sistema de Importação Customizada e Engine Sincronizada com Áudio

Atualmente, o jogo gera notas de forma randômica por timers. Para suportar faixas customizadas de maneira precisa e profissional, mudaremos a engine para um modelo **Time-Driven** baseado no `currentTime` do elemento HTML5 Audio.

#### A. Componentes de Interface de Upload e Template
*   **Modificações na Tela Inicial (`addStartGameButton`)**:
    *   Adicionar um botão elegante `Carregar Música Customizada` ao lado do botão "Começar Jogo". Ele deve usar o mesmo estilo neon verde mas em tons ciano/azul para destaque.
    *   Ao clicar, exibir um formulário modal limpo contendo:
        1.  Área de Drag & Drop ou Input estilizado para arquivo de áudio (`.mp3` ou `.ogg`).
        2.  Input estilizado para arquivo de mapeamento JSON (`.json`).
        3.  Link de download para o arquivo `template.json`.
*   **Geração Dinâmica do Template**:
    *   Fornecer um link de download com formato URI de dados (`data:text/json;charset=utf-8`) contendo o template base:
        ```json
        {
          "songName": "Minha Musica Customizada",
          "notes": [
            { "time": 2.0, "lane": 0, "type": "normal" },
            { "time": 3.5, "lane": 1, "type": "hold", "duration": 1.5 },
            { "time": 5.0, "lane": 2, "type": "obstacle" }
          ]
        }
        ```

#### B. Sincronização Precisa de Notas (Time-Driven Spawning)
Para evitar dessincronização por lag de frame (FPS instável), o posicionamento e spawn das notas devem ser baseados no `currentTime` da música ativa.
*   **Fórmulas Físicas de Posicionamento**:
    *   Definiremos um tempo de visibilidade antecipada ($T_{view} = 2.0$ segundos). As notas aparecem no lado esquerdo ($x = 0$) exatamente $2.0$ segundos antes de chegarem à zona de captura ($X_{capture} = \text{canvas.width} \times 0.8$).
    *   No frame $t_{current} = \text{backgroundMusic.currentTime}$, a posição de uma nota que deve ser acertada no tempo $t_{note}$ é:
        $$x = X_{capture} \times \left(1 - \frac{t_{note} - t_{current}}{T_{view}}\right)$$
    *   Se $t_{current} \ge t_{note} + 0.15$ segundos (tolerância de atraso) e a nota não foi capturada, ela é marcada como inativa e dispara o evento `notePassed`.
    *   Esse cálculo garante sincronia absoluta independente de variações na taxa de frames.

---

### 2. Novas Mecânicas e Renderização de Notas

Modificaremos o loop de notas e a detecção de colisões para suportar os novos tipos:

#### A. Nota Sustentada (Hold Note - Amarela)
*   **Visual**:
    *   A cabeça é um círculo amarelo com brilho neon ciano/dourado.
    *   A cauda é um retângulo semi-transparente amarelo desenhado ao longo do fio da corda, ligando a cabeça ao fim da nota ($t_{note} + \text{duration}$).
    *   O comprimento visual da cauda é calculado por:
        $$\text{length} = X_{capture} \times \frac{\text{duration}}{T_{view}}$$
*   **Mecânica de Captura**:
    *   O jogador deve clicar na cabeça quando ela entra na zona de captura e manter o mouse pressionado.
    *   Monitoraremos os eventos `mousedown`, `mousemove` e `mouseup` no Canvas.
    *   Se o mouse estiver pressionado dentro da zona da corda durante a passagem da cauda, o jogador ganha pontuação contínua (+5 pontos por frame de sustentação) e mantém o combo.
    *   Se soltar ou sair da corda antes do fim, a cauda fica cinza, quebra o combo e gera o feedback visual "BREAK!".

#### B. Nota Mina (Obstáculo - Vermelha Piscante)
*   **Visual**:
    *   Círculo vermelho piscando dinamicamente. A opacidade e o raio do brilho piscam com base em `Math.sin(Date.now() * 0.02)`.
*   **Mecânica**:
    *   O jogador deve ativamente evitação e **NÃO** clicar.
    *   Se o jogador clicar nela, a função `checkNoteCapture` a detectará, executará o som `obstacleHitSound`, deduzirá **150 pontos** do score (garantindo que o score não fique negativo), zerará o combo, mas não reduzirá vidas (pois é uma mina e não uma nota perdida).

---

### 3. Integração com Web Audio API para Efeitos Reativos

Criaremos um analisador de frequências em tempo real para transformar o jogo em um visualizador reativo dinâmico de altíssimo nível.

#### A. Inicialização Segura da Web Audio API
Como os navegadores bloqueiam contextos de áudio sem interação prévia do usuário, inicializaremos os nós no clique de início do jogo:
```javascript
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let dataArray = null;

function initAudioAnalysis(audioElement) {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    
    sourceNode = audioCtx.createMediaElementSource(audioElement);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}
```

#### B. Algoritmo de Extração de Frequências (Animação)
A cada frame no loop `animate()`, executaremos:
```javascript
if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    
    // Graves (Beats primários - batida de bumbo e baixo)
    const bassAvg = calculateAverage(dataArray, 0, 10) / 255; 
    // Agudos (Hi-hats, vocais, pratos)
    const trebleAvg = calculateAverage(dataArray, 80, 120) / 255;
    
    applyAudioReactivity(bassAvg, trebleAvg);
}
```

#### C. Efeitos Visuais Reativos Aplicados
1.  **Fundo Dinâmico (Beat Pulse)**:
    *   O fundo será limpo com uma cor interpolada suavemente de acordo com a batida dos graves:
        ```javascript
        const baseColor = params.backgroundColor; // ex: #111111
        // Pulsação suave em direção a um roxo escuro no grave
        ctx.fillStyle = blendColors(baseColor, '#1d0c24', bassAvg * 0.4);
        ```
2.  **Corda Vibrante e Neon Glow Reativo**:
    *   Adicionar `bassAvg * params.vibrationAmplitude * 0.15` à vibração natural de todas as cordas no frame.
    *   O brilho neon (`ctx.shadowBlur` e `ctx.shadowColor`) das cordas e da zona de captura aumentará com a intensidade dos graves:
        ```javascript
        ctx.shadowBlur = 10 + bassAvg * 25;
        ```
3.  **Partículas de Agudos (Treble Sparkles)**:
    *   Implementar um emissor de pequenas partículas de poeira estelar (sparkles) que piscam e sobem na tela aceleradas pelo ritmo dos agudos (`trebleAvg`).

---

### 4. Plano de Alterações nos Arquivos

*   **[`visual_effects/index.html`](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/visual_effects/index.html)**:
    *   Adicionar UI do modal de upload, botão customizado no menu inicial e botão de baixar template.
    *   Integrar os manipuladores de arquivos via `FileReader`.
    *   Refatorar a engine principal para processar tanto o áudio default (com geração procedural de notas e obstáculos) quanto o áudio customizado (usando a fila baseada em tempo de áudio).
    *   Criar classes/estruturas de dados para gerenciar a cabeça e a cauda da `HoldNote` e a lógica de persistência do clique.
    *   Adicionar a inicialização do `AudioContext`, o mapeamento do analisador e os filtros de frequência para modular a renderização do Canvas.

Com este refinamento técnico, a tarefa está pronta para desenvolvimento com sincronia estrita de áudio, alta fidelidade reativa e mecânicas completas para os minijogos rítmicos.

---

## 💻 Notas de Desenvolvimento (Dev complete)

Implementado em `visual_effects/index.html`. Todos os critérios atendidos e validados localmente (preview + testes unitários das mecânicas via console). Nenhum erro de runtime.

### O que foi entregue
1.  **Upload de música customizada**: botão ciano "🎵 Carregar Música Customizada" no menu inicial → modal com input de áudio (.mp3/.ogg) + input de mapa (.json), validação do JSON via `FileReader`, e link de download do `template.json` (data URI). O áudio customizado é carregado no mesmo elemento `backgroundMusic` (necessário porque `createMediaElementSource` é único por elemento).
2.  **Engine time-driven**: em modo customizado as notas são spawnadas pela fila `noteQueue` com base em `backgroundMusic.currentTime` (antecedência `T_VIEW = 2.0s`), posição `x = X_capture * (1 - (t_note - t)/T_VIEW)` — sincronia independente do FPS. Modo default segue procedural (`createNote`), agora gerando também holds e minas.
3.  **Nota Sustentada (Hold - amarela)**: cabeça com glow neon + cauda translúcida; mecânica de segurar via `mousedown`/`mouseup` (+5 pts por frame); soltar cedo → "BREAK!" e zera combo; completar → "HOLD!" e mantém combo. Suporte a toque.
4.  **Nota Mina (vermelha piscante)**: pisca via `Math.sin(Date.now()*0.02)`; clicar → −150 pts (clampado em 0), zera combo, som de impacto, **sem** perda de vida. Minas não capturadas passam sem penalidade.
5.  **Web Audio API reativa**: `AnalyserNode` (fftSize 256) extrai graves (`bins 0–10`) e agudos (`bins 80–120`). Fundo pulsa em direção a roxo escuro nos graves (`blendColors`), cordas ganham `shadowBlur` + vibração extra nos graves, e sparkles de poeira estelar sobem reagindo aos agudos.

### Validações executadas (console)
*   Distribuição de tipos em 500 notas: ~73% normal / ~15% hold / ~12% mina.
*   Captura normal com timing perfeito: +15 (10 base + 5 PERFECT).
*   Mina com score 500 → 350 (−150 exato) e combo zerado; com score baixo, clamp em 0.
*   Hold: sustentação acumula +5/frame, completa e mantém combo; soltar no meio gera BREAK e zera combo.
*   Modo customizado: JSON (incl. `type: "obstacle"` → mina) vira fila ordenada e spawna dentro da janela de 2s.

### Observações para o TL
*   Mantive o sistema antigo de `obstacles`/`startObstacleGenerator`/`hitObstacle` no arquivo, porém **não é mais acionado** (os perigos agora são as Minas, conforme o Critério 2, que exige −150 pts e nenhuma perda de vida — comportamento incompatível com o `hitObstacle` legado que tirava vida). Pode ser removido em um cleanup futuro.
*   Corrigi de passagem um comportamento do replay: o "Jogar Novamente" original não retomava a música após o game over; agora ele restaura e toca a trilha default.

