# 🎨 Tarefa 001 - Melhoria Visual: "Ficha Iluminada"

**Status**: 🚧 Em andamento. Fases 0, 1 e 2 prontas. A Fase 3 (combate) está implementada e em revisão: falta fechar o aceite de desempenho e a rodada do juiz.
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

No celular a tela vira uma coluna única. A versão definitiva do celular fica para a Fase 5.

## 5. Fases

| Fase | Entrega | Aceite |
|---|---|---|
| 0 ✅ | Protótipo estático da tela de exploração (`ded/prototipo/`) | Direção aprovada; juiz "excelente" |
| 1 ✅ | Fundação: CSS do `index.html` extraído para `ded/css/legado.css` **sem mudança visual**, mais tokens, fontes próprias, o kit de componentes e o catálogo (`ded/prototipo/componentes.html`) | Capturas idênticas às atuais; testes do ded verdes |
| 2 ✅ | Exploração, seleção de personagem e dado d20 no jogo real. Componentes novos: card de seleção de personagem e botão secundário | Layout novo no desktop; telas legadas idênticas com o kit carregado (1080p e 1366×768); aceite de performance; testes |
| 3 | Combate. Componentes novos: card de inimigo e barra de vida do inimigo | Idem |
| 4 | Loja, especialização, diário, mapa, telas de fim e toasts. Componentes novos: moldura de modal e toast, fora da `.folha` (camadas `--z-overlay` e `--z-toast`) | Nenhum `alert()`; modais consistentes |
| 5 | Celular, acessibilidade, transições, WebP, preview do hub e `npm run seo` | Sem rolagem horizontal em 375 px; contraste AA; `seo:check` |

## 6. Regras de performance

O limite é **nunca cair abaixo de 48 FPS em Full HD**, o que dá quadros de até 20,8 ms.

- **Como medir:** rAF sem limite, com CPU 1x e 4x, no pior momento: máquina de escrever, dado rolando e combate.
- **Primeiro clique do teste de dado:** 30 execuções em CPU 1x, sem nenhum quadro acima de 20,8 ms.
- **Folga do rAF:** o veredito aceita até 22,3 ms, ou seja, o limite de 20,8 ms mais uma folga de 1,5 ms.
  - O timestamp do rAF oscila cerca de ±0,5 ms em volta do vsync, e um quadro de 3 vsyncs a 144 Hz aparece como 20,5 a 21,7 ms.
  - A folga separa 3 vsyncs de 4 (a partir de ~26,9 ms) sem aceitar um vsync a mais em 60, 75, 100, 120, 144, 165 ou 240 Hz.
  - "Nenhum quadro acima de 20,8 ms" quer dizer, na prática, "nenhum quadro de mais de 3 vsyncs a 144 Hz".
- **Ferramenta:** `node ded/tools/desempenho.mjs` mede todos os cenários (abertura, exploração, texto longo, teste de d20, os dois críticos, uma rodada de combate, a vitória e o aceite do primeiro clique) com GPU e janela de verdade. Ela começa o jogo com cliques na seleção, como um jogador. A primeira interação da página liga o Web Audio e a voz, cerca de 10 ms de script.
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
  - `desempenho.mjs` grava um rastreio leve de cada medição (`toplevel` e a marca da ação). Um quadro acima do limite que se sobrepõe a essa tarefa e que, descontada a tarefa, caberia no limite sai do veredito e é listado à parte, na coluna "GPU", com a duração da tarefa. Se o Chrome mudar o nome da tarefa, o quadro volta a contar contra a página.
- **O que evitar:**
  - animar qualquer coisa além de `transform` e `opacity`, inclusive com `transition` em `clip-path` (repinta a cada quadro, e as texturas descartadas voltam como a limpeza da GPU um segundo depois);
  - camada animada recortada por um pai com `overflow: hidden` e `border-radius`: o compositor compila um shader de recorte arredondado no primeiro uso (50 a 130 ms na barra de vida, no primeiro golpe). Recorte retangular é de graça;
  - criar e destruir camadas para efeitos que se repetem (números flutuantes, tremores): use peças fixas, com camada própria desde a abertura;
  - `backdrop-filter`;
  - `filter` e `box-shadow` grandes com desfoque (use gradientes), e qualquer `filter` em peça que repinta: o `drop-shadow` do medalhão do nível refazia o desfoque a cada XP;
  - traço SVG com gradiente que muda (o anel de XP): o primeiro desenho dele compilava um pipeline novo na GPU (30 ms). Use cor sólida;
  - camada da tela inteira sempre composta, mesmo a 1%: o clarão vermelho assim piorava todos os quadros (em duas medições seguidas, o primeiro clique teve 9 de 15 execuções acima do limite com ele a 1% e 1 de 15 com ele em 0). Ele fica em `opacity: 0` com `will-change: opacity`;
  - trocar `background-image` na hora de revelar um resultado (deixe as camadas pré-pintadas com `opacity: .01`).
- **Movimento:** respeitar `prefers-reduced-motion`.

## 7. Pendências para as próximas fases

- **Créditos no Diário (Fase 4):** a Fase 2 pôs o crédito dos ícones no pé da seleção. Repetir no Diário quando ele migrar.
- **`alert()` que sobraram (Fase 4):**
  - no jogo: mochila cheia (duas vezes);
  - no `scenes.json`: o mercador ("Over rir…"), o isqueiro que falta e os dois finais.
  - O do mercador congela a página enquanto está aberto (a medição do "texto longo" passa por ele).
- **Mapa (Fase 4):** o painel antigo abre fixo sob o cabeçalho, com 72rem de largura. Os nós são clicáveis só quando adjacentes e não visitados (uma cadeia de `else if` em `renderMinimap`). A alavanca do lago nunca aparece, porque `LEVER_NODES` usa `lake_search`, que não é nó do mapa.
- **Especialização (Fase 4):** a caixa legada usa `backdrop-filter: blur(10px)`, proibido pelo §6. Sai quando ela migrar.
- **Mecânicas (fase própria):**
  - o `gameState.checkDifficulty = 10` roda depois do `onEnter`, então nenhuma cena muda a dificuldade (4 a 20 no `scenes.json`);
  - a vida máxima é 20 para todas as classes (a Constituição não conta);
  - quem foge do combate quase sempre volta para a entrada (`lastScene` raramente é gravado);
  - a vitória dá 50 de XP e 3d6 de ouro, e a cena `_success` seguinte dá XP de novo (o Goblin rende 75);
  - a mana não se recupera: só enche ao escolher a especialização;
  - ligar e desligar a Barreira de mana e a Lâmina envenenada não gasta o turno.
- **CPU 4x (informativo):** em CPU 1x tudo fica dentro do limite. Em CPU 4x:
  - o "Começar" ainda tem um quadro de ~97 ms;
  - a máquina de escrever do texto longo tem quadros de 28 ms;
  - o resultado e o avanço do d20 têm quadros de 28 a 56 ms.

  Se a Fase 5 mirar aparelhos fracos, revisar a crônica e a troca de cena nesse cenário.
- **Troca de cena no movimento reduzido (Fase 5):** em 2 de 5 rodadas, a troca de cena depois do teste de d20 tem um quadro de 27,7 ms. É a arte nova e o texto inteiro rasterizados no mesmo quadro. Rever junto com a conversão das artes para WebP, que também é da Fase 5.
- **Créditos no celular (Fase 5):** a 390 px, a linha de créditos dos ícones encosta no filete interno da moldura.
- **Combate no celular (Fase 5):** a 390 px, "Fantasma de Drakmor" quebra em duas linhas no card do inimigo.
- **Ruído das capturas:** duas capturas seguidas da mesma página podem diferir em até 31 por canal na borda de alguns SVGs (rasterização em software). Acontece também no commit da Fase 2; comparar com `--tolerancia` quando a diferença for só essa.
- **Mapa durante o avanço do d20 (Fase 4):** nos 1,8 s depois do resultado, o selo do mapa ainda navega, e o temporizador do dado dispara depois. O problema já existia antes da Fase 2.
- **Abertura a frio (informativo):** com a exploração montada em espera, a abertura ganhou um quadro de ~48 ms. É a pintura a frio, fora do veredito.
- **Acessibilidade (Fase 5):**
  - cada rolagem é anunciada duas vezes: no `#result-message` (`role=status`) e na crônica (`aria-live`);
  - o foco vai direto à primeira escolha e pula o texto da cena para quem usa leitor de tela (focar o artigo da narrativa, com `tabindex=-1`);
  - há dois `<main>` no DOM; o que está escondido deveria levar o atributo `hidden`;
  - os selos Diário e Mapa precisam de `aria-haspopup` e de foco dentro do painel.
- **Crônica (Fase 4):**
  - uma linha só de emojis ("💍 👑 💵 💰 🪙 💎") aparece crua, porque sem eles não sobra texto;
  - "Sua saúde já está no máximo!" sai com o tom de sucesso;
  - o `changeMusic` de um `onEnter` volta a tocar a música mesmo depois de ela ser pausada pelo selo.
- **Textos:** "Removido X ao inventário" e o "pq" na mensagem de morte (fase de enredo).
- **Capturas:** o Puppeteer esconde as barras de rolagem (`--hide-scrollbars`). Na Fase 5, capturar com elas visíveis.
- **Tamanho de fonte do navegador (Fase 5):** os `px` do legado e a raiz do kit ignoram a fonte padrão escolhida pelo usuário. Rever junto com a acessibilidade.
- **Escala exata (Fase 5):** `min(0.8333vw, 1.4815vh)` dá 15,9994 px em 1920, e não 16. `calc(100vw / 120)` e `calc(100vh / 67.5)` dão 16 exatos, mas mexem em subpixels do protótipo.
- **Celular (Fase 5):** "Começar uma nova aventura" quebra em duas linhas a 390 px.
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
  - A máquina tem uma parada própria de ~500 ms uns 120 s depois de o Chrome abrir, que aparece até numa página vazia. A ferramenta refaz uma vez a execução em que ela cai (quadro acima de 100 ms com o LoAF sem script nem render) e avisa no relatório.

## 10. Registro da Fase 3

- **O combate virou um estado da folha de exploração.** O painel de combate toma o lugar da narrativa e o relato, o da crônica (`mostrarCombate()`); a ficha, o vitral e o nível ficam à vista. O palco antigo (`.game-container`) saiu.
- **Card de inimigo:**
  - retrato no medalhão rubro com o ícone do inimigo (`INIMIGOS`: Goblin, Lobo, Aranha e o Fantasma de Drakmor, como espectro; um nome desconhecido usa o monstro genérico);
  - nome com gênero ("o Goblin", "a Aranha", em `inimigo()`), barra de vida em vinho com "x / y de vida" e a armadura no escudo;
  - os selos de vitória e de derrota já nascem pintados e são carimbados sobre o retrato, que esmaece na vitória.
- **Efeitos em jogo:** pílulas para magias, mana, barreira, escudo sagrado, fúria, armadura +3, passo de sombra, lâmina envenenada, esqueleto e veneno no inimigo (em rubro).
- **Ações:** a peça das escolhas, com o ícone no medalhão e um detalhe à direita (recarga, custo, "ativa"), montada por `botaoCombate()`.
  - No turno do inimigo, o título vira "Vez do Goblin" e as ações ficam com `aria-disabled`, sem perder o foco.
  - Magias, itens e habilidades da especialização abrem submenus com "Voltar".
  - Uma habilidade indisponível continua clicável e explica o motivo no relato.
  - `#btn-combat-spell` existe sempre (oculto para quem não tem magia), como o `qa_ded_task003` espera.
- **d20 do combate:** a bandeja da exploração, menor. O número gira, o resultado carimba um dos quatro selos e a conta sai na legenda. A rolagem do inimigo aparece na bandeja sem animação.
- **Relato:** ícone e tom pelo emoji do começo (`RELATO_ICONES`), como na crônica, sem emojis no texto. Os textos foram revistos: "armadura" em vez de AC, "modificadores", "Acerto crítico!", "recarga", "de vida" e o gênero dos inimigos.
- **Efeitos:**
  - golpe no herói: a borda da tela pulsa em vermelho, a vida da ficha treme e brilha, e o dano sobe da vida;
  - golpe no inimigo: brilho e recuo do retrato;
  - números flutuantes em Grenze (XP, ouro, nível novo);
  - tudo com Web Animations, só em `opacity` e `transform`. No movimento reduzido, sem tremor, e os números só esmaecem.
- **Sem `alert()` no combate:** a fuga pelo mapa durante a luta vira um aviso no relato.
- **Ícones:** 25 novos no sprite (inimigos, ações e habilidades), com os créditos (autores novos: Carl Olsen e DarkZaitzev).
- **Legado:** 49 blocos do combate saíram do `legado.css` (palco, cartas, d20 legado, log, ações, impactos, flash vermelho e tremor), e depois os números flutuantes.
- **Catálogo:** card de inimigo, barra do inimigo, ações de combate, efeitos em jogo, brilho de impacto, d20 do combate, o painel montado e o relato.
- **Ferramentas:**
  - `capturas.mjs` ganhou os estados do combate (aberto, o ataque, o golpe do inimigo, as magias, a vitória e o chefe), em 1080p e em 1366×768; o recorte legado do combate saiu;
  - `desempenho.mjs` ganhou os cenários `combate` e `combate-vitoria` e a classificação da limpeza ociosa da GPU (§6).
- **Desempenho, como se chegou lá.** Cada custo foi achado com rastreio do Chrome e conferido tirando a causa:
  - O primeiro golpe custava 50 a 130 ms na GPU: a barra de vida deslizava com `translateX` sob um pai com `overflow: hidden` e `border-radius`, e o compositor compilava o shader de recorte arredondado. Um `clip-path` animado no lugar repintava a barra a cada quadro. Ficou uma janela de recorte retangular, o preenchimento numa camada própria e a ponta esquerda como um disco parado.
  - A primeira vitória com nível novo custava 30 ms: o anel de XP, um traço SVG com gradiente, compilava um pipeline novo no primeiro desenho. Ficou em cor sólida.
  - O medalhão do nível tinha `filter: drop-shadow`, refeito a cada XP; a sombra virou um disco com gradiente.
  - Pré-pintar o clarão vermelho a 1% piorou todos os cenários (§6). Ele voltou para 0.
  - Os números flutuantes viraram peças fixas reusadas, e o retrato e a vida, que tremem, ganharam camada própria desde a abertura: o compositor descarta menos texturas.
  - O que sobrou na vitória é a limpeza ociosa da GPU do Chrome (§6). O combate antigo escondia esse custo porque repintava a tela em todo quadro.
- **Prova:**
  - Testes: `journey_ded`, `qa_ded` e `qa_ded_task003` passaram. O `qa_ded` usa o `server.js`, que escuta na porta 3000; com ela ocupada, rode com `PORT` em outra porta.
  - Telas legadas: loja e diário idênticos à referência da Fase 2 (`--so legado`); a especialização, idêntica com `--tolerancia 8`, como na Fase 2.
  - Contra o commit da Fase 2, a seleção ficou idêntica. Na exploração mudam a sombra do medalhão e, em até 3 níveis por canal na maior parte, a moldura do vitral (1.235 px acima de 8), pela fase de rasterização da camada dela.
  - Os estados do combate foram revistos nas capturas, em 1080p e em 1366×768.
  - Desempenho (`desempenho-f3-final`, CPU 1x, movimento padrão, 144 Hz): **REPROVADO, com 5 quadros**.
    - Nas duas baterias completas com o código final, a vitória ficou em 13,9 ms nas duas. O combate ficou em 13,8 ms numa e teve, na outra, um quadro de 55,5 ms no golpe do inimigo (+4062 ms, LoAF de 64 ms sem script nem render).
    - Na rodada final, o texto longo teve 27,8 ms na troca de cena (ver abaixo), e o primeiro clique teve 3 de 30 execuções com um quadro de 27,7 a 28 ms no início do giro. Na bateria anterior, com o ambiente mais ruidoso, foram o teste de d20 (6 quadros), o 1 natural (2) e o primeiro clique (6 de 30).
    - No movimento reduzido, o `combate` ficou em 13,9 ms, e a vitória teve um quadro de 27,6 ms no acerto.
    - Em CPU 4x (informativo), o combate tem quadros de 28 a 56 ms no acerto e no golpe do inimigo, e a vitória chega a 83 ms (o script dela leva ~43 ms em 4x: XP, nível novo, som e relato).
    - Depois da rodada final, o script do acerto caiu de ~18 para ~10 ms em 4x: `spawnFloater` não chama mais `getAnimations()` e a preferência de movimento fica guardada em vez de um `matchMedia()` a cada golpe (as duas forçavam o estilo no meio do handler). Ainda não foi medido de novo.
- **Ruído do ambiente nesta medição:** com outros programas abertos na máquina, o próprio commit da Fase 2 teve de 0 a 6 em 10 execuções do primeiro clique com um quadro acima do limite, sempre no início do giro (+250 a +340 ms). Numa comparação intercalada (três pares, 10 execuções cada), a Fase 2 e a Fase 3 ficaram limpas juntas nos dois primeiros pares e falharam juntas no terceiro.
- **Texto longo no limite:** o quadro da troca para a cena de 1.332 caracteres fica em 20,8 ms (3 vsyncs) nas duas versões. Na Fase 3 ele passou a 27,7 ms em parte das rodadas (4 de 7 numa série, 0 de 5 na seguinte), e a Fase 2, em nenhuma de 7. O rastreio mostra o mesmo custo de thread principal nas duas (script de 8 a 10 ms, layout de 11 a 14 e pintura de 5); a Fase 3 tem 5 camadas compostas a mais na exploração (vida, brilho, barra, risquinhos e o clarão). Ver §7.
- **Juiz:** pendente.
