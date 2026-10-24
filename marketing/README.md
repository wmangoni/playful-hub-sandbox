# Divulgação automatizada do PlayfulHub

> **Falta fazer (só uma pessoa pode): contas, credenciais e decisões em aberto. Lista completa em [`PENDENCIAS.md`](PENDENCIAS.md).**

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
- Post que ficou mais de **36 h** para trás (workflow parado, por exemplo) **não** é publicado, e se houver mais de um post devido no mesmo canal só o **mais recente** sai por execução: é melhor perder um post do que despejar vários de uma vez. Ambos os casos geram um aviso (`::warning::`) na execução.
- Cada publicação é gravada no ledger **e enviada à branch `marketing-ledger` na hora** (se o envio falhar, o job para: seguir publicando sem registro arriscaria duplicar tudo). Se o runner morrer no meio, o que já foi publicado continua registrado. Um canal que falhou é tentado de novo na execução seguinte; os que deram certo não se repetem. O Mastodon recebe `Idempotency-Key`. Bluesky e Telegram não têm idempotência, então o `createRecord`/`send*` **nunca** é repetido automaticamente (se a resposta se perder, o post pode ter saído: confira o canal antes de reexecutar).
- Todo link leva UTMs (`utm_source=<canal>&utm_medium=social&utm_campaign=<campanha>&utm_content=<id do post>`) para a página de informações do jogo (`/jogos/<jogo>`, a canônica do SEO). O GA4 lê as UTMs sem nenhum código extra.

## Post diário do Desafio do Dia (automático, sem calendário)

Todo dia às **09:00 (Brasília)** o publicador anuncia o Desafio do Dia nos três canais. Não existe arquivo de calendário para isso: o post de cada data é **derivado** de `assets/js/desafio-core.js` (as mesmas regras da página `/desafio/`), então o jogo anunciado é sempre o jogo do dia. Código: `lib/daily.js`.

- **Texto:** 24 variações em rodízio, sempre com o número da edição (`#N`) e o nome do jogo. Todas passam pelo Guardião como qualquer post.
- **Link:** vai para `/desafio/` (que abre o jogo do dia), com `utm_campaign=desafio-do-dia&utm_content=desafio-AAAA-MM-DD`. O cartão do Bluesky e a legenda do Telegram usam o título/CTA do desafio, não os do jogo. Isso é o campo opcional `link` de um post (`path` só pode ser `/desafio/`, validado pelo Guardião).
- **Imagem:** a prévia do jogo em `assets/images/`. A do Pinball (1,2 MB) estoura o limite do card do Bluesky, então o diário usa `pinball_preview_card.jpg` (`IMAGE_OVERRIDES` em `daily.js`); o teste confere que todas cabem.
- **Calendário editorial tem prioridade:** se um post diário violasse a frequência por canal (2 por dia, 4 h de intervalo) com os posts do calendário, ele é **pulado** naquele dia (hoje: 31/10, por causa do post de Halloween do meio-dia). Nunca derruba a divulgação: um defeito do gerador (imagem ausente, conflito inesperado) descarta o diário com aviso e o calendário editorial segue; já na checagem da CI o mesmo defeito falha, para ser corrigido. O prefixo de id `desafio-AAAA-MM-DD` é reservado ao gerador.
- **Antes de 12/10/2026** (edição #1) não há post.
- **O post diário vale só no próprio dia** (`staleAfterHours: 14`, ou seja, até 23:00): o link abre `/desafio/`, que sempre mostra o jogo de *hoje*, então um post atrasado anunciaria um jogo e levaria a outro. Passou das 23:00 sem sair (workflow parado, canal fora do ar), ele **vence** com um `::warning::` e não é publicado no dia seguinte. É um campo opcional de qualquer post (`staleAfterHours`, de 1 a 36).
- **Desligar só o diário:** variável de repositório `MARKETING_DAILY=false` (também vale `0`, `no`, `off`; o workflow repassa a variável ao plano e ao publicador). `MARKETING_PAUSED=true` desliga tudo (diário incluído). `npm run marketing:check` valida os próximos 180 dias, para um conflito com o calendário aparecer no PR.

**Limitações conhecidas do diário:** (1) um post editorial adicionado *depois* de o diário do dia já ter saído, a menos de 4 h dele, não é barrado (o ledger já registrou o diário); mexa no calendário só para datas futuras. (2) Com só um canal configurado, os outros ficam pendentes e geram avisos de "vencido" na execução (inofensivo).

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

## Posts em inglês e espanhol

Um post pode ter `"lang": "en"` ou `"lang": "es"` (o padrão é português). O publicador então:

- leva o link para a **página traduzida do jogo** (`/en/games/<jogo>`, `/es/juegos/<jogo>`), com UTM, e usa o título e a descrição traduzidos no cartão do Bluesky;
- declara o idioma na plataforma (`langs` no Bluesky, `language` no Mastodon), que é o que os filtros de idioma delas usam;
- usa o CTA no idioma do post.

Regras do Guardião para posts `en`/`es`: só jogos com página traduzida (`i18n/config.js`), só nos canais `bluesky` e `mastodon` (o Telegram é um canal único em português), sem `link` alternativo (o Desafio do Dia só existe em português) e o texto precisa estar no idioma declarado (a checagem pega engano de copiar e colar, não traduz nada). Se o jogo tem partes em português dentro do jogo (`ui` `partial` ou `toggle` em `i18n/config.js`), **o texto do post avisa**, como a página faz. O calendário `calendar/en-es-2026-11.json` tem um post por jogo traduzido em cada idioma, um a cada dois dias às 15:00 de Brasília.

## Cineasta: novas tomadas

Cada jogo tem um arquivo em `cineasta/shots/<jogo>.js` com `file`, `query`, `cta` e as `shots`. Uma tomada define `duration`, `hour` (a hora do jogo anima ao longo dela), a `camera` (chaves com `t`, `pos` e `look` em `[x, z, altura]`) e as `captions`. Para ensaiar o enquadramento sem gerar vídeo:

```bash
node marketing/cineasta/record.js tumbalacatumba --all --stills --fast --out /tmp/ensaio
```

O Cineasta usa a API de depuração do jogo (`__game.tick`, `dayNight.setTime`, `cam.override`, `world.groundHeight`) e não altera o jogo. **Perfis.** Com GPU (`gpu`, o padrão local): renderiza em 720×1280, qualidade alta, 30 fps (os 8 clipes levam ~3,5 min). Sem GPU (`software`, usado na CI com `CINEASTA_GL=swiftshader`): renderiza em 540×960, qualidade baixa, 24 fps e amplia no ffmpeg, porque a qualidade alta em software custava ~8 s por quadro (mais de 1 h por clipe). Medido numa máquina local: um clipe de 15 s em modo CI leva ~11 min, e o workflow só grava o clipe do post que está na hora. Troque com `CINEASTA_PROFILE=gpu|software`.

Os vídeos saem sempre em 720×1280, sem áudio (a maior parte do público assiste no mudo), mas **na CI o Cineasta renderiza em software: 540×960, qualidade baixa, 24 fps, ampliado no ffmpeg**. Para um vídeo em 30 fps nítido, grave com GPU (`npm run marketing:render -- --all`) e aponte o post para o arquivo versionado em `assets/videos/` (`media.video`). Cada clipe só é aprovado depois de um controle de qualidade: resolução, quantidade de quadros, duração, brilho em 5 instantes (poster e ao longo do vídeo), vídeo não congelado e nenhum `[error]` no jogo. Um clipe reprovado é apagado e nunca chega a ser publicado.

## O que não está aqui (de propósito)

- **Reddit, Facebook, Instagram e TikTok:** sem API gratuita e utilizável para postar, e automação ali leva a ban.
- **YouTube Shorts:** a API só libera vídeos públicos depois de uma auditoria do projeto; fica para uma fase seguinte.
- **Vídeo nativo no Bluesky:** exige outro fluxo (serviço de vídeo). Por ora o card usa o poster do clipe.
- **Contas falsas, engajamento comprado, respostas automáticas em posts de terceiros:** nunca.

## Segurança

Os segredos só existem no GitHub (Secrets) e chegam ao publicador por variáveis de ambiente; nada de token no repositório. A pasta `marketing/` é servida como estática pelo `server.js` (como o resto da raiz): não coloque nada sensível nela.
