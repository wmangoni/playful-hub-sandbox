# 📂 Arquitetura e Padrões - D&D Make Character

Forja de heróis de D&D migrada do sistema legado `D-D-Make-Character` (CodeIgniter 3 + MySQL). O compêndio veio do dump e segue a 3.5.

- Oferece CRUD de Personagens, Classes, Talentos, Perícias e Raças, com os mesmos campos e obrigatórios do original. A especificação, com a matriz de paridade e os desvios intencionais, está em `TASKS/TASK_001.md`.
- `TASKS/TASK_002.md` removeu o módulo Tipos de Requisito; os pré-requisitos de talentos agora são texto.
- `TASKS/TASK_003.md`:
  - removeu Usuários, porque não há login;
  - criou a **ficha de personagem D&D 3.0** (`#/personagens/:id/ficha`), calculada pelas regras da 3ª edição.
- `TASKS/TASK_004.md`:
  - popup de **talentos e perícias**: "Salvar e gerar ficha" abre a ficha com `?escolher=1`, e o botão "Talentos e perícias" reabre;
  - acrescentou os 74 talentos do Livro do Jogador 3.0 (320 no total).
- `TASKS/TASK_005.md`: integração no menu principal do hub pelo padrão do gerador de páginas SEO.

## 🏗️ Arquitetura do Código

A aplicação é vanilla, com ES Modules e sem build. `index.html` carrega `js/app.js`, e o app roda em `/ded_make_character/`. Ele é servido pelo `express.static` do `server.js`, e a página SEO fica em `/jogos/ded_make_character`.

- **Integração no hub**:
  - o card no menu principal é o `<article data-id="ded_make_character">` e a entrada `GAMES_DATA` do `index.html`, que contam para o contador "N Experimentos";
  - o registro fica em `games_control.json` (`DED_MAKE_CHARACTER`);
  - a página SEO `jogos/ded_make_character.html` é **gerada** por `scripts/generate-game-pages.js` (entrada `'ded_make_character'` em `gamesData`, sobre `templates/game-page-template.html`). Não a edite à mão: mude os dados e rode `node scripts/generate-game-pages.js`.
  - O script regrava as 23 páginas do `gamesData`. No Windows a saída mistura CRLF e LF, e o git passa a mostrar páginas intactas como modificadas: normalize o fim de linha ou restaure as que não deviam mudar.
  - `server.js` serve `/ded_make_character` com `Cache-Control: no-cache` (ES Modules não podem misturar versões após um deploy). Pedidos cujo `Origin` é o próprio `Host` pulam o CORS (`isSameOrigin`): `<script type="module">` manda `Origin` mesmo para a própria origem, e a lista de origens permitidas recusaria os arquivos do app quando o hub roda em outra porta ou domínio.

- **`data/*.json`**: os dados originais, **somente leitura**. São gerados por `tools/sql-to-json.js` a partir do dump do repositório legado (`bkp_07_04_2016.sql`).
  - Formato: `{ table, version, source, autoIncrement, columns, rows }`.
  - Os talentos do Livro do Jogador 3.0 vêm de `tools/talentos-ldj30.json`; a tabela `fichas` é gerada vazia.
  - Nunca edite estes arquivos à mão. Regere com `node ded_make_character/tools/sql-to-json.js <dump.sql>`.
  - Ao mudar o conteúdo, incremente `DATA_VERSION`. As cópias locais antigas passam a ser marcadas como desatualizadas.
  - O conversor não exporta `usuarios`: o dump contém e-mail real e hash de senha. Tabelas removidas entram em `RETIRED_TABLES` (`js/entities/index.js`), que apaga as cópias locais órfãs.
- **`js/core/store.js`**: o store *copy-on-write*.
  - Leituras usam a cópia do `localStorage` (`dmc:v1:<tabela>`) se existir; senão, o JSON original.
  - Na primeira escrita numa tabela, o JSON original dela é copiado para o `localStorage` e a alteração é aplicada na cópia.
  - `autoIncrement` imita o MySQL: nunca reaproveita ids.
  - As escritas são serializadas numa fila; as leituras devolvem cópias defensivas.
  - `restore` / `restoreAll` descartam as cópias.
  - Toda persistência passa por aqui: **nenhum outro módulo toca o `localStorage` diretamente**.
- **`js/entities/*.js`**: um schema declarativo por tabela.
  - `columns`: lista, formatadores `cell`/`text` e flags `desktopOnly`/`mobileOnly`.
  - `sections[].fields`: formulário, com `type`, `required`, `options`, `valueType`, `nullOption`, `visibleWhen`, `validate`, `modifier` etc.
  - `texts`: textos originais das páginas. `names`: rótulos e mensagens.
  - `lookups`: tabelas relacionadas, carregadas no contexto.
  - Hooks opcionais: `sort` e `beforeSave`.
  - **Para mudar um módulo, altere o schema, não os renderizadores.**
- **Tabela × cartões** (`ui/table.js` → `measureTableWidth`/`fitTable`; `pages/crud.js` → `widestRows`/`tableWidthCache`):
  - a lista nunca rola na horizontal;
  - a escolha depende só da largura do contêiner, comparada a um limiar (min-content + 15% até o max-content) medido numa amostra (a linha de texto e a de palavra mais longas por coluna);
  - o limiar fica em cache por versão da tabela, das tabelas relacionadas e das fontes;
  - se, mesmo assim, a tabela não couber, `fitTable` força cartões.
- **`server.js`** serve `/ded_make_character/` com `Cache-Control: no-cache`, para que ES Modules de versões diferentes nunca se misturem.
- **`js/ui/`**: renderizadores genéricos.
  - `form.js`: controles, coerção de tipos e preservação de valores legados em selects.
  - `table.js`: tabela, linha expansível e paginação.
  - Também: shell, diálogo (`<dialog>`), toasts e ícones (sprite SVG inline próprio).
- **`js/pages/`**: `crud.js` (lista e formulário genéricos), `home.js` e `sheet.js` (ficha).
- **Ficha 3.0**: é calculada na hora e nada é gravado.
  - **`js/rules/dnd30.js`**: `computeSheet(personagem, { race, classe, bbaRows, pericias })` devolve todos os valores da ficha.
    - Os atributos cadastrados são **valores base**, somados aos ajustes raciais.
    - Raças do Livro do Jogador (nome ou id 1–7) e classes básicas (nome ou id 1–11) seguem as tabelas 3.0, incluindo as perícias de classe. Onde o compêndio 3.5 difere, elas registram a diferença em `divergencias` e `divergenciasRaca`.
    - Dado ausente (raça, classe, atributo) propaga `null`, e a ficha deixa o campo em branco em vez de inventar um valor. O nível é limitado a 1–20 (`nivelForaDaFaixa`).
    - O campo `iniciativa` é o modificador diverso.
  - **`js/rules/tables30.js`**: tabelas numéricas da 3.0: magias por dia, XP, carga, tamanho, monge, perícias de classe e raças (com idiomas e condicionais de resistência e de combate). É mantido à mão. Fontes e premissas estão na TASK_003, e toda mudança exige ajustar `tests/ded_make_character_rules.test.js`.
  - **`js/rules/choices30.js`**: escolhas pelas regras da 3.0.
    - Perícias: custo 1 ou 2, máximo, meia graduação e exclusivas.
    - Vagas de talento por nível: gerais, guerreiro e mago.
    - Talentos concedidos pela classe e pela raça.
    - Verificador de requisitos, que lê o texto `requisitos`: cada átomo fica atendido (com nível mínimo), não atendido ou "a confirmar".
    - Progressão: emparelhamento talento → vaga por nível.
  - **`js/pages/choices.js`** + **`css/choices.css`**: o popup (`<dialog>`). `openChoicesDialog` devolve `{ result, isDirty, dismiss }`, e a ficha usa a guarda do router enquanto ele está aberto.
  - **Tabela `fichas`** (`AUX_TABLES` em `js/entities/index.js`): as escolhas por personagem, na forma `{ personagem_id, pericias: {id da perícia: graduações}, talentos: [{talento_id, parametro}] }`. `computeSheet(..., { escolhas })` soma as graduações e os efeitos de `T30.efeitosTalentos`.
  - **`css/sheet.css`**: 2 páginas A4 de largura fixa (794 × 1123 px), reduzidas com `zoom` em telas estreitas. `@media print` imprime só a ficha. Fontes livres no lugar das originais: Scala Sans → Alegreya Sans e Alegreya Sans SC; Celestia Antiqua → Alegreya; Pterra → Grenze e Marcellus SC.
- **`js/core/`**:
  - `router.js`: hash router com guarda assíncrona para formulários com alterações não salvas;
  - `listing.js`: busca, ordenação e a paginação que reproduz o `CI_Pagination`;
  - `validation.js`, `format.js` e `dom.js` (template `html```, que escapa interpolações; use `raw()` só para markup confiável).
- **`css/`**: `tokens.css` (paleta "Grimório", tipografia Cinzel / Alegreya / Alegreya Sans, contraste AA medido), `base.css` (shell e gaveta), `components.css` e `pages.css`.

## 🧩 Padrões de Projeto Aplicados

- **Repository / Copy-on-Write**: o store isola a origem dos dados (JSON versus `localStorage`) do resto do app.
- **UI orientada a schema**: as páginas genéricas interpretam os schemas das entidades, então todos os módulos têm o mesmo comportamento (busca, paginação, validação, foco, estados vazios).
- **Observer**: `store.subscribe` atualiza as contagens e o status dos dados na sidebar. O evento `storage` sincroniza várias abas.

## 🧪 Testes

- `node tests/ded_make_character_store.test.js`: unitário do store (Node puro, importa o ESM de `js/`, habilitado por `js/package.json`).
- `node tests/ded_make_character_listing.test.js`: busca, ordenação e paginação.
- `node tests/ded_make_character_rules.test.js`: motor de regras 3.0 da ficha.
- `node tests/ded_make_character_choices.test.js`: escolhas de perícias e talentos (vagas, pontos, requisitos e progressão).
- `NODE_ENV=test node tests/qa_ded_make_character.test.js`: E2E Puppeteer com a jornada completa. Sem `NODE_ENV=test`, o `server.js` tenta ocupar a porta 3000.
- Ganchos de teste: `window.__dmc = { store, router }`.
