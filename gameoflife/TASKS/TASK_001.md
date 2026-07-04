# 🎨 Tarefa 001 - Melhoria Visual: Game of Life

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

A implementação de Conway's Game of Life atual é funcionalmente impecável, oferecendo controle de velocidade em tempo real e diversos padrões pré-carregados (como o Gosper Glider Gun e Pulsar). Porém, esteticamente, o jogo se assemelha a um exercício de programação web básico de 2010. A paleta de cores baseada em fundo cinza claro `#f0f0f0`, botões com cores sólidas padrão (verde `#4CAF50` e azul `#2196F3`), e o canvas desenhando blocos pretos e secos sobre uma grade branca causam cansaço visual imediato e desinteresse estético.

A nossa proposta de revitalização visual é transformar o jogo de uma planilha fria em uma **"Placa Computacional Biológica Neon"** ou um **"Terminal de Laboratório Sci-Fi"**. Ao aplicar o tema escuro (Dark Mode Cyberpunk), células fluorescentes bioluminescentes e uma interface de controle em vidro fosco (Glassmorphism), o projeto se tornará uma obra de arte gerativa moderna e altamente instagramável.

## 💡 Sugestões de Melhorias Visuais

1.  **Interface de Terminal Sci-Fi (Glassmorphism Cyberpunk)**: Transmutar a paleta de cores geral do cinza-claro para um tema escuro profundo e tecnológico. O fundo utilizará um gradiente radial escuro (`radial-gradient(circle, #16192b 0%, #090a10 100%)`). Os blocos de controle e estatísticas serão organizados em cartões flutuantes de vidro fosco aplicando `backdrop-filter: blur(10px)`, preenchimento translúcido (`rgba(20, 25, 45, 0.5)`) e bordas com gradiente neon ativo (`linear-gradient(135deg, rgba(0, 242, 254, 0.4), rgba(79, 172, 254, 0.1))`).
2.  **Células Bioluminescentes e Efeito Neon Glow**: Redesenhar a renderização das células no canvas. Em vez de preenchimento plano preto `#333`, desenharemos as células com cantos arredondados (`ctx.roundRect`) e um gradiente de preenchimento bioluminescente fluorescente ativo (como um degradê de Cyan `hsl(180, 100%, 50%)` para Roxo Neon `hsl(280, 100%, 50%)`). Adicionar propriedades de sombra de contexto no canvas (`ctx.shadowBlur = 10` e `ctx.shadowColor = 'rgba(0, 242, 254, 0.8)'`) para simular o efeito de emanação de luz real, fazendo a vida celular vibrar na tela.
3.  **Tipografia e Controles Dinâmicos Estilizados**: Importar a fonte **'Orbitron'** do Google Fonts para a numeração estatística (`.stats`) e títulos, simulando visores eletrônicos táticos, combinada com **'Inter'** para textos explicativos de alta legibilidade. Os botões serão estilizados com bordas neon finas, fundo transparente e transições de hover com expansão volumétrica de brilho e escala sutil (`transform: scale(1.05)`). O slider de velocidade (`input[type="range"]`) será transformado em uma "barra de energia tática" retroiluminada de cor cyan.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar as fontes premium do Google Fonts (`'Orbitron'`, `'Inter'`) no cabeçalho do HTML.
- [ ] Aplicar estilo escuro geral no `body`, incluindo um sutil background de padrão de malha eletrônica usando SVG embutido em CSS.
- [ ] Implementar **Glassmorphism** e **Neon Glow** nas seções `.controls`, `.stats` e `.patterns` com `backdrop-filter`, bordas translúcidas de cor cyan/magenta e sombras.
- [ ] Modificar a função de desenho `drawGrid()` no Javascript para suportar células com cantos arredondados, preenchimento em gradiente linear dinâmico de duas cores e efeito de brilho no contexto do Canvas 2D (`shadowBlur`).
- [ ] Redesenhar totalmente o slider `#speed-slider` aplicando estilos CSS customizados para `webkit-slider-runnable-track` e `webkit-slider-thumb` com visual tecnológico de neon cyan.
- [ ] Adicionar transições CSS em todos os botões (`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`) com micro-animações de hover que adicionam uma sombra brilhante no fundo.
