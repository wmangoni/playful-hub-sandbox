# Inventário do Livro dos Monstros 3.5 (Devir) — Resumo da Fase 1

**Total de entradas no inventário:** 593

## 1. Totais por Status

| Status | Quantidade | Descrição |
|---|---|---|
| `novo` | 277 | Monstros novos que entrarão no catálogo na Fase 2 |
| `variante-de:<id>` | 268 | Variantes com estatísticas próprias vinculadas a monstro-base (dragões por idade, elementais por tamanho etc.) |
| `ja-existe` | 20 | Monstros presentes em `data/catalogo-combate.json` (migrados pelo outro subagente) |
| `product-identity` | 19 | Criaturas protegidas por Product Identity da Wizards (excluídas do catálogo público) |
| `modelo` | 9 | Regras de modelos (apenas criaturas de exemplo entram como stat block) |
| **Total** | **593** | |

## 2. Totais por Tipo de Criatura

| Tipo | Quantidade |
|---|---|
| Dragão | 125 |
| Extra-Planar | 97 |
| Animal | 79 |
| Besta Mágica | 59 |
| Humanoide | 38 |
| Verme | 36 |
| Aberração | 32 |
| Morto-Vivo | 31 |
| Elemental | 28 |
| Humanoide Monstruoso | 18 |
| Constructo | 17 |
| Gigante | 15 |
| Planta | 7 |
| Fada | 6 |
| Limo | 5 |

## 3. Distribuição por Nível de Desafio (ND)

| ND | Quantidade |
|---|---|
| 1/10 (0.1) | 2 |
| 1/8 (0.125) | 2 |
| 1/6 (0.167) | 4 |
| 1/4 (0.25) | 7 |
| 1/3 (0.333) | 10 |
| 1/2 (0.5) | 34 |
| 1 | 40 |
| 2 | 47 |
| 3 | 66 |
| 4 | 41 |
| 5 | 45 |
| 6 | 25 |
| 7 | 52 |
| 8 | 29 |
| 9 | 30 |
| 10 | 17 |
| 11 | 20 |
| 12 | 13 |
| 13 | 13 |
| 14 | 9 |
| 15 | 7 |
| 16 | 9 |
| 17 | 8 |
| 18 | 7 |
| 19 | 8 |
| 20 | 9 |
| 21 | 8 |
| 22 | 5 |
| 23 | 7 |
| 24 | 4 |
| 25 | 3 |
| 26 | 2 |
| 27 | 1 |
| — (Modelo) | 9 |

## 4. Lista de Exclusões: Product Identity da Wizards

Estas criaturas possuem blocos de estatísticas no Livro dos Monstros 3.5 da Devir, mas são propriedade intelectual reservada da Wizards of the Coast e **não** entram no catálogo público do simulador.

| ID | Nome (PT Devir) | Nome Original (EN) | Página | ND | Tipo |
|---|---|---|---|---|---|
| `beholder` | Beholder | Beholder | 32 | 13 | Aberração |
| `gauth` | Gauth | Gauth | 33 | 7 | Aberração |
| `devorador-de-mentes` | Devorador de Mentes | Mind Flayer | 62 | 8 | Aberração |
| `devorador-de-mentes-feiticeiro` | Devorador de Mentes Feiticeiro | Mind Flayer Sorcerer | 63 | 17 | Aberração |
| `githyanki` | Githyanki | Githyanki | 143 | 1 | Humanoide |
| `githzerai` | Githzerai | Githzerai | 144 | 1 | Humanoide |
| `kuo-toa` | Kuo-Toa | Kuo-Toa | 169 | 2 | Humanoide Monstruoso |
| `pantera-deslocadora` | Pantera Deslocadora | Displacer Beast | 214 | 4 | Besta Mágica |
| `pantera-deslocadora-lider-da-matilha` | Pantera Deslocadora Líder da Matilha | Displacer Beast Pack Lord | 215 | 12 | Besta Mágica |
| `slaad-azul` | Slaad Azul | Blue Slaad | 231 | 8 | Extra-Planar |
| `slaad-cinza` | Slaad Cinza | Gray Slaad | 232 | 10 | Extra-Planar |
| `slaad-da-morte` | Slaad da Morte | Death Slaad | 232 | 13 | Extra-Planar |
| `slaad-verde` | Slaad Verde | Green Slaad | 233 | 9 | Extra-Planar |
| `slaad-vermelho` | Slaad Vermelho | Red Slaad | 234 | 7 | Extra-Planar |
| `umber-hulk` | Umber Hulk | Umber Hulk | 251 | 7 | Aberração |
| `verme-da-carnica` | Verme da Carniça | Carrion Crawler | 252 | 4 | Aberração |
| `yuan-ti-abominacao` | Yuan-Ti Abominação | Yuan-Ti Abomination | 263 | 7 | Humanoide Monstruoso |
| `yuan-ti-mestico` | Yuan-Ti Mestiço | Yuan-Ti Halfblood | 264 | 5 | Humanoide Monstruoso |
| `yuan-ti-puro-sangue` | Yuan-Ti Puro Sangue | Yuan-Ti Pureblood | 265 | 3 | Humanoide Monstruoso |

## 5. Lista de Modelos (Templates)

Apenas as criaturas de exemplo com bloco de estatísticas completo são importadas. O modelo em si é marcado como `modelo`.

| ID | Nome | Nome Original | Página | Observação |
|---|---|---|---|---|
| `modelo-esqueleto` | Esqueleto (Modelo) | Skeleton Template | 116 | Modelo; o livro imprime exemplos de Guerreiro Humano e Quimera. |
| `modelo-fantasma` | Fantasma (Modelo) | Ghost (Template) | 124 | Modelo; o livro imprime o exemplo Fantasma (Humano Guerreiro de 5º nível). |
| `modelo-licantropo` | Licantropo (Modelo) | Lycanthrope Template | 173 | Modelo; o livro imprime 7 exemplos completos com estatísticas. |
| `modelo-lich` | Lich (Modelo) | Lich Template | 182 | Modelo; o livro imprime o exemplo Lich (Humano Mago de 11º nível). |
| `modelo-meio-abissal` | Meio-Abissal (Modelo) | Half-Fiend Template | 193 | Modelo; o livro imprime o exemplo Humano Clérigo de 7º nível. |
| `modelo-meio-celestial` | Meio-Celestial (Modelo) | Half-Celestial Template | 194 | Modelo; o livro imprime o exemplo Humano Paladino de 5º nível. |
| `modelo-meio-dragao` | Meio-Dragão (Modelo) | Half-Dragon Template | 196 | Modelo; o livro imprime o exemplo Meio-Dragão Negro / Guerreiro Humano. |
| `modelo-vampiro` | Vampiro (Modelo) | Vampire Template | 249 | Modelo; o livro imprime o exemplo Vampiro (Humano Guerreiro de 5º nível). |
| `modelo-zumbi` | Zumbi (Modelo) | Zombie Template | 265 | Modelo; o livro imprime exemplos de Humano Comum e Minotauro. |

## 6. Monstros Existentes em `catalogo-combate.json` (`ja-existe`)

| ID | Nome (PT Devir) | Nome Original (EN) | ND Atual |
|---|---|---|---|
| `carnical` | Carniçal | Ghoul | 1 |
| `ogro` | Ogro | Ogre | 2 |
| `cubo-gelatinoso` | Cubo Gelatinoso | Gelatinous Cube | 3 |
| `urso-coruja` | Urso-Coruja | Owlbear | 4 |
| `troll` | Troll | Troll | 5 |
| `arbusto-errante` | Arbusto Errante | Shambling Mound | 6 |
| `medusa` | Medusa | Medusa | 7 |
| `behir` | Behir | Behir | 8 |
| `gigante-do-gelo` | Gigante do Gelo | Frost Giant | 9 |
| `naga-guardia` | Naga Guardiã | Guardian Naga | 10 |
| `elemental-do-fogo-anciao` | Elemental do Fogo, Ancião | Fire Elemental, Elder | 11 |
| `verme-purpura` | Verme Púrpura | Purple Worm | 12 |
| `glabrezu` | Glabrezu | Glabrezu | 13 |
| `golem-de-ferro` | Golem de Ferro | Iron Golem | 13 |
| `dragao-vermelho-adulto` | Dragão Vermelho Adulto | Adult Red Dragon | 15 |
| `dragao-azul-antigo` | Dragão Azul Antigo | Very Old Blue Dragon | 18 |
| `balor` | Balor | Balor | 20 |
| `lorde-das-profundezas` | Lorde das Profundezas | Pit Fiend | 20 |
| `tarrasque` | Tarrasque | Tarrasque | 20 |
| `dragao-de-prata-antigo` | Dragão de Prata Antigo | Very Old Silver Dragon | 21 |
