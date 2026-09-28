# 📜 Tarefa 004 - D&D Make Character: Escolha de talentos e perícias ao gerar a ficha (+ talentos do Livro do Jogador 3.0)

**Status**: 🚀 Dev Complete (revisão rigorosa por subagente: APROVADO na 4ª rodada)
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-make-character`
**Depende de**: TASK_003 (ficha 3.0)

---

## 🔍 1. Pedido do usuário (28/09/2026)

> Ao clicar para gerar a ficha, deve abrir um popup para o jogador escolher os talentos e as perícias a que tem direito. O sistema deve calcular quantas perícias e talentos, e quais perícias e talentos o jogador pode escolher, com base nos dados do personagem. Essas informações devem aparecer na ficha também.

## 🎯 2. Decisões

| Tema | Decisão |
|---|---|
| **Talentos do Livro do Jogador** | <ul><li>Os 246 talentos do compêndio vêm de suplementos (o *Códice de Talentos*: Complete Warrior, Epic Level Handbook, Dragon Magazine…). Quase nenhum é do Livro do Jogador, e a maioria exige como pré-requisito talentos básicos que não existiam no compêndio (Esquiva, Ataque Poderoso, Tiro Certeiro…).</li><li>**Decisão do usuário:** adicionar os **74 talentos do Livro do Jogador 3.0** (SRD 3.0). O compêndio passa a ter **320 talentos**.</li></ul> |
| **Quando abre** | <ul><li>"Salvar e gerar ficha" grava o personagem e abre a ficha com o popup (`#/personagens/:id/ficha?escolher=1`; a query sai da URL).</li><li>Na ficha, o botão **"Talentos e perícias"** reabre o popup com as escolhas salvas.</li><li>"Ficha" (lista) e "Ver ficha" (edição) abrem só a ficha.</li></ul> |
| **Onde fica** | <ul><li>Nova tabela **`fichas`** (`id, personagem_id, pericias, talentos, atualizado_em`). O `data/fichas.json` original é vazio, e as escolhas vão para a cópia local (`dmc:v1:fichas`), como qualquer escrita do app.</li><li>"Restaurar tudo" apaga as escolhas junto com o resto.</li><li>A tabela `personagens` não muda (paridade com o legado).</li></ul> |
| **O que o popup garante** | <ul><li>Só salva escolhas **válidas**: pontos dentro do total, graduações no máximo, talentos com os requisitos atendidos, vaga compatível e parâmetro informado.</li><li>Requisitos que o sistema não consegue verificar não bloqueiam: ficam **"a confirmar"** (aviso para o Mestre).</li></ul> |

## 📚 3. Dados

- **`tools/talentos-ldj30.json`**: 74 talentos do SRD 3.0 (http://www.dragon.ee/30srd/feats.htm), sem os 4 de monstro (Flyby Attack, Multiattack, Multidexterity, Multiweapon Fighting).
  - Campos: `nome` (PT), `nome_en`, `tipo`, `requisitos` (no padrão do verificador), `beneficio` (resumo próprio, com os números da 3.0), `normal`, `fonte` = "Livro do Jogador 3.0 (SRD 3.0)", `parametro` e `multiplo`.
  - `tipo`:
    - `GUE`: a lista de talentos adicionais de guerreiro de `fighter.htm`;
    - `METAMÁGICO` e `CRIAÇÃO DE ITEM`;
    - `ESPECIAL`: Expulsão Adicional e Dominar Magia.
  - **Nomes:** seguem a tradução brasileira (Devir) e batem com os nomes que os requisitos do compêndio já citavam: Tiro Certeiro, Ataque Poderoso, Esquiva, Mobilidade, Usar Escudo…
    - O Expertise da 3.0 se chama **Especialização em Combate**, nome da 3.5, porque é assim que o compêndio o cita.
    - O Sunder da 3.0 se chama **Separar**; o apelido "Separar Aprimorado" (3.5) aponta para ele. "Reflexos em Combate" é apelido de **Reflexos de Combate**.
    - Nomes com mais de uma tradução na comunidade:

      | Nome usado | Outras traduções |
      |---|---|
      | Magias em Combate | "Conjurar em Combate" |
      | Dominar Magia | "Domínio de Magia" |
      | Imobilização Aprimorada | "Derrubar Aprimorado" |
      | Investida Montada | "Ataque Montado" |
      | Criar Armaduras e Armas Mágicas | — |
      | Atropelar (Trample) | "Pisotear", na Devir 3.5 |
- **`tools/sql-to-json.js`**:
  - acrescenta esses talentos depois dos do dump (ids 247–320);
  - passa **só a tabela `talentos` para a versão 3**, e as cópias locais antigas dela recebem o aviso de dados atualizados;
  - gera `data/fichas.json`.

## 🧮 4. Regras (`js/rules/choices30.js`, funções puras)

### Perícias
- **Pontos**: os da ficha (TASK_003).
- **Custo por graduação**: perícia de classe, 1 ponto (graduações inteiras); de outra classe, 2 pontos (meia graduação por ponto).
- **Graduação máxima**: nível + 3, ou metade disso nas de outra classe.
- **Meia graduação** conta para o máximo, mas **não soma no teste** (a ficha arredonda para baixo).
- **Perícias exclusivas** da 3.0 (Decifrar Escrita, Usar Instrumento Mágico) ficam bloqueadas para quem não as tem como perícia de classe.
- **Sinergias** (SRD 3.0, `skills.htm`): 5 graduações dão +2, somado sozinho em "mod. diversos".
  - Acrobacias → Equilíbrio e Saltar.
  - Saltar → Acrobacias.
  - Blefar → Intimidação e Prestidigitação.
  - Blefar ou Sentir Motivação → Diplomacia (+2 uma vez só).
  - Adestrar Animais → Cavalgar.
  - As sinergias situacionais viram nota na ficha: Blefar → Disfarces ao agir no papel; Usar Cordas → Escalar com corda; Decifrar Escrita ou Identificar Magia → Usar Instrumento Mágico com pergaminhos; e outras.
- Classes de prestígio (sem pontos de perícia no compêndio): o popup avisa, e as graduações são anotadas à mão.

### Vagas de talento, por nível
- **Gerais**: 1º nível e a cada 3 níveis; humano, +1 no 1º.
- **Guerreiro**: 1º nível e níveis pares, só com talentos `GUE`.
- **Mago**: 5º, 10º, 15º e 20º, só metamágicos, de criação de item ou Dominar Magia.

### Talentos concedidos (não ocupam vaga e contam como requisito)
- **Proficiências de classe** (SRD 3.0): Usar Arma Simples/Comum, Usar Armadura (leve/média/pesada) e Usar Escudo. As armas específicas de druida, monge, ladino e mago são descritas na ficha.
- **Da classe**:
  - monge: Ataque Desarmado Aprimorado (1º), Desviar Objetos (2º), Imobilização Aprimorada (6º);
  - ranger: Rastrear, Ambidestria e Combater com Duas Armas (com armadura leve ou sem armadura);
  - mago: Escrever Pergaminho.
- **Da raça**: o elfo tem Usar Arma Comum (espada longa ou rapieira; arcos).

### Requisitos
O texto `requisitos` de cada talento é lido átomo a átomo:
- atributo;
- bônus base de ataque;
- bônus base de resistência;
- nível de personagem ou de classe;
- nível de conjurador;
- "capaz de lançar magias de Nº nível";
- graduações;
- outro talento (com o parâmetro, ex.: "Foco em Arma (espada curta)");
- "qualquer talento metamágico";
- habilidades de classe: música de bardo, forma selvagem, inimigo predileto, fúria…;
- **expulsar × fascinar mortos-vivos**, pela tendência (SRD 3.0):
  - o clérigo bom expulsa e o mau fascina;
  - o clérigo neutro escolhe, e o requisito fica "a confirmar";
  - o paladino só expulsa, a partir do 3º nível;
  - "expulsar **ou** fascinar" vale para qualquer clérigo;
- tendência, raça (inclusive "ascendência parcialmente humana"), tamanho e visão;
- raças de fora do Livro do Jogador (forjado bélico, golias…) e deslocamento de voo ou de natação natural: um personagem de raça do Livro do Jogador não os tem;
- perícias no singular ou no plural ("Acrobacia" → Acrobacias);
- alternativas "A ou B".

Cada átomo é avaliado como:
- **atendido**, com o nível mínimo em que passa a valer;
- **não atendido**: o talento fica **indisponível** e o popup diz o que falta;
- **não verificável**: fica **a confirmar**. São exemplos um talento fora do compêndio, um domínio, uma subraça ou um patrono.

Talentos épicos ficam indisponíveis, porque exigem 21º nível ou mais. Talentos exaltados e anárquicos pedem o aval do Mestre.

### Progressão
- Cada talento escolhido ocupa **uma vaga de um nível em que os requisitos já eram atendidos**. Exemplos: BBA +8 só a partir do nível em que a classe chega a +8; 8 graduações só quando o máximo permite.
- Um talento nunca vem antes do pré-requisito escolhido.
- Talentos de "só no 1º nível" ficam em vaga do 1º nível.
- A distribuição é um emparelhamento talento → vaga (algoritmo de Kuhn). O popup mostra as vagas por nível já preenchidas.
- **Repetição**: só para talentos "pode ser escolhido várias vezes".
  - Os que têm parâmetro (arma, perícia, escola, magias) precisam de outro parâmetro a cada vez.
  - Os cumulativos sem parâmetro (Vitalidade, Expulsão Adicional, Música Adicional…) repetem livremente.
- **"(arma escolhida)"**: o pré-requisito precisa ser da mesma arma. Por exemplo, Especialização em Arma (machado de batalha) exige Foco em Arma (machado de batalha).
- Quem foi escolhido antes fica na vaga mais cedo, quando a troca é possível.

### Efeitos na ficha (`efeitosTalentos` + `computeSheet`)
- Graduações na coluna da perícia, com o total.
- Iniciativa Aprimorada: +4 na iniciativa.
- Reflexos Rápidos, Fortitude Maior e Vontade de Ferro: +2 no teste correspondente.
- Prontidão: +2 em Ouvir e Observar.
- Foco em Perícia: +2 na perícia escolhida.
- Esquiva: entra como condicional na CA.
- Vitalidade: vira nota "+3 PV", porque os PV são cadastrados à mão. Escolhida várias vezes, gera uma nota só (ex.: "+9 PV (Vitalidade ×3)").
- Em Habilidades especiais:
  - os talentos escolhidos vêm **um por linha, na ordem das vagas**, com o nível e o tipo de vaga (ex.: "Talento: Foco em Arma (espada longa) · 1º (adicional de guerreiro)");
  - depois vêm os concedidos, as proficiências resumidas e as sinergias;
  - os talentos concedidos (Desviar Objetos, Rastrear, Escrever Pergaminho…) não se repetem nas habilidades de classe.
  - a proficiência racial do elfo (espada longa ou rapieira; arcos) aparece só em Proficiências, e só quando a classe ainda não usa todas as armas comuns.
- **Página 2 sempre cabe**: o bloco de Habilidades especiais não cresce além da coluna. Se o texto não couber, a pauta encolhe até 11px, e a letra também a partir de 12px, até a coluna inteira caber (Carga e Idiomas nunca passam do rodapé). No pior caso, um monge anão 20 com 7 talentos, a pauta fica em 15px.
- **Revalidação**: a ficha confere as escolhas salvas com o personagem atual. Quando algo não vale mais, o rodapé impresso da página 1 também sai marcado "Talentos e perícias a revisar". Se o nível, os atributos ou o compêndio mudaram, a barra de notas avisa que elas "não valem mais" e mostra os problemas, e o botão "Talentos e perícias" fica em alerta. Talentos ou perícias removidos do compêndio também são avisados.

## 🖥️ 5. Popup (`js/pages/choices.js` + `css/choices.css`)

- `<dialog>` modal com **abas Perícias e Talentos**. Os selos das abas mostram o saldo: "18 de 42 pontos", "2 de 6 vagas livres".
- **Perícias**:
  - uma tabela com tipo (de classe / outra classe · 2 pts / exclusiva), máximo, controle −/+ (passo 1 ou ½) e total ao vivo;
  - filtro "só perícias de classe";
  - no celular, cada perícia vira um cartão.
- **Talentos**:
  - vagas por tipo, vagas por nível e talentos concedidos;
  - busca, filtro por situação (disponíveis e a confirmar / escolhidos / indisponíveis / todos) e filtro por fonte (Livro do Jogador / suplementos);
  - cada talento mostra a situação ("disponível a partir do 4º nível", "falta: For 13", "confira: …"), os selos e os detalhes (requisitos, benefício, normal, fonte);
  - os campos de parâmetro aparecem ao marcar o talento, e há "Escolher de novo" para os talentos múltiplos.
- **Rodapé**: lista os erros (e o "Salvar" fica desativado) ou os avisos a confirmar.
- **Proteção contra perda**:
  - Cancelar, Esc ou mudar de página com alterações pedem confirmação;
  - clicar no fundo não fecha;
  - ao sair da página, o popup é fechado.
- **Teclado**: abas com setas, Home e End. Depois de −/+ o foco fica no mesmo controle; se o controle foi desativado (máximo atingido), vai para o campo da perícia.
- **Desempenho**: cada talento é avaliado uma vez por redesenho (cache). A busca tem espera de 150 ms e redesenha só a lista. Marcar um talento leva cerca de 40 ms, ou cerca de 210 ms com CPU 4× mais lenta.
- **Cópia local antiga de Talentos** (anterior à TASK_004, sem os 74 talentos do LdJ): a ficha e o popup avisam e oferecem "Restaurar Talentos originais", com confirmação. O popup reabre com o rascunho das escolhas e na mesma aba.
- **Personagem excluído, Personagens restaurada ou cópia de Personagens descartada por estar corrompida**: as fichas sem personagem são apagadas. Assim, um personagem novo que reaproveite o id não herda escolhas de outro.
- No celular, o texto de introdução sai para dar espaço à lista.

## 🩹 6. Premissas e limitações

1. **Atributos**: valem os atuais em todos os níveis. Os aumentos de atributo do 4º, 8º… não são datados, e os pontos de perícia usam a Int atual.
2. **Pontos de perícia**: são somados e distribuídos com o máximo do nível atual, sem distribuição nível a nível.
3. **Talentos de suplementos** (246): são da era 3.5. Os requisitos que citam talentos ou habilidades de fora do compêndio ficam "a confirmar". Os talentos A–L do *Códice* continuam ausentes do dump.
4. **Especialistas**: os requisitos de mago especialista (ilusionista, evocador…) e de domínios ficam "a confirmar", porque o personagem não guarda a escola nem os domínios.
5. **Neutro × mortos-vivos**: o clérigo neutro escolhe entre expulsar e fascinar, mas o personagem não guarda essa escolha. Por isso os requisitos que dependem dela ficam "a confirmar".
6. **Efeitos numéricos**: só os talentos do §4 são somados à ficha. Os demais efeitos (Foco em Arma +1 com a arma escolhida, Ataque Poderoso…) dependem da arma ou da situação e são anotados à mão.

## 🧪 7. Testes

- `node tests/ded_make_character_choices.test.js` (10 testes):
  - vagas por nível;
  - perícias: custo, máximo, meia graduação, exclusivas e estouro de pontos;
  - requisitos: atributo, talento, BBA com nível mínimo, nível de classe, habilidade de classe, graduações, raça, fora do compêndio e épico;
  - progressão: pré-requisito antes, BBA +4 sem vaga, repetição, parâmetro e vaga de mago;
  - repetição sem parâmetro;
  - "(arma escolhida)" com a mesma arma;
  - expulsar × fascinar por tendência e classe;
  - singular/plural, ascendência e voo;
  - sinergias;
  - talentos concedidos;
  - efeitos na ficha;
  - os 74 talentos do LdJ com todos os requisitos resolvidos pelo verificador.
- `NODE_ENV=test node tests/qa_ded_make_character.test.js` (33 verificações):
  - "Salvar e gerar ficha" abre o popup;
  - anã clériga 5: 16 pontos, máximo 8, meia graduação estourando o total, Decifrar Escrita bloqueada;
  - Trespassar indisponível ("falta: Ataque Poderoso");
  - salvar dois talentos, que aparecem na ficha um por linha, na ordem das vagas, junto com Concentração +11;
  - rebaixar para o 1º nível mostra que as escolhas "não valem mais";
  - excluir o personagem apaga a ficha dele;
  - o monge anão 20 com 7 talentos não transborda nenhuma das 3 colunas da página 2, e Idiomas não invade o rodapé;
  - reabrir preenchido;
  - descartar com confirmação;
  - o link Ficha não abre o popup;
  - 320 talentos em 16 páginas.
- `store`, `listing` e `rules` atualizados para os 320 talentos.

## ✅ 8. Critérios de aceitação

1. "Salvar e gerar ficha" abre o popup, e "Talentos e perícias" reabre com as escolhas salvas.
2. O popup mostra os pontos de perícia e as vagas de talento calculados pelas regras 3.0. Bloqueia o que não é permitido e explica por quê.
3. As escolhas salvas aparecem na ficha: graduações e totais de perícia, lista de talentos e efeitos numéricos.
4. O compêndio de Talentos tem os 74 talentos do Livro do Jogador 3.0, com requisitos, benefício e normal.
