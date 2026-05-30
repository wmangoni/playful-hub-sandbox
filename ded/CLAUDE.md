# 📂 Arquitetura e Padrões - A Masmorra de Drakmor

Um jogo de RPG de aventura textual interativa (estilo livro-jogo de D&D) onde o jogador explora uma masmorra perigosa, faz escolhas morais e táticas, realiza testes de atributos rolando dados e gerencia seu inventário.

## 🏗️ Arquitetura do Código

O jogo está estruturado com base nos seguintes arquivos:
- **`index.html`**: O ponto de entrada principal que contém o layout visual (HTML/CSS) com suporte a painel de estatísticas, tela de log, área de imagem de cenário e janelas modais de loja, além do motor principal JavaScript de controle da aventura.
- **`assets/scenes.json`**: Base de dados em formato JSON que armazena a estrutura da árvore narrativa de decisões. Cada entrada representa uma cena contendo descrição, imagens, caminhos de escolha e callbacks associados (`onEnter`).
- **`index_new.html` / `d3.html`**: Versões experimentais/alternativas que testam mecânicas e interfaces adicionais do ecossistema do jogo.

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
