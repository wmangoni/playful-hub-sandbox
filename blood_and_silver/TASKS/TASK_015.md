# 📦 TASK-BLOOD_AND_SILVER_015: Redesign Visual e Sistema de Tiers dos Baús

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `🚀 Dev Complete`
> **Abordagem**: AI-DLC (Inception, Construction, Operation).

---

## 🎯 1. Objetivo

Reformular completamente o visual de todos os baús do jogo no canvas, substituindo os retângulos simples por ilustrações ricas em detalhes e camadas góticas procedurais em Canvas 2D, com **progressão visual clara de detalhes e tamanhos escalonados por raridade**:
- **Baú Comum (Madeira/Bronze)**: Menor tamanho, detalhes rústicos (tábuas de madeira, cintas de ferro e fechadura simples).
- **Baú Raro (Prata)**: Tamanho médio, acabamento refinado (madeira nobre, ferragens em prata polida, cantoneiras ornamentadas, fechadura prateada e safira central).
- **Baú Lendário (Ouro)**: Maior tamanho, acabamento luxuoso de ouro maciço com filigranas, bordas entalhadas em relevo, fechadura régia com grande rubi incrustado pulsante e partículas de brilho dourado.

---

## 💎 2. Especificação por Tier de Baú

| Atributo | 🪵 Baú Comum (Madeira) | 🥈 Baú Raro (Prata) | 👑 Baú Lendário (Ouro) |
| :--- | :--- | :--- | :--- |
| **Dimensões (L x A)** | $26\text{px} \times 20\text{px}$ | $34\text{px} \times 26\text{px}$ | $44\text{px} \times 34\text{px}$ |
| **Raio de Colisão (`radius`)** | $14\text{px}$ | $18\text{px}$ | $24\text{px}$ |
| **Corpo / Madeira** | Ripas de carvalho escuro envelhecido (`#362112`) | Madeira ébano/azulada nobre (`#1b1f2e`) | Ouro maciço acetinado (`#6b4a0d` / `#db9d23`) |
| **Ferragens / Cintas** | Ferro batido e rebites rústicos (`#635d56`) | Prata polida com reflexos frios (`#9bb0c9`) | Ouro reluzente com chanfro e filigranas (`#ffd700`) |
| **Fechadura & Gemas** | Tranca simples de ferro | Fechadura de prata com safira azul | Fechadura ornamental com grande rubi carmesim |
| **Efeitos / Aura** | Sombra de contato e brilho sutil bronze | Aura pulsante prateada e reflexos verticais | Feixes de luz dourada, aura radiante e partículas estelares |

---

## 🛠️ 3. Modificações Realizadas

1. **Estrutura de Dados `CHEST_TIERS`**:
   - Centralização das dimensões (`w`, `h`, `radius`), paletas de cores, gradientes e efeitos de renderização.
2. **Função de Renderização `drawChests()`**:
   - Ilustração procedural rica em camadas: sombra de chão, gradientes de madeira e ouro 2.5D, tampa arqueada com linha de junta, cintas metálicas com rebites, fechadura centralizada, gemas preciosas (safira e rubi pulsante) e partículas douradas no baú de ouro.
3. **Spawn e Colisão Proporcional**:
   - `spawnChest` ajusta dinamicamente `c.radius` de acordo com o tier ($14\text{px}, 18\text{px}, 24\text{px}$).
4. **Modal de Recompensa Estilizado**:
   - `renderChestPopup` aplica estilização tipográfica e brasões temáticos para cada tier no modal de roleta.

---

## ✅ 4. Verificação

- [x] Progressão de tamanho e dimensões escalonadas validada por teste automatizado ([`tests/chest_visuals.test.js`](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/tests/chest_visuals.test.js)).
- [x] Suíte de testes mobile touch, desktop, disparo do vampiro 3 e CI executada com 100% de aprovação.
