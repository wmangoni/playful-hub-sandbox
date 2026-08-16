# 📂 Arquitetura e Padrões - Sangue & Prata

Um roguelite gótico de sobrevivência 2D top-down (estilo "vampire survivors"), renderizado em **HTML5 Canvas 2D**, onde o jogador controla apenas a movimentação e as armas atacam automaticamente em cooldown.

## 🏗️ Arquitetura do Código

O jogo é um **arquivo monolítico** `index.html` (padrão do Playful Hub): HTML + CSS (HUD/overlays) + JavaScript (game loop, física, renderização), sem dependências externas.

- **Renderização**: `<canvas>` 960×540 com câmera que segue o jogador em um mundo de 4000×4000. Sprites pixel-art (64×64) fatiados de spritesheets 4-direcionais.
- **Áudio**: SFX 100% procedurais via **Web Audio API** (`AudioEngine` com osciladores + buffer de ruído), iniciados no primeiro gesto.

## 🔄 Game Loop

`requestAnimationFrame(gameLoop)` → `update(dt)` (só quando `status === 'playing'`) → `render()`.

Ordem do update: `updatePlayer` → `updateEnemies` → `rebuildGrid` → `updateWeapons` → `updateProjectiles` → `updateDamageZones` → `updateXPOrbs` → `updatePlayerCollisions` → `separateEnemies` → `updateSpawns` → `updateBoss` → `updateChests` → `updateChestCollection` → `updateParticles` → `updateCamera` → `updateHud`.

## 🧩 Padrões de Projeto

- **Máquina de Estados**: `game.status` ∈ `menu` | `playing` | `levelup` | `chest` | `gameover` (popups pausam a simulação).
- **Object Pooling**: inimigos, projéteis, orbes de XP, zonas de dano e baús em arrays pré-alocados (`MAX_*`), reutilizados via flag `alive`.
- **Particionamento Espacial**: **Spatial Hash Grid** (`GRID_CELL = 64`) — a grade é reconstruída por frame e as colisões consultam apenas as células vizinhas (`queryRange`), evitando `O(armas × inimigos)`.
- **Colisão sem raiz quadrada**: círculos comparados por distância ao quadrado.

## 🔑 Sistemas Principais

- **`WEAPONS`** (catálogo) → instâncias via `makeWeapon`; `fireWeapon` despacha por `behavior`:
  - `melee-horizontal` (Espada/Machado): arco de dano em volta do jogador.
  - `nearest-projectile` (Arco/Besta): projétil no inimigo mais próximo (Besta tem `pierce`).
  - `random-area` (Água Benta): zonas de dano persistentes em posições aleatórias.
- **`PASSIVES`** (8 itens) → `recomputeStats()` aplica `area/might/cooldown/speed/maxhp/regen/magnet/move_speed` em `player.stats`.
- **`EVOLVED_WEAPONS`** (synergies): `isEvolvable` = arma nível 8 + passivo correspondente → o próximo baú evolui (`evolveWeapon`).
- **Baús/Roleta**: drop por chance + `chestTimer` (pity ~60s); comum/raro = 1 giro (só armas possuídas); lendário = 3 giros (pode desbloquear novas).
- **Chefe**: `updateBoss` spawn por tempo fixo (~120s); `computeBossHP` escala a vida por nível + força do arsenal; recompensa com 10 orbes + baú raro/lendário.
- **Polish**: partículas, números de dano, *screen shake* e recorde de tempo em `localStorage`.

## 🛠️ Integração no Playful Hub

- **Rota**: `server.js` → `/jogos/blood_and_silver` (SEO) e `/blood_and_silver` (jogo).
- **Registro**: `games_control.json` → `BLOOD_AND_SILVER`.
- **Assets**: servidos da raiz via `express.static('./')`; referenciados no jogo por caminho relativo `../assets/...`.
