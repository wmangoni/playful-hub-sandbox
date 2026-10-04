# 🧠 Tarefa 009 - D&D Make Character: IA de combate com rede neural

**Status**: 🚀 Dev Complete — as 6 etapas prontas; a IA treinada entra na Arena como "experimental" (passou em 4 dos 5 critérios do §7; §12)
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-ia-rede-neural`
**Depende de**: TASK_006 (motor e Arena), TASK_007 e TASK_008 (catálogo atual)

---

## 🔍 1. Pedido do usuário (03/10/2026)

> As decisões numa luta de D&D 3 são inúmeras e difíceis, principalmente para o mago e outras classes que usam magia ou têm poderes peculiares, que podem mudar o rumo da luta. Elabore um plano para criar e treinar uma rede neural simples que tome as decisões de uma luta, usando a simulação de 2.000.000 de lutas. Se for melhor ter uma rede por tipo de classe (uma para guerreiros e derivados, só ataque bruto; outra para quem luta à distância, usa magia ou outras habilidades), separe o treinamento.

## 🧭 2. Como a IA decide hoje

`decidir()` (`js/rules/combat30.js`) faz, a cada turno:

1. **Escolhe o alvo antes da ação** (`escolherAlvo`): o mais perto, ou o mais fraco entre os que alcança. Quem tem tática de "conjurador" prefere conjuradores.
2. **Lista as opções só contra esse alvo:**
   - as de `SP.options`: curas, inspirar, reforços, magias, sopro, engolfar, esmagar, atropelar;
   - as de `acaoArmada`: ataque total, ataque único, investida, mover.
3. **Ordena por `prioridade` fixa e depois pelo `ev`** (o dano esperado, em "PV do alvo"). Empatando nos dois, vale a ordem em que as opções foram listadas.
   - **Prioridades:**
     - curar: 5, só quando há um aliado abaixo de 50% dos PV;
     - inspirar: 3;
     - sopro: 2, na 1ª rodada ou com 2 alvos ou mais;
     - reforço: 1, nas rodadas 1 e 2 e sem inimigo ao lado;
     - engolfar: 1.
   - **Condições valem por constantes feitas à mão** (`valorCondicao`):
     - matar vale 1,5 × o PV do alvo;
     - tirar da luta por 3 rodadas ou mais vale 0,8 × o PV;
     - abaixo disso, vale pelo dano que o alvo deixaria de causar, e só ¼ disso se não houver aliado para aproveitar.

**O que ela não enxerga:**

| Limitação | Exemplo |
|---|---|
| O alvo vem antes da ação | Se o alvo escolhido não é humanoide, Imobilizar Pessoa nem é considerada contra os humanoides do grupo inimigo. |
| Prioridades fixas | Cura sempre vence atacar, mesmo quando o inimigo cairia com o próximo golpe. |
| Não conhece certos perigos e defesas | Ataca o Paladino sem saber da Retribuição (TASK_007 §3). Contra o troll, compara espada e fogo sem contar a regeneração. |
| Não coordena o grupo | Cada um escolhe o alvo sozinho; não existe "todos no conjurador inimigo". |
| Gasta sem critério | O `ev` não tem teto no PV do alvo: a magia de maior dano vence, mesmo que uma menor bastasse para derrubá-lo. |

Há espaço para melhorar. Numa medição do revisor, em confrontos equilibrados, seguir a 2ª opção da heurística deu em média 1,8 ± 0,9 p.p. a mais de vitória do que seguir a 1ª.

## 🎯 3. Decisões

O usuário aprovou as propostas abaixo em 03/10/2026 ("Pode seguir com o recomendado").

| Tema | Proposta | Por quê |
|---|---|---|
| **Quantas redes** | **Duas**: *marcial* (só armas e armas naturais, corpo a corpo **ou à distância**) e *recursos* (magias e poderes). No E4, comparo com uma rede só, que recebe o perfil como entrada, e fica a melhor. **Resultado:** as duas foram treinadas e ganharam da única; na Arena vai só a de recursos, porque a marcial não ganhou nada no teste (§12, E5). | Ver §4.2. O arqueiro fica na marcial porque, no motor, ele decide o mesmo que o guerreiro. Uma rede só de poderes teria só 9 fichas do catálogo. |
| **O que a rede faz** | Dá uma nota a cada ação **legal** que o motor lista, e a maior vence. | Não inventa ação nem quebra regra: o motor continua aplicando a 3.0. |
| **Como aprende** | Por ramificação (§6.1): a luta para numa decisão, segue por 4 caminhos que só diferem nessa escolha, e a rede aprende qual deles vence mais. Depois, mais 2 gerações. | Comparar caminhos a partir do mesmo ponto isola o efeito da escolha, também em grupo. Copiar a heurística só a igualaria. |
| **Lutas** | 2.000.000 no total: 1.200.000 na geração 0 e 400.000 em cada uma das gerações 1 e 2. | É o número pedido. Gerar as lutas leva menos de 1 hora (§5.4). |
| **Quem luta** | As 74 fichas do catálogo e personagens sintéticos montados pelas regras do próprio app (§5.1). Os confrontos são equilibrados pelo resultado, não pelo ND (§5.2). | Com só 74 fichas, cada par se repetiria umas 365 vezes. E equilibrar pelo ND descartaria quase todo Paladino e Tarrasque, que são o que mais interessa. |
| **Onde treina** | O Node gera as lutas (o motor é JS). O PyTorch treina, e os pesos saem em JSON. A inferência roda em JS puro, no navegador. | O PyTorch 2.5.1 com CUDA já está instalado, e há uma GTX 1660 Super: o treino leva minutos, sem backprop escrito à mão. O Python fica só nas ferramentas de desenvolvimento, e o app e o CI não dependem dele. |
| **Na Arena** | Um seletor por lado, "IA: clássica / treinada". O padrão continua sendo a clássica até a rede passar na avaliação (§7). | Assim dá para pôr uma IA contra a outra. |

## 🏗️ 4. Arquitetura

### 4.1 Ponto de decisão no motor

- **Cada lado tem a sua política:** `createBattle({ …, politicas: { A, B } })`. O padrão é a clássica nos dois lados.
- **A política clássica não muda de caminho:** chama o gerador de opções só para o alvo de `escolherAlvo`, como hoje, com a mesma ordem e o mesmo desempate. Na Arena, ela não custa nada a mais.
- **A política "rede" usa `candidatas(b, c)`**, todas as ações legais contra todos os alvos válidos:
  - **Os mesmos geradores de hoje:** chama `SP.options` e `acaoArmada` uma vez para cada alvo, sem reescrevê-los. Assim um especial novo entra nas duas políticas.
  - **Sem repetição:** as opções que não dependem do alvo (curas, inspirar, reforços, engolfar, esmagar, atropelar) voltam iguais a cada chamada. Elas são deduplicadas por chave.
  - O "mover" de reserva também entra, para o caso em que nada mais alcança.
  - **Cada candidata leva `origem` e `ordem`,** e a escolha da heurística vai sempre junto e marcada.
  - **Teto de 32 candidatas** por uma pré-nota barata (prioridade e `ev` normalizado), sempre com a escolha da heurística entre elas.
  - O `evDano` de cada magia é calculado uma vez por alvo e reaproveitado.
- **Listar não pode mudar nada:**
  - Hoje o `ev` já é calculado sem rolar dados.
  - `planejarArea` move `c.pos` e devolve; `_controle` e `_inspirou` só mudam na execução.
  - Num protótipo do revisor, listar as opções contra todos os alvos antes de cada decisão deixou o registro idêntico em 1.369 lutas 1 × 1 e 2.000 lutas 3 × 3.
  - Um teste mantém isso: a semente não avança e o registro não muda.
- **Continuam com a heurística, fora da rede:**
  - as ações livres (fúria, sopro livre, dirigir a esfera);
  - os turnos forçados (agarrado, engolido, confuso);
  - quanto pôr no Ataque Poderoso;
  - a troca de alvo e o Trespassar dentro da sequência de golpes.

### 4.2 Perfis e as duas redes

`perfilDe(ficha)` decide qual rede um combatente usa. É calculado sobre a ficha **montada**, não sobre a classe: um paladino sem magias mas com cura pelas mãos é "recursos", e um bardo sem Atuação 3 (sem inspirar) é "marcial".

| Perfil | Quem | No catálogo | Decisões |
|---|---|---|---|
| **marcial** | Só ataques com armas ou armas naturais, corpo a corpo ou à distância. Os especiais passivos (agarrar, engolir, veneno, rasgar) disparam sozinhos. | 36: ogro, troll, Tarrasque, Tork, Sandro, Lisandra Guerreira Insana… E os PJs guerreiro, bárbaro, ladino e monge. | Em quem bater; ataque total, investida ou andar; corpo a corpo ou à distância. |
| **recursos** | Tem lista de magias ou algum poder ativo: sopro, habilidade similar a magia, engolfar, esmagar, atropelar, cura pelas mãos, inspirar coragem. | 38, em dois grupos (abaixo). E os PJs mago, feiticeiro, clérigo, druida, bardo, paladino e ranger com magias. | Tudo o que a marcial decide, mais: qual magia ou poder, em quem, quando gastar, curar ou atacar, reforçar ou não. |

- **Os 38 de recursos no catálogo:**
  - 29 com lista de magias que o motor conjura (Zed tem uma só, sem mecânica, e luta como marcial): os 3 dragões, Niele, Nekapeth, Tarso, o Avatar, 4 formas do Paladino…;
  - 9 só com poderes: cubo gelatinoso, behir, golem de ferro, glabrezu, lorde das profundezas, balor, Helena, Paladino Desperto e Paladino de Arton.
- **Por que o atirador não ganha rede própria:**
  - No motor, a distância é um número só (TASK_006), e não existe a ação "recuar": `mover` só aproxima.
  - O arqueiro decide em quem atirar e se chega mais perto, exatamente como o guerreiro decide em quem bater. A ação "ataque à distância" entra como uma entrada da rede marcial.
  - Se o motor ganhar "recuar" e "manter distância" (§9, E7), uma terceira rede para o atirador volta a fazer sentido.
- **Por que magias e poderes ficam juntos:**
  - Só 9 fichas do catálogo têm poderes sem lista de magias, e uma rede só delas decoraria essas 9.
  - O sopro do dragão e a Bola de Fogo do mago são o mesmo tipo de decisão: área, dano, teste, recurso limitado. As entradas (§4.3) descrevem a diferença, como a recarga de 1d4 rodadas do sopro e o espaço de magia.
- **Híbridos** (paladino com magias, bardo, dragão feiticeiro) usam a rede de recursos, que também avalia os ataques com arma.
- **Grupo misto:** cada combatente usa a rede do seu perfil. Cada exemplo de treino vai para o conjunto do perfil de quem decidiu.

### 4.3 Entradas da rede

São números de tamanho fixo e normalizados, tirados do estado da luta, nunca dos dados ainda não rolados. **A rede nunca vê o nome da magia ou da criatura, só o que elas fazem**: é isso que a deixa decidir bem com uma ficha que não viu no treino.

- **Estado (49 entradas na E2), calculado uma vez por decisão:**
  - **Quem decide:**
    - PV% e PV (em escala log), CA, ataque, Fortitude, Reflexos e Vontade, RD, RM;
    - as condições que pesam (cego, lento, abalado…); quantos reforços e enfraquecimentos estão ativos, e a fúria. Agarrado, agarrando e engolido não entram: esses turnos são do motor, sem decisão;
    - recursos: fração dos espaços (ou magias da lista) restantes nas faixas 0–3, 4–6 e 7–9, poderes prontos, sopro pronto ou recarregando;
    - a rodada e a distância ao inimigo mais perto.
  - **Aliados, somados:** quantos de pé, PV% do grupo, ameaça (dano médio por rodada), quantos conjuradores.
  - **Inimigos, somados:** o mesmo, mais a maior ameaça individual e o menor PV.
  - As contagens entram com teto de 10, para que um 10 × 10 não fique fora da faixa do treino.
- **Ação (51 entradas na E2), uma vez por candidata:**
  - **Tipo:** ataque total, ataque único, investida, andar, andar e atacar, magia de dano, de controle, de reforço ou de cura, sopro, engolfar, esmagar ou atropelar, inspirar.
  - **O que a heurística acha dela:** `ev` (dividido pelo PV do alvo e pelo PV inimigo somado), `prioridade` e se é a escolha da heurística. A rede começa sabendo o que a IA de hoje sabe e aprende onde ela erra.
  - **Efeito:** quantos inimigos e aliados atinge, se há teste e a chance de o alvo falhar nele, categoria da condição (fora da luta, sem ação ou penalidade), duração, dano médio, quanto anda antes.
  - **Custo:** nível do espaço sobre o maior espaço que o combatente tem; se gasta um uso de poder; recarga.
  - **Alvo:**
    - PV%, ameaça, a CA contra este golpe (com reforços e condições), se é conjurador;
    - se cai com o dano médio de quem acerta (`derruba_se_acertar`, sem a RD que a arma não vence) e se já está sob controle;
    - chance de falha por camuflagem;
    - marcadores do que a heurística ignora: Retribuição, regeneração, imunidade a magia, reflexão de magia (o Tarrasque), ataque furtivo possível neste golpe (como no motor: arma contra quem está sem a Destreza; à distância, até 9 m);
    - **coordenação:** quantos aliados agem antes do próximo turno do alvo e o alcançam com armas, e o dano esperado deles nesse alvo. Sem isso, quatro aliados escolheriam "derruba se acertar" no mesmo alvo.
- **Versão da codificação:** `versaoEntradas` vai junto com os pesos. Se o motor mudar as entradas, a rede antiga é recusada e a luta volta à IA clássica, com um aviso.

### 4.4 A rede

- **"Simples", como pedido:** um perceptron de 2 camadas escondidas, 100 entradas (49 do estado e 51 da ação) → 128 → 64 → 2 saídas, com ReLU. São uns 21 mil pesos por rede, um JSON de ~150 KB.
- **Duas saídas:**
  - **P(vitória)** do lado de quem decide: sigmoide, com perda de entropia cruzada.
  - **Margem:** a "saúde" do próprio lado menos a do outro.
    - Saúde de um lado = média, entre os membros, de max(0, PV − contusão) / PV máximo. Quem não pode lutar conta 0. Assim o troll derrubado por contusão não conta como inteiro.
    - Soma-se um pequeno bônus por acabar mais cedo, e o resultado é limitado a [−1, 1]. Saída em tanh, com erro quadrático.
  - **Nota da ação** = P(vitória) + 0,1 × margem.
  - **Por que a margem:** quando a vitória já é certa (ou a derrota), P(vitória) é igual para toda ação, e a rede escolheria ao acaso. A margem a mantém jogando bem: derrubar mais rápido, perder menos PV, não desperdiçar a magia grande.
- **Custo:**
  - A primeira camada é separada em parte do estado (calculada uma vez por decisão) e parte da ação (uma por candidata).
  - Medido na E2 (§12): a decisão com a rede custa ~0,4 ms no 1 × 1 e no 3 × 3 e ~0,8 ms no 10 × 10, contra 0,09 a 0,18 ms da clássica.
- **Margem sobre a heurística:** a rede só troca a escolha da heurística se a melhor nota passar a dela por δ, de 1 a 2 p.p., calibrado no E4. Isso protege contra a nota alta de uma candidata superestimada (a "maldição do vencedor").
- **Empate:** desempata pela ordem da heurística, para a mesma semente dar a mesma luta.

## 🎲 5. As 2.000.000 de lutas

### 5.1 Quem luta

- **Catálogo:** as 74 fichas (20 monstros e 54 de Holy Avenger).
- **Personagens sintéticos** (`tools/ia/personagens-sinteticos.mjs`), montados pelo mesmo caminho da Arena (`computeSheet` → `fromPersonagem`), uns 5.000 diferentes:
  - **Base:** sorteia classe (as 11 básicas), raça, nível de 1 a 20 e atributos (compra de pontos).
  - **Talentos:** 2 a 4 de combate, conforme a classe (Ataque Poderoso, Trespassar, Esquiva, Tiro Certeiro…).
  - **Equipamento:** `kitPadrao` com melhoria de +⌊nível/4⌋ (até +5) na arma e na armadura. O kit sozinho dá itens +0, e um guerreiro 16 com espada comum fica muito abaixo do nível.
  - **Magias:** `magiasPadrao`, com troca aleatória dentro das 22 magias curadas.
  - **Bardo:** sempre com Atuação 3 ou mais, para poder inspirar.
  - **Limite conhecido:** a lista curada vai só até o 5º nível de magia. Um mago 20 sintético conjura bem menos do que o da regra, e o conjurador de alto nível vem principalmente do catálogo.
- **Variação de PV:** em metade das lutas, os PV do catálogo são rolados pelos dados de vida em vez de usar a média, para a rede não decorar "o troll tem 63 PV".
  - Os PV, a distância e a composição dos lados saem da semente do confronto, nunca de um gerador que corre dentro do worker. Senão, os caminhos de uma ramificação (§6.1) começariam diferentes.
- **Reservados para o teste (estratificado):**
  - **15 fichas do catálogo,** sorteadas com duas regras:
    - nunca a única portadora de um tipo de ação (cubo, Tarso, Tarrasque, balor) ou de uma mecânica de magia (que repete, persistente, contínua). Das 3 fichas com Produzir Chamas (as duas Lisandras druidas e Razlen), pelo menos 2 ficam no treino. Das 4 com ataque furtivo (Anne, Leon Galtran, Camaleão e o Avatar), pelo menos 3, porque o ladino, o único PJ que tem, está reservado;
    - no máximo 1 Paladino.
  - **As fichas sintéticas de 2 classes, fixadas agora:**
    - **ladino** (marcial). O bárbaro testaria pouco, porque a fúria fica fora da rede.
    - **feiticeiro** (recursos). Ele usa as mesmas magias do mago, e reservá-lo não tira nenhuma magia do treino. O druida tiraria Pele de Árvore e Produzir Chamas, que entre os PJs só ele tem.

  Nenhuma delas entra no treino. É com elas que a avaliação mede se a rede generaliza (§7). A lista das 15 sai no E3 e fica registrada nesta TASK.

### 5.2 Confrontos equilibrados pelo resultado

Equilibrar pelo ND não serve. Numa medição do revisor, 63% dos pares 1 × 1 do catálogo com ND ±2 deram o mesmo vencedor nas 10 lutas:

| Ficha | Pares com ND ±2 | Pares descartados |
|---|---|---|
| Paladino Desperto | 7 | 6 |
| Tarrasque | 7 | 6 |

E as fichas de ND acima de 20 quase não têm par:

| Ficha | Pares com ND ±2 | Pares descartados |
|---|---|---|
| Paladino de Arton | 2 | 2 |
| Paladino Matador de Dragões | 3 | 3 |
| Paladino Completo | 1 | 1 |
| Paladino Avançado, Paladino Extremo, Tarso | 0 | — |

Por isso, cada confronto é montado assim:

1. **Sorteia um lado "âncora":** 1 a 4 fichas, com cotas mínimas por ficha do catálogo e por mecânica rara (Retribuição, regeneração, engolfar, atropelar, reflexão de magia, explosão ao morrer).
2. **Monta o outro lado** com fichas do catálogo ou personagens sintéticos.
3. **Pré-teste:** 16 lutas rápidas com a heurística. Se a vitória do lado A ficar fora de 20% a 80%, o lado mais fraco é ajustado (mais membros, até 10; nível dos sintéticos; distância), em até 6 tentativas.
   - O Paladino Extremo (ND 55), por exemplo, acaba contra um grupo grande de fichas de ND alto.
   - A vitória do pré-teste fica gravada e é ela que define a faixa de 20% a 80% da avaliação (§7). Usar as sementes da própria avaliação para escolher a faixa enviesaria as bordas (regressão à média).
4. **Os que não equilibram:** 10% a 20% deles ficam mesmo assim, para a cabeça de margem aprender a jogar bem com vitória certa. O resto é trocado.
5. **10 pontos de ramificação por confronto** (§6.1), cada um com uma semente diferente:
   - na G0, são 30.000 confrontos; na G1 e na G2, 10.000 cada;
   - os pré-testes, com os ajustes e as remontagens, somam umas 72 lutas rápidas por confronto (uns 4 M nas três gerações), que não contam nas 2 M. Param em 8 lutas quando as 8 dão o mesmo vencedor;
   - na E3, montar e equilibrar um confronto levou ~250 ms numa thread. O tempo real está no §12.

- **Tamanho dos lados:**
  - 35% de 1 × 1 (antes do ajuste);
  - 35% de grupos de 2 a 4 personagens contra monstros;
  - 20% de grupos mistos de 2 a 4;
  - 10% de grupos grandes, de 5 a 10 por lado (a Arena aceita 10).
- **Pelo menos 80% dos confrontos** têm alguém do perfil recursos. Cada confronto dá 10 pontos, e só assim 70% dos pontos ficam em decisões de recursos (§6.1).
- **Distância** sorteada de 1,5 a 30 m. Limite de 50 rodadas, como na Arena.

### 5.3 O que se grava

- **Por ponto de ramificação (§6.1):** perfil, entradas do estado e de cada uma das 4 ações, e o resultado de cada caminho (vitória, margem, rodadas).
- **Exemplos extras da política:** as decisões que seguem π até o fim, com o resultado do caminho delas (§6.1, item 6).
- **Por confronto:** as fichas, o resultado do pré-teste e a semente. Dá para refazer qualquer exemplo.
- **Volume:**
  - ramificação: 2 M caminhos × ~109 números × 4 bytes, uns 900 MB;
  - exemplos extras: ~8 por caminho (metade das decisões de recursos e 1 em 6 das marciais), uns 16 M, ou ~7 GB.
- **Onde:** os dados ficam no D: (1,1 TB livres), fora do repositório. O C:, onde fica a pasta temporária, tem só 2,8 GB livres. Nada disso vai para o git.

### 5.4 Tempo

- **Medido hoje, numa thread:** 1.545 lutas por segundo no 1 × 1 (4,4 decisões por luta) e 706 no 3 × 3 (13 decisões).
- **Paralelismo:** a máquina tem 6 núcleos físicos (12 threads). O gerador usa 10 `worker_threads`, que rendem umas 7 vezes uma thread.
- **Geração 0:** a heurística decide, mas o caminho 0 lista as candidatas em toda decisão (para anotar o ponto), cada caminho alternativo refaz a luta até o ponto, e há o pré-teste. Medido na E3: ~0,54 s por confronto numa thread, ou ~70 minutos para os 37.000 confrontos (1.200.000 lutas) com 10 workers. A estimativa inicial (7 a 8 minutos) só contava as lutas.
- **Gerações 1 e 2:** a rede decide tudo, a ~0,4–0,8 ms por decisão. Estimativa: 40 a 60 minutos cada.
- **Treino** na GPU: minutos por rede. Cabe com folga em 32 GB de RAM e 6 GB na GPU.

## 🏋️ 6. Treino

### 6.1 Ramificação: como uma luta vira exemplo

1. **Joga até o ponto:** a luta é jogada pela política atual, π, até uma decisão sorteada de um combatente com 2 candidatas ou mais. 70% dos pontos ficam em decisões do perfil recursos.
2. **Ramifica:** dali saem K = 4 caminhos. Se houver 4 candidatas ou menos, entram todas. Senão:
   - **caminho 0:** a escolha de π;
   - **G1 e G2:** a escolha da heurística, quando difere da de π. Assim ela continua sendo testada mesmo que a rede a subestime;
   - **uma candidata sorteada uniformemente** entre todas, para que as do fim do ranking também sejam testadas. Com só o ranking, as posições da 8ª em diante apareceriam em 13% dos pontos;
   - **o resto, pelo ranking:** posição sorteada sem repetição, com p ∝ e^(−posição/τ) e τ = 2. Na G0 o ranking é a pré-nota (§4.1), porque a heurística não ordena alvos diferentes entre si; na G1 e G2, é a nota da rede.
   - Cada caminho segue com π até o fim e conta como uma luta do orçamento.
3. **Mesmo ponto de partida:** o motor é determinístico dadas a semente e as decisões. Refazer a luta até o ponto reproduz o mesmo estado.
   - Num protótipo do revisor, nenhum de ~9.500 replays divergiu.
   - O estado do gerador de dados (`dice.js`) fica numa closure e não dá para clonar, por isso a luta é refeita em vez de copiada.
   - Como a única escolha diferente entre os caminhos é a do ponto, a diferença de resultado vem dessa escolha, também em grupo: os aliados de quem decidiu jogam como π nos 4.
4. **O que a rede aprende:** Q^π(s, a), a chance de vitória (e a margem) ao fazer a e depois jogar como π.
   - Escolher o maior Q^π é um passo de melhoria de política. Na G0, π é a heurística, e a rede v1 melhora sobre ela.
   - A garantia vale para **um** combatente trocando de política. Na Arena, o lado inteiro troca ao mesmo tempo, e as entradas de coordenação (§4.3) existem para isso.
   - Isso evita o problema de sortear escolhas ao longo da luta inteira: o rótulo mediria uma política pior que a heurística, e a rede só aprenderia a superar essa política pior.
   - Cada caminho é uma amostra honesta de Q^π(s, a), seja qual for o jeito de sortear a ação. Onde o sorteio cobre pouco, a rede extrapola, e a margem δ (§4.4) protege a escolha final.
5. **Sorteios fora da luta:** o ponto e as alternativas são sorteados com um gerador próprio, gravado, nunca com o `b.rng` da luta.
6. **Ruído:**
   - **O que o revisor mediu:** 2.826 pontos em 150 confrontos equilibrados, comparando a 1ª e a 2ª opção.
     - A diferença entre os dois caminhos tem desvio-padrão de 0,48, e só 24% dos pares terminam diferentes.
     - Para separar 2 p.p. seriam precisos uns 2.300 pares por situação parecida. Com os ~210 mil pontos de recursos da G0, a rede aprende os efeitos grandes, não os ajustes finos.
     - Os dados se descasam já no golpe seguinte ao ponto: os caminhos compartilham o estado, mas não a sorte.
   - **O que se faz:**
     - **Um fluxo de dados por combatente**, só no gerador, numa opção do motor. Os dados continuam uniformes e independentes, então o Q aprendido é o mesmo em média, e a Arena e o E1 não mudam. No protótipo, o desvio-padrão caiu de 0,48 para 0,40 (−31% de variância).
     - **Exemplos extras de Q^π(s, π(s))**, sem custo:
       - as decisões do caminho 0, antes e depois do ponto;
       - as decisões depois do ponto nos outros caminhos.

       Isso dá umas 10 vezes mais dados sobre o valor dos estados. Ficam de fora:
       - as decisões antes do ponto nos caminhos 1 a 3, porque o desvio vem depois delas;
       - na G1 e na G2, as decisões do adversário que joga com a heurística, porque estimam o valor de outra política.

       No treino, cada lote tem metade de exemplos de ramificação e metade de extras. Sem isso, os extras, ~7 vezes mais numerosos, dominariam a perda.
     - **Portão no E4** antes da G1 (§6.3). Se o ruído impedir a melhoria, o E4 ajusta K e o número de pontos dentro do mesmo orçamento, por exemplo 2 caminhos por ponto e o dobro de pontos.

### 6.2 Gerações (iteração de política)

| Geração | Lutas | Pontos × caminhos | π | Treino |
|---|---|---|---|---|
| G0 | 1.200.000 | 300.000 × 4 | a heurística | rede v1 |
| G1 | 400.000 | 100.000 × 4 | v1 | rede v2: G1 com peso 1 e G0 com 0,3 |
| G2 | 400.000 | 100.000 × 4 | v2 | rede v3: G2 com 1, G1 com 0,3, G0 com 0,1 |

- **20% dos confrontos da G1 e da G2:** o lado adversário usa a heurística, sem ramificar. Isso evita que a rede só aprenda a vencer a si mesma.
- **Pesos das gerações:** misturar gerações mistura os Q de políticas diferentes, e por isso as anteriores pesam menos. O E4 também testa treinar só com a geração mais nova.
- **Parada:** se uma geração não melhorar pelas medidas de §6.3, o treino para ali e fica a melhor.

### 6.3 Separação e otimização

- **Separação por confronto:** os dados se dividem em grupos de confronto (GroupKFold), nunca por luta. Cada confronto roda várias vezes com as mesmas fichas, e separar por luta deixaria a validação medir só se a rede decorou o par.
  - **Treino:** 85% dos confrontos.
  - **Validação:** 15% dos confrontos. Serve para a parada antecipada e para escolher a geração.
  - **Teste:** as fichas reservadas (§5.1), só na avaliação final (§7).
- **Otimização:**
  - Adam, lotes de 4.096, até 10 épocas, parando quando a validação piora;
  - perda = entropia cruzada (vitória) + 0,5 × erro quadrático (margem).
- **Como medir se melhorou:** a perda **não** serve para comparar gerações. Os rótulos de cada uma medem uma política diferente (o Q da heurística, o de v1, o de v2), e perda menor não quer dizer escolha melhor. Duas medidas, em ordem:
  1. **Melhoria fora da luta**, com os dados de ramificação da validação: em cada ponto, o resultado do caminho que a rede escolheria entre os 4, menos o do caminho 0. É uma estimativa sem viés, porque os caminhos foram sorteados sem olhar os resultados deles. Vem com intervalo de confiança.
  2. **Espelho nos confrontos de validação** (fichas do treino, nunca as reservadas), como em §7.
- **Portão da G1:** só se gera a G1 se o intervalo da melhoria fora da luta da v1 ficar acima de 0.
- **Uma rede contra duas (§3)** e a escolha de δ (§4.4) usam as mesmas duas medidas.
- **Exportação:** `rede-marcial.json` e `rede-recursos.json` na pasta de saída do treino (a Arena leva só a de recursos para `data/ia/`, §12), com:
  - os pesos;
  - a média e o desvio de cada entrada (normalização);
  - `versaoEntradas` e a geração;
  - as sementes usadas.
- **Paridade:** um teste confere que a inferência em JS dá o mesmo que o PyTorch em 100 vetores fixos, com tolerância de 1e-4.
- **Reprodutível:** `tools/ia/` tem os scripts (gerar, treinar, avaliar), com sementes fixas. Se o motor mudar, basta rodar de novo: umas 3 a 4 horas no total (as três gerações, o treino e a avaliação).

## 📏 7. Avaliação (o que decide se a rede entra)

- **Medida principal, o "espelho":**
  - Para cada confronto X × Y, rodam 200 lutas com X na rede e Y na heurística, e as mesmas 200 sementes com os dois na heurística. O ganho é a diferença na vitória de X.
  - As sementes iguais **reduzem** o ruído, mas não o eliminam: depois da primeira decisão diferente, os dados se descasam. O revisor mediu um erro-padrão de 2,4 p.p. por confronto, contra 4,3 p.p. com lutas independentes. O espelho usa o fluxo de dados por combatente (§6.1), que reduz mais um pouco.
  - **Três modos:** só a rede de recursos ligada, só a marcial, e as duas. Em grupo misto, as duas agem no mesmo lado, e só assim dá para saber de qual veio o ganho.
- **Conjunto de teste:**
  - 500 confrontos com as fichas reservadas, montados como em §5.2;
  - os confrontos que você já usa na Arena: Paladino × Tarrasque, Mestre Arsenal, Nekapeth, as formas entre si…
- **Ganho médio:** é calculado só nos confrontos com vitória de base entre 20% e 80%, pela vitória do **pré-teste** (§5.2), que usa outras sementes. Quem já vence ou perde sempre quase não tem como mostrar ganho, e diluiria a média.
- **Perda num confronto, em duas etapas:**
  1. **Suspeito:** a estimativa das 200 lutas fica abaixo de −5 p.p.
  2. **Confirmado:** o suspeito roda de novo com 2.000 sementes **novas**, e a perda é confirmada quando o limite superior do intervalo unilateral de 95% fica abaixo de −5 p.p., com a correção de Benjamini–Hochberg entre os suspeitos.

  Com só 200 lutas, o ruído (2,4 p.p.) daria uns 10 suspeitos falsos em 500 confrontos, e a correção sobre todos eles tiraria o poder de achar uma perda real. É a repetição que dá esse poder.
- **Critérios de aceite:**

  | Critério | Recursos | Marcial |
  |---|---|---|
  | Ganho médio nas fichas reservadas | ≥ +5 p.p. | ≥ 0 (não pode piorar) |
  | Confrontos com perda (pela regra acima) | nenhum | nenhum |
  | Empates por limite de rodadas | não sobem mais de 1 p.p. | idem |
  | Lote de 1.000 lutas na Arena | 1 × 1: até 3 vezes o tempo de hoje; 3 × 3: até 5 vezes. Na E2 (rede aleatória) a razão foi medida por decisão (2,3× e 3,6×), porque a rede aleatória alonga as lutas; o lote é medido com a rede treinada, na E5. | idem |

- **Leitura de registros:** leio 30 lutas de cada perfil procurando decisão sem sentido e bug do motor que a rede tenha aprendido a explorar. O que eu achar fica registrado nesta TASK.
- **Revisão:** o laço de revisores de sempre, no código e no relatório da avaliação, até aprovar.

## 🖥️ 8. Na Arena

- **Seletor por lado:** "IA: clássica / treinada".
  - Os pesos só são baixados (fetch do JSON) quando alguém escolhe "treinada".
  - Se falhar, a luta segue com a clássica e mostra um aviso.
- **"Por que" no registro:** na luta assistida, a decisão da rede mostra as 3 melhores candidatas, por exemplo:
  > Niele lança Bola de Fogo em Ogro 2 (rede: 71% de vitória; Mísseis Mágicos em Ogro 1, 64%; atacar Ogro 1, 52%).
- **Lote:** o resumo diz qual IA cada lado usou.
- **URL:** `ia=A:rede,B:classica` na query da montagem (`arena-setup.js`), para repetir a luta.

## 🗺️ 9. Etapas

| Etapa | O que | Como se valida |
|---|---|---|
| **E1** | Políticas por lado; `candidatas()` com todos os alvos, `origem`, `ordem` e teto; a clássica pelo mesmo caminho de hoje. | Um script versionado gera, no commit atual, o registro de referência: as 10.952 lutas 1 × 1 e mais 2.000 lutas em grupo (2 × 2 a 4 × 4, catálogo e PJs com `kitPadrao`/`magiasPadrao`, distância sorteada, sementes fixas). Depois da mudança, o registro tem de dar igual, comparado por `rodada\|ator\|tipo\|texto`. Mais: em toda decisão dessas 12.952 lutas, a escolha da heurística está em `candidatas()` com o mesmo tipo, alvo, `ev` e prioridade; listar não muda nada; e os testes atuais passam sem mudança. |
| **E2** | `js/rules/ia30.js`: perfis, entradas, inferência e a política "rede". Medição do custo por cenário, incluindo as entradas de coordenação (aliados × alvos), que pesam no 10 × 10. | Testes de entradas (sem rolar dados, determinístico), da inferência e da política com pesos de teste. |
| **E3** | Personagens sintéticos, montagem e pré-teste dos confrontos, reserva estratificada, a opção de um fluxo de dados por combatente e o gerador por ramificação em workers (`tools/ia/`). Medição do tempo real, incluindo calcular as entradas em quase toda decisão de π, para os exemplos extras. | Amostra conferida: ficha válida, cotas cumpridas, 20%–80% de vitória no pré-teste. Os caminhos do mesmo ponto têm o mesmo prefixo de registro, e o caminho 0 refeito dá o mesmo resultado final. Sem a opção nova, o motor dá o mesmo registro de antes. |
| **E4** | Treino em PyTorch, exportação, paridade JS × PyTorch, a comparação de uma rede contra duas e a calibração de δ. | Paridade, e o portão da G1: o intervalo da melhoria fora da luta da v1 acima de 0 (§6.3). |
| **E5** | Gerações G0, G1 e G2 e a avaliação; resultados nesta TASK. | Critérios do §7. |
| **E6** | Arena: seletor, pesos sob demanda, "por que" no registro e o lote. | Testes da Arena, E2E e navegador (desktop e 375 px). |
| **E7** *(opcional, depois)* | Ações novas para a rede aproveitar: recuar, manter distância, defesa total, lutar na defensiva. Cada uma precisa de uma regra na heurística também; depois, retreinar. | Igual a E5. Aqui uma rede própria do atirador passa a fazer sentido. |

## ⚠️ 10. Riscos

- **Decorar o catálogo:** são só 74 fichas. Os personagens sintéticos, os PV rolados e as fichas reservadas para o teste existem por isso.
- **Mecânicas raras com poucos dados:** a Retribuição existe em 6 fichas, e a regeneração em 3. As cotas de §5.2 garantem um mínimo de exemplos, e a avaliação mostra esses confrontos à parte.
- **Aprender bugs do motor:** se uma ação estiver forte demais por um erro de regra, a rede vai abusar dela. A leitura dos registros (§7) procura isso, e é também um jeito de achar bugs.
- **Pesos velhos:** mudar o motor ou o catálogo pode deixar a rede desatualizada. `versaoEntradas` recusa pesos de outra codificação, e o retreino são scripts de umas 3 a 4 horas.
- **Mesma semente, mesma luta:** a inferência é determinística no mesmo navegador. Entre navegadores, `Math.exp` e `Math.tanh` podem diferir no último bit, o que só mudaria a escolha num quase-empate de notas. O risco é desprezível, e a margem δ o reduz ainda mais.
- **Ruído alto por exemplo:** só 24% dos pares de caminhos terminam diferentes (§6.1). A rede deve aprender os efeitos grandes (alvo, área, quando curar) antes dos ajustes finos. O portão da G1 diz se isso basta.
- **Ganho pequeno no marcial:** com poucas escolhas, a heurística já acerta quase sempre: 47% das decisões no 1 × 1 têm uma candidata só. O ganho esperado está em recursos e no foco do grupo.

## 🚫 11. Fora do escopo

- O que continua com a heurística (§4.1): ações livres, turnos forçados, Ataque Poderoso, troca de alvo e Trespassar no meio da sequência de golpes.
- Aprendizado por reforço completo (PPO, DQN, autojogo contínuo): as 3 gerações por ramificação já dão o essencial com bem menos peças.
- Treinar no navegador.
- Rede que crie ações ou fale: ela só escolhe entre o que o motor lista.

## 📊 12. Andamento

### E1 — políticas por lado e `candidatas()` (pronta, aprovada na revisão)

- **Motor (`js/rules/combat30.js`):**
  - `createBattle({ politicas: { A, B } })`: cada política é uma função `(b, c, IA) → ação`. Sem ela, vale a IA clássica (`decidir`). `criarLote` e `simulate` repassam as políticas.
  - `IA` (congelado) traz `classica`, a escolha clássica, e `candidatas`, a função `candidatas()` (exportada), que lista as ações legais contra todos os alvos.
  - A IA clássica não mudou de caminho. `decidir` só foi separada em `opcoesContra` (as opções contra um alvo) e `ordemClassica`, que `candidatas()` reaproveita alvo por alvo, começando pelo alvo da clássica.
  - **Chave de cada candidata:** tipo, magia ou especial, alvo, área, golpes (nome, mão, bônus, dano e efeitos) e quanto anda. Duas regras evitam ações repetidas:
    - **Mesma magia, mesmo espaço:** vale uma ação só, mesmo vinda de duas linhas da lista. O clérigo, por exemplo, tem a cura preparada e a convertida, com o mesmo efeito.
    - **Área com os mesmos atingidos:** uma área que pega mais de um combatente vale pelos que pega, e centrada em outro inimigo, com os mesmos atingidos, é a mesma ação, porque a execução refaz a área.

    Na repetição, fica a primeira, que é a própria escolha da clássica. A candidata que vem igual de mais de um alvo fica com `origem` nula.
- **Registro de referência** (`tools/ia/registro-referencia.mjs`):
  - Gravado no commit 198a584, antes da mudança: 12.952 lutas em 12 s.
    - 10.952 lutas 1 × 1;
    - 2.000 em grupo, com fichas do catálogo e 99 personagens das 11 classes em 9 níveis, montados com o kit e as magias padrão por `tools/ia/personagens.mjs`.
  - O arquivo fica fora do repositório, em `D:\Users\Home\Documents\ded-ia-dados\referencia-e1.jsonl.gz`, com o commit no cabeçalho.
  - **Resultado:** 0 lutas diferentes com a IA clássica.
  - **Com `--eco`:** a política lista as candidatas antes de cada decisão e devolve a escolha clássica.
    - 0 lutas diferentes, ou seja, listar não muda nada;
    - em todas as decisões, a escolha clássica está entre as candidatas, marcada uma vez e idêntica: mesmo tipo, alvo, magia, espaço, especial, golpes, deslocamento, `ev` e prioridade.
  - O revisor gravou a referência de novo a partir de um `git archive 198a584` e chegou ao mesmo conteúdo.
- **O primeiro achado:** em 11 decisões de 2 lutas, a IA clássica fica parada embora haja o que fazer contra outro alvo. Nos dois casos, Helena escolhe o Tarrasque (o mais perto), contra quem o sopro não vale nada e que ela não alcança.
  - Em `grupo:616`, fica parada da rodada 4 à 8, enquanto o sopro no mago 12 valeria 82 PV.
  - Em `grupo:871`, da rodada 1 à 6, enquanto o sopro em Niele valeria 82 PV.
  - É a limitação "o alvo vem antes da ação" (§2), que a rede resolve.
- **Estresse:** uma política que sorteia qualquer candidata, nas 12.952 lutas.
  - 0 erros e 0 textos quebrados, com os 11 tipos de ação executados, muitas vezes contra um alvo diferente do que a clássica escolheu naquele turno.
  - 5,0 candidatas por decisão em média, e no máximo 73. O teto de 32 (§4.1) entra na E2.
- **Testes:** `tests/ded_make_character_ia.test.js`, 6 testes, sobre uma amostra de 303 lutas da referência que inclui as duas de Helena:
  - a política que devolve a escolha clássica dá a mesma luta;
  - eco, com as 11 decisões paradas;
  - candidatas com 1 e com 3 ogros, com curas e reforços iguais, a Coluna de Chamas uma vez só e um ataque contra cada um;
  - a chave não funde especiais nem magias diferentes, conferido no catálogo e em 33 personagens;
  - a política de um lado só e `simulate` com política;
  - política aleatória.

  Os testes do motor (53), da Arena (9), de magias (18), do catálogo (9) e do personagem (18) passam sem mudança, e o E2E `qa_ded_make_character` passa 40 de 40.

### E2 — perfis, entradas, inferência e a política "rede" (pronta)

- **`js/rules/ia30.js`** (navegador e Node):
  - **Perfil:** `perfilDe(ficha ou combatente)`.
    - No catálogo, 36 marciais e 38 de recursos. Zed tem uma magia só, sem mecânica, que o motor não conjura, e por isso luta como marcial.
    - Nos personagens, vale a ficha montada: o paladino com Car 12 ou mais (modificador positivo) é de recursos (cura pelas mãos), e o bardo 1 sem Atuação é marcial.
  - **Entradas:** `entradasDaDecisao(b, c, lista)` dá o estado (49 números, `NOMES_ESTADO`) e cada candidata (51, `NOMES_ACAO`), com as medidas calculadas uma vez por decisão.
    - Agarrado e agarrando ficaram de fora: esses turnos são do motor, sem decisão.
    - Na ação, `tem_teste` separa "sem teste" de "falha certa".
    - Pela revisão: o ataque furtivo só em golpe de arma (à distância, até 9 m), como no motor; `derruba_se_acertar` usa o dano médio de quem acerta (sem a RD que a arma não vence) contra o PV que resta, e não o `ev`; a CA do alvo é a do golpe (`caContra`, com reforços e condições); a duração das condições por DV vem de cada faixa; os poderes prontos seguem os usos do motor (a música de bardo dividida, inspirar uma vez por luta); a ameaça só conta o sopro e as habilidades prontas; a coordenação conta um golpe só para quem precisa andar e não conta quem está atordoado ou pasmo; os reforços ficam separados dos enfraquecimentos e da fúria.
    - A duração média é a da IA clássica (`duracaoMedia`, exportada de `combat30-specials.js`), sem cópia.
    - `VERSAO_ENTRADAS` = 1.
  - **Teto:** `limitarCandidatas` deixa até 32 candidatas pela pré-nota (prioridade + `ev` relativo ao alvo), sempre com a escolha clássica e na ordem original.
  - **Rede:** `criarRede(json)` valida o formato, a versão das entradas, os tamanhos e que todo peso, viés, média e desvio é número.
    - A primeira camada é separada em parte do estado (uma vez por decisão) e parte da ação; os vetores de trabalho são reaproveitados.
    - Um teste confere que dá o mesmo que a conta direta, com diferença abaixo de 1e-9.
  - **Política:** `politicaRede({ marcial, recursos }, { delta, max, aoDecidir })`.
    - Sem a rede do perfil, usa a escolha clássica.
    - Com ela, escolhe a maior nota, desempatando na ordem da clássica, e só troca a escolha clássica se a melhor nota passar a dela por `delta`.
    - `aoDecidir` recebe cada decisão; servirá ao "por que" no registro (E6). `escolherPelaRede` é a mesma escolha, exportada para o gerador (E3).
- **As entradas nas 12.952 lutas da referência**, calculadas em toda decisão:
  - 0 lutas diferentes, ou seja, as entradas não rolam dados nem mudam a luta;
  - 381.035 vetores, todos finitos (na revisão, com o teto: 464.333);
  - 32.944 decisões marciais e 47.924 de recursos com alguma candidata.
- **Custo** (`tools/ia/medir-custo.mjs`, rede aleatória do tamanho planejado; o revisor mediu 1,9×, 2,9× e 8,8× numa outra execução):

  | Cenário | Clássica, por decisão | Rede, por decisão | Razão |
  |---|---|---|---|
  | 1 × 1 | 0,18 ms | 0,41 ms | 2,3× |
  | 3 × 3 | 0,11 ms | 0,39 ms | 3,6× |
  | 10 × 10 | 0,09 ms | 0,81 ms | 9,4× |

  - Todos ficam abaixo de 1 ms por decisão.
  - A rede aleatória joga mal e alonga as lutas, então a razão por luta só será medida com a rede treinada, na E5. Os limites do §7 (3× no 1 × 1 e 5× no 3 × 3) se mantêm por decisão.
- **Testes:** 6 novos em `tests/ded_make_character_ia.test.js`, 12 no total, em ~4 s.
  - Perfis do catálogo e dos personagens.
  - Entradas: tamanho, números finitos, determinismo, e não mudar a luta numa amostra de 120 lutas.
  - Entradas montadas à mão, conferidas pelo nome: furtivo a 6 m e a 12 m e depois de o alvo agir, coordenação com a ordem de iniciativa forçada, sopro pronto e recarregando, espaços de magia depois de gastar um, teste da Bola de Fogo, e derrubar com golpe, com Mísseis Mágicos e com Sono (que não derruba).
  - Inferência dividida igual à conta direta, e formatos errados recusados (incluindo normalização de outro tamanho e viés que não é número).
  - Teto com a escolha clássica.
  - Política sem rede igual à clássica.
  - Política com uma rede feita à mão, que gosta de `ev`: em `grupo:616`, Helena sopra no lugar de ficar parada, ninguém fica parado tendo o que fazer, a mesma semente dá a mesma luta, e com `delta` enorme a luta é a da clássica.

### E3 — personagens sintéticos, confrontos e o gerador por ramificação (pronta; a G0 rodando)

- **`tools/ia/personagens-sinteticos.mjs`:** o personagem sintético de número n, sempre o mesmo.
  - Classe, raça e nível sorteados; atributos 4d6 sem o menor, com +⌊nível/4⌋ no principal.
  - 2 a 4 talentos de combate da classe, com os pré-requisitos simples (Trespassar depois de Ataque Poderoso, Especialização só do guerreiro 4+…) e a arma do kit como parâmetro.
  - O kit da classe com melhoria +⌊nível/4⌋ (até +5) nas armas e na armadura; as magias sorteadas por espaço (ou conhecidas) dentro da lista curada; o bardo com Atuação.
  - O mesmo número em outro nível mantém os outros sorteios: o equilíbrio sobe ou desce o nível de um sintético sem trocar o personagem.
  - Em 3.000 sintéticos (revisão): 0 erros de ficha, 891 Pequenos, e os talentos com efeito (Foco +1, Especialização +2, Iniciativa +4, Sucesso Decisivo 17–20).
- **`tools/ia/confrontos.mjs`:**
  - `reservaDeTeste`: 15 fichas do catálogo, determinísticas. Cada mecânica fica no treino em pelo menos 60% das fichas que a têm, e no máximo 1 Paladino sai. As reservadas: Milícia de Vectora, Vincent, urso-coruja, Lisandra ex-Druida, Tasha, Karin, Helena, Anne, gigante do gelo, Lisandra (Druida), Aspis, Tork Curado e Reequipado, Paladino Extremo, dragão de prata antigo e glabrezu.
  - `pvRolados`: em metade das vezes, os PV rolados pelos dados de vida, centrados nos PV da ficha. A revisão achou que, em 19 fichas de Holy Avenger, os dados de vida não trazem a Constituição nem o máximo do 1º nível, e a rolagem pura ficava até 42% abaixo (Tarso: 330 contra 569). A primeira G0 foi parada e refeita.
  - `montarConfronto` (formatos 35/35/20/10), `preTeste` (16 lutas, ou 8 se derem 8 a 0), `equilibrar` (até 6 ajustes: tirar ou pôr membros, mudar o nível de um sintético; a âncora nunca sai) e `confrontoDeTreino` (alguém de recursos em pelo menos 80%, e 15% dos desequilibrados ficam).
  - Medido em 1.658 confrontos (revisão): 0 fichas reservadas no treino, 94% equilibrados, pré-teste médio 0,502 (nenhum lado sempre mais forte), 75,7% dos pontos de recursos.
- **`tools/ia/ramificacao.mjs`:** o ponto de ramificação (§6.1).
  - O caminho 0 anota as decisões; a clássica decide sem calcular entradas. Os caminhos 1 a 3 refazem a luta até o ponto (o gerador confere o combatente e as candidatas no ponto e para com erro se a luta não se repetir) e as entradas do ponto saem do caminho 1.
  - Os extras são sorteados por decisão (metade das de recursos, 1 em 6 das marciais), sem o adversário clássico, sem o prefixo dos caminhos 1 a 3 e sem a própria decisão do ponto no caminho 0.
  - O motor ganhou `createBattle({ rngPorCombatente })`: as rolagens do turno de cada um saem do fluxo dele. Um teste confere que mudar a ação de A1 não muda a sequência de dados de B1. Desligado por padrão: a referência continua com 0 diferenças.
- **`tools/ia/gerar-lutas.mjs`:** os confrontos divididos entre os workers; por worker, `ramos-<w>.f32` e `extras-<w>.f32` (float32, as colunas em `resumo.json`) e `confrontos-<w>.jsonl`. A G0 usa os confrontos 0–36.999, a G1, 37.000–49.499, e a G2, 49.500–61.999.
- **Piloto (200 confrontos, antes da correção dos PV):** 6.560 ramos e 53.895 extras, todos finitos; 78% de recursos; 3,31 caminhos por ponto; vitória do caminho 0 (a clássica) 0,540 contra 0,489 das alternativas.
- **Tempo:** a G0 leva ~70 min com 10 workers (§5.4), bem mais que a estimativa inicial.

### E4 — treino, paridade e avaliação (ferramentas prontas; esperando a G0)

- **`tools/ia/treinar.py`** (PyTorch, CUDA na GTX 1660 Super):
  - lê os `.f32` pelas colunas do `resumo.json`; separa treino e validação por confronto (15%, a mesma semente em todas as gerações); normaliza pela média e o desvio do treino;
  - por perfil, a rede 100 → 128 → 64 → 2; Adam; lotes metade ramos e metade extras; lê os arquivos com `np.memmap` e copia só as linhas de cada perfil (a máquina tem ~11 GB livres); dados na CPU e lotes na GPU; para quando a perda de validação piora 2 épocas seguidas, e mostra a melhoria fora da luta a cada época;
  - a validação é 15% dos confrontos por um hash estável do número (a mesma partição em todas as gerações); as gerações anteriores entram subamostradas (`--anteriores pasta:fração`), com o mesmo efeito do peso menor e sem estourar a memória;
  - mede a melhoria fora da luta (§6.3) na validação para δ de 0 a 3 p.p., com a mesma regra da política (a clássica fica, a menos que a melhor passe dela por δ), com o intervalo de 95% robusto por confronto (os 10 pontos de um confronto não são independentes), mais o teto ruidoso (o melhor caminho sorteado, escolhido pelo resultado) e a média das alternativas;
  - `--unica`: treina também uma rede só para os dois perfis e a mede em cada um (§3);
  - grava `rede-marcial.json`, `rede-recursos.json` (o formato de `criarRede`, com os nomes das entradas, que `criarRede` confere na ordem) e `relatorio.json`.
- **Teste com 14% da G0 (5.080 confrontos):** o treino roda em ~1 s por época. A rede de recursos já mostra melhoria fora da luta de **+1,0 p.p. [+0,3, +1,8]**; a marcial fica perto de 0 (+0,1 [−1,0, +1,2]), como o plano previa (§10). A rede única dá +1,1 em recursos e −0,3 em marcial: por enquanto, as duas redes se sustentam. Teto ruidoso de +8 a +9 p.p.
- **`tools/ia/paridade.py`:** monta a rede do JSON em PyTorch (float32) e grava vetores e notas. `tests/fixtures/ia-paridade.json` (uma rede pequena sorteada) roda no CI; na rede treinada de teste, a diferença máxima entre JS e PyTorch foi 1,6 × 10⁻⁷.
- **`tools/ia/avaliar.mjs`:** o espelho do §7 em workers, nos conjuntos `teste` (só fichas reservadas), `validacao` (fichas do treino, outras sementes) e `vitrine` (12 confrontos da Arena), com os três modos, a regra de perda em duas etapas com Benjamini–Hochberg e o tempo do lote de 1.000 lutas. Teste e validação remontam o confronto até equilibrar. Nos modos de uma rede só, o ganho médio conta só os confrontos em que o lado da rede tem alguém do perfil: nos outros a rede não age (são ~1/3 deles, e diluiriam o critério).

### E6 — a IA treinada na Arena (código pronto; esperando as redes finais)

- **Montagem:** em "Opções da luta", o campo "IA de cada lado" tem um seletor por lado, "Clássica" ou "Treinada". A escolha vai na URL (`ia=A:rede`, `ia=A:rede,B:rede`; só os lados com a treinada), e o que não se entende vale a clássica (`lerIa`/`escreverIa` em `arena-setup.js`). Mudar a IA muda a assinatura do lote, que fica marcado como antigo.
- **Redes sob demanda** (`js/pages/arena-ia.js`):
  - `carregarRedes` busca `data/ia/rede-recursos.json` (`PERFIS_DA_ARENA`) uma vez por sessão, só quando algum lado escolhe a treinada (ou a URL já pede);
  - se a busca falha, a próxima tenta de novo; a luta segue com a clássica e um aviso ("IA treinada indisponível").
- **Luta assistida:** a barra diz a IA de cada lado ("IA A: clássica · B: treinada"; um lado sem ninguém com magias ou poderes fica "treinada (sem efeito)"). Quando a rede **troca** a escolha clássica, o registro ganha uma linha (`is-ia`, em itálico e tom discreto), por exemplo:
  > IA treinada de Mestre-Arsenal: investida contra Nekapeth, Sumo-Sacerdote de Sszzaas, com 50% de vitória estimada. A clássica faria Favor Divino, 28%.

  Com δ = 0,20 a rede mantém a clássica em ~90% das decisões; uma linha a cada decisão (a primeira versão) virava ruído.
- **Lote:** usa as mesmas políticas, e o resultado diz a IA que valeu de fato.
- **Testes:** `ded_make_character_arena` (o parâmetro `ia`, 10 testes), `ded_make_character_ia` (rótulos, "por que", políticas por lado, a busca com falha e a nova tentativa; 21 testes) e o E2E `qa_ded_make_character` (um passo novo: seletor, URL, "por que", a mesma semente repetindo a luta com a treinada, o lote; 41 verificações). No navegador, sem erro no console.
- **Pela revisão:**
  - a 375 px, os dois seletores empilham (antes, "Treinada" saía cortada);
  - o "por que" ordena as outras opções pela nota e, quando a margem δ manteve a escolha clássica, diz isso ("A escolha clássica fica: a vantagem de … é pequena demais"); antes, uma alternativa podia aparecer com chance maior que a da escolhida;
  - depois de esperar as redes, "Começar" e o lote conferem a montagem de novo;
  - "Ver luta" do lote usa a IA que valeu no lote (se a busca das redes tinha falhado, a clássica);
  - o "por que" fica no registro, mas sai do anúncio do leitor de tela (é longo); a linha vai em itálico;
  - "ataque contra X" (não "atacar contra X") e a dica do campo sem repetir "treinada".
- **Capturas** (Puppeteer, 1440 px e 375 px): sem rolagem horizontal, sem erro no console; o registro mostra o "por que" antes de cada ação da rede.
- **A rede em `data/ia/`** é a final (v2, só a de recursos), e a opção se chama "Treinada (experimental)" (§12, E5).

### E5 — gerações e avaliação (pronta)

- **G0** (refeita com os PV corrigidos): 37.000 confrontos, **1.226.391 lutas** (ramos) e 9.923.090 exemplos extras, em 53 minutos com 10 workers; 4,5 GB no D:.
- **v1** (treinada só com a G0; ~10 s por época na GPU):

  | Rede | Melhoria fora da luta (δ = 0,015) | Intervalo de 95% (por confronto) | Teto ruidoso |
  |---|---|---|---|
  | recursos | **+1,37 p.p.** | [+1,11, +1,64] | +9,1 |
  | marcial | **+0,72 p.p.** | [+0,29, +1,16] | +7,7 |
  | rede única, em recursos | +1,26 | [+1,00, +1,53] | — |
  | rede única, em marcial | +0,66 | [+0,24, +1,08] | — |

  - O portão da G1 passou nas duas redes (intervalo acima de 0).
  - As duas redes ficam melhores que a única nos dois perfis: ficam as duas (§3).
  - A melhoria cresce pouco com δ (recursos: +1,33 com δ = 0 e +1,46 com δ = 0,03).
- **Espelho da v1 na validação** (300 confrontos com fichas do treino e sementes novas, 100 lutas por modo, δ = 0,015), com a rede decidindo todos os turnos:

  | Modo | Ganho médio | Intervalo de 95% | Perdas confirmadas |
  |---|---|---|---|
  | só recursos | +3,1 p.p. | [+0,4, +5,9] | 50 de 235 |
  | só marcial | −1,1 p.p. | [−3,1, +0,9] | 43 de 179 |
  | as duas | +1,5 p.p. | [−0,9, +4,0] | 77 de 300 |

  - **O ganho de uma decisão não se transfere inteiro para a luta.** Decidindo todos os turnos, a v1 chega a estados que a clássica não visitava (onde a G0 tem poucos dados) e erra feio em alguns confrontos, com perdas de até 49 p.p.
  - **Exemplos** (`pior.mjs` no scratchpad):
    - Em `validacao:125.1`, os dois Capitães James K. espalham os golpes entre Camaleões iguais (notas quase empatadas, 37% e 37%), em vez de concentrar no mesmo como a clássica: a rede não aprendeu o foco do grupo.
    - Em `validacao:72`, o clérigo 16 troca as Bênçãos e a Força do Touro das primeiras rodadas por Imobilizar Pessoa, e o grupo perde em 10 rodadas o que vencia em 24.
  - É o caso que a iteração de política (§6.2) existe para corrigir: a G1 é gerada com a v1 decidindo e com a escolha clássica sempre entre as alternativas, e a v2 aprende onde a v1 erra.
- **δ mais conservador** (os mesmos 120 confrontos de validação, 60 lutas por modo):

  | δ | Recursos | Marcial | As duas | Confrontos abaixo de −10 p.p. |
  |---|---|---|---|---|
  | 0,015 | +1,3 | −1,5 | +0,3 | 34 |
  | 0,05 | +2,4 | +0,1 | +1,7 | 26 |
  | 0,10 | **+4,4** [+0,4, +8,4] | +0,5 | **+3,5** [+0,1, +6,9] | 18 |

  Com δ = 0,10 (a rede só troca a escolha clássica quando espera ao menos 10 pontos a mais), o ganho fica significativo e as catástrofes caem pela metade. A G1 é gerada com a v1 decidindo com δ = 0,10. O δ final é calibrado no fim, com a rede final.
- **G1** (π = v1 com δ = 0,10; 20% dos confrontos com um lado clássico, sem ensinar): 12.500 confrontos, **417.106 lutas** e 2.431.583 extras, em 37 minutos.
- **v2** (G1 inteira + 30% dos confrontos da G0):
  - **Melhoria fora da luta sobre a v1** (o caminho 0 agora é a v1): marcial +0,56 p.p. [−0,02, +1,14] e recursos +0,06 [−0,31, +0,43], quase nada. Numa decisão só, a v2 escolhe quase como a v1.
  - **Espelho na validação** (os mesmos 120 confrontos, δ = 0,10):

    | | Recursos | Marcial | As duas | Abaixo de −10 p.p. | Acima de +10 p.p. |
    |---|---|---|---|---|---|
    | v1 | +4,4 | +0,5 | +3,5 | 18 | 25 |
    | **v2** | **+8,5** [+4,7, +12,2] | **+1,1** [−0,0, +2,2] | **+7,2** [+4,1, +10,3] | **8** | **33** |

  - **A iteração de política funcionou:** a v2 aprendeu os erros da v1 nos estados que a v1 visita, as catástrofes caíram de 18 para 8, e o ganho em recursos passou do critério de +5 p.p. (na validação).
  - Ficam 8 perdas confirmadas no modo "as duas". A G2 é gerada com a v2 decidindo (δ = 0,10).
- **G2** (π = v2 com δ = 0,10): 12.500 confrontos, **415.469 lutas** e 2.444.822 extras, em 35 minutos. **Total das três gerações: 2.058.966 lutas.**
- **v3** (G2 + 30% da G1 + 10% da G0):
  - **Fora da luta, sobre a v2:** marcial −0,16 [−0,68, +0,35] e recursos −0,07 [−0,42, +0,28], nada.
  - **Espelho na validação** (os mesmos 120 confrontos, δ = 0,10): recursos +7,5 [+3,6, +11,4], marcial +0,7, as duas +6,2 [+3,0, +9,4]; 10 confrontos abaixo de −10 p.p. e 11 perdas confirmadas. Fica um pouco abaixo da v2, dentro do ruído.
  - Pela regra do §6.2 (a geração que não melhora encerra o treino e fica a melhor), **a rede final é a v2**.
- **δ final** (v2, os mesmos 120 confrontos de validação):

  | δ | Recursos | Marcial | As duas | Abaixo de −10 p.p. | Perdas confirmadas (as duas) |
  |---|---|---|---|---|---|
  | 0,05 | +7,5 | +1,2 | +6,6 | 9 | 12 |
  | 0,10 | +8,5 | +1,1 | +7,2 | 8 | 8 |
  | 0,15 | +7,9 | +0,8 | +6,5 | 6 | 5 |
  | **0,20** | **+7,4** [+4,3, +10,5] | **+0,6** | **+6,2** [+3,5, +8,8] | **1** | **2** |

  Com δ = 0,20, o ganho fica quase o mesmo e as catástrofes quase somem: o critério do §7 pede nenhuma perda confirmada. **O δ final é 0,20.**
- **Avaliação final no teste** (500 confrontos só com as fichas reservadas e os sintéticos de ladino e feiticeiro, 200 lutas por modo, v2, δ = 0,20; `teste-d0.20.json`):

  | Critério (§7) | Resultado | |
  |---|---|---|
  | Ganho de recursos ≥ +5 p.p. | **+12,2 p.p.** [+10,4, +14,1], em 333 confrontos | ✅ |
  | Ganho marcial ≥ 0 | **+0,1 p.p.** [−0,2, +0,4], em 366 confrontos | ✅ |
  | As duas redes | +8,2 p.p. [+6,8, +9,5], em 500 confrontos | — |
  | Empates não sobem mais de 1 p.p. | 0,7% × 0,7% | ✅ |
  | Lote de 1.000 lutas | 1 × 1: **2,9×** (limite 3×); 3 × 3: **4,6×** (limite 5×) | ✅ |
  | Nenhum confronto com perda confirmada | No modo "as duas", **16**; nos modos de uma rede só, 10 com a de recursos e 11 com a marcial, em confrontos diferentes. Nas duas, 141 confrontos ganham mais de 10 p.p. e 13 perdem mais de 10 | ❌ |

  - **Por formato** (as duas redes): grupo de personagens +12,3 p.p., grande +11,4, misto +7,5, 1 × 1 +4,5.
  - **As perdas que sobram:** casos extremos fora do treino, como 3 Paladinos Extremos (ND 55, reservado) e um feiticeiro 20 contra outro Extremo em `teste:441.1`, −24 p.p. (−25 na confirmação), e lutas em grupo da rede marcial, como `teste:256`, −16 p.p.
  - **Vitrine** (12 confrontos da Arena, 200 lutas): quase sempre 0, porque com δ = 0,20 a rede raramente troca a clássica nos 1 × 1. A exceção é o Mestre Arsenal contra Nekapeth: **+24,5 p.p.** com a rede no Arsenal, que troca a Favor Divino da clássica por uma investida. O Paladino de Arton contra Nekapeth deu −3,0 (n.s.).
  - **Paridade JS × PyTorch nas redes finais:** diferença máxima de 3,6 × 10⁻⁷ em 200 casos por rede.
- **Decisão (o que vai para a Arena):**
  - **Só a rede de recursos.** A marcial não ganhou nada (+0,1 p.p.) e respondeu por 11 das perdas confirmadas. Sem ela, o ganho total fica praticamente o mesmo (+8,1 p.p. [+6,8, +9,5] nos 500 confrontos, contra +8,2 com as duas) e as perdas confirmadas caem para as 10 da rede de recursos. A rede marcial treinada fica nos dados (`D:/…/redes/v2`), fora do app.
  - **"Treinada (experimental)",** porque o critério "nenhuma perda confirmada" não passou. O padrão continua sendo a clássica.
  - `DELTA_PADRAO` = 0,20 em `ia30.js`. As redes da Arena ficam em `data/ia/rede-recursos.json` (geração 2).
  - **Aceite do usuário** (04/10/2026): depois de ver os resultados e a proposta (só a rede de recursos, como "experimental", com a clássica como padrão), "já pode comitar e abrir o PR".
- **Para passar no último critério depois** (não feito):
  - mais gerações concentradas nos confrontos de perda;
  - personagens sintéticos de nível alto e fichas de ND acima de 40 no treino (hoje só há 5);
  - δ maior por perfil;
  - um δ que dependa da confiança da rede (a diferença em erros-padrão), e não de uma margem fixa.
- **Ressalvas sobre a avaliação:**
  - **O teste não foi usado para escolher:** a versão (v2) e o δ (0,20) saíram da validação, e o teste rodou uma vez com essa configuração.
  - **Mas a escolha de levar só a de recursos olhou o teste.** Por isso, uma rodada nova foi feita: outros 500 confrontos com as mesmas fichas reservadas (semente "teste-confirmacao"), só a rede de recursos.
    - **+12,7 p.p. [+10,9, +14,5]** nos 350 confrontos com magias ou poderes;
    - **+8,9 p.p. [+7,5, +10,2]** nos 500;
    - 11 perdas confirmadas; 142 confrontos ganham mais de 10 p.p. e 7 perdem mais de 10;
    - lote 2,8× e 4,3×.
  - **A validação de 120 confrontos foi reusada** em várias escolhas (o δ da v1, a v2 contra a v3, o δ final). Daí a diferença entre as 1–2 perdas por 120 confrontos na validação e as 10–16 por 500 no teste.
  - Pequenas notas: na tabela de δ da v1, a linha de 0,015 vem da rodada de 300 confrontos (100 lutas por modo), não de 60 lutas; o marcial da v2 com δ = 0,05 deu +1,15.
- **Como refazer** (sementes fixas; os dados ficam em `D:/Users/Home/Documents/ded-ia-dados`):
  ```
  node ded_make_character/tools/ia/gerar-lutas.mjs --geracao 0 --workers 10 --saida <dados>/g0
  python ded_make_character/tools/ia/treinar.py --dados <dados>/g0 --saida <dados>/redes/v1 --geracao 1 --epocas 12 --unica
  node ded_make_character/tools/ia/gerar-lutas.mjs --geracao 1 --workers 10 --rede-marcial <dados>/redes/v1/rede-marcial.json --rede-recursos <dados>/redes/v1/rede-recursos.json --delta 0.1 --saida <dados>/g1
  python ded_make_character/tools/ia/treinar.py --dados <dados>/g1 --anteriores <dados>/g0:0.3 --saida <dados>/redes/v2 --geracao 2 --epocas 12
  node ded_make_character/tools/ia/gerar-lutas.mjs --geracao 2 --workers 10 --rede-marcial <dados>/redes/v2/rede-marcial.json --rede-recursos <dados>/redes/v2/rede-recursos.json --delta 0.1 --saida <dados>/g2
  python ded_make_character/tools/ia/treinar.py --dados <dados>/g2 --anteriores <dados>/g1:0.3,<dados>/g0:0.1 --saida <dados>/redes/v3 --geracao 3 --epocas 12
  node ded_make_character/tools/ia/avaliar.mjs --redes <dados>/redes/v2 --conjunto validacao --confrontos 120 --lutas 60 --delta 0.2
  node ded_make_character/tools/ia/avaliar.mjs --redes <dados>/redes/v2 --conjunto teste --confrontos 500 --lutas 200 --delta 0.2
  ```
  O padrão de `--delta` agora é 0,20; a G1 e a G2 usaram 0,10. Os `resumo.json` das gerações dizem "alterado: true" porque o código ainda não estava em commit: refazer a partir do commit desta tarefa.
- **Melhorias possíveis do JSON:** a rede tem 226 KB, baixada só sob demanda. Arredondar os pesos para 5 casas ou comprimir no servidor reduziria de 30% a 60%.
