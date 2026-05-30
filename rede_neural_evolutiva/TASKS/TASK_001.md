# 🎨 Tarefa 001 - Melhoria Visual: Rede Neural Evolutiva (Jogo de IA Evolutiva)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O simulador de Rede Neural Evolutiva possui um motor científico e matemático excepcional baseado em algoritmos evolutivos (Estratégia Evolutiva) com mutação adaptativa, elitismo de ouro/prata e Crossover. Ele exibe em tempo real o cérebro (MLP com múltiplas camadas ocultas e ativação ReLU/Sigmoid), além de gráficos históricos de desempenho por geração e um leitor/copiador de código JSON do melhor indivíduo. Contudo, o design visual é extremamente escolar: o fundo da página é cinza claro, o céu é azul claro simples, os jogadores são blocos quadrados de cores básicas sólidas e os botões e textos têm formatação muito primitiva.

Este simulador científico de ponta tem o potencial de se transformar em um impressionante **Laboratório Cibernético de IA** de estética sci-fi premium. Redesenhar os gráficos, o mapa de jogo, o painel do cérebro neural e os contêineres de status sob a filosofia cyberpunk/futurista com Neon Glow e Glassmorphism trará uma imersão técnica espetacular, digna de softwares de visualização de IA de ficção científica.

## 💡 Sugestões de Melhorias Visuais

1.  **Cenário de Teste Cibernético & Dark Sci-Fi Theme**:
    Substituir o fundo cinza por um tom preto-carbono profundo e futurista (`#08090d`). O céu azul claro do Canvas de simulação (`#gameCanvas`) deve virar uma grade vetorial holográfica (`#0b0d13` com linhas de grade ciano translúcido `#00f2fe` a 5% de opacidade). Os agentes da IA (jogadores) devem deixar de ser cubos sem graça e passar a ser pequenos blocos brilhantes neon estilizados com cantos arredondados, halos de luz e rastros de movimento translúcidos com base em sua cor e status (por exemplo, a elite brilhando em dourado).
2.  **Rede Neural e Gráfico Evolutivo de Alta Reatividade Visual**:
    Substituir as renderizações em canvas de fundo branco por fundos transparentes de alta tecnologia. Na Rede Neural (`#nnCanvas`), os neurônios ativos devem pulsar intensamente em ciano de acordo com a ativação ReLU (`rgba(0, 242, 254, activations)`), e as sinapses (conexões) devem brilhar em gradientes de cor azul/vermelho emissivo baseados no peso da conexão sináptica. O gráfico de barras evolutivo (`#graphCanvas`) deve exibir barras com gradientes neon verticais elétricos (`linear-gradient(to top, #00f2fe, #4facfe)`) e linhas de grade brilhantes.
3.  **Painel de Monitoramento Holográfico em Glassmorphism & JSON Cyberpunk**:
    Redesenhar o HUD superior (`#info`), as informações de elite (`#eliteInfo`) e o painel JSON (`#jsonViewer`) em painéis acrílicos flutuantes com **Glassmorphism** avançado (`background: rgba(13, 17, 28, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(0, 242, 254, 0.15)`). Importar fontes futuristas como **Share Tech Mono** ou **Fira Code** do Google Fonts para a sintaxe do JSON e dados de status. Os botões de copiar/carregar devem ganhar uma aparência tecnológica premium, com cantos arredondados, contornos brilhantes, e micro-animações de hover suaves (escala de 1.05x e glow neon sutil).

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Share Tech Mono`, `Orbitron` e `Outfit`).
- [ ] Implementar tema de fundo sci-fi profundo escuro (`#08090d`) na interface e nos canvases.
- [ ] Aplicar padrão de grade vetorial brilhante ao fundo do simulador de obstáculos (`#gameCanvas`).
- [ ] Adicionar efeitos de brilho neon dinâmicos e rastros de fade-out nos jogadores que saltam os obstáculos.
- [ ] Redesenhar o renderizador do canvas da rede neural (`#nnCanvas`) com neurônios circulares translúcidos pulsantes e sinapses coloridas por pesos de conexões em tempo real.
- [ ] Estilizar o visualizador de JSON (`#jsonViewer`) e placares com Glassmorphism acrílico.
- [ ] Customizar a sintaxe do JSON com fontes monoespaçadas modernas e cores de destaque neon (ciano, amarelo elétrico, magenta).
- [ ] Adicionar transições suaves de hover e estados `:active` reativos em todos os botões de controle de genes.
