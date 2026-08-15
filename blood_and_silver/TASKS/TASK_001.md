# 🧛 TASK-BLOOD_AND_SILVER: Inception — "Sangue & Prata" (Survival 2D: Armas, Passivos, Evoluções, Baús, Chefes, Áudio Procedural)

> **Fase**: Inception (AI-DLC) — documentação técnica de referência para o time de desenvolvimento.
> **Status da especificação**: `📋 Backlog` — quebrada em **etapas jogáveis** (seção 11); cada etapa vira uma subtask no `BACKLOG.md`.
> **Título**: **Sangue & Prata** · **Path/código**: `blood_and_silver` / `BLOOD_AND_SILVER`.
> **Arquivo alvo (a ser criado)**: `/blood_and_silver/index.html`.

---

## 🎮 1. Visão Geral do Jogo

Jogo **2D top-down estilo "vampire survivors"** renderizado em **HTML5 Canvas 2D**, no qual o jogador **controla apenas a movimentação** (`↑ ↓ ← →` ou `W A S D`) em um **mundo maior que a tela, com câmera seguindo o personagem**. Os ataques são **automáticos**, disparados por **cooldown** individual de cada arma, enquanto hordas de inimigos surgem nas bordas do mundo e avançam em direção ao jogador.

O arsenal é composto por **armas** (espada, machado, arco, besta, água benta) e **itens passivos** que alteram os *status* globais. Ao matar inimigos, o jogador coleta **XP** e **sobe de nível**, escolhendo upgrades entre 3 opções. A progressão culmina nas **Evoluções (Synergies)**: maximizar uma arma (nível 8) + possuir o passivo correspondente faz com que o **próximo baú** transforme essa arma numa versão devastadora.

Inimigos dropam **Baús** (comum, raro, lendário) que abrem uma **roleta**; e, em tempo fixo, um **Chefe** surge com vida escalada pelo nível e pelo arsenal do jogador. Toda a sonoridade de **efeitos** é **procedural** (Web Audio API); a trilha musical virá de um asset de som a ser definido.

O objetivo é sobreviver o máximo possível contra uma dificuldade que cresce continuamente.

---

## 🔄 2. Loop Central (Core Loop)

```
Mover (setas/WASD, mundo com câmera seguindo)
   → Armas disparam automaticamente (cooldown individual)
   → Inimigos morrem e largam XP (e, às vezes, Baús)
   → Coleta de XP → subir de nível → Popup de Level Up (pausa) → escolher arma/passivo
   → Baú coletado → Roleta (pausa) → arma possuída ganha nível
   → Arma nível 8 + passivo correspondente → próximo baú EVOLUI a arma
   → A cada ~120s um Chefe surge (vida escala com nível + arsenal)
   → Dificuldade aumenta (mais inimigos/mais fortes)
   → ... até a morte → Game Over (tempo sobrevivido, abates, nível) + recorde
```

---

## 👤 3. User Story

* **Como** caçador solitário em uma noite sem fim,
* **Eu quero** me mover livremente por um mundo em ruínas enquanto meus golpes são desferidos automaticamente, enfrentar hordas crescentes de criaturas, coletar a essência (XP), montar um arsenal de armas (espadas, arcos, bestas, frascos) e passivos que modificam meus atributos, evoluir armas por sinergias desbloqueadas em baús e enfrentar chefes vampiros que escalam com o meu poder,
* **Para que** eu sinta a progressão viciante de um *bullet-heaven* arcade, rico em construção de build, sem mirar/atirar manualmente.

---

## 🎯 4. Critérios de Aceitação

### 4.1 Movimentação do Jogador e Câmera
1. O jogador se move em 2D (top-down) usando `↑ ↓ ← →` **e/ou** `W A S D`.
2. Movimento normalizado em diagonal (velocidade constante).
3. O mundo é **maior que a tela**; a **câmera segue o jogador** (centralizado, com suavização opcional).
4. O jogador fica confinado aos **limites do mundo**.
5. O jogador **não possui** botão de ataque — não há input de tiro/mira.

### 4.2 Armas e Auto-Ataque (Cooldown)
1. Cada arma tem **cooldown** próprio e dispara automaticamente ao zerar o temporizador.
2. A arma inicial é a **Espada** (golpe horizontal) e ataca sozinha desde o início.
3. **Comportamentos distintos** (com ícones dos assets):
   | Arma | Comportamento | Ícone |
   | :--- | :--- | :--- |
   | **Espada** | `melee-horizontal` (varredura horizontal) | `40-loot-icons` #23 (Guard Sword) |
   | **Machado** | `melee-horizontal` pesado (mais dano, mais lento) | `40-loot-icons` #09 (Ax) |
   | **Arco** | `nearest-projectile` (flecha no inimigo mais próximo) | `bow-and-crossbow` Icon |
   | **Besta** | `nearest-projectile` perfurante | `bow-and-crossbow` Icon |
   | **Água Benta** | `random-area` (frascos em áreas aleatórias, zona de dano) | `40-loot-icons` #10 (Bottle) |
4. Armas novas são adicionadas ao arsenal (atacam **em paralelo**).
5. Cada arma sobe de nível até **nível 8** (`maxLevel`).

### 4.3 Passivos (Itens de Suporte)
1. Passivos **não disparam**, mas alteram os **status globais** do personagem (e o comportamento das armas).
2. **8 passivos** — 4 de atributo + 4 de sobrevivência:
   | Passivo | Status | Ícone |
   | :--- | :--- | :--- |
   | **Amuleto** | `area` (+área de efeito) | #26 (Amulet) |
   | **Joia Carmesim** | `might` (+dano) | #36 (Pyrope) |
   | **Engrenagem** | `cooldown` (reduz recarga) | #33 (Mechanism) |
   | **Pena** | `speed` (+velocidade de projéteis) | #11 (Feather) |
   | **Carne** | `maxhp` (+vida máxima) | #19 (Meat) |
   | **Cogumelo Noturno** | `regen` (regeneração) | #08 (Night Mushroom) |
   | **Orbe Espiritual** | `magnet` (raio de coleta de XP) | #16 (Spirit Orb) |
   | **Anel do Javali** | `move_speed` (+velocidade do jogador) | #39 (Boar's Ring) |
3. Passivos podem ser obtidos no popup de Level Up ou na roleta dos baús.
4. Passivos sobem de nível (efeito cresce por nível, até `maxLevel = 5`).

### 4.4 Evoluções (Synergies)
1. Uma arma **evolui** quando, simultaneamente: está no **nível 8**, o jogador possui o **passivo correspondente**, e coleta o **próximo baú**.
2. **Mapeamento arma ↔ passivo** (baseado nos assets disponíveis):
   | Arma | Passivo correspondente | Evolução |
   | :--- | :--- | :--- |
   | Espada | Joia Carmesim (Might) | Espada Rubra |
   | Machado | Engrenagem (Cooldown) | Machado Tempestade |
   | Arco | Pena (Speed) | Arco Celeste |
   | Besta | Amuleto (Area) | Besta Espalhada |
   | Água Benta | Cogumelo Noturno (Regen) | Água Sagrada |
3. O baú que dispara a evolução é **consumido** (sem roleta nesse baú).
4. Uma arma evoluída não evolui uma segunda vez (`evolved`).

### 4.5 Spawning e IA dos Inimigos
1. Inimigos surgem **fora da área visível da câmera** (ao redor do jogador) e se movem **em direção ao jogador** (com jitter angular para não se empilharem).
2. **Pelo menos 3 tipos** de inimigos com atributos distintos (esqueleto/cultista/batedor, etc.).
3. Frequência e força escalam progressivamente com o tempo.
4. Contato causa dano com **janela de invulnerabilidade**.
5. Inimigos removidos (pooling) ao morrer.

### 4.6 XP, Níveis e Progressão
1. Todo inimigo derrotado **dropa uma gema/orbe de XP**.
2. Coleta por proximidade (raio de coleta/"ímã").
3. XP necessário cresce por nível.
4. Ao acumular XP suficiente, o jogo **pausa** e abre o popup de Level Up.

### 4.7 Popup de Level Up (Escolha de Upgrade)
1. Pausa toda a simulação.
2. **3 opções aleatórias** (armas/passivos, sem repetição na mesma rodada).
3. Escolha por **clique** ou teclas `1/2/3`.
4. Item novo adiciona; item possuído sobe o nível.
5. O jogo retoma após a escolha.

### 4.8 Estados e Fluxo do Jogo
1. Estados: `menu`, `playing`, `levelup`, `chest`, `gameover` (e opcional `paused` via `Esc`).
2. **Game Over**: tela com tempo sobrevivido, abates e nível, com reinício.
3. **Recorde** de tempo sobrevivido persistido em `localStorage`.
4. **Roguelite**: partida do zero + recorde (sem meta-progressão persistente no MVP).

### 4.9 Baús e Roleta de Recompensa
1. **Drop**: chance aleatória por abate + **pity timer** (~60s).
2. **Tipos**: Comum (só `common`), Raro (mais chance de `rare`), Lendário (**3 giros**).
3. **Coleta e pausa**: encostar → pausa (`status = 'chest'`) → popup.
4. **Prioridade de evolução**: se houver arma evoluível (nível 8 + passivo), o baú **evolui** e é consumido. No baú **lendário**, evolui **e** ainda roda os 3 giros.
5. **Roleta (comum/raro)**: gira **apenas por armas já possuídas** → +1 nível.
6. **Roleta (lendário)**: 3 giros que **podem trazer armas novas** (desbloquear) além de subir nível das possuídas.
7. Retomada ao concluir a roleta.

### 4.10 Chefes (Boss Fight)
1. **Spawn por tempo fixo** (~120s).
2. Atributos muito maiores que monstros comuns (tamanho, dano, vida); menor velocidade, maior dano de contato.
3. **Escalonamento**: a vida é calculada pelo **nível do personagem + força das armas/passivos** (quanto mais forte o jogador, mais resistente o chefe).
4. Recompensa: grande XP + alta chance de baú raro/lendário.
5. Apenas **um chefe por vez**.

### 4.11 Performance e Escalabilidade (Colisão)
1. Sustentar **milhares de inimigos** a 60 FPS.
2. Colisão com **AABB/círculos** e **distância ao quadrado** (sem `Math.sqrt` por quadro).
3. **Particionamento espacial** (Spatial Grid/Quadtree) limitando testes à vizinhança.
4. Complexidade `O(n)` (reconstrução da grade) + `O(entidades × vizinhança)`, nunca `O(armas × inimigos)` global.

---

## 🛠️ 5. Arquitetura Técnica

### 5.1 Paradigma
- **Arquivo único monolítico** `index.html` (padrão do Playful Hub): HTML + CSS (HUD/overlays) + JavaScript (game loop, física, renderização), **sem dependências externas** (HTML5 Canvas 2D + Web Audio API).
- **Game Loop** via `requestAnimationFrame` com `deltaTime`.

### 5.2 Estrutura Interna do Script (módulos lógicos)
```
config/constants     → constantes de balanceamento (armas, passivos, raridades, curva de XP)
input                → teclado (movimento) + clique/atalhos dos popups
gameState            → máquina de estados (menu/playing/levelup/chest/gameover)
camera               → câmera que segue o jogador (offset/world → screen)
player               → posição, vida, level, XP, status globais, arsenal
weapons              → catálogo (comportamentos/synergy) + instâncias + auto-ataque
passives             → catálogo (stat modificado) + instâncias + aplicação de status
synergies            → regras de evolução (nível 8 + passivo correspondente → baú)
enemies              → spawn (ao redor da câmera), perseguição, colisão, morte, drop
boss                 → spawn por tempo fixo, escalonamento de vida, recompensa
chests               → drop, coleta, popup de roleta / evolução
xpOrbs               → drop, coleta (ímã), aplicação de XP
projectiles          → projéteis das armas, colisão com inimigos
particles/pooling    → pool de objetos (inimigos, projéteis, orbes, partículas, dano flutuante)
levelUp              → popup de escolha (3 opções), pausa
collision/spatial    → AABB/círculos + Spatial Hash Grid (particionamento espacial)
render               → desenho (mundo com câmera), entidades, HUD, popups, roleta
audio                → síntese procedural de SFX (Web Audio API), gerenciada por AudioEngine
```

### 5.3 Object Pooling & Performance (obrigatório)
- **Reutilização** de objetos (inimigos, projéteis, orbes, partículas, zonas de dano, textos de dano) em arrays pré-alocados.
- Limites: `MAX_ENEMIES`, `MAX_PROJECTILES`, `MAX_ORBS`, `MAX_PARTICLES`, `MAX_DAMAGE_ZONES`.
- Renderização otimizada: `fillRect`/`arc` simples; `globalCompositeOperation` apenas em efeitos pontuais (glow).
- Separação clara **update** / **render**.

### 5.4 Input e Responsividade
- `keydown`/`keyup` mantêm um mapa `keys` para movimento contínuo.
- Eventos dos popups ativos apenas nos estados `levelup`/`chest`.

### 5.5 Áudio (Resumo)
- **SFX procedurais** via Web Audio API (iniciado no primeiro gesto).
- **Sem música procedural** no MVP: a trilha sonora virá de um **asset de som** a ser providenciado (seção 9).

### 5.6 Colisão & Particionamento Espacial (Como não travar o jogo)
Para lidar com **milhares de inimigos** mantendo 60 FPS, a colisão usa **matemática simplificada** e **estruturas espaciais**:

- **Hitboxes simples**:
  - **AABB (Axis-Aligned Bounding Box)**: retângulos alinhados aos eixos; sobreposição com comparações `>`/`<` em X/Y — sem trigonometria.
  - **Círculos simples**: para projéteis e áreas de efeito, checando a **distância entre centros**.
- **Distância sem raiz quadrada** (Teorema de Pitágoras comparando valores ao quadrado):

  `d² = (x₂ - x₁)² + (y₂ - y₁)²`

  Se `d² < (r₁ + r₂)²`, o golpe acertou. Evita `Math.sqrt()`.
- **O verdadeiro segredo — Particionamento Espacial**:
  Checar `10 armas × 5.000 monstros` = `50.000 cálculos por quadro`. Para evitar, o mundo é **invisivelmente dividido em uma grade** (Spatial Grid ou Quadtree). Se a faca está no quadrado `A1`, só se testa colisão contra monstros **do mesmo quadrado (ou vizinhos imediatos)**. Os ~4.900 monstros do outro lado do mundo são **ignorados** naquele quadro.

> **Complexidade**: de `O(armas × inimigos)` para `O(entidades)` (reconstrução) + `O(entidades × vizinhança)` (testes).

---

## 🧩 6. Modelagem de Dados

```javascript
// Estado global
gameState = {
  status: 'menu' | 'playing' | 'levelup' | 'chest' | 'gameover',
  time: 0,               // segundos sobrevividos (dificuldade)
  kills: 0,
  level: 1,
  score: 0,
  paused: false,
  chestTimer: 60,        // pity timer de baú (~60s)
  bossTimer: 120,        // contagem para o próximo chefe (~120s)
  activeBoss: null
};

// Mundo e câmera (mundo maior que a tela)
world = { width: 4000, height: 4000 };
camera = { x: 0, y: 0, viewW: 960, viewH: 540 }; // offset = player - view/2

// Jogador — status globais afetados por passivos
player = {
  x, y,
  radius: 16,
  hp, maxHp: 100,
  speed: 220,            // px/s (movimento)
  level: 1,
  xp: 0,
  xpToNext: 5,
  weapons: [],
  passives: [],
  stats: { area:1, might:1, cooldown:1, speed:1, maxhp:0, regen:0, magnet:0, move_speed:1 },
  hitCooldown: 0,
  collectRadius: 60
};

// Catálogo de armas (ícones referenciam os assets)
WEAPONS = {
  sword:      { name:'Espada',     behavior:'melee-horizontal',   damage:20, interval:1.0, count:1, range:90,   icon:'loot-23', rarity:'common', maxLevel:8, synergyPassive:'pyrope' },
  axe:        { name:'Machado',    behavior:'melee-horizontal',   damage:34, interval:1.6, count:1, range:70,   icon:'loot-09', rarity:'common', maxLevel:8, synergyPassive:'mechanism' },
  bow:        { name:'Arco',       behavior:'nearest-projectile', damage:12, interval:0.9, count:1, projectileSpeed:380, icon:'bow-01', rarity:'common', maxLevel:8, synergyPassive:'feather' },
  crossbow:   { name:'Besta',      behavior:'nearest-projectile', damage:10, interval:1.2, count:1, projectileSpeed:460, pierce:true, icon:'bow-12', rarity:'rare', maxLevel:8, synergyPassive:'amulet' },
  holy_water: { name:'Água Benta', behavior:'random-area',        damage:10, interval:2.0, count:1, area:70, duration:3.0, icon:'loot-10', rarity:'rare', maxLevel:8, synergyPassive:'mushroom' }
};

// Evoluções (resultado da sinergia)
EVOLVED_WEAPONS = {
  sword:      { name:'Espada Rubra',       damage:55, count:3, range:120 },
  axe:        { name:'Machado Tempestade', damage:90, count:2, interval:1.1 },
  bow:        { name:'Arco Celeste',       damage:30, count:3, projectileSpeed:520 },
  crossbow:   { name:'Besta Espalhada',    damage:24, count:5, pierce:true },
  holy_water: { name:'Água Sagrada',       damage:26, area:130, duration:4.5 }
};

// Catálogo de passivos
PASSIVES = {
  amulet:     { name:'Amuleto',          stat:'area',       amount:0.10, maxLevel:5, icon:'loot-26' },
  pyrope:     { name:'Joia Carmesim',    stat:'might',      amount:0.10, maxLevel:5, icon:'loot-36' },
  mechanism:  { name:'Engrenagem',       stat:'cooldown',   amount:0.08, maxLevel:5, icon:'loot-33' },
  feather:    { name:'Pena',             stat:'speed',      amount:0.10, maxLevel:5, icon:'loot-11' },
  meat:       { name:'Carne',            stat:'maxhp',      amount:15,    maxLevel:5, icon:'loot-19' },
  mushroom:   { name:'Cogumelo Noturno', stat:'regen',      amount:0.5,   maxLevel:5, icon:'loot-08' },
  spirit_orb: { name:'Orbe Espiritual',  stat:'magnet',     amount:15,    maxLevel:5, icon:'loot-16' },
  boar_ring:  { name:'Anel do Javali',   stat:'move_speed', amount:0.06,  maxLevel:5, icon:'loot-39' }
};

// Instâncias
weaponInstance = { id, level, maxLevel, evolved, damage, interval, count, range, projectileSpeed, area, duration, timer };
passiveInstance = { id, level, maxLevel, stat, amount };

// Inimigo
enemy = { x, y, vx, vy, radius, hp, maxHp, speed, damage, type, color, alive, isBoss };

// Baú / Roleta
chest = { x, y, radius, rarity:'common'|'rare'|'legendary', alive };
rouletteState = { active, chestRarity, pool:[], result, rewardsRemaining };

// Projétil / Zona de dano / Orbe de XP / Partícula
projectile = { x, y, vx, vy, radius, damage, life, color, pierce, alive };
damageZone = { x, y, radius, damage, duration, timer, color, alive };
xpOrb = { x, y, value, radius, alive };
particle = { x, y, vx, vy, life, maxLife, size, color, active };
```

---

## ⚙️ 7. Design de Sistemas (pseudocódigo-chave)

### 7.1 Loop principal
```javascript
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (gameState.status === 'playing') {
    updatePlayer(dt);
    updateWeapons(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateChests(dt);
    updateProjectiles(dt);
    updateDamageZones(dt);
    updateXPOrbs(dt);
    updateParticles(dt);
    updateDifficulty(dt);
    updateCamera(dt);
  }
  render();
}
```

### 7.2 Auto-ataque (comportamentos por arma)
```javascript
function fireWeapon(w) {
  const might = player.stats.might, area = player.stats.area;
  switch (w.behavior) {
    case 'melee-horizontal':    // Espada / Machado
      spawnWhipArc(w, might, area); break;
    case 'nearest-projectile':  // Arco / Besta
      const t = nearestEnemy(player);
      if (t) spawnProjectile(w, t, might, player.stats.speed); break;
    case 'random-area':         // Água Benta
      for (let i = 0; i < w.count; i++) spawnHolyWaterZone(w, might, area); break;
  }
}
```

### 7.3 Passivos (aplicação de status)
```javascript
function recomputeStats() {
  const s = { area:1, might:1, cooldown:1, speed:1, maxhp:0, regen:0, magnet:0, move_speed:1 };
  player.passives.forEach(p => {
    if (p.stat === 'cooldown') s.cooldown *= (1 - p.amount * p.level);
    else s[p.stat] += p.amount * p.level;   // (move_speed multiplica, demais somam)
  });
  player.maxHp = BASE_HP + s.maxhp;
  player.speed = BASE_SPEED * s.move_speed;
  player.collectRadius = BASE_MAGNET + s.magnet;
  player.stats = s;
}
```

### 7.4 Spawn de inimigos (ao redor da câmera)
```javascript
function spawnEnemy() {
  const e = pool.getEnemy();
  const angle = Math.random() * Math.PI * 2;
  const d = (Math.max(camera.viewW, camera.viewH) / 2) + 60;
  e.x = player.x + Math.cos(angle) * d;
  e.y = player.y + Math.sin(angle) * d;
  // direção = em direção ao jogador + jitter
}
```

### 7.5 Coleta de XP e Level Up
```javascript
function collectXP() {
  // orbes dentro de player.collectRadius são atraídos e aplicados ao player.xp
  if (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = nextLevelXP(player.level);
    openLevelUpPopup();
  }
}
```

### 7.6 Popup de Level Up
```javascript
function openLevelUpPopup() {
  gameState.status = 'levelup';
  renderUpgradeOptions(pickRandomUpgrades(3));  // armas E passivos
}
function chooseUpgrade(item) {
  // arma ou passivo: possuído → +1 nível; novo → adiciona
  recomputeStats();
  gameState.status = 'playing';
}
```

### 7.7 Evoluções (Synergies) — mecanismo central
```javascript
function isEvolvable(w) {
  return w.level >= w.maxLevel && !w.evolved
    && player.passives.some(p => p.id === w.synergyPassive);
}
function openChest(chest) {
  const evo = player.weapons.find(isEvolvable);
  if (evo) {
    evolveWeapon(evo);                 // baú consumido para evoluir
    if (chest.rarity !== 'legendary') return;
    // lendário: evolui E ainda roda os 3 giros
  }
  openRoulette(chest.rarity);
}
function evolveWeapon(w) {
  const evo = EVOLVED_WEAPONS[w.id];
  w.evolved = true;
  Object.assign(w, evo);
}
```

### 7.8 Baús e Roleta
```javascript
function onEnemyDeath(e) {
  dropXP(e);
  if (Math.random() < CHEST_DROP_CHANCE) spawnChest(e.x, e.y, rollChestRarity());
}
function updateChests(dt) {
  gameState.chestTimer -= dt;
  if (gameState.chestTimer <= 0) { gameState.chestTimer = 60; spawnChestAtEdge(rollChestRarity()); }
}
function rollChestRarity() {
  const r = Math.random();
  if (r < 0.60) return 'common';
  if (r < 0.90) return 'rare';
  return 'legendary';
}
function openRoulette(rarity) {
  gameState.status = 'chest';
  if (rarity === 'legendary') {
    rouletteState.pool = allWeapons;          // pode vir arma NOVA
    rouletteState.rewardsRemaining = 3;
  } else {
    rouletteState.pool = player.weapons;      // só armas POSSUÍDAS
    rouletteState.rewardsRemaining = 1;
  }
  spinRoulette();
}
function spinRoulette() {
  const item = weightedPick(rouletteState.pool);
  applyRouletteReward(item);   // possuída → +1 nível; nova → adiciona
  rouletteState.rewardsRemaining--;
  if (rouletteState.rewardsRemaining > 0) spinRoulette();
  else gameState.status = 'playing';
}
```

### 7.9 Chefes (Boss Fight)
```javascript
function updateBoss(dt) {
  if (gameState.activeBoss) { updateBossAI(dt); return; }
  gameState.bossTimer -= dt;
  if (gameState.bossTimer <= 0) { gameState.bossTimer = 120; spawnBoss(); }
}
function computeBossHP() {
  const weaponPower = player.weapons.reduce((s, w) => s + w.level, 0);
  const passivePower = player.passives.reduce((s, p) => s + p.level, 0);
  return Math.round(
    BOSS_BASE_HP                                  // ex.: 800
    * (1 + (player.level - 1) * 0.25)             // nível do personagem
    * (1 + weaponPower * 0.05 + passivePower * 0.03)  // força do arsenal
  );
}
```

### 7.10 Curva de dificuldade
```javascript
spawnInterval = Math.max(0.15, 1.2 - gameState.time * 0.02);
enemyHealthScale = 1 + gameState.time * 0.05;
```

### 7.11 Colisão & Particionamento Espacial
```javascript
// AABB
function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
// Círculos (distância ao quadrado, sem sqrt)
function circlesHit(ax, ay, ar, bx, by, br) {
  const dx = bx - ax, dy = by - ay, r = ar + br;
  return (dx*dx + dy*dy) < (r*r);
}
// Spatial Hash Grid
const GRID_CELL = 64;
const spatialGrid = new Map();   // "cx,cy" -> Set
function insert(e) {
  const cx = Math.floor(e.x/GRID_CELL), cy = Math.floor(e.y/GRID_CELL);
  const k = cx + "," + cy;
  (spatialGrid.get(k) || spatialGrid.set(k, new Set()).get(k)).add(e);
}
function rebuildGrid(entities) { spatialGrid.clear(); entities.forEach(insert); }
function queryNeighbors(px, py) {
  const cx = Math.floor(px/GRID_CELL), cy = Math.floor(py/GRID_CELL), out = [];
  for (let ox=-1; ox<=1; ox++) for (let oy=-1; oy<=1; oy++) {
    const s = spatialGrid.get((cx+ox)+","+(cy+oy));
    if (s) for (const e of s) out.push(e);
  }
  return out;
}
function updateProjectileCollisions() {
  for (const p of projectiles)
    for (const e of queryNeighbors(p.x, p.y))
      if (e.alive && circlesHit(p.x,p.y,p.radius, e.x,e.y,e.radius)) hitEnemy(e, p);
}
```

---

## 🎨 8. Design Visual & Estética

> 📦 **Assets**: pacotes CraftPix em `/assets/` — mapeamento completo em **`blood_and_silver/ASSETS.md`** (cenário, personagens, itens, UI).

**Atmosfera geral**: gótica noturna em **templo em ruínas**, paleta de alto contraste (fundos escuros, efeitos neon), sprites pixel art top-down combinados com glow (`shadowBlur`/`lighter`), partículas, *screen shake* e números de dano flutuantes.

### 8.1 Jogador e Personagens
- **Jogador (caçador)**: espadachim (`swordsman` pack, lvl1/2/3 = evolução visual), 4 direções.
- **Inimigos comuns**: esqueletos (`skeleton` pack) e cultistas (`ruined-temple` pack).
- **Mini-boss (Lich)**: 256×256 (`skeleton` pack).
- **Chefe (Vampiro)**: `vampire` pack (Vampires1/2/3), renderizado maior que os comuns.

### 8.2 Armas (efeitos visuais)
- **Espada/Machado**: arco/lâmina horizontal com rastro translúcido.
- **Arco/Besta**: flechas/projéteis brilhantes com cauda de partículas.
- **Água Benta**: frasco caindo + zona de dano circular translúcida.
- **Evoluída**: mesma arma com cor intensa, raio maior e anel/glow de evolução.

### 8.3 Passivos e Itens (HUD)
- Ícones **32×32** do `40-loot-icons` mostrados em fileira sob a barra de vida, com número do nível.

### 8.4 Baús, XP e Projéteis
- Baú: comum (madeira), raro (prata/azul), lendário (dourado com brilho pulsante) — sprite de `doors_lever_chest_animation` ou ícone `Overgrown Crate`.
- XP: gemas brilhantes; projéteis: círculos com núcleo claro e glow.

### 8.5 Cenário e HUD
- **Cenário**: templo em ruínas (`ruined-temple` + `top-down-ruins`), chão/paredes em tiles de 16px, com água/fogo animados.
- **HUD**: barra de XP (topo), barra de vida, cronômetro, abates, fileira de armas/passivos.
- **Popups**: Level Up (3 cartas), Roleta (círculo — `Circle_menu`), Game Over (`Win_loose`).

---

## 🔊 9. Áudio (SFX Procedurais + Trilha futura)

- **SFX procedurais** via Web Audio API (iniciado no primeiro gesto).

| Som | Síntese (resumo) |
| :--- | :--- |
| Espada/Machado (whoosh) | Ruído bandpass + sawtooth descendo |
| Arco/Besta (zap) | Square/sawtooth 900→150 Hz |
| Água Benta (splash) | Ruído lowpass + pings senoidais |
| Acerto / Morte | Click curto / descida de pitch |
| Coleta de XP | "ding" com pitch progressivo |
| Level Up | Arpejo ascendente |
| Abrir baú | Jingle (pitch conforme raridade) |
| Roleta (tick) | Cliques que aceleram/desaceleram |
| Evolução (fanfarra) | Acorde + arpejo brilhante |
| Chefe (rugido) | Sawtooth grave + tremolo |
| Dano no jogador | Onda grave abafada |
| Game Over | Descida melódica + ruído grave |

- **Sem música procedural no MVP** — a trilha sonora virá de um **asset de áudio** a ser providenciado (área `/assets/sounds/`).
- **Performance**: limite de vozes (~16), buffers de ruído reutilizados, `masterGain` global, mudo em `M`.

---

## 📁 10. Estrutura de Arquivos e Integração com o Playful Hub

| Arquivo | Ação |
| :--- | :--- |
| `blood_and_silver/index.html` | **Criar** — jogo completo (HTML + CSS + JS monolítico) |
| `server.js` | Adicionar `createHtmlRoute('/jogos/blood_and_silver', 'jogos/blood_and_silver.html')` e rota legada `createHtmlRoute('/blood_and_silver', 'blood_and_silver/index.html')` |
| `games_control.json` | Adicionar `{ "code": "BLOOD_AND_SILVER", "name": "Sangue & Prata", "path": "/jogos/blood_and_silver", "processed": true }` |
| `jogos/blood_and_silver.html` | **Criar** — página SEO |
| `scripts/generate-game-pages.js` | Adicionar config (título, descrição, relatedGames, emoji `🧛`) |
| `index.html` / `index2.html` | Adicionar card no catálogo |
| `README.md` | Adicionar à lista de minijogos |
| `blood_and_silver/CLAUDE.md` | **Criar** — arquitetura pós-implementação |
| `blood_and_silver/ASSETS.md` | **Criado** — mapeamento dos sprites |

---

## 📊 11. Plano de Desenvolvimento em Etapas (Entregas Jogáveis)

* **Prioridade**: Alta · **Esforço total**: Alto · **Área**: Game Design Arcade / HTML5 Canvas 2D / Web Audio API.

> **Regra de ouro**: cada etapa entrega um **jogo minimamente jogável e testável** — é possível abrir, jogar e validar a mecânica entregue naquela etapa, mesmo sem as próximas. As etapas são cumulativas e cada uma corresponde a uma **subtask** no `BACKLOG.md` (a spec desta `TASK_001` é o "guarda-chuva").

| Etapa | Subtask | Foco | "Dá pra testar" ao final |
| :--- | :--- | :--- | :--- |
| 1 | `TASK_002` | Núcleo jogável | Mover, matar esqueletos, morrer e reiniciar |
| 2 | `TASK_003` | XP + Level Up | Subir de nível e escolher upgrades |
| 3 | `TASK_004` | Passivos & status | Ver passivos mudando o comportamento |
| 4 | `TASK_005` | Arsenal completo | Usar as 5 armas (comportamentos) |
| 5 | `TASK_006` | Baús & roleta | Coletar baús e girar a roleta |
| 6 | `TASK_007` | Evoluções (Synergies) | Evoluir armas via baú |
| 7 | `TASK_008` | Chefes | Lutar contra o chefe (HP escalado) |
| 8 | `TASK_009` | Polish & publicação | Experiência completa + página no hub |

---

### Etapa 1 — Núcleo Jogável (`TASK_002`)
- **Objetivo**: o jogo abre, anda e mata.
- **Entregáveis**: câmera seguindo + movimentação (`WASD`/setas); **Espada** (auto-ataque horizontal, cooldown); 1 tipo de inimigo (esqueleto) spawnando ao redor da câmera e perseguindo; colisão (círculos + spatial grid); dano/morte, tela de game over + reinício; HUD mínimo (vida + cronômetro).
- **Jogável quando**: você se move pelo mundo, os golpes saem sozinhos, esqueletos morrem, você morre e reinicia.

### Etapa 2 — XP e Level Up (`TASK_003`)
- **Objetivo**: progredir por níveis.
- **Entregáveis**: XP orbes + coleta (ímã básico); curva de XP; popup de **Level Up** (3 opções, pausa); 2ª arma (**Arco**, projétil no inimigo mais próximo); subida de nível das armas.
- **Jogável quando**: você coleta XP, sobe de nível, escolhe um upgrade entre 3, e o Arco aparece/fica mais forte.

### Etapa 3 — Passivos e Status Globais (`TASK_004`)
- **Objetivo**: construir "build" com itens passivos.
- **Entregáveis**: os **8 passivos**; aplicação em `player.stats` (area/might/cooldown/speed/maxhp/regen/magnet/move_speed); popup de Level Up inclui passivos; HUD com ícones dos passivos.
- **Jogável quando**: pegar passivos altera visivelmente as armas (mais dano/área/velocidade) e a sobrevivência (vida/regeneração/coleta).

### Etapa 4 — Arsenal Completo (`TASK_005`)
- **Objetivo**: variedade de armas com comportamentos distintos.
- **Entregáveis**: **Machado** (melee pesado), **Besta** (projétil perfurante), **Água Benta** (áreas aleatórias com zona de dano).
- **Jogável quando**: as 5 armas disparam com comportamento visual/lógico distinto.

### Etapa 5 — Baús e Roleta (`TASK_006`)
- **Objetivo**: recompensas de baú com roleta.
- **Entregáveis**: drop de baús (chance + pity timer ~60s); popup de **roleta** com pausa; comum/raro (só armas possuídas, +1 nível); lendário (3 giros, pode desbloquear novas).
- **Jogável quando**: baús aparecem, a roleta gira e premia (nível acima / arma nova no lendário).

### Etapa 6 — Evoluções (Synergies) (`TASK_007`)
- **Objetivo**: a progressão central.
- **Entregáveis**: regra de evolução (arma nível 8 + passivo correspondente → próximo baú evolui); as 5 evoluções (Espada Rubra, Machado Tempestade, Arco Celeste, Besta Espalhada, Água Sagrada); baú consumido; lendário evolui + rola 3.
- **Jogável quando**: maximizar uma arma + ter o passivo certo e abrir um baú transforma a arma.

### Etapa 7 — Chefes (`TASK_008`)
- **Objetivo**: picos de desafio balanceados.
- **Entregáveis**: spawn por **tempo fixo** (~120s); chefe grande (Vampiro/Lich); **HP escalado** por nível + força das armas/passivos; barra de vida do chefe; recompensas (XP + baú raro/lendário).
- **Jogável quando**: o chefe surge no tempo certo, é proporcionalmente mais difícil conforme seu nível, e recompensa ao morrer.

### Etapa 8 — Polish e Publicação (`TASK_009`)
- **Objetivo**: game feel e disponibilidade no hub.
- **Entregáveis**: **SFX procedurais** (todos da seção 9); partículas, dano flutuante, *screen shake*; recorde em `localStorage`; integração no Playful Hub (rota `server.js`, `games_control.json`, página SEO, catálogo, `README`).
- **Jogável quando**: experiência completa e polida, acessível pela página do hub.

> **Como registrar**: cada etapa (`TASK_002`…`TASK_009`) deve ser criada no `BACKLOG.md` raiz (status `📋 Backlog`) com seu próprio `TASK_00N.md` em `blood_and_silver/TASKS/`, herdando os critérios de aceitação relevantes desta spec.

---

## ✅ 12. Decisões do PO (respostas às dúvidas)

1. **Nome**: **"Sangue & Prata"**; path/código em inglês: `blood_and_silver` / `BLOOD_AND_SILVER`.
2. **Câmera**: **mundo maior com câmera seguindo** o jogador.
3. **Passivos**: além dos 4 base (Area/Might/Cooldown/Speed), adicionar **Max HP, Regen, Ímã de XP, Move Speed** (total 8).
4. **Armas/itens**: baseados nos assets disponíveis — **espadas, machados, arcos, bestas, escudos** e os ícones de `40-loot-icons` + `bow-and-crossbow-pixel-art-icons` (ver `ASSETS.md`). Pares de sinergia definidos na seção 4.4.
5. **Evolução**: o baú que evolui é **consumido**; o **lendário evolui E rola as 3 recompensas**.
6. **Roguelite**: **partida do zero + recorde** (sem meta-progressão no MVP).
7. **Baú (roleta comum/raro)**: só para em **armas já possuídas**.
8. **Baú lendário**: **3 giros**, podendo trazer **armas novas** ainda não possuídas.
9. **Chefe**: **tempo fixo** (~120s).
10. **Chefe (escala)**: **nível + força das armas/passivos** (os dois).
11. **Música**: **apenas SFX** no MVP; trilha sonora virá de asset de som (a buscar).

*Status*: `✅ Refined` — pronto para desenvolvimento.
