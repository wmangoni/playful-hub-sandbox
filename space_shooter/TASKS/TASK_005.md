# 🚀 TASK-SPACE_SHOOTER: Sistema de Drones Orbitais de Apoio (Wingman Drones), Enxames Xenomórficos com Comportamento de Bando (Boids Swarm Siege) e Chefe Titânico Star-Devourer Leviathan

## 👤 User Story
* **Como** piloto veterano do espaço profundo no **Space Shooter**,
* **Eu quero** implantar drones orbitais autônomos de suporte (Aegis Escudo e Striker Ataque) que orbitam minha nave, enfrentar invasões de enxames xenomórficos com inteligência de bando em espiral (Boids Flocking) no modo Swarm Siege, e batalhar contra a nave-mãe colossal Star-Devourer Leviathan com destruição modular por sub-partes,
* **Para que** a experiência de combate atinja novos patamares de imersão, profundidade tática, satisfação de game feel (juiciness) e rejogabilidade competitiva com mecânicas avançadas de física espacial.

---

## 🎯 Critérios de Aceitação

1. **Sistema de Drones Orbitais de Apoio (Wingman Support Drones)**:
   * No Hangar de Armamento/Naves, adicionar a aba **"Drones de Apoio"** (Support Drones).
   * Permitir a compra e ativação de até 2 Drones simultâneos (máximo de 1 de cada tipo: Aegis e Striker) que orbitam dinamicamente a nave do jogador a um raio constante $R = 45\text{px}$ com velocidade angular $\omega = 2.0\text{rad/s}$.
   * **Drone Aegis (Escudo Defletor)**:
     * Custo: 150 moedas (`spaceShooterCoins`).
     * Visual: Mini-orbe ciano neon com pulsação vibrante (`#00ffff`).
     * Mecânica: Intercepta e neutraliza projéteis inimigos diretos que passem no raio de $25\text{px}$ do drone, ativando um flash de partículas luminosas e efeito sonoro procedural de absorção energética.
   * **Drone Striker (Ataque Tático Automático)**:
     * Custo: 200 moedas (`spaceShooterCoins`).
     * Visual: Mini-caça vermelho neon compacto (`#ff0055`).
     * Mecânica: Dispara automaticamente pequenos feixes de laser a cada $800\text{ms}$ contra o inimigo ativo de menor HP na tela.
   * Persistir o estado de compra (`spaceShooterUnlockedDrones`) e equipamentos ativos (`spaceShooterActiveDrones`) no `localStorage`.

2. **Modo Swarm Siege (Invasão de Enxames Xenomórficos)**:
   * Acessível via botão **"MODO ENXAME"** no menu principal e também acionado automaticamente nas Fases 5 e 9 da campanha.
   * Spawna ondas contínuas de 12 a 24 mini-drones inimigos (*Xeno Swarmers*) de tamanho reduzido ($16\times 16\text{px}$) com contorno magenta neon (`#ff00aa`).
   * **Algoritmo de Bando (Boids Flocking)**:
     * Os mini-drones navegam utilizando as 3 regras clássicas de Craig Reynolds (Separação, Alinhamento e Coesão) combinadas com atração gradativa em direção à posição da nave do jogador.
     * Criam formações fluidas em espiral e nuvens dinâmicas de ataque.
     * Ao serem destruídos por armas de área (como Plasma Cannon ou Tesla), explodem em reação em cadeia satisfatória com floaters de texto neon e multiplicadores de combo no HUD.

3. **Batalha contra o Super-Destruidor Estelar "Star-Devourer Leviathan" (Boss Fight Titânico)**:
   * Surge na Fase 6 como o chefe supremo do setor espacial.
   * **Dimensões e Estrutura Modular**:
     * Largura de $220\text{px}$ e altura de $120\text{px}$, ocupando o topo do cenário com estética ciber-orgânica violeta/dourada neon (`#8e44ad` e `#f1c40f`).
     * Composto por 3 sub-partes destrutíveis independentes com barras de vida individuais:
       1. **Asa Esquerda (Left Wing Array)** - $150\text{ HP}$: Dispara rajadas quádruplas em leque senoidal.
       2. **Asa Direita (Right Wing Launcher)** - $150\text{ HP}$: Dispara mísseis quânticos termoguiados com rastro de fumaça neon.
       3. **Núcleo Central (Leviathan Core)** - $350\text{ HP}$: Protegido por um escudo de força holográfico verde neon. Fica vulnerável **apenas** após a destruição de ambas as asas!
   * **Ataque Supremo (Vórtice Abissal)**:
     * Quando o núcleo central atinge $< 40\%\text{ HP}$, carrega por $3.0\text{s}$ (com linhas de aviso telegrafadas e tremor de tela crescente) e dispara uma onda de repulsão magnética que empurra o jogador para a borda da tela enquanto projeta feixes helicoidais.

4. **Trilha Sonora Adaptativa e Áudio Procedural Synthesizer via Web Audio API**:
   * **Mapeamento de Som Dinâmico**:
     * *Drone Shield Absorb*: Varredura senoidal alta ascendente rápida com decaimento suave.
     * *Striker Laser*: Tom duplo de onda dente-de-serra limpo.
     * *Boid Chain Explosion*: Pop de ruído rosa filtrado passa-baixas com arpejo pentatônico ascendente.
     * *Leviathan Wing Break*: Ruído branco estourado com queda de tom sub-grave ($150\text{Hz} \to 30\text{Hz}$).

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivo Alvo**: `/space_shooter/index.html`
* **Matemática da Órbita dos Drones**:
  Para cada drone $i$ no array `activeDrones`:
  $$\theta_i = \text{gameTime} \cdot \omega + \frac{2\pi \cdot i}{N}$$
  $$X_{drone} = X_{player} + \frac{W_{player}}{2} + R \cdot \cos(\theta_i) - \frac{W_{drone}}{2}$$
  $$Y_{drone} = Y_{player} + \frac{H_{player}}{2} + R \cdot \sin(\theta_i) - \frac{H_{drone}}{2}$$
  onde $R = 45\text{px}$ e $\omega = 2.0\text{rad/s}$.

* **Vetor dos Boids (Separation, Alignment, Cohesion + Target Attraction)**:
  Para cada swarmer $k$:
  $$\vec{v}_{sep} = \sum_{j \neq k, d_{jk} < R_{sep}} \frac{\vec{p}_k - \vec{p}_j}{d_{jk}^2}$$
  $$\vec{v}_{coh} = \left(\frac{1}{M} \sum_{j \in N_k} \vec{p}_j\right) - \vec{p}_k$$
  $$\vec{v}_{align} = \left(\frac{1}{M} \sum_{j \in N_k} \vec{v}_j\right) - \vec{v}_k$$
  $$\vec{v}_{target} = \frac{\vec{p}_{player} - \vec{p}_k}{\|\vec{p}_{player} - \vec{p}_k\|}$$
  $$\vec{v}_{final} = 12.0 \cdot \vec{v}_{sep} + 0.05 \cdot \vec{v}_{coh} + 0.1 \cdot \vec{v}_{align} + 0.8 \cdot \vec{v}_{target}$$

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Expande dramaticamente a profundidade visual, introduz mecânicas boids 2D inéditas e batalha de chefe modular de alta fidelidade estática).
* **Esforço Estimado**: Alta (Matemática de Boids Flocking 2D no Canvas/DOM, gestão de estado de drones orbitais e colisão modular multipartes do Leviathan).
* **Área**: Level Design / Física & IA de Enxames / Web Audio API / Game Feel.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Estrutura de Drones e Boss Leviathan

```javascript
// --- Drones de Apoio ---
let unlockedDrones = JSON.parse(localStorage.getItem('spaceShooterUnlockedDrones')) || [];
let activeDrones = JSON.parse(localStorage.getItem('spaceShooterActiveDrones')) || [];

const DRONE_SPECS = {
    aegis: {
        id: 'aegis',
        name: 'Aegis Shield Drone',
        price: 150,
        color: '#00ffff',
        description: 'Orbita a nave e intercepta projéteis inimigos diretos no raio de proteção.'
    },
    striker: {
        id: 'striker',
        name: 'Striker Laser Drone',
        price: 200,
        color: '#ff0055',
        description: 'Orbita a nave e dispara laser automatizado contra alvos de menor HP.'
    }
};

// --- Leviathan Boss State ---
let isLeviathanActive = false;
let leviathanParts = {
    leftWing: { hp: 150, maxHp: 150, destroyed: false, element: null },
    rightWing: { hp: 150, maxHp: 150, destroyed: false, element: null },
    core: { hp: 350, maxHp: 350, destroyed: false, shielded: true, element: null }
};
```

### 2. Loop de Atualização dos Drones Orbitais

```javascript
function updateDrones(timestamp) {
    if (activeDrones.length === 0) return;
    
    const angleStep = (2 * Math.PI) / activeDrones.length;
    const orbitRadius = 45;
    const orbitSpeed = 0.003;
    
    activeDrones.forEach((droneType, idx) => {
        let angle = timestamp * orbitSpeed + idx * angleStep;
        let dx = (playerX + playerWidth / 2) + orbitRadius * Math.cos(angle) - 10;
        let dy = (playerY + playerHeight / 2) + orbitRadius * Math.sin(angle) - 10;
        
        let droneElem = document.getElementById(`drone-${droneType}`);
        if (droneElem) {
            droneElem.style.left = dx + 'px';
            droneElem.style.top = dy + 'px';
        }
        
        // Habilidade do Drone Aegis
        if (droneType === 'aegis') {
            enemyBullets.forEach(eb => {
                let ebx = parseFloat(eb.style.left) + 4;
                let eby = parseFloat(eb.style.top) + 8;
                let dist = Math.sqrt((ebx - dx - 10)*(ebx - dx - 10) + (eby - dy - 10)*(eby - dy - 10));
                if (dist < 25) {
                    // Absorver projétil
                    createParticleBurst(ebx, eby, '#00ffff', 8);
                    playShieldAbsorbSound();
                    eb.parentNode.removeChild(eb);
                    enemyBullets = enemyBullets.filter(b => b !== eb);
                }
            });
        }
        
        // Habilidade do Drone Striker
        if (droneType === 'striker') {
            if (!droneElem.lastFire || timestamp - droneElem.lastFire > 800) {
                droneElem.lastFire = timestamp;
                fireStrikerDroneLaser(dx + 10, dy + 10);
            }
        }
    });
}
```

### 3. Algoritmo de Flocking Boids para o Modo Swarm Siege

```javascript
function updateSwarmBoids(dt) {
    const sepRadius = 25;
    const neighborRadius = 80;
    
    swarmEnemies.forEach(boid => {
        let sepX = 0, sepY = 0;
        let cohX = 0, cohY = 0;
        let alignX = 0, alignY = 0;
        let neighborsCount = 0;
        
        let bx = boid.x;
        let by = boid.y;
        
        swarmEnemies.forEach(other => {
            if (other === boid) return;
            let dx = bx - other.x;
            let dy = by - other.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < sepRadius && dist > 0) {
                sepX += (dx / dist) / dist;
                sepY += (dy / dist) / dist;
            }
            
            if (dist < neighborRadius) {
                cohX += other.x;
                cohY += other.y;
                alignX += other.vx;
                alignY += other.vy;
                neighborsCount++;
            }
        });
        
        if (neighborsCount > 0) {
            cohX = (cohX / neighborsCount) - bx;
            cohY = (cohY / neighborsCount) - by;
            alignX = (alignX / neighborsCount) - boid.vx;
            alignY = (alignY / neighborsCount) - boid.vy;
        }
        
        // Atração ao jogador
        let targetDx = (playerX + playerWidth/2) - bx;
        let targetDy = (playerY + playerHeight/2) - by;
        let targetDist = Math.sqrt(targetDx*targetDx + targetDy*targetDy) || 1;
        let targetVx = (targetDx / targetDist) * 1.5;
        let targetVy = (targetDy / targetDist) * 1.5;
        
        // Combinação ponderada de forças
        boid.vx += (sepX * 12.0 + cohX * 0.05 + alignX * 0.1 + targetVx * 0.8) * dt;
        boid.vy += (sepY * 12.0 + cohY * 0.05 + alignY * 0.1 + targetVy * 0.8) * dt;
        
        // Limitar velocidade máxima
        let maxSpeed = 3.5;
        let speed = Math.sqrt(boid.vx*boid.vx + boid.vy*boid.vy);
        if (speed > maxSpeed) {
            boid.vx = (boid.vx / speed) * maxSpeed;
            boid.vy = (boid.vy / speed) * maxSpeed;
        }
        
        boid.x += boid.vx;
        boid.y += boid.vy;
        
        boid.element.style.left = boid.x + 'px';
        boid.element.style.top = boid.y + 'px';
    });
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Limite de Drones Simultâneos**: O jogador pode equipar 2 drones da mesma classe (ex: 2 Aegis) ou deve ser limitado a 1 de cada tipo?
   * *Sugestão do PO*: Permitir equipar no máximo 1 de cada tipo (1 Aegis + 1 Striker) para incentivar uma composição balanceada de ataque e defesa sem desequilibrar a curva de poder.
2. **Ativação do Swarm Siege Mode**: O Swarm Siege deve ser um modo de jogo isolado no Menu Principal ou aparecer como fase especial na campanha principal?
   * *Sugestão do PO*: Ambos! Disponibilizar um botão "MODO ENXAME" no menu principal para acesso direto ao minijogo de sobrevivência e também acioná-lo automaticamente nas Fases 5 e 9 da campanha.

---

## 📢 Decisões e Resoluções do Tech Lead (TL)

*(Esta seção será preenchida pelo Tech Lead durante o refinamento técnico)*
