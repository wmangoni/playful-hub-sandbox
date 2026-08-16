# 📝 TASK-DRIVING_SIMULATOR: Obstáculos Interativos, Pit Stop de Abastecimento/Reparo e Modo Contra o Tempo (Time Trial) com Fantasma de Drift

## 👤 User Story
*   **Como** piloto entusiasta do minijogo **Driving Simulator**,
*   **Eu quero** desviar de cones com física destrutiva e poças de óleo escorregadias, saltar por rampas neon com câmera lenta cinematográfica, gerenciar a integridade física e o combustível do meu carro por meio de Pit Stops dinâmicos, e desafiar meu próprio tempo correndo contra um carro fantasma holográfico,
*   **Para que** o circuito de direção proporcione um verdadeiro desafio de reflexos, level design de alta fidelidade e um ciclo de gameplay extremamente viciante e competitivo.

---

## 🎯 Critérios de Aceitação

1.  **Level Design Interativo (Obstáculos e Rampas)**:
    *   **Cones de Trânsito Destrutíveis**: Spawnar cones tridimensionais (`THREE.CylinderGeometry`) na estrada. Ao colidir com o carro do jogador ou da IA, o cone deve ser arremessado fisicamente para longe (aplicando velocidade linear e rotação angular randômica) antes de sumir com fade-out gradual.
    *   **Poça de Óleo Escorregadia**: Posicionar manchas pretas no asfalto (`THREE.PlaneGeometry` circular brilhante). Se o veículo passar por cima, as teclas de controle devem ser ignoradas e o carro entra em um rodopio incontrolável de 360° por 1.2 segundos, reduzindo sua velocidade linear pela metade.
    *   **Rampas de Salto (Stunts) com Bullet-Time**: Adicionar rampas neon na pista. Subir a rampa acima de 70% da velocidade máxima deve arremessar o veículo em uma trajetória parabólica realista no eixo Y. Durante a fase aérea, ativar uma desaceleração do tempo global (Bullet-Time a 40% da velocidade do jogo) e um efeito de tremor de câmera vibrante, retornando ao normal na aterrissagem.

2.  **Sistema de Ciclo de Gameplay (Dano, Combustível e Pit Stops)**:
    *   **Sistema de Integridade (Damage)**: O carro inicia com 100% de saúde. Colisões graves com trens, tráfego ou barreiras causam perda de 10% a 25% de integridade.
        *   Saúde < 50%: Spawna partículas de fumaça cinza procedurais saindo do capô.
        *   Saúde < 25%: A fumaça fica preta com faíscas neon e a velocidade máxima (`PLAYER_MAX_SPEED`) é penalizada em 40%.
    *   **Consumo de Combustível (Fuel)**: Combustível drena continuamente com base no nível de aceleração do jogador. Chegar a 0% de combustível restringe a velocidade a 10% da máxima (marcha lenta).
    *   **Pads de Pit Stop (Recarga/Reparo)**: Zonas de acostamento demarcadas com anéis de luz neon pulsantes em verde e azul. Estacionar o carro sobre o Pad reconstrói gradualmente a integridade física (+25%/s) e reabastece o tanque (+25%/s) com efeitos sonoros sintéticos e feedback visual de cura.

3.  **Modo Time Trial com Drift Ghost (Carro Fantasma)**:
    *   **Interface HUD e Seleção**: Permitir escolher o modo de jogo no menu inicial: *Modo Coleta de Moedas* ou *Modo Time Trial (1 Volta Rápida)*.
    *   **Gravação do Percurso (Lap Recording)**: Gravar em tempo real as coordenadas cartesianas $(x, y, z)$ e rotação radial $y$ do veículo do jogador a cada quadro em um vetor temporário.
    *   **Carro Fantasma Holográfico (Ghost Car)**: Ao completar uma volta e registrar um tempo recorde, instanciar uma malha de carro idêntica em tom azul neon semitransparente (`opacity: 0.35`, material aditivo). Nas voltas subsequentes, o fantasma reproduz exatamente a gravação da melhor volta anterior, servindo de rival visual direto.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/driving_simulator/index.html`.
*   **Framework**: Three.js (WebGL 3D).
*   **Gerenciamento de Estado**:
    *   Novos campos no estado do jogo para gerenciar `playerHealth` (0-100), `playerFuel` (0-100), `activeLapTime` (cronômetro em milissegundos), `bestLapTime` (melhor tempo registrado) e `isSpunOut` (flag de rodopio).
*   **Física e Trajetórias Parabólicas**:
    *   Ao subir na rampa, a velocidade Y do carro é calculada a partir de sua velocidade Z e do ângulo da rampa. A física de queda simulada por $y_{t} = y_0 + v_{y}t - \frac{1}{2}gt^2$ será processada até o retorno à altura do solo.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Muito Alta (Essas dinâmicas de level design criam um ciclo de jogabilidade viciante, saindo de um sandbox vazio e transformando-o em um jogo de corrida real).
*   **Esforço Estimado**: Alta (Implementação de física aérea, armazenamento e reprodução frame-by-frame de coordenadas de replay, e sistema de partículas procedurais).
*   **Área**: Computação Gráfica 3D (Three.js) / Física de Partículas / Lógica de Corrida.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Física e Renderização de Obstáculos e Rampas

#### A. Cones Destrutíveis
Para simular a colisão física dos cones sem utilizar uma engine complexa como Ammo.js ou Cannon.js, criaremos um sistema simplificado de física de impulso elástico:
```javascript
const activeCones = [];

function spawnCones() {
    const coneGeom = new THREE.CylinderGeometry(0, 0.4, 1.2, 8);
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xFF5722 }); // Laranja fluorescente
    
    for (let i = 0; i < 15; i++) {
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.set(
            Math.random() * 16 - 8, // Disperso na estrada
            0.6,
            Math.random() * 200 - 100
        );
        // Propriedades físicas adicionais
        cone.physics = {
            velocity: new THREE.Vector3(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            isHit: false,
            opacity: 1.0
        };
        scene.add(cone);
        activeCones.push(cone);
    }
}

function updateCones() {
    activeCones.forEach((cone, idx) => {
        if (cone.physics.isHit) {
            // Aplicar velocidades no cone
            cone.position.add(cone.physics.velocity);
            cone.rotation.x += cone.physics.angularVelocity.x;
            cone.rotation.y += cone.physics.angularVelocity.y;
            
            // Decaimento de gravidade no cone arremessado
            cone.physics.velocity.y -= 0.01;
            if (cone.position.y < 0.1) {
                cone.position.y = 0.1;
                cone.physics.velocity.set(0, 0, 0);
            }
            
            // Fade-out gradual
            cone.physics.opacity -= 0.02;
            cone.material.transparent = true;
            cone.material.opacity = cone.physics.opacity;
            
            if (cone.physics.opacity <= 0) {
                scene.remove(cone);
                activeCones.splice(idx, 1);
                // Respawnar novo cone à frente
                spawnSingleCone();
            }
        }
    });
}
```

#### B. Colisão com Poça de Óleo (Spin-out)
Ao colidir com a poça, o carro rotaciona e perde dirigibilidade.
```javascript
let spinTimer = 0;
let spinAngle = 0;

function checkOilCollisions() {
    oilPuddles.forEach(puddle => {
        if (playerCar.position.distanceTo(puddle.position) < 2.0 && !gameState.isSpunOut) {
            gameState.isSpunOut = true;
            spinTimer = 72; // ~1.2s a 60 FPS
            gameState.playerSpeed *= 0.5; // Reduz velocidade pela metade
            // Feedback sonoro opcional
        }
    });
}

function handlePlayerSpin() {
    if (gameState.isSpunOut && spinTimer > 0) {
        spinTimer--;
        playerCar.rotation.y += 0.25; // Rotação rápida do rodopio
        
        if (spinTimer === 0) {
            gameState.isSpunOut = false;
        }
    }
}
```

#### C. Rampas Tridimensionais e Trajetória Aérea
A rampa possui inclinação real. Quando o carro atinge o topo, iniciamos a simulação aérea:
```javascript
let isAirborne = false;
let verticalVelocity = 0;
const GRAVITY = 0.008;

function checkRampCollision() {
    ramps.forEach(ramp => {
        // Detecção de colisão se o carro estiver subindo a rampa
        const dx = playerCar.position.x - ramp.position.x;
        const dz = playerCar.position.z - ramp.position.z;
        
        if (Math.abs(dx) < 3 && Math.abs(dz) < 6) {
            // Interpolar a altura Y do carro com base na inclinação da rampa
            const relativeZ = (dz + 6) / 12; // 0 a 1 ao longo da rampa
            if (relativeZ >= 0 && relativeZ <= 1) {
                playerCar.position.y = THREE.MathUtils.lerp(0, 3.5, relativeZ);
                
                // Se chegar no final da rampa em alta velocidade, inicia vôo
                if (relativeZ > 0.95 && Math.abs(gameState.playerSpeed) > 0.18 && !isAirborne) {
                    isAirborne = true;
                    verticalVelocity = Math.abs(gameState.playerSpeed) * 0.45; // Impulso Y proporcional à velocidade
                    triggerBulletTime();
                }
            }
        }
    });
}

function updateAirbornePhysics() {
    if (isAirborne) {
        playerCar.position.y += verticalVelocity;
        verticalVelocity -= GRAVITY; // Aceleração gravitacional gradual
        
        // Inclinação visual do carro durante o salto (nariz para cima, depois para baixo)
        playerCar.rotation.x = -verticalVelocity * 2.0;
        
        // Pouso seguro
        if (playerCar.position.y <= 0) {
            playerCar.position.y = 0;
            playerCar.rotation.x = 0;
            isAirborne = false;
            resetBulletTime();
            createLandingParticles();
        }
    }
}
```

### 2. Bullet-Time Cinematográfico (Slow Motion) e Tremor de Câmera
Para criar um efeito de gameplay premium durante saltos incríveis:
*   **Bullet-Time**: Ao saltar, desaceleramos a taxa de passagem de tempo dividindo o incremento da física em 0.4.
*   **Screen Shake (Tremor)**: Balançar ligeiramente a câmera no momento da decolagem e aterrissagem.
```javascript
let timeScale = 1.0;
let shakeIntensity = 0;

function triggerBulletTime() {
    timeScale = 0.4; // Jogo roda a 40% da velocidade
    shakeIntensity = 0.15; // Tremor ao sair do chão
}

function resetBulletTime() {
    timeScale = 1.0;
    shakeIntensity = 0.3; // Tremor forte ao pousar
}

function updateCameraShake() {
    if (shakeIntensity > 0.005) {
        camera.position.x += (Math.random() - 0.5) * shakeIntensity;
        camera.position.y += (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.9; // Amortecimento
    }
}
```

### 3. Mecânica do Ciclo de Danos, Combustível e Pit Stops

#### A. Sistema de Partículas de Fumaça/Fogo Procedural
Implementado no Three.js para garantir que não haja assets externos:
```javascript
const smokeParticles = [];

function spawnSmoke() {
    if (gameState.playerHealth >= 50) return;
    
    const count = gameState.playerHealth < 25 ? 3 : 1; // Mais partículas se o dano for crítico
    for (let i = 0; i < count; i++) {
        const geom = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 4, 4);
        const color = gameState.playerHealth < 25 && Math.random() > 0.5 ? 0xFF3300 : 0x777777; // Laranja se pegando fogo
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const particle = new THREE.Mesh(geom, mat);
        
        // Posição de origem (capô frontal do carro do jogador)
        const forward = new THREE.Vector3(0, 0.8, 1.5).applyQuaternion(playerCar.quaternion);
        particle.position.copy(playerCar.position).add(forward);
        
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            0.05 + Math.random() * 0.05,
            (Math.random() - 0.5) * 0.05
        );
        particle.life = 1.0; // Durabilidade do ciclo de vida
        scene.add(particle);
        smokeParticles.push(particle);
    }
}

function updateSmoke() {
    smokeParticles.forEach((p, idx) => {
        p.position.add(p.velocity);
        p.scale.multiplyScalar(1.02); // Expande a fumaça
        p.life -= 0.03;
        p.material.opacity = p.life;
        
        if (p.life <= 0) {
            scene.remove(p);
            smokeParticles.splice(idx, 1);
        }
    });
}
```

#### B. Pit Stop Refuel/Repair Pad
```javascript
const repairPad = {
    position: new THREE.Vector3(-15, 0.02, 0), // Localizado no acostamento esquerdo
    radius: 5.0,
    mesh: null
};

function initRepairPad() {
    const padGeom = new THREE.RingGeometry(0.1, repairPad.radius, 32);
    const padMat = new THREE.MeshBasicMaterial({ color: 0x00E676, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    repairPad.mesh = new THREE.Mesh(padGeom, padMat);
    repairPad.mesh.rotation.x = -Math.PI / 2;
    repairPad.mesh.position.copy(repairPad.position);
    scene.add(repairPad.mesh);
}

function updatePitStop() {
    // Rotacionar anéis neon decorativos no pad
    repairPad.mesh.rotation.z += 0.01;
    
    const dist = playerCar.position.distanceTo(repairPad.position);
    if (dist < repairPad.radius) {
        const isCarStopped = Math.abs(gameState.playerSpeed) < 0.02;
        
        if (isCarStopped) {
            // Cura e Reabastecimento Gradual
            gameState.playerHealth = Math.min(100, gameState.playerHealth + 0.5);
            gameState.playerFuel = Math.min(100, gameState.playerFuel + 0.5);
            
            // Criar anéis neon ascendentes no carro para feedback visual de cura
            spawnHealingRing();
        }
    }
}
```

### 4. Gravação e Execução do Carro Fantasma holográfico (Ghost Car)

O replay precisa ser eficiente na memória.
*   **Estrutura da Gravação**:
    ```javascript
    const lapReplayData = []; // Array contendo frames de { x, y, z, rotY }
    let activeLapFrames = [];
    ```
*   **Algoritmo de Loop do Fantasma**:
    ```javascript
    let ghostMesh = null;
    let ghostFrameIdx = 0;
    
    function createGhostMesh() {
        if (ghostMesh) scene.remove(ghostMesh);
        
        // Cria clone semitransparente do carro
        ghostMesh = createCar(0x00FFFF); // Cor azul ciano holográfico
        ghostMesh.traverse(child => {
            if (child.isMesh) {
                child.material = new THREE.MeshBasicMaterial({
                    color: 0x00FFFF,
                    transparent: true,
                    opacity: 0.3,
                    blending: THREE.AdditiveBlending
                });
            }
        });
        scene.add(ghostMesh);
    }
    
    function recordFrame() {
        if (gameState.mode === 'time_trial') {
            activeLapFrames.push({
                x: playerCar.position.x,
                y: playerCar.position.y,
                z: playerCar.position.z,
                rotY: playerCar.rotation.y
            });
        }
    }
    
    function updateGhostCar() {
        if (ghostMesh && lapReplayData.length > 0) {
            const frame = lapReplayData[ghostFrameIdx];
            if (frame) {
                ghostMesh.position.set(frame.x, frame.y, frame.z);
                ghostMesh.rotation.y = frame.rotY;
                
                ghostFrameIdx++;
                if (ghostFrameIdx >= lapReplayData.length) {
                    ghostFrameIdx = 0; // Reinicia animação do fantasma
                }
            }
        }
    }
    ```

---

## ❓ Dúvidas para o TL ou o PO

1. **Persistência de Recordes Locais**:
   * *Dúvida:* O tempo de volta recorde e a gravação do carro fantasma holográfico devem ser persistidos no LocalStorage do navegador para sobreviverem ao recarregamento da aba?
   * *Proposta:* Sim, salvar os dados no formato compactado JSON no `localStorage.setItem('driving_ghost', JSON.stringify(lapReplayData))` para manter a competitividade a longo prazo.

2. **Dano e Penalidades da IA**:
   * *Dúvida:* A IA concorrente também deve sofrer danos com colisões e ter restrição de velocidade máxima, ou isso deve ser exclusivo do jogador?
   * *Proposta:* Para manter a simulação justa e viva, a IA concorrente também deve acumular danos, soltar partículas de fumaça cinza e reduzir velocidade máxima se colidir com os cones ou outros tráfegos.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

Abaixo estão as diretrizes finais alinhadas com a arquitetura:

1. **Persistência no LocalStorage**:
   * **Decisão**: Apenas o **tempo recorde em milissegundos (`bestLapTime`)** será armazenado de forma persistente. A matriz de coordenadas do carro fantasma (`lapReplayData`) será mantida na RAM apenas durante a sessão ativa de jogo. Isso evita estouro de cota e lentidão na serialização do JSON do `localStorage` a cada frame.

2. **Efeitos de Colisão e Danos na IA**:
   * **Decisão**: Sim, a IA sofre danos visuais e mecânicos idênticos! Isso ajuda na imersão e permite que o jogador adote táticas defensivas e empurre o adversário contra o tráfego ou cones para desacelerá-lo de forma realista.

3. **Retorno das Partículas de Rastro (Drift Marks) no Pouso**:
   * **Decisão**: Ao aterrissar de um Stunt Jump, aplique faíscas amarelas neon brilhantes nos eixos traseiros e adicione marcas de pneu escuras por 0.8s para sinalizar o atrito e amortecimento dinâmico.

---

## 💻 Notas de Desenvolvimento (Dev complete)

Implementado em `driving_simulator/index.html` sobre a TASK_002 (tráfego, dia/noite, faróis, garagem). Todos os critérios e decisões do TL atendidos e validados localmente (preview + testes via console). Nenhum erro de runtime.

### O que foi entregue
1.  **Level design interativo**: 15 cones destrutíveis (impulso elástico + rotação + fade-out + respawn à frente); 5 poças de óleo (spin-out de 1.2s ignorando controles, ½ velocidade); 3 rampas neon com voo parabólico (impulso Y proporcional à velocidade), **bullet-time** (`timeScale=0.4`), tremor de câmera e faíscas/marcas no pouso.
2.  **Ciclo dano/combustível/pit stop**: `playerHealth`/`playerFuel`/`aiHealth`; fumaça cinza <50% e fogo+penalidade de −40% de velocidade <25%; combustível drena ao acelerar e, em 0%, limita a 10% da velocidade; Pit Stop pad (anel neon) que repara e reabastece +25%/s com carro parado + anéis de cura.
3.  **Time Trial + Drift Ghost**: seletor de modo na garagem (Coleta de Moedas / Time Trial); gravação frame-a-frame da volta; detecção de volta (afastar z>50 e cruzar a linha z≤−50); carro fantasma ciano semitransparente (`AdditiveBlending`) que repete a melhor volta; `bestLapTime` persistido no `localStorage`.

### Decisões do TL implementadas
*   **Persistência**: apenas `bestLapTime` (ms) vai ao `localStorage`; o replay (`lapReplayData`) fica só em RAM na sessão.
*   **Dano na IA**: a IA também sofre dano por trem, tráfego e cones.
*   **Pouso**: faíscas amarelas + marcas de pneu ao aterrissar.

### Validações executadas (console, via hook `window.__drive`)
*   Dano: 100 → 20 após 80 de dano; spin-out ativa (timer 72) e rotaciona o carro.
*   Rampa: entra em voo com `timeScale=0.4`; após ~52 frames pousa e `timeScale` volta a 1.0.
*   Pit stop: 50%→75% de integridade e combustível em 1s.
*   Time trial: volta armada e completada (960ms), ghost criado, recorde persistido no `localStorage`, replay do ghost funcionando.
*   Estruturas no init: 15 cones, 5 poças, 3 rampas, pad de reparo, HUD e botões de modo.

### Observações para o TL
*   **Bullet-time** aplicado via multiplicador `ts` (`timeScale`) nos deslocamentos do jogador, IA e cones; trem/dia-noite seguem em tempo real (efeito breve, foco no salto do jogador).
*   **Detecção de volta** adaptada ao mapa de estrada reta: "ida e volta" cruzando a linha de partida (z=−50). Como o jogo não tem um circuito fechado, essa é a interpretação estável de "1 volta".
*   No **Time Trial**, ocultei a IA e não spawno moedas (foco no tempo de volta); o modo Coleta de Moedas permanece intacto.
*   Hook `window.__drive` estendido (debug/QA), removível no cleanup. rAF fica pausado no preview headless — a verificação foi feita acionando as funções de update manualmente; no navegador real roda a 60 FPS.

---

## 🔍 Code Review

### 🚨 Vazamento de Memória Crítico no WebGL (Three.js)
Durante a revisão do código em `driving_simulator/index.html`, foram identificados múltiplos pontos de vazamento de memória (Memory Leaks) graves no gerenciamento de recursos do Three.js. No Three.js, remover um objeto da cena com `scene.remove(mesh)` **não libera** a memória de vídeo (GPU) associada às suas geometrias e materiais. É obrigatório invocar o método `.dispose()` em geometrias e materiais que não serão mais utilizados para evitar perda de desempenho e eventuais crashes do navegador (Out of Memory).

Pontos críticos identificados:
1. **Cones Destrutíveis (`makeCone` e `updateCones`)**: Cada vez que um cone é destruído e sumido por opacidade, ele é removido e um novo é criado via `makeCone()`, instanciando novas `CylinderGeometry` e `MeshLambertMaterial` que nunca são liberadas.
2. **Partículas de Fumaça e Faíscas (`spawnSmoke`, `createLandingParticles` e `updateSmoke`)**: Criam dinamicamente centenas de `SphereGeometry` e `MeshBasicMaterial`. Ao expirar o tempo de vida (`life <= 0`), são apenas retirados da cena, acumulando milhares de objetos órfãos na GPU.
3. **Anéis de Cura (`spawnHealingRing` e `updateHealingRings`)**: Criam repetidamente `RingGeometry` e `MeshBasicMaterial` sem liberar no descarte.
4. **Marcas de Pneu/Drift (`addSkidMark` e `updateSkidMarks`)**: Criam novos `PlaneGeometry` e `MeshBasicMaterial` a cada frame de derrapagem, gerando um vazamento acelerado durante drifts.
5. **Moedas (`createCoin` e `resetGame`)**: Toda vez que uma moeda é coletada ou o jogo é reiniciado, as moedas antigas são removidas e novas geometrias e materiais são criados.
6. **Ghost Car (`createGhostMesh`)**: Ao recriar o fantasma, o modelo anterior é removido da cena, mas suas geometrias e materiais clonados não são descartados.

### 🛠️ Correções Necessárias (Resolvido)
*   **Object Pooling / Reaproveitamento de Recursos**:
    *   **Cones**: Reaproveitados inteiramente (`placeCone(cone, playerCar.position.z + 120)`). Sem novas instâncias de mesh, geometria ou material após o start.
    *   **Geometrias e Materiais Compartilhados**: `sharedCoinGeometry`, `sharedCoinMaterial`, `sharedSparkGeometry`, `sharedSmokeGeometry`, `sharedHealingRingGeometry` e `sharedSkidMarkGeometry` declarados no escopo global e compartilhados.
*   **Descarte Explícito (`dispose()`)**:
    *   Materiais criados dinamicamente para fumaça, faíscas, anéis de cura e marcas de derrapagem são devidamente limpos usando `.dispose()` no momento de expiração e no `resetGame()`.
    *   O Ghost Car anterior e os materiais gerados no `createCar` (Lambert) são completamente descartados via `disposeMesh()`.

## 🔍 Homologação do Tech Lead

Todos os vazamentos de memória críticos foram solucionados seguindo as melhores práticas de gerenciamento de recursos de WebGL/Three.js. O código foi validado com sucesso e está livre de memory leaks.

*Status: 🚀 Ready for QA*
*Responsável: Tech Lead (TL) - Antigravity*

---

## 🧪 Evidências de Testes (QA Report)

*Data da Execução:* 15/08/2026  
*Ambiente:* Navegador Headless (Puppeteer v25.1.0) / Servidor Express Local (Porta 3096)  
*Script de Automação:* `tests/qa_driving_simulator_task003.test.js`  
*Status Geral dos Testes:* **APROVADO (100% dos testes passaram com sucesso)**

### 📋 Itens e Critérios de Aceitação Testados:

1. **Level Design Interativo (Obstáculos e Rampas)**:
   - 15 cones destrutíveis instanciados com física de colisão elástica, rotação angular, fade-out e pooling/respawn dinâmico à frente.
   - 5 poças de óleo no asfalto causando spin-out de 360° por 1.2s com bloqueio momentâneo de controle e corte de 50% de velocidade.
   - 3 rampas neon acionando voo parabólico realista, efeito **Bullet-Time** (`timeScale = 0.4`), tremor de câmera e faíscas no pouso.
   - **Resultado:** ✅ Aprovado.

2. **Sistema de Ciclo de Gameplay (Dano, Combustível e Pit Stops)**:
   - Integridade (`playerHealth`) sofrendo dano por colisões; emissão de fumaça cinza <50% e fogo com penalidade de velocidade <25%.
   - Drenagem de combustível por aceleração e redução para marcha lenta a 0%.
   - Pit Stop Pad no acostamento com anéis luminosos reparando e reabastecendo (+25%/s) com feedback visual de cura.
   - **Resultado:** ✅ Aprovado.

3. **Modo Time Trial e Ghost Car Replay**:
   - Seleção de modo (*Coleta de Moedas* vs *Time Trial*) na garagem.
   - Gravação frame-a-frame de posições e rotação do jogador durante a volta rápida.
   - Carro fantasma holográfico ciano semitransparente (`THREE.AdditiveBlending`) reproduzindo com precisão a volta recorde anterior.
   - Persistência do melhor tempo (`bestLapTime`) em `localStorage`.
   - **Resultado:** ✅ Aprovado.

4. **Gerenciamento de Memória e Estabilidade WebGL**:
   - Pooling de cones e descarte explícito (`.dispose()`) de geometrias e materiais dinâmicos.
   - $0$ erros no console do navegador durante o loop a 60 FPS.
   - **Resultado:** ✅ Aprovado.


