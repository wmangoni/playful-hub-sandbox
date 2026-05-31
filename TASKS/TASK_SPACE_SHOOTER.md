# 📝 TASK-SPACE_SHOOTER: Sistema de Power-Ups, Naves Desbloqueáveis e Placar de Recordes Local

## 👤 User Story
*   **Como** jogador do minijogo **Space Shooter**,
*   **Eu quero** coletar itens de melhoria temporária (tiro triplo, escudo) e gastar moedas coletadas para desbloquear modelos de naves com atributos diferentes,
*   **Para que** a jogabilidade seja dinâmica, desafiadora e com maior recompensa a longo prazo.

---

## 🎯 Critérios de Aceitação
1.  **Power-Ups Temporários**:
    *   Inimigos destruídos devem ter 15% de chance de soltar um contêiner de power-up flutuante que desce verticalmente.
    *   **Tiro Triplo (Azul)**: Dispara 3 feixes de laser em leque por 8 segundos.
    *   **Escudo de Energia (Amarelo)**: Protege a nave contra 1 colisão de inimigo ou tiro por 12 segundos (ou até ser consumido).
    *   **Bomba de Fusão (Vermelho)**: Item de uso instantâneo que limpa todos os inimigos menores na tela.
2.  **Frotas / Seleção de Naves**:
    *   Adicionar um menu de "Hangar" na tela inicial do jogo.
    *   Oferecer 3 modelos de naves espaciais:
        1.  *Interceptor (Inicial)*: Balanceada.
        2.  *Dreadnought*: Lenta, mas com tiros duplos iniciais e mais vida (se aplicável).
        3.  *Phantasm*: Extremamente rápida, menor área de colisão, porém tiros normais.
    *   Naves adicionais devem custar moedas/créditos acumulados derrotando inimigos.
3.  **Placar Local de Líderes (Leaderboard)**:
    *   Salvar no `localStorage` as 5 melhores pontuações com as iniciais do jogador (ex: "WIL - 12,400 pts").
    *   Exibir uma tabela elegante de Recordes no menu de Game Over.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/space_shooter/index.html` (e/ou assets).
*   **Física de Power-Ups**:
    *   Criar uma classe `PowerUp` com detecção de colisão AABB (Axis-Aligned Bounding Box) em relação à nave do jogador.
*   **Gerenciamento de Estado**:
    *   Persistir `playerCoins` e `unlockedShips` no `localStorage` para manter a progressão entre recarregamentos de página.
*   **Design**:
    *   Estilo espacial sci-fi retro/neon, com efeitos sonoros sintéticos associados a cada coleta de item ou compra no Hangar.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Aumenta o engajamento e a monetização teórica por replay).
*   **Esforço Estimado**: Média-Alta (Exige arte gráfica adicional para os novos modelos de nave e ícones de power-up).
*   **Área**: Front-end / Mecânicas de Jogo.
