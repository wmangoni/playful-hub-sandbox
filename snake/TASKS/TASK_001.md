# 🎨 Tarefa 001 - Melhoria Visual: Snake (Enhanced Snake Game)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O jogo da cobrinha (Snake) está excepcionalmente bem estruturado, contendo suporte a recordes locais via LocalStorage, tela de Game Over condicional ao recorde que solicita o nome do jogador, controle de velocidade dinâmico conforme a pontuação sobe, efeito de tremor de tela (shake) em colisões e um desenho muito refinado no Canvas 2D (a comida possui gradiente radial de brilho emissivo pulsante em tempo real e o corpo da cobra possui cantos arredondados com juntas de conexão inteligentes que eliminam os vácuos tradicionais entre blocos). As fontes do Google Fonts (`Press Start 2P` e `Roboto`) já estão presentes e há variáveis CSS no `:root` gerenciando cores ciber.

Apesar desse excelente ponto de partida, o visual ainda parece ligeiramente isolado e flutuante. O layout e os painéis de status de pontuação são caixas separadas e opacas com bordas tracejadas. Temos uma excelente oportunidade de unificar toda a interface sob a estética **Synthwave/Outrun Neon de Alta Fidelidade**, tornando a moldura do jogo, o HUD e as interações do Canvas ainda mais ricos e polidos com partículas, efeitos acrílicos e molduras de neon vibrante.

## 💡 Sugestões de Melhorias Visuais

1.  **Glow Neon Synthwave & Moldura de Gabinete Retro-Arcade**:
    Estilizar o contorno do container do jogo (`#gameContainer`) com bordas cromadas e uma aura de luz brilhante neon ciano elétrico pulsante que simula a tela física curvada CRT de um fliperama clássico. O fundo geral da página pode incorporar um sutil padrão de grade de horizonte cibernético em perspectiva CSS (`perspective`) animada no background para dar uma incrível atmosfera cibernética outrun dos anos 80.
2.  **Explosões de Partículas na Alimentação & Rastro Glow**:
    Sempre que a cobra comer a maçã luminosa, disparar no Canvas 2D um efeito de explosão radial contendo 8 a 12 pequenas partículas circulares de fagulha neon rosa brilhante que se espalham fisicamente e se dissolvem (`fade-out`) em milissegundos. Adicionar um contorno com leve transparência especular (glow) nas laterais dos segmentos da cobra para que ela pareça deslizar como uma criatura de neon viva sobre a grade de fundo.
3.  **Console Glassmorphic Unificado de Placar**:
    Fundir o painel de Score (`#scoreDisplay`) e a tabela de líderes (`#highScores`) em um único painel integrado flutuante estilo **Glassmorphism** situado abaixo ou ao lado do jogo (`background: rgba(15, 22, 38, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(102, 252, 241, 0.2)`). Estilizar a listagem de recordes para que os primeiros lugares recebam ícones dourados, prateados e de bronze e efeitos de brilho especiais para destacar as pontuações mais altas. Os botões de salvar pontuação e reiniciar devem receber transições de cor gradiente fluidas e escala dinâmica (hover de 1.05x).

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts se necessário (otimizar uso de `Press Start 2P` e `Roboto`).
- [ ] Aplicar iluminação LED neon pulsante azul/rosa na borda do container do jogo (`#gameContainer`).
- [ ] Implementar grade animada em perspectiva synthwave 3D simulada por CSS no fundo do body.
- [ ] Adicionar física de partículas dinâmicas em Canvas 2D que explodem a partir da posição da comida ao ser consumida.
- [ ] Criar brilho especular (`shadowBlur` controlado) nas bordas dos blocos do corpo da cobra.
- [ ] Redesenhar o painel de status inferior (`#uiContainer`) com Glassmorphism acrílico integrado.
- [ ] Aplicar medalhas coloridas ou efeitos de glow neon na tabela de recordes locais (`#highScoreList`).
- [ ] Estilizar os inputs de texto e botões da tela de Game Over com gradientes brilhantes e micro-animações de hover suaves.
