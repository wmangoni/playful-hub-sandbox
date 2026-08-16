# 🧛 TASK-BLOOD_AND_SILVER_006: Etapa 5 — Baús e Roleta de Recompensa

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `✅ Done` — Etapa 5 implementada e testável.
> **Spec guarda-chuva**: [`TASK_001.md`](./TASK_001.md) → seção 11 (Etapa 5).

## 🎯 Objetivo
Adicionar **baús** (comum, raro, lendário) que abrem um popup de **roleta** (pausa) e premiam o jogador.

## ✅ Critérios de Aceitação (resumo)
- Drop de baús por chance de abate + **pity timer** (~60s).
- Popup de roleta com pausa (`status = 'chest'`).
- Comum/Raro: roleta **apenas sobre armas possuídas** → +1 nível.
- Lendário: **3 giros**, podendo **desbloquear armas novas**.
- Retomada ao concluir a roleta.

## 📦 Referências
- Critérios: `TASK_001.md` → 4.9, 7.8.
- Assets: `blood_and_silver/ASSETS.md` (doors_lever_chest, Overgrown Crate, Circle_menu).

## ❓ Dúvidas para o TL ou o PO
- _(preencher no refinamento)_
