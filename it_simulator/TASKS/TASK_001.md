# 🎨 Tarefa 001 - Melhoria Visual: It Simulator

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O **Tech Company Management Simulation (IT Simulator)** é um simulador de gestão e carreira de TI extremamente completo e rico em mecânicas (sistema de carreira, XP, árvore de habilidades detalhada, certificações táticas, conquistas desbloqueáveis e gerenciamento financeiro corporativo). No entanto, visualmente, o jogo se parece com uma planilha administrativa estática do início dos anos 2010. O layout com fundo cinza-claro `#f5f5f5` padrão, caixas sólidas brancas e cinzas `#ecf0f1`, e botões planos e secos sem feedback reativo mascaram a complexidade brilhante e a diversão do jogo.

O nosso objetivo de design para o **IT Simulator** é transformá-lo em uma interface de **"SaaS Dashboard Premium"** (inspirado nos layouts modernos da Stripe, Vercel e Linear) com toques de **"Console de Desenvolvedor"**. Queremos que o jogador realmente se sinta em um centro de operações de tecnologia de ponta, onde cada evolução de skill, certificação ganha e log de lucros transborde reatividade, fluidez e satisfação visual.

## 💡 Sugestões de Melhorias Visuais

1.  **Dashboard SaaS Premium em Dark Mode**: Substituir a paleta clara e genérica por uma estética de console profissional SaaS escuro (`background-color: #0b0f19`). Os painéis (`.stats-panel`, `.actions-panel`) serão cartões de Glassmorphism flutuantes de alta fidelidade com `backdrop-filter: blur(16px)`, fundo semi-translúcido (`rgba(17, 24, 39, 0.7)`) e bordas extremamente finas iluminadas por gradientes táticos em HSL (`border: 1px solid rgba(255, 255, 255, 0.08)`).
2.  **Gamificação e Skill Tree Futurista (Glow e Perspectiva)**: Substituir os pontos básicos de nível (`.level-dot`) por indicadores estilizados de "células de silício neon" que se acendem em gradiente degradê progressivo do Cyan (`hsl(190, 100%, 50%)`) ao Verde-SaaS (`hsl(145, 80%, 45%)`). As certificações locked/unlocked serão remodeladas com efeitos de rotação em perspectiva 3D interativos no hover (`transform: perspective(800px) rotateX(10deg) translateY(-4px)`) e sombras com brilho volumétrico correspondente ao tipo de tecnologia.
3.  **Terminal de Log Estilo "DevTools Console"**: Transformar o log de mensagens básico em um terminal de comando hacker/desenvolvedor real. Usar fundo preto puro (`#020617`), tipografia de código moderna como **'Fira Code'** ou **'JetBrains Mono'** via Google Fonts, e coloração sintática de logs automática (ex: erros financeiros em vermelho fluorescente `#ef4444`, conquistas e bônus em verde `#22c55e`, e eventos comuns em azul terminal `#3b82f6`), com um efeito de cursor piscante.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`'Fira Code'` para logs e códigos, `'Inter'` ou `'Outfit'` para o painel administrativo).
- [ ] Aplicar folha de estilo global em Dark Mode, definindo gradientes escuros e suaves no `body` com sombras de ambientação modernas.
- [ ] Refatorar os botões de controle (`.action-button`) para se tornarem cartões interativos de ação rápida com transições suaves (`transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)`), ícones e efeitos de preenchimento progressivo em gradiente linear.
- [ ] Criar animação de brilho pulsante nos slots de "Certificações Completas" e "Conquistas Desbloqueadas" com `@keyframes neonPulse`.
- [ ] Refatorar a classe `.level-dot` e `.level-dot.active` no CSS para simular mini LEDs acesos com bordas arredondadas e `box-shadow` pulsante.
- [ ] Estilizar a barra de progresso de experiência (`.xp-bar`) e de segurança (`.progress-bar`) com gradiente fluido em degradê animado via `background-size` e transições de largura mais responsivas.
