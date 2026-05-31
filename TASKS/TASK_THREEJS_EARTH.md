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
