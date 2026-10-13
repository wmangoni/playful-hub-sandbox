# 📂 Arquitetura e Padrões - A Masmorra de Drakmor

Um jogo de RPG de aventura textual interativa (estilo livro-jogo de D&D) onde o jogador explora uma masmorra perigosa, faz escolhas morais e táticas, realiza testes de atributos rolando dados e gerencia seu inventário.

## 🏗️ Arquitetura do Código

O jogo está estruturado com base nos seguintes arquivos:
- **`index.html`**: O ponto de entrada principal que contém o HTML das telas (painel de estatísticas, tela de log, área de imagem de cenário e janelas modais de loja), além do motor principal JavaScript de controle da aventura. O CSS fica em `css/`.
- **`assets/scenes.json`**: Base de dados em formato JSON que armazena a estrutura da árvore narrativa de decisões. Cada entrada representa uma cena contendo descrição, imagens, caminhos de escolha e callbacks associados (`onEnter`).
- **`assets/vitrais.json`**: a arte de cada cena que tem imagem própria (a chave é o id da cena). Cada entrada traz:
  - `arquivo`, em `images/`;
  - `local`, o nome do lugar na fita sobre a narrativa;
  - `foco`, o `object-position` que mantém o assunto dentro do arco do vitral;
  - `alt`.

  Uma cena sem arte própria mantém a do vitral. Arte nova entra aqui, conferida no recorte do vitral.

  As artes são WebP com perda, em qualidade 80 (`python -I ded/tools/converter-artes.py`), com o lado maior em até 1024 px (1280 nas artes em retrato). Duas cenas com a mesma arte apontam para o mesmo arquivo (o acampamento de `buy_supplies` e `check_supplies`).
- **`index_new.html` / `d3.html`**: Versões experimentais/alternativas que testam mecânicas e interfaces adicionais do ecossistema do jogo.

### 🎨 Interface "Ficha Iluminada" (`TASKS/TASK_001.md`)

A interface foi trocada por fases. O plano, as fases e as regras de performance estão em `TASKS/TASK_001.md`.

- **Sem telas legadas desde a Fase 4.** O `legado.css` e as fontes do Google saíram. Tudo o que aparece é uma `.folha` (as duas telas e, por dentro, cada janela) ou uma peça do kit com fonte e cor próprias (avisos e efeitos de tela).
  - O reset do kit (`base.css`) vale só dentro da `.folha`, com especificidade zero (`:where`). O fundo escuro fica no `body.ficha`.
  - `.hidden` (`display: none`, no `base.css`) vale em tudo, menos nos filhos de `.acoes`.
- **`css/` do kit**, nesta ordem de carga:
  - `fontes.css`: `@font-face` das fontes do projeto;
  - `tokens.css`: cores, tipografia e camadas (`--z-*`);
  - `base.css`: escala da tela em `rem`, o reset (só dentro da `.folha`), o fundo do `body.ficha` e utilitários;
  - `componentes.css`: as peças e o comportamento responsivo delas (folha, painel com fita, emblemas, medalhões, slots, escolhas, ações, bandeja do d20, selos de cera, crônica, card de inimigo, efeitos em jogo, ações de combate, clarão vermelho e números flutuantes);
  - `selecao.css`: só o arranjo da seleção de personagem, sob `.tela-selecao`;
  - `exploracao.css`: só o arranjo da tela de exploração (e do combate, que é um estado dela), com tudo sob `.tela-exploracao`;
  - `janelas.css`: o miolo de cada janela (loja, especialização, diário, mapa e fim), sob o id dela, com a largura em `--largura-janela`;
  - `ui/ornamentos/vitral-recorte.css`: o recorte em arco da cena, gerado.
- **Telas:** cada tela é uma `.folha` com a classe dela: `#character-select.tela-selecao` e `#game-screen.tela-exploracao`. `mostrarTela()` alterna as duas e põe `hidden` no `<main>` que sai de vista, para o leitor de tela achar um só (o `display: grid` da `.mesa` vence o `hidden`, e a exploração em espera segue montada).
  - A seleção some com `.hidden`.
  - A exploração, fora de vista, fica em `.tela-em-espera`: montada e invisível, com o layout pronto para o "Começar".
  - Janelas, avisos e efeitos de tela ficam **fora** da `.folha`. As janelas e os avisos vão para a camada de cima da página (top layer); os efeitos usam `--z-efeito`.
  - A `.folha` isola as próprias camadas, para não disputar com o que fica fora dela.
- **Janelas (Fase 4):** loja, especialização, diário, mapa e fim da aventura são `<dialog class="janela" id="…">` com uma `.folha.janela-folha` dentro (fita rubra no título, medalhão `.janela-fechar`, `.janela-corpo` que rola, `.janela-rodape`, `.janela-secao` e a `.janela-status`, com `role="status"`).
  - `abrirJanela(id, { obrigatoria })` abre com `showModal()`: o foco entra (no `autofocus`, se houver), o resto da página fica inerte e, ao fechar, o foco volta sozinho para quem o tinha antes. `fecharJanela(id)` fecha com a animação de saída; reaberta no meio dela, a janela fica.
  - A janela e o fundo entram e saem só com opacidade e ficam numa camada própria (`will-change: opacity`) enquanto abertos. Nada anima dentro de uma janela: uma camada animada lá dentro (o anel que saía do lugar atual do mapa) compilava um pipeline da GPU na primeira abertura de cada sessão.
  - Fecham a janela: Escape, o medalhão, um `[data-fechar-janela]` e um clique no fundo (só se o toque começou no fundo: um arrasto que sai da janela e termina nele não fecha). A obrigatória (a especialização) só fecha pela escolha; como o Chrome fecha um modal à força no terceiro Escape seguido, ela reabre no evento `close` enquanto não houver escolha.
  - Só uma janela fica aberta por vez. `loadScene` e `startInteractiveCombat` fecham as que não são obrigatórias. Com uma janela aberta, `body.com-janela` para a chama do vitral.
  - Com uma janela aberta, o resto da página fica inerte também para o leitor de tela: o retorno de uma ação feita na janela (comprar, um lugar selado) vai para a `.janela-status` dela.
  - **Mapa (`#mapa`)**: o selo alterna a janela (`aria-expanded` acompanha). Os caminhos são um SVG só de traços, e os lugares, botões posicionados por porcentagem (`.mapa-no[data-no][data-estado]`), montados num `requestIdleCallback` depois da carga (`montarMapa`) e atualizados só no que muda (`atualizarMapa`; `renderMinimap` não faz nada com o mapa fechado). Só um vizinho ainda não visitado e com cena leva a algum lugar; um vizinho selado continua clicável e diz por quê. O mapa fica parado (`aria-disabled` e o motivo em `#mapa-status`) na luta, durante o d20 e o avanço depois dele (`dadoEmJogo`), com a especialização pendente e nos finais.
  - **Loja (`#loja`)**: `abrirLoja()`, chamada pelo `scenes.json`, abre a janela um quadro depois da cena. As mercadorias vêm de `MERCADORIAS`; sem ouro ou com a mochila cheia, a linha fica `.indisponivel`, continua clicável e explica o motivo em `#loja-status`. Uma compra grava o save.
  - **Especialização (`#especializacao`)**: `openSpecializationModal()` abre dois quadros depois do pedido e, com uma luta aberta, espera ela fechar (`abrirEspecializacaoPendente`, chamada por `closeCombatScreen`). Aberta ou pendente, não remonta nem toca o som de novo. `chooseSpecialization(nome)` escolhe e fecha. Um save do nível 3 sem especialização volta com a janela.
  - **Diário (`#diario`)**: `renderQuestJournal()` só remonta com o diário aberto. Lista as missões em andamento e as concluídas (as inativas não aparecem), com o progresso que os dados guardam (alavancas, runas) e os créditos dos ícones no rodapé.
  - **Fim (`#fim`)**: um final de `CENAS_FINAIS` abre a janela ~1,2 s depois de o texto terminar (`agendarFim`; nunca no meio de uma luta, e depois de uma janela obrigatória). Uma cena nova cancela (`cancelarFim`). `FINAIS` tem o título e a mensagem de cada final, e o resumo sai do `gameState`. A janela abre com o foco em "Rever a cena" (`autofocus`), e não no botão que apaga o save. O "Começar uma nova aventura" da cena continua lá.
- **Vitral (Fase 5):** a arte fica em duas camadas fixas, `.vitral-arte` dentro de `.vitral-artes`: `#image` é sempre a que está à vista (`.vitral-arte-cima`), e a outra fica escondida, com `alt=""` e `aria-hidden`, sem `src` na carga.
  - Na troca de cena, `changeImage(cena)` decodifica a arte nova na camada escondida (que sobe ainda em opacidade 0) e a esmaece sobre a velha em 400 ms (`ESMAECER_ARTE`, `mostrarArte`). O id, o `alt` e o `aria-hidden` passam para a camada nova no começo do esmaecer.
  - Vale o último pedido (`pedidoArte`), e um esmaecer espera o anterior acabar. A promessa de `changeImage` resolve no fim do esmaecer (ou na troca, no movimento reduzido, ou na hora, se a arte não muda).
  - As camadas têm `will-change: opacity` só no movimento padrão. No reduzido, a troca é na hora, como antes.
  - Ferramentas e testes que fotografam o vitral esperam o `#image` ter o `src` certo e nenhuma animação em `.vitral-arte`.
- **Celular e tablet (Fase 5):** os pontos de quebra são em `em` (`68.6875em` = 1099 px, `43.75em` = 700 px, `56.25em` = 900 px, `37.4375em` = 600 px, e `max-height: 32.5em` para o celular deitado), para uma fonte maior no navegador levar ao layout que rola. A raiz estreita é `93.75%` (15 px no padrão), e segue a fonte escolhida no navegador; a do desktop não (TASK_001 §7).
  - No celular, uma coluna: as colunas viram `display: contents` e as peças vão por `order` (vitral, narrativa ou combate, vitais, crônica ou relato, ficha). A partir de 43.75em, duas colunas.
  - `TELA_ESTREITA` (o mesmo media query do CSS) liga `trazerAVista`, `mostrarCenaNova` e `voltarAoTopo`: a cena nova e o combate entram à vista com uma rolagem (suave; instantânea no reduzido), lendo layout só no `noProximoQuadro`. `history.scrollRestoration` é `manual`. No desktop, nada disso roda.
  - No estreito, o estado escondido de `.acoes` sai do fluxo: a altura da célula muda uma vez na troca entre escolhas e bandeja.
  - O mapa em retrato vira de lado só no CSS (`container-type: size` e `matrix(0,1,1,0,0,0)`): o JS segue escrevendo `left`/`top` em % e o `viewBox`. No celular deitado, a carta rola de lado dentro da janela.
  - O `#floater-layer` é `fixed` no celular. Na seleção, "Começar a aventura" fica numa barra `sticky` no rodapé.
  - Alvos de toque de 44 px, narrativa de 16 px ou mais e nada rolando de lado a 375 px (o caso 15 do `qa_ded`).
- **Avisos (Fase 4):** `avisar(texto, { tom, icone, duracao })` substitui o `alert()`: duas peças fixas reusadas no popover `#avisos` (acima de uma janela aberta), e o texto também em `#avisos-leitor` (`aria-live`). `avisarSemRepetir` não repete um aviso igual que ainda está na tela (a mochila cheia de três itens seguidos dá um aviso só). O aviso aparece um quadro depois de pedido: o do mercador vem do `onEnter` e caía no quadro da cena mais longa. Um aviso novo numa peça anula a entrada ainda pendente do anterior (`peca.vez`); sem isso, com três avisos seguidos, o temporizador do primeiro tirava o terceiro antes da hora. `avisar(texto, { leitor: false })` não escreve no `#avisos-leitor` (quando a crônica já anuncia a mesma coisa).
- **Leitor de tela (Fase 5):**
  - `anunciar(texto)` escreve no `#avisos-leitor` (o teste de combate usa).
  - A rolagem é anunciada uma vez, pela linha da crônica: o `#result-message` não é região viva, e o `#dice-button` é descrito por `bandeja-titulo result-message`.
  - `#choices` é um `role="group"`. Quando o foco entra nele pelo teclado numa cena nova, `focarPrimeiraEscolha()` o nomeia pelo lugar, pelo texto da cena e pela pergunta (`aria-labelledby="local scene-text escolhas-titulo"`), e o nome sai quando o foco deixa o grupo: o leitor ouve a cena e depois a escolha.
  - `addToLogSemRepetir()` não repete uma linha igual seguida (a mochila cheia, a barreira). Na luta, a crônica fica escondida: `avisarMochilaBloqueada()` e o nível novo também vão para o relato do combate.
  - As barras de vida têm `aria-valuetext` ("12 de 20"), e os espaços travados do equipamento dizem por quê no `aria-label`.
  - Contraste AA medido contra o fundo pintado de verdade (o pergaminho, os gradientes, a arte): `--sepia` `#533a24`, `--apagado` `#483d33`, `--verdete` `#2f452d` e `--sepia-escuro` `#3e2a1a`, com as trocas por lugar no fim do `tokens.css` (`.janela-folha`, `.janela-status`, `.creditos`, `.campo dt`). Os anéis de foco têm 3:1 contra o que fica em volta (por isso o terceiro anel, de tinta, em `.selo`, `.janela-fechar` e `.mapa-no`).
- **Escolhas e d20:** `#choices` e `#dice-container` dividem a mesma célula de `.acoes`.
  - O jogo e os testes ainda os alternam com `.hidden`, que ali só deixa invisível. A altura não muda (no estreito, muda uma vez: ver "Celular e tablet"), e as camadas do resultado (selos de cera, brilho e d20 apagado) ficam pintadas com `opacity: .01`.
  - Nenhum outro filho direto de `.acoes` pode usar `.hidden` esperando `display: none`.
  - `#choices` recebe o título e os botões das escolhas, na ordem do `scenes.json`.
  - Só as cenas de `CENAS_FINAIS` (mortes e vitórias) oferecem "Começar uma nova aventura". Uma cena sem escolhas que volta sozinha pelo `onEnter`, como a da poção, mostra só "A aventura continua…".
  - Depois do resultado, o `#dice-button` vira "Continuar" ("Enfrentar", no teste de combate) e avança na hora. Sem clique, o jogo avança sozinho em 1,8 s.
  - Escolhas e "Continuar" recém-montados ignoram ativações por 300 ms (`PAUSA_ATIVACAO`): um segundo Enter não escolhe na cena nova sem ela ser lida. Testes e ferramentas esperam pelo menos 400 ms depois de um `loadScene` antes de clicar numa escolha.
- **Combate:** é um estado da folha de exploração, não uma tela.
  - `startInteractiveCombat(inimigo)` abre o combate e `mostrarCombate(true)` troca a narrativa (`#narrativa`) pelo painel `#combat-screen` e a crônica (`#painel-cronica`) pelo relato `#combat-log-box`, alternando `.hidden`. `closeCombatScreen()` desfaz a troca. A ficha, o vitral e o nível continuam à vista.
  - O painel tem o card do inimigo (retrato em medalhão do sprite, nome, barra de vida, armadura e os selos de vitória e derrota já pintados), os efeitos em jogo (`#combat-condicoes`, `atualizarCondicoes()`), a bandeja do d20 do combate (a mesma peça da exploração, menor) e as ações.
  - Nome, gênero e ícone de cada inimigo saem de `INIMIGOS`; `inimigo(prep, maiuscula)` escreve "o Goblin", "da Aranha" etc.
  - As ações são `.escolha.acao-combate` montadas por `botaoCombate()`, com o ícone no medalhão e um detalhe à direita (recarga, custo, "ativa"). No turno do inimigo elas ficam com `aria-disabled` e mantêm o foco. Uma habilidade indisponível continua clicável e explica o motivo no relato.
  - Como as escolhas, as ações ignoram ativações nos 300 ms depois de montadas (`montarAcoes` grava o momento; `cedoDemais`). Testes e ferramentas esperam 400 ms antes de clicar numa ação recém-montada.
  - O "Voltar" de um submenu devolve o foco à ação que o abriu.
  - No fim da luta (vitória, derrota ou fuga), `mostrarDesfecho()` carimba o selo e troca as ações por um "Continuar" (`#btn-combat-continuar`), que fecha a luta e carrega a cena seguinte. Quem estava no painel pelo teclado fica nele e, depois, na primeira escolha da cena. Sem clique, a luta fecha sozinha em 2,2 s (2 s na derrota, 1,8 s na fuga).
  - O relato (`addCombatLog`) segue a crônica: ícone e tom pelo emoji do começo (`RELATO_ICONES`), sem emojis no texto, e o resultado do d20 carimba o selo da bandeja.
  - Efeitos: clarão vermelho (`#red-flash`), brilho de impacto (`.impacto`), tremor e números flutuantes, todos com Web Animations em `opacity` e `transform`. A barreira mágica tem o clarão dela (`#clarao-barreira`, em verdete e ouro), do mesmo jeito. Os números flutuantes são quatro peças fixas em `#floater-layer` e uma na vida do herói, reusadas por `spawnFloater()`; não crie nem remova elementos para eles.
  - Durante a luta, `body.em-combate` (de `mostrarCombate()`) dá camada própria ao que treme, brilha ou desliza a cada golpe; fora dela, a ficha não carrega essas camadas. Seletores ligados a essa classe terminam em classe, nunca em tag.
  - Aquecimento da GPU: a peça `.aquecer-gpu` tem o desenho do preenchimento da barra em combate (retângulo arredondado com gradiente, numa camada própria), o único que só o combate faz. Ela nasce no HTML, a 1% num canto à vista, entra na primeira pintura da abertura e sai dois quadros depois (`encerrarAquecimento`). Sem ela, a primeira luta de uma sessão longa esperava ~40 ms o Chrome compilar o pipeline. A peça e o preenchimento dividem a mesma regra de gradiente, e a barra do inimigo mantém o mesmo número de paradas. Não a mude de momento sem medir o "Começar": criada meio segundo depois da abertura, ela o deixava em 3 vsyncs. Não dê camada permanente ao preenchimento: ela muda a rasterização do texto da exploração em 1366×768. Se outra peça do combate passar a usar um desenho novo, aqueça-o junto. Uma segunda peça, `.aquecer-gpu.aquecer-gpu-clarao`, aquece o clarão da barreira (gradiente radial de três paradas numa camada própria), que compilava ~32 ms na primeira barreira de uma sessão. As duas saem juntas.
  - A volta do combate para a cena (`fechar` em `mostrarDesfecho`) deixa a narrativa nova invisível no primeiro quadro e a mostra no seguinte (`esconderNarrativaUmQuadro`): a crônica e a narrativa rasterizadas de novo não cabiam num quadro só. O foco espera a narrativa aparecer (`focarNoQuadro` tenta de novo).
  - No movimento reduzido, sem a máquina de escrever, o texto da cena espera a arte nova entrar no vitral e aparece um quadro depois, ou em no máximo 250 ms (`mostrarTextoDepoisDe`, com a promessa de `changeImage`). A arte entra depois de decodificada, num quadro qualquer, e com o texto inteiro no mesmo quadro passava do limite.
  - A ficha e o card do inimigo escrevem só o que mudou (`escreverTexto`, `escreverAtributo`, `escreverHtml`): reatribuir o mesmo texto troca o nó e repinta a ficha inteira a cada golpe.
- **Nomes:** em português, exceto os que são contrato com o JS e os testes do jogo:
  - o d20: `#dice`, `.dice`, `.rolling-animation`, `.critical-success-bg` (20 natural), `.falha-critica` (1 natural), `#dice-container`, `#dice-button` e `#result-message`;
  - as escolhas: `#choices`;
  - a seleção: `.character-card[data-class]` e `.selected`. O primeiro `<button>` de `#character-select` é o de começar;
  - os atributos: `#val-*` e `#mod-*`. O modificador sai como `+3` e `−1`;
  - o combate: `#combat-screen` (alternado com `.hidden`), `#combat-enemy-name`, `#combat-enemy-ac`, `#combat-actions-panel` e os botões `#btn-combat-attack`, `#btn-combat-spell` (sempre presente: leva a habilidade da classe ou as da especialização, e só fica oculto sem classe, nos testes), `#btn-combat-item` e `#btn-combat-flee`;
  - o equipamento: `.inventory-slots-grid .inventory-slot-box`, com `.occupied`, `.usable`, `.disabled` e `.item-name`. O ícone fica em `.item-icone use` (`href` com `#i-*` do sprite) e a descrição no `title` do slot;
  - as janelas: `#mapa` (e o selo `#btn-toggle-map`, que a alterna), `.mapa-no[data-no][data-estado]` e `#mapa-status`; `#loja`, `#loja-mercadorias` e `#loja-status`; `#especializacao` e `[data-especializacao]`; `#diario` (e o selo `#quest-journal-button`); `#fim`, `#fim-titulo` e `#fim-recomecar`; o fechar de todas, `.janela-fechar`; os avisos, `#avisos .aviso`;
  - os globais que o `scenes.json` chama (pelo nome, no escopo global): `abrirLoja`, `renderQuestJournal`, `activateQuest`, `decodeRune`, `toggleLever`, `avisar`, `spawnFloater`, `changeMusic` e os de estado (`gameState`, `changeXP`, `changeGold`, `changeHealth`, `addToInventory` etc.);
  - os globais que as ferramentas usam: `scenes`, `gameState`, `skipTyping`, `ttsEnabled`, `selectCharacter`, `startGame`, `loadScene`, `startInteractiveCombat`, `closeCombatScreen`, `openSpecializationModal`, `chooseSpecialization`, `SPECIALIZATIONS`, `changeXP`, `abrirLoja`, `abrirJanela`, `fecharJanela`, `abrirFim`, `cancelarFim`, `avisar`, `teleportToNode` e `renderMinimap`.

  No kit, o d20 vale só para `.bandeja-mesa > .dice`.
- **`ui/`**: as artes da interface.
  - `ui/ornamentos/*.svg` e `vitral-recorte.css` são **gerados** por `node ded/tools/gerar-ornamentos.mjs`. Não edite os SVGs à mão: mude o script e rode de novo.
  - `ui/texturas/*.webp` vêm de `python -I ded/tools/gerar-texturas.py ded/ui/texturas`.
  - `ui/icones.svg` é o sprite de ícones do game-icons.net (CC BY 3.0). Cada símbolo traz a origem num comentário; os créditos estão em `ui/CREDITOS.md`.
  - Na abertura, o jogo busca o sprite e o embute no documento. Ícone criado pelo JS usa `hrefIcone(id)`, que aponta para o sprite embutido (ou para o arquivo, enquanto ele não chega); o HTML fixo continua em `ui/icones.svg#…`. Um `<use>` novo apontando para o arquivo externo faz o Chrome refazer o layout da folha num segundo passe.
  - `ui/fontes/` guarda Alegreya, Grenze Gotisch e Marcellus SC (subconjunto latino, SIL OFL; licenças em `OFL-*.txt`).
- **`prototipo/`**: referência viva do visual, sem lógica de jogo e com `noindex`.
  - `index.html` é a tela de exploração aprovada na Fase 0.
  - `componentes.html` é o catálogo do kit: cada peça e as variantes que o jogo usa.
- **Prova visual:** `node ded/tools/capturas.mjs capturar <pasta>` gera capturas determinísticas do jogo, do protótipo e do catálogo. `node ded/tools/capturas.mjs comparar <antes> <depois>` compara pixel a pixel. Use os dois em toda mudança de CSS: capture antes, mude, capture depois e compare.
  - Uma referência boa sai de um worktree no commit anterior, com `--raiz <worktree>`.
  - As janelas saem abertas pelas funções do jogo (`jogo-mapa`, `-loja`, `-especializacao`, `-diario`, `-fim-morte`, `-fim-vitoria`) e um aviso sobre o diário aberto (`jogo-aviso`), em 1080p, 1366×768 e 390×844 (o celular, desde a Fase 5, passa pelo jogo inteiro, com o combate).
  - `--tolerancia N` ignora diferenças de até N por canal. A borda de alguns SVGs varia até ~31 entre duas capturas iguais (TASK_001 §7).
- **Desempenho:** `node ded/tools/desempenho.mjs` mede o tempo dos quadros no Chrome com GPU. Cobre a digitação, o teste de d20, os críticos, o combate (entrada, rodada, vitória, derrota e fuga), as janelas (abrir e fechar, viajar pelo mapa, comprar, escolher a especialização, o fim), os avisos, a barreira e o aceite do primeiro clique, repetido 30 vezes. Rode depois de mexer em animação, bandeja, combate, vitral ou janelas.
  - A aba de aquecimento joga o d20 antes de medir (`--aquecimento d20`, o padrão), e a primeira execução de cada cenário conta. Ela mede o custo de primeira vez da sessão: o primeiro desenho de cada coisa nova numa sessão do Chrome compila pipelines da GPU, e o jogador paga isso em toda sessão. Um quadro com compilação sai marcado "compilação da GPU". `--aquecimento janelas` passa antes por cada janela, para isolar o custo de toda vez.
  - A parada de ~500 ms do próprio Chrome (`GpuServiceImpl::GetDawnInfo`) é reconhecida pelo nome no rastreio, e a execução é refeita uma vez. Um quadro com compilação nunca é refeito.
  - Depois de carregar cada aba, a ferramenta espera 1,5 s antes de jogar (`ASSENTAR_MS`). Cerca de 1 s depois da carga, o Chrome desmonta o documento inicial da aba (até ~28 ms na thread principal), e isso caía no meio da medição.
  - Uma execução em meia taxa (a mediana dos quadros em 2 vsyncs, o ambiente degradado com alguém usando o PC) é refeita uma vez, e o veredito diz quantas foram. Se continuar, o veredito sai INVÁLIDO: refaça com a janela do Chrome à vista e o PC quieto. Com 30% ou mais das execuções no pior quadro em 3 vsyncs, o relatório sugere um controle intercalado (numa bateria sã, 13 a 18%).
  - `abertura-save` (só informa) mede a carga com um save: o jogo abre direto na exploração e digita a cena salva, sem a espera de assentar.
  - A régua de 20,8 ms vale a 144 Hz e em outras taxas: a 60 Hz, ela quer todo quadro em 1 vsync (2 vsyncs são 33,3 ms). As baterias das fases 2 a 5 foram a 144 Hz.
  - Um quadro que cai na limpeza ociosa da GPU do Chrome (uns 30 a 70 ms, cerca de 1 s depois de a página parar de rasterizar) sai listado à parte e fora do veredito, com a prova no rastreio. Ver o cabeçalho do script e o §6 da TASK_001.
  - As duas ferramentas forçam o movimento padrão. Com as animações do Windows desligadas, o Chrome pede movimento reduzido e o jogo pula justamente a animação.
  - Dentro da janela medida, a ferramenta não pode ler layout.
- **`server.js`:** serve `/ded/css` e `/ded/ui` com `no-cache` (revalida por ETag), para um deploy não juntar HTML novo com CSS ou artes antigas.
  - A exceção é `/ded/ui/fontes`, com cache de 30 dias. Uma fonte nova entra com **outro nome de arquivo**: nunca substitua um `.woff2` mantendo o nome.
- **Regras do kit:**
  - Números em Alegreya com algarismos alinhados (`.num`); os algarismos do Marcellus SC parecem letras. Há uma exceção: o número do d20, as fitas e o título ficam na Grenze Gotisch, com `font-variant-numeric: lining-nums`.
  - Animar só `transform` e `opacity`. Transições de cor só valem em hover e foco de elementos pequenos (escolhas, selos). Nada de transição em `clip-path` ou outra propriedade de pintura: ela repinta a cada quadro.
  - A barra de vida: o preenchimento (`span::before`) tem camada própria e desliza com `translateX` dentro de uma janela de recorte **retangular** (o `span`); a ponta esquerda é um disco parado (`.barra-vida::before`). Camada animada sob `overflow: hidden` com `border-radius` faz o compositor compilar um shader de recorte arredondado no primeiro uso (50 a 130 ms).
  - O que anima de novo e de novo (números flutuantes, tremor do retrato e da vida) mora numa camada que nunca some: criar e destruir camadas faz a GPU pagar a limpeza das texturas depois.
  - Nada de `filter` em peça que repinta (o medalhão do nível tem a sombra num gradiente) e nenhuma camada da tela toda sempre composta (o clarão vermelho fica em `opacity: 0`, nunca a 1%).
  - O anel de XP é um traço SVG de cor sólida: com gradiente, o primeiro XP compilava um pipeline novo na GPU.
  - Não ler o layout logo depois de mudar o DOM (`scrollHeight`, `offsetTop`, `scrollTop`, `focus()`). Leve a leitura para o próximo quadro com `noProximoQuadro()` ou `focarNoQuadro()`.
  - Camada própria para algo que fica parado vem de `will-change: opacity`. Com `transform`, o Chrome não alinha a camada ao pixel e ela borra. As exceções são peças sem texto parado que só deslizam ou sobem: o preenchimento da barra de vida e os números flutuantes (invisíveis em repouso).
  - Nada de `backdrop-filter`, nem de `filter` ou sombra desfocada grandes (use gradientes).
  - Janela ou efeito novo não traz desenho que nenhuma outra tela faz. Gradiente radial, sombra desfocada (inclusive a interna), borda tracejada num círculo, gradiente ao lado da fita (passe com MSAA; por isso o botão secundário tem fundo sólido) e camada animada dentro de uma janela compilam um pipeline da GPU (até ~150 ms) na primeira vez de cada sessão do Chrome. Use cor sólida, borda contínua e sombra sem desfoque, ou aqueça o desenho na primeira pintura. Prove com a primeira abertura numa sessão nova, de perfil vazio (TASK_001 §6).
  - Na hora de revelar um resultado, nunca troque `background-image`: deixe a camada pintada com `opacity: .01` e anime a opacidade.
  - Arte WebP com perda chega à GPU em YUV: o primeiro desenho de uma arte numa sessão compila um pipeline próprio (`HWYUVImage`, ~70 a 80 ms no "Começar"), no lugar do da arte em PNG (~67 ms). As trocas seguintes reusam.
  - No movimento reduzido, nada desliza: a barra de vida pula para o valor novo, e a arte do vitral troca sem esmaecer.
  - O limite é de 48 FPS em Full HD.

### Fluxo de Inicialização e Execução:
1. **Carregamento dos Dados (Fetch)**: O jogo inicia fazendo uma requisição HTTP via `fetch` para obter as cenas a partir de `assets/scenes.json`. As funções contidas nas strings do JSON são instanciadas via `new Function(...)`.
2. **Seleção de Personagem**: O usuário interage com a interface para escolher sua classe (Guerreiro, Mago, Ladino), o que inicializa os atributos de força (`str`), destreza (`dex`), constituição (`con`), inteligência (`int`), sorte (`luck`), bônus base de ataque (`bba`) e classe de armadura (`armor`).
3. **Mecanismo Narrativo**: Ao clicar em "Começar Aventura", a cena `start` é carregada, dando início ao ciclo narrativo orientado a eventos e cliques.

## 🧩 Padrões de Projeto Aplicados

- **Event-Driven (Programação Dirigida a Eventos)**: Toda a jogabilidade progride em resposta a eventos gerados pelas interações com botões de escolhas dinâmicas criados pela função `loadScene`, além de cliques no dado 20 faces virtual (`#dice-button`) e nas janelas (a loja, `#loja`).
- **State Pattern (Padrão Estado)**: O objeto global `gameState` funciona como a única fonte da verdade do estado da partida. Ele controla a cena atual (`currentScene`), a vida do jogador (`player.health`), moedas de ouro (`player.gold`), nível de experiência (`player.xp`), inventário (`player.inventory`), atributos dinâmicos do jogador (`player.stats`), a memória lógica (`mem`) e o adversário atual no combate (`currentEnemy`).
- **Typewriter Effect (Efeito Máquina de Escrever)**: A exibição do texto ocorre gradualmente através da função `typewriterEffect` para aumentar a imersão na leitura.
  - O texto entra montado, com uma `<span>` por palavra, e cada palavra só ganha opacidade na sua vez. Nada reflui e as escolhas não andam.
  - O efeito pode ser pulado com um clique no texto ou com `skipTyping = true`.
  - Respeita `prefers-reduced-motion`.
- **Text-to-Speech (TTS - Narrador por Voz)**: Integra a API nativa do navegador `window.speechSynthesis` para criar uma experiência de acessibilidade por áudio. O sistema mapeia dinamicamente vozes localizadas em português do Brasil (ex: 'Daniel' ou 'Maria') e reproduz falas de forma sincronizada ao carregar novas cenas.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas & DOM**: Manipulação direta dos elementos visuais e de fluxo de tela.
- **Web Speech API (`speechSynthesis`)**: Ferramenta nativa do navegador utilizada para conversão de texto em fala (TTS).
- **Web Audio API (HTML5 Audio)**: Execução de música medieval de fundo em loop via elemento `<audio>` nativo.
- **CSS Grid & Flexbox**: Utilizado para estruturar a tela do jogo em colunas de controle, log de eventos e visualizador de imagem.

## 🔑 Funções e Estruturas Principais

- `gameState`: Objeto global que rastreia os itens do inventário, inimigo atual, log da aventura e status do herói.
- `characterStats`: Estrutura de dados com as tabelas de atributos de cada classe disponível.
- `loadScene(sceneName)`: Limpa execuções anteriores de áudio/texto, troca a arte do vitral (`changeImage`, a partir de `vitrais.json`), carrega as opções disponíveis no JSON de cenas e monta dinamicamente o fluxo de botões e descrições na tela.
- `typewriterEffect(element, text, speed, callback)`: Revela o texto já montado, palavra por palavra, no ritmo de um caractere a cada `speed` ms.
- `rollDice()`: Executa uma rolagem aleatória de d20 (1 a 20) e adiciona os modificadores apropriados do personagem para decidir o sucesso ou falha em um teste narrativo de D&D.
  - O 20 natural soma 5, e o 1 natural tira 5.
  - A bandeja mostra a conta e carimba o selo do resultado. 1,8 s depois, a cena seguinte carrega sozinha.
- `updateStatsDisplay()`: atualiza a ficha (vida, armadura, ouro, nível e anel de XP, atributos e missões).
- `updateInventoryDisplay()`: monta os seis espaços do equipamento.
- `addToLog(message)`: escreve na crônica.
  - O ícone vem do emoji do começo da mensagem (`CRONICA_TIPOS`).
  - Os emojis saem do texto, e só `<strong>` é aceito. Uma linha só de emojis vira palavras (`emojisPorExtenso`), e uma linha vazia não entra.
- `speakText(text)` / `stopSpeech()`: Controla a síntese de fala baseada no navegador, filtrando vozes de fala em português do Brasil e evitando sobreposição de áudio.
