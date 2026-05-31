# 📝 TASK-SNAKE: Modo Labirinto (Grid Obstacles), Frutas Especiais Temporárias e Speed Boost

## 👤 User Story
*   **Como** fã de jogos retrô no minijogo **Snake Game**,
*   **Eu quero** selecionar layouts de mapas com obstáculos fixos no grid, consumir comidas que aplicam efeitos temporários (atravessar paredes, acelerar ou encolher cauda) e acelerar manualmente a cobrinha,
*   **Para que** a mecânica de jogo clássica traga mais dinamismo, agilidade e desafio tático.

---

## 🎯 Critérios de Aceitação
1.  **Modo de Jogo com Labirintos (Maze Mode)**:
    *   No menu inicial, o jogador deve poder escolher entre: *Clássico (Sem Paredes Internas)*, *Caixa Fechada*, *Quatro Cantos* e *Grande Espiral*.
    *   Os labirintos devem ser gerados desenhando blocos de parede intransponíveis no grid (usando cores neon distintas, como magenta ou azul ciano).
    *   Colidir com qualquer bloco de labirinto resulta em Game Over instantâneo.
2.  **Frutas com Efeitos Especiais (Power Food)**:
    *   A cada 5 frutas normais consumidas, spawnar uma fruta especial brilhante com 1 das seguintes propriedades aleatórias:
        1.  *Fruta Fantasma (Roxa)*: Permite que a cobra atravesse paredes e o próprio corpo sem morrer por 5 segundos (exibir cobra piscando).
        2.  *Fruta Aceleração (Azul)*: Dobra a velocidade de movimento da cobra e dobra toda pontuação obtida nos próximos 8 segundos.
        3.  *Fruta Cortadora (Verde)*: Remove instantaneamente 3 segmentos da cauda da cobra (apenas se a cobra tiver tamanho maior que 6).
3.  **Speed Boost Manual (Barra de Espaço)**:
    *   Enquanto o jogador mantiver a barra de espaço pressionada, a cobra se move no dobro da velocidade da taxa padrão do jogo.
    *   Para equilibrar, o uso da aceleração consome 1 ponto de pontuação a cada 1.5 segundos.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/snake/index.html`.
*   **Lógica do Loop do Jogo**:
    *   Definir arrays bidimensionais representando as posições dos labirintos no grid: `mazeGrid = [{x: 5, y: 10}, {x: 6, y: 10}, ...]`.
    *   Na validação da colisão da cabeça da cobra, verificar se a nova coordenada pertence a `mazeGrid`.
*   **Controle de Estados**:
    *   Variáveis globais `isGhostMode` (boolean) e `speedMultiplier` (number) controladas por cronômetros decrescentes em milissegundos dentro do loop principal (`update`).

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Modos labirinto aumentam muito o desafio e apelo visual do jogo neon).
*   **Esforço Estimado**: Média (A lógica de movimentação por grid é facilmente adaptável para checar obstáculos dinâmicos).
*   **Área**: Front-end / Canvas 2D / Grid Movement.
