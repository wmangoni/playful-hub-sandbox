# Divulgação automatizada do PlayfulHub

Fase 2 do plano de divulgação. Uma fábrica de conteúdo que roda sozinha no GitHub Actions: os próprios jogos geram os vídeos, um calendário de posts define o que sai e quando, um Guardião barra o que não presta e o publicador envia pelas APIs oficiais, sem nenhum clique manual depois da configuração inicial.

```
calendar/*.json ──► Guardião (valida) ──► agenda (o que está na hora?) ──► Cineasta (grava os clipes que faltam)
                                                                              │
ledger (branch marketing-ledger) ◄── publicador ◄─────────────────────────────┘
                                        ├─► Bluesky   (texto + link + hashtags + card com imagem)
                                        ├─► Mastodon  (texto + vídeo)
                                        └─► Telegram  (canal: vídeo + legenda com link)
```

## Peças

| Pasta | O que é |
|---|---|
| `calendar/*.json` | Os posts: quando, qual jogo, texto, hashtags, mídia e canais. É o "roteiro" que os agentes de IA escrevem (via PR). |
| `lib/guard.js` | **Guardião.** Valida o calendário inteiro e cada post de novo na hora de publicar. Falha fechada. |
| `cineasta/` | Grava vídeos verticais dos jogos (Puppeteer + ffmpeg), quadro a quadro, sem depender da velocidade da máquina. |
| `channels/` | Um adaptador por rede (Bluesky, Mastodon, Telegram). Sem credenciais, o canal é ignorado. |
| `publish.js` | O publicador. `--dry-run`, `--plan` e `--check`. |
| `render.js` | Grava só os clipes que os posts devidos precisam. |
| `scripts/ledger.sh` | Guarda o registro do que já foi publicado numa branch própria (`marketing-ledger`). |
| `../.github/workflows/divulgacao.yml` | O agendamento (de hora em hora; sem nada devido termina em segundos). |

## Configuração inicial (única, manual: as plataformas não deixam um robô criar conta)

1. **Contas.** Crie uma conta por rede e **marque cada uma como automatizada** (bot) no perfil, como pedem as regras das plataformas. Descreva na bio que os posts são gerados por IA.
   - **Bluesky:** Configurações → Senhas de aplicativo → crie uma (nunca use a senha da conta).
   - **Mastodon:** Preferências → Desenvolvimento → Novo aplicativo, com os escopos `write:media` e `write:statuses`; copie o token de acesso. Em Perfil, marque "Esta conta é automatizada".
   - **Telegram:** converse com o `@BotFather` (`/newbot`), crie um **canal público** e adicione o bot como administrador com permissão de postar.
2. **Segredos do repositório** (Settings → Secrets and variables → Actions → Secrets):
   `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `MASTODON_INSTANCE` (ex.: `https://mastodon.social`), `MASTODON_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (ex.: `@playfulhub`).
   Dá para configurar só um canal: os outros são ignorados.
3. **Ligar** (Variables): `MARKETING_ENABLED=true`. Para pausar tudo sem mexer no código: `MARKETING_PAUSED=true`.
4. **Ensaio:** Actions → Divulgação → *Run workflow* com `dry_run` marcado (padrão) e, se quiser, `now` = `2026-10-14T19:30:00-03:00`. Ele grava o clipe, mostra o que seria publicado e não toca em nada.

## Como funciona a publicação

- O workflow roda de hora em hora. Um post está "devido" quando `at` já passou e ainda falta algum canal.
- Post que ficou mais de **36 h** para trás (workflow parado, por exemplo) **não** é publicado: é melhor perder um post do que despejar vários de uma vez.
- Cada publicação é gravada no ledger na hora, e o workflow salva o ledger mesmo se um canal falhar. Um canal que falhou é tentado de novo na execução seguinte; os que deram certo não se repetem. O Mastodon ainda recebe `Idempotency-Key`.
- Todo link leva UTMs (`utm_source=<canal>&utm_medium=social&utm_campaign=<campanha>&utm_content=<id do post>`) para a página de informações do jogo (`/jogos/<jogo>`, a canônica do SEO). O GA4 lê as UTMs sem nenhum código extra.

## Escrevendo posts (humanos ou agentes)

Arquivo `calendar/<campanha>.json`:

```json
{
  "campaign": "halloween-2026",
  "posts": [{
    "id": "halloween-01-mansao",
    "at": "2026-10-14T19:00:00-03:00",
    "game": "tumbalacatumba",
    "text": "Texto curto e honesto, sem URL, sem hashtag, sem @.",
    "hashtags": ["Halloween", "JogosBR"],
    "channels": ["bluesky", "mastodon", "telegram"],
    "media": { "clip": "mansao-ao-anoitecer", "alt": "Descrição para acessibilidade (obrigatória)." }
  }]
}
```

`media` aceita `{ "clip": "<tomada>" }` (gravada pelo Cineasta), `{ "video": "assets/…mp4", "poster": "assets/…jpg" }` ou `{ "image": "assets/images/….png" }`.

O Guardião (`npm run marketing:check`, também na CI) reprova: jogo fora do `games.json`; data sem fuso; texto com URL, @menção, hashtag solta, CAIXA ALTA, mais de 3 emojis ou isca de engajamento ("clique aqui", "marque um amigo", "sorteio"…); afirmações não comprováveis ("o melhor do mundo"); mais de 3 hashtags; mídia sem `alt`; texto acima do limite de cada rede; mais de 2 posts por dia ou menos de 4 h entre posts no mesmo canal; ids ou textos repetidos.

## Cineasta: novas tomadas

Cada jogo tem um arquivo em `cineasta/shots/<jogo>.js` com `file`, `query`, `cta` e as `shots`. Uma tomada define `duration`, `hour` (a hora do jogo anima ao longo dela), a `camera` (chaves com `t`, `pos` e `look` em `[x, z, altura]`) e as `captions`. Para ensaiar o enquadramento sem gerar vídeo:

```bash
node marketing/cineasta/record.js tumbalacatumba --all --stills --fast --out /tmp/ensaio
```

O Cineasta usa a API de depuração do jogo (`__game.tick`, `dayNight.setTime`, `cam.override`, `world.groundHeight`) e não altera o jogo. Os vídeos saem em 720×1280, 30 fps, sem áudio (a maior parte do público assiste no mudo), e só são aprovados depois de um controle de qualidade (resolução, quantidade de quadros, duração, poster não escuro, nenhum erro no jogo).

## O que não está aqui (de propósito)

- **Reddit, Facebook, Instagram e TikTok:** sem API gratuita e utilizável para postar, e automação ali leva a ban.
- **YouTube Shorts:** a API só libera vídeos públicos depois de uma auditoria do projeto; fica para uma fase seguinte.
- **Vídeo nativo no Bluesky:** exige outro fluxo (serviço de vídeo). Por ora o card usa o poster do clipe.
- **Contas falsas, engajamento comprado, respostas automáticas em posts de terceiros:** nunca.

## Segurança

Os segredos só existem no GitHub (Secrets) e chegam ao publicador por variáveis de ambiente; nada de token no repositório. A pasta `marketing/` é servida como estática pelo `server.js` (como o resto da raiz): não coloque nada sensível nela.
