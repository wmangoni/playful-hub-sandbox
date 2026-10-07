# 🚀 Tarefa 002 - Planning Poker: Redesign Visual Moderno, Baralho Físico Realista e Painel de Histórico de Votações

**Status**: 🚀 Dev Complete  
**Responsável**: Frontend Lead & UI/UX Designer do Playful Hub  
**Prioridade**: Alta  

---

## 🔍 1. Análise do Product Owner (PO)

A versão v1 do **Planning Poker** inaugurou com sucesso a infraestrutura multiplayer em tempo real via WebSockets do Playful Hub. No entanto, o visual inicial adotou um tema escuro genérico e austero, com cartões retangulares simples que não transmitem o charme e a ludicidade de um jogo de cartas de verdade.

Para elevar a experiência do usuário (UX) a um nível comparável às melhores ferramentas de agilidade do mercado (Linear, Miro, FigJam, Scrit) e ao padrão de qualidade do Playful Hub, esta tarefa redefine a identidade visual com três pilares centrais:
1. **Cartinhas com estética de baralho de verdade**: proporções clássicas, cantos com índices e naipes, verso trabalhado com padrão de cassino e efeito de virada 3D (*flip card*).
2. **Ambiente visual claro, moderno e colorido**: saída do visual escuro/opaco para um layout luminoso, com cores vivas e acolhedoras, tipografia refinada, sombras suaves e microinterações elegantes.
3. **Painel rico de Histórico de Votações**: registro automático de cada rodada concluída, permitindo documentar o nome da tarefa/história estimada, consultar médias, modas, distribuição de votos e exportar o resumo diretamente para o Jira/Trello/Markdown.

---

## 🎯 2. Objetivos Principais

1. **Transformar as cartas**: Criar componentes com visual fiel a baralhos físicos (marfim/branco acetinado, naipes, índices nos cantos e centro ilustrado para Fibonacci, café e infinito).
2. **Clarear e modernizar o layout**: Introduzir uma paleta clara, arejada e colorida (*Light Modern Agile Theme*), com cartões flutuantes, tons pasteis de apoio e acentos vibrantes.
3. **Implantar o Histórico de Rodadas**: Criar uma seção expansível e atraente que armazena as rodadas da sessão, exibindo métricas consolidadas e as cartas jogadas por cada membro.
4. **Garantir retrocompatibilidade**: Manter 100% do protocolo WebSocket existente e testes automatizados sem interrupção.

---

## 🎨 3. Design System & Identidade Visual

### 3.1 Paleta de Cores (Tema Claro Moderno e Vibrante)

| Nome da Cor | Valor Hex / CSS | Aplicação Principal |
| :--- | :--- | :--- |
| **Canvas Background** | `#f8fafc` a `#eef2ff` (Gradiente Suave) | Fundo da aplicação com luz difusa |
| **Surface Card** | `#ffffff` | Cartões de superfície, painel principal e modais |
| **Border Sublime** | `#e2e8f0` | Divisores suaves e contornos neutros |
| **Primary Indigo** | `#4f46e5` / `#6366f1` | Botões de ação primária, seleção e cabeçalhos |
| **Accent Emerald** | `#10b981` | Status "Votou ✓", consenso alcançado, conexões ativas |
| **Accent Amber / Gold** | `#f59e0b` / `#d97706` | Cartas selecionadas, destaques de consenso e médias |
| **Accent Rose / Red** | `#e11d48` | Naipes de Copas/Ouros, botões destrutivos, alertas |
| **Text Primary** | `#0f172a` | Textos principais e valores das cartas |
| **Text Muted** | `#64748b` | Legendas, instruções e nomes de participantes |
| **Card Back Royal** | `#1e3a8a` / `#2563eb` | Padrão ornamental geométrico do verso das cartas |

### 3.2 Tipografia e Espaçamentos
- **Fonte Principal**: `'Inter', system-ui, -apple-system, sans-serif` para leitura cristalina de textos e nomes.
- **Valores das Cartas**: Fonte display serifada ou semi-serifada elegante (estilo clássico de baralho) nos cantos, e bold legível no centro.
- **Bordas Arredondadas**: `12px` para botões e inputs; `16px` para cartas de baralho; `20px` para painéis e cards de histórico.
- **Sombras de Elevação**:
  - Padrão: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`
  - Flutuante (Hover): `0 12px 24px -4px rgba(79, 70, 229, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.04)`

---

## 🃏 4. Anatomia e Engenharia das Cartas de Baralho

### 4.1 Face da Carta (Card Front)
- **Proporção**: Proporção áurea de baralho (~2.5 : 3.5).
- **Material**: Fundo branco pérola/marfim acetinado (`#ffffff` com leve gradiente radial para `#f8fafc`), textura com linha de borda interna de corte tradicional (*inner border hairline*).
- **Índices nos Cantos**:
  - Canto superior esquerdo: Valor (ex.: `5`) com o naipe ou símbolo logo abaixo.
  - Canto inferior direito: Valor invertido em 180° com naipe correspondente.
- **Centro Ilustrado**:
  - `0`: "0" limpo com coroa sutil ou badge zero-effort.
  - `1, 2, 3`: Pips clássicos (♠ Espadas, ♥ Copas, ♦ Ouros, ♣ Paus).
  - `5, 8, 13`: Brasões estilizados de Fibonacci com naipes combinados.
  - `21, 34`: Cartas nobres da realeza ágil (moldura de brasão real).
  - `?`: Xícara de café fumegante ☕ com vapor estilizado ("Hora de debater / Coffee break").
  - `∞`: Foguete cósmico 🚀 ("Grande demais para uma só sprint").

### 4.2 Verso da Carta (Card Back)
- Padrão ornamental clássico de cassino / Bicycle:
  - Fundo azul marinho imperial (`#1e3a8a`) ou rubi acetinado.
  - Malha geométrica de arabescos / losangos em gradiente repetido.
  - Borda externa branca fina simulando cartão cortado de fábrica.
  - Medalhão central com o logotipo sutil do Playful Hub.

### 4.3 Mecânica 3D de Flip Card
- Efeito realista de revelação na mesa dos participantes:
  - Container com `perspective: 1000px`.
  - Elemento interno com `transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`.
  - Durante a votação: verso da carta visível (`rotateY(180deg)`).
  - Ao revelar: animação em cascata suave (*staggered flip*) virando para a face (`rotateY(0deg)`).

---

## 📜 5. Painel de Histórico de Votações

### 5.1 Componentes e Funcionalidades
1. **Identificação da Tarefa / História da Rodada**:
   - Campo de entrada no topo da mesa: *"Nome da história ou ticket (opcional, ex.: US-104 - Checkout)"*.
   - Ao revelar ou iniciar nova rodada, esse título é vinculado à rodada arquivada.
2. **Card da Rodada no Histórico**:
   - **Cabeçalho**: Número da rodada (`Rodada #1`, `Rodada #2`), horário de conclusão e badge de consenso (Verde: *Consenso Total*; Amarelo: *Variação Baixa*; Violeta: *Divergência*).
   - **Resumo Estatístico**: Média, Moda, Mínimo e Máximo em pílulas coloridas.
   - **Mini Mesa de Cartinhas**: Miniaturas das cartas de baralho jogadas por cada participante com seus avatares.
   - **Distribuição de Votos**: Gráfico de pílulas agrupando a contagem de votos.
3. **Ações de Exportação e Produtividade**:
   - Botão **Copiar para Markdown**: Gera texto formatado pronto para documentação de Planning, Notion, Jira ou Slack.
   - Botão **Limpar Histórico**: Com diálogo de confirmação.
   - Persistência automática em `localStorage` da sala.

---

## 📋 6. Requisitos Funcionais e Critérios de Aceitação

| ID | Requisito | Critério de Aceitação |
| :--- | :--- | :--- |
| **RF-01** | Visual claro e moderno | A interface adota fundo claro com gradientes suaves, tipografia limpa e sombras em camadas. |
| **RF-02** | Cartas de baralho realistas | O deck de votação e as cartas da mesa apresentam proporção 2.5:3.5, índices de canto e ilustrações centrais. |
| **RF-03** | Verso ornamental e Flip 3D | As cartas viradas para baixo exibem verso ornamental e giram em 3D ao revelar os votos. |
| **RF-04** | Registro automático de rodada | Ao revelar votos, a rodada concluída é salva no histórico da sessão com participantes, votos e estatísticas. |
| **RF-05** | Nome de história/tarefa | Usuário pode informar o nome da tarefa que está sendo estimada, ficando gravado no card da rodada. |
| **RF-06** | Exportação de resultados | Botão de cópia gera resumo estruturado em Markdown com 1 clique para colar no Jira/Trello. |
| **RF-07** | Efeito visual de consenso | Quando 100% dos participantes votam no mesmo número, um efeito visual comemorativo suave é acionado. |
| **RF-08** | Compatibilidade de rede | O fluxo WebSocket existente (`join`, `vote`, `reveal`, `reset`) permanece 100% compatível. |

---

## 🛠️ 7. Fases de Implementação

- **Fase 1**: Refatoração do Design System CSS (tokens de cores claras, tipografia, containers de vidro e sombras).
- **Fase 2**: Implementação do componente de Cartas de Baralho (estilos front/back, SVG/CSS dos naipes e animação 3D de flip).
- **Fase 3**: Redesenho da Mesa de Participantes (avatares com gradientes dinâmicos, cartas na mesa, status lúdico).
- **Fase 4**: Construção do Módulo de Histórico de Votações (gerenciamento de estado, renderização dos cards e exportação Markdown).
- **Fase 5**: Polimento, microinterações e testes automatizados.
