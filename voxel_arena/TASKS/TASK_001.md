# 🎨 Tarefa 001 - Melhoria Visual: Voxel Arena (RPG de Ação 3D de Sobrevivência)

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O Voxel Arena é, sem dúvidas, uma das produções técnicas mais impressionantes e completas do hub sandbox. Construído inteiramente com Three.js em estrutura de Módulos ES, o jogo traz uma arena 3D com geração de relevo e árvores procedurais, motor físico de movimentação e colisão de câmera e do jogador em terceira pessoa (WASD + Mouse PointerLock), inteligência de IA para perseguição e colisão de oponentes gerados em ondas progressivas (Waves), habilidades especiais complexas (Giro de Espada, Dash, Cura e uma habilidade Ultimate destruidora de tela), drops de itens flutuantes de vida/xp e um painel de HUD espetacular contendo barras chanfradas inclinadas (`skewX`), slots de habilidade com cooldowns em formato de gradiente cônico circular (`conic-gradient`) e tela de seleção de upgrades de bônus pós-derrota.

Mesmo com toda essa riqueza mecânica, o jogo sofre com o visual cru característico de estágios iniciais de desenvolvimento. Os inimigos são apenas paralelepípedos vermelhos estáticos, o chão da arena é um plano verde liso com grade cinza-escura padrão, as habilidades especiais usam formas geométricas Three.js com cores básicas sólidas (anel amarelo para o spin, esfera em wireframe magenta para a ultimate) e a tela inicial é uma caixa preta chapada. Há uma oportunidade brilhante de transfigurar o Voxel Arena em um **Dungeon Crawler Épico Sombrio** de altíssimo padrão, refinando a atmosfera 3D (luzes, névoa, bloom, materiais emissivos) e reestilizando toda a interface HUD externa sob as diretrizes de Glassmorphic-RPG de Luxo.

## 💡 Sugestões de Melhorias Visuais

1.  **Atmosfera de Arena Sombria & Efeitos de Névoa 3D (WebGL)**:
    Elevar a imersão na cena 3D do Three.js adicionando névoa volumétrica dramática (`scene.fog = new THREE.FogExp2(0x0a0c10, 0.02)`) com um fundo escuro e misterioso de nébula ou céu crepuscular. Reconfigurar a iluminação da arena: substituir a luz direcional plana por uma luz de lua fria ciano de alta intensidade (`THREE.DirectionalLight` direcionando sombras suaves) e pontos de luz pontual dinâmica (`THREE.PointLight`) instalados temporariamente na cena toda vez que habilidades especiais forem ativadas (por exemplo, um clarão rosa emissivo iluminando as árvores e o chão durante a ativação da Ultimate, ou partículas cintilantes de faíscas 3D douradas que desprendem da espada ao atacar).
2.  **Modelos de Voxel Aprimorados & Efeitos Visuais Épicos (VFX)**:
    Estilizar o chão com uma textura ou gradiente de pedra vulcânica rústica ou terra arenosa escura em vez do verde liso. Redesenhar os inimigos para que não sejam simples caixas vermelhas: montá-los com blocos de voxel simulando criaturas das sombras de olhos brilhantes e garras afiadas. O efeito visual do ataque Spin do jogador não deve ser apenas um anel plano amarelo; deve incorporar uma espiral texturizada semi-transparente que simula o vento cortante da lâmina da espada, e a Ultimate deve gerar uma cúpula de partículas de fogo elétrico translúcidas em expansão rápida.
3.  **HUD de Fantasia Glassmorphic & Runas de Habilidades**:
    Refinar a interface de HUD de modo que as barras chanfradas (`.bar-container`) possuam contornos de luz dourada brilhante pulsante e pequenos efeitos de glow neon de acordo com o preenchimento HSL correspondente. Os slots de habilidades (`.skill-slot`) devem adotar a estética **Glassmorphism** de ficção científica/fantasia medieval (`background: rgba(10, 14, 22, 0.7); backdrop-filter: blur(10px); border: 2px solid rgba(211, 175, 55, 0.35)`) com símbolos e ícones de runas mágicas desenhadas em SVG no centro de cada slot. Ao sair do cooldown, o slot de habilidade deve emitir um flash rápido de luz para dar excelente feedback tátil e visual de reatividade ao jogador.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar fontes premium do Google Fonts (`Cinzel`, `Cinzel Decorative` e `Outfit`).
- [ ] Mudar a cena 3D Three.js e fundo do body para tons escuros de dungeon e arena ciber-fantasia (`#0a0c10`).
- [ ] Implementar névoa volumétrica densa (`scene.fog`) e pontos de iluminação dinâmicos ciano/magenta no motor WebGL.
- [ ] Adicionar luzes pontuais temporárias na cena nas posições de ativação de habilidades especiais (Spin, Dash e Ultimate).
- [ ] Redesenhar as geometrias dos inimigos no script JS para modelos low-poly/voxel mais ameaçadores.
- [ ] Estilizar os efeitos geométricos de habilidade (anel de spin, esfera ultimate) com texturas de fade, wireframes densos e emissores de partículas 3D.
- [ ] Redesenhar a interface do HUD principal, barras chanfradas e contêineres de habilidade com Glassmorphism acrílico translúcido e ornamentação dourada.
- [ ] Inserir ícones geométricos/runas de vetor (SVG) no interior dos slots de skill e implementar efeitos CSS de animação ao resetar o tempo de recarga.
- [ ] Estilizar a tela inicial (`#start-screen`), GameOver (`#game-over-screen`) e bônus com consoles flutuantes translúcidos de acabamento impecável.
