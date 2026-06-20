# 📝 TASK-DRIVING_SIMULATOR: Tráfego de Veículos com IA, Ciclo Dia/Noite e Hangar de Modelos de Carros

## 👤 User Story
*   **Como** piloto no minijogo **Driving Simulator**,
*   **Eu quero** desviar de outros veículos trafegando na estrada sob comportamentos de IA, dirigir sob transições dinâmicas de Dia e Noite acionando faróis funcionais e selecionar diferentes carros com atributos físicos únicos,
*   **Para que** a estrada cênica pareça viva, desafiadora e visualmente deslumbrante em todas as horas virtuais.

---

## 🎯 Critérios de Aceitação
1.  **Tráfego de Carros com IA**:
    *   Spawnar aleatoriamente outros veículos na estrada trafegando no mesmo sentido ou em sentido oposto (contra-fluxo).
    *   Os carros de IA devem ter comportamentos distintos: alguns trafegam de forma lenta na faixa direita, outros tentam ultrapassar mudando de faixa de forma inteligente.
    *   Colisões graves com o tráfego causam redução drástica de velocidade ou batida (Game Over).
2.  **Ciclo Dinâmico de Dia/Noite e Faróis (Headlights)**:
    *   Criar uma transição contínua de iluminação do cenário a cada 2 minutos (Dia -> Entardecer -> Noite -> Amanhecer).
    *   Durante a fase noturna, a tela escurece e a visibilidade dos limites da pista e obstáculos cai para 20%.
    *   Adicionar botão para acionar os faróis (ou acionamento automático por sensor de luz). Os faróis devem projetar um gradiente de luz cônico transparente à frente do carro no canvas, revelando a estrada de forma altamente realista.
3.  **Seleção de Modelos de Carros na Garagem**:
    *   Adicionar menu "Garagem" contendo 3 modelos de veículos:
        1.  *Apex Sport (Vermelho)*: Aceleração incrível e velocidade máxima de 240 km/h, porém sensível a derrapagens em curvas acentuadas.
        2.  *Cruiser Sedan (Azul)*: Direção estável, velocidade máxima de 180 km/h, manuseabilidade segura.
        3.  *Atlas SUV (Verde)*: Mais pesado, velocidade máxima de 150 km/h, resistente à grama (não perde velocidade se sair da estrada).

---

## 🛠️ Detalhes Técnicos e Arquitetura (Corrigidos para Three.js 3D Real)
*   **Arquivos Alvo**: `/driving_simulator/index.html`.
*   **Pilha Tecnológica**: O jogo utiliza **Three.js (WebGL 3D)** nativo com câmera em perspectiva e luzes reais, e **não** renderização pseudo-3D Canvas baseada em fatiamento de tela. O refinamento técnico abaixo está alinhado a essa infraestrutura existente.
*   **Controles de Tráfego**:
    *   Criação de malhas tridimensionais adicionais utilizando `THREE.BoxGeometry` e `THREE.CylinderGeometry` para os carros de tráfego IA.
    *   Detecção de colisão baseada em limites delimitadores 3D (`THREE.Box3`) ou distância euclidiana simples no plano horizontal X-Z.
*   **Iluminação e Faróis**:
    *   Uso de `THREE.SpotLight` fixado nas coordenadas frontais do veículo do jogador, com objeto alvo (`spotlight.target`) posicionado à frente para direcionamento preciso.
    *   Efeito volumétrico simulado por cones com gradientes transparentes no material ou partículas leves de poeira noturna.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (A adição de tráfego 3D e ciclo dinâmico eleva a experiência clássica de simulador a outro nível).
*   **Esforço Estimado**: Alta (Manipulação de luzes dinâmicas, sincronização de tempos de ciclo com lerps de cor e HUD de garagem).
*   **Área**: Front-end / Computação Gráfica 3D (Three.js) / Design de Interface.

---

## 🏗️ Refinamento Técnico (Three.js)

Para garantir uma taxa estável de **60 FPS** com física e gráficos 3D envolventes usando Three.js, os seguintes componentes de engenharia foram definidos para implementação.

### 1. Sistema Dinâmico de Tráfego (`TrafficController`)
O tráfego de outros veículos deve rodar com mínimo overhead de CPU/GPU.
*   **Modelagem de Dados**:
    ```typescript
    interface TrafficCar {
      mesh: THREE.Group;        // Grupo 3D contendo o chassi e as rodas
      x: number;                // Posição na faixa (Normalmente -5 ou 5)
      z: number;                // Posição longitudinal na estrada
      speed: number;            // Velocidade escalar (unidades por frame)
      direction: number;        // Direção de tráfego (-1 para contra-fluxo, 1 para fluxo normal)
      lane: 'left' | 'right';   // Faixa atual
      isOvertaking: boolean;    // Flag se está trocando de faixa
      overtakeTimer: number;    // Progresso da interpolação de mudança de faixa
    }
    ```
*   **Mecanismo de Pooling de Veículos**:
    *   Um pool máximo de `6` carros de tráfego.
    *   **Spawn Fora de Tela**: Veículos surgem a uma distância de `120 unidades` à frente ou atrás do jogador e viajam em velocidades variadas. Ao passarem do limite de `z = -150` ou `z = 150`, são reposicionados de forma aleatória nas faixas.
    *   **Inteligência Artificial de Ultrapassagem**:
        *   Caso um veículo rápido se aproxime de um veículo lento na mesma faixa (distância Z < 20 unidades), ele inicia uma manobra de desvio.
        *   A manobra altera dinamicamente sua coordenada X usando `THREE.MathUtils.lerp` de sua faixa atual para a faixa oposta em um período de 1.5 segundos.

### 2. Ciclo Dia/Noite e Gradiente de Iluminação
Para uma imersão máxima, criaremos um ciclo celestial dinâmico sincronizado em tempo real.
*   **Faseamento Temporal (Ciclo de 120 segundos)**:
    1.  `0s - 40s` (**Dia**):
        *   `scene.background` & `scene.fog.color` = `0x87CEEB` (azul céu).
        *   `dirLight.intensity` = `0.8` (luz solar brilhante).
        *   `ambientLight.intensity` = `0.6` (alto preenchimento de sombra).
    2.  `40s - 60s` (**Entardecer**):
        *   Cores transitam suavemente para tons quentes: `0xFD5E53` (laranja sunset).
        *   A intensidade solar cai para `0.2` e a cor solar torna-se avermelhada/dourada (`0xFF6600`).
    3.  `60s - 100s` (**Noite**):
        *   `scene.background` & `scene.fog.color` = `0x07090e` (azul escuro espacial).
        *   `dirLight.intensity` = `0.0` (sem sol).
        *   `ambientLight.intensity` = `0.08` (visibilidade severamente reduzida, apenas luar azulado).
    4.  `100s - 120s` (**Amanhecer**):
        *   Cores transitam de volta para o dia com tons suaves de rosa/amarelo (`0xFFC0CB`).
*   **Algoritmo de Interpolação**:
    No loop principal de atualização (`animate`), a intensidade das luzes e a cor da neblina/fundo devem sofrer `lerp` linear baseados no delta time (`dt`) para evitar cortes abruptos.

### 3. Sistema de Faróis Cônicos (`THREE.SpotLight`)
Durante a fase da noite, a visibilidade cai de forma realista, exigindo o uso dos faróis.
*   **Criação do Spotlight**:
    ```javascript
    const headlight = new THREE.SpotLight(0xFFFFE0, 5.0, 60, Math.PI / 6, 0.8, 1);
    headlight.castShadow = true;
    headlight.position.set(0, 0.8, 1.6); // Posicionado na frente do chassi
    playerCar.add(headlight);
    
    // Objeto alvo móvel
    const headlightTarget = new THREE.Object3D();
    headlightTarget.position.set(0, 0.8, 10); // 10 unidades à frente
    playerCar.add(headlightTarget);
    headlight.target = headlightTarget;
    ```
*   **Volumetria Visual do Feixe**:
    Para um visual premium deslumbrante, criaremos uma malha cônica semitransparente que simula poeira/neblina iluminada:
    ```javascript
    const coneGeom = new THREE.ConeGeometry(5, 40, 16, 1, true);
    coneGeom.translate(0, -20, 0); // Ajusta o pivô para a ponta do cone
    coneGeom.rotateX(Math.PI / 2);  // Aponta para a frente
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFDD,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const lightCone = new THREE.Mesh(coneGeom, coneMat);
    lightCone.position.set(0, 0.8, 20); // Alinhado ao farol
    playerCar.add(lightCone);
    ```

### 4. Hangar de Seleção de Veículos e Física Diferenciada
*   **Interface da Garagem (Overlay UI)**:
    Uma tela flutuante moderna com fundo fosco desfocado (glassmorphism) sobreposta ao Canvas:
    ```html
    <div id="garageScreen">
      <h2>SELECIONE SEU VEÍCULO</h2>
      <div class="card-container">
        <!-- Cards para Apex, Cruiser e Atlas -->
      </div>
      <button id="selectCarBtn">INICIAR CORRIDA</button>
    </div>
    ```
*   **Matriz de Física e Regras de Grama**:
    *   **Apex Sport**: `accel = 0.016`, `maxSpd = 0.38`, `turn = 0.024`, `grassPenalty = 0.50` (50% de velocidade máxima na grama), peso leve.
    *   **Cruiser Sedan**: `accel = 0.010`, `maxSpd = 0.30`, `turn = 0.020`, `grassPenalty = 0.35` (35% de velocidade máxima na grama), estável.
    *   **Atlas SUV**: `accel = 0.007`, `maxSpd = 0.22`, `turn = 0.015`, `grassPenalty = 0.00` (0% de velocidade máxima na grama!), tração integral estável.
    *   **Lógica de Atrito**:
        Se `Math.abs(car.position.x) > 10` (fora da largura de 20 da estrada), o veículo está na grama. Sua aceleração e velocidade máxima são multiplicadas por `(1.0 - grassPenalty)`.

---

## ❓ Dúvidas para o TL ou o PO

1. **Competição da IA contra o Tráfego**:
   * *Dúvida:* A IA do oponente atual caça moedas de forma direta pelo cenário. Como ela deve reagir ao novo tráfego de carros na estrada e ao limite de pista?
   * *Proposta:* A IA do oponente deve ignorar colisões complexas ou devemos implementar um desvio de obstáculo simples baseado em raios (Raycast) para que ela desvie dos carros de tráfego de forma natural?
2. **Ativação dos Faróis**:
   * *Dúvida:* Os faróis devem ser ativados de forma manual pelo jogador usando uma tecla específica ou de forma 100% automática pelo sensor celestial de luminosidade ao escurecer?
   * *Proposta:* Implementar ambos: ativação automática ao anoitecer como padrão (QoL) e permitir que o jogador alterne manualmente via tecla `F` ou `L` a qualquer momento.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

Abaixo estão as definições de arquitetura para guiar a implementação da Task:

### 1. Reação da IA do Oponente ao Tráfego
* **Decisão**: A IA competidora **deve desviar dinamicamente** dos carros de tráfego e do trem para manter a justiça competitiva.
* **Diretriz**:
  * Adicione um sensor de colisão simplificado na IA competidora: antes de mover, faça uma verificação de proximidade contra os veículos de tráfego ativos. Se um veículo estiver a menos de `12 unidades` de distância no plano X-Z e no caminho da IA, adicione uma força de repulsão lateral em X (multiplicando a direção de desvio na rotação da IA) para fazê-la contornar o obstáculo.

### 2. Ativação dos Faróis (Headlights)
* **Decisão**: **Híbrida com foco na experiência do jogador.** Faróis automáticos de fábrica com opção de override manual.
* **Diretriz**:
  * Ao cair da noite (`timeOfDay > 50s`), o farol do jogador e da IA devem ligar automaticamente.
  * O jogador terá a liberdade de ligar/desligar a qualquer momento pressionando a tecla `F` (Flashlight/Farol) ou clicando em um botão discreto de farol na interface HUD. A tecla `F` deve alternar o estado ativo da malha de cone volumétrico e da luz `THREE.SpotLight`.

### 3. Efeito Visual de Derrapagem (Apex Sport Grip)
* **Decisão**: O Apex Sport deve ter um feedback de "drift" visual para justificar sua altíssima velocidade e incentivar a maestria do jogador.
* **Diretriz**:
  * Se o jogador estiver dirigindo o *Apex Sport* e realizar uma curva fechada (`turnSpeed` ativo) acima de `75% da velocidade máxima`, aplique uma força centrífuga lateral menor que empurra o carro ligeiramente para fora da curva, gerando uma rotação visual no chassi ligeiramente desalinhada com o vetor de movimento (simulando drift). Adicione marcas de derrapagem pretas temporárias na pista geradas por planos planos curtos (`THREE.PlaneGeometry`) no chão atrás das rodas traseiras.

### 4. Otimização de Sombras em Dispositivos Modestos
* **Decisão**: SpotLights geram alto processamento de sombras. Mantenha a performance estável limitando as sombras projetadas.
* **Diretriz**:
  * Ative sombras projetadas (`castShadow = true`) apenas nos faróis do jogador.
  * Para os carros de tráfego da IA, seus faróis noturnos (opcionais para estética) devem ser apenas luzes básicas `THREE.PointLight` de baixa intensidade ou puramente visuais (sem gerar sombras reais) para economizar recursos gráficos e sustentar os **60 FPS**.

