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
- `TASKS/TASK_006.md`: **simulador de combate** (Arena), com as 8 etapas prontas. Feitos o catálogo `data/catalogo-combate.json`, o motor de combate (E1 a E3), os personagens do jogador com equipamento (E4), a tela `#/arena` (E5), a simulação em lote (E6), as magias dos seus personagens (E7) e o equipamento na ficha impressa (E8).
- `TASKS/TASK_007.md`: a **Retribuição** do Paladino de Arton no motor (efeito `retribuicao`) e o ND acima de 20 para Holy Avenger, com a faixa "ND 21 ou mais" na Arena.
- `TASKS/TASK_008.md`: o catálogo de Holy Avenger com as **fichas oficiais do livro *Tormenta D20 – Holy Avenger***: 54 entradas, uma por versão de cada personagem (as 6 do Paladino, as 5 de Lisandra…), com ND fracionário e teto 80.
- `TASKS/TASK_009.md`: **IA de combate com rede neural**, em etapas. Pronta: 2.058.966 lutas em 3 gerações, as redes treinadas em PyTorch e a avaliação no conjunto de teste (§12). Na Arena, "Treinada (experimental)" usa só a rede de recursos (+12,2 p.p. de vitória nos confrontos com magias ou poderes), com δ = 0,20.

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
- **`data/catalogo-combate.json`**: a exceção à regra acima. É o catálogo do simulador de combate, **mantido à mão** e fora do formato de tabela do store.
  - Traz 20 monstros do SRD 3.0 (ND 1–20, Tarrasque no 20) e 54 fichas de Holy Avenger, do livro *Tormenta D20 – Holy Avenger* (as fichas são Open Game Content; nomes e históricos, não: os textos do catálogo são reescritos). Só Holy Avenger passa do ND 20 (até o 55) ou tem ND fracionário (1/2).
  - Formato em `tools/catalogo-combate.md`. Ao mudar o conteúdo, incremente `versao` e valide com `node ded_make_character/tools/validar-catalogo.js`, que também é usado por `tests/ded_make_character_catalogo.test.js`.
  - O vocabulário de efeitos (`EFEITOS` no validador) é a fonte única. Ao mudá-lo, rode `node ded_make_character/tools/gerar-tabela-efeitos.js` para regravar a tabela do formato; o teste falha se as duas divergirem.
  - Números vêm do SRD 3.0 (dragon.ee); textos são próprios. Nos personagens de Holy Avenger, `adaptacao` separa o que é oficial do que foi adaptado.
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
- **`js/pages/`**: `crud.js` (lista e formulário genéricos), `home.js`, `sheet.js` (ficha) e `arena.js` (simulador).
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
  - **Tabela `fichas`** (`AUX_TABLES` em `js/entities/index.js`): as escolhas por personagem, na forma `{ personagem_id, pericias: {id da perícia: graduações}, talentos: [{talento_id, parametro}], equipamento, magias }` (o equipamento e as magias são da Arena, TASK_006 E4 e E7). `computeSheet(..., { escolhas })` soma as graduações e os efeitos de `T30.efeitosTalentos`.
  - **Simulador de combate** (TASK_006):
    - `js/rules/dice.js`: dados com semente (mulberry32) e `scriptedRng` para testes;
    - `js/rules/combat30.js`: o motor. `fromCatalog` gera a ficha de combate; `createBattle`, `nextTurn`, `nextRound` e `runBattle` rodam a luta; `criarLote` roda a mesma luta N vezes em fatias (a tela), e `simulate` de uma vez; `rules` expõe as regras;
    - **IA** (TASK_009):
      - `createBattle({ politicas: { A, B } })` troca a IA de um lado por uma função `(b, c, IA) → ação`; sem ela, vale a IA clássica (`decidir`). `IA.candidatas` lista todas as ações legais contra todos os alvos (`candidatas()`, com a escolha clássica marcada), e `IA.classica` é a escolha clássica.
      - A IA clássica tem de continuar idêntica: `node ded_make_character/tools/ia/registro-referencia.mjs comparar <arquivo> [--eco]` compara 12.952 lutas evento a evento com um registro gravado antes da mudança (`gravar`).
      - `tools/ia/personagens.mjs` monta personagens fora do navegador, pelo caminho da Arena. `tests/ded_make_character_ia.test.js` roda uma amostra;
      - `js/rules/ia30.js`: perfis (`perfilDe`), entradas da rede (`entradasDaDecisao`; mudar as entradas exige subir `VERSAO_ENTRADAS`), teto de candidatas, inferência (`criarRede`) e a política `politicaRede`. `tools/ia/medir-custo.mjs` mede o custo por decisão;
      - o treino (fora do app, TASK_009 §5–§7): `tools/ia/gerar-lutas.mjs` (lutas por ramificação em workers: `personagens-sinteticos.mjs`, `confrontos.mjs`, `ramificacao.mjs`), `tools/ia/treinar.py` (PyTorch; o Python só existe nestas ferramentas, o app e o CI não dependem dele), `tools/ia/paridade.py` (gera `tests/fixtures/ia-paridade.json`) e `tools/ia/avaliar.mjs` (o espelho). Os dados ficam fora do repositório (`D:/Users/Home/Documents/ded-ia-dados`). A opção `createBattle({ rngPorCombatente })` existe para o gerador;
    - `js/rules/combat30-specials.js`: as habilidades especiais do vocabulário do catálogo, chamadas pelo núcleo por ganchos. Não importa o núcleo: recebe `K` (= `rules`);
    - as regras seguem a 3.0 e o §5 da TASK_006; as aproximações da distância abstrata estão no §8.1. Toda mudança exige ajustar `tests/ded_make_character_combate.test.js`, que fixa os dados com `scriptedRng`;
    - **Arena** (`#/arena`, §8.2 da TASK_006): `js/pages/arena.js` + `css/arena.css`. A rota vem antes de `/:module` no `app.js`, e o item do menu vem de `NAV_PAGES` (`js/entities/index.js`).
      - A montagem da luta fica só na URL (`?a=ogro*2,p:1&b=troll&semente=…`, `js/pages/arena-setup.js`); `p:<id>` é um personagem do jogador, que entra uma vez por lado.
      - Os personagens vêm do store e passam por `js/rules/personagem30.js` (`fromPersonagem`: ficha 3.0 + equipamento + talentos → ficha de combate no formato de `fromCatalog`). As armas, armaduras, proficiências e kits por classe ficam em `js/rules/equipamento30.js`, e o diálogo em `js/pages/arena-equipamento.js`. O equipamento é gravado em `fichas.equipamento` (merge), e a ficha sem equipamento usa o kit da classe.
      - O `app.js` recarrega a Arena no evento `external` (outra aba) e em "Restaurar tudo" só na montagem. Com luta em andamento ou diálogo aberto (`cleanup.ocupada()`), marca a recarga (`cleanup.adiar()`), que acontece ao voltar à montagem ou ao fechar o diálogo; o reload na hora apagaria a luta. Ao salvar o equipamento ou as magias (`salvarNaFicha`), a Arena relê o personagem e as fichas do store e não grava se ele mudou ou sumiu.
      - O catálogo é lido por `fetch`, uma vez por sessão.
      - A dica de dificuldade usa o nível de encontro da 3.0 (`js/rules/encontro30.js`).
      - A IA de cada lado (TASK_009 §8): "Clássica" ou "Treinada", na URL como `ia=A:rede`. `js/pages/arena-ia.js` busca a rede de `data/ia/rede-recursos.json` (`PERFIS_DA_ARENA`; gerada por `tools/ia/treinar.py`, não edite à mão) só quando algum lado usa a treinada, e monta as políticas; os combatentes marciais e a falta da rede ficam com a clássica (com aviso). A margem δ padrão é `DELTA_PADRAO` (0,20) em `ia30.js`, calibrada no espelho da validação; trocar a rede pede calibrar de novo (`tools/ia/avaliar.mjs`). Na luta assistida, o "por que" de cada decisão da rede vai no registro (tipo `ia`).
      - As magias (E7, §8.5 da TASK_006) vêm de `js/rules/magias30.js`: a lista curada de 22 magias do Livro do Jogador 3.0, com a URL do SRD 3.0 e a mecânica calculada pelo nível de conjurador, os espaços do dia (os de `spellcasting()`), a preparação padrão e `magiasDeCombate`, que monta `ficha.magias` no formato do catálogo com os espaços por nível (`espacos` e `espaco` de cada magia). O diálogo fica em `js/pages/arena-magias.js`, e a escolha é gravada em `fichas.magias` (merge): `{ preparadas: { "1": { id: quantas } } }` ou `{ conhecidas: [ids] }`, normalizada ao ler. Toda mudança nas fórmulas exige ajustar `tests/ded_make_character_magias.test.js`, que confere o nível de cada classe com a linha "Level:" do SRD.
      - A simulação em lote (E6) roda `criarLote` em fatias de ~12 ms com `setTimeout` e redesenha só a seção dela (`atualizarLote`). Mudar a montagem, o equipamento ou as magias cancela o lote. O lote não segura a recarga: o evento de outra aba e "Restaurar tudo" o cancelam e recarregam (`cleanup.loteRodando()` entra no aviso).
  - **Equipamento na ficha** (E8, §8.6 da TASK_006): `sheet.js` chama `fromPersonagem` e desenha `naFicha` (CA com armadura e escudo, deslocamento, penalidades, blocos de arma, armadura e escudo), com as mesmas contas da Arena (`caComEquipamento`, `deslocamentoComArmadura`, `penalidadeDoItem`). Os pesos vêm de `peso_lb` nas tabelas de `equipamento30.js` (`pesoKg`).
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
- `node tests/ded_make_character_catalogo.test.js`: formato do catálogo de combate, pelo validador, com erros plantados.
- `node tests/ded_make_character_combate.test.js`: motor de combate 3.0, com os dados fixados.
- `node tests/ded_make_character_arena.test.js`: nível de encontro e montagem da Arena na URL.
- `node tests/ded_make_character_personagem.test.js`: adaptador de personagem e equipamento 3.0 (CA, ataques, duas armas, monge, classes, proficiências).
- `node tests/ded_make_character_magias.test.js`: magias dos personagens (fórmulas do SRD 3.0, espaços, preparação, conversão, falha arcana, e o que o motor faz com cada uma).
- `NODE_ENV=test node tests/qa_ded_make_character.test.js`: E2E Puppeteer com a jornada completa. Sem `NODE_ENV=test`, o `server.js` tenta ocupar a porta 3000.
- Ganchos de teste: `window.__dmc = { store, router }`.
