# 🎨 Tarefa 001 - Melhoria Visual: Visual Effects

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O projeto **Visual Effects (String Catcher)** é uma fascinante e original fusão de simulação física interativa de cordas vibratórias com um dinâmico jogo rítmico-musical bidimensional (onde o jogador deve capturar notas coloridas e desviar de obstáculos perigosos que viajam pelas cordas ao som de loops de áudio estéreo, combos, níveis de dificuldade e efeitos sonoros táteis). A física das cordas implementada via curvas quadráticas no canvas 2D é fluida, hipnótica e de altíssima qualidade.

Contudo, a interface do jogo (a tela inicial de menu `startScreen` injetada dinamicamente via JS e a caixa flutuante de configurações de parâmetros `.controls`) não faz jus à exuberância do gameplay. O menu inicial parece uma tela de erro ou aviso preto básico sem graça, e os controles usam botões planos verdes e sliders cinzas genéricos que lembram uma ferramenta interna de desenvolvimento. O nosso objetivo é repaginar o String Catcher com uma estética de **"Cyber-Synthesizer VST Plugin"** (inspirado nos sintetizadores virtuais premium da Arturia e Teenage Engineering), transformando o menu inicial em uma "Capa de Álbum Futurista" e a HUD de controle de cordas em uma mesa de mixagem de som holográfica pulsante de alta fidelidade.

## 💡 Sugestões de Melhorias Visuais

1.  **Mesa de Mixagem Glassmorphic e Sliders Customizados**: Redesenhar a caixa `.controls` com a estética de um sintetizador cibernético premium: fundo preto translúcido (`rgba(10, 8, 18, 0.75)`), desfoque profundo (`backdrop-filter: blur(16px)`) e contornos em degradê neon. Os sliders de parâmetros (`input[type="range"]`) serão totalmente personalizados no CSS com trilhos cian e botões deslizantes (*thumbs*) esféricos de neon rosa brilhantes que emitem luz no hover.
2.  **Tipografia Synthwave Rítmica (Orbitron & Space Grotesk)**: Importar fontes do Google Fonts perfeitamente sintonizadas com o design sonoro e tecnologia de áudio. Utilizaremos **'Orbitron'** para os displays numéricos, combos e contadores estatísticos (como pontuação e nível), e **'Space Grotesk'** ou **'Syne'** para títulos principais, botões de presets e instruções do jogo, trazendo uma presença estética artística e arrojada.
3.  **Tela de Início Estilo Capa de Álbum e Ondas de Choque**: Redesenhar completamente o contêiner `startScreen` substituindo o fundo preto puro por uma atmosfera "Aurora/Nebula Space" sutil usando gradientes animados em CSS (`linear-gradient(135deg, #10061e 0%, #1e0b3c 100%)`). O botão de início ("Começar Viagem") ganhará um contorno de LED neon pulsante e emitirá ondas circulares concêntricas translúcidas de choque CSS via transições e sombras pulsantes `@keyframes soundWave`.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes rítmicas e arrojadas do Google Fonts (`'Orbitron'`, `'Space Grotesk'`, `'Syne'`) no cabeçalho do HTML.
- [ ] Criar estilização completa para os componentes de input deslizantes (`input[type="range"]`), incluindo pseudo-elementos `::-webkit-slider-thumb` com sombras de brilho neon rosa e cian (`box-shadow: 0 0 10px #ff007f`).
- [ ] Refatorar a classe `.controls` aplicando Glassmorphism de ponta com bordas ultra finas e sombras de preenchimento.
- [ ] Estilizar os botões de presets ("Calm", "Energetic", "Wild") com visual translúcido escuro e efeitos de hover reativos que piscam em cores neon personalizadas para cada preset.
- [ ] Repaginar os elementos visuais de pontuação, nível e vidas gerados por JS dentro do loop de jogo com tipografia e cores brilhantes integradas.
- [ ] Refatorar a folha de estilo para a tela de instruções (`startScreen`) adicionando efeitos de desfoque, gradientes animados e sombras volumétricas que deixam a interface com o visual premium de um console físico de estúdio musical.
- [ ] Adicionar transições e micro-animações de escala de clique nos botões principais (`transform: scale(0.96)` usando transição rápida de 0.1s).
