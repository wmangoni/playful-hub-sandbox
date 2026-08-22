# 🏆 TASK-BLOOD_AND_SILVER_013: Sistema de Progresso Permanente e Conquistas (Meta-Progression)

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `🚀 Dev Complete`
> **Abordagem**: AI-DLC (Inception, Construction, Operation).

---

## 🎯 1. Objetivo da Meta-Progressão

Transformar a experiência de morte em um ciclo de **progresso permanente (roguelite)** através de um sistema de **Conquistas (Achievements)** salvas no `localStorage` do navegador.

A cada partida:
1. O jogo monitora e acumula estatísticas (abates vitalícios, tempo de sobrevivência recorde, chefes derrotados).
2. Conquistas desbloqueadas concedem **bônus passivos permanentes** que afetam todas as partidas seguintes ou **desbloqueiam novos itens** no pool de escolhas (Level Up / Baús).
3. Na tela de **Game Over** (após a morte), exibe-se a lista de conquistas adquiridas com seus respectivos benefícios.
4. Na tela inicial (**Menu Inicial**), há um botão para **Resetar Progresso** com reconfirmação em 2 etapas, limpando o `localStorage` e recomeçando do zero.

---

## 📜 2. Tabela de Conquistas e Benefícios Implementados

| ID | Conquista | Gatilho de Desbloqueio | Efeito Permanente / Benefício | Tipo de Bônus |
| :--- | :--- | :--- | :--- | :--- |
| `kills_100` | **MATADOR DE VAMPIROS** | 100 abates (vitalício) | +10% de dano base com a **Espada** | Arma (Dano) |
| `kills_500` | **NINGUÉM ME SEGURA** | 500 abates (vitalício) | +10% de dano base com **Arco** e **Besta** | Armas (Dano) |
| `kills_1000` | **SAI DA FRENTE** | 1.000 abates (vitalício) | +10% de velocidade de ataque com **Espada** e **Machado** (intervalo $\times 0.90$) | Armas (Cooldown) |
| `kills_2000` | **ROLO COMPRESSOR** | 2.000 abates (vitalício) | +10% de velocidade de ataque com **Arco** e **Besta** (intervalo $\times 0.90$) | Armas (Cooldown) |
| `survive_60` | **SOBREVIVENTE I** | Sobreviver por 1 min (60s) | +5% de vida máxima base ($+5\text{ HP}$) | Personagem (Vida) |
| `survive_120` | **SOBREVIVENTE II** | Sobreviver por 2 min (120s) | +5% de velocidade de movimento base ($\text{speed} \times 1.05$) | Personagem (Velocidade) |
| `survive_240` | **SOBREVIVENTE III** | Sobreviver por 4 min (240s) | +5% de vida máxima base (cumulativo com Sobrevivente I = $+10\%\text{ HP}$) | Personagem (Vida) |
| `survive_600` | **VICIADO** | Sobreviver por 10 min (600s) | Desbloqueia o item passivo **Cogumelo Noturno** (regeneração de vida) | Desbloqueio de Item |
| `boss_kill` | **PAULERA** | Derrotar o 1º BOSS | Desbloqueia o item passivo **Anel do Javali** (+velocidade de movimento) | Desbloqueio de Item |

---

## 💾 3. Estrutura de Dados no `localStorage`

Chave no storage: `blood_and_silver_progression`

```json
{
  "totalKills": 0,
  "bestTime": 0,
  "bossKills": 0,
  "unlockedAchievements": [
    "kills_100",
    "survive_60"
  ]
}
```

---

## 🖥️ 4. Fluxo de Interface e Telas

### 4.1 Notificações em Tempo Real (Toasts)
- Banner flutuante no canto superior direito com animação dourada quando qualquer conquista é alcançada em tempo de execução.
- Efeito sonoro de conquista integrado.

### 4.2 Tela de Game Over
- Estatísticas da partida: tempo, abates da partida, abates vitalícios acumulados, nível e recorde.
- Grade estilizada de **"🏆 CONQUISTAS DESBLOQUEADAS (X/9)"** exibindo ícones, títulos e bônus ativos.

### 4.3 Menu Inicial e Modal de Reset
- Botão **"🏆 Conquistas"**: abre modal com as 9 conquistas e o status (Ativo / Bloqueado).
- Botão **"🗑️ Resetar"**: abre modal de aviso em 2 etapas.
  - Alerta: *"Você perderá todas as 9 conquistas, bônus passivos e os itens voltarão a ficar bloqueados."*
  - Botão vermelho: **"Sim, Resetar Tudo"** e botão **"Cancelar"**.

### 4.4 Tela de Pause
- Botão de acesso rápido **"🏆 Ver Conquistas"** para consulta durante a partida.

---

## ✅ 5. Verificação e Testes

- [x] Carregamento e salvamento íntegro no `localStorage` sob a chave `blood_and_silver_progression`.
- [x] Filtro de itens bloqueados (`mushroom` e `boar_ring`) em `buildUpgradeOptions()`.
- [x] Aplicação dos bônus de vida (+5% e +10%) e velocidade (+5%) em `recomputeStats()`.
- [x] Aplicação dos bônus de dano e velocidade de ataque em `fireWeapon()`, `spawnProjectiles()` e `updateWeapons()`.
- [x] Validação sintática e de execução JavaScript sem erros.
