# 🧛 TASK-BLOOD_AND_SILVER_012: Variabilidade de Monstros e Balanceamento Matemático

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `🚀 Dev Complete` — 3 tipos de vampiros com cinemática única e curva de sobrevivência implementados.
> **Abordagem**: AI-DLC (Inception, Construction, Operation).

---

## 🎯 1. Objetivo

1. Incorporar os assets `Vampires1`, `Vampires2` e `Vampires3` do pacote `assets/vampire-4-direction-pixel-character-sprite-pack/PNG/`.
2. Implementar padrões de movimentação e atributos assimétricos para cada vampiro:
   - **Vampiro 1 (Espreitador / Enxame)**: Perseguição direta com jitter orgânico, atributos equilibrados de linha de frente ($\text{Vel}=32\text{ px/s}$).
   - **Vampiro 2 (Assassino Zig-Zag)**: Movimentação em zigue-zague senoidal/angular ($\text{Vel}=43\text{ px/s}$, freq $=2.6$), menor HP (16) e maior dano por golpe (12).
   - **Vampiro 3 (Blindado / Espiral Tank)**: Aproximação em vórtice/espiral orbital que fecha o cerco ($\text{Vel}=38\text{ px/s}$), altíssimo HP (48) e dano intermediário (9).
   - **Jogador**: Velocidade base ajustada proporcionalmente para $110\text{ px/s}$.
   - **Chefe**: Velocidade base ajustada proporcionalmente para $20\text{ px/s}$.
3. Garantir o balanceamento matemático do jogo, apoiado na premissa de que **deve ser difícil alcançar os 3 minutos de sobrevivência (180s)**.

---

## 🧮 2. Modelo Matemático

- **Relação de Atributos**:
  - Dano: $\text{Dano}(V_2) = 12 > \text{Dano}(V_3) = 9 > \text{Dano}(V_1) = 6$
  - HP: $\text{HP}(V_3) = 48 > \text{HP}(V_1) = 20 > \text{HP}(V_2) = 16$
  - Resistência a Knockback: $\text{Boss} = 99\% > V_3 = 40\% > V_2 = 20\% > V_1 = 10\%$
- **Escala Temporal**:
  - $\text{HP}(t) = \text{Base} \times (1 + 0.032 \cdot t)$
  - $\text{Speed}(t) = \text{Base} \times (1 + 0.008 \cdot t)$
  - $\text{Interval}(t) = \max(0.25\text{s}, 1.8\text{s} - 0.018 \cdot t)$
- **Inflow de EHP aos 3 minutos (180s)**: $\approx 1132.9\text{ HP/s}$, exigindo evolução de armas e passivos sinérgicos para sobreviver.

---

## 🔍 3. Verificação

- [x] Sintaxe e inicialização sem erros em `blood_and_silver/index.html`.
- [x] Simulação quantitativa de 5000 spawns validada aos marcos de 10s, 30s, 60s, 100s, 150s e 180s.
- [x] Sprites corretos renderizados para cada tipo com preservação do chefe aos 120s.
- [x] Correção do mapeamento de 4 quadrantes para o jogador (Linha 0: S/Baixo, Linha 1: A/Esquerda, Linha 2: D/Direita, Linha 3: W/Cima).
- [x] Correção do bug de desaparecimento/piscada no Idle (Row 1 e Row 3 com 4 frames).
- [x] Golpe de espada ajustado para cone direcional focado de 45° com suporte a 8 direções e expansão para 180° na evolução (Espada Rubra).
- [x] Velocidade do Vampiro 3 aumentada em +50% (38 px/s).
- [x] Redesenho de projéteis: flechas (haste, ponta e penas) e virotes de besta (quarrel de aço e ponta reforçada) orientados ao vetor de voo.
