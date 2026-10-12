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
- **`index_new.html` / `d3.html`**: Versões experimentais/alternativas que testam mecânicas e interfaces adicionais do ecossistema do jogo.

### 🎨 Interface "Ficha Iluminada" (em migração, `TASKS/TASK_001.md`)

A interface está sendo trocada por fases. O plano, as fases e as regras de performance estão em `TASKS/TASK_001.md`.

- **`css/legado.css`**: a interface antiga das telas que ainda não migraram (loja, especialização, diário e mapa), em `px` para a escala do kit não afetá-las. A seleção, a exploração e o d20 migraram na Fase 2, e o combate na Fase 3; as outras telas saem na Fase 4.
  - O legado vem **antes** do kit no `<head>`.
  - Nos dois sentidos, nada pode vazar.
    - O reset do kit (`base.css`) vale só dentro da `.folha`, com especificidade zero (`:where`). O fundo escuro fica no `body.ficha`.
    - O `body` legado só define a fonte, o `font-size: 16px` e a cor que as telas antigas herdam. A `.folha` reancora em `1rem`, então a escala do `html` do kit não chega ao texto legado.
    - As telas legadas ficam **fora** da `.folha`.
    - Os seletores genéricos que sobraram são restritos com `:where()`, que não muda a especificidade:
      - `button` vale só fora da `.folha`;
      - `.hidden` (`display: none`) vale em tudo, menos nos filhos de `.acoes`.
- **`css/` do kit novo**, nesta ordem de carga:
  - `fontes.css`: `@font-face` das fontes do projeto;
  - `tokens.css`: cores, tipografia e camadas (`--z-*`);
  - `base.css`: escala da tela em `rem`, o reset (só dentro da `.folha`), o fundo do `body.ficha` e utilitários;
  - `componentes.css`: as peças e o comportamento responsivo delas (folha, painel com fita, emblemas, medalhões, slots, escolhas, ações, bandeja do d20, selos de cera, crônica, card de inimigo, efeitos em jogo, ações de combate, clarão vermelho e números flutuantes);
  - `selecao.css`: só o arranjo da seleção de personagem, sob `.tela-selecao`;
  - `exploracao.css`: só o arranjo da tela de exploração (e do combate, que é um estado dela), com tudo sob `.tela-exploracao`;
  - `ui/ornamentos/vitral-recorte.css`: o recorte em arco da cena, gerado.
- **Telas:** cada tela é uma `.folha` com a classe dela: `#character-select.tela-selecao` e `#game-screen.tela-exploracao`. `mostrarTela()` alterna as duas.
  - A seleção some com `.hidden`.
  - A exploração, fora de vista, fica em `.tela-em-espera`: montada e invisível, com o layout pronto para o "Começar".
  - Overlays e toasts ficam **fora** da `.folha`, nas camadas `--z-overlay`, `--z-toast` e `--z-efeito`.
  - A `.folha` isola as próprias camadas, para não disputar com esses overlays.
- **Escolhas e d20:** `#choices` e `#dice-container` dividem a mesma célula de `.acoes`.
  - O jogo e os testes ainda os alternam com `.hidden`, que ali só deixa invisível. A altura não muda, e as camadas do resultado (selos de cera, brilho e d20 apagado) ficam pintadas com `opacity: .01`.
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
  - Efeitos: clarão vermelho (`#red-flash`), brilho de impacto (`.impacto`), tremor e números flutuantes, todos com Web Animations em `opacity` e `transform`. Os números flutuantes são quatro peças fixas em `#floater-layer` e uma na vida do herói, reusadas por `spawnFloater()`; não crie nem remova elementos para eles.
  - Durante a luta, `body.em-combate` (de `mostrarCombate()`) dá camada própria ao que treme, brilha ou desliza a cada golpe; fora dela, a ficha não carrega essas camadas. Seletores ligados a essa classe terminam em classe, nunca em tag.
  - Aquecimento da GPU: logo depois da abertura, `aquecerGpu()` mostra a 1%, por meio segundo e num canto à vista, uma peça com o mesmo desenho do preenchimento da barra em combate (retângulo arredondado com gradiente, numa camada própria). É o único desenho que só o combate faz; sem isso, a primeira luta de uma página aberta havia minutos esperava ~40 ms o Chrome compilar o pipeline dele. `body[data-aquecimento]` vai de `aquecendo` a `feito`, e as ferramentas esperam `feito`. Se outra peça do combate passar a usar um desenho novo, aqueça-o aqui também.
  - A ficha e o card do inimigo escrevem só o que mudou (`escreverTexto`, `escreverAtributo`, `escreverHtml`): reatribuir o mesmo texto troca o nó e repinta a ficha inteira a cada golpe.
- **Nomes:** em português, exceto os que são contrato com o JS e os testes do jogo:
  - o d20: `#dice`, `.dice`, `.rolling-animation`, `.critical-success-bg` (20 natural), `.falha-critica` (1 natural), `#dice-container`, `#dice-button` e `#result-message`;
  - as escolhas: `#choices`;
  - a seleção: `.character-card[data-class]` e `.selected`. O primeiro `<button>` de `#character-select` é o de começar;
  - os atributos: `#val-*` e `#mod-*`. O modificador sai como `+3` e `−1`;
  - o combate: `#combat-screen` (alternado com `.hidden`), `#combat-enemy-name`, `#combat-enemy-ac`, `#combat-actions-panel` e os botões `#btn-combat-attack`, `#btn-combat-spell` (sempre presente: leva a habilidade da classe ou as da especialização, e só fica oculto sem classe, nos testes), `#btn-combat-item` e `#btn-combat-flee`;
  - o equipamento: `.inventory-slots-grid .inventory-slot-box`, com `.occupied`, `.usable`, `.disabled` e `.item-name`. O ícone fica em `.item-icone use` (`href` com `#i-*` do sprite) e a descrição no `title` do slot;
  - os globais que as ferramentas usam: `scenes`, `gameState`, `skipTyping`, `ttsEnabled`, `selectCharacter`, `startGame`, `loadScene`, `startInteractiveCombat`, `closeCombatScreen` e `openSpecializationModal`.

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
  - As telas legadas também saem recortadas em `legado-*.png`, só o overlay.
    - Compare-as com uma referência de antes da migração capturada com `--kit` (o kit injetado depois do legado): `comparar <ref> <nova> --so legado`.
    - `--tolerancia N` ignora diferenças de até N por canal. Serve, por exemplo, para o fundo translúcido da especialização.
- **Desempenho:** `node ded/tools/desempenho.mjs` mede o tempo dos quadros no Chrome com GPU. Cobre a digitação, o teste de d20, os críticos, uma rodada de combate, a vitória e o aceite do primeiro clique, repetido 30 vezes. Rode depois de mexer em animação, bandeja, combate ou vitral.
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
  - Na hora de revelar um resultado, nunca troque `background-image`: deixe a camada pintada com `opacity: .01` e anime a opacidade.
  - O limite é de 48 FPS em Full HD.

### Fluxo de Inicialização e Execução:
1. **Carregamento dos Dados (Fetch)**: O jogo inicia fazendo uma requisição HTTP via `fetch` para obter as cenas a partir de `assets/scenes.json`. As funções contidas nas strings do JSON são instanciadas via `new Function(...)`.
2. **Seleção de Personagem**: O usuário interage com a interface para escolher sua classe (Guerreiro, Mago, Ladino), o que inicializa os atributos de força (`str`), destreza (`dex`), constituição (`con`), inteligência (`int`), sorte (`luck`), bônus base de ataque (`bba`) e classe de armadura (`armor`).
3. **Mecanismo Narrativo**: Ao clicar em "Começar Aventura", a cena `start` é carregada, dando início ao ciclo narrativo orientado a eventos e cliques.

## 🧩 Padrões de Projeto Aplicados

- **Event-Driven (Programação Dirigida a Eventos)**: Toda a jogabilidade progride em resposta a eventos gerados pelas interações com botões de escolhas dinâmicas criados pela função `loadScene`, além de cliques no dado 20 faces virtual (`#dice-button`) e no modal de compras (`#shop-modal`).
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
  - Os emojis saem do texto, e só `<strong>` é aceito.
- `speakText(text)` / `stopSpeech()`: Controla a síntese de fala baseada no navegador, filtrando vozes de fala em português do Brasil e evitando sobreposição de áudio.
