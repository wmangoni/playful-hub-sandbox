# 🎨 Tarefa 001 - Melhoria Visual: Chess (Xadrez com IA)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

A interface atual do jogo de xadrez é funcional, porém apresenta uma estética datada e excessivamente simples. O uso de um fundo cor oliva-amarelado (`#b3aa88`), fontes padrão do sistema (`sans-serif`), e controles sem estilização (botões e selects nativos sem estilização refinada) impede que o jogo proporcione uma experiência premium e imersiva. 

O tabuleiro (utilizando a biblioteca externa `chessboardjs`) e as peças capturadas ficam dispostos verticalmente de forma muito básica. O overlay de "Pensando..." usa um fundo branco semi-transparente simples e sem animação ou efeito de blur moderno. Há uma excelente oportunidade de elevar o jogo para um patamar de "xadrez cibernético" ou "minimalista moderno", utilizando dark mode elegante, glassmorphism nas áreas de status e controles, e efeitos sutis de glow de neon para destacar xeques e movimentos válidos.

## 💡 Sugestões de Melhorias Visuais

1.  **Cyberpunk / Minimalist Dark Mode com Glassmorphism**:
    Substituir o fundo amarelo-oliva por um tom grafite escuro profundo (`#0d0e12` ou `#121214`), que destaca o tabuleiro de xadrez. As áreas de peças capturadas e o painel de controle devem adotar o estilo **Glassmorphism**, utilizando fundos semi-transparentes (`background: rgba(255, 255, 255, 0.03)`), bordas finas e sutis (`border: 1px solid rgba(255, 255, 255, 0.08)`) e desfoque de fundo (`backdrop-filter: blur(12px)`).
2.  **Neon Glow para Indicadores de Estado e Movimentos**:
    Melhorar os destaques visuais do tabuleiro. Quando o rei estiver em xeque, aplicar um brilho neon vermelho pulsante (`box-shadow: 0 0 20px rgba(255, 59, 48, 0.8)`) em vez da borda vermelha sólida simples. As casas de movimentos possíveis (`highlight-legal-move`) podem usar um verde ou ciano neon translúcido com animação suave de fade-in. O overlay "Pensando..." deve ter um fundo escuro desfocado (`rgba(0, 0, 0, 0.6)`) com um spinner de carregamento circular de neon azul (`#007aff`).
3.  **Tipografia Moderna e Controles Premium**:
    Importar as fontes **Outfit** ou **Inter** do Google Fonts para a interface geral, e **Orbitron** para os status numéricos ou títulos, conferindo uma atmosfera high-tech. Customizar os elementos de interface (`select` e `button`) com gradientes discretos, bordas arredondadas e micro-interações animadas no hover (aumento de escala sutil de 1.02x, mudança de cor de borda de cinza para ciano neon, e transições de `0.2s cubic-bezier(0.4, 0, 0.2, 1)`).

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Outfit` e `Orbitron`).
- [ ] Implementar tema escuro premium (`#0d0e12`) com transições de cores suaves.
- [ ] Aplicar Glassmorphism (`backdrop-filter: blur()`) nos containers de peças capturadas (`.captured-pieces`) e nos controles.
- [ ] Substituir o loading overlay por uma tela com desfoque de fundo avançado e spinner CSS animado em ciano.
- [ ] Estilizar os botões e selects com design moderno (remover estilos nativos, adicionar `border-radius: 8px`, sombras suaves e efeitos hover).
- [ ] Aplicar efeitos de Neon Glow com `box-shadow` e `text-shadow` dinâmicos para check, vitórias/derrotas e turnos.
- [ ] Melhorar layout e responsividade geral, garantindo que o tabuleiro se ajuste bem a diferentes tamanhos de tela.
