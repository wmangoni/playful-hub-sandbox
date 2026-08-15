# 📝 TASK-DRIVING_SIMULATOR: Sistema de Pistas Temáticas Multi-Bioma (Cyber City, Cânion Vulcânico e Geleira Sub-Zero), Personalização Visual no Hangar 3D (Kits Neon & Spoilers), Combate Takedown Veicular e Chefe Colossal "Titan Rig"

## 👤 User Story
* **Como** piloto entusiasta do minijogo **Driving Simulator** que busca uma experiência arcade de alta velocidade, variedade temática de cenários, combate tático entre veículos e batalhas memoráveis contra chefes,
* **Eu quero** competir em 3 pistas temáticas com biomas e física de superfícies dinâmicas (Cyber City com viadutos elevados, Cânion Vulcânico com poças de lava e rochas cadentes, e Geleira Sub-Zero com superfícies congeladas), customizar visualmente meus veículos no Hangar 3D (neons underglow, aerofólios e pinturas metálicas), executar manobras táticas de Takedown com desaceleração em Bullet-Time e enfrentar o chefe colossal caminhão blindado "Titan Rig",
* **Para que** o simulador atinja um nível incomparável de imersão, diversão, valor de replay e espetáculo visual e sonoro, colocando a jornada e o engajamento do jogador em primeiro lugar.

---

## 🎯 Critérios de Aceitação

1. **Sistema de Pistas Temáticas Multi-Bioma (Multi-Track Level Design)**:
   * **Seletor de Pista no Menu/Garagem**: Permitir ao jogador escolher o circuito antes de iniciar a partida:
     * **Pista 1: Neon City Flyovers (Metrópole Cyberpunk)**:
       * Viadutos 3D elevados (`y = 15`) com rampas de acesso helicoidais e curvas inclinadas.
       * *Boost Pads Neon*: Placas de aceleração ciano reluzentes no asfalto que concedem +40% de velocidade instantânea por 1.5 segundos.
     * **Pista 2: Vulcano Ridge Pass (Cânion Vulcânico)**:
       * Pista cercada por poças de lava incandescente (`emissiveColor: #ff3300`).
       * *Hazard da Lava*: Colidir ou trafegar pela lava inflige dano contínuo de -15% de integridade/s e emite fumaça preta volumétrica.
       * *Rockfall Hazards*: Rochas abrasivas caindo periodicamente do topo das montanhas, telegrafadas no solo por sombras circulares 1.5s antes do impacto.
     * **Pista 3: Sub-Zero Glacier Sprint (Passagem da Geleira)**:
       * Pista coberta por camada de gelo reflexivo de alta especularidade (`roughness = 0.05`).
       * *Física de Gelo*: Aderência dos pneus reduzida em 60%, aumentando a derrapagem lateral em 2.2x.
       * *Paredes Destruíveis*: Barreiras de cristal de gelo translúcidas que podem ser espatifadas ao atingi-las em velocidade turbo para liberar atalhos secretos.
       * *Blizzard FX*: Partículas de flocos de neve caindo com turbulência de vento lateral.

2. **Personalização Visual no Hangar 3D (Visual Tuning System)**:
   * **Customização de Neon Underglow (Luzes Sob o Chassi)**:
     * Adicionar luzes `SpotLight` / `PointLight` no fundo do chassi do veículo.
     * Opções de paleta: Ciano Neon (`#00f3ff`), Magenta Cyber (`#ff00aa`), Verde Matrix (`#00ff66`), Dourado Royale (`#ffcc00`) e Modo Arco-Íris Pulsante (Ciclo RGB dinâmico).
   * **Estilização de Aerofólios (Spoilers Equipáveis)**:
     * Renderizar modelos 3D de aerofólios intercambiáveis na traseira da malha do carro: *Sport Wing*, *Cyber GT Splitter* e *Titan Dual-Blade*.
   * **Pintura e Acabamento de Lataria**:
     * Opções de acabamento nos materiais Three.js: *Fosco* (`roughness: 0.9, metalness: 0.1`), *Brilhante* (`roughness: 0.2, metalness: 0.3`) e *Metálico Cromado* (`roughness: 0.05, metalness: 0.95`).
   * **Persistência**: Salvar e carregar preferências do usuário na chave `driving_custom_garage` do `localStorage`.

3. **Combate Veicular Tático & Takedowns Cinemáticos (Burnout Takedown Engine)**:
   * **Ataque de Empurrão Lateral (Side Slam)**:
     * Teclas `Q` (Guinar à Esquerda) e `E` (Guinar à Direita) executam um impulso de velocidade vetorial lateral instantâneo para abalroar veículos vizinhos.
   * **Detecção de Takedown (Takedown Check)**:
     * Ao empurrar com sucesso uma viatura policial ou rival contra muretas, colunas de pontes ou poças de lava em velocidade acelerada ($v > 0.3$), o rival é desabilitado/destruído.
   * **Feedback Cinemático & Juiciness**:
     * *Bullet-Time Dynamic*: Desacelerar a simulação (`timeScale = 0.3`) por 600ms durante o momento de impacto do Takedown.
     * *Camera Impact Shake*: Tremor direcional de câmera e aproximação rápida (Zoom Punch).
     * *Faíscas e Estilhaços*: Explosão de partículas de faíscas neon e pedaços de lataria voando.
     * *Bônus Instantâneo*: Conceder recarga imediata de +50% de Nitro NOS e +500 moedas de bônus.

4. **Batalha contra Chefe "Titan Rig" (Super-Caminhão Blindado de Carga)**:
   * **Invocação do Chefe**: No terço final do circuito ou no modo Boss Challenge, o Titan Rig (caminhão 18-wheeler colossal) surge à frente abrindo caminho.
   * **Ataques Telegrafados do Titan Rig**:
     * *Minas Magnéticas*: Lança minas piscantes vermelhas traseiras que explodem se o jogador se aproximar a menos de 3.0 unidades.
     * *Mancha de Óleo em Chamas*: Ejeta poças de óleo viscoso pegando fogo que causam descontrole de direção e dano à integridade.
     * *Abalroamento Lateral*: Sinaliza setas piscantes antes de se mover lateralmente para prensar o jogador contra as muretas.
   * **Barra de Vida e Pontos Fracos (Boss Fight Mechanics)**:
     * Exibir barra de vida dedicada do chefe na HUD (`#bossHealthBar`, 100 HP).
     * O Titan Rig possui 2 tanques laterais de combustível energizados destacados em neon vermelho.
     * O jogador deve acelerar usando os Boost Pads neon e desferir *Side Slams* (Takedowns) diretamente nos tanques laterais. Cada acerto reduz 25 HP do chefe.
     * Zerar o HP do Titan Rig gera uma grande sequência de explosões douradas, desaceleração triunfal e desbloqueio do troféu "King of the Highway".

5. **Trilha Sonora Adaptativa Procedural Synthwave (Web Audio API Engine)**:
   - **Geração de Música Neon em Tempo Real**:
     - *Linha de Baixo (Synth Bass)*: Oscilador dente-de-serra pulsante a 130 BPM em colcheias com filtro passa-baixa Biquad de frequência modulada.
     - *Arpejador Synthwave*: Linha de arpejos senoidais em escala menor que intensificam frequência e volume conforme a velocidade e ao usar Nitro.
     - *Percussão Sintetizada*: Bumbo (Kick) analógico por rápida varredura senoidal ($120\text{Hz} \to 30\text{Hz}$) e Caixa (Snare) por envelope de ruído rosa.
     - *Filtro Audio Muffle*: Reduzir a frequência de corte do áudio global quando o veículo estiver em rodopio ou submerso em névoa para efeito de abafamento imersivo.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/driving_simulator/index.html`.
* **Frameworks**: Three.js (WebGL 3D) & Web Audio API nativa em HTML5/JavaScript.
* **Estruturas de Dados e Objetos Globais**:
  ```javascript
  const trackConfigs = {
      city: { name: "Neon City Flyovers", skyColor: 0x0a0e1a, friction: 1.0, hasFlyovers: true },
      volcano: { name: "Vulcano Ridge Pass", skyColor: 0x2b0d0d, friction: 0.85, lavaHazards: true },
      glacier: { name: "Sub-Zero Glacier Sprint", skyColor: 0x0d202b, friction: 0.4, destructibleIce: true }
  };

  const customGarage = {
      underglowColor: '#00f3ff', // neon hex
      underglowMode: 'solid',    // 'solid' | 'rgb_cycle'
      spoilerType: 'cyber_gt',   // 'none' | 'sport' | 'cyber_gt' | 'titan'
      finishType: 'metallic'    // 'matte' | 'glossy' | 'metallic'
  };

  const bossState = {
      active: false,
      hp: 100,
      maxHp: 100,
      mesh: null,
      tanksDestroyed: 0
  };
  ```
* **Gerenciamento de Memória & Performance**:
  * Utilizar `Object Pooling` para projéteis de minas, rochas cadentes, estilhaços de gelo e partículas de faíscas.
  * Invocação obrigatória de `.dispose()` na geometria e materiais de qualquer elemento de cenário destruído (como barreiras de gelo) para impedir vazamentos de memória (Memory Leaks).

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Expande radicalmente o valor de gameplay com novos biomas, personalização de veículos, mecânica de combate takedown e batalha épica de chefe).
* **Esforço Estimado**: Alta (Requer modelagem de pistas 3D com física de superfícies, sistema de personalização de materiais Three.js, detecção física de takedown com bullet-time e síntese de áudio synthwave).
* **Área**: Computação Gráfica 3D (Three.js) / Física de Veículos / Game Feel & Juiciness / Web Audio API.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Seleção de Pistas e Física de Bioma

```javascript
function applyTrackEnvironment(trackKey) {
    const config = trackConfigs[trackKey];
    if (!config) return;
    
    currentTrack = trackKey;
    scene.background = new THREE.Color(config.skyColor);
    scene.fog.color = new THREE.Color(config.skyColor);
    
    // Ajuste de aderência de superfície
    playerPhysics.surfaceFriction = config.friction;
    
    if (trackKey === 'volcano') {
        spawnLavaPools();
        initRockfallTimer();
    } else if (trackKey === 'glacier') {
        spawnDestructibleIceWalls();
        initBlizzardParticles();
    } else if (trackKey === 'city') {
        spawnFlyoverRamps();
    }
}
```

### 2. Personalização de Neon Underglow e Materiais no Hangar

```javascript
function applyGarageCustomization(carMesh) {
    // 1. Atualizar Neon Underglow
    if (!carMesh.underglowLight) {
        const light = new THREE.PointLight(customGarage.underglowColor, 4.0, 8);
        light.position.set(0, 0.2, 0);
        carMesh.add(light);
        carMesh.underglowLight = light;
    } else {
        carMesh.underglowLight.color.set(customGarage.underglowColor);
    }
    
    // 2. Acabamento da Lataria (Finish Material Properties)
    carMesh.traverse(child => {
        if (child.isMesh && child.name === 'carBody') {
            if (customGarage.finishType === 'matte') {
                child.material.roughness = 0.9;
                child.material.metalness = 0.1;
            } else if (customGarage.finishType === 'metallic') {
                child.material.roughness = 0.08;
                child.material.metalness = 0.92;
            } else {
                child.material.roughness = 0.2;
                child.material.metalness = 0.3;
            }
        }
    });
}
```

### 3. Mecânica de Takedown Lateral (Side Slam & Bullet-Time)

```javascript
function triggerSideSlam(direction) { // -1 for left (Q), +1 for right (E)
    if (slamCooldown > 0) return;
    slamCooldown = 0.8; // segundos
    
    const slamVector = new THREE.Vector3(direction * 12, 0, 0);
    slamVector.applyQuaternion(playerCar.quaternion);
    playerCar.position.addScaledVector(slamVector, 0.1);
    
    // Verificação de Takedown em alvos próximos
    const rivals = [...traffic, ...policePursuit.copCars];
    rivals.forEach(rival => {
        const dist = playerCar.position.distanceTo(rival.position);
        if (dist < 3.2 && playerSpeed > 0.25) {
            executeTakedown(rival);
        }
    });
}

function executeTakedown(target) {
    // 1. Bullet Time de 600ms
    timeScale = 0.3;
    setTimeout(() => { timeScale = 1.0; }, 600);
    
    // 2. Efeitos visuais e recompensa
    triggerScreenShake(0.6, 0.6);
    spawnSparkExplosion(target.position);
    nitroSystem.charge = Math.min(100, nitroSystem.charge + 50);
    gameState.playerScore += 500;
    
    // 3. Desabilitar alvo
    target.isDestroyed = true;
    playTakedownCrashSound();
}
```

### 4. Batalha de Chefe: Titan Rig (Boss Fight Logic)

```javascript
function updateBossBehavior(dt) {
    if (!bossState.active || !bossState.mesh) return;
    
    const boss = bossState.mesh;
    boss.position.z += boss.speed * dt; // Mantém ritmo à frente
    
    // Lançamento periódico de minas traseiras
    bossState.mineTimer = (bossState.mineTimer || 0) + dt;
    if (bossState.mineTimer > 4.0) {
        bossState.mineTimer = 0;
        spawnMagneticMine(boss.position.x, boss.position.z - 6);
    }
    
    // Colisão de Side Slam nos tanques do Chefe
    if (playerCar.position.distanceTo(boss.position) < 4.5 && isSideSlamming) {
        damageBoss(25);
    }
}

function damageBoss(amount) {
    bossState.hp = Math.max(0, bossState.hp - amount);
    updateBossHealthHUD();
    triggerScreenShake(0.5, 0.4);
    playBossHitSound();
    
    if (bossState.hp <= 0) {
        defeatBoss();
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Liberdade de Seleção de Biomas**:
   * *Dúvida*: As 3 pistas temáticas devem estar desbloqueadas desde o início ou exigir progressão acumulando moedas/vitórias no modo Campanha?
   * *Proposta*: Manter *Neon City* desbloqueada por padrão, exigindo 1.000 moedas para desbloquear o *Cânion Vulcânico* e 2.500 moedas para a *Geleira Sub-Zero*.
2. **Desempenho da Trilha Synthwave em Tempo Real**:
   * *Dúvida*: A síntese sonora Synthwave de múltiplos osciladores na Web Audio API pode impactar o consumo de CPU em navegadores com hardware limitado?
   * *Proposta*: Manter um seletor no menu de configurações "Áudio Synth: Alto / Baixo", onde o modo Baixo desativa o arpejador secundário mantendo apenas o baixo e percussão.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

*(Esta seção será preenchida pelo Tech Lead durante a revisão técnica)*

*Status da Especificação*: 📋 **Backlog / Aguardando Refinamento Técnico do Tech Lead**.
