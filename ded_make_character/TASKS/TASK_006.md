# ⚔️ Tarefa 006 - D&D Make Character: Simulador de combate (Arena) + catálogo de monstros e de Holy Avenger

**Status**: 🚀 Dev Complete — E1 a E8 prontos (catálogo, motor, personagens do jogador, tela da Arena, simulação em lote, magias e equipamento na ficha)
**Responsável**: Claude (TL)
**Branch**: `feat/ded-simulador-combate` (E1 a E6, PR #50, já no main) e `feat/ded-magias` (E7 e E8, PR #52)
**Depende de**: TASK_003 (motor de regras `dnd30.js`), TASK_004 (talentos e perícias escolhidos)

---

## 🔍 1. Pedido do usuário (28/09/2026)

> Planejar o simulador de combate. O jogador deve poder escolher 2 personagens seus para simular um combate, ou escolher um personagem para lutar com alguns monstros já disponíveis na base. Pesquisar monstros clássicos do Livro dos Monstros 3.0 e criar um .json como base de dados, com um de cada nível até chegar no terrível Tarrasque, no nível 20. No mesmo .json, uma seção com os personagens dos quadrinhos Holy Avenger, para podermos selecioná-los para lutar. O jogador não é obrigado a usar um personagem que ele mesmo fez: pode pôr para lutar qualquer personagem ou monstro do catálogo.

## 🎯 2. Decisões

| Tema | Decisão |
|---|---|
| **Quem luta** | <ul><li>Dois lados, **A** e **B**, cada um com 1 ou mais combatentes. Qualquer combinação vale: personagem × personagem, personagem × monstros, monstro × monstro, Holy Avenger × qualquer um.</li><li>Três origens: **Meus personagens** (tabela `personagens`), **Monstros** e **Holy Avenger** (catálogo).</li><li>O mesmo monstro pode entrar várias vezes ("3 × Ogro").</li></ul> |
| **Posição** | **Distância abstrata** (decisão do usuário), sem tabuleiro. Os lados começam a uma distância configurável e se aproximam pelo deslocamento. Alcance e ataque à distância contam. Sem flanco nem ataque de oportunidade no primeiro corte. |
| **Magias dos seus personagens** | **Lista curada** (decisão do usuário): umas 20 magias de combate do Livro do Jogador 3.0. O sistema as escolhe pelo nível e pelos espaços de magia, e o jogador pode trocar antes da luta. Monstros e Holy Avenger usam as magias do catálogo. |
| **Equipamento** | **Na arena e na ficha** (decisão do usuário). Kit padrão por classe, editável na arena, com armas, armaduras e escudos do Livro do Jogador 3.0. Fica salvo com o personagem (`fichas.equipamento`) e preenche os blocos de arma e armadura da ficha. |
| **Catálogo** | Um arquivo só, **`data/catalogo-combate.json`**, somente leitura, com as seções `monstros` (20 monstros, um por ND de 1 a 20, terminando no Tarrasque) e `holy_avenger`. Não vira tabela editável no primeiro corte. |
| **Regras** | D&D **3.0**, pelo SRD 3.0 (http://www.dragon.ee/30srd/), como no resto do app. Onde a 3.5 difere (RD `15/+5` × `15/epic`, blocos de monstro), vale a 3.0. |
| **Aleatoriedade** | Dados com **semente**: a mesma semente repete a mesma luta, o que torna os testes determinísticos e deixa o jogador reproduzir um resultado. |

## 📚 3. Catálogo de combate (`data/catalogo-combate.json`)

- **Formato**: documentado em `tools/catalogo-combate.md`.
  - Cada combatente traz identificação, ND e nível, tipo, tamanho, tendência, PV, iniciativa, deslocamento, espaço e alcance, e CA (total, toque e surpresa).
  - Traz também BBA e agarrar, ataque único e ataque total (bônus, dano, crítico, tipo de dano e se é natural ou secundário).
  - Os especiais usam um vocabulário fechado de 33 mecânicas (32 na E1, mais a Retribuição na TASK_007) (tabela em `tools/catalogo-combate.md`). Ele vai de sopro, agarrar, engolir e veneno a condição ao acertar, magia e aura, e inclui os poderes de classe que o motor também usa nos personagens do jogador (ataque furtivo, evasão, fúria, destruir…). `outro` marca o que não é simulado.
  - Restrições por tendência dizem o eixo (`etico` L/N/C, `moral` B/N/M), para uma criatura NB não ser confundida com "N".
  - Completam o bloco: RD, RM, resistências a energia, imunidades, regeneração e cura acelerada, resistências, atributos, perícias, talentos, equipamento e magias.
  - Por fim, a tática (para a IA), a fonte e o que foi adaptado.
- **Monstros**: 20 monstros do SRD 3.0, um para cada ND de 1 a 20, com o Tarrasque no 20. Pesquisados por subagente (ver §3.1).
- **Holy Avenger**: personagens da HQ (Cassaro e Awano), montados em regras 3.0 com nível, classes e equipamento, e com o que é oficial separado do que foi adaptado. Pesquisados por subagente (ver §3.2).
- **Direitos**: os números de estatística são mecânica (os monstros vêm do SRD, *Open Game Content*). Resumos, descrições e táticas são textos próprios, sem copiar do livro, do SRD ou da wiki.
- **Validação**:
  - `tools/validar-catalogo.js` confere o que o formato marca com ✔. Isso inclui listas fechadas, campos obrigatórios e opcionais de cada efeito, gatilhos que apontam para ataques, agarrar e CD calculados e talentos do compêndio. Roda na linha de comando e é usado pelo teste.
  - A tabela de efeitos do formato é gerada a partir do próprio validador, para os dois não divergirem.
  - `tests/ded_make_character_catalogo.test.js` confere, além do formato: os ND de 1 a 20 sem repetição, o Tarrasque no 20 com os números do SRD 3.0, a RD no formato 3.0 e os ids únicos entre as seções.
  - O teste também planta erros de propósito, para garantir que o validador os pega.
- **Ataque total**: `ataque_total` é a sequência corpo a corpo. `ataque_total_distancia` guarda a sequência à distância quando existe: arco da Medusa, rochas do Gigante do Gelo, dardos do Nekapeth.

### 3.1 Monstros (ND 1–20)

Os números de combate foram conferidos um a um contra o bloco do SRD 3.0 no dragon.ee (`fonte.url` de cada monstro). 16 deles também foram comparados com uma segunda cópia do SRD 3.0 (dandwiki "3e SRD"); onde as duas divergem, vale o dragon.ee e a divergência fica registrada em `adaptacao`. Nenhum monstro é *Product Identity* fora do SRD, como devorador de mentes ou beholder.

| ND | Monstro | Tipo | Tamanho | PV | CA |
|---|---|---|---|---|---|
| 1 | Carniçal (Ghoul) | Morto-Vivo | Médio | 13 | 14 |
| 2 | Ogro (Ogre) | Gigante | Grande | 26 | 16 |
| 3 | Cubo Gelatinoso (Gelatinous Cube) | Limo | Enorme | 58 | 3 |
| 4 | Urso-Coruja (Owlbear) | Besta | Grande | 47 | 15 |
| 5 | Troll (Troll) | Gigante | Grande | 63 | 18 |
| 6 | Arbusto Errante (Shambling Mound) | Planta | Grande | 60 | 20 |
| 7 | Medusa (Medusa) | Humanoide Monstruoso | Médio | 33 | 15 |
| 8 | Behir (Behir) | Besta Mágica | Enorme | 94 | 16 |
| 9 | Gigante do Gelo (Frost Giant) | Gigante | Grande | 133 | 21 |
| 10 | Naga Guardiã (Guardian Naga) | Aberração | Grande | 93 | 18 |
| 11 | Elemental do Fogo Ancião (Elder Fire Elemental) | Elemental | Enorme | 204 | 25 |
| 12 | Verme Púrpura (Purple Worm) | Besta | Imenso | 200 | 19 |
| 13 | Golem de Ferro (Iron Golem) | Constructo | Grande | 99 | 30 |
| 14 | Dragão Vermelho Adulto (Adult Red Dragon) | Dragão | Enorme | 253 | 29 |
| 15 | Glabrezu (Glabrezu) | Extra-Planar | Enorme | 85 | 27 |
| 16 | Lorde das Profundezas (Pit Fiend) | Extra-Planar | Grande | 123 | 30 |
| 17 | Dragão Azul Antigo (Old Blue Dragon) | Dragão | Enorme | 337 | 34 |
| 18 | Balor (Balor) | Extra-Planar | Grande | 110 | 30 |
| 19 | Dragão de Prata Antigo (Old Silver Dragon) | Dragão | Enorme | 350 | 35 |
| 20 | **Tarrasque** (Tarrasque) | Besta Mágica | Colossal | 840 | 35 |

**Tarrasque (3.0):**
- 48d10+576 (840 PV), CA 35 (toque 5, surpresa 32);
- RD 25/+5, RM 32, regeneração 40;
- ataque total: mordida +57 (4d8+17), dois chifres, duas garras e cauda +52, todos com crítico 18–20/×3;
- especiais: agarrar aprimorado; engolir (até Enorme, 2d8+8 mais 2d8+6 de ácido, CA interna 20, 50 de dano para sair); carapaça; arrancada; presença aterradora (CD 26).
- Na 3.5 ele tem 858 PV; o catálogo usa o valor da 3.0.

**Observações para a implementação:**
- **Campos calculados.** O bloco 3.0 não imprime CA de toque e de surpresa, agarrar, espaço e alcance em metros. Foram calculados e registrados em `adaptacao`.
- **Presença aterradora do Tarrasque.** Não tem raio no SRD 3.0 (`raio_m: null`); o simulador aplica o efeito a todos os inimigos na luta.
- **Dragões:**
  - o SRD diz apenas "Feats: Any N", então `talentos` fica vazio, e os números do bloco não incluem talentos;
  - as listas de magias foram escolhidas dentro dos espaços de feiticeiro;
  - Esmagar entrou nos três dragões (contra Pequeno ou menor, como o Tork). O dano soma 1,5 × For, como a regra geral do SRD 3.0 e os blocos de dragão Imenso do dragon.ee. Os blocos Enormes imprimem só "2d8".
- **Mecânicas dos especiais**, contadas no catálogo:

  | Seção | Com efeito do vocabulário (simulados) | `mecanica: null` | `outro` (não simulado) |
  |---|---|---|---|
  | Monstros | 59 | 58 | 5 |
  | Holy Avenger | 33 | 24 | 20 |

  - `null` são sentidos, traços de tipo, invocações e efeitos fora do tempo de combate, além das regenerações, que já estão no campo `regeneracao`.
  - Os 5 `outro` dos monstros são resistência à expulsão (carniçal), transparência (cubo), absorver eletricidade (arbusto), apanhar rochas (gigante) e arrancada (Tarrasque).
  - Os 20 de Holy Avenger são forma selvagem, expulsar ou fascinar mortos-vivos, teletransporte, disfarces, poderes do martelo do Arsenal, inimigo predileto, entre outros. A retribuição do Paladino deixou de ser `outro` na TASK_007.
  - Todos ficam de fora do motor de propósito e aparecem no log como "não simulado".
  - Com as 54 fichas do livro *Tormenta D20 – Holy Avenger* (TASK_008), Holy Avenger passa a 93 / 141 / 79.
- **Nomes em PT-BR.** São os usados pela Devir 3.5 e por fontes em português, porque não foi possível confirmar a tradução 3.0. Os nomes de talentos, perícias e magias dos blocos são traduções usuais.

### 3.2 Holy Avenger

São 14 personagens da HQ. Os fatos (nome, raça, papel, equipamento icônico e poderes) vêm das wikis de Tormenta (`fonte.url`). Os números estão em regras 3.0.

> **Substituído na TASK_008:** as fichas abaixo eram adaptações. Agora o catálogo usa as fichas oficiais do livro *Tormenta D20 – Holy Avenger*, com 54 entradas (uma por versão de cada personagem). A tabela fica como registro do primeiro corte.

| Personagem | Papel | Raça | Classes (ND) | PV | CA | Estatísticas |
|---|---|---|---|---|---|---|
| Odara | aliada | Centaura | 4 DV + Druida 2 (6) | 51 | 18 | adaptadas (Druida 2 da wiki) |
| Sandro Galtran | herói | Humano | Guerreiro 7 (7) | 53 | 17 | adaptadas |
| Lisandra | heroína | Humana com dons de meio-dríade | Druida 6/Guerreira 1 (7) | 46 | 19 | adaptadas |
| Niele (Nielendorane) | heroína | Elfa | Barda 7 (7) | 30 | 17 | adaptadas |
| Capitão James K. | aliado | Humano | Guerreiro 4/Ladino 4 (8) | 52 | 20 | adaptadas |
| Tork | herói | Troglodita (Pequeno) | 2 DV + Bárbaro 1/Guerreiro 6 (9) | 92 | 24 | adaptadas (classes do especial *Trog!*) |
| Luigi Sortudo | aliado | Meio-elfo | Bardo 9 (9) | 67 | 18 | **oficial** (ficha d20 na wiki) |
| Leon Galtran | aliado | Humano | Ladino 10 (10) | 52 | 20 | adaptadas |
| Vladislav Tpish | aliado | Humano | Mago necromante 10 (10) | 41 | 17 | adaptadas (nível da wiki) |
| Deenar Dhanariatis | vilão | Elfo-do-mar | Ranger 6/Mago 5 (11) | 66 | 17 | adaptadas (classes do *Trog!*) |
| Camaleão (Lucas Moldvay) | vilão | Meio-elfo | Ladino 9/Mago 5 (14) | 66 | 20 | adaptadas |
| Paladino de Arton | aliado, corrompido no fim | Humano meio-celestial | Paladino 19 (20) | 175 | 25 | **oficial**, reduzida ao teto de ND 20 (a ficha inteira, PV 164, voltou na TASK_008) |
| Mestre Arsenal | vilão | Humano | Guerreiro 10/Clérigo 10 (20) | 240 | 24 | **oficial**, reduzida ao teto de ND 20 |
| Nekapeth | vilão | Homem-serpente | 8 DV + Clérigo 12 (20) | 183 | 23 | adaptadas (níveis da wiki) |

**Como foram montados:**
- **Fichas oficiais.**
  - Existem fichas d20 transcritas na wiki para o Paladino (Paladino 20, ND 22), o Arsenal (Guerreiro 10/Clérigo 12, ND 26) e o Luigi.
  - Elas já usam termos 3.0, então não houve conversão da 3.5.
  - O Paladino e o Arsenal perderam níveis para caber no teto de ND 20, e os números foram recalculados. Na TASK_007 o teto caiu para Holy Avenger, e na TASK_008 os dois voltaram às fichas inteiras (ND 22 e 26).
  - Erros aritméticos das fichas oficiais foram corrigidos e registrados em `adaptacao`: iniciativa sem Iniciativa Aprimorada, Ouvir, ataque e CA do Arsenal.
- **Suplemento *Holy Avenger d20* (Talismã).** Existe, mas não foi consultado, porque só havia cópias piratas. Na TASK_008 o usuário forneceu a cópia dele, e o catálogo passou a usar as fichas, que o livro declara Open Game Content.
- **Adaptados:**
  - raça do Livro do Jogador ou do SRD 3.0 (troglodita, centauro, elfo aquático, abominação yuan-ti para o homem-serpente);
  - classes 3.0;
  - atributos pela matriz padrão com os aumentos por nível;
  - PV máximo no 1º nível e média nos demais;
  - equipamento icônico da HQ.
  - Os níveis dos protagonistas são os do meio da saga (7–9), e não os do começo da história.
- **Particularidades:**
  - O Olho de Sszzaas de Niele lança magias com dano máximo e tem 50% de chance de falhar, para refletir a instabilidade que a HQ mostra. Ela fica mais forte do que o ND 7 indica.
  - O Arsenal tem PV máximo em todos os dados (poder de sumo-sacerdote).
  - A CA não soma Esquiva: o motor aplica o +1 contra o alvo escolhido.
  - Os poderes de classe usam o vocabulário do motor (ataque furtivo, evasão, fúria, destruir, inspirar coragem, camuflagem, falha de magia, vorpal, cura pelas mãos). Assim, o mesmo código serve para os personagens do jogador.
  - O Nekapeth é adaptado da abominação yuan-ti do *Monster Manual* 3.0, que é *Product Identity* e não está no SRD. Só a mecânica foi usada como base.
  - A funda da Odara não soma Força (regra 3.0).
- **Ficaram de fora:**
  - deuses e deuses menores: Sszzaas, Keenn, Allihanna, Sckhar, Beluhga, Helena;
  - arquimagos acima do teto: Vectorius, Talude;
  - não combatentes: Petra Tpish, George Ruud;
  - personagens com pouca informação ou aparição rápida: Katabrok, Anne, Thwor, antagonistas de um número só.
- **Direitos.** Holy Avenger e Tormenta são obras protegidas. O catálogo usa só nomes e fatos. `resumo`, `descricao` e `tatica` foram reescritos e conferidos contra as wikis: não sobrou nenhuma sequência de 6 palavras igual.

## 🏟️ 4. Arena (tela nova)

Rota `#/arena`, no grupo "Aventura" do menu lateral, com o nome **"Arena"**. A partir da ficha e da lista de personagens, um atalho "Levar à arena" abre a tela com o personagem já no lado A.

- **Integração com o app**:
  - o router casa `/:module` com qualquer caminho, então a rota `arena` entra na lista **antes** das genéricas (`app.js`);
  - o menu lateral hoje só lista entidades (`NAV_GROUPS` × `ENTITIES` em `shell.js`) e ganha um item que não é entidade.
- **Dados**:
  - o catálogo é lido por `fetch('data/catalogo-combate.json')`, fora do store, porque não é tabela nem se edita;
  - os personagens vêm do store (`personagens`, `fichas`, `races`, `classes`, `bba`, `pericias`), como na ficha.

### 4.1 Montar a luta

- **Duas colunas, Lado A e Lado B**, cada uma com "Adicionar combatente".
- **Seletor** com três abas: Meus personagens, Monstros e Holy Avenger.
  - Busca sem acentos e filtro por ND/nível.
  - Cada item mostra nome, ND/nível, tipo ou classe, PV e CA.
- **Quantidade**: monstros e personagens do catálogo podem entrar mais de uma vez (Ogro ×3).
- **Seus personagens**:
  - equipamento (arma principal, arma secundária ou escudo, armadura), vindo do kit padrão ou do que ficou salvo;
  - magias do dia, para conjuradores (a lista curada, com os espaços calculados por `spellcasting()`);
  - aviso quando faltam dados para lutar: PV não cadastrados, classe de prestígio sem regras 3.0 etc.
- **Opções da luta**:
  - distância inicial (padrão 9 m);
  - semente (padrão aleatória, e pode ser copiada);
  - limite de rodadas (padrão 50; ao passar dele, empate).
- **Nível da luta**: o sistema compara o ND dos adversários com o nível do grupo e mostra uma dica de dificuldade (fácil, justa, difícil, mortal), só como orientação.

### 4.2 Durante a luta

- **Ordem de iniciativa** com barra de PV, CA, condições (abalado, agarrado, engolido, morrendo…) e quem está agindo.
- **Registro (log)** em português com as rolagens: "Ogro ataca Lisandra com a clava grande: 14 + 8 = 22 contra CA 18, acerta. Dano 2d6+7 = 13."
  - Mostra críticos (ameaça e confirmação), RD aplicada, resistências e efeitos especiais.
  - Habilidades não simuladas aparecem uma vez, marcadas como tal.
- **Controles**: Próxima ação, Próxima rodada, Até o fim, Recomeçar (mesma semente) e Nova semente.
- **Fim**: vence o lado que ainda tem combatentes em condição de lutar. O resumo mostra rodadas, dano causado e recebido por combatente, e quem caiu e em que rodada.

### 4.3 Simulação em lote

- "Simular 100 / 1.000 vezes" roda a mesma luta com sementes diferentes, sem desenhar o log.
- O resultado mostra:
  - % de vitórias de cada lado e de empates;
  - média de rodadas;
  - PV médio restante do vencedor;
  - quem mais caiu.
- Roda em fatias com `setTimeout` (o `requestIdleCallback` não existe no Safari), ou num Web Worker se precisar, sem travar a tela e com barra de progresso.

## ⚙️ 5. Motor de combate (`js/rules/combat30.js`, funções puras)

O motor não sabe nada da tela: recebe os combatentes e a semente e devolve os eventos. A tela só desenha esses eventos, e o lote só conta os resultados.

### 5.1 Combatente normalizado

- **Adaptador de catálogo**: traduz uma entrada do JSON para o formato interno.
- **Adaptador de personagem**:
  - parte de `computeSheet` (atributos, BBA e ataques iterativos, resistências, CA, iniciativa, RD e RM do monge, talentos escolhidos);
  - soma o equipamento: bônus de armadura e de escudo, limite de Des, penalidade, arma com dano por tamanho, crítico e bônus mágico;
  - soma os efeitos dos talentos (§5.6) e as habilidades de classe simuladas;
  - PV: os cadastrados. Sem PV cadastrado, usa a média por nível (máximo no 1º nível, média arredondada para cima nos demais, + Con) e avisa.
- Tudo o que o motor usa fica num objeto só: PV atuais e máximos, CA, ataques, especiais, defesas, condições, espaços de magia, posição e alvo.

### 5.2 Rodada e distância abstrata

- **Iniciativa**: d20 + bônus. O empate vai para o maior bônus e depois para a semente. Na primeira rodada, quem ainda não agiu está **surpreso** (CA de surpresa, sem Des).
- **Distância**:
  - cada lado começa a X metros do outro;
  - para atacar corpo a corpo, o combatente precisa chegar ao alcance do alvo (movimento = deslocamento, ou o dobro numa investida);
  - quem luta à distância ataca de onde está, com −2 por incremento além do primeiro, e prefere não se aproximar;
  - voo e natação só importam para saber quem alcança quem.
- **Ações por turno**:
  - já engajado: ataque total;
  - chegando: mover + ataque único, ou investida (+2 no ataque e −2 na CA até o próximo turno), ou bote (ataque total ao fim da investida);
  - conjurador: magia (ação padrão) + movimento;
  - especial com recarga (sopro), quando a IA decidir.

### 5.3 Ataque e dano (3.0)

- **Acerto**: d20 + bônus contra a CA do alvo (toque para ataque de toque). O 1 natural sempre erra e o 20 natural sempre acerta.
- **Crítico**: o d20 na margem de ameaça pede uma confirmação (novo ataque contra a mesma CA). Confirmado, os dados de dano e os bônus fixos são multiplicados. Dano extra em dados, como ataque furtivo e energia, não é multiplicado. Imunes a crítico (mortos-vivos, constructos, limos, plantas, elementais) não levam dano extra.
- **Dano**: mínimo 1.
  - Nos ataques do catálogo, o bônus e o dano já vêm prontos, incluindo o −5 e a ½ For dos ataques naturais secundários. O motor não aplica isso de novo.
  - Para personagens, o dano soma For ×1,5 em arma de duas mãos e ×0,5 na mão inábil. Arco e funda não somam For positiva (3.0), exceto o arco composto potente, que soma até o limite de For do arco. A For negativa sempre subtrai em qualquer arco e na funda.
- **Esquiva**: a CA do catálogo e da ficha não inclui Esquiva. O motor soma +1 contra o alvo que o combatente escolhe no seu turno (o alvo que ele ataca).
- **Ataque Poderoso**: a IA troca até o BBA de bônus de ataque por dano quando a CA do alvo é baixa em relação ao seu bônus.

### 5.4 Defesas

- **RD 3.0** (`special_abilities.htm` do SRD 3.0):
  - `15/+3` só é vencida por arma com bônus de melhoria +3 ou mais;
  - uma arma mais poderosa que o tipo exigido também vence: uma arma mágica +1 vence `x/prata`;
  - as armas naturais de uma criatura contam como do tipo que vence a RD dela mesma. Ex.: a mordida do Tarrasque (RD 25/+5) conta como +5 e vence a RD 30/+3 do Balor;
  - magias e dano de energia ignoram a RD;
  - `x/prata` é vencida por arma de prata. O personagem marca o material da arma no equipamento; "ferro frio" não existe na 3.0.
- **Resistência a energia** (3.0): é um valor **por rodada**. Absorve até N de dano daquela energia desde o início do turno da criatura até o início do turno seguinte, somando todos os ataques e magias. Ex.: 4 pancadas de fogo do Elemental contra o Balor (resistência a fogo 20) perdem só 20 no total. **Imunidade** anula o dano.
- **Vulnerabilidade** segue a regra 3.0 dos subtipos. Ex.: criatura de fogo contra frio leva dano dobrado; se o efeito permite resistência para metade, leva metade quando passa e o dobro quando falha. Isso é diferente do +50% da 3.5.
- **Resistência à magia (RM)**: d20 + nível de conjurador ≥ RM para a magia afetar. Vale só contra **magias e habilidades similares a magia (SM)**; não vale contra habilidades extraordinárias (Ext) nem sobrenaturais (Sob), como o sopro de dragão. O catálogo marca a natureza de cada especial.
- **Resistências (Fort/Ref/Von)**: d20 + bônus ≥ CD. O 1 natural sempre falha e o 20 natural sempre passa.
- **Evasão** (ladino, monge; 3.0): passar em Reflexos anula o dano de área. Só vale com armadura leve ou sem armadura. A evasão aprimorada também reduz à metade quando falha.
- **Regeneração** (3.0):
  - o dano comum vira dano por contusão, que se regenera a cada rodada;
  - só o tipo de dano excluído (fogo e ácido para o troll) mata;
  - no simulador, o regenerador com dano por contusão maior que os PV fica **inconsciente**, o que conta como derrotado na luta, com uma nota de que vai se levantar;
  - o Tarrasque segue a mesma regra: fora de combate sim, morto não.
- **Cura acelerada**: recupera PV no início do turno.

### 5.5 Estados

- **PV 0**: incapacitado. Conta como fora de combate para decidir a luta.
- **−1 a −9**: morrendo. Perde 1 PV por rodada e estabiliza com 10% de chance a cada rodada.
- **−10**: morto.
- **Condições**:
  - abalado (3.0): −2 em ataques, testes e resistências;
  - amedrontado: foge da fonte do medo, com −2 em ataques, testes e resistências;
  - apavorado (em pânico): foge e larga o que estiver segurando;
  - amedrontado e apavorado saem da luta enquanto dura o efeito;
  - medo acumula (3.0): abalado + abalado = amedrontado; abalado + amedrontado, ou amedrontado + amedrontado, = apavorado;
  - agarrado: não se move, não conjura e só ataca desarmado ou com arma leve, seguindo a sequência de agarrar do SRD 3.0 de forma simplificada;
  - engolido: ataca por dentro com arma leve contra a CA interna;
  - paralisado ou petrificado: indefeso, fora de combate;
  - imobilizado ("held" do 3.0, efeito de Imobilizar Pessoa): indefeso e fora de combate enquanto durar. Não é efeito de paralisia, então a imunidade a paralisia não protege dele;
  - dano de atributo por veneno: recalcula os bônus afetados;
  - níveis negativos: −1 em ataques, resistências e testes por nível.

### 5.6 O que é simulado de cada lado

- **Especiais de monstros e Holy Avenger**: todo o vocabulário de `tools/catalogo-combate.md`.
  - Os de monstro: sopro (área × vários alvos, recarga, com dano, condição ou veneno); agarrar aprimorado e constrição; engolir e engolfar; rasgar; bote; atropelar; esmagar; veneno (inicial e secundário); presença aterradora; paralisia; dreno de energia; petrificação; queimar; aura; explosão ao morrer; imunidade a magia com exceções; refletir magia; enredar; habilidades similares a magia com dano, cura, condição ou bônus.
  - Os mesmos efeitos de classe dos personagens do jogador: ataque furtivo, evasão, fúria, destruir, inspirar coragem, cura pelas mãos, camuflagem (chance de erro), falha de magia e vorpal.
  - Um especial com `mecanica: null` ou `efeito: "outro"` **não é simulado** e aparece no log como tal. As qualidades sem mecânica (sentidos, traços de tipo) ficam fora do aviso (§8.1).
  - O catálogo tem hoje, nas duas seções, os efeitos marcados como `outro` que ficaram de fora de propósito (ex.: forma selvagem, expulsar mortos-vivos, teletransporte).
- **Área na distância abstrata**: um sopro ou uma bola de fogo acerta o alvo e os aliados dele que estiverem engajados no mesmo ponto, até um limite pelo tamanho da área (cone de 9 m: até 4 criaturas Médias). É uma aproximação, documentada na tela.
- **Talentos dos personagens**:
  - Foco em Arma, Especialização em Arma, Sucesso Decisivo Aprimorado;
  - Esquiva (+1 CA contra um alvo);
  - Ataque Poderoso;
  - Trespassar e Trespassar Maior (ataque extra quando derruba um inimigo);
  - Combater com Duas Armas e Ambidestria;
  - Tiro Certeiro (+1 até 9 m), Tiro Rápido;
  - Iniciativa Aprimorada (já na ficha), Vitalidade (nota de PV da ficha);
  - Fortitude Maior, Reflexos Rápidos e Vontade de Ferro (já na ficha).
  - Os demais aparecem como "sem efeito no simulador". Magias em Combate é um deles: na 3.0 ela só ajuda a conjurar na defensiva, o que não existe sem ataque de oportunidade.
- **Habilidades de classe dos personagens** (3.0):
  - fúria do bárbaro: +4 For e Con, +2 Von, −2 CA, duração 3 + mod. de Con (já com a fúria) rodadas, fadiga depois. A fúria maior (15º nível) dá +6 For e Con e +3 Von;
  - esquiva sobrenatural (bárbaro e ladino): mantém a Des na CA quando surpreso;
  - ataque furtivo do ladino: vale sempre que o alvo perde a Des na CA (surpreso, agarrado), nunca contra imunes a crítico, e à distância só até 9 m. Não há flanco;
  - golpe desarmado e rajada de golpes do monge;
  - destruir o mal do paladino;
  - evasão (só com armadura leve ou sem armadura);
  - inspirar coragem do bardo;
  - cura pelas magias de cura (clérigo, druida, bardo, paladino e ranger).

### 5.7 Magias curadas (personagens)

- Umas 20 magias do Livro do Jogador 3.0 com efeito direto em combate:
  - dano: Mísseis Mágicos, Mãos Flamejantes, Esfera Flamejante, Flecha Ácida, Bola de Fogo, Relâmpago, Cone de Frio, Coluna de Chamas, Produzir Chamas, Tempestade Glacial (Drd 5, Fei/Mag 4 no 3.0);
  - cura: Curar Ferimentos Leves, Moderados, Graves e Críticos;
  - reforço: Armadura Arcana, Escudo Arcano, Arma Mágica, Bênção, Força do Touro, Pele de Árvore;
  - controle simples: Sono e Imobilizar Pessoa.
  - Ficam de fora:
    - Raio Ardente, que é magia da 3.5 e não existe no Livro do Jogador 3.0;
    - Chamar Relâmpagos, que no 3.0 exige tempestade ao ar livre e 10 minutos de conjuração, com um raio a cada 10 minutos, e não funciona numa luta de rodadas (o raio por rodada é da 3.5).
- A lista final e os números (dano por nível e limites, alcance, área, resistência) saem do **SRD 3.0 na implementação**, com a URL de cada magia no arquivo de dados e testes para as fórmulas.
- **Quem conjura**: mago, feiticeiro, clérigo, druida e bardo desde o 1º (ou 2º) nível; paladino e ranger a partir do 4º, como na tabela da classe.
- **Espaços por dia**: `spellcasting()` (já na ficha), com bônus por atributo alto.
  - Quem prepara (mago, clérigo, druida, paladino, ranger): o sistema monta uma preparação padrão pelo nível, e o jogador pode trocar.
  - Quem conhece poucas magias e escolhe entre elas: feiticeiro e bardo.
- **IA dos conjuradores**:
  - magia de área com 2 ou mais alvos;
  - o melhor dano num alvo só;
  - cura quando um aliado está abaixo de 50% dos PV;
  - reforço na primeira rodada, se não houver inimigo ao alcance.

### 5.8 IA

- **Alvo**: o inimigo mais próximo e, entre os engajados, o que cai mais rápido (menos PV somados à CA). Monstros de Int 1–2 atacam o mais próximo. O campo `tatica` do catálogo pode sobrescrever a regra (ex.: "prefere conjuradores").
- **Especiais**: o sopro é usado quando está disponível e há 2 ou mais alvos, ou na primeira rodada. Agarrar aprimorado e engolir seguem a sequência natural do monstro.
- **Fuga**: só por medo (amedrontado ou apavorado). Ninguém se rende.

### 5.9 Semente e reprodução

- Gerador pseudoaleatório pequeno e determinístico (ex.: mulberry32): a mesma semente e os mesmos combatentes dão o mesmo log.
- A semente aparece na tela e pode ser colada para repetir a luta.

## 🛡️ 6. Equipamento (arena e ficha)

- **Tabelas 3.0** em `js/rules/equipamento30.js` (na implementação, fora de `tables30.js`), pelo SRD 3.0:
  - armas simples, comuns e exóticas mais usadas, com dano (Pequeno/Médio), crítico, incremento, tipo e tamanho da arma. Na 3.0, ser leve, de uma mão ou de duas depende do **tamanho da arma em relação ao portador**: uma espada longa (Média) é de uma mão para um humano e de duas para um halfling;
  - armaduras e escudos, com bônus, Des máxima, penalidade, falha arcana e deslocamento.
- **Kit padrão por classe**: pelo que a classe sabe usar. Ex.: guerreiro com espada longa, cota de malha e escudo grande de madeira; mago com bordão e besta leve.
- **Itens mágicos simples**: bônus de melhoria +1 a +5 na arma e na armadura, que conta para a RD 3.0 e para a CA. Material especial: prata.
- **Onde fica**: coluna nova **`equipamento`** na tabela `fichas` (JSON).
  - **Sem incrementar a versão da tabela.** `fichas` só guarda dados do usuário, e a origem é vazia. Com a versão nova, o store marcaria a cópia local como desatualizada, e a barra lateral ofereceria "Restaurar tudo", que apaga personagens e fichas sem haver nada novo para receber.
  - As linhas do store não têm esquema (o `update` faz merge), então não há migração: uma ficha sem `equipamento` usa o kit padrão da classe.
- **Na ficha**: os blocos "Arma", "Armadura" e "Escudo" deixam de ser só pauta e passam a vir preenchidos. A CA passa a somar armadura e escudo, a Des fica limitada e os bônus de ataque passam a somar a arma, mantendo a leitura "TOTAL = 10 + …".

## 🩹 7. Premissas e limitações (primeiro corte)

- **Distância abstrata**: sem flanco, ataque de oportunidade, cobertura, terreno nem manobras (derrubar, desarmar, encontrão), exceto agarrar.
- **Áreas**: o número de alvos é estimado pelo tamanho da área (§5.6).
- **Magias**: só as da lista curada (personagens) e as do catálogo. Ilusões, adivinhações, invocações e efeitos de duração longa ficam de fora.
- **PV dos seus personagens**: os cadastrados. Os atributos atuais valem para a luta inteira, exceto pelas mudanças que o próprio combate causar.
- **Classes de prestígio**: lutam com o que `computeSheet` souber calcular (BBA e resistências do compêndio), sem as habilidades da classe.
- **Holy Avenger**: as estatísticas adaptadas são interpretação para D&D 3.0, não números oficiais. O catálogo diz o que é o quê em `adaptacao`.
- **`nota` não é lida pelo motor**: os detalhes que ficaram só em texto são aproximações. Exemplos: Luz Cegante faz 9d6 contra mortos-vivos (naga); o bônus da Arma Espiritual é o BBA do conjurador + Sab (Arsenal); o bandolim exige um teste de Atuação (Luigi). O motor usa os campos estruturados e ignora a nota.

## 🗺️ 8. Etapas de implementação

| Etapa | Entrega |
|---|---|
| **E1 Catálogo** | `data/catalogo-combate.json`, `tools/catalogo-combate.md`, `tools/validar-catalogo.js` e o teste de validação *(feito no refinamento)* |
| **E2 Motor** | `combat30.js`: RNG com semente, iniciativa, distância, ataque/crítico/dano, defesas, estados e fim da luta, com testes determinísticos *(feito, §8.1)* |
| **E3 Especiais** | Mecânicas do vocabulário do catálogo, com testes (ex.: Tarrasque engole, troll regenera, dragão sopra em vários alvos) *(feito, §8.1)* |
| **E4 Personagens** | Tabelas de armas e armaduras, kit por classe, `fichas.equipamento`, adaptador de `computeSheet`, talentos e habilidades de classe *(feito depois da E5, §8.3)* |
| **E5 Arena** | Tela `#/arena` (montar a luta, luta passo a passo com log), rota antes das genéricas, item no menu lateral e atalho a partir da ficha e da lista *(feito antes da E4, com os combatentes do catálogo, §8.2)* |
| **E6 Lote** | Simular N vezes sem travar, com o painel de resultados *(feito, §8.4)* |
| **E7 Magias** | Lista curada com números do SRD 3.0, espaços por dia, IA dos conjuradores *(feito, §8.5)* |
| **E8 Ficha** | Blocos de arma, armadura e escudo preenchidos, e CA e ataques com o equipamento *(feito, §8.6)* |

Cada etapa segue o fluxo do hub: testes, verificação no navegador e revisão por subagente até aprovar.

### 8.1 E2 e E3: o motor implementado

**Arquivos** (`js/rules/`, sem DOM, ES Modules como o resto do app):
- `dice.js`: semente (`seedFrom` aceita texto, como "dragão-42"), gerador mulberry32, `scriptedRng` para testes, rolagem com crítico (`vezes`) e média;
- `combat30.js`: o núcleo;
  - `fromCatalog` converte um combatente do catálogo para a ficha de combate;
  - `createBattle`, `nextTurn`, `nextRound`, `runBattle` e `simulate` rodam a luta;
  - `rules` expõe as regras para os especiais e para os testes;
- `combat30-specials.js`: um gancho por momento da luta (início do turno, ao acertar, ao atacar, ao morrer…) e as ações especiais da IA.

**Registro:**
- Cada evento tem `{ rodada, ator, tipo, texto }`. O texto já sai em português, pronto para a tela; na simulação em lote não é gerado.
- As condições usam forma neutra em gênero ("Lisandra: enredado por 3 rodadas").
- Combatentes com o mesmo nome são numerados ("Ogro 1", "Ogro 2").

**Decisões de implementação** (aproximações da distância abstrata, além das do §7):
- **Posição:** uma reta. O lado A começa no 0 e o B na distância inicial; cada combatente tem a sua posição e anda até o alcance do golpe que vai usar. A corrida é o movimento duplo (2× o deslocamento), e não 4×.
- **Áreas:**
  - a capacidade é 30% dos quadrados de 1,5 m que a área cobre (cone de 9 m: 4 criaturas Médias; bola de fogo de 6 m: cerca de 15);
  - cada criatura pesa pelo espaço que ocupa;
  - a área só atinge inimigos (sem fogo amigo);
  - cone, linha e cubo saem do conjurador; esfera sai do alvo, salvo "centrado nele" e Palavra Sagrada/Blasfêmia.
- **Alcance das magias:**
  - considerado suficiente, salvo toque e áreas que saem do conjurador;
  - as magias de toque, inclusive as curas (de toque na 3.0), exigem chegar ao alvo: o conjurador anda antes, se der;
  - o toque corpo a corpo usa a For; o toque à distância, a Des.
- **Agarrar (3.0, simplificado):**
  - agarrar aprimorado faz o teste resistido ao acertar (contra alvo até `tamanho_max`, por padrão uma categoria menor). Quando o catálogo exige mais de um golpe (`requer`, as duas pancadas do arbusto errante), o teste vem depois da sequência;
  - quem agarra usa o turno para apertar ou para engolir. Cada teste de agarrar vencido causa o dano do ataque que agarrou e, com constrição, o dano dela também (SRD). Sem nenhum dos dois, causa 1d3 + For;
  - quem segura com o agarrar aprimorado não é considerado agarrado e mantém a Des na CA (SRD);
  - quem está agarrado perde a Des contra os outros, tenta escapar (se tiver 30% de chance ou mais) ou ataca quem o agarra com um ataque natural ou uma arma leve;
  - não há o modo de segurar só com a parte do corpo (−20).
- **Engolido:**
  - leva o dano do estômago no início do turno de quem engoliu;
  - ataca a CA interna com um ataque natural ou uma arma leve e, ao somar o dano para sair, escapa;
  - esse dano não tira PV do monstro (o texto 3.0 fala em dano "ao estômago"), e a capacidade do estômago não é limitada.
- **Olhar (medusa):** quem está ao alcance testa no início do seu turno, e ninguém desvia o olhar. Quem é imune a efeito sobrenatural (golem) ou a efeitos de Fortitude (constructo, morto-vivo) nem testa.
- **Imunidades de tipo (3.0):** somadas às do catálogo, pelo tipo.
  - Constructos e mortos-vivos: ação mental, veneno, sono, paralisia, atordoamento, doença, efeitos de morte, crítico, dano de atributo, dreno de energia e qualquer efeito que peça Fortitude.
  - Limos e plantas: ação mental, veneno, sono, paralisia, atordoamento, metamorfose e crítico.
  - Elementais: veneno, sono, paralisia, atordoamento e crítico.
  - Imune não rola o teste.
- **Imunidade a magia:**
  - sem `abrange` (Paladino de Arton), vale contra magias e habilidades similares a magia, mas não contra sopro (sobrenatural);
  - com `abrange` (golem), vale o que ele lista;
  - o próprio combatente continua podendo se curar;
  - as exceções do golem valem também para a IA: a eletricidade (que o deixa lento) vale a condição, e o fogo (que o cura) vale menos que nada.
- **A RD que absorve todo o dano do golpe** anula também os efeitos dele, como paralisia e veneno (SRD).
  - Não anula o agarrar (basta acertar), o dano de energia (queimar) nem o dreno de energia (SRD).
  - O dano que passou da RD e ficou nos PV temporários conta como sofrido.
  - O registro só avisa quando algum efeito foi anulado, e diz qual.
- **"Morto"** (Implosão, veneno mortal) é morte, e não condição com duração. Quem é imune a efeitos de morte não sofre. Quem morre fica com −10 PV (0 no morto-vivo e no constructo, destruídos em 0).
- **O "morto" dos efeitos por DV** (Palavra Sagrada, Blasfêmia) não é efeito de morte: mata os vivos e destrói os mortos-vivos (SRD). O constructo, que não é vivo, fica de fora. A paralisia desses efeitos respeita a imunidade a paralisia (limos, plantas, constructos, mortos-vivos).
- **O Tarrasque** regenera mesmo morto por magia de morte (LM 3.0: só fica com −10 PV). No motor, cai inconsciente com a contusão de −10 PV e a regeneração o põe de pé depois de algumas rodadas. Isso vem de `regeneracao.resiste_morte` no catálogo.
- **Vorpal e morte instantânea por arma** só matam quem regenera se a arma furar a regeneração (SRD). O troll e o Tarrasque não perdem a cabeça para a espada do Paladino.
- **Veneno no sopro (golem):** passar no teste inicial não livra do secundário, 10 rodadas depois.
- **Confusão (3.0):** d10 a cada rodada. 1: vagueia por 1 minuto; 2–6: não faz nada; 7–9: ataca a criatura mais próxima, de qualquer lado; 10: age normalmente. Quem é atacado revida no turno seguinte. Quem está preso (agarrado, engolido, engolfado) não vagueia nem ataca quem está de fora: com 1 se debate, e de 7 a 10 age como preso (ataca quem o prende ou tenta escapar).
- **Presença aterradora:** um teste por luta. Com duração "até sair da área", o efeito dura a luta toda, porque na distância abstrata ninguém sai da área.
- **Aura com condição (fedor, aura de medo):** também um teste por luta; quem falha sofre a condição e o dano de atributo uma vez só.
- **Dano de atributo:**
  - com duração (enfraquecimento da Blasfêmia, Raio do Enfraquecimento), é uma penalidade temporária que não baixa o atributo de 1;
  - sem duração (veneno, fedor), é dano, e zerar Força ou Destreza deixa indefeso.
- **Magias de dano de atributo e níveis negativos** (Raio do Enfraquecimento, Enervação) só pegam quem falha no teste, quando há teste.
- **Palavra de Poder: Atordoar** dura conforme os PV do alvo (`duracao_por_pv`).
- **Evasão:** vale só em efeito de Reflexos que dá metade. A aprimorada corta pela metade só nesses efeitos.
- **Cura:** qualquer cura estabiliza quem está morrendo, mesmo que continue abaixo de 0 PV.
- **Sopro como ação livre** (gás do golem): sai no começo do turno, e o combatente ainda age.
- **Semicírculo** (Mãos Flamejantes) é uma área em leque saindo do conjurador. "Dois cubos de 3 m por nível" (Tempestade de Fogo) multiplica pelo nível de conjurador.
- **Explosão Sonora** (teste "parcial" no SRD): o formato não tem esse caso, então passar em Vontade anula tudo. Essa aproximação fica.
- **Regeneração:** o monstro desmaia quando a contusão passa dos PV, o que o tira da luta. Se a luta continuar, ele se levanta quando a regeneração baixa a contusão.
- **Dano maciço (3.0):** 50 ou mais num único ataque pede Fortitude CD 15, ou o alvo morre. Mortos-vivos, constructos e quem tem a imunidade não fazem o teste.
- **Surpresa:** na 1ª rodada, quem ainda não agiu usa a CA de surpresa e sofre ataque furtivo.
- **Ataque Poderoso:** a IA escolhe um valor por rodada (1 por 1 na 3.0) que maximiza o dano esperado do primeiro golpe. O valor vale para todos os golpes corpo a corpo da rodada.
- **Fúria:** +4 For vira +2 no ataque e no dano de qualquer arma. O catálogo não diz se a arma é de duas mãos, então não aplica 1,5×.
- **Condições:**
  - `enjoado` segue o texto da 3.5 (−2 em ataque, dano e testes), porque a 3.0 não define a condição;
  - `lento` e `cambaleante` não fazem ataque total;
  - `nauseado`, `pasmo` e `atordoado` não agem.
- **Reforços sem efeito no motor:**
  - `bba_efetivo`, `tamanho` e `dano_arma` (Poder Divino, Força dos Justos): a For e os PV temporários valem;
  - `pericias`.
  - A Velocidade dá um golpe a mais no ataque total.
- **O que não é simulado** aparece no registro no início da luta: ataques especiais sem mecânica, efeitos `outro` e magias da lista sem mecânica. Qualidades sem mecânica (sentidos, traços de tipo) não são listadas.
- **IA:**
  - compara o dano esperado de cada opção (golpes, sopro, magia, engolfar, esmagar), descontando RD, imunidades (de energia, de condição, a veneno, a efeitos de Fortitude e a magia) e resistência, com a vulnerabilidade 3.0 (×2);
  - cura quem está abaixo de 50% dos PV, se conseguir chegar até ele;
  - reforça nas duas primeiras rodadas se não há inimigo ao alcance;
  - usa o sopro com 2 ou mais alvos ou na 1ª rodada. Os alvos são escolhidos antes da presença aterradora, e sem alvo o sopro não sai.
  - Sozinha, não repete no mesmo alvo, em rodadas seguidas, um controle curto que não tira PV (ex.: Blasfêmia que só deixa pasmo). Sem isso, trancaria o alvo para sempre sem nunca derrubá-lo.

**Validação:**
- `tests/ded_make_character_combate.test.js`: 46 testes com os dados fixados. Cobrem a lista do §9 e, além dela:
  - execução do sopro, com recarga compartilhada e veneno;
  - agarrar (os dois golpes do arbusto, constrição, Des de quem segura), engolir, engolfar;
  - aura uma vez por luta, queimar, fúria (PV e fadiga), Destruir o Mal, evasão aprimorada;
  - imunidade a magia com as exceções do golem, carapaça do Tarrasque, falha de magia;
  - explosão ao morrer, dano maciço, surpresa, investida, incremento, disparo em corpo a corpo;
  - Ataque Poderoso por rodada, Trespassar, Esquiva;
  - confusão, Implosão, imunidades de tipo, vorpal contra regeneração, RD que anula efeitos;
  - IA contra as exceções do golem, Palavra Sagrada em limo, morto-vivo e constructo, magia de morte no Tarrasque;
  - confuso engolido, morto que tinha fugido no resumo, RD com agarrar e PV temporários;
  - toque que exige alcance, cura que estabiliza e todo o catálogo lutando sem erro.
- **Varredura:** os 34 combatentes, cada um contra cada um, com 2 sementes (2.312 lutas), terminam sem erro e sem texto quebrado no registro. As lutas que chegam ao limite de 50 rodadas são impasses legítimos. A mais comum é Lisandra × Lisandra, duas druidas de pouco dano que se curam, que empata em boa parte das sementes.

### 8.2 E5: a Arena implementada

A E5 veio antes da E4 (decisão do usuário), para dar para testar o motor pela interface com os combatentes do catálogo.

- **Rota e menu:** `#/arena` entra no router antes de `/:module`. O item "Arena" do grupo Aventura vem de `NAV_PAGES` (`js/entities/index.js`), a lista de páginas do menu que não são entidades. A home ganhou um atalho.
- **Arquivos:**
  - `js/pages/arena.js`: a tela;
  - `js/pages/arena-setup.js`: a montagem ↔ query da URL, sem DOM;
  - `js/rules/encontro30.js`: o nível de encontro da dica;
  - `css/arena.css`.
- **Montagem:**
  - dois lados com até 10 combatentes cada, quantidade por entrada (−/+) e remoção;
  - seletor em diálogo com três abas: Monstros, Holy Avenger e Meus personagens. A busca sem acentos vale para as duas abas do catálogo, e o filtro é por faixa de ND;
  - opções: distância inicial (passos de 1,5 m, de 0 a 120 m), limite de rodadas (1 a 200) e semente (qualquer texto, ou "Sortear" 6 dígitos). Campo apagado volta ao padrão; a semente apagada volta à anterior.
- **A montagem fica na URL** (`#/arena?a=ogro*2,ha-lisandra&b=troll&semente=580669`), gravada com `router.replaceQuery`.
  - Recarregar ou compartilhar o link repete a luta.
  - Ids que saíram do catálogo e o que passa de 10 por lado ficam de fora, com aviso; quantidade 0 ignora a entrada.
  - Nada vai para o store. Por isso, a mudança de dados em outra aba e "Restaurar tudo" não recarregam a Arena, o que apagaria a luta em andamento.
- **Dica de dificuldade:** nível de encontro da 3.0 por lado, NE = 2·log2(Σ 2^(ND/2)), que reproduz a tabela do Livro do Mestre (dois iguais = ND + 2). Para o lado A, pela diferença de NE: até −2 fácil, de −1 a +1 justa, +2 e +3 difícil, +4 ou mais mortal.
- **Luta:**
  - Próxima ação avança até alguém fazer algo, porque o turno de quem já morreu não registra nada;
  - Próxima rodada, Até o fim, Recomeçar (mesma semente), Nova semente e Voltar à montagem;
  - a ordem de iniciativa mostra PV (com a parte em contusão listrada), a CA atual contra quem o agarra ou o inimigo mais perto (com a base entre parênteses quando reforços, surpresa, Esquiva ou condições a mudam), a distância do inimigo mais perto, estado, condições, reforços, agarrar, engolir e fuga, quem agiu por último e quem vem a seguir;
  - o registro é desenhado aos poucos, só com os eventos novos, e rola sozinho se você estava no fim dele;
  - o resultado mostra o vencedor ou o empate com o motivo e, por combatente, a situação, os PV (e a contusão), o dano causado e recebido, a rodada em que caiu e os abates. No resumo do motor, "fugiu" vale só para quem fugiu de pé; quem caiu fugindo conta como caído.
- **Acessibilidade:** o seletor é um `<dialog>` com abas ARIA (setas, Home e End), e Esc fecha. O foco é preservado nos redesenhos (`data-focus`), e uma região `aria-live` anuncia as últimas ações e o resultado, sem ler o registro inteiro.
- **Fica para depois:**
  - a aba Meus personagens e o atalho "Levar à arena" da ficha e da lista entraram na E4 (§8.3);
  - a simulação em lote fica para a E6.
- **Validação:**
  - `tests/ded_make_character_arena.test.js` (7 testes): nível de encontro, faixas de dificuldade, leitura e escrita da montagem, limites e semente;
  - no E2E, 3 passos novos:
    - seletor (busca sem acento, abas com teclado, ND, quantidade, Esc e foco devolvido, lado cheio, Voltar com o seletor aberto, URL);
    - passo a passo, até o fim, recomeçar repete o registro, outra aba não apaga a luta, e recarregar mantém a montagem;
    - a 375 px, sem rolagem horizontal e com as abas numa linha.

### 8.3 E4: os personagens do jogador na Arena

- **Arquivos:**
  - `js/rules/equipamento30.js`: armas, armaduras e escudos, empunhadura, proficiências, kit padrão e problemas de uma combinação;
  - `js/rules/personagem30.js`: o adaptador `fromPersonagem`, que faz de `computeSheet`, do equipamento e dos talentos uma ficha de combate no formato de `fromCatalog`;
  - `js/pages/arena-equipamento.js`: o diálogo de equipamento.
- **Tabelas (SRD 3.0, "Equipment, Weapons" e "Equipment, Armor"):** 50 armas (simples, comuns e as exóticas mais usadas) e o ataque desarmado, 12 armaduras e 5 escudos, com os números extraídos do SRD.
  - Ficaram de fora a shuriken (dano fixo 1), a rede, o chicote, as manoplas e o escudo de corpo.
  - As armas duplas entram como armas de duas mãos (o bordão, por exemplo).
  - Ficam num módulo próprio, e não em `tables30.js`, porque são dados de equipamento e não da ficha.
- **3.0, não 3.5: o dano é da arma, não de quem a usa.** A §6 falava em dano "Pequeno/Médio", que é regra da 3.5. Na 3.0, o tamanho da arma em relação ao do portador decide:
  - arma menor que o portador: leve;
  - do mesmo tamanho: de uma mão;
  - uma categoria maior: de duas mãos;
  - duas ou mais categorias maior: grande demais.
  - Um halfling com espada curta a usa com uma mão; com espada longa, com as duas; a espada grande não serve.
- **Equipamento:** `{ principal, secundaria, escudo, armadura, distancia }`, cada um `{ id, melhoria (0 a 5), material (null ou "prata") }` ou null.
  - Fica em `fichas.equipamento`, gravado por merge: talentos e perícias da ficha continuam lá. A versão da tabela não muda (§6).
  - Sem equipamento salvo, vale o kit padrão da classe. Um campo que falta no salvo também vem do kit, e um id que não existe vira null.
  - Kits: guerreiro com espada longa, escudo grande de madeira, cota de malha e arco longo; mago com bordão e besta leve; ranger com espada longa e espada curta. Para quem é Pequeno, a arma grande troca pela menor equivalente (espada longa → espada curta), e a segunda arma do ranger é a adaga, que é leve para ele.
  - O diálogo mostra a prévia (CA, deslocamento, ataque, ataque total, à distância) e os problemas da combinação:
    - são **erros** e impedem salvar: arma grande demais, arma de duas mãos com escudo ou segunda arma, segunda arma com escudo;
    - são **avisos**: falta de proficiência, druida com armadura de metal, monge de armadura.
- **Proficiências (SRD 3.0, "Weapon and Armor Proficiency" de cada classe):** listas de armas por classe (druida, monge, ladino, mago, bardo) e raça (elfo).
  - Os talentos escolhidos também contam: Usar Armadura (leve, média, pesada), Usar Escudo e Usar Arma Simples; Usar Arma Comum e Usar Arma Exótica valem só para a arma do parâmetro (3.0: uma arma por talento).
  - Sem proficiência com a arma: −4 no ataque.
  - Sem proficiência com armadura ou escudo: a penalidade de armadura vale no ataque. O aviso só aparece quando a penalidade existe (couro e acolchoada têm 0).
  - A espada bastarda com as duas mãos conta como comum.
  - Classes de prestígio: não dá para saber, e o simulador considera que sabem usar.
- **Adaptador:**
  - **CA:** 10 + armadura + escudo (com melhoria) + Des (limitada pela armadura) + tamanho + monge (Sab positiva e nível, só sem armadura; vale também no toque).
  - **Ataque:** BBA iterativo + For (corpo a corpo) ou Des (à distância, arremesso incluído) + tamanho + melhoria + Foco em Arma, com os −4 sem proficiência.
    - Acuidade com Arma (3.0) usa a Des na arma escolhida: arma leve, rapieira usada com uma mão ou corrente com cravos para quem é Médio ou maior. A penalidade do escudo vale no ataque.
    - Foco, Especialização, Sucesso Decisivo Aprimorado e Acuidade valem só na arma exata do parâmetro: Foco (arco longo composto) não vale no arco longo.
  - **Dano:** dado da arma + For + melhoria + Especialização em Arma.
    - A For entra ×1,5 com as duas mãos: arma de duas mãos, ou de uma mão com a outra livre (sem escudo nem segunda arma), como manda a 3.0.
    - Na mão inábil entra ×0,5.
    - O arco e a funda só somam a For negativa, e a besta não soma nenhuma.
    - Sucesso Decisivo Aprimorado dobra a margem.
  - **Duas armas (tabela 3.0):** −6/−10; com a inábil leve, −4/−8; Ambidestria tira 4 da inábil; Combater com Duas Armas tira 2 das duas; o aprimorado dá o segundo golpe com a inábil a −5. O ranger tem os dois talentos só com armadura leve ou sem armadura.
  - **Monge:** coluna própria de ataque desarmado, dano desarmado da tabela e golpe ki (+1 a +3 contra a RD). A rajada dá +1 ataque no maior bônus, com −2 em todos (3.0: o −2 não diminui com o nível). As armas de monge (kama, nunchaku, siangham) usam a coluna desarmada se forem leves para ele (a kama Pequena não é leve para um monge Pequeno).
    - De armadura (3.0), o monge perde a CA de monge, o deslocamento e os ataques desarmados extras: sem a coluna própria e sem a rajada, fica com o BBA da classe.
    - O texto 3.0 fala só em armadura: com escudo (sem proficiência), o monge fica só com a penalidade no ataque.
  - **À distância:**
    - Tiro Rápido: +1 disparo com −2 em todos;
    - besta: um disparo por rodada (recarregar é ação de movimento, ou rodada inteira na pesada). A funda dispara com os iterativos: na 3.0 ela não tem regra de recarga (a recarga da funda é da 3.5);
    - armas de arremesso: também um por rodada, sem Saque Rápido (sacar a próxima é ação de movimento);
    - o alcance máximo é de 10 incrementos para projétil e 5 para arremesso;
    - Tiro Certeiro (+1 no ataque e no dano) e Especialização à distância (+2 no dano) só valem até 9 m. Isso usa um campo novo do ataque no motor, `ate_9m`.
  - **Habilidades de classe** no vocabulário do catálogo:
    - bárbaro: fúria (maior no 15º; no 20º não fica fatigado, `sem_fadiga`), 3 + Con da fúria rodadas, e esquiva sobrenatural;
    - ladino: ataque furtivo, evasão e esquiva sobrenatural;
    - monge: evasão (aprimorada no 9º), veneno no 11º;
    - paladino: destruir o mal (2º; só num golpe corpo a corpo, 3.0), cura pelas mãos (Car × nível, similar a magia) e imunidade a medo pela aura de coragem (2º);
    - bardo: inspirar coragem com 3 graduações em Atuação;
    - druida: imune a veneno no 9º;
    - elfo e meio-elfo: imunes a sono.
    - Expulsar mortos-vivos, forma selvagem, companheiro animal, ataque atordoante e inimigo predileto aparecem como "não simulado". As magias chegaram na E7 (§8.5).
  - **For mudada na luta (fúria, dano de atributo):** o adaptador marca em cada ataque o peso da For no dano (`for_mult`: ×1,5, ×1, ×0,5 ou 0; `for_negativa` para arco e funda) e o atributo do ataque (`atributo_ataque`, a Des da Acuidade). O motor recalcula com a For de agora: a fúria soma +3 no dano do machado grande e +1 na mão inábil.
  - **Talentos que o motor lê pelo nome:** Ataque Poderoso, Trespassar, Trespassar Maior, Esquiva e Tiro Preciso. Iniciativa Aprimorada e as resistências já vêm da ficha.
  - **PV:** os cadastrados. Sem eles, o máximo do dado no 1º nível e a média arredondada para cima nos demais, + Con, com mínimo de 1 por nível e um aviso.
  - **Deslocamento:** a armadura média ou pesada leva 9 m a 6 m e 6 m a 4,5 m. O monge de armadura perde a tabela própria, e o bárbaro perde o +3 m em armadura pesada.
  - **Não luta** quem não tem atributos, classe (BBA e resistências) ou PV calculáveis, nem quem tem uma combinação de equipamento com erro. A Arena mostra o motivo e não deixa começar.
- **Aproximações:**
  - o soco de quem não é monge (1d3 de contusão) causa dano normal;
  - a IA não pesa o dano extra de `ate_9m` (pesa o +1 no ataque) nem se posiciona para ficar a 9 m;
  - a aura de coragem do paladino não dá o +4 contra medo aos aliados;
  - a besta pesada, que na 3.0 leva uma rodada inteira para recarregar, dispara toda rodada;
  - os bônus raciais condicionais (anão contra gigantes, halfling com arremesso) não entram;
  - o arco composto potente não soma a For;
  - o bardo usa qualquer das armas comuns da sua lista, e não só a escolhida.
- **Na Arena:**
  - a aba Meus personagens lista os personagens do store com nível, classe, raça, PV, CA e equipamento; a busca e o filtro valem para ela;
  - o mesmo personagem entra uma vez por lado, mas pode estar nos dois (espelho);
  - no lado, o cartão tem o botão "Equipamento", o equipamento atual e os avisos do adaptador;
  - na URL, o personagem é `p:<id>`;
  - "Levar à arena" (lista de Personagens e barra da ficha) abre `#/arena?a=p:<id>`.
- **Recarregar com dados novos:** agora que a Arena lê o store, o evento de outra aba e "Restaurar tudo" a recarregam na montagem (os personagens podem ter mudado).
  - Com luta em andamento ou diálogo aberto (`cleanup.ocupada()`), não recarregam na hora, o que apagaria a luta. O app marca a recarga (`cleanup.adiar()`) e avisa, e ela acontece ao voltar à montagem ou ao fechar o diálogo.
  - Ao salvar o equipamento, a Arena relê o personagem e as fichas do store. Se o personagem mudou ou foi excluído, não grava e recarrega: assim nenhuma ficha órfã fica para um personagem novo que herdaria o mesmo id.
- **Validação:**
  - `tests/ded_make_character_personagem.test.js` (15 testes), com os números conferidos à mão:
    - guerreiro 5 com espada longa +1, cota de malha e escudo;
    - monge 10 com rajada, e de armadura;
    - bárbaro 8 com fúria;
    - a tabela de duas armas e o ranger;
    - à distância (Tiro Rápido, besta, arremesso, arco com For baixa);
    - halfling;
    - proficiências;
    - classes (paladino, ladino, bardo);
    - PV pela média;
    - equipamento salvo com lixo e os kits de todas as classes sem erro;
    - `ate_9m` no motor, destruir o mal só corpo a corpo, a fúria com duas mãos e na inábil, o 20º sem fadiga;
    - Acuidade 3.0 (escudo, rapieira) e Foco na arma exata;
    - proficiências por talento; a funda com iterativos; o monge de armadura e com escudo;
    - a sanidade em lote (guerreiro 20 vence sempre um ogro; guerreiro 1 perde sempre para o Tarrasque).
  - `tests/ded_make_character_arena.test.js` (8 testes): o limite de um por lado para o personagem.
  - E2E, passo novo: os atalhos da lista e da ficha, o kit do Jonh, o limite de um por lado, o erro da espada grande com escudo, salvar sem escudo com melhoria +1, a gravação em `fichas`, recarregar mantém, a luta usa o equipamento salvo, e o evento de outra aba com a luta aberta só recarrega ao voltar à montagem.
- **Na E8 (§8.6):** os blocos de arma, armadura e escudo da ficha impressa, e a CA e os ataques da ficha com o equipamento.

### 8.4 E6: a simulação em lote na Arena

- **Motor:** `criarLote(luta, { vezes, semente })` roda a mesma luta `vezes` vezes, com as sementes seguidas (semente + i) e sem texto de registro.
  - `rodar(n)` roda até mais `n` lutas; `resultado()` resume o que já rodou. O `simulate` virou um atalho que roda o lote de uma vez, com o mesmo resultado.
  - O resultado traz:
    - as porcentagens de vitória de cada lado e de empates;
    - a média de rodadas;
    - os PV que sobram ao vencedor, no geral e por lado;
    - quantas vezes cada combatente caiu;
    - o intervalo de sementes;
    - a primeira semente de cada resultado (vitória de A, de B e empate).
- **Na tela:** uma seção "Simulação em lote" na montagem, com os botões "Simular 100 vezes" e "Simular 1.000 vezes".
  - Roda em fatias de cerca de 12 ms com `setTimeout` (o `requestIdleCallback` não existe no Safari), com uma barra de progresso (`role="progressbar"`) e "Cancelar a simulação".
    - Não precisou de Web Worker: a tela segue respondendo (a maior espera entre fatias fica perto de 25 ms).
    - 1.000 lutas levam menos de 1 s nas lutas pequenas e alguns segundos nas grandes (Tarrasque contra 10 ogros, 10 contra 10).
  - Enquanto o lote roda, "Começar a luta" fica bloqueado.
    - Mudar a montagem (lados, distância, limite) ou o equipamento de um personagem cancela o lote, com aviso. A semente não cancela, porque o lote guarda as dele.
    - Só a seção do lote é redesenhada, e só quando o que ela mostra muda. "Começar", "Simular" e a dica mudam no lugar: o `change` de um campo chega no `mousedown` do botão, e trocar o botão ali faria o clique se perder. Quem estiver digitando num campo continua digitando, e o foco só vai para o resultado se estava no lote.
    - Uma recarga (outra aba, "Restaurar tudo") não espera o lote: cancela-o e recarrega na hora, e o aviso diz que o lote foi cancelado. Sair da página também cancela.
    - Um erro do motor no meio para o lote e mostra o parcial.
  - "Começar a luta" e "Simular" usam o que está escrito nas opções, mesmo que o campo ainda não tenha perdido o foco (o `change` só vem no blur).
  - O resultado mostra:
    - a barra A × B × empate;
    - os números (vitórias, empates, média de rodadas, PV que sobram ao vencedor por lado);
    - "Quem caiu", do que mais caiu ao que menos caiu;
    - os botões "Ver uma vitória do lado A", "Ver uma vitória do lado B" e "Ver um empate", que abrem a luta daquela semente (ela vira a semente da montagem).
  - Cancelado, o resultado é parcial e diz quantas lutas rodaram.
  - Se a montagem ou o equipamento de um personagem mudar depois (a semente não conta), o resultado continua, com o aviso de que é de uma montagem anterior e sem os botões de assistir. O aviso aparece na hora, e "Ver…" confere a montagem antes de abrir a luta.
  - A assinatura do equipamento usa as posições em ordem fixa: salvar o mesmo equipamento não marca o resultado como antigo.
  - Se a semente da montagem mudou depois do lote, o resultado diz de qual semente ele partiu.
  - O foco vai para o resultado ao terminar, e o `aria-live` anuncia o início, o fim com as porcentagens e o cancelamento.
- **Validação:**
  - no motor: o lote em fatias dá o mesmo resultado que o `simulate`, a semente de exemplo reproduz o resultado dela, e o parcial conta só o que rodou;
  - no E2E, um passo novo:
    - o progresso fica entre 0 e 1.000 no meio (é em fatias) e "Começar" fica bloqueado;
    - cancelar dá um resultado parcial;
    - 100 lutas somam 100% e mostram as sementes;
    - assistir a uma vitória do lado B termina com o lado B vencendo;
    - o resultado continua ao voltar à montagem e fica marcado como antigo quando a montagem muda;
    - o resultado cabe a 375 px;
  - no E2E, mais um passo, com o lote rodando: a distância cancela sem travar; digitar a semente mantém o campo e o foco; mudar o equipamento marca o resultado como antigo (salvar o mesmo kit, não); a outra aba recarrega e avisa;
  - no passo do lote, depois do resultado:
    - mudar a semente mantém os "Ver…" e diz de que semente o lote partiu;
    - o limite 1 marca o resultado como antigo, e voltar a 50 o faz valer de novo;
    - com o mouse de verdade (`page.click`, que passa pelo mousedown, blur e change), editar um campo e clicar em "Ver…" ou em "Começar" funciona no primeiro clique.

### 8.5 E7: as magias dos seus personagens

- **Lista curada** (`js/rules/magias30.js`): as 22 magias de §5.7, cada uma com o nome em português, o nível em cada classe (3.0), a URL da página do SRD 3.0 e a mecânica calculada pelo nível de conjurador:
  - dano:
    - Mísseis Mágicos: 1d4+1 por míssil, 1 míssil a mais a cada 2 níveis depois do 1º (máx. 5), acerta sempre;
    - Mãos Flamejantes: 1d4 por nível (máx. 5d4), semicírculo de 3 m;
    - Bola de Fogo e Relâmpago: 1d6 por nível (máx. 10d6); o relâmpago é a linha de 1,5 m até o alcance médio;
    - Cone de Frio: 1d6 por nível (máx. 15d6), cone até o alcance curto;
    - Coluna de Chamas: 1d6 por nível (máx. 15d6), metade fogo e metade divino;
    - Tempestade Glacial: 3d6 de impacto + 2d6 de frio, sem teste;
    - Flecha Ácida, Esfera Flamejante e Produzir Chamas (que continuam, veja o motor);
  - cura: Curar Ferimentos Leves, Moderados, Graves e Críticos, 1d8 a 4d8 + 1 por nível (máx. +5, +10, +15 e +20);
  - reforço: Armadura Arcana, Escudo Arcano, Arma Mágica, Bênção, Força do Touro (1d4+1, rolado) e Pele de Árvore (+3, +4 no 6º e +5 no 12º);
  - controle: Sono (2d4 DV) e Imobilizar Pessoa (humanoide Médio ou menor).
- **Nível de conjurador:** o nível da classe; o do paladino e o do ranger é a metade (3.0). A CD é 10 + mod. do atributo + nível da magia, também quando ela sai de um espaço maior.
- **Espaços do dia:** os de `spellcasting()`, com os adicionais do atributo. Ficam de fora as magias de nível 0 e o espaço de domínio do clérigo.
  - Quem prepara (mago, clérigo, druida, paladino, ranger) recebe uma preparação padrão por classe e pode trocar. Uma magia menor cabe num espaço maior. O ranger do 4º ao 7º tem só espaços de 1º nível, e as magias dele na lista começam no 2º: o cartão diz que nenhuma cabe, sem o botão.
  - Quem conhece (feiticeiro, bardo) escolhe as conhecidas pela tabela da classe e as lança com qualquer espaço do nível delas ou maior, o menor livre primeiro. O registro diz quando a magia saiu de um espaço maior.
  - O clérigo bom ou neutro troca uma magia preparada por uma cura do mesmo nível ou menor (3.0).
    - Só troca uma magia que preparou: na luta, cada nível tem tantos espaços quanto magias preparadas nele (também as que o simulador deixa de fora, como Arma Mágica com arma +1), e um espaço vazio não vira cura. A troca gasta um desses espaços, e a preparada que se perde é a que sobrar no fim.
    - O clérigo maligno trocaria por infligir, que não está na lista.
    - O neutro de divindade neutra escolhe na 3.0; o simulador considera a cura.
  - A escolha é salva em `fichas.magias`: `{ preparadas: { "1": { "misseis-magicos": 2 } } }` ou `{ conhecidas: ["misseis-magicos", …] }`. Ao ler, sai o que não vale (id desconhecido ou de outra classe, magia maior que o espaço) e o excesso é cortado. Sem nada salvo, vale o padrão. A ordem sai sempre a da lista curada: desmarcar e marcar de novo não deixa o diálogo "sujo" nem marca o lote como antigo.
- **Equipamento:**
  - falha arcana: armadura + escudo, para mago, feiticeiro e bardo (na 3.0 o bardo também falha de armadura leve);
  - Armadura Arcana: +4 de armadura, que não vale contra toque e não soma com a armadura vestida (só entra o que passa dela);
  - Arma Mágica: só na arma da mão principal, se ela não tiver melhoria, e vence RD x/+1;
  - druida de armadura ou escudo de metal, ou com arma fora da lista dele, não conjura (3.0: "unable to use any of her magical powers"). O aviso do equipamento, que dizia que as magias chegavam na E7, agora diz isso.
- **Motor** (as mudanças valem também para o catálogo):
  - espaços por nível compartilhados: `magias.espacos` e, em cada magia da lista, `espaco`;
  - `continuo` (Flecha Ácida): 2d4 no início de cada um dos próximos turnos do alvo, sem teste, 1 rodada a mais a cada 3 níveis;
  - `persistente` (Esfera Flamejante): a esfera queima de novo a cada turno do conjurador, pela duração, com Reflexos para anular. Vai no mesmo alvo ou, se ele caiu (ou ela não o fere), no inimigo mais perto que ela fere; sem nenhum, fica parada. A RM é testada uma vez por alvo, e quem ela barrou não é mais escolhido. Só há uma esfera de cada vez;
  - `repete` (Produzir Chamas): enquanto dura, o conjurador arremessa de novo sem gastar a magia e sem falha arcana;
  - `limite_dv` (Sono): 2d4 DV, os de menos DV primeiro (e, empatados, os mais perto do alvo); quem não pode ser afetado não gasta DV, e o DV que não dá para o próximo se perde;
  - quem dorme por Sono acorda ao ser ferido;
  - reforços:
    - atributo com dado (Força do Touro) é rolado;
    - a mesma magia de novo renova a duração em vez de somar;
    - bônus do mesmo `tipo_bonus` não somam: a Bênção e o inspirar coragem são de moral, e vale o maior;
    - `ca_armadura` (Armadura Arcana) não vale contra toque, como a `ca_natural`;
    - `ref_area` (Escudo Arcano) dá +3 em Reflexos só contra área;
    - o bônus de ataque que não é de uma arma (Bênção) vale também no toque das magias;
  - IA:
    - reforço na 1ª e na 2ª rodada se ninguém está em corpo a corpo com o conjurador. Antes, qualquer ataque que alcançasse o inimigo contava, e como todo kit de personagem tem arma à distância, ninguém se reforçava;
    - entre os reforços, o que dá mais (CA, ataque e dano vezes os aliados, Força);
    - na cura, a que mais cura sem sobrar e, empatadas, a do espaço menor;
    - o que continua (esfera, chamas na mão) vale até o dobro de um golpe só (heurística);
    - Mísseis Mágicos não valem nada contra quem tem Escudo Arcano, e a esfera só troca para um alvo que ela fere (fica parada diante do golem de ferro, que o fogo cura);
  - catálogo (versão 3) com os campos novos:
    - Escudo Arcano (`ref_area` e `anula`) na naga, nos dragões e nos personagens de Holy Avenger;
    - Flecha Ácida de Vladislav e Deenar (`continuo`);
    - Produzir Chamas de Lisandra (`repete`);
    - Sono de Niele e Luigi (`limite_dv`).
- **Na tela:**
  - o cartão do conjurador (do nível em que ele tem espaços) mostra as magias escolhidas e ganha o botão "Magias";
  - o diálogo tem um grupo por nível:
    - quem prepara usa um contador por magia, com o "+" desligado quando os espaços acabam. As de nível menor ficam num "Magias de nível menor neste espaço" (aberto quando o nível não tem magia da lista ou já tem uma menor);
    - quem conhece marca caixas, com o limite de cada nível;
    - cada magia mostra os números dela neste personagem (dano, CD, área, duração), o resumo e o link para o SRD 3.0;
    - acessibilidade: o rótulo da caixa é só o nome da magia, e os números vão como descrição; os botões do contador dizem quantas estão preparadas; só o corpo do diálogo é redesenhado, e uma região `aria-live` no rodapé, que fica, anuncia a contagem nova;
  - a prévia "Na luta" mostra o nível de conjurador, a CD, os espaços, a troca por curas e os avisos (falha arcana, Arma Mágica de fora, druida de metal);
  - "Preparação padrão" (ou "Escolha padrão") volta ao padrão;
  - salvar grava em `fichas.magias`. Como no equipamento, a Arena relê o personagem antes, e mudar as magias cancela o lote ou marca o resultado como antigo.
- **Simplificações:**
  - Mísseis Mágicos vão todos no mesmo alvo;
  - Escudo Arcano protege de todas as direções;
  - dirigir a esfera não gasta a ação de movimento;
  - Produzir Chamas é só à distância, com um arremesso por rodada (sem ataques iterativos), e o primeiro sai junto com a conjuração;
  - os reforços de toque (Armadura Arcana, Arma Mágica, Força do Touro, Pele de Árvore) vão só no próprio conjurador;
  - a cura não fere mortos-vivos (a IA só cura aliados);
  - o cilindro da Coluna de Chamas e da Tempestade Glacial é um raio, e as áreas não pegam aliados (§5.6).
- **Validação:**
  - `tests/ded_make_character_magias.test.js` (18 testes):
    - o nível de cada classe igual à linha "Level:" do SRD 3.0, transcrita no teste, e a URL de cada magia;
    - as fórmulas por nível de conjurador, com os limites;
    - os espaços (Int baixo, domínio, paladino e ranger);
    - a preparação padrão, as conhecidas e a normalização da escolha salva;
    - no adaptador: a CD num espaço maior (também a que o motor usa no teste), a troca por curas (bom, neutro, maligno; só onde há magia preparada, e nada preparado não cura), a ordem fixa da escolha, o ranger 5 sem magia da lista, a falha arcana, a Arma Mágica com arma +1, a Armadura Arcana com couro, o druida de metal e com espada;
    - no motor: os espaços compartilhados, a troca por cura, Força do Touro, moral, renovar, Armadura Arcana contra toque, Escudo Arcano (e a IA não gastar Mísseis Mágicos contra ele), Arma Mágica na mão certa e contra RD, Flecha Ácida, Esfera Flamejante (parada diante do golem, e sem ficar presa em quem a RM barrou), Produzir Chamas, Sono, falha arcana;
    - a IA: reforço antes, área em vários e cura no aliado ferido;
    - no lote, o mago 5 com as magias vence os ogros bem mais vezes do que sem elas;
  - `tests/ded_make_character_personagem.test.js`: o bardo agora tem as magias no motor, sem o "não simulado";
  - E2E, passo novo (40 verificações ao todo):
    - o mago: a preparação padrão no cartão, os espaços de Int 17, o "+" desligado sem espaço, as trocas com o mouse de verdade (inclusive uma magia menor no espaço maior), a gravação em `fichas`, o lote marcado como antigo, e a luta com o Escudo Arcano na 1ª rodada e a Bola de Fogo, sem o Relâmpago tirado;
    - a feiticeira: o limite das conhecidas, o rótulo só com o nome, o anúncio, desmarcar e marcar de novo sem perguntar ao sair, e mudar e sair com "Continuar editando" e "Descartar" (que não grava);
  - sem erros nem texto quebrado no registro: 2.800 lutas de conjuradores (7 classes × níveis 1 a 20 × 10 inimigos) e 2.312 lutas do catálogo.
- **Na E8 (§8.6):** os blocos de arma, armadura e escudo da ficha impressa, e a CA e os ataques da ficha com o equipamento.

### 8.6 E8: o equipamento na ficha impressa

- **De onde vem:** a ficha (`#/personagens/:id/ficha`) usa o equipamento salvo na Arena (`fichas.equipamento`) ou, sem ele, o kit padrão da classe. As contas são as da Arena: `fromPersonagem` devolve também `naFicha`.
  - Sem equipamento salvo, uma nota na ficha diz que é o kit e leva à Arena.
  - Personagem sem classe básica e sem equipamento salvo fica como antes, sem os blocos.
- **Regras compartilhadas** (`js/rules/personagem30.js`), que a luta também passou a usar:
  - `caComEquipamento`: 10 + armadura + escudo (com a melhoria) + Des (limitada pela armadura) + tamanho + natural + diversos. O monge de armadura perde a CA de monge. Valor ausente (sem Des, sem raça) deixa o total em branco, como antes;
  - `deslocamentoComArmadura`: média e pesada levam 9 m a 6 m e 6 m a 4,5 m (o anão também, como o traço dele já dizia); o bárbaro mantém o +3 m na média; o monge de armadura perde o deslocamento de monge;
  - `penalidadeDoItem` (`equipamento30.js`): armadura e escudo mágicos são obra-prima e têm a penalidade de armadura 1 menor (SRD 3.0: "all magic armor is also masterwork armor"). Vale também no ataque sem proficiência, que antes usava a penalidade cheia.
- **Pesos:** cada arma, armadura e escudo ganhou `peso_lb`, a coluna de peso do SRD 3.0. `pesoKg` converte com 1 libra ≈ 0,5 kg (como a carga). A armadura e o escudo feitos para Pequeno pesam a metade; a arma, não, porque na 3.0 ela tem tamanho próprio.
- **Na página 1:**
  - CA: armadura e escudo nas caixas, a Des já limitada, e a CA de monge em "diversos". "Falha de magia arcana" mostra armadura + escudo, e "penal. de armadura" a soma das duas;
  - deslocamento com a armadura;
  - corpo a corpo e à distância: a penalidade de armadura sem proficiência entra em "mod. diversos";
  - perícias marcadas com * (Equilíbrio, Escalar, Arte da Fuga, Esconder-se, Saltar, Furtividade, Acrobacias, Prestidigitação): a penalidade de armadura entra em "mod. diversos", e a nota diz que ela já está somada. Sem proficiência, ela vale também em Cavalgar (SRD 3.0: "all skill rolls that involve moving, including Ride");
  - três blocos de arma (principal, segunda arma e à distância):
    - bônus de ataque total em série (+10/+5), dano, decisivo (com Sucesso Decisivo Aprimorado);
    - alcance (o incremento da arma à distância; "—" corpo a corpo, 3 m na arma de haste), peso, tipo ("concussão e perfurante" na arma de dois tipos, que é dos dois), tamanho da arma;
    - propriedades: empunhadura (leve, uma mão, "uma mão, com as duas (For ×1,5)", duas mãos), haste, sem proficiência, Acuidade com Arma, Foco e Especialização, a série com duas armas, a rajada e o golpe ki do monge, a recarga, o Tiro Rápido e o bônus até 9 m;
  - bloco da armadura: tipo, bônus (com a melhoria), Des máxima, penalidade, falha de magia, deslocamento, peso e propriedades (sem proficiência, obra-prima, metal no druida, monge);
  - bloco do escudo: bônus, peso, penalidade, falha de magia e propriedades;
  - o material (prata) vai no nome do item. As propriedades cabem em até 3 linhas (a letra encolhe se precisar);
  - leitor de tela: cada valor leva o rótulo da coluna, escondido, e a faixa de rótulos sai do leitor quando o bloco está preenchido.
- **Equipamento com erro** (espada grande com escudo…): os blocos mostram os itens, a CA soma a armadura e o escudo, os ataques das armas ficam em branco, e uma nota aponta o problema e leva à Arena.
- **Na tela:** o diálogo de equipamento da Arena diz que o equipamento vale também na ficha.
- **Validação:**
  - `tests/ded_make_character_personagem.test.js`, 3 testes novos:
    - o guerreiro 5 com espada longa +1, cota +1 e escudo grande de aço: CA 20, penalidade −6, falha 45% e os três blocos conferidos à mão;
    - os pesos (armadura de Pequeno pela metade) e toda arma e armadura com peso;
    - a obra-prima no ataque do mago sem proficiência (−4 em vez de −5);
    - o monge livre (rajada, golpe ki) e de armadura (sem a CA de monge);
    - o ranger de duas armas, a arma de haste, a espada com as duas mãos;
    - sem For (blocos sem ataque), sem Des (CA em branco) e o equipamento com erro;
  - E2E: a anã clériga com o kit (CA 16, 4,5 m), e a ficha do Jonh depois de salvar o equipamento na Arena (espada grande +1 com +9 e 2d6+7, CA 17 sem o escudo, cota com −5);
  - a checagem de que nenhum bloco transborda (perfis variados) ganhou o monge de cota de malha +1 e o druida de armadura completa +1 (três propriedades na armadura) e confere que nenhum valor dos blocos sai cortado; a impressão em 2 páginas A4 continua passando.

## 🧪 9. Testes planejados

- **Catálogo** (`tests/ded_make_character_catalogo.test.js`, já na E1):
  - tudo o que o formato marca com ✔, pelo validador;
  - ND de 1 a 20 sem repetição, com o Tarrasque no 20 e os números do SRD 3.0;
  - erros plantados que o validador precisa pegar: sopro sem CD, veneno sem dose inicial, `magico` fora do formato, margem de crítico 16, `cd_base` e `agarrar` errados, gatilho que não é ataque, ids repetidos, condição e imunidade fora da lista, Esquiva na CA, monstro *Product Identity*, talento fora do compêndio e entradas `null` sem quebrar o validador.
- **Motor (semente fixa)**:
  - 1 natural erra e 20 natural acerta, também nas resistências;
  - crítico multiplica só o que deve;
  - RD `10/+1` barra arma comum e não barra arma +1; arma +1 vence `x/prata`; a mordida do Tarrasque vence a RD do Balor; magia e energia ignoram RD;
  - resistência a energia por rodada (4 pancadas de fogo contra resistência 20 perdem 20 no total) e imunidade;
  - RM contra magia e habilidade SM, e não contra sopro (Sob) nem Ext;
  - morrendo e estabilizando;
  - regeneração do troll (fogo mata; espada não);
  - Tarrasque engole e é cortado por dentro;
  - medo acumula (abalado + abalado = amedrontado; amedrontado + abalado = apavorado);
  - dano por tendência: a Praga Profana dá dano total a quem é bom e metade a quem é neutro, e só os bons ficam enjoados; uma criatura NB conta como boa no eixo moral;
  - a mesma semente dá o mesmo log.
- **Adaptador de personagem**: guerreiro 5 com espada longa +1, cota de malha e escudo; monge 10 com rajada; bárbaro em fúria. Ataques, dano e CA conferidos à mão.
- **Sanidade estatística** (lote de 1.000): um guerreiro 20 bem equipado contra um monstro de ND baixo vence sempre; um personagem de 1º nível contra o Tarrasque perde sempre; lutas espelhadas (mesmo combatente dos dois lados) ficam perto de 50%.
- **E2E**: montar a luta, rodar passo a passo e até o fim, repetir pela semente, simular 100 vezes, e salvar o equipamento, que aparece na ficha. Sem erros no console, com layout mobile.

## ✅ 10. Critérios de aceitação

- O catálogo tem 20 monstros do SRD 3.0 (ND 1–20, Tarrasque no 20) e os personagens de Holy Avenger, num único `catalogo-combate.json` que passa na validação.
- Na arena dá para montar qualquer combinação: seus personagens, monstros e personagens de Holy Avenger, em um ou mais combatentes por lado.
- A luta segue as regras 3.0 descritas em §5, com log legível, e a mesma semente repete a mesma luta.
- A simulação em lote mostra as porcentagens de vitória sem travar a tela.
- O equipamento escolhido na arena fica salvo e aparece na ficha.
- Tudo o que o simulador não cobre aparece como "não simulado" no log ou em §7, sem falhar em silêncio.
