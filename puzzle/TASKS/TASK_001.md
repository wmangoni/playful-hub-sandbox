# 🎨 Tarefa 001 - Melhoria Visual: Puzzle

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O jogo **Mind Labyrinth: A Puzzle Adventure** é uma fantástica compilação de enigmas que testam diferentes faculdades da mente humana (lógica pura, memória de curto prazo, raciocínio de perspectiva tridimensional com rotação de cubo e identificação de sequências simbólicas), tudo isso amarrado por um fio condutor narrativo imersivo que coloca o jogador em uma antiga biblioteca esquecida.

No entanto, a interface atual (embora utilize boas variáveis de cores roxas no root) é plana e estática demais para sustentar o mistério e a imponência arquetípica de um "Labirinto da Mente". As caixas pretas de feedback com bordas retas, as células de memória cinzentas sem feedback de profundidade e a ausência de tipografias literárias ou efeitos de iluminação misteriosa fazem a experiência parecer mais um teste de QI escolar do que uma jornada mágica. O nosso objetivo é transmutar essa interface simples em um verdadeiro **"Painel Alquímico de Runas"**, onde cada resposta correta acenda luzes mágicas e cada enigma pareça esculpido em relíquias de pedra e cristal.

## 💡 Sugestões de Melhorias Visuais

1.  **Glassmorphism Místico e Bordas de Runas Douradas**: Elevar o contêiner do jogo (`.game-container`) e cartões secundários usando um efeito de vidro mágico translúcido. Aplicaremos `backdrop-filter: blur(14px)`, fundo em violeta escuro semi-transparente (`rgba(22, 18, 38, 0.75)`) e bordas douradas finíssimas geradas por gradiente linear (`border: 1.5px solid rgba(212, 175, 55, 0.3)`). Isso dará ao jogo a aparência de uma tábua de rituais ou artefato tecnológico antigo redescoberto.
2.  **Tipografia Majestosa Arcana (Cinzel & Lora)**: Carregar via Google Fonts as fontes **'Cinzel Decorative'** para títulos principais e indicadores de nível/pontuação (trazendo o apelo epigráfico e clássico de runas antigas esculpidas em pedra) e a fonte **'Lora'** (uma fonte serifada de alta elegância literária) para o bloco narrativo principal (`#narrative`). Isso criará um contraste literário requintado e aumentará a sensação de mistério ao ler os fragmentos das crônicas.
3.  **Bioluminescência nos Enigmas e Relíquia 3D Translúcida**: Os símbolos do Labyrinth (círculos, triângulos, estrelas, runas) devem emitir um brilho fluorescente real. Aplicaremos sombras de texto (`text-shadow: 0 0 8px var(--accent-color)`) e caixas pulsantes. O cubo 3D do enigma de perspectiva receberá faces semi-transparentes de cristal com reflexos especulares e bordas internas douradas cintilantes que reagem a cada rotação, transformando a peça em um prisma enigmático de altíssima qualidade.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes majestosas do Google Fonts (`'Cinzel Decorative'`, `'Lora'`, `'Inter'`) no cabeçalho do HTML.
- [ ] Aplicar fundo no `body` com gradiente radial enigmático (`radial-gradient(circle at center, #1b162b 0%, #0c0814 100%)`) e textura sutil de poeira ou névoa em CSS.
- [ ] Implementar o design **Glassmorphic** no `.game-container` e no card de narrativa, adicionando a borda dourada alquímica (`rgba(212, 175, 55, 0.45)`) e sombra externa profunda.
- [ ] Adicionar transições e efeitos de hover volumétricos nos botões principais (`.btn`), incluindo uma expansão suave e brilho neon dourado tátil.
- [ ] Estilizar a `.memory-cell`, `.pattern-cell` e `.sequence-item` com fundos gradientes escuros, contornos finos e cantos ligeiramente arredondados (`border-radius: 8px`).
- [ ] Inserir uma animação de pulsação luminosa `@keyframes runeGlow` nos símbolos ativos e indicadores de acerto/erro das respostas dos enigmas.
- [ ] Adicionar efeito de profundidade real no cubo 3D (`perspective: 1200px` e faces translúcidas com `backdrop-filter: blur(4px)`).
