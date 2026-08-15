# 🗺️ ASSETS — Guia de Sprites (Sangue & Prata)

> **Localização**: `/assets/` (raiz do repositório).
> **Licença**: CraftPix — todos os pacotes têm `License.txt` → https://craftpix.net/file-licenses/ (confirmar o tipo de licença antes de deploy público).
> **Base**: a maioria dos pacotes usa **tile de 16×16 px** (confirmado nos `.tmx`).

---

## 1. Inventário de Pacotes

| Pacote | Conteúdo | Uso no jogo |
| :--- | :--- | :--- |
| `skeleton-top-down-pixel-art` | Skeletons top-down, cenário (chão/água), props de cemitério, **Lich (256px)** | Inimigos undead + chão + props + mini-boss |
| `vampire-4-direction-pixel-character-sprite-pack` | **3 vampiros** (Vampires1/2/3), 4 direções, Idle/Walk/Run/Attack/Death/Hurt | **Chefes (vampiros)** |
| `swordsman-1-3-level-pixel-top-down-sprite-character` | **Espadachim** em 3 níveis, 4 direções, Idle/Walk/Run/Attack/Death/Hurt | **Jogador (caçador)** |
| `ruined-temple-top-down-location-pixel-art` | **Templo em ruínas** (tiles chão/paredes/interior), cultistas (1–6), Líder, Ghost, armadilhas | Cenário principal + inimigos cultistas |
| `top-down-ruins-pixel-art` | Ruínas em 8 variantes de cor (Brown/Sand/Snow/Water/Blue-gray/…), 5 tamanhos | Props de ruínas |
| `2d-top-down-pixel-dungeon-asset-pack` | Masmorra (paredes/piso/rachaduras), água animada, fogo, armadilha, porta/alavanca/baú | Cenário de masmorra + **baús/portas** |
| `dungeon-props-and-objects-asset-pack` | Props: bomba, canhão, guilhotina, lâminas rotativas, caveira, teia, setas | Armadilhas/props |
| `40-loot-icons-pixel-art` | **40 ícones de itens** (32×32), com e sem fundo | **Itens/passivos/armas** no HUD e popups |
| `bow-and-crossbow-pixel-art-icons` | **48 ícones de arcos/bestas** (32×32), com/sem efeito e fundo | **Armas de projétil** (Arco/Besta) |
| `ui-for-rpg` | Botões, ícones, números, painéis, menus, inventário, telas win/loose | **UI/HUD** |

> Cada pacote traz pastas `PNG/` (sprites finais), `PSD/` (fontes editáveis — não usar em runtime), `ASEPRITE/` (quando houver) e `Tiled_files/` (mapas de referência `.tmx`). Use apenas `PNG/`.

---

## 2. Resumo de Tamanhos

### 2.1 Grid base
- **Tile de 16×16 px** (dungeon, templo, skeleton, vampire — confirmado em `.tmx`).
- Sprites de props seguem múltiplos de 16 (16/32/64/128/256).
- **Exceção**: `top-down-ruins-pixel-art` usa props de **112×112 px** (7 tiles) — arte com grid próprio; ao misturar com outros pacotes, reescalar para manter proporção.

### 2.2 Personagens (spritesheets 4-direcionais)
| Personagem | Idle | Walk | Attack |
| :--- | :--- | :--- | :--- |
| Vampires1 | 256×256 | 384×256 | 768×256 |
| Swordsman lvl1 | 768×256 | 384×256 | 768×256 |
| Cultist1 (templo) | 384×128 | 192×128 | — (Pray 4 dir) |

> Estas sheets são **4-direcionais** (frente/trás/esquerda/direita) com frames empacotados. Recorte por direção e por frame (largura da direção = largura/4). Confirme o nº de frames por animação no fatiamento.

### 2.3 UI e Ícones
- Ícones de loot: **32×32 px** cada (2 variantes: com/sem fundo).
- UI (`ui-for-rpg`): botões (400×528), ícones (96×304), números (160×800 / 320×336), painéis (192×96 …), menus, inventário (336×160), win/loose (448×416).

---

## 3. Onde pegar cada sprite

### 3.1 Cenário (Templo em Ruínas — tema principal)
| Elemento | Pacote / Arquivo |
| :--- | :--- |
| Paredes & piso do templo | `ruined-temple-top-down-location-pixel-art/PNG/Walls_floor.png` |
| Tiles externos | `.../Tiles_exterior.png` |
| Objetos do interior | `.../Objects_interior.png` |
| Objetos externos | `.../Exterior_objects.png` |
| Rachaduras decorativas | `.../Decorative_cracks_interior.png` / `..._exterior.png` |
| Ruínas (props) | `top-down-ruins-pixel-art/PNG/Assets/Brown_ruins{1..5}.png` (8 cores disponíveis) |
| Chão alternativo (cemitério) | `skeleton-top-down-pixel-art/PNG/Ground_rocks.png` |
| Água (animada) | `2d-top-down-pixel-dungeon-asset-pack/PNG/water_detilazation_v2.png` / `Water_coasts_animation.png` |
| Masmorra (paredes/piso) | `2d-top-down-pixel-dungeon-asset-pack/PNG/walls_floor.png` |

### 3.2 Armadilhas / Props
| Elemento | Pacote / Arquivo |
| :--- | :--- |
| Porta / alavanca / **baú** | `2d-top-down-pixel-dungeon-asset-pack/PNG/doors_lever_chest_animation.png` |
| Fogo | `.../fire_animation.png` / `fire_animation2.png` |
| Armadilha (espinhos) | `.../trap_animation.png` |
| Lâminas rotativas | `dungeon-props-and-objects-asset-pack/PNG/Rotating_blades.png` |
| Bomba, canhão, guilhotina, caveira, teia | `dungeon-props-and-objects-asset-pack/PNG/*.png` |
| Espinhos / lâminas / alavanca (templo) | `ruined-temple-top-down-location-pixel-art/PNG/Spikes.png`, `blades_trap.png`, `Lever.png` |
| Props de cemitério (túmulos, árvores mortas, ossos) | `skeleton-top-down-pixel-art/PNG/Objects_separately/` |

### 3.3 Personagens
| Papel | Pacote / Arquivo |
| :--- | :--- |
| **Jogador (caçador)** | `swordsman-1-3-level-pixel-top-down-sprite-character/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_{Idle,Walk,Run,Attack,Death,Hurt}_with_shadow.png` (lvl1/2/3 = evolução visual) |
| **Inimigo comum (undead/esqueleto)** | `skeleton-top-down-pixel-art/PNG/Animation{1..6}.png` |
| **Inimigo (cultista)** | `ruined-temple-top-down-location-pixel-art/PNG/Cultist{1..6}_{Idle,Walk,Pray}.png` |
| **Mini-boss (Lich)** | `skeleton-top-down-pixel-art/PNG/Objects_separately/Lich_shadow{1,2,3}.png` (256×256) |
| **Chefe (Vampiro)** | `vampire-4-direction-pixel-character-sprite-pack/PNG/Vampires{1,2,3}/With_shadow/Vampires*_{Idle,Walk,Run,Attack,Death,Hurt}_with_shadow.png` |
| Fantasma / líder | `ruined-temple-top-down-location-pixel-art/PNG/Ghost.png`, `Leader_*.png` |

### 3.4 Itens, Armas e Passivos
| Elemento | Pacote / Arquivo |
| :--- | :--- |
| Ícones de itens (32×32) | `40-loot-icons-pixel-art/1 Icons/Icons_01..40.png` |
| Ícones com fundo | `40-loot-icons-pixel-art/2 Icons with back/Icons_01..40.png` |
| Nomes dos 40 ícones | `40-loot-icons-pixel-art/Icons_name.txt` |
| Ícones de arcos/bestas (32×32) | `bow-and-crossbow-pixel-art-icons/PNG/Transperent/Icon1..48.png` (e `Background/` para versão com fundo) |

> **Lista completa dos 40 ícones** (ordem de `Icons_name.txt`): pile of coins, Overgrown Crate, Emerald, Ruins, Torn Flag, Bump, Emerald Key, Night Mushroom, Ax, Bottle, Feather, Cheese, Raven Amulet, Pile of stones, Jasper, Spirit Orb, Tail, Boar skin, Meat, Burdyuk, Chitin Shield, Orb of Blood, Guard Sword, Ham, Cloth, Amulet, Map, Envelope, Letter, Test tube, Bomb, Axis, Mechanism, Wrench, Bottle of liquor, Pyrope, Boar Tusk, Sausage, Boar's Ring, Horned Helm.
>
> **Ícones de arco/besta**: 48 designs (Icon1..48) de arcos, bestas e flechas, nas versões `Transperent` (sem fundo) e `Background` (com fundo), e variantes `_no_effect` (sem glow/efeito).

> Sugestão de mapeamento (itens ↔ ícones), conforme a spec `TASK_001.md`:
> - **Armas**: Espada→`Guard Sword`(23), Machado→`Ax`(09), Arco→`bow Icon`, Besta→`bow Icon`, Água Benta→`Bottle`(10).
> - **Passivos**: Amuleto→`Amulet`(26), Joia Carmesim→`Pyrope`(36), Engrenagem→`Mechanism`(33), Pena→`Feather`(11), Carne→`Meat`(19), Cogumelo Noturno→`Night Mushroom`(08), Orbe Espiritual→`Spirit Orb`(16), Anel do Javali→`Boar's Ring`(39).
> - **XP/essência**: `Spirit Orb`(16) / `Orb of Blood`(22); **baú**: `Overgrown Crate`(02); **escudo**: `Chitin Shield`(21).

### 3.5 UI / HUD
| Elemento | Pacote / Arquivo |
| :--- | :--- |
| Botões | `ui-for-rpg/PNG/Buttons.png` |
| Ícones de UI | `ui-for-rpg/PNG/Icons.png` |
| Números / HP / dano | `ui-for-rpg/PNG/Numbers.png`, `Numbers_levels.png` |
| Painel de personagem | `ui-for-rpg/PNG/character_panel.png` |
| Painel de ação / inventário | `ui-for-rpg/PNG/Action_panel.png`, `Inventory.png` |
| Menu circular (roleta do baú!) | `ui-for-rpg/PNG/Circle_menu.png` |
| Menu principal / níveis | `ui-for-rpg/PNG/Main_menu.png`, `Levels.png` |
| Tela win/loose (game over) | `ui-for-rpg/PNG/Win_loose.png` |

---

## 4. Padrão de Coerência Visual

1. **Grid 16×16**: renderize o cenário sobre tiles de 16px, com um único fator `SCALE` global aplicado a todos os sprites.
2. **Direção dos personagens**: os packs de personagem são **4-direcionais** (frente/trás/esq/dir). Como o jogo tem movimento em 8 direções, selecione a direção pelo quadrante do ângulo de movimento. Os skeletons (`Animation*.png`) são **rotacionais** — use-os como estão ou normalize para 4 direções.
3. **Sombra**: escolha **uma** variante (`With_shadow` ou `Without_shadow`; e `shadow1/2/3` = apenas direção da sombra). Recomendo `With_shadow` + `shadow1` para tudo.
4. **Escala relativa (em px nativos)**:
   - Jogador/inimigo comum: ~32–64 px (frames dos personagens).
   - Mini-boss (Lich): 256 px.
   - Chefe (Vampiro): frame ~64 px, mas renderizado com `SCALE` maior para imponência.
   - Props: 16–256 px conforme pacote; ruínas de `top-down-ruins` são 112 px (reescalar se necessário).
5. **Paleta**: os pacotes compartilham estética pixel art top-down; prefira os cenários de **templo/ruínas/masmorra** (marrom/cinza/escuro) para o tema gótico, e reserve cores vivas para efeitos (glow, partículas) e itens.
6. **UI**: use `ui-for-rpg` para painéis/menus e `40-loot-icons` para ícones de itens/passivos/armas, mantendo 32×32 nos popups de escolha.

---

## 5. Referência de Integração

Ao implementar, sirva os assets via rota estática do `server.js` (como os demais jogos fazem com seus `assets/`), ex.: `app.use('/vampire/assets', express.static(path.join(__dirname, 'assets')))`, ou copie apenas os arquivos usados para `vampire/assets/`.

> Consulte a spec técnica em `TASKS/TASK_001.md` (seções 8 — Design Visual, 9 — Áudio e 5.6 — Colisão/Performance) junto com este guia.
