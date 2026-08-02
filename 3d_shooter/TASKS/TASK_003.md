# 📝 TASK-3D_SHOOTER: Arsenal de Armas Avançado (Plasma & Mísseis), IA de Ataque à Distância e HUD com Minimapa Tático Neon

## 👤 User Story
* **Como** jogador do minijogo **3D Shooter**,
* **Eu quero** ter acesso a novas armas com comportamentos de projéteis físicos (Rifle de Plasma rápido e Lançador de Mísseis com dano em área), enfrentar inimigos que atacam à distância com projéteis esquiváveis, e visualizar a disposição do mapa e ameaças através de um Minimapa Tático Neon no HUD,
* **Para que** o combate em primeira pessoa exija mais movimentação estratégica, ofereça maior variedade tática de poder e proporcione uma imersão sensorial de alta qualidade.

---

## 🎯 Critérios de Aceitação

1. **Arsenal de Armas Avançado (Projéteis Físicos)**:
   * **Rifle de Plasma (Arma 3)**:
     * Cadência de tiro ultra-rápida (fire rate de 0.1s).
     * Dispara projéteis de plasma físicos (esferas azuis neon ciano `#00f3ff` com rastro brilhante) que viajam a uma velocidade de 12 unidades por segundo.
     * Causa 10 de dano por impacto direto.
     * Consome munição de Plasma (nova categoria de pickup no mapa, cor `#00f3ff`).
   * **Lançador de Mísseis (Arma 4)**:
     * Baixa cadência de tiro (fire rate de 1.2s).
     * Dispara um míssil físico (sprite tridimensional ou representação direcional) viajando a 8 unidades por segundo.
     * Ao colidir com qualquer parede ou inimigo, gera uma explosão de raio de $1.8$ unidades do mapa.
     * O dano no centro é de 100, decaindo linearmente até 0 na borda do raio de explosão (Splash Damage).
     * A explosão deve gerar um clarão luminoso na tela, um tremor de tela (Screen Shake) forte (amplitude de 15px decaindo em 0.5s), e ejetar de 15 a 25 partículas de faíscas incandescentes/fumaça.
     * Consome munição de Mísseis (nova pickup, cor `#ff3300`).

2. **Inimigo Conjurador à Distância (Cyber-Imp)**:
   * Adicionar um novo tipo de inimigo: `cyber_imp` (cor roxa/magenta neon `#ff00ff`, HP: 80, velocidade: 1.2).
   * **IA de Combate**: Ao avistar o jogador, em vez de correr em linha reta para corpo a corpo, tenta manter uma distância de 4.0 a 6.0 unidades.
   * Se estiver mais longe, aproxima-se. Se estiver mais perto, afasta-se (movimentação de recuo/manutenção de distância).
   * A cada 2.0 a 3.0 segundos (cooldown aleatório), realiza um ataque à distância: conjura e dispara um projétil de energia magenta (`#ff00ff`) em direção à posição atual do jogador (velocidade de 5 unidades por segundo).
   * O jogador pode e deve esquivar lateralmente (strafe) do projétil para evitar receber 15 de dano.

3. **Minimapa Tático Neon**:
   * Renderizar um minimapa no canto superior direito do HUD (sobreposto ao canvas usando um Canvas secundário ou renderizando diretamente no Canvas principal na etapa pós-processamento).
   * O minimapa deve exibir o layout do mapa 2D ao redor do jogador (raio de exibição de 8 unidades ou mapa completo dependendo do tamanho).
   * **Estética Neon Cyber**: Paredes representadas em azul escuro semi-transparente com linhas neon ciano (`#00f3ff`), o jogador como um triângulo amarelo brilhante (`#ffeb3b`) apontando na direção de seu ângulo de visão, inimigos visíveis como pontos vermelhos piscantes (`#ff3333`) e projéteis ativos como pequenos pixels neon.
   * Permitir alternar a exibição do minimapa entre modo compacto, modo expandido e desligado pressionando a tecla `M` (Mapeamento de Teclas).

4. **Web Audio API Synth para os Efeitos de Combate**:
   * Desenhar efeitos sonoros sintetizados em tempo real:
     * *Rifle de Plasma*: Pulso de frequência senoidal descendente ultra-rápida (laser peew-peew).
     * *Míssil (Disparo)*: Ruído de detonação com rampa passa-baixa simulando propulsão a jato.
     * *Explosão de Míssil*: Estrondo pesado de ruído branco com declínio exponencial de ganho e filtro passa-baixa.
     * *Ataque do Cyber-Imp*: Som de carregamento e disparo mágico ciber-medieval.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/3d_shooter/index.html` (e/ou scripts associados).
* **Estrutura de Projéteis (`Projectile`)**:
  * Criar um array global `projectiles = []` para gerenciar projéteis físicos (aliados e inimigos).
  * Cada projétil tem propriedades: `x`, `y`, `z` (altura), `vx`, `vy`, `vz`, `radius`, `damage`, `owner` (`'player'` ou `'enemy'`), `type` (`'plasma'`, `'rocket'`, `'imp-ball'`), `active: boolean` e `color`.
  * Na função `update(dt)`, atualizar a posição dos projéteis, processar colisões com paredes do grid `map` e verificar hitboxes contra as entidades alvo (inimigos ou jogador).
* **Lógica de Explosão (Splash Damage)**:
  * Ao detonar um foguete na coordenada $(x_e, y_e)$:
    * Encontrar todos os inimigos ativos. Calcular a distância euclidiana $d = \sqrt{(x_{inimigo} - x_e)^2 + (y_{inimigo} - y_e)^2}$.
    * Se $d \le 1.8$, aplicar dano: $Dano = 100 \times (1 - d / 1.8)$.
    * Se o jogador estiver no raio de explosão, aplicar a mesma fórmula de dano ao jogador (fogo amigo), adicionando intensidade de tremor e flash vermelho.
* **Mapeamento de Pickups**:
  * Adicionar novos códigos de bloco no mapa ou geradores dinâmicos para munições de Plasma (tipo `7`) e Mísseis (tipo `8`), integrando na varredura `scanMapForPickups()` e HUD.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Muito Alta (Expande drasticamente as mecânicas de gameplay, adicionando mobilidade de esquiva, novas armas de projéteis e ferramenta de navegação tática).
* **Esforço Estimado**: Média-Alta (Exige controle e física de projéteis no Canvas 3D e renderização de mini-viewport).
* **Área**: Front-end / Canvas 2D Engine / Game Design / Web Audio API.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

Abaixo estão detalhados os métodos, estruturas de dados e equações para a codificação da funcionalidade.

### 1. Estrutura e Física de Projéteis (`Projectile`)

Criaremos uma classe ou estrutura literal para representar e gerenciar as trajetórias dos projéteis no espaço do mapa:

```javascript
// Array global de projéteis ativos
let projectiles = [];

function spawnProjectile(owner, type, x, y, angle, speed, damage, color) {
    projectiles.push({
        owner: owner,       // 'player' ou 'enemy'
        type: type,         // 'plasma', 'rocket', 'imp-ball'
        x: x,
        y: y,
        z: 0.5,             // Altura média
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 0.15,
        damage: damage,
        color: color,
        active: true,
        life: type === 'plasma' ? 3.0 : 5.0 // Tempo limite de segurança em segundos
    });
}
```

Na rotina principal `update(dt)`, processar a translação e detecção de colisões no grid 2D:

```javascript
function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p.active) {
            projectiles.splice(i, 1);
            continue;
        }

        // Movimentação
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        // Verificação de tempo limite ou colisão com parede
        const gridX = Math.floor(p.x);
        const gridY = Math.floor(p.y);
        
        if (p.life <= 0 || gridX < 0 || gridX >= mapWidth || gridY < 0 || gridY >= mapHeight || map[gridY][gridX] > 0) {
            if (p.type === 'rocket') {
                explodeRocket(p.x, p.y);
            } else {
                // Efeito de impacto simples de plasma
                createImpactParticles(p.x, p.y, p.color, Math.atan2(p.vy, p.vx));
            }
            p.active = false;
            projectiles.splice(i, 1);
            continue;
        }

        // Colisão com entidades (Inimigos ou Jogador)
        if (p.owner === 'player') {
            // Testar contra todos os inimigos
            for (let j = 0; j < enemies.length; j++) {
                const e = enemies[j];
                if (e.state === 'dead' || e.state === 'dying') continue;

                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < e.size + p.radius) {
                    // Impacto direto
                    damageEnemy(e, p.damage);
                    if (p.type === 'rocket') {
                        explodeRocket(p.x, p.y);
                    } else {
                        createImpactParticles(p.x, p.y, p.color, Math.atan2(p.vy, p.vx));
                    }
                    p.active = false;
                    break;
                }
            }
        } else if (p.owner === 'enemy') {
            // Testar contra o jogador
            const dx = p.x - player.x;
            const dy = p.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.3 + p.radius) { // Raio de colisão aproximado do jogador
                damagePlayer(p.damage);
                createImpactParticles(p.x, p.y, p.color, Math.atan2(p.vy, p.vx));
                p.active = false;
            }
        }

        if (!p.active) {
            projectiles.splice(i, 1);
        }
    }
}
```

### 2. Dano Radial e Efeitos de Explosão

A lógica do míssil exige a detonação em área:

```javascript
function explodeRocket(ex, ey) {
    const splashRadius = 1.8;
    const maxDamage = 100;

    // Efeitos Sonoros e de Juice
    playExplosionSound();
    triggerScreenShake(15, 0.5); // 15px de amplitude decaindo em 0.5 segundos

    // Spawn de partículas de fogo e fumaça cinza
    for (let k = 0; k < 20; k++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = 1.0 + Math.random() * 4.0;
        const colorHex = Math.random() > 0.4 ? '#ff5500' : '#888888'; // Laranja ou Fumaça
        const r = colorHex === '#ff5500' ? 255 : 136;
        const g = colorHex === '#ff5500' ? 85 : 136;
        const b = colorHex === '#ff5500' ? 0 : 136;
        spawnParticle(ex, ey, 0.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, (Math.random() - 0.5) * 5, r, g, b, 4 + Math.random() * 4, 0.4 + Math.random() * 0.4);
    }

    // Aplicar dano aos inimigos no raio
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.state === 'dead' || e.state === 'dying') continue;

        const dx = e.x - ex;
        const dy = e.y - ey;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= splashRadius) {
            const damageFactor = 1 - (dist / splashRadius);
            const finalDamage = Math.round(maxDamage * damageFactor);
            if (finalDamage > 0) {
                damageEnemy(e, finalDamage);
            }
        }
    }

    // Auto-dano no jogador (Splash damage próprio)
    const dxPlay = player.x - ex;
    const dyPlay = player.y - ey;
    const distPlay = Math.sqrt(dxPlay * dxPlay + dyPlay * dyPlay);

    if (distPlay <= splashRadius) {
        const damageFactor = 1 - (distPlay / splashRadius);
        const finalDamage = Math.round(maxDamage * damageFactor * 0.5); // Fogo amigo atenuado a 50%
        if (finalDamage > 0) {
            damagePlayer(finalDamage);
            triggerDamageVignette(0.8);
        }
    }
}
```

### 3. IA de Recuo do Cyber-Imp

No método `updateEnemies(dt)`, adicionaremos suporte à movimentação tática do `cyber_imp`:

```javascript
function updateCyberImpIA(e, dt) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Se não tiver visão direta do jogador, atua como Grunt clássico de busca
    const hasSight = checkLineOfSight(e.x, e.y, player.x, player.y);
    if (!hasSight) {
        moveEnemyTowards(e, player.x, player.y, dt);
        return;
    }

    e.angle = Math.atan2(dy, dx); // Olha diretamente para o jogador

    // Movimentação tática baseada em distância
    const optimalDist = 5.0;
    const tolerance = 1.0;

    if (dist > optimalDist + tolerance) {
        // Muito longe: aproxima-se do jogador
        moveEnemyTowards(e, player.x, player.y, dt);
    } else if (dist < optimalDist - tolerance) {
        // Muito perto: recua (corre na direção oposta)
        const retreatX = e.x - Math.cos(e.angle) * e.speed * dt;
        const retreatY = e.y - Math.sin(e.angle) * e.speed * dt;
        
        // Verifica colisões antes de recuar
        if (!checkWallCollision(retreatX, retreatY, e.size)) {
            e.x = retreatX;
            e.y = retreatY;
        } else {
            // Se colidir na parede ao recuar, tenta strafar lateralmente
            const strafeAngle = e.angle + Math.PI / 2;
            const strafeX = e.x + Math.cos(strafeAngle) * e.speed * dt;
            const strafeY = e.y + Math.sin(strafeAngle) * e.speed * dt;
            if (!checkWallCollision(strafeX, strafeY, e.size)) {
                e.x = strafeX;
                e.y = strafeY;
            }
        }
    }

    // Ataque à Distância periódico
    const now = performance.now();
    if (!e.lastAttackTimestamp) e.lastAttackTimestamp = now;
    if (now - e.lastAttackTimestamp > 2500 + Math.random() * 1000) { // Cooldown de 2.5 a 3.5s
        e.lastAttackTimestamp = now;
        // Conjura esfera mágica roxa em direção ao jogador
        spawnProjectile('enemy', 'imp-ball', e.x, e.y, e.angle, 5.0, 15, '#ff00ff');
        playImpCastSound(e.x, e.y);
    }
}
```

### 4. Renderização do Minimapa Tático Neon

O minimapa será desenhado na tela usando uma função `renderMinimap()` executada logo após desenhar o mundo 3D e a arma do jogador:

```javascript
let showMinimap = 1; // 0 = Oculto, 1 = Compacto, 2 = Expandido

function renderMinimap() {
    if (showMinimap === 0) return;

    const size = showMinimap === 2 ? 200 : 120;
    const padding = 15;
    const mx = canvas.width - size - padding;
    const my = padding;

    // Fundo Glassmorphic
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 20, 0.75)';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(mx, my, size, size, 8);
    ctx.fill();
    ctx.stroke();
    ctx.clip(); // Restringe desenho das paredes e entidades ao quadrante do minimapa

    // Desenhar Grade de Paredes
    const scale = size / (showMinimap === 2 ? mapWidth : 8); // Zoom maior no modo compacto
    const centerX = player.x;
    const centerY = player.y;

    if (showMinimap === 1) {
        // Centralizado no jogador (Modo Radar Móvel)
        const startGridX = Math.floor(player.x - 4);
        const startGridY = Math.floor(player.y - 4);

        for (let y = startGridY; y <= startGridY + 8; y++) {
            for (let x = startGridX; x <= startGridX + 8; x++) {
                if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight && map[y][x] > 0) {
                    const rx = mx + size / 2 + (x - centerX) * scale;
                    const ry = my + size / 2 + (y - centerY) * scale;
                    ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
                    ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
                    ctx.lineWidth = 1;
                    ctx.fillRect(rx, ry, scale, scale);
                    ctx.strokeRect(rx, ry, scale, scale);
                }
            }
        }
    } else {
        // Exibição do Mapa Completo Estático
        const fullScaleX = size / mapWidth;
        const fullScaleY = size / mapHeight;
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                if (map[y][x] > 0) {
                    ctx.fillStyle = 'rgba(0, 243, 255, 0.25)';
                    ctx.fillRect(mx + x * fullScaleX, my + y * fullScaleY, fullScaleX, fullScaleY);
                }
            }
        }
    }

    // Desenhar Projéteis ativos no radar
    projectiles.forEach(p => {
        const rx = showMinimap === 1 ? mx + size / 2 + (p.x - centerX) * scale : mx + p.x * (size / mapWidth);
        const ry = showMinimap === 1 ? my + size / 2 + (p.y - centerY) * scale : my + p.y * (size / mapHeight);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenhar Inimigos
    enemies.forEach(e => {
        if (e.state === 'dead' || e.state === 'dying') return;
        const rx = showMinimap === 1 ? mx + size / 2 + (e.x - centerX) * scale : mx + e.x * (size / mapWidth);
        const ry = showMinimap === 1 ? my + size / 2 + (e.y - centerY) * scale : my + e.y * (size / mapHeight);
        
        ctx.fillStyle = e.state === 'chase' ? '#ff3333' : '#ffaa00';
        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenhar Pickups
    pickups.forEach(p => {
        const rx = showMinimap === 1 ? mx + size / 2 + (p.x - centerX) * scale : mx + p.x * (size / mapWidth);
        const ry = showMinimap === 1 ? my + size / 2 + (p.y - centerY) * scale : my + p.y * (size / mapHeight);
        ctx.fillStyle = p.color;
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
    });

    // Desenhar o Jogador (Triângulo direcional)
    const px = showMinimap === 1 ? mx + size / 2 : mx + player.x * (size / mapWidth);
    const py = showMinimap === 1 ? my + size / 2 : my + player.y * (size / mapHeight);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
}
```

### 5. Lógica de Áudio Procedural Analógica Pura

Para as novas mecânicas de áudio sem assets, criaremos as seguintes sínteses na Web Audio API:

```javascript
function playPlasmaLaserSound() {
    if (!audioContext || !isAudioInitialized) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);

    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(audioContext.currentTime + 0.12);
}

function playExplosionSound() {
    if (!audioContext || !isAudioInitialized) return;
    
    // Buffer de Ruído Branco para estrépito
    const bufferSize = audioContext.sampleRate * 0.6; // 0.6s
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.5);

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.4, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

    noiseSource.connect(filter).connect(gain).connect(masterGain);
    noiseSource.start();
    noiseSource.stop(audioContext.currentTime + 0.6);
}
```

---

## 🛠️ Notas de Implementação Requeridas

1. **Combate Físico vs Hitscan**:
   As armas originais (Pistola e Shotgun) usam a detecção baseada em Raycast direto para infligir danos instantâneos (Hitscan). As Armas 3 e 4 devem ignorar a verificação de hitscan padrão na função de disparo e invocar a função `spawnProjectile(...)` de sua categoria, garantindo física e renderização no loop 3D.
2. **Nova Escuta de Teclado**:
   Garantir o mapeamento das teclas `3` e `4` na função `setupInputHandlers` para selecionar as novas armas, e a tecla `M` para ciclar a visibilidade do minimapa (`showMinimap = (showMinimap + 1) % 3`).
3. **Mapeamento de Assets**:
   As sprites das novas armas (Rifle de Plasma e Lançador de Mísseis) devem ser desenhadas na HUD (Canvas 2D) com formas e geometrias neon correspondentes ao estilo retrô do jogo.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Seleção de Armas via Teclado**: **Decisão:** Mude a estrutura para usar mapeamento por índice ou uma array ordenada (ex: `1 -> pistol`, `2 -> shotgun`, `3 -> plasma`, `4 -> rocket`). Isso torna a lógica escalável.
2. **Posicionamento e Spawn das Pickups**: **Decisão:** O ideal é um spawn dinâmico periódico em posições aleatórias que estejam vazias e transitáveis. Isso evita termos que alterar muito os arrays estáticos do mapa.
3. **Integração do Áudio Procedural**: **Decisão:** Chame as funções de síntese (`playPlasmaLaserSound`) diretamente da rotina de disparo. O sistema de buffers legados pode permanecer apenas para sons que precisem dos samples nativos.
4. **Visibilidade do Minimapa**: **Decisão:** Intercepte a tecla `M` no evento `keydown` no handler global, alternando diretamente a variável `showMinimap`, e não gerencie em estado contínuo (no objeto `keys`) para evitar repetição acidental de toques.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `3d_shooter`
* **Status do Backlog**: Transicionado para `✅ Refined` em `BACKLOG.md`.
