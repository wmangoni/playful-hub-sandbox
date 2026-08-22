# 🎁 TASK-BLOOD_AND_SILVER_017: Novos Itens Especiais Espalhados pelo Mapa (Coração, Gema Lilás, Arco e Escudo de Energia)

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `🚀 Dev Complete`
> **Abordagem**: AI-DLC (Inception, Construction, Operation).

---

## 🎯 1. Objetivo

Espalhar itens especiais colecionáveis pelo mapa $4000 \times 4000$ (com ênfase nos 4 cantos e marcos estratégicos) para incentivar a exploração ativa do cenário:

1. **❤️ Coração Sagrado (`heart`)**:
   - Recupera **40 pontos de vida** do jogador (limitado à vida máxima).
   - Efeito visual: Coração carmesim pulsante com brilho radial e texto flutuante `+40 HP`.

2. **🔮 Gema Lilás Magnética (`lilac_gem`)**:
   - Atua como um **super-imã de XP global**: atrai todas as gemas de XP que já estão caídas no mapa para o jogador a alta velocidade ($780\text{px/s}$).
   - **Regra de Escopo**: Afeta apenas as gemas já caídas no momento da coleta. Novos orbes dropados posteriormente continuam sujeitos apenas ao raio de coleta normal.
   - Efeito visual: Cristal facetado ametista/lilás com brilho magnético e partículas orbitais.

3. **🏹 Arco Élfico (`bow`)**:
   - **Se o jogador não possui o arco**: Desbloqueia e concede a arma Arco no Nível 1.
   - **Se o jogador já possui o arco**: Sobe o nível do Arco (até o nível máximo 8, ou concede XP se já maximizado).
   - Efeito visual: Arco recurvo dourado/madeira nobre com corda prateada e flecha brilhante pronta para disparo.

4. **🛡️ Escudo de Energia (`shield`)**:
   - Concede **100 pontos de proteção contra dano**.
   - **Mecânica de Absorção**: O dano recebido é absorvido primeiramente pelo escudo de energia. Se o dano exceder o valor do escudo, o excedente é aplicado na vida e o escudo é quebrado.
   - **Visual do Player**: Uma **bolha azul translúcida** fluorescente que pulsa suavemente ao redor do personagem (`rgba(56, 189, 248, 0.22)` a `0.45`), com anel cintilante de plasma, reflexo especular de luz e ondas de energia dinâmicas giratórias.
   - **Visual no Mapa**: Orbe esférico de plasma ciano/azul com brasão heráldico de escudo no centro e brilho radial.

---

## 🗺️ 2. Distribuição Espacial no Mapa ($4000 \times 4000$)

| Item | Localização / Coordenadas | Função |
| :--- | :--- | :--- |
| ❤️ **Coração** | Canto Superior-Esquerdo ($350, 350$) | Cura de emergência no noroeste |
| 🔮 **Gema Lilás** | Canto Superior-Direito ($3650, 350$) | Super-imã de XP no nordeste |
| 🔮 **Gema Lilás** | Canto Inferior-Esquerdo ($350, 3650$) | Super-imã de XP no sudoeste |
| ❤️ **Coração** | Canto Inferior-Direito ($3650, 3650$) | Cura de emergência no sudeste |
| 🏹 **Arco** | Santuário Norte ($2000, 800$) | Desbloqueio / Up de Arma |
| 🏹 **Arco** | Posto Avançado Sul ($2200, 3200$) | Desbloqueio / Up de Arma |
| 🛡️ **Escudo** | Posto Avançado Noroeste ($1400, 1400$) | 100 Pontos de Proteção e Bolha Azul |
| 🛡️ **Escudo** | Ruínas Sudeste ($2600, 2600$) | 100 Pontos de Proteção e Bolha Azul |
| ❤️ **Coração** | Oásis Oeste ($1000, 2200$) | Cura adicional |
| 🔮 **Gema Lilás** | Ruínas Leste ($3000, 1800$) | Super-imã de XP adicional |

---

## ✅ 3. Verificação e Testes Automatizados

- [x] Criação do subsistema `pickups` com inicialização em `initMapPickups()` e coleta em `updatePickups()`.
- [x] Lógica de cura de 40 HP e feedback visual.
- [x] Lógica de atração magnética de todos os XP orbs existentes sem afetar drops futuros.
- [x] Lógica de aquisição e evolução do Arco (`player.weapons.find(w => w.id === 'bow')`).
- [x] Lógica de absorção de 100 pontos de dano pelo Escudo de Energia e quebra com transição para vida real.
- [x] Renderização da bolha azul translúcida pulsante ao redor do jogador enquanto `player.shield > 0`.
- [x] Criação e execução do teste automatizado ([`tests/map_pickups.test.js`](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/tests/map_pickups.test.js)) com 100% de sucesso.
