# 📜 Tarefa 005 - D&D Make Character: Integração no menu principal do hub

**Status**: 🚀 Dev Complete (revisão rigorosa por subagente: APROVADO na 3ª rodada, confirmado de novo após os ajustes finais)
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-make-character`
**Depende de**: TASK_001 a TASK_004

---

## 🔍 1. Pedido do usuário (28/09/2026)

> Colocar o sistema no menu principal do site, seguindo o padrão adotado. Existe um script que replica as páginas de jogo a partir dos dados: fazer igual.

## 🧭 2. O padrão do hub

Um jogo entra no menu principal por quatro pontos. Foi assim no Tumbalacatumba (PR #42), o último integrado na `main`.

| Ponto | O que é |
|---|---|
| `index.html` | O card `<article class="game-card" data-id="…">`, pré-renderizado para SEO, e a entrada em `GAMES_DATA`, que alimenta a busca, os filtros e o contador. Também o contador estático "N Experimentos" do cabeçalho. |
| `games_control.json` | O registro do jogo (`code`, `name`, `path`, `processed`). O teste do catálogo abre cada `path`. |
| `server.js` | A rota `createHtmlRoute('/jogos/<id>', 'jogos/<id>.html')`. |
| `jogos/<id>.html` | A página SEO. As 22 páginas clássicas do hub são **geradas** por `scripts/generate-game-pages.js`, que lê os dados de cada jogo (`gamesData`) e preenche `templates/game-page-template.html`. |

## ✅ 3. O que foi feito

- **Branch atualizado com a `main`.**
  - O worktree tinha sido criado a partir de `feat/sprint-5`, e a `main` avançou depois (#38 a #44, incluindo o Tumbalacatumba no menu).
  - Como o branch não tinha commits próprios, o trabalho foi para um stash com backup, o branch passou a apontar para a `main` e o trabalho voltou por cima.
  - Os conflitos em `games_control.json`, `server.js` e `index.html` foram resolvidos mantendo os dois jogos.
- **Menu principal (`index.html`).**
  - O card e a entrada `GAMES_DATA` já existiam desde a TASK_001, na categoria Estratégia & Raciocínio, com a tag "RPG / Dados".
  - O contador estático passou para **27 Experimentos**, o mesmo número que o JS calcula a partir do `GAMES_DATA`.
- **Página SEO pelo gerador.**
  - `scripts/generate-game-pages.js` ganhou a entrada `'ded_make_character'`: título, descrição, palavras-chave, gênero, características, objetivo, 6 controles, 5 dicas, tags e jogos relacionados (RPG Adventure Quest, Strategy Empire, Chess). O ícone da lista de relacionados é 📜.
  - `jogos/ded_make_character.html` agora sai do template, como as outras 22 páginas. Antes era escrita à mão, com a identidade "Grimório". O preview linka para `/ded_make_character/`.
  - Os controles usam teclas curtas e reais do app: Menu, Busca, Clique ("Salvar e gerar ficha"), ← → (abas do popup), Esc (fecha o popup sem salvar) e Ctrl+P (imprime a ficha).
- **Três correções no template (valem para todas as páginas geradas).**
  - **Teclas vazando.**
    - O `min-width: 30px` da `.control-key` anulava o mínimo automático do item flex. Quando a descrição quebrava linha, a tecla encolhia abaixo da própria palavra e vazava por cima do texto. O defeito já existia em 6 páginas: driving_simulator, gameoflife, poker, rede_neural_evolutiva, strategy_game e threejs_earth.
    - Agora é `min-width: min-content`. A tecla continua podendo quebrar linha entre palavras ("Clique + Arrastar"), mas nunca fica mais estreita que a maior palavra.
    - Custo: as teclas de uma letra ("R", "S") perderam o mínimo de 30px e ficaram com 25px.
    - Uma primeira tentativa com `flex-shrink: 0` foi descartada: a tecla não quebrava mais, e em rubiks_cube, threejs_earth, driving_simulator e poker o texto saía do quadro.
  - **Rolagem horizontal no celular e no tablet.**
    - O preview tinha `max-width: 644px` fixo, e os itens do grid têm `min-width: auto`. Numa tela de 375px a coluna ficava com ~750px e a página toda rolava para o lado, o que também acontecia entre 769 e ~1100px.
    - Agora é `max-width: min(644px, 100%)`, com `.main-content > * { min-width: 0 }`.
    - O defeito já existia em todas as páginas geradas cujo preview carrega.
    - A partir de ~1100px nada muda: o preview continua com 644px.
  - **Grids de 200px em telas estreitas.** `.controls-grid` e `.info-grid` usavam `minmax(200px, 1fr)`, e em 320–340px os itens de "Sobre o Jogo" passavam da seção. Agora é `minmax(min(200px, 100%), 1fr)`, e no desktop nada muda.
- **Ajustes de texto nos controles** (`gamesData`), para não quebrar linha no lugar errado:
  - Expressões longas unidas por barra viravam uma palavra só, mais larga que o quadro. Ganharam espaços em volta das barras:
    - "Acelerar / Frear / Steering" (driving_simulator);
    - "Apostar / Passar / Desistir" (poker);
    - "Adicionar / remover células" e "Pausar / continuar" (gameoflife);
    - "Paletas esquerda / direita" (pinball);
    - "Adicionar / remover obstáculos no modo Sandbox" (rede_neural_evolutiva).

    As curtas ("in/out", "frente/trás", "Entrar/Sair") cabem e ficaram como estavam.
  - "1-4" (voxel_arena), "Teclas 1-9" (strategy_game e it_simulator) e "← →" (D&D) passaram a usar hífen e espaço não separáveis.
    - No código, estão escritos como `\u2011` e `\u00a0`, com comentário.
    - O "1-4" e o "1-9" já quebravam no hífen antes desta tarefa.
- **As 22 páginas foram regeradas pelo script.** Cada uma muda só no CSS do template e, nas citadas acima, nesses textos.
- **Teste do catálogo.** `tests/qa_catalog_and_menu.test.js` passa a exigir o D&D Make Character e pelo menos 27 jogos no menu. A evidência `tests/catalog_and_menu_qa_evidence.png` foi atualizada, como no PR #42.

## ⚠️ 4. Observações

- **Fim de linha no Windows.**
  - O gerador escreve o template com CRLF e os trechos inseridos com LF, então a saída mistura os dois.
  - As páginas foram normalizadas para CRLF, como o resto do working tree. O git guarda LF (`core.autocrlf=true`).
- **A página SEO perdeu a identidade medieval.** Ficou no visual padrão do hub, como as demais geradas. O app em `/ded_make_character/` não mudou.
- **CORS no `server.js` (feito na TASK_001, registrado aqui).** O app usa `<script type="module">`, e o navegador manda `Origin` também nesses pedidos à própria origem. A lista de origens permitidas do CORS recusaria os próprios arquivos (500) quando o hub roda em outra porta ou domínio. Por isso, pedidos cujo `Origin` é o próprio `Host` pulam o middleware de CORS (`isSameOrigin`). Para as outras origens, a regra não mudou.
- **Não é desta tarefa:**
  - faltam `assets/images/threejs_earth_preview.png` e `voxel_arena_preview.png`, que dão 404 nas páginas desses jogos;
  - o menu principal tem ~13px de rolagem horizontal em 375px (a barra `nav-actions` do cabeçalho), anterior a esta tarefa;
  - **em 320px, telas bem estreitas** (a `main` rolava 446px nessa largura):
    - o breadcrumb do cabeçalho passa da tela nas páginas geradas de título longo (no máximo 12 a 17px, conforme o método de medição; 7px no D&D), e só isso faz a página rolar;
    - em 10 páginas, algum quadro de controle passa de 1 a 28px da borda da seção (14px no D&D), porque palavras como "automaticamente" e "meteorológica" não cabem numa coluna tão estreita. Em 340px isso sobra só em rede_neural_evolutiva (6px) e threejs_earth (8px); a partir de 360px, em nenhuma;
    - partir as palavras no meio (`overflow-wrap: anywhere`) resolveria, mas ficaria pior de ler;
  - a imagem de preview do D&D (TASK_001) diz "D&D 3.5", enquanto o card, a página e o app dizem "3ª edição".

## 🧪 5. Validação

- `node tests/qa_catalog_and_menu.test.js`: 27 jogos no menu, as 27 rotas de `games_control.json` respondem 200.
- `node tests/audit_repo.js`: 27 páginas, sem arquivo, rota ou imagem faltando.
- Antes da correção do template, o gerador reproduzia as 22 páginas existentes com o mesmo conteúdo (ignorando o fim de linha).
- Navegador (Puppeteer, 1366×900 e 375×812):
  - o card aparece com a imagem;
  - a busca "ficha" e o filtro Estratégia encontram o card;
  - o card abre `/jogos/ded_make_character`, e o preview abre o app;
  - nenhum erro no console.
- **Todas as 23 páginas geradas, em 17 larguras** (320, 340, 360, 375, 390, 414, 480, 600, 768, 769, 800, 900, 1024, 1100, 1280, 1366 e 1920px).
  - A medição foi feita sem a emulação `isMobile`: com ela, o `innerWidth` cresce junto com a página e esconde a rolagem.
  - Resultados:
    - sem rolagem horizontal a partir de 340px;
    - em 320px, só o breadcrumb rola (ver §4);
    - em cada `.control-item`, nem a tecla nem a descrição passam da borda do quadro, e nenhuma palavra quebra no meio;
    - a partir de 360px, nenhum quadro passa da borda da seção;
    - em 1366px, o preview mantém os 644px.
- Suítes do D&D: escolhas 10, regras 18, store 11, listagem 7, E2E 33 e smoke do hub.
