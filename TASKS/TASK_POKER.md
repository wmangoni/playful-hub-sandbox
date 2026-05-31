# 📝 TASK-POKER: Personalidades de IA, Sistema de Blefe e Assistente de Probabilidade (Hand Tracker)

## 👤 User Story
*   **Como** jogador estratégico no minijogo **Poker Texas Hold'em**,
*   **Eu quero** enfrentar adversários controlados por IA com diferentes comportamentos de aposta e blefe, além de visualizar um rastreador dinâmico que exiba a força estatística da minha mão atual,
*   **Para que** o jogo simule o aspecto psicológico do poker real e me ajude a tomar decisões matemáticas e estratégicas refinadas.

---

## 🎯 Critérios de Aceitação
1.  **Perfil e Comportamento dos Oponentes (IA)**:
    *   Implementar pelo menos 3 oponentes virtuais com avatares e personalidades marcantes:
        1.  *Arthur "The Shark"*: Perfil agressivo-seletivo (aposta alto com mãos fortes, raramente blefa).
        2.  *Beatriz "Calling Station"*: Perfil passivo (raramente dá raise, apenas paga apostas para ver as cartas comunitárias).
        3.  *Caio "The Maniac"*: Altamente agressivo e imprevisível (alta frequência de blefes e apostas all-in aleatórias).
2.  **Balões de Diálogo e Blefe**:
    *   Exibir pequenos balões de chat em cima dos avatares das IAs durante rodadas decisivas (ex: "Acho que vou de All-in...", "Você não tem nada!", "Essa mão é minha!").
    *   A IA deve blefar com base na força da mão do jogador percebida e nas cartas comunitárias (ex: apostar forte quando há potencial de Flush/Straight na mesa, mesmo sem ter as cartas).
3.  **Hand Tracker / Calculadora de Mãos**:
    *   Criar um painel discreto "Estatísticas da Mão" ao lado do jogador.
    *   O painel deve ler instantaneamente as cartas na mão do jogador + cartas do Flop/Turn/River abertas na mesa.
    *   Exibir:
        *   *Classificação Atual*: Ex: "Par de Ases", "Flush Draw" (4 de 5 cartas de mesmo naipe).
        *   *Força Relativa*: Indicador visual (barra verde/amarela/vermelha) ou percentual básico de chances de ter a melhor mão na mesa.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/poker/index.html`.
*   **Lógica de IA**:
    *   Na tomada de decisão da IA (funções de ação no turno), incorporar pesos probabilísticos com base na personalidade daquela IA.
    *   Exemplo de fator de decisão:
        `const finalActionScore = handStrength * 0.6 + bluffFactor * personalityWeight;`
*   **Detector de Padrões de Poker**:
    *   Implementar um algoritmo clássico de validação de mãos de Poker (High Card, One Pair, Two Pair, Three of a Kind, Straight, Flush, Full House, Four of a Kind, Straight Flush, Royal Flush) para alimentar o Hand Tracker em tempo real.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (O poker contra IA tradicional fica entediante sem dinâmicas comportamentais e blefe).
*   **Esforço Estimado**: Alta (O parser de classificação de mãos e a matemática probabilística exigem testes lógicos rigorosos).
*   **Área**: Front-end / Inteligência Artificial Baseada em Regras / UI.
