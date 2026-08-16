# 🧩 TASK-PUZZLE: Geração Procedural de Enigmas, Sistema de Foco Mental (Sanidade), Modos de Jogo (Endless & Time Attack) e Áudio Procedural via Web Audio API

## 👤 User Story
* **Como** decifrador de segredos no minijogo **Mind Labyrinth: A Puzzle Adventure**,
* **Eu quero** enfrentar enigmas gerados de forma procedural com dificuldade dinâmica, gerenciar meu Foco Mental (Sanidade) sob a pressão do tempo, selecionar novos modos de jogo (Endless Labyrinth e Time Attack) em um menu de luxo, e ouvir uma trilha e efeitos sonoros gerados por síntese de áudio procedural em tempo real,
* **Para que** a experiência de jogo tenha alta rejogabilidade, profundidade tática e um envolvimento estético e sonoro digno de um verdadeiro templo arcanista de mistérios.

---

## 🎯 Critérios de Aceitação

1. **Geração Procedural de Enigmas (Procedural Generation Engine)**:
   * **Substituição de Enigmas Estáticos**: Remover a lista fixa de 5 enigmas pré-determinados e substituí-la por um gerador algorítmico capaz de criar desafios infinitos para os seguintes tipos de enigma:
     * *Sequence Completion*: Gerar progressões lógicas aleatórias (Ex: Progressão Aritmética, Progressão Geométrica, Sequência de Fibonacci alternada, Rotações de Símbolos Rúnicos). Apresentar 4 opções coerentes de resposta onde apenas uma é logicamente válida.
     * *Pattern Recognition*: Gerar grades 3x3 ou 4x4 (dependendo da dificuldade) contendo distribuições matemáticas de símbolos (Ex: xadrez, linhas alternadas, espelhamento diagonal) e ocultar uma célula aleatória (`?`), gerando opções de resposta contextualizadas.
     * *Memory Challenge*: Escalar o tamanho do grid dinamicamente de acordo com a dificuldade (Ex: Grid 2x2 para iniciantes, 4x4 padrão e 6x6 para níveis avançados). Os pares de cartas devem usar conjuntos de símbolos gerados aleatoriamente a partir de um dicionário rúnico estendido.
     * *Logic Puzzle*: Gerar enunciados lógicos dinâmicos contendo 3 a 4 premissas consistentes baseadas em tabelas verdade básicas e silogismos. Apenas uma runa/símbolo deve satisfazer a totalidade das condições impostas.
     * *Perspective Puzzle*: Gerar um cubo 3D com texturas rúnicas ou cores procedurais em suas faces, inicializado com rotações tridimensionais $(x, y, z)$ aleatórias e não triviais. O jogador deve rotacioná-lo até alinhar a face correta (a Runa Seleta) para a tela.
   * **Dificuldade Escalonada**: Implementar um multiplicador de dificuldade baseado no nível atual ($L$). O nível aumenta o tamanho das grades, reduz tempos máximos de resposta e aumenta a complexidade das regras dos enigmas procedurais.

2. **Sistema de Foco Mental / Sanidade (Mental Focus / Sanity Bar)**:
   * **Barra de Foco**: Adicionar ao HUD uma barra horizontal brilhante em gradiente ciano para roxo profundo (`#focus-bar`) representando o Foco Mental (Sanidade) do jogador, iniciada em 100%.
   * **Penalidades por Erros**: Respostas incorretas reduzem o Foco Mental do jogador:
     * Dificuldade Fácil (Níveis 1-3): -15%
     * Dificuldade Média (Níveis 4-6): -20%
     * Dificuldade Difícil (Níveis 7+): -25%
   * **Uso de Dicas (Hints)**: Permitir a ativação de uma dica textual por enigma, consumindo 10% do Foco Mental como penalidade cognitiva.
   * **Loop de Vitória & Derrota (Game Over)**:
     * Se o Foco Mental atingir 0%, suspender o jogo imediatamente e exibir uma tela de Game Over em glassmorphism com a mensagem: *"Sua mente se perdeu nas sombras do labirinto..."* acompanhado de um botão para recomeçar.
     * Acertos consecutivos regeneram +5% de Foco Mental e ativam um multiplicador de pontuação progressivo (Combo Streak).

3. **Menu Rúnico e Modos de Jogo**:
   * **Painel de Seleção**: Criar uma tela inicial estilizada com tipografia medieval e efeitos de vidro translúcido contendo três opções de modos de jogo:
     * **Modo Campanha (Story Mode)**: A jornada clássica de 7 salas arcanas com progressão narrativa.
     * **Modo Labirinto Sem Fim (Endless Labyrinth)**: O jogador resolve enigmas sequenciais infinitos. A cada 3 enigmas resolvidos, o nível de dificuldade aumenta. O objetivo é alcançar o recorde de pontuação mais alto.
     * **Modo Corrida Contra o Tempo (Time Attack)**: O jogador inicia com um cronômetro regressivo de 60 segundos. Cada enigma correto adiciona +10 segundos ao relógio, e cada erro deduz -15 segundos. O jogo encerra quando o cronômetro zera.

4. **Áudio Procedural com Web Audio API**:
   * **Drone Atmosférico (Background Ambient)**: Criar um sintetizador FM/LFO procedural rodando em tempo real na Web Audio API que gera um som grave e contínuo (drone místico) em loop, modulando a frequência sutilmente para evocar mistério sem depender de arquivos MP3/WAV.
   * **Efeitos Sonoros Sintetizados (Procedural SFX)**:
     * *Seleção/Clique*: Um breve bipe senoidal em alta frequência (frequência de transição rápida de 800Hz para 400Hz em 0.1s).
     * *Acerto (Correct)*: Uma arpejo triunfal em tríade maior (Dó - Mi - Sol - Dó oitava) usando onda triangular e envelope de amplitude com decaimento suave.
     * *Erro (Incorrect)*: Um tom grave dissonante e oscilatório (Modulador em anel combinando ondas dente-de-serra de 120Hz e 123Hz) que diminui de volume em 0.6s.
     * *Sanidade Crítica (Alerta)*: Um pulso senoidal imitando uma batida de coração a 60Hz pulsando a cada 1.2 segundos quando a barra de Foco estiver abaixo de 30%.

5. **Efeitos Visuais Premium (Juiciness)**:
   * **Tremor de Tela (Screen Shake)**: Ao errar um enigma, o container principal do jogo (`.game-container`) deve tremer fisicamente de forma violenta usando animações CSS `@keyframes screenShake`.
   * **Partículas Rúnicas**: Gerar uma animação Canvas no fundo de cada enigma correto, com partículas circulares ciano/douradas flutuando e decaindo a partir do centro da resposta.
   * **Vinheta Pulsante Vermelha**: Aplicar uma sombra interna avermelhada nos cantos da tela (`box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.4)`) que pulsa no ritmo da batida cardíaca de áudio caso a sanidade do jogador caia abaixo de 30%.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivo Alvo**: `/puzzle/index.html`.
* **Framework**: Vanilla JS, Vanilla CSS e Web Audio API.
* **Componentização Física/Matemática**:
  * Implementar uma classe `ProceduralGenerator` para centralizar a criação dos dados de cada enigma.
  * Criar um módulo `AudioManager` utilizando o construtor nativo `AudioContext` para sintetizar tons e o drone ambiental, garantindo conformidade com a política de reprodução (Autoplay Policy) ao iniciar após o primeiro clique do usuário.
  * Estruturar a barra de sanidade no DOM acoplada ao estado reativo `gameState.focus`.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Aumenta de forma monumental a rejogabilidade e insere um loop tático de risco-recompensa através da barra de sanidade e modos de jogo, elevando a experiência estética e sonora da plataforma).
* **Esforço Estimado**: Alta (Exige modelagem matemática lógica para a geração coerente de enigmas, síntese sonora de baixo nível via Web Audio API e manipulação avançada de animações e layouts responsivos).
* **Área**: Game Design / Síntese de Áudio Digital / Algoritmos e Lógica de Programação / Design UI-UX.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Product Owner sênior focado em mecânicas imersivas e em total sincronia com o Tech Lead, desenhei a arquitetura detalhada e as fórmulas exatas para a implementação de geração procedural de puzzles e síntese de áudio digital na Web Audio API:

### 1. Motor de Geração Procedural (ProceduralGenerator Class)

Para evitar enigmas insolúveis ou inconsistências de dados, utilizaremos lógica matemática pura para gerar os enunciados e as opções de resposta (distratores estruturados):

```javascript
class ProceduralGenerator {
    /**
     * Gera um enigma de sequência numérica ou rúnica com base no nível do jogador.
     */
    static generateSequence(level) {
        const patterns = [
            { name: 'aritmetica', gen: (start, step, i) => start + step * i, desc: 'Progressão Aritmética' },
            { name: 'geometrica', gen: (start, step, i) => start * Math.pow(step, i), desc: 'Progressão Geométrica' },
            { name: 'fibonacci_mod', gen: (start, step, i) => {
                let seq = [start, start + step];
                for(let k = 2; k <= i; k++) seq.push(seq[k-1] + seq[k-2]);
                return seq[i];
            }, desc: 'Sequência Recursiva' }
        ];
        
        // Seleciona padrão com base no nível (níveis baixos apenas aritmética)
        const patIndex = level === 1 ? 0 : Math.floor(Math.random() * Math.min(patterns.length, Math.ceil(level / 2)));
        const pattern = patterns[patIndex];
        
        const start = Math.floor(Math.random() * 5) + 1;
        const step = Math.floor(Math.random() * 3) + 2;
        
        let seq = [];
        for (let i = 0; i < 6; i++) {
            seq.push(pattern.gen(start, step, i));
        }
        
        const correctAnswer = seq[5];
        seq[5] = '?'; // Oculta o último elemento
        
        // Gera distratores realistas próximos à resposta correta
        const distractors = new Set();
        while (distractors.size < 3) {
            const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
            const dist = correctAnswer + offset;
            if (dist !== correctAnswer && dist > 0) {
                distractors.add(dist);
            }
        }
        
        const options = [correctAnswer, ...distractors].sort((a, b) => a - b);
        
        return {
            sequence: seq,
            options: options,
            correctAnswer: correctAnswer,
            title: `Sequência Arcana (${pattern.desc})`,
            description: 'Descubra a ordem matemática oculta e preencha a runa final.'
        };
    }

    /**
     * Gera um Enigma de Lógica Consistente com base em premissas.
     */
    static generateLogicPuzzle(level) {
        const runes = ['◆', '■', '●', '▲'];
        // Seleciona uma runa aleatória para ser a VERDADEIRA
        const trueRuneIndex = Math.floor(Math.random() * runes.length);
        const trueRune = runes[trueRuneIndex];
        
        // O banco de dados de premissas dinâmicas é construído garantindo que
        // apenas a runa correta passe na verificação.
        let statements = [];
        
        // Premissa 1: Condição sobre a Verdadeira
        statements.push(`Se ${trueRune} for falsa, o Labirinto colapsará (portanto, uma runa é a chave).`);
        
        // Premissas de exclusão mútua
        runes.forEach((rune, idx) => {
            if (rune !== trueRune) {
                statements.push(`A runa ${rune} e a runa ${trueRune} não podem ambas guiar o caminho.`);
            }
        });
        
        // Seleciona 3 premissas aleatórias para exibir no painel
        statements = statements.sort(() => 0.5 - Math.random()).slice(0, 4);
        
        return {
            statements: statements,
            options: runes,
            correctAnswer: trueRune,
            title: "Tabela de Verdades Alquímicas",
            description: "Uma e apenas uma runa é matematicamente verdadeira. Identifique a chave do portal."
        };
    }
}
```

### 2. Arquitetura de Síntese de Áudio Procedural (AudioManager Class)

Para criar uma atmosfera premium sem custos de carregamento de assets de áudio por rede, utilizaremos a Web Audio API para sintetizar o drone de fundo harmônico e os efeitos de feedback sonoro:

```javascript
class AudioManager {
    constructor() {
        this.ctx = null;
        this.droneOsc = null;
        this.droneFilter = null;
        this.heartbeatInterval = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.startDrone();
    }

    startDrone() {
        // Oscilador de baixa frequência (Drone Sub-bass)
        this.droneOsc = this.ctx.createOscillator();
        this.droneOsc.type = 'sawtooth';
        this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Nota Lá (A1)

        // Filtro Passa-Baixas para suavizar e dar tom abafado/místico
        this.droneFilter = this.ctx.createBiquadFilter();
        this.droneFilter.type = 'lowpass';
        this.droneFilter.frequency.setValueAtTime(150, this.ctx.currentTime);

        // Modulador LFO para gerar oscilação orgânica na névoa sonora
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // 0.2Hz

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(40, this.ctx.currentTime);

        // Modula a frequência de corte do filtro
        lfo.connect(lfoGain);
        lfoGain.connect(this.droneFilter.frequency);

        // Ganho mestre do drone (volume muito baixo de fundo)
        const droneGain = this.ctx.createGain();
        droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

        this.droneOsc.connect(this.droneFilter);
        this.droneFilter.connect(droneGain);
        droneGain.connect(this.ctx.destination);

        // Inicia
        this.droneOsc.start(0);
        lfo.start(0);
    }

    playCorrect() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // Arpejo de Dó Maior (C4 - E4 - G4 - C5)
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.45);
        });
    }

    playIncorrect() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Modulação dissonante
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(98.00, now);  // Sol 2
        osc2.frequency.setValueAtTime(101.00, now); // Dissonância microtonal
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
    }
}
```

### 3. CSS e Layouts para Tremor de Tela e Barra de Sanidade

Abaixo está a folha de estilo necessária para acoplar os novos efeitos e a barra de sanidade bioluminescente:

```css
/* Layout da Barra de Foco Mental no HUD */
#focus-hud-container {
    width: 100%;
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.hud-label {
    font-family: var(--font-display);
    font-size: 0.9rem;
    letter-spacing: 1px;
    color: var(--gold-color);
    text-shadow: 0 0 5px rgba(var(--gold-color-hsl), 0.3);
}

.focus-bar-bg {
    width: 100%;
    height: 12px;
    background: rgba(10, 8, 20, 0.7);
    border: 1px solid rgba(var(--accent-color-hsl), 0.25);
    border-radius: 6px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.focus-bar-fill {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #00f2fe 0%, #4facfe 50%, #9b51e0 100%);
    box-shadow: 0 0 10px rgba(79, 172, 254, 0.7);
    transition: width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Estado Crítico da Barra de Sanidade */
.focus-bar-fill.critical {
    background: linear-gradient(90deg, #ff0055 0%, #ff5500 100%) !important;
    box-shadow: 0 0 12px rgba(255, 0, 85, 0.8) !important;
    animation: criticalPulse 1s infinite alternate;
}

@keyframes criticalPulse {
    0% { filter: brightness(1); }
    100% { filter: brightness(1.3); }
}

/* Animação CSS de Tremor de Tela no Enigma (Screen Shake) */
.screen-shake {
    animation: screenShake 0.45s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes screenShake {
    10%, 90% { transform: translate3d(-2px, 0, 0); }
    20%, 80% { transform: translate3d(4px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
    40%, 60% { transform: translate3d(6px, 0, 0); }
}

/* Vinheta de Perigo Vermelha Pulsante */
#sanity-vignette {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    box-shadow: inset 0 0 80px rgba(255, 0, 0, 0);
    pointer-events: none;
    z-index: 999;
    transition: box-shadow 0.8s ease;
}

#sanity-vignette.active {
    animation: vignettePulse 1.2s infinite alternate;
}

@keyframes vignettePulse {
    0% { box-shadow: inset 0 0 60px rgba(255, 0, 60, 0.2); }
    100% { box-shadow: inset 0 0 100px rgba(255, 0, 60, 0.45); }
}
```

---

## ❓ Dúvidas para o TL ou o PO

Abaixo estão listadas duas dúvidas cruciais de Game Design e Experiência do Jogador (Game Feel) para alinhamento:

1. **Como mitigar a perda de progresso no Modo Endless?**
   * *Proposta do PO*: Devemos salvar a pontuação máxima (High Score) do jogador localmente no navegador (`localStorage.setItem('mind_labyrinth_highscore')`) e exibir um banner dourado flutuante no final de cada sessão Endless caso o jogador ultrapasse seu próprio recorde. Isso estimula a repetição do minijogo.

2. **Dicas Gratuitas ou com Custo no Modo Time Attack?**
   * *Proposta do PO*: No modo Time Attack, o uso de Dicas **não** deve custar Foco Mental/Sanidade, mas deve penalizar o tempo disponível diretamente, subtraindo -8 segundos do relógio de forma a manter o modo focado puramente em velocidade e agilidade cognitiva.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

As diretrizes técnicas acordadas pelo Tech Lead são:

1. **Correção do Enigma de Lógica**:
   * *Decisão*: O enigma de lógica existente no arquivo `index.html` possui uma inconsistência severa onde a runa `▲` é a única solução matematicamente válida para as premissas expostas, porém o código possui `correctAnswer = '◆'`. Na implementação da geração procedural da `TASK_002.md`, os dados antigos devem ser higienizados e substituídos inteiramente pelo motor lógico `ProceduralGenerator.generateLogicPuzzle()`, evitando assim o travamento de jogadores atentos à lógica pura.

2. **Correção do Enigma de Perspectiva (Cubo 3D)**:
   * *Decisão*: O enigma de perspectiva original aprova incorretamente qualquer orientação final devido à união de condições com operadores `||` (OR) que cobrem todos os 6 lados do cubo no método de checagem. O desenvolvedor deve corrigir a validação de rotação para certificar-se de que **exclusivamente** a Runa Seleta (a face da estrela ★) esteja alinhada à frente da câmera antes de declarar sucesso.

3. **Salvamento de Progresso no Modo Endless**:
   * *Decisão*: **APROVADO**. Implementar a persistência do recorde (High Score) usando `localStorage` sob a chave `mind_labyrinth_highscore`. Caso o jogador supere seu recorde ao final de uma partida no Modo Endless, exibir um banner flutuante comemorativo com estética dourada e animações de partículas para recompensar a conquista.

4. **Regras de Dicas no Modo Time Attack**:
   * *Decisão*: **APROVADO**. No Modo Time Attack, o uso de dicas deve subtrair exatamente 8 segundos do cronômetro restante e não infligir penalidade na barra de Foco Mental. Isso preserva a dinâmica de agilidade e tomada de decisão rápida sob pressão de tempo típica do modo.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

*   **Identificação do Jogo**: `puzzle` (Mind Labyrinth)
*   **Ação**: Criação e refinamento da especificação da tarefa `TASK_002.md` concluída.
*   **Status do Backlog**: Inserido na lista central do [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido à inclusão de algoritmos exatos de geração lógica e códigos de baixo nível de Web Audio API para reprodução autônoma.
*   **Destino**: Pronto para desenvolvimento imediato.

*Assinado: Product Owner (PO) - Antigravity*

---

## 💻 Notas de Desenvolvimento (Dev Complete)

**Arquivo alterado**: `puzzle/index.html` (Vanilla JS/CSS + Web Audio API). Construído sobre o tema arcano da TASK_001 (`Dev complete`). Adições marcadas com `TASK_002`.

### 1. Geração Procedural de Enigmas
*   `ProceduralGenerator.generate(type, level)` substitui a lista estática de 5 enigmas por geradores algorítmicos infinitos: **sequence** (aritmética/geométrica/recursiva com distratores próximos), **pattern** (grade xadrez 3×3 ou 4×4 com célula oculta), **memory** (grade escalável 2×2 / 4×4 / 6×6 com runas distintas), **logic** (premissas consistentes — exatamente uma runa verdadeira) e **perspective** (cubo com ★ em face aleatória + embaralhamento não-trivial).
*   Dificuldade escala com `gameState.level` (tamanho de grade, penalidade de foco, pool de padrões).

### 2. Foco Mental (Sanidade)
*   Barra `#focus-bar` (100%); erro penaliza por dificuldade (−15/−20/−25%); acerto regenera +5%; dica custa −10% (exceto Time Attack). Foco 0 ⇒ Game Over glassmorphic. Combo progressivo (`x1 + floor(combo/3)`) multiplica a pontuação.

### 3. Modos de Jogo (menu rúnico)
*   **Campanha** (7 salas, narrativa progressiva), **Endless** (dificuldade +1 a cada 3 enigmas; recorde salvo em `localStorage['mind_labyrinth_highscore']` com banner dourado de novo recorde) e **Time Attack** (60 s; +10 s acerto, −15 s erro, −8 s dica — sem custo de foco, conforme TL).

### 4. Áudio Procedural (Web Audio API)
*   `AudioManager`: drone sub-bass (sawtooth 55 Hz + lowpass modulado por LFO 0.2 Hz), clique (sweep 800→400 Hz), acerto (arpejo de tríade maior triangular), erro (modulação dissonante 120/123 Hz) e batimento cardíaco (60 Hz pulsando a cada 1.2 s) quando foco < 30%. Criado após o 1º clique (autoplay policy).

### 5. Juiciness
*   `screen-shake` no container ao errar; partículas rúnicas em canvas no acerto; vinheta vermelha pulsante (`#sanity-vignette`) + barra crítica quando foco < 30%.

### 🔧 Correções determinadas pelo TL
*   **Lógica**: enigma agora 100% procedural e consistente (uma única runa verdadeira) — elimina a inconsistência `◆`/`▲` do código antigo.
*   **Perspectiva**: vitória **somente** quando a face ★ encara a frente (modelo de orientação por permutação de faces), corrigindo o falso-positivo do `||` que aceitava qualquer lado.

### ✅ Verificação local (preview headless — jogo orientado a eventos)
*   **Geradores**: os 5 tipos produzem enigmas válidos; sequência (6 itens/4 opções); lógica com **exatamente 1** runa verdadeira; memória escala 2×2=4 → 6×6=36 células.
*   **Fluxo**: acerto ⇒ +100×combo, foco +5; erro (fácil) ⇒ foco −15, combo zera, classe `screen-shake`; foco 0 ⇒ Game Over visível.
*   **Time Attack**: 60 → 70 (+10) → 55 (−15). **Endless**: recorde 99999 persistido em `localStorage`.
*   **Perspectiva**: embaralhamento inicial nunca vence; **6/6 puzzles solucionáveis** por brute-force de rotações (estrela sempre alcançável à frente).
*   **Zero erros no console.**

> Nota: `preview_screenshot` expira neste ambiente headless — verificação feita via hook `window.__puzzle` dirigindo o motor e inspecionando estado/DOM.

*Status: 🚀 Ready for QA*
*Responsável: Programador Sênior (Agente Dev)*

## 🔍 Code Review e Homologação (Tech Lead)

### 1. Síntese de Áudio Procedural
*   A classe `AudioManager` inicializa o contexto de áudio em conformidade com a política de reprodução do navegador (Autoplay Policy), ativando-se apenas após a primeira interação do jogador no menu de seleção.
*   A modulação por LFO e filtros passa-baixas no drone sub-bass gera um áudio de fundo extremamente imersivo e limpo sem carregar arquivos de mídia pela rede. Os efeitos de acerto/erro/batimento cardíaco são gerados de maneira robusta.

### 2. Geração Procedural de Enigmas
*   Os geradores procedurais (`sequence`, `pattern`, `memory`, `logic` e `perspective`) criam infinitos puzzles de forma coerente e com dificuldade escalável e balanceada.
*   A correção na validação do prisma de perspectiva 3D foi validada com sucesso, garantindo que o jogador vença exclusivamente quando a estrela ★ estiver voltada para a frente.
*   O enigma de lógica é 100% consistente, resolvendo a contradição anterior.

### 3. Foco Mental, Modos de Jogo e Persistência
*   O Modo Endless persiste corretamente o High Score em `localStorage` e exibe o banner dourado comemorativo no fim de jogo se batido.
*   As penalidades do Time Attack (tempo ao invés de foco para dicas, +10s acerto, -15s erro) estão em perfeito alinhamento com a especificação acordada.

**Resultado da Avaliação**: APROVADO. O sistema procedural de áudio, geração e sanidade cria um jogo dinâmico, rejogável e polido.

*Assinado: Tech Lead (TL) - Antigravity*

---

## 🧪 Evidências de Testes (QA Report)

*Data da Execução:* 15/08/2026  
*Ambiente:* Navegador Headless (Puppeteer v25.1.0) / Servidor Express Local (Porta 3099)  
*Script de Automação:* `tests/qa_puzzle_task002.test.js`  
*Status Geral dos Testes:* **APROVADO (100% dos testes passaram com sucesso)**

### 📋 Itens e Critérios de Aceitação Testados:

1. **Geração Procedural de Enigmas (5 Tipos)**:
   - Geração dinâmica de `sequence`, `pattern`, `memory`, `logic` e `perspective` via `ProceduralGenerator.generate(type, level)`.
   - Renderização correta no DOM com opções de resposta matematicamente consistentes e 1 resposta correta válida.
   - **Resultado:** ✅ Aprovado.

2. **Sistema de Foco Mental (Sanidade) & Combos**:
   - Barra `#focus-bar` iniciada em 100%.
   - Penalidade progressiva por erro ($-15\%$ a $-25\%$) e bônus por acerto ($+5\%$) com multiplicador de combo.
   - Custo de $10\%$ de foco ao solicitar dica no modo Campanha.
   - **Resultado:** ✅ Aprovado.

3. **Modos de Jogo (Endless & Time Attack)**:
   - Modo *Time Attack*: Cronômetro regressivo com bônus de $+10\text{s}$ por acerto, penalidade de $-15\text{s}$ por erro e dedução de $-8\text{s}$ por dica sem custo de foco mental.
   - Modo *Endless*: Dificuldade dinâmica progressiva e persistência do recorde (High Score) em `localStorage`.
   - **Resultado:** ✅ Aprovado.

4. **Síntese de Áudio Procedural (Web Audio API)**:
   - `AudioManager` inicializado via Autoplay Policy com drone sub-bass FM/LFO, arpejo de tríade maior para acerto, tom dissonante para erro e pulso cardíaco para sanidade crítica ($< 30\%$).
   - **Resultado:** ✅ Aprovado.

5. **Estabilidade Geral**:
   - $0$ erros no console do navegador durante toda a execução.
   - **Resultado:** ✅ Aprovado.

