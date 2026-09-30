# Formato do catálogo de combate (`data/catalogo-combate.json`)

Catálogo somente leitura do simulador de combate (TASK_006), com duas seções:
- `monstros`: 20 monstros do SRD 3.0, um por ND de 1 a 20, com o Tarrasque no 20;
- `holy_avenger`: personagens da HQ, em regras 3.0.

```json
{
  "versao": 1,
  "descricao": "…",
  "monstros": [ /* Combatente */ ],
  "holy_avenger": [ /* Combatente */ ]
}
```

- O arquivo é **mantido à mão**. O `tools/sql-to-json.js` não o gera nem o apaga.
- Ao mudar o conteúdo, incremente `versao` e rode o validador:
  ```bash
  node ded_make_character/tools/validar-catalogo.js
  ```
  Ele também valida um array com uma seção só: `validar-catalogo.js arquivo.json monstros`. O teste `tests/ded_make_character_catalogo.test.js` usa o mesmo validador. O que ele confere está marcado com ✔ neste documento.

## Regras gerais

- Chaves e textos em **português (BR)**. Números são números, não strings.
- Unidades:
  - distâncias em **metros**, pela conversão da tradução brasileira: 5 pés = 1,5 m, 10 pés = 3 m, 30 pés = 9 m;
  - pesos não são necessários.
- Tamanhos ✔: `Mínimo`, `Minúsculo`, `Pequeno`, `Médio`, `Grande`, `Enorme`, `Imenso`, `Colossal`.
- Tendência ✔: sigla 3.0 em PT-BR, uma de `LB`, `NB`, `CB`, `LN`, `N`, `CN`, `LM`, `NM`, `CM`.
- **Regras da 3.0, não da 3.5.** Alguns exemplos da diferença:
  - RD no formato `15/+5`, e não `15/epic` ✔ (aviso);
  - funda não soma For ao dano;
  - valores e ND do *Monster Manual* 3.0.
  - Na dúvida, prevalece o SRD 3.0: http://www.dragon.ee/30srd/
- **Só o SRD.** Monstros que são *Product Identity* da Wizards (devorador de mentes, beholder, yuan-ti etc.) não entram ✔. Atenção: o dragon.ee também publica alguns desses, então ter a fonte no dragon.ee não prova que o monstro é do SRD.
- **Textos próprios.** `resumo`, `descricao` e `tatica` são escritos com as suas palavras, em 1 ou 2 frases. Nada copiado de livro ou wiki. Números de estatística podem ser transcritos.

## Listas fechadas ✔

| Lista | Valores |
|---|---|
| **Energias** (`tipo_energia`, `dano_extra.tipo`, chaves de `resistencias_energia`, `regeneracao.exceto`, `vulnerabilidades`) | `fogo`, `frio`, `eletricidade`, `ácido`, `sônico`, `energia` (dano de força), `energia negativa`, `energia positiva`, `divino`, `sagrado`, `profano`, `caótico`, `leal` |
| **Condições** (`condicao`) | `abalado`, `amedrontado`, `apavorado`, `atordoado`, `cambaleante`, `cego`, `confuso`, `derrubado`, `enfeitiçado`, `enjoado`, `enredado`, `fatigado`, `exausto`, `imobilizado`, `inconsciente`, `lento`, `nauseado`, `paralisado`, `pasmo`, `petrificado`, `surdo`, `morto` |
| **`afeta`** e **`condicao_afeta`** | `etico`, `exceto_etico` (siglas `L`, `N`, `C`), `moral`, `exceto_moral` (siglas `B`, `N`, `M`), `tipo`, `exceto_tipo`, `exceto_subtipo`, `exceto_raca`, `exceto_estado` (arrays de nomes), `dv_max`, `pv_max` (inteiros), `tamanho_max`, `somente` (texto) |
| **Duração** (`duracao`) | dado ou número + `rodada(s)`, `minuto(s)` ou `hora(s)` (ex.: `"1d4 rodadas"`, `"10 minutos"`), ou uma forma por extenso começando com `permanente`, `instantânea`, `concentração`, `até …` ou `enquanto …` |
| **`bonus`** (reforços de magias e auras) | `ca` (genérico, ex.: cobertura), `ca_natural`, `ca_deflexao`, `ataque`, `dano`, `resistencias` (as três), `fort`, `ref`, `von`, `for`, `des`, `con`, `int`, `sab`, `car`, `pv_temporarios`, `camuflagem_pct`, `niveis_negativos`, `penalidade_for`, `imagens`, `acoes_extras`, `pericias` (`{ "Furtividade": -4 }`), `anula` (magias anuladas), `rm`, `bba_efetivo`, `for_minima`, `tamanho`, `dano_arma`, `contra_medo` |
| **Imunidades** (`imunidades`) | as energias, mais `veneno`, `sono`, `paralisia`, `atordoamento`, `doença`, `acertos críticos`, `dano por contusão`, `dano de atributo`, `dreno de energia`, `efeitos de ação mental`, `morte por dano maciço`, `efeitos de morte`, `metamorfose`, `medo`, `enfeitiçar`, `derrubar`, `petrificação`, `magia` (a regra fina vai no especial `imunidade-magia`) |
| **Resistências** (`resistencia`) | `fort`, `ref`, `von` |
| **Quando** (`quando`, gatilhos que não são ataques) | `ao-atacar`, `olhar`, `ao-morrer`, `ao-sofrer-dano`, `critico-confirmado`, `natural-20` |

- Qualificações ficam em campos à parte, e não dentro do valor:
  - duração em `duracao`;
  - **`afeta` restringe o efeito inteiro**: quem não atende não sofre nada. Ex.: `{ "tipo": ["Humanoide"], "tamanho_max": "Médio" }` (Imobilizar Pessoa), `{ "exceto_moral": ["B"] }` (Palavra Sagrada: "não bons");
  - **`condicao_afeta`** restringe só a condição de um efeito que atinge mais gente. Ex.: a Praga Profana causa dano aos bons e aos neutros, mas só os bons ficam enjoados: `{ "moral": ["B"] }`.
- **Tendência tem eixo.** A tendência do combatente (`LB`, `NB`, `N`, …) tem um eixo ético (primeira letra: `L`, `N`, `C`) e um moral (segunda letra: `B`, `N`, `M`). O `N` sozinho é neutro nos dois. Por isso a restrição diz sempre o eixo (`etico`, `moral`), e uma criatura NB é "N" no eixo ético e "B" no moral.
- **Dano por tendência** diz o eixo: `"dano_por_tendencia": { "eixo": "moral", "B": "total", "N": "metade", "M": "nenhum" }`. Nesse caso a tendência não vai em `afeta` ✔.
- Dano que se divide entre duas energias (Coluna de Chamas: metade fogo, metade divino) usa um **array**: `"tipo_energia": ["fogo", "divino"]`.

## Combatente

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string ✔ | slug único `[a-z0-9-]`, ex.: `tarrasque`, `ha-lisandra` (único no catálogo inteiro ✔) |
| `nome` | string | nome em PT-BR (tradução Devir quando houver) |
| `nome_original` | string \| null | nome em inglês do monstro; `null` para Holy Avenger |
| `categoria` | ✔ `"monstro"` \| `"holy_avenger"` | |
| `nd` | inteiro 1–20 ✔ | Nível de Desafio. Monstros: um por ND, sem repetir, com o Tarrasque no 20 ✔ |
| `nivel` | inteiro 1–20 ✔ | o que o seletor mostra: igual ao `nd` para monstro ✔; nível de personagem para Holy Avenger |
| `classes` | array ✔ | `[{ "classe": "Guerreiro", "nivel": 8 }]`, com nomes PT das classes do Livro do Jogador 3.0; `[]` para monstro sem classe; soma ≤ 20 ✔ |
| `raca` | string \| null | para Holy Avenger (ex.: `Humano`, `Elfo`) |
| `tipo` | string ✔ | tipo 3.0 em PT-BR: Aberração, Animal, Besta, Besta Mágica, Constructo, Dragão, Elemental, Fada, Gigante, Humanoide, Humanoide Monstruoso, Limo, Extra-Planar, Planta, Morto-Vivo, Verme |
| `subtipos` | string[] | ex.: `["Fogo"]`, `["Mau", "Leal"]` |
| `tamanho`, `tendencia` | string ✔ | ver as listas acima |
| `resumo` | string ✔ | ≤ 300 caracteres, texto próprio |
| `dados_vida` | string ✔ | ex.: `"4d8+8"`, `"48d10+576"`; com mais de um dado (raça com DV, multiclasse), a soma: `"10d10+10d8+60"` |
| `pv` | inteiro ✔ | monstros: a média dos dados do bloco oficial ✔ (aviso); personagens: máximo no 1º nível, média arredondada para cima nos demais, + Con |
| `iniciativa` | inteiro ✔ | bônus total |
| `deslocamento` | objeto ✔ | `{ "terrestre": 9, "voo": null, "voo_manobrabilidade": null, "natacao": null, "escalada": null, "escavacao": null }`, em metros |
| `espaco` | número ✔ | **maior** lado ocupado em metros (*Face* 3.0): 1,5 para Médio; 3 para "1,5 m × 3 m" |
| `alcance` | número ✔ | alcance natural em metros (*Reach*) |
| `ca` | objeto ✔ | `{ "total": 16, "toque": 8, "surpresa": 16, "composicao": "−1 tamanho, −1 Des, +5 natural, +3 gibão" }`. **Não inclui Esquiva** ✔: o motor soma +1 contra o alvo escolhido. Toque ≤ total ✔ (aviso) |
| `bba` | inteiro ✔ | bônus base de ataque |
| `agarrar` | inteiro ✔ | BBA + modificador de agarrar do tamanho (Mínimo −16, Minúsculo −8, Pequeno −4, Médio 0, Grande +4, Enorme +8, Imenso +12, Colossal +16) + mod. de For. O 3.0 não imprime esse valor; ele é calculado ✔ |
| `ataques` | Ataque[] ✔ | opções de **ataque único** (ação padrão); a primeira é a preferida |
| `ataque_total` | Ataque[] ✔ | sequência completa do **ataque total**, um golpe por item (os iterativos aparecem repetidos, com bônus menores); é a sequência corpo a corpo quando existem as duas |
| `ataque_total_distancia` | Ataque[] \| null ✔ | segunda sequência de ataque total, **à distância** (ex.: arco +8/+3); só golpes à distância ✔; `null` se não tiver |
| `ataques_especiais`, `qualidades_especiais` | Especial[] ✔ | ids únicos no combatente ✔ |
| `reducao_dano` | objeto \| null ✔ | `{ "valor": 15, "exceto": "+5" }` (3.0: arma com bônus de melhoria +5 ou mais), `"exceto": "prata"` ou `"—"` |
| `resistencia_magia` | inteiro \| null ✔ | |
| `resistencias_energia` | objeto ✔ | ex.: `{ "fogo": 10 }`; `{}` se nenhuma |
| `imunidades`, `vulnerabilidades` | string[] ✔ | ver as listas acima; `vulnerabilidades` só aceita energias (uma fraqueza de outro tipo, como a ferrugem do golem, vira especial) |
| `regeneracao` | objeto \| null ✔ | `{ "valor": 5, "exceto": ["fogo", "ácido"] }`; `exceto` aceita também uma arma: `{ "arma": { "qualidade": ["sagrada", "abençoada"], "bonus_minimo": 3 } }`. `"resiste_morte": true` (Tarrasque): efeito de morte só o derruba |
| `cura_acelerada` | inteiro \| null ✔ | |
| `resistencias` | objeto ✔ | `{ "fort": 6, "ref": 0, "von": 1 }` (totais) |
| `atributos` | objeto ✔ | `{ "for": 21, "des": 8, "con": 15, "int": 6, "sab": 10, "car": 7 }`; `null` no atributo que não existe (ex.: Con de morto-vivo) |
| `pericias` | array ✔ | `[{ "nome": "Ouvir", "total": 2 }]` |
| `talentos` | string[] ✔ | nomes do compêndio (`data/talentos.json`), com o parâmetro entre parênteses se houver: `"Foco em Arma (espada longa)"`. Fora do compêndio, só os talentos de monstro do *Monster Manual* 3.0 (Ataques Múltiplos, Ataque em Voo, Multidestreza, Combater com Múltiplas Armas) e os de Tormenta usados pelas fichas oficiais (Trapaceiro Nato, Fúria Guerreira) ✔ |
| `equipamento` | string[] ✔ | itens relevantes para o combate |
| `magias` | objeto \| null ✔ | ver "Magias" abaixo |
| `tatica` | string ✔ | 1 ou 2 frases de como o combatente luta, para a IA do simulador |
| `fonte` | objeto ✔ | `{ "referencia": "SRD 3.0 — Monster Manual 3.0", "url": "http://…" }`; para Holy Avenger, a página da wiki do personagem e a origem das estatísticas |
| `adaptacao` | string \| null ✔ | o que foi estimado ou adaptado e por quê (`null` quando os números são oficiais sem mudança) |

## Ataque

```json
{
  "nome": "Mordida",
  "tipo": "corpo a corpo",
  "bonus": 57,
  "dano": "4d8+17",
  "critico": { "margem": 18, "multiplicador": 3 },
  "tipo_dano": ["perfurante"],
  "natural": true,
  "secundario": false,
  "alcance_m": 4.5,
  "incremento_m": null,
  "magico": null,
  "material": null,
  "dano_extra": [],
  "efeitos": ["agarrar-aprimorado"]
}
```

- `tipo` ✔: `corpo a corpo`, `distancia`, `toque` ou `toque a distancia`. À distância exige `incremento_m` ✔.
- `dano` ✔: só dados e modificador (`^\d+d\d+([+-]\d+)?$`). Dano fixo sem dado vai em `"0d0+N"`.
- `dano_extra` ✔: dano de energia adicional, `[{ "dano": "1d6", "tipo": "fogo" }]`. Com `afeta` quando vale só contra alguns alvos: a espada sagrada do Paladino tem `{ "dano": "2d6", "tipo": "sagrado", "afeta": { "moral": ["M"] } }`.
- **Campos fora do formato são erro** ✔ no combatente, no ataque e no `dano_extra`, como na `mecanica`.
- `critico` ✔: `margem` é o menor d20 natural que ameaça (20, 19, 18, 17 ou 15); `multiplicador` é 2, 3 ou 4.
- `tipo_dano` ✔: `cortante`, `perfurante`, `concussão` (pode ter mais de um; vazio só em ataque de toque).
- `natural`, `secundario` ✔ (booleanos). **O bônus e o dano já trazem** o −5 e a metade da For dos ataques naturais secundários: o motor não os aplica de novo.
- `magico` ✔: `null` ou o bônus de melhoria (`"+1"` a `"+6"`). É o que vence a RD 3.0 `x/+N`.
- `material` ✔: `null`, `"prata"`, `"adamante"` ou `"mitral"`.
- `efeitos` ✔: ids de especiais (`ataques_especiais` ou `qualidades_especiais`) que o acerto dispara. Cada id precisa existir ✔.

## Especial

```json
{
  "id": "sopro",
  "nome": "Sopro",
  "natureza": "Sob",
  "descricao": "texto próprio curto",
  "mecanica": { "efeito": "sopro", "…": "…" }
}
```

- `natureza` ✔: `Ext` (extraordinária), `Sob` (sobrenatural) ou `SM` (similar a magia).
  - A **resistência à magia** só vale contra magias e contra `SM`; não vale contra `Ext` nem `Sob`.
  - Um poder que lança magias de verdade, como o Olho de Sszzaas, deve ser `SM`, ou as magias ficam em `magias`.
- `mecanica`:
  - é `null` quando o efeito não tem como ser simulado (sentidos, traços de tipo, invocações). O simulador só registra que a habilidade existe;
  - `efeito: "outro"` também **não é simulado**. Serve para guardar números de algo que o motor ainda não cobre (ex.: forma selvagem).
- **Gatilho** ✔: `gatilho` é sempre um **array com nomes de ataques do próprio combatente** (ex.: `["Mordida", "Garra"]`). Quando o gatilho não é um ataque, use `quando` (lista acima). Um efeito que vem do sopro vai dentro do próprio `sopro`: veja o gás do golem abaixo.
- Recarga ✔: `"1d4"` (rodadas) ou um inteiro de rodadas (`10` para "1/minuto"). `compartilhada_com` recebe o `id` de outro sopro que usa a mesma recarga.

### Vocabulário de `mecanica.efeito` ✔

Esta tabela é gerada por `tools/gerar-tabela-efeitos.js` a partir de `EFEITOS` em `tools/validar-catalogo.js`, que é a fonte única (o teste do catálogo confere que as duas batem). Qualquer campo fora das três colunas é erro ✔, exceto `nota` (texto livre, aceita em todos) e o efeito `outro`, que é livre.

| efeito | obrigatórios | pelo menos um de | opcionais | observações |
|---|---|---|---|---|
| `sopro` | **`area`**, **`tamanho_m`**, **`resistencia`**, **`cd`**, **`recarga`** | `dano` + `tipo_energia` ou `condicao` ou `veneno` | `metade_se_passar`, `duracao`, `afeta`, `condicao_afeta`, `compartilhada_com`, `acao`, `primeiro_uso`, `nuvem_dura` | área `cone` \| `linha` \| `cubo` \| `raio`; `recarga` `"1d4"` ou inteiro; `veneno` = `{ inicial, secundario }` |
| `agarrar-aprimorado` | **`gatilho`** | — | `tamanho_max`, `dano_por_rodada`, `requer` | `tamanho_max` padrão: uma categoria menor que o monstro |
| `constricao` | **`dano`**, **`tipo_dano`** | — | `tamanho_max` |  |
| `engolir` | **`tamanho_max`**, **`dano_por_rodada`**, **`ca_interna`**, **`pv_para_sair`** | — | `dano_extra`, `capacidade` |  |
| `engolfar` | **`tamanho_max`**, **`resistencia`**, **`cd`** | — | `dano_por_rodada`, `tipo_energia`, `condicao`, `duracao`, `paralisia`, `acao` | `paralisia` = `{ resistencia, cd, duracao }` (toque paralisante do cubo) |
| `rasgar` | **`requer`**, **`dano`** | — | — |  |
| `bote` | — | — | — | ataque total ao fim de uma investida |
| `atropelar` | **`dano`**, **`resistencia`**, **`cd`** | — | `metade_se_passar`, `tamanho_max` |  |
| `esmagar` | **`tamanho_max`**, **`dano`**, **`resistencia`**, **`cd`** | — | `tipo_dano`, `acao`, `area` |  |
| `veneno` | **`gatilho`**, **`resistencia`**, **`cd`**, **`inicial`**, **`secundario`** | — | — | `inicial`/`secundario` = `{ "atributo": "for", "dano": "1d6" }` ou `{ "condicao": "morto" }` |
| `presenca-aterradora` | **`quando`**, **`raio_m`**, **`resistencia`**, **`cd`**, **`condicao`**, **`duracao`** | — | `afeta`, `efeitos_por_dv` | `quando: "ao-atacar"`; `raio_m: null` = todos os inimigos da luta |
| `paralisia` | **`gatilho`**, **`resistencia`**, **`cd`**, **`duracao`** | — | `afeta` |  |
| `condicao-ao-acertar` | **`gatilho`**, **`resistencia`**, **`cd`**, **`condicao`**, **`duracao`** | — | `afeta` | condição com teste a cada acerto (ex.: medo da pancada do balor) |
| `dreno-energia` | **`gatilho`**, **`niveis`**, **`cd`** | — | — |  |
| `petrificacao` | **`resistencia`**, **`cd`** | `quando` ou `gatilho` | `alcance_m`, `permanente` | `quando: "olhar"` ou `gatilho` |
| `magia` | **`magia`**, **`usos`** | `dano` ou `cura` ou `condicao` ou `bonus` ou `efeitos_por_dv` | `nivel_conjurador`, `cd`, `tipo_energia`, `dano_extra`, `area`, `alvo`, `resistencia`, `metade_se_passar`, `duracao`, `afeta`, `condicao_afeta`, `ataque`, `acerto_automatico`, `dano_por_tendencia`, `duracao_por_pv`, `pv_temporarios`, `tempo_de_execucao` | `efeitos_por_dv` = `[{ "dv_max": 7, "condicao": "paralisado", "duracao": "…" }]`, cumulativos (vale toda entrada cujo `dv_max` o alvo atende; sem `dv_max`, vale para todos); `dano_por_tendencia` = `{ "eixo": "etico", "L": "total", "N": "metade", "C": "nenhum" }` (com ele, a condição restrita vai em `condicao_afeta`); `ataque` = tipo de ataque (ex.: `toque a distancia`) |
| `aura` | **`raio_m`** | `dano` + `tipo_energia` ou `condicao` ou `bonus` ou `dano_atributo` | `resistencia`, `cd`, `duracao`, `afeta`, `condicao_afeta`, `alvo`, `acao` | `dano_atributo` = `{ atributo, dano }` |
| `queimar` | **`gatilho`**, **`resistencia`**, **`cd`**, **`dano`**, **`tipo_energia`** | — | `duracao`, `apagar`, `ao_ser_atingido` | quem pega fogo; `ao_ser_atingido`: quem acerta o monstro com arma natural também pode pegar fogo |
| `ataque-furtivo` | **`dano`** | — | — | vale quando o alvo perde a Des na CA; nunca contra imunes a crítico; à distância só até 9 m |
| `evasao` | — | — | `aprimorada` | só com armadura leve ou sem armadura |
| `furia` | **`usos`**, **`for`**, **`con`**, **`von`**, **`ca`**, **`duracao_rodadas`** | — | `maior`, `sem_fadiga` |  |
| `destruir` | **`usos`**, **`bonus_ataque`**, **`bonus_dano`**, **`alvo`** | — | — | `alvo`: `maligno` \| `bom` \| `leal` \| `caótico` \| `qualquer` |
| `inspirar-coragem` | **`usos`**, **`bonus_ataque`**, **`bonus_dano`** | — | `bonus_contra_medo`, `duracao` |  |
| `camuflagem` | **`chance_pct`** | — | — | chance de o ataque errar (ex.: deslocamento 50) |
| `falha-de-magia` | **`chance_pct`** | — | `aplica_a`, `retorna_ao_dono` | chance de a magia falhar; `aplica_a` = ids dos especiais afetados (sem ele, vale para todas as magias) |
| `vorpal` | **`gatilho`**, **`quando`** | — | `resultado` | `quando`: `critico-confirmado` \| `natural-20` |
| `explosao-ao-morrer` | **`quando`**, **`raio_m`**, **`dano`**, **`resistencia`**, **`cd`** | — | `tipo_energia`, `metade_se_passar` | `quando: "ao-morrer"` |
| `imunidade-magia` | — | — | `abrange`, `excecoes` | `excecoes` = `[{ "tipo_energia": "eletricidade", "efeito": "lento 3 rodadas" }]` ou `[{ "magia": "de deuses maiores" }]` |
| `refletir-magia` | **`afeta`**, **`chance_pct`** | — | `senao`, `ordem` | `afeta` = array (ex.: `["raios", "linhas", "cones", "Mísseis Mágicos"]`) |
| `enredar` | **`gatilho`**, **`condicao`** | — | `escapar`, `puxar`, `alcance_max_m`, `incremento_m`, `pv_chicote` |  |
| `cura-pelas-maos` | **`pv_por_dia`** | — | — |  |
| `outro` | — | — | — | livre, **não simulado** |

Exemplo, o gás do golem de ferro (sopro que envenena):

```json
{ "efeito": "sopro", "area": "cubo", "tamanho_m": 3, "resistencia": "fort", "cd": 17, "recarga": "1d4+1",
  "veneno": { "inicial": { "atributo": "con", "dano": "1d4" }, "secundario": { "condicao": "morto" } } }
```

## Magias (conjuradores)

```json
{
  "classe": "Mago",
  "nivel_conjurador": 10,
  "atributo": "int",
  "cd_base": 14,
  "lista": [
    {
      "nivel": 3,
      "nome": "Bola de Fogo",
      "quantidade": 2,
      "mecanica": { "efeito": "magia", "magia": "Bola de Fogo", "usos": "2/dia", "dano": "10d6", "tipo_energia": "fogo", "area": "esfera 6 m", "resistencia": "ref", "metade_se_passar": true }
    }
  ]
}
```

- `lista` traz só as magias que importam no combate, em vez do grimório inteiro.
- `cd_base` = 10 + mod. do `atributo` ✔, e a CD de cada magia é `cd_base` + nível da magia.
- `mecanica` é `null` quando a magia não é simulável. Quando existe, segue o efeito `magia` ✔. Na `lista`, `magia` e `usos` são opcionais, porque `nome` e `quantidade` já dizem isso.
