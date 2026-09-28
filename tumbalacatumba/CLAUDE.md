# Tumbalacatumba — guia técnico

RPG de missões em mundo aberto feito com three.js r186. Visual cartoon "Tim Burton terror-engraçado", HUD e controles no estilo World of Warcraft, entregue como **um único HTML** que roda via `file://`. O `README.md` descreve o jogo para quem joga (controles, conteúdo). Este arquivo reúne o necessário para mexer no código sem repetir erros já resolvidos.

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
- `src/world/layout.js` é a fonte única da planta do mapa (zonas, estradas, `NPC_SPOTS`, áreas de missão, `ZONE_LEVELS` e `MOB_SPAWNS`). Mude lá e deixe o resto derivar.

## Mapa do código

- `src/game.js`: orquestra render, loop, título → jogo, presets `QUALITY` (baixa/media/alta), opções, atalhos e resolução adaptativa (`_adapt`).
- `src/render/`: `toon.js` (neblina global, `toonMat`, `MAT.vc`/`MAT.vcDouble`, brilhos `glowMat`/`flameMat` e o registro `GLOW`), `postfx.js` (composer e `LAYER_FX`), `builder.js` e `bake.js` (texturas assadas na GPU).
- `src/world/`: `terrain.js`, `sky.js`, `daynight.js` (keyframes de luz, neblina e gradação por hora), `water.js`, `world.js` (movimento, colisão e água), `colliders.js`, `populate.js` (espalha os props) e `props/` (`batch.js` com o `StaticBatch`, árvores, casas, placas).
- `src/entities/`: jogador, câmera estilo WoW, `rig.js` (animação procedural, com as chaves da Lanternada em `K_ATTACK`), `npc.js` (`NPC`, `Pickup`), modelos de PNJs e criaturas (`mobModels.js` tem as 5 criaturas hostis), vida ambiente.
- `src/combat/`: `combat.js` (atributos do jogador por nível em `playerStats`, golpe, dano, XP, morte e volta à praça), `mob.js` (IA: idle → chase ⇄ attack → return, dead → gone) e `mobTypes.js` (números de cada criatura). Os corvos (`questWorld`) e os sapos (`ambientLife`) nascem lá e o combate os adota como neutros.
- `src/quests/`: `data.js` (as 11 missões e seus textos), `progress.js` (estado e save), `interact.js` (seleção e interação), `questWorld.js` (lógica das missões no mundo).
- `src/ui/`: HUD, janelas, minimapa, retratos 3D, ícones em SVG e canvas. `combatHud.js` cuida das barras de vida, placas das criaturas e tela de morte.
- `src/fx/`: `lights.js` (`Halos` e `LightPool`), `ambience.js`, `effects.js`. Em `src/audio/audio.js` ficam a música e os efeitos em WebAudio.

## Depuração

- URL: `?play` pula o título e começa um jogo novo (`&cont` continua o save). Também aceita `&notut`, `&t=21.5` (hora), `&pos=x,z&yaw=`, `&pitch=`, `&dist=`, `&q=baixa|media|alta` e `&peaceful` (criaturas não atacam).
- `window.__game.debug`: `info()` (posição, hora, FPS, draw calls, triângulos), `setTime(h)`, `tp(x, z)`, `cam(yaw, pitch, dist)`, `frames(n)`, `peace(v)` (modo pacífico).
- `window.__game.combat`: `mobs`, `hp`, `st` (atributos), `peaceful`, `swing()`.
- `window.__game.tick(dt)` renderiza um quadro manualmente. `window.__game.cam.override = { pos, look }` dá uma câmera livre.
- `window.__errors` acumula os erros e avisos do console (`src/main.js`).
- localStorage: `tumbalacatumba-save-v1` (save), `tbl-settings`, `tbl-quality`.

## Como testar

- **e2e**: abrir `Tumbalacatumba.html?play&notut&t=12` via `file://` (sem HMR), esperar `__game.state === 'play'`, injetar `tools/e2e_sync.js` e chamar `__T.run(passo)` na ordem descrita no arquivo. Resultado esperado: todas as missões concluídas, nível 5, o passo `combate` vencendo um marujo e `window.__errors` vazio. Rode contra o HTML final, porque um erro de TDZ já apareceu só no build. O e2e liga o modo pacífico: sem isso, criaturas hostis e os 15% de neutros incomodados atrapalham os teleportes.
- **Aba em segundo plano** (browser-harness): o Chrome pausa o `requestAnimationFrame` e segura `setTimeout`/`setInterval`. Por isso o e2e avança só a simulação (`update(1/30)`), sem render e sem timers, e o carregamento cede com `setTimeout` em vez de rAF. Screenshots funcionam depois de um `tick()` manual.
- FPS só vale com a aba visível. Para simular 1080p, use `Emulation.setDeviceMetricsOverride` e depois `Emulation.clearDeviceMetricsOverride`.
- Ao terminar, apague os saves de teste do localStorage (em `file://` e em `http://127.0.0.1:5178`) e pare o dev server pelo PID ou pela porta. `pkill -f "node .*vite"` já matou o próprio shell.

## Desempenho (GPU alvo: Intel Iris Plus G7)

Referência: 60 FPS a 1592×818 na qualidade média, com ~318 draw calls por quadro.
- Nada de ruído procedural por pixel. Padrões estáticos são assados em textura uma vez (`bake.js`). O terreno usa padrão 2048², ruído 256² e Voronoi 512².
- Geometria estática entra no `StaticBatch`, que mescla por célula de 44 m e por material. Não crie `InstancedMesh` por variante: isso já chegou a 664 malhas e ~550 draw calls.
- `PointLight` só pelo `LightPool` fixo de 4 (manter a quantidade constante evita recompilar shaders). As outras lâmpadas são falsas: halos num único `THREE.Points` e poças de luz assadas no terreno (`terrain.bakeLamps`).
- PNJs somem a mais de 110 m da câmera. Com `renderer.info.autoReset = false`, o `info()` soma todos os passes do composer.
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

**Interface**
- `#overlay` tem `z-index: 1` (contexto de empilhamento) para as placas de nome não passarem por cima das janelas.
- Foco: botões, selects, checkboxes e sliders recebem `blur()` depois do uso, e `_isTyping` (`core/input.js`) só considera campos de texto. Sem isso, o Espaço clica de novo no botão e o WASD para de funcionar.
- Os marcadores `!`/`?` são desenhados em SVG com traços grossos. Com glifo de fonte ficam finos demais.
- Não reaproveite nomes curtos em blocos internos: um `const` que sombreava outra variável causou erro de TDZ só no build minificado.

**Combate**
- O painel do navegador pausa o `requestAnimationFrame` em segundo plano: para testar lutas, avance a simulação com `tick(1/30)` em laço, não com espera em tempo real.
- Números flutuantes (`ui.floaty`) animam por CSS e somem por `setTimeout`; em aba parada não aparecem em captura, o que não é bug.

**Controles** (estilo WoW)
- Eventos de mouse, não pointer events, para detectar os dois botões juntos. `e.code` para as teclas. Um limiar de arrasto de 5 px separa clique de arrasto.
- Sem pointer lock por padrão, porque o Chrome mostra um aviso a cada lock. O cursor some por CSS durante o arrasto.

**Áudio**
- O `AudioContext` pode nascer `suspended`. Listeners de `pointerdown`/`keydown` chamam `resume()`.
- Envelopes exponenciais nunca rampam até 0 (use 0.0001).
- A mixagem foi medida renderizando num `OfflineAudioContext` (RMS e pico). A música estava 12 dB abaixo dos efeitos, daí o ganho ×1.25 no bus de música.

## Git

Repositório pessoal. A identidade e a chave SSH estão configuradas só neste repositório (`git config --local`). Não altere a configuração global do git.
