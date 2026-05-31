# 📝 TASK-STRATEGY_GAME: Sistema de Névoa de Guerra (Fog of War) e Diplomacia Básica com IA

## 👤 User Story
*   **Como** imperador e general do minijogo **Strategy Empire**,
*   **Eu quero** explorar um mapa dinâmico coberto por uma névoa de guerra funcional e negociar tratados de paz ou alianças com outras facções controladas por IA,
*   **Para que** as campanhas militares exijam batedores e as vitórias possam ser alcançadas tanto por força bruta quanto por vias diplomáticas e econômicas.

---

## 🎯 Critérios de Aceitação
1.  **Névoa de Guerra (Fog of War)**:
    *   O mapa do jogo deve inicializar coberto por uma névoa preta (células não exploradas).
    *   Unidades e edifícios do jogador criam um raio de visão (ex: 2 células ao redor).
    *   Áreas exploradas anteriormente que não possuem visão atual ficam em tom cinza semi-transparente, mostrando apenas o terreno estático, mas ocultando exércitos e movimentações inimigas atuais.
2.  **Sistema de Diplomacia com Facções de IA**:
    *   Criar um painel de diplomacia acessível por um botão na interface do usuário.
    *   O jogador deve poder interagir com pelo menos 2 outras facções vizinhas.
    *   Níveis de Relacionamento: *Guerra* (IA ataca ativamente), *Neutro* (IA não ataca, mas impede comércio), e *Aliado* (IA concede visão compartilhada e bônus de comércio).
    *   Ações diplomáticas: Enviar Recursos (melhora relação), Declarar Guerra (rompe pactos), Propor Aliança (requer relacionamento > 75%).
3.  **Múltiplas Condições de Vitória**:
    *   Adicionar tela de fim de jogo customizada para o tipo de vitória alcançada:
        *   **Vitória Militar**: Conquistar todos os territórios inimigos.
        *   **Vitória Diplomática**: Manter aliança ativa com todas as facções vivas por 5 rodadas seguidas.
        *   **Vitória Econômica**: Acumular 5.000 de Ouro e 5.000 de Madeira nos estoques.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/strategy_game/script.js` e `/strategy_game/index.html`.
*   **Controle de Visibilidade das Células**:
    *   No grid bidimensional do mapa, armazenar o estado de visibilidade de cada célula: `0` (Oculto - Preto), `1` (Explorado, sem visão atual - Cinza), `2` (Visível - Colorido).
    *   Método `recalculateVision()` executado a cada final de turno, varrendo unidades do jogador e atualizando os estados de visibilidade vizinhos.
*   **IA de Relacionamento**:
    *   Manter um valor numérico `-100` a `100` para a relação de cada IA com o jogador. Enviar presentes aumenta o valor, enquanto ter tropas na fronteira reduz passivamente a cada turno.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Adiciona profundidade tática típica de jogos como Civilization ou Age of Empires).
*   **Esforço Estimado**: Alta (Requer controle visual complexo de renderização no canvas/HTML do mapa).
*   **Área**: Front-end / Engine de Turnos / UI.
