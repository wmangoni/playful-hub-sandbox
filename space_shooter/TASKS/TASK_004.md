# 🚀 TASK-SPACE_SHOOTER: Anomalias Gravitacionais (Buracos Negros), Customização de Armamento no Hangar e Missão de Escolta

## 👤 User Story
* **Como** piloto de elite da resistência galáctica no **Space Shooter**,
* **Eu quero** enfrentar campos de distorção gravitacional (Buracos Negros) que distorcem a física de movimento e atraem projéteis, gerenciar e aprimorar meu arsenal com diferentes tipos de armamento tático (Canhão de Plasma e Relâmpago Tesla) no Hangar de Naves, e defender comboios de carga aliados indefesos (Missão de Escolta) contra incursões de assalto inimigas agressivas,
* **Para que** o loop de jogabilidade se torne mais estratégico, ofereça maior variedade tática e amplie o senso de urgência e heroísmo com mecânicas físicas complexas e feedback audiovisual premium.

---

## 🎯 Critérios de Aceitação

1. **Anomalias Gravitacionais (Buracos Negros)**:
   * A partir da Fase 3, um **Buraco Negro (Vórtice)** pode surgir de forma aleatória na metade superior do cenário, permanecendo por 15 segundos antes de colapsar.
   * **Visual Premium**: Um círculo central violeta neon de 15px rodeado por uma espiral de partículas pulsantes e translúcidas desenhada no Canvas (`ctx.arc` com gradiente radial e sombra `shadowBlur` violeta).
   * **Física Gravitacional**: O buraco negro exerce força gravitacional radial em todas as entidades ativas a uma distância inferior a 250px:
     * A nave do jogador, naves inimigas e meteoros sofrem uma força de aceleração centrípeta inversamente proporcional à distância ($F_g \propto 1/d$).
     * Os projéteis (lasers normais e inimigos) sofrem deflexão de trajetória física curvilínea, sendo curvados em direção ao centro do vórtice.
   * **Raio de Morte**: Se a nave do jogador ou de qualquer inimigo tocar o raio de colisão central de 20px, sofre dano contínuo massivo (50 HP por segundo para o jogador, destruição instantânea para inimigos menores).

2. **Customização de Armamento no Hangar (Weapon Loadout System)**:
   * Adicionar no painel do Hangar uma aba de **"Ajuste de Armas"** (Weapon Tuning).
   * Oferecer 3 opções de armas principais equipáveis na nave ativa:
     1. **Vulcan Blaster (Inicial)**: Disparo padrão rápido. Balas amarelas lineares.
     2. **Plasma Cannon (Custo: 120 moedas)**: Cadência de tiro lenta (cooldown de 600ms). Dispara um orbe pesado de plasma verde neon. Ao colidir, explode gerando dano em área (Splash Damage) num raio de 60px e aniquilando inimigos adjacentes.
     3. **Tesla Chain Lightning (Custo: 250 moedas)**: Cadência moderada (cooldown de 400ms). Dispara um raio ramificado ciano elétrico. O raio atinge instantaneamente o inimigo mais próximo e ricocheteia para até 2 inimigos adicionais dentro de um raio de 120px, com redução de 30% do dano base a cada salto.
   * Salvar a arma ativa e o estado de desbloqueio no `localStorage`.

3. **Modo Escolta de Nave de Carga (Escort Mission)**:
   * Na Fase 3 (e fases ímpares subsequentes), o objetivo principal é **proteger a nave de carga aliada (Goliath Transport)**.
   * A Goliath Transport surge na parte central inferior da tela. Ela possui movimentação horizontal lenta e passiva e **não ataca**.
   * **Barra de Vida dedicada**: Exibir no HUD um display especial glassmorphic azul para acompanhar o HP da Goliath (máximo de 200 HP).
   * **Prioridade de Ataque IA**: Naves inimigas surgem de ondas dedicadas focadas exclusivamente em colidir ou atirar contra a Goliath Transport. O jogador deve agir como escudo protetor e destruir os atacantes.
   * **Condição de Derrota**: Se a Goliath Transport for destruída (HP = 0), a missão falha instantaneamente, disparando a tela de Game Over correspondente.
   * **Bônus de Sucesso**: Ao sobreviver à fase com a Goliath inteira, o jogador ganha um bônus especial de +40 moedas.

4. **Trilha Sonora Dinâmica e Áudio Procedural com Web Audio API**:
   * **BGM Adaptativo**: Alterar dinamicamente o tempo/frequência de oscilação do sintetizador musical de fundo do jogo se o HP da nave de carga ou do jogador caia abaixo de 30%, acelerando a melodia e aumentando o pitch para criar uma atmosfera de desespero.
   * **Novos SFX Procedurais**:
     * *Plasma Burst*: Onda de ruído rosa combinada com sweep senoidal descendente pesado na explosão.
     * *Tesla Discharge*: Disparos instantâneos com ruído metálico senoidal rápido e cliques de alta frequência para simular arco voltaico.
     * *Vórtice Gravitacional*: Emissão de um ruído sub-grave contínuo senoidal que modula em amplitude baseado na proximidade do jogador ao centro do buraco negro.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/space_shooter/index.html` (e/ou assets).
* **Fórmula do Campo Gravitacional**:
  Ao atualizar as posições das entidades no game loop, se um buraco negro estiver ativo na coordenada $(X_{bh}, Y_{bh})$:
  1. Calcular a distância e vetor unitário:
     $$dx = X_{bh} - X_{entity}$$
     $$dy = Y_{bh} - Y_{entity}$$
     $$d = \sqrt{dx^2 + dy^2}$$
  2. Se $d < 250\text{px}$ e $d > 20\text{px}$ (fora do raio de morte):
     $$F_g = \frac{G_{const}}{d}$$
     $$v_x += \frac{dx}{d} \cdot F_g$$
     $$v_y += \frac{dy}{d} \cdot F_g$$
  3. Para projéteis, modificar diretamente seus atributos `speedX` e `speedY` com o vetor de atração gravitacional.
* **Algoritmo de Ricochete Tesla (Chain Action)**:
  Para o raio Tesla, identificar o inimigo inicial por colisão comum. Em seguida, rodar uma busca Euclidiana por vizinhos mais próximos no array `enemies`:
  ```javascript
  function findTeslaTargets(startEnemy, maxChain, maxRadius) {
      let chain = [startEnemy];
      let currentSource = startEnemy;
      
      for (let i = 1; i < maxChain; i++) {
          let nearest = null;
          let minDist = maxRadius;
          
          for (let enemy of enemies) {
              if (chain.includes(enemy) || enemy === player) continue;
              let dist = getDistance(currentSource, enemy);
              if (dist < minDist) {
                  minDist = dist;
                  nearest = enemy;
              }
          }
          if (nearest) {
              chain.push(nearest);
              currentSource = nearest;
          } else {
              break;
          }
      }
      return chain;
  }
  ```

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Essencial para introduzir novos modos de jogo táticos que fogem da repetição do arcade convencional, desafiando a percepção de posicionamento do jogador e o gerenciamento de economia).
* **Esforço Estimado**: Alta (Implementação matemática de curvatura de vetores no motor de física 2D legado, lógica de encadeamento elétrico do Tesla e redesenho de UI responsiva no Hangar para loadouts).
* **Área**: Level Design / Integração Física / Web Audio API / Interface de Progresso.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhadas as diretrizes arquiteturais e exemplos práticos para guiar a codificação do desenvolvedor.

### 1. Estados Globais e Estruturas de Armas

Inseriremos os estados globais para o buraco negro, a nave de carga Goliath, e as armas desbloqueadas no `<script>` de [index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/space_shooter/index.html):

```javascript
// --- Economia e Inventário de Armas ---
let unlockedWeapons = JSON.parse(localStorage.getItem('spaceShooterUnlockedWeapons')) || ['vulcan'];
let activeWeapon = localStorage.getItem('spaceShooterActiveWeapon') || 'vulcan';

const WEAPON_SPECS = {
    vulcan: {
        id: 'vulcan',
        name: 'Vulcan Blaster',
        cooldown: 150,
        price: 0,
        color: '#f1c40f',
        description: 'Metralhadora laser rotativa. Alta cadência e tiros lineares precisos.'
    },
    plasma: {
        id: 'plasma',
        name: 'Plasma Cannon',
        cooldown: 600,
        price: 120,
        color: '#2ecc71',
        description: 'Disparador de energia instável. Projétil pesado que explode gerando dano em área.'
    },
    tesla: {
        id: 'tesla',
        name: 'Tesla Lightning',
        cooldown: 400,
        price: 250,
        color: '#00ffff',
        description: 'Canhão de indução estática. Dispara relâmpagos encadeados que ricocheteiam entre múltiplos alvos.'
    }
};

// --- Estado do Buraco Negro ---
let blackHoleActive = false;
let blackHoleX = 0;
let blackHoleY = 0;
let blackHoleTimer = 0;
let blackHoleElement = null;

// --- Estado da Missão de Escolta ---
let escortModeActive = false;
let goliathHP = 200;
let goliathMaxHP = 200;
let goliathX = 0;
let goliathY = 0;
let goliathElement = null;
```

### 2. Implementação das Anomalias Gravitacionais (Vórtices 2D)

O loop de atualização física do jogo deverá atualizar todas as entidades na vizinhança do Buraco Negro:

```javascript
function spawnBlackHole() {
    if (blackHoleActive) return;
    
    blackHoleActive = true;
    blackHoleX = 150 + Math.random() * (containerWidth - 300);
    blackHoleY = 100 + Math.random() * 100;
    blackHoleTimer = 15000; // 15s
    
    // Injetar elemento visual no DOM
    blackHoleElement = document.createElement('div');
    blackHoleElement.className = 'black-hole';
    blackHoleElement.style.left = (blackHoleX - 50) + 'px';
    blackHoleElement.style.top = (blackHoleY - 50) + 'px';
    blackHoleElement.innerHTML = `
        <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
                <radialGradient id="bh-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#000000" />
                    <stop offset="30%" stop-color="#8e44ad" stop-opacity="0.9" />
                    <stop offset="70%" stop-color="#ff00ff" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="#ff00ff" stop-opacity="0" />
                </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#bh-glow)" />
            <circle cx="50" cy="50" r="10" fill="#000" stroke="#ff00ff" stroke-width="2" />
        </svg>
    `;
    
    gameContainer.appendChild(blackHoleElement);
    showNotification("ALERTA: COLAPSO GRAVITACIONAL DETECTADO!", "#ff00ff");
}

function updateGravityAnomalies(dt) {
    if (!blackHoleActive) return;
    
    blackHoleTimer -= dt * 1000;
    if (blackHoleTimer <= 0) {
        destroyBlackHole();
        return;
    }
    
    // 1. Puxar jogador
    applyGravityToEntity(player, playerWidth, playerHeight, true);
    
    // 2. Puxar inimigos
    enemies.forEach(enemy => {
        applyGravityToEntity(enemy, parseFloat(enemy.style.width) || 30, parseFloat(enemy.style.height) || 30, false);
    });
    
    // 3. Curvar lasers do jogador e inimigos
    bullets.forEach(bullet => curveProjectile(bullet));
    enemyBullets.forEach(eb => curveProjectile(eb));
}

function applyGravityToEntity(element, width, height, isPlayerEntity) {
    let ex = isPlayerEntity ? playerX : parseFloat(element.style.left);
    let ey = isPlayerEntity ? playerY : parseFloat(element.style.top);
    
    let ecx = ex + width / 2;
    let ecy = ey + height / 2;
    
    let dx = blackHoleX - ecx;
    let dy = blackHoleY - ecy;
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 250 && dist > 15) {
        let force = 200 / dist; // Força gravitacional
        let ax = (dx / dist) * force * 0.1;
        let ay = (dy / dist) * force * 0.1;
        
        if (isPlayerEntity) {
            playerX += ax;
            playerY += ay;
            // Tratar limites de tela do jogador
            playerX = Math.max(0, Math.min(containerWidth - playerWidth, playerX));
            playerY = Math.max(0, Math.min(containerHeight - playerHeight, playerY));
        } else {
            element.style.left = (ex + ax) + 'px';
            element.style.top = (ey + ay) + 'px';
        }
    } else if (dist <= 15) {
        // Sugado pelo núcleo! Dano ou destruição
        if (isPlayerEntity) {
            playerTakeDamage(1.5); // Dano por frame
        } else {
            // Inimigos comuns são desintegrados
            createExplosion(ecx, ecy);
            element.hp = 0; // Marca para limpeza
        }
    }
}

function curveProjectile(proj) {
    let px = parseFloat(proj.style.left);
    let py = parseFloat(proj.style.top);
    
    let dx = blackHoleX - px;
    let dy = blackHoleY - py;
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 200 && dist > 5) {
        let pull = 150 / (dist * dist); // Força inversamente proporcional ao quadrado
        proj.speedX += (dx / dist) * pull;
        proj.speedY += (dy / dist) * pull;
    }
}

function destroyBlackHole() {
    if (blackHoleElement && blackHoleElement.parentNode === gameContainer) {
        gameContainer.removeChild(blackHoleElement);
    }
    blackHoleElement = null;
    blackHoleActive = false;
    showNotification("Anomalia Gravitacional Estabilizada", "#8e44ad");
}
```

### 3. Síntese do Raio Tesla Chain e Explosão Splash de Plasma

No método de disparo, gerenciar o comportamento conforme a arma ativa:

```javascript
function executeWeaponFire() {
    const currentTime = Date.now();
    const spec = WEAPON_SPECS[activeWeapon];
    if (currentTime - lastFireTime < spec.cooldown) return;
    
    if (activeWeapon === 'vulcan') {
        // Disparo normal linear herdado
        fireLaserLinear();
    } else if (activeWeapon === 'plasma') {
        // Disparar orbe pesado de plasma verde
        createPlasmaOrb(playerX + playerWidth/2 - 10, playerY, 0, -5);
    } else if (activeWeapon === 'tesla') {
        // Lógica de relâmpago de encadeamento instantâneo
        triggerTeslaChain();
    }
    
    lastFireTime = currentTime;
}

function triggerTeslaChain() {
    // 1. Localizar inimigo mais próximo na tela
    let nearest = null;
    let minDist = 300;
    let px = playerX + playerWidth / 2;
    let py = playerY;
    
    enemies.forEach(enemy => {
        let ex = parseFloat(enemy.style.left) + 15;
        let ey = parseFloat(enemy.style.top) + 15;
        let dist = Math.sqrt((ex-px)*(ex-px) + (ey-py)*(ey-py));
        if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
        }
    });
    
    if (!nearest) {
        // Sem inimigos: apenas pisca um pequeno feixe inofensivo para o topo
        renderTeslaArc(px, py, px, py - 100, '#00ffff');
        playTeslaDischargeSound();
        return;
    }
    
    // 2. Executar cadeia de ricochete
    let targets = findTeslaTargets(nearest, 3, 120);
    
    // 3. Renderizar raios e causar dano progressivo
    let lastX = px;
    let lastY = py;
    
    targets.forEach((enemy, idx) => {
        let ex = parseFloat(enemy.style.left) + 15;
        let ey = parseFloat(enemy.style.top) + 15;
        
        renderTeslaArc(lastX, lastY, ex, ey, '#00ffff');
        
        // Dano decrescente na cadeia (ex: 20 -> 14 -> 10)
        let damage = Math.round(20 * Math.pow(0.7, idx));
        enemy.hp -= damage;
        if (enemy.hp <= 0) {
            handleEnemyDestruction(enemy);
        }
        
        lastX = ex;
        lastY = ey;
    });
    
    playTeslaDischargeSound();
}

function renderTeslaArc(x1, y1, x2, y2, color) {
    const line = document.createElement('div');
    line.className = 'tesla-arc';
    line.style.position = 'absolute';
    // Mapear rotação e tamanho da linha usando transformações 2D CSS
    const dist = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    const angle = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
    
    line.style.width = dist + 'px';
    line.style.height = '4px';
    line.style.left = x1 + 'px';
    line.style.top = y1 + 'px';
    line.style.backgroundColor = color;
    line.style.boxShadow = `0 0 8px ${color}`;
    line.style.transformOrigin = '0 50%';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.zIndex = '12';
    line.style.pointerEvents = 'none';
    
    gameContainer.appendChild(line);
    
    // Desvanecer e deletar em 150ms
    setTimeout(() => {
        if (line.parentNode === gameContainer) gameContainer.removeChild(line);
    }, 150);
}
```

---

## ❓ Dúvidas para o TL ou o PO

Para garantir que a implementação ocorra de maneira limpa e mantenha a estabilidade estrita do game loop, levantamos as seguintes considerações técnicas:

1. **Movimentação do Goliath no Modo Escolta**: A nave Goliath deve ter uma rota programada linear (de um lado para o outro na parte inferior da tela) ou deve ser sutilmente afetada pelo Buraco Negro?
   * *Sugestão do PO*: O Goliath deve ser imune ao arrasto gravitacional direto do buraco negro para evitar que a nave aliada seja sugada inevitavelmente no centro sem culpa do jogador. Contudo, seus projetores de escudo podem piscar caso passem perto.
2. **Splash Damage do Plasma Cannon**: O dano em área do Canhão de Plasma pode danificar o jogador ou a Goliath caso a explosão ocorra muito próxima a eles?
   * *Sugestão do PO*: Não. O minijogo é focado no arcade casual, e fogo amigo (Friendly Fire) traria frustração extrema no espaço reduzido de tela de 600x400px.
3. **Persistência de Melhorias de Armas**: Desbloquear naves e desbloquear armas devem usar a mesma moeda central (`spaceShooterCoins`). Confirmamos a unificação das chaves do `localStorage` para a economia global do jogo?

---

## 📢 Decisões e Resoluções do Tech Lead (TL)

Abaixo estão as especificações arquiteturais finais para a implementação:

### 1. Movimentação e Proteção da Goliath
* **Decisão**: A nave Goliath se moverá exclusivamente de forma horizontal na parte inferior da tela (`y = containerHeight - 80`), flutuando suavemente de um lado para o outro (`x = 100 + Math.sin(time * 0.001) * (containerWidth - 250)`).
* **Imunidade Gravitacional**: A Goliath **é 100% imune** ao deslocamento vetorial do Buraco Negro. Apenas projéteis e naves inimigas são distorcidos pelo campo gravitacional.

### 2. Dano Colateral (Friendly Fire)
* **Decisão**: **Sem Fogo Amigo**. O Splash Damage das explosões do Canhão de Plasma causará dano estritamente aos elementos com a classe `.enemy` (inimigos e meteoros). Nem o jogador nem a Goliath sofrerão danos colaterais das armas do jogador.

### 3. Economia de Créditos Centralizada
* **Decisão**: A chave `spaceShooterCoins` deve ser compartilhada entre as compras de naves do Hangar e upgrades de armas. Ao comprar a arma ou a nave, a mesma carteira de fundos será deduzida. Salve os desbloqueios na chave `spaceShooterUnlockedWeapons` como um array JSON serialization.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `space_shooter` (Space Shooter)
* **Ação**: Nova tarefa estruturada para adição no topo de backlog.
* **Status do Backlog**: 🟢 Ready for QA.
* **Destino**: A especificação está documentada de forma robusta e limpa, em total conformidade estética e técnica com o Playful Hub.

---

## 🔍 Registro de Revisão de Código & Validação Arquitetural (Tech Lead)

### 1. Funcionalidades Implementadas
- **Hangar UI & Armas (Weapon Tuning Modal)**:
  - Adicionada modal com visual glassmorphic para compra/seleção de armas (`vulcan`, `plasma`, `tesla`).
  - Integrado sistema de economia com moedas (`coins`), ganhos ao destruir inimigos e persistência via `localStorage`.
- **Anomalias Gravitacionais (Buracos Negros)**:
  - Surgimento estocástico a partir da Fase 3.
  - Implementada atração vetorial centrípeta $F_g \propto 1/d$ puxando jogador, inimigos e defletindo projéteis.
  - Animação SVG com rotação contínua e raio de colisão central que causa dano massivo/destruição.
- **Modo Escolta de Carga (Goliath Transport)**:
  - Inicialização automática em fases ímpares a partir da Fase 3.
  - Barra de vida dedicada (200 HP).
  - Movimentação senoidal passiva com prioridade de ataque inimigo contra o transporte aliada.
  - Recompensa de +40 moedas ao concluir a fase de escolta com sucesso.
- **Áudio Procedural Web Audio API**:
  - `playPlasmaBurstSound()`: Varredura senoidal descendente pesada e ruído.
  - `playTeslaDischargeSound()`: Disparo elétrico com cliques de alta frequência e modulação.
  - `updateVortexSound()`: Oscilador sub-grave senoidal controlado por proximidade.

### 2. Validação dos Critérios de Aceitação
- **Buracos Negros**: ✅ Implementado e integrado no game loop.
- **Weapon Loadout System**: ✅ Unificado com a economia de moedas do Hangar.
- **Escort Mission (Goliath)**: ✅ Totalmente operacional com UI dedicada.
- **Trilha Sonora Adaptativa / Web Audio API**: ✅ Modulação baseada no HP e efeitos proceduralmente sintetizados.

*Assinado: Tech Lead (TL) - Antigravity*

