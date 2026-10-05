# 📝 TASK-ARCHER-005: Etapa 1 - Mecânica de Refund de Flechas, Sistema de Ondas (Waves 1-10) e Vitória Épica

## 👤 User Story
* **Como** jogador do minijogo **The Archer**,
* **Eu quero** recuperar flechas ao acertar alvos com precisão e avançar por ondas de desafios com metas crescentes e vento dinâmico,
* **Para que** a partida dure proporcionalmente à minha habilidade (eliminando o fim abrupto em 5 tiros) e ofereça uma jornada empolgante com meta clara de vitória na Onda 10.

---

## 🎯 Critérios de Aceitação Cumpridos

1. **Economia de Flechas & Refund por Precisão**:
   - Cada acerto regular em balão reembolsa a flecha consumida (`+1 Flecha`), com feedback sonoro e visual (`🏹 +1 FLECHA`).
   - Acertos de precisão / Bullseye (distância do centro do balão $< 14\text{px}$, longa distância $> 550\text{px}$ ou balão dourado) concedem `+2 Flechas` (`🎯 BULLSEYE! +2 FLECHAS`).
   - Apenas erros de tiro e colisões na nuvem de tempestade consomem flechas e quebram a sequência de combo.

2. **Sistema de Ondas Crescentes (Waves 1 a 10)**:
   - Configuração de 10 ondas com parâmetros progressivos (`WAVE_CONFIG`):
     - Onda 1: 3 alvos, vento calmo (-0.5 a 0.5), balão estático.
     - Onda 2: 3 alvos, brisa suave (-1.5 a 1.5).
     - Onda 3: 4 alvos, rajadas cruzadas, bônus de flecha tripla (`split`).
     - Onda 4: 4 alvos, introdução de balões oscilantes verticais.
     - Onda 5: 5 alvos, ventos mais fortes, bônus de flecha de fogo (`fire`).
     - Onda 6: 5 alvos, escudo rotativo mais rápido.
     - Onda 7: 5 alvos, tempestade com nuvem ágil, bônus de flecha gravitacional (`gravity`).
     - Onda 8: 6 alvos, alta taxa de balões dourados (35%).
     - Onda 9: 6 alvos, vento intenso (-4.5 a 4.5).
     - Onda 10: 7 alvos, clímax épico com oscilação extrema e vento tempestuoso.

3. **Banner de Transição e Premiação de Onda**:
   - Concluir a meta de uma onda dispara o `#wave-banner` animado com síntese de fanfarra Web Audio.
   - Bônus de conclusão de onda concedido automaticamente (+2 a +5 flechas e munições especiais).

4. **Clímax e Tela de Vitória / Fim de Jogo**:
   - Conclusão da Onda 10 ativa a tela especial de **Vitória Épica (Mestre Arqueiro)**.
   - Modal com estatísticas completas: Pontuação final, Onda alcançada, Maior Combo e Porcentagem de Precisão de tiro.

5. **Retrocompatibilidade e Testes Automatizados**:
   - Total compatibilidade com testes anteriores de física e HUD mantida.
   - Nova suíte de testes de ponta a ponta criada em `tests/qa_archer_etapa1_waves.test.js`.
