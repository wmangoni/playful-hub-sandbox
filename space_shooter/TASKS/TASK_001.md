# 🎨 Tarefa 001 - Melhoria Visual: Space Shooter (Jogo de Nave Espacial HTML5)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O Space Shooter é um dos jogos de ação arcade mais completos e polidos do hub sandbox. Ele traz uma vasta gama de mecânicas refinadas: rolagem de fundo estrelado em paralaxe de 3 camadas (`stars`), naves inimigas com padrões de inteligência e movimentação variados, projéteis comuns e especiais (tiro triplo, tiro teleguiado), escudo de energia com pulsação CSS, itens coletáveis de power-up, detecção de colisão AABB ultra-precisa, batalhas contra chefões épicos (Boss) com barras de vida independentes, tela de Game Over reativa, efeitos sonoros (SFX) integrados a áudios HTML5 e faixas de música de fundo (BGM) dramáticas, além de uma física de partículas de explosão excepcional (`createParticleBurst`) e efeito de tremor de tela na colisão (`screenShake`).

Apesar de todas as mecânicas avançadas e do excelente código, a estética 2D ainda recorre a cores e formas geométricas excessivamente planas e sólidas. A nave do jogador é um triângulo azul básico (`#3498db`), o Boss é um bloco roxo simples (`#8e44ad`) e o HUD do jogo é composto por textos brancos soltos nos cantos da tela. Há uma oportunidade colossal de transformar este jogo em um espetáculo de **Synthwave Cyber-Arcade**, com glows intensos, naves metalizadas/neon, efeitos de rastro mais complexos e uma interface holográfica com Glassmorphism acrílico.

## 💡 Sugestões de Melhorias Visuais

1.  **Estética Gabinete Cyberpunk Retro-Arcade**:
    Estilizar o contorno do console de jogo (`#game-container`) aplicando bordas arredondadas profundas e uma aura emissiva neon pulsante nas bordas (mistura de azul neon e rosa magenta). O plano de fundo da página de jogo deve abandonar o preto puro e adotar um gradiente espacial Synthwave deslumbrante (`linear-gradient(135deg, #09090e 0%, #1c0e35 100%)`) combinado com estrelas de fundo e nébulas coloridas em CSS. Pode-se também aplicar um efeito sutil de scanlines CRT semi-transparentes sobre a tela de jogo.
2.  **Naves e Chefes Metálicos Holográficos com Gradientes Neon**:
    Redesenhar os preenchimentos das naves nos SVGs. A nave do jogador deve usar gradientes lineares metálicos cromados (`linear-gradient(to right, #00f2fe, #4facfe)`) e uma borda de brilho ciano. O Boss (`#boss`) e os inimigos devem ter gradientes de energia sombria (vermelho carmesim, roxo ametista escuro) com propulsores brilhantes que pulsam com `shadowBlur` de alta intensidade e partículas adicionais geradas nas turbinas de escape.
3.  **HUD de Status Glassmorphic & Tipografia Orbitron**:
    Reestilizar por completo os placares, barras de vida e displays (`#score`, `#phase-display`, `#special-charges`, `#player-hp-bar-container`, `#boss-hp-bar-container`) sob os preceitos do **Glassmorphism** de ficção científica (`background: rgba(8, 12, 24, 0.65); backdrop-filter: blur(12px); border: 1.5px solid rgba(0, 242, 254, 0.2)`). Utilizar a fonte **Orbitron** ou **Share Tech Mono** do Google Fonts para todas as pontuações e títulos. As barras de progresso de vida (HP) e especial devem conter gradientes vibrantes HSL pulsantes (verde elétrico para vida cheia, vermelho laser para perigo, azul cibernético para carga especial).

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Orbitron`, `Share Tech Mono` e `Inter`).
- [ ] Aplicar gradiente espacial profundo escuro no fundo do body da página e no container principal de jogo.
- [ ] Implementar iluminação neon pulsante dupla (ciano/magenta) na moldura do container do jogo (`#game-container`).
- [ ] Atualizar os SVGs das naves para usar definições de gradientes brilhantes em suas tags `<defs>` (ex: `#playerGrad` e `#bossGrad`).
- [ ] Adicionar micro-animações CSS de vibração constante e partículas nos escapamentos/propulsores de todas as naves e do boss.
- [ ] Redesenhar as barras de vida do jogador e do boss e os displays informativos com Glassmorphism acrílico, cantos arredondados e luz neon ciano/laranja.
- [ ] Otimizar os efeitos de colisão e tiro adicionando luzes emissivas temporárias nos projéteis normais e teleguiados.
- [ ] Ajustar a responsividade e o posicionamento absoluto das caixas de texto com margens e preenchimentos mais harmônicos.
