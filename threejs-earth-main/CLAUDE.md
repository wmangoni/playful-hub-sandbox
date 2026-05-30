# 📂 Arquitetura e Padrões - Robot Bobby Earth (Visualizador 3D da Terra)

Uma simulação astronômica tridimensional de alto realismo do planeta Terra, implementada sob a biblioteca Three.js (WebGL). Apresenta rotação realista de camadas atmosféricas, mapeamento de relevo montanhoso, reflexão solar nos oceanos, luzes de cidades noturnas e um efeito físico de dispersão atmosférica (Glow Fresnel) sobre um campo de estrelas gerado proceduralmente.

## 🏗️ Arquitetura do Código

O projeto adota uma arquitetura modularizada moderna baseada em módulos ES6 nativos e mapeamentos de importação (`importmap`), separando a rotina de inicialização, a geração do campo de partículas e os shaders de efeitos atmosféricos.

- **Estrutura de Arquivos**:
  - `index.html`: Define os metadados da página, a tag de importações do CDN (`importmap` mapeando a biblioteca Three.js r161) e injeta o script mestre.
  - `index.js`: Arquivo centralizador da simulação. Constrói o visualizador 3D, carrega as texturas, define a iluminação solar e implementa o loop de animação e redimensionamento de tela.
  - `textures/`: Armazena as imagens de mapeamento (textura difusa da superfície, mapa de relevo/bump, especularidade aquática, luzes noturnas e transparência das nuvens).
  - `src/getStarfield.js`: Módulo responsável por projetar o campo estelar de partículas ao fundo.
  - `src/getFresnelMat.js`: Módulo contendo os shaders personalizados GLSL para cálculo do efeito óptico Fresnel na borda da Terra.

- **Fluxo de Inicialização e Execução**:
  1. O navegador carrega o mapeamento de CDNs e executa o módulo principal `index.js`.
  2. Cria-se o WebGLRenderer com antialiasing, mapeamento de tons fílmico (`ACESFilmicToneMapping`) e espaço de cores linear.
  3. Instancia-se o grupo `earthGroup` aplicando a inclinação do eixo orbital real da Terra (`-23.4` graus convertidos em radianos):
     - `earthGroup.rotation.z = -23.4 * Math.PI / 180;`
  4. Quatro esferas concêntricas de tamanho incremental são sobrepostas e adicionadas ao grupo para representar a Superfície Terrestre, as Luzes Urbanas Noturnas, o Domo de Nuvens e a Atmosfera Fresnel.
  5. Adiciona-se uma luz direcional de alta intensidade lateralmente representando o Sol, e o campo estelar ao redor.
  6. Ativa-se os controles orbitais (`OrbitControls`) e inicia-se o loop contínuo de renderização `animate()`.

## 🧩 Padrões de Projeto Aplicados

- **Game Loop (Render Loop 3D)**: A simulação utiliza o método nativo `requestAnimationFrame(animate)` para atualizar o frame de maneira síncrona com a varredura da tela. A cada iteração do loop, as camadas sofrem rotações infinitesimais independentes no eixo Y antes da renderização de pixels do WebGL:
  - Rotação da Terra e Luzes Noturnas: `+0.002` rad/frame.
  - Rotação das Nuvens (Ventos independentes): `+0.0023` rad/frame.
  - Rotação do Campo de Estrelas de Fundo: `-0.0002` rad/frame.
- **Decorator / Layering Pattern (Padronagem de Camadas)**: Para atingir um realismo fotorrealista sem sobrecarregar a memória de GPU, o planeta é construído pela sobreposição de múltiplos materiais e geometrias simples (`IcosahedronGeometry(1, 12)`):
  1. **Superfície Terrestre**: `MeshPhongMaterial` combinando canal difuso (`map`), especularidade dos oceanos (`specularMap`) e rugosidade de relevo (`bumpMap` com escala `0.04`).
  2. **Luzes Noturnas**: `MeshBasicMaterial` com mesclagem aditiva (`AdditiveBlending`) para acender as cidades na sombra gerada pela luz direcional.
  3. **Nuvens**: `MeshStandardMaterial` ligeiramente maior (`scale: 1.003`) com transparência nativa e mapa alfa (`alphaMap`).
  4. **Atmosfera Fresnel**: Esfera superior (`scale: 1.01`) de visualização luminosa.
- **Custom Shaders (Shader de Efeito Fresnel)**: O halo azul brilhante ao redor da borda da Terra é calculado fisicamente usando equações vetoriais em tempo de execução na GPU. O arquivo `getFresnelMat.js` implementa um `ShaderMaterial` com código em GLSL (OpenGL Shading Language). O Vertex Shader calcula a relação entre o vetor de visão do observador (`cameraPosition`) e a normal de face (`worldNormal`), gerando um coeficiente Fresnel interpolado linearmente no Fragment Shader para renderizar o degradê suave da atmosfera.
- **Geração Procedural (Monte Carlo em Esferas)**: O gerador de estrelas `getStarfield.js` posiciona 2000 pontos de forma procedural usando coordenadas polares esféricas aleatórias baseadas em trigonometria vetorial, otimizando a memória por meio da classe `BufferGeometry` e do sistema de renderização de partículas `THREE.Points`.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Three.js (r161)**: Biblioteca de computação gráfica 3D que encapsula e acelera comandos da API WebGL do navegador.
- **OrbitControls API**: Módulo utilitário do Three.js para capturar e suavizar interações físicas de arrastar do mouse e gestos de pinça (zoom) na tela.
- **GLSL Shading Language**: Escrita direta de códigos de execução em GPU para vértice e fragmento no cálculo vetorial de refração luminosa.

## 🔑 Funções e Estruturas Principais

- `earthGroup`: Grupo contendo as malhas da Terra que compartilha a rotação inclinada orbital do planeta.
- `OrbitControls(camera, renderer.domElement)`: Instancia o controlador orbital nativo para permitir navegação interativa em órbita de câmera livre.
- `getStarfield({ numStars })`: Cria e retorna um objeto `THREE.Points` contendo a malha de partículas do espaço sideral.
- `getFresnelMat()`: Instancia e compila o material do shader de atmosfera sob as variáveis de intensidade (`fresnelBias: 0.1`, `fresnelScale: 1.0`, `fresnelPower: 4.0`).
- `handleWindowResize()`: Mantém a proporção de aspecto (`camera.aspect`) e a resolução do buffer de desenho sincronizados com redimensionamentos da janela do browser.
