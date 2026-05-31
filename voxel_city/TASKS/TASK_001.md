# 🎨 Tarefa 001 - Melhoria Visual: Voxel City

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O jogo **Voxel City Delivery** é uma primorosa e complexa simulação tridimensional urbana desenvolvida com **Three.js**, incorporando uma impressionante infraestrutura de gameplay de mundo aberto: geração procedural de bairros e arranha-céus voxelizados, física de colisão tridimensional via matrizes de delimitadores axiais (`Box3`), sistema dinâmico de tráfego urbano autônomo (com 50 carros que obedecem a semáforos automatizados e ligam faróis realistas à noite), pedestres inteligentes com rotas aleatórias, sistema de tempo dia/noite integrado com atenuação luminosa progressiva de luminárias e um completo loop de missões de coleta e entrega monitorado por radar/mini-mapa em tempo real.

Contudo, a interface bidimensional de UI e HUD (Heads-Up Display) é extremamente rústica e crua. Os displays de texto no topo usam sombras duras, o contêiner do mini-mapa possui uma borda sólida branca de aspecto amador, o prompt de interações é uma frase amarela seca no centro e a tela de Game Over é um painel preto opaco estático. O nosso objetivo estético é remodelar o Voxel City para adotar uma **HUD Tática Urbana Cyberpunk / GTA V**, com cartões flutuantes de vidro acrílico holográfico, tipografia robusta de velocidade, radares estilizados e transições suaves de feedback para transformar a imersão na cidade virtual.

## 💡 Sugestões de Melhorias Visuais

1.  **HUD de Navegação Cyberpunk Glassmorphic**: Substituir a caixa de texto `#hud` simples por widgets flutuantes minimalistas no estilo "holograma de navegação" no canto superior esquerdo. Os cartões usarão **Glassmorphism escuro e futurista** (`background: rgba(12, 16, 28, 0.7)`), desfoque profundo (`backdrop-filter: blur(12px)`), cantos internos chanfrados e uma sutil linha neon de divisão em gradiente (amarelo e verde-fluorescente). O mini-mapa receberá moldura estilo radar militar com retículas táticas e borda de vidro azul cian (`rgba(0, 200, 255, 0.4)`).
2.  **Tipografia Urbana de Velocidade (Orbitron & Montserrat)**: Carregar via Google Fonts as fontes **'Orbitron'** (para marcadores vitais como a pontuação e o cronômetro digital `#time`) e **'Montserrat'** em peso extra-negrito (para o texto das missões urbanas e títulos). Isso garantirá uma estética de jogo de ação e velocidade profissional de altíssima qualidade de leitura em movimento.
3.  **Prompt de Ação Pulsante e Game Over Holográfico**: O aviso `#interaction-prompt` ("Press SPACE...") receberá animação de fade-in contínua e pulsação suave em CSS (`@keyframes neonPulse`). A tela de `#game-over` será redesenhada para aplicar desfoque no cenário tridimensional de fundo (`backdrop-filter: blur(8px)`) em vez de cobri-lo totalmente com preto opaco, e o botão `#restart-btn` será transformado em um controle tático amarelo neon com brilho ativo e micro-animação de escala.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes urbanas premium do Google Fonts (`'Orbitron'`, `'Montserrat'`, `'Inter'`) no cabeçalho do HTML.
- [ ] Refatorar os estilos da HUD (`#hud`, `.hud-item`) para criar blocos flutuantes de vidro acrílico organizados em Grid ou Flexbox com excelente espaçamento e margens.
- [ ] Estilizar o mini-mapa circular (`#minimap-container`) adicionando sombras externas azuis, retícula circular tática translúcida e moldura holográfica em CSS.
- [ ] Criar efeito CSS pulsante `@keyframes neonPulse` e de flutuação suave para o prompt de interações e avisos de proximidade de pacotes.
- [ ] Redesenhar os botões de ação e reinício usando transições lineares rápidas (`transition: all 0.2s ease-in-out`) e preenchimento gradiente ciano-amarelo reativo.
- [ ] Refatorar o painel `#game-over` aplicando `backdrop-filter: blur(8px)` no contêiner com fundo translúcido vermelho escuro (`rgba(30, 6, 12, 0.8)`), adicionando um efeito de distorção de sinal estilo Glitch no texto do Game Over.
- [ ] Garantir responsividade e adaptação da HUD para dispositivos móveis por meio de media queries dedicadas, otimizando o tamanho do mini-mapa e do texto.
