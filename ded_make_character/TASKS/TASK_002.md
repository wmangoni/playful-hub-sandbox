# 📜 Tarefa 002 - D&D Make Character: Talentos com requisitos, benefício e normal + remoção de "Tipos de Requisito"

**Status**: 🚀 Dev Complete
**Responsável**: Claude (Dev)
**Branch**: `feat/ded-make-character`
**Depende de**: TASK_001 (migração)

---

## 🔍 1. Análise do PO

Depois da migração, os 246 talentos aparecem com **Requisitos, Benefício e Normal vazios**. No banco legado essas colunas nunca foram preenchidas: o seed só tinha nome e tipo.

A tela **Tipos de Requisito** vinha de um desenho relacional que nunca chegou a funcionar:
- a tabela `requisitos` (`id_tipo`, `id_requisito`, `valor`, `id_alvo`) nem existia no dump;
- `talentos.pre_requisito_id` recebia um nome que o MySQL gravava como 0;
- a tabela `tipo_requisito` estava vazia.

Sem banco relacional, manter um cadastro de "tipos" só para classificar pré-requisitos não traz benefício.

## 🎯 2. Decisão (usuário + Dev, 27/09/2026)

1. **Remover o módulo "Tipos de Requisito"** (menu, tela, card da Home e `data/tipo_requisito.json`).
2. Em Talentos, `pre_requisito_id` vira o campo de texto **`requisitos`**, no mesmo padrão que Classes já usa para classes de prestígio.
3. **Preencher `requisitos`, `beneficio` e `normal` dos 246 talentos** com pesquisa na internet. Também é gravada a **`fonte`** (livro de origem), exibida no detalhe expandido.
4. Reaproveitamento de requisitos: quando o **simulador de combate** precisar validar pré-requisitos automaticamente, será derivada uma estrutura (atributo mínimo, BBA, talentos exigidos, graduações…) a partir do texto, embutida no próprio talento. Isso não exige uma tela de cadastro.

## 🧱 3. Implementação

- **`tools/talentos-enriquecimento.json`** guarda o resultado da pesquisa por talento, com os campos:
  `{ id, nome, nome_en, fonte, requisitos, beneficio, normal, confianca, referencias[], observacao }`.
  - É a fonte versionada e auditável. Cada item traz URLs de referência e um nível de confiança: `alta`, `media`, `baixa` ou `nao_encontrado`.
  - Os textos são **resumos próprios** em PT-BR. Não há cópia de trechos dos livros ou das traduções, que são protegidos por direito autoral.
  - O que não foi encontrado com segurança fica vazio. Nada foi inventado.
- **`tools/sql-to-json.js`** mescla o enriquecimento por `id`, conferindo que o nome é o mesmo do dump. Remove `pre_requisito_id`, deixa de exportar `tipo_requisito` e passa `DATA_VERSION` para **2**. As cópias locais antigas passam a mostrar o aviso "dados originais atualizados", com a opção de restaurar.
- **App**:
  - Talentos:
    - formulário com Nome, Tipo, **Requisitos** (texto), Benefício e Normal;
    - lista com Requisitos, Benefício e Normal truncados;
    - linha expansível "Detalhes do talento" com o texto completo e a fonte.
  - `RETIRED_TABLES` apaga no carregamento a cópia local órfã de `tipo_requisito`.
- **Testes**: store, listagem e E2E atualizados (a Home passa a ter 6 módulos).

## ✅ 4. Critérios de aceitação

1. Não existe mais menu, rota, card nem arquivo de dados de "Tipos de Requisito". A rota antiga `#/tipos-requisito` mostra o 404.
2. Todo talento encontrado na pesquisa tem Requisitos (ou "Nenhum") e Benefício, e Normal quando o original tem essa seção. Os não encontrados ficam listados neste arquivo.
3. A lista de Talentos continua sem rolagem horizontal. Os textos longos aparecem completos no detalhe expandido.
4. Criar e editar talentos funciona com o novo campo de texto. As cópias locais da versão 1 recebem o aviso de dados atualizados.

## ⚠️ 5. Observação: talentos A–L ausentes

O dump legado tem apenas a **segunda metade do Códice de Talentos** (de "MOSTRAR-SE VIGOROSO" a "ZONA NEGATIVA"). Os talentos de A a L nunca foram importados no sistema antigo. Importá-los fica como proposta para uma próxima tarefa.
