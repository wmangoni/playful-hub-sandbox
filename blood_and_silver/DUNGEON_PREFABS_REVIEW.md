# Revisão do mapeamento `DUNGEON_PREFABS` — Sangue & Prata

> **Arquivo:** `blood_and_silver/index.html` (definição em ~linha 1556; uso no desenho em ~linha 3493)
> **Status:** revisão concluída — **nenhuma correção aplicada** (apenas descrição, conforme solicitado).
> **Data:** 2026-08-22

---

## 1. Resumo executivo

O mapeamento `DUNGEON_PREFABS` tem **dois problemas**:

1. **Causa raiz (afeta 9 dos 13 prefabs):** a imagem que o jogo carrega para os objetos é `PNG/Objects.png` (384×96, 6 linhas de tiles), mas **todas as coordenadas do `DUNGEON_PREFABS` foram extraídas do layout de `Tiled_files/Objects.png`** (384×144, 9 linhas) referenciado pelo `Dungeon1.tmx`. Os dois arquivos têm os tiles em posições diferentes. Resultado: quase todos os objetos de cenário são montados com tiles errados (aparecem "agrupados de forma sem sentido").
2. **`barrels`, `urns` e `candelabra`** também referenciam tiles nas linhas 6–8 do spritesheet (sy = 96, 112, 128), que **nem existem** em `PNG/Objects.png` (que só tem 6 linhas). Por isso `urns` e `candelabra` ficam **invisíveis** e `barrels` fica **cortado**.

Além disso, há **um bug secundário** na animação de `torchStand` (fire2) e **um ponto a confirmar** no prefab `bones`.

---

## 2. Evidências concretas (metodologia)

Como o ambiente de execução não permite inspecionar imagens diretamente, a verificação foi feita por **análise de pixels/bytes** (decodificação PNG pura em Node), por **renderização ASCII** dos spritesheets e por **cruzamento com o `Dungeon1.tmx`** (fonte autoritativa). Também foram gerados "prints" (spritesheets com grade e prefabs compostos) em `/tmp/opencode/prints/`.

### 2.1. Discrepância entre as duas versões de `Objects.png`

| Propriedade | `PNG/Objects.png` (carregado pelo jogo) | `Tiled_files/Objects.png` (usado pelo TMX) |
|---|---|---|
| Dimensões | 384×96 (24×6 = 144 tiles) | 384×144 (24×9 = 216 tiles) |
| Referenciado por | `ASSETS.dungeonObjects` (linha 1426) | `<image source="Objects.png" width="384" height="144"/>` no `Dungeon1.tmx` |

Comparação tile a tile (hash MD5 de cada tile 16×16):

- Os **144 tiles** de `PNG/Objects.png` existem em alguma posição de `Tiled_files/Objects.png` (**é um subconjunto reordenado**, 0 tiles "novos").
- **Apenas 2 dos 144 tiles** estão na **mesma posição** nos dois arquivos.
- 62,80% dos pixels diferem ao comparar as 6 primeiras linhas (23.149 de 36.864 pixels).

Conclusão: `PNG/Objects.png` é um re-export **re-empacotado** (mesmos tiles, posições diferentes) da versão `Tiled_files/Objects.png`. Como `DUNGEON_PREFABS` usa as coordenadas do layout do TMX/Tiled, o jogo desenha os tiles errados.

### 2.2. Tiles fora dos limites da imagem carregada

`PNG/Objects.png` tem 6 linhas (sy válido = 0…80). Os seguintes tiles do `DUNGEON_PREFABS` ultrapassam esse limite:

| Prefab | Tile(s) fora dos limites |
|---|---|
| `barrels` | `sy=96` (segundo tile) |
| `urns` | `sy=112`, `sy=128` (todos os 4 tiles) |
| `candelabra` | `sy=112`, `sy=128` (ambos os tiles) |

### 2.3. Cruzamento com o `Dungeon1.tmx` (fonte autoritativa)

Ao extrair os *clusters* de objetos do mapa (`Objects`/`Objects2`/`Objects_under_wall`, gids 5579–5794) e comparar com `DUNGEON_PREFABS`, confirmou-se que as coordenadas do código **são as corretas para o layout `Tiled_files`**:

- `shrineAltar` = cols 4,5,6 × rows 1–4 (sx 64/80/96, sy 16/32/48/64) ✓
- `pillar` = col 7 × rows 1–4 (sx 112) ✓
- `sarcophagus` = cols 19,20 × rows 1–3 (sx 304/320) ✓
- `tombstone` = col 16 × rows 1–2 (sx 256) ✓
- `barrels` = col 12 × rows 5–6 (sx 192) ✓
- `urns` = cols 1,2 × rows 7–8 (sx 16/32) ✓
- `candelabra` = col 6 × rows 7–8 (sx 96) ✓

Ou seja, **as coordenadas não estão erradas em si** — estão erradas **para a imagem que o jogo carrega**.

---

## 3. Revisão item a item

| # | Prefab | Asset | Veredicto |
|---|---|---|---|
| 1 | `shrineAltar` | dungeonObjects | ❌ tiles errados (layout PNG ≠ Tiled) |
| 2 | `pillar` | dungeonObjects | ❌ tiles errados |
| 3 | `sarcophagus` | dungeonObjects | ❌ tiles errados |
| 4 | `tombstone` | dungeonObjects | ❌ tiles errados |
| 5 | `bones` | dungeonObjects | ❌ tiles errados + altura provavelmente errada (ver §4.3) |
| 6 | `crates` | dungeonObjects | ❌ tiles errados |
| 7 | `barrels` | dungeonObjects | ❌ tiles errados + tile inferior fora dos limites (cortado) |
| 8 | `urns` | dungeonObjects | ❌ tiles errados + **totalmente fora dos limites (invisível)** |
| 9 | `candelabra` | dungeonObjects | ❌ tiles errados + **totalmente fora dos limites (invisível)** |
| 10 | `brazierLarge` | dungeonFire | ✅ correto (6 frames × 3 linhas, bate com o TMX) |
| 11 | `torchStand` | dungeonFire2 | ⚠️ posição dos tiles correta, **espaçamento de frames errado** (ver §4.2) |
| 12 | `cracksA` | dungeonCracks | ✅ correto (sheet idêntico ao Tiled; tiles usados no mapa) |
| 13 | `cracksB` | dungeonCracks | ✅ correto (sheet idêntico; tiles válidos) |

> `decorative_cracks_floor.png` é **idêntico** entre `PNG/` e `Tiled_files/` (120/120 tiles iguais), então não há mismatch nos cracks. `fire_animation.png` e `fire_animation2.png` só existem em `PNG/` e suas dimensões batem com o TMX (176×288 e 96×192).

---

## 4. Correções necessárias (NÃO aplicadas)

### 4.1. Correção principal — caminho do asset de objetos

**Onde:** `blood_and_silver/index.html`, linha 1426 (`ASSETS.dungeonObjects`).

**Problema:** o jogo carrega `../assets/2d-top-down-pixel-dungeon-asset-pack/PNG/Objects.png` (384×96, re-empacotado), mas as coordenadas de `DUNGEON_PREFABS` são do layout de `Tiled_files/Objects.png` (384×144).

**Correção:** trocar para:

```
dungeonObjects: '../assets/2d-top-down-pixel-dungeon-asset-pack/Tiled_files/Objects.png',
```

(ou, alternativamente, substituir o conteúdo de `PNG/Objects.png` pela versão 384×144 completa). Isso corrige **os 9 prefabs de objetos de uma só vez** e faz `barrels`, `urns` e `candelabra` voltarem a ter seus tiles (linhas 6–8).

> Alternativa (não recomendada): manter `PNG/Objects.png` e reescrever as coordenadas `sx/sy` de cada prefab para o layout do PNG. Como o PNG é uma reordenação não uniforme, essa alternativa é propensa a erro; a tabela de tradução tile→tile existe mas vários tiles têm múltiplas ocorrências (duplicados), tornando o mapeamento ambíguo.

### 4.2. Correção secundária — animação de `torchStand` (fire2)

**Onde:** `blood_and_silver/index.html`, linha 3513.

**Problema:** o `Dungeon1.tmx` define a animação de `fire_animation2` com **3 frames espaçados de 4 linhas** (`tileid +24 = +4 linhas`, ex.: tile 2 → 2, 26, 50). O código usa espaçamento de **2 linhas**:

```js
srcY = (t.row + frame * 2) * 16;   // linha 3513
```

Isso faz o frame 1 e o frame 2 da tocha buscarem tiles de **outros** torches/frames (rows 2–3 e 4–5) em vez das rows 4–5 e 8–9, fazendo a chama "piscar" entre gráficos diferentes.

**Correção:** usar espaçamento de 4 linhas:

```js
srcY = (t.row + frame * 4) * 16;
```

> O `brazierLarge` (fire1, linha 3509, `frame * 3`) está correto: o TMX define 6 frames espaçados de 3 linhas (tileid +33 = +3 linhas).

### 4.3. Ponto a confirmar — `bones` (2×1 vs 2×2)

**Onde:** `DUNGEON_PREFABS.bones` (linha ~1608).

**Observação:** o prefab `bones` declara 2×1 tiles (`w:32, h:16`, `sx:336/352, sy:16` = cols 21,22 linha 1). Pela análise de pixels do `Tiled_files/Objects.png`, a região cols 21–22 ocupa **2×2 tiles** (linhas 1 **e** 2), sugerindo que o objeto real tem 32×32 px e não 32×16. Além disso, esse objeto **não aparece como cluster 2×1 no `Dungeon1.tmx`**.

**Ação recomendada:** confirmar visualmente o que há em cols 21,22 rows 1–2 e, se for o objeto "ossadas/crânios", ajustar `h` para 32 (e acrescentar os tiles da linha 2); se não for, reposicionar `bones` para o tile correto. **Não corrigir sem confirmação visual.**

### 4.4. Ponto a confirmar — sobreposição de tiles entre `crates` e `barrels`

**Onde:** `DUNGEON_PREFABS.crates` e `DUNGEON_PREFABS.barrels` (linhas ~1619 e ~1630).

**Observação:** os dois prefabs referenciam o **mesmo tile** `sx=192, sy=80` (col 12, linha 5):
- `crates` usa `(192, 80)` como seu canto inferior-direito (`dx:16, dy:16`).
- `barrels` usa `(192, 80)` como seu tile superior (`dx:0, dy:0`).

No `Dungeon1.tmx`, esse tile (gid 5711) pertence a um **cluster de barril** (col 12, linhas 5–6), o que sugere que a extensão 2×2 de `crates` pode estar invadindo a posição do barril (ou que `crates` deveria ser 2×1, ou estar em outro local). 

**Ação recomendada:** após aplicar a correção do asset (4.1), validar visualmente a pilha de caixotes e o barril e, se necessário, reposicionar `crates`/`barrels` para tiles distintos.

---

## 5. Tabela-resumo das correções

| Correção | Arquivo / linha | Tipo | Impacto |
|---|---|---|---|
| Trocar asset de objetos para `Tiled_files/Objects.png` | `index.html:1426` | Caminho de asset | Corrige 9 prefabs (❌ → ✅) |
| `frame * 2` → `frame * 4` na animação fire2 | `index.html:3513` | Lógica de animação | Corrige `torchStand` |
| Confirmar/ajustar `bones` (2×1 vs 2×2) | `index.html:~1608` | Coordenadas | Menor (decorativo) |
