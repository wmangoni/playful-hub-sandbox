# 🎨 Tarefa 001 - Melhoria Visual: Lazy Gardner

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O jogo **Lazy Gardener: Jardim Zen** é uma belíssima simulação tridimensional desenvolvida com **Three.js**, contando com mecânicas relaxantes e orgânicas como ciclo completo de dia/noite (com iluminação direcional dinâmica, sombras suaves filtradas em PCF e nascimento de vagalumes), climas interativos (sol e chuva gotejante), áudio ambiente imersivo sincronizado e crescimento procedural de múltiplas espécies botânicas. No entanto, a interface bidimensional de UI atual (painéis de plantio e notificações) quebra completamente a imersão "Zen". Os botões HTML nativos e o contêiner cinza opaco no topo parecem um protótipo administrativo, que não conversa com a delicadeza e beleza da simulação 3D.

O nosso objetivo estético é criar uma interface **"Zen Minimalista"** inspirada no design moderno escandinavo e em sistemas operacionais orgânicos (como iOS e interfaces relaxantes de meditação). Ao substituir a UI dura atual por uma barra flutuante de vidro fosco (estilo "dock"), ícones minimalistas, tipografia arredondada acolhedora e transições suaves, criaremos um casulo de relaxamento digital perfeito.

## 💡 Sugestões de Melhorias Visuais

1.  **Dock de Plantio Glassmorphic Flutuante**: Substituir o painel `#ui` atual no canto da tela por um "Dock" horizontal flutuante e centralizado na parte inferior do display (similar à barra de aplicativos do macOS/iOS). O contêiner do dock utilizará **Glassmorphism** premium e orgânico: bordas amplamente arredondadas (`border-radius: 24px`), desfoque de fundo profundo (`backdrop-filter: blur(12px)`) e cor de preenchimento branca ultra-translúcida (`rgba(255, 255, 255, 0.45)`). Isso fará com que o jardim 3D continue fluindo sob a interface sem interrupções bruscas.
2.  **Tipografia Aconchegante e Paleta Eco-Zen**: Importar e utilizar as fontes **'Quicksand'** ou **'Outfit'** do Google Fonts, conhecidas por suas formas arredondadas, amigáveis e extremamente relaxantes. Adotaremos uma paleta de cores terrosas e folhagens suaves para os textos e ícones (como cinza-terroso escuro `#2f2a25` e verde sálvia `#4a5d4e`), abandonando o contraste duro do preto nativo do navegador.
3.  **Widgets Atmosféricos Animados e Micro-Feedbacks de Crescimento**: Substituir as linhas de texto "Clima:" e "Hora:" por pequenos cartões ilustrados minimalistas com micro-animações CSS (um sol estilizado girando lentamente a 0.5 rpm, nuvens com gotejamento pulsante no clima chuvoso e uma meia-lua com estrelas brilhantes no período noturno). Ao plantar uma semente, o botão correspondente no dock exibirá um indicador circular concêntrico translúcido de progresso, indicando de forma elegante o tempo que falta para a planta desabrochar.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar as fontes premium arredondadas do Google Fonts (`'Quicksand'`, `'Outfit'`) no cabeçalho do HTML.
- [ ] Refatorar a folha de estilo `#ui` para criar o Dock horizontal centralizado na parte inferior da tela, aplicando `backdrop-filter: blur(12px)`, bordas arredondadas e sombras externas suaves.
- [ ] Estilizar os botões de sementes para usarem ícones vetoriais modernos (ou emojis elegantes) e cores pastéis com micro-animações de hover (`transform: scale(1.08) translateY(-4px)` usando curvas `cubic-bezier(0.175, 0.885, 0.32, 1.275)`).
- [ ] Substituir a caixa de `#notifications` no canto inferior por um sistema de cartões toast flutuantes animados que deslizam de cima para baixo com opacidade dinâmica e se dissolvem de forma poética.
- [ ] Criar classes de animação CSS `@keyframes floatIcon` e `@keyframes sunRotate` para dar movimento cíclico e sutil aos ícones de status climático e temporal.
- [ ] Implementar barras de progresso circulares de carregamento em CSS (`conic-gradient`) nas bordas dos botões que mostram o andamento dos tempos de crescimento ativos em sincronia com o JS.
