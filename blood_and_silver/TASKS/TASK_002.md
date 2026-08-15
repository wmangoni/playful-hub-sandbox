# 🧛 TASK-BLOOD_AND_SILVER_002: Etapa 1 — Núcleo Jogável (Câmera, Movimentação, Espada e Inimigos)

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `📋 Backlog` — aguardando refinamento do TL.
> **Spec guarda-chuva**: [`TASK_001.md`](./TASK_001.md) → seção 11 (Etapa 1).

## 🎯 Objetivo
Entregar o jogo **minimamente jogável**: o jogador se move por um mundo maior que a tela (câmera seguindo), a **Espada** ataca automaticamente em cooldown, inimigos esqueletos spawnam e perseguem, e há dano/morte com game over e reinício.

## ✅ Critérios de Aceitação (resumo)
- Movimentação 2D (`WASD`/setas) normalizada em diagonal; câmera segue o jogador; jogador confinado ao mundo.
- Espada com auto-ataque horizontal em cooldown (`melee-horizontal`).
- 1 tipo de inimigo (esqueleto) spawnando ao redor da câmera e perseguindo.
- Colisão por círculos + Spatial Hash Grid (distância ao quadrado, sem `Math.sqrt`).
- Dano/morte, tela de game over + reinício; HUD mínimo (vida + cronômetro).

## 📦 Referências
- Critérios: `TASK_001.md` → 4.1, 4.2 (Espada), 4.5, 4.8, 4.11, 5.6, 7.1–7.4, 7.11.
- Assets: `blood_and_silver/ASSETS.md` (esqueleto, cenário, espadachim).

## ❓ Dúvidas para o TL ou o PO
- _(preencher no refinamento)_
