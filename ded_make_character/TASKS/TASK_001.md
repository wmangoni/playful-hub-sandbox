# 🐉 Tarefa 001 - D&D Make Character: Migração do sistema legado (CodeIgniter/MySQL) para o Playful Hub

**Status**: 🚀 Dev Complete
**Responsável**: —
**Branch**: `feat/ded-make-character` (worktree isolado, criado a partir de `feat/sprint-5`)
**Origem**: repositório `D-D-Make-Character` (CodeIgniter 3.0.6 + MySQL, 2016–2021)

---

## 🔍 1. Análise do Product Owner (PO)

O **D&D Make Character** foi criado para ser um **simulador de combate fiel às regras de D&D**. Chegou a ter todo o gerenciamento de dados do sistema (classes, raças, perícias, talentos, personagens, tipos de requisito e usuários), mas o simulador de combate nunca foi feito. A stack (PHP 5 + CodeIgniter 3.0.6 + MySQL + Bootstrap 3/jQuery 2) está defasada e não roda no Playful Hub, que é estático e não tem banco de dados.

Esta tarefa **migra o que existe**, com duas mudanças apenas:

1. **Acesso aos dados.** Os dumps SQL viram arquivos JSON somente-leitura. Toda escrita acontece numa **cópia no `localStorage`** (copy-on-write). O usuário continua com a mecânica de um banco de dados (listar, criar, editar e excluir) e os dados originais do servidor nunca mudam.
2. **Visual.** Todo o HTML, CSS e JS antigo é descartado e recriado com identidade de **RPG medieval**, limpa e moderna.

Todas as outras mecânicas continuam iguais: mesmos módulos, mesmos campos, mesmos obrigatórios, mesmas opções e mesma paginação. Os poucos desvios são **correções de defeitos objetivos do original** (erros fatais, perda de dados, textos copiados de outro módulo). Cada um está listado na seção 7.

### 1.1 Decisões do usuário (26/09/2026)

| Tema | Decisão |
| :--- | :--- |
| Login e usuários | **Remover o login.** O acesso aos módulos é direto. O módulo Usuários continuou como cadastro (CRUD) sem autenticação até a [TASK_003](TASK_003.md), que o removeu. |
| Onde trabalhar | **Worktree + branch nova** (`../playful-hub-sandbox-ded-forge`, `feat/ded-make-character`), sem colidir com o trabalho em andamento na `feat/sprint-5`. |
| Execução | Implementar direto, validar no navegador a cada etapa e fazer revisão rigorosa por subagente até a aprovação. |

---

## 🎯 2. Objetivo e escopo

### 2.1 Migra (paridade funcional)
- **Módulos CRUD**: Personagens, Classes, Talentos, Perícias, Raças, Tipos de Requisito (removido na TASK_002), Usuários (removido na TASK_003).
- **Home**, com os textos de boas-vindas originais.
- **Listas paginadas**: 20 por página, com os mesmos `num_links` (5 ou 2), Primeira, Última, anterior e próxima.
- **Busca por coluna.** A barra existia em todas as listas mas nunca funcionou; agora é implementada conforme a intenção original (ver 7.1).
- **Linha expansível** com os pré-requisitos da classe. Era a única expansão que funcionava.
- **Painel condicional "Requisitos"** no formulário de Classes: aparece quando o tipo não é "Básica".

### 2.2 Dados preservados sem UI (para o futuro simulador de combate)
- `bba.json`: tabela de Bônus Base de Ataque por nível (1–20) × 11 classes.
- `magias.json`: magias por dia por classe (única linha, formato `{nível:qtd}`).

### 2.3 Não migra
| Item | Motivo |
| :--- | :--- |
| HTML, CSS, JS e imagens antigos (`assets/img/*`, fontes, Bootstrap/jQuery) | O visual será recriado. Várias imagens são arte de terceiros de licença duvidosa (capas de jogos, wallpapers). |
| Login, sessão, "Sair", "Esqueci a senha", "Lembre-me" | Decisão do usuário (1.1). |
| Módulo **Requisitos** | Nunca funcionou: não tem tabela, views nem link. |
| **Magias** (menu) | Os links eram `#`; o módulo não existe. O dado fica preservado (2.2). |
| Itens mortos (`#`): Notifications (badge "5"), Exportar, Configurações, Perfil, Alterar senha, Suport, coluna "Settings" | Não tinham destino. |
| `home/teste` (modal de teste), `usuarios/profile.php` (mock), `Welcome`, `Blog`, `posts.php`, `lista.php` | Eram experimentos ou sobras do scaffold. |
| Gráfico de barras da Home (Creativity 92%…) e link "Guia do usuário" | Enchimento de template; o link apontava para a documentação do CodeIgniter. |

---

## 🧱 3. Arquitetura

### 3.1 Stack
- **Vanilla HTML5 + CSS3 + ES Modules**, sem bundler, frameworks, jQuery ou CDN de ícones. Segue a RFC-042 do hub ("Zero Framework Bloat").
- Único recurso externo: Google Fonts (Cinzel, Alegreya, Alegreya Sans), já permitido na CSP do `server.js`.
- **Roteamento por hash** (`#/racas/3/editar`), que funciona em hospedagem estática sem configurar o servidor.

### 3.2 Estrutura de arquivos
```
ded_make_character/
├── index.html                 # Shell da aplicação (landmarks, fontes, entrada do módulo)
├── CLAUDE.md                  # Arquitetura e padrões (convenção do hub)
├── TASKS/TASK_001.md          # Esta especificação
├── data/*.json                # Dados originais (somente leitura), gerados do dump
├── tools/sql-to-json.js       # Conversor dump MySQL → JSON (Node)
├── css/
│   ├── tokens.css             # Paleta, tipografia, espaçamento, sombras, movimento
│   ├── base.css               # Reset, fundo, shell (sidebar/gaveta), responsivo
│   ├── components.css         # Botões, tabela, formulário, badges, paginação, diálogo, toasts…
│   └── pages.css              # Home e ajustes por página
└── js/
    ├── package.json           # {"type":"module"}, permite testar os módulos no Node
    ├── app.js                 # Bootstrap: store, router, shell, eventos globais
    ├── core/                  # store.js, router.js, listing.js (busca e paginação), validation.js, dom.js, format.js
    ├── entities/              # Um schema declarativo por tabela (lista, formulário, textos)
    ├── ui/                    # icons.js, shell.js, page.js, table.js (tabela e paginação), form.js, dialog.js, toast.js
    └── pages/                 # home.js, crud.js (lista, formulário, não encontrado)
jogos/ded_make_character.html  # Página SEO wrapper (padrão do hub)
tests/ded_make_character_store.test.js   # Unitário do store (Node)
tests/qa_ded_make_character.test.js      # E2E Puppeteer (jornada completa)
```

### 3.3 Camada de dados: store copy-on-write (`js/core/store.js`)

```
            leitura                                   escrita (insert/update/remove)
 UI ───────────────► existe cópia local? ──sim──► lê localStorage
                          │ não                        │
                          ▼                            ▼
                 fetch data/<tabela>.json     existe cópia local? ──não──► copia o JSON original
                 (cache em memória)                    │ sim                 para o localStorage
                                                       ▼                            │
                                             aplica a alteração na cópia ◄─────────┘
                                             e grava (atômico: falhou = nada muda)
```

- **Granularidade por tabela.** Só a tabela alterada é copiada; as demais continuam sendo lidas do original.
- **Chave**: `dmc:v1:<tabela>` → `{ table, seedVersion, autoIncrement, copiedAt, updatedAt, rows }`.
- **AUTO_INCREMENT fiel ao MySQL.** Parte do `AUTO_INCREMENT=` do dump (ex.: classes = 16) e nunca reaproveita ids excluídos.
- **Escritas serializadas** numa fila, para que duas operações não partam do mesmo rascunho.
- **Leituras devolvem cópias defensivas.** A UI não consegue mutar o estado interno.
- **Falhas tratadas**:
  - Quota cheia ou storage bloqueado → `StoreError('WRITE_FAILED')` e nada é alterado.
  - Cópia corrompida → descartada, com aviso, e o original volta a ser usado.
  - Sem `localStorage` (modo privado restrito) → modo em memória (`persistent = false`) com aviso na UI.
- **Restaurar originais**, por tabela ou tudo: remove a cópia local.
- **Várias abas**: o evento `storage` notifica o store e a tela atual é recarregada.
- **Versão do seed.** Se `data/*.json` mudar de `version`, a cópia local é marcada como `outdated` e a UI oferece restaurar.

API: `all, get, count, insert, update, remove, info, isModified, modifiedTables, restore, restoreAll, handleExternalChange, subscribe`.

### 3.4 Conversão dos dados (`tools/sql-to-json.js`)
- **Fonte**: `bkp_07_04_2016.sql`. Apesar do nome, é o dump mais completo (15 classes em vez de 11) e o único com os nomes de tabela usados pelo código (`personagens`, `usuarios`, `tipo_requisito`).
- **Parser próprio** de `CREATE TABLE` (colunas + `AUTO_INCREMENT`) e `INSERT` (escapes `\'`, `\\`, `\r\n`, `''`, NULL e números).
- **Correção de import**: o INSERT de personagens usa a tabela antiga `personagem` e falhava no MySQL. O conversor mapeia para `personagens`, e o personagem "Jonh" passa a existir.
- **Normalização**: `\r\n` vira `\n` (os requisitos das classes de prestígio).
- **🔒 Sanitização de `usuarios`** (até a TASK_003, que deixou de exportar a tabela): o dump tem e-mail real e hash md5 da senha. O registro vira a conta demo "Mestre do Jogo" (`mestre@exemplo.com`), sem senha. **Nenhum dado pessoal vai para o hub.**
- **Saída**: `{ table, version, source, autoIncrement, columns, rows }` por tabela.

| Tabela | Linhas | AUTO_INCREMENT |
| :--- | ---: | ---: |
| classes | 15 | 16 |
| races | 7 | 8 |
| pericias | 45 | 46 |
| talentos | 246 | 247 |
| personagens | 1 | 2 |
| tipo_requisito | 0 | 2 |
| usuarios | 1 (sanitizado; não exportado desde a TASK_003) | 2 |
| bba | 20 | 21 |
| magias | 1 | — |

### 3.5 UI declarativa
Cada tabela tem um **schema** em `js/entities/<tabela>.js`:
- textos da página (título, subtítulo, descrição originais);
- colunas da lista, com formatadores;
- campos do formulário: tipo, rótulo, placeholder, opções, `required`, validações e layout em grid de 12 colunas;
- regras condicionais (ex.: requisitos da classe).

Os renderizadores genéricos (`ui/table.js`, `ui/form.js`) garantem que todos os módulos se comportem igual: paginação, busca, estados vazios, erros e foco.

---

## 🎨 4. Identidade visual: "Grimório do Aventureiro"

- **Conceito**: grimório de couro escuro à luz de vela. Fundo quase preto e quente, painéis como capas de couro, filetes e detalhes em **ouro velho**, texto cor de pergaminho. Ornamentos discretos (losangos, filetes duplos, glifo d20). Nada de texturas pesadas ou fotos.
- **Paleta**. Os contrastes medidos passam no WCAG AA:

| Token | Cor | Uso | Contraste mínimo |
| :--- | :--- | :--- | ---: |
| `--bg` | `#0e0c0a` | fundo | — |
| `--surface-1` a `-4` | `#16130f` → `#302820` | painéis, campos, hover | — |
| `--text` | `#ede4d0` | texto | 12.8:1 |
| `--text-muted` | `#b6a98d` | texto secundário | 6.9:1 |
| `--text-dim` | `#978a71` | rótulos terciários | 4.7:1 |
| `--gold` | `#d4b26a` | acento, links, ativo | 8.0:1 |
| `--ember` | `#d9695b` | erro, excluir | 4.7:1 |
| `--verdant` | `#7fbf95` | sucesso, bônus positivo | 7.5:1 |
| `--arcane` | `#a996e6` | prestígio/épico, pré-requisitos | 6.3:1 |

- **Tipografia**:
  - **Cinzel** (capitulares romanas) para títulos, marca e cabeçalhos de tabela.
  - **Alegreya Sans** para a interface.
  - **Alegreya** itálico para textos de "lore": descrições e requisitos.
- **Iconografia**: sprite SVG inline próprio, em traço (d20, castelo, espadas cruzadas, livro, escudo, pergaminho, faíscas…). Nada de Font Awesome.
- **Componentes**:
  - sidebar com grupos ("Aventura", "Compêndio", "Mesa"), contagem de registros e item ativo com barra dourada;
  - cabeçalho de página ornamentado;
  - tabela com cabeçalho fixo que vira cartões no celular;
  - badges de tipo e atributo;
  - matriz de perícias de classe com marcadores;
  - formulário em grid com validação inline e resumo de erros;
  - `<dialog>` nativo para confirmar exclusões;
  - toasts;
  - skeletons de carregamento;
  - estados vazios ilustrados.
- **Responsivo**. Abaixo de 1024px a sidebar vira gaveta (hambúrguer + scrim, fecha com Esc). Abaixo de 720px as tabelas viram cartões. Sem rolagem horizontal da página.
- **Acessibilidade**:
  - landmarks, skip-link e foco visível dourado em tudo;
  - `aria-current` na navegação;
  - erros ligados por `aria-describedby`;
  - toasts em `aria-live`;
  - foco movido para o `<h1>` a cada navegação;
  - `prefers-reduced-motion` respeitado;
  - alvos de toque ≥ 36–44px.

---

## 🧭 5. Rotas

| Rota (hash) | Tela |
| :--- | :--- |
| `#/` | Home |
| `#/<módulo>` | Lista. Query: `?pagina=N&campo=<coluna\|todos>&q=<termo>` |
| `#/<módulo>/novo` | Formulário de criação |
| `#/<módulo>/<id>/editar` | Formulário de edição. Id inexistente → tela "Registro não encontrado" |

Módulos: `personagens`, `classes`, `talentos`, `pericias`, `racas`; `tipos-requisito` (removido na TASK_002) e `usuarios` (removido na TASK_003) hoje dão 404. Rota desconhecida → tela 404 temática. A TASK_003 acrescentou `#/personagens/<id>/ficha`.

---

## 📐 6. Especificação por módulo (paridade)

Legenda: **(req)** = `required` no original. A ordem dos campos é a do original.

### 6.1 Classes (`classes`)
- **Textos**:
  - lista: "Lista de Classes D&D 3.5" / "Aqui você encontra todas as classes disponíveis para seu personagem!"
  - criar: "Crie uma Classe" / "Mas não seja muito apelão, pois o Mestre não gosta!!!"
  - editar: "Altere os campos necessários para melhorar essa classe!!!"
- **Lista**: ID · Nome da Classe (expande "Pré-requisitos" quando houver) · Dados de Vida · Tipo de Bônus Base de Ataque · Tipo de Classes · Resistência. 20 por página, num_links 5.
- **Formulário**:

| Campo | Controle | Obrigatório | Opções |
| :--- | :--- | :--- | :--- |
| Nome | texto | (req) | — |
| Dados de Vida | select | (req) | 4, 6, 8, 10, 12 |
| Tipo de Bônus Base de Ataque | select | (req) | bom, medio, ruim |
| Tipo da Classe | select | (req) | Básica, Prestígio, Épica |
| Requisitos | textarea, só visível quando o tipo não é "Básica" | não | — |
| Resistência | select | (req) | fort, ref, von, fort/ref, fort/von, ref/von, fort/ref/von |

Os valores gravados são idênticos aos originais; os rótulos exibidos são amigáveis (ex.: "fort/von" → "Fortitude / Vontade").

### 6.2 Raças (`races`)
- **Lista**: ID · Nome da Raça · Bônus ("+2 CON") · Desvantagem ("−2 CAR") · Tamanho · Classe Favorecida. A classe aparece **pelo nome**; o original mostrava o id.
- **Formulário**:

| Campo | Controle | Obrigatório | Opções |
| :--- | :--- | :--- | :--- |
| Nome | texto | (req) | — |
| Bônus | número | não | — |
| Atributo bônus | select | não | FOR, DES, CON, INT, SAB, CAR |
| Desvantagem | número | não | — |
| Atributo desvantagem | select | não | FOR, DES, CON, INT, SAB, CAR |
| Tamanho | select | (req) | Mínimo, Minúsculo, Pequeno, Médio, Grande, Enorme, Imenso, Colossal |
| Classe Favorecida | select | (req) | "Qualquer uma" (gravado como `null`) + todas as classes da tabela |

### 6.3 Perícias (`pericias`)
- **Lista**: ID · Nome · Atributo · Sem treinamento · matriz das 11 classes (Bár, Brd, Clé, Dru, Gue, Mon, Pal, Ran, Lad, Fei, Mag) com marcador quando é perícia de classe. No celular, chips com os nomes das classes.
- **Formulário**:

| Campo | Controle | Obrigatório | Opções |
| :--- | :--- | :--- | :--- |
| Nome | texto | (req) | — |
| Atributo | select | não | FOR, DES, CON, INT, SAB, CAR, N/A |
| Sem treinamento | select | não | S, N |
| Perícia de classe para… | grade de 11 checkboxes (gravam 0/1) | — | Bárbaro, Bardo, Clérigo, Druida, Guerreiro, Monge, Paladino, Ranger, Ladino, Feiticeiro, Mago |

### 6.4 Talentos (`talentos`)
- **Lista**: ID · Nome do Talento · Tipo (badges; "DIVINO, ÉPICO" vira dois) · Requisito (nome do tipo de requisito) · Benefício · Normal. **Ordenada por nome (A→Z)**, como o `ORDER BY nome ASC` original. num_links 2.
- **Formulário**:

| Campo | Controle | Obrigatório | Detalhes |
| :--- | :--- | :--- | :--- |
| Nome | texto | (req) | — |
| Tipo de talento | texto livre | não | placeholder "Ex: Divino, Normal, etc..."; sugestões dos tipos já usados |
| Requisitos | select | não | "Nenhum" + a tabela `tipo_requisito`; grava o id |
| Benefício | textarea | não | — |
| Normal | textarea | não | — |

### 6.5 Personagens (`personagens`)
- **Lista**: ID · Nome · Raça · Classe · Nível · Tendência · FOR · DES · CON · INT · SAB · CAR · Iniciativa · PVs. Raça, classe e tendência aparecem **pelo nome**. A linha expande "Detalhes" com Divindade, Idade, Sexo, Altura, Peso, Olhos e Cabelos, para que todos os 21 dados continuem visíveis sem uma tabela de 22 colunas.
- **Formulário**: todos os campos são **(req)**, como no original.

| Campo | Controle | Opções / valor gravado |
| :--- | :--- | :--- |
| Nome | texto | — |
| Raça | select dinâmico da tabela de raças | id |
| Classe | select dinâmico da tabela de classes | id |
| Tendência | select | 9 tendências, gravadas como código de 2 letras (LB, NB, CB, LN, N, CN, LM, NM, CM), compatível com `VARCHAR(2)` e com o seed ("NB") |
| Divindade | texto | — |
| Nível | número | — |
| Idade | número | — |
| Sexo | select | M, F (`VARCHAR(1)`) |
| Altura | número decimal | — |
| Peso | número | — |
| Olhos | texto | — |
| Cabelos | texto | — |
| Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma | número | — |
| Iniciativa | número | — |
| PVs | número | — |

- `jogador_id` não aparece no formulário (igual ao original) e **é preservado** nas edições.

### 6.6 Tipos de Requisito (`tipo_requisito`)
> **Removido na [TASK_002](TASK_002.md).** Os pré-requisitos dos talentos passaram a ser um campo de texto no próprio talento, e o módulo abaixo deixou de existir.

- **Lista**: ID · Nome.
- **Formulário**: Nome (req).
- O seed está vazio, então a lista abre no estado vazio, com CTA.

### 6.7 Usuários (`usuarios`)
> **Removido na [TASK_003](TASK_003.md).** Sem login, "o usuário é a pessoa que abrir o site": o módulo abaixo deixou de existir e a tabela não é mais exportada.

- **Lista**: ID · Nome · Email · Data de nascimento · Criado em · Atualizado em. Estes são os dados que as células originais mostravam; os cabeçalhos originais tinham sido copiados de Raças.
- **Formulário**:

| Campo | Controle | Validação |
| :--- | :--- | :--- |
| Nome | texto | (req); mais de 3 caracteres, senão "Nome inválido" |
| Email | email | formato válido, senão "Email inválido" |
| Data de nascimento | data | anterior a hoje, senão "Idade inválida" |
| Status | select | Ativo (1) / Inativo (0) |

- As validações são as mensagens e regras dos setters do `Model_usuarios` original.
- `created_at` é preenchido ao criar e `updated_at` ao editar.
- A coluna `senha` não tem campo, igual ao formulário original, e o login foi removido.

### 6.8 Home
- **Título**: "Bem vindo ao D&D Make Character!"
- **Textos originais**: "Este sistema permite a você criar de forma rápida e intuitiva um personagem do zero usando todas as regras do aclamado D&D 3.0".
- **No lugar do gráfico decorativo**: cartões do compêndio com a contagem de cada tabela, atalhos para cadastrar, e um painel explicando que os dados originais são somente leitura, com o status da cópia local.

---

## 🩹 7. Desvios intencionais do original

### 7.1 Correções de defeitos
| # | Original | Novo |
| :--- | :--- | :--- |
| D1 | A busca nunca enviava nada: não havia form nem handler, e `busca()` dava erro fatal. | Filtro por coluna ou "Todos os campos" (o `search_param` padrão era `all`). O termo é buscado como "contém", sem diferenciar maiúsculas nem acentos. Está em todas as listas, que já incluíam a barra. |
| D2 | O módulo Usuários dava erro fatal em create, edit, insert e update. | O CRUD funciona com os campos e validações que o model pretendia. |
| D3 | Editar uma raça apagava a classe favorecida (mapa nome→id com "Bárbaro " com espaço, e as classes 14 e 15 ausentes). | Select dinâmico por id; nada se perde. |
| D4 | Editar um talento sobrescrevia benefício e normal com "Benefícios" e "Normal" (a textarea usava `value=`). | Os campos são pré-preenchidos corretamente. |
| D5 | `talentos.pre_requisito_id` recebia um nome e o MySQL gravava 0. | Grava o id do tipo de requisito e a lista mostra o nome. |
| D6 | As atualizações gravavam NULL em colunas não enviadas (ex.: `jogador_id`). | A atualização faz merge; colunas fora do formulário são preservadas. |
| D7 | Personagens: raça e classe fixas no código (13 de 15 classes), `var_dump` na atualização, `divindade` INT truncando nomes, tendência cortada para 2 letras ("Le"). | Selects dinâmicos, tendência por código e divindade como texto. |
| D8 | Editar um id inexistente dava o erro "Unable to load the requested file: .php". | Tela "Registro não encontrado" com botão para voltar à lista. |
| D9 | O "Page X of Y" errava da 3ª página em diante (`offset/10`) e mostrava "Page 1 of 0" com a lista vazia. | Contagem correta; lista vazia mostra estado vazio. |
| D10 | O botão "Create New" de Tipos de Requisito levava a um 404 (`tipos_requisito/create`). | Link correto. |
| D11 | A lógica do painel Requisitos era desencontrada (testava o valor atual para Prestígio e o texto clicado para Épica). | Regra única: visível quando o tipo não é "Básica". |
| D12 | O `<title>` era "RPG - " em quase todas as páginas (o `page_title` se perdia). | Título por página: "Raças · D&D Make Character". |
| D13 | Tendência: a lista tinha 7 das 9 tendências de D&D (faltavam Leal e Neutro e Caótico e Neutro), e o valor era truncado para 2 letras. | As 9 tendências na ordem canônica (LB, NB, CB, LN, N, CN, LM, NM, CM), gravadas como código compatível com `VARCHAR(2)` e com o seed ("NB"). |

### 7.2 Textos corrigidos (erros de digitação e copy-paste; nenhum valor gravado muda)
- "mehorar" → "melhorar"; "Dextreza" → "Destreza"; "Druída" → "Druida"; "Fiticeiro" → "Feiticeiro"; "Colosal" → "Colossal"; "Lista de races" → "Lista de raças"; "Bem vindo" → "Bem-vindo"; "permite você a criar" → "permite a você criar".
- Acentuação e concordância: "pericias" → "perícias" (lista, descrição e "Crie uma perícia"); "todos os tipo de requisitos" → "todos os tipos de requisitos"; "Crie uma Personagem" → "Crie um Personagem"; "Crie uma talento" → "Crie um talento".
- Subtítulo "Crie sua Classe" em Raças → "Crie sua Raça".
- **Usuários**: todos os textos do original eram cópias de Raças ("Raças :: criar", "Crie sua Classe", "…aprimorar esta raça!!!", "…usuarios disponíveis para seu personagem!"). Foram reescritos:
  - lista: "Aqui você encontra todos os usuários cadastrados na mesa!";
  - criar: "Crie um Usuário" / "Cadastre os jogadores da sua mesa.";
  - editar: "Altere os campos necessários deste usuário!!!".
- Rótulos amigáveis nos selects (ex.: "fort/von" aparece como "Fortitude / Vontade"; Dados de Vida como "d8"). Os **valores gravados** continuam os do original.
- Legenda "Nova Raça" em Perícias → "Nova Perícia"; em Tipos de Requisito → "Novo Tipo de Requisito".
- Placeholder "Nome da Classe" em outros módulos → o nome do módulo certo.
- Rótulos trocados em Perícias ("Bônus" / "Atributo bônus") → "Atributo" / "Sem treinamento".

### 7.3 Modernizações de controle (mesmos dados e mesmos obrigatórios)
- O widget "input + dropdown Selecione" vira **select** quando o domínio é fechado:
  - DV, tipo de BBA, tipo, resistência, atributos, tamanho, S/N, status, tendência e sexo.
  - Se um registro legado tem um valor fora da lista (ex.: "Medio" sem acento), ele é **casado ignorando acentos**. Se não casar, aparece como opção extra "(valor legado)", para nunca perder dado.
- Colunas `INT`/`FLOAT` usam input numérico. O MySQL sem strict mode truncava texto em silêncio.
- Flags 0/1 de perícia de classe viram checkboxes. O `required` que o original tinha em 6 das 11 flags era artefato de copy-paste: 0 é um valor válido.
- **Excluir pede confirmação** num `<dialog>` (o original apagava direto via GET).
- **Feedback por toast** ao salvar, excluir e restaurar.
- **Editar sem alterar nada não grava**, o que evita criar a cópia local à toa. O sistema avisa "Nenhuma alteração para salvar".
- **Valores legados aparecem na forma canônica** na lista (ex.: o tamanho "Medio" do seed aparece como "Médio"). Só são regravados assim se o registro for salvo com alguma alteração.
- **Validações**: apenas as do original (obrigatórios) e as dos setters do `Model_usuarios`, mais a checagem de tipo dos campos numéricos (inteiro ou decimal; hexadecimal e notação científica são recusados). Nenhum mínimo ou máximo de valor novo foi criado. Em Usuários, o Status continua opcional (a coluna aceita nulo).
- **Limite de caracteres = tamanho da coluna** (`maxlength` igual ao `VARCHAR` do dump: nome 100/255, olhos/cabelos 40, requisitos 255 etc.). Evita o truncamento silencioso que o MySQL sem strict mode fazia.
- **Seções nos formulários** (ex.: "Ajustes de atributo", "Detalhes", "Atributos") são só agrupamento visual. A ordem dos campos é a do original.

---

## 🔌 8. Integração com o Playful Hub

- `server.js`: `createHtmlRoute('/jogos/ded_make_character', 'jogos/ded_make_character.html')`. O app em `/ded_make_character/` já é servido pelo `express.static`, que também redireciona a URL sem barra final.
- `jogos/ded_make_character.html`: página SEO no padrão da `planning_poker.html` (meta tags, OG, "Como funciona", GTM).
- `index.html`: card no catálogo + entrada em `GAMES_DATA` (categoria `strategy`, tag "RPG / Dados"), com preview `assets/images/ded_make_character_preview.png` capturado do próprio app.
- `games_control.json` e `README.md`: nova entrada.
- `BACKLOG.md` (raiz): linha desta tarefa.

---

## 🧪 9. Plano de testes e validação

1. **Unitário do store** (`tests/ded_make_character_store.test.js`, Node puro):
   - leitura do original sem gravar nada;
   - cópia na 1ª escrita;
   - JSON original intacto;
   - AUTO_INCREMENT sem reaproveitar ids;
   - restauração por tabela e total;
   - quota cheia;
   - cópia corrompida;
   - escritas concorrentes;
   - cópias defensivas;
   - modo sem storage;
   - evento de outra aba.
2. **E2E Puppeteer** (`tests/qa_ded_make_character.test.js`):
   - carrega a home sem erros de console;
   - navega por todos os módulos e confere as contagens (15 classes, 7 raças, 45 perícias, 246 talentos em 13 páginas);
   - valida obrigatórios;
   - cria, edita e exclui uma raça, confirmando que a cópia vai para o `localStorage` e que `data/races.json` segue intacto;
   - busca;
   - painel condicional de classes;
   - restaurar originais;
   - rota inexistente;
   - viewport mobile (gaveta e cartões).
3. **Navegador a cada etapa** (painel Browser): screenshots desktop e mobile, console limpo, fluxo manual dos formulários.
4. **Revisão rigorosa por subagente**, que audita paridade, visual, acessibilidade, responsividade e código. O ciclo se repete (corrigir → revalidar → reavaliar) até o parecer "APROVADO", sem pendências bloqueantes nem importantes.

---

## 🗺️ 10. Etapas de execução

| Etapa | Entrega | Critério de pronto |
| :--- | :--- | :--- |
| E1 | Conversor + `data/*.json` | Contagens batem com o dump; zero dado pessoal. |
| E2 | Store copy-on-write + testes unitários | 11/11 verdes. |
| E3 | Design system (tokens, base, componentes, ícones) | Contraste AA medido. |
| E4 | Shell, router, home e status dos dados | Navegação desktop e mobile ok no navegador. |
| E5 | Renderizadores genéricos (lista, busca, paginação, formulário, diálogo, toasts) | Classes 100% funcional. |
| E6 | Schemas dos 7 módulos | Paridade da seção 6 conferida tela a tela. |
| E7 | Integração no hub (rota, página SEO, catálogo, backlog) | `/jogos/ded_make_character` e o card funcionando. |
| E8 | E2E Puppeteer + ciclo de revisão do subagente até aprovação | Testes verdes; parecer "APROVADO". |

---

## ✅ 11. Critérios de aceitação

1. Todos os 7 módulos listam, criam, editam e excluem com os campos, obrigatórios e opções da seção 6.
2. Sem nenhuma escrita, **nada é gravado no `localStorage`**. Na primeira escrita numa tabela, só aquela tabela é copiada.
3. Os arquivos `data/*.json` **nunca** mudam. "Restaurar originais" devolve o estado do dump, por tabela ou para tudo.
4. Os ids seguem o AUTO_INCREMENT do dump (a 1ª classe criada é a 16) e não são reaproveitados.
5. A busca filtra por coluna ou por todos os campos, combinada com a paginação de 20 itens e os num_links originais.
6. Sem erros no console. Layout sem rolagem horizontal de 360px a 1920px. Navegável por teclado.
7. O visual não reutiliza nada do original: paleta, fontes e ícones novos, com contraste AA.
8. Nenhum dado pessoal (e-mail ou hash de senha) publicado.

## ⚠️ 12. Riscos e mitigações
| Risco | Mitigação |
| :--- | :--- |
| `localStorage` cheio ou bloqueado | Erro claro por toast sem corromper nada; modo em memória avisado. |
| JSON original atualizado depois de o usuário já ter uma cópia | `seedVersion` × `version`, com banner para restaurar. |
| Referências órfãs (ex.: classe excluída ainda usada por uma raça) | Sem cascata, igual ao MySQL sem FK. A UI mostra "—" e o select preserva o valor legado. |
| Colisão com o trabalho em andamento na `feat/sprint-5` | Worktree e branch isolados; alterações mínimas em arquivos compartilhados. |

## 🔮 13. Próximos passos (fora do escopo)
- **Simulador de combate** (objetivo original). Usará `bba.json`, DV, resistências, atributos e modificadores dos personagens.
- Módulos de **Magias** e **Requisitos** (tabela `requisitos` com `id_tipo`, `id_requisito`, `valor`, `id_alvo`, já modelada no legado).
- Exportar e importar a cópia local em JSON.

---

## 🧾 14. Resultado da validação (Dev)

- **Testes automatizados** (todos verdes):
  - `node tests/ded_make_character_store.test.js`: 11 testes.
  - `node tests/ded_make_character_listing.test.js`: 7 testes.
  - `NODE_ENV=test node tests/qa_ded_make_character.test.js`: 23 verificações E2E, entre elas a matriz de larguras de 768 a 1440px, a estabilidade do modo tabela/cartões ao paginar, a guarda com saltos no histórico e o cache com tabelas relacionadas.
  - `tests/smoke.test.js` e `tests/qa_catalog_and_menu.test.js` do hub continuam verdes.
- **Revisão por subagente**: 5 rodadas até o parecer "APROVADO", sem nenhum achado bloqueante, importante ou menor em aberto. Os dois detalhes cosméticos finais também foram aplicados. Principais melhorias saídas do ciclo:
  1. A tabela nunca rola na horizontal: vira cartões quando não cabe. A decisão é determinística por largura, com limiar em cache e medido numa amostra.
  2. Cabeçalho fixo funcional e `scroll-padding`, para que o foco nunca fique encoberto (WCAG 2.4.11).
  3. Gaveta mobile modal (`inert`, botão Fechar).
  4. Guarda de alterações sem entradas mortas no histórico, com suporte a saltos de vários passos.
  5. Diálogo que resolve pelo `submit`/`cancel`: o `close` atrasa em abas ocultas.
  6. `server.js` com `Cache-Control: no-cache` para `/ded_make_character/`: ES Modules com cache de 1h misturariam versões após um deploy.
  7. Paridade restaurada (ordem de campos e validações) e todos os desvios documentados na §7.

