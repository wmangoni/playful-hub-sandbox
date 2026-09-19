# 🚀 Tarefa 001 - Planning Poker: Infraestrutura de Salas Multiplayer via WebSocket (v1)

**Status**: ✅ Refined
**Responsável**: Tech Lead do Playful Hub

---

## 🔍 Análise do Product Owner (PO)

O Playful Hub é uma coleção de jogos web servidos por um Express single-server (`server.js`) com roteamento SEO (`/jogos/*`) e catálogo em `games_control.json`. Todos os jogos atuais são **single-player** ou locais. Esta tarefa inaugura o primeiro jogo **multiplayer em tempo real** do hub: um **Planning Poker** destinado a times de programadores estimarem tarefas em conjunto.

A expectativa inicial é **mínima e funcional**: uma página simples onde o time inteiro acessa a mesma URL — identificada por um **hash curto único** — vota de forma secreta na escala Fibonacci e revela os votos juntos. Não se espera persistência, autenticação, cadastro de usuários nem moderação avançada nesta primeira versão.

## 🎯 Objetivo

Entregar a v1 do Planning Poker com:
1. **WebSocket** real (`ws`) integrado ao servidor Express existente.
2. Conceito de **sala** identificada por **hash curto único na URL** (`/planning_poker/<id>`).
3. **Layout simples** (entrada + sala de votação) no padrão visual neon escuro do hub.
4. Ciclo completo de votação: votar em segredo → todos visualizam o status "votou/aguardando" → revelar → nova rodada.

## 📋 Requisitos Funcionais (v1)

| # | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-01 | Usuário informa nome e cria uma sala; o servidor redireciona para `/planning_poker/<hash>` | Alta |
| RF-02 | Acessar `/planning_poker/<hash>` conecta o usuário à sala existente (ou cria se for o primeiro) | Alta |
| RF-03 | Botão **copiar link** para compartilhar a URL da sala com o time | Alta |
| RF-04 | Baralho **Fibonacci**: 0, 1, 2, 3, 5, 8, 13, 21, 34, ? (café/incerto) e ∞ (impossível) | Alta |
| RF-05 | Ao votar, a carta do próprio jogador fica oculta e todos da sala veem "votou ✓" | Alta |
| RF-06 | Botão **Revelar** mostra os votos de todos; média e moda exibidas ao lado | Alta |
| RF-07 | Botão **Nova rodada** reseta os votos mantendo os participantes | Média |
| RF-08 | Desconexão (fechar aba/cair) remove o participante da sala em tempo real | Alta |
| RF-09 | Acessar `/planning_poker/` sem hash gera e redireciona para uma sala nova com hash único | Alta |

## ✅ Critérios de Aceitação (v1)

1. **Duas ou mais abas** abrindo `/planning_poker/<id>` veem o **mesmo estado em tempo real** (entrada/saída de jogadores, votos, revelação).
2. Ao votar, a **carta do jogador permanece oculta** para os demais, mas o status "votou ✓" aparece para todos.
3. `reveal` **vira as cartas de todos** simultaneamente e mostra média e moda dos votos.
4. `reset` limpa os votos da rodada e mantém os jogadores conectados.
5. Ao fechar a aba, o jogador **some da lista** dos demais sem recarregar a página.
6. A URL da sala é **curta e única** (`/planning_poker/ab3xYz`), copiável com 1 clique.
7. O servidor continua servindo **todos os jogos existentes** normalmente (sem quebra de rotas, CORS, CSP ou cache).

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Arquitetura Geral

```
Cliente (navegador)          Servidor Express (Node)
+----------------------+      +------------------------------+
| planning_poker/      | HTTP | server.js (rotas estáticas/SEO)|
|  index.html          |----->| /planning_poker/:roomId      |
|  (UI + WS client)    |      +------------------------------+
|             |        |      | WebSocketServer (ws)          |
|             | {type,payload} | RoomManager (Map<id,Room>)  |
+----------------------+      +------------------------------+
```

- **Mesmo servidor HTTP**: o `WebSocketServer` deve ser atrelado ao servidor criado em `app.listen(...)` (capturar a referência do `http.Server`). `server.js` exporta `app` (usado nos testes) — a camada WS deve ser ativada **apenas fora do modo de teste** (`NODE_ENV !== 'test'`), seguindo o padrão existente do `app.listen`.
- **Rotas a adicionar em `server.js`**:
  - `GET /planning_poker` → `res.redirect('/planning_poker/<id-gerado>')`**OU** servir o `index.html` e o cliente solicita `create_room` (ver decisão na seção 5).
  - `GET /planning_poker/:roomId` → `res.sendFile('<raiz>/planning_poker/index.html')` (ordem de registro: a rota com parâmetro **após** a rota exata).
  - `GET /jogos/planning_poker` → página SEO `jogos/planning_poker.html` (padrão `createHtmlRoute`).
- **Dependência**: adicionar `ws` ao `package.json` (`npm i ws`).
- **CSP (helmet)**: verificar directive `connect-src`; `'self'` já cobre `ws://host:porta` com mesmo host/porta. Caso a porta do WS difira, incluir explicitamente. Adicionar `frameSrc`/âncoras se necessário no padrão atual.

### 2. Estrutura de Arquivos (v1)

```
planning_poker/
├── index.html          # Layout + cliente WebSocket (vanilla JS)
├── CLAUDE.md           # Documentação de arquitetura (padrão do repo)
├── BACKLOG.md          # Legado (read-only, por convenção do WORKFLOW.md)
└── TASKS/TASK_001.md   # Esta especificação
jogos/planning_poker.html  # Página SEO wrapper (padrão do repo)
tests/qa_planning_poker_task001.test.js  # Evidências de QA (Puppeteer)
```

### 3. Modelagem de Dados (Servidor)

```text
Room {
  id: string          // hash 6 chars base62
  createdAt: number
  phase: 'voting' | 'revealed'
  votesRevealed: boolean
  players: Map<socketId, Player>
}
Player {
  id: string          // uuid curto ou socket.id
  name: string        // validado (trim, 1..24 chars)
  vote: number | '?' | '∞' | null
}
RoomManager (singleton em memória):
  rooms: Map<roomId, Room>
  createRoom() → Room
  join(roomId, player) → Room | Error
  cleanup(): remove salas vazias há > X minutos
```

- **Volatilidade aceita**: salas em memória morrem no restart do servidor (Heroku). Ok para v1 — sem persistência.
- **Limite por sala** (defensivo): máximo de 15 participantes; rejeitar `join` com `error` e mensagem clara.

### 4. Protocolo WebSocket

Envelope único: `{ "type": "<tipo>", "payload": { ... } }`.

| Direção | type | payload | Observação |
| :--- | :--- | :--- | :--- |
| C → S | `create_room` | `{ name }` | (`roomId` no payload OU via URL path) |
| C → S | `join` | `{ roomId, name }` | Entra/cria sala, desconecta de sala anterior |
| C → S | `vote` | `{ value }` | Só aceito em `phase === 'voting'` |
| C → S | `reveal` | `{}` | Idempotente; transiciona para `revealed` |
| C → S | `reset` | `{}` | Limpa votos → `phase: 'voting'` |
| S → C | `room_state` | `{ roomId, phase, players, revealed }` | Enviado ao entrar e a cada mutação relevante |
| S → C | `player_joined` | `{ player }` | Broadcashear |
| S → C | `player_left` | `{ playerId }` | Broadcashear |
| S → C | `vote_cast` | `{ playerId, hasVoted: true }` | Broadcashear (nunca envia o valor) |
| S → C | `revealed` | `{ votes: [{ playerId, vote }], stats: { mean, mode } }` | Broadcashear |
| S → C | `error` | `{ message }` | Sala cheia, nome inválido, voto fora do turno, etc. |

**Regras de segurança do protocolo**:
- O servidor **nunca** emite o valor do voto de um jogador para outro antes de `revealed`.
- Votos são validados contra a escala Fibonacci; valores fora dela são rejeitados.
- `vote` após `revealed` é ignorado com `error`.
- Taxa de mensagens saneada (anti-spam): limite simples de mensagens/segundo por socket.

### 5. Geração do Hash da Sala

- **Formato**: 6 caracteres em **base62** (`A-Za-z0-9`), suficiente para ~5.7×10¹⁰ ids → colisão improvável; regerar em caso de colisão (loop com limite de tentativas).
- **Fluxo de criação** (decisão recomendada): servidor gera o id. Duas opções:
  - **Opção A (recomendada)**: `GET /planning_poker` sem hash → criar sala, `302` para `/planning_poker/<id>`. Simples, URL limpa imediatamente, funciona sem JS do protocolo.
  - Opção B: servir o `index.html`; cliente envia `create_room` e recebe `roomId` no `room_state`; frontend usa `history.pushState` para normalizar a URL.
  - Na ausência de requisito explícito, seguir **Opção A** (302), com fallback da Opção B reaproveitável no cliente (o `room_state` sempre traz `roomId`).
- **Entrada em sala já existente**: `join { roomId, name }` a partir do hash lido no pathname.

### 6. Layout da Interface (v1 — simples, padrão visual do hub)

- **Tela de entrada**: campo "Nome" + botão "Criar sala". Ao clicar, redireciona para `/planning_poker/<id>`.
- **Tela da sala**:
  - Header: título "Planning Poker", **hash da sala** (mono) + botão **Copiar link**.
  - Área de jogadores: grid de cartões (nome + status "votou ✓" / "aguardando"); **sempre visível** para todos.
  - Baralho: 12 cartas (0,1,2,3,5,8,13,21,34,?, ∞). Ao selecionar, destaque visual + lock até `reset`.
  - Rodapé de ações: **Revelar** e **Nova rodada**.
  - Após `revealed`: cartas viradas lado a lado + linha de estatísticas (média, moda) simples, sem gráficos.
- **Estética**: tema escuro neon (`:root` com variáveis CSS), fonte monospace para hash/estatísticas, cards com transições CSS suaves. Sem frameworks; HTML/CSS/JS vanilla, alinhado aos demais jogos do repo.
- **Responsividade básica**: grid `auto-fit(minmax(...))` para acomodar telas e múltiplos participantes.

### 7. Heartbeat e Cleanup de Conexões

- Implementar `ping/pong` (`ws`) a cada ~30s; sockets sem `pong` em 2 tentativas são fechados e removidos da sala (trata abas fechadas, redes instáveis).
- Ao remover um player, transmitir `player_left` + novo `room_state`.
- Sala vazia é removida do `Map` (com flag `createdAt` para cleanup periódico de salas fantasma).
- `ws` já emite evento `close` no cliente de forma confiável; o `close` no servidor dispara a remoção — garanta que não seja duplicada (guard por `playerId` já removido).

### 8. Fora de Escopo (v2 e além)

- Persistência/banco de dados, autenticação e contas.
- Sistema de roles (somente o "host" pode revelar), senha de sala, expiração de sala com próximo fluxo.
- Integração com o catálogo do hub (`games_control.json`, menu, páginas `index.html`/`index2.html`).
- Timer de votação, histórico de rodadas, exportação de estimativas, gráficos.
- Suporte a múltiplas tarefas simultâneas em uma mesma sala.

---

## 🔗 Integração com o Resto do Repositório

- **`server.js`**: + rota exata `/planning_poker`, + rota paramétrica `/planning_poker/:roomId`, + rota SEO `/jogos/planning_poker`; atrelar `WebSocketServer` ao `http.Server` do `app.listen`; **sem alterar** rotas existentes.
- **`package.json`**: + `ws` como dependência (não devDependency).
- **`README.md`**: (opcional nesta task) futura entrada do jogo na lista do catálogo.
- **Backlog raiz**: a linha desta task deve nascer com status conforme glossário do `WORKFLOW.md`.

*Assinado: Tech Lead do Playful Hub*

---

## 💻 Notas de Desenvolvimento (Dev Complete)

**Arquivos alterados/criados**:
- `planning_poker/ws.js` — WebSocketServer (`ws`) + `RoomManager` in-memory.
- `planning_poker/index.html` — layout (entrada + sala) e cliente WebSocket vanilla.
- `jogos/planning_poker.html` — página SEO do padrão do hub.
- `server.js` — rotas `/planning_poker`, `/planning_poker/:roomId`, `/jogos/planning_poker` e atrelamento do WS ao `http.Server` do `app.listen` (fora do modo teste).
- `package.json` — dependência `ws`; `test:ci` agora roda também o teste de WS.
- `tests/planning_poker_ws.test.js` — 10 testes de integração (redirect, página, join/sync, voto secreto, validação, reveal/stats, reset, desconexão, cleanup).
- `games_control.json`, `index.html` (card + `GAMES_DATA`), `index2.html` (Museu), `README.md` — integração no catálogo.

### Decisões de implementação
- **Redirect (302)** cria a sala no `GET /planning_poker` (opção A da spec); o `join` cria a sala caso o id não exista (resiliência).
- `room_state` é a fonte única de verdade: votos só saem com valor após `votesRevealed`.
- Apenas 4 mensagens C→S: `join`, `vote`, `reveal`, `reset`. Eventos S→C: `room_state`, `player_joined`, `player_left`, `vote_cast`, `revealed` (com stats), `reset_round`, `error`.
- Hash 6 chars base62 (`issueRoomId`), heartbeat `ping/pong` 30s, rate-limit (40 msg/5s → `terminate`), TTL 30min para salas vazias.
- Rotas do planning poker registradas **antes** do `express.static` para o redirect vencer o `index.html` do diretório.

### ✅ Verificação local
- `npm run test:ci` → smoke + 10 testes de WS passando.
- Validação manual no navegador (2 abas na mesma sala: votar, revelar, reset, desconexão) aprovada pelo PO.

*Status: 🚀 Dev Complete — aguardando Code Review/QA.*