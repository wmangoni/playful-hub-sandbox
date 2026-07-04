# 🎨 Tarefa 001 - Melhoria Visual: Poker (Poker Texas Hold'em)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O Poker Texas Hold'em possui um motor mecânico fantástico escrito em JavaScript puro contendo distribuição de cartas, baralho embaralhado, cálculo avançado de classificação de mãos de poker para desempates, IA para múltiplos oponentes simulados e animações de fichas de ouro voando (`chipsFly`) e brilho do vencedor (`winnerGlow`). A interface atual usa uma paleta de cores verde-tabuleiro tradicional, mas a representação visual peca por ser excessivamente plana (2D) e desprovida do glamour e luxo de um cassino real de Las Vegas.

A mesa (`.table`) é apenas uma elipse verde com borda sólida e as cartas são retângulos brancos básicos. Os botões de aposta são blocos nativos cinzas ou azuis planos. Há uma oportunidade brilhante de elevar a atmosfera do jogo inserindo texturas de feltro de alta fidelidade, bordas de couro costurado ou mogno para a mesa, designs ultra-premium para o verso e frente das cartas com micro-interações 3D e uma interface de controles e HUD sob os preceitos de Glassmorphism.

## 💡 Sugestões de Melhorias Visuais

1.  **Casino Felt Premium & Tabuleiro 3D Realista**:
    Substituir o fundo de cor verde sólida da mesa por um gradiente radial rico que simule feltro verde profissional aveludado de cassino (`radial-gradient(circle, #1f6f1f 0%, #0a2f0a 100%)`). A moldura da mesa (`.table`) deve ser estilizada com CSS avançado para parecer uma borda clássica de couro acolchoado preto ou madeira mogno envernizada (`linear-gradient(135deg, #4a1c10, #1f0b06)`), com sombras internas profundas (`box-shadow: inset 0 12px 25px rgba(0, 0, 0, 0.8)`) que criam um efeito tridimensional espetacular para o feltro.
2.  **Cartas Ultra-Premium com Animações de Flip 3D**:
    Redesenhar o visual das cartas (`.card`). O verso das cartas (`.facedown`) deve adotar um padrão decorativo intrincado de filigrana dourada geométrica luxuosa sobre fundo azul marinho ou preto brilhante (`#0b0c10`), com cantos arredondados finos e borda externa em ouro (`#d4af37`). Quando novas cartas forem distribuídas ou viradas na mesa (flop, turn, river), aplicar uma transição CSS tridimensional realista de virada de carta (`transform-style: preserve-3d` e `rotateY(180deg)`) com suavidade de `0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)`.
3.  **Controles e HUD Glassmorphism com Fichas Realistas**:
    Reestilizar as áreas dos jogadores (`.player`) e o painel de histórico (`.history-panel`) utilizando **Glassmorphism** de alto padrão (`background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(12px); border: 1.5px solid rgba(212, 175, 55, 0.2)`). O jogador no turno ativo deve ser destacado por uma aura brilhante pulsante dourada em neon (`box-shadow: 0 0 15px #d4af37`). Os botões de apostas devem virar botões metálicos elegantes com gradientes dourados e prateados, e a animação do pote de fichas deve disparar partículas de fichas estilizadas representadas em SVG (fichas com textura de borda listrada colorida) que empilham fisicamente no centro do feltro.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Cinzel`, `Outfit` e `Playfair Display`).
- [ ] Aplicar gradiente aveludado e borda realista de madeira/couro 3D na mesa de jogo (`.table`).
- [ ] Desenhar o verso das cartas (`.card.facedown`) com padrão de filigrana geométrica luxuosa de alta qualidade gráfica.
- [ ] Implementar animações de virada de carta 3D (`perspective` e `rotateY`) no CSS e JS para a distribuição.
- [ ] Estilizar os containers dos jogadores (`.player`) e painel de rodadas com Glassmorphism acrílico.
- [ ] Redesenhar os botões de ação (Fold, Call, Raise) com aparência de botões metálicos circulares ou arredondados táteis, contendo efeitos de hover dinâmicos e escala de 1.05x.
- [ ] Criar animações de pulso neon dourado (`@keyframes goldenPulse`) no jogador que está com o turno atual.
- [ ] Substituir o indicador de Pot por um container que exiba uma pilha visual 2D animada de fichas de cassino reais.
