# 📝 TASK-ARCHER-007: Etapa 3 - Metagame, Oficina de Arcos, Conquistas e Persistência

## 👤 User Story
* **Como** jogador do minijogo **The Archer**,
* **Eu quero** acumular moedas de ouro ao longo das partidas, desbloquear arcos com vantagens exclusivas na oficina, registrar meus recordes em uma tabela e desbloquear conquistas,
* **Para que** eu tenha um forte incentivo de progressão a longo prazo, fator de replay contínuo e orgulho de minhas conquistas.

---

## 🎯 Critérios de Aceitação Cumpridos

1. **Economia de Ouro Dinâmica**:
   - Acúmulo de moedas de ouro ao acertar e estourar balões:
     - Balão Normal: +1 🪙
     - Balão TNT e Gelo: +2 🪙
     - Balão Blindado: +3 🪙
     - Balão Dourado: +5 🪙
     - Bônus de Precisão (Bullseye): +1 🪙 adicional
   - Bônus por Conclusão de Onda: `completedWaveNum * 5` moedas concedidas na conclusão de cada onda.
   - Efeito sonoro procedural de moedas (`playGoldSound`).
   - Persistência segura em `localStorage` através da chave `archer_gold`.
   - Exibição de ouro ganho na partida e total acumulado na tela de Game Over / Vitória.

2. **Oficina de Arcos (Workshop & Armory)**:
   - Interface acessível pelo botão `🏹 Oficina` na barra do HUD e no modal de fim de jogo.
   - Três modelos distintos de arcos disponíveis:
     - **Arco de Carvalho (Oak)**: Arco inicial padrão (Custo: 0 🪙), atributos equilibrados (1.0x).
     - **Composto Ágil (Composite)**: Custo: 50 🪙. +20% de velocidade de flecha (`speedMultiplier = 1.2`), -30% de deflexão por vento (`windMultiplier = 0.7`) e acabamento visual azulado luminoso.
     - **Élfico Dourado (Elven)**: Custo: 120 🪙. Começa a partida com +1 flecha inicial (6 flechas no total), raio de Bullseye aumentado para 18px (vs 14px padrão), +10% de probabilidade de balões dourados e brilho dourado solar.
   - Sistema de compra com validação de saldo de moedas, dedução instantânea, atualização do HUD e salvamento em `localStorage` (`archer_unlocked_bows` e `archer_selected_bow`).

3. **Integração Física dos Atributos dos Arcos**:
   - A velocidade inicial da flecha em `spawnArrow` e na previsão pontilhada (`handleAimMove`) respeita `currentBow.speedMultiplier`.
   - A resistência ao vento na física de voo (`gameLoop`) e na previsão de trajetória respeita `currentBow.windMultiplier`.
   - A margem de acerto de Bullseye em `gameLoop` utiliza `currentBow.bullseyeRadius`.

4. **Hall dos Mestres Arqueiros (Leaderboard Local)**:
   - Interface de ranking acessível pelo botão `🏆 Recordes`.
   - Registro automático da partida em `saveHighScore()` ao término ou vitória:
     - Armazena pontuação, onda alcançada, maior sequência de combo, precisão de disparos e data da partida.
     - Ordenação decrescente por pontuação, mantendo o Top 5 melhores marcas.
     - Persistência segura em `localStorage` (`archer_highscores`).

5. **Sistema de Conquistas (Achievements) & Toast Visual**:
   - Quatro conquistas fundamentais implementadas:
     - `first_blood`: Estoure seu primeiro balão (ícone 🎯).
     - `combo_5`: Alcance uma sequência de combo x5 (ícone 🔥).
     - `fire_melter`: Derreta a armadura de um balão blindado com flecha de fogo (ícone 🛡️).
     - `wave_10`: Alcance ou conclua a Onda 10 (ícone 👑).
   - Componente visual `#achievement-toast` com animação suave, ícone dourado e síntese sonora de fanfarra (`playAchievementSound`).
   - Persistência segura em `localStorage` (`archer_achievements`).

6. **Qualidade, Estabilidade e Retrocompatibilidade**:
   - Métodos e getters expostos retrocompatíveis em `window.__archer`.
   - Zero erros no console do navegador.
   - Suíte de testes automatizada `tests/qa_archer_etapa3_metagame.test.js` passando com 100% de sucesso.
   - Todas as 5 suítes de teste executando em conjunto sem falhas ou regressões.
