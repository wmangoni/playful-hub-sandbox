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
