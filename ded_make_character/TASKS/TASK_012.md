# 📜 Tarefa 012 - D&D Make Character: Migração Completa de Regras D&D 3.0 → D&D 3.5

**Status**: 🚧 Em Andamento  
**Responsável**: Antigravity / Claude (Dev)  
**Branch**: `feat/ded-catalogo-monstros-mm35`  
**Depende de**: TASK_003 (regras e fichas 3.0), TASK_006 (motor de combate), TASK_008 (catálogo de combate), TASK_011 (tabuleiro tático 3.5)  

---

## 🧭 1. Objetivo da Tarefa

Migrar integralmente o subsistema D&D Make Character das regras de D&D 3ª Edição (3.0) para **D&D 3.5 (Edição Revisada)**, mantendo a consistência completa entre:
1. **Motor de regras e combate** (`js/rules/*`).
2. **Validador de formato e catálogo** (`tools/validar-catalogo.js` e `tools/catalogo-combate.md`).
3. **Catálogo de combatentes** (`data/catalogo-combate.json`): conversão dos 20 monstros do Livro dos Monstros 3.5 e adaptação 3.5 dos 54 personagens de Tormenta D20 / Holy Avenger.
4. **Dados de referência** (`data/*`): talentos, perícias, classes, raças e glossário.
5. **UI e páginas**: atualização de referências textuais de 3.0 para 3.5.
6. **Bateria de testes automatizados**: atualização de todos os testes `tests/*ded*` para as estatísticas e mecânicas 3.5.

> **Nota de Arquitetura**: Os arquivos de código em `js/rules/` mantêm seus nomes com sufixo `*30.js` (`tables30.js`, `combat30.js`, etc.) nesta etapa para não quebrar caminhos e imports legados no hub. A renomeação para `*35.js` fica recomendada para um refactor dedicado subsequente.

---

## 🔬 2. Conversão 3.0 → 3.5 (Inventário de Diferenças)

Com base no *Manual de Conversão D&D 3.0 para D&D 3.5 (Devir)* e no *Livro dos Monstros 3.5 (Devir / SRD 3.5)*:

| Mecânica / Área | D&D 3.0 | D&D 3.5 (Devir) | Arquivos & Funções Afetados |
|---|---|---|---|
| **Redução de Dano (RD)** | Formato `valor/+bônus` (ex.: `20/+2`, `50/+3`) ou material único (`10/prata`). Qualquer arma com bônus de melhoria alto vencia materiais. | Formato `valor/tipo`: superada por tipo de material (`prata`, `ferro frio`, `adamante`), tendência (`bem`, `mal`, `leal`, `caótico`), magia (`magia`), épico (`épico`), dano físico (`concussão`, `cortante`, `perfurante`) ou irredutível (`—`). Aceita combinações no modo `ou` (ex.: `ferro frio ou bem`) e modo `e` (ex.: `prata e bem`, `concussão e magia`). Valores reduzidos (geralmente 5, 10 ou 15). | `combat30.js` (`venceRD`, `causarDano`, `rdDe`, `calcularDanoEsperado`), `validar-catalogo.js`, `catalogo-combate.md`, `catalogo-combate.json`, `card30.js`, `glossario-combate.json` |
| **Espaço e Alcance (Space/Reach)** | "Face" retangular e orientada (ex.: 1,5 m × 1,5 m, 1,5 m × 3 m, 3 m × 6 m). | Espaço quadrado simétrico (*Space N×N quadrados*): Pequeno/Médio 1,5 m (1×1), Grande 3 m (2×2), Enorme 4,5 m (3×3), Imenso 6 m (4×4), Colossal 9 m+ (6×6+). Alcance natural diferenciado para criaturas altas vs. compridas. | `tables30.js` (`tamanho`), `combat30.js` (`parseArea`, `pesoTamanho`), `validar-catalogo.js`, `catalogo-combate.md`, `catalogo-combate.json` |
| **Categorias de Tamanho** | 8 categorias usadas sem nomenclatura padronizada de sub-pequenos (Mínimo, Minúsculo). | **9 categorias oficiais Devir** em ordem crescente: Minúsculo (*Fine*), Diminuto (*Diminutive*), Miúdo (*Tiny*), Pequeno (*Small*), Médio (*Medium*), Grande (*Large*), Enorme (*Huge*), Imenso (*Gargantuan*), Colossal (*Colossal*). Modificadores de Agarrar: -16, -12, -8, -4, 0, +4, +8, +12, +16. Modificadores de CA/Ataque: +8, +4, +2, +1, 0, -1, -2, -4, -8. | `tables30.js` (`tamanho`), `validar-catalogo.js` (`TAMANHOS`, `AGARRAR_TAMANHO`), `combat30.js` (`TAMANHOS`, `sizeIdx`), `dnd30.js` |
| **Agarrar (Grapple)** | Não era impresso no bloco de atributos; calculado isoladamente. | Impresso no bloco: `Ataque Base/Agarrar` (`BBA / Agarrar`). Fórmula: `BBA + mod. Força + mod. Tamanho (Agarrar)`. | `validar-catalogo.js`, `combat30.js` (`agarrarDe`), `personagem30.js`, `card30.js`, `catalogo-combate.json` |
| **Perícias (Skills)** | Alquimia (perícia separada); Empatia com Animais (perícia); Mensagens Secretas; Senso de Direção; Leitura Labial; Cavalgar por montaria; Punga; Espionar. | **Alquimia** virou *Ofícios (alquimia)* (exige conjurador para itens mágicos/alquímicos). **Empatia com Animais** virou habilidade de classe (*Empatia Selvagem*). **Mensagens Secretas** fundida em *Blefar*. **Senso de Direção** fundida em *Sobrevivência*. **Leitura Labial** fundida em *Observar*. **Cavalgar** unificada (sem subtipo de montaria). **Punga** virou *Prestidigitação*. **Espionar** excluída (resistência de Vontade contra CD). Nova perícia: *Conhecimento (masmorras)*. Sinergias expandidas. | `data/pericias.json`, `tables30.js` (`periciasClasse`, `sinergias`, `sinergiasSituacionais`), `choices30.js`, `personagem30.js` |
| **Talentos (Feats)** | Ambidestria (talento separado); Especialização; Acuidade com Arma com arma fixa; Separar; Especialização em Escudo; Arqueirismo Montado; Atropelar; Precisão; Foco em Perícia dava +2; Foco em Magia dava +2 na CD. | **Ambidestria** excluída (incorporada em *Combater com Duas Armas*). **Especialização** → *Especialização em Combate*. **Acuidade com Arma** aplica a todas as armas leves sem escolher uma específica. **Separar** → *Separar Aprimorado* (separar é manobra). **Especialização em Escudo** → *Ataque com Escudo Aprimorado*. **Arqueirismo Montado** → *Arquearia Montada*. **Atropelar** → *Pisotear*. **Precisão** → *Tiro Preciso*. **Foco em Perícia** concede **+3** (em vez de +2). **Foco em Magia** concede **+1** na CD. Talentos de monstro 3.5: *Ataque Natural Aprimorado*, *Pairar*, *Investida Poderosa*, *Golpe Arrasador*, *Arrebatar*, *Ataque em Voo*, *Ataques Múltiplos*, *Combater com Múltiplas Armas* (substitui Multidestreza). | `data/talentos.json`, `tables30.js` (`talentosClasse`, `talentosParametro`, `talentosApelidos`, `efeitosTalentos`), `validar-catalogo.js` (`TALENTOS_EXTRAS`), `choices30.js`, `personagem30.js` |
| **Magias (Spells)** | *Força do Touro*, *Vigor do Urso*, etc.: 1d4+1 atributos, duração 1 hora/nível. *Velocidade*: ação parcial extra (permitia conjurar 2 magias por rodada). *Pele Rochosa*: RD 30/+5. | *Força do Touro*, *Agilidade do Gato*, etc.: **+4 fixo**, duração **1 minuto/nível**. *Velocidade*: +1 ataque na rodada de ataque total, +1 ataque geral, +1 esquiva na CA/Reflexos, +9 m deslocamento, duração 1 rodada/nível. *Pele Rochosa*: RD **10/adamante**, absorve até 10 PV/nível (máx. 150). Renomeações: *Aumentar Pessoa*, *Reduzir Pessoa*, *Invisibilidade Maior*, *Dissipar Magia Maior*, etc. | `js/rules/magias30.js`, `combat30-specials.js`, `data/magias.json` |
| **Classes de Personagem** | Ranger: d10 PV, 4 perícias/nível, Ambidestria e Combater com Duas Armas. Bardo: 4 perícias/nível. Bárbaro: RD não cumulativa tardia. Paladino: Destruir o Mal 1/dia fixo. Monge: rajada com BBA fixo, dano e talentos sem opção. | **Ranger**: d8 PV, **6 perícias/nível**, Estilos de Combate (Arqueirismo ou Duas Armas), Empatia Selvagem. **Bardo**: **6 perícias/nível**, substituição de magias conhecidas. **Bárbaro**: RD 1/— no 7º nível (+1 a cada 3 níveis), Esquiva Sobrenatural nos níveis 2 e 5. **Paladino**: *Destruir o Mal* escala com níveis (1/dia no 1º, 2/dia no 5º, 3/dia no 10º, 4/dia no 15º, 5/dia no 20º). **Monge**: rajada de golpes com progressão de BBA própria; Ataque Chi (*mágico* 4º, *leal* 10º, *adamante* 16º); talentos adicionais com escolhas no 1º, 2º e 6º. **Druida**: companheiro animal escala com tabela de bônus, empatia selvagem. **Mago**: especialização sacrifica 2 escolas (exceto adivinhação). | `tables30.js` (`dadoVida`, `pontosPericia`, `monge`), `data/classes.json`, `personagem30.js`, `choices30.js` |
| **Raças** | Anão perdia deslocamento por armadura; gnomo classe favorecida mago. | **Anão**: não sofre redução de deslocamento por armadura média/pesada ou carga; Familiaridade com Armas (machado de guerra anão e urgrosh anão). **Gnomo**: classe favorecida *Bardo*; Familiaridade com martelo gnomo com gancho. **Meio-elfo**: +2 racial em Diplomacia e Obter Informação. | `tables30.js` (`racas`), `data/races.json` |
| **Tipos de Criatura** | Tipo *Besta* (*Beast*) existia; *Metamorfo* era tipo. | Tipo **Besta removido** (convertido para Animal ou Besta Mágica). **Metamorfo virou subtipo**. Subtipo **Nativo** para extra-planares do plano material. Subtipo **Enxame** (*Swarm*). | `validar-catalogo.js` (`TIPOS`), `catalogo-combate.md`, `catalogo-combate.json`, `combat30.js` |
| **Níveis de Desafio (ND)** | Frações: 1/2, 1/3, 1/4, 1/6, 1/8. Teto rígido de 20 para monstros e 'um monstro por ND 1–20'. | **ND 1/10 adicionado** (ex.: morcego, sapo). Teto de ND expandido até 30 para monstros. **Permitido múltiplos monstros por ND** (remoção da regra artificial de 1 por ND 1–20). | `validar-catalogo.js`, `catalogo-combate.md`, `catalogo-combate.json`, `tests/ded_make_character_catalogo.test.js` |
| **Ataques Naturais Secundários** | Penalidades variáveis conforme espécie. | Regra unificada: ataque primário com BBA total e mod. Força (1,5× se único); secundários com BBA -5 (ou -2 com *Ataques Múltiplos*) e 0,5× mod. Força. | `combat30.js` (`atacar`), `validar-catalogo.js` |

---

## 🛠️ 3. Plano de Execução

1. **E1 — Regras e Motor (`js/rules/*` & `data/*`)**:
   - Atualizar `tables30.js` (pontosPericia de bardo/ranger = 6, dadoVida de ranger = 8, 9 categorias de tamanho e tabela de agarrar/CA/esconder, monge ataque chi e talentos, familiaridades raciais).
   - Atualizar `combat30.js` e `combat30-specials.js` para resolução da RD 3.5 (`venceRD` com materiais prata, ferro frio, adamante, tendência bem/mal/leal/caótico, magia, épico, tipos de dano concussão/cortante/perfurante, e suporte a `modo: 'e'` / `modo: 'ou'`).
   - Atualizar magias em `magias30.js` (durações e valores 3.5, Velocidade 3.5, Pele Rochosa 3.5).
   - Atualizar dados de classes, raças, talentos e perícias em `data/`.
2. **E2 — Validador e Documentação do Formato (`tools/*`)**:
   - Atualizar `validar-catalogo.js`: RD 3.5, materiais (`ferro frio`), tamanhos (as 9 categorias incluindo `Miúdo` e `Diminuto`), ND fracionário com `1/10`, teto de ND até 30 para monstros, remoção da checagem "exatamente um monstro por ND 1–20", adição dos talentos de monstro 3.5 em `TALENTOS_EXTRAS`.
   - Atualizar `tools/catalogo-combate.md` com as especificações 3.5.
   - Rodar `tools/gerar-tabela-efeitos.js`.
3. **E3 — Conversão dos Dados do Catálogo (`data/catalogo-combate.json`)**:
   - Atualizar os 20 monstros clássicos com as estatísticas exatas do *Livro dos Monstros 3.5* (ND, PV, CA, BBA, Agarrar, Espaço, Alcance, RD 3.5, ataques primários/secundários, talentos, perícias, com notas na chave `adaptacao`).
   - Adaptar os 54 combatentes de Holy Avenger para compatibilidade 3.5 (RDs atualizadas para o novo formato, perícias e talentos ajustados conforme o manual de conversão).
   - Atualizar `versao` e `descricao` do catálogo.
4. **E4 — Textos de UI**:
   - Atualizar referências textuais de "D&D 3.0" para "D&D 3.5" nas telas do hub e documentação do catálogo.
5. **E5 — Validação e Testes Automatizados**:
   - Executar o validador (`node ded_make_character/tools/validar-catalogo.js`).
   - Atualizar e rodar todos os testes de regras e catálogo (`tests/ded_make_character_*.test.js` e `tests/journey_ded.test.js`).
