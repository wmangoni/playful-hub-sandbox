# 🎨 Tarefa 001 - Melhoria Visual: Strategy Game (Realm Builder)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O Realm Builder é um excelente jogo de estratégia de gerenciamento de tempo e recursos em tempo real ("Speed Run"). Ele possui uma mecânica impecável baseada em 10 níveis de dificuldade crescente, geração procedural de rios e terrenos no mapa (um grid 20x15), 7 tipos de construções com custos e propriedades exclusivas (Castelo, Fazenda, Quartel, Muro, Mina, Serraria, Templo), um sistema aleatório de eventos climáticos/políticos que afetam os recursos (com alertas sonoros de trombeta, flashes coloridos de feedback na tela e log de eventos) e suporte a música medieval integrada.

Embora o design seja reativo e as mecânicas de jogo estejam bem implementadas, o visual do game é extremamente simples e estéril. O mapa é uma grade plana dividida por cores sólidas estáticas (verde claro para grama, azul-ciano para água, marrom para terra), os edifícios são representados por emojis soltos no centro das células e o painel lateral é uma caixa cinza escura sem acabamento premium. Há uma oportunidade brilhante de elevar a ambientação do Realm Builder para o patamar de um **Board Game Medieval de Luxo** ou **RPG de Fantasia Clássico**, com texturas ricas de pergaminho, bordas ornamentadas em madeira/pedra, HUDs translúcidos elegantes e micro-animações mágicas de construção.

## 💡 Sugestões de Melhorias Visuais

1.  **Estilo Tabuleiro de Fantasia Medieval & Texturas Ricas**:
    Transformar o visual do plano de fundo e da grade de terrenos do jogo. Mudar o fundo do body para uma textura escura de pedra esculpida de castelo (`radial-gradient(circle, #201a15 0%, #0c0806 100%)`). A moldura do mapa (`.map`) deve receber uma borda robusta de mogno ou metal rústico com relevo e sombras projetadas. Substituir as cores sólidas e secas dos terrenos por gradientes radiais suaves e elegantes que simulem gramados aveludados (`radial-gradient(circle, #7da52c 0%, #56771a 100%)`) e lagos profundos translúcidos (`radial-gradient(circle, #2d7b9c 0%, #154e68 100%)`), com micro-padrões e ondulações animadas no CSS na água.
2.  **Efeitos Mágicos de Construção & Profundidade nos Edifícios**:
    Para dar mais vida e fisicalidade ao reino, os edifícios e emojis colocados nas células não devem apenas aparecer de forma seca. Implementar uma animação de impacto elástico de entrada (`popIn` usando `@keyframes popIn { 0% { transform: scale(0) rotate(-10deg); } 70% { transform: scale(1.15) rotate(5deg); } 100% { transform: scale(1) rotate(0); } }`). Os emojis de edifícios devem ter sombras projetadas realistas (`filter: drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.45))`) para parecerem peças tridimensionais de madeira ou resina esculpida flutuando no mapa físico.
3.  **HUD de Reino Glassmorphic & Pergaminho de Eventos**:
    Redesenhar o painel lateral `.info-panel` utilizando a estética **Glassmorphism** enriquecida com detalhes medievais: fundo translúcido escurecido acrílico com bordas douradas filigranadas e desfoque profundo (`backdrop-filter: blur(10px)`). Os botões de construção (`.build-button`) devem virar botões táteis elegantes com relevo, bordas arredondadas e efeito de clique rebaixado (`active`). O log de eventos (`.event-log`) deve ser estilizado como um pergaminho antigo de papel envelhecido (`background: #f2e6cb; border: 1.5px solid #d4c39c; color: #3d2c1c`), usando a fonte serifa premium **Cinzel** ou **MedievalSharp** do Google Fonts para resgatar a atmosfera clássica de crônicas de reino.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`MedievalSharp`, `Cinzel` e `Inter`).
- [ ] Aplicar gradiente profundo em tons de pedra e madeira rústica medieval no plano de fundo e nas bordas do jogo.
- [ ] Redesenhar as células do mapa (`.tile`) com gradientes suaves HSL simulando relevo, sombras de divisa e água em movimento animado.
- [ ] Implementar animações elásticas de entrada (`@keyframes popIn`) ao construir edifícios na grade.
- [ ] Adicionar filtros de sombra (`drop-shadow`) em todos os emojis de construções para criar um efeito 3D real de peças de tabuleiro físico.
- [ ] Estilizar o painel lateral (`.info-panel`) e recursos com Glassmorphism e ornamentação dourada.
- [ ] Reestilizar o painel de histórico de eventos (`.event-log`) com estilo de pergaminho rústico envelhecido e tipografia cursiva/medieval.
- [ ] Criar efeitos de hover luminosos, escala física de 1.05x e transições fluidas nos botões de construção.
- [ ] Melhorar o alinhamento centralizado de todo o layout do jogo e sua responsividade para telas de proporções diversas.
