# 📝 TASK-SPACE_SHOOTER: Sistema de Power-Ups, Naves Desbloqueáveis e Placar de Recordes Local

## 👤 User Story
*   **Como** jogador do minijogo **Space Shooter**,
*   **Eu quero** coletar itens de melhoria temporária (tiro triplo, escudo) e gastar moedas coletadas para desbloquear modelos de naves com atributos diferentes,
*   **Para que** a jogabilidade seja dinâmica, desafiadora e com maior recompensa a longo prazo.

---

## 🎯 Critérios de Aceitação
1.  **Power-Ups Temporários**:
    *   Inimigos destruídos devem ter 15% de chance de soltar um contêiner de power-up flutuante que desce verticalmente.
    *   **Tiro Triplo (Azul)**: Dispara 3 feixes de laser em leque por 8 segundos.
    *   **Escudo de Energia (Amarelo)**: Protege a nave contra 1 colisão de inimigo ou tiro por 12 segundos (ou até ser consumido).
    *   **Bomba de Fusão (Vermelho)**: Item de uso instantâneo que limpa todos os inimigos menores na tela.
2.  **Frotas / Seleção de Naves**:
    *   Adicionar um menu de "Hangar" na tela inicial do jogo.
    *   Oferecer 3 modelos de naves espaciais:
        1.  *Interceptor (Inicial)*: Balanceada.
        2.  *Dreadnought*: Lenta, mas com tiros duplos iniciais e mais vida (se aplicável).
        3.  *Phantasm*: Extremamente rápida, menor área de colisão, porém tiros normais.
    *   Naves adicionais devem custar moedas/créditos acumulados derrotando inimigos.
3.  **Placar Local de Líderes (Leaderboard)**:
    *   Salvar no `localStorage` as 5 melhores pontuações com as iniciais do jogador (ex: "WIL - 12,400 pts").
    *   Exibir uma tabela elegante de Recordes no menu de Game Over.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/space_shooter/index.html` (e/ou assets).
*   **Física de Power-Ups**:
    *   Criar uma classe `PowerUp` com detecção de colisão AABB (Axis-Aligned Bounding Box) em relação à nave do jogador.
*   **Gerenciamento de Estado**:
    *   Persistir `playerCoins` e `unlockedShips` no `localStorage` para manter a progressão entre recarregamentos de página.
*   **Design**:
    *   Estilo espacial sci-fi retro/neon, com efeitos sonoros sintéticos associados a cada coleta de item ou compra no Hangar.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhadas todas as diretrizes de arquitetura, estados, lógica de game loop e interfaces visuais para implementar o sistema de Power-ups Temporários, Frotas de Naves no Hangar e Leaderboard Local com persistência no `localStorage`.

### 1. Estados Globais e Persistência

Para dar suporte às mecânicas de moedas, naves desbloqueadas, nave ativa e tempos de power-ups, inicializaremos os seguintes estados na tag `<script>` do arquivo [index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/space_shooter/index.html):

```javascript
// --- Sistema de Frotas e Economia ---
let playerCoins = parseInt(localStorage.getItem('spaceShooterCoins')) || 0;
let unlockedShips = JSON.parse(localStorage.getItem('spaceShooterUnlockedShips')) || ['interceptor'];
let activeShip = localStorage.getItem('spaceShooterActiveShip') || 'interceptor';

// Especificações detalhadas das naves do Hangar
const SHIP_SPECS = {
    interceptor: {
        id: 'interceptor',
        name: 'Interceptor',
        speed: 7,
        maxHP: 100,
        width: 40,
        height: 40,
        price: 0,
        description: 'Nave clássica da frota terrestre. Excelente manobrabilidade e escudo balanceado.',
        color: '#3498db',
        svg: `<polygon points="50,0 100,100 50,70 0,100" fill="#3498db"/><rect x="45" y="70" width="10" height="20" fill="#e74c3c"/>`
    },
    dreadnought: {
        id: 'dreadnought',
        name: 'Dreadnought',
        speed: 4.5,
        maxHP: 150,
        width: 50,
        height: 50,
        price: 150,
        description: 'Tanque espacial pesado. Lenta, porém conta com disparo duplo de laser permanente.',
        color: '#9b59b6',
        svg: `<polygon points="50,0 80,30 100,100 50,85 0,100 20,30" fill="#9b59b6"/><rect x="25" y="80" width="10" height="15" fill="#e74c3c"/><rect x="65" y="80" width="10" height="15" fill="#e74c3c"/>`
    },
    phantasm: {
        id: 'phantasm',
        name: 'Phantasm',
        speed: 10.5,
        maxHP: 80,
        width: 30,
        height: 30,
        price: 300,
        description: 'Protótipo furtivo experimental. Velocidade extrema e menor silhueta de colisão.',
        color: '#2ecc71',
        svg: `<polygon points="50,0 90,80 50,60 10,80" fill="#2ecc71"/><polygon points="50,30 70,80 50,70 30,80" fill="#26a69a"/><rect x="47" y="60" width="6" height="15" fill="#00e676"/>`
    }
};

// --- Power-ups Temporários ---
let isTripleShotActive = false;
let tripleShotTimer = null;
let isShieldActive = false;
let shieldTimer = null;
let shieldHealth = 0; // Quantidade de acertos que o escudo aguenta (1 colisão)
```

---

### 2. Sistema de Power-Ups Temporários

#### 2.1 Taxa de Drop e Spawn
Substituiremos a lógica dinâmica de spawn de power-ups no método `checkCollisions()` após a destruição de um inimigo. A chance de drop será travada em **15%**:

```javascript
// Modificação em checkCollisions() ao destruir inimigo
if (Math.random() <= 0.15) {
    createPowerup(enemyCenterX, enemyCenterY);
}
```

Na função `createPowerup(x, y)`, mapearemos as probabilidades e criaremos SVGs brilhantes adequados com as cores neon solicitadas:

```javascript
function createPowerup(x, y) {
    const powerup = document.createElement('div');
    powerup.className = 'powerup';
    
    const rand = Math.random();
    let type = '';
    let svgContent = '';
    
    if (rand < 0.40) {
        // Tiro Triplo (Azul)
        type = 'triple_shot';
        svgContent = `
            <svg viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="#2980b9" stroke="#ffffff" stroke-width="2"/>
                <path d="M25 15 L25 35 M15 20 L15 30 M35 20 L35 30" stroke="#00ffff" stroke-width="4" stroke-linecap="round"/>
            </svg>
        `;
    } else if (rand < 0.75) {
        // Escudo de Energia (Amarelo)
        type = 'energy_shield';
        svgContent = `
            <svg viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="#f1c40f" stroke="#ffffff" stroke-width="2"/>
                <path d="M25 12 L37 17 L37 27 C37 34 29 38 25 38 C21 38 13 34 13 27 L13 17 Z" fill="#ffffff"/>
            </svg>
        `;
    } else {
        // Bomba de Fusão (Vermelho)
        type = 'fusion_bomb';
        svgContent = `
            <svg viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="#c0392b" stroke="#ffffff" stroke-width="2"/>
                <circle cx="25" cy="22" r="10" fill="#e74c3c"/>
                <path d="M25 12 L28 8 L32 10" stroke="#ffffff" stroke-width="2" fill="none"/>
                <circle cx="25" cy="22" r="4" fill="#ffffff"/>
            </svg>
        `;
    }
    
    powerup.type = type;
    powerup.innerHTML = svgContent;
    
    // Converte coordenadas globais para relativas no container do jogo
    const containerRect = gameContainer.getBoundingClientRect();
    const relativeX = x - containerRect.left;
    const relativeY = y - containerRect.top;
    
    powerup.style.left = (relativeX - 12.5) + 'px';
    powerup.style.top = (relativeY - 12.5) + 'px';
    powerup.speedY = 2; // Desce verticalmente
    
    gameContainer.appendChild(powerup);
    powerups.push(powerup);
}
```

#### 2.2 Efeito do Tiro Triplo (Azul)
Ao coletar o powerup `triple_shot`, o jogador ativa o disparo triplo por **8 segundos**.
- Se o cronômetro anterior existir, ele deve ser cancelado (`clearTimeout`) e reiniciado.
- Exibir badge elegante ou barra de progresso visual do efeito ativo.

```javascript
function activateTripleShot() {
    isTripleShotActive = true;
    showNotification("TIRO TRIPLO ATIVADO! (8s)", "#3498db");
    
    if (tripleShotTimer) clearTimeout(tripleShotTimer);
    
    tripleShotTimer = setTimeout(() => {
        isTripleShotActive = false;
        showNotification("Tiro Triplo Expirado", "#7f8c8d");
    }, 8000);
}
```

*Modificação do Disparo (`fireBullet`)*:
A nave ativa dispara projéteis com base no seu padrão e no status do powerup ativo:
- Se for **Dreadnought** (Tiro Duplo nativo), ela dispara dois lasers paralelos.
- Se o **Tiro Triplo** estiver ativo, dispara 3 lasers em leque (para a esquerda, reto e para a direita).

```javascript
function fireBullet() {
    const currentTime = Date.now();
    if (currentTime - lastFireTime < 150) return;
    
    playSound(sfxShoot);
    
    if (isTripleShotActive) {
        // Disparo em leque (3 lasers)
        createLaser(playerX + playerWidth / 2 - 5, playerY, -3, -10, '#00ffff');
        createLaser(playerX + playerWidth / 2 - 5, playerY, 0, -10, '#00ffff');
        createLaser(playerX + playerWidth / 2 - 5, playerY, 3, -10, '#00ffff');
    } else if (activeShip === 'dreadnought') {
        // Disparo duplo nativo nas laterais
        createLaser(playerX + 5, playerY, 0, -10, '#f1c40f');
        createLaser(playerX + playerWidth - 15, playerY, 0, -10, '#f1c40f');
    } else {
        // Disparo simples padrão
        createLaser(playerX + playerWidth / 2 - 5, playerY, 0, -10, '#f1c40f');
    }
    
    lastFireTime = currentTime;
}

function createLaser(x, y, speedX, speedY, colorHex) {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.left = x + 'px';
    bullet.style.top = y + 'px';
    bullet.speedX = speedX;
    bullet.speedY = speedY;
    bullet.style.backgroundColor = colorHex;
    bullet.style.boxShadow = `0 0 6px ${colorHex}`;
    gameContainer.appendChild(bullet);
    bullets.push(bullet);
}
```

#### 2.3 Efeito do Escudo de Energia (Amarelo)
Ao coletar o powerup `energy_shield`, o escudo protege o jogador por até **12 segundos** ou até sofrer **1 colisão** (seja de inimigo ou tiro inimigo).
- Visualmente adiciona a classe `shielded` no jogador (mostrando uma borda neon azul/amarelada vibrante).
- Adiciona um temporizador para expirar em 12 segundos.

```javascript
function activateEnergyShield() {
    isShieldActive = true;
    shieldHealth = 1; // Suporta 1 colisão
    player.classList.add('shielded');
    showNotification("ESCUDO DE ENERGIA ATIVO! (12s)", "#f1c40f");
    
    if (shieldTimer) clearTimeout(shieldTimer);
    
    shieldTimer = setTimeout(() => {
        deactivateShield();
    }, 12000);
}

function deactivateShield() {
    isShieldActive = false;
    shieldHealth = 0;
    player.classList.remove('shielded');
    if (shieldTimer) {
        clearTimeout(shieldTimer);
        shieldTimer = null;
    }
}
```

*Modificação do Recebimento de Dano (`playerTakeDamage`)*:
```javascript
function playerTakeDamage(damage) {
    if (isPlayerInvulnerable || isGameOver) return;
    
    if (isShieldActive && shieldHealth > 0) {
        shieldHealth--;
        showNotification("Escudo Absorveu o Impacto!", "#3498db");
        if (shieldHealth <= 0) {
            deactivateShield();
        }
        // Concede um pequeno período de invulnerabilidade após o escudo estourar para segurança
        isPlayerInvulnerable = true;
        player.classList.add('invulnerable');
        setTimeout(() => {
            isPlayerInvulnerable = false;
            player.classList.remove('invulnerable');
        }, 800);
        return; 
    }
    
    // Lógica normal de dano...
}
```

#### 2.4 Efeito da Bomba de Fusão (Vermelho)
Ao coletar o powerup `fusion_bomb`, todos os inimigos normais ativos na tela são instantaneamente destruídos, disparando explosões visuais e som de explosão e adicionando pontuação ao jogador (10 pts por inimigo destruído multiplicador da fase atual).
- Caso haja um Chefe ativo, a bomba causará **100 pontos de dano** a ele (em vez de morte instantânea) e removerá os lacaios.

```javascript
function triggerFusionBomb() {
    showNotification("BOMBA DE FUSÃO DETONADA!", "#c0392b");
    triggerScreenShake();
    
    // Efeito visual de flash na tela
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    flash.style.zIndex = '15';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.5s ease-out';
    gameContainer.appendChild(flash);
    setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => gameContainer.removeChild(flash), 500);
    }, 50);

    // Destruir inimigos comuns
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const rect = enemy.getBoundingClientRect();
        createExplosion(rect.left + 15, rect.top + 15);
        
        if (enemy.parentNode === gameContainer) gameContainer.removeChild(enemy);
        enemies.splice(i, 1);
        
        score += 10 * currentPhase;
    }
    
    // Destruir lacaios invocados
    for (let i = summonedEnemies.length - 1; i >= 0; i--) {
        const enemy = summonedEnemies[i];
        const rect = enemy.getBoundingClientRect();
        createExplosion(rect.left + 15, rect.top + 15);
        
        if (enemy.parentNode === gameContainer) gameContainer.removeChild(enemy);
        summonedEnemies.splice(i, 1);
    }
    
    // Dano ao Boss se ativo
    if (isBossActive) {
        bossTakeDamage(100);
    }
    
    scoreElement.textContent = `Score: ${score}`;
    playSound(sfxExplosion);
}
```

---

### 3. Frotas e Seleção de Naves (Hangar)

#### 3.1 Painel do Hangar no HTML e Estilização CSS
Criar um painel de "Hangar" sofisticado na interface inicial. Vamos adicionar CSS moderno na folha de estilos do jogo para dar suporte ao Hangar.

```html
<!-- Interface de Inicialização Ajustada -->
<div id="start-screen" style="position: absolute; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: rgba(5, 5, 20, 0.95); z-index: 25; font-family: 'Segoe UI', Tahoma, sans-serif;">
    <h1 style="color: #00ffff; font-size: 32px; margin-bottom: 5px; text-shadow: 0 0 10px #00ffff; letter-spacing: 2px;">SPACE SHOOTER</h1>
    <p style="color: #888; font-size: 14px; margin-top: 0; margin-bottom: 20px;">Defenda o setor dos invasores cibernéticos</p>
    
    <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <button id="start-game-btn" style="padding: 12px 30px; font-size: 18px; font-weight: bold; background: linear-gradient(135deg, #00f0ff, #0072ff); color: white; border: none; border-radius: 5px; cursor: pointer; box-shadow: 0 0 15px rgba(0,240,255,0.4); transition: transform 0.2s;">INICIAR DEFESA</button>
        <button id="hangar-btn" style="padding: 12px 30px; font-size: 18px; font-weight: bold; background: linear-gradient(135deg, #f1c40f, #f39c12); color: white; border: none; border-radius: 5px; cursor: pointer; box-shadow: 0 0 15px rgba(241,196,15,0.3); transition: transform 0.2s;">HANGAR DE NAVES</button>
    </div>
    
    <!-- Display de Moedas na Tela Inicial -->
    <div style="color: #f1c40f; font-weight: bold; font-size: 16px; display: flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f1c40f"><circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/><text x="12" y="16" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">$</text></svg>
        <span>CRÉDITOS: <span id="start-coins-count">0</span></span>
    </div>
</div>

<!-- Modal do Hangar -->
<div id="hangar-modal" style="position: absolute; width: 100%; height: 100%; display: none; flex-direction: column; justify-content: center; align-items: center; background-color: rgba(5, 5, 20, 0.98); z-index: 30; padding: 20px; box-sizing: border-box;">
    <h2 style="color: #f1c40f; text-shadow: 0 0 8px #f1c40f; margin-bottom: 20px; letter-spacing: 2px;">HANGAR ESTELAR</h2>
    
    <!-- Cartões de Naves -->
    <div style="display: flex; gap: 15px; width: 90%; max-width: 550px; margin-bottom: 25px;">
        <!-- Card 1: Interceptor -->
        <div class="ship-card active" data-ship="interceptor" style="flex: 1; background: #0c0c20; border: 2px solid #3498db; border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.3s;">
            <div style="height: 60px; display: flex; justify-content: center; align-items: center;">
                <svg width="45" height="45" viewBox="0 0 100 100"><polygon points="50,0 100,100 50,70 0,100" fill="#3498db"/><rect x="45" y="70" width="10" height="20" fill="#e74c3c"/></svg>
            </div>
            <h3 style="color: white; margin: 10px 0 5px 0; font-size: 16px;">Interceptor</h3>
            <p style="color: #aaa; font-size: 11px; margin: 0 0 10px 0;">Vel: ⚡⚡ (7.0)<br>Vida: 💚💚 (100)</p>
            <span class="ship-status" style="font-size: 12px; font-weight: bold; color: #3498db;">SELECIONADA</span>
        </div>
        
        <!-- Card 2: Dreadnought -->
        <div class="ship-card" data-ship="dreadnought" style="flex: 1; background: #0c0c20; border: 2px solid #333; border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.3s;">
            <div style="height: 60px; display: flex; justify-content: center; align-items: center;">
                <svg width="55" height="55" viewBox="0 0 100 100"><polygon points="50,0 80,30 100,100 50,85 0,100 20,30" fill="#9b59b6"/><rect x="25" y="80" width="10" height="15" fill="#e74c3c"/><rect x="65" y="80" width="10" height="15" fill="#e74c3c"/></svg>
            </div>
            <h3 style="color: white; margin: 10px 0 5px 0; font-size: 16px;">Dreadnought</h3>
            <p style="color: #aaa; font-size: 11px; margin: 0 0 10px 0;">Vel: ⚡ (4.5)<br>Vida: 💚💚💚 (150)</p>
            <span class="ship-status" style="font-size: 12px; font-weight: bold; color: #f1c40f;">150 Moedas</span>
        </div>
        
        <!-- Card 3: Phantasm -->
        <div class="ship-card" data-ship="phantasm" style="flex: 1; background: #0c0c20; border: 2px solid #333; border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.3s;">
            <div style="height: 60px; display: flex; justify-content: center; align-items: center;">
                <svg width="40" height="40" viewBox="0 0 100 100"><polygon points="50,0 90,80 50,60 10,80" fill="#2ecc71"/><polygon points="50,30 70,80 50,70 30,80" fill="#26a69a"/><rect x="47" y="60" width="6" height="15" fill="#00e676"/></svg>
            </div>
            <h3 style="color: white; margin: 10px 0 5px 0; font-size: 16px;">Phantasm</h3>
            <p style="color: #aaa; font-size: 11px; margin: 0 0 10px 0;">Vel: ⚡⚡⚡ (10.5)<br>Vida: 💚 (80)</p>
            <span class="ship-status" style="font-size: 12px; font-weight: bold; color: #f1c40f;">300 Moedas</span>
        </div>
    </div>
    
    <div style="text-align: center; color: #ccc; margin-bottom: 20px; font-size: 12px; max-width: 450px; height: 35px;" id="ship-description">
        Escolha sua belonave para iniciar o ataque.
    </div>
    
    <!-- Rodapé do Hangar -->
    <div style="display: flex; justify-content: space-between; align-items: center; width: 90%; max-width: 550px;">
        <div style="color: #f1c40f; font-weight: bold; font-size: 16px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f1c40f"><circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/><text x="12" y="16" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">$</text></svg>
            <span>SALDO: <span id="hangar-coins-count">0</span></span>
        </div>
        <button id="close-hangar-btn" style="padding: 10px 25px; font-size: 14px; font-weight: bold; background-color: #333; color: white; border: none; border-radius: 5px; cursor: pointer;">VOLTAR</button>
    </div>
</div>
```

#### 3.2 Lógica do Hangar
Implementar a interação para compra e seleção de naves:

```javascript
function initHangar() {
    const startScreen = document.getElementById('start-screen');
    const hangarModal = document.getElementById('hangar-modal');
    const hangarBtn = document.getElementById('hangar-btn');
    const closeHangarBtn = document.getElementById('close-hangar-btn');
    const startCoins = document.getElementById('start-coins-count');
    const hangarCoins = document.getElementById('hangar-coins-count');
    
    // Atualizar moedas nos displays
    startCoins.textContent = playerCoins;
    hangarCoins.textContent = playerCoins;
    
    hangarBtn.addEventListener('click', () => {
        hangarCoins.textContent = playerCoins;
        updateHangarCards();
        hangarModal.style.display = 'flex';
    });
    
    closeHangarBtn.addEventListener('click', () => {
        hangarModal.style.display = 'none';
        startCoins.textContent = playerCoins;
    });
    
    // Evento de clique nos cartões
    document.querySelectorAll('.ship-card').forEach(card => {
        card.addEventListener('click', () => {
            const shipId = card.getAttribute('data-ship');
            const spec = SHIP_SPECS[shipId];
            
            document.getElementById('ship-description').textContent = spec.description;
            
            if (unlockedShips.includes(shipId)) {
                // Selecionar nave já desbloqueada
                activeShip = shipId;
                localStorage.setItem('spaceShooterActiveShip', activeShip);
                updateHangarCards();
                applyShipSpecs();
                showNotification(`Nave ${spec.name} Selecionada!`, spec.color);
            } else {
                // Tentar comprar a nave
                if (playerCoins >= spec.price) {
                    playerCoins -= spec.price;
                    unlockedShips.push(shipId);
                    activeShip = shipId;
                    
                    localStorage.setItem('spaceShooterCoins', playerCoins);
                    localStorage.setItem('spaceShooterUnlockedShips', JSON.stringify(unlockedShips));
                    localStorage.setItem('spaceShooterActiveShip', activeShip);
                    
                    hangarCoins.textContent = playerCoins;
                    updateHangarCards();
                    applyShipSpecs();
                    showNotification(`Nave ${spec.name} Desbloqueada!`, spec.color);
                } else {
                    showNotification(`Créditos Insuficientes! Faltam ${spec.price - playerCoins} moedas.`, "#e74c3c");
                }
            }
        });
    });
}

function updateHangarCards() {
    document.querySelectorAll('.ship-card').forEach(card => {
        const shipId = card.getAttribute('data-ship');
        const spec = SHIP_SPECS[shipId];
        const statusSpan = card.querySelector('.ship-status');
        
        card.style.borderColor = '#333';
        
        if (unlockedShips.includes(shipId)) {
            if (activeShip === shipId) {
                card.style.borderColor = spec.color;
                card.style.boxShadow = `0 0 10px ${spec.color}`;
                statusSpan.textContent = "SELECIONADA";
                statusSpan.style.color = spec.color;
            } else {
                card.style.borderColor = "#555";
                card.style.boxShadow = 'none';
                statusSpan.textContent = "DESBLOQUEADA";
                statusSpan.style.color = "#2ecc71";
            }
        } else {
            card.style.boxShadow = 'none';
            statusSpan.textContent = `${spec.price} Créditos`;
            statusSpan.style.color = "#f1c40f";
        }
    });
}

function applyShipSpecs() {
    const spec = SHIP_SPECS[activeShip];
    
    // Atualizar tamanho do SVG do player no DOM
    player.style.width = spec.width + 'px';
    player.style.height = spec.height + 'px';
    player.innerHTML = spec.svg;
    
    // Atualizar os limites de vida do jogador
    playerMaxHP = spec.maxHP;
    playerCurrentHP = playerMaxHP;
}
```

*Modificação do Ganho de Moedas*:
A cada inimigo morto, conceder moedas ao jogador. No `resetGame()` e na morte de inimigos:
```javascript
// Na destruição de inimigo normal em checkCollisions()
playerCoins += 1;
localStorage.setItem('spaceShooterCoins', playerCoins);

// Na derrota de Boss em defeatBoss()
playerCoins += 20;
localStorage.setItem('spaceShooterCoins', playerCoins);
```

---

### 4. Placar Local de Líderes (Leaderboard)

#### 4.1 Estrutura e Interface de Recordes
Em vez de salvar apenas uma única pontuação máxima no `localStorage`, gerenciaremos uma lista contendo os **5 melhores resultados** agregados pelo nome das iniciais (3 caracteres).

*Design do Painel no Game Over (HTML)*:
Ajustar o `#game-over` para incluir a tabela de Recordes e o painel de input:

```html
<div id="game-over" style="display: none; position: absolute; width: 100%; height: 100%; background-color: rgba(5,5,15,0.95); z-index: 20; flex-direction: column; justify-content: center; align-items: center;">
    <div style="font-size: 32px; color: #ff3838; font-weight: bold; text-shadow: 0 0 10px #ff3838; margin-bottom: 10px; letter-spacing: 3px;">FROTA DESTRUÍDA</div>
    <div id="final-score" style="font-size: 20px; color: white; margin-bottom: 15px;">Score: 0</div>
    
    <!-- Formulário para Inserir Iniciais (Só aparece se qualificar para o Top 5) -->
    <div id="leaderboard-input-panel" style="display: none; background-color: #0c0c20; border: 1px solid #00f0ff; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center; width: 80%; max-width: 320px;">
        <div style="color: #00f0ff; font-weight: bold; font-size: 12px; margin-bottom: 10px;">NOVO RECORDE DO SETOR!</div>
        <input type="text" id="player-initials-input" maxlength="3" placeholder="SNA" style="width: 80px; text-align: center; text-transform: uppercase; padding: 5px; font-size: 18px; font-weight: bold; background: #050510; border: 1px solid #00f0ff; color: white; outline: none; border-radius: 4px; letter-spacing: 2px;">
        <button id="save-score-btn" style="margin-top: 10px; padding: 6px 15px; font-size: 13px; background-color: #00f0ff; color: black; font-weight: bold; border-radius: 4px;">SALVAR</button>
    </div>
    
    <!-- Tabela de Líderes -->
    <div id="leaderboard-table-container" style="background-color: rgba(0, 0, 0, 0.4); border: 1px solid #333; border-radius: 8px; padding: 12px; width: 80%; max-width: 350px; margin-bottom: 15px;">
        <div style="color: #f1c40f; font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px; letter-spacing: 1px;">HALL DA FAMA (Setor Local)</div>
        <table id="leaderboard-table" style="width: 100%; border-collapse: collapse; font-size: 13px; color: #ccc;">
            <!-- Linhas de recordistas inseridas dinamicamente -->
        </table>
    </div>

    <button id="restart-button" style="margin-top: 10px;">Jogar Novamente</button>
</div>
```

#### 4.2 Lógica do Leaderboard
Implementar métodos para ler, verificar e salvar os recordistas no `localStorage`:

```javascript
// Obtém lista ordenada de líderes
function getLeaderboard() {
    const data = localStorage.getItem('spaceShooterLeaderboard');
    return data ? JSON.parse(data) : [];
}

// Verifica se a pontuação atual se qualifica no Top 5
function checkLeaderboardQualification() {
    const list = getLeaderboard();
    if (list.length < 5) return true;
    return score > list[list.length - 1].score;
}

// Salva nova pontuação na lista
function saveToLeaderboard(initials) {
    let list = getLeaderboard();
    const newEntry = {
        name: (initials || 'AAA').toUpperCase(),
        score: score,
        date: new Date().toLocaleDateString()
    };
    
    list.push(newEntry);
    // Ordenar de forma decrescente por score
    list.sort((a, b) => b.score - a.score);
    // Manter apenas top 5
    list = list.slice(0, 5);
    
    localStorage.setItem('spaceShooterLeaderboard', JSON.stringify(list));
    renderLeaderboardTable();
}

// Renderiza a tabela de recordes no DOM
function renderLeaderboardTable() {
    const table = document.getElementById('leaderboard-table');
    table.innerHTML = '';
    
    const list = getLeaderboard();
    
    if (list.length === 0) {
        table.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 10px; color: #666;">Nenhum recorde registrado ainda</td></tr>`;
        return;
    }
    
    list.forEach((entry, idx) => {
        const colors = ['#f1c40f', '#e67e22', '#bdc3c7', '#7f8c8d', '#7f8c8d'];
        const medalColor = colors[idx] || '#7f8c8d';
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #1a1a2e';
        row.innerHTML = `
            <td style="padding: 6px 10px; color: ${medalColor}; font-weight: bold; width: 30px;">#${idx + 1}</td>
            <td style="padding: 6px 10px; font-weight: bold; letter-spacing: 1px; color: white;">${entry.name}</td>
            <td style="padding: 6px 10px; text-align: right; font-weight: bold; color: #00ffff;">${entry.score.toLocaleString()} pts</td>
        `;
        table.appendChild(row);
    });
}
```

*Modificação do Game Over (`gameOver`)*:
```javascript
function gameOver() {
    if (isGameOver) return;
    isGameOver = true;
    finalScoreElement.textContent = `Score: ${score.toLocaleString()} pts`;
    
    gameOverScreen.style.display = 'flex';
    if(gameLoopId) cancelAnimationFrame(gameLoopId);
    deactivateSpecial();
    player.style.display = 'none';
    
    playSound(sfxGameOver);
    stopMusic();
    playSound(bgmGameOver);
    
    // Lógica do Leaderboard
    const inputPanel = document.getElementById('leaderboard-input-panel');
    const initialsInput = document.getElementById('player-initials-input');
    const saveBtn = document.getElementById('save-score-btn');
    
    renderLeaderboardTable();
    
    if (score > 0 && checkLeaderboardQualification()) {
        inputPanel.style.display = 'block';
        initialsInput.value = '';
        initialsInput.focus();
        
        // Define evento de salvamento uma única vez
        saveBtn.onclick = () => {
            const initials = initialsInput.value.trim().substring(0, 3) || 'PIL';
            saveToLeaderboard(initials);
            inputPanel.style.display = 'none';
        };
    } else {
        inputPanel.style.display = 'none';
    }
    
    // ... restante da limpeza do gameover ...
}
```

---

### 5. Efeitos Visuais Premium

Para garantir o wow factor e enriquecer a jogabilidade visualmente (em harmonia com a estética cyberpunk e neon do projeto):
1. **Flashing na Coleta de Itens**: Criar flash de cor na tela ao coletar powerups.
   - Tiro Triplo (Azul): Flash azul rápido (`rgba(0,240,255,0.2)`).
   - Escudo (Amarelo): Flash dourado rápido (`rgba(241,196,15,0.2)`).
   - Bomba (Vermelho): Flash branco/vermelho estroboscópico.
2. **Escudo Cintilante**: O elemento `#player.shielded::after` aplicará um degradê rotativo com brilho neon usando `box-shadow` e animação CSS Keyframe para criar um escudo volumétrico ativo.
3. **Notificação Flutuante no Centro**: A função `showNotification(msg, color)` criará mensagens rápidas elegantes que deslizam do centro da tela para cima e desaparecem com fade-out, mantendo o jogador constantemente ciente do status das melhorias temporárias.

---

## ❓ Dúvidas para o TL ou o PO

Para garantir que a implementação seja estável, de alta qualidade e totalmente alinhada com as diretrizes do projeto, levantamos as seguintes dúvidas técnicas e de design:

1. **Coexistência ou Substituição do Sistema de Tiro Especial**: O `index.html` já possui um sistema de "Tiro Especial" ativado com a barra de espaço, que consome cargas limitadas (`specialCharges`) e dura 2 segundos. O novo power-up de "Tiro Triplo" (Azul) é ativado por coleta, dura 8 segundos e não consome cargas. Como esses sistemas devem interagir? 
   * A coleta do power-up de Tiro Triplo deve apenas habilitar o disparo triplo de forma passiva temporária por 8 segundos (sem interferir nas cargas especiais de espaço)?
   * Ou o novo power-up deve substituir completamente o sistema anterior?

2. **Remoção ou Manutenção dos Power-ups Antigos**: A especificação de probabilidade de drop no refinamento cobre apenas os três novos power-ups (`triple_shot`, `energy_shield`, `fusion_bomb`). Isso significa que os power-ups anteriores do jogo (`health` / restauração de vida, `homing` / tiros guiados, `special` / recarga de tiro especial) devem ser completamente removidos das mecânicas de spawn, ou devemos integrá-los à nova probabilidade de drop?
   * *Sugestão do Desenvolvedor*: Seria interessante manter pelo menos o de `health` (com chance reduzida) para que o jogador tenha como recuperar vida durante a partida.

3. **Migração de Recorde Único no Leaderboard (Top 5)**: O sistema legado gerencia apenas uma pontuação máxima (`spaceShooterHighScore`). Na nova tabela de líderes local (Top 5), devemos tentar carregar esse valor antigo como um recorde inicial (ex: "PIL - [High Score antigo]") ou podemos iniciar a lista de recordes totalmente zerada para novos registros? Além disso, o rótulo "High Score" estático na tela de Game Over deve ser substituído pela pontuação do jogador na primeira posição (#1) do Leaderboard?

---

## 📢 Respostas do Tech Lead (TL)

Abaixo estão as definições estratégicas e de arquitetura para sanar as dúvidas levantadas. Lembre-se de manter o foco na **estabilidade do game loop** e em **boas práticas de Clean Code**:

### 1. Coexistência do Sistema de Tiro Especial
* **Decisão**: **Coexistência Passiva**.
* **Como implementar**: O power-up **Tiro Triplo (Azul)** deve atuar como um modificador temporário do tiro normal. Ele não consome e não interage com as cargas do `specialCharges` (ativado pelo Espaço).
* **Tratamento de Concorrência**: 
  * Se o jogador estiver com o *Tiro Triplo* ativo e pressionar Espaço para ativar o *Tiro Especial* legado, o Tiro Especial (que dura 2 segundos) terá prioridade máxima na renderização e tipo de projétil (tiros especiais azuis em leque de 3 lasers pesados com dano ampliado).
  * O temporizador de 8 segundos do *Tiro Triplo* continuará correndo normalmente em segundo plano. Assim que os 2 segundos do Tiro Especial terminarem, se ainda restar tempo no Tiro Triplo, a nave volta a disparar o Tiro Triplo passivo até expirar.

### 2. Integração e Balanceamento dos Power-ups
* **Decisão**: **Manutenção Balanceada dos Itens Legados**.
* **Como implementar**: Para manter o loop de sobrevivência saudável (especialmente o de cura), não removeremos os itens antigos. A taxa de drop global de **15%** dos inimigos destruídos é mantida, mas a distribuição interna dos itens será a seguinte:
  * **Novos Power-ups (60% do total dropado)**:
    * `triple_shot` (Tiro Triplo - Azul): **25%**
    * `energy_shield` (Escudo - Amarelo): **25%**
    * `fusion_bomb` (Bomba de Fusão - Vermelho): **10%**
  * **Itens Clássicos/Legados (40% do total dropado)**:
    * `health` (Cura/Vida): **20%** (Garante sustentabilidade nas fases avançadas)
    * `homing` (Tiro Guiado): **10%**
    * `special` (Recarga de Tiro Especial): **10%**

### 3. Migração do Recorde Único e UI do Leaderboard
* **Decisão**: **Migração Elegante sem Perda de Dados**.
* **Como implementar**:
  * No carregamento inicial do jogo (`window.onload` ou na inicialização da pontuação), verifique se existe a chave `spaceShooterHighScore` no `localStorage`.
  * Se ela existir e a nova lista de líderes (`spaceShooterLeaderboard`) ainda não estiver criada, inicialize a lista contendo uma única entrada de recorde: `{ name: "LEG", score: highScoreLegado, date: new Date().toLocaleDateString() }`.
  * O elemento `#high-score` no menu de Game Over e HUD deve ler dinamicamente o valor da **posição #1 (primeiro elemento)** da tabela de recordes. Se a tabela estiver vazia, faça o fallback para `spaceShooterHighScore` ou `0`.

---
*Assinado: Antigravity - Tech Lead*

---

## ❓ Novas Dúvidas do Desenvolvedor para o TL ou o PO

Durante a preparação do ambiente e planejamento detalhado do código da tarefa, identificamos alguns pontos de comportamento que exigem alinhamento com o TL ou o PO para garantir a estabilidade do minijogo:

1. **Critério de desempate no Leaderboard**: Se dois jogadores atingirem a mesma pontuação exata, como deve se comportar a ordenação do Top 5? O recorde mais antigo deve ficar acima (prioridade cronológica) ou o mais recente deve passar à frente?
2. **Tratamento de Iniciais em Branco ou Cancelamento**: Se o jogador se qualificar para o Top 5, mas clicar em "SALVAR" deixando as iniciais em branco ou não digitando os 3 caracteres, devemos persistir a pontuação com as iniciais padrão `'PIL'` ou ignorar o salvamento?
3. **Persistência Limpa (Migração)**: Após realizarmos a migração da pontuação máxima do recorde legado (`spaceShooterHighScore`) para a nova tabela no `localStorage`, é recomendado remover a chave legado ou mantê-la ativa para retrocompatibilidade em eventuais rollbacks?

---

## 📢 Respostas do Tech Lead (TL) às Novas Dúvidas (Fase 2)

Abaixo estão as decisões técnicas tomadas para garantir estabilidade e o melhor fluxo para o jogador:

### 1. Critério de Desempate no Leaderboard
* **Decisão**: **Prioridade Cronológica (Mais Antigo Fica Acima)**.
* **Motivo**: Respeito ao feito histórico do jogador que alcançou a pontuação primeiro. Um novo jogador só "rouba" a posição se superar o score anterior.
* **Como implementar**: A ordenação principal deve ser por pontuação (decrescente). Em caso de empate, utilizaremos um carimbo de data/hora (timestamp) salvo no registro para manter o mais antigo no topo. Se a data estiver formatada apenas como string de exibição local, recomendo adicionar um campo `timestamp: Date.now()` em cada entrada da lista para facilitar a comparação matemática precisa de desempate.

### 2. Tratamento de Iniciais em Branco ou Curtas
* **Decisão**: **Sanitização Robustecida com Fallback Automático para 'PIL'**.
* **Motivo**: Jamais frustrar o jogador perdendo sua pontuação histórica por um erro ou clique acidental no botão "SALVAR".
* **Como implementar**: 
  * Remova espaços extras e caracteres não-alfanuméricos usando Expressões Regulares: `let initials = initialsInput.value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();`.
  * Se o resultado estiver vazio, defina como `'PIL'`.
  * Se o resultado tiver menos de 3 caracteres, complete o restante com a letra `'A'` (ex: "WI" vira "WIA") ou simplesmente aceite o tamanho menor se preferir, mas para manter a consistência estética de 3 colunas fixas no placar, completar com caracteres de preenchimento ou aplicar fallback para `'PIL'` é o ideal.

### 3. Persistência Limpa (Migração de Chave Legada)
* **Decisão**: **Manutenção da Chave Legada para Retrocompatibilidade (Read-Only)**.
* **Motivo**: Abordagem conservadora de segurança. Caso haja qualquer problema com a atualização (por exemplo, necessidade urgente de rollback da feature), as pontuações antigas dos jogadores estarão seguras.
* **Como implementar**: Após realizar a migração inicial bem-sucedida do recorde antigo para a nova estrutura de dados, **não remova** a chave `spaceShooterHighScore`. Deixe-a lá intocada. Novos recordes serão escritos unicamente na chave `spaceShooterLeaderboard`, e o HUD lerá da posição #1 dessa lista, mas a chave antiga permanecerá persistida como backup passivo.

---
*Assinado: Antigravity - Tech Lead*

---

## 🧪 Observação QA

**Data**: 31/05/2026  
**Analista de QA**: Antigravity (QA)  

### 📋 Status da Validação
*   **Testável**: ❌ Não
*   **Motivo**: A funcionalidade (Sistema de Power-Ups, Naves Desbloqueáveis e Placar de Recordes Local) ainda está no status **`In Progress`** no backlog global e **não foi implementada** no código-fonte do jogo (`space_shooter/index.html`).
*   **Ação**: A tarefa deve ser concluída pelo desenvolvedor, passar por Code Review pelo Tech Lead, ser aprovada e movida para `Ready for QA` antes que os testes automatizados e manuais possam ser efetuados e suas evidências registradas.

### 🎯 Plano de Testes Futuro (Critérios a validar)
Quando a tarefa estiver pronta para QA, as seguintes validações deverão ser realizadas no navegador (Playwright/Puppeteer/Manual):
1.  **Drop e Efeito dos Power-Ups (Azul, Amarelo e Vermelho)**:
    *   Verificar se inimigos destruídos soltam power-ups com 15% de chance.
    *   **Tiro Triplo (Azul)**: Validar se a nave dispara 3 feixes de laser em leque por 8 segundos. Verificar o comportamento de concorrência com o Tiro Especial (Espaço) garantindo prioridade máxima para o Tiro Especial (2s) e retorno para o Tiro Triplo passivo se ainda houver tempo.
    *   **Escudo de Energia (Amarelo)**: Validar se absorve exatamente 1 colisão de inimigo/tiro e dura no máximo 12 segundos, adicionando a classe `.shielded` e concedendo o frame de invulnerabilidade (800ms) pós-explosão do escudo.
    *   **Bomba de Fusão (Vermelho)**: Confirmar a limpeza instantânea de todos os inimigos normais e lacaios na tela com efeito visual de flash e tremor. No caso de Boss, garantir que causa 100 pontos de dano em vez de morte instantânea.
2.  **Sistema de Hangar e Frotas**:
    *   Acessar o Hangar a partir da tela de menu.
    *   Tentar selecionar/comprar os modelos *Interceptor*, *Dreadnought* (150 moedas, disparo duplo nativo permanente) e *Phantasm* (300 moedas, maior velocidade, menor hitbox).
    *   Confirmar que o saldo de moedas no display da tela inicial e no Hangar é atualizado e as naves são salvas no `localStorage`.
3.  **Leaderboard Local (Top 5)**:
    *   Registrar novas pontuações e verificar se apenas as 5 maiores são ordenadas e persistidas no `localStorage` com 3 iniciais.
    *   Confirmar a migração do recorde legado `spaceShooterHighScore` se a lista estiver vazia.
    *   Verificar o critério de desempate cronológico (em caso de pontuações idênticas, o registro mais antigo deve ficar acima).
    *   Validar a sanitização das iniciais (com fallback automático para `'PIL'` para entradas vazias e preenchimento com `'A'` se menor que 3 caracteres).

