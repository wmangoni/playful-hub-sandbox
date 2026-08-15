# 📝 TASK-LAZY_GARDENER: Sistema de Automação Ciber-Botânica (Drones de Irrigação & Colheita), Mutação Genética Radioativa (Sementes Mutantes Starfall), Mercado B2B Corporativo e Feira Noturna Bioluminescente

## 👤 User Story
* **Como** mestre jardineiro e magnata ciber-botânico no minijogo **Lazy Gardener** em Three.js,
* **Eu quero** adquirir e programar Drones de Automação Voxel 3D (Regador e Colhedor), cultivar sementes mutantes estelares (*Starfall Mutants*) geradas por meteoritos radioativos noturnos, cumprir contratos comerciais B2B com megacorporações e desfrutar do Festival de Flores Bioluminescentes na Feira Noturna com áudio sintetizado relaxante,
* **Para que** o ciclo ocioso (idle loop) evolua para uma verdadeira fábrica botânica automatizada (Botanic Factory Tycoon), combinando excelente gestão de espaço no jardim, espetáculo visual de iluminação noturna WebGL e altíssima retenção do jogador.

---

## 🎯 Critérios de Aceitação

### 1. Drones de Automação Ciber-Botânica (Irrigation & Harvest Drones)
* **Drone Regador Voxel 3D (`IrrigationDrone`)**:
  * *Visual*: Modelo em voxel prateado com hélices giratórias, anel neon azul e holofote inferior projetando um cone de água brilhante.
  * *Comportamento*: Voa a uma altitude de 3.5 unidades sobre os canteiros. Detecta automaticamente plantas com umidade < 50%, desloca-se suavemente via interpolação LERP e irriga a planta até 100% de umidade.
* **Drone Colhedor Voxel 3D (`HarvestDrone`)**:
  * *Visual*: Modelo em voxel dourado/laranja com garra mecânica articulada e raio trator ciano.
  * *Comportamento*: Patrulha o jardim em busca de plantas maduras (`growthStage === maxStage`). Quando localiza uma flor madura, utiliza o raio trator para colhê-la instantaneamente, adicionando o valor em ouro diretamente ao saldo e depositando sementes no silo.
* **Painel de Controle e Upgrades de Drones**:
  * Botão de compra no menu da loja: *Drone Regador* (2.000 🪙) e *Drone Colhedor* (4.000 🪙).
  * Upgrades individuais (Velocidade de voo, Capacidade do tanque de água, Bônus de eficiência de colheita +15%).

### 2. Mutação Genética Radioativa (Mutagenic Starfall Seeds)
* **Evento Noturno "Queda de Meteorito Estelar" (Starfall Event)**:
  * A cada 4 minutos de jogo (ou ao cair da noite), há 25% de chance de ocorrer uma chuva de meteoros luminosos em Three.js.
  * Um meteorito rutilante violeta/magenta pousa em um ponto aleatório livre do canteiro, emitindo partículas de radiação cosmic neon em raio de 2.5 unidades por 90 segundos.
* **Mutações Starfall**:
  * Plantas normais que crescem no raio de radiação do meteorito mutam para espécies estelares lendárias:
    * 🌌 **Lótus Quântica**: Pétalas flutuantes com animação de levitação individual em relação ao caule.
    * ⚡ **Bambu de Plasma**: Estrutura tubular translúcida emitindo arcos de eletricidade estática.
    * 🪐 **Cacto Antigravitacional**: Esferas orbitando ao redor da planta em trajetória senoidal.
  * *Valor de Colheita*: **6.0x** o valor base da planta original + concede 1 Fragmento Estelar (*Star Fragment*) para pesquisas.

### 3. Mercado de Contratos B2B Corporativos (Corporate Botanic Contracts)
* **Painel de Contratos B2B (`#b2b-contracts-modal`)**:
  * Modal glassmorphic acessível pelo HUD exibindo 3 contratos ativos simultaneamente de corporações futuristas (ex: *Aethelgard BioTech*, *CyberFlora Corp*, *Neo-Tokyo Botanicals*).
  * *Exemplo de Contrato*: "Entregar 8 Flores Híbridas de Fogo + 4 Lótus Quânticas em 5 minutos".
  * *Recompensas*: Grande quantia de ouro (3.000 🪙 a 10.000 🪙), XP de Prestígio e Desconto Permanente em Compras de Sementes.
* **Timer Regressivo e Penalidade**:
  * Se o contrato expirar sem conclusão, é renovado após 2 minutos de cooldown.

### 4. Feira Noturna Neon & Festivais Bioluminescentes (Bioluminescent Night Festival)
* **Ciclo Dia/Noite Visual Dinâmico**:
  * Transição suave entre Dia (sol quente e céu claro) e Noite Cyberpunk (céu escuro estelar `#03020d` com lua cheia neon e iluminação global azul escura).
* **Brilho Bioluminescente (Emissive Glow)**:
  * Durante a Noite, flores maduras, híbridas e mutantes ativam materiais emissivos (`emissiveIntensity: 1.5`) e luzes pontuais (`THREE.PointLight`) que iluminam o terreno ao redor em tons de ciano, magenta e dourado.
* **Festival Bioluminescente**:
  * À noite, ativa-se o "Festival Bioluminescente" que concede multiplicador de vendas de **2.0x** em todas as colheitas realizadas durante o período noturno.
* **Música Sintetizada Lofi Chillout via Web Audio API**:
  * Trilha sonora procedural gerada em tempo real com osciladores de onda senoidal e filtro passa-baixa, reproduzindo progressões de acordes lofi relaxantes com sons de grilos sintetizados no fundo.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/lazy_gardner/index.html`.
* **Framework**: Three.js (WebGL 3D) & Web Audio API nativa.
* **Novas Estruturas no Estado Global (`gardenState`)**:
  ```javascript
  const gardenState = {
      // ... propriedades anteriores
      drones: {
          irrigation: { active: false, level: 1, speed: 4.0, capacity: 100 },
          harvest: { active: false, level: 1, speed: 4.0, efficiency: 1.0 }
      },
      b2bContracts: [],
      starFragments: 0,
      isNight: false,
      nightFestivalActive: false
  };
  ```
* **Gerenciamento de Memória e Performance**:
  * Utilizar `THREE.InstancedMesh` ou reaproveitamento rigoroso de materiais para os drones e fragmentos de meteorito.
  * Limitar a quantidade máxima de luzes dinâmicas (`THREE.PointLight`) simultâneas na noite a no máximo 6 luzes principais, usando shader emissivo para as demais plantas para manter 60 FPS estáveis.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Completa o ecossistema de endgame com automação idle, mercado B2B e o auge estético da Feira Noturna Bioluminescente).
* **Esforço Estimado**: Alta (Implementação de IA de navegação de drones em 3D, shaders emissivos noturnos, sistema de contratos com timers e sintetizador de áudio lofi).
* **Área**: Computação Gráfica 3D (Three.js) / Game Design / Web Audio API / Interfaces Glassmorphism.

---

## 🏗️ Refinamento Técnico (Technical Refinement pelo Tech Lead)

### 1. Sistema de Movimento e Patrulha dos Drones (`IrrigationDrone` & `HarvestDrone`)
```javascript
function updateDrones(dt) {
    // 1. Drone Regador
    if (gardenState.drones.irrigation.active && irrigationDroneMesh) {
        let targetPlant = findNeediestPlant();
        if (targetPlant) {
            let targetPos = targetPlant.position.clone().add(new THREE.Vector3(0, 3.5, 0));
            irrigationDroneMesh.position.lerp(targetPos, dt * gardenState.drones.irrigation.speed);
            
            if (irrigationDroneMesh.position.distanceTo(targetPos) < 0.5) {
                targetPlant.moisture = Math.min(100, targetPlant.moisture + 40 * dt);
                spawnWaterSprayParticles(targetPlant.position);
                playIrrigationSound();
            }
        } else {
            // Patrulha circular sobre o centro do jardim
            let time = Date.now() * 0.001;
            irrigationDroneMesh.position.x = Math.cos(time) * 4.0;
            irrigationDroneMesh.position.z = Math.sin(time) * 4.0;
            irrigationDroneMesh.position.y = 3.5;
        }
    }

    // 2. Drone Colhedor
    if (gardenState.drones.harvest.active && harvestDroneMesh) {
        let maturePlant = findMaturePlant();
        if (maturePlant) {
            let targetPos = maturePlant.position.clone().add(new THREE.Vector3(0, 3.0, 0));
            harvestDroneMesh.position.lerp(targetPos, dt * gardenState.drones.harvest.speed);

            if (harvestDroneMesh.position.distanceTo(targetPos) < 0.6) {
                harvestPlantByDrone(maturePlant);
                spawnTractorBeamParticles(maturePlant.position);
                playHarvestBeamSound();
            }
        }
    }
}
```

### 2. Evento Meteorito Starfall & Mutações Radioativas
```javascript
function checkStarfallEvent() {
    if (Math.random() < 0.25 && !activeMeteorite) {
        const landingPos = new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            0,
            (Math.random() - 0.5) * 12
        );
        
        spawnMeteoriteMesh(landingPos);
        showNotification("☄️ UM METEORITO ESTELAR CAIU NO SEU JARDIM! Sementes próximas sofrerão mutação!", 5000);
        playStarfallCrashSound();
    }
}

function applyStarfallMutations(meteoritePos, dt) {
    plants.forEach(plant => {
        if (!plant.isMutant && plant.growthStage < maxStage) {
            if (plant.position.distanceTo(meteoritePos) < 2.5) {
                plant.mutationProgress = (plant.mutationProgress || 0) + dt * 0.2;
                if (plant.mutationProgress >= 1.0) {
                    plant.isMutant = true;
                    plant.mutantType = selectRandomStarfallType();
                    applyMutantVisuals(plant);
                    showFloatingText("🌌 MUTAÇÃO STARFALL! 🌌", plant.position, "#ff00ff");
                }
            }
        }
    });
}
```

### 3. Gerador de Contratos B2B Corporativos
```javascript
function generateB2BContracts() {
    const corporations = ["Aethelgard BioTech", "CyberFlora Corp", "Neo-Tokyo Botanicals"];
    const plantTypes = ["firelotus", "crystalbamboo", "goldpine", "starfall_quantum"];
    
    gardenState.b2bContracts = [];
    for (let i = 0; i < 3; i++) {
        const targetType = plantTypes[Math.floor(Math.random() * plantTypes.length)];
        const requiredQty = Math.floor(Math.random() * 5) + 3;
        const rewardGold = requiredQty * 800 + Math.floor(Math.random() * 1000);
        
        gardenState.b2bContracts.push({
            id: 'contract_' + Date.now() + '_' + i,
            corp: corporations[i],
            targetType: targetType,
            requiredQty: requiredQty,
            currentQty: 0,
            rewardGold: rewardGold,
            durationSeconds: 300,
            remainingSeconds: 300
        });
    }
    renderB2BContractsUI();
}
```

### 4. Trilha Sonora Lofi Chillout via Web Audio API
```javascript
function playLofiBackgroundAudio() {
    if (!audioCtx) return;
    
    // Acordes Lofi (7th chords) em frequências (Hz): Cmaj7 -> Am7 -> Fmaj7 -> G7
    const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23]  // G7
    ];

    let chordIndex = 0;
    setInterval(() => {
        if (!gardenState.isNight) return;
        const currentChord = chords[chordIndex];
        currentChord.forEach(freq => {
            const osc = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, audioCtx.currentTime); // Som aveludado lofi

            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.5);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 3.5);
        });
        chordIndex = (chordIndex + 1) % chords.length;
    }, 4000);
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Stacking de Drones de Mesma Classe**:
   * *Dúvida*: O jogador pode comprar múltiplos Drones Regadores ou Colhedores (ex: ter 3 Drones Regadores operando simultaneamente)?
   * *Proposta do PO*: **Permitir até 2 drones de cada tipo.** Isso suporta expansões de jardim maiores e dá flexibilidade de escala no endgame.
2. **Descarte de Meteoritos Starfall**:
   * *Dúvida*: Os meteoritos ocupam canteiros permanentemente ou desaparecem após a radiação cessar?
   * *Proposta do PO*: **Desaparecem após 90 segundos**, deixando um *Fragmento Estelar* coletável com o ponteiro do mouse (`Raycaster`).
3. **Persistência de Contratos Expire**:
   * *Dúvida*: Quando o timer de um contrato expira, o contrato deve ser removido imediatamente ou conceder a opção de pagar uma pequena taxa em ouro para prorrogar o tempo por 2 minutos?
   * *Proposta do PO*: **Permitir prorrogação paga (500 🪙).** Aumenta a agência do jogador sem frustrar o esforço acumulado.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Limite de Drones (Aprovado)**:
   * **Decisão**: Permitido até 2 Drones Regadores e 2 Drones Colhedores. Cada drone adicional adiciona uma malha em voxel no loop do Three.js.
2. **Coleta de Meteoritos (Aprovado)**:
   * **Decisão**: Meteorito permanece por 90s emitindo partículas radioativas, depois converte-se em um cristal coletável (*Star Fragment*) por clique.
3. **Prorrogação de Contratos (Aprovado)**:
   * **Decisão**: Botão "Prorrogar (+2 min)" por 500 🪙 habilitado quando restarem menos de 30 segundos no contrato.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `lazy_gardner` (Lazy Gardener)
* **Ação**: Especificação técnica refinada pelo PO com arquitetura limpa de 4 pilares.
* **Status no BACKLOG.md**: `✅ Refined`.
* **Próximo Passo**: Pronto para codificação pelo time de desenvolvimento.

*Assinado: Antigravity - Senior Game Product Owner (PO)*
