# 🎨 Tarefa 001 - Melhoria Visual: Driving Simulator (Simulador de Carro 3D)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O Simulador de Carro 3D é um excelente projeto técnico baseado na biblioteca Three.js, contendo mecânicas sólidas de movimentação, IA concorrente, coleta de moedas e perigo com o trem cruzando a pista. Contudo, visualmente a cena é excessivamente simplista, lembrando jogos experimentais de computação gráfica básica: o céu é azul claro sólido, o chão é verde plano, as árvores são cones rudimentares, e a HUD da interface é composta por caixas pretas semitransparentes com fontes Arial que flutuam sobre o jogo sem qualquer sofisticação de design.

Há uma gigantesca oportunidade artística de transformar este jogo de física rudimentar em uma experiência de corrida altamente estilizada, adotando a estética **Synthwave/Cyberpunk** (Retro-futurismo dos anos 80, estilo *Outrun* / *Tron*) ou um visual de corrida cibernética moderna. Isso faria o jogo se destacar imensamente, substituindo materiais foscos por acabamentos metálicos brilhantes e emissivos na cena 3D e aplicando um HUD acrílico no estilo Glassmorphism na interface 2D.

## 💡 Sugestões de Melhorias Visuais

1.  **Estética Synthwave Neon (Cena 3D)**:
    Transicionar a cena Three.js para o universo Retro-futurista: o céu deve mudar para uma noite profunda com névoa roxa escura (`fogColor: 0x12081f`) e o solo de grama plana deve ser substituído por uma grelha laser brilhante (linhas roxas e magenta). O carro do jogador deve receber um material metálico brilhante com emissivos ciano neon (`#00f2fe`) nos faróis e rodas. O carro da IA deve adotar tons magenta e rosa quente neon (`#4facfe`). As árvores simples podem ser substituídas por modelos de aramado holográfico 3D (*wireframe*).
2.  **HUD Acrílico (Glassmorphism) e Velocímetro Cyberpunk**:
    Redesenhar as caixas de placar (`#scoreboard`), barra de moedas (`#healthBars`) e mensagens centrais com a técnica **Glassmorphism**. Utilizar fundos translúcidos (`background: rgba(10, 10, 15, 0.55); backdrop-filter: blur(12px); border: 1px solid rgba(0, 242, 254, 0.2)`). O velocímetro em canvas deve ser redesenhado com arcos de LED concêntricos brilhantes inspirados em painéis de hipercarros do futuro, usando gradientes neon em vez do ponteiro de agulha analógico clássico.
3.  **Tipografia High-Tech e Animações de Colisão**:
    Importar e aplicar a fonte **Orbitron** do Google Fonts para elementos de texto numéricos/velocidade, e **Rajdhani** ou **Outfit** para rótulos gerais. Quando o jogador ou a IA coletar uma moeda ou colidir com o trem, disparar um efeito CSS de tremor na tela (`hud-shake`) e fazer o medidor de status respectivo piscar intensamente. A mensagem central de "Pressione ESPAÇO para iniciar" ou "VOCÊ VENCEU" deve usar animações sutis de *glitch cyberpunk* de texto para dar dinamismo.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Orbitron`, `Rajdhani` e `Outfit`).
- [ ] Mudar cores globais da cena Three.js para o tema Synthwave escuro com névoa roxa dinâmica.
- [ ] Aplicar padrões de grade neon (*neon grid*) no material do solo utilizando texturas ou shaders em Three.js.
- [ ] Adicionar brilho neon emissivo (`emissive` em MeshStandardMaterial) nos faróis e lanternas traseiras dos carros do jogador e da IA.
- [ ] Estilizar todos os containers HTML da HUD (`#scoreboard`, `#healthBars`, `#message`) com Glassmorphism (`backdrop-filter` e bordas translúcidas brilhantes).
- [ ] Redesenhar a renderização 2D do Canvas do velocímetro com visual cyber-digital de alta precisão.
- [ ] Implementar barras de progresso modernas com preenchimento em gradiente neon pulsante e efeitos CSS de brilho (`box-shadow`).
- [ ] Adicionar efeitos de transição visual suave de escala e transições `:hover`/`:active` nos botões de reinicialização.
