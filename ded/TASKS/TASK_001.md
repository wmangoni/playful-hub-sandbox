# 🎨 Tarefa 001 - Melhoria Visual: "Ficha Iluminada"

**Status**: 🚧 Em andamento. Fases 0, 1, 2, 3 e 4 prontas (a 3 e a 4 com resíduos de desempenho anotados no §7, e a 3 com decisões do dono). A Fase 5 (celular, acessibilidade, transições, WebP e o preview do hub) está implementada e medida (a 60 Hz, §12), em revisão pelo juiz.
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-ficha-iluminada`. Um PR em draft acompanha os commits de todas as fases.

---

## 1. Pedido do usuário (11/10/2026)

> Elabore um plano criterioso de melhorias para o jogo ded, hoje ele tá meio sem graça. Interface sem personalidade, visual simplista, mecânicas simples. Quero começar pelo visual, deixemos as mecânicas e o enredo para um segundo momento. Busco um visual para a UI semelhante (não precisa ser igual) a [uma ficha de personagem de D&D ornamentada].

Este plano substitui a versão anterior desta tarefa (tema escuro com glassmorphism e `backdrop-filter`), que contrariava a referência e o limite de performance.

## 2. Diagnóstico da UI atual

- **Quatro linguagens visuais misturadas:**
  - página creme com botões marrons genéricos;
  - painéis escuros "premium";
  - mapa em ciano e azul neon;
  - mensagens verde e vermelho no estilo Bootstrap.
- **Hierarquia invertida:** a narrativa fica numa caixa de 20vh, e o log ocupa uma coluna inteira. Em 1080p o inventário cai abaixo da dobra.
- **Identidade fraca:** Outfit (sans moderna) no corpo e 220 emojis no lugar de ícones.
- **Controles soltos e inconsistências:**
  - `<audio controls>` nativo, botões em `absolute` e link azul para a "versão beta" antiga;
  - modais inconsistentes;
  - 5 `alert()`.
- **Nada de responsividade ou acessibilidade básica:** nenhuma `@media`, nenhum estilo de foco, nada de `prefers-reduced-motion`.
- **Artes das cenas:** as 40 artes em pixel art são o melhor ativo visual. Mas têm tamanhos misturados, ocupam 15 MB em PNG e trocam sem transição.

## 3. Direção aprovada

- **Pergaminho claro sobre moldura escura**, como na ficha de referência.
- **Paleta:** pergaminho `#e9dcbf`, tinta `#2f1f12`, sépia `#6b4a2e`, rubro `#7e2320`, bronze `#8f6c34`, ouro `#c9a14f`, verdete `#3f5a3d`.
- **Fontes:**
  - Grenze Gotisch nos títulos, fitas e capitulares;
  - Alegreya na narrativa e em **todos os números** (algarismos alinhados);
  - Marcellus SC só em rótulos de letras, porque os algarismos dele parecem letras.
- **Ornamentos SVG gerados em código** por `ded/tools/gerar-ornamentos.mjs`.
- **Texturas pré-renderizadas** por `ded/tools/gerar-texturas.py`.
- **Ícones do game-icons.net** (CC BY 3.0), com créditos em `ded/ui/CREDITOS.md`.
- **A pixel art fica**, emoldurada num vitral gótico, com ponto focal por cena (`--foco`).
- **O link da "versão beta" sai.** `index_new.html` e `d3.html` ficam fora do escopo.
- **Fora de escopo agora:** mecânicas, enredo, textos das cenas e áudio.

## 4. Layout

Grade de 3 colunas no desktop: a ficha à esquerda, o vitral com a cena no centro e a narrativa com a crônica à direita. O cabeçalho usa as mesmas colunas (`subgrid`), e o título fica centrado sobre o vitral.

A tela inteira é medida em `rem`, com `1rem = 16px` em 1920x1080, e escala com a janela. Os rótulos pequenos têm piso em px.

No celular a tela vira uma coluna única, na ordem de jogo: o vitral, a narrativa (ou o combate) com as escolhas, os vitais, a crônica e a ficha. A partir de 700 px (43.75em), duas colunas: o vitral e os vitais à esquerda, a narrativa à direita, e a crônica e a ficha embaixo. Os pontos de quebra são em `em`, e a raiz estreita segue a fonte escolhida no navegador (Fase 5, §12).

## 5. Fases

| Fase | Entrega | Aceite |
|---|---|---|
| 0 ✅ | Protótipo estático da tela de exploração (`ded/prototipo/`) | Direção aprovada; juiz "excelente" |
| 1 ✅ | Fundação: CSS do `index.html` extraído para `ded/css/legado.css` **sem mudança visual**, mais tokens, fontes próprias, o kit de componentes e o catálogo (`ded/prototipo/componentes.html`) | Capturas idênticas às atuais; testes do ded verdes |
| 2 ✅ | Exploração, seleção de personagem e dado d20 no jogo real. Componentes novos: card de seleção de personagem e botão secundário | Layout novo no desktop; telas legadas idênticas com o kit carregado (1080p e 1366×768); aceite de performance; testes |
| 3 ✅ | Combate. Componentes novos: card de inimigo e barra de vida do inimigo | Idem |
| 4 ✅ | Loja, especialização, diário, mapa, telas de fim e toasts. Componentes novos: moldura de modal e toast, fora da `.folha` (camadas `--z-overlay` e `--z-toast`) | Nenhum `alert()`; modais consistentes |
| 5 | Celular, acessibilidade, transições, WebP, preview do hub e `npm run seo` | Sem rolagem horizontal em 375 px; contraste AA; `seo:check` |

## 6. Regras de performance

O limite é **nunca cair abaixo de 48 FPS em Full HD**, o que dá quadros de até 20,8 ms.

- **Como medir:** rAF sem limite, com CPU 1x e 4x, no pior momento: máquina de escrever, dado rolando e combate.
- **Primeiro clique do teste de dado:** 30 execuções em CPU 1x, sem nenhum quadro acima de 20,8 ms.
- **Folga do rAF:** o veredito aceita até 22,3 ms, ou seja, o limite de 20,8 ms mais uma folga de 1,5 ms.
  - O timestamp do rAF oscila cerca de ±0,5 ms em volta do vsync, e um quadro de 3 vsyncs a 144 Hz aparece como 20,5 a 21,7 ms.
  - A folga separa 3 vsyncs de 4 (a partir de ~26,9 ms) sem aceitar um vsync a mais em 60, 75, 100, 120, 144, 165 ou 240 Hz.
  - "Nenhum quadro acima de 20,8 ms" quer dizer, na prática, "nenhum quadro de mais de 3 vsyncs a 144 Hz".
- **Ferramenta:** `node ded/tools/desempenho.mjs` mede todos os cenários com GPU e janela de verdade: abertura, exploração, texto longo, teste de d20, os dois críticos, a entrada no combate pelo "Enfrentar", uma rodada, a vitória, a derrota, a fuga, as janelas (abrir e fechar o mapa, viajar por ele, a loja, uma compra, o diário, a especialização e o fim), um aviso, a barreira e o aceite do primeiro clique. Ela começa o jogo com cliques na seleção, como um jogador. A primeira interação da página liga o Web Audio e a voz, cerca de 10 ms de script.
  - Em CPU 1x, cada cenário roda 10 vezes (`--repeticoes`), cada vez numa aba nova; o primeiro clique roda 30 (`--execucoes`). Uma execução só não separa ruído de uma taxa de falha.
- **Layout forçado:** nada de ler o layout (`scrollHeight`, `offsetTop`, `scrollTop`, `focus()`, `getComputedStyle`, `getClientRects`) logo depois de mudar o DOM, no meio da cena. Esse tipo de leitura espera o próximo quadro (`noProximoQuadro`, `focarNoQuadro`).
  - Na Fase 2, rolar a crônica a cada mensagem custava até 6 ms por cena.
  - Zerar o `scrollTop` do texto forçava o primeiro layout da folha inteira dentro do "Começar".
  - A regra vale também para a ferramenta: as conferências dela dentro da janela medida só leem classes e atributos.
- **Movimento reduzido no ambiente:** com as animações do Windows desligadas, o Chrome do Puppeteer informa `prefers-reduced-motion: reduce`. Nesse caso o jogo pula a máquina de escrever, troca o giro do d20 por um esmaecer e apaga a chama.
  - `capturas.mjs` e `desempenho.mjs` forçam o movimento padrão (`--movimento reduzido` mede o outro caminho).
  - As medições anteriores à Fase 2, das fases 0 e 1, podem ter sido feitas em movimento reduzido.
- **`will-change: transform` em elemento parado borra:** o Chrome deixa de alinhar a camada ao pixel. Para dar camada própria a algo que fica parado, use `will-change: opacity`.
- **Ambiente da medição:** o Puppeteer abre o Chrome com o processo de GPU frio, o que gera picos de 300 a 800 ms nos primeiros ~500 ms que não vêm da página. Meça com um perfil persistente (`userDataDir`) e uma página de aquecimento antes.
- **Limpeza ociosa da GPU (Fase 3):** cerca de 1 s depois de a página parar de rasterizar, o processo de GPU do Chrome (Graphite sobre Dawn/D3D11) roda `GraphiteCacheController::ScheduleCleanUpAllResources` e devolve ao driver as texturas que o compositor descartou. Nesta máquina essa tarefa leva de 30 a 70 ms na thread principal da GPU, e o quadro que cai nela atrasa junto, sem trabalho da página naquele quadro.
  - Ela aparece quando a página fica parada mais de 1 s dentro da janela medida, como na vitória do combate, entre o selo e a volta para a cena. O combate antigo não a mostrava porque repintava a tela em todo quadro (38 a 76 ladrilhos rasterizados a cada 250 ms).
  - Com o Ganesh no lugar do Graphite (`--disable-features=SkiaGraphite`) ela some, mas os golpes ficam piores. O padrão do Chrome é o Graphite, e é com ele que se mede.
  - A página reduz o custo descartando menos texturas: o que anima de novo e de novo mora numa camada que nunca some (ver abaixo).
  - A primeira limpeza grande de uma página vem cerca de 1 s depois que a carga para de rasterizar. O cenário da exploração clica no "Começar" 1 s depois das fontes, e às vezes os dois coincidem: em 3 de 80 execuções da bissecção do §10, a tarefa (25 a 26 ms) caiu logo depois do quadro do clique, que levou 34,7 a 41,7 ms. Esse quadro conta contra a página, porque ela trabalhou ~12 ms nele.
  - `desempenho.mjs` grava um rastreio leve de cada medição (`toplevel` e a marca da ação). Um quadro acima do limite sai do veredito só quando as três coisas valem:
    - a tarefa roda na thread principal da GPU (`CrGpuMain`) durante o quadro;
    - sem o trecho da tarefa que cai dentro dele, o quadro caberia no limite;
    - a thread principal da página trabalhou menos de 3 ms nesse intervalo.
  - Esses quadros saem listados à parte, na coluna "GPU", com o trecho da tarefa e o trabalho da página, e o veredito diz quantos foram. Como a página influencia o custo (ele cresce com as texturas descartadas), uma aprovação que dependa dessa exclusão é decisão do dono do projeto.
  - Se o Chrome mudar o nome da tarefa, o quadro volta a contar contra a página. `--sem-rastreio` desliga o rastreio, para medir o custo dele. O rastreio leve não mudou a distribuição: em dois pares de baterias (texto longo e rodada de combate, 10 execuções cada), a mediana, o p95 e o p99 saíram iguais com e sem ele (6,9, 7,2 a 7,3 e 7,3 a 7,4 ms).
  - O rastreio de cada execução com um quadro acima do limite fica guardado (`--rastreios`), para achar a causa sem medir de novo. `--aquecimento janelas|d20|combate|nenhum` escolhe o que a aba de aquecimento joga. O padrão é `d20`, e a primeira execução de cada cenário conta: ela mede o custo de primeira vez da sessão, que o jogador paga em toda sessão do Chrome (os pipelines da GPU, em "O que evitar"). O rastreio leve marca como "compilação da GPU" o quadro em que o Dawn compilava um pipeline (`DawnPlatformImpl::RunWorkerTask` de 5 ms ou mais), e esse quadro conta contra a página. `janelas` passa antes uma vez por cada janela e efeito da Fase 4 e serve só para isolar o custo de toda vez; com `nenhum`, a sessão começa fria.
  - **Parada do ambiente:** a tarefa `GpuServiceImpl::GetDawnInfo` (~500 ms em `CrGpuMain`, uns 120 s depois de o Chrome abrir, §9) é reconhecida pelo nome no rastreio. A execução com um quadro de mais de 100 ms em que ela roda é refeita uma vez, e o relatório avisa. Um quadro com compilação do Dawn nunca é refeito. Sem rastreio (`--sem-rastreio`), vale o sinal antigo: todo LoAF longo sem script nem render.
  - **A aba assenta antes da ação:** cerca de 1 s depois da carga de uma aba nova, o Chrome roda na thread principal dela um desmonte: `WidgetBase::Shutdown` e `ProxyMain::Stop`, de 4 a 28 ms, mais uma tarefa na GPU. É provavelmente o do documento inicial da aba, que a navegação troca. A ferramenta jogava logo depois da carga, e esse desmonte caía no meio da medição do d20 e do primeiro clique, por volta de +340 ms, em 24 de 25 execuções. Ele explica os quadros de ~28 ms do texto longo, do d20 e dos críticos nesse momento. Com 1,5 s de espera depois da carga (`ASSENTAR_MS`), ele caiu em 0 de 25. Um jogador leva mais que isso para escolher a classe. A primeira hipótese, o desmonte da aba anterior, estava errada: esperar depois de fechar a aba não o tirou da medição.
  - **Meia taxa:** com alguém usando o PC, o Chrome da ferramenta chegou a passar baterias inteiras com a mediana dos quadros em 2 vsyncs (13,9 ms a 144 Hz), com a GPU parada fora delas. Num A/B intercalado, a mesma versão do código alternou entre 6,9 e 13,9 ms de mediana de uma bateria para a seguinte, com a ferramenta antiga e com a nova. Os cenários do jogo têm mediana de 1 vsync, então uma execução com mediana de 1,8 intervalo ou mais é refeita uma vez. Se a segunda também sair assim, o veredito sai **INVÁLIDO**: o ambiente estava degradado, e a bateria deve ser refeita com a janela do Chrome à vista e o PC quieto.
- **O que evitar:**
  - animar qualquer coisa além de `transform` e `opacity`, inclusive com `transition` em `clip-path` (repinta a cada quadro, e as texturas descartadas voltam como a limpeza da GPU um segundo depois);
  - camada animada recortada por um pai com `overflow: hidden` e `border-radius`: o compositor compila um shader de recorte arredondado no primeiro uso (50 a 130 ms na barra de vida, no primeiro golpe). Recorte retangular é de graça;
  - criar e destruir camadas para efeitos que se repetem (números flutuantes, tremores): use peças fixas, com camada própria desde a abertura;
  - `backdrop-filter`;
  - `filter` e `box-shadow` grandes com desfoque (use gradientes), e qualquer `filter` em peça que repinta: o `drop-shadow` do medalhão do nível refazia o desfoque a cada XP;
  - traço SVG com gradiente que muda (o anel de XP): o primeiro desenho dele compilava um pipeline novo na GPU (30 ms). Use cor sólida;
  - camada da tela inteira sempre composta, mesmo a 1%: o clarão vermelho assim piorava todos os quadros (em duas medições seguidas, o primeiro clique teve 9 de 15 execuções acima do limite com ele a 1% e 1 de 15 com ele em 0). Ele fica em `opacity: 0`, com `will-change: opacity` só durante a luta (`body.em-combate`);
  - trocar `background-image` na hora de revelar um resultado (deixe as camadas pré-pintadas com `opacity: .01`);
  - em ícone criado pelo JS, um `<use>` que aponta para o sprite externo (`ui/icones.svg#…`): cada um faz o Chrome reprocessar o sprite e refazer o layout da folha num segundo passe, a cada cena e a cada golpe (2,7 ms no quadro da cena mais longa, que por isso passava de 3 vsyncs). Os ícones dinâmicos usam o sprite embutido no documento (`hrefIcone`);
  - reescrever o que não mudou: reatribuir o mesmo texto ou HTML troca os nós e repinta. A ficha era reescrita duas vezes por golpe, e o equipamento, a cada cena (`escreverTexto`, `escreverAtributo`, `escreverHtml`);
  - camadas que só servem a um estado presas à página inteira: as do combate (vida, brilho, barra e clarão) mudavam a rasterização de toda a exploração. Elas ficam sob `body.em-combate`. A troca é que, fora da luta, uma mudança de vida (poção, armadilha) cria e destrói a camada do preenchimento durante a transição de 0,5 s; é raro, e a exploração fica igual à da Fase 2. Dar camada permanente só ao preenchimento da barra também muda a rasterização: em 1366×768, 13.428 px da exploração passaram a diferir em mais de 24 níveis;
  - seletor terminado em tag depois de uma classe que muda no `body` (`.em-combate .barra-vida span`): ligar a classe invalida o estilo de todos os `<span>` da página, inclusive as palavras da narrativa, no quadro em que ela muda. A parte da direita leva classe (`.barra-vida-janela`).
  - um desenho que só uma tela faz, sem aquecimento. O preenchimento da barra em combate (retângulo arredondado com gradiente linear, numa camada própria: o pipeline `AnalyticRRectRenderStep + LinearGradient4` do Graphite) só aparece na luta. O Graphite compila cada pipeline no primeiro uso e não o guarda para sempre: numa página aberta havia minutos, ou depois de muitas páginas no mesmo navegador, o Chrome compilava esse no quadro do "Enfrentar" (~40 ms no D3D11). A peça `.aquecer-gpu` tem o mesmo desenho: entra na primeira pintura da abertura, a 1% num canto à vista (coberta, não seria rasterizada), e sai dois quadros depois. Na prova, a primeira luta depois de 5 minutos parado na exploração, duas vezes, não teve quadro lento nem compilação no rastreio. Não se sabe por quanto tempo o Chrome guarda o pipeline, e uma sessão mais longa ainda pode compilá-lo. Para achar um caso assim, o rastreio com as categorias `gpu.dawn` e `skia.gpu` nomeia o pipeline em `CreatePipelineAsyncEvent`.
  - desenho que só uma janela ou um efeito faz e que compila um pipeline novo na primeira vez de cada sessão do Chrome (de alguns ms a ~150 ms). Os da Fase 4 foram achados com uma sonda de perfil vazio e o rastreio do Graphite. As categorias são `gpu.dawn`, `disabled-by-default-gpu.dawn`, `skia.gpu`, `disabled-by-default-skia.gpu` e `disabled-by-default-skia.shaders`, e o rótulo do pipeline sai em `CreatePipelineAsyncEvent::InitializeImpl`. Os casos:
    - gradiente radial, mesmo em peça pequena (a carta, o medalhão visitado e a alavanca do mapa). Um gradiente com `transparent` ganha paradas: o do clarão da barreira, com quatro cores, virou `RadialGradient8`;
    - sombra com desfoque, inclusive a interna, que vira uma máscara com desfoque. O espaço ocupado do equipamento compilava três pipelines no primeiro item de cada sessão, desde a Fase 2, e o aviso tinha uma;
    - borda tracejada num círculo (os medalhões e a alavanca do mapa), que é rasterizada à parte;
    - um gradiente linear que cai num passe com MSAA: o do botão secundário, ao lado da fita do fim, compilava ~145 ms;
    - uma camada animada dentro de uma janela. O anel que saía do lugar atual do mapa fazia a GPU desenhar a textura da folha por outro caminho (`AnalyticRRectRenderStep + HardwareImage`, 40 a 50 ms). Só uma bissecção com CSS injetado, uma sessão nova por variante, achou a causa. Duas hipóteses pelo rótulo estavam erradas: a arte do medalhão e um "recorte redondo";
    - uma janela que anima `transform` na entrada, ou que volta para a camada de baixo no fim da animação: a GPU rasteriza tudo de novo, com pipelines novos. A janela e o fundo animam só a opacidade e ficam numa camada própria (`will-change: opacity`) enquanto abertos.

    Prefira cor sólida, borda contínua e sombra sem desfoque, ou aqueça o desenho na primeira pintura, como as peças `.aquecer-gpu` (a barra do combate e o clarão da barreira). Prove com a primeira abertura numa sessão nova do Chrome, de perfil vazio, em pelo menos três sessões. O pipeline depende da resolução (§7);
  - mudar de momento uma peça de aquecimento sem medir de novo o "Começar". Criada meio segundo depois da abertura e removida meio segundo depois disso, ela deixou o "Começar" em 3 vsyncs em 7 a 10 de cada 10 execuções (`r5` e `r6`). Sem ela, ou na primeira pintura, ele voltou a 2 vsyncs em 16 a 19 de cada 20. O mecanismo não foi isolado: no rastreio da `r6`, o quadro do "Começar" tinha 13 ms de rasterização na GPU, e não a limpeza.
  - mostrar tudo de uma vez quando muita coisa chega junto. Na volta do combate, a crônica (fora da tela durante a luta) e a narrativa nova rasterizadas no mesmo quadro chegavam a 28 ms; a narrativa agora aparece um quadro depois (`esconderNarrativaUmQuadro`). No movimento reduzido, sem a máquina de escrever, o texto inteiro e a arte nova (que entra depois de decodificada, num quadro qualquer) chegavam a 34,7 ms; o texto agora espera a arte (`mostrarTextoDepoisDe`). O foco espera a narrativa aparecer (`focarNoQuadro` tenta de novo).
  - `toLocaleString` (ou `Intl`) no quadro de uma ação: a primeira chamada na página carrega os dados do locale (11 a 13 ms). Ela caía no quadro em que a janela do fim abre; o ouro de lá usa `milhares()`.
  - abrir uma janela no mesmo quadro da cena que a pediu: o `showModal()` recalcula o estilo e o layout da página inteira para mover o foco (~8 ms na primeira abertura de cada janela, ~2 ms depois). A loja abre um quadro depois da cena; a especialização, dois depois do XP.
  - elemento absoluto deixado no fim do `body`: na posição estática, ele estica a página (o `#avisos-leitor` fazia a seleção rolar 17 px, e depois 1 px). Ele fica no começo do `body`, com `margin: 0`.
  - trocar a arte do vitral num `src` só: ela trocava sem transição, e a decodificação caía no quadro da troca. Desde a Fase 5, duas camadas fixas (`.vitral-arte`) esmaecem uma sobre a outra, com a arte nova decodificada antes (CLAUDE.md, "Vitral").
  - montar o miolo de uma janela no clique que a abre: a carta do mapa é montada num `requestIdleCallback` depois da carga, e o clique só escreve o estado.
- **Arte em WebP (Fase 5):** a arte WebP com perda chega à GPU em YUV, e o primeiro desenho de uma arte numa sessão compila um pipeline próprio (`HWYUVImageNoSwizzle`, 71 a 80 ms no "Começar" de uma sessão nova), no lugar do da arte em PNG (`ImageShaderClamp`, ~67 ms). As trocas seguintes reusam. Isso fica dentro do custo de primeira vez do "Começar" (§7, "Pipelines na primeira vez").
- **Movimento:** respeitar `prefers-reduced-motion`.

## 7. Pendências para as próximas fases

- **Mecânicas (fase própria):**
  - o `gameState.checkDifficulty = 10` roda depois do `onEnter`, então nenhuma cena muda a dificuldade (4 a 20 no `scenes.json`);
  - a vida máxima é 20 para todas as classes (a Constituição não conta);
  - quem foge do combate (e quem toma a poção) volta para `gameState.lastScene`, que o `loadScene` nunca grava: só duas falhas da cripta e o save o mudam. Fugir do Goblin leva à entrada, e depois de uma falha da cripta qualquer fuga volta para ela;
  - a vitória dá 50 de XP e 3d6 de ouro, e a cena `_success` seguinte dá XP de novo (o Goblin rende 75);
  - a mana não se recupera: só enche ao escolher a especialização;
  - ligar e desligar a Barreira de mana e a Lâmina envenenada não gasta o turno.
- **CPU 4x (informativo, `final-r10`):**
  - a troca para a cena mais longa tem um quadro de ~90 ms, e a máquina de escrever dela, quadros de 28 ms;
  - o "Começar" e a entrada no combate têm um quadro de ~76 ms cada;
  - a vitória chega a ~62 ms (o script dela: XP, nível novo, som e relato);
  - os d20 e os golpes têm quadros de 28 a 42 ms;
  - na Fase 4 (`a066db1`), a abertura das janelas tem um quadro de 42 a 104 ms (mapa 104, loja 83, especialização e fim 69, diário 42). A compra, a viagem pelo mapa e o aviso ficam em 21 ms ou menos, e o texto longo chega a 97 ms.

  Se a Fase 5 mirar aparelhos fracos, revisar a crônica, a troca de cena, o script da vitória e a abertura das janelas nesse cenário.
- **Arte nova no movimento reduzido (Fase 5):** com o texto esperando a arte (§6), a troca de cena depois do d20 ficou em 1 de 30 execuções com um quadro de 27,8 ms (`reduzido-r10`). Nesse quadro, a GPU passa 19,6 ms numa tarefa logo depois da troca, com 3,7 ms de trabalho da página: é a arte nova chegando à GPU. Rever junto com a conversão das artes para WebP.
- **Primeira luta da página (opcional):** a primeira entrada no combate de uma página ainda tem, cerca de 1,1 a 1,7 s depois do "Enfrentar", um quadro de 27 a 35 ms na limpeza ociosa da GPU (fora do veredito, com menos de 1 ms de trabalho da página; 1 de 20 na `r8`). As entradas seguintes não têm. Para tirá-lo, seria preciso montar o painel em espera durante o giro do teste de combate, para o "Enfrentar" virar só uma troca de visibilidade.
- **Resíduos (decisão do dono):** na bateria final (`final-r10` e `reduzido-r10`, 200 execuções e 45 primeiros cliques no commit `7d4fdc7`), quatro quadros contaram contra a página. Nenhum se repetiu, e o controle de cada um está anotado:
  - **a tarefa do `InteractiveDetector` do Chrome** (55,6 ms numa rodada de combate, +4075 ms). É o temporizador da métrica de "tempo até interativo" do próprio Chrome (`StartOrPostponeCITimer`, em `interactive_detector.cc`): roda uma vez por carga de página, cerca de 5 s depois dela, sem script, e levou 61 a 62 ms nas três vezes em que caiu numa janela medida (`r5b`, `final-r8` e `final-r10`, em centenas de execuções). Controle do juiz: numa carga parada, ela leva no máximo 0,3 ms, na Fase 2 e na atual. Ela só cai na janela porque a ferramenta luta poucos segundos depois de abrir a página; num jogo de verdade, a luta vem minutos depois. O que a deixa pesada (~1% das execuções) segue sem explicação;
  - **um "Começar" com a montagem do quadro em 28,6 ms** (27,8 ms, 1 de 10), mais que o dobro dos ~12 ms de sempre, sem limpeza nem compilação no quadro. É CPU da própria página (o tempo de thread bate com o de relógio), e o rastreio leve não mostra o quê. Não se repetiu nas 50 execuções seguintes (as 20 da `r8` e 30 do juiz). Controle do juiz, 30 execuções de cada na mesma sessão: a Fase 2 aprovada (`ca48f04`) teve 1 de 30 acima do limite (34,8 ms) e 2 em 3 vsyncs; a atual, 1 de 30 (34,6 ms) e 5 em 3 vsyncs, diferença sem significância. Nos dois, o quadro acima do limite é a primeira limpeza grande da GPU caindo no clique (§6);
  - **a limpeza da GPU sobre um quadro com trabalho da página** (27,7 ms numa rodada, no movimento reduzido): a tarefa levou 11,6 ms, e a página montou dois quadros de 4,2 e 3,2 ms, acima dos 3 ms que a regra do §6 aceita. É a GPU mais a página;
  - **a arte nova no movimento reduzido**, no item acima.
- **Golpe do inimigo no movimento reduzido (Fase 5):** esse é o movimento desta máquina. Na janela do golpe (+3,9 a +4,2 s da rodada), as baterias reduzidas deram 4 de 10 execuções em 3 vsyncs ou mais (`reduzido-r10`; 2 em 4 vsyncs, 1 delas na limpeza da GPU), 1 de 10 (`reduzido-r9`) e 2 de 5 (`reduzido-r8`). No movimento padrão, o mesmo momento fica em 7,3 ms. A causa provável: a limpeza da GPU cai cerca de 1 s depois de "se prepara para atacar", e o golpe vem 1,2 s depois. Rever na revisão de movimento da Fase 5.
- **Ferramenta (decisão do dono):** tratar por nome as tarefas do próprio Chrome que caem na janela medida, com a mesma disciplina da limpeza da GPU (o trecho da tarefa e o trabalho da página no quadro): falta o `InteractiveDetector`. Desde a Fase 4, o `GpuServiceImpl::GetDawnInfo` (a parada de ~500 ms do §10) é reconhecido pelo nome, e a aba assenta 1,5 s depois da carga (§6). Outra saída é começar as ações medidas só depois de a página ficar interativa (uns 6 s depois da carga), como num jogo de verdade. Assim o veredito sairia APROVADO com as exclusões listadas. Como mexe no que conta contra a página, é decisão do dono.
- **Aquecer de novo antes da luta (opcional):** não se sabe por quanto tempo o Chrome guarda o pipeline do preenchimento da barra (§6). Aquecer de novo quando a escolha de combate monta a bandeja tornaria a correção independente do tempo de jogo.
- **"Começar" no limite:** o quadro do "Começar" monta a folha inteira (~12 ms na thread principal, estilo, layout e pintura) e rasteriza ~10 a 12 ms na GPU. Fica em 2 vsyncs em 16 a 19 de cada 20 execuções e, de vez em quando, passa a 3 ou 4 (§10). Deixar a exploração pintada sob a seleção tiraria o estilo e a pintura do clique, mas o fundo da `.folha` não cobre a moldura (`background-clip: padding-box`), e a exploração apareceria pelas partes vazadas dela; ficou para quando a seleção mudar.
- **Pipelines na primeira vez (informativo):** numa sessão em que o Chrome ainda não tinha os pipelines da exploração, o primeiro "Começar" compilou mais de uma dúzia de uma vez (gradientes, texto, imagens e curvas do passe com MSAA, inclusive o do preenchimento da barra nessa variante), e a GPU parou 178 ms. Aconteceu na primeira execução de uma bateria, mesmo depois da aba de aquecimento, e nas 19 seguintes não. É o custo de primeira vez do Graphite, que não depende de uma peça só.
- **Ruído das capturas:** duas capturas seguidas da mesma página podem diferir em até 31 por canal na borda de alguns SVGs (rasterização em software). Acontece também no commit da Fase 2; comparar com `--tolerancia` quando a diferença for só essa.
- **Abertura a frio (informativo):** com a exploração montada em espera, a abertura ganhou um quadro de ~48 ms. É a pintura a frio, fora do veredito.
- **Primeira vez das janelas (resolvido na 1ª rodada do juiz, §11):** a 1920×1080, numa sessão nova do Chrome com perfil vazio, nenhuma janela nem efeito compila um pipeline na primeira vez (4 sessões). Numa delas, a especialização compilou um de 6 ms, sem quadro lento. O que sobra:
  - a 1366×768 e a 1600×900, a primeira compra compila 36 a 46 ms (`TessellateWedgesRenderStep[Convex] + SolidColor` com `AnalyticClip`, num passe com MSAA: um caminho convexo recortado). O mapa não compila nessas resoluções. O desenho não foi isolado (a suspeita do juiz é um ícone recortado). Isolar na Fase 5 com a mesma sonda, a 1366×768;
  - na primeira abertura do mapa numa aba recém-aberta, a GPU rasteriza a janela inteira (~23 ms). A sonda de perfil vazio mediu 20,7 a 27,8 ms nesse quadro; na bateria, a primeira execução do mapa ficou em 13,9 ms.
- **Movimento reduzido na Fase 4 (resolvido na Fase 5, §12):** no controle a 144 Hz, o reduzido da Fase 4 tinha mais quadros acima do limite que o da Fase 3 (42 contra 24). Com o plano do juiz (3 pares intercalados, rodada e derrota, a 60 Hz), a atual teve menos: 73 contra 96, nos mesmos momentos e com as limpezas da GPU da mesma duração.
- **60 Hz (decisão do dono):** a 60 Hz, nenhuma fase passa na régua, que quer todo quadro em 1 vsync. Na Fase 4 foram ~300 a 400 quadros acima do limite nos cinco cenários mais pesados (§12), e a Fase 5 ficou igual. A régua do projeto foi pensada e aceita a 144 Hz (3 vsyncs). Passar a 60 Hz pediria tirar trabalho de cada quadro com animação (ver "Folga da GPU", abaixo) e partir os quadros pesados: a troca de cena, o d20, o golpe e a volta da luta. Cabe ao dono decidir se 60 Hz entra no aceite.
- **Folga da GPU (Fase 5):** enquanto algo anima, a thread principal da GPU gasta ~6,5 ms por quadro (p75), quase todo o intervalo de 6,9 ms a 144 Hz. É igual nos rastreios das fases 2, 3 e 4, e por isso qualquer rasterização ou limpeza leva o quadro a 3 ou 4 vsyncs. Medir as camadas de tela inteira e a sobreposição das texturas.
- **Especialização obrigatória (decisão de produto):** ela reabre quando o Chrome a fecha à força no terceiro Escape seguido. O juiz sugeriu outra saída: deixá-la fechar e manter o jogo pausado, com um aviso fixo para escolher.
- **Mecânicas vistas na Fase 4 (fase própria):**
  - a loja só abre de novo voltando à cena dela, e com a janela aberta não dá para usar um item: com a mochila cheia, a compra não tem saída;
  - a loja vende "Poção de Vida", mas a cena da poção só gasta "Poção de cura";
  - pelo mapa, `last_fight` leva à vitória sem o chefe, e `crystal_chamber` leva à saída da cripta sem o teste; os caminhos do mapa e os das cenas não batem (`start→check_supplies`, `treasure_room→cavern` e outros);
  - `SCENE_TO_NODE` cita 19 cenas que não existem (`goblin_fight`, `wolf_fight`…), sem efeito no jogo.
- **Textos:** "Removido X ao inventário" e o "pq" na mensagem de morte (fase de enredo). Também: "barreira mágica neon" na crônica (a barreira e as alavancas), as descrições "Recupera 10 HP" e "Item utilitário" que a loja mostra, e o texto de `merchant_items`, cópia do de `merchant_question`.
- **Capturas:** o Puppeteer esconde as barras de rolagem (`--hide-scrollbars`); capturar com elas visíveis numa revisão do celular. Numa captura de página inteira a 390, a barra `sticky` do "Começar a aventura" aparece no fim da primeira tela, por cima do card do Mago; no celular de verdade ela fica presa no rodapé.
- **Tamanho de fonte do navegador:** desde a Fase 5, o celular e o tablet seguem a fonte escolhida no navegador (a raiz estreita em `93.75%`, e os pontos de quebra em `em`, que levam uma fonte maior ao layout que rola). O desktop, não: uma raiz `calc(1em * min(0.8333vw, 1.4815vh) / 16px)` funciona no Chrome 149 e é idêntica a 16 px, mas, a 20 px, a grade de 3 colunas que cabe na tela passa 199 px da altura dela e a ficha sai da moldura. Rever se o desktop ganhar um layout que rola.
- **Escala exata (Fase 5):** `min(0.8333vw, 1.4815vh)` dá 15,9994 px em 1920, e não 16. `calc(100vw / 120)` e `calc(100vh / 67.5)` dão 16 exatos, mas mexem em subpixels do protótipo.
- **Celular, o que sobrou (Fase 5):**
  - no combate a 375×667, a vida do herói fica logo abaixo da dobra, sob as ações (a partir de 390×844, as duas cabem). Um resumo da vida dentro do painel do combate pediria markup novo;
  - a ordem do DOM põe a ficha antes da cena, e no celular ela aparece por último: o foco vai às escolhas em toda cena, então só os espaços usáveis do equipamento ficam fora da ordem;
  - os avisos cobrem a fita e o fechar de uma janela enquanto estão no ar (no desktop também);
  - no desktop, um texto de cena menor que a capitular vira um contêiner de rolagem de ~10 px (a morte em 1920: 101 contra 111 px; `componentes.css`, `.cena-texto` com `overflow-y: auto`). No estreito já não;
  - numa sessão nova emulada a 390×844, a primeira luta compila três pipelines a mais que na Fase 4 (caminhos convexos num passe com MSAA, de 11 a 72 ms). É informativo: a régua é o Full HD, e a GPU de um celular de verdade segue outro caminho (Vulkan ou GL, e não D3D11).
- **Acessibilidade, o que sobrou (Fase 5):**
  - o rótulo "Classe" do cabeçalho fica em 4,47:1 num estado (já na cor mais escura, a tinta); só uma mudança de layout resolve;
  - a cena lida antes das escolhas depende de o NVDA e o JAWS anunciarem o nome do grupo quando o foco entra nele: falta conferir com um leitor de tela de verdade. A alternativa (focar o `#scene-text`) mudaria as asserções de foco do `qa_ded`;
  - o narrador (TTS) vem ligado e lê a cena por cima de um leitor de tela (decisão de produto: desligado por padrão?);
  - o `#dice-button` segue "Rolar o d20" durante o giro ("Rolando…" mudaria a largura no quadro do clique);
  - os links dos créditos abrem outra aba sem avisar.
- **Artes, o que sobrou (Fase 5):** as duas artes pequenas (601×547 e 625×546) seguem ampliadas no vitral; não há pré-carga das artes das próximas cenas (pré-carregar as das escolhas da cena seria barato); e o `index_new.html` (legado, fora do escopo) pede `images/placeholder.png`, que nunca existiu, e monta o caminho da arte pelo nome da cena (depois da troca do acampamento, a do `check_supplies` não existe).
- **Nome no hub:** o card e a página do hub chamam o jogo de "RPG Adventure Quest", e o jogo se chama "A Masmorra de Drakmor". Trocar o nome no hub (título, descrição, SEO) é decisão do dono.
- **Servidor:** o `express.static('./')` depende do diretório atual do processo. Fora da raiz, `/ded` é servido sem a barra final e todos os caminhos relativos quebram. O `/ded/css` já é montado pelo `__dirname`; ver se vale fazer o mesmo para `/ded`.
- **Erro de digitação em `assets/scenes.json`:** "Ira até a porta do fundo da cripta". Corrigir junto com os textos (fase de enredo).

## 8. Registro da Fase 1

- **CSS extraído:** as 941 linhas do `<style>` foram para `ded/css/legado.css`, na mesma posição da cascata. Os `rem` do legado e do HTML viraram `px` (1rem = 16px), para a escala do kit não afetar as telas antigas.
- **Kit e fontes:** o kit (`fontes`, `tokens`, `base`, `componentes`, `exploracao`) saiu do CSS do protótipo. As fontes passaram a ser do projeto, sem o Google Fonts. Todo o arranjo ficou sob `.tela-exploracao`, e o responsivo das peças, em `componentes.css`. O reset do kit vale só dentro da `.folha` (com `:where`), e o fundo, no `body.ficha`, para não vazar para as telas legadas.
- **Ajustes pedidos pelo juiz:**
  - d20 com escopo em `.bandeja-mesa > .dice`, neutralizando o legado;
  - selos de cera renomeados para `.selo-cera*`;
  - `--mesa` virou `--fundo`;
  - tokens `--creme`, `--linha-pontilhada` e `--z-*`;
  - barra de vida deslizando com `translateX` (continua com a ponta arredondada da Fase 0);
  - `lining-nums` na Grenze;
  - `/ded/css` e `/ded/ui` com `no-cache` no `server.js`.
- **Catálogo vivo:** `ded/prototipo/componentes.html`.
- **Prova:** com `ded/tools/capturas.mjs`, a referência saiu de um worktree no commit da Fase 0.
  - As 12 capturas do jogo, em 1080p, 1366×768 e 390 px, ficaram idênticas pixel a pixel.
  - No protótipo, as diferenças são só as intencionais: algarismos alinhados no número do d20 e pontilhados com a mesma opacidade. A barra de vida difere em uns 50 px de antialiasing, por ser deslocada com `transform`.
  - No celular, a bandeja passou de `min(19rem, 80vw)` para `min(17rem, 80vw)`, a mesma largura do desktop. Isso também corrige um transbordo de 3 px da Fase 0 (285 px numa coluna de 282), que deslocava a corrente e o "O que você faz?".
  - Convivência: com `capturas.mjs --kit`, o jogo com o kit carregado depois do legado sai idêntico ao da Fase 0 nas 12 capturas. A única exceção são 19 px no `<audio controls>` nativo, que responde à fonte da raiz e sai na Fase 2.
- **Testes:** `journey_ded`, `qa_ded`, `qa_ded_task003` e `generate-seo --check` estão verdes.

## 9. Registro da Fase 2

- **Seleção de personagem (`#character-select.folha.tela-selecao`):**
  - cards de herói com rádio nativo (setas, foco e leitor de tela sem JS), retrato em medalhão, atributos da classe (o mais forte em rubro) e o selo de cera "Escolhido";
  - o botão "Começar a aventura" só habilita depois da escolha;
  - o `alert()` da abertura saiu: sem save, o jogo só fica na seleção;
  - o crédito dos ícones (CC BY 3.0) fica no pé da folha.
- **Exploração (`#game-screen.folha.tela-exploracao`):** o protótipo com os dados do jogo.
  - Vida, armadura (`getPlayerAC()`), ouro e a barra de vida.
  - Nível com o anel de XP (50 e 150 XP).
  - Atributos com o modificador no medalhão.
  - Equipamento com os ícones dos 18 itens.
  - Missões e crônica.
  - Classe e caminho no cabeçalho, e os selos Mapa, Diário, Narrador e Música. A música não tem mais `<audio controls>`; os selos de música da seleção e da exploração ficam em sincronia.
- **Vitral:** `ded/assets/vitrais.json` dá o arquivo, o local, o ponto focal e o texto alternativo das 39 artes. Uma cena sem arte própria mantém a do vitral. A arte é decodificada antes da troca, e acabaram os 404 das cenas sem imagem.
- **Máquina de escrever:** texto montado com uma `<span>` por palavra, revelado só com opacidade, no ritmo de antes (40 ms por caractere). Nada reflui e as escolhas não andam. Respeita `prefers-reduced-motion`.
- **d20:**
  - a bandeja mostra o atributo, a dificuldade e o modificador;
  - o resultado traz a conta completa (o 20 natural soma 5 e o 1 natural tira 5, como antes) e carimba um dos quatro selos já pintados. A crônica repete a conta e destaca o desfecho;
  - o botão fica com `aria-disabled` durante a rolagem e não perde o foco;
  - depois do resultado, o botão vira "Continuar", como no protótipo, e avança na hora. Sem clique, o jogo mantém o ritmo de antes e avança sozinho em 1,8 s, o que o `qa_ded` e o `journey_ded` usam;
  - o foco vai para o dado ao abrir o teste e volta à primeira escolha da cena seguinte.
- **Escolhas e bandeja:** dividem a célula de `.acoes`. A `.hidden` legada não vale ali dentro e virou só `visibility: hidden`. Assim o JS e os testes seguem alternando a mesma classe.
- **Finais sem saída:** as seis cenas finais (`CENAS_FINAIS`) ganharam o botão secundário "Começar uma nova aventura", que apaga o save. Antes, quem morria e recarregava voltava à morte. A cena da poção também não tem escolhas, mas volta sozinha; ela mostra só "A aventura continua…".
- **Abertura:**
  - "Começar" só habilita quando as cenas chegam;
  - com save, a seleção nem aparece: a página espera as cenas e abre direto a exploração;
  - um erro ao carregar as cenas vira uma dica na seleção, sem `alert()`.
- **Cards de herói:**
  - o rádio leva o nome da classe (`aria-labelledby`); a descrição, os atributos, a armadura e a habilidade de combate entram como descrição;
  - cada card mostra a armadura inicial e a habilidade de combate da classe: Golpe heroico, Magias arcanas e Ataque furtivo;
  - a classe `.selected` serve de reserva para o `:has()`.
- **Movimento reduzido:** também cobre o carimbo do card, o brilho do 20 natural (fica parado), os hovers que sobem e a transição das palavras.
- **Crônica:** a crônica ganhou um ícone e um tom (sucesso ou falha) por mensagem, escolhidos pelo emoji do começo. Os emojis saem do texto, e o `<strong>` volta a ser negrito. O `gameState.log` guarda o texto original.
- **Legado:**
  - as regras da seleção, da exploração e do d20 saíram do `legado.css`;
  - `button`, `.hidden` e `.dice` ficaram restritos com `:where()`, sem mudar a especificidade;
  - o `body` legado só define fonte, tamanho e cor;
  - o `h1` e o `audio` legados foram apagados;
  - o `.game-container` virou o palco do combate, com a geometria do contêiner antigo, e veste a moldura antiga durante o combate;
  - o mapa abre como painel fixo sob o cabeçalho e fecha com Esc.
- **Componentes novos:**
  - o card de herói (`.card-heroi`) e o botão secundário (`.botao-secundario`);
  - também o estado bloqueado do equipamento (`.slot.disabled`), a crônica vazia e o selo do mapa aberto (`aria-expanded`).

  Todos estão no catálogo.
- **Ícones:** 16 novos no sprite (itens, classes e crônica), com créditos em `ded/ui/CREDITOS.md`.
- **Contratos dos testes:** os IDs e classes ficaram. O `qa_ded` mudou em três pontos de propósito:
  - o modificador sai como `+3` e `−1`;
  - o ícone do item vem do sprite;
  - o 1 natural marca o `#dice` com `.falha-critica`, e não mais com borda inline.
- **Prova:**
  - Testes: `journey_ded` (CI), `qa_ded` e `qa_ded_task003` passaram.
    - O `qa_ded` ganhou um caso para o "Continuar" e para os finais.
    - O sandbox do `journey_ded` passou a receber o `vitrais.json` de verdade, e o `changeImage` roda nele.
  - Telas legadas: `capturas.mjs` passou a recortar os overlays em `legado-*.png`, em 1080p e em 1366×768 (`-768`). A referência foi o commit da Fase 1 com `--kit`.
    - Loja e diário saíram idênticos pixel a pixel.
    - A especialização difere no máximo 6 por canal, por causa do fundo translúcido.
    - O combate tem a mesma geometria; muda só o antialiasing do texto (ver §7).
  - Protótipo: idêntico ao da Fase 1 com `--tolerancia 8`. A única diferença é a cópia da arte do d20, pintada a 1% sob as escolhas, que difere no máximo 2 níveis por canal.
  - Sem 4xx, sem erros na página e sem rolagem horizontal a 390 px.
- **Juiz:**
  - A 1ª rodada deu "bom".
  - A 2ª rodada, sobre o commit `0b3059e`, deu "muito bom". Ela pediu quatro correções, que entraram no commit seguinte:
    - ativação dupla: um clique duplo no "Continuar" fazia uma rolagem oculta, e Enter seguido escolhia na cena nova sem ela ser lida. Agora há uma pausa de 300 ms depois de montar e uma guarda na bandeja recolhida;
    - o selo de cera ganhou piso de largura em px;
    - a asserção vazia do `qa_ded`;
    - a documentação do desempenho e o caminho de movimento reduzido.
  - A 3ª rodada, sobre o `84ec91b`, deu "muito bom". Faltava a mesma pausa de 300 ms no "Começar uma nova aventura": um Enter duplo na escolha que leva a um final apagava o save antes de o final ser visto. A 4ª rodada, sobre o `ca48f04`, deu **"excelente"**.
- **Desempenho:** `desempenho.mjs` em CPU 1x, com movimento padrão, numa tela de 144 Hz, saiu APROVADO.
  - O pior quadro de cada cenário (`desempenho-f2n`) foi:
    - exploração, 13,9 ms;
    - texto longo, 20,9 ms;
    - teste de d20, 13,8 ms;
    - 20 natural, 7,4 ms;
    - 1 natural, 13,9 ms.
  - O aceite do primeiro clique passou em 30 execuções. Nenhuma passou de 3 vsyncs; 5 delas tiveram um quadro de 20,8 a 21,2 ms, dentro da folga do §6.
  - **Movimento reduzido (`--movimento reduzido`).** É o caminho de quem joga com as animações do Windows desligadas, como nesta máquina.
    - O "Começar" ficou abaixo de 20,9 ms nas 3 rodadas, e o texto longo também.
    - O primeiro clique teve 0 execuções acima do limite em 30 (pior 20,9 ms).
    - Na troca de cena logo depois do teste (o avanço do d20), 2 de 5 rodadas tiveram um quadro de 27,7 ms (4 vsyncs). Nenhuma animação está rodando nesse momento, e o LoAF não registra o quadro. É a rasterização na GPU da arte nova junto com o texto inteiro, que no movimento reduzido aparece de uma vez (ver §7).
  - Como se chegou lá:
    - A primeira medição reprovou por layout forçado: a crônica rolava a cada mensagem, e `focus()` era chamado fora do quadro. Com as leituras adiadas para o próximo quadro, o `loadScene` caiu de ~11 ms para 1 a 3 ms.
    - A aprovação seguinte valia pouco: o ambiente estava em movimento reduzido (ver §6). Com o movimento padrão, apareceram dois custos.
    - O primeiro layout da folha no "Começar" (48 ms) foi resolvido assim: a exploração fica montada e invisível durante a seleção (`.tela-em-espera`), e o `scrollTop` do texto espera o quadro.
    - O SVG do d20 era rasterizado de novo no primeiro número do giro (28 ms em ~1 de 15 execuções). Agora o dado tem camada própria desde a abertura (`will-change: opacity`, que não borra), e durante o giro a arte vem de uma cópia numa camada pré-rasterizada.
    - A própria ferramenta forçava layout no quadro da rolagem (`getClientRects`, `getComputedStyle`) e foi corrigida.
  - A máquina tem uma parada própria de ~500 ms uns 120 s depois de o Chrome abrir, que aparece até numa página vazia. No rastreio, ela é o `GpuServiceImpl::GetDawnInfo` (513 ms em `CrGpuMain`, achado pelo juiz na 4ª rodada). A ferramenta refaz uma vez a execução em que ela cai (quadro acima de 100 ms com o LoAF sem script nem render) e avisa no relatório.

## 10. Registro da Fase 3

- **O combate virou um estado da folha de exploração.** O painel de combate toma o lugar da narrativa e o relato, o da crônica (`mostrarCombate()`); a ficha, o vitral e o nível ficam à vista. O palco antigo (`.game-container`) saiu.
- **Card de inimigo:**
  - retrato no medalhão rubro com o ícone do inimigo (`INIMIGOS`: Goblin, Lobo, Aranha e o Fantasma de Drakmor, como espectro; um nome fora da tabela ganha o ícone pelo que lembra, ou o monstro genérico);
  - nome com gênero ("o Goblin", "a Aranha", em `inimigo()`), barra de vida em vinho com "x / y de vida", rótulo com o nome do inimigo para o leitor de tela, e a armadura no escudo;
  - os selos de vitória e de derrota já nascem pintados e são carimbados sobre o retrato, que esmaece na vitória.
- **Efeitos em jogo:** pílulas para magias, mana, barreira, escudo sagrado, fúria (com o −2 de armadura), armadura +3, passo de sombra, lâmina envenenada, esqueleto e veneno no inimigo (em rubro).
- **Ações:** a peça das escolhas, com o ícone no medalhão e um detalhe à direita (recarga, custo, "ativa"), montada por `botaoCombate()`.
  - No turno do inimigo, o título vira "Vez do Goblin" e as ações ficam com `aria-disabled`, sem perder o foco.
  - Como as escolhas, as ações ignoram ativações nos 300 ms depois de montadas: um Enter duplo no "Enfrentar" não ataca, e um clique duplo em "Magias arcanas" não gasta a 2ª magia.
  - Magias, itens e habilidades da especialização abrem submenus. O "Voltar" devolve o foco à ação que abriu o submenu.
  - Uma habilidade indisponível continua clicável e explica o motivo no relato.
  - `#btn-combat-spell` existe sempre: leva a habilidade da classe (Golpe heroico, Magias arcanas, Ataque furtivo) ou as da especialização, e só fica oculto sem classe, como o `qa_ded_task003` espera.
  - O painel não pula: a coluna do d20 tem largura fixa (16rem) e as ações, a altura de quatro, então a legenda em duas linhas, um submenu de três ações e o "Continuar" do fim não mexem no relato embaixo.
- **Fim da luta:** na vitória, na derrota ou na fuga, `mostrarDesfecho()` carimba o selo e troca as ações por um "Continuar" com os ganhos (por exemplo, "+50 XP · +18 de ouro"). Quem estava no painel pelo teclado fica nele e, depois, na primeira escolha da cena seguinte. Sem clique, a luta fecha sozinha em 2,2 s (2 s na derrota, 1,8 s na fuga), como antes.
- **d20 do combate:** a bandeja da exploração, menor. O número gira e o resultado carimba um dos quatro selos. A legenda diz o número ("Você tirou 17", "20 natural!"); no Golpe heroico, ela mostra a vantagem ("Vantagem: 20 e 7 → 20") e o selo sai do dado escolhido. A conta completa fica no relato. Na vez do inimigo, a rolagem dele aparece na bandeja, sem giro, com a conta na legenda.
- **Relato:** ícone e tom pelo emoji do começo (`RELATO_ICONES`), como na crônica, sem emojis no texto. A primeira linha é escrita com o relato já à vista, para o leitor de tela anunciar, e a legenda da bandeja deixou de ser `role=status` (a rolagem era anunciada duas vezes).
- **Textos revistos:** "armadura" em vez de AC, "Acerto crítico!", as recargas com "1 turno" e "2 turnos", as contas no formato da legenda ("17 + 5 = 22"), "de vida" e o gênero dos inimigos.
- **Efeitos:**
  - golpe no herói: a borda da tela pulsa em vermelho, a vida da ficha treme e brilha, e o dano sobe de cima do medalhão da vida, em rubro com halo de pergaminho;
  - golpe no inimigo: brilho e recuo do retrato;
  - números flutuantes em Grenze (XP, ouro, nível novo), que sobem no meio do vitral (a camada deles fica na coluna do vitral);
  - tudo com Web Animations, só em `opacity` e `transform`. No movimento reduzido, sem tremor, e os números só esmaecem.
- **A ficha acompanha a luta:** quando a fúria ou o ataque sorrateiro acabam, a armadura da ficha volta na hora.
- **Sem `alert()` no combate:** a fuga pelo mapa durante a luta vira um aviso no relato.
- **Uma cena nova encerra a luta:** se um temporizador de cena chega atrasado no meio de um combate, o `loadScene` fecha a luta pelo caminho de sempre (`closeCombatScreen`), e os temporizadores da rodada e do desfecho param sozinhos (veem `combat.active` falso). A armadura só conta a fúria e o ataque sorrateiro com a luta ativa. A cena da poção, que volta sozinha em 4,5 s, só volta se o jogador ainda estiver nela. O defeito apareceu no teste novo do `qa_ded`: a volta da poção caía no meio da luta e a deixava presa, com o painel oculto.
- **Ícones:** 25 novos no sprite (inimigos, ações e habilidades), com os créditos (autores novos: Carl Olsen e DarkZaitzev).
- **Legado:** 49 blocos do combate saíram do `legado.css` (palco, cartas, d20 legado, log, ações, impactos, flash vermelho e tremor), e depois os números flutuantes.
- **Catálogo:** card de inimigo, barra do inimigo, ações de combate, efeitos em jogo, brilho de impacto, d20 do combate, o painel montado e o relato. O arranjo do painel fica em `componentes.css`, sem cópia no CSS do catálogo.
- **Ferramentas:**
  - `capturas.mjs` captura os estados do combate (aberto, o ataque, o golpe do inimigo, as magias, a vitória e o chefe) em 1080p e em 1366×768, e mais dois com os efeitos parados no meio: o golpe no herói (`-golpe`: clarão, brilho, tremor e o dano subindo) e os ganhos da vitória (`-ganhos`). O recorte legado do combate saiu.
  - `desempenho.mjs` ganhou os cenários do combate (entrada, rodada, vitória, derrota e fuga), as repetições e a classificação da limpeza ociosa da GPU (§6), e grava no relatório e no JSON o commit medido e os arquivos alterados.
- **Desempenho, como se chegou lá.** Cada custo foi achado com rastreio do Chrome e conferido tirando a causa:
  - O primeiro golpe custava 50 a 130 ms na GPU: a barra de vida deslizava com `translateX` sob um pai com `overflow: hidden` e `border-radius`, e o compositor compilava o shader de recorte arredondado. Um `clip-path` animado no lugar repintava a barra a cada quadro. Ficou uma janela de recorte retangular, o preenchimento numa camada própria e a ponta esquerda como um disco parado.
  - A primeira vitória com nível novo custava 30 ms: o anel de XP, um traço SVG com gradiente, compilava um pipeline novo no primeiro desenho. Ficou em cor sólida.
  - O medalhão do nível tinha `filter: drop-shadow`, refeito a cada XP; a sombra virou um disco com gradiente.
  - Pré-pintar o clarão vermelho a 1% piorou todos os cenários (§6). Ele voltou para 0.
  - Os números flutuantes viraram peças fixas reusadas, e o que treme ganhou camada própria durante a luta, para não criar e destruir camadas a cada golpe.
  - O script do golpe caiu à metade (de ~18 para ~10 ms em CPU 4x): `spawnFloater` não chama mais `getAnimations()`, e a preferência de movimento fica guardada em vez de um `matchMedia()` a cada golpe. As duas forçavam o estilo no meio do handler.
  - A ficha, o card do inimigo e o equipamento escrevem só o que mudou. Antes a ficha era reescrita duas vezes por golpe (inclusive o HTML das missões), e o equipamento, a cada cena.
  - As camadas do combate só existem durante a luta (`body.em-combate`). Promovidas o tempo todo, elas mudavam a rasterização do texto em toda a exploração: em 1366×768, 13.600 px da exploração diferiam da Fase 2 em mais de 24 níveis; sem elas, 88.
  - A troca para a cena mais longa (1.332 caracteres) ficava no limite desde a Fase 2: a Fase 2 passava de 3 vsyncs em 2 de 20 execuções, e a Fase 3, em 5 de 20. O rastreio mostrou um segundo layout no mesmo quadro (2,7 ms), feito depois que o sprite externo de ícones era reprocessado por causa dos `<use>` novos. Com o sprite embutido no documento para os ícones dinâmicos (`hrefIcone`), o segundo layout sumiu e o quadro caiu para 13,9 ms (2 vsyncs), mesmo com o rastreio ligado.
  - A limpeza ociosa da GPU (§6) apareceu na vitória das primeiras medições. Com menos texturas descartadas (ficha escrita só no que muda, camadas fixas), ela deixou de cair nos quadros medidos.
  - O seletor `.em-combate .barra-vida span::before` fazia ligar a classe no `body` invalidar o estilo de todos os `<span>` da página no quadro do "Enfrentar"; a parte da direita ganhou classe (`.barra-vida-janela`).
  - A primeira entrada no combate de uma sessão longa tinha um quadro de 42 a 56 ms (+25 ms do "Enfrentar"), em 3 de 5 sessões com dezenas de páginas e numa página só depois de 4 minutos parada; a segunda entrada, mesmo 4 minutos depois, ficava limpa. O rastreio com as categorias do Dawn e do Skia mostrou o Chrome compilando um pipeline no D3D11 (38,8 ms): o do preenchimento da barra em camada própria, o único desenho que só o combate faz (§6). Pintar o painel inteiro a 1% na abertura não resolveu, porque ali a seleção o cobria e ele nem era rasterizado. O que resolveu foi `aquecerGpu()`: a mesma peça, à vista, a 1% por meio segundo na abertura (na 3ª rodada, a peça passou para a primeira pintura, abaixo). Depois disso, a entrada depois de 4 minutos parada ficou limpa e sem nenhuma compilação no rastreio.
  - A volta da vitória para a cena ficava em 4 vsyncs em 1 de 10 (28 ms, `r6`): a crônica e a narrativa nova rasterizadas no mesmo quadro. A narrativa passou a aparecer um quadro depois; a vitória, a derrota e a fuga ficaram em 0 de 20 cada (`r7`, medida ainda com a camada permanente na barra, e com um quadro da vitória e um da derrota na limpeza da GPU). Na bateria final, 0 de 10 cada, nos dois movimentos.
  - O "Começar" passou de 2 para 3 vsyncs a partir da `r5`, quando o aquecimento entrou meio segundo depois da abertura. Bissecção, 20 execuções cada, no mesmo dia: o commit da `r4` (`b0d8de3`), 19 em 2 vsyncs e 1 em 3; o código sem o aquecimento, com ou sem camada nos números flutuantes e com a barra só na luta, 16 a 18 em 2 vsyncs, e 4 quadros acima do limite, 3 deles na limpeza da GPU (§6). Uma camada permanente no preenchimento da barra, no lugar do aquecimento, deixou o "Começar" parecido (16 de 20 em 2 vsyncs), mas mudou a rasterização da exploração em 1366×768 (§6) e foi descartada. Com a peça na primeira pintura, 18 de 20 em 2 vsyncs e nenhum em 3 (`r8`).
  - No movimento reduzido, a troca de cena depois do d20 tinha 2 de 5 execuções acima do limite (`reduzido-r8`, 27,7 e 34,7 ms). Com a narrativa um quadro depois, 2 de 30 (27,7 ms): a arte nova, que entra depois de decodificada, caía no quadro em que o texto aparecia. Com o texto esperando a arte, 1 de 30 (`reduzido-r10`).
- **Prova:**
  - Testes: `journey_ded`, `qa_ded` e `qa_ded_task003` passaram. O `qa_ded` ganhou dois casos de combate, pelo teclado:
    - o 6, pelo caminho real: o "Enfrentar", o Enter duplo que não ataca, as ações em espera na vez do inimigo com o foco no ataque, o selo carimbado, a vitória com o "Continuar" e o foco na primeira escolha da cena seguinte;
    - o 8: o "Voltar" do submenu de itens devolvendo o foco a "Usar item", o Golpe heroico com a legenda da vantagem e o selo do dado escolhido, e a derrota e a fuga fechando pelo "Continuar";
    - nenhum dos dois abre diálogo nativo. Ele usa o `server.js`, que escuta na porta 3000; com ela ocupada, rode com `PORT` em outra porta.
  - Telas legadas: loja e diário idênticos à referência da Fase 2 (`--so legado`); a especialização, idêntica com `--tolerancia 8`, como na Fase 2.
  - Contra a `r6` (`f3-r6`), as capturas do commit final (`f3-r10`) saíram idênticas na seleção, na exploração, nas telas legadas, no protótipo e no catálogo. No combate e no d20, só ruído de rasterização dos SVGs (§7): com `--tolerancia 31`, 1 px no combate e 6 px nos selos do cabeçalho do d20 (até 40 níveis), que na `f3-r8`, sem mudança no cabeçalho desde então, tinham saído idênticos.
  - Contra o commit da Fase 2, a seleção ficou idêntica. Na exploração muda a sombra do medalhão; o resto difere só no antialiasing do texto (em 1366×768, 88 px acima de 24 níveis).
  - Os estados do combate foram revistos nas capturas, em 1080p e em 1366×768, inclusive os efeitos no meio.
  - Desempenho, bateria final no commit `7d4fdc7` (a ferramenta grava o commit e diz se havia arquivos alterados; não havia), CPU 1x, 144 Hz, 10 execuções por cenário:
    - movimento padrão (`final-r10`, 100 execuções e 30 primeiros cliques): **REPROVADO por 2 quadros**, os dois nos resíduos do §7: o `InteractiveDetector` numa rodada (55,6 ms) e um "Começar" com a montagem do quadro em 28,6 ms (27,8 ms). A entrada no combate, a vitória, a derrota, a fuga, os três d20, o texto longo e o primeiro clique (0 de 30) ficaram dentro do limite; um "Começar" caiu na limpeza da GPU, fora do veredito;
    - movimento reduzido (`reduzido-r10`, 100 execuções e 15 primeiros cliques): **REPROVADO por 2 quadros**: a arte nova numa troca de cena depois do d20 (27,8 ms) e a limpeza da GPU sobre uma rodada (27,7 ms), os dois no §7. A volta da vitória, a derrota e a fuga ficaram limpas, e uma rodada caiu na limpeza da GPU, fora do veredito;
    - antes do commit final, em baterias de 20 execuções: a vitória, a derrota e a fuga em 0 de 20 contra a página com a volta em dois quadros (`r7`, ainda com a camada permanente na barra); a entrada no combate em 0 de 20 e o "Começar" em 1 de 20 (`r8`, com a peça de aquecimento saindo depois das fontes; 34,6 ms, dois quadros seguidos de 12,3 e 10,6 ms na thread principal e 14,6 ms de GPU, sem limpeza).
  - Primeira luta depois de 5 minutos parado na exploração, duas vezes numa página só, com o rastreio do Dawn e do Skia (no `b70f287`, com o aquecimento do commit final): nenhum quadro lento e nenhuma compilação.
  - Abertura com save (o jogo abre direto na cena salva e a digita; no `b70f287`): em 10 abas, nenhum quadro acima do limite depois das fontes. A peça de aquecimento sai ~130 ms depois da carga, dentro da pintura a frio.
  - CPU 4x (informativo): §7.
- **Juiz:**
  - A 1ª rodada, sobre o `19c8437`, deu "bom". Pediu: medir o código commitado e cobrir a entrada, a derrota, a fuga e a volta para a cena, com repetições; o foco perdido depois da vitória e da derrota; a ativação dupla nas ações; o painel que pulava a cada turno; o dado errado no Golpe heroico; uma classificação mais estrita da limpeza da GPU; a ficha reescrita a cada golpe; um teste de navegador do combate; e a documentação com afirmações erradas. Também sugeriu limpar código morto, o foco do "Voltar", o leitor de tela, textos, a armadura da ficha, o "Continuar" no fim e as capturas no meio do efeito. Tudo entrou no commit seguinte.
  - A 2ª rodada, sobre o `b0d8de3`, deu "muito bom". O bloqueante era o custo da primeira entrada no combate, sem diagnóstico; ele foi achado e corrigido (o pipeline do preenchimento da barra e `aquecerGpu()`, acima). As sugestões também entraram: a guarda no fechamento automático do desfecho e a cena nova fechando a luta pelo caminho de sempre, a armadura só com a luta ativa, os números flutuantes no meio do vitral, o dano no herói em rubro com halo e acima do medalhão, o seletor com classe à direita, o comentário da pausa no lugar, o caso 8 do `qa_ded`, "de experiência" no "Continuar", e a ferramenta guardando o rastreio de quem falha e escolhendo o aquecimento (`--rastreios`, `--aquecimento`).
  - A 3ª rodada, sobre o `f26edeb`, deu "muito bom". Pediu: devolver o "Começar" a 2 vsyncs com uma bissecção; dividir a volta da vitória em dois quadros; e a bateria final no commit exato, com o commit gravado no JSON e o movimento reduzido refeito. Sugeriu aquecer de forma robusta ao tempo de jogo e testar 5 minutos ou mais antes da primeira luta, tirar a cópia dos valores do gradiente, identificar a tarefa de 61,6 ms da `r5b`, corrigir duas afirmações da prova e cobrir o caminho com save. Tudo entrou nos commits seguintes (`b70f287`, `956eb99`, `7d4fdc7`): a bissecção e o aquecimento na primeira pintura, a volta em dois quadros (e, no movimento reduzido, a troca de cena com o texto esperando a arte), o commit no JSON, os 5 minutos parado, a regra única do gradiente, a tarefa (o `InteractiveDetector` do Chrome) e a abertura com save.
  - A 4ª rodada, sobre o `d4cf48c`, deu **"excelente"**. O juiz rodou controles: o "Começar" da Fase 2 aprovada tem o mesmo resíduo (1 de 30), o `InteractiveDetector` é leve numa carga parada, e a parada de ~500 ms é o `GetDawnInfo`. Pediu, sem bloquear: o título dos resíduos sem "do ambiente", com o controle de cada um, e o golpe do inimigo no movimento reduzido, os dois no §7 (feitos); e, para o dono decidir, tratar por nome as tarefas do Chrome na ferramenta e aquecer de novo antes da luta (§7).

## 11. Registro da Fase 4

- **As janelas viraram `<dialog>`.** Loja, especialização, diário, mapa e fim da aventura são `<dialog class="janela">` abertos com `showModal()`, com uma `.folha.janela-folha` dentro: a moldura da folha, a fita rubra no título e o medalhão de fechar (`i-fechar`). O foco entra na janela e volta para quem a abriu; o resto da página fica inerte. Escape, o medalhão e um clique no fundo fecham, com a saída animada. A especialização é obrigatória. A camada de cima da página (top layer) deixa as janelas acima da folha e dos efeitos sem `z-index`.
- **Aviso (toast):** `avisar()` substitui os seis `alert()`: a mochila cheia (no jogo), o mercador, o isqueiro que falta e as duas vitórias (no `scenes.json`, que só chama a função). Fica num popover acima de uma janela aberta, com o texto também numa região `aria-live`. O alerta do mercador congelava a página no meio do `loadScene`.
- **Mapa:** a carta em pergaminho, com os caminhos num SVG de traços e os lugares como botões. Ela funciona pelo teclado, tem legenda e não tem mais a animação infinita. Correções:
  - "Porta Selada" não tem cena e quebrava o `loadScene`; não é mais oferecida;
  - o mapa não navega durante o d20 nem no avanço depois dele: o temporizador velho carregava a cena do teste antigo;
  - a alavanca do lago aparece;
  - as cenas que não são lugares (alavancas, runas) mostram o lugar de onde vieram, e não a entrada;
  - na luta, com a especialização pendente e nos finais, o mapa diz por que está parado.
- **Loja:** as mercadorias com ícone, descrição e preço, o ouro e a mochila no alto. Sem ouro ou sem espaço, a linha explica o motivo na própria janela. Uma compra grava o save.
- **Especialização:** as duas opções viraram botões, que antes não funcionavam pelo teclado. Ela não abre por cima do desfecho de uma luta (espera a luta fechar), não remonta nem toca o som de novo a cada XP, e reabre se o Chrome a fechar à força no terceiro Escape. Um save do nível 3 sem especialização volta com a escolha. O `backdrop-filter` saiu.
- **Diário:** só as missões descobertas (antes, as inativas apareciam como "ativas"), com o progresso que os dados guardam (alavancas, runas) e as recompensas com ícones. Os créditos dos ícones ficam no rodapé, com os autores da Fase 3, que faltavam também na seleção.
- **Fim da aventura:** uma janela abre ~1,2 s depois do texto de cada final, com o selo (louros ou lápide), o título, a mensagem dos antigos `alert()` das vitórias e o resumo (nível, ouro, missões, lugares). Ela não abre no meio de uma luta, e uma cena nova cancela.
- **Barreira:** o clarão neon virou um clarão em verdete e ouro, com um aviso que diz quais alavancas faltam.
- **Crônica:** a linha só de emojis vira palavras, "Sua saúde já está no máximo!" saiu do tom de sucesso, e o `changeMusic` respeita a música pausada pelo selo.
- **Sem legado:** com a última tela migrada, o `legado.css` e as fontes do Google (MedievalSharp e Outfit) saíram. O `.hidden` passou para o `base.css`.
- **Ícones:** sete novos, todos de Lorc: fechar, mochila, alavanca, louros, lápide, pegadas e runa.
- **Catálogo:** a janela, uma janela de verdade, os avisos e uma amostra de cada janela.
- **Como foi feito.** A fundação (janela, aviso, funções e catálogo) veio primeiro, num commit (`7ca9f67`). Três agentes trabalharam em paralelo, cada um num worktree e numa branch saídos dela, com regiões de arquivo separadas: o mapa; a loja, a especialização e o diário; o fim, os avisos, a barreira e a crônica. As três branches foram juntadas na desta tarefa, com dois conflitos esperados (os dois selos do cabeçalho, em linhas vizinhas, e o fim do `catalogo.css`). Os agentes acharam três defeitos na fundação, corrigidos antes da junção:
  - o temporizador de reserva da saída fechava uma janela reaberta logo depois;
  - o `animationend` de um filho encerrava a saída antes da hora;
  - fora da `.folha`, o ícone do aviso crescia com o padding.
- **Ferramentas:**
  - `capturas.mjs` abre cada janela pelas funções do jogo e captura um aviso sobre o diário aberto; saíram o `--kit` e os recortes `legado-*`;
  - `desempenho.mjs` ganhou nove cenários e o aquecimento `janelas` (desde a 1ª rodada do juiz, ele só isola o custo de toda vez; o padrão é `d20`);
  - o `qa_ded` aceita `PORT`.
- **Prova:**
  - Testes: `journey_ded`, `qa_ded` e `qa_ded_task003` passaram. O `qa_ded` ganhou quatro casos, pelo teclado:
    - o 9: o mapa abre pelo selo com o foco em "você está aqui", viaja com Tab e Espaço, fica parado na luta e não oferece a porta sem cena;
    - o 10: a loja explica o ouro que falta, compra e grava; a especialização resiste a quatro Escapes e sai pelo teclado;
    - o 11: o diário mostra só as missões descobertas, o progresso e os créditos;
    - o 12: a janela do fim (um Enter logo depois não recomeça), o cancelamento por uma cena nova, os avisos do mercador e da mochila (um só por leva), a barreira e a crônica em palavras. Nenhum diálogo nativo abre nos quatro.
  - O `qa_ded_task003` teve o teste do mapa reescrito para a janela nova.
  - Capturas contra a Fase 3 (`f3-r10`): a exploração, o d20, o combate e as telas do protótipo ficaram iguais, salvo o ruído de borda dos SVGs (§7). Mudou a linha de créditos da seleção, com os autores novos. As janelas foram revistas nas capturas, em 1080p e em 1366×768.
  - Desempenho na entrega, antes do juiz, no commit `d04cdd6` (árvore limpa), CPU 1x, 144 Hz, aquecimento `janelas`, 10 execuções por cenário:
    - movimento padrão (`f4-final`, 200 execuções e 30 primeiros cliques): **APROVADO**, nos 21 cenários. As janelas ficaram no máximo em 3 vsyncs, e quase tudo em 2: mapa 14,3 ms, viagem 20,9, loja 14,1, compra 14,0, diário 14,1, especialização 14,0, fim 20,8, aviso 14,0 e barreira 13,9. Os cenários das fases anteriores seguem dentro do limite. Dois quadros da derrota caíram na limpeza da GPU e ficaram fora do veredito.
    - movimento reduzido (`f4-reduzido`): **REPROVADO por 9 quadros**:
      - três "Começar" (27,6 a 34,7 ms);
      - quatro das lutas: entrada, golpe do inimigo e fuga (27,5 a 27,8 ms);
      - um no mapa (27,9), um na loja (34,8) e um no fim (27,8).
    - Nesta bateria, o p95 de todos os cenários do reduzido subiu de 7,3 para 13,8 ms, inclusive o do aviso. Um controle no mesmo dia, intercalado e com 5 execuções, mostrou o código da Fase 3 (`e89cf81`) com o mesmo p95 de 13,8 ms e os mesmos picos no "Começar" (34,7 contra 41,6 ms): é o ambiente. As pendências do reduzido no §7 (o golpe do inimigo e o "Começar") seguem valendo.
    - O reduzido refeito só com as janelas (`f4-reduzido-janelas`, 90 execuções): o mapa, a loja e o fim ficaram em 0 de 10 cada. Sobrou um quadro de 27,7 ms num aviso (1 de 10).
  - CPU 4x (informativo): a abertura das janelas tem um quadro de 55 a 118 ms (mapa 118, loja 104, especialização 97, fim 69, diário 55). A viagem pelo mapa, a compra, o aviso e a barreira ficam entre 21 e 70 ms. O resto segue como no §7.
- **1ª rodada do juiz** (sobre o `8ce68dc`): "muito bom", com um bloqueante. O custo de primeira vez das janelas, que o jogador paga em toda sessão do Chrome, ficava fora da medição: o aquecimento padrão passava por cada janela, e a regra da parada do ambiente refazia uma execução com compilação. O primeiro mapa, de 146 ms, sumia do veredito. O que entrou (`80d2b91` a `a066db1`):
  - **Ferramenta:** o aquecimento padrão voltou a `d20`, a primeira execução de cada cenário conta, e o quadro com compilação sai marcado. A parada do ambiente é reconhecida pelo nome (`GetDawnInfo`), e um quadro com compilação nunca é refeito. As baterias seguintes trouxeram duas correções (§6): a aba assenta 1,5 s depois da carga, porque o desmonte do documento inicial caía no d20 e no primeiro clique; e uma bateria em meia taxa sai INVÁLIDA. A primeira hipótese para o desmonte, o da aba anterior (`60d5d48`), estava errada, e a espera depois de fechar saiu (`a066db1`).
  - **Primeira vez das janelas:** uma sonda com perfil vazio, uma sessão do Chrome por janela, nomeou cada pipeline pelo rastreio do Graphite. Saíram:
    - os gradientes radiais do mapa (a carta, o medalhão visitado e a alavanca) e as bordas tracejadas dos medalhões;
    - a sombra interna desfocada do espaço do equipamento (desde a Fase 2) e a sombra desfocada do aviso;
    - o gradiente do botão secundário, que ao lado da fita do fim caía num passe com MSAA (~145 ms).

    O clarão da barreira tem três paradas e é aquecido na primeira pintura (`.aquecer-gpu-clarao`). A janela anima só a opacidade e fica numa camada própria enquanto aberta.
  - **O anel do mapa:** o mapa ainda compilava 40 a 50 ms na primeira abertura, com o rótulo `AnalyticRRectRenderStep + HardwareImage`. Duas hipóteses tiradas do rótulo estavam erradas: a arte do medalhão num recorte redondo (`80d2b91`) e a arte em si (`70113d9`). Uma bissecção com CSS injetado achou a causa (`4430df5`), com cada variante numa sessão nova e o rastreio da sessão inteira: o anel animado que saía do lugar atual. Essa camada animada dentro da janela fazia a GPU desenhar a textura da folha por outro caminho. O anel saiu, e a arte do medalhão voltou.
  - **Sugestões:**
    - a janela do fim abre com o foco em "Rever a cena", e não no botão que apaga o save;
    - o aviso aparece um quadro depois de pedido (o do mercador caía no quadro do texto mais longo);
    - um arrasto que termina no fundo não fecha a janela;
    - a legenda do mapa mostra "Não visitado";
    - as capturas da loja e da vitória saem sobre as cenas delas.

    A especialização segue reabrindo quando o Chrome a fecha à força (decisão de produto, §7).
  - **Prova:**
    - Sonda de primeira vez, perfil vazio, 1920×1080, as nove janelas e efeitos em 4 sessões: nenhuma compilação, salvo uma de 6 ms na especialização (1 de 4), sem quadro lento. A 1600×900 e a 1366×768, a primeira compra compila de 36 a 46 ms (§7).
    - Bateria no `a066db1` (árvore limpa), CPU 1x, 144 Hz, aquecimento `d20`, com a primeira execução contando: **1 quadro acima do limite em 200 execuções e 30 primeiros cliques**, o do "Começar" de sempre (27,6 ms, 1 de 10; §7). A ferramenta diz REPROVADO por esse quadro.
      - As janelas ficaram em 2 vsyncs ou menos, com a primeira execução incluída: mapa 13,9 ms, viagem 14,0, loja 13,8, compra 13,9, diário 13,9, especialização 20,8, fim 7,5, aviso 14,2 e barreira 7,4.
      - Os d20 caíram de 27,9 para 14,0 ms com a aba assentada.
      - Quatro quadros caíram na limpeza da GPU e ficaram fora do veredito.
    - Controle do combate, intercalado com o código da Fase 3 e a mesma ferramenta, 2 pares de 50 execuções:
      - a Fase 3 teve 3 e 0 quadros acima do limite, mais 12 e 8 na limpeza da GPU (o primeiro par com execuções em meia taxa);
      - a atual teve 1 e 0, mais 8 e 2. O 1 é o `InteractiveDetector` do §7.
    - Movimento reduzido: no `a066db1`, **33 quadros acima do limite** em 200 execuções e 15 primeiros cliques (REPROVADO). Quase todos caem nos momentos dos resíduos do §7: a troca de cena, o fim do d20, o golpe do inimigo, o desfecho, a volta à cena, a cena da morte e a fuga. Nas janelas foram 3: a abertura do mapa em 2 de 10 (41,6 e 34,6 ms) e a da loja em 1 de 10 (27,8 ms); as outras sete ficaram em 2 vsyncs ou menos. Num controle intercalado com o código da Fase 3 (texto longo, rodada, vitória e derrota, a mesma ferramenta, 2 pares de 40 execuções), a Fase 3 teve 9 e 15 quadros, e a atual, 21 e 21. Os momentos são os mesmos, e o perfil direto da volta da vitória não mostra diferença (§7).
    - CPU 4x (informativo): §7.
- **2ª rodada do juiz** (sobre o `bc818d0`): **"excelente"**, sem bloqueante.
  - O que ele conferiu:
    - repetiu a medição da 1ª rodada (aquecimento `d20`, primeira execução contando, sessão nova): nenhuma primeira execução passou de 3 vsyncs (mapa 20,8 ms, compra 20,7, fim 13,9, barreira 20,8, especialização 20,7 e aviso 20,9), e nenhum quadro saiu com compilação;
    - num A/B intercalado com o código da 1ª rodada (`d04cdd6`), o "Começar" ficou em 3 vsyncs em 9 de 10 execuções nas duas versões: é ambiente, não regressão;
    - nos controles, as limpezas da GPU duram o mesmo na Fase 3 e na atual;
    - passaram o `journey_ded` e o `qa_ded`.
  - Achou a espera depois da carga e a meia taxa honestas. A espera só tira um desmonte que cai quando o jogador ainda está na seleção, e a meia taxa no máximo invalida uma bateria. O reduzido não bloqueia: os momentos e os custos são os mesmos, e um quadro de 340 ms foi preempção (22 ms de CPU). As sugestões e o plano para o reduzido estão no §7.
  - Também achou uma corrida no `avisar()`: com três avisos em menos de dois quadros, a entrada pendente do primeiro deixava o temporizador de saída dele valendo na peça reusada, e o terceiro sumia antes da hora. Ela foi reproduzida e corrigida: um aviso novo na peça anula a entrada pendente do anterior. O caso 12 do `qa_ded` ganhou a verificação.

## 12. Registro da Fase 5

- **Celular e tablet.** A tela vira uma coluna no celular e duas a partir de 700 px (§4), com todas as telas e janelas revistas. Sem rolagem de lado em 8 tamanhos (360×740, 375×667, 375×812, 390×844, 414×896, 768×1024, 1024×768 e 812×375) e 22 telas e estados, alvos de toque de 44 px, nenhum texto abaixo de 12 px e a narrativa a 19,8 px. Itens do §7 resolvidos: os créditos a 390, "Fantasma de Drakmor" numa linha, a fita e o resumo do fim a 360, a carta do mapa (que vira de lado no retrato, só no CSS) e "Começar uma nova aventura" numa linha. No celular, a cena nova e o combate entram à vista com uma rolagem. O desktop ficou igual, salvo o ruído das capturas.
- **Acessibilidade.** Uma auditoria de contraste própria, contra o fundo pintado de verdade (o texto transparente numa segunda captura), em 30 estados a 1920×1080 e 390×844: de 112 casos abaixo de AA para 33, dos quais 22 são controles desabilitados e o resto está no §7. As cores de apoio escureceram (`--sepia`, `--apagado`, `--verdete`, e `--sepia-escuro` novo), o d20 e os selos clarearam, o trilho vazio da barra de vida ficou claro, e os anéis de foco ganharam um terceiro anel de tinta onde o fundo é escuro. Os três itens do §7 foram resolvidos: a rolagem é anunciada uma vez, o leitor de tela ouve a cena antes das escolhas, e só um `<main>` fica exposto. Também: `lang="pt-BR"`, as barras com `aria-valuetext`, o nível novo e a mochila travada anunciados no relato da luta, e o espaço travado dizendo por quê.
- **Transição e WebP.** As 40 artes foram de 14,5 MB em PNG para 3,2 MB em WebP com perda (qualidade 80, escolhida por medição; as duas de 2048 px foram reduzidas a 1024, e duas idênticas viraram uma). No vitral do jogo, a diferença média é de 1,3 nível por canal. A arte esmaece de uma cena para a outra (400 ms), com duas camadas fixas; no movimento reduzido, troca na hora. `ded/tools/converter-artes.py` converte uma arte nova.
- **Preview do hub.** `assets/images/ded_preview.png` é a exploração na entrada da masmorra, em 1280×720 (16:9, como o card). `npm run seo` não muda nada (o nome e a URL são os mesmos), e `seo:check` e `tests/seo.test.js` passam.
- **Movimento:** no reduzido, a barra de vida pula para o valor novo e a arte troca sem esmaecer.
- **Como foi feito.** Três agentes em paralelo, cada um num worktree a partir do `8ce8a0b`: o celular, a acessibilidade e as artes. As três branches foram juntadas sem conflito. A auditoria de contraste rodada de novo no código juntado achou duas coisas que nenhum agente via sozinho, corrigidas em seguida: o anel de foco da especialização sobre a moldura a 390 px, e o nome de um item comum na mochila travada durante o d20. Depois vieram as sugestões do juiz da Fase 4: a carta do mapa montada no ocioso e, no `desempenho.mjs`, a abertura com save, a contagem da meia taxa e o aviso de muitos quadros em 3 vsyncs.
- **Testes:** `journey_ded`, `qa_ded_task003` e o `qa_ded`, que ganhou três casos (13: as artes em WebP e o esmaecer, inclusive três cenas seguidas e o reduzido; 14: a estrutura para o leitor de tela; 15: o celular a 375 px, sem rolagem de lado em todas as telas e janelas, com os alvos de toque e o mapa em retrato).
- **Pipelines na primeira vez:** o rastreio de uma sessão inteira, de perfil vazio, no mesmo fluxo nas duas versões (a da Fase 4 e a atual), a 1920×1080: só o pipeline da arte mudou (o YUV do WebP, 80 ms, no lugar do da arte em PNG, 67 ms, no "Começar"). O esmaecer não compila nada. A 390×844, a primeira luta compila três a mais (§7).
- **Desempenho, a 60 Hz.** O monitor desta máquina estava a 60 Hz (as fases 2 a 4 foram aceitas a 144 Hz), e o dono escolheu medir assim. A 60 Hz, a régua de 20,8 ms quer todo quadro em 1 vsync (16,7 ms), porque 2 vsyncs são 33,3 ms. Baterias no `40e777b` (árvore limpa), aquecimento `d20`, com a primeira execução contando:
  - **Movimento padrão: REPROVADO**, com 499 quadros acima do limite em CPU 1x, mais 32 na limpeza da GPU, fora do veredito:
    - as janelas quase limpas, de 0 a 5 por cenário (o diário e a barreira em 0);
    - o resto no combate (51 a 101 por cenário de 10 execuções), nos avisos (34), nos d20 (12 a 35), na exploração (21) e no primeiro clique (21 de 30).
  - **Movimento reduzido: REPROVADO**, com 80 quadros, mais 19 na limpeza da GPU.
  - **Controle no padrão**, intercalado com o código da Fase 4 (`8ce8a0b`), nos cinco cenários mais pesados (exploração, crítico 20, rodada, vitória e aviso), 2 pares:
    - a Fase 4 teve 297 e 385 quadros acima do limite; a atual, 327 e 378;
    - a mesma versão varia quase 90 quadros de uma bateria para a outra. A 60 Hz, a Fase 4 já reprova do mesmo tanto.
  - **Controle no reduzido**, intercalado com o código da Fase 3 (`e89cf81`), o plano do juiz: rodada e derrota, 3 pares de 10:
    - a Fase 3 teve 33, 33 e 30 quadros; a atual, 21, 25 e 27;
    - os quadros caem nos mesmos momentos: o ataque e o d20, o golpe do inimigo, a volta à cena e a cena da morte;
    - as limpezas da GPU duram o mesmo (mediana de 38 ms na Fase 3 e de 39 ms na atual);
    - o reduzido da Fase 4, que piorava no controle a 144 Hz (24 contra 42), não piora aqui.
  - **A/B das camadas fixas da arte** (o `will-change: opacity` das duas `.vitral-arte` contra `auto`), no aviso e na exploração, 3 pares: inconclusivo.
    - Com as camadas, 56, 464 e 176 quadros; sem elas, 105, 185 e 68. Uma das baterias com as camadas pegou o ambiente degradado (p99 de 33,3 ms).
    - As camadas ficam. Sem elas, o esmaecer criaria e destruiria camadas a cada troca (§6).
  - **CPU 4x** (informativo, a 60 Hz): a abertura das janelas fica em 2 a 4 vsyncs (mapa, especialização e fim com 66,7 ms), o texto longo chega a 83 ms e a vitória, a 100 ms.
