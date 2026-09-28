# 📂 Arquitetura e Padrões - Sangue & Prata

Um roguelite gótico de sobrevivência 2D top-down (estilo "vampire survivors"), renderizado em **HTML5 Canvas 2D**, onde o jogador controla apenas a movimentação e as armas atacam automaticamente em cooldown.

## 🏗️ Arquitetura do Código

O jogo é um **arquivo monolítico** `index.html` (padrão do Playful Hub): HTML + CSS (HUD/overlays) + JavaScript (game loop, física, renderização), sem dependências externas.

- **Renderização**: `<canvas>` 960×540 com câmera que segue o jogador em um mundo de 4000×4000. Sprites pixel-art (64×64) fatiados de spritesheets 4-direcionais.
- **Áudio**: SFX 100% procedurais via **Web Audio API** (`AudioEngine` com osciladores + buffer de ruído), iniciados no primeiro gesto.

## 🔄 Game Loop

`requestAnimationFrame(gameLoop)` → `update(dt)` (só quando `status === 'playing'`) → `render()`.

Ordem do update: `updatePlayer` → `updateEnemies` → `rebuildGrid` → `updateWeapons` → `updateProjectiles` → `updateDamageZones` → `updateXPOrbs` → `updatePlayerCollisions` → `separateEnemies` → `updateSpawns` → `updateBoss` → `updateChests` → `updateChestCollection` → `updateParticles` → `updateFx` → `updateCamera` → `updateHud`.

Camadas do render: chão → água → `drawFxGround` (manchas, rachaduras) → névoa → objetos → itens/orbes → poças sagradas → baús → inimigos → jogador → `drawSlashes` → projéteis → `drawFxTop` (brilhos, anéis, raios, faíscas) → `drawPlayerOverlay` (jogador a 60% por cima dos efeitos) → números de dano → clarões de tela → `drawFxWarm` (texturas pré-aquecidas, só no menu) → minimapa.

## 🧩 Padrões de Projeto

- **Máquina de Estados**: `game.status` ∈ `menu` | `playing` | `levelup` | `chest` | `omen` | `paused` | `gameover` (popups pausam a simulação).
- **Object Pooling**: inimigos, projéteis, orbes de XP, zonas de dano e baús em arrays pré-alocados (`MAX_*`), reutilizados via flag `alive`. Todo campo novo desses objetos (inclusive os visuais `fx*`) deve ser declarado já na criação do pool: campo acrescentado depois muda o formato do objeto no V8 e deixou `separateEnemies`/`updateEnemies` ~2× mais lentos.
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
- **Presságios** (`OMENS`, 10 cartas; nome próprio do jogo, não "arcanas"): efeitos que valem até o fim da caçada, consultados com `hasOmen(id)` nos sistemas (`recomputeStats`, `killEnemy`, `damagePlayer`, `rollRoulette`, `spawnProjectiles`…). A conquista `omens` (2 chefes no total) faz o "Iniciar" abrir a escolha (`requestStart` → `openOmenPicker('start')`); a `omens_plus` (`reqType: 'run_boss_kills'`, 3 chefes numa caçada, `game.bossKillsRun`) abre `openOmenPicker('run')` a cada `OMEN_INTERVAL` (240 s) até `OMEN_MAX` (3). A última carta fica em `progression.lastOmen`. A Chama Sepulcral usa uma fila (`graveQueue`, no máx. 4 explosões por quadro) para a reação em cadeia não pesar num único quadro.
- **Efeitos dos ataques** (só visual — não mudam dano, alcance, tempo nem colisão): `hitEnemy(e, dmg, kbx, kby, quiet, src)` recebe a fonte (arma, projétil, zona ou nome) e chama `fxHit`, que escolhe a paleta (`FX_PAL`) e o impacto (`fxImpact`); `killEnemy` chama `fxDeath` (desintegração em silhueta branca, névoa de sangue, cinzas, alma e mancha no chão; chefe com coluna de luz e ondas de choque).
  - Corpo a corpo: `fxSlash` desenha a meia-lua (sentido alterna) e `fxSweepDelay` atrasa o *visual* de cada acerto até a lâmina passar (clarão, número e empurrão desenhado via `fxOffX/fxOffY`); quem morreu antes disso fica como "dublê" (`fxStandins`). Machado racha o chão; Tempestade solta raios encadeados. Num golpe ou tique de poça, só os 6 primeiros acertos mostram número; o resto vira um "55 ×24" (`fxBurstDone`).
  - Os efeitos agendados vão para a fila `fxEvents` (objetos reaproveitados, tipos `EV_*`), nunca closures por acerto. O jogador é redesenhado meio transparente por cima dos efeitos (`drawPlayerOverlay`) e raios/espinhos/clarões nascem fora do corpo dele.
  - Arco/besta: rastro de luz (`drawProjectileTrail`) no lugar do `shadowBlur`, clarão no disparo (`fxMuzzle`); Água Benta: círculo rúnico girando com chamas sagradas e brasas (`drawDamageZones`).
  - Presságios e Égide também têm efeito próprio (`fxThornBurst`, `fxGrave`, `fxKnell`, `fxWardBlock`).
  - Desempenho: pools fixos com remoção O(1), sprites pré-desenhados (brilho, estrela, chama, círculo sagrado, base da poça, coluna, manchas; números montados de um atlas de dígitos por cor em canvases reciclados), faíscas agrupadas por cor/opacidade, zero `shadowBlur` (os orbes de XP também usam sprite), e `fxQ` (qualidade adaptativa pelo custo do quadro) reduz partículas, manchas, chamas e camadas extras em máquinas lentas. O clarão usa a silhueta branca do spritesheet (filtro SVG `#fxSilFilter`, sem a sombra).
  - No menu, `fxPrewarm` cria todos os sprites em fatias ociosas, sobe as texturas (`drawFxWarm`) e faz um ensaio invisível fora da câmera (`fxRehearse`) para o primeiro golpe não custar mais que na base.
  - Teste: `__game.step(dt)` avança a simulação quadro a quadro (efeitos determinísticos) — ver `tests/blood_and_silver_attack_vfx.test.js`.
- **Polish**: *screen shake* e recorde de tempo em `localStorage`.
- **Minimapa** (`drawMinimap`, canvas próprio no HUD, ~30 Hz): norte fixo, seta do jogador, marcos dos dioramas, itens, inimigos, baús e chefe (presos na borda quando longe), nome da região (`zoneNameAt`) e zoom (`+`/`−`, `M` esconde). O terreno é o mapa do mundo em baixa resolução (`bakeOverviewRows`), gerado pelo worker do cenário em faixas quando ele está ocioso.

## 🛠️ Integração no Playful Hub

- **Rota**: `server.js` → `/jogos/blood_and_silver` (SEO) e `/blood_and_silver` (jogo).
- **Registro**: `games_control.json` → `BLOOD_AND_SILVER`.
- **Assets**: servidos da raiz via `express.static('./')`; referenciados no jogo por caminho relativo `../assets/...`.
