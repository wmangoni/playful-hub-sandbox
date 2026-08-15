# 🏆 TASK-REDE_NEURAL_EVOLUTIVA: Modo Duelo Humano vs IA, Especiação e Nichos Ecológicos (NEAT Species Isolation), Chefe Obstáculo "Titanus Core" e Visualizador de Topologia Neon 3D

## 👤 User Story
*   **Como** um entusiasta de Inteligência Artificial e jogador competitivo no minijogo **Rede Neural Evolutiva**,
*   **Eu quero** competir em tempo real contra os melhores agentes evolutivos no Modo Duelo (Humano vs IA), visualizar o agrupamento da população em espécies genéticas distintas com auras coloridas (Especiação por Nichos Ecológicos), e enfrentar chefões obstáculos dinâmicos ("Titanus Core") com fases de ataque e avisos táticos,
*   **Para que** a simulação alcance o ápice da interatividade tátil, competitividade direta, valor educativo sobre Algoritmos Genéticos Avançados (NEAT) e um fator estético e imersivo de altíssimo nível (Wow Factor).

---

## 🎯 Critérios de Aceitação

1.  **Modo Duelo Humano vs IA (Human vs AI Race/Survival)**:
    *   Adicionar um botão de ação proeminente na interface: `"🎮 Iniciar Duelo Humano vs IA"`.
    *   Ao ativar o Modo Duelo:
        *   A velocidade de simulação é travada automaticamente em `1x` para garantir jogabilidade justa ao jogador humano.
        *   Um agente controlado pelo ser humano (**Player Alpha / Human Player**) é instanciado na cor **Ciano Neon** brilhante com borda branca cintilante e indicador flutuante `"YOU"` sobre sua cabeça.
        *   **Controles do Humano**: Suporte às teclas `Espaço`, `Seta para Cima` (`ArrowUp`) e `W` para realizar pulos em tempo real.
        *   O jogador humano compete simultaneamente na mesma pista contra a população ativa da IA (ou contra o cérebro carregado da elite).
        *   **HUD de Duelo Dedicado**: Exibe em tempo real no topo do canvas o placar do Humano vs Maior Placar da IA, com indicador dinamico de liderança (`"LEADER: HUMAN 👑"` ou `"LEADER: AI #3 🤖"`).
        *   Ao superar o recorde histórico mantido pela IA, disparar uma fanfarra sonora de celebração e exibir um banner overlay glassmorphic: `"HUMAN TRIUMPH: NEW WORLD RECORD!"`.
        *   Se o humano colidir, ele entra em modo espectador com opacidade de 40% até que a geração atual da IA termine e a próxima recomece.

2.  **Mecanismo de Especiação e Nichos Ecológicos (Speciation & Island Model)**:
    *   Implementar a medição de distância genética entre os genomas da população baseada na norma L1 dos pesos e vieses das camadas ocultas e de saída:
        $$D(g_1, g_2) = \frac{1}{N} \sum_{i=1}^N |w_{1,i} - w_{2,i}| + \frac{1}{M} \sum_{j=1}^M |b_{1,j} - b_{2,j}|$$
    *   **Clusterização de Espécies**:
        *   A população de 20 indivíduos é agrupada automaticamente em até **4 Espécies Genéticas** distintas baseadas no limiar de distância genética $\delta_{threshold} = 0.45$.
        *   Cada espécie recebe uma cor neon exclusiva para sua aura de iluminação WebGL/Canvas:
            *   *Espécie 1 (Alfa)*: Ciano Neon (`#00f0ff`).
            *   *Espécie 2 (Beta)*: Magenta Neon (`#d946ef`).
            *   *Espécie 3 (Gama)*: Verde Esmeralda (`#39ff14`).
            *   *Espécie 4 (Delta)*: Amarelo Âmbar (`#ff9f1c`).
    *   **Partilha de Fitness (Fitness Sharing)**:
        *   Para evitar que uma única mutação dominante monopolize toda a população (convergência prematura em mínimos locais), o fitness de cada indivíduo é ajustado dividindo-o pela quantidade de membros da sua própria espécie ($f'_{i} = f_i / N_{species}$).
        *   Isso preserva nichos ecológicos alternativos, permitindo que espécies com estratégias de pulo atípicas continuem evoluindo em paralelo.
    *   **Painel da HUD de Espécies**: Mini-painel no visualizador exibindo a porcentagem de população por espécie e a contagem de gerações de sobrevivência da espécie líder.

3.  **Chefe Obstáculo Dinâmico ("Titanus Core")**:
    *   A cada 1000 pontos acumulados pela simulação (ou 10 obstáculos normais superados), um evento de **Chefe Obstáculo** é disparado.
    *   O **Titanus Core** é um robô obstáculo 2x2 animado com núcleo pulsante neon vermelho/roxo que surge pela direita do canvas.
    *   **Fases de Ataque do Chefe**:
        *   *Fase 1: Laser de Alerta Subterrâneo*: O chefe projeta uma linha tracejada guia amarela no chão por 1.2 segundos (aviso de perigo) antes de disparar um feixe de plasma horizontal de 15px de altura (exigindo pulo sincronizado no momento exato).
        *   *Fase 2: Fragmentação em Mini-Jumpers*: Ao chegar no centro da tela, o chefe se divide em 2 pequenos mini-obstáculos pulsantes de alturas variáveis ($35\text{px}$ e $55\text{px}$) deslocando-se com ligeira diferença de velocidade, forçando uma decisão rápida dos sensores de entrada da IA e do jogador humano.
    *   Disparar alarme sonoro bitonal tático e aviso visual no canvas: `"WARNING: TITANUS CORE APPROACHING"`.

4.  **Visualizador de Topologia Neon 3D e Mapa de Clusters Genéticos**:
    *   **Topologia 3D Isométrica no Visualizador (`nnCanvas`)**:
        *   Renderizar as 4 camadas da MLP (Entrada, Oculta 1, Oculta 2, Saída) com inclinação isométrica ($30^\circ$) e conexões de pesos representadas por feixes de luz neon animadas.
        *   A espessura da linha de conexão reflete o valor absoluto do peso ($|w|$), e a cor indica o sinal (Ciano para positivo, Magenta para negativo).
    *   **Genetic Cluster Map 2D**:
        *   Mini-gráfico embutido no rodapé do visualizador que projeta os genomas de 20 indivíduos em 2D usando as duas componentes principais de maior variação dos pesos.
        *   Os pontos piscam nas cores de suas respectivas espécies, permitindo ao usuário observar visualmente a convergência ou dispersão dos grupos genéticos durante a evolução.

5.  **Sintetizador de Áudio e Mixer Sonoro de Combate**:
    *   Implementação de efeitos procedurais nativos via Web Audio API:
        *   *Pulo do Humano*: Onda senoidal pura com envelope vibrato suave ($300\text{Hz} \to 900\text{Hz}$).
        *   *Disparo de Laser do Titanus Core*: Sweep exponencial descendente dente-de-serra ($1400\text{Hz} \to 150\text{Hz}$).
        *   *Alarme do Chefe*: Sirene bitonal alternada ($440\text{Hz} \leftrightarrow 880\text{Hz}$).
        *   *Fanfarra de Vitória do Humano*: Arpejo triunfal em escala maior de 4 notas.

---

## 🛠️ Detalhes Técnicos e Diretrizes Arquiteturais

### 1. Arquitetura do Jogador Humano (`HumanPlayer`)
O jogador humano estende as dimensões físicas da classe `Player`, mas ignora as saídas do cérebro MLP, escutando diretamente os eventos de teclado:

```javascript
class HumanPlayer extends Player {
    constructor() {
        super('#00f0ff', null, 45); // Cor Ciano Neon, altura 45px
        this.isHuman = true;
        this.name = "YOU (HUMAN)";
        this.bindControls();
    }
    
    bindControls() {
        window.addEventListener('keydown', (e) => {
            if (!this.isAlive || !window.isHumanModeActive) return;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.jump();
                playSynthHumanJump();
            }
        });
    }
    
    think() {
        // Ignora a chamada da MLP da IA; a decisão de pulo é manual via eventos
    }
    
    draw(ctx) {
        if (!this.isAlive) return;
        super.draw(ctx);
        
        // Renderizar tag "YOU" e indicador brilhante sobre a cabeça
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', this.x + this.width / 2, this.y - 10);
        
        // Triângulo indicador ciano pulsante
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2 - 4, this.y - 22);
        ctx.lineTo(this.x + this.width / 2 + 4, this.y - 22);
        ctx.lineTo(this.x + this.width / 2, this.y - 16);
        ctx.fill();
        ctx.restore();
    }
}
```

---

### 2. Algoritmo de Especiação e Partilha de Fitness (Speciation Engine)

```javascript
class SpeciationEngine {
    constructor(threshold = 0.45) {
        this.threshold = threshold;
        this.speciesColors = ['#00f0ff', '#d946ef', '#39ff14', '#ff9f1c'];
        this.speciesList = []; // Array de objetos { id, color, representative, members }
    }

    calculateDistance(genomeA, genomeB) {
        let sum = 0;
        const len = Math.min(genomeA.length, genomeB.length);
        for (let i = 0; i < len; i++) {
            sum += Math.abs(parseFloat(genomeA[i]) - parseFloat(genomeB[i]));
        }
        return sum / len;
    }

    assignSpecies(players) {
        // Limpar membros da rodada anterior
        this.speciesList.forEach(s => s.members = []);

        players.forEach(player => {
            const genes = player.brain.getGenes();
            let assigned = false;

            for (let s of this.speciesList) {
                const dist = this.calculateDistance(genes, s.representative);
                if (dist < this.threshold) {
                    s.members.push(player);
                    player.speciesColor = s.color;
                    player.speciesId = s.id;
                    assigned = true;
                    break;
                }
            }

            // Criar nova espécie se não encontrou um cluster compatível (máximo 4)
            if (!assigned) {
                if (this.speciesList.length < 4) {
                    const newId = this.speciesList.length + 1;
                    const newColor = this.speciesColors[newId - 1];
                    const newSpecies = {
                        id: newId,
                        color: newColor,
                        representative: [...genes],
                        members: [player]
                    };
                    this.speciesList.push(newSpecies);
                    player.speciesColor = newColor;
                    player.speciesId = newId;
                } else {
                    // Fallback para a espécie mais próxima se já atingiu o limite de 4
                    let minDistance = Infinity;
                    let closestSpecies = this.speciesList[0];
                    for (let s of this.speciesList) {
                        const dist = this.calculateDistance(genes, s.representative);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestSpecies = s;
                        }
                    }
                    closestSpecies.members.push(player);
                    player.speciesColor = closestSpecies.color;
                    player.speciesId = closestSpecies.id;
                }
            }
        });
    }

    applyFitnessSharing(players) {
        players.forEach(player => {
            const species = this.speciesList.find(s => s.id === player.speciesId);
            const speciesSize = species ? species.members.length : 1;
            // Divide o score individual pelo tamanho da espécie para evitar monopolização
            player.adjustedScore = player.score / Math.sqrt(speciesSize);
        });
    }
}
```

---

### 3. Maquete de Estado e Ataques do Chefe ("Titanus Core")

```javascript
class TitanusCoreObstacle {
    constructor() {
        this.x = GAME_WIDTH + 50;
        this.width = 60;
        this.height = 70;
        this.y = GROUND_Y - this.height;
        this.hp = 100;
        this.speed = 4.5;
        this.state = 'warning'; // 'warning', 'laser_charge', 'laser_fire', 'split'
        this.timer = 0;
        this.isBoss = true;
        this.color = '#ff0055';
    }

    update() {
        this.timer++;
        
        if (this.state === 'warning') {
            this.x -= this.speed * 0.8;
            if (this.x < GAME_WIDTH - 150) {
                this.state = 'laser_charge';
                this.timer = 0;
                playSynthBossWarning();
            }
        } else if (this.state === 'laser_charge') {
            if (this.timer > 60) { // 1 segundo carregando feixe amarelo
                this.state = 'laser_fire';
                this.timer = 0;
                playSynthLaserFire();
            }
        } else if (this.state === 'laser_fire') {
            this.x -= this.speed * 1.2;
            if (this.timer > 40) {
                this.state = 'normal_advance';
            }
        } else {
            this.x -= this.speed;
        }
    }

    draw(ctx) {
        // Corpo Voxel do Chefe
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Núcleo energizado pulsante roxo
        const pulse = Math.sin(Date.now() * 0.01) * 5;
        ctx.fillStyle = '#d946ef';
        ctx.fillRect(this.x + 15 - pulse/2, this.y + 20 - pulse/2, 30 + pulse, 30 + pulse);
        
        // Renderizar linha laser de aviso se estiver em carregamento
        if (this.state === 'laser_charge') {
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(0, GROUND_Y - 15);
            ctx.lineTo(GAME_WIDTH, GROUND_Y - 15);
            ctx.stroke();
        } else if (this.state === 'laser_fire') {
            // Feixe de Plasma Horizontal
            ctx.fillStyle = 'rgba(255, 0, 85, 0.85)';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0055';
            ctx.fillRect(0, GROUND_Y - 20, GAME_WIDTH, 15);
        }
        ctx.restore();
    }
}
```

---

## 🛠️ Refinamento Técnico (Technical Refinement)

```mermaid
graph TD
    A[Game Loop Principal] --> B{Modo Duelo Ativo?}
    B -- Sim --> C[Atualizar Inputs & Física do HumanPlayer]
    B -- Não --> D[Executar Apenas População de IA]
    A --> E[Especiação: Agrupar 20 Genomas em 4 Espécies]
    E --> F[Aplicar Auras Neon por Espécie no Canvas]
    E --> G[Aplicar Partilha de Fitness f' = f / sqrt(N)]
    A --> H{Score >= NextBossThreshold?}
    H -- Sim --> I[Instanciar Titanus Core Boss & Tocar Alarme]
    A --> J[Renderizar Topologia 3D Isométrica & Cluster Map 2D]
```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Introduce competição direta Humano vs IA, resolve a estagnação populacional via especiação NEAT e adiciona uma batalha de chefe de nível arcade AAA).
*   **Esforço Estimado**: Alta (Requer integração de manipuladores de entrada humana, clusterização de genomas em tempo real, estado do boss multi-fase e projeções de topologia em canvas).
*   **Área**: Front-end / UI Cyberpunk / Computação Científica (NEAT) / Level Design / Web Audio API.

---

## ❓ Dúvidas para o TL ou o PO

1.  **Velocidade de Simulação no Modo Duelo**:
    *   *Direcionamento do PO*: Ao clicar em `"Iniciar Duelo Humano vs IA"`, a velocidade da simulação deve ser forçada dinamicamente para `1x`, desabilitando o slider de velocidade temporariamente enquanto o humano estiver vivo para garantir controle e tempo de reação justo.
2.  **Paridade de Sobrevivência do Humano**:
    *   *Direcionamento do PO*: O jogador humano possui 1 vida por geração. Se ele colidir, permanece em opacidade de 40% acompanhando a simulação até que o último agente de IA morra, quando uma nova geração se inicia com o humano respawnado no chão.
3.  **Limite de Espécies no Visualizador**:
    *   *Direcionamento do PO*: Manter o número fixo máximo de **4 espécies** ativas no Cluster Map para garantir legibilidade da interface e estética Harmoniosa das cores neon.

---

## 🚀 Status do Refinamento Técnico (PO Aprovou)

*   **Identificação do Jogo**: `rede_neural_evolutiva` (Rede Neural Evolutiva)
*   **Ação**: Especificação detalhada da **TASK_004**.
*   **Status do Backlog**: Registrado com sucesso no [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido à profundidade das fórmulas matemáticas de especiação, maquete de classes do chefe, física do jogador humano e sintetizador sonoro.
*   **Destino**: A `TASK_004.md` está homologada para desenvolvimento pelo time de engenharia.

*Assinado: Antigravity - Senior Game Product Owner (PO)*
