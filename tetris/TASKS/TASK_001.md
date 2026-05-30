# 🎨 Tarefa 001 - Melhoria Visual: Tetris

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O clássico **Tetris** é o rei dos jogos de puzzle em bloco de todos os tempos. Esta versão web ("Tetris Moderno") possui uma excelente estrutura de jogo baseada em loops por `requestAnimationFrame`, manipulação de matrizes de colisão por blocos, sistema de níveis com aceleração progressiva de queda, display de pré-visualização da próxima peça (`next-piece` canvas) e renderização 2D limpa.

No entanto, em termos de experiência visual, o jogo é excessivamente simplista e plano. O uso de cinza fosco e sólido (`#1e1e1e` e `#2d2d2d`), botões verdes básicos e sem reatividade de clique, e fontes genéricas do sistema (`Segoe UI`, `Tahoma`) quebram a adrenalina e a imersão eletrizante do jogo. O nosso plano de direção artística é converter este Tetris em uma espetacular cabine virtual de **"Neo-Arcade Synthwave / Cyber-Neon"**, onde a tela do jogo emane luz, energia e música tátil a cada linha completada pelo jogador.

## 💡 Sugestões de Melhorias Visuais

1.  **Glow Cibernético e Estética Synthwave**: Redesenhar a interface do jogo substituindo o cinza opaco por uma paleta vibrante baseada em violetas espaciais profundos e azuis cósmicos (`background-color: #0b0716`). Os contêineres laterais e o painel de controle usarão **Glassmorphism** com gradiente neon ativo nas bordas (`border: 1.5px solid rgba(0, 240, 255, 0.3)`) e sombras com desfoque de brilho intenso que combinam dinamicamente com as cores das peças em jogo.
2.  **Tipografia Arcade Premium (Orbitron & Press Start 2P)**: Importar fontes do Google Fonts para dar o tom perfeito de fliperama moderno. A fonte **'Press Start 2P'** será aplicada para títulos breves ("GAME OVER", "TETRIS"), e a sofisticada fonte geométrica futurista **'Orbitron'** será adotada nos displays numéricos dinâmicos (`#score`, `#level`, `#lines`), garantindo um visual de placar holográfico de altíssima fidelidade.
3.  **HUD de Status Holográfico e Botões Eletrizantes**: Reestilizar os displays de pontuação e próxima peça para parecerem consoles holográficos de naves espaciais, adicionando efeitos de scanlines suaves em CSS. Os botões de início e reinício (`#startBtn`, `#restartBtn`) serão transformados em controles translúcidos retro-futuristas com gradiente dinâmico cian-magenta pulsante (`hsl(190, 100%, 50%)` para `hsl(320, 100%, 50%)`) que brilha intensamente no hover.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes temáticas de arcade do Google Fonts (`'Orbitron'`, `'Press Start 2P'`, `'Outfit'`) no cabeçalho do arquivo.
- [ ] Aplicar fundo no `body` com gradiente radial estilizado em tons de galáxia profunda e efeitos de grade translúcida de perspectiva em CSS no plano de fundo.
- [ ] Refatorar os painéis secundários (`.side-panel`, `.score-box`, etc.) aplicando cantos arredondados, fundo translúcido escuro (`rgba(22, 12, 38, 0.7)`) e `backdrop-filter: blur(12px)`.
- [ ] Estilizar os botões com efeito de hover reativo dinâmico (`transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1)`), preenchimento gradiente neon e sombreado de brilho pulsante `@keyframes arcadePulse`.
- [ ] Adicionar bordas de neon refinadas no Canvas principal (`#tetris`) e no Canvas de preview (`#nextPiece`) com efeito de brilho externo (`box-shadow: 0 0 15px rgba(156, 90, 255, 0.4)`).
- [ ] Substituir o modal de `#gameOver` por um painel centralizado de impacto visual com tipografia distorcida (Glitch effect) e animação dramática de entrada de tela.
- [ ] Adicionar micro-animações nas caixas numéricas sempre que a pontuação aumentar, simulando um relâmpago de luz que clareia o display rapidamente.
