# 🧛 TASK-BLOOD_AND_SILVER_010: Melhorias Gráficas — Sprites e Cenário

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `📋 Backlog` — planejamento concluído, aguardando aprovação para execução.
> **Escopo**: APENAS visual. **Não mexer em mecânica** (dano, HP, velocidade, spawn, colisão de jogabilidade, progressão).

---

## 🎯 1. Objetivo

Corrigir o uso incorreto dos sprites e construir o cenário visual do jogo:

1. Trocar o sprite do **inimigo** (hoje é um objeto de cenário — uma árvore/toco) pelos **vampiros** do pacote `vampire-4-direction-pixel-character-sprite-pack`.
2. Substituir o **chão procedural** (cor lisa + grade) por **tiles reais** de `Ground_rocks.png` e `Water_coasts.png`.
3. Adicionar **objetos decorativos** espalhados aleatoriamente usando `Objects.png`.

---

## 🔍 2. Problemas identificados (estado atual)

| Problema | Onde | Detalhe |
| :--- | :--- | :--- |
| Inimigo usa sprite de **árvore/toco** | `ASSETS.skeleton` = `PNG/Animation3.png` (linha ~540) | `Animation3.png` é um **objeto** (64×64, conteúdo 62×56 = mais largo que alto, 3 linhas idênticas = variantes de sombra), **não** uma criatura 4-direcional. Confirmado por análise de pixels. |
| Chão é **procedural** (cor + grade de 64px) | `drawGround()` (linhas ~1609–1627) | Não usa nenhum asset de cenário. |
| **Não há objetos** decorativos | — | Os assets `Ground_rocks.png`, `Water_coasts.png`, `Objects.png` não são usados em lugar nenhum. |
| Caixas/chest são retângulos procedurais | `drawChests()` | Fora do escopo desta tarefa (pode ser tratado depois). |

**Nota importante**: o pacote `skeleton-top-down-pixel-art` **NÃO contém esqueleto animado 4-direcional** — é, na prática, um pacote de **cenário/cemitério** (árvores, rochas, túmulos, ruínas, cristais, ossos). As `Animation1..6.png` são **objetos animados de cenário**. A criatura 4-direcional correta está no pacote **vampire**.

---

## 🗺️ 3. Resultado da investigação dos assets (números confirmados)

### 3.1 Vampiros (inimigos) — `assets/vampire-4-direction-pixel-character-sprite-pack/PNG/`

Frame **64×64**, **4 direções** (linhas de 64px), frames dispostos **horizontalmente** (64px cada).

| Arquivo (`Vampires1/With_shadow/`) | Dimensões | Frames/direção |
| :--- | :--- | :--- |
| `Vampires1_Idle_with_shadow.png` | 256×256 | 4 |
| `Vampires1_Walk_with_shadow.png` | 384×256 | 6 |
| `Vampires1_Run_with_shadow.png` | 512×256 | 8 |
| `Vampires1_Attack_with_shadow.png` | 768×256 | 12 |
| `Vampires1_Death_with_shadow.png` | 704×256 | 11 |
| `Vampires1_Hurt_with_shadow.png` | 256×256 | 4 |

- **Ordem das direções (linha 0→3): `front` (frente), `back` (trás), `left` (esquerda), `right` (direita)** — determinada por análise de simetria de pixels + nomes dos `.aseprite` (`_front`, `_back`, `_left`, `_right`).
- `Vampires2` e `Vampires3` têm dimensões idênticas às do `Vampires1` (mesmos 64×64 e contagens) — úteis para variação visual ou para o **chefe**.
- Há variantes `With_shadow/` e `Without_shadow/`. **Usar `With_shadow`** (mantém o padrão do jogador).

### 3.2 Chão e Água — `assets/skeleton-top-down-pixel-art/PNG/`

**Todos os tiles são 16×16 px.** ⚠️ **Os arquivos em `PNG/` têm dimensões DIFERENTES dos de `Tiled_files/`** (o `.tmx` referencia as versões de `Tiled_files/`, que são outra organização). Mapeamento verificado por **comparação de pixels** (diff=0):

| Arquivo | Dimensões | Grade de tiles | Tile principal |
| :--- | :--- | :--- | :--- |
| `Ground_rocks.png` | 496×592 | 31×37 tiles | **Chão: (col 2, row 2) → pixel (32,32)** |
| `Water_coasts.png` | 1056×256 | 66×16 tiles | **Água aberta: (col 24, row 14) → pixel (384,224)** |
| `Objects.png` | 768×704 | 48×44 tiles | (ver §3.3) |

- **Fórmula de mapeamento** de tile → pixel de origem: `px = col × 16`, `py = row × 16`.
- O tile de **chão** foi confirmado por match exato com o tile `GID 55` da layer `ground` do `.tmx` (que é o tile repetido 796× no mapa de referência `Undead_land`). Também há cópias idênticas do chão em `(27,3)`, `(30,3)`, `(29,16)` (candidatas a variação).
- O tile de **água aberta** foi confirmado por match exato com o `GID 8057` da layer `water` do `.tmx`.
- As **transições de costa** (praia/água) do `.tmx` têm correspondência **parcial** no `PNG/Water_coasts.png` (o PNG é "repacked"): algumas batem exato, outras não. **Mapear visualmente na execução.**

### 3.3 Objetos — `assets/skeleton-top-down-pixel-art/PNG/`

Duas fontes possíveis:

- **`Objects.png`** (pedido pelo PO): 768×704 = 48×44 tiles de 16×16, com objetos multi-tile (túmulo, árvore, ossos…). ⚠️ **NÃO bate com o `Tiled_files/Objects.png`** (conteúdo diferente); o índice do `.tmx` **não** se aplica diretamente. Exige identificar os retângulos (bounding box) de cada objeto **visualmente na execução**.
- **`Objects_separately/`** (recomendado — 240 arquivos, um objeto por arquivo, já recortado e nomeado):

| Objeto | Dimensões (amostra) |
| :--- | :--- |
| Grave (túmulo) | 32×32 |
| Bones (ossos) | 32×32 |
| Rock (rocha) | 64×64 |
| Crystal (cristal) | 64×64 |
| Dead_arm (braço morto) | 64×64 |
| Scull_door (porta de crânio) | 64×64 |
| Tree / Dead_tree / Broken_tree | 128×128 |
| Ruin / Pile_sculls / Thorn_plant / Plant | 128×128 |
| Lich (bruxo morto-vivo, estático) | 256×256 |

> Cada família tem variantes `_shadow1`, `_shadow2`, `_shadow3` (direção da sombra). Usar `_shadow1` por consistência (recomendação do ASSETS.md).

---

## 🧭 4. Decisões de design

1. **Inimigo = vampiro** (`Vampires1`), com `Walk` (6 frames) em movimento e `Idle` (4 frames) parado. Sem flip: usar as 4 linhas (front/back/left/right).
2. **Chefe = vampiro maior**: manter a lógica atual (escala 128×128 + glow vermelho), mas trocar o sprite — recomendo `Vampires3` (distingue visualmente do inimigo comum). Alternativa mínima: `Vampires1` escalado.
3. **Chão**: tile `Ground_rocks` (2,2) repetido, renderizado de forma eficiente via `ctx.createPattern` (offscreen 16×16 → fill). Variação opcional com os tiles cópia `(27,3)/(30,3)/(29,16)` se forem visualmente diferentes.
4. **Água**: 1–3 lagoas decorativas (não colidíveis) em posições determinísticas, com água aberta `(24,14)` + transições de costa (mapeadas na execução). Alternativa simples: só "poças" de água aberta sem borda.
5. **Objetos decorativos**: espalhados com **PRNG semeado** (determinístico, mesmo mundo toda partida). **Não colidíveis** (mecânica inalterada). Desenhados na camada do chão (abaixo das entidades). Fonte recomendada: `Objects_separately/`; `Objects.png` como alternativa (mapear na execução).
6. **Escala**: manter 1:1 (personagem 64px = 4 tiles de 16px), `imageSmoothingEnabled = false`. Sem mudança de câmera/zoom.

---

## 📋 5. Plano de execução (passos)

> Cada passo é independente e testável; não altera mecânica.

### Passo A — Inimigos vampiros
1. Adicionar `ASSETS.enemyWalk` → `Vampires1_Walk_with_shadow.png` e `ASSETS.enemyIdle` → `Vampires1_Idle_with_shadow.png` (remover/ignorar `ASSETS.skeleton`).
2. Adicionar `ANIMS.enemyWalk = { frames: 6, fps: 8 }` e `ANIMS.enemyIdle = { frames: 4, fps: 6 }`.
3. Reescrever `drawEnemies()`: mapeamento de direção para 4 linhas, **sem flip**:
   - `dx = player.x - e.x`, `dy = player.y - e.y` (sentido do deslocamento em direção ao jogador).
   - `|dx| > |dy|` → `dx > 0 ? row 3 (right) : row 2 (left)`.
   - senão → `dy > 0 ? row 0 (front) : row 1 (back)`.
   - Enquanto o inimigo se move, usar `enemyWalk`; se a velocidade for ~0 (knockback/empurrão), usar `enemyIdle` (opcional).
4. Chefe (`e.isBoss`): trocar para `Vampires3_Walk` (ou `Vampires1_Walk`), mantendo escala 128×128 + glow vermelho.

**Validação**: inimigos aparecem como vampiros andando em 4 direções corretas (sem "árvore").

### Passo B — Chão com tiles
1. Criar um offscreen canvas 16×16 com o tile `Ground_rocks` (col 2, row 2) via `drawImage`.
2. `ctx.createPattern(offscreen, 'repeat')` e, em `drawGround()`, preencher a área visível com `translate(-camera.x, -camera.y)` + `fillRect(camera.x, camera.y, VIEW_W, VIEW_H)`.
3. Manter `drawBoundary()` (moldura do mundo) e remover a grade procedural.
4. (Opcional) Variação: intercalar os tiles cópia com um padrão determinístico (hash por célula) para quebrar monotonia — só se forem visualmente distintos.

**Validação**: chão com textura de terra/pedra, sem costuras visíveis, sem custo por frame relevante (fill único).

### Passo C — Água decorativa
1. Identificar visualmente (na execução) os tiles de transição de costa no `PNG/Water_coasts.png` (referência: água aberta em `(24,14)`; as bordas norte/sul/leste/oeste + cantos vêm das transições).
2. Posicionar 1–3 lagoas (elipses/retângulos de tiles) em coordenadas fixas do mundo (ex.: cantos afastados), compostas de água aberta + borda de costa.
3. Desenhar na camada do chão (abaixo das entidades). Não colidíveis.

**Validação**: lagoas visíveis com borda, sem interferir na jogabilidade.

### Passo D — Objetos decorativos espalhados
1. Implementar um **PRNG semeado** (ex.: `mulberry32(seed)`), com seed fixa.
2. No `resetGame()`, gerar uma lista de objetos (tipo + x + y) uma única vez (não por frame), ex.: ~80–150 objetos distribuídos pelo mundo 4000×4000, evitando sobreposição (grade de ocupação).
3. Tipos (de `Objects_separately/`, com `_shadow1`): Grave, Bones, Rock, Crystal, Tree, Dead_tree, Broken_tree, Ruin, Pile_sculls, Thorn_plant, Plant, Dead_arm. (Se preferir `Objects.png`, mapear os bounding boxes dos objetos na execução.)
4. `drawObjects()`: desenhar cada objeto na posição, na camada do chão. Não colidíveis.

**Validação**: cenário "povoado" de túmulos/árvores/rochas, determinístico (mesmo layout toda partida), sem impacto mecânico.

### Passo E — Revisão final e performance
1. Confirmar que **nenhuma** lógica de gameplay foi alterada (diff revisado).
2. Perfil de performance: chão = 1 fill (pattern); objetos = 1 drawImage por objeto visível (com culling por viewport); inimigos = 1 drawImage por frame por inimigo.
3. Confirmar `imageSmoothingEnabled = false` para pixel art nítida.

---

## ✅ 6. Re-análise (checklist de validação do planejamento)

Re-verifiquei cada item e garanti que:

- [x] **Inimigo**: usei o pacote correto (vampire 4-direcional), não o pacote de cenário. O frame é 64×64 (mesma base do jogador), então `FRAME=64` e `drawSprite` continuam funcionando sem mudança.
- [x] **Ordem das direções do vampiro** (`front,back,left,right`) difere do layout de 3 linhas atual do esqueleto — o plano inclui reescrever o mapeamento (sem flip).
- [x] **Tiles 16×16** confirmados; as dimensões de `PNG/` **não** batem com `Tiled_files/` — o plano usa os pixels mapeados por comparação (chão `(32,32)`, água `(384,224)`), não os índices do `.tmx`.
- [x] **Mecânica intacta**: todos os elementos novos são visuais/não-colidíveis; nada toca em `update*` de gameplay, HP, dano, spawn ou progressão.
- [x] **Determinismo**: objetos com seed fixa → mundo estável entre partidas.
- [x] **Performance**: chão por pattern (O(1)), objetos pré-computados com culling, sem custo por frame relevante.
- [x] **Escala coerente**: 16px (tiles) × 64px (personagens) = 4 tiles/personagem, como nos assets originais.

---

## ⚠️ 7. Riscos e questões abertas (decidir na execução)

1. **Ordem das direções do vampiro**: inferida por pixels + nomes `.aseprite`; **confirmar visualmente** na execução (se invertido, é 1 linha de código a trocar).
2. **Transições de costa**: o `PNG/Water_coasts.png` é repacked; mapear as bordas visualmente. Se ficar complexo, opção mínima = poças sem borda.
3. **`Objects.png` vs `Objects_separately/`**: o PO pediu `Objects.png`, mas `Objects_separately/` é mais simples e já recortado. Recomendo `Objects_separately/` (mesma arte, mesmo pacote); confirmar com o PO.
4. **Colisão de objetos**: plano assume **decorativo** (não colidível) para não alterar mecânica. Se o PO quiser colisão, vira tarefa de mecânica à parte.
5. **Variação de chão**: os tiles cópia `(27,3)/(30,3)/(29,16)` podem ser variações ou duplicatas — confirmar visualmente antes de usar como variação.
6. **Lich (256×256)**: disponível como decoração ou futuro mini-boss; fora do escopo desta tarefa.
