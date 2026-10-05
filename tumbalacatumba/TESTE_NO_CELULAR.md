# Teste no celular de verdade

O teste automático (`tests/tumbalacatumba_mobile.test.js`) roda num Chrome de computador fingindo ser um celular. Ele confere os controles, a interface e a lógica, mas não mede o que só o aparelho mostra: desempenho, aquecimento, áudio, entalhe da tela e o jeito do dedo. Este roteiro cobre essa parte.

Metas: **30 FPS estáveis** num Android intermediário de ~2022 e **60 FPS** num iPhone 12 ou mais novo, com o aparelho deitado.

## Como abrir o jogo no celular

O celular e o computador precisam estar na mesma rede Wi-Fi.

1. No computador, dentro de `tumbalacatumba/`, gere o build e sirva para a rede:

   ```bash
   npm run build
   npm run preview -- --host
   ```

2. O Vite mostra um endereço `Network: http://<IP do computador>:5179/` (o da placa Wi-Fi). Abra esse endereço no navegador do celular (Chrome no Android, Safari no iPhone).
   - Se não abrir, libere a porta 5179 no firewall do Windows para a rede privada.
   - Para desligar, `Ctrl+C` no terminal.
3. Depois do PR publicado, o mesmo teste vale direto no site: `/tumbalacatumba/`.

Para ver o FPS, ligue **Opções → Mostrar FPS**. Para ver o console, use no Android a depuração por USB (`chrome://inspect` no computador). No iPhone, o console só aparece com um Mac (Safari → Desenvolver).

## O que conferir

Anote o aparelho, o sistema e o navegador, e marque cada item.

| # | O que fazer | O que esperar |
|---|---|---|
| 1 | Abrir o jogo pela primeira vez, deitado | Controles de toque na tela e **Opções → Qualidade gráfica: Celular** já escolhida |
| 2 | Com o FPS ligado, parar ~10 s em cada lugar: praça de dia, no farol olhando o vale, pântano à noite, dentro da mansão (saguão) | Android ≥ 30, iPhone ~60. Anotar o número de cada lugar |
| 3 | Jogar 15 minutos seguidos (missões, combate, voo) | O FPS não despenca com o aparelho quente; a imagem pode ficar um pouco mais suave (a resolução cai até 75% abaixo de 28 FPS) |
| 4 | Custo do brilho (bloom), só no Android que fica abaixo de 60 FPS: à noite (**Opções → Hora do dia**), parado na praça, no console do `chrome://inspect` digitar `__game.post.bloomPass.enabled = false`, anotar o FPS depois de ~10 s junto com `__game.dynScale` (a resolução adaptativa; tem que ser a mesma nas duas medidas), e `= true` para voltar | A diferença entre os dois FPS é o custo do brilho. Se ele derruba o aparelho abaixo de 30, vale tirar o brilho do preset Celular. A qualidade Baixa não serve para essa conta: ela também muda a resolução, a grama e os cortes de distância. No iPhone que já segura 60 com o brilho, pular |
| 5 | Andar e correr bastante com o joystick | Não trava a corrida sem querer; dizer se o cadeado que aparece ao empurrar para a frente incomoda |
| 6 | Arrastar o joystick até o cadeado e soltar; girar a câmera; tocar no joystick | Corre sozinho, a câmera muda o rumo, o toque para |
| 7 | Olhar as bordas da tela (entalhe, cantos arredondados, barra do navegador) | Nenhum botão embaixo do entalhe ou cortado pela barra do navegador |
| 8 | Virar o aparelho em pé e deitar de novo | Em pé: aviso "Vire o celular" e o jogo para; deitado: volta de onde estava |
| 9 | iPhone com a chave de silencioso ligada; depois receber uma ligação ou bloquear a tela e voltar | Silencioso: sem som. Depois da ligação ou do bloqueio, o som volta sozinho |
| 10 | Ir para outro app, voltar; depois fechar a aba e abrir de novo | O jogo continua; ao reabrir, **Continuar** mantém o progresso |
| 11 | Polegar no joystick e, com o outro dedo, tocar nos botões do topo, numa conversa e na mochila | Tudo responde com o polegar parado no joystick |
| 12 | Tocar em todos os botões (habilidades, ⋯, Falar/Pegar, opções das conversas) | Fáceis de acertar com o dedo, sem tocar no vizinho |
| 13 | Em celular com tela de 90 ou 120 Hz | FPS no máximo 60 (45 numa tela de 90 Hz) |
| 14 | Se aparecer "O vale piscou…" (o aparelho tirou a placa de vídeo do jogo) | Recarrega e o progresso continua |

## O que mandar de volta

- Aparelho, sistema e navegador.
- O FPS de cada lugar do item 2 e o do item 4 nas duas qualidades.
- Os itens que falharam, com uma captura de tela se der.
