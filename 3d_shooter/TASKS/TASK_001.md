# 🎨 Tarefa 001 - Melhoria Visual: 3D Shooter

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O **Retro Doom-Style Shooter** atual possui uma jogabilidade empolgante e uma estética tridimensional baseada em raycasting que remete diretamente aos clássicos dos anos 90, como *Doom* e *Wolfenstein 3D*. No entanto, a interface atual (as telas de início, pausa e fim de jogo) e a experiência de HUD (Heads-Up Display) são construídas de forma excessivamente básica. O uso de fontes de sistema como `Courier New` e `Arial`, cores vermelhas e amarelas sólidas e duras, e a ausência de transições de profundidade quebram a imersão da experiência do jogador.

Há uma oportunidade fantástica de elevar este projeto ao status **Premium** integrando o estilo visual retro-cru com a sofisticação da UI/UX moderna (o conceito de "Retro-Cyberpunk" ou "Cyber-Doom"). Ao adicionar profundidade através de desfoque, tipografia de ficção científica retro-digital de alto impacto e feedbacks de micro-animações, transformaremos o jogo em uma experiência visualmente arrebatadora e integrada.

## 💡 Sugestões de Melhorias Visuais

1.  **Glassmorphism Retro-Neon nos Overlays**: Substituir as telas de sobreposição (`.overlay`) pretas e opacas de fundo sólido por painéis ultra-modernos com efeito de vidro fosco. Utilizaremos `backdrop-filter: blur(12px)` combinado com fundos escuros semi-transparentes (`rgba(17, 10, 10, 0.8)`) e bordas extremamente finas iluminadas por um gradiente sutil (`linear-gradient(135deg, rgba(255, 69, 0, 0.4), rgba(0, 0, 0, 0.9))`). Isso criará um efeito de profundidade incrível, revelando o ambiente de jogo 3D de forma desfocada ao fundo.
2.  **Tipografia Premium e Glow Neon Pulsante**: Importar e utilizar a fonte **'Press Start 2P'** do Google Fonts para títulos principais (dando o apelo de arcade clássico de 8-bits) e a fonte **'Orbitron'** para subtítulos e indicadores numéricos (trazendo um ar moderno de painel tático). Para destacar botões e títulos, aplicaremos sombras dinâmicas de texto (`text-shadow`) e de caixa (`box-shadow`) com efeito neon vermelho (`#FF4500` e `#8B0000`) combinados com `@keyframes pulse` para criar uma luz pulsante viva na interface.
3.  **HUD Flutuante de Capacete Tático (Diegético/Imersivo)**: Desenhar o HUD (exibição de Vida, Armas e Pontuação) por cima do canvas usando elementos HTML absolutos estilizados com CSS Grid/Flexbox, simulando a tela de um visor tático de combate. Incluir barras de progresso circulares ou inclinadas para a vida e munição, e um efeito de flash vermelho (`vignette` periférica) que pulsa suavemente na tela inteira quando o jogador estiver com menos de 30% de vida ou receber dano imediato, reforçando o feedback sensorial.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`'Press Start 2P'`, `'Orbitron'`, `'Inter'`) no cabeçalho do HTML.
- [ ] Aplicar **Glassmorphism** nas classes `.overlay` através de `backdrop-filter: blur(12px)` e bordas semi-transparentes de cor laranja/vermelha.
- [ ] Criar animações de pulsação e brilho neon nos botões de menu com `@keyframes` e efeitos de hover suaves (`transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`).
- [ ] Implementar HUD HTML sobreposto ao canvas, estruturando barras dinâmicas em gradientes HSL vibrantes (ex: verde-vida `hsl(140, 80%, 50%)` a vermelho-crítico `hsl(0, 80%, 50%)`).
- [ ] Criar efeito de vinheta de dano (`.damage-vignette`) na tela, animado via opacidade dinâmica em JS acoplada ao status `damageOverlayAlpha` do jogo.
- [ ] Garantir responsividade e centralização elegante do contêiner `#gameContainer` em telas menores usando CSS moderno (Flexbox/Grid).
