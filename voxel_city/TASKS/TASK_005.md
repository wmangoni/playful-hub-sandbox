# 📝 TASK-VOXEL_CITY-005: Pilotagem de Helicóptero Voxel, Caminhão Guincho Magnético, Purga de Nitro & Vácuo Aerodinâmico (Slipstream) e Modo Desastre Urbano (Incêndios & Terremoto)

## 👤 User Story
*   **Como** motorista e piloto destemido no mundo aberto tridimensional do **Voxel City**,
*   **Eu quero** operar uma aeronave de resgate (Helicóptero Voxel 3D) com visão aérea e holofote de busca, pilotar um Caminhão Guincho com cabo magnético para rebocar veículos acidentados, utilizar a manobra estética de Purga de Nitro com turbulência aerodinâmica (*Slipstream*), e combater focos de incêndio urbano e socorrer a cidade em eventos de desastre,
*   **Para que** o jogo expanda drasticamente seu level design tridimensional (integrando navegação vertical em eixos Y), trazendo dinamismo de emergência, variedade de veículos utilitários e momentos inesquecíveis de heroísmo e alta velocidade.

---

## 🎯 Critérios de Aceitação

1.  **Pilotagem Aérea com Helicóptero Voxel (Air Operations & Helipad 🚁)**:
    *   **Heliporto e Instanciação**: No topo do maior edifício central da cidade (ou em uma plataforma de heliponto demarcada no solo com um "H" neon amarelo), posicionar o modelo 3D de um **Helicóptero de Resgate Voxel**.
    *   **Embarque / Desembarque**: Ao aproximar qualquer veículo ou pedestre a menos de 4 unidades do heliponto e pressionar a tecla `E` ou `Enter`, o jogador assume o controle do helicóptero.
    *   **Física de Voo Tridimensional (3D Flight Controls)**:
        *   `W` / `S` ou `Seta para Cima` / `Seta para Baixo`: Controle de sustentação/altitude (`Y` de 2.0 a 45.0 unidades).
        *   `A` / `D` ou `Seta para Esquerda` / `Seta para Direita`: Rotação de guinada (Yaw rotation).
        *   `Q` / `E` (ou inclinação dos comandos): Arfagem e Rolagem (Pitch & Roll), deslocando a aeronave horizontalmente no plano XZ.
        *   **Animação das HÉLICES (Rotores)**: As hélices principal e de cauda devem girar continuamente em alta velocidade angular (`rotation.y += 0.45`).
    *   **Holofote de Busca (Searchlight)**: O helicóptero possui um holofote de alto brilho ciano/branco (`THREE.SpotLight` de alcance 60 unidades) apontado para baixo que projeta um círculo de luz na cidade e nos carros abaixo.

2.  **Caminhão Guincho & Cabo Magnético (Tow Truck & Magnet Crane 🚛🧲)**:
    *   **Novo Veículo Especial**: Adicionar a opção de selecionar ou encontrar o **Caminhão Guincho Voxel** na cidade ou na Garagem.
    *   **Cabo Magnético Retrátil**:
        *   Teclas `Shift` (Estender/Recolher cabo) e `Espaço` (Ativar/Desativar Eletroímã).
        *   Um cabo de partículas ou linha 3D se estende da traseira do guincho até 6 unidades para baixo/trás.
    *   **Reboque Físico de Veículos**:
        *   Ao posicionar a ponta do eletroímã sobre um veículo desabilitado ou acidentado e ativar o ímã, o veículo fica fisicamente ancorado à traseira do guincho.
        *   O caminhão pode rebocar o carro acidentado através do tráfego até o ponto de entrega da Garagem Central para receber recompensa financeira (`+ $400 TOW BONUS`).

3.  **Purga de Nitro Neon (Nitro Purging) & Vácuo Aerodinâmico (Slipstream / Drafting 💨⚡)**:
    *   **Efeito Visual de Purga de Nitro (Purge Key: `F`)**:
        *   Antes ou durante o acionamento do Nitro, o jogador pode pressionar a tecla `F` para disparar jatos de fumaça pressurizada neon branca/ciano saindo das aberturas do capô do motor (emitindo um volume de partículas com dispersão rápida).
        *   **Efeito de Tração Limpa**: A purga remove instantaneamente penalidades de derrapagem em pistas molhadas e concede um impulso inicial de `+15%` de aceleração instantânea por 1.5 segundos.
    *   **Vácuo Aerodinâmico (Slipstream / Drafting)**:
        *   Ao dirigir diretamente atrás de outro veículo (distância $< 8$ unidades e ângulo de alinhamento $< 15^\circ$), uma aura visual de linhas de vento ciano surge nas laterais do carro do jogador.
        *   O vácuo reduz a resistência do ar, aumentando a velocidade máxima em `+20%` e recarregando a barra de Nitro `50%` mais rápido enquanto o jogador mantiver o vácuo.

4.  **Modo Desastre Urbano (City Emergency Events 🔥🏗️)**:
    *   **Disparo do Evento**: A cada 120 segundos (ou via botão de emergência na HUD), um alerta de rádio soa: `"EMERGENCY ALERT: FIRE AT SECTOR 4!"`.
    *   **Focos de Incêndio Voxel**:
        *   1 a 2 edifícios da cidade passam a emitir fumaça densa cinza/preta e partículas incandescentes de fogo neon vermelho/laranja.
        *   Uma barra de integridade do edifício (`100%`) surge no topo da tela com um cronômetro regressivo de 60 segundos.
    *   **Combate ao Fogo**:
        *   **Caminhão de Bombeiros / Canhão de Água**: O jogador pode usar o canhão de água 3D (`Clique Esquerdo`) disparando um jato de partículas azuis contra as chamas do prédio.
        *   **Helicóptero Bambi Bucket**: O helicóptero pode coletar água no rio/mar e despejar uma tempestade de água sobre o prédio em chamas.
        *   Ao extinguir o incêndio antes do tempo zerar, o jogador salva a estrutura, ganha `+ $1000 HERO BONUS` e desbloqueia a insígnia 👨‍🚒 *City Savior*.

5.  **Áudio Procedural via Web Audio API**:
    *   *Rotores do Helicóptero*: Sintetizar o som ritmado de pás de helicóptero (*Chop-chop-chop*) modulando ruído rosa passa-baixa através de um LFO de baixa frequência ($8\text{Hz} \to 16\text{Hz}$) proporcional à aceleração dos rotores.
    *   *Purga de Nitro (Air Purge)*: Disparo de ruído branco passa-alta de alta pressão com envelope de atrito exponencial instantâneo ($80\text{ms}$).
    *   *Canhão de Água Pressurizado*: Ruído de fluxo contínuo de água com filtro ressonante passa-banda em $1200\text{Hz}$.
    *   *Alarme de Emergência*: Sirene bitonal clássica estilo resgate ($600\text{Hz} \leftrightarrow 900\text{Hz}$).

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/voxel_city/index.html` (com scripts Three.js e controle de entidades).
*   **Controle de Física e Voo do Helicóptero**:
    ```javascript
    class HelicopterVehicle {
        constructor(scene, position) {
            this.mesh = createVoxelHelicopterMesh();
            this.mesh.position.copy(position);
            scene.add(this.mesh);
            
            this.velocity = new THREE.Vector3();
            this.rotationYaw = 0;
            this.rotorSpeed = 0;
            this.searchlight = new THREE.SpotLight(0x00ffff, 2.5, 60, Math.PI / 5, 0.4, 1);
            this.mesh.add(this.searchlight);
            this.searchlight.target.position.set(0, -30, 10);
            this.mesh.add(this.searchlight.target);
        }

        update(dt, keys) {
            // Rotação contínua do rotor principal e de cauda
            if (this.mainRotor) this.mainRotor.rotation.y += 0.5;
            if (this.tailRotor) this.tailRotor.rotation.x += 0.5;

            // Controles de Altitude e Yaw
            if (keys['KeyW']) this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, 8.0, dt * 2);
            else if (keys['KeyS']) this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, -6.0, dt * 2);
            else this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, 0, dt * 3);

            if (keys['KeyA']) this.rotationYaw += 1.5 * dt;
            if (keys['KeyD']) this.rotationYaw -= 1.5 * dt;

            this.mesh.rotation.y = this.rotationYaw;

            // Movimento Horizontal no plano XZ baseado na orientação
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationYaw);
            if (keys['ArrowUp']) this.mesh.position.addScaledVector(forward, 18.0 * dt);
            if (keys['ArrowDown']) this.mesh.position.addScaledVector(forward, -10.0 * dt);

            // Trava de altitude máxima e solo
            this.mesh.position.y = THREE.MathUtils.clamp(this.mesh.position.y + this.velocity.y * dt, 1.5, 45.0);
        }
    }
    ```

*   **Detecção de Vácuo Aerodinâmico (Slipstream / Drafting Algorithm)**:
    ```javascript
    function checkSlipstream(playerCar, trafficCars) {
        let drafting = false;
        const playerPos = playerCar.mesh.position;
        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerCar.mesh.quaternion);

        trafficCars.forEach(car => {
            const dirToCar = new THREE.Vector3().subVectors(car.mesh.position, playerPos);
            const dist = dirToCar.length();

            if (dist > 1.5 && dist < 9.0) {
                dirToCar.normalize();
                const angle = playerForward.angleTo(dirToCar);
                if (angle < 0.25) { // Alinhado atrás do carro (~14 graus)
                    drafting = true;
                }
            }
        });

        if (drafting) {
            playerCar.maxSpeedMultiplier = 1.20;
            playerCar.rechargeNitro(0.5);
            showSlipstreamParticles(playerCar);
        } else {
            playerCar.maxSpeedMultiplier = 1.0;
        }
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Eleva o nível do minijogo de um simulador de condução para uma experiência 3D sandbox completa com aeronaves, veículos utilitários e eventos de combate a desastres).
*   **Esforço Estimado**: Alta (Exige modelagem de voo em Three.js no eixo Y, hierarquia de holofotes orientáveis, física de cabo/âncora magnética e sistema de partículas de água/fogo).
*   **Área**: 3D Engine (Three.js) / Level Design Tridimensional / Motor de Física / Web Audio API.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Canhão de Água e Extinção de Fogo em Voxel
Para garantir alta performance sem vazamentos de memória no WebGL:
```javascript
class WaterCannonSystem {
    constructor(scene) {
        this.scene = scene;
        this.maxParticles = 250;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = [];

        for (let i = 0; i < this.maxParticles; i++) {
            this.positions[i * 3] = 0;
            this.positions[i * 3 + 1] = -100; // Ocultar sob o chão
            this.positions[i * 3 + 2] = 0;
            this.velocities.push(new THREE.Vector3());
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.material = new THREE.PointsMaterial({
            color: 0x00d2ff,
            size: 0.4,
            transparent: true,
            opacity: 0.8
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
        this.activeCount = 0;
    }

    shoot(origin, direction) {
        if (this.activeCount >= this.maxParticles) this.activeCount = 0;
        const idx = this.activeCount * 3;
        this.positions[idx] = origin.x;
        this.positions[idx + 1] = origin.y;
        this.positions[idx + 2] = origin.z;

        this.velocities[this.activeCount].copy(direction).multiplyScalar(28.0);
        this.activeCount++;
        this.geometry.attributes.position.needsUpdate = true;
    }
}
```

### 2. Sintetizador de Rotores de Helicóptero (Web Audio API)
```javascript
function createHelicopterAudioNode(audioCtx) {
    if (!audioCtx) return null;

    // Gerador de ruído rosa
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filtro Passa-Baixa modulado por LFO
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 10; // 10 choppings por segundo

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.2;

    whiteNoise.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    whiteNoise.start();
    lfo.start();

    return { masterGain, lfo };
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Limites de Altitude e Câmera do Helicóptero**:
    *   *Dúvida*: Ao subir com o helicóptero até 45 unidades de altura, a câmera em órbita pode colidir com o teto do frustum de renderização do Three.js (`camera.far`) ou truncar o desenho dos prédios da cidade.
    *   *Proposta*: Ajustar `camera.far = 500` e a distância do plano de névoa `scene.fog.far = 400` quando o jogador estiver a bordo de aeronaves aéreas, estendendo o alcance de visão panorâmica.
2.  **Mecânica de Colisão do Helicóptero com Prédios**:
    *   *Dúvida*: O helicóptero deve explodir ao colidir contra as fachadas de edifícios em alta velocidade ou ricochetear suavemente?
    *   *Proposta*: Ricochetear elasticamente com perda de `20 HP` e emissão de faíscas neon para manter a jogabilidade arcade divertida e tolerante a erros de pilotagem.
3.  **Persistência da Insígnia de Resgate (City Savior)**:
    *   *Dúvida*: O progresso de incêndios apagados deve ser salvo no `localStorage`?
    *   *Proposta*: Sim, armazenar na chave `voxelCityStats` o total de incêndios debelados e resgates concluídos.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Ajuste Dinâmico do Frustum de Câmera (Aprovado)**:
   * **Decisão**: Aprovado! Quando o jogador embarca no helicóptero, a propriedade `camera.far` transiciona suavemente de $200$ para $500$ e o `scene.fog.far` é expandido para $400$. Ao desembarcar em veículos terrestres, os valores retornam ao estado normal.

2. **Física de Colisão Elastic-Bounce para Aeronaves (Aprovado)**:
   * **Decisão**: Aprovada a colisão elástica com ricochete em edifícios, reduzindo o HP e acionando tremor de tela de 200ms e partículas incandescentes, prevenindo respawns punitivos e mantendo o ritmo arcade fluído.

3. **Pool Unificado de Partículas de Fogo e Água (Aprovado)**:
   * **Decisão**: Os sistemas de Canhão de Água e Incêndio Urbano usarão instâncias estáticas reutilizáveis de `THREE.BufferGeometry` para garantir 60 FPS cravados em navegadores desktop e mobile.

---

## 🚀 Status da Tarefa

* **Identificação do Jogo**: `voxel_city`
* **Status do Backlog**: `📋 Backlog` registrado em [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md).

*Assinado: Antigravity - Senior Game Product Owner (PO)*
