# 📂 Arquitetura e Padrões - Tech Company Management & IT Simulator

Um simulador estratégico baseado em turnos que integra a gestão corporativa de uma startup de tecnologia (finanças, produtos, equipe e segurança da informação) e a progressão de carreira técnica/pessoal de um profissional de TI (experiência, competências, certificações e promoção).

## 🏗️ Arquitetura do Código

A aplicação foi desenvolvida sob o conceito de SPA (Single Page Application) em um único arquivo de código que acopla o layout responsivo, folhas de estilo modernas e uma lógica orientada a objetos em JavaScript com persistência em armazenamento local.

- **Estrutura de Arquivos**:
  - `index.html`: Centraliza toda a interface em duas grandes divisões paralelas (Seção da Empresa e Seção de Carreira), regras de layout CSS móvel/desktop, estilos para árvore de habilidades técnicas e conquistas, e toda a inteligência algorítmica em JavaScript.

- **Fluxo de Inicialização e Execução**:
  1. No carregamento do DOM (`DOMContentLoaded`), invoca-se `initProgressionSystem()` para carregar as habilidades, níveis de carreira e certificações iniciais do jogador.
  2. O jogador insere o nome da sua startup e clica em "Start Company" acionando `startGame()`, o qual instancia a classe mestre de simulação `TechCompanySimulation` e oculta a tela de introdução.
  3. A partir do painel de controle, o jogador escolhe ações corporativas (Contratar, Desenvolver, Marketing, P&D ou Segurança).
  4. Cada clique executa `makeDecision(decision)`, que delega o processamento de regras financeiras e avanço temporal à classe de simulação.
  5. Após cada alteração, funções como `updateUI()`, `updateSkillsDisplay()` e `updateCareerDisplay()` são acionadas em cadeia para renderizar os novos status.

## 🧩 Padrões de Projeto Aplicados

- **Model-View-Controller (MVC) Simplificado**:
  - **Model (Modelo)**: Representado pela classe `TechCompanySimulation` (dados corporativos e regras de finanças/tempo) e pelo objeto `player` (competências, nível de carreira e certificações).
  - **View (Visualização)**: O DOM é manipulado e atualizado dinamicamente nas funções `updateUI()`, `updateSkillsDisplay()`, `updateCareerDisplay()` e `updateCertificationDisplay()`.
  - **Controller (Controlador)**: Funções intermediárias como `startGame()`, `makeDecision(decision)`, `upgradeSkill(skill)` e `studyCertification(cert)` que interceptam as entradas do usuário nas tags `<button>` e invocam os métodos adequados de alteração dos modelos.
- **State Pattern (Padrão Estado)**: Controle de fluxo baseado no estado corporativo (`isGameOver`, `isVictory`) e nos estados de competências e conquistas. Níveis de habilidades (`active` dots) e certificações (`certification-locked` / `certification-complete`) sofrem transições visuais de classes CSS baseadas em seus status booleanos.
- **Event-Driven (Programação Dirigida a Eventos)**: Ouvintes de eventos do DOM vinculados a inputs, botões de ação empresarial, botões de evolução de skills e certificações.
- **Engine de Eventos Aleatórios (Monte Carlo Simplificado)**: O método `triggerRandomEvent()` executa uma rolagem probabilística mensal baseada em `Math.random()`. Eventos como *Vazamento de dados (Data Breach)*, *Parceria estratégica (Strategic Partnership)*, *Investimentos externos* ou *Demissões surpresa* aplicam bonificações/penalidades financeiras e de reputação que se correlacionam com as habilidades de segurança do jogador (`securityLevel`).

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **HTML5/CSS3 (Grid & Flexbox)**: Renderização das divisões em duas colunas responsivas (`.game-layout`), barra de experiência gradiente, árvores de skills técnicas (`.skill-tree-container`) e o quadro de medalhas.
- **Web Storage API (LocalStorage)**: Usado para salvar e recuperar permanentemente o progresso do jogador e da empresa em múltiplas seções de navegação.

## 🔑 Funções e Estruturas Principais

- `class TechCompanySimulation`: Classe principal que controla o motor de simulação empresarial.
  - `playTurn(decision)`: Processa a decisão, aplica cálculos de receita/despesa, dispara eventos randômicos e avança o tempo.
  - `calculateFinances()`: Executa a soma da receita dos produtos criados, subtrai a folha de pagamento e os custos operacionais (`expenses`) e altera o capital (`money`).
  - `triggerRandomEvent()`: Modela situações de risco em TI. As chances são influenciadas pelas certificações do jogador (ex: certificação DBA reduz as chances de vazamento pela metade).
- `player`: Objeto de dados que rastreia os status do desenvolvedor: XP, cargo atual (`careerLevel`), competências e certificados possuídos.
- `addXP(amount)`: Concede XP ao jogador e gerencia promoções de carreira automática comparando com o teto `xpNeeded` no método `levelUp()`.
- `upgradeSkill(skill)`: Eleva as competências em JavaScript, HTML/CSS, Backend, Networks, Servers, Communication, Teamwork ou Problem Solving deduzindo XP de acordo com a tabela `skillUpgradeCost`.
- `studyCertification(cert)`: Compra certificados desbloqueados (como *Cloud Computing*, *Database Administrator*, *Machine Learning*) consumindo XP, aplicando bonificações de qualidade de produtos e atenuando custos de segurança corporativa.
- `updateSalary()`: Recalcula dinamicamente os ganhos mensais do jogador multiplicando a remuneração base de cargo por um bônus proporcional de `2%` por ponto acumulado nas habilidades.
- `createConfetti()` & `checkAchievements()`: Coordena a verificação automática de medalhas destravadas e dispara animações visuais de festa em tela.
