# 📝 TASK-TETRIS: Peça Fantasma (Ghost Piece), Modo Contra o Tempo (Time Attack) e Áudio Retro Sintético

## 👤 User Story
*   **Como** jogador experiente do clássico minijogo **Tetris**,
*   **Eu quero** ver a projeção visual de onde a peça vai cair (Ghost Piece), poder escolher jogar contra o tempo em rodadas de 2 minutos, e ouvir sons de estilo 8-bit sintetizados dinamicamente,
*   **Para que** minhas jogadas sejam mais velozes e precisas e a experiência retrô seja completa e imersiva.

---

## 🎯 Critérios de Aceitação
1.  **Peça Fantasma (Ghost Piece / Shadow)**:
    *   Exibir uma projeção visual semitransparente (ou apenas com linhas de contorno tracejadas) no fundo do tabuleiro, correspondendo ao local exato onde o tetromino atual pousará caso o jogador execute um *Hard Drop*.
    *   A sombra da peça deve atualizar instantaneamente quando o jogador move ou rotaciona a peça ativa.
2.  **Modo de Jogo Contra o Tempo (Time Attack)**:
    *   No menu inicial do jogo, permitir selecionar: *Modo Infinito Clássico* ou *Modo Contra o Tempo*.
    *   O modo Contra o Tempo tem duração exata de **2 minutos (120 segundos)**. Exibir um cronômetro regressivo destacado na tela.
    *   Ao expirar o tempo, disparar o fim de jogo registrando a pontuação.
3.  **Efeitos Sonoros Retro (Web Audio API)**:
    *   Utilizar a **Web Audio API** do navegador para sintetizar sons puramente via código (sem dependência de arquivos MP3/WAV pesados):
        *   *Giro de Peça*: Som curto de frequência rápida ascendente (onda senoidal).
        *   *Encaixe de Peça*: Som seco de frequência descendente rápida (onda dente de serra ou quadrada).
        *   *Linha Concluída*: Sucessão rápida de notas ascendentes em tom festivo (onda triangular).

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/tetris/index.html` (que contém o código da aplicação).
*   **Cálculo da Peça Fantasma**:
    *   Para obter a posição Y da sombra, criar uma cópia temporária da posição Y da peça ativa e incrementá-la em um loop `while` simulando a descida até detectar colisão com blocos ou base.
    *   Renderizar esta peça sombra na tela usando uma cor cinza clara de baixa opacidade (ex: `rgba(255, 255, 255, 0.15)`).
*   **Sintetizador Web Audio**:
    *   Criar uma classe utility `SoundSynth` usando `new AudioContext()`.
    *   Exemplo de sintetizador simples de som:
        ```javascript
        function playRotateSound() {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        }
        ```

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (A Peça Fantasma é padrão de acessibilidade em jogos modernos de Tetris).
*   **Esforço Estimado**: Média (A lógica de colisão para a peça sombra reutiliza o validador de posição existente).
*   **Área**: Front-end / Canvas 2D / Lógica de Áudio.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os passos, a modelagem e os trechos de código estruturados necessários para implementar cada um dos requisitos da história de usuário, garantindo compatibilidade com o loop de jogo existente e uma excelente experiência de usuário (premium aesthetics).

### 1. Peça Fantasma (Ghost Piece)
*   **Mecânica de Detecção**:
    Para encontrar a projeção vertical onde a peça atual irá aterrissar:
    1. Criar uma função dedicada `getGhostPositionY()` que clona a posição da peça atual.
    2. Incrementar recursivamente `ghostY` enquanto `checkCollision()` não retornar verdadeiro para essa posição temporária.
    3. Retornar `ghostY - 1`.
    
    ```javascript
    function getGhostPositionY() {
        if (!piece) return 0;
        
        // Criar um clone temporário da peça para simular a queda
        const tempPiece = {
            pos: { x: piece.pos.x, y: piece.pos.y },
            shape: piece.shape,
            type: piece.type
        };
        
        // Simular descida
        while (!checkGhostCollision(tempPiece)) {
            tempPiece.pos.y++;
        }
        return tempPiece.pos.y - 1;
    }

    function checkGhostCollision(tempPiece) {
        for (let y = 0; y < tempPiece.shape.length; y++) {
            for (let x = 0; x < tempPiece.shape[y].length; x++) {
                if (tempPiece.shape[y][x] !== 0) {
                    const boardX = x + tempPiece.pos.x;
                    const boardY = y + tempPiece.pos.y;
                    
                    if (
                        boardX < 0 || 
                        boardX >= COLS || 
                        boardY >= ROWS ||
                        (boardY >= 0 && board[boardY][boardX] !== 0)
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    ```

*   **Estilização Visual**:
    *   Para manter o visual premium neon, em vez de um bloco cinza genérico, a sombra será desenhada como um contorno tracejado ou bloco semitransparente usando a própria cor da peça ativa com 20% de opacidade (`rgba(...)`).
    *   No loop de desenho (`draw`), renderizar a sombra **antes** de renderizar a peça real ativa, para que a peça real sobreponha a sombra caso estejam na mesma linha.
    
    ```javascript
    function drawGhostPiece() {
        if (!piece) return;
        const ghostY = getGhostPositionY();
        
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    // Cor com baixa opacidade (20% alpha)
                    ctx.fillStyle = COLORS[piece.type] + "33"; // Hex com alpha 0x33 ~ 20%
                    ctx.fillRect(x + piece.pos.x, y + ghostY, 1, 1);
                    
                    // Contorno tracejado ou sutil
                    ctx.strokeStyle = COLORS[piece.type] + "88"; // Hex com alpha 0x88 ~ 50%
                    ctx.lineWidth = 0.05;
                    ctx.strokeRect(x + piece.pos.x, y + ghostY, 1, 1);
                }
            });
        });
    }
    ```

### 2. Modo Contra o Tempo (Time Attack)
*   **Alterações de UI / HTML**:
    *   Criar uma seção no painel lateral com controle para selecionar o modo de jogo antes de iniciar:
        ```html
        <div class="mode-selection" style="background-color: #2d2d2d; border-radius: 5px; padding: 10px;">
            <h2>MODO DE JOGO</h2>
            <select id="gameModeSelect" style="width: 100%; padding: 8px; background: #1e1e1e; color: white; border: 1px solid #444; border-radius: 5px; font-family: inherit;">
                <option value="endless">Infinito Clássico</option>
                <option value="timeattack">Contra o Tempo (2 min)</option>
            </select>
        </div>
        
        <div id="timerBox" class="lines-box" style="display: none; background-color: #e53935;">
            <h2>TEMPO RESTANTE</h2>
            <div id="timer" class="value">120s</div>
        </div>
        ```
    *   Aplicar o estilo visual correspondente nas caixas no CSS para que as fontes sigam a identidade premium da plataforma.

*   **Variáveis e Lógica do Cronômetro**:
    *   Adicionar variáveis globais: `gameMode = 'endless'`, `timeLeft = 120`, e `timerInterval = null`.
    *   No `startGame()`, ler o valor do `gameModeSelect`. Se for `timeattack`:
        1. Definir `timeLeft = 120` e exibir a caixa `#timerBox`.
        2. Inicializar o `timerInterval` decrementando `timeLeft` a cada 1 segundo.
        3. Atualizar o elemento `#timer` com `timeLeft` formatado (`MM:SS` ou `120s`).
        4. Se `timeLeft <= 0`, parar o jogo, limpar o intervalo e disparar o Game Over.
    *   No `togglePause()`, certificar-se de pausar/despausar também o `timerInterval`.
    *   No `showGameOver()`, se o modo for Time Attack e o tempo acabou, definir uma mensagem amigável: `GAME OVER: TEMPO ESGOTADO!`.

### 3. Efeitos Sonoros Retro (Web Audio API)
*   **Classe SoundSynth (Módulo de Áudio Autónomo)**:
    Implementar uma classe nativa em JavaScript puro para evitar carregamento de arquivos pesados, utilizando osciladores do navegador para gerar as ondas senoidal, dente de serra e triangular, com controle fino de ganho (envelope ADSR básico) para evitar cliques de áudio.

    ```javascript
    const SoundSynth = {
        ctx: null,
        
        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },
        
        playRotate() {
            try {
                this.init();
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.type = 'sine'; // Onda senoidal para um som mais suave
                osc.frequency.setValueAtTime(300, this.ctx.currentTime);
                // Rampa rápida de frequência ascendente
                osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);
                
                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 0.08);
            } catch (e) {
                console.error("Falha ao tocar áudio de rotação:", e);
            }
        },
        
        playDrop() {
            try {
                this.init();
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.type = 'sawtooth'; // Onda dente de serra para som seco/impactante
                osc.frequency.setValueAtTime(150, this.ctx.currentTime);
                // Rampa descendente de frequência
                osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.12);
                
                gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 0.12);
            } catch (e) {
                console.error("Falha ao tocar áudio de encaixe:", e);
            }
        },
        
        playLine() {
            try {
                this.init();
                const now = this.ctx.currentTime;
                const notes = [261.63, 329.63, 392.00, 523.25]; // Acorde C Maior Arpejado (C4, E4, G4, C5)
                
                notes.forEach((freq, index) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    
                    osc.type = 'triangle'; // Som de flauta retrô 8-bit nostálgico
                    osc.frequency.setValueAtTime(freq, now + index * 0.08);
                    
                    gain.gain.setValueAtTime(0.08, now + index * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.12);
                    
                    osc.start(now + index * 0.08);
                    osc.stop(now + index * 0.08 + 0.12);
                });
            } catch (e) {
                console.error("Falha ao tocar áudio de linhas:", e);
            }
        }
    };
    ```

*   **Pontos de Injeção no Código**:
    *   No `rotatePiece()` e no `keydown` (quando rotaciona via Espaço ou Seta Cima): Chamar `SoundSynth.playRotate()`.
    *   No `mergePiece()` (assim que a peça colide e se consolida no board): Chamar `SoundSynth.playDrop()`.
    *   No `clearLines()` (dentro da checagem de linhas, logo após `linesCleared > 0`): Chamar `SoundSynth.playLine()`.

---

## ❓ Dúvidas para o TL ou o PO

Abaixo estão listadas as dúvidas técnicas e de design identificadas durante a análise inicial da base de código do jogo, seguidas pelas resoluções oficiais do Tech Lead (TL):

1. **Lógica de Hard Drop (Mapeamento de Teclas)**:
   * *Dúvida*: A especificação da Peça Fantasma menciona "...caso o jogador execute um *Hard Drop*". No entanto, a base de código do Tetris (`index.html`) atualmente não possui suporte para a mecânica de *Hard Drop* (apenas queda acelerada com seta para baixo e rotações). Devemos implementar essa mecânica nesta tarefa? Em caso afirmativo, qual tecla deve ser associada?
   * *Proposta*: Sim, sugerimos implementar o *Hard Drop* clássico mapeado na barra de **Espaço** (que atualmente compartilha a rotação com a Seta para Cima). Mapeando o *Hard Drop* no **Espaço** e deixando a rotação exclusivamente na **Seta para Cima (`ArrowUp`)**, alinhamos o jogo ao padrão do Tetris clássico/moderno e fornecemos a utilidade máxima para o uso da Peça Fantasma.
   * *Resolução do Tech Lead (TL)*: **APROVADO**. A proposta faz total sentido técnico e de design de jogo. Um sistema de "Peça Fantasma" é substancialmente subutilizado se o jogador não puder despachar a peça imediatamente para aquela posição (Hard Drop). Portanto, implemente o Hard Drop mapeado na tecla **Espaço** e deixe a rotação exclusivamente na **Seta para Cima (ArrowUp)**. **Importante**: lembre-se de atualizar o arquivo HTML/DOM correspondente (como textos de instruções ou caixas de ajuda na tela) para atualizar as descrições dos controles para o jogador, mantendo a documentação e usabilidade transparentes.

2. **Inicialização do Contexto de Áudio (Web Audio API Autoplay Policy)**:
   * *Dúvida*: Os navegadores modernos restringem a execução da Web Audio API até que haja uma interação física direta do usuário. Se o `SoundSynth` for disparado automaticamente, gerará avisos e falhas de som.
   * *Proposta*: Inicializar/Retomar (`init()`) o `SoundSynth` associado aos cliques nos botões "NOVO JOGO" (`#startBtn`) e "JOGAR NOVAMENTE" (`#restartBtn`), bem como na primeira tecla de movimentação pressionada no teclado, garantindo uma ativação de áudio fluida e em total conformidade com as políticas do navegador.
   * *Resolução do Tech Lead (TL)*: **APROVADO**. É uma prática de segurança e robustez essencial para aplicações web modernas. Certifique-se de que a chamada do `SoundSynth.init()` seja segura (idempotente) e que capture possíveis exceções silenciosamente caso o contexto de áudio não possa ser inicializado, evitando travar a execução lógica principal do jogo por causa de políticas restritivas de navegadores específicos.

3. **Efeito de Fim de Jogo (Game Over)**:
   * *Dúvida*: Além dos sons de Giro, Encaixe e Linha, há interesse em adicionar um efeito sonoro de derrota?
   * *Proposta*: Sugerimos criar um pequeno som sintetizado descendente e grave (onda dente de serra) tocado imediatamente ao disparar a tela de Game Over para enriquecer a ambientação de áudio retro.
   * *Resolução do Tech Lead (TL)*: **APROVADO**. A adição de um efeito sonoro de derrota (Game Over) enriquece consideravelmente o "juice" e o feedback do jogo sem adicionar complexidade técnica excessiva. A lógica proposta de uma rampa descendente com onda dente de serra se alinha perfeitamente ao estilo de áudio clássico pretendido.

---

*Despacho emitido por: Antigravity - Veteran Game Tech Lead (TL)*

---

### 💻 Observações do Programador (Desenvolvimento Concluído)

Todas as diretrizes técnicas e resoluções do Tech Lead (TL) foram seguidas à risca e implementadas com total êxito na base de código do minijogo **Tetris** (`/tetris/index.html`):

1. **Peça Fantasma (Ghost Piece) & Hard Drop**:
   * Implementamos o cálculo dinâmico da projeção de queda (`getGhostPositionY()`) que simula a aterrissagem em tempo de execução sem afetar a peça ativa original.
   * Renderizamos a sombra com 20% de opacidade utilizando a própria cor vibrante neon da peça ativa e contornos sutis de 50% de opacidade, desenhada imediatamente antes da renderização da peça real.
   * Mapeamos a rotação de forma exclusiva na tecla **Seta para Cima (ArrowUp)**.
   * Criamos a mecânica de queda instantânea (**Hard Drop**) mapeada na tecla **Espaço (Space)**, otimizando a usabilidade da Peça Fantasma.
   * Atualizamos a legenda de controles no DOM para manter a usabilidade clara e transparente para o usuário final.

2. **Modo Contra o Tempo (Time Attack)**:
   * Acrescentamos um seletor visual na barra lateral do painel para escolha entre *Infinito Clássico* ou *Contra o Tempo (2 min)*.
   * Desenvolvemos o cronômetro regressivo destacado de 120 segundos que se integra de forma transparente às mecânicas de pausa (`togglePause`) e reinício de rodadas.
   * Ao zerar o tempo limite, o jogo é interrompido instantaneamente com a mensagem `"TEMPO ESGOTADO!"` e a exibição da tela de pontuação final.

3. **Sintetizador Retro (Web Audio API)**:
   * Construímos a classe utilitária de som `SoundSynth` encapsulando as oscilações procedurais nativas do navegador sem depender de recursos de áudio estáticos de terceiros.
   * Desenvolvemos e injetamos as assinaturas sonoras exclusivas:
     * *Giro de Peça*: Onda senoidal curta ascendente rápida (300Hz ➡️ 600Hz em 80ms).
     * *Encaixe de Peça (Merge)*: Onda dente de serra descendente curta (150Hz ➡️ 60Hz em 120ms).
     * *Linha Concluída (Clear Lines)*: Arpejo festivo e vibrante em acorde de Dó Maior (C4, E4, G4, C5) tocado com onda triangular retrô suave.
     * *Derrota / Fim de Jogo (Game Over)*: Onda dente de serra grave descendente dramática (220Hz ➡️ 80Hz em 600ms) para excelente feedback de fracasso.
   * Garantimos total conformidade com a *Autoplay Policy* dos navegadores modernos ativando/retomando de forma segura o `AudioContext` a partir de qualquer interação física (cliques nos botões de Novo Jogo/Jogar Novamente ou pressionamento de teclas no teclado).

O código foi rigorosamente estruturado sob práticas recomendadas de Clean Code e Clean Architecture. O status da tarefa no `BACKLOG.md` foi promovido para `Dev complete`.

*Relatório de progresso concluído por: Antigravity - Software Engineer*


