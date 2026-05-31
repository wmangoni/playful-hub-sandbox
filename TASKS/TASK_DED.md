# 📝 TASK-DED: Sistema de Inventário Visual e Combates Baseados em Atributos (Rolagem D20)

## 👤 User Story
*   **Como** jogador do minijogo **RPG Adventure Quest**,
*   **Eu quero** gerenciar itens em um inventário visual e ver combates resolvidos com testes de rolagens de dados (D20) baseados nos meus atributos (Força, Destreza, Inteligência, Sabedoria),
*   **Para que** a experiência de jogo se aproxime de uma verdadeira mesa de Dungeons & Dragons, com escolhas mais estratégicas e aleatoriedade emocionante.

---

## 🎯 Critérios de Aceitação
1.  **Ficha de Personagem & Modificadores**:
    *   Exibir uma ficha compacta do personagem no topo ou canto lateral da tela contendo: Força (STR), Destreza (DEX), Inteligência (INT), Sabedoria (WIS) e Pontos de Vida (HP).
    *   Os modificadores devem afetar diretamente as opções de escolha da história (ex: "[Teste de Força] Tentar arrombar a porta pesada").
2.  **Sistema de Inventário Visual**:
    *   Criar um modal ou área na tela que exiba slots de itens (limite de 6 slots).
    *   O jogador deve poder coletar armas (ex: Espada Longa, Cajado), armaduras (ex: Cota de Malha) e consumíveis (ex: Poção de Cura) ao longo dos eventos.
    *   Consumíveis podem ser clicados para restaurar HP ou conceder bônus temporários.
3.  **Animação e Resolução de Rolagem de Dados (D20)**:
    *   Ao selecionar uma ação que envolva teste (ex: combate ou persuasão), exibir uma animação curta de um dado de 20 lados (D20) girando.
    *   Calcular o resultado: `Valor Rolado + Modificador de Atributo` versus a Classe de Dificuldade (Difficulty Class - DC) do desafio.
    *   Exibir mensagens vibrantes para "Sucesso Decisivo (Natural 20)" e "Falha Crítica (Natural 1)".

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/ded/index.html` (e scripts internos).
*   **Estrutura de Dados do Jogador**:
    ```javascript
    const playerState = {
      attributes: { str: 12, dex: 15, int: 10, wis: 14 },
      hp: 20,
      maxHp: 20,
      inventory: [],
      equippedWeapon: null,
      equippedArmor: null
    };
    ```
*   **Interface Gráfica (UI)**:
    *   Usar CSS Grid/Flexbox para o painel lateral de ficha e inventário.
    *   Design retro/glassmorphic com bordas douradas elegantes combinando com o tema fantástico.
    *   Para o dado 3D/2D, usar animações CSS `@keyframes` simulando a rolagem ou um canvas de rotação simples.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Mecânica principal para transformar a aventura textual em um RPG completo).
*   **Esforço Estimado**: Alta (Requer refatoração do fluxo narrativo para suportar testes de atributos).
*   **Área**: Front-end / State Management / UI.
