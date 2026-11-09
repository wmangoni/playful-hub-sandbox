# 🏖️ Arquitetura e Padrões — Beach Tennis Card Game (UBT)

Jogo tático de cartas de Beach Tennis 1v1 contra Inteligência Artificial (Fácil, Médio, Difícil) com regras oficiais da ITF (pontuação *No-Ad* em `40-40` e *Tie-break* em `6-6`) e direção de arte mangá realista (*Seinen Sports TCG*).

## 🏗️ Arquitetura do Código

O jogo é construído com **React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Zustand + Framer Motion** (repositório fonte em `D:\Users\Home\Documents\repos\beach_tenis_card_game`), com o código-fonte espelhado em `beach_tennis/src/` e o bundle estático de produção servido diretamente em `/beach_tennis/` (`beach_tennis/index.html` e `beach_tennis/assets/`).

- **Integração no PlayfulHub**:
  - Card no menu principal (`index.html`): `<article class="game-card featured-card" data-id="beach_tennis">` e entrada correspondente em `GAMES_DATA`;
  - Registro em `games_control.json` (`BEACH_TENNIS`);
  - Página de destino SEO em `jogos/beach_tennis.html` (gerada via `scripts/generate-game-pages.js` e enriquecida com `npm run seo`);
  - Rotas em `server.js`: `/jogos/beach_tennis` (`jogos/beach_tennis.html`) e `/beach_tennis` (`beach_tennis/index.html`);
  - Imagem de preview: `assets/images/beach_tennis_preview.png`.

## 📂 Mapa de Módulos (`src/`)

- **`src/engine/`**: Motor determinístico e puro de regras:
  - `types.ts`: Tipos estritos de cartas, fases da partida (`SERVE_SELECTION`, `SERVE_DEFENSE_SELECTION`, `SERVE_REVEAL`, `RALLY_HUMAN_TURN`, `RALLY_AI_TURN`, `CAVACAO_DECISION`, `WILDCARD_DECLARATION`, `POINT_ENDED`, `MATCH_ENDED`) e placar ITF;
  - `cardsCatalog.ts`: Catálogo das 19 cartas únicas (3 Laranjas de Saque `1–3`, 54 Verdes do Monte Verde incluindo 12 de Ataque e 2 Coringas `GOLPE_UBT`, e 8 Azuis de Defesa incluindo 1 Coringa `DEF_UBT`);
  - `serveResolver.ts`: Resolução de duelo de saque (1 zona escolhida pelo sacador vs. 2 zonas cobertas pelo recebedor; zona descoberta resulta em **ACE!**);
  - `rallyValidator.ts`: Cadeia de exigências de golpe (`BANDEJAS`, `VOLEIOS`, `FUNDO`, `DEFESAS`), regra estrita de Ataque exigindo compra do Monte Azul, e mecânica de **Cavação** do Monte Verde (até 2 tentativas quando o jogador não tem carta válida na mão);
  - `scoreEngine.ts`: Contagem oficial ITF (`0`, `15`, `30`, `40`, Ponto Decisivo *No-Ad* em `40-40`, alternância de saque a cada game e *Tie-break* até 7 com diferença mínima de 2 pontos em `6-6`);
  - `aiController.ts`: Três níveis de IA (`EASY`, `MEDIUM`, `HARD`) com rastreamento de frequência de zonas de saque, conservação de Coringas e priorização tática de ataques.
- **`src/store/useMatchStore.ts`**: Store Zustand que orquestra transições de estado, timers de destaque de 3,0s por carta jogada (`Hero Spotlight`) e efeitos sonoros Web Audio API (`src/audio/soundEffects.ts`).
- **`src/components/`**:
  - `court/Court.tsx` e `court/ScoreboardHUD.tsx`: Quadra de areia com zonas táticas 1–3, HUD estilo broadcast esportivo e banner flutuante de fim de ponto;
  - `cards/CardComponent.tsx`, `cards/CardSlot.tsx`, `cards/CardHand.tsx` e `cards/CardIllustration.tsx`: Molduras TCG mangá *Seinen* em múltiplas camadas, destaque central `xl` na quadra com histórico da carta anterior e ilustrações em `/beach_tennis/assets/cards/*.jpg` com fallback vetorial SVG.

## 🔧 Como Atualizar o Build

Após alterações no código-fonte em `D:\Users\Home\Documents\repos\beach_tenis_card_game`:
1. Execute `npx tsc -b && npx vite build --base=/beach_tennis/` e `npm test -- --run`.
2. Copie o conteúdo de `dist/*` e `src/*` para `beach_tennis/` na raiz do `playful-hub-sandbox`.
