# 🛠️ RFC-042: Especificação Técnica de Frontend — Redesign da Landing Page
**Projeto:** Playful Hub (`playful-hub-sandbox`)  
**Autor:** Tech Lead / Senior Frontend Engineer  
**Público-alvo:** Time de Engenharia de Software / Desenvolvedores Frontend  
**Status:** **Pronto para Implementação (Ready for Development)**  
**Arquivos de Impacto:** `index.html`, `assets/images/*`, `games_control.json`  

---

## 1. Visão Geral & Objetivos de Engenharia

Esta especificação define os requisitos arquiteturais, padrões de código, modelo de dados e implementação prática para a substituição completa do layout legado do `index.html`.

### 1.1 Metas Técnicas (SLAs e NFRs)
1. **Zero Framework Bloat:** Manter a aplicação leve em **Vanilla HTML5, CSS3 Moderno e ES6+ puro**, sem introduzir bundlers complexos (Webpack/Vite) ou frameworks pesados (React/Vue) para a landing page.
2. **Performance (Core Web Vitals):**
   * **LCP (Largest Contentful Paint):** < 1.2s.
   * **CLS (Cumulative Layout Shift):** 0.00 (aspect-ratio fixo em todas as mídias).
   * **INP / FID:** < 50ms (filtragem instantânea de 22 itens em memória via DOM virtual/fragment).
3. **Redução de Payload:**
   * Eliminar o CDN do FontAwesome 6 (~75 KB CSS + centenas de KB em WOFF2), substituindo por SVGs vetoriais inline (< 2 KB no total).
   * Desativar a thread pesada de animação de holofotes via JS (`setInterval` com `mix-blend-mode`), substituindo por CSS acelerado por GPU (`transform: translate3d` e gradientes estáticos com mouse-follow leve em `requestAnimationFrame`).
4. **Acessibilidade (WCAG 2.1 Nível AA):**
   * Contraste mínimo de 4.5:1 para texto normal e 3:1 para texto grande/componentes.
   * Navegação 100% operável via teclado com anéis de foco visíveis (`:focus-visible`).
   * Tags semânticas adequadas (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).

---

## 2. Modelagem de Dados dos Jogos (Data Schema)

Para desacoplar a lógica de apresentação dos dados e permitir busca e filtros dinâmicos rápidos, os metadados dos jogos são estruturados como uma coleção em memória (podendo no futuro ser alimentada diretamente pelo `games_control.json` ou por uma API REST).

### 2.1 Definição TypeScript / JSDoc do Objeto `Game`

```typescript
type GameCategory = '3d' | 'arcade' | 'strategy' | 'simulation' | 'puzzle';

interface Game {
  id: string;              // Identificador único (ex: '3d_shooter')
  title: string;           // Título formatado do jogo
  description: string;     // Descrição refinada e objetiva (PT-BR)
  category: GameCategory;  // Categoria para filtragem
  categoryLabel: string;   // Rótulo amigável (ex: '3D & Gráficos')
  path: string;            // Rota relativa (ex: './jogos/3d_shooter')
  previewImg: string;      // Caminho relativo da imagem de screenshot
  badge?: string;          // Tag especial opcional: 'Destaque', 'Novo', 'WebGL', 'IA'
  featured?: boolean;      // Se true, ocupa destaque no Bento Grid (2x2 ou 2x1)
  techTag: string;         // Tag da tecnologia principal: 'Three.js', 'Canvas 2D', 'Algoritmo'
}
```

### 2.2 Catálogo Consolidado de Dados (`GAMES_DATA`)

```javascript
const GAMES_DATA = [
  {
    id: 'blood_and_silver',
    title: 'Sangue & Prata',
    description: 'Roguelite gótico de sobrevivência contra hordas de mortos-vivos.',
    category: 'arcade',
    categoryLabel: 'Ação & Arcade',
    path: './jogos/blood_and_silver',
    previewImg: './assets/images/Gemini_Generated_Image_9adfvm9adfvm9adf.jpeg',
    badge: 'Destaque',
    featured: true,
    techTag: 'Canvas 2D'
  },
  {
    id: '3d_shooter',
    title: '3D Shooter',
    description: 'FPS retro inspirado nos clássicos dos anos 90 com labirinto e combate.',
    category: '3d',
    categoryLabel: '3D & Gráficos',
    path: './jogos/3d_shooter',
    previewImg: './assets/images/3d_shooter_preview.png',
    badge: 'Popular',
    featured: true,
    techTag: 'Three.js'
  },
  {
    id: 'voxel_city',
    title: 'Voxel City Delivery',
    description: 'Explore uma metrópole voxel 3D coletando e entregando encomendas.',
    category: '3d',
    categoryLabel: '3D & Gráficos',
    path: './jogos/voxel_city',
    previewImg: './assets/images/voxel_city_preview.png',
    badge: 'Mundo Aberto',
    featured: false,
    techTag: 'Three.js'
  },
  {
    id: 'threejs_earth',
    title: 'Three.js Earth',
    description: 'Globo terrestre 3D com rastreamento de satélites e auroras polares.',
    category: '3d',
    categoryLabel: '3D & Gráficos',
    path: './jogos/threejs_earth',
    previewImg: './assets/images/bg_neon_game.jpeg',
    badge: 'Visual 3D',
    featured: false,
    techTag: 'WebGL'
  },
  {
    id: 'voxel_arena',
    title: 'Voxel Arena',
    description: 'Hack and slash dinâmico em arena de sobrevivência contra ondas de inimigos.',
    category: '3d',
    categoryLabel: '3D & Gráficos',
    path: './jogos/voxel_arena',
    previewImg: './assets/images/voxel_city_preview.png',
    badge: 'Ação 3D',
    featured: false,
    techTag: 'Three.js'
  },
  {
    id: 'pinball',
    title: 'Neon Pinball',
    description: 'Arcade pinball retrô com física de colisões, multiball e áudio sintetizado.',
    category: 'arcade',
    categoryLabel: 'Ação & Arcade',
    path: './jogos/pinball',
    previewImg: './assets/images/pinball_preview.png',
    badge: 'Arcade',
    featured: false,
    techTag: 'Física 2D'
  },
  {
    id: 'space_shooter',
    title: 'Space Shooter',
    description: 'Batalhas espaciais nostálgicas na era de ouro dos shoot em ups.',
    category: 'arcade',
    categoryLabel: 'Ação & Arcade',
    path: './jogos/space_shooter',
    previewImg: './assets/images/space_shooter_preview.png',
    techTag: 'Arcade'
  },
  {
    id: 'block_stacker',
    title: 'Block Stacker',
    description: 'Encaixe blocos geométricos e elimine linhas no clássico arcade.',
    category: 'puzzle',
    categoryLabel: 'Estratégia & Puzzle',
    path: './jogos/block_stacker',
    previewImg: './assets/images/block_stacker_preview.png',
    techTag: 'Puzzle'
  },
  {
    id: 'chess',
    title: 'Xadrez Inteligente',
    description: 'Desafie a inteligência artificial com múltiplos níveis de profundidade.',
    category: 'strategy',
    categoryLabel: 'Estratégia & Puzzle',
    path: './jogos/chess',
    previewImg: './assets/images/chess_preview.png',
    techTag: 'IA / Minimax'
  },
  {
    id: 'poker',
    title: 'Poker Texas Hold\'em',
    description: 'Dispute partidas táticas de poker contra IA ou desafie seus amigos.',
    category: 'strategy',
    categoryLabel: 'Estratégia & Puzzle',
    path: './jogos/poker',
    previewImg: './assets/images/poker_preview.png',
    techTag: 'Multiplayer/IA'
  },
  {
    id: 'puzzle',
    title: 'Puzzle Master',
    description: 'Exercite sua mente resolvendo quebra-cabeças lógicos progressivos.',
    category: 'puzzle',
    categoryLabel: 'Estratégia & Puzzle',
    path: './jogos/puzzle',
    previewImg: './assets/images/puzzle_preview.png',
    techTag: 'Lógica'
  },
  {
    id: 'strategy_game',
    title: 'Strategy Empire',
    description: 'Construa, gerencie recursos e domine territórios inimigos.',
    category: 'strategy',
    categoryLabel: 'Estratégia & Puzzle',
    path: './jogos/strategy_game',
    previewImg: './assets/images/strategy_game_preview.png',
    techTag: 'Estratégia'
  },
  {
    id: 'ded',
    title: 'RPG Adventure Quest',
    description: 'Aventura épica de RPG em masmorras com regras inspiradas em D&D.',
    category: 'arcade',
    categoryLabel: 'Ação & Arcade',
    path: './jogos/ded',
    previewImg: './assets/images/ded_preview.png',
    techTag: 'Pixel RPG'
  },
  {
    id: 'rubiks_cube',
    title: 'Cubo Mágico 3D',
    description: 'Simulador interativo em 3D para resolver o lendário Cubo de Rubik.',
    category: 'puzzle',
    categoryLabel: 'Estratégia & Puzzle',
    path: './jogos/rubiks_cube',
    previewImg: './assets/images/rubiks_cube_preview.png',
    techTag: 'Three.js'
  },
  {
    id: 'snake',
    title: 'Modern Snake',
    description: 'O clássico jogo da cobrinha reestilizado com estética neon e fluidez.',
    category: 'arcade',
    categoryLabel: 'Ação & Arcade',
    path: './jogos/snake',
    previewImg: './assets/images/snake_preview.png',
    techTag: 'Canvas'
  },
  {
    id: 'rede_neural_evolutiva',
    title: 'Rede Neural Evolutiva',
    description: 'Simulação de algoritmo genético e rede neural aprendendo sem supervisão.',
    category: 'simulation',
    categoryLabel: 'Simulação & IA',
    path: './jogos/rede_neural_evolutiva',
    previewImg: './assets/images/rede_neural_evolutiva_preview.png',
    badge: 'Experimento IA',
    techTag: 'Machine Learning'
  },
  {
    id: 'gameoflife',
    title: 'Conway\'s Game of Life',
    description: 'Autômato celular com regras de nascimento e sobrevivência biológica.',
    category: 'simulation',
    categoryLabel: 'Simulação & IA',
    path: './jogos/gameoflife',
    previewImg: './assets/images/gameoflife_preview.png',
    techTag: 'Autômato'
  },
  {
    id: 'tabuleiro_galton',
    title: 'Tabuleiro de Galton',
    description: 'Demonstração da distribuição normal e do Teorema do Limite Central.',
    category: 'simulation',
    categoryLabel: 'Simulação & IA',
    path: './jogos/tabuleiro_galton',
    previewImg: './assets/images/tabuleiro_galton_preview.png',
    techTag: 'Física/Estatística'
  },
  {
    id: 'lazy_gardner',
    title: 'Lazy Gardener',
    description: 'Jardim zen relaxante e contemplativo com crescimento dinâmico da flora.',
    category: 'simulation',
    categoryLabel: 'Simulação & IA',
    path: './jogos/lazy_gardner',
    previewImg: './assets/images/lazy_gardner_preview.png',
    techTag: 'Zen/Relax'
  },
  {
    id: 'driving_simulator',
    title: 'Driving Simulator',
    description: 'Pilote livremente por estradas em um cenário relaxante com física de veículos.',
    category: 'simulation',
    categoryLabel: 'Simulação & IA',
    path: './jogos/driving_simulator',
    previewImg: './assets/images/driving_simulator_preview.png',
    techTag: 'Simulação 3D'
  },
  {
    id: 'visual_effects',
    title: 'String Catcher',
    description: 'Capture notas musicais em cordas vibrantes com efeitos rítmicos de áudio.',
    category: 'arcade',
    categoryLabel: 'Ação & Arcade',
    path: './jogos/visual_effects',
    previewImg: './assets/images/visual_effects_preview.png',
    techTag: 'Audio/Canvas'
  },
  {
    id: 'archer',
    title: 'The Archer',
    description: 'Desafio de tiro com arco: calcule a física balística e acerte os alvos.',
    category: 'arcade',
    categoryLabel: 'Ação & Arcade',
    path: './jogos/archer',
    previewImg: './assets/images/archer_preview.png',
    techTag: 'Balística 2D'
  },
  {
    id: 'it_simulator',
    title: 'Company Simulator',
    description: 'Simulador satírico dos desafios cotidianos no ambiente corporativo e TI.',
    category: 'simulation',
    categoryLabel: 'Simulação & IA',
    path: './jogos/it_simulator',
    previewImg: './assets/images/it_simulator_preview.png',
    techTag: 'Simulação'
  }
];
```

---

## 3. Especificação do Design System (CSS Tokens)

O arquivo de estilos deve declarar os seguintes tokens no seletor `:root`.

```css
:root {
  /* Cores de Fundo (Superfícies Obsidian) */
  --bg-app: #08090d;
  --bg-card: rgba(16, 18, 27, 0.75);
  --bg-card-hover: rgba(23, 26, 40, 0.9);
  --bg-glass-nav: rgba(10, 11, 16, 0.8);
  --bg-chip: rgba(255, 255, 255, 0.05);
  --bg-chip-active: #6366f1;

  /* Bordas e Divisores */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-card-hover: rgba(99, 102, 241, 0.45);
  --border-chip: rgba(255, 255, 255, 0.12);

  /* Acentos de Cores (Cores Semânticas) */
  --accent-primary: #6366f1;      /* Indigo / Destaque principal */
  --accent-cyan: #06b6d4;         /* Ciano / 3D & WebGL */
  --accent-emerald: #10b981;      /* Esmeralda / Museu Retro */
  --accent-amber: #f59e0b;        /* Âmbar / Arcade & Ação */
  --accent-purple: #a855f7;       /* Violeta / Estratégia */

  /* Tipografia & Cores de Texto */
  --font-heading: 'Outfit', system-ui, -apple-system, sans-serif;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  /* Geometria e Efeitos */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-full: 9999px;
  --shadow-subtle: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
  --shadow-hover: 0 16px 36px -8px rgba(99, 102, 241, 0.25);
  --transition-fast: 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 4. Arquitetura de Componentes da Interface (DOM Semântico)

### 4.1 Componente 1: Navbar Persistente (`<header class="app-header">`)
* **Posição:** `position: sticky; top: 0; z-index: 100; backdrop-filter: blur(16px);`.
* **Conteúdo:**
  * **Brand Logo:** `<div class="logo">Playful<span class="logo-accent">Hub</span></div>` com badge de versão.
  * **Total Counter:** Tag informativa tipo chip `<span class="badge-counter">22 Experimentos</span>`.
  * **Quick Actions:** Links vetoriais externos (GitHub e LinkedIn) com `target="_blank"` e `rel="noopener noreferrer"`.

### 4.2 Componente 2: Hero Section & Museu Banner (`<section class="hero-section">`)
* **Estrutura:**
  * Headline com gradiente sutil: `<h1>Playground Digital de Jogos & Experimentos</h1>`.
  * Parágrafo introdutório convidativo sem efeito blur de text-shadow.
  * **Card de Acesso Rápido ao Museu (Pixel Art Retro):**
    ```html
    <a href="./index2.html" class="museum-banner" aria-label="Abrir Modo Museu Interativo">
      <div class="museum-badge">EXPERIÊNCIA RETRO</div>
      <div class="museum-content">
        <span class="museum-icon">🏛️</span>
        <div>
          <h3>Modo Museu Interativo</h3>
          <p>Explore as máquinas arcade em um ambiente 2D pixel art navegável.</p>
        </div>
      </div>
      <span class="museum-cta">Entrar no Museu &rarr;</span>
    </a>
    ```

### 4.3 Componente 3: Toolbar de Busca & Filtros (`<nav class="toolbar" role="search">`)
* **Campo de Busca:**
  * Input estilizado com ícone de lupa SVG.
  * Tecla de atalho visual (badge `ESC` para limpar).
  * Limpeza rápida com botão de "X" quando preenchido.
* **Chips de Categoria:**
  * Lista acessível de botões:
    `[Todos]`, `[3D & Gráficos]`, `[Ação & Arcade]`, `[Estratégia & Puzzle]`, `[Simulação & IA]`.
  * Atributo `aria-pressed="true|false"` para indicar estado ativo ao leitor de tela.
* **Result Counter (`aria-live="polite"`):**
  * `<div id="results-count" class="results-count">Exibindo 22 jogos</div>`.

### 4.4 Componente 4: Bento Grid (`<main class="bento-grid" id="games-grid">`)
* **Layout CSS:**
  ```css
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 20px;
    width: 100%;
    max-width: 1360px;
    margin: 0 auto;
    padding: 10px 20px 80px 20px;
  }
  
  /* Variação Bento para itens em destaque */
  @media (min-width: 1024px) {
    .game-card.featured-card {
      grid-column: span 2;
    }
  }
  ```

### 4.5 Componente 5: Card de Jogo (`<article class="game-card">`)
Cada card segue a anatomia:
1. **Container de Capa (`.card-media`):**
   * Imagem de preview com proporção fixa `aspect-ratio: 16 / 9; object-fit: cover;`.
   * Atributos `loading="lazy"` e `decoding="async"`.
   * Fallback dinâmico com tratamento de erro (`onerror="handleImageError(this)"`).
   * Badge flutuante (ex: `WebGL`, `Destaque`, `IA`).
   * Overlay de hover com botão de Play circular centralizado.
2. **Corpo do Card (`.card-body`):**
   * Tag de tecnologia (`.card-tech-tag`).
   * Título semântico `<h3>`.
   * Descrição objetiva (`.card-description`).
3. **Rodapé do Card (`.card-footer`):**
   * Categoria formatada.
   * Botão de ação explícito: `<a class="btn-play">Jogar &rarr;</a>`.

---

## 5. Implementação da Lógica JavaScript (Zero Dependencies)

O arquivo `index.html` deve conter um módulo JS puro estruturado e performático:

```javascript
(function () {
  'use strict';

  // 1. Estado da Aplicação
  const state = {
    searchQuery: '',
    selectedCategory: 'all',
    items: GAMES_DATA
  };

  // 2. Elementos do DOM
  const gridElement = document.getElementById('games-grid');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterChips = document.querySelectorAll('.filter-chip');
  const countElement = document.getElementById('results-count');

  // 3. Função de Renderização com DocumentFragment (Zero Reflow Overhead)
  function renderGames() {
    const query = state.searchQuery.toLowerCase().trim();
    const category = state.selectedCategory;

    const filtered = state.items.filter(game => {
      const matchCategory = (category === 'all') || (game.category === category);
      const matchQuery = !query || 
        game.title.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query) ||
        game.techTag.toLowerCase().includes(query) ||
        game.categoryLabel.toLowerCase().includes(query);

      return matchCategory && matchQuery;
    });

    // Atualizar contador acessível
    countElement.textContent = filtered.length === 1 
      ? '1 jogo encontrado' 
      : `${filtered.length} jogos encontrados`;

    // Estado vazio
    if (filtered.length === 0) {
      gridElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>Nenhum jogo encontrado</h3>
          <p>Tente buscar por outro termo ou selecione a categoria "Todos".</p>
          <button class="btn-reset" onclick="resetFilters()">Limpar Filtros</button>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(game => {
      const card = document.createElement('article');
      card.className = `game-card ${game.featured && category === 'all' && !query ? 'featured-card' : ''}`;
      card.setAttribute('data-id', game.id);

      card.innerHTML = `
        <a href="${game.path}" class="card-link" aria-label="Jogar ${game.title}">
          <div class="card-media">
            <img src="${game.previewImg}" 
                 alt="Screenshot do jogo ${game.title}" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="this.onerror=null; this.src='./assets/images/bg_neon_game.jpeg';">
            ${game.badge ? `<span class="card-badge">${game.badge}</span>` : ''}
            <div class="play-overlay">
              <div class="play-icon-circle">▶</div>
            </div>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span class="tech-tag">${game.techTag}</span>
              <span class="category-name">${game.categoryLabel}</span>
            </div>
            <h3 class="card-title">${game.title}</h3>
            <p class="card-description">${game.description}</p>
          </div>
          <div class="card-footer">
            <span class="cta-text">Jogar Agora <span class="arrow">&rarr;</span></span>
          </div>
        </a>
      `;

      fragment.appendChild(card);
    });

    gridElement.innerHTML = '';
    gridElement.appendChild(fragment);
  }

  // 4. Debounce Utilitário para a Busca (120ms para digitação fluida)
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  const handleSearch = debounce((e) => {
    state.searchQuery = e.target.value;
    clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    renderGames();
  }, 120);

  // 5. Efeito Spotlight nos Cards (Acelerado por GPU)
  function initSpotlightEffect() {
    gridElement.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.game-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  }

  // 6. Listeners de Inicialização
  searchInput.addEventListener('input', handleSearch);
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderGames();
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
      state.selectedCategory = chip.dataset.category;
      renderGames();
    });
  });

  // Expor reset globalmente para o empty state
  window.resetFilters = function () {
    searchInput.value = '';
    state.searchQuery = '';
    state.selectedCategory = 'all';
    clearSearchBtn.style.display = 'none';
    filterChips.forEach(c => c.classList.toggle('active', c.dataset.category === 'all'));
    renderGames();
  };

  // Bootstrap
  document.addEventListener('DOMContentLoaded', () => {
    renderGames();
    initSpotlightEffect();
  });
})();
```

---

## 6. Critérios de Aceite & Validação (Definition of Done)

Para aprovação do Pull Request / entrega do time, todos os itens abaixo devem ser validados:

- [ ] **Validação Visual dos Cards:**
  - Nenhum card deve exibir o círculo de emoji legado.
  - Imagens de preview devem carregar no aspect-ratio correto sem distorção (`object-fit: cover`).
  - Fallback automático implementado para qualquer erro 404 em imagem.
- [ ] **Filtragem e Busca:**
  - Digitar no campo de busca filtra em tempo real com delay imperceptível (< 150ms).
  - Clicar em qualquer pílula de categoria filtra os jogos instantaneamente.
  - O contador exibe a quantidade exata de resultados encontrados.
  - Busca sem resultados exibe tela de "Empty State" com botão de reset.
- [ ] **Responsividade:**
  - **Mobile (< 640px):** 1 coluna fluida, margens laterais de 16px, touch targets >= 44px.
  - **Tablet (641px - 1023px):** 2 colunas.
  - **Desktop (>= 1024px):** 3 a 4 colunas em Bento Grid, com cards de destaque expandidos.
- [ ] **Acessibilidade:**
  - Navegar pelo teclado com a tecla `Tab` exibe contorno de foco visível em todos os cards e botões.
  - Atributos `aria-label`, `role="search"`, `aria-live` testados e válidos.
- [ ] **Integridade Funcional:**
  - O clique em qualquer card continua abrindo o respectivo jogo sem quebrar rotas do Express (`server.js`).
  - O link para o "Modo Museu Interativo" direciona com sucesso para `./index2.html`.
  - Links sociais do rodapé abrem corretamente em nova aba.

---

## 7. Próximos Passos de Execução
Com a documentação técnica consolidada, os desenvolvedores podem aplicar diretamente as alterações no arquivo `index.html`.
