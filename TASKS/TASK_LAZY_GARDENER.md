# 📝 TASK-LAZY_GARDENER: Clima Dinâmico, Pragas de Insetos e Ajudantes Ociosos Automáticos

## 👤 User Story
*   **Como** jogador passivo no minijogo incremental **Lazy Gardener**,
*   **Eu quero** enfrentar variações climáticas que afetam o crescimento de minhas plantas, afastar pragas de insetos nocivos e comprar sistemas automáticos de irrigação e colheita,
*   **Para que** a progressão incremental ociosa (idle) seja rica em automação, mas recompense interações ativas pontuais.

---

## 🎯 Critérios de Aceitação
1.  **Sistema de Mudanças Climáticas**:
    *   A cada 45 segundos, alterar o clima do jardim com transições visuais na tela (filtros de cores ou pequenas partículas de chuva):
        *   *Ensolarado*: Velocidade de crescimento normal (1.0x).
        *   *Chuvoso*: Crescimento acelerado (2.0x), sem necessidade de rega manual.
        *   *Seca*: Reduz velocidade de crescimento (0.5x), mas as flores colhidas valem 1.5x mais ouro devido à escassez.
2.  **Pragas e Defesa do Jardim**:
    *   Surgir insetos (lagartas na grama ou pulgões nas flores) em intervalos aleatórios de 1 a 2 minutos.
    *   Se as pragas não forem removidas com cliques em até 12 segundos, elas devoram a flor daquele canteiro, forçando o jogador a replantar.
    *   Adicionar um upgrade na loja: "Espantalho Ultrassônico" que impede automaticamente pragas de surgirem.
3.  **Upgrade de Automação (Regador e Robô Colhedor)**:
    *   *Regador Automático*: Upgrade caro que mantém a terra sempre úmida, eliminando a mecânica de clicar em terra seca.
    *   *Mini-Trator Robô (Autoharvester)*: Robô ocioso que colhe flores prontas e as vende de forma 100% autônoma a cada 3 segundos, depositando o ouro diretamente na carteira do jogador.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/lazy_gardner/index.html`.
*   **Estrutura de Upgrades**:
    *   Expandir a lista de upgrades na loja com `sprinklerActive` (boolean) e `harvesterRobots` (integer).
*   **Loop de Clima e Partículas**:
    *   Usar funções JS simples ou animações CSS para simular chuva (linhas descendo na tela) ou sol brilhando (efeito glow geral).
*   **Tratamento Ocioso (Idle State)**:
    *   Garantir que a taxa passiva de colheita (`goldPerSecond`) seja somada mesmo se a aba do navegador estiver inativa (usando o timestamp `Date.now()` para calcular a diferença de tempo ao retornar à aba).

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Mecânicas essenciais para dar vida ao jogo incremental, mantendo o jogador engajado).
*   **Esforço Estimado**: Média-Alta (Exige física e renderização simples de insetos na tela e balanceamento matemático da economia incremental).
*   **Área**: Front-end / Lógica Idle Incremental / UI.
