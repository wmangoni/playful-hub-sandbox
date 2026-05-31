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
