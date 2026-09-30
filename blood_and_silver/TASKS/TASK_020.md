# 👑 TASK-BLOOD_AND_SILVER_020: Chefes perigosos e Fase II mais dura

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `🚀 Dev Complete`
> **Abordagem**: AI-DLC (Inception, Construction, Operation).

---

## 🎯 1. Objetivo

Os chefes eram fáceis demais de matar. Andavam a 14 px/s contra os 110 do caçador, então nunca alcançavam ninguém, e as flechas os derrubavam de longe sem risco nenhum. A Fase II também estava fácil. Esta task deixa:

- os chefes **2,9× mais rápidos** e com **+50% de vida**;
- um **teleporte** para quem foge: o chefe some pela esquerda e surge à direita, de surpresa;
- um **raio de longe** em todo chefe, com recarga de 6 s;
- um **frenesi** abaixo de metade da vida: mais velocidade e raio a cada 3 s;
- a **Fase II um pouco mais dura**, sem tocar na Fase I.

---

## 👑 2. Chefes (Vampiro Ancião e Rei Lich)

| | Antes | Agora |
| :--- | :--- | :--- |
| Velocidade | 14 px/s | 40 px/s (60 no frenesi) |
| Vida base | 800 | 1200 (Rei Lich ×1,2) |
| Ataque de longe | só o anel do Lich | **raio** em todos (Vampiro: 22 de dano; Lich: 16 + maldição), a cada 6 s (3 s no frenesi) |
| Fugir em linha reta | seguro | o chefe **teleporta** para a frente |

- **Teleporte**:
  - Quando o chefe fica fora da tela por 0,45 s, ele some. Se ainda não tinha aparecido, espera 2,5 s.
  - Ele reaparece na borda da tela à frente de quem corre (ou do lado oposto, se o caçador estiver parado), a 170 px ou mais do caçador.
  - O destino fica abaixo da barra do chefe e fora do minimapa: as caixas do HUD são medidas no DOM e convertidas para coordenadas do canvas.
  - Antes de surgir, uma **fenda** aparece no chão por 0,6 s: buraco quase preto de borda rachada, com um anel se fechando como contagem e faíscas correndo para o centro. Na segunda metade do aviso, o próprio chefe sobe translúcido de dentro dela. Durante o trânsito o chefe não anda, não ataca, não é alvo e some do minimapa.
  - Ao surgir há um clarão com a silhueta dele e ondas no chão. Depois vem uma recarga de 3 s (2 s no frenesi).
- **Raio**:
  - Só começa com o chefe à vista, nada de tiro de fora da tela.
  - **Carga** (0,85 s): uma linha fina de mira segue o caçador. O orbe na mão do chefe cresce 3× e um anel se fecha em volta dele até o disparo.
  - **Trava** (últimos 0,3 s): aparece a **faixa que fere, com exatamente a largura do dano**. É saturada, tem as bordas marcadas piscando e setas (›››) correndo na direção do disparo. Ela é desenhada no chão, então o caçador fica por cima e se vê dentro ou fora.
  - **Disparo** (0,4 s): o corpo do feixe tem a mesma largura do dano, com brilho fraco por fora. Acerta uma vez quem cruza a linha e, no fim, só se dissipa.
  - Quem foge em linha reta é acertado; um passo de lado depois da trava desvia.
- **Frenesi** (abaixo de 50% da vida):
  - Anúncio "FRENESI!" na fonte gótica do HUD, logo abaixo da barra do chefe, com ondas de choque e clarão.
  - Depois ficam ondas de calor difusas no chão, brasas subindo e um brilho por trás do chefe. A barra ganha "· FRENESI" e pulsa. O raio passa a ter contorno escuro com fio claro.
  - Velocidade ×1,5 e raio a cada 3 s. A carga fica mais curta e a **mira antecipa 0,3 s** do movimento: quem segue reto é acertado, quem muda de rumo desvia.
  - O anel do Rei Lich também vem mais rápido (×0,75 do intervalo).
- O Sino dos Mortos desfaz o raio em curso.

### Balanceamento (bot com arsenal de meio de jogo, sem horda)

| Jeito de lutar | `main` | Agora |
| :--- | :--- | :--- |
| Fugir em linha reta | chefe nunca morre, 0 de dano | ~26 teleportes e 12–14 raios em 150 s |
| Girar em volta (~280 px) | 58 s, 0 de dano | 87–101 s, 8 raios (quase todos no frenesi, com a mira antecipando) |
| De perto (~120 px) | 44–45 s, 0 de dano | 68–76 s, raios, anel e contato |

---

## 🌲 3. Fase II um pouco mais dura

`PHASES[n].diff` multiplica a horda. Na **Fase II**:

- +15% de vida;
- +8% de velocidade;
- +20% de dano (arredondado, também nos disparos das múmias);
- levas 10% mais frequentes;
- Rei Lich com +20% de vida.

Tudo isso vem por cima do que a fase já tinha. Na **Fase I** tudo é 1, e o teste confere que vida, velocidade e dano dos vampiros continuam idênticos.

---

## ⚡ 4. Desempenho (Full HD, 260 inimigos, 5 armas evoluídas, chefe em frenesi com raio quase contínuo)

- Os **disparos inimigos** (orbe de sangue, maldição da múmia e anel do Lich) viraram sprites pré-desenhados por estilo. É o mesmo desenho e a mesma sombra: a diferença média é de 0,35/255, só no antialiasing da borda. Agora é um `drawImage` por disparo, em vez de quatro formas com `shadowBlur`.
- O brilho da barra no frenesi anima só `opacity`, feita pelo compositor, sem repintar a barra.
- A barra do chefe ganhou uma placa escura, para o nome não se misturar com os inimigos atrás.
- O `main` quase nunca tinha o chefe na tela, porque ele ficava para trás. Agora o chefe está sempre em cena, e mesmo assim os números batem com os do `main`:

| Cenário | CPU 1× (quadros > 20,8 ms em ~720) | CPU 4× (quadros > 20,8 ms em ~700) |
| :--- | :--- | :--- |
| Fase I | `main` 0–4 · agora **0** | `main` 23–60 · agora 47–75 |
| Fase II | `main` 0–4 · agora **0** (0–1 antes do ajuste da barra) | `main` 24–45 · agora 45–64 |

- Em 1× (Full HD) a meta de ≥ 48 FPS é cumprida: nenhum quadro acima de 20,8 ms. O custo do quadro vai de p50 1,7–2,1 ms para 1,8–2,6 ms, com o chefe sempre em cena e em frenesi.
- Em 4× o `main` já perde quadros e o ruído é grande entre execuções. No pior caso deste stress (chefe na tela, em frenesi, com raio quase contínuo) a versão nova perde um pouco mais, com p50 do quadro +0,3–0,6 ms. No `main` o chefe quase nunca aparece na tela.

---

## ✅ 5. Testes

- [`tests/blood_and_silver_bosses.test.js`](../../tests/blood_and_silver_bosses.test.js):
  - velocidade e vida;
  - a Fase I idêntica e os multiplicadores da Fase II;
  - teleporte à frente de quem corre para a direita, com o destino dentro da tela;
  - raio: a mira segue e trava, o dano pega em quem fica na linha, um passo de lado desvia, a recarga é de 6 s e não há tiro de fora da tela;
  - frenesi: aviso, 40 → 60 px/s e raio a cada 3 s;
  - Rei Lich: raio que amaldiçoa, anel mais rápido e o Sino dos Mortos desfazendo o raio.
- Os testes anteriores do jogo continuam passando.
