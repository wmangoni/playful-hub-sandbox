# Pendências da divulgação (para fazer no final)

Tudo que o código já faz sozinho está pronto e testado. O que está aqui **só uma pessoa pode fazer** (as plataformas não deixam um robô criar conta, e algumas decisões são do dono do projeto). Marque conforme for concluindo.

> **Atenção ao prazo:** o calendário de Halloween vai de **14 a 31/10/2026**, o post diário do Desafio do Dia começa em **12/10** e os posts em inglês e espanhol vão de **3/11 a 7/12/2026** (`marketing/calendar/en-es-2026-11.json`). Post que passa da janela (36 h; o diário, só o próprio dia) **não é publicado depois**. Se as contas ficarem prontas depois dessas datas, os posts já vencidos se perdem: ajuste o `at` deles no calendário correspondente (o `npm run marketing:check` valida).

## 1. Contas e credenciais (obrigatório para qualquer divulgação)

Passo a passo detalhado em [`README.md`](README.md#configuração-inicial-única-manual-as-plataformas-não-deixam-um-robô-criar-conta). Resumo:

- [ ] **Bluesky:** criar a conta, marcar como automatizada e descrever na bio que os posts são gerados por IA. Criar uma *senha de aplicativo* (nunca a senha da conta).
- [ ] **Mastodon:** criar a conta numa instância (ex.: `mastodon.social`), marcar "Esta conta é automatizada", criar um aplicativo com os escopos `write:media` e `write:statuses` e copiar o token.
- [ ] **Telegram:** criar o bot no `@BotFather` (`/newbot`), criar um **canal público** e adicionar o bot como administrador com permissão de postar.
- [ ] **Secrets do repositório** (Settings → Secrets and variables → Actions → Secrets): `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `MASTODON_INSTANCE` (com `https://`), `MASTODON_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (ex.: `@playfulhub`). Dá para começar com um só canal; os outros são ignorados.
- [ ] **Ensaio:** Actions → *Divulgação* → *Run workflow* com `dry_run` marcado (padrão). Ele grava o clipe na CI e mostra o que seria publicado, sem tocar em nada. **O workflow e as APIs nunca rodaram de verdade**: o primeiro post real é o teste definitivo.
- [ ] **Ligar:** variável de repositório `MARKETING_ENABLED=true` (Settings → Secrets and variables → Actions → Variables).
- [ ] (opcional) `MARKETING_DAILY=false` desliga só o post diário; `MARKETING_PAUSED=true` desliga tudo.

## 2. Buscadores (10 minutos, destrava o SEO)

- [ ] Enviar `https://playfulhub.com.br/sitemap.xml` no **Google Search Console** e no **Bing Webmaster Tools**.
- [ ] (quando o loop do Search Console existir) criar a conta de serviço do Google, dar acesso ao site no Search Console e salvar o JSON como Secret.

## 3. Decisões de produto em aberto

- [ ] **Desafio do Dia, modos de jogo:** o overlay lê só o `#score`, então modos diferentes do mesmo jogo (ex.: Archer *rush* × *campanha*) se misturam no "melhor do dia", e o duelo do Block Stacker não conta. Fixar um modo por jogo exigiria um parâmetro de modo nos jogos. Decidir se vale.
- [ ] **Anúncios na `/desafio/`:** hoje a página só tem o GTM.
- [ ] **Imagem de compartilhamento própria** para a `/desafio/` e para o Planning Poker (hoje usam `bg_neon_game.jpeg`).
- [ ] **Vídeos em 30 fps nítido:** na CI (sem GPU) os clipes saem em 540×960/24 fps ampliados. Para qualidade máxima, gravar com GPU (`npm run marketing:render -- --all`) e versionar em `assets/videos/`.

- [ ] **Revisão das traduções em inglês e espanhol por um falante nativo** (foram escritas por IA a partir do conteúdo real das páginas; PR das versões em outros idiomas). Enquanto isso **as páginas traduzidas não têm anúncios**; depois da revisão, decida se liga (`ADS_ON_TRANSLATED_PAGES` em `i18n/config.js`).
- [ ] Tradução da home e do Desafio do Dia (hoje só existem em português; os posts em inglês e espanhol já estão no calendário e levam às páginas dos jogos traduzidos).
- [ ] **Posts em inglês e espanhol saem nas mesmas contas do Bluesky e do Mastodon** (marcados com o idioma, que os filtros das plataformas usam) e **nunca no Telegram**, que tem um canal só, em português. Se preferir contas separadas por idioma, é decisão sua (exigiria credenciais por idioma no publicador).

## 4. Segurança e manutenção

- [x] ~~`express.static('./')` expondo `server.js`, `package.json` e `games_control.json`~~ — resolvido: o `server.js` responde 404 para `marketing/`, `config/`, `scripts/`, `tests/`, arquivos ocultos, `.md` e os arquivos de configuração da raiz (`ocultarArquivosDoProjeto`).
- [ ] Conferir **num aparelho real** o layout do overlay do Desafio em celular (Snake, Block Stacker e Pinball já têm layout mais largo que a tela em 360 px, independente do desafio).
- [ ] (menor) `persist-credentials: false` no workflow de divulgação; fallback `execCommand` e foco por teclado no botão de compartilhar do Desafio.

## 5. Adiado de propósito

- **Itch.io / Game Jolt:** precisa de conta; vale depois que as contas acima existirem.
- **Listas *awesome*, Product Hunt, Hacker News:** são curadas por humanos; PR ou post de robô costuma ser mal visto. Se quiser, o melhor que a IA faz é preparar o texto para você enviar.
- **Reddit, Facebook, Instagram, TikTok:** sem API gratuita utilizável para postar de forma automática e com risco de ban.
- **YouTube Shorts:** a API só libera vídeos públicos depois de uma auditoria do projeto.
