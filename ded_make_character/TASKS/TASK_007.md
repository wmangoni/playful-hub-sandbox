# ⚔️ Tarefa 007 - D&D Make Character: Retribuição do Paladino de Arton e formas alternativas

**Status**: 🚀 Dev Complete — Retribuição no motor e ND acima de 20; as formas alternativas vieram do livro oficial (TASK_008)
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-retribuicao`
**Depende de**: TASK_006 (motor de combate e catálogo)

---

## 🔍 1. Pedido do usuário (01/10/2026)

> O sistema de combate não está levando em conta o poder de Retribuição do Paladino. Além disso, quero adicionar ao catálogo as formas alternativas do Paladino de Arton (Desperto, Matador de Dragões, Completo, Avançado e Extremo).

Texto da Retribuição (ficha do "Paladino de Arton das lendas", Wiki Tormenta):

> **Retribuição (Sob):** ao causar dano ao Paladino (ou seja, vencendo suas imunidades, sua resistência a dano e efetivamente reduzindo seus Pontos de Vida), o oponente precisa obter sucesso em um teste de Fortitude (CD 15 + dano causado) ou morrerá. Este é um efeito de morte. Mesmo sendo bem-sucedido no teste, o atacante sofre o mesmo dano provocado no Paladino. O dano da Retribuição é do tipo divino, independente do tipo original do dano (fogo, sônico, profano...).

## 🎯 2. Decisões

| Tema | Decisão |
|---|---|
| **Fonte das formas** | As fichas estão no livro *Tormenta D20 – Holy Avenger*. Primeiro, sem o livro, a decisão do usuário foi basear nas HQs; depois o usuário conseguiu o livro, e as formas são as fichas oficiais (TASK_008). |
| **ND acima de 20** | Decisão do usuário: os personagens de Holy Avenger podem passar do ND 20 (no livro, o Paladino vai do ND 20 ao 55). Os monstros continuam de ND 1 a 20. O Paladino das lendas volta à ficha oficial (Paladino 20, ND 22). |
| **Nível das formas** | A regra do usuário para a adaptação ("nível 16 + quantidade de rubis", gigantes inventados depois dos 36 níveis) deixou de valer com o livro: lá o Desperto é Paladino 4 e o Matador de Dragões, Paladino 9, com os DV extraplanares dos rubis. |

## ⚙️ 3. Retribuição no motor (pronta)

- **Efeito novo `retribuicao`** no vocabulário do catálogo (33 efeitos): `{ "efeito": "retribuicao", "cd_base": 15, "tipo_energia": "divino" }`. O Paladino de Arton deixou de tê-la como `outro` (não simulado).
- **Gatilho:** `causarDano` chama `SP.onDamaged` quando o dano efetivamente tirou PV do dono, ou seja, depois de imunidade, RD, resistência a energia e PV temporários. Vale para qualquer oponente e qualquer fonte de dano (golpe, sopro, magia, aura, fogo que continua), golpe a golpe. O próprio dono e os aliados não disparam.
- **Teste:** Fortitude CD `cd_base` + o dano que tirou PV.
  - Falhou: morte (efeito de morte). O Tarrasque, que regenera mesmo morto, só cai (LM 3.0), e sofre o dano como quem passou ("mesmo sendo bem-sucedido…, sofre o mesmo dano").
  - Passou: sofre o mesmo dano, como dano divino.
  - Constructo e morto-vivo (imunes a efeitos de Fortitude) e quem é imune a efeitos de morte não testam, mas sofrem o dano.
  - O golem de ferro, imune a efeitos sobrenaturais, não sofre nada.
- **Sem vaivém:** o dano da retribuição não dispara outra retribuição. Dois Paladinos não se matam numa cadeia infinita.
- **"Bom coração":** criaturas bondosas não são atingidas (`afeta: { exceto_moral: ["B"] }`). O livro diz, nas p. 111 e 118, que a Retribuição não funciona contra Beluhga nem contra Lisandra. Acrescentado na revisão da TASK_008; o registro diz "não atinge … (criatura bondosa)".
- **Atacante morto no meio do ataque:** o efeito do mesmo golpe (veneno, vorpal, paralisia, queimar) ainda vale, simultâneo. O que viria depois não acontece: os golpes seguintes, o agarrar que o golpe iniciaria, o rasgar do troll.
- **IA:** os oponentes não evitam atacar o Paladino (a IA não conhece a Retribuição).
- **Catálogo:** versão 4 (a 5 levou o ND acima de 20; a 6 é a do livro, TASK_008).
- **Efeito nas lutas** (200 lutas cada, semente 3), em vitórias do Paladino, com a Retribuição × sem ela:

  | Oponente | Com Retribuição | Sem |
  |---|---|---|
  | Tarrasque | 88% | 0% |
  | Dragão de prata antigo (LB: não é atingido) | 19% | 19% |
  | Mestre Arsenal (ND 26) | 91% | 23% |
  | Nekapeth (ND 25) | 94% | 41% |
  | Balor | 88% | 76% |
  | Golem de ferro | 89% | 89% |

  Medido com as fichas do livro (TASK_008): Paladino 20 com PV 164, Arsenal e Nekapeth inteiros, e a exceção das criaturas bondosas. Com a ficha cortada da TASK_006 (Paladino 19) e sem a exceção eram 90%, 53%, 98% (Arsenal ND 20), 87% e 88%.

- **Validação:** `tests/ded_make_character_combate.test.js`, 3 testes novos (50 no total):
  - falhar mata e passar devolve o dano divino;
  - imunidade (frio) e PV temporários não disparam;
  - o fogo de uma área dispara;
  - morto-vivo, golem, Tarrasque, dois Paladinos e aliado;
  - o atacante morto no meio do ataque total não rasga nem agarra depois (o troll).

  As 2.312 lutas do catálogo de então rodam sem erro (10.952 com o catálogo da TASK_008).

## 🗺️ 4. Formas alternativas (do livro, na TASK_008)

- **O que existe:** a Wiki Tormenta lista as formas e remete ao livro *Tormenta D20 – Holy Avenger*, que tem uma ficha para cada transformação:

  | Forma | Rubis | Partes da HQ | No livro |
  |---|---|---|---|
  | Desperto | 4 rubis (um quinto do poder) | 9 a 33 | Paladino 4, ND 20 |
  | Matador de Dragões | 9 rubis | 33 a 36 | Paladino 9, ND 25 |
  | Completo | poder restaurado | 36 | Paladino 20, ND 36 |
  | Avançado | — | 37, "Paladino Caído" | Paladino 20, Imenso, ND 40 |
  | Extremo | — | 38 a 40 | Paladino 20, Colossal, ND 55 |

- **Histórico:**
  - Sem o livro, a primeira versão desta tarefa adaptou as formas pela regra do usuário (nível 16 + rubis; gigantes depois dos 36 níveis).
  - Antes de qualquer commit, o usuário conseguiu o livro, e as fichas oficiais substituíram a adaptação. Detalhes na TASK_008.
- **O que ficou desta tarefa:**
  - **Validador:** Holy Avenger pode passar do ND 20, e a soma das classes não pode passar do nível, porque DV raciais contam no nível sem ser classe. A TASK_008 subiu o teto para 80 e aceitou ND fracionário.
  - **Arena:** o seletor ganhou a faixa "ND 21 ou mais", e "Todos os ND" não tem teto.
- **Paladino contra Paladino:**
  - As formas do livro são Leais e Neutras; o Paladino das lendas é Leal e Bondoso. Por isso a Retribuição das formas não o atinge, e a dele as atinge: ele vence de 96% a 100% contra elas (100 lutas, semente 3).
  - Entre as formas, a Retribuição vale dos dois lados, e quem fere primeiro costuma morrer, porque a CD sobe com o dano.
    - O Extremo, que bate mais forte, vence só de 1% a 22% contra as outras formas, embora vença de 97% a 100% contra o Tarrasque, os dragões e o balor.
    - Entre as formas Médias, fica perto de 50%.
  - É a regra como está escrita. A IA não conhece a Retribuição (§3).
