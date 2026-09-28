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
- **`PASSIVES`** (9 itens) → `recomputeStats()` aplica `area/might/cooldown/speed/maxhp/regen/magnet/move_speed` em `player.stats`.
  - **Égide de Prata** (`aegis`, nv máx 8, `stat: 'ward'`): bloqueia golpes inteiros em `damagePlayer` (antes do escudo de energia) e se refaz após `wardRegen` s; a progressão por nível está em `WARD_LEVELS` (alterna −0,5 s de recarga e +1 golpe, de 1 golpe/5 s até 4 golpes/3 s).
- **`EVOLVED_WEAPONS`** (synergies): `isEvolvable` = arma nível 8 + passivo correspondente → o próximo baú evolui (`evolveWeapon`).
- **Baús/Roleta**: drop por chance + `chestTimer` (pity ~60s); a roleta (`chestRewardPool`) sorteia armas **e passivos**: comum/raro = 1 giro (só itens possuídos abaixo do nível máximo); lendário = 3 giros (pode trazer armas e passivos novos). Evolução disponível tem prioridade. Com tudo no máximo, o baú oferece uma escolha (`openChestChoice`): +2%/+4%/+8% de velocidade de movimento (`player.chestSpeedBonus`, zera a cada partida) **ou** +15/+25/+50 de vida, conforme o tier (`CHEST_TIERS.*.bonusSpeed/bonusHeal`).
- **Chefe**: `updateBoss` spawn por tempo fixo (~120s); `computeBossHP` escala a vida por nível + força do arsenal; recompensa com 10 orbes + baú raro/lendário.
- **Polish**: partículas, números de dano, *screen shake* e recorde de tempo em `localStorage`.
- **Minimapa** (`drawMinimap`, canvas próprio no HUD, ~30 Hz): norte fixo, seta do jogador, marcos dos dioramas, itens, inimigos, baús e chefe (presos na borda quando longe), nome da região (`zoneNameAt`) e zoom (`+`/`−`, `M` esconde). O terreno é o mapa do mundo em baixa resolução (`bakeOverviewRows`), gerado pelo worker do cenário em faixas quando ele está ocioso.

## 🛠️ Integração no Playful Hub

- **Rota**: `server.js` → `/jogos/blood_and_silver` (SEO) e `/blood_and_silver` (jogo).
- **Registro**: `games_control.json` → `BLOOD_AND_SILVER`.
- **Assets**: servidos da raiz via `express.static('./')`; referenciados no jogo por caminho relativo `../assets/...`.
