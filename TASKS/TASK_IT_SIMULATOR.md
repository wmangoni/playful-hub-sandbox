# 📝 TASK-IT_SIMULATOR: Sistema de Estresse/Burnout, Crises Satíricas em Produção e Contratação de Freelancers

## 👤 User Story
*   **Como** gerente de projetos e líder de TI no minijogo **Company Simulator**,
*   **Eu quero** gerenciar o nível de estresse e burnout dos desenvolvedores da equipe, resolver eventos surpresa de crises de produção e contratar desenvolvedores temporários (freelancers),
*   **Para que** a simulação corporativa de TI ganhe mecânicas divertidas de gerenciamento de recursos humanos e retrate os desafios reais da área de forma cômica e viciante.

---

## 🎯 Critérios de Aceitação
1.  **Barra de Estresse e Mecânica de Burnout**:
    *   Cada desenvolvedor contratado na equipe agora possui um indicador visual de Estresse (0% a 100%).
    *   O estresse aumenta quando o desenvolvedor faz horas extras, quando o projeto está atrasado ou quando ocorrem bugs severos.
    *   Ao atingir 100%, o desenvolvedor entra em estado de *Burnout* (fica inutilizado por 3 rodadas/dias da simulação, e sua barra cai lentamente para 20%).
    *   Ações para reduzir estresse: Oferecer "Dia de Folga (Day Off)", comprar cafeteira premium ou mesa de pebolim para o escritório.
2.  **Eventos Aleatórios de Crise (Production Outage)**:
    *   A cada ciclo semanal da simulação, existe uma chance de 10% de um evento inesperado ocorrer via modal pop-up interativo.
    *   *Exemplo de Crise*: "O Estagiário rodou `DELETE FROM users` sem WHERE na base oficial."
    *   Oferecer 3 opções de escolha com diferentes consequências (ex: 1. Gastar dinheiro com consultoria externa; 2. Forçar a equipe a trabalhar no final de semana, aumentando estresse geral em 40%; 3. Ignorar o problema e perder 20% da confiança dos clientes).
3.  **Contratação de Freelancers (Outsourcing)**:
    *   Criar um menu "Freelas" na aba de contratações.
    *   Permite contratar temporariamente desenvolvedores por um número fixo de dias. Eles entregam código muito rápido, mas custam uma diária elevada e não geram valor de longo prazo para a equipe corporativa fixa.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/it_simulator/index.html` (que centraliza HTML, CSS e JavaScript).
*   **Estrutura da Equipe**:
    *   Adicionar as propriedades `stress`, `isBurnedOut`, `burnoutCooldown` em cada objeto do array de desenvolvedores.
*   **Interface e UI**:
    *   Exibir uma barra de progresso vermelha para o estresse abaixo do avatar de cada desenvolvedor.
    *   Adicionar um painel "Descanso" para permitir enviar funcionários específicos para folga remunerada.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Adiciona humor e melhora significativamente a profundidade e complexidade da simulação de negócios).
*   **Esforço Estimado**: Média (Principalmente lógica de gerenciamento de estado e criação de modals de eventos aleatórios).
*   **Área**: Front-end / Simulação Matemática / UI.
