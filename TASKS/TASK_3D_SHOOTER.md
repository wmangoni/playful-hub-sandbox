# 📝 TASK-3D_SHOOTER: Melhoria Visual e Sistema de Partículas Dinâmicas

## 👤 User Story
*   **Como** jogador do minijogo **3D Shooter**,
*   **Eu quero** que os disparos da arma gerem flashes luminosos e os impactos gerem partículas físicas/faíscas,
*   **Para que** o combate em primeira pessoa pareça mais impactante, responsivo e visualmente imersivo.

---

## 🎯 Critérios de Aceitação
1.  **Muzzle Flash (Clarão do Disparo)**:
    *   Sempre que o jogador disparar a arma, deve haver um efeito rápido de flash amarelo/laranja semi-transparente na ponta do sprite da arma.
    *   O flash deve durar no máximo 2 a 3 quadros (frames) para não atrapalhar a visibilidade.
2.  **Sistema de Partículas de Impacto**:
    *   Ao atingir uma parede sólida, um grupo de 8 a 15 partículas amarelas/laranjas (faíscas) deve ser expelido da posição do impacto.
    *   As partículas devem ter gravidade simulada e ir desaparecendo gradualmente (fade out).
    *   Ao atingir um inimigo, deve ocorrer um efeito visual diferenciado (por exemplo, partículas vermelhas representando dano).
3.  **Otimização e Performance**:
    *   O jogo deve continuar rodando de forma estável a **60 FPS** em navegadores modernos.
    *   Deve ser implementado um mecanismo simples de *Object Pooling* para as partículas, evitando alocações excessivas e travamentos por Garbage Collection.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivo Alvo**: `/3d_shooter/index.html` (e/ou scripts associados).
*   **Classe/Função de Partícula**:
    *   Criar uma classe ou estrutura simples `Particle` com propriedades: `x`, `y`, `z`, `vx`, `vy`, `vz`, `life`, `maxLife`, `color` e `size`.
    *   Método `update()` para aplicar física básica de velocidade e gravidade, reduzindo a vida (`life`).
    *   Método `draw()` que projeta os pontos 3D na tela 2D usando a mesma lógica de projeção do motor de renderização raycasting ou pseudo-3D do jogo.
*   **Pool de Objetos**:
    *   Manter um array global pré-alocado `particlePool` com um tamanho fixo (ex: 200 partículas).
    *   Reciclar as partículas inativas (onde `life <= 0`) em vez de instanciar novos objetos a cada tiro.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Melhoria direta de Core Gameplay/Feedback Visual).
*   **Esforço Estimado**: Média (Requires 3D coordinates projection adjustments).
*   **Área**: Front-end / Canvas 2D Engine.
