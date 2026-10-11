# 📂 Arquitetura e Padrões - A Masmorra de Drakmor

Um jogo de RPG de aventura textual interativa (estilo livro-jogo de D&D) onde o jogador explora uma masmorra perigosa, faz escolhas morais e táticas, realiza testes de atributos rolando dados e gerencia seu inventário.

## 🏗️ Arquitetura do Código

O jogo está estruturado com base nos seguintes arquivos:
- **`index.html`**: O ponto de entrada principal que contém o HTML das telas (painel de estatísticas, tela de log, área de imagem de cenário e janelas modais de loja), além do motor principal JavaScript de controle da aventura. O CSS fica em `css/`.
- **`assets/scenes.json`**: Base de dados em formato JSON que armazena a estrutura da árvore narrativa de decisões. Cada entrada representa uma cena contendo descrição, imagens, caminhos de escolha e callbacks associados (`onEnter`).
- **`index_new.html` / `d3.html`**: Versões experimentais/alternativas que testam mecânicas e interfaces adicionais do ecossistema do jogo.

### 🎨 Interface "Ficha Iluminada" (em migração, `TASKS/TASK_001.md`)

A interface está sendo trocada por fases. O plano, as fases e as regras de performance estão em `TASKS/TASK_001.md`.

- **`css/legado.css`**: a interface antiga, extraída do `<style>` do `index.html` sem mudança visual (Fase 1). Os `rem` viraram `px` para a escala do kit não afetá-la. Sai aos poucos, conforme as fases 2 a 4 trocam cada tela.
  - Enquanto conviver com o kit, o legado vem **antes** dele.
  - Nos dois sentidos, nada pode vazar.
    - O reset do kit (`base.css`) vale só dentro da `.folha`, com especificidade zero (`:where`). O fundo escuro fica no `body.ficha`.
    - O `body` legado fixa `font-size: 16px`, e a `.folha` reancora em `1rem`: assim a escala do `html` do kit não chega ao texto legado. Ao restringir o `body` legado, esse `font-size` fica de fora da restrição.
    - As telas legadas (combate, loja, especialização, diário, mapa) ficam **fora** da `.folha` até migrarem. Se o contêiner do jogo virar a `.folha` (Fase 2), tire o `#combat-screen` de dentro dele.
    - Os seletores de elemento do legado (`button`, `button:hover`, `body`, `h1`) ainda valem para a página toda. Restrinja-os às telas antigas antes de carregar o kit no jogo (Fase 2).
- **`css/` do kit novo**, nesta ordem de carga:
  - `fontes.css`: `@font-face` das fontes do projeto;
  - `tokens.css`: cores, tipografia e camadas (`--z-*`);
  - `base.css`: escala da tela em `rem`, o reset (só dentro da `.folha`), o fundo do `body.ficha` e utilitários;
  - `componentes.css`: as peças e o comportamento responsivo delas (folha, painel com fita, emblemas, medalhões, slots, escolhas, ações, bandeja do d20, selos de cera e crônica);
  - `exploracao.css`: só o arranjo da tela de exploração, com tudo sob `.tela-exploracao`;
  - `ui/ornamentos/vitral-recorte.css`: o recorte em arco da cena, gerado.
- **Telas:** a `.folha` recebe a classe da tela ativa (`tela-exploracao`, depois `tela-selecao` e outras), que o jogo troca conforme o estado. Overlays e toasts (fases 3 e 4) ficam **fora** da `.folha`, nas camadas `--z-overlay`, `--z-toast` e `--z-efeito`, para não herdar o arranjo da tela.
- **Nomes:** em português, exceto os que são contrato com o JS e os testes do jogo, como `#dice`, `.dice`, `.rolling-animation`, `#dice-container` e `#choices`. No kit, o d20 vale só para `.bandeja-mesa > .dice` e neutraliza o `.dice` legado do combate.
- **`ui/`**: as artes da interface.
  - `ui/ornamentos/*.svg` e `vitral-recorte.css` são **gerados** por `node ded/tools/gerar-ornamentos.mjs`. Não edite os SVGs à mão: mude o script e rode de novo.
  - `ui/texturas/*.webp` vêm de `python -I ded/tools/gerar-texturas.py ded/ui/texturas`.
  - `ui/icones.svg` é o sprite de ícones do game-icons.net (CC BY 3.0). Cada símbolo traz a origem num comentário; os créditos estão em `ui/CREDITOS.md`.
  - `ui/fontes/` guarda Alegreya, Grenze Gotisch e Marcellus SC (subconjunto latino, SIL OFL; licenças em `OFL-*.txt`).
- **`prototipo/`**: referência viva do visual, sem lógica de jogo e com `noindex`.
  - `index.html` é a tela de exploração aprovada na Fase 0.
  - `componentes.html` é o catálogo do kit: cada peça e as variantes que o jogo usa.
- **Prova visual:** `node ded/tools/capturas.mjs capturar <pasta>` gera capturas determinísticas do jogo, do protótipo e do catálogo. `node ded/tools/capturas.mjs comparar <antes> <depois>` compara pixel a pixel. Use os dois em toda mudança de CSS: capture antes, mude, capture depois e compare.
  - Com `--kit`, o kit é injetado depois do legado no jogo. As telas legadas têm de sair iguais às capturadas sem ele.
  - Uma referência boa sai de um worktree no commit anterior, com `--raiz <worktree>`.
- **`server.js`:** serve `/ded/css` e `/ded/ui` com `no-cache` (revalida por ETag), para um deploy não juntar HTML novo com CSS ou artes antigas.
  - A exceção é `/ded/ui/fontes`, com cache de 30 dias. Uma fonte nova entra com **outro nome de arquivo**: nunca substitua um `.woff2` mantendo o nome.
- **Regras do kit:**
  - Números em Alegreya com algarismos alinhados (`.num`); os algarismos do Marcellus SC parecem letras. Há uma exceção: o número do d20, as fitas e o título ficam na Grenze Gotisch, com `font-variant-numeric: lining-nums`.
  - Animar só `transform` e `opacity`; a barra de vida desliza com `translateX`. Transições de cor só valem em hover e foco de elementos pequenos (escolhas, selos).
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
- **Typewriter Effect (Efeito Máquina de Escrever)**: A exibição do texto ocorre gradualmente através da função `typewriterEffect` para aumentar a imersão na leitura. O efeito suporta interrupção manual (pulo imediato para o fim da digitação) ao clicar no bloco de texto.
- **Text-to-Speech (TTS - Narrador por Voz)**: Integra a API nativa do navegador `window.speechSynthesis` para criar uma experiência de acessibilidade por áudio. O sistema mapeia dinamicamente vozes localizadas em português do Brasil (ex: 'Daniel' ou 'Maria') e reproduz falas de forma sincronizada ao carregar novas cenas.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Canvas & DOM**: Manipulação direta dos elementos visuais e de fluxo de tela.
- **Web Speech API (`speechSynthesis`)**: Ferramenta nativa do navegador utilizada para conversão de texto em fala (TTS).
- **Web Audio API (HTML5 Audio)**: Execução de música medieval de fundo em loop via elemento `<audio>` nativo.
- **CSS Grid & Flexbox**: Utilizado para estruturar a tela do jogo em colunas de controle, log de eventos e visualizador de imagem.

## 🔑 Funções e Estruturas Principais

- `gameState`: Objeto global que rastreia os itens do inventário, inimigo atual, log da aventura e status do herói.
- `characterStats`: Estrutura de dados com as tabelas de atributos de cada classe disponível.
- `loadScene(sceneName)`: Limpa execuções anteriores de áudio/texto, troca a imagem do container (`changeImage`), carrega as opções disponíveis no JSON de cenas e monta dinamicamente o fluxo de botões e descrições na tela.
- `typewriterEffect(element, text, speed, callback)`: Imprime o texto caractere por caractere com atraso temporal de `speed` ms.
- `rollDice()`: Executa uma rolagem aleatória de d20 (1 a 20) e adiciona os modificadores apropriados do personagem para decidir o sucesso ou falha em um teste narrativo de D&D.
- `speakText(text)` / `stopSpeech()`: Controla a síntese de fala baseada no navegador, filtrando vozes de fala em português do Brasil e evitando sobreposição de áudio.
