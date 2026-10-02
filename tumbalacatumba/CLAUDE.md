# Tumbalacatumba — guia técnico

RPG de missões em mundo aberto feito com three.js r186. Visual cartoon "Tim Burton terror-engraçado", controles de MMO clássico e interface com identidade própria ("caderno de contos costurado"), entregue como **um único HTML** que roda via `file://`. O `README.md` descreve o jogo para quem joga (controles, conteúdo). Este arquivo reúne o necessário para mexer no código sem repetir erros já resolvidos.

## Comandos

- `npm install`
- `npm run dev`: http://127.0.0.1:5178 (porta fixa). O HMR recarrega a página a cada arquivo salvo.
- `npm run build`: gera `dist/index.html` e copia para `Tumbalacatumba.html` (`scripts/postbuild.mjs`). O `Tumbalacatumba.html` é versionado, então rode o build antes de cada commit que mexe no jogo.
- `npm run preview`: http://127.0.0.1:5179
- Não há testes unitários nem lint. A verificação é feita com capturas de tela no navegador e com o e2e `tools/e2e_sync.js`.

## Regras do projeto

- **Arquivo único**: nada de Web Workers, `import()` dinâmico, `fetch` de assets ou URLs externas. Fontes só via `@fontsource/*`, importando o subset em `src/main.js` (o build embute os woff2). Canvas que desenha texto com essas fontes precisa de `await document.fonts.load(...)` antes.
- **Tudo procedural**: sem modelos, texturas ou sons externos. Os modelos saem do `Builder` (`src/render/builder.js`), que mescla primitivas com cores de vértice.
- Textos do jogo, comentários e mensagens em português do Brasil.
- **Identidade visual própria** (não imitar a interface de nenhum outro jogo): tinta preta arroxeada (`--ink`), papel cor de osso (`--bone`), abóbora (`--pumpkin`), verde-fantasma (`--ghoul`) e roxo-hematoma (`--bruise`), todas em `src/ui/styles.css`. Formas com cantos tortos (`--crooked`), pontos de costura (contorno tracejado por dentro) e listras preto-e-osso; nada de dourado com bisel, gárgulas, anel dourado no retrato nem `!`/`?` amarelos. Fontes: Mountains of Christmas (títulos, `--title-font`), IM Fell English (texto, `--ui-font`), Patrick Hand (números e chat, `--chat-font`) e Griffy (logotipo e placas).
- `src/world/layout.js` é a fonte única da planta do mapa (zonas, estradas, `NPC_SPOTS`, áreas de missão, `ZONE_LEVELS` e `MOB_SPAWNS`). Mude lá e deixe o resto derivar.

## Mapa do código

- `src/game.js`: orquestra render, loop, título → jogo, presets `QUALITY` (baixa/media/alta), opções, atalhos e resolução adaptativa (`_adapt`).
- `src/render/`: `toon.js` (neblina global, `toonMat`, `MAT.vc`/`MAT.vcDouble`, brilhos `glowMat`/`flameMat` e o registro `GLOW`), `postfx.js` (composer e `LAYER_FX`), `builder.js` e `bake.js` (texturas assadas na GPU).
- `src/world/`: `terrain.js`, `sky.js`, `daynight.js` (keyframes de luz, neblina e gradação por hora), `water.js`, `world.js` (movimento, colisão e água), `colliders.js`, `populate.js` (espalha os props) e `props/` (`batch.js` com o `StaticBatch`, árvores, casas, placas).
- `src/entities/`: jogador, câmera de terceira pessoa, `rig.js` (animação procedural, com as chaves da Lanternada em `K_ATTACK`), `npc.js` (`NPC`, `Pickup`), modelos de PNJs e criaturas (`mobModels.js` tem as 5 criaturas hostis), vida ambiente.
- `src/combat/`: `combat.js` (atributos do jogador por nível em `playerStats`, golpe, dano, XP, morte e volta à praça, objetivos de caça pelo `type.id`, Cuspe de Fogo do pet em `updatePet`), `mob.js` (IA: idle → chase ⇄ attack → return, dead → gone) e `mobTypes.js` (números de cada criatura). Os corvos (`questWorld`) e os sapos (`ambientLife`) nascem lá e o combate os adota como neutros.
- `src/quests/`: `data.js` (as 17 missões e seus textos; as 5 depois da primeira leva são continuações e *A Capa Sumida* é a da mansão), `progress.js` (estado e save), `interact.js` (seleção e interação), `questWorld.js` (lógica das missões no mundo) e `mansionQuest.js` (Anselmo, Vovô e Bisa, as pistas, o baú do sótão e o morceguinho).
- `src/world/interior/`: o interior da Mansão Dentúcio. `plan.js` é a fonte única da planta (cômodos, portas, janelas, escadas, furos no piso, `LV` com a altura de cada andar); `architecture.js` levanta pisos, paredes, forros e escadas e registra superfícies e colisores; `furniture.js` é a biblioteca de móveis; `decor.js` mobília cômodo por cômodo (luzes, colisores e objetos examináveis); `indoors.js` entra/sai, troca a visibilidade por andar/cômodo, ajusta luz e câmera e responde `floorAt`/`ceilAt`; `kit.js` (`IKit`, `UVBuilder`), `textures.js`, `materials.js` e `plan-map.js` (minimapa por andar).
- `src/ui/`: HUD, janelas, minimapa, retratos 3D, ícones em SVG e canvas. `combatHud.js` cuida das barras de vida, placas das criaturas e tela de morte.
- `src/fx/`: `lights.js` (`Halos` e `LightPool`), `ambience.js`, `effects.js`. Em `src/audio/audio.js` ficam a música e os efeitos em WebAudio.

## Depuração

- URL: `?play` pula o título e começa um jogo novo (`&cont` continua o save). Também aceita `&notut`, `&t=21.5` (hora), `&pos=x,z&yaw=`, `&pitch=`, `&dist=`, `&q=baixa|media|alta` e `&peaceful` (criaturas não atacam).
- `window.__game.debug`: `info()` (posição, hora, FPS, draw calls, triângulos), `setTime(h)`, `tp(x, z)`, `cam(yaw, pitch, dist)`, `frames(n)`, `peace(v)` (modo pacífico), `enter()`/`exit()` (mansão, sem fade) e `room(id)` (teleporta para o centro de um cômodo; sem argumento lista os ids).
- Dentro da mansão, `__game.indoors.toWorld(x, y, z)` converte coordenadas da planta para o mundo (útil com `cam.override`).
- `window.__game.combat`: `mobs`, `hp`, `st` (atributos), `peaceful`, `swing()`.
- `window.__game.tick(dt)` renderiza um quadro manualmente. `window.__game.cam.override = { pos, look }` dá uma câmera livre.
- `window.__errors` acumula os erros e avisos do console (`src/main.js`).
- localStorage: `tumbalacatumba-save-v1` (save), `tbl-settings`, `tbl-quality`.

## Como testar

- **e2e**: abrir `Tumbalacatumba.html?play&notut&t=12` via `file://` (sem HMR), esperar `__game.state === 'play'`, injetar `tools/e2e_sync.js` e chamar `__T.run(passo)` na ordem descrita no arquivo. Resultado esperado: as 17 missões concluídas, nível 7 (máximo), o passo `combate` vencendo um marujo, o passo `fogo` com o Belzebuzinho acertando um rato, o passo `capa` com as 3 pistas, o baú, a capa nova no Conde e o voo (sobe mais de 10 m e pousa) e `window.__errors` vazio. Os passos de caça esperam as criaturas renascerem (70 s simulados). Rode contra o HTML final, porque um erro de TDZ já apareceu só no build. O e2e liga o modo pacífico: sem isso, criaturas hostis e os 15% de neutros incomodados atrapalham os teleportes.
- **Aba em segundo plano** (browser-harness): o Chrome pausa o `requestAnimationFrame` e segura `setTimeout`/`setInterval`. Por isso o e2e avança só a simulação (`update(1/30)`), sem render e sem timers, e o carregamento cede com `setTimeout` em vez de rAF. Screenshots funcionam depois de um `tick()` manual.
- Screenshot de PNJ: tire o cursor de cima dele antes. O destaque de hover (`rig.highlight`, emissive 0,09) acinzenta roupas escuras e já fez a capa do Conde parecer salmão.
- FPS só vale com a aba visível. Para simular 1080p, use `Emulation.setDeviceMetricsOverride` e depois `Emulation.clearDeviceMetricsOverride`.
- Ao terminar, apague os saves de teste do localStorage (em `file://` e em `http://127.0.0.1:5178`) e pare o dev server pelo PID ou pela porta. `pkill -f "node .*vite"` já matou o próprio shell.

## Desempenho (GPU alvo: Intel Iris Plus G7)

Referência: 60 FPS a 1592×818 na qualidade média, com ~318 draw calls por quadro.
- Nada de ruído procedural por pixel. Padrões estáticos são assados em textura uma vez (`bake.js`). O terreno usa padrão 2048², ruído 256² e Voronoi 512².
- Geometria estática entra no `StaticBatch`, que mescla por célula de 44 m e por material. Não crie `InstancedMesh` por variante: isso já chegou a 664 malhas e ~550 draw calls.
- `PointLight` só pelo `LightPool` fixo de 4 (manter a quantidade constante evita recompilar shaders). As outras lâmpadas são falsas: halos num único `THREE.Points` e poças de luz assadas no terreno (`terrain.bakeLamps`).
- PNJs somem a mais de 110 m da câmera. Com `renderer.info.autoReset = false`, o `info()` soma todos os passes do composer.
- Mansão: o interior fica longe do mapa (`INTERIOR` em `plan.js`, y = 100) e, ao entrar, o grupo `outdoor` inteiro some. Só ficam visíveis os cômodos do andar atual e os vizinhos por porta ou escada (`setLevel`). Cada cômodo é mesclado por material (`IKit.meshes`). Medido a 1920×1080: 5–7 ms por quadro no pior cômodo (saguão, ~420 draw calls). As luzes vêm do mesmo `LightPool` de 4, com `yWeight` (outro andar conta como longe) e `focusRoom` (prefere o cômodo atual).
- Cada peça de rig custa 3 draw calls (sombra, normal/profundidade e cor). As criaturas têm LOD em `mob.js`: sombra só a menos de 22 m da câmera, e além de 36 m vão para `LAYER_FX` (sem contorno). Olhos e chamas (material diferente do rig) ficam sempre em `LAYER_FX`. Criaturas somem a mais de 80 m e nem pensam a mais de 95 m do jogador.

## Armadilhas já resolvidas (não repetir)

**Renderização e cor**
- Ordem do composer: NormalDepth → Render (HalfFloat) → Outline → UnrealBloom (limiar 1, só o que passa de 1 em HDR brilha) → Output (`NeutralToneMapping`) → FXAA → Grade.
- O contorno de tinta vem de um passe de normais e profundidade que só vê a camada 0. Grama com vento (vertex shader animado), transparências, partículas, céu e água ficam em `LAYER_FX`, senão o contorno sai desalinhado.
- A neblina (distância + névoa rasteira) substitui `THREE.ShaderChunk.fog_*` em `toon.js`. Nela, `scene.fog.near` é a densidade e `scene.fog.far` a intensidade da névoa rasteira, não distâncias. Um `ShaderMaterial` novo precisa de `fog: true`, `UniformsLib.fog` e dos includes de fog com `mvPosition`. Material sem iluminação (como a água) deve multiplicar a cor por `uAmb`, senão brilha à noite.
- Hex em `THREE.Color` vira linear. Uniforms usadas depois do `OutputPass` (Grade) precisam de `.convertLinearToSRGB()`. `THREE.Color` não tem `addScaledVector`, e a exceção no update deixa a tela preta.
- `NeutralToneMapping` desbota cores saturadas muito iluminadas (as abóboras ficaram pálidas). Ajuste a luz em `daynight.js`, não o albedo.
- `PCFSoftShadowMap` foi removido do three r18x. Use `PCFShadowMap`.
- Cada variante de `onBeforeCompile` precisa de uma `customProgramCacheKey` própria.
- `ConeGeometry` com `translate` + `rotateZ`: confira para onde o eixo foi (o degradê do facho do farol já saiu invertido).

**Colisão e mundo**
- Colisor fino deixa o círculo do jogador atravessar para o lado errado. Use corrimão grosso e deslocado para fora, e revalide a posição depois de resolver a colisão, com as mesmas regras. Na água funda, `world.js` bloqueia o passo que leva a mais de 1 m de profundidade e piora a profundidade atual.
- `Pickup` que cai na água procura chão seco em anéis. Props não nascem a menos de ~3 m dos `NPC_SPOTS`.
- `PointLight` colada ao personagem estoura a cor. A luz da lanterna de vaga-lumes fica em (0.3, 3.1, 1.7), à frente e acima do jogador.
- Resolução adaptativa: o `_adapt` redimensiona o canvas, e redimensionar limpa o canvas. Ele roda antes do render no `tick`; depois do render, o quadro apresentado saía todo preto (parecia NaN no bloom e não era).

**Mansão (interior)**
- O `Builder.prep` apaga o atributo `uv`. Malha com textura (vitral, vista das janelas, teias, fachos, pisos) passa pelo `UVBuilder` (`kit.js`); `IKit.glow(mat)` já escolhe o `UVBuilder` quando o material tem `map`. Sem isso, a textura vira uma cor chapada ou some.
- Luzes do interior (`Decor.light`): o `LightPool` põe a luz 0,35 m abaixo da fonte. `indoors.js` sobe as fontes para logo acima da chama e as afasta 0,6 m das paredes; lustres e lampiões pendurados usam `dy: -0.6` para a luz ficar abaixo da cúpula. Colada numa superfície, a luz estoura em branco. O `toon.js` ainda limita a luz direta (half-float).
- Dentro da mansão o `LightPool` usa `decay` 1 e `iScale` 0,4 (`INDOOR_DECAY`/`INDOOR_ISCALE` em `indoors.js`); com a queda de fora (1,7), a parede junto da vela estourava e o meio do cômodo ficava escuro. Fonte com `pri` ganha prioridade quando o jogador está no mesmo cômodo (a luz de preenchimento do patamar, o lampião do baú).
- Tudo o que é criado depois do agrupamento em `outdoor` (missões, vida ambiente, combate) é reparentado nele no `game.js`, menos os PNJs com `indoorLevel`. Sem isso, o mundo de fora continuava sendo desenhado dentro da mansão (o saguão tinha 424 draw calls; hoje, ~240).
- Placas de nome são HTML e atravessam paredes: os PNJs do interior fazem um `colliders.raycast` da câmera até a cabeça a cada 0,2 s e a placa some com `occluded`.
- Pisos, escadas e rampas dependem da altura: `world.groundHeight(x, z, y)` e `moveCircle` delegam ao interior, e os colisores têm faixa `y0`/`y1`. Colisor de parede de um andar precisa terminar abaixo do piso de cima (`y1 = b1 - 0.15`), senão bloqueia a passagem no patamar.
- PNJs do interior têm `indoorLevel` e só aparecem no andar certo (senão a placa de nome atravessa o piso). O save grava a posição de fora (`outsidePos`) quando o jogador está dentro, e o jogo sempre recomeça do lado de fora.
- Nada de `setTimeout` em sequências de missão (o baú do sótão): o e2e avança só a simulação. Use temporizadores no `update`.
- O `renderer.compile` do carregamento liga o interior só para compilar e depois restaura a visibilidade anterior.

**Voo (capinha)**
- Todo colisor precisa de faixa de altura (`y0`/`y1`). Sem ela o padrão é 99 m e, voando, o jogador bate numa parede invisível no céu. Cercas e muros usam o `fenceSeg` de `populate.js`; o e2e voa a ~20 m por cima da cerca da mansão para pegar isso.
- `player.startFlying()`/`stopFlying()`/`updateFlight()`. Espaço sobe, X desce; segurar X rente ao chão por 0,25 s pousa. Levantar voo desmonta e tira da cadeira; não voa dentro da mansão (teto baixo) nem morto, e morrer ou usar a Pedra do Lar cancela o voo. Parar de voar no alto vira planeio (`gliding`). A capinha é a junta `cape` do modelo do jogador e só aparece voando ou planando.

**Interface**
- `#overlay` tem `z-index: 1` (contexto de empilhamento) para as placas de nome não passarem por cima das janelas.
- Foco: botões, selects, checkboxes e sliders recebem `blur()` depois do uso, e `_isTyping` (`core/input.js`) só considera campos de texto. Sem isso, o Espaço clica de novo no botão e o WASD para de funcionar.
- Os marcadores `!`/`?` são desenhados em SVG com traços grossos. Com glifo de fonte ficam finos demais.
- Canvas 2D: o recorte com `globalCompositeOperation = 'destination-in'` usa o `fillStyle` atual; se ele for um degradê que vai a transparente (o `glow()` dos ícones), a arte some. Defina uma cor opaca antes.
- Degradês de SVG repetidos em várias placas: com o mesmo `id`, o Chrome resolve `url(#id)` para o primeiro elemento, e se ele estiver numa placa com `display: none` o marcador fica oco. Use id único por SVG (`markerSeq`).
- Nomes de classe curtos colidem: as placas das criaturas eram `.mp` e herdavam para a barra de Coragem (`bar mp`), que sumia. Hoje são `.mobplate`.
- Patrick Hand e IM Fell English só têm peso 400; `font-weight: 700` nelas vira negrito falso borrado. Mountains of Christmas é carregada só no 700.
- Não reaproveite nomes curtos em blocos internos: um `const` que sombreava outra variável causou erro de TDZ só no build minificado.

**Combate**
- O painel do navegador pausa o `requestAnimationFrame` em segundo plano: para testar lutas, avance a simulação com `tick(1/30)` em laço, não com espera em tempo real.
- Números flutuantes (`ui.floaty`) animam por CSS e somem por `setTimeout`; em aba parada não aparecem em captura, o que não é bug.
- O Belzebuzinho só cospe fogo (flag `petFire`, da missão *Cuspe de Fogo*) em criaturas que já estão brigando com o jogador, nunca puxa briga. Dano de `petFireDamage` (nv 3: 5–7 a cada ~3,4 s, uns 7% do dano do jogador): mantenha baixo.
- O farol fica apagado (`populated.anchors.lighthouse.lit`) até a missão *Casamento no Farol* acender o lampião; o `applyState` restaura isso e muda o Suspiro para a ilha depois do casamento.

**Controles** (de MMO clássico)
- Eventos de mouse, não pointer events, para detectar os dois botões juntos. `e.code` para as teclas. Um limiar de arrasto de 5 px separa clique de arrasto.
- Sem pointer lock por padrão, porque o Chrome mostra um aviso a cada lock. O cursor some por CSS durante o arrasto.

**Áudio**
- O `AudioContext` pode nascer `suspended`. Listeners de `pointerdown`/`keydown` chamam `resume()`.
- Envelopes exponenciais nunca rampam até 0 (use 0.0001).
- A mixagem foi medida renderizando num `OfflineAudioContext` (RMS e pico). A música estava 12 dB abaixo dos efeitos, daí o ganho ×1.25 no bus de música.

## Git

Repositório pessoal. A identidade e a chave SSH estão configuradas só neste repositório (`git config --local`). Não altere a configuração global do git.
