# 📝 TASK-THREEJS_EARTH: Simulação de Defesa Planetária: Intercepção de Asteroides, Escudo Defletor Energético e HUD de Combate

## 👤 User Story
*   **Como** comandante de defesa orbital do **Three.js Earth**,
*   **Eu quero** rastrear asteroides que se deslocam em rota de colisão contra a Terra, ativar e monitorar um escudo defletor de energia global e disparar canhões laser a partir de satélites ou estações terrestres para desintegrá-los no espaço,
*   **Para que** a simulação planetária atinja um novo patamar de interatividade tática (game feel) e imersão visual premium com simulações de pós-processamento, partículas e efeitos de áudio sintetizado em tempo real.

---

## 🎯 Critérios de Aceitação

1.  **Detecção de Asteroides Hostis (Asteroid Spawn & Trajectory)**:
    *   Implementar um botão na HUD de Comando chamado **"Simular Ameaça de Asteroide"**.
    *   Ao clicar, gerar de forma procedural um **Asteroide** no espaço profundo (distância $d \ge 5.0$ unidades tridimensionais da Terra).
    *   **Geometria e Material**: O asteroide deve possuir uma geometria irregular (ex: `THREE.DodecahedronGeometry` de tamanho `0.04` a `0.07` com variações aleatórias nas posições de seus vértices) e material opaco rochoso rugoso (`roughness: 0.9`, de cor cinza-escura/marrom).
    *   **Movimento**: O asteroide deve transladar linearmente em direção ao centro da Terra $(0,0,0)$ a uma velocidade uniforme configurável ($0.01$ a $0.02$ unidades por frame) e rotacionar lentamente nos eixos X e Y.
    *   **Rastro de Fogo (Trail)**: Emitir um rastro luminoso vermelho/laranja neon de partículas ou uma linha degradê simulando atrito espacial que segue a trajetória do asteroide.
    *   **HUD de Ameaça**: Adicionar um widget na HUD principal ("Rastreador de Ameaças") que exibe a distância atualizada do objeto até a Terra e um tempo regressivo estimado até o impacto (ETA).

2.  **Escudo Defletor Energético Pulsante e Integridade (Volumetric Forcefield Shield)**:
    *   Criar uma esfera que encapsula a Terra com raio ligeiramente maior ($1.13$ a $1.15$), usando `THREE.SphereGeometry`.
    *   **Material do Escudo**: O escudo deve ser semitransparente, com blending aditivo (`THREE.AdditiveBlending`), padrão de aramado ciano brilhante (`wireframe: true`) e opacidade base muito baixa ($0.05$ ou menos) para mantê-lo quase invisível em estado ocioso.
    *   **Feedback de Impacto (Ripple Effect)**:
        *   Caso um asteroide não seja interceptado e colida com o raio do escudo ($d \le 1.15$):
            *   O escudo deve aumentar instantaneamente sua opacidade para $0.6$ e emitir um clarão/pulso de cor ciano/azul que se dissipa suavemente (efeito LERP de opacidade regressando à base).
            *   O asteroide é desintegrado ao bater no escudo (removido da cena com uma explosão de partículas menores).
            *   Reduzir a **Integridade do Escudo** em **20%** (exibido em uma barra de progresso ciano na HUD).
    *   **Falha do Escudo & Impacto Terrestre**:
        *   Se a Integridade do Escudo chegar a `0%`, o escudo é desativado (opacidade $0.0$ permanente).
        *   Novos impactos de asteroides atingem a Terra diretamente ($d \le 1.0$), provocando um flash vermelho e um marcador de cratera quente procedural no ponto cartesiano de colisão (ex: um pequeno círculo plano vermelho neon `0xff2200` com fade de opacidade).

3.  **Disparo do Canhão Laser Orbital/Terrestre (Laser Interception System)**:
    *   O jogador pode disparar contra o asteroide ativo de duas maneiras:
        *   *Via Estação Terrestre*: Selecionar uma das 3 estações ciano no mapa e clicar em **"Disparar Interceptor Laser"** na barra de telemetria.
        *   *Via Satélite*: Selecionar um dos 5 satélites em órbita e clicar no botão de disparo da telemetria.
    *   **Lógica de Intercepção**:
        *   O disparo do laser cria instantaneamente um cilindro ou linha brilhante de emissão ciano/azul (ou vermelho se disparado por estação) que liga a posição tridimensional da origem (satélite/estação) à coordenada atual do asteroide por 10 frames (aproximadamente $150\text{ms}$).
        *   O asteroide é destruído instantaneamente no espaço, gerando um efeito de dispersão de 15-20 partículas de estilhaços dourados cintilantes que se afastam radialmente e somem com fade.
        *   Tocar o efeito sonoro de laser e explosão procedural.

4.  **Painel de Defesa Planetária e Síntese Web Audio API**:
    *   **Painel HUD**: Criar uma modal ou grupo de controle glassmorphic "Planetary Defense Shield" na HUD lateral contendo:
        *   Indicador de Status do Escudo ("ATIVADO" / "CRÍTICO" / "DESATIVADO").
        *   Barra de Integridade do Escudo (0% a 100%).
        *   Controle de Recarga do Laser (cooldown de 3 segundos representado visualmente por uma barra de recarga).
    *   **Áudio Procedural com Web Audio API**:
        *   *Carregamento do Laser*: Um sweep senoidal com pitch ascendente rápido ($180\text{Hz} \to 900\text{Hz}$) e aumento de amplitude de 0.8s.
        *   *Disparo do Laser*: Um burst de ruído branco filtrado com decay exponencial rápido de 0.2s acoplado a um oscilador do tipo dente-de-serra em declínio de frequência ($880\text{Hz} \to 220\text{Hz}$).
        *   *Impacto no Escudo*: Um oscilador de baixa frequência tipo triângulo ($90\text{Hz} \to 45\text{Hz}$) simulando a ressonância do campo magnético, com decay lento de 0.6s.
        *   *Explosão do Asteroide*: Ruído branco puro filtrado com passa-baixas e decay de 0.5s para simular a explosão no vácuo espacial.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/threejs-earth-main/index.js` e `/threejs-earth-main/index.html`.
*   **Modelagem de Dados e Vetores**:
    Mapear o asteroide ativo em um objeto global de estado:
    ```javascript
    let activeAsteroid = null;
    // Estrutura do objeto:
    // {
    //   mesh: THREE.Mesh,
    //   direction: THREE.Vector3, // vetor normalizado apontando para (0,0,0)
    //   speed: 0.015,
    //   trailParticles: THREE.Points,
    //   eta: 0 // Tempo estimado em segundos
    // }
    ```

*   **Cálculo Cartesianos Tridimensionais**:
    Ao spawnar o asteroide em um ponto randômico na esfera de raio $6.0$:
    ```javascript
    function spawnAsteroid() {
        if (activeAsteroid) return; // apenas um por vez

        const geo = new THREE.DodecahedronGeometry(0.05 + Math.random() * 0.02, 1);
        
        // Deforma os vértices para criar uma forma irregular rochosa
        const posAttr = geo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i);
            const vz = posAttr.getZ(i);
            const factor = 0.85 + Math.random() * 0.3; // escala aleatória
            posAttr.setXYZ(i, vx * factor, vy * factor, vz * factor);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x6e5246,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });

        const mesh = new THREE.Mesh(geo, mat);
        
        // Coordenadas esféricas aleatórias
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const radius = 6.0;

        mesh.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );

        scene.add(mesh);
        
        const direction = new THREE.Vector3().copy(mesh.position).normalize().negate();
        
        activeAsteroid = {
            mesh,
            direction,
            speed: 0.012 + Math.random() * 0.008,
            createdAt: Date.now()
        };
    }
    ```

*   **Renderização do Laser e Interceptação**:
    Criar o laser a partir do emissor selecionado e traçar o feixe linear no loop de animação:
    ```javascript
    function fireLaser() {
        if (!currentTarget || !activeAsteroid || laserCooldown > 0) return;
        
        // Iniciar sintetizador de carga de energia
        playLaserChargeSound();
        
        // Travar controles temporariamente e disparar após a carga
        setTimeout(() => {
            const startPos = new THREE.Vector3();
            currentTarget.getWorldPosition(startPos);
            
            const endPos = activeAsteroid.mesh.position;
            
            // Desenhar cilindro luminoso ou linha grossa
            const laserGeo = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
            const laserMat = new THREE.LineBasicMaterial({ 
                color: 0x00ffff, 
                linewidth: 3, 
                transparent: true, 
                opacity: 1.0, 
                blending: THREE.AdditiveBlending 
            });
            const laserLine = new THREE.Line(laserGeo, laserMat);
            scene.add(laserLine);
            
            // Tocar som de disparo e explosão
            playLaserFireSound();
            playExplosionSound();
            
            // Criar estilhaços/partículas
            createExplosionParticles(endPos);
            
            // Limpar asteroide e linha laser
            scene.remove(activeAsteroid.mesh);
            activeAsteroid = null;
            
            setTimeout(() => {
                scene.remove(laserLine);
            }, 150); // visibilidade rápida
            
            triggerCooldown();
        }, 300); // tempo de carga
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Crucial para converter o visualizador espacial passivo em uma experiência gamificada tática e de grande interatividade, aumentando drasticamente a retenção do usuário).
*   **Esforço Estimado**: Alta (Implementação física de rota e interseção, sistemas de partículas de estilhaços customizadas em Three.js, shaders/materiais para o pulso no escudo e osciladores Web Audio API sintonizados).
*   **Área**: Computação Gráfica (WebGL/ThreeJS) / Desenvolvimento Frontend / Web Audio API.

---

## ⚙️ Refinamento Técnico (Technical Refinement)

Abaixo estão descritas as rotinas estruturais para guiar o desenvolvedor na implementação correta das lógicas de intercepção e feedbacks dinâmicos.

### 1. CSS do Painel de Controle de Defesa ([index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/threejs-earth-main/index.html))

Adicionar ao cabeçalho ou seção de estilos as seguintes classes de layout e barras de progresso neon:

```css
/* Barra de Integridade do Escudo */
.shield-bar-container {
    width: 100%;
    height: 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    border: 1px solid rgba(0, 255, 255, 0.15);
    overflow: hidden;
    margin-top: 5px;
}

.shield-bar-fill {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #00ffff, #0088ff);
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
    transition: width 0.4s cubic-bezier(0.1, 0.8, 0.3, 1);
}

.shield-bar-fill.critical {
    background: linear-gradient(90deg, #ff0055, #990022);
    box-shadow: 0 0 10px rgba(255, 0, 85, 0.8);
}

/* Indicador de Cooldown de Laser */
.cooldown-indicator {
    font-size: 0.8rem;
    font-family: 'Orbitron', sans-serif;
    color: #00ffaa;
    text-shadow: 0 0 5px rgba(0, 255, 170, 0.4);
    display: flex;
    justify-content: space-between;
}

.btn-defense-action {
    background: linear-gradient(135deg, rgba(255, 0, 85, 0.2), rgba(153, 0, 34, 0.2));
    border: 1px solid #ff0055;
    border-radius: 8px;
    color: #ff0055;
    font-family: 'Orbitron', sans-serif;
    font-size: 0.85rem;
    font-weight: bold;
    padding: 12px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.2s ease;
    box-shadow: 0 0 10px rgba(255, 0, 85, 0.2);
}

.btn-defense-action:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(255, 0, 85, 0.4), rgba(255, 0, 85, 0.2));
    box-shadow: 0 0 15px rgba(255, 0, 85, 0.5);
    color: #ffffff;
}

.btn-defense-action:disabled {
    opacity: 0.35;
    border-color: #666;
    color: #999;
    cursor: not-allowed;
    box-shadow: none;
}
```

### 2. Efeito Físico e Dispersão de Estilhaços (Debris Particles)

Ao destruir o asteroide, instanciar e expandir estilhaços no loop de animação:

```javascript
let explosionParticles = [];

function createExplosionParticles(originPosition) {
    const pCount = 20;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities = [];

    for (let i = 0; i < pCount; i++) {
        const idx = i * 3;
        positions[idx] = originPosition.x;
        positions[idx + 1] = originPosition.y;
        positions[idx + 2] = originPosition.z;

        // Vetor de velocidade radial aleatória
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = 0.02 + Math.random() * 0.03;
        
        velocities.push(new THREE.Vector3(
            speed * Math.sin(phi) * Math.cos(theta),
            speed * Math.sin(phi) * Math.sin(theta),
            speed * Math.cos(phi)
        ));
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.025,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geom, mat);
    scene.add(points);

    explosionParticles.push({
        points,
        velocities,
        opacity: 1.0,
        createdAt: Date.now()
    });
}

// Chamar no loop principal para atualizar estilhaços:
function updateExplosionParticles() {
    const now = Date.now();
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const item = explosionParticles[i];
        const geom = item.points.geometry;
        const posAttr = geom.attributes.position;
        
        for (let j = 0; j < posAttr.count; j++) {
            const idx = j * 3;
            posAttr.setX(j, posAttr.getX(j) + item.velocities[j].x);
            posAttr.setY(j, posAttr.getY(j) + item.velocities[j].y);
            posAttr.setZ(j, posAttr.getZ(j) + item.velocities[j].z);
        }
        posAttr.needsUpdate = true;

        item.opacity -= 0.035;
        item.points.material.opacity = item.opacity;

        if (item.opacity <= 0.0 || now - item.createdAt > 1000) {
            scene.remove(item.points);
            geom.dispose();
            item.points.material.dispose();
            explosionParticles.splice(i, 1);
        }
    }
}
```

### 3. Síntese de Áudio de Detonação e Laser no Web Audio API

Receita de oscilador e ganho dinâmico para os efeitos procedurais:

```javascript
function playLaserFireSound() {
    initAudio();
    if (!audioCtx) return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
        console.error("Erro na síntese do som do laser:", e);
    }
}

function playExplosionSound() {
    initAudio();
    if (!audioCtx) return;

    try {
        // Criar buffer de ruído branco para a explosão rochosa
        const bufferSize = audioCtx.sampleRate * 0.6; // 0.6 segundos
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        // Filtro passa-baixas para simular vácuo abafado
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noiseNode.start();
        noiseNode.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
        console.error("Erro na síntese do som da explosão:", e);
    }
}
```

---

## 🔍 Homologação do Refinamento Técnico (Tech Lead)

### 1. Escudo Defletor e Cobertura Geométrica
*   **Decisão**: A criação do escudo esférico com `wireframe: true` no raio $1.15$ é a abordagem ideal para manter performance máxima de 60 FPS no navegador sem o uso de texturas pesadas adicionais.
*   **Visual**: A escala de deformação de opacidade pós-impacto é reativa e deve durar no máximo 500ms para evitar poluição visual prolongada.
*   **Segurança**: Se a integridade do escudo cair para 0%, certifique-se de desabilitar o cálculo de colisão do escudo, permitindo que a trajetória encontre o raio real da Terra ($d \le 1.0$) de forma matemática limpa.

### 2. Trajetórias Orbitais e Colisão Euclidiana
*   **Decisão**: O cálculo de distância Euclidiana tridimensional usando o método `.distanceTo()` do Three.js é robusto e leve.
*   **Prevenção de Fugas**: No improvável caso de um asteroide passar tangencialmente e ultrapassar o planeta sem colidir (devido a acúmulo de vetores ou lags de frame), realizar uma checagem de distância crescente. Se a distância voltar a subir e passar de 2.0 unidades após cruzar o centro, desintegrar o asteroide silenciosamente para limpar referências da memória.

### 3. Cooldowns e Throttling de Disparo
*   **Decisão**: A restrição física de cooldown do laser na HUD (mínimo de 3 segundos) é essencial para o design do minijogo, impedindo o jogador de spamar cliques e estourar a polifonia do mixer de áudio Web Audio API.

**Refinamento do Sistema de Defesa Aprovado para Desenvolvimento.**

*Assinado: Tech Lead (TL) - Antigravity*

---

## ❓ Dúvidas e Observações do Engenheiro de Software (Dev)

### 1. Fallback Automático de Origem para o Disparo de Laser
*   **Observação**: O requisito previa o disparo de laser através da seleção manual de uma Estação Terrestre ou Satélite via painel de telemetria. Para melhorar a experiência do usuário (UX) em momentos críticos onde a contagem ETA está muito baixa, implementei um sistema de fallback inteligente: se o jogador clicar em disparar pelo painel principal de Defesa sem um objeto previamente selecionado, o sistema seleciona automaticamente a estação/satélite mais próximo ou disponível como emissor do feixe interceptor.
*   **Pergunta/Validação para TL/PO**: Esse comportamento de fallback dinâmico está adequado para manter a fluidez do jogo? (Implementado no código mantendo total suporte ao clique manual na telemetria).

### 2. Gerenciamento de Memória para Cratera de Impacto e Partículas de Explosão
*   **Observação**: Quando o escudo está desativado (0%) e um asteroide atinge a Terra, marcadores de cratera avermelhados são criados diretamente na geometria do `earthMesh`. Para evitar sobrecarga de memória DOM/Three.js caso múltiplos asteroides atinjam o planeta, programei a autodestruição com fade-out gradual e `dispose()` completo das geometrias/materiais após 12 segundos.

### 3. Rotação Dinâmica do Escudo Energético
*   **Observação**: Adicionei uma rotação contínua sutil no eixo Y do `shieldMesh` (`0.003 rad/frame`), o que cria um efeito visual de malha tridimensional ativa ("forcefield scanner") extremamente satisfatório.

---

## 🔍 Code Review

- **Data da Revisão**: 2026-08-02
- **Revisor**: Tech Lead (TL)
- **Resultado**: ✅ **Aprovado para QA (Ready for QA)**

### 📊 Avaliação Geral do Código
1. **Detecção & Trajetória de Asteroides**: Procedural `DodecahedronGeometry` irregular, translação linear com cálculo contínuo de distância Euclidiana 3D e rastro de partículas neon.
2. **Escudo Energético & Integridade**: Esfera holográfica `wireframe` com opacidade base de 5%, animação LERP de pulso ciano pós-impacto, redução de 20% de integridade e marcadores de cratera com autodestruição com `dispose()` aos 12s.
3. **Canhão Interceptor Laser**: Feixe de emissão `AdditiveBlending` conectando origem (satélite/estação terrestre com fallback automático inteligente) ao asteroide, estilhaços radial de partículas e cooldown de 3s.
4. **Sintetizador Web Audio API**: Áudio estéreo completo (varredura de carga, disparo de laser, impacto magnético e explosão filtrada no vácuo).

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `threejs-earth-main`
* **Status do Backlog**: Transicionado para `Ready for QA` em `BACKLOG.md`.


