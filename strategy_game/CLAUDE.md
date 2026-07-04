# 📂 Arquitetura e Padrões - Realm Builder Speed

Um jogo de estratégia em tempo real e simulação de reinos (Real-Time City Builder) com progressão de 10 níveis de dificuldade, gestão econômica de ouro e comida, desastres naturais dinâmicos e mecânicas de mitigação militar e religiosa.

## 🏗️ Arquitetura do Código

A aplicação é dividida em três arquivos lógicos bem acoplados:
- **`index.html`**: Fornece a marcação estrutural do HUD econômico, a barra de seleção de estruturas (Castelo, Fazenda, Quartel, Muro, Mina, Acampamento e Templo), além de telas para tutorial integrado e telas de vitória e transição.
- **`style.css`**: Define o grid da mesa de jogo com layout fluido responsivo, estilos neomedievais e as animações de flash colorido da tela.
- **`script.js`**: Core operacional do jogo, responsável por instanciar o tabuleiro procedural, processar as equações financeiras e gerenciar os loops temporizados assíncronos.

### Fluxo de Inicialização e Execução:
1. **Tutorial e Setup**: No carregamento, a tela do tutorial `#tutorial-screen` é exibida. Ao clicar em iniciar, a função `initGame(true)` zera os níveis para reiniciar.
2. **Tabuleiro Procedural**: Um grid de 15x20 (300 blocos `.tile`) é desenhado. O sistema escolhe aleatoriamente 25 blocos de água (`water`) intransponíveis e preenche os outros com grama (`grass`) edificável.
3. **Loops Econômicos Paralelos**: Três temporizadores independentes baseados em `setInterval` são disparados concorrentemente na thread para controle do relógio, economia e eventos.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop Assíncrono (Multi-Interval Timers)**: Em vez de um loop por frames visuais contínuos (`requestAnimationFrame`), a lógica avança por meio de três loops assíncronos paralelos:
  1. **Relógio do HUD (`gameTimerInterval`)**: Incrementa os segundos e formata a interface a cada **1 segundo**.
  2. **Ciclo Econômico (`resourceInterval`)**: Realiza as transações de produção e consumo das fazendas, acampamentos, minas e quarteis a cada **5 segundos**.
  3. **Resolvedor de Incidentes (`eventInterval`)**: Avalia a incidência de desastres ou surpresas geopolíticas a cada **10 segundos** (com 30% de chance).
- **State Pattern (Padrão Estado)**: Modula o comportamento e exibe modais com base nas variáveis `gold`, `food`, `difficultyLevel` (níveis de 1 a 10) e `templeActive` (desbloqueio do templo templo após o primeiro castelo). A vitória em cada nível requer a construção de uma quantidade de castelos equivalente ao número do nível atual.
- **Event-Driven (Programação Dirigida a Eventos)**: A construção de prédios reage ao clique nos botões das edificações (registrando `selectedBuilding`) seguido pelo clique no bloco `.tile` selecionado, validando o tipo do terreno (`grass`) e o saldo.
- **Sistema de Eventos Aleatórios (24 Variantes)**:
  - O vetor `EVENTS` reúne 24 ocorrências classificadas em benéficas (`good`), prejudiciais (`bad`) ou neutras (`neutral`).
  - **Mecânicas de Mitigação**:
    - **Militar**: Ter Quartéis (`barracks`) ou Muros (`wall`) acima do fator de ameaça randômico bloqueia roubos de bandidos (`raid`) e reduz o prejuízo de rebeliões camponesas (`rebellion`).
    - **Religiosa**: O número de Templos (`temple`) construídos atua como redutor linear de perdas de comida ou ouro durante pragas, secas, tempestades, inundações ou epidemias (`drought`, `storm`, `flood`, `disease`).
- **Animações Incidentais**: A função `showEventAnimation` gera um flash intermitente de cor na tela (`flash-good` em verde, `flash-bad` em vermelho) sincronizado com a exibição de um overlay com o emoji do evento no centro da tela.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5 Web Audio**: Música medieval (`medieval-music.mp3`) integrada de fundo via tag nativa rodando em loop.
- **CSS Grid & Variables**: Criação do grid responsivo do mapa medieval e aplicação de variáveis para animações de pulsação e transição de telas.

## 🔑 Funções e Estruturas Principais

- `initGame(resetLevel)`: Desenha o mapa procedural, reseta o tempo e inicia os timers assíncronos.
- `updateResources()`: Aplica a balança comercial somando lucros (Mina +10🪙, Acampamento +10🍎/+1🪙, Fazenda +3🍎/+4🪙, Castelo +4🪙) e deduzindo custos de manutenção (Quartel -1🪙/-1🍎).
- `placeBuilding(tile)`: Valida custos e insere a edificação alterando o `dataset.type` do bloco no DOM.
- `handleRandomEvent()`: Processa a roleta russa de eventos aleatórios a cada 10 segundos.
- `showEventAnimation(type, icon)`: Ativa flashes coloridos e overlays.
- `checkWinCondition()`: Avalia se o reino possui a quantidade exigida de castelos para transicionar de nível.
