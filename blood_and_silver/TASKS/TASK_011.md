# 🧛 TASK-BLOOD_AND_SILVER_011: Melhorias de UI — Tooltips, Descrições e Tela de Pause

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `✅ Done` — implementado (tooltips, descrições de itens e tela de pause).
> **Nota**: o visual dos elementos de UI (tooltip/pause) é aplicado via **CSS puro** — o bundle `ui-for-rpg/PNG` foi removido porque os PNGs não têm os elementos separados (não servem como fundo esticado).
> **Escopo**: APENAS UI/informação. **Não mexer em mecânica** (dano, HP, velocidade, spawn, colisão de jogabilidade, progressão).

---

## 🎯 1. Objetivo

Resolver o problema de **"o jogador não sabe o que cada item faz"** e adicionar uma **tela de pause**:

1. **Descrições completas** para todas as armas e passivos (o que fazem + valores numéricos atuais).
2. **Tooltip no hover** (popup com as informações do item) ao passar o mouse sobre armas/passivos no HUD e na tela de pause.
3. **Pause com ENTER**: congela a partida e mostra as estatísticas do jogador (nível, abates, tempo, armas com nível e passivos), com **hover na arma mostrando a descrição completa**.
4. Usar o bundle de UI `assets/ui-for-rpg/PNG` para construir os popups e elementos visuais.

---

## 🔍 2. Estado atual (problemas identificados)

| Problema | Onde | Detalhe |
| :--- | :--- | :--- |
| **Nenhuma informação** sobre o que cada item faz | `updateWeaponsRow()` / `updatePassivesRow()` (~linha 907) | Chips do HUD mostram só `ícone + nível`; o passivo **nem tem `title`**; a arma tem `title` só com o nome. |
| **Tela de escolha (level up / baú) não explica o item** | `renderUpgradeCards()` / `renderChestPopup()` (~1236 e ~1536) | Mostra apenas `Nível X → Y` ou `NOVA ARMA`/`NOVO PASSIVO` — zero informação de efeito. |
| **Não há descrição nos dados** | `WEAPONS` (~478) e `PASSIVES` (~494) | Não existe campo `desc`; só há números brutos (`damage`, `interval`, `stat`, `amount`...). |
| **Não há pause** | máquina de estados `game.status` (~834) | Estados: `menu | playing | levelup | chest | gameover`. ENTER só inicia/coleta. |
| Bundle de UI **não é usado** | — | `assets/ui-for-rpg/PNG/` existe mas nenhum arquivo é referenciado pelo jogo. |

---

## 🗺️ 3. Resultado da investigação dos assets (UI bundle)

Bundle `assets/ui-for-rpg/PNG/` (dimensões confirmadas por leitura do cabeçalho PNG + análise de pixels de transparência):

| Arquivo | Dimensões | Estrutura (análise de pixels) | Uso proposto |
| :--- | :--- | :--- | :--- |
| `Action_panel.png` | 192×96 | Conteúdo em x=13..190; faixa interna transparente em y=32..44 (divide o painel em faixas). Painel horizontal compacto. | **Fundo do tooltip** e **fundo das linhas de arma/passivo** na tela de pause. |
| `character_panel.png` | 192×160 | Duas colunas (x=2..85 e x=87..181, ~84px cada); linhas separadas em y=32-33/64-65/96-97/128-132 (5 faixas). Painel de personagem/status. | **Cartão do jogador** na tela de pause (nível/abates/tempo). |
| `Icons.png` | 96×304 | 3 colunas de ícones de **largura 32px**; ~16 linhas de **altura variável** (15–30px). ⚠️ Não é grade uniforme 32×32. | **Não usar por ora** (exige identificação visual de cada ícone). Manter os emojis já mapeados 1:1 em `WEAPONS`/`PASSIVES`. |
| `Main_tiles.png` | 384×304 | Atlas irregular de tiles (separadores em x=139-143, 187-196...; y=37-47, 85-95...). | Reserva (bordas/9-slice) — só se necessário. |
| `Buttons.png` | 400×528 | Atlas de botões. | Reserva (botões do pause) — opcional. |

**Nota**: não foi possível inspecionar visualmente os sprites (ferramenta sem entrada de imagem). As coordenadas/recortes finais serão **validados visualmente na execução**, com fallback: se um sprite esticado ficar ruim, usar o painel em tamanho nativo + fundo CSS gótico (estilo atual) para completar o espaço.

---

## 🧭 4. Decisões de design

1. **Conteúdo das descrições** = dados no próprio catálogo (`desc` em `WEAPONS`/`PASSIVES`) + helpers que geram as **linhas numéricas atuais** (`describeWeapon`, `describePassive`). Um único texto é reutilizado por: tooltip do HUD, tooltip do pause e (recomendado) cards de level up/baú.
2. **Tooltip** = elemento DOM `#tooltip` posicionado perto do cursor, com fundo `Action_panel.png` (CSS `background-image`, `image-rendering: pixelated`). Substitui o `title` nativo (que só mostra nome).
3. **Pause** = novo estado `paused` na máquina de estados. ENTER alterna `playing ⇄ paused` **apenas** nesses estados (ignorado em menu/levelup/chest/gameover). O `update()` já retorna cedo quando `status !== 'playing'`, então a simulação congela automaticamente; `render()` continua (quadro congelado atrás do overlay).
4. **Tela de pause** = overlay DOM `#pauseScreen` com: cartão do jogador (`character_panel.png`) + lista de armas e passivos (linhas com fundo `Action_panel.png`), cada linha com **hover → tooltip de descrição completa** (reusa o mesmo sistema do passo 2).
5. **Cards de level up/baú** (bônus recomendado): passar a exibir a descrição do item na própria carta — resolve o "não sei o que estou pegando" **no momento da escolha**, que é o ponto mais crítico do problema relatado.
6. **Emojis mantidos** como ícones dos itens (já estão mapeados 1:1 e são consistentes em HUD, level up, baú e pause). `Icons.png` fica fora do escopo (exige identificação visual).

---

## 📋 5. Plano de execução (passos)

> Cada passo é independente e testável; **não altera mecânica**.

### Passo A — Descrições (dados + helpers)
1. Adicionar campo `desc` (texto curto em PT) a cada entrada de `WEAPONS` e `PASSIVES`. Conteúdo proposto:
   - `sword`: "Golpeia em arco à sua volta."
   - `axe`: "Golpe pesado e lento, com grande dano e empurrão."
   - `bow`: "Dispara flechas no inimigo mais próximo."
   - `crossbow`: "Dispara virotes que atravessam vários inimigos."
   - `holy_water`: "Derrama água benta que queima uma área por alguns segundos."
   - `amulet`: "Aumenta a área de efeito." · `pyrope`: "Aumenta o dano das armas." · `mechanism`: "Reduz o tempo de recarga das armas." · `feather`: "Aumenta a velocidade dos projéteis." · `meat`: "Aumenta a vida máxima." · `mushroom`: "Regenera vida aos poucos." · `spirit_orb`: "Atrai gemas de mais longe." · `boar_ring`: "Aumenta a velocidade de movimento."
2. Criar `describeWeapon(w)` → linhas: dano atual, intervalo (cooldown), alcance, área, duração, nº de projéteis, perfuração; e, se evoluída, nome da evolução. Níveis de escala já conhecidos (`levelUpWeapon`, ~734): dano +30%/nv, cooldown −3%/nv (mín. ×0.65), alcance +8%/nv, área +10%/nv, +1 projétil a cada 3 níveis (bow/besta/água benta).
3. Criar `describePassive(p)` → linhas: bônus por nível e total atual (ex.: "Pena · +10% velocidade de projéteis por nível — total +30%"). Usar rótulos claros por `stat` (area/might/cooldown/speed/maxhp/regen/magnet/move_speed).

**Validação**: chamar `describeWeapon`/`describePassive` no console/devtools e conferir números coerentes com `levelUpWeapon`/`recomputeStats`.

### Passo B — Tooltip (hover)
1. Adicionar `<div id="tooltip">` no HTML + CSS (posição `fixed`, oculto por padrão, fundo `Action_panel.png`, `image-rendering: pixelated`, fonte Cinzel).
2. Helpers `showTooltip(html, clientX, clientY)` / `hideTooltip()`, com reposicionamento para não estourar a borda da tela.
3. Em `updateWeaponsRow()`/`updatePassivesRow()`, substituir o `title` por `mouseenter/mouseleave/mousemove` que abrem o tooltip com `describeWeapon/describePassive`.

**Validação**: passar o mouse sobre armas/passivos no HUD mostra o popup com nome + nível + descrição + valores.

### Passo C — Pause (ENTER)
1. Adicionar o estado `paused` à máquina de estados. `togglePause()`: `playing → paused` (mostra `#pauseScreen`, limpa teclas de movimento) e `paused → playing` (esconde).
2. Em `onKeyDown` (~930): tratar `k === 'enter'` para alternar pause **quando** `status` é `playing` ou `paused`. Não interferir nos usos atuais do ENTER (menu/gameover/chest).
3. Adicionar `<div class="overlay hidden" id="pauseScreen">` com: cartão do jogador (`character_panel.png`) mostrando **nível, abates e tempo de sobrevivência**; e listas de **armas** (ícone + nome + nível + nome da evolução) e **passivos** (ícone + nome + nível).
4. `renderPauseScreen()` preenche as listas; cada item recebe hover → tooltip de descrição completa (reusa Passo B).
5. Garantir que `game.time` não avança pausado (já está dentro de `update()`, que retorna cedo) e que o `dt` não salta ao retomar (o clamp de 0.05s já cobre isso).

**Validação**: ENTER pausa/resume; a tela mostra nível/abates/tempo e as armas com nível; hover na arma mostra descrição completa; inimigos/relógio congelam.

### Passo D — Visual com o bundle
1. Aplicar `Action_panel.png` como fundo do `#tooltip` e das linhas de arma/passivo do pause; `character_panel.png` no cartão do jogador.
2. Ajustar recortes/escala (native size preferencial), `image-rendering: pixelated`. Validar visualmente; fallback = painel nativo + fundo gótico CSS para preencher.

**Validação**: popups e tela de pause com visual coeso com o tema gótico, usando os assets do bundle.

### Passo E — Bônus: descrição nos cards de escolha
1. Em `renderUpgradeCards()` e `renderChestPopup()`, trocar o texto `Nível X → Y`/`NOVA ARMA` por nome + `desc` + efeito (reusando `describeWeapon`/`describePassive`).
2. Não alterar a lógica de escolha (apenas o conteúdo exibido).

**Validação**: ao subir de nível ou abrir baú, cada carta explica o que o item faz antes de escolher.

### Passo F — Revisão final
1. Confirmar que **nenhuma** lógica de gameplay mudou (pause é aditivo; descrições são só dados/strings).
2. Teste headless (mock DOM/canvas): alternar pause N vezes sem crash; `describeWeapon/describePassive` retornam texto coerente; partida continua normalmente após resume.
3. Checklist manual de hover/pause no navegador.

---

## ✅ 6. Re-análise (checklist de validação do planejamento)

- [x] **Mecânica intacta**: descrições e pause não tocam em `update*` de gameplay, HP, dano, spawn, colisão ou progressão. O congelamento do pause usa o retorno cedo já existente (`status !== 'playing'`).
- [x] **Sem saltos de `dt`**: o `gameLoop` clampa `dt` em 0.05s e `lastTime` segue atualizando — retomar o pause não causa "teleporte" de simulação.
- [x] **ENTER não conflita**: menu/gameover/chest continuam usando ENTER; pause só atua em `playing`/`paused`.
- [x] **Um texto, vários lugares**: a descrição nasce nos dados/helpers e é reutilizada em tooltip, pause e cards — sem duplicação de texto.
- [x] **Bundle usado**: tooltip/pause usam `Action_panel.png` e `character_panel.png`; `Icons.png`/`Main_tiles.png`/`Buttons.png` ficam de reserva (exigem identificação visual).
- [x] **Fallback robusto**: recortes visuais validados na execução; fallback CSS gótico já existente se um sprite esticar mal.

---

## ⚠️ 7. Decisões (aprovadas pelo PO)

| # | Ponto | Decisão |
| :--- | :--- | :--- |
| 1 | Descrição nos **cards de level up / baú** (Passo E)? | **Sim** — adicionar. |
| 2 | Tela de pause: apenas armas ou armas + passivos? | **Armas + passivos**. |
| 3 | Substituir emojis por ícones de `Icons.png`? | **Não por ora** (exige identificar visualmente cada ícone). |
| 4 | Usar `Buttons.png`/`Main_tiles.png` nos botões/bordas? | **Opcional**, só se o visual pedir. |
