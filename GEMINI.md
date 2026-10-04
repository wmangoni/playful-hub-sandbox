# Diretrizes e Padrões de Desenvolvimento - PlayfulHub Sandbox

Este repositório hospeda o portal de jogos casuais PlayfulHub e seus respectivos minijogos em HTML5/Canvas/CSS/JS. Ao operar neste repositório, siga estritamente as diretrizes abaixo:

## 1. Checklist Completo de Entregas para Jogos (Invariante de PR)
Sempre que criar, refatorar ou realizar overhaul visual/mecânico em um jogo (`<game>/`):
- [ ] **Código do Jogo**: Alterações implementadas e testadas dentro do diretório do minijogo (`<game>/index.html`, etc.).
- [ ] **Assets de Preview**: Atualizar a imagem de capa em `assets/images/<game>_preview.png`.
- [ ] **Página Inicial (`index.html`)**:
  - Atualizar o elemento `<article class="game-card" data-id="<game>">` com a nova imagem de preview, aplicando cache-buster (ex: `./assets/images/<game>_preview.png?v=2`) e descrição atualizada.
  - Atualizar o objeto correspondente no array dinâmico `GAMES_DATA`.
- [ ] **Página de Detalhes (`jogos/<game>.html`)**:
  - Atualizar o preview do iframe (`#gameFrame img`) com o mesmo cache-buster.
  - Atualizar meta tag social `og:image` (`/assets/images/<game>_preview.png?v=2`).
  - Atualizar seções de controles, objetivo e dicas para refletir fielmente a jogabilidade atual.
- [ ] **Mesmo PR**: Todas essas alterações devem vir no **mesmo Pull Request** para evitar páginas desatualizadas em produção.

## 2. Padrões de Física e Coordenadas 2D
- **Sistemas de Coordenadas CSS vs. Canvas**:
  - Se os projéteis/entidades usarem CSS `bottom`: $Y=0$ é o chão, e valores positivos sobem em direção ao céu. Logo, a velocidade vertical ascendente deve ser **positiva** (`vy = +Math.sin(angle) * speed`) e gravidade decrescente (`vy -= g * dt`).
  - Se usarem CSS `top` ou HTML Canvas tradicional: $Y=0$ é o topo, e valores positivos descem.
- **Controles de Mira / Estilingue**:
  - Restringir ângulos de mira ao campo útil frontal (impedir rotações de 180° que disparem para trás do personagem).
  - Em mecânicas de tensão (slingshot), puxadas à frente do ponto de repouso (`dx <= 0`) devem ter tensão zerada.
  - Sempre que viável, fornecer guia visual de mira (ex: pontos de trajetória preditiva) para melhorar a experiência do usuário.

## 3. Fluxo de Git e Shell (Windows / PowerShell)
- **Separador de Comandos**: Usar `;` para encadear comandos no PowerShell (o operador `&&` não é suportado nativamente em versões legadas do PowerShell).
- **Pull Requests**:
  - Sempre criar branches temáticas a partir da `main` atualizada (`git pull origin main`).
  - Executar testes automatizados relevantes antes do commit.
  - Abrir PR via GitHub CLI (`gh pr create --base main ...`) com resumo claro das mudanças e evidências.
