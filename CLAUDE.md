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
