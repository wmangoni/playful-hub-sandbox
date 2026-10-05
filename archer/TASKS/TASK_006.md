# 📝 TASK-ARCHER-006: Etapa 2 - Variedade Tática de Alvos (Balões TNT, Gelo, Blindado e Caveira)

## 👤 User Story
* **Como** jogador do minijogo **The Archer**,
* **Eu quero** encontrar diferentes variedades táticas de balões com comportamentos, recompensas e penalidades específicas,
* **Para que** cada disparo exija leitura estratégica do cenário, priorização de alvos e uso inteligente do arsenal de flechas especiais.

---

## 🎯 Critérios de Aceitação Cumpridos

1. **Balão TNT (Explosão em Área)**:
   - Identificado com gradiente avermelhado/laranja pulsante e ícone `💣`.
   - Ao ser atingido, gera detonação em área com partículas de fogo e som procedural grave de explosão (`playExplosionSound`).
   - Concede 250 pontos e conta +2 alvos concluídos na meta da onda devido à onda de choque.
   - Aplica recuo físico dinâmico na nuvem de tempestade e no escudo rotativo.

2. **Balão de Gelo (Congelamento Temporal)**:
   - Identificado com gradiente ciano glacial, borda brilhante e ícone `❄️`.
   - Ao ser atingido, ativa o efeito *Freeze Time* por 4.5 segundos:
     - Overlay visual de geada translúcida (`#frost-overlay`).
     - Paralisa completamente o movimento horizontal da nuvem de tempestade e a rotação do escudo.
     - Anula o vento para `❄️ 0.0`, permitindo disparos perfeitamente retos sem desvio.
     - Síntese sonora procedural de cristal congelado (`playFreezeSound`).

3. **Balão Blindado (Armadura 2 HP & Derretimento por Fogo)**:
   - Identificado com acabamento metálico prateado/chumbo, badge de vida `#balloon-hp-badge` e ícone `🛡️`.
   - Possui 2 pontos de vida (HP):
     - Primeiro impacto de flecha normal racha a armadura (efeito visual `.damaged`, som de impacto metálico `playMetalHitSound`, badge atualizada para `1`). A flecha é consumida e o balão sobrevive.
     - Segundo impacto destrói a armadura, concede 220 pontos e avança a onda.
   - **Interação Especial com Flecha de Fogo**: O calor extremo da flecha de fogo derrete a armadura instantaneamente (1-hit kill).

4. **Balão Caveira (Armadilha Tática)**:
   - Identificado com acabamento púrpura escuro/venenoso e ícone `☠️`.
   - Funciona como alvo proibido (armadilha):
     - Se atingido por engano, aplica penalidade severa imediata de `-2 Flechas`.
     - Zera o combo streak com efeito sonoro dissonante (`playPenaltySound`).
     - Não pontua nem avança a meta da onda.

5. **Distribuição Progressiva por Ondas**:
   - Ondas 1-2: Balões normais e dourados.
   - Ondas 3-4: Introdução de TNT e Gelo.
   - Ondas 5-6: Introdução de Blindados.
   - Ondas 7-10: Introdução de Balões Caveira.

6. **Robustez de Ciclo de Vida e Testes Automatizados**:
   - Prevenção contra encerramento prematuro de loop (`gameOverTimer` e guardas de `isGameLoopRunning`).
   - Efeito de congelamento resetado devidamente em `initGame`, `endGame` e `triggerVictory`.
   - Suíte automatizada completa em `tests/qa_archer_etapa2_tactical.test.js` passando com 100% de sucesso.
   - Suítes anteriores (`qa_archer_arrow_physics.test.js`, `qa_archer_task003.test.js`, `qa_archer_etapa1_waves.test.js`) 100% íntegras e sem regressões.
