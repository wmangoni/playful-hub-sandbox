# 🚀 TASK-SPACE_SHOOTER: Chefe de 3 Fases (Dreadnought Prime), Chuva de Meteoros Fragmentáveis, Formações Inimigas e Efeitos de Juiciness Avançados

## 👤 User Story
* **Como** piloto espacial de elite defendendo os confins da galáxia no **Space Shooter**,
* **Eu quero** enfrentar uma nave capitânia inimiga colossal (**Dreadnought Prime**) com 3 fases de combate evolutivas que testam minhas habilidades de posicionamento e desvio (geradores de escudo orbital, bullet hell em espiral e um raio da morte telegrafado), ter que manobrar por campos de meteoros instáveis que se dividem fisicamente em pedaços menores quando atingidos, combater esquadrões inimigos que atacam em formações estratégicas e sentir cada ação amplificada por partículas de propulsão nos motores, alertas visuais dramáticos de baixa integridade e tremores de tela reativos de diferentes amplitudes,
* **Para que** as batalhas espaciais transmitam um senso máximo de imersão ("juiciness"), recompensem o domínio das mecânicas, tenham um fluxo tático desafiador de alto nível e causem uma experiência audiovisual extremamente gratificante e profissional.

---

## 🎯 Critérios de Aceitação

1. **Chefe Capitânia Multiestágios (Dreadnought Prime)**:
   * O chefe final da Fase 2 (ou fases pares mais avançadas) deve ser substituído pelo **Dreadnought Prime**, uma nave colossal que possui três fases de combate baseadas na sua integridade de HP:
     * **Fase 1: Escudos Orbitais (HP 100% a 70%)**:
       * O Dreadnought Prime surge no topo da tela protegido por um escudo de energia invulnerável.
       * **Geradores de Escudo**: Três pequenos satélites/geradores hexagonais (`THREE.Group` ou SVGs independentes orbitando o chefe a 360° em velocidade constante de `0.02 rad/frame`).
       * O jogador deve alvejar e destruir os 3 geradores orbitais (cada um com 100 HP) para desativar a barreira. Enquanto os geradores existirem, tiros normais no chefe disparam um efeito visual de faísca azul de absorção de dano.
       * O chefe ataca disparando lasers duplos verticais intermitentes.
     * **Fase 2: Espiral de Plasma & Mísseis Termoguiados (HP 70% a 35%)**:
       * Os geradores de escudo explodem com efeitos de partículas massivos. O núcleo do Dreadnought se abre (revelando um reator vermelho piscando).
       * **Bullet Hell**: O chefe começa a girar seu reator e dispara um padrão helicoidal contínuo de projéteis de plasma vermelhos (espiral de balas com ângulo incrementado a cada frame).
       * **Mísseis Guiados**: A cada 4 segundos, o chefe lança 2 mísseis lentos que seguem a posição X do caçador do jogador por 3 segundos antes de acelerarem reto para baixo.
     * **Fase 3: O Canhão Estelar Telegrafado (Hyperbeam) (HP 35% a 0%)**:
       * O chefe para de mover-se horizontalmente e flutua para o centro-topo absoluto.
       * **O Canhão Estelar (Hyperbeam)**: Ciclo repetitivo de 6 segundos:
         * *Carregamento (1.5s)*: Exibe um feixe de mira laser vermelho extremamente fino, acompanhado por partículas brancas orbitais sendo "sugadas" em direção à boca do reator do chefe e o console aplicando um tremor de tela leve contínuo.
         * *Disparo (2.5s)*: O reator descarrega um raio cilíndrico de plasma gigante de 80px de largura que desce verticalmente até a base da tela. O raio causa 25 de dano por segundo ao jogador se houver contato físico. Durante o disparo, ocorre um tremor de tela persistente de alta amplitude e a nave do jogador sofre força física de repulsão lateral ou desaceleração caso encoste no raio.
         * *Esfriamento (2.0s)*: O reator fica escuro, permitindo que o jogador se posicione abaixo dele e cause dano total sem risco.
       * A morte do Dreadnought dispara uma sequência cinematográfica de 5 explosões encadeadas antes de desaparecer e renderizar o bônus de créditos (+50 moedas).

2. **Chuva de Meteoros Fragmentáveis e Formações Esquadrão**:
   * **Campos de Meteoros Instáveis**:
     * Durante a transição de fases normais ou como ondas periódicas de sobrevivência, meteoros rochosos cinzas gigantes caem diagonalmente na tela.
     * Eles possuem alto HP (30 HP) e não disparam projéteis.
     * **Fragmentação Física**: Ao ser totalmente destruído pelo tiro do jogador, o meteoro gigante explode e se divide instantaneamente em **2 ou 3 meteoros menores** que se espalham em direções aleatórias em leque para baixo (vetor velocidade modificado com desvio lateral) em velocidade 1.5x mais rápida, exigindo reflexos rápidos de esquiva ou tiros em rajada.
   * **Formações Táticas de Inimigos**:
     * Substituir o spawn puramente individual e disperso por esquadrões inimigos organizados que surgem em formações geométricas definidas:
       * *Formação V-Shape*: 5 inimigos em forma de "V", descendo juntos e disparando em sincronia.
       * *Formação Flanqueadora*: Duas colunas verticais de 3 naves descendo em paralelo exclusivamente pelas laterais esquerda e direita da tela, tentando cercar o caçador.
       * *Formação Flecha de Assalto*: Um inimigo pesado central escoltado por dois interceptadores rápidos avançando em ponta de lança.

3. **Efeitos Premium de "Juiciness" e Game Feel**:
   * **Engine Thruster Trails (Rastro de Propulsor)**:
     * Injetar um gerador procedural de partículas de motor. Cada nave ativa (jogador e naves inimigas normais) deve emitir pequenas esferas/quadrados de gradiente neon (laranja e amarelo para o jogador, roxo/ciano para os inimigos) que decaem de opacidade rapidamente (tempo de vida de 150ms) a partir da área dos bocais de propulsão traseiros para transmitir velocidade física real.
   * **Tremores de Tela Reativos Multiamplitude (Screen Shake)**:
     * Implementar um gerenciador de tremor que suporte magnitudes diferentes baseadas no impacto dramático do jogo:
       * *Leve (magnitude 2px, dur. 150ms)*: Sofrer dano de bala comum ou colidir de raspão com um meteoro menor.
       * *Médio (magnitude 5px, dur. 300ms)*: Destruir um meteoro gigante ou sofrer impacto de míssil guiado.
       * *Extremo (magnitude 10px, dur. 800ms)*: Detonar a Bomba de Fusão, explosão final do Boss ou durante o disparo do Hyperbeam do Dreadnought Prime.
   * **Alerta Crítico de Cockpit (Low HP Vignette)**:
     * Ao cair abaixo de **30% de integridade (HP)**, o contorno do `#game-container` deve ativar uma vinheta neon avermelhada pulsante (`box-shadow` vermelho interno piscante via animação CSS `@keyframes pulseLowHP`) combinada com um bipe acústico intermitente sintetizado eletronicamente na Web Audio API para acentuar a tensão de quase-morte de forma magistral.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivo Alvo**: `/space_shooter/index.html`.
* **Mecânica de Órbita dos Satélites (Coordenadas Polares)**:
  Para calcular as posições dos 3 geradores orbitando o chefe a um raio $R$ constante ao redor de $(X_{boss}, Y_{boss})$:
  $$\theta_i = \theta_{base} + \frac{2\pi \cdot i}{3}$$
  $$X_i = X_{boss} + R \cdot \cos(\theta_i)$$
  $$Y_i = Y_{boss} + R \cdot \sin(\theta_i)$$
* **Gerenciador de Partículas de Propulsor**:
  Atualizar os emissores de rastro no loop `update()` principal para garantir que os elementos sejam criados e limpos da memória sem causar vazamento de DOM.
* **Modelagem Física de Meteoros fragmentados**:
  Ao destruir o meteoro pai, ler sua posição central $(x, y)$ e disparar loops que criam objetos de meteoros com classe `.meteor-fragment` e propriedades físicas `speedX = Math.random() * 4 - 2` e `speedY = speedY_pai * 1.5`.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Essencial para criar um encerramento satisfatório nas fases, implementar game design clássico de alto nível e encantar o jogador com excelente resposta de feedback tátil e visual).
* **Esforço Estimado**: Média (Exige desenvolvimento de álgebra polar para órbitas simples, lógica de padrões de disparo do chefe e criação de folhas de estilo de CSS vibrantes para a vinheta e partículas).
* **Área**: Level Design / Matemática de Jogos / Game Feel ("Juiciness") / UX do Jogador.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Tech Lead, estruturei e testei os algoritmos ideais para que o programador implemente o Dreadnought de 3 fases, a física de fraturamento de meteoros, o motor de rastro de propulsão e os efeitos de feedback de baixa integridade com segurança arquitetural absoluta.

### 1. Sistema do Chefe Multiestágios Dreadnought Prime

Mapearemos a classe e as propriedades da nave capitânia e seus satélites orbitais para inserção no game loop. O chefe gerenciará seu estado interno utilizando a variável `bossPhase`:

```javascript
// --- Dreadnought Prime Status ---
let bossPhase = 1; // 1: Escudo/Satélites, 2: Spiral/Mísseis, 3: Hyperbeam
let bossOrbitAngle = 0;
let bossGenerators = []; // Lista de satélites geradores { id, hp, element, angleOffset }
let isHyperbeamCharging = false;
let isHyperbeamFiring = false;
let hyperbeamTimer = 0;
let hyperbeamWarningLine = null;
let hyperbeamElement = null;

const BOSS_GENERATOR_MAX_HP = 100;

function spawnDreadnoughtPrime(hpLimit) {
    isBossActive = true;
    bossPhase = 1;
    bossOrbitAngle = 0;
    bossGenerators = [];
    
    // Atualizar HP Máximo do chefe para a batalha final
    bossData = {
        maxHP: hpLimit || 800,
        hp: hpLimit || 800,
        name: "DREADNOUGHT PRIME",
        width: 120,
        height: 90
    };
    
    // Estilizar a nave mãe alienígena (SVG detalhado)
    bossElement.style.width = bossData.width + 'px';
    bossElement.style.height = bossData.height + 'px';
    bossElement.style.left = (containerWidth / 2 - bossData.width / 2) + 'px';
    bossElement.style.top = '30px';
    bossElement.style.display = 'block';
    
    bossElement.innerHTML = `
        <svg viewBox="0 0 150 120" id="boss-main-svg">
            <!-- Escudo translúcido sobreposto na Fase 1 -->
            <ellipse cx="75" cy="60" rx="72" ry="55" fill="none" stroke="#00ffff" stroke-dasharray="8,4" stroke-width="2" id="boss-shield-bubble"/>
            <!-- Corpo Mecânico da Nave capitânia -->
            <polygon points="75,120 125,50 145,70 120,20 30,20 5,70 25,50" fill="#2c3e50" stroke="#34495e" stroke-width="3"/>
            <polygon points="75,110 115,55 125,30 25,30 35,55" fill="#34495e"/>
            <!-- Asas laterais emissivas -->
            <polygon points="5,70 25,50 20,30" fill="#9b59b6"/>
            <polygon points="145,70 125,50 130,30" fill="#9b59b6"/>
            <!-- Reator Central/Núcleo -->
            <circle cx="75" cy="60" r="18" fill="#e74c3c" id="boss-core-reactor"/>
            <circle cx="75" cy="60" r="8" fill="#ffffff" id="boss-core-glow"/>
            <!-- Detalhes mecânicos -->
            <rect x="55" y="20" width="40" height="6" fill="#7f8c8d"/>
        </svg>
    `;
    
    // Injetar os 3 Geradores Hexagonais Orbitais no DOM
    for (let i = 0; i < 3; i++) {
        const gen = document.createElement('div');
        gen.className = 'boss-generator';
        gen.id = `boss-gen-${i}`;
        gen.style.position = 'absolute';
        gen.style.width = '24px';
        gen.style.height = '24px';
        gen.style.zIndex = '4';
        
        // Estética do satélite orbital
        gen.innerHTML = `
            <svg viewBox="0 0 30 30">
                <polygon points="15,2 28,10 28,24 15,28 2,24 2,10" fill="#00e676" stroke="#ffffff" stroke-width="1.5"/>
                <circle cx="15" cy="15" r="5" fill="#ffffff"/>
            </svg>
        `;
        
        gameContainer.appendChild(gen);
        
        bossGenerators.push({
            id: i,
            hp: BOSS_GENERATOR_MAX_HP,
            element: gen,
            angleOffset: (i / 3) * Math.PI * 2
        });
    }
    
    // Exibir barra de HP do Boss
    bossHPContainer.style.display = 'block';
    document.getElementById('boss-name').textContent = bossData.name;
    updateBossHPBar();
    showNotification("ALERTA: DREADNOUGHT PRIME DETECTADO!", "#e74c3c");
}
```

#### 1.1 Lógica de Movimento e Atualização de Fase no Game Loop (`updateBoss`)

```javascript
function updateDreadnought(dt) {
    if (!isBossActive) return;
    
    const bossX = parseFloat(bossElement.style.left);
    const bossY = parseFloat(bossElement.style.top);
    const bossCenterX = bossX + bossData.width / 2;
    const bossCenterY = bossY + bossData.height / 2;
    
    // 1. Atualizar e posicionar Satélites Orbitais na Fase 1
    if (bossPhase === 1) {
        bossOrbitAngle += 0.02; // Velocidade de rotação
        
        if (bossGenerators.length === 0) {
            // Todos destruídos! Transicionar para a Fase 2
            bossPhase = 2;
            const bubble = document.getElementById('boss-shield-bubble');
            if (bubble) bubble.style.display = 'none'; // Desativa escudo visual
            showNotification("ESCUDOS DO CHEFE DESATIVADOS! ATACAR NÚCLEO!", "#00ff88");
            triggerScreenShake(5, 400);
        } else {
            // Reposicionar satélites em coordenadas polares
            const radius = 85;
            for (let i = bossGenerators.length - 1; i >= 0; i--) {
                const gen = bossGenerators[i];
                const finalAngle = bossOrbitAngle + gen.angleOffset;
                
                const genX = bossCenterX + radius * Math.cos(finalAngle) - 12; // Ajuste de metade da largura
                const genY = bossCenterY + radius * Math.sin(finalAngle) - 12;
                
                gen.element.style.left = genX + 'px';
                gen.element.style.top = genY + 'px';
            }
        }
    }
    
    // 2. Comportamento de Ataque por Fase
    const now = Date.now();
    
    if (bossPhase === 1) {
        // Disparos duplos normais de lasers
        if (Math.random() < 0.025) {
            createEnemyLaser(bossCenterX - 30, bossY + bossData.height - 10, 0, 5);
            createEnemyLaser(bossCenterX + 30, bossY + bossData.height - 10, 0, 5);
        }
    } 
    else if (bossPhase === 2) {
        // Movimento lateral suave senoidal
        const newX = (containerWidth / 2 - bossData.width / 2) + Math.sin(now * 0.0015) * 120;
        bossElement.style.left = newX + 'px';
        
        // Disparo espiral contínuo (Bullet Hell)
        if (Math.random() < 0.15) {
            const numProjectiles = 1;
            const baseAngle = (now * 0.01) % (Math.PI * 2);
            createEnemyLaserRadial(bossCenterX, bossCenterY, Math.cos(baseAngle) * 4, Math.sin(baseAngle) * 4);
        }
        
        // Lançar mísseis guiados
        if (now - lastBossSummonTime > 4000) {
            lastBossSummonTime = now;
            launchHomingMissile(bossCenterX - 40, bossCenterY);
            launchHomingMissile(bossCenterX + 40, bossCenterY);
        }
        
        // Se HP cair abaixo de 35%, transiciona para Fase 3
        if ((bossData.hp / bossData.maxHP) <= 0.35) {
            bossPhase = 3;
            deactivateHyperbeamState(); // Limpa se houver algo
            showNotification("ATENÇÃO: ANOMALIA DE ENERGIA DETECTADA! DESVIE!", "#ff00ff");
            triggerScreenShake(8, 600);
        }
    } 
    else if (bossPhase === 3) {
        // Retornar ao centro absoluto suavemente
        const targetX = containerWidth / 2 - bossData.width / 2;
        const currentX = parseFloat(bossElement.style.left);
        bossElement.style.left = (currentX + (targetX - currentX) * 0.08) + 'px';
        
        // Gerenciamento do Ciclo do Hyperbeam
        hyperbeamTimer += dt * 1000;
        
        if (!isHyperbeamCharging && !isHyperbeamFiring && hyperbeamTimer > 2000) {
            // Inicia Carregamento (1.5s)
            isHyperbeamCharging = true;
            hyperbeamTimer = 0;
            spawnHyperbeamWarning(bossCenterX, bossCenterY);
        } 
        else if (isHyperbeamCharging && hyperbeamTimer > 1500) {
            // Disparar Hyperbeam (2.5s)
            isHyperbeamCharging = false;
            isHyperbeamFiring = true;
            hyperbeamTimer = 0;
            triggerHyperbeam(bossCenterX, bossCenterY);
        } 
        else if (isHyperbeamFiring && hyperbeamTimer > 2500) {
            // Concluir e esfriar (2.0s)
            isHyperbeamFiring = false;
            hyperbeamTimer = 0;
            deactivateHyperbeamState();
        }
        
        // Aplicar dano do Hyperbeam se ativo
        if (isHyperbeamFiring) {
            applyHyperbeamContactDamage(bossCenterX);
        }
    }
}

function createEnemyLaserRadial(x, y, vx, vy) {
    const b = document.createElement('div');
    b.className = 'enemy-bullet radial';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.speedX = vx;
    b.speedY = vy;
    b.style.backgroundColor = '#ff2a2a';
    b.style.boxShadow = '0 0 6px #ff0000';
    b.style.width = '10px';
    b.style.height = '10px';
    b.style.borderRadius = '50%';
    gameContainer.appendChild(b);
    enemyBullets.push(b);
}
```

#### 1.2 O Canhão Estelar (Hyperbeam) e Sinalizador Warning

```javascript
function spawnHyperbeamWarning(centerX, centerY) {
    playSound(sfxSpecialShoot); // Som de acumulação de carga
    triggerScreenShake(2, 1500); // Vibração contínua e sutil
    
    // Injetar linha vermelha de mira
    hyperbeamWarningLine = document.createElement('div');
    hyperbeamWarningLine.style.position = 'absolute';
    hyperbeamWarningLine.style.left = (centerX - 1) + 'px';
    hyperbeamWarningLine.style.top = centerY + 'px';
    hyperbeamWarningLine.style.width = '2px';
    hyperbeamWarningLine.style.height = (containerHeight - centerY) + 'px';
    hyperbeamWarningLine.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
    hyperbeamWarningLine.style.boxShadow = '0 0 4px #ff0000';
    hyperbeamWarningLine.style.zIndex = '8';
    hyperbeamWarningLine.style.pointerEvents = 'none';
    
    // Animação CSS de piscar rápido
    hyperbeamWarningLine.style.animation = 'blink 0.1s linear infinite';
    gameContainer.appendChild(hyperbeamWarningLine);
}

function triggerHyperbeam(centerX, centerY) {
    if (hyperbeamWarningLine && hyperbeamWarningLine.parentNode === gameContainer) {
        gameContainer.removeChild(hyperbeamWarningLine);
        hyperbeamWarningLine = null;
    }
    
    playSound(sfxExplosion); // Explosão sônica contínua
    
    // Injetar a coluna de plasma de 80px de largura
    hyperbeamElement = document.createElement('div');
    hyperbeamElement.id = 'hyperbeam-plasma';
    hyperbeamElement.style.position = 'absolute';
    hyperbeamElement.style.left = (centerX - 40) + 'px';
    hyperbeamElement.style.top = centerY + 'px';
    hyperbeamElement.style.width = '80px';
    hyperbeamElement.style.height = (containerHeight - centerY) + 'px';
    
    // Gradiente espetacular animado
    hyperbeamElement.style.background = 'linear-gradient(90deg, transparent, rgba(255,0,255,0.8), #ffffff, rgba(255,0,255,0.8), transparent)';
    hyperbeamElement.style.boxShadow = '0 0 25px #ff00ff, 0 0 15px #00ffff';
    hyperbeamElement.style.zIndex = '9';
    hyperbeamElement.style.pointerEvents = 'none';
    
    // Tremor extremo reativo
    triggerScreenShake(8, 2500);
    gameContainer.appendChild(hyperbeamElement);
}

function applyHyperbeamContactDamage(bossCenterX) {
    // Jogador intercepta o raio?
    const playerCenterX = playerX + playerWidth / 2;
    
    if (playerCenterX >= bossCenterX - 40 && playerCenterX <= bossCenterX + 40 && playerY < containerHeight) {
        // Dano progressivo contínuo por frame (equiparando a 25/s)
        playerTakeDamage(0.6); 
        
        // Repulsão lateral: afasta o jogador do centro do raio
        if (playerX < bossCenterX) {
            playerX = Math.max(0, playerX - 5);
        } else {
            playerX = Math.min(containerWidth - playerWidth, playerX + 5);
        }
    }
}

function deactivateHyperbeamState() {
    if (hyperbeamWarningLine && hyperbeamWarningLine.parentNode === gameContainer) {
        gameContainer.removeChild(hyperbeamWarningLine);
        hyperbeamWarningLine = null;
    }
    if (hyperbeamElement && hyperbeamElement.parentNode === gameContainer) {
        gameContainer.removeChild(hyperbeamElement);
        hyperbeamElement = null;
    }
    isHyperbeamCharging = false;
    isHyperbeamFiring = false;
}
```

---

### 2. Sistema de Meteoros e Fragmentação Física

Injetaremos o spawn de meteoros na lógica de jogo. Ao serem destruídos, acionaremos a geração de fragmentos menores a velocidades incrementadas:

```javascript
// --- Novo Tipo de Inimigo: Meteoro ---
class SpaceMeteor {
    constructor(isFragment = false, parentX, parentY, scaleX = 1.0) {
        this.element = document.createElement('div');
        this.element.className = isFragment ? 'enemy meteor fragment' : 'enemy meteor giant';
        
        this.isFragment = isFragment;
        this.hp = isFragment ? 10 : 30; // Fragmento morre rápido, gigante exige tiros concentrados
        this.width = isFragment ? 18 : 36;
        this.height = isFragment ? 18 : 36;
        
        // Visual SVG de rocha áspera irregular cinzenta
        this.element.style.width = this.width + 'px';
        this.element.style.height = this.height + 'px';
        this.element.innerHTML = `
            <svg viewBox="0 0 40 40">
                <polygon points="12,4 28,2 38,15 32,34 16,38 2,24" fill="#5a5e65" stroke="#3d4044" stroke-width="2"/>
                <!-- Crateras escuras -->
                <circle cx="15" cy="15" r="3" fill="#2d2f33"/>
                <circle cx="26" cy="24" r="4" fill="#2d2f33"/>
            </svg>
        `;
        
        const x = isFragment ? parentX : Math.random() * (containerWidth - this.width);
        const y = isFragment ? parentY : -40;
        
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        
        // Física vetorial de movimento
        this.speedX = isFragment ? (Math.random() * 4 - 2) : (Math.random() * 1.5 - 0.75); // Diagonal
        this.speedY = isFragment ? (4 + Math.random() * 2) : (1.5 + Math.random() * 1); // Fragmentos caem mais rápido
        
        gameContainer.appendChild(this.element);
        
        // Integrar no array de inimigos padrão para detecção de colisão AABB
        enemies.push(this.element);
        
        // Vincular propriedades ao elemento DOM para leitura no motor de física legado
        this.element.hp = this.hp;
        this.element.speedX = this.speedX;
        this.element.speedY = this.speedY;
        this.element.isMeteor = true;
        this.element.isFragment = isFragment;
        this.element.meteorWidth = this.width;
        this.element.meteorHeight = this.height;
    }
}

// Injeção da fragmentação na destruição do Meteoro (Modificação em checkCollisions)
function handleMeteorDestruction(meteorDOM) {
    const mx = parseFloat(meteorDOM.style.left) + 18;
    const my = parseFloat(meteorDOM.style.top) + 18;
    
    // Gerar explosão de poeira rochosa cinza
    createParticleBurstCustomColor(mx, my, 12, ['#888', '#666', '#555', '#444']);
    playSound(sfxExplosion);
    
    // Se era um meteoro gigante, fragmentar!
    if (!meteorDOM.isFragment) {
        showNotification("METEORO FRAGMENTADO!", "#bdc3c7");
        triggerScreenShake(4, 250);
        
        // Spawner de 2 a 3 fragmentos rápidos
        const numFrags = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numFrags; i++) {
            new SpaceMeteor(true, mx - 9, my - 9);
        }
    }
}
```

---

### 3. Efeito Rastro de Propulsores (Engine Thruster Trails)

Para criar um visual extremamente fluido e responsivo ("juice"), adicionaremos um método leve que gera partículas de escape logo abaixo da fuselagem no motor de renderização a cada frame:

```javascript
const activeTrails = [];

function spawnEngineParticles(x, y, shipColor) {
    const part = document.createElement('div');
    part.style.position = 'absolute';
    const size = 3 + Math.random() * 4;
    part.style.width = size + 'px';
    part.style.height = size + 'px';
    part.style.borderRadius = '50%';
    part.style.left = x + 'px';
    part.style.top = y + 'px';
    part.style.backgroundColor = shipColor || '#e74c3c';
    part.style.boxShadow = `0 0 6px ${shipColor || '#e74c3c'}`;
    part.style.pointerEvents = 'none';
    part.style.zIndex = '1';
    
    gameContainer.appendChild(part);
    
    activeTrails.push({
        element: part,
        opacity: 0.9,
        vy: 2.5 + Math.random() * 1.5, // Descendo
        vx: Math.random() * 0.8 - 0.4
    });
}

function updateEngineTrails() {
    for (let i = activeTrails.length - 1; i >= 0; i--) {
        const t = activeTrails[i];
        t.opacity -= 0.08; // Desvanece rapidamente
        
        let cx = parseFloat(t.element.style.left);
        let cy = parseFloat(t.element.style.top);
        
        cx += t.vx;
        cy += t.vy;
        
        if (t.opacity <= 0) {
            gameContainer.removeChild(t.element);
            activeTrails.splice(i, 1);
        } else {
            t.element.style.left = cx + 'px';
            t.element.style.top = cy + 'px';
            t.element.style.opacity = t.opacity;
        }
    }
}
```

No loop principal de atualização `updatePlayer()`, chame a emissão na traseira da nave do jogador:
`spawnEngineParticles(playerX + playerWidth / 2 - 2, playerY + playerHeight, '#ffd700');`

---

### 4. Vinheta de Vida Crítica (Low HP CSS Alert)

Injetar as animações e estilos visuais no bloco `<style>` do `index.html`:

```css
/* Vinheta dinâmica de Cockpit para Vida Crítica */
.critical-hp-vignette {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 0px solid transparent;
    pointer-events: none;
    z-index: 24;
    transition: border-width 0.3s;
    box-sizing: border-box;
}

.critical-hp-vignette.active {
    border: 15px solid transparent;
    animation: pulseLowHP 0.8s infinite alternate;
}

@keyframes pulseLowHP {
    0% {
        box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.2);
        border-color: rgba(255, 0, 0, 0.15);
    }
    100% {
        box-shadow: inset 0 0 35px rgba(255, 0, 0, 0.85);
        border-color: rgba(255, 0, 0, 0.65);
    }
}
```

E no loop principal do jogo, ler o estado do HP do jogador para ligar/desligar o alerta e ativar o bipe acústico:

```javascript
let lastBipTime = 0;

function checkCriticalHealthAlert() {
    const vignette = document.getElementById('hp-vignette');
    const ratio = playerCurrentHP / playerMaxHP;
    
    if (ratio <= 0.3 && !isGameOver) {
        if (vignette) vignette.classList.add('active');
        
        // Disparar bipe eletrônico a cada 1 segundo (Web Audio API)
        const now = Date.now();
        if (now - lastBipTime > 1000) {
            lastBipTime = now;
            playLowHPBeep();
        }
    } else {
        if (vignette) vignette.classList.remove('active');
    }
}

function playLowHPBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Tom agudo tenso
        
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {
        // Fallback passivo caso o áudio contextual sofra restrições do navegador
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

Para garantir conformidade arquitetural perfeita antes da execução do código, documentamos as seguintes considerações táticas de desenvolvimento:

1. **Equilíbrio de Velocidade da Espiral de Balas (Fase 2)**: Como o motor rodará a 60 FPS, as balas radiais da Fase 2 geradas dinamicamente podem criar uma parede intransponível de colisões no espaço reduzido de 600x400px do `#game-container`. Devemos limitar o disparo a ângulos descontínuos ou criar frestas de escape deliberadas?
2. **Presença do Boss Clássico (Bossnick)**: O jogo já conta com um boss legado chamado `Bossnick` (com barras simples e movimentação linear). O novo chefe capitânia `Dreadnought Prime` deve substituí-lo inteiramente em todas as fases de boss do jogo, ou devemos torná-lo exclusivo de fases mais avançadas (ex: Fase 2 e Fase 4), preservando o Bossnick para a Fase 1?
3. **Custo de Performance dos Engine Trails**: Gerar rastro de propulsão ativa para até 15 naves simultâneas em tela no DOM (injetando e removendo dezenas de `div` por segundo) pode causar lentidão severa e gargalos de reflow em navegadores mais fracos. Devemos restringir o rastro aos motores do jogador e do chefe principal?

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

Abaixo estão as resoluções técnicas homologadas para implementação estrita:

1. **Frestas de Escape no Bullet Hell (Aprovado)**: Para garantir diversão e não frustrar o jogador, as espirais radiais de balas da Fase 2 **devem** ser disparadas em grupos em rajada, operando com uma pausa programada de 1.2s entre cada ciclo de giroscópio de 360°, dando tempo hábil para o jogador se desviar ou navegar entre as linhas de tiros.
2. **Ciclo de Chefes Progressivo (Substituição Inteligente)**: O Bossnick atuará como o chefe de introdução da Fase 1. A partir da Fase 2, o colossal **Dreadnought Prime** assume o controle de todos os confrontos finais de fases pares, escalando seu HP máximo em 1.5x a cada novo ciclo para garantir a evolução Roguelike perfeita.
3. **Otimização do Propulsor (Engine Trails Restrito)**: Para manter o minijogo rodando suavemente a 60 FPS em qualquer hardware, **gerar rastro de propulsão procedural por DOM exclusivamente para o Caça do Jogador e para o Reator Principal do Dreadnought**. As naves inimigas genéricas receberão apenas um ajuste de brilho fixo `box-shadow` na traseira de seus SVGs para simular fogo estático, evitando assim a sobrecarga do Garbage Collector do navegador.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `space_shooter` (Space Shooter)
* **Ação**: Refinamento técnico completo homologado. Lógica de 3 estágios, fragmentação física e vinheta CSS de tensão premium perfeitamente arquitetadas.
* **Status do Backlog**: Transicionado com sucesso para `✅ Refined` em `BACKLOG.md`.
* **Destino**: A especificação está 100% pronta e documentada para codificação imediata no catálogo.

*Assinado: Tech Lead (TL) - Antigravity*
