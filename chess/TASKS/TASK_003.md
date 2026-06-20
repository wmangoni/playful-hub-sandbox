# 📝 TASK-CHESS-003: Relógio de Xadrez Dinâmico, Desafios Táticos (Modo Puzzle) e Efeitos Premium de Juiciness & Áudio Sintetizado

## 👤 User Story
*   **Como** jogador competitivo no minijogo **Chess**,
*   **Eu quero** poder jogar contra o relógio em diferentes controles de tempo clássicos (Bullet, Blitz, Rápida), treinar táticas de xeque-mate e garfos com uma suite de quebra-cabeças (puzzles) integrados, e receber feedback multissensorial dinâmico (tique-taque tenso, efeitos sonoros sintetizados em tempo real, tremores de tela e flashes neon nas capturas),
*   **Para que** eu possa experimentar a adrenalina de torneios oficiais de xadrez de alta velocidade, aprimorar minhas habilidades táticas de forma didática e desfrutar de um game feel extremamente moderno e imersivo.

---

## 🎯 Critérios de Aceitação

1.  **Relógio de Xadrez Digital Duplo (Chess Clock)**:
    *   Exibir dois visores digitais independentes estilo neon/glassmorphism (um para as Brancas, outro para as Pretas) acoplados ao painel lateral do jogo.
    *   Oferecer um menu de controles de tempo clássicos e incrementos (padrão FIDE):
        *   *Bullet (1+0)*: 1 minuto, sem incremento por lance.
        *   *Blitz (3+2)*: 3 minutos, com 2 segundos adicionados por lance (sistema Fischer).
        *   *Blitz (5+0)*: 5 minutos, sem incremento.
        *   *Rápida (10+0)*: 10 minutos, sem incremento.
        *   *Zen (Sem tempo)*: Modo clássico ilimitado.
    *   Descontar o tempo em centésimos de segundo em tempo real a cada frame durante o turno ativo de cada jogador.
    *   **Alerta de Tempo Crítico**: Se o tempo restante de qualquer jogador ficar abaixo de 10 segundos:
        *   O respectivo visor deve piscar em vermelho brilhante (`#ff3b30`) com pulsações neon.
        *   Tocar um som sutil de "tique-taque" a cada segundo.
    *   **Derrota por Estouro de Tempo (Flagged / Lost on Time)**: Se o relógio zerar, interromper o jogo imediatamente, declarar vitória do oponente no log e mostrar um overlay dramático de Game Over.

2.  **Biblioteca de Desafios Táticos (Modo Puzzle)**:
    *   Criar um painel lateral retrátil chamado "Desafios Táticos" ou "Treinador de Táticas".
    *   Incluir uma biblioteca inicial de 3 puzzles táticos clássicos carregados a partir de FENs estáticas:
        1.  *Scholar's Mate (Mate em 1)*: FEN `r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1` -> Lance vencedor: `Qxf7#` (h5 to f7).
        2.  *Back Rank Mate (Mate do Corredor)*: FEN `6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1` -> Lance vencedor: `Rd8#` (d1 to d8).
        3.  *Knight Fork (Garfo Tático de Cavalo)*: FEN `r3k2r/ppp2ppp/8/3q4/2N5/8/PP3PPP/R3K2R w KQkq - 0 1` -> Lance vencedor: `Nxd6+` ou `Ne3` (dependendo do garfo. Para ser um garfo real de duplo ataque ao Rei e à Dama, vamos usar: FEN `r3k2r/ppp2ppp/8/8/1n1q4/8/PP3PPP/R3K2R b KQkq - 0 1` -> Lance vencedor: `Nc2+` (b4 to c2, dando garfo no Rei em e1 e na Torre/Dama).
    *   Ao iniciar um puzzle, pausar o jogo livre, carregar a FEN no tabuleiro e desabilitar lances incorretos.
    *   Se o jogador realizar o lance correto: Exibir uma animação verde gloriosa "SUCESSO TÁTICO!", tocar fanfarra neon e conceder pontuação de rating. Se errar, reiniciar o puzzle.

3.  **Áudio Sintetizado Dinâmico via Web Audio API**:
    *   Para mitigar bloqueios de reprodução de áudio de navegadores e garantir sons instantâneos sem depender de arquivos locais, sintetizar efeitos sonoros retrô-futuristas em tempo real usando osciladores:
        *   *Lance Normal*: Onda triangular curta de 800Hz deslizando para 120Hz em 0.04s.
        *   *Captura*: Onda dente-de-serra ruidosa a 250Hz decaindo de volume em 0.08s (impacto metálico).
        *   *Xeque*: Dois tons senoidais de 1100Hz e 1300Hz curtos e sucessivos (alerta agudo).
        *   *Vitória / Xeque-Mate*: Arpejo triunfal em acordes sintetizados brilhantes.

4.  **Estética Premium de Juiciness (Game Feel)**:
    *   **Tremor de Tela (Screen Shake)**: Ao dar xeque ou capturar peças maiores (Dama, Torres), aplicar efeito de vibração física no tabuleiro por 180ms.
    *   **Trilhas de Destaque Neon (Glow Highlights)**: A casa de origem e destino do último lance devem manter um rastro neon pulsante azul e verde respectivamente.
    *   **Explosão de Partículas SVG/Canvas**: Ao capturar uma peça, spawnar partículas neon coloridas que se espalham da casa atingida em trajetórias físicas parabólicas e desvanecem suavemente.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/chess/index.html` e scripts acoplados.
*   **Estrutura de Estado**:
    ```javascript
    const chessTimer = {
        white: 300000, // milissegundos (5 minutos)
        black: 300000,
        active: false,
        increment: 0,
        currentTurn: 'w',
        timerId: null,
        mode: '5+0'
    };
    
    const activePuzzle = {
        id: null,
        fen: null,
        solution: null, // ex: { from: 'h5', to: 'f7' }
        isSolving: false
    };
    ```
*   **Web Audio API Synth**:
    *   Utilizar um `AudioContext` global instanciado de forma preguiçosa no primeiro clique da página para contornar políticas de reprodução do navegador.
*   **Mapeamento de Capturas**:
    *   Interceptar a callback `onSnapEnd` ou `onDrop` do Chessboard.js para disparar os efeitos de tremor, síntese de áudio de capturas e emissão de partículas físicas.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (O relógio adiciona tensão de torneio e o modo puzzle expande consideravelmente a jogabilidade offline).
*   **Esforço Estimado**: Média-Alta (Gerenciamento de tempo em milissegundos acoplado ao loop de eventos do Chess.js e a síntese dinâmica de áudio exigem precisão tática).
*   **Área**: Front-end / Web Audio API / Lógica de Puzzles / CSS Animations & Particles.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão definidos a arquitetura, fórmulas matemáticas, trechos de código estruturados e CSS avançado para implementar todos os critérios estabelecidos com design futurista e alta performance a 60 FPS.

### 1. Sistema do Relógio de Xadrez (Chess Clock Engine)
O relógio atualizará a cada 10 milissegundos usando um `setInterval` de alta resolução. Ao final de cada lance, o incremento é adicionado ao tempo do jogador que acabou de jogar.

*   **Estrutura HTML dos Relógios Digitais**:
    Insira no topo do painel lateral ou acima do tabuleiro:
    ```html
    <div class="chess-clock-panel">
        <div class="clock-display" id="clock-black">
            <div class="clock-label">PRETAS</div>
            <div class="clock-time" id="time-black">05:00.00</div>
        </div>
        <div class="clock-display active" id="clock-white">
            <div class="clock-label">BRANCAS</div>
            <div class="clock-time" id="time-white">05:00.00</div>
        </div>
    </div>
    ```

*   **Estilização Neon/Glassmorphism (CSS)**:
    ```css
    .chess-clock-panel {
        display: flex;
        gap: 15px;
        width: 400px;
        margin-bottom: 12px;
    }
    .clock-display {
        flex: 1;
        background: rgba(255, 255, 255, 0.03);
        border: 2px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 8px 12px;
        text-align: center;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    }
    .clock-display.active {
        border-color: #00f5d4;
        box-shadow: 0 0 15px rgba(0, 245, 212, 0.25);
        background: rgba(0, 245, 212, 0.03);
    }
    .clock-label {
        font-size: 0.7rem;
        color: #888;
        letter-spacing: 1px;
        margin-bottom: 4px;
    }
    .clock-time {
        font-family: 'Share Tech Mono', 'Courier New', monospace;
        font-size: 1.6rem;
        font-weight: bold;
        color: #fff;
    }
    /* Estilo de Tempo Crítico */
    .clock-display.critical-time {
        border-color: #ff3b30;
        animation: critical-pulse 0.5s infinite alternate;
        background: rgba(255, 59, 48, 0.05);
    }
    .clock-display.critical-time .clock-time {
        color: #ff3b30;
        text-shadow: 0 0 8px rgba(255, 59, 48, 0.6);
    }
    @keyframes critical-pulse {
        from { box-shadow: 0 0 4px rgba(255, 59, 48, 0.2); }
        to { box-shadow: 0 0 16px rgba(255, 59, 48, 0.65); }
    }
    ```

*   **Lógica de Atualização e Incremento (JavaScript)**:
    ```javascript
    let clockTimer = null;
    let clockState = {
        white: 300000,
        black: 300000,
        increment: 0,
        active: false,
        lastTick: 0
    };

    function selectTimePreset(minutes, increment) {
        clearInterval(clockTimer);
        clockState.white = minutes * 60 * 1000;
        clockState.black = minutes * 60 * 1000;
        clockState.increment = increment * 1000;
        clockState.active = false;
        updateClockDisplay();
    }

    function startTimer() {
        if (clockState.active) return;
        clockState.active = true;
        clockState.lastTick = performance.now();
        
        clockTimer = setInterval(() => {
            const now = performance.now();
            const delta = now - clockState.lastTick;
            clockState.lastTick = now;
            
            const activeColor = game.turn(); // 'w' ou 'b'
            if (activeColor === 'w') {
                clockState.white = Math.max(0, clockState.white - delta);
                if (clockState.white === 0) handleTimeOut('w');
            } else {
                clockState.black = Math.max(0, clockState.black - delta);
                if (clockState.black === 0) handleTimeOut('b');
            }
            
            updateClockDisplay();
        }, 10);
    }

    function switchTurnsTimer() {
        if (!clockState.active) {
            startTimer();
            return;
        }
        
        // Aplica incremento ao jogador que acabou de jogar
        // Se a FEN indica que agora é a vez das Pretas ('b'), quem jogou foi Brancas ('w')
        const justPlayed = game.turn() === 'b' ? 'w' : 'b';
        
        if (justPlayed === 'w') {
            clockState.white += clockState.increment;
            document.getElementById('clock-white').classList.remove('active');
            document.getElementById('clock-black').classList.add('active');
        } else {
            clockState.black += clockState.increment;
            document.getElementById('clock-black').classList.remove('active');
            document.getElementById('clock-white').classList.add('active');
        }
        
        updateClockDisplay();
    }

    function formatTime(ms) {
        const totalSecs = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        
        const mStr = String(minutes).padStart(2, '0');
        const sStr = String(seconds).padStart(2, '0');
        const cStr = String(centiseconds).padStart(2, '0');
        
        if (minutes < 1) {
            return `${sStr}.${cStr}`; // Exibe centésimos se menos de 1 minuto
        }
        return `${mStr}:${sStr}`;
    }

    function updateClockDisplay() {
        const wDisplay = document.getElementById('time-white');
        const bDisplay = document.getElementById('time-black');
        const wContainer = document.getElementById('clock-white');
        const bContainer = document.getElementById('clock-black');
        
        wDisplay.textContent = formatTime(clockState.white);
        bDisplay.textContent = formatTime(clockState.black);
        
        // Alerta Crítico (Menos de 10 segundos)
        if (clockState.white < 10000 && clockState.white > 0) {
            wContainer.classList.add('critical-time');
            playTickSound();
        } else {
            wContainer.classList.remove('critical-time');
        }
        
        if (clockState.black < 10000 && clockState.black > 0) {
            bContainer.classList.add('critical-time');
            playTickSound();
        } else {
            bContainer.classList.remove('critical-time');
        }
    }

    function handleTimeOut(color) {
        clearInterval(clockTimer);
        clockState.active = false;
        const winner = color === 'w' ? 'Pretas' : 'Brancas';
        document.getElementById('status').innerHTML = `🚨 Fim de Tempo! Vitória das <strong>${winner}</strong>.`;
        playVictorySound();
        alert(`O tempo das ${color === 'w' ? 'Brancas' : 'Pretas'} esgotou! Vitória das ${winner}!`);
    }

    let lastTickTime = 0;
    function playTickSound() {
        const now = Date.now();
        if (now - lastTickTime > 1000) {
            synthBeep(440, 0.05, 'triangle', 0.15); // Tique sutil de relógio
            lastTickTime = now;
        }
    }
    ```

---

### 2. Motor de Síntese de Áudio via Web Audio API (Retro-Futuristic Synth)
Uma solução robusta e limpa de síntese musical para não depender de falhas de carregamento de arquivos de áudio externos.

```javascript
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function synthBeep(frequency, duration, type = 'sine', volume = 0.2) {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        
        // Envelope de Amplitude suave para evitar cliques de áudio
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.error("Erro na síntese de áudio:", e);
    }
}

// Biblioteca de Efeitos Sonoros
const ChessSFX = {
    playMove: () => {
        // Onda triangular descendente curta ("plop" orgânico de madeira)
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {}
    },
    
    playCapture: () => {
        // Onda dente-de-serra rápida + ruído metálico para simular colisão física
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.08);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {}
    },
    
    playCheck: () => {
        // Alerta duplo e agudo
        synthBeep(880, 0.06, 'sine', 0.25);
        setTimeout(() => synthBeep(1100, 0.08, 'sine', 0.25), 80);
    },
    
    playVictory: () => {
        // Arpejo triunfal em acorde maior
        const ctx = getAudioContext();
        const base = ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4 -> E4 -> G4 -> C5
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                synthBeep(freq, 0.35, 'sine', 0.2);
            }, idx * 120);
        });
    }
};
```

---

### 3. Gerenciamento do Modo Desafio Tático (Puzzle Engine)
Os quebra-cabeças táticos mudam o estado do tabuleiro de um jogo regular e impõem validação rígida de jogadas até o lance de vitória.

*   **Database de Puzzles Táticos**:
    ```javascript
    const CHESS_PUZZLES = [
        {
            id: 1,
            title: "Xeque-Mate do Pastor (Mate em 1)",
            description: "Aproveite a fraqueza exposta da casa f7 e dê o xeque-mate imediato de Brancas.",
            fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
            solution: { from: 'h5', to: 'f7' },
            feedback: "Excelente! A Dama apoiada pelo Bispo esmaga a defesa do Rei."
        },
        {
            id: 2,
            title: "Xeque-Mate do Corredor (Mate em 1)",
            description: "O Rei adversário está preso atrás da sua própria barreira de peões na oitava fileira.",
            fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
            solution: { from: 'd1', to: 'd8' },
            feedback: "Brilhante! O mate na fila do fundo é um dos golpes mais recorrentes em torneios."
        },
        {
            id: 3,
            title: "Garfo de Cavalo Demolidor (Ganho de Peça)",
            description: "Use o Cavalo preto para atacar simultaneamente o Rei e a Dama das Brancas.",
            fen: "r3k2r/ppp2ppp/8/8/1n1q4/8/PP3PPP/R3K2R b KQkq - 0 1",
            solution: { from: 'b4', to: 'c2' },
            feedback: "Sensacional! O garfo de Cavalo captura a Dama e decide a partida."
        }
    ];
    
    let currentActivePuzzle = null;
    let puzzleRating = 1200; // Rating visual
    ```

*   **Lógica de Validação do Lance do Jogador**:
    Na função `onDrop(source, target)` do jogo, insira o interceptador de puzzles:
    ```javascript
    function handlePuzzleMove(source, target) {
        if (!currentActivePuzzle) return false;
        
        const sol = currentActivePuzzle.solution;
        if (source === sol.from && target === sol.to) {
            // Lance correto!
            setTimeout(() => {
                synthBeep(880, 0.15, 'sine', 0.25);
                setTimeout(() => synthBeep(1320, 0.3, 'sine', 0.2), 100); // Fanfarra dupla de acerto
                
                triggerConfettiEffect(); // Feedback glorioso
                puzzleRating += 15;
                
                document.getElementById('status').innerHTML = `🏆 <strong>Sucesso Tático!</strong> ${currentActivePuzzle.feedback}`;
                document.getElementById('puzzle-rating-val').textContent = puzzleRating;
                
                alert(`Sucesso! ${currentActivePuzzle.feedback}`);
                exitPuzzleMode();
            }, 100);
            return true;
        } else {
            // Lance incorreto!
            setTimeout(() => {
                synthBeep(150, 0.3, 'sawtooth', 0.3); // Som grave de erro
                puzzleRating = Math.max(800, puzzleRating - 10);
                document.getElementById('puzzle-rating-val').textContent = puzzleRating;
                alert("❌ Lance incorreto! Tente analisar melhor a posição.");
                
                // Reseta a FEN para redefinir o puzzle
                board.position(currentActivePuzzle.fen);
                game.load(currentActivePuzzle.fen);
            }, 100);
            return false;
        }
    }
    ```

---

### 4. Estética de Juiciness e Efeitos Especiais
Melhorar a experiência de feedback do jogador com tremores de tela, faíscas ao capturar e luzes neon nas casas do tabuleiro.

*   **Tremor de Tela (CSS e JS)**:
    ```css
    .board-container.shake {
        animation: screen-shake 0.18s cubic-bezier(.36,.07,.19,.97) both;
        transform: translate3d(0, 0, 0);
        backface-visibility: hidden;
        perspective: 1000px;
    }
    @keyframes screen-shake {
        10%, 90% { transform: translate3d(-3px, 0, 0); }
        20%, 80% { transform: translate3d(5px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
        40%, 60% { transform: translate3d(6px, 0, 0); }
    }
    ```
    ```javascript
    function triggerScreenShake(intensity = 'medium') {
        const boardEl = document.querySelector('.board-container');
        boardEl.classList.add('shake');
        setTimeout(() => {
            boardEl.classList.remove('shake');
        }, 180);
    }
    ```

*   **Trilhas de Destaque Neon (CSS)**:
    Quando a IA ou o jogador fizer um lance, podemos pintar as casas de origem e destino com tons translúcidos:
    ```css
    .highlight-from-neon {
        box-shadow: inset 0 0 10px #ff007f, 0 0 8px #ff007f !important;
    }
    .highlight-to-neon {
        box-shadow: inset 0 0 10px #00f5d4, 0 0 8px #00f5d4 !important;
    }
    ```

*   **Física de Partículas na Captura (Explosion Engine)**:
    Criar pequenas partículas SVG temporárias nas coordenadas cartesianas exatas da casa onde a peça foi destruída.
    ```javascript
    function spawnCaptureParticles(squareName) {
        const squareEl = document.querySelector(`.square-${squareName}`);
        if (!squareEl) return;
        
        const rect = squareEl.getBoundingClientRect();
        const boardRect = document.getElementById('myBoard').getBoundingClientRect();
        
        // Centro local da casa em relação ao tabuleiro
        const startX = (rect.left + rect.width / 2) - boardRect.left;
        const startY = (rect.top + rect.height / 2) - boardRect.top;
        
        const overlay = document.getElementById('boardOverlay');
        
        // Spawn de 12 partículas físicas procedurais
        for (let i = 0; i < 12; i++) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', startX);
            circle.setAttribute('cy', startY);
            circle.setAttribute('r', Math.random() * 3 + 2);
            circle.setAttribute('fill', i % 2 === 0 ? '#ff007f' : '#00f5d4');
            
            overlay.appendChild(circle);
            
            // Vetor de velocidade e gravidade
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed - 2; // Impulso inicial para cima
            
            let posX = startX;
            let posY = startY;
            let opacity = 1.0;
            
            function animateParticle() {
                vy += 0.2; // Efeito de gravidade descendente
                posX += vx;
                posY += vy;
                opacity -= 0.035;
                
                circle.setAttribute('cx', posX);
                circle.setAttribute('cy', posY);
                circle.setAttribute('opacity', opacity);
                
                if (opacity > 0) {
                    requestAnimationFrame(animateParticle);
                } else {
                    circle.remove();
                }
            }
            requestAnimationFrame(animateParticle);
        }
    }
    ```

---

## ❓ Dúvidas para o TL ou o PO

Para manter o alinhamento rigoroso antes do desenvolvimento da tarefa, formulei as seguintes perguntas conceituais para análise e definição da esteira técnica:

1.  **Compatibilidade do Incremento de Fischer (chessTimer)**:
    *   *Pergunta*: O incremento de tempo deve ser adicionado *imediatamente* no momento do clique de soltar a peça (`onSnapEnd`) ou apenas quando o motor de xadrez confirma a legalidade lógica da jogada?
    *   *Recomendação*: Executar a adição de tempo somente após a confirmação lógica da jogada para evitar que lances ilegais devolvidos ao tabuleiro concedam incrementos indevidos ao jogador.
2.  **Web Audio API Autoplay Restrictions**:
    *   *Pergunta*: A inicialização do `AudioContext` deve ser associada a um botão explícito de "Habilitar Som / Iniciar Jogo" ou podemos associá-la implicitamente a qualquer interação com o tabuleiro?
    *   *Recomendação*: Utilizar o próprio clique no tabuleiro ou nos botões de controle de tempo para disparar o `resume()` do AudioContext de forma imperceptível e livre de erros.

---

*Assinado: Antigravity - Senior Game Product Owner (PO)*
