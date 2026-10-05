# 🃏 Tarefa 010 - D&D Make Character: Bestiário e card completo de monstros e personagens

**Status**: 🚀 Dev Complete — 6 etapas prontas e revisadas; falta só o commit e o PR (§9)
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-fichas-cards`
**Depende de**: TASK_006 (catálogo e Arena), TASK_008 (catálogo atual), TASK_009 (Arena atual)

---

## 🔍 1. Pedido do usuário (04/10/2026)

> Criar uma branch nova e um novo worktree para uma melhoria: um link novo no menu para ver a ficha dos monstros em cards bonitos. Na Arena, na listagem dos monstros e personagens, mostrar ao lado do nome um ícone que abre um popup com o card do monstro ou do personagem. O card deve ser completo, com todas as estatísticas e todas as descrições de todas as habilidades.

## 🧭 2. O que existe hoje (números conferidos pelo revisor)

| Peça | Estado |
|---|---|
| **Catálogo** (`data/catalogo-combate.json`, 74 fichas: 20 monstros e 54 de Holy Avenger) | Traz todas as estatísticas. Os 435 especiais (193 ataques especiais e 242 qualidades) têm `descricao` própria, sem exceção. O maior número de habilidades numa ficha é 19 (Paladino de Arton). |
| **Números das habilidades** | Ficam na `mecanica` e **nem sempre estão na `descricao`**: 55 das 58 CDs, os dados de veneno, de engolir (`ca_interna`, `pv_para_sair`…), os bônus da fúria e de inspirar coragem. Até nos 84 especiais `outro` há 22 com número que o texto não traz (Cubo gelatinoso, Gigante do gelo, as asas, os traços de anão). |
| **Magias dos combatentes** | Só `nome`, `nivel`, `quantidade` e `mecanica` (e 59 das 248 entradas das listas têm `mecanica: null`): **nenhuma tem texto**. São 121 nomes brutos, **109 depois de tirar o parêntese**. A lista curada de `magias30.js` (a que tem `resumo` e link do SRD) tem 22 magias, e **20** delas aparecem no catálogo; restam **89 nomes-base** sem texto. Há 9 formas de parêntese (`maximizada`, `maximizado`, `maximizados, 2 mísseis`, `sem gestos`, `varinha`, `poção`, `divina`, `assassino`…) e aliases (`Flecha Ácida de Melf` = `Flecha Ácida`, `Cone Glacial` = `Cone de Frio`). A chave certa é `mecanica.magia`, e não o nome do especial. |
| **Talentos** | 475 usos no catálogo. 421 estão no compêndio (`data/talentos.json`, todos do Livro do Jogador 3.0). **20 nomes (54 usos) não estão**, e todos já constam de `TALENTOS_EXTRAS` em `tools/validar-catalogo.js`, que tem 23 nomes (3 sem uso no catálogo). Três linhas do compêndio têm parêntese no nome (`USAR ARMADURA (LEVE/MÉDIA/PESADA)`), e o catálogo tem parênteses aninhados (`Foco em Perícia (Conhecimento (história)) (regional: Deheon)`). |
| **Personagens do jogador** | Na Arena, a entrada tem `sheet` (`computeSheet`) e `ficha` (`fromPersonagem`, nula se o personagem não pode lutar). As habilidades de classe (`sheet.habilidadesClasse`) saem como texto sem explicação: **66 nomes diferentes** nas 11 classes (monge 20, druida 10, paladino 9, bárbaro 7, bardo 7, ladino 5, clérigo 3, feiticeiro 2, mago 2, ranger 1, guerreiro 0). Há também `tracosRaciais` (20 textos nas 7 raças) e `condicionais`. Os `especiais` da ficha de combate têm `descricao: ''` e ids por posição (`nao-simulado-0`). A ficha do app **não lista tudo o que a 3.0 dá** (o ranger só tem "Inimigo predileto"; o guerreiro, nenhuma): o card mostra o que a ficha do app lista. |
| **Menu** | `NAV_PAGES` entra depois das entidades do grupo, ou seja, depois de Raças. A rota `arena` fica antes de `/:module` em `app.js`. A página inicial (`home.js`) tem um tile por módulo. |
| **Arena** | O nome aparece em 6 lugares: o seletor (`arena-pick__name`, um `<dialog>` no `body` com o próprio `click`), a lista de cada lado (`arena-roster__name`, 2 variantes), os dois painéis da luta (`arena-fighter__name`, `arena-stat__name`) e a tabela do lote (`arena-lote__quem`). Vários testes comparam o `textContent` desses elementos. |

## 🎯 3. Decisões (valem como padrão; o usuário pode mudar)

| Tema | Decisão | Por quê |
|---|---|---|
| **Nome e lugar no menu** | **Bestiário**, no grupo *Compêndio*, depois de Raças, com um tile na página inicial. Rota `#/bestiario`. | É consulta de regras, como as outras páginas do compêndio. |
| **O que lista** | As 74 fichas do catálogo, em duas abas (*Monstros* e *Holy Avenger*), com busca e faixa de ND como no seletor da Arena (o código das faixas e o carregamento do catálogo vão para um módulo compartilhado). | O usuário falou em "monstros"; Holy Avenger são os "heróis" que a Arena mistura com eles. Os personagens do jogador ficam de fora: já têm a ficha em pergaminho. |
| **Galeria** | Cards compactos (nome, ND, tipo, PV, CA, iniciativa, ataque principal, resumo). Clicar abre o **card completo** num popup. | "Cards bonitos" para folhear, e o completo só quando se quer ler tudo. |
| **Card completo** | **Um componente só**, usado no Bestiário e na Arena. | Evita duas versões que divergem. |
| **Link direto** | `#/bestiario?ver=troll` abre a página com o card aberto, na aba certa. A URL muda com `router.replaceQuery` (sem re-renderizar e sem entrada no histórico: Voltar sai do Bestiário). Um `ver` que não existe vira um aviso. | Dá para compartilhar o link de uma ficha. |
| **Na Arena** | Um botão **só de ícone** (`card`, com `aria-label="Ver o card de Troll"`) ao lado do nome, **fora** do elemento do nome (os testes comparam o texto dele), nos 6 lugares acima. Nos painéis da luta e no lote, o `uid` (`A1`…) dá o `ref` do combatente (`state.b.get(uid).ref`), sem tocar no motor. | O pedido diz "na listagem"; durante a luta é quando mais se quer conferir o que o bicho faz. |
| **Personagem do jogador** | O card mostra o personagem **como ele luta na Arena** (equipamento e magias salvos). Sem `ficha` (não pode lutar), ele abre mesmo assim, com o aviso e os números da ficha impressa. O link "Abrir a ficha completa" abre em **outra aba**, para não perder a montagem nem a luta. | É o que a Arena simula. |
| **Textos que faltam** | `data/glossario-combate.json`, mantido à mão e validado por teste. **Uma fonte por texto**: a magia que já está em `magias30.js` não é repetida no glossário. | Evita dois textos diferentes para a "Bola de Fogo" no monstro e no personagem. |

## 🏗️ 4. Arquitetura

```
data/glossario-combate.json       magias que não estão em magias30.js, talentos fora do compêndio, habilidades de classe e traços de raça
js/rules/card30.js                (sem DOM) ficha → modelo do card: seções, textos e números já formatados
js/pages/card-dados.js            catálogo, glossário e contexto de textos (uma busca por sessão); faixas de ND
js/pages/ficha-card.js            desenha o modelo e abre o popup: abrirCard({ modelo, aoFechar })
js/pages/bestiario.js             a página: abas, filtros, galeria e ?ver=
css/card.css                      o card, a galeria e o botão do ícone
js/pages/arena.js                 só os botões, a chamada de abrirCard e o ciclo de vida (§7)
```

Também mudam: `index.html` (o `<link>` do `card.css`), `app.js` (import e rota antes de `/:module`), `entities/index.js` (`NAV_PAGES`), `ui/icons.js` (`skull` e `card`), `home.js` (o tile) e `tools/validar-catalogo.js` (exporta `TALENTOS_EXTRAS`, que o teste usa como fonte única).

- **`card30.js` é puro** (entra um combatente do catálogo ou a entrada de personagem da Arena, mais o compêndio de talentos e o glossário; sai um objeto).
- **Cada número vem da ficha**, nunca de uma conta nova. O de catálogo lê o registro; o de personagem lê `ficha` (o que o motor usa) e `sheet`.

### 4.1 O que o card mostra

| Seção | Conteúdo |
|---|---|
| **Cabeçalho** | Nome, nome original, tipo, subtipos, tamanho, tendência, ND (ou nível e classe), raça, o `resumo`. |
| **Números** | PV e dados de vida, iniciativa, deslocamentos (terrestre, voo com manobrabilidade, natação, escalada, escavação), CA total, de toque e de surpresa com a composição, BBA, agarrar, espaço e alcance, as 3 resistências, os 6 atributos com modificador. |
| **Defesas** | RD, resistência à magia, resistências a energia, **todas** as imunidades (veneno, sono, doença, paralisia… além das energias), **as que o tipo dá** (Morto-Vivo, Constructo, Limo, Planta, Elemental: as mesmas que o motor soma em `fromCatalog`), vulnerabilidades, regeneração, cura acelerada, condições iniciais. |
| **Ataques** | Os ataques únicos e as sequências de ataque total, corpo a corpo e à distância: bônus, dano, crítico, tipo de dano, alcance, extras (dano de energia, material, mágico, mão inábil) e os efeitos que o acerto dispara, com o nome do especial. |
| **Habilidades** | Ataques especiais e qualidades: nome, natureza (Ext, Sob ou SM, com legenda), **descrição inteira**, e **todos os números da `mecanica`** (§4.2). Para as de efeito `magia`, o resumo da magia. |
| **Magias** | Por nível: nome, quantidade, os números da `mecanica` (com a CD que o motor usa: `mecanica.cd` ou `cd_base` + nível), **resumo** e o link do SRD quando há. |
| **Talentos** | Nome (com o parâmetro), o **benefício** e os requisitos. |
| **Perícias, equipamento** | Perícias com o total; equipamento. |
| **Rodapé** | Como luta (`tatica`), a fonte (com o link) e o que foi adaptado (`adaptacao`). |

O card do **personagem** acrescenta as habilidades de classe e os traços da raça com texto (as de `sheet.habilidadesClasse` e `tracosRaciais`, sem juntar com `ficha.especiais`, que são as mesmas vistas pelo motor), os talentos escolhidos e os concedidos pela classe e pela raça, as perícias com graduação, o equipamento que ele usa e as magias que preparou.

### 4.2 Os números de uma habilidade (a regra)

`numerosDaMecanica` mostra **toda** folha da `mecanica`, inclusive a do efeito `outro`:
- os campos que importam têm formato próprio (dano com a energia, área, teste com a CD, recarga, duração, usos, veneno, engolir, fúria…);
- o resto aparece com **rótulo legível** (`ca_interna` → "CA interna") e o valor em texto;
- só ficam de fora `efeito` (é o tipo) e `magia` (o nome da magia, que aparece à parte). A `nota` do catálogo aparece em linha pequena, menos a que cita chaves do motor (`dano_extra`…), que é de quem mantém o catálogo.

**Teste:** para os 74 cards, toda folha da `mecanica` (número ou texto) aparece no texto do card ou na `descricao` da habilidade; e nenhum texto do card tem `undefined`, `NaN`, `[object Object]` nem chave crua (`snake_case`).

### 4.3 O visual

- Mesma linguagem do app: superfícies escuras, filete dourado, Cinzel nos títulos, Alegreya no texto corrido.
- A faixa do cabeçalho muda de cor pelo tipo (fogo, morto-vivo, dragão…), pelas cores que o app já tem. O texto continua no ouro de sempre, para o contraste não depender do tipo (conferido em AA).
- No computador, duas colunas; no celular, uma, com o popup em tela cheia. As seções são `<details>`, e a barra do popup com o botão Fechar fica sempre visível, mesmo num card longo.
- O popup é um `<dialog>`: foco preso, Esc fecha, o foco volta ao botão que o abriu. Dentro do seletor da Arena ele abre por cima (anexado ao `body`).

## 📚 5. O conteúdo novo (`data/glossario-combate.json`)

```json
{
  "versao": 1,
  "magias":   [ { "nome": "Raio de Gelo", "escola": "evocação", "resumo": "…", "fonte": "http://www.dragon.ee/30srd/…" } ],
  "talentos": [ { "nome": "Ataques Múltiplos", "beneficio": "…", "requisitos": null, "origem": "…" } ],
  "classe":   [ { "nome": "Fúria", "resumo": "…" } ],
  "racas":    [ { "nome": "Visão na penumbra", "resumo": "…" } ]
}
```

- **Textos próprios**, de 1 a 3 frases, como o resto do catálogo. A regra e os números vêm do SRD 3.0 (dragon.ee/30srd), e **cada magia foi conferida lá** (na TASK_008, agentes trouxeram regras da 3.5). Os números do catálogo não mudam: onde ele difere do SRD, o resumo descreve a magia como ela é e a diferença fica registrada no relatório da revisão.
- **Uma fonte por magia:** o card consulta primeiro `magias30.js` (as 20 curadas) e depois o glossário. Um teste proíbe a mesma magia nos dois.
- **Variantes e aliases:** `(maximizada)`, `(sem gestos)`, `(varinha)`, `(poção)`, `(divina)`, `(assassino)`… viram a magia-base; `Flecha Ácida de Melf` e `Cone Glacial` têm entrada própria com o texto da magia que são.
- **Talentos:** o compêndio vale primeiro (o nome inteiro, depois o nome sem parênteses). O glossário cobre `TALENTOS_EXTRAS`.
- **Habilidades de classe e traços de raça:** a chave é o **nome** (o maior nome que abre o texto: "Forma selvagem elemental 3/dia" casa "Forma selvagem elemental"), nunca o id.
- **Testes de cobertura** (`tests/ded_make_character_card.test.js`):
  - todo `mecanica.magia` e todo nome de magia do catálogo (sem o parêntese) tem texto, no `magias30.js` ou no glossário, e nunca nos dois;
  - todo nome de `TALENTOS_EXTRAS` tem entrada, e nenhuma entrada fica sem uso;
  - para as **11 classes, nos níveis 1 a 20** (e para as 7 raças), toda habilidade de `computeSheet` tem texto (reaproveita `tools/ia/personagens.mjs`);
  - os textos têm de 15 a 450 caracteres (o catálogo já tem `descricao` de até 415) e nenhum é um marcador (`TODO`, `…`, `lorem`).

## 🗺️ 6. Etapas

A E1 é o maior trabalho (cerca de 200 textos). Para não segurar o que se vê, **E2 e E3 andam com o glossário parcial** (o card mostra uma habilidade sem texto como está, sem inventar), e o glossário entra por grupo.

| # | Etapa | Entrega | Como se confere |
|---|---|---|---|
| **E1** | Glossário | `glossario-combate.json` completo | Teste de cobertura; um revisor confere cada magia e cada habilidade contra o SRD 3.0 |
| **E2** | Modelo do card | `card30.js`, para os 74 do catálogo e para personagens das 11 classes (inclusive sem `ficha`) | Testes do §4.2 e §5; os números do card batem com o combatente que `createBattle` monta |
| **E3** | O card na tela | `ficha-card.js` + `card.css`, popup acessível | Lint automático do texto de todos os cards; capturas a 1440, 768 e 375 px (contact sheet) com casos de estresse (Avatar de Sszzaas, Tarso, Paladino de Arton, a `adaptacao` de 1.012 caracteres, nomes longos); contraste AA; sem rolagem horizontal; **o usuário vê 3 cards antes de seguir** |
| **E4** | Bestiário | Rota, menu, tile, galeria, filtros, `?ver=` | Arquivo E2E novo (`tests/qa_ded_card.test.js`) |
| **E5** | Arena | Botão ao lado do nome nos 6 lugares, foco e ciclo de vida | O mesmo E2E, mais os testes da Arena e o E2E existente |
| **E6** | Fechamento | `CLAUDE.md`, `BACKLOG.md`, revisão final | Todos os testes do app |

Cada etapa só vale depois de aprovada pelo revisor.

## ⚠️ 7. Riscos

| Risco | Como evito |
|---|---|
| Texto de regra errado (3.5 no lugar de 3.0) | Texto próprio e curto, número só se vier do catálogo ou do SRD 3.0, e revisão contra o dragon.ee na E1. |
| Número do card diferente do que a Arena simula | O teste compara o card com o combatente de `createBattle` (PV, CA, deslocamento, resistências, ataques), e não com a própria ficha. |
| **O card aberto e o ciclo de vida da Arena** | O `cleanup` da Arena fecha o card (como já faz com `seletor` e `editando`), e `cleanup.ocupada()` o conta: sem isso, o aviso de "dados alterados em outra aba" recarregaria a rota e deixaria o `<dialog>` órfão no `body`. O Bestiário também devolve um `cleanup`, que não mexe na URL da página nova. Teste: recarga adiada com o card aberto. |
| Diálogo dentro de diálogo (o seletor é modal) | O card é anexado ao `body`, e Esc fecha só ele (como o `confirmDialog` das magias, já testado). Teste de navegador: Esc, foco de volta ao botão. |
| Botão novo quebra o redesenho parcial da luta | Os botões entram nos mesmos trechos que já desenham o nome, com `data-focus` (para sobreviver a `comFoco` e ao redesenho a cada passo) e fora do elemento do nome. O E2E da luta (passo a passo e lote) segue passando. |
| Card longo demais no celular | Seções recolhíveis; a barra com o Fechar sempre visível; teste com o Avatar de Sszzaas (30 magias) e Tarso (26 magias e 27 talentos). |
| Um nome novo no catálogo sem texto no glossário | O teste de cobertura falha. |
| O glossário não carrega (rede) | O card sai sem esses textos e a tela avisa; os testes cobrem esse caso. |

## 🚫 8. Fora do escopo

- Imagens dos monstros (o catálogo não tem arte e não vou inventar).
- Editar o catálogo ou o glossário pela tela.
- Mostrar no card o estado em tempo real da luta (PV atual, condições): o painel da luta já mostra.
- Texto completo das magias do SRD: o card traz um resumo próprio e o link.
- Completar as habilidades de classe que a ficha do app ainda não lista (ranger, guerreiro).

## 📊 9. Andamento

**Status**: 🚀 Dev Complete — as 6 etapas prontas; falta só o commit e o PR, que o usuário pede.

### O que foi feito

| Etapa | Entrega |
|---|---|
| **E1** Glossário | `data/glossario-combate.json`: 89 magias (as outras 20 estão em `magias30.js`), 20 talentos, 62 habilidades de classe e 15 traços de raça. Os textos foram escritos por agentes, cada um conferindo o SRD 3.0, e revisados por 3 revisores independentes (45 + 44 magias; habilidades, raças e talentos). |
| **E2** Modelo | `js/rules/card30.js`: o card de catálogo e o de personagem (as 11 classes, com e sem `ficha`). |
| **E3** Tela | `js/pages/ficha-card.js` + `css/card.css`: o card, o cartão da galeria e o popup. 74 cards × 3 larguras (1440, 768, 375) sem estouro de tela, contraste AA (menor razão 5,1), Fechar sempre à vista. |
| **E4** Bestiário | `js/pages/bestiario.js`, rota, menu (Compêndio, depois de Raças), tile na página inicial, `?ver=`. |
| **E5** Arena | Botão de ícone ao lado do nome no seletor, na lista de cada lado, nos painéis da luta, no resultado e no lote. O `cleanup` fecha o card, e `ocupada()` o conta. |
| **E6** Fechamento | `CLAUDE.md`, este arquivo e o `BACKLOG.md`. |

**Testes:** `ded_make_character_card` (22), `qa_ded_card` (20 passos de E2E) e os de antes, todos verdes (arena 10, combate 53, magias 18, ia 21, personagem 18, catálogo 9, rules 18, choices 10, listing 7, store 11, e o E2E `qa_ded_make_character` com 41).

### Revisão

- **Plano:** aprovado com ressalvas na 1ª rodada; as 11 ressalvas entraram no plano (números da `mecanica` por folha, glossário com uma fonte por magia, ciclo de vida da Arena, personagem sem `ficha`, etc.).
- **Conteúdo (3 revisores):**
  - Magias: nenhuma regra da 3.5 passou, mas 1 escola errada (Palavra de Recordação é transmutação na 3.0), 4 afirmações sem fonte ou enganosas (Cajado em Cobra, O Apavorante Gás de Luigi, Aura Sagrada, Blasfêmia, Sementes de Fogo e outras) e ~20 omissões. Todas corrigidas.
  - Habilidades de classe e raça: 6 erros de regra, quase todos da 3.5 (Senso da natureza, Companheiro animal, Caminho da floresta, Imunidade a venenos, Familiar, Contracanto e fascinar) e 10 imprecisões. Corrigidos.
  - Talentos de Tormenta: o texto agora diz o que o livro e o Tormenta RPG afirmam, e só isso.
- **Código e interface (1 revisor, com mutation testing):**
  - **Alta:** o card mostrava a CD errada em 22 magias (ignorava `mecanica.cd`). Corrigida, e o teste agora confere a CD de cada magia com o motor.
  - **Média:** notação interna que vazava (`0d0+8`, rótulos sem acento, valores em forma de chave, "dano extra" de engolir sumido), notas e restrições de alvo perdidas, aviso de textos incompletos atrás do popup, soltar o mouse fora fechava o card, e magias duplicadas ou "×99" no card do personagem. Corrigidos.
  - O teste "números batem com o motor" deixava passar 12 de 20 mutantes; agora confere iniciativa, deslocamento, resistências, BBA, agarrar, atributos, crítico, dano extra, RD, RM e a CD de cada magia.
  - Baixas: Home e End nas abas, hierarquia de títulos, nome do botão, tamanho do botão (32 px), código repetido, ordem das seções no celular. Corrigidas.

### Divergências do catálogo achadas na revisão (fora do escopo; o card mostra o que o catálogo diz)

- **Arma Espiritual** (Mestre-Arsenal): o catálogo usa `1d8+4` e BBA + mod. de Sab, que é regra da 3.5; no SRD 3.0 é `1d8` e só o BBA.
- **Palavra Sagrada** (Paladino de Arton): o catálogo aplica "cego" abaixo de 12 DV; a tabela do SRD 3.0 diz "lento". O catálogo segue o texto da magia, e o glossário também.
- **Aura Sagrada:** a nota do catálogo diz que a RM vale só contra magias malignas; no SRD vale também contra as magias de criaturas más.
- **Ferir** (Avatar de Sszzaas, mago) e **Destruição Sagrada** (Dragão de Prata Antigo, feiticeiro): no SRD 3.0 não estão nessas listas.
- **Bônus de CA do monge sem armadura** (`dnd30.js`, linhas ~273 e ~454): a ficha soma `max(0, Sab)` ao bônus de classe; o SRD 3.0 soma o modificador de Sab (que pode ser negativo) ao bônus de classe e só aplica o total se for positivo. Com Sab negativo a partir do 5º nível, a ficha dá 1 ponto a mais do que o glossário descreve. Fora do escopo deste PR: há uma tarefa separada para conferir e corrigir.
- Os talentos de Tormenta (regionais, Forma do Mar…) só têm efeito de combate confirmado no livro em poucos casos; o glossário marca o que vem do Tormenta RPG.

### Limitações

- As habilidades de classe que a ficha do app ainda não lista (ranger, guerreiro) ficam sem texto: o card mostra o que a ficha lista.
- Voltar com o card aberto sai do Bestiário (a URL muda por `replaceQuery`, sem entrada no histórico).
