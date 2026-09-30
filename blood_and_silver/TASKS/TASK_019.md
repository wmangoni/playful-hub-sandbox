# 🎵 TASK-BLOOD_AND_SILVER_019: Trilha Sonora — rock gótico em chiptune

> **Jogo**: Sangue & Prata (`blood_and_silver`) · **Status**: `🚀 Dev Complete`
> **Abordagem**: AI-DLC (Inception, Construction, Operation).

---

## 🎯 1. Objetivo

Criar uma trilha sonora emocionante no estilo de *Vampire Survivors* (e dos Castlevania de 8 bits que o inspiraram): rock gótico em chiptune, com cravo, órgão, baixo pulsante e bateria, sem nenhum arquivo de áudio e sem custar quadros ao jogo.

---

## 🎼 2. Os temas

| Tema | Onde toca | Tom · andamento | Clima |
| :--- | :--- | :--- | :--- |
| **A Noite Sem Fim** | Tela inicial | Ré menor · 92 BPM | Órgão, cravo e sino, devagar e sombrio |
| **Dança Rubra das Dunas** | Fase I | Ré menor harmônica · 152 BPM | Rock gótico: cravo em arpejos, baixo pulando de oitava, lead de onda quadrada. A 2ª aumentada (Si♭–Dó♯) dá o ar de deserto |
| **O Ancião Desperta** | Chefe da Fase I | Ré menor · 164 BPM | Bumbo reto, baixo em semicolcheias, órgão dobrando a melodia e o acorde napolitano de Mi♭ |
| **Danse Macabre da Floresta** | Fase II | Mi menor · 168 BPM, **valsa** | O xilofone faz os ossos dançarem (como na *Danse Macabre* de Saint-Saëns): pizzicato no 1, cravo no 2 e no 3, coro e estalos de ossos |
| **Coroação do Rei Lich** | Chefe da Fase II | Mi menor · 172 BPM | Frenético em 4/4, xilofone com lead dobrando uma oitava abaixo, coro e o napolitano de Fá |

- Cada tema é composto como cifras por compasso + melodia (`MUSIC_TRACKS`); baixo, acordes, órgão/coro e bateria são gerados das cifras pelo estilo (`rock`, `waltz`, `menu`).
- **A trilha cresce com a caçada**: depois de 2 min entram órgão/coro, bateria cheia (chimbal em semicolcheias, bumbos extras, viradas) e as dobras da melodia. Os temas dos chefes já tocam cheios.
- **Trocas na virada do compasso**: o tema do chefe entra no compasso seguinte ao surgimento dele (com prato) e o da fase volta quando ele morre. Menu → caçada troca na hora, com fade curto.
- **Pausa abafada**: a música passa num filtro que fecha (levemente nos popups de nível/baú/presságio, bem mais na pausa). No game over a trilha some e fica só o lamento.
- Harmonia verificada automaticamente: 73–94% das notas em tempo forte são do acorde; as demais são apojaturas intencionais (a sensível Dó♯ → Ré, o Si♭ → Lá frígio do deserto, o "suspiro" Si → Lá da valsa).

---

## 🎛️ 3. Controles

- Botão **🎵 / 🔇** no canto de cima das telas (menu, pausa, popups, game over), com o nome do tema tocando; some durante a caçada.
- Tecla **N** liga/desliga a qualquer momento. A escolha fica salva (`blood_and_silver_music`).
- O áudio começa no primeiro clique/toque/tecla (política de autoplay dos navegadores) e dorme quando a aba vai para o segundo plano.

---

## ⚙️ 4. Motor (AudioWorklet)

- **Sequenciador e sintetizador rodam na thread de áudio** (`musicProcessorMain`, num AudioWorklet montado de um Blob): precisão de amostra, polifonia de 128 vozes, instrumentos sintetizados (pulso 25% e serra com PolyBLEP, órgão/baixo/seno por tabela de um ciclo, filtros SVF, ruído e envelopes). Reverb de igreja por convolução nativa na mandada, compressor e o filtro das pausas fora do worklet.
- A thread do jogo só manda comandos (`play`, `stop`, `full`, `enabled`) — **nenhum nó de áudio por nota, nenhum custo nos quadros**.
- Uma primeira versão, com nós nativos por nota agendados pela thread do jogo, custava 2–3 ms (p99) por chamada do agendador em CPU 4× e chegava a empurrar quadros além de 20,8 ms; por isso o motor foi inteiro para o worklet.
- Sem AudioWorklet no navegador (muito antigo), o jogo segue sem trilha, sem erro.

---

## ⚡ 5. Desempenho (Full HD, 260 inimigos, 5 armas evoluídas, com vsync)

Quadros acima de 20,8 ms (< 48 FPS) em 12 s de stress, `main` sem música → com a trilha:

| Cenário | CPU 1× | CPU 4× |
| :--- | :--- | :--- |
| Fase I | 0 → 0 | 50 → 50 |
| Fase II | 0 → 0 | 50 → 27 |

O custo do callback do quadro também ficou igual (p99 ≈ 2,5–3 ms em 1×). Em 4× o ruído entre execuções é grande; a trilha não acrescenta trabalho à thread do jogo.

---

## ✅ 6. Testes

- [`tests/blood_and_silver_music.test.js`](../../tests/blood_and_silver_music.test.js): as 5 composições (compassos fechados), prévia de cada tema no mesmo worklet (com som, sem clipping, sem amostras inválidas) e, no jogo, menu → Fase I → chefe na virada do compasso → volta → pausa → tecla N e botão (lembrados ao recarregar) → game over em silêncio → menu → Fase II → Rei Lich.
- Os testes anteriores do jogo continuam passando.
