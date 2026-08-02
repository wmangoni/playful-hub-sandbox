# 🎨 Tarefa 001 - Melhoria Visual: Rubik's Cube (Cubo Mágico HTML 3D)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O Rubik's Cube possui uma das engines de simulação 3D mais bem executadas do hub de jogos, utilizando Three.js, controle de câmera suave com OrbitControls contendo amortecimento, detecção avançada de cliques/arrastes por Raycasting para girar camadas em todas as direções do espaço, além de um motor de animação e interpolação fluidos com a biblioteca Tween.js e suporte a atalhos rápidos de teclado. No entanto, o visual geral do simulador é extremamente monótono: o fundo da cena WebGL e da página é cinza claro neutro, e o material dos cubinhos é plástico opaco sólido básico sem nenhum apelo visual premium ou reflexo realista de iluminação.

Como se trata de uma aplicação 3D rica em recursos, temos a oportunidade perfeita de elevar este projeto ao patamar de um **Simulador Holográfico Sci-Fi**. Ao aprimorarmos a iluminação 3D, as propriedades de material (adicionando rugosidade especular e metalicidade realistas), as cores vibrantes das faces e os painéis DOM externos, podemos proporcionar a sensação de interagir com um cubo colecionador de metal futurista flutuando em um laboratório cibernético minimalista.

## 💡 Sugestões de Melhorias Visuais

1.  **Laboratório de Luz 3D e Fundo Cósmico/Cibernético**:
    Mudar o plano de fundo da página e da cena Three.js (`scene.background = new THREE.Color(0x050608)`) para um preto profundo futurista. Configurar iluminação de estúdio de alta definição: além da luz ambiente fraca, adicionar múltiplos spots direcionais (`THREE.DirectionalLight` e `THREE.PointLight`) com cores contrastantes como ciano elétrico de um lado e rosa neon do outro. Isso criará realces metálicos especulares, reflexos coloridos exuberantes nas bordas das peças e sensação dramática de profundidade 3D.
2.  **Cubinhos com Materiais Cromados/Metalizados & HSL Emissivo**:
    Aprimorar as propriedades dos materiais dos cubinhos (`MeshStandardMaterial`). Mudar a cor interna de `#1a1a1a` para um material preto fosco escovado de luxo (`metalness: 0.9`, `roughness: 0.25`). As faces coloridas devem adotar cores com tons HSL supersaturados vibrantes (como laranja neon, azul-violeta ciber, amarelo laser) contendo propriedades emissivas discretas (`emissive` e `emissiveIntensity: 0.15`), fazendo com que o cubo pareça emitir sua própria energia.
3.  **Painel de Controle e HUD Holográfico Glassmorphic**:
    Redesenhar o container DOM (`#container`) com cantos arredondados finos e uma borda de luz brilhante neon ciano. O painel de instruções flutuante (`#instructions`) deve ser reformulado no conceito **Glassmorphism**, com fundo acrílico fosco translúcido (`background: rgba(10, 12, 18, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08)`) e tipografia digital moderna usando a fonte **Orbitron** ou **Outfit** do Google Fonts. Os botões de ação ("Scramble", "Reset") devem ter gradientes de cor vibrantes (azul/ciano para embaralhar, vermelho/magenta para resetar) e efeitos de escala e iluminação hover ultra-reativos.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Orbitron` e `Outfit`).
- [ ] Mudar o fundo do corpo e da cena 3D Three.js para um tom escuro ciber (`#050608`).
- [ ] Configurar iluminação tridimensional de estúdio com refletores direcionais coloridos (ciano e magenta).
- [ ] Atualizar os materiais de malha do Three.js (`MeshStandardMaterial`) nos cubinhos adicionando alta metalicidade (`metalness: 0.9`) e rugosidade calculada para reflexão especular realista.
- [ ] Adicionar um leve brilho emissivo (`emissive` e `emissiveIntensity`) nas geometrias das faces de cores do cubo.
- [ ] Estilizar a caixa de instruções flutuante com Glassmorphism acrílico, desfoque de fundo e borda sutil.
- [ ] Redesenhar os botões de controle externos com gradientes de neon cromático e animações de escala suave no hover.
- [ ] Configurar um contorno LED de neon pulsante ao redor do container principal de visualização 3D.
