# 📝 TASK-VISUAL_EFFECTS: Temas Visuais Dinâmicos, Notas Especiais (Frenzy & Escudo) e Sintetizador de Áudio Procedural Integrado

## 👤 User Story
*   **Como** fã entusiasta de jogos rítmicos no minijogo **String Catcher** (String Catcher / Visual Effects),
*   **Eu quero** selecionar diferentes temas visuais interativos (Cyberpunk, Vaporwave e Nebula), interagir com novas notas especiais (Estrela de Frenesi e Coração de Proteção) e personalizar o feedback sonoro através de um sintetizador de áudio procedural integrado com escalas harmônicas,
*   **Para que** a experiência visual e auditiva seja extremamente premium, personalizada e ofereça alta retenção e imersão.

---

## 🎯 Critérios de Aceitação

1.  **Menu de Temas Visuais Dinâmicos (Estilos Gráficos)**:
    *   Criar um menu lateral ou painel elegante e glassmorphic no Canvas/HTML para que o usuário possa selecionar entre 3 temas estéticos em tempo real:
        *   **Retro Cyberpunk (Padrão - Neon Rosa/Ciano)**: Fundo com uma grade virtual em perspectiva 3D (grid lines) que pulsa e deforma verticalmente com base na intensidade dos graves da música. Partículas geradas são faíscas em blocos pixelados neon.
        *   **Vaporwave Sunset (Roxo/Rosa Pastel)**: Fundo com gradiente suave do amanhecer/anoitecer retrô e um sol poente aramado (wireframe sun) centralizado que pulsa radialmente no ritmo do beat. As partículas são bolhas translúcidas subindo lentamente.
        *   **Cosmic Nebula (Roxo Profundo/Dourado)**: Fundo simulando poeira estelar móvel em gradiente fluido de nebulosa que rotaciona sob a influência das frequências da música. As partículas são pequenas estrelas cadentes brilhantes.

2.  **Novas Notas Especiais e Modo Frenesi**:
    *   **Estrela de Frenesi (Frenzy Note - Arco-íris Cintilante)**:
        *   Possui chance rara de aparecimento (5% no modo procedural; mapeável no JSON customizado como `"type": "frenzy"`).
        *   Ao capturá-la na zona ideal, ativa o **Modo Frenesi** por 8 segundos.
        *   No Modo Frenesi, todos os pontos ganhos são dobrados (multiplicadores de combo viram: combo x5 ➡️ x10, etc.).
        *   Todas as cordas (strings) começam a piscar em gradientes de arco-íris e a poeira estelar de fundo passa a ser emitida continuamente em alta velocidade.
        *   Exibir no topo um banner neon estilizado "FRENZY MODE!" com barra de tempo restante.
    *   **Coração de Proteção (Shield Note - Verde Esmeralda/Ciano Cintilante)**:
        *   Possui chance moderada de aparecimento (8% no modo procedural; mapeável no JSON customizado como `"type": "shield"`).
        *   Ao capturá-la, concede ao jogador um **Escudo de Proteção** (máximo de 1 por vez).
        *   A proteção é indicada por uma aura circular neon giratória ao redor das zonas de captura e por um ícone de escudo na HUD de vidas.
        *   Se o jogador perder uma nota ou bater em uma mina vermelha, o escudo é quebrado no lugar: evita a perda de uma vida ou anula a perda de combo e pontuação, consumindo-se em seguida.

3.  **Sintetizador de Áudio Procedural Integrado**:
    *   Implementar geração de notas sonoras em tempo real usando a **Web Audio API** (`OscillatorNode` e `GainNode`), tocando no momento exato do clique de acerto da nota (ou de sustentação contínua da Hold Note).
    *   No painel lateral, permitir ao jogador escolher entre 3 ondas sonoras clássicas para o tom:
        *   **Sine Wave (Seno)**: Som limpo, lembrando flauta ou gotas harmônicas.
        *   **Triangle Wave (Triângulo)**: Som retro clássico estilo chiptune (8-bit limpo).
        *   **Sawtooth Wave (Dente de Serra)**: Som rasgado e encorpado, característico de sintetizadores eletrônicos retro-futuristas.
    *   **Mapeamento de Escala Harmônica (Juiciness de Áudio)**:
        *   Cada corda (lane) deve disparar uma frequência correspondente a uma nota dentro de uma escala pentatônica menor (ex: Pentatônica de Lá Menor - A3, C4, D4, E4, G4, A4, C5, D5...). Isso garante que, independentemente da corda tocada, a sequência de notas clicadas formará um arranjo musical coerente e agradável.
        *   Para hold notes, a nota sintetizada deve sustentar (envelope de áudio ativo) enquanto o botão estiver pressionado na cauda da nota, diminuindo suavemente ao soltar.

4.  **Game Feel Avançado (Juiciness)**:
    *   **Distorção Física da Corda (Ripple Effect)**: Ao capturar com sucesso qualquer nota em uma corda, uma perturbação ondulatória física se propaga de forma senoidal atenuada para as cordas vizinhas de cima e de baixo, fazendo-as vibrar momentaneamente em resposta ao impacto.
    *   **Screen Shake (Tremor de Tela)**: O canvas do jogo deve sofrer um tremor de 250ms de intensidade moderada no exato instante de ativação do Frenzy Mode, ao quebrar um escudo ou ao colidir com uma mina vermelha.

---

## 🛠️ Detalhes Técnicos e Diretrizes de Arquitetura

*   **Arquivos Alvo**: `/visual_effects/index.html`.
*   **Estrutura de Temas**:
    *   Implementar uma função `drawThemeBackground()` que executa renderizações específicas baseadas em `currentTheme = 'cyberpunk' | 'vaporwave' | 'nebula'`.
    *   Para o grid 3D (Cyberpunk), desenhar linhas de grade que convergem para um ponto de fuga no horizonte e transladar suas linhas horizontais em tempo de execução proporcional à velocidade do áudio.
*   **Web Audio API Synth**:
    *   Criar uma classe ou objeto `ProceduralSynth` contendo o `AudioContext` do jogo.
    *   A escala pentatônica pode ser representada por um array de frequências pré-calculadas:
        ```javascript
        const PENTATONIC_FREQS = [220.00, 246.94, 277.18, 329.63, 369.99, 440.00, 493.88, 554.37, 659.26, 739.99]; // Exemplo
        ```
    *   Configurar um envelope de amplitude (Attack, Decay, Sustain, Release) para evitar estalos de áudio nas caixas de som e garantir timbres suaves.
*   **Propagação Física (Ripple)**:
    *   Na classe `VibratingString`, criar uma propriedade `rippleFactor = 0`.
    *   Ao acertar uma nota na corda `i`, definir `strings[i].points[n].velocity` com um pulso de velocidade física e propagar uma fração dessa força para `strings[i-1]` e `strings[i+1]` usando decaimento linear.

---

*   **Área**: Front-end / Canvas 2D / Web Audio API / Física de Jogos.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Tech Lead, estruturei e desenhei a especificação técnica para a implementação de múltiplos temas gráficos reativos, o sintetizador procedural pentatônico, as novas notas especiais e a mecânica física de ripple de forma limpa e modular.

### 1. Temas Visuais Dinâmicos e Sistema de Partículas

O desenvolvedor deve implementar a variável global `currentTheme = 'cyberpunk'` (com suporte a `'vaporwave'` e `'nebula'`) e o método `drawThemeBackground()` para renderizar as estéticas visuais no canvas.

```javascript
let currentTheme = 'cyberpunk'; // 'cyberpunk' | 'vaporwave' | 'nebula'

function drawThemeBackground() {
    if (currentTheme === 'cyberpunk') {
        // Fundo Cyberpunk que reage aos graves da música
        ctx.fillStyle = blendColors(params.backgroundColor, '#1d0c24', Math.min(1, audioBass * 0.6));
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grade virtual 3D que deforma verticalmente
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.lineWidth = 1.5;
        const horizonY = canvas.height * 0.4;
        const lineCount = 20;
        
        // Linhas de perspectiva (ponto de fuga central)
        for (let i = 0; i <= lineCount; i++) {
            const xOffset = (i / lineCount) * canvas.width;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, horizonY);
            ctx.lineTo(xOffset, canvas.height);
            ctx.stroke();
        }
        
        // Linhas horizontais em translação dinâmica
        const time = Date.now() * 0.002 * (1 + audioBass * 2);
        const gridLines = 10;
        for (let i = 0; i < gridLines; i++) {
            const progress = ((i + time) % gridLines) / gridLines;
            const y = horizonY + (canvas.height - horizonY) * Math.pow(progress, 2);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    } 
    else if (currentTheme === 'vaporwave') {
        // Gradiente vertical retro de anoitecer
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#2e0854');
        grad.addColorStop(0.5, '#8b008b');
        grad.addColorStop(1, '#ff69b4');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Sol aramado central pulsando no ritmo do beat
        const centerX = canvas.width / 2;
        const centerY = canvas.height * 0.45;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.22;
        const currentRadius = baseRadius + (audioBass * baseRadius * 0.2);
        
        const sunGrad = ctx.createLinearGradient(centerX, centerY - currentRadius, centerX, centerY + currentRadius);
        sunGrad.addColorStop(0, '#ffcc00');
        sunGrad.addColorStop(1, '#ff007f');
        ctx.fillStyle = sunGrad;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI, true);
        ctx.fill();
        
        // Linhas pretas horizontais cortando o sol
        ctx.fillStyle = '#2e0854';
        const stripeCount = 6;
        for (let i = 0; i < stripeCount; i++) {
            const sy = centerY + (i / stripeCount) * currentRadius * 0.9;
            const sh = 4 + i * 2;
            ctx.fillRect(centerX - currentRadius - 10, sy, currentRadius * 2 + 20, sh);
        }
        
        // Grade aramada na parte inferior
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
        ctx.lineWidth = 1;
        const gridStartY = centerY;
        for (let i = 0; i <= 16; i++) {
            const x = (i / 16) * canvas.width;
            ctx.beginPath();
            ctx.moveTo(centerX, gridStartY);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        const time = Date.now() * 0.001 * (1 + audioBass * 1.5);
        for (let i = 0; i < 8; i++) {
            const progress = ((i + time) % 8) / 8;
            const y = gridStartY + (canvas.height - gridStartY) * Math.pow(progress, 1.8);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    } 
    else if (currentTheme === 'nebula') {
        // Poeira estelar fluida (dois gradientes radiais em rotação orbital)
        const time = Date.now() * 0.0003;
        const angle = time % (Math.PI * 2);
        
        const c1X = canvas.width / 2 + Math.cos(angle) * canvas.width * 0.25;
        const c1Y = canvas.height / 2 + Math.sin(angle) * canvas.height * 0.25;
        const c2X = canvas.width / 2 - Math.cos(angle + Math.PI/2) * canvas.width * 0.2;
        const c2Y = canvas.height / 2 - Math.sin(angle + Math.PI/2) * canvas.height * 0.2;
        
        const grad = ctx.createRadialGradient(c1X, c1Y, 10, c2X, c2Y, Math.max(canvas.width, canvas.height) * 0.85);
        grad.addColorStop(0, '#4b0082');
        grad.addColorStop(0.3, '#191970');
        grad.addColorStop(0.7, '#240a34');
        grad.addColorStop(1, '#05020c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Spot de luz suave com brilho variável baseado nas frequências
        const reactiveRad = 200 + audioBass * 300;
        const spotGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 50, canvas.width / 2, canvas.height / 2, reactiveRad);
        spotGrad.addColorStop(0, 'rgba(218, 165, 32, 0.08)');
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, reactiveRad, 0, Math.PI * 2);
        ctx.fill();
    }
}
```

O spawner de partículas deve se adaptar ao tema escolhido e ao estado do jogo:

```javascript
function emitThemeParticles(intensity) {
    const count = Math.floor(intensity * 4);
    for (let i = 0; i < count; i++) {
        if (currentTheme === 'cyberpunk') {
            // Faíscas quadradas pixeladas neon
            sparkles.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 10,
                vy: -(1 + Math.random() * 3.5) * (0.5 + intensity),
                vx: Math.random() * 1.5 - 0.75,
                size: 2 + Math.random() * 4,
                life: 1.0,
                hue: 300 + Math.random() * 40, // Rosa/Magenta
                type: 'square'
            });
        } else if (currentTheme === 'vaporwave') {
            // Bolhas translúcidas lentas
            sparkles.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 20,
                vy: -(0.5 + Math.random() * 1.5) * (0.8 + intensity),
                vx: Math.sin(Math.random() * Math.PI) * 0.3,
                size: 3 + Math.random() * 8,
                life: 1.0,
                hue: 180 + Math.random() * 40, // Ciano/Turquesa
                type: 'bubble'
            });
        } else if (currentTheme === 'nebula') {
            // Pequenas estrelas cadentes brilhantes descendo
            sparkles.push({
                x: Math.random() * canvas.width,
                y: -10,
                vy: (2 + Math.random() * 4) * (0.7 + intensity),
                vx: -(1 + Math.random() * 2),
                size: 1.5 + Math.random() * 2,
                life: 1.0,
                hue: 45 + Math.random() * 15, // Dourado/Amarelo
                type: 'star'
            });
        }
    }
}

function updateThemeParticles() {
    for (const s of sparkles) {
        s.y += s.vy;
        s.x += s.vx;
        s.life -= (s.type === 'bubble') ? 0.008 : 0.016;
    }
    sparkles = sparkles.filter(s => s.life > 0 && s.y > -30 && s.y < canvas.height + 30 && s.x > -30 && s.x < canvas.width + 30);
}

function drawThemeParticles() {
    for (const s of sparkles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.life);
        if (s.type === 'square') {
            ctx.fillStyle = `hsl(${s.hue}, 100%, 70%)`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `hsl(${s.hue}, 100%, 60%)`;
            ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
        } else if (s.type === 'bubble') {
            ctx.strokeStyle = `hsla(${s.hue}, 100%, 80%, 0.7)`;
            ctx.fillStyle = `hsla(${s.hue}, 100%, 85%, 0.15)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (s.type === 'star') {
            ctx.strokeStyle = `hsla(${s.hue}, 100%, 75%, ${s.life})`;
            ctx.lineWidth = s.size;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3);
            ctx.stroke();
        }
        ctx.restore();
    }
}
```

### 2. Sintetizador de Áudio Procedural Pentatônico

Para assegurar uma melodia perfeitamente harmonizada e contornar bloqueios de reprodução nos navegadores, implementaremos a classe `ProceduralSynth` e o array de frequências da escala pentatônica menor de Lá:

```javascript
const PENTATONIC_SCALE = [
    220.00, // A3
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50, // C6
    1174.66, // D6
    1318.51, // E6
    1567.98  // G6
];

class ProceduralSynth {
    constructor() {
        this.ctx = null;
        this.waveType = 'sine'; // 'sine' | 'triangle' | 'sawtooth'
        this.activeNodes = {};  // Mapeamento de hold notes ativas por ID
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playNote(frequency, duration = 0.3) {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = this.waveType;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        // Envelope de Amplitude ADSR para evitar cliques e ruídos
        const now = this.ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.1); // Decay
        gainNode.gain.setValueAtTime(0.08, now + duration - 0.05); // Sustain
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    startHoldNote(noteId, frequency) {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (this.activeNodes[noteId]) return;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = this.waveType;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05); // Attack suave

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        this.activeNodes[noteId] = { osc, gainNode };
    }

    stopHoldNote(noteId) {
        if (!this.activeNodes[noteId]) return;
        const { osc, gainNode } = this.activeNodes[noteId];
        
        const now = this.ctx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12); // Release suave

        osc.stop(now + 0.12);
        delete this.activeNodes[noteId];
    }
}

const synth = new ProceduralSynth();
```

A frequência ideal da corda é mapeada com base no seu index:
```javascript
function getStringFrequency(stringIndex) {
    const idx = stringIndex % PENTATONIC_SCALE.length;
    return PENTATONIC_SCALE[idx];
}
```

### 3. Notas Especiais e Estados de Jogo (Frenzy & Shield)

#### 3.1 Estrela de Frenesi (Frenzy)
Ao capturar uma nota do tipo `'frenzy'`, ativa-se o **Frenzy Mode** por 8 segundos. Todos os pontos são dobrados e a cauda da corda passa a piscar no loop.
- **Desenho da estrela**:
```javascript
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

function drawFrenzyNote(note, stringY) {
    const hue = (Date.now() * 0.15) % 360;
    ctx.save();
    ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    drawStar(ctx, note.x, stringY, 5, note.radius * 1.25, note.radius * 0.6);
    ctx.fill();
    ctx.restore();
}
```

#### 3.2 Coração de Proteção (Shield)
Garante imunidade a **1 colisão de mina** ou **1 nota perdida (miss)**. Uma aura giratória verde é desenhada sobre a zona de captura.
- **Desenho do escudo**:
```javascript
function drawShieldShape(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.85, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.85, cy + size * 0.25);
    ctx.quadraticCurveTo(cx, cy + size, cx, cy + size * 1.1);
    ctx.quadraticCurveTo(cx, cy + size, cx - size * 0.85, cy + size * 0.25);
    ctx.lineTo(cx - size * 0.85, cy - size * 0.6);
    ctx.closePath();
}

function drawShieldNote(note, stringY) {
    ctx.save();
    ctx.fillStyle = '#00ff87';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff87';
    drawShieldShape(ctx, note.x, stringY, note.radius);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    drawShieldShape(ctx, note.x, stringY, note.radius * 0.65);
    ctx.stroke();
    ctx.restore();
}
```

### 4. Ripple e Screen Shake (Física & Juiciness)

#### 4.1 Ripple Effect nas Cordas
Ao capturar uma nota, aplicamos uma perturbação de velocidade que decai e se propaga às cordas adjacentes:

```javascript
function triggerRipple(stringIndex, targetX, force) {
    const pointCount = 100;
    const centerIdx = Math.min(pointCount - 1, Math.max(0, Math.floor((targetX / canvas.width) * (pointCount - 1))));
    
    applyRippleForce(stringIndex, centerIdx, force);
    applyRippleForce(stringIndex - 1, centerIdx, force * 0.5);
    applyRippleForce(stringIndex + 1, centerIdx, force * 0.5);
    applyRippleForce(stringIndex - 2, centerIdx, force * 0.25);
    applyRippleForce(stringIndex + 2, centerIdx, force * 0.25);
}

function applyRippleForce(stringIndex, centerIdx, force) {
    if (stringIndex < 0 || stringIndex >= strings.length) return;
    const string = strings[stringIndex];
    const width = 15; // Pontos afetados horizontalmente
    for (let i = -width; i <= width; i++) {
        const idx = centerIdx + i;
        if (idx >= 0 && idx < string.points.length) {
            const distFactor = 1 - Math.abs(i) / width;
            string.points[idx].velocity += force * distFactor * (Math.random() * 0.4 + 0.6);
        }
    }
}
```

#### 4.2 Screen Shake (Tremor de Tela)
O canvas deve sofrer perturbações de posicionamento:

```javascript
let shakeTime = 0;
let shakeIntensity = 0;

function triggerScreenShake(duration, intensity) {
    shakeTime = duration;
    shakeIntensity = intensity;
}

function applyScreenShake() {
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        canvas.style.transform = `translate(${dx}px, ${dy}px)`;
        shakeTime -= 16.67; // Subtrai frame rate aproximado
        if (shakeTime <= 0) {
            canvas.style.transform = 'translate(0px, 0px)';
        }
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

Para garantir que a performance permaneça ideal sob múltiplas notas e holds ativos:

1. **Gestão de AudioContexts**: O AudioContext pode ser bloqueado nos navegadores modernos até um clique físico. A inicialização contida na classe `synth.init()` vinculada a qualquer mousedown/click resolve essa política.
2. **Estabilidade de FPS com Ripple**: Propagar ripple para 5 cordas ao mesmo tempo faz com que 500 pontos recalculem velocidades de forma sutil. A física simples `velocity *= 0.95` e `y = originalY + velocity` é extremamente otimizada e não causará lentidão.
3. **Limitação de Teclas**: O jogo possui apenas jogabilidade por clique. Na inclusão de novas notas especiais, preservaremos a interação padrão de clique e mousedown por zona.

### ❓ Dúvidas do Desenvolvedor (Dev) para o TL ou o PO

Abaixo estão os pontos que necessitam de alinhamento antes do início do desenvolvimento:

1. **Interação entre Sintetizador Procedural e Áudio Customizado**: O sintetizador deve reproduzir as notas harmônicas pentatônicas *por cima* da música carregada pelo usuário (modo customizado) ou essa síntese de cliques deve ser opcional/silenciada para evitar poluição sonora?
2. **Layout e Posicionamento do Menu de Temas**: O painel de temas visuais (Retro Cyberpunk, Vaporwave, Cosmic Nebula) deve ser integrado dentro do menu de parâmetros lateral existente (`.controls`) ou deve ser criada uma nova interface/dropdown glassmorphic flutuante e independente na tela?
3. **Ripple Effect com Movimento do Mouse**: Quando o mouse passa por cima das cordas vibrando-as (movimento padrão), esse movimento também deve propagar o ripple para as cordas vizinhas, ou o ripple é ativado exclusivamente pela captura perfeita de notas de jogo?

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Interação entre Sintetizador e Áudio Customizado**: **Decisão:** O som de sintetizador de clicks deve ser sutil e opcional. Ao carregar a própria música, a opção deve continuar gerando o som procedural leve sobre a trilha para o "game feel", mas inclua o controle (toggle) para mutá-lo se a poluição ficar muito grande.
2. **Layout do Menu de Temas**: **Decisão:** Um novo dropdown elegante e integrado no painel esquerdo atual (controls) é preferível para manter a UI concentrada e o canvas limpo.
3. **Ripple Effect com Movimento do Mouse**: **Decisão:** O movimento passivo do mouse sobre a corda deve propagar um ripple em menor escala (força = 15-20%) enquanto o clique exato numa nota propaga a força máxima (100%).

---

## 🚀 Status do Desenvolvimento

* **Identificação do Jogo**: `visual_effects` (String Catcher)
* **Status**: `✅ Concluída (Done)`
* **Resumo da Implementação**:
  - **3 Temas Visuais Dinâmicos**: Cyberpunk (Neon 3D Perspective Grid), Vaporwave (Retro Dusk Gradient + Wireframe Pulsing Sun), e Nebula (Fluid Rotating Orbital Stardust).
  - **Partículas por Tema**: Faíscas quadradas pixeladas (Cyberpunk), bolhas translúcidas (Vaporwave) e estrelas cadentes (Nebula).
  - **Sintetizador Procedural Web Audio API**: Suporte a Sine Wave, Triangle Wave e Sawtooth Wave com envelope ADSR.
  - **Escala Pentatônica Menor de Lá (A Minor Pentatonic)**: Mapeamento de notas sonoras harmônicas por corda.
  - **Notas Especiais**:
    - **Estrela de Frenesi (Frenzy Note)**: Ativa o Modo Frenesi por 8s com pontuação x2, efeito arco-íris e HUD neon.
    - **Coração de Proteção (Shield Note)**: Concede 1 escudo de proteção com aura circular neon contra minas ou notas perdidas.
  - **Game Feel & Física**: Distorção ondulatória (Ripple Effect) propagando forças pelas cordas vizinhas e Screen Shake (tremor de tela) em momentos de alto impacto.

*Assinado: Software Engineer - Antigravity*

---

## 🔍 Code Review

* **Status**: `Aprovado (Approved) ✅`
* **Data da Revisão**: 02/08/2026
* **Revisor**: Tech Lead - Antigravity

### 📋 Avaliação Técnica e Arquitetural:
1. **Temas Visuais Dinâmicos & Renderização de Partículas**:
   - `drawThemeBackground()` implementa com maestria os 3 estilos (Retro Cyberpunk, Vaporwave Sunset e Cosmic Nebula) com reatividade completa aos graves do áudio via Web Audio API FFT (`audioBass`).
   - O sistema de partículas `emitThemeParticles` diferencia perfeitamente as faíscas neon pixeladas, bolhas translúcidas e estrelas cadentes com ciclos de vida e descarte de memória limpos (`filter(s => s.life > 0)`).
2. **Notas Especiais & Modos de Jogo**:
   - `frenzy`: Estrela de 5 pontas renderizada proceduralmente com rotação HSL arco-íris, HUD dedicado de tempo regressivo e dobrador de multiplicador de combo funcional.
   - `shield`: Formato de escudo vetorizado com aura giratória neon na zona de captura e desacoplamento perfeito para absorver impacto de minas ou notas perdidas.
3. **Sintetizador Procedural Web Audio API & Escala Pentatônica**:
   - Classe `ProceduralSynth` madura com envelopes ADSR para eliminar cliques nas caixas de som e mapeamento transparente de notas na escala pentatônica menor de Lá (A3 a G6).
   - Suporte completo às 3 formas de onda (Sine, Triangle, Sawtooth) e chave de comutação (toggle) de áudio respeitando as preferências do usuário.
4. **Game Feel (Juiciness)**:
   - `triggerRipple`: Propagação ondulatória de forças físicas senoidais para as cordas vizinhas com decaimento suave.
   - `triggerScreenShake`: Tremor de tela sintonizado para eventos críticos sem degradação de performance.

### 🚀 Veredito:
O código atende integralmente a todos os critérios de aceitação, padrões arquiteturais, performance e boas práticas do projeto. **Aprovado para a etapa de Garantia de Qualidade (Ready for QA)!**

*Assinado: Tech Lead veterano - Antigravity*



