# 🎨 Tarefa 001 - Melhoria Visual: Three.js Earth

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O projeto **Three.js Earth** é um simulador tridimensional astronômico visualmente deslumbrante e de alto rigor matemático. O modelo renderiza o planeta Terra em escala realista usando geometria de Icosaedro de alto detalhe, com múltiplas camadas de materiais texturizados (mapa geográfico, relevo por *bumpMap*, brilho de oceanos por *specularMap*), rotação orbital com inclinação real do eixo terrestre em -23.4 graus, luzes noturnas de cidades em Additive Blending, nuvens atmosféricas com rotação assíncrona independente, efeito Fresnel de difração atmosférica de silhueta (*glowMesh*) e um campo estelar processual (*starfield*) de fundo, tudo navegável via mouse com *OrbitControls*.

No entanto, o projeto sofre de uma ausência total de **User Interface (UI)**. O usuário é jogado em um canvas preto estático em tela cheia sem nenhuma informação astronômica, sem controles sobre os parâmetros físicos (como velocidade de rotação, ângulo de incidência do sol ou controle das camadas da atmosfera) e sem feedbacks reativos. O nosso objetivo de transformação é criar um maravilhoso **"Space Observation Control Console"** (estilo NASA / SpaceX), adicionando uma HUD holográfica flutuante que eleva o projeto de uma mera demonstração técnica para um simulador astronômico imersivo premium.

## 💡 Sugestões de Melhorias Visuais

1.  **HUD de Controle de Voo Glassmorphic**: Adicionar painéis de controle flutuantes no canto esquerdo e direito da tela modelados no estilo HUD de cabine espacial futurista. Os cartões usarão **Glassmorphism escuro translúcido** (`background: rgba(8, 12, 24, 0.65)`), desfoque intenso de fundo (`backdrop-filter: blur(16px)`), cantos chanfrados de ficção científica, e bordas finas azul-holográfico reativas. Isso permitirá gerenciar a cena interativamente sem cobrir a beleza do planeta Terra.
2.  **Tipografia Astronômica Técnica (Orbitron & Roboto Mono)**: Importar fontes do Google Fonts altamente instrumentais. Aplicaremos **'Orbitron'** para títulos táticos da central ("TERRESTRIAL TELEMETRY SYSTEM"), e a fonte monoespaçada **'Roboto Mono'** para a exibição de dados científicos de telemetria simulados em tempo real (como velocidade angular em rad/s, zoom da lente, ângulo de rotação solar, e coordenadas aproximadas da câmera de observação).
3.  **Controles Avançados de Parâmetros e Filtros Dinâmicos**: Implementar controles táticos (sliders e switches deslizantes com brilho neon) na interface para permitir que o usuário gerencie a simulação:
    *   **Tempo & Rotação**: Alterar a velocidade de rotação (`rotation.y`) ou pausar a simulação para observação detalhada.
    *   **Luz Solar (Posição do Sol)**: Um slider circular para girar a posição do `sunLight` em 360º, permitindo simular o ciclo dia/noite manual e ver as luzes das cidades se acenderem em tempo real no hemisfério escuro.
    *   **Toggle de Camadas**: Ligar/Desligar individualmente as nuvens, as luzes das cidades, o brilho de atmosfera azul Fresnel e o campo de estrelas ao fundo.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes espaciais premium do Google Fonts (`'Orbitron'`, `'Roboto Mono'`, `'Inter'`) no HTML.
- [ ] Construir a marcação HTML e estilos CSS para as janelas do console flutuante de telemetria lateral com responsividade e flexbox.
- [ ] Aplicar estilos **Glassmorphic** complexos nos painéis com bordas azuis semitransparentes e sombras de brilho azulado externo (`box-shadow: 0 0 20px rgba(0, 162, 255, 0.1)`).
- [ ] Adicionar efeitos estéticos de ficção científica nos painéis, como linhas de varredura (*scanlines*) sutis em CSS e pequenas molduras de canto (*reticles*).
- [ ] Implementar interruptores deslizantes customizados em CSS baseados em cores neon ativos (Azul Cyan para ligado, Cinza-escuro para desligado).
- [ ] Integrar os controles deslizantes (sliders) da UI ao script `index.js`, fazendo com que alterações nos controles alterem de forma instantânea variáveis no loop de animação do Three.js (ex: `sunLight.position.x`, `earthMesh.rotation.y` e `cloudsMesh.visible`).
- [ ] Criar botões de atalhos de "Órbitas Pré-definidas" (ex: "Órbita ISS", "Visão Global", "Geostacionária") que animam suavemente a posição da câmera usando interpolação linear (LERP) no Three.js.
