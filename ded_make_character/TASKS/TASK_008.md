# ⚔️ Tarefa 008 - D&D Make Character: fichas oficiais do livro *Tormenta D20 – Holy Avenger*

**Status**: 🚀 Dev Complete — 54 fichas do livro, aprovadas pelos 5 revisores
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-retribuicao` (junto com a TASK_007, ainda não comitada)
**Depende de**: TASK_006 (catálogo e motor) e TASK_007 (Retribuição, ND acima de 20)

---

## 🔍 1. Pedido do usuário (01/10/2026)

> Consegui o guia oficial da Holy Avenger com as fichas dos personagens. Revise os dados de todos os personagens, um por um, e adicione os personagens que estão no PDF e não estão no nosso catálogo.

- **Fonte:** o livro *Tormenta D20 – Holy Avenger* (Talismã), numa cópia em PDF do usuário (scan com OCR, 148 páginas no PDF).
  - Página do PDF = página impressa + 3. As referências do catálogo usam a página impressa.
- **Direitos:** o próprio livro declara Open Game Content (p. 7) "todas as fichas de personagens e regras sobre itens mágicos, criaturas e magias", **mas não seus nomes e históricos**.
  - O catálogo transcreve os números e as regras.
  - `resumo`, `tatica`, as descrições dos especiais e `adaptacao` foram escritos de novo, com palavras próprias.
  - Conferido por script: nenhuma sequência de 6 palavras igual ao livro (OCR) ou às páginas da wiki.
  - A TASK_006 não tinha consultado o livro, porque só havia cópias não autorizadas na internet. Agora a cópia é do usuário, e o conteúdo usado é o que o livro libera.

## 🎯 2. Decisões

| Tema | Decisão |
|---|---|
| **O livro manda** | Os números são os da ficha oficial. Corrigido só o que é **provadamente inconsistente dentro da própria ficha** (iniciativa sem Iniciativa Aprimorada, Agarrar ≠ BBA + tamanho + For, tamanho esquecido nos totais, resistências sem o talento), cada correção registrada em `adaptacao`. PV diferente da média dos DV não é erro: vale o do livro. |
| **Versões** | Uma entrada por ficha. Lisandra tem 5, Tork 4, Sandro 3, Niele 2 e o Paladino 6. A primeira ficha de cada um fica com o id que já existia (`ha-lisandra` = "Lisandra, Druida"; `ha-tork`; `ha-sandro-galtran`; `ha-niele`), e as outras ganham ids novos. O nome é o título do sumário do livro. |
| **Formas do Paladino** | As fichas oficiais substituem as formas inventadas da TASK_007 (nível 16 + rubis, gigantes de DV inventados). No livro, cada forma é extraplanar com DV dos rubis somados aos níveis de paladino, e Leal e Neutra: Desperto (Paladino 4, ND 20), Matador de Dragões (9, ND 25), Completo (20, ND 36), Avançado (20, Imenso, ND 40) e Extremo (20, Colossal, ND 55). |
| **ND fracionário** | Petra e Hipólita têm ND ½ no livro. O catálogo passou a aceitar fração (1/2, 1/3, 1/4, 1/6, 1/8) em Holy Avenger, gravada como número (`0.5`). A Arena mostra "ND 1/2" e a faixa mais baixa virou "ND até 5". |
| **Teto** | ND e nível de Holy Avenger vão até 80 (eram 60 na TASK_007). Tarso tem nível 63 (43 DV de dragão + Mago 20) e ND 50. Monstros continuam de 1 a 20. |
| **Criaturas** | Helena, Aspis, Tasha, Gary & Gygax e Raschid não têm nível de classe: `classes: []` e `nivel` = DV. O validador só avisa de "humanoide sem classes". |
| **Talentos de Tormenta** | Os talentos que o livro usa e o compêndio não tem entraram em `TALENTOS_EXTRAS` com o nome do livro: Aparência Inofensiva, Arrebatar, Aventureiro Nato, Deslocamento, Foco em Habilidade, as três Formas do Mar, Impostor, Intolerância, Invocar Familiar, Memória Racial, Prosperidade, Religioso, Terreno Familiar, Torcida e Voz de Allihanna. Grafias do livro com equivalente no compêndio foram trocadas: Grande Fortitude → Fortitude Maior, Especialização → Especialização em Combate, Trespassar Aprimorado → Trespassar Maior. |

## 📚 3. O que mudou no catálogo (versão 6)

- **Holy Avenger: 54 fichas** (eram 19): 19 revisadas pelo livro e 35 novas.
- **Revisadas (o id fica):**

  | Ficha | Antes (adaptação) | Agora (livro) |
  |---|---|---|
  | Lisandra, Druida | Druida 6/Guerreiro 1, ND 7 | Druida 3, ND 4 |
  | Odara, Xamã Centaura | Druida 2, ND 6 | Clériga de Allihanna 1, ND 2 |
  | Sandro Galtran, Ladrão | Guerreiro 7, ND 7 | Guerreiro 3, ND 3 |
  | Tork, Troglodita Anão | 2 DV + Bárbaro 1/Guerreiro 6, ND 9 | Bárbaro 1/Guerreiro 2, ND 5, porte Médio |
  | Niele, Arquimaga | Barda 7, ND 7 | Barda 3, ND 3 ("ou mais", pelo Olho de Sszzaas) |
  | Capitão James K. | Guerreiro 4/Ladino 4, ND 8 | Guerreiro 14, ND 14 |
  | Camaleão | Ladino 9/Mago 5, ND 14 | Ladino 5/Assassino 7, ND 12 (a ficha do livro substitui a do *Tormenta D20*) |
  | Nekapeth | 8 DV + Clérigo 12, ND 20 | Clérigo 14, ND 25 |
  | Mestre-Arsenal | ficha da wiki cortada para ND 20 | a ficha da wiki inteira, Guerreiro 10/Clérigo 12, ND 26 (o livro não traz a ficha dele) |
  | Paladino de Arton e as 5 formas | lendas com PV 184; formas inventadas | as 6 fichas do livro (PV 164 nas lendas) |
  | Luigi, Vladislav, Leon, Deenar | adaptações ou ficha da wiki | as fichas do livro |

- **Novas:**
  - **Lisandra:** Druida Guerreira (ND 17), ex-Druida (ND 19), Guerreira Insana (ND 27) e Rainha do Mal (ND 35).
  - **Tork:** Guerreiro Cego (ND 7), Curado e Reequipado (ND 9) e Dragão Verde (ND 11).
  - **Sandro:** Gladiador (ND 9) e Herói Aposentado (ND 11).
  - **Niele:** Extraplanar (ND 6).
  - **Aliados e figurantes:** Razlen Greenleaf (ND 18), Hipólita (ND ½), Petra Tpish (ND ½), os aprendizes da Academia Arcana Zed, Xeipe, Kabuki e Vincent (ND 1), Karin (ND 1), Lady Esplenda (ND 14), Princesa Tanya (ND 8), Devitorimm (ND 9), Haramaki (ND 6), Anne (ND 2), o guarda e o oficial da Milícia de Vectora (ND 2 e 4) e o Minotauro Amaldiçoado (ND 6).
  - **Vilões e criaturas:** Deenar Lagosta-Demônio (ND 11), Lenora (ND 9), Helena, a Enguia Rainha (ND 19), Aspis (ND 8), Tasha (ND 3), Gary & Gygax (ND 5), Raschid (ND 11), Tarso (ND 50) e o Avatar de Sszzaas (ND 46).
- **Sem ficha no livro (não entraram):**
  - Beluhga: o livro só diz que ela tem ND 26.
  - Arkam: só texto.
  - Bakula: é um disfarce de Sszzaas, e os números estão no Avatar.
  - Wynna: a deusa não tem estatísticas.
  - Sckhar: só ND 30 e RD 25/+4, no texto da luta.
  - Talude e Loriane: as fichas estão no *Tormenta D20* básico.
  - As criaturas do livro que não são personagens (Árvore-Matilha, Selakos, Trolls…) também ficaram de fora.
- **Mecânicas** (especiais de Holy Avenger): 93 com efeito do vocabulário (simulados), 141 `null` e 79 `outro` (não simulados). Antes eram 74 / 40 / 31. Nenhum efeito novo no motor.
  - Usam efeitos que já existiam: o sopro de Helena, de Tarso e do Paladino Extremo, o agarrar e engolir de Helena, o agarrar e a constrição de Aspis, a presença aterradora de Tarso, venenos e ataque furtivo.
  - Muitas habilidades próprias do livro ficaram `outro`: gavinhas e Chuva de Lâminas de Lisandra, os poderes da Kailash, o Comandar Plantas.

## 🧩 4. Decisões de ficha (detalhe em `adaptacao`)

- **Correções comuns sobre o livro:**
  - iniciativas sem Iniciativa Aprimorada (Paladino, Luigi, Kabuki, Lady Esplenda, Anne, James K., Tarso);
  - totais sem o −1 de tamanho Grande (Gary & Gygax, Raschid, Odara);
  - ataques +1 acima da conta (Lisandra Druida Guerreira e ex-Druida);
  - resistências sem o talento ou o traço racial (James K., Tork, Zed, Niele Extraplanar).
- **Paladino, Avançado e Extremo:** o livro dá punhos +50/+46 e +60/+60. Os DV dão BBA 40 e 50, e a conta do livro só fecha com 35 e 45, por isso os ataques foram corrigidos para +55/+51 e +65/+65. Sem a espada (está com Arsenal), as formas Médias lutam com golpe desarmado que conta como arma +5, como na HQ.
- **Haramaki:** a linha de classes diz Guerreiro 2/Samurai de Tamu-ra 4 (nível 6, katana +10/+5), mas os DV e duas resistências fecham com Guerreiro 3. Ficou o nível 6 da linha de classes, e os DV e resistências foram ajustados.
- **Tarso:**
  - espaço 12 m, o lado estreito da face 3.0 de um dragão Colossal, como nos outros dragões;
  - a rasteira com a cauda usa o efeito `atropelar`;
  - a linha do sopro de ácido (42 m) é estimada, porque o livro não a mede.
- **Raio do Enfraquecimento (Vladislav):** "Fortitude anula", como no SRD 3.0. A transcrição tinha tirado o teste (regra da 3.5); corrigido.
- **Niele e o Olho de Sszzaas:** o cajado só funciona com teste de Blefar (talento Impostor) contra CD 20 + nível da magia. A chance de falha (55% e 65%) é a de o Blefar dela não vencer a CD.
- **Imunidade a sono:** o livro diz que os elfos de Arton não a têm, então saiu das duas Nieles, de Tanya e de Deenar. Luigi e o Camaleão, meio-elfos, ficam com a do Livro do Jogador.
- **Armas que a ficha não dá** ("dano pela arma"), deduzidas e registradas:
  - o golpe desarmado de Sandro;
  - o sabre de Tanya;
  - as adagas do Camaleão e de Tasha;
  - os dardos de Nekapeth.
- **Helena só nada:** o motor anda só por terra e voo, então ela fica parada e ataca quem chega perto.

## ✅ 5. Validação

- **Validador:** 0 erros e 0 avisos no catálogo inteiro.
- **`tests/ded_make_character_catalogo.test.js` (9 testes):**
  - as 54 fichas, com as versões e os ids da primeira ficha;
  - a origem no livro;
  - o ND ½;
  - o Tarso de nível 63;
  - o Paladino oficial (ND, DV, RD, Retribuição e imunidade a magia);
  - o validador com ND 21 em monstro, ND ½ em monstro, ND 81 e fração inválida em Holy Avenger, classes acima do nível, humanoide sem classe e condição inicial fora da lista.
- **`tests/ded_make_character_combate.test.js` (53 testes):**
  - Helena agarra com a mordida, engole quem é até Enorme e digere com ácido;
  - Tork começa cego e o Lutar às Cegas rola a falha de novo;
  - dentro de Helena a RD vale;
  - o agarrão de Aspis não soma a mordida;
  - a IA desconta a RD em esmagar e atropelar;
  - a Retribuição não atinge criaturas bondosas;
  - o Raio do Enfraquecimento e o Olho de Sszzaas seguem as fichas novas.
- **`tests/ded_make_character_arena.test.js` (9 testes):** o ND fracionário no nível de encontro e na tela.
- **`tests/qa_ded_make_character.test.js` (E2E, 40 verificações):**
  - as faixas 16–20 e 21+ com as fichas do livro;
  - o "ND 1/2" na faixa "ND até 5" e a descrição de Helena;
  - o lote "lento" passou a usar Razlen contra Razlen.
- **Varredura:** as 10.952 lutas do catálogo, todos contra todos, 2 lutas por par, com a semente igual ao número da luta (1 a 10.952), rodam sem erro e sem texto quebrado. Os 10 empates são:
  - 6 em que ninguém ficou de pé: a Retribuição de um Paladino mata quem lhe deu o golpe que o derrubou. Contra o balor, o mesmo golpe vorpal decepa o Paladino. Com a exceção das criaturas bondosas, essas lutas caíram de 13 para 6.
  - 4 no limite de 50 rodadas:
    - dois só entre monstros, que já existiam (dragão vermelho × lorde das profundezas, dragão de prata × golem de ferro);
    - dois com Lady Esplenda, uma encantadora que quase não causa dano.
- **IA de esmagar e atropelar:** o valor esperado não descontava a RD, e a execução desconta.
  - Tarso escolhia toda rodada a rasteira com a cauda (2d8+21) contra os Paladinos de RD 30/+5, que a absorve, e empatava em 50 rodadas.
  - Agora o valor desconta a RD que o corpo não vence, como o ataque total. Tarso vence o Desperto e o Matador em 100% das lutas (semente 3).
  - Teste em `tests/ded_make_character_combate.test.js`.
- **ND do grupo na Arena:** as criaturas de ND menor que 1 se juntam em grupos que somam 1, como no Livro do Mestre 3.0: duas de ND 1/2 valem uma de ND 1; quatro, duas de ND 1. Abaixo de 1, o ND do grupo aparece como fração. Teste em `tests/ded_make_character_arena.test.js`.
- **Criatura sem classe nem raça** (Helena): a Arena mostra tipo e tamanho ("Besta Mágica colossal"), como nos monstros.
- **Revisão das fichas contra o livro** (4 revisores, um por grupo de lotes). Correções feitas:
  - **Regras da 3.5 que tinham passado como 3.0:**
    - Raio do Enfraquecimento sem teste (Vladislav e Deenar; no 3.0, Fortitude anula);
    - Praga Profana com Vontade (Nekapeth; no 3.0, Fortitude);
    - Riso Histérico de Tasha com 1 rodada por nível (no 3.0, 1d3 rodadas);
    - Cegueira/Surdez como necromancia (no 3.0, transmutação);
    - Favor Divino limitado a +3 (no 3.0, +1 a cada 3 níveis, até +6: Nekapeth e Arsenal, +4);
    - penalidade de duas armas −2/−2 (Devitorimm, sem Ambidestria: −2 na mão principal e −6 na outra).
  - **Durações que o motor não lia:** Enfeitiçar Monstro e Dominar Pessoa "até 14 dias" valiam 1 rodada; agora "336 horas". Ataque Certeiro de 1 rodada acabava antes do golpe; agora 2.
  - **Retribuição:** não atinge criaturas bondosas (o "bom coração" do livro, p. 111 e 118; ver TASK_007).
  - **Paladino Avançado e Extremo:** com os ataques iterativos do BBA 40 e 50, que o livro não lista. A Expulsão das formas, que o livro só cita, segue a regra 3.0 (clérigo de dois níveis abaixo).
  - **Lisandra, Druida:** a espada volta aos +6 (1d8+4) do livro. A correção pelo modelo do apêndice não era inconsistência da ficha.
  - **Razlen:** sem a imunidade a sono, como os outros elfos de Arton.
  - **Raschid:** pancada única de gênio com 1,5 × For (1d8+12), como o djinni e o efreeti do SRD.
  - **Sandro, Gladiador:** sem o tridente arremessado, que o motor jogaria toda rodada sem ele voltar.
  - **Registros que faltavam em `adaptacao`:** armas que a ficha não dá, a Fúria de Tork, os traços de anão do Devitorimm e o arremesso do tridente de Lenora.
- **Motor e formato** (para as fichas do livro):
  - **`condicoes_iniciais`:** a ficha pode começar a luta com uma condição que dura a luta toda. Tork, Guerreiro Cego, começa `cego`: 50% de falha, sem Destreza na CA, +2 para os oponentes, metade do deslocamento.
  - **Lutar às Cegas (3.0):** no corpo a corpo, quem erra pela chance de falha rola de novo uma vez.
  - **`rd_se_aplica` em `engolir`:** a RD de quem engoliu vale contra o dano feito por dentro (Helena: "a RD ainda se aplica").
  - **`dano_por_rodada: "0d0+0"` no agarrar aprimorado:** o agarrão não fere, só a constrição (Aspis, cujo bote usa o ataque da mordida, mas não o dano).
  - **Retribuição** aceita `afeta`.
- **Limitações conhecidas** (não simuladas, para uma próxima tarefa):
  - a exceção "magias de deuses maiores" da imunidade a magia;
  - Magia Penetrante no teste contra RM;
  - magias benéficas de aliados que ainda alcançam quem é imune a magia;
  - a Fúria com arma de duas mãos (+2 de dano em vez de +3);
  - as gavinhas de Lisandra ao se mover (a IA usa só uma);
  - o golpe desarmado como dano não letal (salvo com manoplas: as formas do Paladino, de armadura de batalha, já causam dano normal);
  - a IA não considera a evasão no valor de magias de área (tarefa separada).
- **Navegador:** o seletor em todas as faixas, o ND do grupo com ND 1/2 e as lutas de Helena e de Tarso foram conferidos em desktop e celular, sem rolagem horizontal nem erro no console.
