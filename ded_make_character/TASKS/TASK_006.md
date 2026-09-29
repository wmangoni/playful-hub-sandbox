# ⚔️ Tarefa 006 - D&D Make Character: Simulador de combate (Arena) + catálogo de monstros e de Holy Avenger

**Status**: 💻 In Progress — E2/E3 (motor de combate); refinamento aprovado pela revisão rigorosa na 3ª rodada
**Responsável**: Claude (TL)
**Branch**: `feat/ded-simulador-combate` (a partir de `feat/ded-make-character`, PR #48)
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
  - Os especiais usam um vocabulário fechado de 32 mecânicas (tabela em `tools/catalogo-combate.md`). Ele vai de sopro, agarrar, engolir e veneno a condição ao acertar, magia e aura, e inclui os poderes de classe que o motor também usa nos personagens do jogador (ataque furtivo, evasão, fúria, destruir…). `outro` marca o que não é simulado.
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
  | Holy Avenger | 32 | 24 | 21 |

  - `null` são sentidos, traços de tipo, invocações e efeitos fora do tempo de combate, além das regenerações, que já estão no campo `regeneracao`.
  - Os 5 `outro` dos monstros são resistência à expulsão (carniçal), transparência (cubo), absorver eletricidade (arbusto), apanhar rochas (gigante) e arrancada (Tarrasque).
  - Os 21 de Holy Avenger são forma selvagem, expulsar ou fascinar mortos-vivos, teletransporte, disfarces, retribuição do Paladino, poderes do martelo do Arsenal, inimigo predileto, entre outros.
  - Todos ficam de fora do motor de propósito e aparecem no log como "não simulado".
- **Nomes em PT-BR.** São os usados pela Devir 3.5 e por fontes em português, porque não foi possível confirmar a tradução 3.0. Os nomes de talentos, perícias e magias dos blocos são traduções usuais.

### 3.2 Holy Avenger

São 14 personagens da HQ. Os fatos (nome, raça, papel, equipamento icônico e poderes) vêm das wikis de Tormenta (`fonte.url`). Os números estão em regras 3.0.

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
| Paladino de Arton | aliado, corrompido no fim | Humano meio-celestial | Paladino 19 (20) | 175 | 25 | **oficial**, reduzida ao teto de ND 20 |
| Mestre Arsenal | vilão | Humano | Guerreiro 10/Clérigo 10 (20) | 240 | 24 | **oficial**, reduzida ao teto de ND 20 |
| Nekapeth | vilão | Homem-serpente | 8 DV + Clérigo 12 (20) | 183 | 23 | adaptadas (níveis da wiki) |

**Como foram montados:**
- **Fichas oficiais.**
  - Existem fichas d20 transcritas na wiki para o Paladino (Paladino 20, ND 22), o Arsenal (Guerreiro 10/Clérigo 12, ND 26) e o Luigi.
  - Elas já usam termos 3.0, então não houve conversão da 3.5.
  - O Paladino e o Arsenal perderam níveis para caber no teto de ND 20, e os números foram recalculados.
  - Erros aritméticos das fichas oficiais foram corrigidos e registrados em `adaptacao`: iniciativa sem Iniciativa Aprimorada, Ouvir, ataque e CA do Arsenal.
- **Suplemento *Holy Avenger d20* (Talismã).** Existe, mas não foi consultado, porque só havia cópias piratas.
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
  - Um especial com `mecanica: null` ou `efeito: "outro"` **não é simulado** e aparece no log como tal.
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

- **Tabelas 3.0** em `js/rules/tables30.js`, pelo SRD 3.0:
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
| **E4 Personagens** | Tabelas de armas e armaduras, kit por classe, `fichas.equipamento`, adaptador de `computeSheet`, talentos e habilidades de classe |
| **E5 Arena** | Tela `#/arena` (montar a luta, luta passo a passo com log), rota antes das genéricas, item no menu lateral e atalho a partir da ficha e da lista |
| **E6 Lote** | Simular N vezes sem travar, com o painel de resultados |
| **E7 Magias** | Lista curada com números do SRD 3.0, espaços por dia, IA dos conjuradores |
| **E8 Ficha** | Blocos de arma, armadura e escudo preenchidos, e CA e ataques com o equipamento |

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
- **Alcance das magias:** considerado suficiente, salvo toque (precisa chegar ao alvo) e áreas que saem do conjurador (anda antes, se der).
- **Agarrar (3.0, simplificado):**
  - agarrar aprimorado faz o teste resistido ao acertar (contra alvo até `tamanho_max`, por padrão uma categoria menor);
  - quem agarra usa o turno para apertar (dano do agarrar aprimorado e da constrição; sem eles, 1d3 + For) ou para engolir;
  - quem está agarrado tenta escapar (se tiver 30% de chance ou mais) ou ataca quem o agarra;
  - os dois perdem a Des na CA contra os outros;
  - não há o modo de segurar só com a parte do corpo (−20).
- **Engolido:** leva o dano do estômago no início do turno de quem engoliu. Ataca a CA interna e, ao somar o dano para sair, escapa. Esse dano não tira PV do monstro (o texto 3.0 fala em dano "ao estômago"), e a capacidade do estômago não é limitada.
- **Olhar (medusa):** quem está ao alcance testa no início do seu turno; ninguém desvia o olhar.
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
- **IA:**
  - compara o dano esperado de cada opção (golpes, sopro, magia, engolfar, esmagar), descontando RD, imunidade e resistência;
  - cura quem está abaixo de 50% dos PV;
  - reforça na 1ª rodada se não há inimigo ao alcance;
  - usa o sopro com 2 ou mais alvos ou na 1ª rodada.
  - Sozinha, não repete no mesmo alvo, em rodadas seguidas, um controle curto que não tira PV (ex.: Blasfêmia que só deixa pasmo). Sem isso, trancaria o alvo para sempre sem nunca derrubá-lo.

**Validação:**
- `tests/ded_make_character_combate.test.js`: 20 testes com os dados fixados. Cobrem a lista do §9 e mais: Blasfêmia só contra não malignos, presença aterradora (imunidade depois do teste; morto-vivo imune), veneno secundário 10 rodadas depois, vorpal, nomes repetidos numerados e todo o catálogo lutando sem erro.
- **Varredura:** os 34 combatentes do catálogo, cada um contra cada um (1.156 lutas), terminam sem erro. Só uma luta chega ao limite de 50 rodadas: Lisandra × Lisandra, duas druidas de pouco dano que se curam.

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
