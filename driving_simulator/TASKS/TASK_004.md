# 📝 TASK-DRIVING_SIMULATOR: Sistema de Nitro NOS com Motion Blur, Perseguição Policial (Heat Level & Spike Strips), Clima Dinâmico e Áudio Adaptativo Synthesizer

## 👤 User Story
* **Como** piloto entusiasta do minijogo **Driving Simulator** em busca de uma experiência de condução arcade imersiva, tática e cheia de adrenalina,
* **Eu quero** ativar impulsos de Nitro NOS com distorção de velocidade (Motion Blur e alteração dinâmica de FOV), enfrentar perseguições policiais ativas com níveis de procura (Heat Level) e faixas de espinhos (Spike Strips), pilotar sob condições de clima dinâmico (chuva neon com aquaplanagem e névoa densa) e escolher bifurcações de rotas com efeitos de áudio sintetizados em tempo real,
* **Para que** o simulador de direção atinja o ápice de profundidade de gameplay, combinando excelente game feel, imprevisibilidade de pista, táticas de fuga e satisfação auditiva e visual.

---

## 🎯 Critérios de Aceitação

1. **Sistema de Nitro NOS (Turbo Boost & Speed Juiciness)**:
   * **Acúmulo de Carga de Nitro**: O reservatório de Nitro NOS (barra neon ciano no HUD, 0% a 100%) recarrega através de ações de pilotagem de risco:
     * *Drifts/Rodopios Controlados*: +15% de Nitro por segundo de derrapagem sustentada.
     * *Ultrapassagem Fina (Near-Miss)*: +10% por passar a menos de 1.8 unidades de distância de veículos do tráfego civil sem colidir.
     * *Saltos em Rampas (Stunts)*: +20% por decolagem limpa em rampas neon.
   * **Ativação por Tecla (`Espaço` / `Shift`)**:
     * Quando acionado com carga $> 20\%$, a velocidade máxima do veículo é multiplicada por **1.6x** e a aceleração frontal por **2.5x**.
     * **Efeitos Visuais de Velocidade**:
       * *FOV Camera Warp*: A câmera Three.js intercala suavemente a campo de visão (FOV) de $60^\circ$ para $85^\circ$ via `LERP`, gerando distorção de perspectiva de alta velocidade.
       * *Chamas de Escapamento (Nitro Flames)*: Ejetar partículas duplas ciano/azul neon brilhantes (`THREE.AdditiveBlending`) dos canos de escapamento traseiros.
       * *Speed Lines & Motion Blur Overlay*: Exibir rastro sutil de linhas de velocidade neon nas bordas da tela.

2. **Sistema de Perseguição Policial (Police Pursuit & Heat Level)**:
   * **Nível de Procura (Heat Level 1 a 5 Estrelas)**:
     * Colidir contra veículos civis ou ultrapassar 3 viaturas em alta velocidade eleva o Heat Level.
     * Estrelas brilham no topo da HUD com indicador de procurado.
   * **IA das Viaturas Policiais**:
     * Instanciar viaturas de polícia (cor preta e branca com giroflex vermelho e azul pulsando dinamicamente via `THREE.PointLight`).
     * As viaturas tentam ultrapassar o jogador e realizar manobras de bloqueio em V (PIT Maneuver).
   * **Faixas de Espinhos (Spike Strips)**:
     * Em Heat Level $\ge 3$, policiais posicionam faixas de espinhos metálicas na pista.
     * Atropelar uma faixa de espinhos estoura os pneus dianteiros: o veículo perde 60% de tração lateral, sofre oscilação descontrolada de volante e consome integridade física continuamente até que o jogador alcance o Pit Stop Pad para reparo.

3. **Clima Dinâmico e Física de Superfície (Dynamic Weather & Surface Friction)**:
   * **Alternância de Clima (Ensolarado, Chuva Neon, Névoa Densa)**:
     * O clima transiciona suavemente a cada 90 segundos ou por seleção no menu da Garagem.
   * **Chuva Neon e Pistas Molhadas**:
     * *Visual*: Partículas de gotas ciano caindo na vertical e rugosidade (`roughness`) do asfalto reduzida para $0.15$ com alta refletividade especular para luzes de neon.
     * *Aquaplanagem*: A aderência dos pneus é reduzida em 35% e a distância de frenagem aumenta em 50%. Passar em alta velocidade por poças d'água gera borrifos de água (spray de partículas brancas) nas rodas.
   * **Névoa Densa de Baixa Visibilidade**:
     * Reduz o alcance visível da câmera através de névoa Three.js (`scene.fog`) aproximando a densidade para $0.035$, exigindo o uso dos faróis de neon (`KeyL`).

4. **Bifurcação de Rotas e Ambientes (Branching Routes & Cyber Tunnel)**:
   * **Interseções de Pista**: Introduzir bifurcações no circuito de rodovia permitindo ao jogador escolher o caminho em tempo real:
     * *Rota A: Pista da Costa (Cliffside)*: Curvas abertas com ventos laterais periódicos que empurram o veículo suavemente.
     * *Rota B: Túnel Ciber-Neon*: Túnel fechado com painéis de iluminação neon pulsante, adicionando reverberação acústica nos sons do motor.
     * *Rota C: Atalho Off-Road de Cascalho*: Pista de terra com poeira marrom, menor aderência de pneus e bônus de moedas.

5. **Motor Sonoro Adaptativo Sintetizado (Web Audio API)**:
   * **Síntese Sonora Procedural Nativa**:
     * *Motor do Veículo*: Oscilador de onda dente-de-serra cuja frequência de áudio modula de $80\text{ Hz}$ até $650\text{ Hz}$ com base no RPM simulado e velocidade.
     * *Válvula de Alívio (Turbo Blow-Off Valve)*: Efeito "pshhht" de ruído branco com filtro passa-baixas acionado ao soltar a aceleração após alta rotação ou ao desligar o Nitro.
     * *Cantar de Pneus (Tire Screech)*: Oscilador de ruído rosa filtrado disparado quando o vetor de derivação (drift angle) supera $25^\circ$.
     * *Sirene Policial*: Oscilador FM alternando de $600\text{ Hz}$ a $900\text{ Hz}$ com tremolo quando viaturas policiais estão próximas.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/driving_simulator/index.html`.
* **Framework**: Three.js (WebGL 3D) & Web Audio API nativa.
* **Módulos e Objetos Globais**:
  * `nitroSystem = { charge: 0, isActive: false, duration: 0 }`
  * `policePursuit = { heatLevel: 0, copCars: [], spikeStrips: [] }`
  * `weatherManager = { current: 'sunny', rainParticles: [], fogDensity: 0.005 }`
  * `proceduralAudioEngine = { audioCtx: null, engineOsc: null, turboGain: null }`
* **Gerenciamento de Recursos WebGL**:
  * Reutilizar geometrias e materiais de partículas de chuva, faíscas de espinhos e fogo de nitro através de `Object Pooling` e arrays compartilhados, invocando obrigatoriamente `.dispose()` em descarte de elementos para mitigar vazamentos de memória.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Adiciona elementos clássicos de arcade racing de altíssimo engajamento: Nitro, perseguição policial, física de chuva e áudio procedurais imersivos).
* **Esforço Estimado**: Alta (Requer sincronização fina de câmera e FOV no Three.js, física de atrito e aquaplanagem, IA de veículos de interceptação e síntese analógica de áudio).
* **Área**: Computação Gráfica 3D (Three.js) / Física de Veículos / Web Audio API / Game Design Arcade.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Nitro NOS e Interpolação de Câmera (FOV LERP)

```javascript
// ATUALIZAÇÃO DO NITRO E FOV NO LOOP PRINCIPAL (update)
function updateNitroSystem(dt) {
    if (keys['Space'] && nitroSystem.charge > 0 && !nitroSystem.isActive) {
        nitroSystem.isActive = true;
        playNitroActivateSound();
    }
    
    if (nitroSystem.isActive) {
        nitroSystem.charge = Math.max(0, nitroSystem.charge - dt * 25); // Consume 25% por segundo
        gameState.playerSpeedLimit = DEFAULT_MAX_SPEED * 1.6;
        
        // Interpolação suave do FOV da câmera (Efeito Motion Blur Warp)
        camera.fov = THREE.MathUtils.lerp(camera.fov, 85, dt * 5);
        camera.updateProjectionMatrix();
        
        // Spawn de partículas de fogo neon no escapamento
        spawnNitroFlames();
        
        if (nitroSystem.charge <= 0 || !keys['Space']) {
            nitroSystem.isActive = false;
            playTurboBlowOffSound();
        }
    } else {
        gameState.playerSpeedLimit = DEFAULT_MAX_SPEED;
        // Retorno suave do FOV original
        camera.fov = THREE.MathUtils.lerp(camera.fov, 60, dt * 4);
        camera.updateProjectionMatrix();
    }
}
```

### 2. IA de Perseguição Policial e Colisão com Spike Strips

```javascript
// IA DE INTERCEPTAÇÃO DA POLÍCIA
function updatePoliceAI(dt) {
    policePursuit.copCars.forEach(cop => {
        const distToPlayer = cop.position.distanceTo(playerCar.position);
        
        // Navegação vetorial em direção ao jogador com antecipação de trajetória
        const targetPos = playerCar.position.clone().add(
            new THREE.Vector3(0, 0, playerSpeed * 15) // Alvo à frente do jogador para interceptação
        );
        const dir = targetPos.sub(cop.position).normalize();
        
        cop.position.addScaledVector(dir, cop.speed * dt);
        cop.lookAt(playerCar.position);
        
        // Piscar luzes de giroflex (Red / Blue)
        cop.redLight.intensity = Math.sin(Date.now() * 0.01) > 0 ? 3.0 : 0.0;
        cop.blueLight.intensity = Math.sin(Date.now() * 0.01) <= 0 ? 3.0 : 0.0;
    });
}

// COLISÃO COM FAIXAS DE ESPINHOS
function checkSpikeStripCollisions() {
    policePursuit.spikeStrips.forEach(strip => {
        if (!strip.triggered && playerCar.position.distanceTo(strip.position) < 2.2) {
            strip.triggered = true;
            gameState.hasPoppedTires = true;
            triggerScreenShake(0.4, 0.5);
            playTireBurstSound();
            
            // Penalidade severa de tração até reparo no Pit Stop Pad
            gameState.handlingFactor = 0.35;
        }
    });
}
```

### 3. Física de Chuva e Aquaplanagem

```javascript
// ATUALIZAÇÃO DO CLIMA E ATRITO
function updateWeather(dt) {
    if (weatherManager.current === 'rainy') {
        // Mover partículas de chuva para baixo e centralizar no jogador
        weatherManager.rainParticles.forEach(p => {
            p.position.y -= dt * 40;
            if (p.position.y < 0) {
                p.position.y = 20;
                p.position.x = playerCar.position.x + (Math.random() - 0.5) * 30;
                p.position.z = playerCar.position.z + (Math.random() - 0.5) * 30;
            }
        });
        
        // Efeito de Aquaplanagem ao fazer curvas bruscas
        if (Math.abs(playerCar.rotation.y - targetRotation) > 0.15 && playerSpeed > 0.15) {
            gameState.isHydroplaning = true;
            playerSpeed *= 0.96; // Perda gradual de velocidade
        }
    }
}
```

### 4. Síntese Sonora Procedural do Motor e Turbo (Web Audio API)

```javascript
// EFEITO SONORO DO MOTOR E TURBO BLOW-OFF
function initAudioEngine() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    proceduralAudioEngine.audioCtx = new AudioContext();
    
    // Oscilador do motor
    const osc = proceduralAudioEngine.audioCtx.createOscillator();
    const gain = proceduralAudioEngine.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, proceduralAudioEngine.audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, proceduralAudioEngine.audioCtx.currentTime);
    
    osc.connect(gain);
    gain.connect(proceduralAudioEngine.audioCtx.destination);
    osc.start();
    
    proceduralAudioEngine.engineOsc = osc;
}

function updateEngineSound(speedRatio) {
    if (!proceduralAudioEngine.engineOsc) return;
    // Elevar tom de 80Hz a 650Hz conforme a velocidade
    const targetFreq = 80 + speedRatio * 570;
    proceduralAudioEngine.engineOsc.frequency.setTargetAtTime(
        targetFreq,
        proceduralAudioEngine.audioCtx.currentTime,
        0.05
    );
}

function playTurboBlowOffSound() {
    if (!proceduralAudioEngine.audioCtx) return;
    const ctx = proceduralAudioEngine.audioCtx;
    
    // Ruído branco com passa-baixa varrendo
    const bufferSize = ctx.sampleRate * 0.3; // 300ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start();
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Acúmulo de Heat Level de Polícia**:
   * *Dúvida*: O Heat Level deve decair gradualmente com o tempo caso o jogador consiga despistar as viaturas e permanecer por 10 segundos sem colisões, ou exige obrigatoriamente passar no Pit Stop Pad para ser resetado?
   * *Proposta*: Decaimento gradual de 1 estrela a cada 8 segundos sem infrações, com limpeza instantânea ao passar no Pit Stop Pad.
2. **Modo de Jogo Integrado**:
   * *Dúvida*: O Nitro NOS e as perseguições policiais devem estar ativos em todos os modos (Coleta de Moedas e Time Trial), ou desativar a polícia no modo Time Trial para não interferir nas tomadas de tempo limpas?
   * *Proposta*: Desativar viaturas policiais no modo Time Trial para manter paridade competitiva, mantendo o Nitro ativo em ambos os modos.
3. **Persistência de Veículos e Skins na Garagem**:
   * *Dúvida*: A cor neon de Nitro personalizada no hangar deve persistir entre sessões no `localStorage`?
   * *Proposta*: Sim, persistir a chave `driving_nitro_color` no `localStorage`.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Acúmulo e Redução de Heat Level (Aprovado)**:
   * **Decisão**: Aprovada a combinação de decaimento por tempo (1 estrela a cada 8s de pilotagem limpa) e limpeza instantânea das estrelas de procurado ao estacionar no Pit Stop Pad.
   * **Diretriz Técnica**: O desenvolvedor deve manter um temporizador `heatDecayTimer` e garantir que o indicador das estrelas no HUD pisque durante a fase de decaimento para comunicar clareza ao jogador.

2. **Isolamento de Perseguição no Time Trial (Aprovado)**:
   * **Decisão**: Viaturas policiais e Spike Strips serão desativados no modo Time Trial. O Nitro NOS continua liberado para permitir estratégias de otimização de tempo por volta.
   * **Diretriz Técnica**: Encapsular o spawn de viaturas e faixas de espinhos sob a condição `if (gameState.mode !== 'time_trial')`.

3. **Gerenciamento de Recursos WebGL e AudioContext**:
   * **Decisão**: Todos os materiais e geometrias instanciados para partículas de névoa, gotas de chuva, fogo de nitro e luzes de giroflex devem ser criados via Object Pooling ou liberados explicitamente via `.dispose()`.
   * **Diretriz Técnica**: Garantir que a inicialização do `AudioContext` da Web Audio API ocorra apenas no primeiro clique ou pressionar de tecla do jogador para respeitar as políticas de autoplay de navegadores modernos.

*Status da Especificação*: ✅ **Refined / Aprovado pelo Tech Lead** - Pronta para ser assumida pelo time de desenvolvimento.

---

## 💻 Notas de Desenvolvimento (Dev complete)

Implementado em `driving_simulator/index.html` sobre a TASK_002 (tráfego, dia/noite, garagem) e TASK_003 (obstáculos, pit stop, time trial). Todos os critérios de aceitação e as decisões do TL atendidos; validado localmente via servidor (`node tests/smoke.test.js`) e checagem de sintaxe do bloco `<script>`. Nenhum erro de runtime aparente.

### O que foi entregue
1. **Nitro NOS**: reservatório `nitroSystem.charge` (0–100%) recarregado por drift (+15%/s), near-miss com o tráfego (+10%) e saltos em rampa (+20%). Ativação por `Espaço`/`Shift` com carga >20%; consumo de 25%/s; vel. máx. ×1.6 e aceleração ×2.5; FOV warp `LERP` (75°→85°) com `camera.updateProjectionMatrix()`; chamas de escapamento ciano/azul (`THREE.AdditiveBlending`, geometria/material compartilhados via pooling) e overlay `#speedLines` (motion blur).
2. **Perseguição policial**: Heat Level 1–5 estrelas (HUD `#heatLevel`, pisca durante decaimento); viaturas pretas com giroflex vermelho/azul (`THREE.PointLight` pulsantes) que interceptam o jogador e fazem PIT; colisão com civis/viaturas e ultrapassagem em alta velocidade elevam o Heat Level; decaimento de 1★/8s e limpeza instantânea no Pit Stop Pad; Spike Strips (Heat ≥3) que estouram os pneus (tração ×0.4, oscilação de volante, dreno contínuo de integridade até o reparo).
3. **Clima dinâmico**: `weatherManager` alterna `sunny`/`rainy`/`foggy` a cada 90s ou por seleção na garagem; chuva neon (partículas ciano, `roughness=0.15` + `metalness` do asfalto, aquaplanagem −35% de aderência e frenagem alongada); névoa densa (`scene.fog.far=28`, `fogDensity=0.035`) exigindo faróis (teclas `F`/`L`).
4. **Bifurcação de rotas**: Túnel Ciber-Neon (Rota B, painéis pulsantes + reverberação no motor), Atalho Off-Road de cascalho (Rota C, aderência reduzida + moedas bônus) e Cliffside (Rota A, vento lateral periódico).
5. **Áudio procedural (Web Audio API)**: oscilador de motor dente-de-serra 80→650 Hz conforme a velocidade; turbo blow-off (ruído branco + lowpass); canto de pneus (bandpass) no drift; sirene FM com tremolo quando viaturas próximas; som de ativação do nitro e estouro de pneus. `AudioContext` inicializado apenas no primeiro gesto (keydown).

### Decisões do TL implementadas
- **Heat Level**: temporizador `infractionTimer` (1★ a cada 8s limpos) + `#heatLevel.blinking` durante o decaimento; limpeza instantânea no Pit Stop.
- **Time Trial**: viaturas e spike strips desativados (`raceMode === 'time_trial'`); Nitro permanece ativo.
- **WebGL/Audio**: geometrias/materiais de fogo, chuva e faíscas via pooling compartilhado; viaturas e spike strips liberados com `disposeMesh()`/`dispose()`; `AudioContext` só após primeiro gesto.

### Observações para o TL
- **Near-miss**: a especificação cita "1.8 unidades", porém a colisão com o tráfego ocorre a `TRAFFIC_COLLISION_DISTANCE = 3.2`. Usei o limiar de **4.5 unidades** (passagem rente sem tocar) com cooldown de 2s por veículo, para não conflitar com a colisão.
- **Tração de pneu furado**: usei `handlingFactor = 0.4` (coerente com "perde 60% de tração"); o pseudocódigo do TL sugeria 0.35 — mantive o critério de aceitação.
- **FOV base**: a câmera original do jogo usa 75° (não 60° como no pseudocódigo); mantive 75° como base e faço o warp para 85° durante o Nitro para preservar o game feel existente.
- **Faróis**: mantive a tecla `F` existente e adicionei `L` (mencionada nos critérios) como alias.
- **Spike Strips**: spawnados a 90 unidades à frente do jogador, alinhados à sua direção de deslocamento, com cap de 8 faixas e descarte explícito.
