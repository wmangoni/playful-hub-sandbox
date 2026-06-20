# 📝 TASK-VOXEL_CITY: Sistema de Perseguição Policial, Upgrade de Carros e Cargas Especiais (Crazy Taxi/GTA Style)

## 👤 User Story
*   **Como** motorista destemido no simulador de entregas voxel em 3D **Voxel City**,
*   **Eu quero** enfrentar perseguições policiais reativas se infringir as leis ou atropelar pedestres, poder gastar meus lucros em uma garagem para tunar meus carros (velocidade, aceleração, estabilidade e blindagem), e realizar entregas de cargas especiais (VIPs exigentes, encomendas frágeis ou expressas),
*   **Para que** a experiência de exploração livre e direção no mundo aberto tridimensional se torne desafiadora, emocionante, tática e extremamente imersiva.

---

## 🎯 Critérios de Aceitação

### 1. Sistema de Wanted Level (Nível de Procura Policial)
*   **Acionador de Alerta**: Criar uma barra de alerta ou estrelas de procurado (0 a 5 estrelas) na HUD. Ações hostis aumentam o nível de procura:
    *   Colidir com carros de civis: +1 nível de procurado (de forma gradual).
    *   Atropelar pedestres civis: +2 níveis de procurado instantaneamente.
*   **Ação da Polícia**:
    *   Se `wantedLevel > 0`, viaturas policiais (modelos voxel especiais com giroflex piscando em azul e vermelho) devem surgir proceduralmente e perseguir ativamente o carro do jogador.
    *   A IA da polícia deve calcular a rota direta até o jogador, acelerando e tentando cercar o veículo.
    *   **Busted (Preso!)**: Se uma viatura policial encostar no carro do jogador (distância < 3.5 unidades) por mais de 1.8 segundos acumulados, a tela escurece exibindo "BUSTED!", o jogador é preso, perde $200 do saldo e a carga atual é perdida.
*   **Evasão**: O nível de procura diminui gradualmente se o jogador passar 10 segundos sem causar incidentes e fora da linha de visão direta das viaturas. Adicionar maletas de "Suborno Policial" verdes piscantes nas calçadas que reduzem -1 estrela ao serem coletadas.

### 2. Garagem e Sistema de Upgrades (Tuning)
*   **Economia Local**: Adicionar o conceito de Dinheiro (`state.money`). Cada entrega com sucesso concede um pagamento entre $100 e $400.
*   **Acesso à Garagem**: Adicionar uma zona de "Garagem" demarcada por um cilindro luminoso amarelo neon rotativo com um ícone de chave inglesa em 3D sobreposto. Ao estacionar na zona e pressionar `G`, o jogo pausa e abre o painel da Garagem.
*   **Mecânicas de Upgrade**:
    1.  *Motor (Velocidade Máxima)*: Aumenta o limite de velocidade do veículo atual em +20% por nível (Máx: Nível 3).
    2.  *Turbo (Aceleração)*: Melhora o tempo para atingir a velocidade máxima.
    3.  *Freio & Tração (Handling)*: Reduz a inércia de derrapagem (drift) nas curvas, permitindo curvas mais fechadas.
    4.  *Blindagem (Resistência)*: Permite colidir mais vezes sem danificar a carga ou quebrar o motor.
*   **Pintura Personalizada**: Opção na Garagem para alterar a cor do carro ativo escolhendo entre 4 cores premium neon vibrantes (Ciano, Magenta, Amarelo e Roxo).

### 3. Cargas Especiais e Clientes Especiais
*   **Tipos de Carga**: No início de cada missão, o tipo de entrega é sorteado aleatoriamente e gera modificadores específicos na HUD:
    1.  *Carga Frágil (Taça de Cristal)*: Exibe uma barra de "Integridade da Carga" (100%). Cada colisão forte com prédios ou outros veículos reduz de 10% a 25% da integridade. Se chegar a 0%, a entrega falha instantaneamente.
    2.  *Entrega Expressa (Relógio de Sol)*: O tempo para entrega é extremamente curto (ex: 45 segundos), porém o pagamento é dobrado.
    3.  *Cliente VIP (Holograma de Coroa)*: O passageiro é extremamente exigente. A velocidade média deve ser alta, mas caso o jogador ative qualquer nível de Wanted Level, a missão falha imediatamente porque o VIP entra em pânico.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/voxel_city/index.html`.
*   **Extensão do Estado do Jogo (`state`)**:
    ```javascript
    const state = {
        score: 0,
        money: 500, // Saldo inicial para permitir upgrades rápidos
        wantedLevel: 0, // 0 a 5
        wantedProgress: 0, // Acúmulo de infrações
        cargoType: 'standard', // 'standard', 'fragile', 'express', 'vip'
        cargoHealth: 100, // Para cargas frágeis
        expressTimeLeft: 0, // Cronômetro de carga expressa
        playerCarStats: {
            speedLevel: 1,
            accelLevel: 1,
            steerLevel: 1,
            armorLevel: 1,
            color: 0xff0055 // Cor padrão
        },
        bustedTimer: 0,
        isBusted: false,
        inGarage: false
    };
    ```
*   **Policiamento (`PoliceSystem`)**:
    *   Criar uma classe `PoliceCar` derivada ou estruturada de maneira similar a `Car`, mas com mecânica de aproximação (`seek` behavior) usando cálculo de direção `playerPos.clone().sub(policePos).normalize()`.
    *   As viaturas policiais devem piscar as luzes do teto alternando a cor de dois pequenos cubos 3D vermelhos/azuis a cada 100ms.
*   **Interface CSS (Estilo Glassmorphism Premium)**:
    *   O painel de Garagem (`#garage-panel`) deve usar `backdrop-filter: blur(15px); background: rgba(10, 15, 30, 0.85); border: 2px solid #00f0ff; box-shadow: 0 0 25px rgba(0, 240, 255, 0.4);`.
    *   Exibir estrelas douradas de procurado (`★ ★ ★ ★ ★`) que acendem com brilho neon pulsante correspondendo ao `state.wantedLevel`.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Adiciona ciclos de repetição viciantes ao gameplay de entregas e insere conflitos/desafios reais).
*   **Esforço Estimado**: Alta (Requer modelagem de IA de perseguição 3D física e interface interativa de UI para upgrades sem perder a integração com a renderização em Three.js).
*   **Área**: Front-end / Computação Gráfica 3D (Three.js) / Design de Interface (UI/UX) / Lógica de IA.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Wanted Level e Perseguição Policial (Police AI)
*   **IA de Perseguição Simples**:
    Para evitar travamentos complexos nos edifícios da cidade, a IA das viaturas policiais utilizará uma versão melhorada de condução inteligente:
    1.  Calcular o vetor de distância até o carro do jogador.
    2.  Aplicar uma força de atração direta se estiver na rua. Se houver um prédio no caminho direto (verificado com `world.checkCollision()`), a viatura reverte temporariamente a direção ou desliza ao longo da parede lateral do obstáculo.
    
    ```javascript
    class PoliceCar {
        constructor(scene, world, player) {
            this.scene = scene;
            this.world = world;
            this.player = player;
            this.mesh = this.createPoliceMesh();
            this.speed = 18; // Mais rápido que o jogador comum para criar urgência
            this.active = true;
            
            // Spawn distante do jogador, mas na malha de estradas
            const spawnPos = this.getValidSpawnPoint();
            this.mesh.position.copy(spawnPos);
            this.scene.add(this.mesh);
            
            this.sirenTimer = 0;
            this.redSiren = this.mesh.getObjectByName('redLight');
            this.blueSiren = this.mesh.getObjectByName('blueLight');
        }

        createPoliceMesh() {
            const group = new THREE.Group();
            // Chassi Preto e Branco estilo viatura americana
            const bodyGeo = new THREE.BoxGeometry(2, 1.2, 4);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.6;
            group.add(body);

            const cabinGeo = new THREE.BoxGeometry(1.8, 1, 2);
            const cabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const cabin = new THREE.Mesh(cabinGeo, cabinMat);
            cabin.position.y = 1.6;
            group.add(cabin);

            // Sirene no teto (Giroflex)
            const sirenBarGeo = new THREE.BoxGeometry(1.2, 0.2, 0.4);
            const sirenBar = new THREE.Mesh(sirenBarGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
            sirenBar.position.set(0, 2.2, 0);
            group.add(sirenBar);

            const lightGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
            const redLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            redLight.position.set(-0.4, 2.3, 0);
            redLight.name = "redLight";
            group.add(redLight);

            const blueLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0x0000ff }));
            blueLight.position.set(0.4, 2.3, 0);
            blueLight.name = "blueLight";
            group.add(blueLight);

            return group;
        }

        update(dt) {
            if (!this.active) return;

            // Alternar sirene neon piscando
            this.sirenTimer += dt;
            if (this.sirenTimer > 0.15) {
                this.sirenTimer = 0;
                this.redLightOn = !this.redLightOn;
                this.redSiren.material.color.setHex(this.redLightOn ? 0xff0000 : 0x330000);
                this.blueSiren.material.color.setHex(this.redLightOn ? 0x000033 : 0x0000ff);
            }

            const targetPos = this.player.mesh.position;
            const dir = targetPos.clone().sub(this.mesh.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 1.5) {
                dir.normalize();
                
                // Rotacionar em direção ao jogador suavemente
                const targetRotation = Math.atan2(dir.x, dir.z);
                this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, 5 * dt);

                // Movimentação com física básica de colisão contra paredes
                const moveStep = dir.multiplyScalar(this.speed * dt);
                const nextPos = this.mesh.position.clone().add(moveStep);

                if (!this.world.checkCollision(nextPos)) {
                    this.mesh.position.copy(nextPos);
                } else {
                    // Desvio inteligente em caso de colisão contra prédios
                    const slideDir = new THREE.Vector3(-dir.z, 0, dir.x); // Vetor perpendicular
                    const nextPosSlide = this.mesh.position.clone().add(slideDir.multiplyScalar(this.speed * dt * 0.8));
                    if (!this.world.checkCollision(nextPosSlide)) {
                        this.mesh.position.copy(nextPosSlide);
                    }
                }
            }
        }
    }
    ```

*   **Verificação de Captura (Busted)**:
    No loop principal `Game.update()`, se `state.wantedLevel > 0`:
    1. Medir a distância entre o carro do jogador e cada viatura policial ativa.
    2. Se a distância for `< 3.5`:
       * Incrementar `state.bustedTimer += dt`.
       * Exibir na tela um indicador visual circular vermelho enchendo ou um texto "SAIA DAQUI! CERCADO! 50%".
       * Se `state.bustedTimer >= 1.8`, disparar a rotina de prisão: escurecer a tela, pausar movimentações civis, descontar dinheiro do jogador, redefinir as viaturas de perseguição e resetar o Wanted Level para 0.
    3. Caso o jogador consiga se afastar para uma distância `> 8`, resetar `state.bustedTimer = 0`.

### 2. Garagem Neon e Loja de Upgrades (Tuning Station)
*   **Zona Física da Garagem**:
    Gerar no `World` uma marcação especial de checkpoint:
    ```javascript
    // No método de inicialização do World
    createGarageZone() {
        const garageGeo = new THREE.CylinderGeometry(4, 4, 0.2, 32);
        const garageMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });
        const garageZone = new THREE.Mesh(garageGeo, garageMat);
        // Posicionar na intersecção central (0, 0, 0)
        garageZone.position.set(0, 0.1, 0);
        this.scene.add(garageZone);

        // Chave Inglesa flutuando em 3D procedural
        const iconGroup = new THREE.Group();
        const handleGeo = new THREE.BoxGeometry(0.4, 2, 0.3);
        const headGeo = new THREE.RingGeometry(0.5, 0.8, 6);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });
        
        const handle = new THREE.Mesh(handleGeo, handleMat);
        const head = new THREE.Mesh(headGeo, handleMat);
        head.position.y = 1;
        head.rotation.x = Math.PI/2;
        
        iconGroup.add(handle);
        iconGroup.add(head);
        iconGroup.position.set(0, 3, 0);
        iconGroup.name = "garageIcon";
        this.scene.add(iconGroup);
        this.garageIcon = iconGroup;
    }
    ```
*   **Fórmulas Matemáticas do Upgrade**:
    No script de física e movimento do jogador (`Player` ao dirigir o carro), aplicar as variáveis de upgrade:
    ```javascript
    const baseSpeed = 40;
    const baseAccel = 15;
    const baseHandling = 5; // Fator de amortecimento de derrapagem (derivação rotacional)
    
    // Velocidade final ajustada
    const currentMaxSpeed = baseSpeed * (1 + (state.playerCarStats.speedLevel - 1) * 0.15);
    // Aceleração ajustada
    const currentAcceleration = baseAccel * (1 + (state.playerCarStats.accelLevel - 1) * 0.20);
    // Inércia lateral corrigida nas curvas
    const steerDampening = baseHandling / (state.playerCarStats.steerLevel);
    ```

### 3. Cargas Especiais e Interface UI Dinâmica
*   **Lógica de Sorteio de Carga**:
    Ao coletar um pacote em `MissionManager.update()`, sortear o modificador de missão:
    ```javascript
    const CARGO_TYPES = ['standard', 'fragile', 'express', 'vip'];
    const weights = [0.4, 0.2, 0.2, 0.2]; // Probabilidade de ocorrência
    
    function selectRandomCargo() {
        const rand = Math.random();
        if (rand < 0.4) return 'standard';
        if (rand < 0.6) return 'fragile';
        if (rand < 0.8) return 'express';
        return 'vip';
    }
    ```
*   **Atualização do HUD e Efeitos Sonoros Visualizados**:
    *   *VIP*: Exibe uma coroa dourada holográfica piscando ao lado do texto da missão. Se `wantedLevel > 0`, emitir um som de pânico de desenho animado (gerado proceduralmente na Web Audio API) e resetar a entrega.
    *   *Fragile*: Desenhar uma barra de vida horizontal com transição de cor suave usando CSS (`green` -> `orange` -> `red`) que diminui a cada colisão em que a velocidade radial do impacto for superior a um limiar seguro.
    *   *Express*: Ativar um timer regressivo rápido `#express-timer-hud` piscando em cor de fogo.

*   **Padrão de Interface de Customização de Cores**:
    O painel da garagem no HTML exibirá 4 botões circulares neon correspondendo às cores, e ao clicar, alterará a cor difusa do material do carro no canvas de renderização:
    ```javascript
    function changeCarColor(hexColor) {
        state.playerCarStats.color = hexColor;
        if (state.currentCar) {
            // Acessa o Mesh do chassi do carro do jogador e muda o material de renderização
            state.currentCar.mesh.children[0].material.color.setHex(hexColor);
        }
    }
    ```

---

*Assinado: Antigravity - Senior Game Product Owner (PO)*
