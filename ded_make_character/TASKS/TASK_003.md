# 📜 Tarefa 003 - D&D Make Character: Ficha de personagem 3.0 em pergaminho + remoção de "Usuários"

**Status**: 🚀 Dev Complete (revisão rigorosa por subagente: APROVADO na 3ª rodada)
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-make-character`
**Depende de**: TASK_001 (migração), TASK_002 (talentos)

---

## 🔍 1. Pedido do usuário (27/09/2026)

1. **Remover o CRUD de Usuários.** Não há login: "o usuário é a pessoa que abrir o site".
2. **Nova feature: gerar a ficha de personagem.** Depois de preencher os dados de um personagem, o usuário pode gerar a ficha:
   - o sistema faz todos os cálculos pelas regras da **3ª edição (D&D 3.0)**;
   - a ficha é estilizada como **pergaminho medieval**;
   - usa a **fonte do Livro do Jogador 3.0**;
   - segue a **formatação da ficha oficial**, pesquisada na internet para comparação.

## 🎯 2. Decisões

| Tema | Decisão |
|---|---|
| Como gerar | <ul><li>O formulário de Personagens ganha **"Salvar e gerar ficha"** ao lado de "Salvar". O botão grava e abre a ficha; numa edição sem mudanças, só abre.</li><li>As validações do legado continuam valendo. O Jonh do seed, por exemplo, tem divindade nula, que é obrigatória.</li><li>Na edição há também **"Ver ficha"**, que abre a ficha sem gravar, e a lista ganha o link **Ficha** em cada linha.</li><li>Rota: `#/personagens/:id/ficha`.</li></ul> |
| Onde fica a ficha | A ficha é **calculada na hora** a partir do personagem, da raça, da classe, das perícias e da tabela `bba`. Nada é gravado, e editar o personagem atualiza a ficha. |
| Impressão | <ul><li>"Imprimir / salvar PDF" usa `window.print()` e gera **2 páginas A4**.</li><li>Só a ficha é impressa, reduzida a 96,5% para ficar dentro da área imprimível (de 3 a 5 mm de borda).</li><li>**"Economizar tinta"** tira o fundo de pergaminho, na tela e na impressão.</li></ul> |
| Edição 3.0 × compêndio | <ul><li>O compêndio legado segue a **3.5**: perícias como Prestidigitação e Sobrevivência, Ranger d8, flags de perícia de classe da 3.5.</li><li>A ficha aplica a **3.0**, como pedido, e **aponta cada divergência** na barra de notas e no rodapé da página 2.</li><li>Os dados do compêndio não são alterados.</li></ul> |
| Identidade | <ul><li>Os textos criados na migração (sobretítulo da Home, slogan da marca, página SEO e card do hub) dizem **"D&D 3ª edição"**, que vale tanto para a 3.0 (regras da ficha) quanto para a 3.5 (compêndio).</li><li>Os títulos originais das listas ("Lista de … D&D 3.5") e da Home ("…regras do aclamado D&D 3.0") ficam como no legado.</li></ul> |
| Logotipo | O logo *Dungeons & Dragons* da 3e é marca registrada e **não é reproduzido**. O cabeçalho é textual: "Dungeons & Dragons · Ficha de Personagem · 3ª Edição · Livro do Jogador". |

## 🧹 3. Remoção de Usuários

- Saíram do app o menu, a rota, o card da Home e a entidade (`js/entities/usuarios.js`).
- `tools/sql-to-json.js` deixa de exportar `usuarios`, então `data/usuarios.json` não existe mais e o problema de sanitizar e-mail e hash de senha do dump acabou.
- `RETIRED_TABLES = ['tipo_requisito', 'usuarios']` apaga no carregamento a cópia local órfã.
- A rota antiga `#/usuarios` mostra o 404.
- `personagens.jogador_id` fica preservado nos dados, mas não aparece. Na ficha, o campo **jogador** vem em branco, para preencher à mão.
- A TASK_001 (§1.1, §2.1, §3.4, §5 e §6.7) ganhou notas de "removido na TASK_003".

## 🔎 4. Pesquisa

### 4.1 Ficha oficial
- PDF oficial da WotC (©2001, "o mesmo do fim do Livro do Jogador 3ª edição"): https://rumkin.com/reference/dnd/char-sheet/3rd-ed-wotc.pdf (índice: https://rumkin.com/reference/dnd/char-sheet/)
- Ficha 3.5, só para comparação: https://rumkin.com/reference/dnd/char-sheet/phb-v35-wotc.pdf
- Ficha 3.0 em PT (prévia, para os rótulos da tradução): https://bibliotecaelfica.org/2023/01/15/dd-3e-ficha-de-personagem-3-0/
- Diferenças 3.0 × 3.5 em PT: https://estevao.altervista.org/RPG/dnd3.5-mudancas.htm

### 4.2 Regras e tabelas (`js/rules/tables30.js`)
- **SRD 3.0 no dragon.ee**: http://www.dragon.ee/30srd/
  - classes: `barbarian.htm`, `bard.htm`, `druid.htm`, `monk.htm`, `paladin.htm` etc., com habilidades por nível, perícias de classe e magias;
  - raças: `dwarf.htm`, `gnome.htm` etc., com idiomas e traços;
  - [pontos de perícia](http://www.dragon.ee/30srd/skills_overview.htm).
- **SRD 3.0 na D&D Wiki**: https://www.dandwiki.com/wiki/3e_SRD:System_Reference_Document
  - As listas de perícias de classe batem com o dragon.ee. As tabelas de habilidades do bardo e do bárbaro, porém, trazem conteúdo da 3.5 (Inspire Courage +2/+3/+4, Song of Freedom, RD 3/— no 20º). Nesses casos vale o dragon.ee.
  - A tabela de monges Pequenos e anões (dano desarmado e deslocamento) veio de https://www.dandwiki.com/wiki/3e_SRD:Monk.
- **Dados 3e do PCGen**, para conferência cruzada: [classes](https://github.com/PCGen/pcgen/blob/master/data/3e/wizards_of_the_coast/srd/basics/srd_classes_base.lst), [raças](https://github.com/PCGen/pcgen/blob/master/data/3e/wizards_of_the_coast/srd/basics/srd_races__base.lst), [XP](https://github.com/PCGen/pcgen/blob/master/system/gameModes/3e/level.lst), [carga](https://github.com/PCGen/pcgen/blob/master/system/gameModes/3e/load.lst).
- **D&D 3.5 Update Booklet (WotC)**, para saber o que mudou: https://archive.org/details/dnd_3.5_update_booklet
- Onde as transcrições do SRD 3.0 divergem nas tabelas de magia, vale a maioria (2 de 3).

### 4.3 Tipografia
Fontes identificadas no dicionário de fontes do PDF e nos fóruns EN World:

| Uso no original | Fonte original (comercial) | Equivalente livre usada |
|---|---|---|
| Toda a ficha (placas, rótulos, caixas) | **FF Scala Sans** (Black, Bold, Caps/versalete), de Martin Majoor | **Alegreya Sans** (Black, ExtraBold) + **Alegreya Sans SC** (versalete), do mesmo gênero humanista |
| Texto corrido do livro | **MVB Celestia Antiqua** | **Alegreya** com algarismos alinhados (valores escritos na ficha) |
| Títulos e subtítulos do livro | **Pterra** (T-26) | **Grenze** (título da ficha) e **Marcellus SC** (legendas) |

As originais são comerciais e não podem ser servidas no hub, então as equivalentes vêm do Google Fonts. A IM Fell English foi descartada: só tem algarismos antigos, e o "1" parece um "I".

## 🧮 5. Regras aplicadas (`js/rules/dnd30.js`)

`computeSheet(personagem, { race, classe, bbaRows, pericias })` devolve tudo o que a ficha mostra. As premissas estão abaixo.

### 5.1 Atributos, raça e nível
- **Atributos**: os valores cadastrados são **valores base**, e o formulário avisa isso. A ficha soma os **ajustes raciais**, marcados com um índice vermelho na caixa.
- **Raças do Livro do Jogador** (encontradas pelo nome ou pelo id original 1–7, o que também cobre raças renomeadas): **ajustes, tamanho, deslocamento, traços, idiomas automáticos e condicionais seguem a 3.0**. Raças novas usam só o compêndio.
  - O compêndio diverge da 3.0 em dois pontos, e a ficha anota os dois: o Meio-orc não tem o −2 Int, e o Gnomo aparece como Médio (é Pequeno).
- **Dados ausentes** (raça, classe ou atributo): tudo o que depende deles fica **em branco**, e a barra de notas avisa. A ficha nunca inventa valores como BBA +1, tamanho "Médio" ou Des +0.
- **Nível**: é limitado a **1–20**. Fora da faixa (0, 25 etc.), a ficha é calculada no nível mais próximo e avisa na barra de notas. O formulário não ganhou validação nova, por paridade com o legado.

### 5.2 Classes básicas
- **Dado de vida, resistências boas, tipo de BBA e perícias de classe seguem a 3.0.** Exemplos:
  - Ranger d10 com só Fortitude boa (o compêndio registra d8);
  - Intimidação não é perícia de classe do guerreiro;
  - Abrir Fechaduras não é do paladino;
  - o mago tem todos os Conhecimentos.
- **Correspondência de perícias 3.0 → compêndio**: Pick Pocket → Prestidigitação; Tumble → Acrobacias; Wilderness Lore e Intuit Direction → Sobrevivência.
  - Alquimia, Empatia com Animais, Mensagens Secretas, Ler Lábios e Vidência não existem no compêndio.
  - O nome gravado com erro no dump ("Usar Intrumento Mágico") também é reconhecido.
- **BBA**: vem da tabela `bba` do compêndio, com ataques múltiplos a cada −5.
- **Classes de prestígio**: usam `dv`, `resistencia` e `bba_tipo` do compêndio. As perícias ficam sem marca de classe ou outra classe, porque o compêndio não tem flags para elas.

### 5.3 Combate
- **PV**: é o valor cadastrado, sem recálculo. O tipo de dado de vida aparece ao lado.
- **CA**:
  - fórmula da 3.0: `10 + armadura + escudo + Des + tamanho + natural + diversos`, sem deflexão;
  - sem equipamento, armadura, escudo e natural ficam em branco;
  - no monge, soma-se Sab + nível/5.
- **Iniciativa**: Des + diversos. O campo `iniciativa` do cadastro é o modificador diverso, e o formulário avisa isso.
- **Resistências**:
  - resistência base boa = 2 + nível/2; fraca = nível/3;
  - somam o atributo, o +1 racial do halfling e a Graça Divina do paladino.
- **Ataques**:
  - corpo a corpo = BBA + For + tamanho;
  - à distância = BBA + Des + tamanho.

### 5.4 Perícias, talentos, XP e carga
- **Perícias**:
  - o total só aparece nas perícias que podem ser usadas sem treinamento (■);
  - bônus raciais e de tamanho entram em "mod. diversos";
  - os marcadores `*` (penalidade de armadura) e `**` (Natação) seguem a ficha oficial;
  - graduação máxima: nível + 3 para perícias de classe, metade para as de outra classe;
  - pontos de perícia: (base + Int) × 4 no 1º nível e (base + Int) nos níveis seguintes, com mínimo de 1; humano ganha +4 no 1º nível e +1 por nível.
- **Talentos**:
  - 1 + nível/3; humano +1;
  - guerreiro: 1 + nível/2 adicionais;
  - mago: nível/5 adicionais, mais Escrever Pergaminho.
- **Aumentos de atributo**: nível/4.
- **XP**: 1000 × N × (N−1)/2. No 20º nível, a ficha indica "nível máximo".
- **Carga**:
  - tabela da 3.0 em kg, a 1 lb = 0,5 kg (a convenção da tradução);
  - Pequeno ×¾;
  - também mostra erguer e empurrar.

### 5.5 Magias
- Por dia: tabela da classe, com +1 de domínio para o clérigo.
- Adicionais: pelo atributo de conjuração.
- CD = 10 + nível da magia + modificador.
- Um nível aparece bloqueado ("—") quando o atributo é baixo demais.
- Magias conhecidas do bardo e do feiticeiro.
- Paladino e ranger começam no 4º nível.

### 5.6 Habilidades de classe (SRD 3.0)

| Classe | O que a ficha mostra |
|---|---|
| Bárbaro | <ul><li>Fúria 1–6/dia</li><li>Fúria maior no 15º</li><li>Sem fadiga depois da fúria no 20º</li><li>Movimento rápido</li><li>Esquiva sobrenatural progressiva</li><li>RD 1/— a 4/— (11º, 14º, 17º e 20º)</li><li>Analfabeto</li></ul> |
| Bardo | <ul><li>Música N/dia</li><li>Conhecimento de bardo</li><li>Inspirar coragem com efeito **fixo** (+2 contra enfeitiçar e medo, +1 no ataque e no dano)</li><li>Contracanto e fascinar</li><li>Competência, sugestão e grandeza, conforme as graduações possíveis em Atuação (3, 6, 9 e 12)</li></ul> |
| Clérigo | Expulsar mortos-vivos 3 + Car, domínios e conversão espontânea |
| Druida | <ul><li>Forma selvagem 1/2/3/4/5/6 por dia (5º, 6º, 7º, 10º, 14º e 18º), com os tamanhos e a forma elemental</li><li>Demais habilidades por nível</li></ul> |
| Monge | <ul><li>Ataque desarmado total (base + For + tamanho) e dano, incluindo a tabela Pequena</li><li>**Ataque atordoante** N/dia, CD 10 + ½ nível + Sab</li><li>Rajada</li><li>Evasão e evasão aprimorada</li><li>CA</li><li>Talentos adicionais: Desviar Objetos (2º) e Imobilização Aprimorada (6º)</li><li>Mente tranquila, pureza e corpo de diamante</li><li>Queda lenta</li><li>**Integridade corporal** 2 × nível PV/dia (7º)</li><li>Golpe ki</li><li>Passo etéreo</li><li>**Alma de diamante: RM = nível + 10** (13º)</li><li>**Palma vibrante** 1/semana, CD 10 + ½ nível + Sab (15º)</li><li>Corpo atemporal e língua do sol e da lua</li><li>Corpo vazio</li><li>**Eu perfeito: RD 20/+1** (20º)</li><li>Deslocamento: tabela própria para Pequeno e anão</li></ul> |
| Paladino | <ul><li>Graça divina, cura pelas mãos, detectar o mal e saúde divina</li><li>Aura de coragem</li><li>**Destruir o mal 1/dia**</li><li>Remover doença 1–6 por semana</li><li>Expulsar mortos-vivos</li><li>Montaria especial</li></ul> |
| Ranger | <ul><li>Rastrear e duas armas</li><li>Inimigos prediletos com o bônus de cada um: cada novo inimigo soma +1 aos anteriores (ex.: +3, +2 e +1 no 10º)</li></ul> |
| Ladino | Ataque furtivo, armadilhas, evasão, esquiva sobrenatural progressiva e habilidades especiais (10º, 13º, 16º e 19º) |
| Feiticeiro e Mago | Familiar; Escrever Pergaminho e talentos adicionais (mago) |

**RD e RM de classe** (`damageReduction` e `spellResistance`) preenchem as caixas da página 1 que a ficha oficial reserva para esses valores: "redução de dano", na linha de PV, e "resist. à magia", na linha de CA.

### 5.7 Condicionais, idiomas e o que fica à mão
- **Condicionais**: vêm separados nos dados.
  - Os de **resistência** (venenos, magias, medo…) vão no quadro ao lado dos testes.
  - Os de **ataque e CA** (orcs, gigantes…) vão para Habilidades especiais.
- **Idiomas**:
  - os automáticos da raça já vêm escritos;
  - a nota lista os adicionais possíveis e o bônus de Int;
  - cada idioma adicional custa 1 ponto de perícia quando Falar Idioma é perícia de classe, ou 2 quando é de outra classe.
- **Para preencher à mão**, como na ficha impressa:
  - armas, armadura, escudo, munição, equipamento e dinheiro;
  - nomes das magias.

  O sistema não relaciona itens nem magias ao personagem.

> **Atualizado na [TASK_004](TASK_004.md):** os talentos escolhidos e as graduações de perícia agora vêm do popup "Talentos e perícias" e aparecem na ficha, com os efeitos numéricos.

## 📐 6. Layout (`js/pages/sheet.js` + `css/sheet.css`)

- **Página 1**:
  - identificação;
  - atributos com colunas temporárias;
  - PV, CA (`= 10 +` e as caixas de falha, falha arcana, penalidade e RM), iniciativa e base de ataque;
  - testes de resistência com modificadores condicionais;
  - corpo a corpo e à distância;
  - 3 armas, armadura, escudo e munição;
  - perícias à direita (50 linhas), com a legenda.
- **Página 2**:
  - campanha e XP;
  - equipamento (31 × 2) e dinheiro;
  - habilidades especiais, carga e idiomas;
  - magias: linhas por nível, CD, tabela por nível e magias conhecidas.
- **Fidelidade à ficha oficial**:
  - especialidade "( ___ )" em Ofícios, Atuação, Profissão e Cavalgar;
  - munição com o nome à esquerda e 2 fileiras de 10 marcas à direita (4 entradas);
  - abas de armadura e escudo em uma linha.
- **Legibilidade**:
  - textos que não cabem são reduzidos até 72% antes das reticências (`fitTexts`);
  - Habilidades especiais usa **pauta contínua**:
    - as linhas são elementos reais atrás do texto, e não um gradiente, que oscilava em escala de 125%;
    - cada entrada ocupa quantas pautas precisar, com recuo pendente nas continuações;
    - se o conteúdo não couber, a pauta encolhe até 13px;
  - todas as faixas pretas têm a mesma altura;
  - a menor fonte é de cerca de 5,6 px (≈ 4,2 pt).
- **Acessibilidade**: h1 na barra; um h2 (visualmente oculto) por página; h3 nos blocos.
- **Pergaminho**:
  - gradientes, ruído SVG e manchas nos cantos;
  - moldura de livro com filete duplo e cantoneiras;
  - tinta sépia.
- **Tela**: largura fixa de A4 (794 × 1123 px). Em telas estreitas a ficha é reduzida com `zoom`, sem rolagem horizontal. No celular (390 px) ela fica a 45% do tamanho, e a leitura é feita ampliando com os dedos ou pelo PDF, pois uma versão reflow perderia o formato da ficha oficial.

## 🩹 7. Desvios e limitações conhecidas

1. **Formato A4**, e não o US Letter do original, porque é o padrão de impressão no Brasil.
2. **Perícias**:
   - a lista é a das 45 perícias do compêndio, com nomes da 3.5;
   - as perícias exclusivamente 3.0 (Alquimia, Punga, Senso de Direção…) não aparecem;
   - as perícias "exclusivas" da 3.0 (Decifrar Escrita, Usar Instrumento Mágico…) não recebem marca especial.
3. **"Usar Intrumento Mágico"** mantém o erro de digitação do dump. A TASK_001 preservou os valores gravados, e a correção pode ser feita no próprio cadastro de Perícias.
4. **Gnomo: +1 na CD de ilusões** não foi aplicado. É regra da 3.5 e não consta do SRD 3.0 (`gnome.htm`).
5. **Classes de prestígio** não têm tabelas de magia nem habilidades calculadas.
6. **Valores muito longos** ainda saem com reticências, mesmo depois da redução de até 72%. Isso só acontece perto dos limites do legado: divindade com 100 caracteres, olhos e cabelos com 40.

## 🧪 8. Testes

- `node tests/ded_make_character_rules.test.js` (18 testes) cobre:
  - o monge nos níveis 6, 7, 12, 13, 15 e 20, com RD e RM;
  - a RD do bárbaro do 10º ao 20º;
  - os bônus dos inimigos prediletos;
  - a ordem dos tamanhos da forma selvagem;
  - as fórmulas;
  - a ficha do seed;
  - raças 3.0 × compêndio;
  - as progressões de habilidades de classe: bárbaro 14, 15, 19 e 20; druida 5 a 18; paladino 5 e 15; bardo 1 e 14; ladino 13; monge;
  - as perícias de classe 3.0: guerreiro, paladino, mago, bardo, ranger e classe de prestígio;
  - os dados ausentes e os níveis 0, 7 e 25;
  - os idiomas e os condicionais.
- `NODE_ENV=test node tests/qa_ded_make_character.test.js` (29 verificações) cobre:
  - criar com "Salvar e gerar ficha" e conferir os valores;
  - o link "Ficha" na lista;
  - editar → "Salvar e gerar ficha", que recalcula;
  - "Ver ficha" sem salvar;
  - 6 perfis sem transbordo, **sem colisão entre blocos da grade** e sem cortar Habilidades especiais: nome longo, bardo 14, druida 18, prestígio no nível 25, personagem sem raça e classe, e monge anão 20;
  - o aviso de nível 0;
  - RD e RM do monge 20 nas caixas;
  - a impressão em **2 páginas A4** (PDF);
  - o 404 e o personagem inexistente.
- Verificação visual de 8 personagens:
  - guerreiro, clérigo anão, mago elfo, monge halfling, bardo gnomo, paladino meio-orc, classe de prestígio e feiticeiro 20;
  - em tela, no celular (390 px) e em PDF.

## ✅ 9. Critérios de aceitação

1. Não existe menu, rota, card nem arquivo de dados de Usuários, e `#/usuarios` mostra o 404.
2. "Salvar e gerar ficha" grava o personagem e abre a ficha. "Ficha", na lista, e "Ver ficha", na edição, abrem a mesma página.
3. Os valores batem com as regras da 3.0 do §5. As divergências do compêndio aparecem na ficha, e dados ausentes ficam em branco.
4. A ficha tem 2 páginas no formato da ficha oficial, com fontes equivalentes às originais, sem transbordo nem sobreposição, e imprime em 2 folhas A4.
