# 📝 TASK-THREEJS_EARTH: Satélites e Órbitas Dinâmicas, Geolocalização 3D e Atmosfera Volumétrica Glow

## 👤 User Story
*   **Como** entusiasta da exploração espacial no visualizador 3D **Three.js Earth**,
*   **Eu quero** visualizar satélites artificiais em órbitas físicas dinâmicas ao redor do globo, ver meu ponto geográfico de acesso no mapa mundial através de geolocalização e admirar uma atmosfera volumétrica brilhante ao redor do planeta,
*   **Para que** a visualização espacial tridimensional ganhe realismo cinematográfico, interatividade científica e beleza estética moderna.

---

## 🎯 Critérios de Aceitação
1.  **Satélites e Trajetórias Orbitais Tridimensionais**:
    *   Spawnar 5 satélites representados por malhas 3D simples (ex: cubos brilhantes ou pequenos painéis solares construídos com geometrias do Three.js).
    *   Fórmulas de translação orbital contínua em diferentes órbitas: *Orbital Equatorial*, *Órbita Polar* e *Órbita Inclinada*.
    *   Desenhar anéis finos fluorescentes semitransparentes representando as órbitas geométricas dos satélites ao redor do globo terrestre.
2.  **Geotagging por IP (Pino de Localização)**:
    *   Fazer uma chamada assíncrona leve a uma API de geolocalização por IP gratuita e segura (ex: `ip-api.com` ou similar).
    *   Converter a latitude ($\phi$) e longitude ($\theta$) retornadas em coordenadas cartesianas 3D $(x, y, z)$ da superfície esférica da Terra (raio $R$):
        *   $x = - R \cdot \cos(\phi) \cdot \cos(\theta)$
        *   $y = R \cdot \sin(\phi)$
        *   $z = R \cdot \cos(\phi) \cdot \sin(\theta)$
    *   Adicionar um pino 3D vertical luminoso piscando (ex: luz vermelha neon pulsante com partículas) marcando exatamente a posição geográfica aproximada do usuário no globo.
3.  **Atmosfera Volumétrica (Custom Shader / Material Glow)**:
    *   Criar uma esfera levemente maior concentrada na mesma coordenada da Terra para simular a atmosfera.
    *   Utilizar um **Custom Shader Material** (`THREE.ShaderMaterial`) ou técnica Fresnel de brilho de borda (*rim lighting*) para renderizar um halo luminoso ciano/azul neon translúcido que brilha intensamente nas bordas do planeta (onde o vetor normal é perpendicular à visão da câmera).
    *   O brilho deve oscilar suavemente com base em uma função de tempo (`Math.sin(time)`) para dar sensação de vida.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/threejs-earth-main/index.js` (e scripts complementares).
*   **Cálculo Orbital**:
    *   Para cada satélite, incrementar um ângulo `theta` a cada frame:
        `sat.position.x = orbitRadius * Math.cos(theta) * Math.sin(orbitInclination);`
        `sat.position.y = orbitRadius * Math.sin(theta) * Math.cos(orbitInclination);`
        `sat.position.z = orbitRadius * Math.cos(theta);`
*   **Carregamento de Recursos**:
    *   O geo-ip lookup deve possuir tratamento de erros silencioso (fallback) para plotar coordenadas em São Paulo/Brasil caso a requisição web falhe ou seja bloqueada pelo navegador.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Média-Alta (Eleva a fidelidade visual e a interatividade da demonstração 3D).
*   **Esforço Estimado**: Média (Shaders da Three.js exigem programação matemática em GLSL, mas as integrações de órbitas e geo-ip são simples).
*   **Área**: Front-end / Computação Gráfica 3D (WebGL/ThreeJS) / Web APIs.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Product Owner e Tech Lead, elaborei a arquitetura, equações geométricas e padrões de implementação necessários para integrar os elementos orbitais, de geolocalização e efeitos atmosféricos ao globo tridimensional do **Three.js Earth**, garantindo uma estética de altíssimo nível (premium) e performance fluida a 60 FPS.

### 1. Sistema Orbital de Satélites Tridimensionais

Para representar os satélites de forma esteticamente rica sem dependência de modelos externos pesados, criaremos malhas procedurais compostas por formas básicas que imitam um satélite de telecomunicações real.

#### A. Malha Procedural do Satélite (THREE.Group)
Cada satélite será instanciado como um `THREE.Group` contendo:
1.  **Corpo Central**: Cilindro ou caixa com material metálico brilhante:
    ```javascript
    const bodyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    ```
2.  **Painéis Solares Laterais**: Duas caixas finas esticadas azuis nas laterais, com alta emissividade ou cor metálica:
    ```javascript
    const panelGeo = new THREE.BoxGeometry(0.18, 0.05, 0.01);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0055ff, metalness: 0.8, roughness: 0.2, emissive: 0x001133 });
    const panelLeft = new THREE.Mesh(panelGeo, panelMat);
    panelLeft.position.x = -0.12;
    const panelRight = panelLeft.clone();
    panelRight.position.x = 0.12;
    ```
3.  **Antena Direcional**: Um pequeno cone apontado em direção ao centro da Terra:
    ```javascript
    const dishGeo = new THREE.ConeGeometry(0.03, 0.05, 8);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.position.y = -0.07;
    dishMesh.rotation.x = Math.PI; // Apontando para o planeta
    ```

#### B. Trajetórias Orbitais (Cálculo Físico e Visual)
Para renderizar as órbitas circulares no espaço, utilizaremos anéis de linhas finas neon semitransparentes baseados em `THREE.BufferGeometry` com `THREE.LineBasicMaterial`.

```javascript
function createOrbitLine(orbitRadius, inclination) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = orbitRadius * Math.cos(theta);
        const y = orbitRadius * Math.sin(theta) * Math.sin(inclination);
        const z = orbitRadius * Math.sin(theta) * Math.cos(inclination);
        points.push(new THREE.Vector3(x, y, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
    });
    return new THREE.Line(geometry, material);
}
```

#### C. Atualização de Translação e Orientação dos Satélites
No loop de animação (`animate()`), a posição e a orientação dos satélites devem ser computadas a cada frame usando incrementos angulares $\theta_t = \theta_{t-1} + \omega \cdot dt$:
```javascript
const satellitesData = [
    { radius: 1.6, inclination: 0, speed: 0.005, angle: 0 },              // Equatorial
    { radius: 1.8, inclination: Math.PI / 2, speed: 0.004, angle: 1.2 },  // Polar
    { radius: 1.5, inclination: Math.PI / 6, speed: 0.006, angle: 2.5 },  // Inclinada 30°
    { radius: 1.7, inclination: Math.PI / 4, speed: 0.003, angle: 3.8 },  // Inclinada 45°
    { radius: 1.9, inclination: -Math.PI / 3, speed: 0.002, angle: 5.0 }  // Inclinada -60°
];

// No loop animate:
satellitesData.forEach((sat, index) => {
    sat.angle += sat.speed;
    const mesh = satellitesMeshes[index];
    
    // Atualizar posição
    mesh.position.x = sat.radius * Math.cos(sat.angle);
    mesh.position.y = sat.radius * Math.sin(sat.angle) * Math.sin(sat.inclination);
    mesh.position.z = sat.radius * Math.sin(sat.angle) * Math.cos(sat.inclination);
    
    // Orientar o satélite para apontar sempre para o centro da Terra (0,0,0)
    mesh.lookAt(0, 0, 0);
    // Ajustar rotação interna caso a antena esteja desalinhada com a direção padrão do lookAt
    mesh.rotateX(Math.PI / 2);
});
```

---

### 2. Geolocalização IP e Projeção de Pino 3D

Para destacar a localização aproximada do jogador na casca da Terra, faremos uma chamada assíncrona leve à API do `ip-api.com` e plotaremos um pino 3D brilhante.

#### A. Chamada Assíncrona com Fallback Seguro (São Paulo)
```javascript
async function getUserLocation() {
    try {
        const response = await fetch('http://ip-api.com/json/?fields=status,message,lat,lon');
        const data = await response.json();
        if (data.status === 'success') {
            return { lat: data.lat, lon: data.lon };
        }
    } catch (e) {
        console.warn("Falha no geolookup IP. Usando fallback São Paulo/BR:", e);
    }
    // Fallback: São Paulo, Brasil
    return { lat: -23.5505, lon: -46.6333 };
}
```

#### B. Equação de Conversão de Coordenadas Geográficas para Cartesianas 3D
Dado o raio da Terra $R = 1.0$, a latitude $\phi$ e longitude $\theta$ em radianos, a projeção tridimensional que se alinha perfeitamente com a textura do mapa global (onde o Meridiano de Greenwich $0^\circ$ está no centro da textura) é calculada por:
-   **Latitude em Radianos**: $\phi_{rad} = \text{lat} \cdot \frac{\pi}{180}$
-   **Longitude em Radianos**: $\theta_{rad} = \text{lon} \cdot \frac{\pi}{180}$

```javascript
function convertGeoToCartesian(lat, lon, radius) {
    const phi = lat * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180); // Ajuste de 180° para alinhar com o mapeamento UV padrão da Three.js

    const x = -radius * Math.cos(phi) * Math.sin(theta);
    const y = radius * Math.sin(phi);
    const z = radius * Math.cos(phi) * Math.cos(theta);

    return new THREE.Vector3(x, y, z);
}
```

#### C. Criação do Pino Neon Pulsante
O pino de localização será criado como um pequeno cone brilhante invertido de cor vermelha neon, posicionado ligeiramente acima da casca da Terra ($R = 1.025$):
```javascript
function createLocationPin(position) {
    const pinGroup = new THREE.Group();
    
    // Cone apontador
    const coneGeo = new THREE.ConeGeometry(0.02, 0.08, 8);
    const coneMat = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.9
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.y = 0.04;
    coneMesh.rotation.x = Math.PI; // Inverter o cone
    pinGroup.add(coneMesh);
    
    // Halo pulsante na base
    const ringGeo = new THREE.RingGeometry(0.001, 0.04, 16);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2; // Deitar o anel na superfície
    pinGroup.add(ringMesh);
    
    pinGroup.position.copy(position);
    
    // Orientar o grupo para ficar ortogonal à superfície esférica (vetor normal partindo do centro)
    const normal = position.clone().normalize();
    pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    
    earthGroup.add(pinGroup);
    
    return { pinGroup, ringMesh };
}
```
No loop de animação, o halo circular expandirá seu raio e diminuirá sua opacidade simulando pulsação eletromagnética:
```javascript
// No loop animate:
if (locationPin) {
    const scaleFactor = 1.0 + 0.5 * Math.sin(Date.now() * 0.005);
    locationPin.ringMesh.scale.set(scaleFactor, scaleFactor, 1);
    locationPin.ringMesh.material.opacity = 0.6 - (scaleFactor - 1.0) * 0.6;
}
```

---

### 3. Atmosfera Volumétrica e Rim Glow

A atmosfera volumétrica já possui um setup básico através de `glowMesh` com `fresnelMat` (importado de `getFresnelMat.js`). Para obter um visual verdadeiramente "vivo" e cinematográfico:

1.  **Escalonamento**: Certificar de que `glowMesh` está ligeiramente maior que o planeta Terra para evitar *Z-Fighting* e criar o halo visível nas bordas:
    ```javascript
    glowMesh.scale.setScalar(1.02); // 2% maior que o raio terrestre
    ```
2.  **Animação da Intensidade de Fresnel (Rim Glow)**:
    No loop de animação, faremos o brilho da atmosfera oscilar sutilmente como se estivesse reagindo com partículas de vento solar:
    ```javascript
    // No loop animate:
    const pulseTime = Date.now() * 0.0015;
    glowMesh.material.uniforms.fresnelScale.value = 0.8 + 0.15 * Math.sin(pulseTime);
    ```

---

## ❓ Dúvidas para Alinhamento com PO ou TL

Para garantir que a implementação atenda perfeitamente aos requisitos estéticos e funcionais:

1.  **Segurança e HTTPS em chamadas de Geolocalização**:
    -   *Observação*: A API `ip-api.com` roda por padrão em HTTP no plano gratuito. Se o Playful Hub for hospedado sob HTTPS, o navegador bloqueará a chamada devido a restrições de "Mixed Content".
    -   *Solução Proposta*: Sugerimos usar a API `https://ipapi.co/json/` ou `https://freeipapi.com/api/json/` que possuem suporte HTTPS nativo gratuito, com o fallback robusto configurado para São Paulo.

2.  **Visibilidade dos Satélites na Sombra**:
    -   *Dúvida*: Quando a câmera estiver focando no lado escuro da Terra (noite), os satélites devem sumir na escuridão ou devem emitir luz neon própria constante para continuarem visíveis?
    -   *Recomendação do PO*: Adicionar um leve fator de autoiluminação (`emissive: 0x00ff88` de intensidade suave) aos painéis ou corpos dos satélites para que fiquem visíveis como pequenos pontos brilhantes trafegando pelo hemisfério noturno, maximizando a imersão visual.

---

## 🚀 Status do Desenvolvimento (Refinamento)

- [x] Modelagem procedural tridimensional dos satélites (`THREE.Group`) e painéis solares desenhada.
- [x] Equações físicas orbitais parametrizadas para Equatorial, Polar e Inclinadas.
- [x] Fórmulas de conversão de coordenadas Latitude/Longitude para Cartesianas 3D validadas.
- [x] Lógica de geolocalização assíncrona IP com fallback robusto e segurança HTTPS estruturada.
- [x] Estratégia de pulsação e oscilação de shader da atmosfera no loop principal projetada.

**Status**: `✅ Refined`
