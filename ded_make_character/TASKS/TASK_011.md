# 🛡️ Tarefa 011 - D&D Make Character: Tabuleiro Tático 3.5, Miniaturas com Nano Banana e Cones de Efeito

**Status**: 🚀 Dev Complete — Etapas E0 a E6 prontas e validadas por testes unitários e E2E  
**Responsável**: Antigravity / Claude (Dev)  
**Branch**: `feat/ded-arena-tabuleiro`  
**Depende de**: TASK_006 (Arena e motor de combate), TASK_008 (catálogo de combate), TASK_009 (IA de combate), TASK_010 (Bestiário e cards completos)

---

## 🔍 1. Pedido do Usuário

> Criar uma branch nova e trabalhar em uma melhoria visual no `ded_make_character`: mostrar um tabuleiro com as miniaturas de quem estiver lutando e suas posições. Elaborar um plano em várias etapas para trabalhar nisso. Usar o Nano Banana para criar imagens para as miniaturas e usá-las no tabuleiro. As regras de tamanho das miniaturas devem seguir a simplificação da edição 3.5. Leve em consideração no plano mostrar os cones de ataques das magias e outras habilidades como o sopro do dragão.

---

## 🧭 2. Diagnóstico do Estado Atual

| Componente | Estado Atual | O que precisa para a TASK_011 |
|---|---|---|
| **Motor de Combate** (`combat30.js`) | Distância escalar 1D em linha reta (`c.pos`, onde Lado A começa em 0 e Lado B em `distancia` metros). `gap(a, b) = Math.abs(a.pos - b.pos)`. | Manter o motor 100% retrocompatível (para não quebrar simulação em lote de 1.000 lutas nem a IA). Projetar as posições em um grid 2D visual (`tabuleiro35.js`) com raias (lanes Y) para engajamento frontal e flanqueamento sem sobreposição. |
| **Arena Visual** (`arena.js`) | Mostra apenas controles, cards de status estáticos, lista de ordem de iniciativa e log textual de eventos (`b.eventos`). | Adicionar componente visual do Tabuleiro Tático interativo acima ou integrado à Ordem de Iniciativa e Registro. |
| **Miniaturas / Imagens** | Não há imagens de criaturas nem tokens. O catálogo possui apenas dados numéricos e texto. | Gerar tokens circulares com moldura dourada usando o **Nano Banana** (`generate_image`), organizados em `ded_make_character/assets/tokens/` com catálogo `tokens.json`, com fallback procedural em SVG/Canvas. |
| **Tamanhos das Criaturas** | Catálogo traz tamanhos 3.0 (`espaco: '1,5 m'`, `'3 m'`, `'4,5 m'`) com distinções 3.0 de face/alcance. | Converter para o padrão unificado **D&D 3.5 (Space N×N quadrados)**: Médio/Pequeno = 1×1, Grande = 2×2, Enorme = 3×3, Imenso = 4×4, Colossal = 6×6+. |
| **Áreas de Efeito (AoE)** | `parseArea` em `combat30.js` calcula abstratamente capacidade de criaturas atingidas (`capacidade = PI * s * s / 8 / 2.25` para cones). | Projeção geométrica oficial da 3.5 em grade (cone de 90° originando do combatente): overlay gráfico translúcido (fogo, gelo, ácido) iluminando as células afetadas e os tokens na área durante sopros de dragão e magias. |

---

## 📐 3. Regras de Tamanho de Miniaturas (Simplificação D&D 3.5)

Na transição de D&D 3.0 para 3.5, a Wizards of the Coast eliminou as orientações retangulares ("face" 5×10 pés) e padronizou o espaço ocupado (*Space*) para **formatos quadrados simétricos** em uma grade de 5 pés (1,5 m por quadrado):

| Categoria de Tamanho | Espaço Ocupado (3.5) | Grade do Tabuleiro | Exemplos no Catálogo |
|---|---|---|---|
| **Mínimo / Minúsculo / Miúdo** (*Fine / Diminutive / Tiny*) | < 5 pés (< 1,5 m) | **< 1 quadrado** (0.5× ou compartilha a mesma célula) | Morcego, Aranha Miúda |
| **Pequeno** (*Small*) | 5 pés (1,5 m) | **1 × 1 quadrado** | Kobold, Goblin, Halfling |
| **Médio** (*Medium*) | 5 pés (1,5 m) | **1 × 1 quadrado** | Humano, Elfo, Orc, Zumbi, Carniçal |
| **Grande** (*Large*) | 10 pés (3,0 m) | **2 × 2 quadrados** | Ogro, Troll, Dragão Vermelho Jovem |
| **Enorme** (*Huge*) | 15 pés (4,5 m) | **3 × 3 quadrados** | Gigante do Gelo, Dragão de Prata Adulto |
| **Imenso / Gargantuesco** (*Gargantuan*) | 20 pés (6,0 m) | **4 × 4 quadrados** | Dragão Vermelho Ancião, Balor Grande / Titã |
| **Colossal** (*Colossal*) | 30+ pés (9,0+ m) | **6 × 6 quadrados ou mais** | Tarrasque |

---

## 🔥 4. Geometria de Cones e Áreas de Efeito (D&D 3.5)

No D&D 3.5, cones originam-se em uma interseção ou borda do espaço da criatura e se propagam em um ângulo de ~90° na direção do ataque:

- **Cone de 15 pés (4,5 m)** (ex.: *Mãos Flamejantes*):
  - Alcance: 3 quadrados.
  - Formato no grid: 1 quadrado na linha 1, 2 na linha 2, 3 na linha 3 (6 quadrados no total).
- **Cone de 30 pés (9 m)** (ex.: *Sopro de Dragão Jovem*, *Cone de Frio* básico):
  - Alcance: 6 quadrados.
  - Formato no grid: expande progressivamente até 6 quadrados de largura na base.
- **Cone de 60 pés (18 m)** (ex.: *Sopro de Dragão Adulto/Ancião*, *Cone de Frio* em alto nível):
  - Alcance: 12 quadrados.
  - Cobre área massiva no grid.
- **Visualização Dinâmica no Tabuleiro**:
  1. Desenho de malha vetorial poligonal semi-transparente sobre o grid com o gradiente temático:
     - **Fogo**: Vermelho-dourado incandescente com partículas cintilantes.
     - **Frio**: Azul glacial ciano com efeito de geada.
     - **Ácido**: Verde esmeralda cáustico.
     - **Gás / Sono / Paralisia**: Névoa púrpura/esverdeada translúcida.
  2. Destaque das células do grid que são interceptadas pelo cone (glow nas bordas das células).
  3. Miniaturas dentro da área recebem feedback de alerta e efeito de impacto correspondente.

---

## 🎨 5. Geração de Miniaturas com Nano Banana

As imagens das miniaturas serão geradas via **Nano Banana** (Gemini Image Generation / `generate_image`) com prompt engineering padronizado para garantir consistência estética com o tema *dark fantasy* do Playful Hub:

### 5.1 Especificação Visual do Token
- **Formato**: Token circular de mesa virtual (VTT token) com moldura metálica ornada (ouro envelhecido para Lado A, ferro negro e rubi para Lado B).
- **Enquadramento**: Retrato expressivo ou visão 3/4 dinâmica com profundidade, mantendo alta legibilidade mesmo em 32×32 ou 64×64 pixels.
- **Fundo**: Fundo atmosférico escuro, neutro e sem poluição visual externa.
- **Armazenamento**: Salvo em `ded_make_character/assets/tokens/<id_combatente>.png`.
- **Mapeamento**: `data/tokens.json` mapeia o `id` da criatura para o caminho do arquivo e metadados de recorte.
- **Fallback Procedural**: Caso uma criatura nova ou personagem personalizado não tenha imagem gerada, um gerador procedural desenha um token vetorial SVG com as iniciais do combatente, cor do lado e símbolo da classe/tipo.

---

## 🗺️ 6. Etapas do Plano de Trabalho

| # | Etapa | Descrição e Entregáveis | Critérios de Aceitação / Verificação |
|---|---|---|---|
| **E0** | **Setup e Branch** | Criação da branch `feat/ded-arena-tabuleiro`, elaboração deste documento `TASK_011.md` e atualização do `BACKLOG.md`. | Branch ativa, testes existentes de combate verdes (`node tests/ded_make_character_combate.test.js`). |
| **E1** | **Motor do Tabuleiro e Regras 3.5 (`tabuleiro35.js`)** | Módulo puro (sem DOM) para gerenciar o grid de combate 2D, conversão de metros para quadrados (1 quadrado = 1,5m), regras de espaço de tamanho 3.5 (1×1 a 6×6) e projeção de posições das criaturas sem sobreposição. | Testes unitários com 100% de cobertura das dimensões 3.5 e projeção de coordenadas. |
| **E2** | **Geração de Tokens com Nano Banana & Catálogo** | Pipeline de geração de imagens via Nano Banana para os 20 monstros do catálogo, heróis de Holy Avenger e arquétipos de classes; criação de `ded_make_character/assets/tokens/`, `data/tokens.json` e gerador de fallback procedural SVG. | Todas as criaturas do catálogo possuem token mapeado ou fallback elegante; imagens com estilo visual consistente e moldura definida. |
| **E3** | **Geometria e Cálculo de Cones (`cones35.js`)** | Módulo de cálculo matemático de cones, linhas e explosões no grid discreto D&D 3.5. Identificação das células atingidas e dos combatentes interceptados pela área. | Testes geométricos garantindo que cones de 15 ft, 30 ft e 60 ft atinjam o número exato de células em diferentes orientações. |
| **E4** | **Componente Visual do Tabuleiro (`tabuleiro.js` + `tabuleiro.css`)** | Componente de interface interativo com renderização Canvas/SVG do grid, posicionamento das miniaturas dimensionadas, barras de PV, badges de status, animações de movimento e overlays vibrantes de sopro/cone. Clique na miniatura abre o card de TASK_010. | Visual polido nos temas dark fantasy do app; responsivo e com suporte a zoom/scroll em telas menores; sem memory leaks de Canvas. |
| **E5** | **Integração na Arena (`arena.js`)** | Conexão do tabuleiro aos controles da luta ("Próxima ação", "Próxima rodada", "Até o fim", "Recomeçar"). Quando um sopro ou magia ocorre no log, o tabuleiro dispara a animação do cone em sincronia. | Luta completa pode ser acompanhada visualmente no tabuleiro; testes da Arena continuam passando. |
| **E6** | **Testes E2E, Regressão e Documentação** | Testes de integração automatizados em `tests/ded_make_character_tabuleiro.test.js` e E2E Puppeteer em `tests/qa_ded_tabuleiro.test.js`. Atualização de `CLAUDE.md`, `BACKLOG.md` e fechamento da task. | Todos os testes do repositório verdes; documentação sincronizada; evidências visuais capturadas. |

---

## ⚠️ 7. Riscos e Mitigações

1. **Risco**: Quebrar a velocidade da simulação em lote de 1.000 lutas da Arena.  
   **Mitigação**: O motor de simulação (`combat30.js`) permanece puro e desacoplado. O tabuleiro só é instanciado e renderizado na visualização interativa passo-a-passo (`fase === 'luta'`), sem nenhum impacto no benchmark do lote.
2. **Risco**: Sobreposição de miniaturas grandes (ex: 2x2 ou 3x3) na mesma casa.  
   **Mitigação**: O algoritmo de projeção 2D de `tabuleiro35.js` calcula raias laterais (eixo Y) baseadas no índice de engajamento e footprint da criatura, garantindo que criaturas adjacentes se posicionem lado a lado como em uma linha de frente real.
3. **Risco**: Lentidão ou corte de cones grandes (ex: 60 pés / 18m) em telas pequenas.  
   **Mitigação**: O tabuleiro utiliza viewport virtual com Canvas/SVG responsivo e escala dinâmica automática conforme a distância máxima entre combatentes.

---

## 🚫 8. Fora do Escopo Inicial

- Movimentação manual de tokens por drag-and-drop pelo jogador (o motor da Arena segue autônomo baseado na iniciativa e IA de combate).
- Mapas com obstáculos de terreno complexos (árvores, paredes, elevações) — o grid simula o campo de batalha aberto da Arena.

---

## 📊 9. Andamento e Entregas

| Etapa | Status | Detalhes da Entrega |
|---|---|---|
| **E0: Setup & Branch** | ✅ Concluído | Branch `feat/ded-arena-tabuleiro`, documentação `TASK_011.md` e `BACKLOG.md`. |
| **E1: Motor Espacial 2D & Regras 3.5** | ✅ Concluído | `js/rules/tabuleiro35.js`: 1 quadrado = 1,5m, tamanhos 1x1 a 6x6, projeção em raias determinísticas. |
| **E2: Miniaturas com Nano Banana** | ✅ Concluído | Imagens geradas com Nano Banana salvas em `assets/tokens/` (Dragão Vermelho, Dragão de Prata, Troll, Ogro, Guerreiro/Paladino, Mago); `data/tokens.json`; fallback procedural SVG em `js/rules/tokens.js`. |
| **E3: Geometria de Cones & Áreas** | ✅ Concluído | `js/rules/cones35.js`: ângulo oficial de 90°, cálculo discreto de células afetadas, interceptação de combatentes e temas temáticos (fogo, frio, ácido, gás, eletricidade). |
| **E4: Componente Visual do Tabuleiro** | ✅ Concluído | `js/pages/tabuleiro.js` + `css/tabuleiro.css`: grid quadriculado medieval, tokens dimensionados, barras de PV dinâmicas, pulsação no turno ativo, overlay de cone com polígono SVG e células iluminadas. |
| **E5: Integração na Arena** | ✅ Concluído | `js/pages/arena.js`: montagem, atualização dinâmica em "Próxima ação", "Próxima rodada", "Até o fim" e recarregamento sem memory leaks. |
| **E6: Testes Automatizados** | ✅ Concluído | 12 testes unitários (`tests/ded_make_character_tabuleiro.test.js`) + 8 testes E2E com Puppeteer (`tests/qa_ded_tabuleiro.test.js`) + 53 testes de combate sem regressão. |

