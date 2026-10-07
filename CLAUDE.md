# PlayfulHub

Portal de jogos web. Cada jogo vive na própria pasta (com um `CLAUDE.md` próprio) e tem uma página de informações em `jogos/<jogo>.html`, servida em `/jogos/<jogo>` pelo `server.js`.

## Regras do projeto

- **Nunca criar um `<iframe>` no lugar da imagem de preview.** A página de informações (`jogos/<jogo>.html`) nunca embute nem roda o jogo. Ela mostra a imagem de preview com o overlay "PLAY", e o clique leva à rota do jogo (ex.: `/tumbalacatumba/`), no mesmo padrão dos outros jogos.
- Para criar ou ajustar uma página de jogo, parta de `templates/game-page-template.html` e mantenha o bloco do preview como está lá:

  ```html
  <div class="game-container">
      <a id="gameFrame" class="game-iframe" href="/<jogo>/">
          <img src="../assets/images/<jogo>_preview.png" alt="<Nome do jogo>">
      </a>
      <div class="game-overlay"><span class="game-overlay-text">PLAY</span></div>
  </div>
  ```

  A classe `game-iframe` do link vem do template e não indica um iframe. A imagem fica em `assets/images/` e é a mesma do card do jogo em `index.html`. Cores e textos podem seguir a identidade de cada jogo.

- **Cuidado com `scripts/generate-game-pages.js`: ele sobrescreve páginas editadas à mão.** O script regenera as 23 páginas de `jogos/` que estão no `gamesData` a partir do template, apagando qualquer edição feita direto no HTML (o `puzzle.html`, por exemplo, já divergiu do template). Nunca o rode "para atualizar" sem antes conferir `git status`/`git diff` e sem um motivo claro. Para uma mudança em uma página só, edite o `jogos/<jogo>.html` ou o `gamesData`/template e regenere *apenas depois* de confirmar que o diff mostra só o que você quer; se algo foi apagado sem querer, restaure com `git checkout -- jogos/`. As páginas `blood_and_silver`, `planning_poker`, `blender_game` e `tumbalacatumba` são escritas à mão e o gerador não as toca.

## Regras de SEO

O SEO e a descoberta do portal são **gerados**, não escritos à mão. A fonte da verdade são as páginas `jogos/*.html` e o `index.html`; `scripts/generate-seo.js` produz o resto.

- **Nunca edite à mão** `sitemap.xml`, `llms.txt`, `games.json` nem o bloco entre `<!-- seo:begin -->` e `<!-- seo:end -->` das páginas (canonical, Twitter Cards, JSON-LD). Rode `npm run seo` e commite o resultado. A CI roda `npm run seo:check` e falha se algo estiver desatualizado.
- **Ao criar ou alterar um jogo** (página nova em `jogos/`, título, descrição, imagem de preview ou link de PLAY), rode `npm run seo` e confira o diff. Um jogo novo entra sozinho no sitemap, no `llms.txt` e no `games.json`. Se for uma ferramenta ou simulação (não um jogo), registre a categoria em `APP_CATEGORY` no `generate-seo.js` para o JSON-LD sair como `WebApplication` em vez de `VideoGame`. Não precisa registrar nada para um jogo comum.
- **Toda página de jogo precisa de:** `<title>` e `meta description` próprios e únicos, `og:title`, `og:description`, `og:url` com `https://playfulhub.com.br/jogos/<jogo>` e `og:image` apontando para uma imagem que exista em `assets/images/`. O `og:image` é convertido em URL absoluta pelo gerador (scrapers de redes sociais não resolvem caminho relativo). Sem imagem própria o gerador cai no fallback `bg_neon_game.jpeg`; prefira criar a `<jogo>_preview.png`.
- **URLs sempre absolutas e canônicas**, no domínio `https://playfulhub.com.br`, sem barra final nas páginas de jogo (`/jogos/<jogo>`). Não crie páginas duplicadas para o mesmo jogo: aliases como `/jogos/tetris` servem o HTML de `block_stacker`, mas só `/jogos/block_stacker` é canônica e entra no sitemap.
- **Dados estruturados honestos:** descreva só o que a página realmente tem. Nunca invente `aggregateRating`, `review`, número de avaliações ou preços; o JSON-LD atual não os traz de propósito. Isso vale para o AdSense também: nada de conteúdo gerado em massa, sem valor, só para ranquear.
- **`robots.txt` e `ads.txt` são sensíveis ao AdSense.** Mantenha `Mediapartners-Google` liberado e a linha `Sitemap:` no `robots.txt`. Não bloqueie `/jogos/`, `/assets/` nem os bots de busca; liberar ou bloquear bots de IA é decisão do dono do projeto, não mude por conta própria.
- **Não adicione `hreflang`** enquanto não existirem versões traduzidas reais das páginas (previsto para uma fase futura); `hreflang` apontando para páginas inexistentes prejudica a indexação.
- **Teste:** `tests/seo.test.js` valida cobertura do sitemap, URLs absolutas, imagens existentes, JSON-LD parseável e um único bloco por página. Ao mudar o gerador, rode `npm run seo`, `npm run seo:check` e `node tests/seo.test.js`.

