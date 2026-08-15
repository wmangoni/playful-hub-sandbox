# 📝 TASK-VOXEL_CITY: Clima Dinâmico (Chuva & Pistas Escorregadias), Missões de Passageiros (Crazy Taxi Mode) e Iluminação Neon Noturna

## 👤 User Story
*   **Como** motorista destemido no simulador de condução 3D **Voxel City**,
*   **Eu quero** enfrentar climas chuvosos dinâmicos com físicas de derrapagem realista, aceitar missões de transporte de passageiros (estilo Crazy Taxi) com gorjetas por acrobacias e usufruir de iluminação neon 3D noturna reativa (com faróis funcionais e letreiros acesos),
*   **Para que** a exploração da cidade tridimensional ofereça maior variação mecânica, imersão audiovisual premium e novos desafios de condução arcade.

---

## 🎯 Critérios de Aceitação

1.  **Clima Dinâmico (Ciclo de Chuva) & Física de Tração**:
    *   **Ciclo de Clima**: O jogo deve ciclar dinamicamente entre clima Ensolarado (`sunny`) e Chuvoso (`rainy`) a cada 90 segundos.
    *   **Efeito Visual de Chuva**:
        *   Quando chovendo, instanciar e animar um volume de partículas dinâmicas (gotas de chuva lineares translúcidas caindo diagonalmente com gravidade) em torno do carro do jogador.
        *   Gerar pequenas poças azuis/brancas reflexivas em locais aleatórios nos cruzamentos de estradas.
    *   **Física Escorregadia**:
        *   Durante a chuva, a tração/aderência dos pneus do carro deve ser reduzida em 35%.
        *   A distância de frenagem aumenta e o carro entra em derrapagem (drift) mais facilmente ao realizar curvas rápidas.
        *   A barra de Nitro de drift carrega 15% mais lento devido à falta de controle linear.

2.  **Sistema de Táxi (Crazy Taxi Mode)**:
    *   **Pedestres Passageiros**:
        *   Alguns pedestres comuns gerados no mapa devem ser marcados como Passageiros com um ícone de táxi neon amarelo (`🚖`) flutuando acima da cabeça.
    *   **Embarque**:
        *   Ao parar o carro a menos de 3 unidades do passageiro e pressionar a tecla `T`, o passageiro é recolhido. O modelo do pedestre desaparece, e a HUD exibe a mensagem "PASSENGER ON BOARD!".
    *   **Destino & Cronômetro**:
        *   Um destino é gerado aleatoriamente em um cruzamento distante da cidade, demarcado por uma coluna de luz magenta neon brilhante no cenário 3D e uma estrela magenta no minimapa.
        *   Um cronômetro regressivo com base na distância de Chebyshev multiplicada por um fator de dificuldade (ex: `distância / 12 + 15` segundos) é exibido na tela.
    *   **Gorjetas por Manobras (Stunt Tips)**:
        *   Manobras arriscadas realizadas com o passageiro a bordo (como saltos acrobáticos em rampas, drifts contínuos e desvios milimétricos de carros civis do tráfego) adicionam bônus de gorjeta monetária imediata (`+ $25 STUNT TIP!`). O passageiro deve soltar textos flutuantes reativos (ex: "WILD!", "SPEEDY!", "OH MY GOD!").
    *   **Desembarque**:
        *   Ao alcançar a coluna de luz magenta com velocidade próxima de zero, a corrida é concluída. O jogador recebe a tarifa base (de $150 a $300) somada às gorjetas acumuladas. Se o tempo zerar antes do desembarque, o passageiro pula do carro em movimento frustrado, e o jogador perde a corrida (sem pagamento).

3.  **Iluminação Neon Dinâmica e Faróis Tridimensionais**:
    *   **Faróis Ativos do Veículo (Headlights)**:
        *   Durante a noite (quando `sunY < 0`), acoplar dois cones de luz funcional (`THREE.SpotLight` com ângulo de cone de ~30 graus e alcance de 35 unidades) na frente do carro do jogador.
        *   A luz dos faróis deve projetar iluminação direta em tempo real no asfalto e nas fachadas de prédios.
    *   **Prédios com Iluminação Neon**:
        *   Os blocos de edifícios do mapa devem conter malhas ou faixas decorativas de cores neon cyberpunk (Ciano, Magenta, Amarelo).
        *   À noite, a intensidade de auto-iluminação (`emissiveIntensity`) desses materiais de edifícios deve subir dinamicamente de 0.0 para 1.8, criando a sensação de uma cidade que acende no escuro.
    *   **Efeito de Neblina Noturna**:
        *   Durante noites chuvosas, a cor e densidade da neblina da cena (`scene.fog`) devem ser ajustadas para criar uma atmosfera densa, brilhando suavemente próxima a fontes de luz dos postes.

4.  **Perfil de Condução e Painel de Conquistas (Driver Profile)**:
    *   Criar uma tela de informações e conquistas acessível no painel da Garagem ou em um botão dedicado da HUD:
        *   *Drift King*: Maior distância/tempo contínuo em drift (ex: "Recorde: 4.2s").
        *   *Sky High*: Maior tempo no ar em rampa (ex: "Recorde: 2.1s").
        *   *Taxi Master*: Total de passageiros entregues.
        *   *Rich Driver*: Total de dinheiro acumulado.
        *   *Most Wanted*: Nível máximo de procurado já atingido (estrelas).

5.  **Áudio Procedural via Web Audio API**:
    *   *Sinfonia da Chuva*: Sintetizar o som constante da chuva usando um gerador de ruído branco combinado com um filtro passa-banda oscilante e atenuação de baixa frequência para simular o som abafado de dentro do veículo.
    *   *Coin Collection (Gorjeta)*: Um bipe harmônico de duas notas rápidas e cristalinas (1600Hz -> 2400Hz) usando onda senoidal com envelope de decaimento super rápido (60ms).
    *   *Passenger Scream (Grito)*: Som oscilante e cômico usando um oscilador FM triangular com varredura rápida de frequência de 600Hz a 1100Hz durante manobras aéreas ou drifts de alta velocidade.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/voxel_city/index.html` (com scripts integrados).
*   **Partículas de Chuva (Rain System)**:
    *   Usar um `THREE.Points` com 500 partículas em um volume de $40 \times 40 \times 40$ centrado na posição horizontal do carro do jogador.
    *   No loop `update`, transladar as partículas para baixo a uma velocidade constante. Quando uma partícula cruzar $y < 0.1$, reposicioná-la de volta no topo do volume ($y = 40$).
*   **Física de Tração na Chuva**:
    *   Mapear o coeficiente de atrito lateral `lateralFriction` e aceleração máxima no script do carro.
    *   Se `state.weather === 'rainy'`, multiplicar a aceleração por $0.75$ e o arrasto lateral de estabilidade por $0.65$ para permitir que a traseira do veículo escorregue com comandos de curva normais de forma fluida.
*   **Estrutura de Missão de Passageiro**:
    *   Estender o estado global `state`:
        ```javascript
        state.taxiMode = false;
        state.passengerActive = false;
        state.passengerTargetPos = null;
        state.passengerTimer = 0;
        state.passengerTips = 0;
        state.weather = 'sunny'; // 'sunny' ou 'rainy'
        state.weatherTimer = 90.0;
        state.records = {
            maxDriftTime: 0,
            maxAirTime: 0,
            passengersDelivered: 0
        };
        ```
*   **Iluminação do Veículo**:
    *   Na classe `Player` ou no construtor do carro, instanciar duas SpotLights apontadas para a frente:
        ```javascript
        const leftHeadlight = new THREE.SpotLight(0xfffdd0, 1.5, 35, Math.PI / 6, 0.5, 1);
        leftHeadlight.position.set(-0.8, 0.5, 2.0); // Relativo ao chassi do carro
        // Adicionar como filho do grupo do carro do jogador
        this.mesh.add(leftHeadlight);
        this.mesh.add(leftHeadlight.target);
        leftHeadlight.target.position.set(-0.8, 0.5, 10.0);
        ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Cria um loop de gameplay dinâmico e alternativo que valoriza a exploração do mapa, além de melhorar drasticamente a fidelidade visual noturna).
*   **Esforço Estimado**: Alta (Requer controle de luzes em tempo real no WebGL/Three.js, animação de partículas com reposicionamento relativo e detecção/armazenamento de recordes físicos).
*   **Área**: 3D Engine (Three.js) / Design de Nível Dinâmico / Mecânicas Arcade / Web Audio API.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Partículas e Renderização de Chuva (Three.js)
Para simular a chuva eficientemente sem sobrecarregar a CPU:
```javascript
class RainSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleCount = 600;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.particleCount * 3);
        
        // Inicializar posições aleatórias em uma caixa de 50x30x50
        for(let i=0; i<this.particleCount; i++) {
            this.positions[i*3] = (Math.random() - 0.5) * 50;
            this.positions[i*3+1] = Math.random() * 30;
            this.positions[i*3+2] = (Math.random() - 0.5) * 50;
        }
        
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        
        // Material de gotículas lineares
        this.material = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });
        
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.visible = false;
        this.scene.add(this.points);
    }
    
    update(dt, playerPos) {
        if (!this.points.visible) return;
        
        // Seguir o jogador no plano horizontal
        this.points.position.set(playerPos.x, 0, playerPos.z);
        
        const posArr = this.geometry.attributes.position.array;
        for(let i=0; i<this.particleCount; i++) {
            // Cair diagonalmente (vento + gravidade)
            posArr[i*3+1] -= 25 * dt; // Eixo Y
            posArr[i*3] -= 5 * dt;    // Eixo X (Vento)
            
            // Se tocar o solo, respawnar no topo do volume relativo
            if (posArr[i*3+1] < 0) {
                posArr[i*3+1] = 30 + Math.random() * 5;
                posArr[i*3] = (Math.random() - 0.5) * 50;
                posArr[i*3+2] = (Math.random() - 0.5) * 50;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }
}
```

### 2. SpotLights dos Faróis e Emissivos de Neon Noturnos
```javascript
function toggleNightLights(isNight) {
    // 1. Alternar faróis do carro do jogador
    if (state.currentCar && state.currentCar.headlights) {
        state.currentCar.headlights.forEach(light => {
            light.visible = isNight;
        });
    }
    
    // 2. Transição gradual dos letreiros neon nos edifícios
    scene.traverse(child => {
        if (child.isMesh && child.material && child.material.userData.isNeon) {
            const targetIntensity = isNight ? 1.8 : 0.0;
            child.material.emissiveIntensity = THREE.MathUtils.lerp(
                child.material.emissiveIntensity,
                targetIntensity,
                0.05
            );
        }
    });
}
```

### 3. Mecânica do Embarque/Corrida de Táxi
```javascript
function updateTaxiMission(dt) {
    if (!state.passengerActive) return;
    
    state.passengerTimer -= dt;
    
    // Checar se o jogador chegou no destino
    const playerPos = state.currentCar.mesh.position;
    const distToTarget = playerPos.distanceTo(state.passengerTargetPos);
    
    if (distToTarget < 4.0 && state.currentCar.speed < 1.0) {
        // Sucesso!
        completeTaxiMission();
    } else if (state.passengerTimer <= 0) {
        // Falha!
        failTaxiMission();
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Dificuldade de Desempenho com Sombras dos Faróis (SpotLight Shadow Casting)**:
    *   *Dúvida*: Projetar sombras em tempo real para os dois faróis do veículo do jogador (`leftHeadlight.castShadow = true`) no asfalto e prédios consome muito processamento e pode reduzir a taxa de frames nos navegadores móveis ou de baixo desempenho.
    *   *Proposta*: Como política de otimização, os faróis do carro do jogador devem emitir luz volumétrica e reflexiva difusa (`SpotLight`), mas com o mapeamento de sombras desabilitado (`castShadow = false`), deixando apenas a luz do sol (direcional) gerando sombras suaves.
2.  **Limite de Spawn de Passageiros de Táxi**:
    *   *Dúvida*: Quantos pedestres devem carregar o ícone de Táxi (`🚖`) ativamente no cenário para evitar poluir o HUD com marcadores e sobrecarregar o minimapa?
    *   *Proposta*: Limitar a no máximo 2 passageiros ativos gerados simultaneamente nas calçadas.
3.  **Persistência da Chuva e Transição de Som**:
    *   *Dúvida*: O som procedural de chuva deve diminuir de volume quando o jogador estiver fora do carro ou permanecer constante em todo o ambiente?
    *   *Proposta*: Quando o jogador sai do veículo, o volume do som de chuva aumenta 20% e incorpora um filtro passa-alta leve (simulando a falta de atenuação acústica da lataria e vidros do carro).

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Otimização de Sombras e Performance nos Faróis (Aprovado)**:
   * **Decisão**: Aprovada a desativação de `castShadow = false` nos `SpotLight` dos faróis noturnos do veículo do jogador. A projeção de iluminação difusa e o volume translúcido de luz garantem uma excelente estética retrô/neon noturna sem incorrer em penalidades pesadas de rasterização de sombras em GPU.
   * **Diretriz Técnica**: Manter o sombreamento dinâmico restrito exclusivamente à luz direcional primária (`DirectionalLight`), otimizando o shadow map com `shadow.mapSize.width = 1024` e `shadow.mapSize.height = 1024`.

2. **Limite de Spawn de Passageiros de Táxi (Aprovado)**:
   * **Decisão**: Limite mantido em no máximo **2 passageiros de táxi ativos** simultaneamente em todo o mapa.
   * **Diretriz Técnica**: Utilizar um array de controle `activeTaxiPassengers = []` e validar seu `length` antes de marcar novos pedestres gerados proceduralmente como alvos de táxi. Os ícones no minimapa e no espaço 3D devem ser removidos limparmente (`dispose()` de malha e sprite) assim que o passageiro embarcar ou expirar.

3. **Filtro de Áudio para Entrada/Saída do Veículo (Aprovado)**:
   * **Decisão**: Aprovada a modulação dinâmica do sintetizador de chuva na Web Audio API ao alternar a posição do jogador (a pé vs. dirigindo).
   * **Diretriz Técnica**: Utilizar um `BiquadFilterNode` tipo `lowpass` com frequência de corte a 1200Hz e ganho a 0.8 quando dentro do veículo (simulando o isolamento acústico da cabine do carro), ajustando a frequência para 3500Hz e ganho a 0.8 quando a pé. O `AudioContext` deve ser inicializado ou resumido obrigatoriamente no primeiro clique/input físico do usuário para respeitar políticas de autoplay.

*Status da Especificação*: ✅ **Aprovado pelo Tech Lead** - Tarefa refinada e pronta para ser assumida pelo time de desenvolvimento.


---

## 💻 Notas de Desenvolvimento (Dev complete)
*(Seção a ser preenchida pelo Programador ao concluir a tarefa)*

---

## 🔍 Code Review e Aprovação (TL)
*(Seção a ser preenchida pelo Tech Lead durante a revisão de código)*

---

## 🧪 Resultado dos testes (QA)
*(Seção a ser preenchida pelo analista de QA)*
