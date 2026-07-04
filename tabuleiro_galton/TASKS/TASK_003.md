# 📝 TASK-TABULEIRO_GALTON: Modo Desafio (Target Fitting), Pinos Especiais (Teleportes, Multiplicadores e Gravidade) e Áudio Sintetizado via Web Audio API

## 👤 User Story
*   **Como** jogador entusiasta de simuladores físicos e puzzles matemáticos no **Galton Board**,
*   **Eu quero** tentar ajustar a distribuição física de esferas a curvas alvo (Target Fitting), interagir com pinos especiais que alteram a trajetória e multiplicam as bolinhas, e escutar uma sonorização gerada em tempo real via Web Audio API,
*   **Para que** a simulação se transforme em um jogo envolvente, repleto de desafios lógicos, mecânicas arcade dinâmicas e uma estética sonora premium imersiva.

---

## 🎯 Critérios de Aceitação

1.  **Modo Desafio (Target Fitting / Desafios Estatísticos)**:
    *   Implementar um painel de seleção com 3 desafios de distribuição:
        *   *Desafio 1: Curva Inclinada (Skewed Right)*: Configura a probabilidade binomial (`probabilityRight`) para 0.7. O jogador deve acumular 100 bolinhas nos coletores e atingir um Erro Quadrático Médio (MSE) inferior a 0.015 em relação à distribuição teórica deslocada para obter sucesso.
        *   *Desafio 2: Divisão Bimodal (Twin Peaks)*: Utilizando o layout bimodal, o objetivo é preencher duas colunas específicas (ex: Coluna 3 e Coluna 12) com pelo menos 25 bolinhas cada, sem que as colunas centrais (de 6 a 9) passem de 10 bolinhas.
        *   *Desafio 3: Grade Uniforme Perfeita*: Utilizando o layout uniforme, o jogador deve balancear as 16 colunas. A diferença entre a coluna com mais esferas e a coluna com menos esferas não pode ser maior que 15 bolinhas após disparar exatamente 120 esferas.
    *   Exibir uma curva-alvo semi-transparente tracejada neon em amarelo (`#ffeb3b`) no Canvas para guiar o jogador visualmente.
    *   Adicionar um indicador visual no HUD (DOM) mostrando a porcentagem atual de aderência (Match %) e o progresso do desafio ativo.

2.  **Pinos Especiais (Interactive Peg Modifiers)**:
    *   *Pino de Teletransporte (Portal Pegs)*: Spawnar um par de pinos especiais (um Azul Neon `#00d2ff` e outro Laranja Neon `#ff9f43`). Ao colidir com o pino de entrada (Azul), a bolinha é instantaneamente teletransportada para o pino de saída (Laranja), mantendo a magnitude de sua velocidade com um vetor ligeiramente inclinado para baixo.
    *   *Pino Multiplicador (Splitter Peg)*: Um pino Roxo Neon (`#b833ff`) pulsante. Ao ser colidido, a bolinha original é desintegrada e duas novas bolinhas menores de cor verde brilhante são ejetadas em direções opostas de 45° com velocidade de impulso.
    *   *Pino Gravitacional (Vortex Peg)*: Um pino com uma aura espiralizada Ciano Neon (`#00ffcc`). Ele exerce atração gravitacional radial contínua sobre qualquer bolinha que passe em um raio de 40px, curvando sua trajetória.

3.  **Web Audio API Synth (Sonorização Procedural Dinâmica)**:
    *   *Sons de Colisão*: Síntese em tempo real usando osciladores (sine/triangle) com frequências mapeadas de acordo com a posição horizontal (eixo X) ou vertical (eixo Y) do pino atingido, seguindo a escala pentatônica maior (frequências de 130Hz a 1046Hz, correspondente às notas C3 a C6).
    *   *Sons Especiais*: Efeitos dedicados de sweep de frequência ascendente para teletransportes, arpejo duplo rápido para multiplicação, e fanfarra harmônica alegre para vitória.
    *   *Design sem Assets*: Sem dependências de arquivos de som externos. O contexto de áudio deve ser ativado após o primeiro clique do usuário para contornar restrições dos navegadores.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/tabuleiro_galton/index.html`.
*   **Controle de Estado do Desafio**:
    *   Variáveis globais `currentChallenge = null`, `challengeProgress = 0`, `targetCurve = []`.
    *   Cálculo do Erro Quadrático Médio (MSE):
        $$MSE = \frac{1}{M} \sum_{i=0}^{M-1} (P_{real}(i) - P_{target}(i))^2$$
        Onde $P_{real}(i)$ é a proporção de bolinhas na coluna $i$ (`bins[i].count / totalCollected`) e $P_{target}(i)$ é o valor teórico esperado.
*   **Lógica de Pinos Especiais**:
    *   Pinos normais em `pegs` receberão uma propriedade `type` (`'normal'`, `'portal-in'`, `'portal-out'`, `'splitter'`, `'vortex'`).
    *   No loop de física, realizar varreduras de proximidade para os pinos do tipo `'vortex'` aplicando acelerações radiais:
        $$\vec{a}_{vortex} = \frac{G_{vortex} \cdot (\vec{x}_{vortex} - \vec{x}_{ball})}{|\vec{x}_{vortex} - \vec{x}_{ball}|^3}$$
*   **Otimização do Splitter**:
    *   Garantir um teto rígido de bolinhas ativas (`MAX_BALLS = 150`). Se a contagem de bolinhas exceder este limite, desativar temporariamente o efeito de duplicação do splitter (agindo como um pino elástico comum) para poupar CPU.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Aumenta significativamente a retenção de usuários ao introduzir objetivos tangíveis, variedade tática e feedbacks de juice auditivos e visuais de alta qualidade).
*   **Esforço Estimado**: Média (Toda a lógica está contida no arquivo único HTML5/Canvas/JS).
*   **Área**: Front-end / Canvas 2D / Web Audio API / Game Design.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os métodos, estruturas de dados e equações para a codificação da funcionalidade.

### 1. Modelagem dos Desafios e Interface

Criaremos uma estrutura de dados `CHALLENGES` para gerenciar os estados e regras de validação de sucesso de cada nível:

```javascript
const CHALLENGES = {
    skewed: {
        id: 'skewed',
        name: 'Desafio 1: Curva Inclinada',
        description: 'Dispare esferas com viés de 70% à direita e alcance MSE < 0.015 em relação à teórica.',
        targetBalls: 100,
        setup: () => {
            probabilityRight = 0.7;
            probSlider.value = 0.7;
            layoutSelector.value = 'triangle';
            setup(); // Recria pinos no layout triangular
        },
        check: () => {
            const collected = bins.reduce((sum, b) => sum + b.count, 0);
            if (collected < 100) return { success: false, match: 0, msg: `Colete 100 bolinhas (${collected}/100)` };

            // Calcular MSE em relação à teórica
            const M = bins.length;
            const p = 0.7;
            const mean = (M - 1) * p;
            const sigma = Math.sqrt((M - 1) * p * (1 - p));
            let sumSqError = 0;

            for (let i = 0; i < M; i++) {
                const xStat = i;
                const exponent = -Math.pow(xStat - mean, 2) / (2 * Math.pow(sigma, 2));
                const targetPdf = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
                
                const realProp = bins[i].count / collected;
                sumSqError += Math.pow(realProp - targetPdf, 2);
            }
            const mse = sumSqError / M;
            const matchPercent = Math.max(0, Math.min(100, (1 - mse / 0.03) * 100));

            return {
                success: mse < 0.015,
                match: matchPercent,
                msg: `MSE: ${mse.toFixed(4)} (${matchPercent.toFixed(1)}% Match)`
            };
        }
    },
    bimodal: {
        id: 'bimodal',
        name: 'Desafio 2: Twin Peaks',
        description: 'Acumule pelo menos 25 bolinhas nas colunas 3 e 12, com menos de 10 nas colunas centrais.',
        setup: () => {
            layoutSelector.value = 'bimodal';
            setup();
        },
        check: () => {
            const col3 = bins[3]?.count || 0;
            const col12 = bins[12]?.count || 0;
            const centralSum = (bins[6]?.count || 0) + (bins[7]?.count || 0) + (bins[8]?.count || 0) + (bins[9]?.count || 0);

            const success = col3 >= 25 && col12 >= 25 && centralSum <= 10;
            const matchPercent = Math.min(100, ((Math.min(col3, 25) + Math.min(col12, 25)) / 50) * 100 * (centralSum > 10 ? 0.3 : 1.0));

            return {
                success: success,
                match: matchPercent,
                msg: `Esquerda (Col 3): ${col3}/25 | Direita (Col 12): ${col12}/25 | Centro: ${centralSum}/10`
            };
        }
    },
    uniform: {
        id: 'uniform',
        name: 'Desafio 3: Grade Uniforme',
        description: 'Dispare exatamente 120 esferas. A diferença máxima entre a maior e a menor coluna deve ser <= 15.',
        setup: () => {
            layoutSelector.value = 'uniform';
            setup();
        },
        check: () => {
            const collected = bins.reduce((sum, b) => sum + b.count, 0);
            if (collected < 120) return { success: false, match: 0, msg: `Dispare 120 bolinhas (${collected}/120)` };

            const counts = bins.map(b => b.count);
            const maxVal = Math.max(...counts);
            const minVal = Math.min(...counts);
            const diff = maxVal - minVal;

            const success = diff <= 15;
            const matchPercent = Math.max(0, Math.min(100, (1 - (diff - 15) / 30) * 100));

            return {
                success: success && collected >= 120,
                match: matchPercent,
                msg: `Diferença Máxima: ${diff} (Meta <= 15) | Bolinhas: ${collected}/120`
            };
        }
    }
};
```

*   **Plotagem da Curva Amarela Alvo**:
    No Canvas, se houver um desafio ativo, desenhar a linha pontilhada da curva teórica ou metas estipuladas em amarelo neon (`#ffeb3b`) com `ctx.setLineDash([5, 5])`.

### 2. Implementação de Pinos Especiais

Em `setup()`, ao povoar a lista de pinos, substituiremos alguns pinos estáticos por tipos especiais de maneira determinística com base nas linhas ou posições:

```javascript
function assignSpecialPegs() {
    if (pegs.length < 20) return;

    // 1. Teleport Portal In (linha do meio, esquerda)
    const portalInIndex = Math.floor(pegs.length * 0.4);
    if (pegs[portalInIndex]) {
        pegs[portalInIndex].type = 'portal-in';
        pegs[portalInIndex].color = '#00d2ff';
    }

    // 2. Teleport Portal Out (linha do meio, direita)
    const portalOutIndex = Math.floor(pegs.length * 0.6);
    if (pegs[portalOutIndex]) {
        pegs[portalOutIndex].type = 'portal-out';
        pegs[portalOutIndex].color = '#ff9f43';
    }

    // 3. Splitter Peg (próximo ao topo, no centro)
    const splitterIndex = Math.floor(pegs.length * 0.15);
    if (pegs[splitterIndex]) {
        pegs[splitterIndex].type = 'splitter';
        pegs[splitterIndex].color = '#b833ff';
    }

    // 4. Vortex Peg (linha inferior, centro)
    const vortexIndex = Math.floor(pegs.length * 0.8);
    if (pegs[vortexIndex]) {
        pegs[vortexIndex].type = 'vortex';
        pegs[vortexIndex].color = '#00ffcc';
    }
}
```

*   **Física do Teletransporte e Multiplicação**:
    No loop de detecção de colisão bola-pino:
    ```javascript
    if (peg.type === 'portal-in') {
        const portalOut = pegs.find(p => p.type === 'portal-out');
        if (portalOut) {
            ball.x = portalOut.x;
            ball.y = portalOut.y + portalOut.radius + ball.radius + 2;
            ball.vy = Math.abs(ball.vy) * 1.05; // Impulso vertical suave
            ball.vx = (Math.random() - 0.5) * 2;
            playAudio('teleport');
            continue; // Evita processar a colisão física padrão neste frame
        }
    }

    if (peg.type === 'splitter' && balls.length < 150) {
        ball.active = false; // Desintegra a bola atual
        
        // Dispara duas novas bolinhas neon verde
        const angle1 = -Math.PI / 4; // -45 graus
        const angle2 = -Math.PI * 3 / 4; // -135 graus (desvio lateral para cima)
        const speed = 2.5;

        balls.push({
            x: peg.x - 10,
            y: peg.y + peg.radius + 6,
            vx: Math.cos(angle2) * speed,
            vy: Math.abs(Math.sin(angle2) * speed),
            radius: ballRadius,
            color: '#39ff14', // Verde Neon
            active: true
        });

        balls.push({
            x: peg.x + 10,
            y: peg.y + peg.radius + 6,
            vx: Math.cos(angle1) * speed,
            vy: Math.abs(Math.sin(angle1) * speed),
            radius: ballRadius,
            color: '#39ff14', // Verde Neon
            active: true
        });
        playAudio('split');
        continue;
    }
    ```

### 3. Motor de Áudio Procedural (Web Audio Synth)

Desenhar um sintetizador simples sem assets que instancia osciladores temporários para evitar gargalos de memória e gerenciar notas de acordo com a escala pentatônica:

```javascript
let audioCtx = null;
const PENTATONIC_SCALE = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // Notas C3 a C6

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playCollisionTone(xPos) {
    if (!audioCtx) return;
    
    // Mapeia X da colisão para um índice da escala pentatônica
    const xRatio = Math.max(0, Math.min(1, xPos / canvasWidth));
    const scaleIndex = Math.floor(xRatio * PENTATONIC_SCALE.length);
    const frequency = PENTATONIC_SCALE[scaleIndex] || 261.63;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle'; // Som suave retro
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Envelope de ganho (volume decai rápido para evitar ruído acumulado)
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playAudio(type) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    if (type === 'teleport') {
        // Sweep de frequência ascendente rápida
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'split') {
        // Bi-tom rápido descendo
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(400, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } else if (type === 'victory') {
        // Pequeno arpejo de triunfo (C4 -> E4 -> G4 -> C5)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, index) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.1);
            g.gain.setValueAtTime(0.1, audioCtx.currentTime + index * 0.1);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + index * 0.1 + 0.25);
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start(audioCtx.currentTime + index * 0.1);
            o.stop(audioCtx.currentTime + index * 0.1 + 0.25);
        });
    }
}
```

---

## 🛠️ Notas de Implementação Requeridas

*   **Interceptação do Primeiro Clique**:
    Adicionar um escutador global que chame `initAudio()` ao primeiro clique na janela ou no canvas, garantindo que o `audioCtx` seja devidamente inicializado no estado liberado (*running*).
*   **Controles DOM do Desafio**:
    Criar uma seção no painel lateral `sidebar-container` contendo o seletor de Desafio e um botão de ação "Iniciar Desafio" / "Cancelar", além de uma caixa de informações que reporte o status atual da checagem (`match %` e mensagem de instrução).

*Assinado: Antigravity - Senior Game Product Owner (PO)*
