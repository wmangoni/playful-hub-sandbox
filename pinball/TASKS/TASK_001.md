# 🎨 Tarefa 001 - Melhoria Visual: Pinball (Pimbal)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O jogo Pimbal possui um excelente motor físico de Canvas 2D implementando gravidade, atrito, rebatida avançada de flippers pivotantes, bumpers circulares, zonas de multiplicação de pontuação e colisão em paredes diagonais segmentadas. Há inclusive partículas básicas geradas nos impactos e um sistema contra "bola travada". No entanto, a estética geral é muito rudimentar e carece do brilho e espetáculo visual típicos das mesas reais de pinball e de arcades premium.

A tipografia do HUD de status ("Score", "Lives", "Multiplier") sob o Canvas é extremamente simples e estática. A mola do lançador de bola e a barra de força na lateral são funcionais, mas utilizam gradientes cinzas e verdes muito simples. Os bumpers e as zonas de multiplicação de pontuação flutuam sobre a mesa com cores sólidas ou semi-transparentes de baixa definição de design. É o cenário ideal para uma transformação estética retro-futurista neon de alta reatividade.

## 💡 Sugestões de Melhorias Visuais

1.  **Neon Retro-Arcade & Canvas Bloom (Cena de Jogo)**:
    Estilizar o Pimbal para parecer uma máquina de arcade física real brilhante dos anos 80. O contorno do Canvas (`#gameCanvas`) deve receber uma borda gradiente metálica cromada combinada com sombras internas e externas de LED neon azul e magenta pulsante. No Canvas, as colisões contra os bumpers devem disparar um brilho intenso temporário (efeito bloom radial dinâmico usando `ctx.shadowBlur = 30` com a cor correspondente). A bola de metal deve ter reflexos cromados aprimorados e deixar um rastro translúcido sutil de faíscas neon na mesa com física de decaimento gravitacional.
2.  **HUD Glassmorphic Unificado & Placar Responsivo**:
    Redesenhar a área do placar e status (`#gameInfo`) integrando-a em cima ou ao redor da mesa com a estética **Glassmorphism**. Utilizar um fundo translúcido acrílico (`background: rgba(18, 18, 24, 0.65); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08)`) com cantos perfeitamente arredondados. O texto das pontuações deve ter um glow dinâmico de neon dourado (`text-shadow: 0 0 8px rgba(255, 215, 0, 0.6)`) e animações de escala suave (`scaleUp` e `scaleDown`) sempre que pontos forem somados.
3.  **Tipografia Retro Gamer e Efeitos Holográficos**:
    Importar e aplicar a fonte do Google Fonts **Press Start 2P** para títulos e textos críticos como "GAME OVER", "MULTIPLIER UP" e pontuações numéricas, resgatando a autêntica atmosfera de fliperamas clássicos de 8-bits. As zonas de multiplicação devem abandonar a aparência transparente básica e adotar um preenchimento holográfico com padrões de linhas pontilhadas de laser que giram suavemente ou pulsam em HSL dinâmico. O medidor de potência do Launcher deve brilhar como uma barra de energia sci-fi com gradientes dinâmicos de carga.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Press Start 2P` e `Orbitron`).
- [ ] Implementar design de moldura metálica e iluminação LED neon pulsante no contorno do canvas.
- [ ] Aplicar efeitos de bloom intensos (`ctx.shadowBlur`) dinâmicos ao redor de bumpers e pinos quando colididos.
- [ ] Redesenhar a física visual de partículas de fagulha neon com cores mais vivas e variadas (ciano, laranja quente, verde elétrico).
- [ ] Configurar layout Glassmorphism para o HUD de informações gerais, adicionando desfoque de fundo e bordas translúcidas.
- [ ] Adicionar animações CSS de expansão e vibração temporária no texto de pontuação quando houver colisões de alto valor.
- [ ] Estilizar a mola mecânica e a barra indicadora de força lateral com gradientes luminosos de LED.
- [ ] Melhorar a responsividade geral e centralização da mesa em telas de tamanhos variados.
