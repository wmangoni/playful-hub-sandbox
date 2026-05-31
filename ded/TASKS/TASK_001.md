# 🎨 Tarefa 001 - Melhoria Visual: Ded (A Masmorra de Drakmor)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

A Masmorra de Drakmor possui uma excelente base mecânica e narrativa de RPG de fantasia medieval (estilo D&D / Adventure Quest), mas a interface visual é extremamente estática e baseada em elementos HTML cruus e cores sólidas que remetem a páginas de internet dos anos 2000. O uso da fonte `Palatino` serifada é adequado ao tema, mas o layout de grade básica, botões simples nas cores marrom/vermelho, caixas quadradas brancas e um dado representado por um simples caractere estático impedem que o jogador se sinta em uma jornada imersiva de alta fantasia.

O design de interface de um RPG premium precisa transmitir mistério, atmosfera de masmorra, e o suspense de rolar um dado. A transição entre os cartões de seleção de personagem e a aventura carece de suavidade. A disposição das colunas (história, imagem, logs) precisa de um agrupamento visual mais harmônico, com bordas inspiradas em metal, pergaminho ou pedra, além de barras de vida dinâmicas para o HUD.

## 💡 Sugestões de Melhorias Visuais

1.  **Dark Fantasy Theme & Pergaminho Mágico**:
    Mudar o esquema de cores para um estilo "Dark Fantasy". O plano de fundo geral (`body`) deve adotar um gradiente radial dramático (`radial-gradient(circle, #22140a 0%, #0b0603 100%)`) simulando a iluminação de uma tocha fraca em uma caverna. A caixa do jogo (`.game-container`) e o modal de compras devem usar fundos simulando pergaminho antigo escuro com **Glass-papyrus** (`background: rgba(43, 29, 17, 0.9); backdrop-filter: blur(10px); border: 2px solid #b89c72`), complementados por bordas chanfradas douradas ou bronzeadas que remetem a artefatos medievais.
2.  **Dado D20 Tridimensional e Efeitos de Rolagem Dinâmicos**:
    Substituir o elemento de dado estático (`.dice`) por um componente animado via CSS 3D. Ao clicar em "Rolar d20", o dado deve executar uma animação rápida de rotação aleatória de 3D (`transform: rotateX() rotateY()`) simulando a física de rolagem de um poliedro. Ao parar, o resultado deve piscar em ciano/dourado brilhante para sucessos (`text-shadow: 0 0 10px #ffc107`) ou um fade vermelho dramático para falhas críticas.
3.  **HUD de Status Épico & Tipografia Cinematográfica**:
    Substituir os valores de status de texto simples por um painel de RPG elegante com ícones SVG modernos e barras de progresso visuais: a barra de vida (`health`) deve ser um medidor animado vermelho (`linear-gradient(90deg, #7a0000, #ff2e2e)`) que diminui suavemente com transição física (`transition: width 0.5s ease-out`). Importar as fontes **Cinzel Decorative** (do Google Fonts) para os títulos épicos das cenas e a fonte **Lora** ou **MedievalSharp** para os textos descritivos da masmorra. Adicionar micro-animações de trepidação de tela (`shake`) ao sofrer dano para aumentar o impacto visual.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Cinzel Decorative`, `MedievalSharp` e `Lora`).
- [ ] Aplicar fundo temático de masmorra (`radial-gradient`) com tons quentes e sombrios de carvão e fogo.
- [ ] Criar estilização "Glass-papyrus" e bordas metálicas envelhecidas (`#b89c72`) para a interface principal.
- [ ] Implementar barras de progresso CSS dinâmicas para Vida (HP) com animações suaves de transição.
- [ ] Desenvolver a animação de rotação 3D (`@keyframes roll`) para o dado D20 e feedback visual luminoso no sucesso/falha.
- [ ] Estilizar os cards de seleção de personagem (`.character-card`) com efeito de escala suave, brilho dourado e transição suave ao serem selecionados.
- [ ] Reformular os botões de ação e itens da lojinha com visual de botões de couro/metal gravados, com estados `:hover` e `:active` reativos.
- [ ] Adicionar efeito de vibração na tela (`shake`) quando o herói perder vida para aumentar o feedback sensorial.
