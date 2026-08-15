# 📝 TASK-VISUAL_EFFECTS: Modo Campanha de Level Design Rítmico (Synth Odyssey), Editor Visual de Fases (Beatmap Studio), Sistema de Precisão Milimétrica (Hit Windows) e Super Carga Overdrive

## 👤 User Story
*   **Como** fã e jogador entusiasta de jogos rítmicos no minijogo **String Catcher** (String Catcher / Visual Effects),
*   **Eu quero** jogar uma campanha rítmica com 5 fases artesanais e uma batalha contra chefe, criar e testar minhas próprias fases através de um editor visual de beatmaps intuitivo, e ser avaliado por um sistema de precisão milimétrica de hit windows com ativador de Super Carga Overdrive,
*   **Para que** a experiência de jogabilidade e level design seja extremamente envolvente, desafiadora, justa, personalizável e proporcione alta retenção e competitividade.

---

## 🎯 Critérios de Aceitação

1.  **Modo Campanha de Level Design Rítmico ("Synth Odyssey - 5 Fases Artesanais & Boss Battle")**:
    *   Implementar um menu de Seleção de Fases na Campanha com 5 fases temáticas projetadas com curva de aprendizado e level design rítmico progressivo:
        *   **Fase 1: "Neon Genesis" (Dificuldade: Fácil | 110 BPM)**: Fase introdutória. Foco em notas simples e acertos no tempo das cordas centrais. Velocidade de queda moderada e densidade reduzida de notas para habituação do jogador.
        *   **Fase 2: "Cyber Highway" (Dificuldade: Média | 128 BPM)**: Introdução de Hold Notes duplas simultâneas (acordes rítmicos) e alternância rápida de cordas adjacentes.
        *   **Fase 3: "Warp Acceleration" (Dificuldade: Difícil | 145 BPM)**: Introdução da mecânica de *Zonas Gravitacionais (Warp Lanes)* onde a velocidade das notas oscila sinusoidalmente ao longo da faixa (aceleração e desaceleração de visualização), exigindo leitura antecipada.
        *   **Fase 4: "Quantum Glitch" (Dificuldade: Insana | 160 BPM)**: Introdução de *Notas de Inversão de Vibração (Glitch Notes)* que alteram o padrão de ondulação das cordas e minas móveis que transitam horizontalmente entre cordas no tempo do compasso.
        *   **Fase 5: "Cybernetic Kraken" (Dificuldade: Boss Battle | 175 BPM)**: Batalha de Chefe em 3 Estágios! O Kraken Rítmico surge no topo do canvas e bloqueia cordas ativas com tentáculos de plasma. O jogador deve manter o combo e acumular a carga Overdrive para disparar o "Hyper Beam Defletor" e infligir dano ao chefe antes do fim da faixa musical.

2.  **Editor Visual de Fases (Beatmap Studio & Custom Level Creator)**:
    *   Criar uma interface modal/painel glassmorphic dedicada para que o jogador possa projetar suas próprias fases rítmicas personalizadas:
        *   **Timeline Rítmica Rolável**: Linha do tempo com suporte a marcadores de compasso (Grid Snapping em 1/4, 1/8 e 1/16 de batida) e ajuste dinâmico de BPM (60 a 240 BPM).
        *   **Paleta de Pincéis de Notas**: Ferramentas para alocar notas em qualquer uma das 5 cordas: Nota Simples, Hold Note (com ajuste de comprimento da cauda), Mina Obstáculo, Estrela de Frenesi (Frenzy Note) e Coração de Proteção (Shield Note).
        *   **Modo Playtest Instantâneo**: Botão de "Test-Play (Preview)" com atalho de teclado (`Espaço`) permitindo testar o beatmap a partir da posição exata da timeline e retornar imediatamente ao editor para ajustes finos.
        *   **Persistência e Exportação/Importação JSON**: Capacidade de salvar a fase personalizada no `localStorage` ou exportar/importar um arquivo `.json` formatado para fácil compartilhamento entre os jogadores da comunidade.

3.  **Sistema de Precisão Milimétrica (Hit Windows) e Avaliação de Ranks (Grade Scoring)**:
    *   **Classificação Cirúrgica de Janelas de Acerto**:
        *   🌟 **MARVELOUS**: Delta $\le \pm 22\text{ms}$ (100% Pontuação Base + 100% Carga Overdrive + Efeito de faíscas douradas e tom cristalino sintetizado em escala alta).
        *   ✨ **PERFECT**: Delta $\le \pm 45\text{ms}$ (80% Pontuação Base + 50% Carga Overdrive + faíscas ciano brilhantes).
        *   🎵 **GREAT**: Delta $\le \pm 80\text{ms}$ (50% Pontuação Base + 10% Carga Overdrive + brilho branco).
        *   ❌ **MISS**: Delta $> 80\text{ms}$ ou nota ultrapassa a zona de captura (0 Pontuação + Zera Combo + Perda de 1 Vontade/HP + Efeito sonoro de corda desafinada).
    *   **Floater Tático de Offset**: Exibir um indicador numérico flutuante de precisão em milissegundos no instante da captura (ex: `-14ms` para antecipado / `+9ms` para atrasado) com codificação visual por cores (Azul para Early, Laranja para Late, Dourado para Marvelous).
    *   **Tela de Resultados e Ranks de Desempenho**: Ao final da fase, exibir modal com o resumo analítico (% Marvelous, Max Combo, Offset Médio) e o Rank obtido:
        *   **S+**: 100% Full Marvelous.
        *   **S**: Full Combo (sem nenhum MISS).
        *   **A**: Pontuação $\ge 90\%$.
        *   **B**: Pontuação $\ge 80\%$.
        *   **C**: Pontuação $\ge 70\%$.
        *   **F**: Reprovado / HP zerado.

4.  **Mecânica de Super Carga OVERDRIVE & Áudio Procedural Avançado**:
    *   **Barra de Super Carga (Overdrive Gauge)**: Preenchida progressivamente ao acertar notas nas janelas *Marvelous* e *Perfect*. Ao atingir 100%, o jogador pode pressionar a tecla `Espaço` (ou botão na HUD) para ativar o **SUPER OVERDRIVE**.
    *   **Efeito Overdrive**: Durante 10 segundos, o multiplicador de pontos é quadruplicado (**4x**), o fundo gráfico entra em modo Bullet-Time visual com gradiente dourado e ondas de energia neon piscam nas cordas a cada acerto.
    *   **Sintetizador Web Audio API Expandido**: Efeitos procedurais exclusivos para o disparo do Overdrive (sub-bass sweep de 60Hz a 240Hz), acertos Marvelous (arpejo cristalino octavado) e vitória contra o Chefe Kraken.

---

## 🛠️ Detalhes Técnicos e Diretrizes de Arquitetura

*   **Arquivo Alvo**: `/visual_effects/index.html`.
*   **Gerenciamento de Estados de Jogo**:
    *   Expandir a máquina de estados global para suportar `gameState = 'MENU' | 'CAMPAIGN_SELECT' | 'PLAYING' | 'BEATMAP_EDITOR' | 'RESULTS'`.
*   **Estrutura de Dados do Beatmap JSON**:
    ```json
    {
      "title": "Cybernetic Odyssey",
      "bpm": 140,
      "author": "Player1",
      "notes": [
        { "time": 1.25, "lane": 0, "type": "normal" },
        { "time": 1.75, "lane": 2, "type": "hold", "duration": 0.8 },
        { "time": 2.50, "lane": 4, "type": "mine" },
        { "time": 3.00, "lane": 1, "type": "frenzy" },
        { "time": 3.50, "lane": 3, "type": "shield" }
      ]
    }
    ```
*   **Fórmula Matemática de Cálculo de Hit Window Delta**:
    ```javascript
    const deltaMs = Math.abs(noteHitTimeSeconds - currentTimeSeconds) * 1000;
    if (deltaMs <= 22) return { rating: 'MARVELOUS', score: 1000, overdrive: 10, color: '#ffd700' };
    if (deltaMs <= 45) return { rating: 'PERFECT', score: 800, overdrive: 5, color: '#00f2fe' };
    if (deltaMs <= 80) return { rating: 'GREAT', score: 500, overdrive: 2, color: '#ffffff' };
    return { rating: 'MISS', score: 0, overdrive: 0, color: '#ff0055' };
    ```
*   **Editor Visual no Canvas/DOM**:
    *   Criar um componente visual com renderização de rampa de áudio/linha do tempo na parte inferior do canvas, permitindo zoom (scrolling com o mouse) e alocação de notas com o botão esquerdo.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Product Owner experiente em Level Design e Game Feel, desenhei e estruturei a especificação técnica para os 4 pilares de jogabilidade, permitindo que a implementação pelo desenvolvedor ocorra de forma limpa, robusta e modular.

### 1. Sistema de Fases da Campanha e Chefe Kraken Rítmico

As 5 fases artesanais serão registradas na constante global `CAMPAIGN_LEVELS`. O desenvolvedor deve instanciar a classe de gerenciamento de campanha para gerenciar o progresso e destravamento sequencial de fases.

```javascript
const CAMPAIGN_LEVELS = [
    {
        id: 1,
        title: "Neon Genesis",
        bpm: 110,
        difficulty: "Fácil",
        theme: "cyberpunk",
        description: "Introdução suave ao ritmo neon. Foque no tempo exato das notas centrais.",
        targetScore: 25000,
        boss: null,
        proceduralDensity: 0.35
    },
    {
        id: 2,
        title: "Cyber Highway",
        bpm: 128,
        difficulty: "Média",
        theme: "vaporwave",
        description: "Acordes duplos simultâneos e Hold Notes longas em alta velocidade.",
        targetScore: 50000,
        boss: null,
        proceduralDensity: 0.55
    },
    {
        id: 3,
        title: "Warp Acceleration",
        bpm: 145,
        difficulty: "Difícil",
        theme: "nebula",
        description: "Zonas de gravidade warp que aceleram e desaceleram as notas na batida.",
        targetScore: 80000,
        boss: null,
        proceduralDensity: 0.75
    },
    {
        id: 4,
        title: "Quantum Glitch",
        bpm: 160,
        difficulty: "Insana",
        theme: "cyberpunk",
        description: "Glitch Notes de inversão de vibração e minas rritmicamente móveis.",
        targetScore: 120000,
        boss: null,
        proceduralDensity: 0.90
    },
    {
        id: 5,
        title: "Cybernetic Kraken",
        bpm: 175,
        difficulty: "Boss Final",
        theme: "nebula",
        description: "Batalha final de chefe em 3 estágios! Use o Overdrive Hyper Beam para vencer.",
        targetScore: 180000,
        boss: {
            name: "Cybernetic Kraken",
            maxHp: 1000,
            currentHp: 1000,
            stage: 1, // Stage 1 (100%-66%), Stage 2 (66%-33%), Stage 3 (33%-0%)
            tentacleBlockedLanes: []
        },
        proceduralDensity: 1.0
    }
];
```

#### Renderização e Lógica do Chefe Kraken
No topo da tela (`y: 60`), o Kraken Rítmico é desenhado com tentáculos bioluminescentes que descem bloqueando 1 ou 2 cordas nos Estágios 2 e 3:

```javascript
function drawBossKraken(ctx, bossState) {
    if (!bossState) return;
    
    const time = Date.now() * 0.003;
    const centerX = canvas.width / 2;
    const centerY = 70;
    
    ctx.save();
    // Brilho de aura do chefe
    const auraGrad = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, 90);
    auraGrad.addColorStop(0, 'rgba(255, 0, 128, 0.4)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 90, 0, Math.PI * 2);
    ctx.fill();
    
    // Núcleo do Kraken (Olho Quântico)
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0055';
    ctx.beginPath();
    ctx.arc(centerX, centerY + Math.sin(time) * 5, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupila laser pulsante
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY + Math.sin(time) * 5, 10 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Renderizar Tentáculos sobre as cordas bloqueadas
    for (const laneIdx of bossState.tentacleBlockedLanes) {
        const laneY = strings[laneIdx] ? strings[laneIdx].y : 200;
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.7)';
        ctx.lineWidth = 12;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.quadraticCurveTo(canvas.width * 0.3, (centerY + laneY) / 2, 50, laneY);
        ctx.stroke();
    }
    
    // Barra de Vida de HP do Chefe na HUD Superior
    const barWidth = 300;
    const barHeight = 14;
    const barX = centerX - barWidth / 2;
    const barY = 15;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    const hpRatio = Math.max(0, bossState.currentHp / bossState.maxHp);
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    hpGrad.addColorStop(0, '#ff0055');
    hpGrad.addColorStop(1, '#ff6600');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${bossState.name} — STAGE ${bossState.stage} (${Math.ceil(hpRatio * 100)}%)`, centerX, barY - 4);
    ctx.restore();
}
```

---

### 2. Editor Visual de Fases (Beatmap Studio)

O Beatmap Studio permite posicionar notas com precisão na linha do tempo usando escuta ativa de cliques e manipulação de objetos no array `currentCustomBeatmap.notes`.

```javascript
class BeatmapEditor {
    constructor() {
        this.active = false;
        this.currentTime = 0;
        this.bpm = 120;
        this.selectedLane = 0;
        this.selectedType = 'normal'; // 'normal' | 'hold' | 'mine' | 'frenzy' | 'shield'
        this.snapGrid = 0.25; // 1/4 beat
        this.zoom = 100; // Pixels por segundo na timeline
        this.notes = [];
    }

    addNoteAt(time, lane, type, duration = 0) {
        // Aplica o grid snapping
        const beatDuration = 60 / this.bpm;
        const snapInterval = beatDuration * this.snapGrid;
        const snappedTime = Math.round(time / snapInterval) * snapInterval;

        // Evita notas duplicadas exatamente no mesmo instante e corda
        const existingIdx = this.notes.findIndex(n => Math.abs(n.time - snappedTime) < 0.05 && n.lane === lane);
        if (existingIdx !== -1) {
            this.notes.splice(existingIdx, 1); // Alterna (toggle) desmarcando
            return;
        }

        this.notes.push({
            time: Number(snappedTime.toFixed(3)),
            lane: lane,
            type: type,
            duration: type === 'hold' ? duration || beatDuration : 0
        });

        // Mantém as notas ordenadas cronologicamente
        this.notes.sort((a, b) => a.time - b.time);
    }

    exportJSON() {
        return JSON.stringify({
            title: "Custom Level",
            bpm: this.bpm,
            author: "Player",
            notes: this.notes
        }, null, 2);
    }

    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.bpm = data.bpm || 120;
            this.notes = data.notes || [];
            this.notes.sort((a, b) => a.time - b.time);
            return true;
        } catch (e) {
            console.error("Falha ao importar Beatmap JSON:", e);
            return false;
        }
    }
}
```

---

### 3. Sistema de Precisão Milimétrica (Hit Windows & Offset Floaters)

Ao registrar a colisão/captura de uma nota na zona de acerto, calculamos o atraso ou adiantamento em milissegundos e geramos o floater numérico animado:

```javascript
let activeHitFloaters = [];

function evaluateHitPrecision(noteTimeSeconds, currentTimeSeconds, hitX, hitY) {
    const deltaMs = (currentTimeSeconds - noteTimeSeconds) * 1000;
    const absDelta = Math.abs(deltaMs);
    
    let result = { rating: 'MISS', score: 0, overdriveAdd: 0, color: '#ff0055', label: 'MISS' };
    
    if (absDelta <= 22) {
        result = { rating: 'MARVELOUS', score: 1000, overdriveAdd: 10, color: '#ffd700', label: 'MARVELOUS!' };
    } else if (absDelta <= 45) {
        result = { rating: 'PERFECT', score: 800, overdriveAdd: 5, color: '#00f2fe', label: 'PERFECT' };
    } else if (absDelta <= 80) {
        result = { rating: 'GREAT', score: 500, overdriveAdd: 2, color: '#ffffff', label: 'GREAT' };
    }
    
    // Adicionar floater textual de feedback com offset em milissegundos
    const signStr = deltaMs > 0 ? `+${Math.round(deltaMs)}ms` : `${Math.round(deltaMs)}ms`;
    activeHitFloaters.push({
        x: hitX,
        y: hitY - 20,
        text: `${result.label} (${signStr})`,
        color: result.color,
        life: 1.0,
        vy: -1.2
    });
    
    return result;
}

function updateAndDrawHitFloaters(ctx) {
    for (let i = activeHitFloaters.length - 1; i >= 0; i--) {
        const f = activeHitFloaters[i];
        f.y += f.vy;
        f.life -= 0.025;
        
        if (f.life <= 0) {
            activeHitFloaters.splice(i, 1);
            continue;
        }
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = f.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = f.color;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
    }
}
```

---

### 4. Super Carga OVERDRIVE & Áudio Procedural Expandido

O estado de Overdrive é controlado pelas variáveis globais `overdriveGauge` (0 a 100) e `isOverdriveActive` (boolean).

```javascript
let overdriveGauge = 0;
let isOverdriveActive = false;
let overdriveTimer = 0;

function addOverdriveEnergy(amount) {
    if (isOverdriveActive) return;
    overdriveGauge = Math.min(100, overdriveGauge + amount);
}

function triggerSuperOverdrive() {
    if (overdriveGauge < 100 || isOverdriveActive) return;
    
    isOverdriveActive = true;
    overdriveGauge = 0;
    overdriveTimer = 10.0; // 10 segundos de duração
    
    // Efeito Sonoro de Sub-Bass Sweep com Web Audio API
    if (synth && synth.ctx) {
        const now = synth.ctx.currentTime;
        const osc = synth.ctx.createOscillator();
        const gain = synth.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.6);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.connect(gain);
        gain.connect(synth.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.8);
    }
    
    // Screen shake intenso de ativação
    triggerScreenShake(400, 12);
}

function updateOverdriveState(dt) {
    if (isOverdriveActive) {
        overdriveTimer -= dt;
        if (overdriveTimer <= 0) {
            isOverdriveActive = false;
            overdriveTimer = 0;
        }
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Dificuldade de Desempenho no Beatmap Studio em Resoluções Baixas**: A timeline rolável do editor de fases pode ocupar bastante espaço em telas pequenas ou dispositivos móveis. **Recomendação**: Adicionar botão de alternância para recolher os controles do editor e manter o foco visual na grade de notas.
2.  **Dano de Overdrive no Chefe Kraken**: Quando o Super Overdrive é ativado na Fase 5 (Kraken), o acerto das notas deve disparar um feixe de energia *Hyper Beam* visual que reduz o HP do chefe em 50 pontos por nota capturada.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1.  **Layout Responsivo do Editor**: **Aprovado.** O desenvolvedor deve implementar um botão "Recolher Timeline" (`Collapse Studio`) para que telas de resolução inferior a 1280px preservem a visão limpa das 5 cordas.
2.  **Interação Hyper Beam vs Kraken**: **Aprovado com louvor!** O feixe dourado de energia conectando a zona de acerto ao Kraken durante o Overdrive gera um impacto de game feel incrível e clareza visual impecável para a batalha final de chefe.

---

*Assinado: Antigravity — Senior Game Product Owner (PO)*
