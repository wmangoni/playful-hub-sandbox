# 🧛 TASK-BLOOD_AND_SILVER_008: Etapa 7 — Chefes (Boss Fight) com HP Escalado

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `📋 Backlog` — aguardando refinamento do TL.
> **Spec guarda-chuva**: [`TASK_001.md`](./TASK_001.md) → seção 11 (Etapa 7).

## 🎯 Objetivo
Adicionar **chefes** que surgem em **tempo fixo** (~120s) e cuja vida é **calculada pelo nível do personagem + força das armas/passivos**, mantendo o desafio balanceado.

## ✅ Critérios de Aceitação (resumo)
- Spawn por **tempo fixo** (~120s); apenas um chefe por vez.
- Chefe grande (Vampiro/Lich), com barra de vida no topo.
- HP escalado: `BOSS_BASE_HP × (1 + (nível-1)×0.25) × (1 + força do arsenal)`.
- Recompensa: grande XP + alta chance de baú raro/lendário.

## 📦 Referências
- Critérios: `TASK_001.md` → 4.10, 7.9.
- Assets: `blood_and_silver/ASSETS.md` (Vampire pack, Lich).

## ❓ Dúvidas para o TL ou o PO
- _(preencher no refinamento)_
