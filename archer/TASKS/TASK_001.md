# 🎨 Tarefa 001 - Melhoria Visual: Archer

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O jogo **Archer** possui uma mecânica de simulação de arquearia física clássica e envolvente, com uma ótima base mecânica que inclui rastro de flechas e fragmentação de balão ao estourar. No entanto, visualmente, o jogo carece da imersão que uma temática medieval-fantástica premium exige. O fundo em azul-celeste simples, o arqueiro e arco representados por SVGs chapados, e os contêineres que tentam imitar pergaminho com wheat/beige estáticos dão ao jogo um aspecto datado de "projeto web básico".

A nossa meta de transformação estética é elevar **Archer** a um visual de **"Crônica Medieval Ilustrada"**, onde a interface parece saída de um manuscrito lendário e o cenário em si ganha vida através de efeitos atmosféricos, profundidade em camadas (paralaxe) e micro-interações que transmitem a tensão do disparo da flecha.

## 💡 Sugestões de Melhorias Visuais

1.  **Interface de Manuscrito Medieval Premium**: Sofisticar as caixas de status (`#score-container`, `#arrows-left`) e a tela final. Em vez da cor wheat sólida, utilizaremos uma textura de pergaminho envelhecido gerada por gradientes HSL sofisticados (`linear-gradient(135deg, hsl(38, 56%, 85%), hsl(34, 40%, 70%))`) com bordas duplas imitando metal envelhecido ou couro trabalhado (`border: 3px double hsl(25, 45%, 25%)`). A tipografia será elevada usando **'Cinzel Decorative'** do Google Fonts para títulos majestosos e **'MedievalSharp'** para textos de pontuação e instruções, garantindo imersão tipográfica total.
2.  **Profundidade Cenográfica (Paralaxe Atmosférico)**: Criar um ambiente vivo em camadas. Substituir o céu plano por um gradiente crepuscular dourado a azul profundo (`linear-gradient(to bottom, hsl(200, 80%, 20%), hsl(30, 90%, 60%))`). Adicionar silhuetas de montanhas distantes no fundo, uma floresta densa (camada média) e um terreno frontal detalhado com gradientes verdes terrosos e pequenas flores. Adicionar pequenas partículas de "poeira dourada flutuante" (`gold-dust-particles`) no ar através de animações CSS leves, gerando uma atmosfera mágica de fim de tarde.
3.  **Tensão de Disparo e Arco Dinâmico Premium**: O arco deve demonstrar a força da puxada fisicamente e visualmente. Quando o jogador clica e arrasta para mirar, o arco deve receber uma classe de animação que gera um leve tremor (simulando a fadiga física do arqueiro ao segurar o arco tensionado) e a corda do arco deve brilhar em ouro pulsante (`box-shadow: 0 0 10px hsl(45, 100%, 50%)`) ao atingir a força máxima. O balão receberá um gradiente radial tridimensional brilhante real e, quando estourado, os fragmentos cairão sob efeito de gravidade física simulada com rotações tridimensionais (`transform: rotateY(360deg)`).

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes temáticas medievais do Google Fonts (`'Cinzel Decorative'`, `'MedievalSharp'`, `'Lato'`).
- [ ] Refatorar os contêineres de HUD e a tela de Game Over para usar o estilo de pergaminho antigo envelhecido com bordas esculpidas em bronze e sombras complexas (`box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(100,50,0,0.2)`).
- [ ] Implementar múltiplas camadas de fundo (`.parallax-bg`) para criar efeito de paralaxe (Céu, Montanhas, Floresta Média, Solo Frontal).
- [ ] Adicionar partículas suspensas na atmosfera usando divs leves animadas com `@keyframes floatDust` e opacidade variável.
- [ ] Adicionar efeito de tremor dinâmico (`@keyframes bowTension`) no arco quando o `distance` atingir 80% do valor limite de disparo.
- [ ] Modernizar a barra de força vertical (`#power-indicator`), inserindo uma borda de bronze envelhecido e um preenchimento com efeito de fogo ou energia fluida utilizando gradientes lineares animados de CSS.
