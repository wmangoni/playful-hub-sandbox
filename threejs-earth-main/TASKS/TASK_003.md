# 📝 TASK-THREEJS_EARTH: Estações de Observação Climatológica, Tempestades Solares / Auroras Boreais e Rastreamento de Satélites em Tempo Real

## 👤 User Story
*   **Como** entusiasta de simulações planetárias e observador espacial no **Three.js Earth**,
*   **Eu quero** selecionar estações terrestres de observação e satélites ativos para monitorar sua telemetria científica, simular tempestades solares dinâmicas com auroras polares brilhantes e lidar com alertas sonoros e visuais de colisões de detritos espaciais,
*   **Para que** a visualização global se torne um centro de controle e laboratório interativo com alto nível de game feel, imersão sonora e realismo visual.

---

## 🎯 Critérios de Aceitação

1.  **Seleção Interativa de Alvos e Console de Telemetria (Targeting & Sidebar)**:
    *   Mapear e renderizar 3 estações terrestres famosas usando coordenadas reais convertidas:
        *   *Cabo Canaveral (EUA)*: `lat: 28.3922`, `lon: -80.6077`
        *   *Baikonur (Cazaquistão)*: `lat: 45.9650`, `lon: 63.3050`
        *   *Kourou (Guiana Francesa)*: `lat: 5.1597`, `lon: -52.6502`
    *   As estações terrestres devem ser representadas na superfície esférica por pequenos anéis ciano neon brilhantes pulsantes (raio do anel oscilando dinamicamente).
    *   Implementar a detecção de cliques tridimensionais usando `THREE.Raycaster` para permitir que o usuário selecione:
        *   Qualquer um dos 5 satélites em órbita.
        *   Qualquer uma das 3 estações terrestres de monitoramento.
        *   O pino de geolocalização do próprio usuário (criado na TASK_002).
    *   Ao clicar em um alvo, a câmera e os `OrbitControls` devem transitar suavemente (interpolação LERP de posição e vetor target) para focar e centralizar a visualização no objeto selecionado.
    *   Exibir uma janela glassmorphism elegante no canto superior direito mostrando:
        *   Nome do Alvo e Categoria (ex: "Satélite Polar #2", "Estação de Baikonur").
        *   Telemetria Dinâmica Simulada (latitude/longitude, velocidade orbital/angular, altitude, sinal de recepção com oscilações aleatórias realistas e status dos subsistemas).
        *   Um botão "Liberar Foco" para retornar a câmera à órbita global padrão da Terra.

2.  **Vento Solar, Auroras Polares e Tempestades Geomagnéticas (Auroras & Shaders)**:
    *   Criar um emissor de partículas leves e alongadas que viajam da direção da luz solar (Sun) contornando a Terra, simulando o fluxo de vento solar.
    *   Renderizar as **Auroras Polares** (Boreal no Norte e Austral no Sul) usando anéis tridimensionais (ex: `THREE.TorusGeometry` ou caminhos circulares finos) achatados sobre os polos terrestres (altura Y aproximada de $0.95$ e $-0.95$).
    *   O material da aurora deve ser semitransparente com blending aditivo (`THREE.AdditiveBlending`) e usar cores neon verde e ciano. A textura ou cor do material deve oscilar no tempo (usando ruído senoidal nos shaders ou translação contínua de malha) para dar a sensação de flutuação e ondulação cortina da aurora.
    *   Integrar um controle deslizante "Tempestade Solar" na HUD de controle existente:
        *   Mudar o slider deve aumentar proporcionalmente a opacidade e o diâmetro das auroras.
        *   Deve acelerar a velocidade e a intensidade de brilho das partículas do vento solar.
        *   Se o slider passar de 80% (Tempestade Extrema), acionar um filtro visual sutil de glitch (ruído analógico estático simulado com pequenas linhas de varredura intermitentes em CSS ou shader de pós-processamento) simulando "interferência geomagnética de sinal na HUD".

3.  **Lixo Espacial (Space Debris) e Sistema de Evacuação/Alerta de Colisão**:
    *   Instanciar de 30 a 50 pequenos fragmentos geométricos cinzentos (ex: tetraedros ou esferas de baixo polígono de cor cinza neon com `emissive: 0x444444`) orbitando o planeta de forma caótica em raios entre $1.4$ e $2.0$ com velocidades variadas.
    *   No loop `animate()`, calcular a distância tridimensional Euclidiana entre cada satélite ativo e todos os fragmentos de lixo espacial.
    *   Se um fragmento de lixo espacial entrar em um raio crítico de colisão ($d < 0.15$ unidades) de qualquer satélite:
        *   O satélite sob risco deve exibir um anel vermelho piscando rapidamente ao seu redor.
        *   A HUD lateral deve exibir um sinal de aviso vibrante: `COLLISION WARNING: DEBRIS OBJ-[ID]`.
        *   Tocar um som de alarme tático (bipe de radar/sonar intermitente de alta frequência) sintetizado em tempo real via **Web Audio API** (sem arquivos MP3 externos), ativado apenas quando o risco é iminente.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/threejs-earth-main/index.js` (e possivelmente criação de novos elementos no HUD DOM em `index.html` ou arquivos de apoio em `src/`).
*   **Raycasting 3D para Interatividade**:
    ```javascript
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerDown(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        
        // Obter interseções com satélites, estações e o pino de geo-ip
        const intersects = raycaster.intersectObjects(clickableObjects, true);
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            selectTarget(hitObject);
        }
    }
    ```
*   **Câmera e Foco Orbitais (Suavidade)**:
    *   Ao travar em um alvo, alterar o `controls.target` progressivamente usando LERP:
        ```javascript
        controls.target.lerp(targetWorldPosition, 0.05);
        ```
    *   A posição da câmera deve se mover mantendo uma distância confortável, permitindo que o usuário ainda controle a rotação ao redor do alvo focado.
*   **Síntese de Áudio com Web Audio API**:
    *   Criar um sintetizador simples para o sinal de proximidade para garantir conformidade e evitar requests HTTP/bloqueios de CORS:
    ```javascript
    let audioCtx = null;
    let alarmInterval = null;

    function playCollisionAlarm() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (alarmInterval) return; // Alarme já tocando
        
        alarmInterval = setInterval(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Tom agudo
            
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2); // Declínio rápido
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        }, 300); // Repetir a cada 300ms
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Adiciona interatividade mecânica avançada de jogo, transformando um visualizador passivo em um console de monitoramento ativo).
*   **Esforço Estimado**: Média-Alta (Interpolação de câmera com OrbitControls e raycasting de precisão exigem calibração detalhada, além do sistema de partículas e shaders).
*   **Área**: Front-end / Computação Gráfica (WebGL/ThreeJS) / Web Audio API.

---

## ⚙️ Refinamento Técnico (Technical Refinement)

Abaixo está o plano arquitetural detalhado para o desenvolvimento das novas mecânicas no **Three.js Earth**.

### 1. Renderização das Estações Terrestres e Raycasting de Alvos

#### A. Mapeamento Cartográfico Tridimensional
Convertendo as coordenadas das 3 estações utilizando a mesma projeção cartesiana geográfica já refinada e validada no projeto:
*   **Cabo Canaveral**: `convertGeoToCartesian(28.3922, -80.6077, 1.01)`
*   **Baikonur**: `convertGeoToCartesian(45.9650, 63.3050, 1.01)`
*   **Kourou**: `convertGeoToCartesian(5.1597, -52.6502, 1.01)`

Cada estação será representada por uma pequena malha circular no `earthMesh` para que gire em conjunto com o planeta:
```javascript
function createStationMarker(position, name) {
    const marker = new THREE.Group();
    marker.name = name;
    marker.userData = { type: 'station', name: name };

    // Pequeno anel de luz neon ciano
    const ringGeo = new THREE.RingGeometry(0.015, 0.025, 16);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    marker.add(ringMesh);

    // Pequeno ponto emissor central
    const dotGeo = new THREE.SphereGeometry(0.008, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    marker.add(dotMesh);

    marker.position.copy(position);
    
    // Alinhamento perpendicular à superfície
    const normal = position.clone().normalize();
    marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    earthMesh.add(marker);
    return { marker, ringMesh };
}
```

#### B. Mecânica de Raycasting e Agrupamento de Objetos Clicáveis
Para o raycasting funcionar sem cruzar objetos indesejados da cena (como estrelas ou a própria atmosfera de glow), manteremos uma lista explícita chamada `clickableObjects`:
*   Na criação dos satélites (TASK_002), adicionamos a malha de grupo principal dos satélites em `clickableObjects` e configuramos `mesh.userData = { type: 'satellite', id: index, data: sat }`.
*   Na criação das estações, adicionamos os marcadores em `clickableObjects`.
*   Na criação do pino de geo-ip do usuário, adicionamos em `clickableObjects` com `userData = { type: 'user_pin', name: 'Sua Localização' }`.

---

### 2. Fluxo de Transição Suave de Câmera (LERP & Target Cam)

Para focar no alvo de forma cinematográfica, a câmera não deve apenas "pular" para a coordenada. Faremos uma transição interpolada suave no loop de animação.

*   Definiremos as variáveis de controle global:
    ```javascript
    let currentTarget = null; // Objeto Three.js selecionado
    const originalTarget = new THREE.Vector3(0, 0, 0); // Centro da Terra
    ```
*   No loop `animate()`, se `currentTarget` estiver definido, extraímos sua posição global absoluta (usando `.getWorldPosition(vector)`) e movemos o target dos `OrbitControls` suavemente em direção a ela:
    ```javascript
    if (currentTarget) {
        const targetPos = new THREE.Vector3();
        currentTarget.getWorldPosition(targetPos);
        
        // LERP suave do ponto de foco dos controles
        controls.target.lerp(targetPos, 0.05);

        // Opcional: aproximar a câmera se estiver muito longe
        const camDistance = camera.position.distanceTo(targetPos);
        if (camDistance > 2.2) {
            const direction = new THREE.Vector3().subVectors(camera.position, targetPos).normalize();
            const idealPosition = targetPos.clone().add(direction.multiplyScalar(2.0));
            camera.position.lerp(idealPosition, 0.05);
        }
    } else {
        // Retorna ao centro da Terra
        controls.target.lerp(originalTarget, 0.05);
    }
    ```

---

### 3. Simulação das Auroras Polares e Clima Espacial

As auroras polares serão representadas por malhas tubulares com translucidez ao redor das calotas norte e sul da Terra.

#### A. Criação das Auroras Geométricas
```javascript
function createAuroraRing(yOffset, isNorth) {
    // Torus horizontal achatado com escala ajustada
    const auroraGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 64);
    const auroraMat = new THREE.MeshBasicMaterial({
        color: isNorth ? 0x00ff66 : 0x00aaff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    auroraMesh.position.y = yOffset;
    auroraMesh.rotation.x = Math.PI / 2;
    
    // Escala inicial
    auroraMesh.scale.set(1.0, 1.0, 0.2); // Fita achatada verticalmente
    earthMesh.add(auroraMesh);
    return auroraMesh;
}
```

#### B. Lógica de Oscilação Visual e Acoplamento da Tempestade Solar
No loop `animate()`:
1.  **Ondulação Natural**: Faremos as auroras rotarem assincronamente e terem sua opacidade flutuando com ruído de onda senoidal simples:
    ```javascript
    const time = Date.now() * 0.001;
    auroraNorth.rotation.z = time * 0.05;
    auroraSouth.rotation.z = -time * 0.04;
    
    const stormIntensity = parseFloat(document.getElementById('solarStormSlider').value) || 0.0;
    
    // Opacidade base aumentada pelo slider
    auroraNorth.material.opacity = (0.25 + 0.15 * Math.sin(time * 2.0)) * (1.0 + stormIntensity * 1.5);
    auroraNorth.scale.z = 0.2 + (stormIntensity * 0.3); // Esticar verticalmente na tempestade
    ```
2.  **Partículas de Vento Solar**:
    *   Um array de 40 partículas que nascem em `x = -4.0` (lado do sol) e viajam até `x = 4.0`.
    *   A velocidade delas é multiplicada por `(1.0 + stormIntensity * 2.0)`.

---

### 4. Sistema de Lixo Espacial e Detecção Crítica de Colisão

#### A. Inicialização do Lixo Espacial (Space Debris)
```javascript
const debrisData = [];
const debrisCount = 40;

function createSpaceDebris() {
    const debrisGroup = new THREE.Group();
    scene.add(debrisGroup);

    for (let i = 0; i < debrisCount; i++) {
        // Forma irregular e pequena
        const debrisGeo = new THREE.TetrahedronGeometry(0.015 + Math.random() * 0.01);
        const debrisMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8,
            roughness: 0.4,
            emissive: 0x333333
        });
        const mesh = new THREE.Mesh(debrisGeo, debrisMat);
        
        // Órbitas aleatórias caóticas
        const radius = 1.35 + Math.random() * 0.6;
        const inclination = (Math.random() - 0.5) * Math.PI;
        const speed = (0.003 + Math.random() * 0.007) * (Math.random() > 0.5 ? 1 : -1);
        const angle = Math.random() * Math.PI * 2;

        debrisGroup.add(mesh);
        
        debrisData.push({
            mesh,
            radius,
            inclination,
            speed,
            angle
        });
    }
}
```

#### B. Algoritmo de Loop para Atualização de Posições e Cálculo de Distâncias
A cada frame:
1.  Atualizar as posições de cada partícula de lixo espacial.
2.  Calcular a distância vetorial entre as posições absolutas de cada satélite e de cada partícula de lixo espacial:
    ```javascript
    let hazardDetected = false;
    let threatenedSatMesh = null;

    satellitesMeshes.forEach((satMesh) => {
        const satPos = new THREE.Vector3();
        satMesh.getWorldPosition(satPos);

        debrisData.forEach((debris) => {
            const debMesh = debris.mesh;
            // Atualizar rotação e translação orbital do debris
            debris.angle += debris.speed;
            debMesh.position.x = debris.radius * Math.cos(debris.angle);
            debMesh.position.y = debris.radius * Math.sin(debris.angle) * Math.sin(debris.inclination);
            debMesh.position.z = debris.radius * Math.sin(debris.angle) * Math.cos(debris.inclination);

            const debPos = new THREE.Vector3();
            debMesh.getWorldPosition(debPos);

            const dist = satPos.distanceTo(debPos);
            if (dist < 0.15) {
                hazardDetected = true;
                threatenedSatMesh = satMesh;
            }
        });
    });

    if (hazardDetected) {
        triggerCollisionWarning(threatenedSatMesh);
    } else {
        clearCollisionWarning();
    }
    ```

## 🚀 Status do Desenvolvimento (Refinamento Técnico)

- [x] Interface HTML5 glassmorphism para console de controle lateral e barra de tempestade solar projetada.
- [x] Mapeamento e equações das estações terrestres de monitoramento estruturadas.
- [x] Lógica de raycasting e LERP de câmera com OrbitControls descrita.
- [x] Modelo matemático do vento solar e auroras polares parametrados.
- [x] Estratégia de colisões do lixo espacial e síntese de áudio Web Audio API definida.

### 📋 Diretrizes Técnicas para o Desenvolvedor
1. **Controle do OrbitControls**: A instância do `OrbitControls` na linha 22 deve ser salva em uma variável `const controls = new OrbitControls(...)` para permitir a manipulação de seu target no loop `animate`.
2. **Prevenção de Cliques Falsos**: Apenas meshes na lista `clickableObjects` devem ser consideradas no raycasting. Utilize a busca pelo ancestral correspondente (subindo na árvore hierárquica usando `.parent` se necessário) para recuperar o objeto de topo correto.
3. **Gerenciamento de Áudio e Políticas de Navegador**: O `AudioContext` para sintetizar os bips de aviso de detritos deve permanecer com status `suspended` até que ocorra o primeiro clique ou interação na página, evitando violações de política de reprodução de mídia.
4. **Performance do Loop de Animação**: Os marcadores das estações e o pino geográfico estão no grupo da Terra, então giram dinamicamente. Suas posições devem ser obtidas usando `marker.getWorldPosition(tempVector)` para garantir a precisão no raycasting e nos cálculos de distância.
5. **Efeito de Glitch Estético**: Use translação rápida (`transform: translate`) combinada com sombras de texto coloridas (`text-shadow`) em CSS via animação `@keyframes` e alternância de classe CSS, acionada quando o slider de Tempestade Solar atingir um valor maior ou igual a 80%.

**Status**: `🚀 Ready for QA`

---

## 🔍 Code Review e Homologação (Tech Lead)

### 1. Seleção Interativa e Telemetria
* As estações Cabo Canaveral, Baikonur e Kourou estão mapeadas com suas coordenadas reais e convertidas perfeitamente em posições 3D usando `convertGeoToCartesian`.
* O uso de `THREE.Raycaster` com uma lista isolada `clickableObjects` protege contra cliques fantasmas em estrelas, atmosfera ou nuvens.
* A centralização suave da câmera via LERP no `controls.target` com a manutenção da órbita do usuário é impecável e não introduz tremores ou quebras nos controles.

### 2. Tempestades Solares e Auroras
* A representação de auroras usando `THREE.TorusGeometry` com blending aditivo neon ciano/verde é extremamente limpa.
* A integração do slider de Tempestade Solar aumenta adequadamente a opacidade e escala das auroras e a velocidade do vento solar.
* O efeito de glitch analógico intermitente e alteração HSL nos shaders/materiais a partir de 80% do slider confere um visual incrivelmente premium à simulação.

### 3. Lixo Espacial e Detecção de Colisão
* Instanciação e órbita caótica estável para os 40 detritos ao redor da Terra (raios de 1.4 a 2.0).
* O cálculo de distância euclidiana tridimensional no loop é eficiente. O disparo do alarme visual (anel piscante e aviso lateral) e do som de bipe sonar procedural via Web Audio API cumprem com perfeição os critérios de aceitação.

**Resultado da Avaliação**: APROVADO. A interatividade e estética do console de monitoramento planetário ficaram impecáveis.

*Assinado: Tech Lead (TL) - Antigravity*

---

## 🧪 Evidencias de Testes (QA Test Evidence)

A tarefa foi validada e testada com sucesso via automação baseada em Puppeteer.

### 📋 Resultados da execução da suíte de testes E2E (`tests/qa_threejs_earth.test.js`)
```
--- STARTING QA TEST SUITE FOR THREE.JS EARTH (TASK_003) ---
Loading puppeteer (ESM)...
Test server running on http://127.0.0.1:3093

--- Test 1: Verifying HUD layout & controls ---
Control panel exists: true
Toggles exist: Satellites=true, SolarWind=true, Auroras=true, Debris=true, Alarm=true
Solar Storm Slider exists: true

--- Test 2: Verifying WebGL data structures & hooks ---
WebGL and task data structs valid: true

--- Test 3: Testing raycast selection & telemetry sidebar ---
Sidebar initially visible: false
Simulating target click on Station Cabo Canaveral...
Sidebar visible after click: true, Target Name: "Cabo Canaveral (EUA)"
Clicking "Liberar Foco" button...
Sidebar visible after release: false

--- Test 4: Testing solar storm slider & geomagnetic glitch effects ---
Scanlines active initially: false
Setting solar storm to 90% (Extreme storm)...
Scanlines active after storm: true, Panels glitching: true

--- Test 5: Testing show/hide toggles ---
Toggling off satellites...
Satellites group visible: false

=============================================
🎉 ALL THREEJS-EARTH TASK_003 TESTS PASSED SUCCESSFULLY!
=============================================
```
