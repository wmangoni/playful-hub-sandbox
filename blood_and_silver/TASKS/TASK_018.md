# 🌲 TASK-BLOOD_AND_SILVER_018: Fase II — Floresta Amaldiçoada

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `🚀 Dev Complete`
> **Abordagem**: AI-DLC (Inception, Construction, Operation).

---

## 🎯 1. Objetivo

Adicionar uma segunda fase ao jogo, mantendo a Fase I exatamente como está:

1. **Fase II bloqueada no início**: libera quando o caçador sobrevive **10 minutos ou mais na Fase I**.
2. **Tela inicial com escolha de fase**: cartões das fases; a Fase II aparece com **cadeado** e não pode ser selecionada enquanto estiver trancada.
3. **Mesmo tamanho de mapa (4000 × 4000), outro ambiente**: uma **floresta amaldiçoada**.
4. **Horda nova**: 4 monstros com **sprites procedurais** em pixel art — **esqueleto, zumbi, múmia e morcego** — pequeninos e fofos, no estilo dos vampiros da Fase I.

---

## 🗺️ 2. Fases e desbloqueio

| Fase | Cenário (tema) | Horda | Como libera |
| :--- | :--- | :--- | :--- |
| **I — Dunas do Crepúsculo** | `deserto` | Vampiros (Espreitador, Assassino, Blindado) | Sempre liberada |
| **II — Floresta Amaldiçoada** | `floresta` | Esqueleto, Zumbi, Múmia, Morcego | 10:00 de sobrevivência na Fase I |

- `PHASES` (índice 1 e 2) guarda nome, tema, texto do cartão, elenco da miniatura (`cast`) e a tabela de spawn por faixa de tempo.
- Recordes por fase: `progression.bestTime` (Fase I, o de sempre — é ele que libera a Fase II) e `progression.bestTime2`. A última fase escolhida fica em `progression.lastPhase`.
- Ao cruzar os 10:00 na Fase I, o progresso é salvo na hora e aparece o aviso **"NOVA FASE LIBERADA!"** (não precisa morrer para valer).
- **Resetar** o progresso tranca a Fase II de novo.

---

## 🖥️ 3. Tela inicial e game over

- Cartão por fase com miniatura em pixel art (céu, lua, dunas ou mata e a horda da fase), nome, descrição e recorde.
- Fase trancada: miniatura apagada, **cadeado em pixel art**, requisito, barra de progresso (recorde da Fase I / 10:00); clicar faz o cartão tremer.
- Teclado: `1`/`2` ou `←`/`→` escolhem a fase; `Enter`/`Espaço` iniciam. Com o foco num cartão ou botão (Tab), `Enter`/`Espaço` acionam aquele cartão/botão (escolher a fase, abrir Conquistas…) sem iniciar. Com Conquistas ou Resetar abertos, as teclas não mexem no menu.
- O cartão acende na hora; o cenário novo é gerado logo depois, **em fatias** sob o menu (nenhum travamento longo, nem em CPU lenta). Se o jogador clicar em Iniciar no meio, a largada termina o que falta antes de jogar.
- Game over mostra a fase e o recorde dela; **Escolher Fase** volta para a tela inicial.
- No celular os cartões ficam lado a lado e compactos (deitado: miniatura à esquerda) e as dicas longas somem, para **"Iniciar Caçada" caber na primeira tela** (390×844, 375×667, 844×390, 667×375).

---

## 🌲 4. Cenário da Floresta Amaldiçoada

Novo tema `floresta` no sistema de cenário procedural, trocado em tempo real por `setPhase` (sem recarregar a página):

- **Solo**: folhiço escuro (textura `litter` nova), lodo arroxeado nas clareiras e tapete de musgo em volta de **4 pântanos** de água verde-escura.
- **Vegetação**: ~600 **árvores procedurais** (tronco retorcido, copa em lobos nas paletas `cursed`, `gloom` e `rot`, barba-de-velho pendurada) em bosques fechados, além de arbustos, espinheiros, tocos, troncos caídos, costelas de feras e mãos de mortos saindo do chão.
- **Dioramas** (marcos do minimapa): **Trono do Rei Lich**, Ruínas do Druida, Cemitérios Esquecidos (lápides e mãos saindo da terra), Acampamentos dos Caçadores e Altares das Bruxas (**caldeirão procedural** com poção verde brilhando).
- Os prefabs de pilar/lápide/urna e as "rachaduras" do pack de masmorra não entram na floresta (lá eles viram escadas, montinhos e retângulos); a floresta usa os sprites do pack de esqueletos e props procedurais.
- **Clima**: névoa esverdeada, vinheta mais fechada e **fogos-fátuos** vagando.
- Nomes das regiões no minimapa: Clareira Maldita, Mata dos Enforcados, Pântano dos Afogados, Floresta do Norte…

---

## 🧟 5. Monstros procedurais

Pintados em código (`paintMonsterSheet`) no mesmo formato dos spritesheets dos vampiros — quadros de 64×64, linhas frente/costas/esquerda/direita, 6 quadros de caminhada —, então clarão, desintegração e dublês funcionam sem mudança. Cada parte do corpo é sombreada (luz do alto-esquerda) e ganha contorno de 1px; a direita espelha a esquerda.

| Monstro | Visual | Comportamento |
| :--- | :--- | :--- |
| 💀 **Esqueleto Chocalhante** | Crânio grande, olhos de brasa azul, cachecol roxo | Perseguição direta; **35% das vezes os ossos chacoalham no chão e ele se levanta de novo** (uma vez, com 60% da vida) |
| 🧟 **Zumbi Cambaleante** | Pele verde, olhos desiguais, camisa rasgada, braços à frente | Avança em arrancos (lento, duro, resiste a empurrão) |
| 🧻 **Múmia Rancorosa** | Faixas em diagonal, fenda com olhos verdes, amuleto | Orbita em espiral e dispara a **maldição âmbar**, que deixa o caçador **35% mais lento por 1,8 s** |
| 🦇 **Morcego Sanguessuga** | Bolinha peluda, orelhas pontudas, olhões vermelhos, asas recortadas | Ziguezague nervoso + rasantes; chega em **bandos de 2–3** |
| 👑 **Rei Lich** (chefe) | Crânio coroado, capa roxa esfarrapada, ombreiras de osso, cajado de jade | Chefe da Fase II no lugar do Vampiro Ancião: persegue e solta **anéis de 8 maldições**; morre em luz verde-jade |

Cada monstro morre com o seu material (`gore`): esqueleto e Rei Lich viram pó de osso, zumbi solta gosma, múmia vira poeira de areia, morcego sangra. A maldição é âmbar de propósito: verde se confundiria com as gemas de XP.

**Balanceamento**: a Fase II é mais dura que a I de propósito — depois dos 140 s, ≈ +25% de vida por sorteio de spawn e ≈ +40% de corpos (a maioria morcegos frágeis e esqueletos que se remontam), além da maldição que deixa lento. É a fase de quem já sobrevive 10 min. O limite de 320 inimigos vivos é o mesmo da Fase I; na Fase II ele costuma ser atingido por volta dos 8 min, e dali em diante a pressão continua crescendo pela vida e pela velocidade dos monstros, que escalam com o tempo.

**Direção de arte**: como na Fase I (e no gênero, a exemplo da Mad Forest de *Vampire Survivors*), árvores e props fazem parte do chão assado e os personagens passam por cima delas: nenhum inimigo, disparo ou gema some debaixo de uma copa.

---

## ⚡ 6. Desempenho (Full HD, 260 inimigos, 5 armas evoluídas, jogador andando)

Custo do quadro (update + render), p99 / máx:

| Cenário | CPU 1× | CPU 4× |
| :--- | :--- | :--- |
| `main` (Fase I) | 2,8 / 5,9 ms | 17,9 / 29,1 ms |
| Fase I (nova) | 2,6 / 6,0 ms | 16,1 / 26,6 ms |
| **Fase II** | **2,7 / 3,9 ms** | **16,2 / 21,9 ms** |

Com abates contínuos (CPU 4×): `main` 14,3 / 24,6 ms, Fase I 13,6 / 20,4 ms, Fase II 14,8 / 21,0 ms. Em 4× o ruído entre execuções é grande (o próprio `main` passa de 20,8 ms em alguns quadros); em 1× sobra folga de ~6×.

- Trocar de fase no menu e iniciar (CPU 1×): nenhum quadro acima de 4 ms e nenhum chunk vazio. O mapa novo é gerado em fatias sob a tela inicial, depois de o cartão acender: em CPU 4× não sobra nenhuma tarefa longa (> 50 ms) após a troca (antes eram 75–130 ms).
- Em CPU 4×, o **primeiro** quadro após "Iniciar" fica em 18–26 ms (o `main` fica em 17–24 ms nas mesmas repetições, com bastante ruído); os seguintes voltam a 3–8 ms. Sob o menu a câmera já fica no spawn, para os chunks subirem para a GPU antes da largada.
- Em regime, a Fase II gasta ≈ 7% mais JS por quadro que a I (mais inimigos vivos por causa dos bandos; os fogos-fátuos custam ≈ 0,07 ms/quadro em 1×).
- Os spritesheets dos monstros e as silhuetas são pré-gerados no menu, em fatias ociosas.
- Em CPU 4×, carregar direto na Fase II e clicar em Iniciar no primeiro segundo custa ≈ 0,15 s de espera ainda sob a tela inicial: a pintura da vegetação da floresta (mais árvores que o deserto) é concluída de uma vez antes do 1º quadro. Em 1× não aparece, e os quadros de jogo não são afetados.
- Medição sem vsync (1×): a Fase II teve ≈ 1% de intervalos entre quadros acima de 20,8 ms contra ≈ 0,3% no `main`, com o mesmo custo de JS (máx. ≈ 5 ms); com vsync (como o jogador vê) ficou em 0 nas duas.
- A Fase I continua **pixel a pixel idêntica** (hashes dos chunks assados, da vegetação e do minimapa iguais aos do `main`).

---

## 🔧 7. Mudança pequena na Fase I

O `shootTimer` do Vampiro Blindado agora é zerado ao nascer (3,0 s até o primeiro tiro). Antes, um vampiro que reaproveitava o slot do pool herdava o cronômetro do anterior e às vezes atirava logo ao aparecer. O visual e o resto do comportamento da Fase I não mudaram. Os textos dos Presságios dizem que o Rei Lich também conta como chefe.

## ✅ 8. Testes

- [`tests/blood_and_silver_phase2.test.js`](../../tests/blood_and_silver_phase2.test.js): cadeado (clique, teclas, modal aberto), desbloqueio aos 10:00, Tab + Enter/Espaço/setas nos cartões sem iniciar a caçada, troca de cenário, spritesheets (inclusive o Rei Lich), horda e comportamentos (bando, arrancos, maldição que deixa lento, esqueleto que se remonta), anel do Rei Lich, mortes, recorde da Fase II separado, volta ao deserto idêntico, fase lembrada, layout do celular e reset.
- Os testes anteriores do jogo continuam passando.
