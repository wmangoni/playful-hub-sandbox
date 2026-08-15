# 📝 TASK-GAMEOFLIFE: Simulação Multi-Espécies (Conway Bio-Wars), Pincéis de Autômatos, Paredes Indestrutíveis, Shaders Neon Canvas & Importador/Exportador RLE

## 👤 User Story
* **Como** entusiasta de autômatos celulares e jogador de **Conway's Game of Life** em busca de um simulador vivo com dinâmicas ecológicas e ferramentas criativas,
* **Eu quero** simular guerras territoriais ecológicas entre diferentes espécies de células (Ciano, Magenta e Dourado), utilizar ferramentas avançadas de pincel (Spray Caótico, Paredes Barreira Indestrutíveis, Lançadores e Borracha), aplicar efeitos de iluminação e pós-processamento Neon Shaders (Bloom Glow & Phosphor Trail) e importar/exportar padrões universais no formato RLE (Run Length Encoded),
* **Para que** a plataforma ofereça um laboratório criativo sandbox profundo, altamente interativo, com forte apelo estético visual e ciclo de experimentação e retenção infinito.

---

## 🎯 Critérios de Aceitação

1. **Simulação Multi-Espécies (Conway Bio-Wars - Eco-Territorial Rules)**:
   * **Suporte a 3 Espécies Distintas**:
     * **Espécie A (Ciano Neon - `#00f3ff`)**: Células rápidas e adaptativas.
     * **Espécie B (Magenta Neon - `#ff00aa`)**: Células agressivas e territoriais.
     * **Espécie C (Dourado Neon - `#ffcc00`)**: Células duráveis e resistentes.
   * **Regras de Nascimento & Sobrevivência Coexistentes**:
     * A contagem total de vizinhos vivos (somando todas as espécies ativas: `val >= 1 && val <= 3`) rege as regras lógicas B/S ativas (ex.: B3/S23).
     * **Determinação da Espécie de Nascimento**: Ao nascer uma célula na coordenada `(r, c)`, sua espécie é definida pelo **voto de maioria** entre as vizinhas vivas que contribuíram para o nascimento. Em caso de empate triplo (uma vizinha de cada espécie), a espécie é sorteada aleatoriamente entre as três.
   * **Mecânica de Assimilação Territorial (Conquista de Células)**:
     * Se uma célula viva de uma determinada espécie estiver cercada por **4 ou mais vizinhos de uma única espécie adversária**, na próxima geração ela é convertida/assimilada para a espécie dominante local, simulando contágio e conquista territorial.
   * **HUD de Biodiversidade & Gráfico de Dominância**:
     * Exibir uma barra de progresso tripla e contadores percentuais em tempo real na interface (ex: `Ciano: 45% | Magenta: 35% | Dourado: 20%`), refletindo a distribuição da população viva.

2. **Suíte de Pincéis Avançados (Automa Brush Suite)**:
   * Adicionar um seletor de pincéis na barra de ferramentas:
     * **Pincel Padrão (Single Cell / Pattern)**: Injeta células individuais da espécie selecionada ou o padrão pré-selecionado.
     * **Pincel Spray Caótico (Random Spray Brush)**: Aplica uma distribuição pontilhada aleatória de células vivas da espécie ativa em um raio circular ajustável (1x1, 3x3, 5x5).
     * **Pincel Barreira Indestrutível (Bedrock/Wall Tiles)**: Desenha células de parede de metal escuro com contorno neon cintilante (`grid[r][c] = 99`). Paredes não nascem nem morrem, são imunes ao Buraco Negro e Raios Cósmicos, e bloqueiam contagem de vizinhos entre células normais adjacentes.
     * **Pincel Borracha Neon (Active Eraser)**: Remove instantaneamente células vivas, vestígios de morte e blocos de parede no raio de ação do pincel.

3. **Filtros Neon Shaders & Pós-Processamento no Canvas (Visual Juiciness)**:
   * **Efeito Bloom Neon Glow**: Adicionar um filtro de brilho radiante configurável no Canvas (`ctx.filter = 'drop-shadow(0px 0px 6px rgba(0,243,255,0.8))'`) que intensifica o brilho das células vivas e portais.
   * **Rastro de Fosfato Retiniano (CRT Phosphor Trail)**: Implementar uma opção de renderização com persistência visual. Em vez de limpar totalmente o canvas a cada frame, aplica-se uma camada semi-transparente `rgba(7, 9, 19, 0.22)` que cria um rastro luminoso suave de movimento das células.
   * **Modo Matrix Holográfico (Matrix Rain)**: Renderizar no fundo das células mortas/vazias um fluxo sutil de caracteres binários/glitch em tom verde/ciano escuro com queda vertical contínua a 60 FPS.

4. **Importador e Exportador Universal RLE (Run Length Encoded) & Snapshot**:
   * **Importador RLE (LifeWiki Standard Parser)**:
     * Modal glassmorphic contendo uma área de texto (`<textarea>`) para colar códigos RLE padrão da comunidade.
     * O parser deve ignorar linhas de comentário (`#`), ler o cabeçalho de dimensão e regra `x = 31, y = 13, rule = B3/S23` e descompactar a sequência de caracteres (`b` = morta, `o` = viva, `$` = quebra de linha, `!` = fim do arquivo, numerais = repetição de execução ex: `3b2o`).
     * Injetar o padrão importado no centro do grid com ajuste automático de zoom se necessário.
   * **Exportador RLE, JSON & Download PNG**:
     * Botão **"Copiar RLE"**: Converte o estado atual do grid em uma string compactada RLE válida e copia para a área de transferência do usuário com notificação de confirmação.
     * Botão **"Exportar JSON"**: Exporta o estado completo incluindo espécies e paredes indestrutíveis.
     * Botão **"Snapshot PNG"**: Captura o quadro atual do Canvas com alta fidelidade e dispara o download do arquivo de imagem `game_of_life_snapshot.png`.

5. **Áudio Adaptativo Multi-Espécies (Web Audio API Engine)**:
   * Sintetizar timbres sonoros distintos para cada espécie ativa no grid:
     * *Espécie Ciano*: Onda Senoidal pura (tom suave cristalino).
     * *Espécie Magenta*: Onda Triangular (tom encorpado synthwave).
     * *Espécie Dourado*: Onda Dente de Serra com filtro passa-baixa (tom metálico brilhante).
   * Manter a polifonia limitada a 4 vozes com intervalo mínimo de 120ms entre acordes para garantir harmonia e prevenir distorção.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/gameoflife/index.html`.
* **Representação Numérica do Grid Multi-Espécies**:
  * Para suportar espécies e paredes indestrutíveis sem romper o desempenho:
    * `grid[r][c] = 0`: Célula Morta / Vazia.
    * `grid[r][c] = 1`: Célula Viva da **Espécie A (Ciano)** (Idade 1 a 9+).
    * `grid[r][c] = 2`: Célula Viva da **Espécie B (Magenta)** (Idade 1 a 9+).
    * `grid[r][c] = 3`: Célula Viva da **Espécie C (Dourado)** (Idade 1 a 9+).
    * `grid[r][c] = 99`: **Parede Indestrutível (Bedrock)**.
    * `grid[r][c] < 0`: Rastro de decomposição visual de célula morta (`-1` a `-6`).
* **Estrutura do Parser RLE**:
  ```javascript
  function parseRLE(rleString) {
      const lines = rleString.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '');
      if (lines.length === 0) return null;
      
      const header = lines[0];
      const matchX = header.match(/x\s*=\s*(\d+)/i);
      const matchY = header.match(/y\s*=\s*(\d+)/i);
      const width = matchX ? parseInt(matchX[1]) : 0;
      const height = matchY ? parseInt(matchY[1]) : 0;
      
      const payload = lines.slice(1).join('').replace(/\s+/g, '');
      const patternGrid = Array(height).fill().map(() => Array(width).fill(0));
      
      let curX = 0, curY = 0, countStr = '';
      for (let i = 0; i < payload.length; i++) {
          const char = payload[i];
          if (char === '!') break;
          if (/\d/.test(char)) {
              countStr += char;
          } else {
              const count = countStr === '' ? 1 : parseInt(countStr);
              countStr = '';
              if (char === 'b') {
                  curX += count;
              } else if (char === 'o') {
                  for (let k = 0; k < count; k++) {
                      if (curY < height && curX < width) patternGrid[curY][curX] = 1;
                      curX++;
                  }
              } else if (char === '$') {
                  curY += count;
                  curX = 0;
              }
          }
      }
      return { width, height, patternGrid };
  }
  ```

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Transforma a experiência em um laboratório criativo completo com dinâmicas ecológicas competitivas, ferramentas profissionais de level design e compatibilidade com padrões globais da comunidade).
* **Esforço Estimado**: Média-Alta (Exige otimização do motor DDA de células multi-atributos, parsing rigoroso de RLE e gerenciamento de pós-processamento gráfico no Canvas).
* **Área**: Front-end / Canvas Shaders / Algoritmos Ecológicos / Web Audio API.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Lógica de Contagem de Vizinhos e Conquista Territorial

```javascript
function evaluateBioWarsCell(grid, r, c) {
    const counts = { 1: 0, 2: 0, 3: 0 };
    let totalNeighbors = 0;
    
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = (r + dr + rows) % rows;
            const nc = (c + dc + cols) % cols;
            const val = grid[nr][nc];
            
            // Paredes indestrutíveis (99) bloqueiam contagem
            if (val === 99) continue;
            
            if (val >= 1 && val <= 3) {
                counts[val]++;
                totalNeighbors++;
            }
        }
    }
    return { counts, totalNeighbors };
}

function computeNextGenSpecies(grid, r, c, neighborsInfo) {
    const currentVal = grid[r][c];
    const { counts, totalNeighbors } = neighborsInfo;
    
    // Se for parede indestrutível (99), permanece inalterada
    if (currentVal === 99) return 99;
    
    const isAlive = currentVal >= 1 && currentVal <= 3;
    
    if (isAlive) {
        // Verificar assimilação/conquista territorial (4+ vizinhos da mesma espécie inimiga)
        for (let speciesId = 1; speciesId <= 3; speciesId++) {
            if (speciesId !== currentVal && counts[speciesId] >= 4) {
                return speciesId; // Convertido para a espécie invasora dominante
            }
        }
        
        // Regra clássica de Sobrevivência
        if (survivalRules.has(totalNeighbors)) {
            return currentVal; // Mantém a espécie viva
        } else {
            return -1; // Morre -> Rastro de decomposição
        }
    } else {
        // Regra clássica de Nascimento
        if (birthRules.has(totalNeighbors)) {
            // Voto de maioria para determinar a espécie do recém-nascido
            let maxCount = -1;
            let winningSpecies = 1;
            for (let s = 1; s <= 3; s++) {
                if (counts[s] > maxCount) {
                    maxCount = counts[s];
                    winningSpecies = s;
                }
            }
            return winningSpecies;
        } else if (currentVal < 0) {
            return Math.max(-MAX_DECAY, currentVal - 1);
        }
    }
    return 0;
}
```

### 2. Renderização de Rastro de Fosfato e Shaders no Canvas

```javascript
function renderCanvasWithEffects() {
    if (isPhosphorTrailEnabled) {
        ctx.fillStyle = 'rgba(7, 9, 19, 0.22)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#070913';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (isBloomEnabled) {
        ctx.save();
        ctx.filter = 'drop-shadow(0px 0px 5px rgba(0, 243, 255, 0.75))';
    }

    drawCells();

    if (isBloomEnabled) {
        ctx.restore();
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Persistência de Paredes Indestrutíveis em Presets e Randomize**:
   * *Dúvida*: Ao clicar em "Limpar" (Clear) ou "Aleatório" (Randomize), as paredes indestrutíveis desenhadas pelo jogador devem ser apagadas ou preservadas como obstáculo do cenário?
   * *Proposta*: O botão "Limpar" apaga todas as células vivas e paredes. O botão "Aleatório" deve preencher aleatoriamente células vivas respeitando e preservando as paredes indestrutíveis existentes para manter o layout de nivelamento criado pelo usuário.

2. **Interação entre Paredes Indestrutíveis e o Buraco Negro**:
   * *Dúvida*: O Buraco Negro (anomalia gravitacional) deve devorar ou destruir as paredes indestrutíveis se estiverem no seu raio de sucção?
   * *Proposta*: Não. As paredes indestrutíveis devem agir como estruturas sólidas inamovíveis imunes à gravidade do buraco negro, bloqueando a destruição de células posicionadas diretamente atrás delas.

3. **Mecanismo de Codificação RLE com Múltiplas Espécies**:
   * *Dúvida*: O padrão RLE oficial da LifeWiki suporta apenas 2 estados (viva `o`, morta `b`). Como exportar e importar mapas que possuam múltiplas espécies e paredes?
   * *Proposta*: O exportador RLE padrão exportará todas as células vivas como `o`. Para salvar o estado completo de espécies e paredes, disponibilizar uma exportação estendida em formato JSON simples (ou cabeçalho RLE customizado `#Species`).

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Resolução de Paredes Indestrutíveis em Limpar vs Aleatório (Aprovado)**:
   * **Decisão**: O comportamento sugerido foi totalmente validado e aprovado.
   * **Regra**: O botão `Clear` resetará a grade por completo (matriz zerada). O botão `Randomize` preservará células com `val === 99` (Paredes Indestrutíveis) intactas, sorteando aleatoriamente apenas os blocos onde a célula atual não seja uma parede (`grid[r][c] !== 99`).

2. **Resolução da Interação das Paredes com o Buraco Negro (Aprovado)**:
   * **Decisão**: Paredes Indestrutíveis são barreiras absolutas e inamovíveis.
   * **Regra**: Na rotina `applyBlackHole(targetGrid)`, células com valor `99` devem ser explicitamente ignoradas (não podem ser convertidas em `0` nem gerar partículas de sucção).

3. **Resolução do Padrão de Exportação RLE vs JSON (Aprovado)**:
   * **Decisão**: Garantir 100% de compatibilidade retroativa e interoperabilidade com ecossistemas externos (ex.: Golly, LifeWiki).
   * **Regra**: 
     * O botão "Copiar RLE" exporta no padrão estrito da LifeWiki (`b` para células mortas e `o` para qualquer célula viva das espécies 1, 2 ou 3).
     * O botão "Exportar JSON" salvará o objeto estruturado completo `{ width, height, speciesMap, walls, rules }` para permitir carregamento e compartilhamento fiel da sandbox multi-espécies.

4. **Diretrizes Arquiteturais para o Desenvolvedor (Clean Code & Performance)**:
   * **Otimização do Loop Principal (60 FPS)**: Evitar a instanciação de objetos intermediários dentro de `nextGeneration()`. Reutilizar buffers de array tipado ou matrizes pré-alocadas (`nextGrid`).
   * **Gerenciamento do Web Audio API**: Implementar um nó mestre de ganho (`masterGainNode`) para controle unificado de volume e aplicar envelopes de atenuação suave (Exponential Ramp) para eliminar pops/clicks sonoros.
   * **Exposição na Superfície de Testes**: Atualizar o objeto global `window.__gol` para expor funções de seleção de espécies, pincéis e parsers de RLE, permitindo testes de validação automatizados.

---

## 💻 Notas de Desenvolvimento (Dev complete)
*(Seção a ser preenchida pelo Programador ao finalizar a implementação)*

---

## 🔍 Code Review e Aprovação (TL)
*(Seção a ser preenchida pelo Tech Lead durante a revisão de código)*
