# 📝 TASK-VOXEL_CITY: Rampas de Acrobacias (Stunt Jumps), Obstáculos Físicos Destrutíveis, Áudio Procedural via Web Audio API e Mecânica de Drift com Nitro

## 👤 User Story
*   **Como** motorista habilidoso e ousado no simulador de condução 3D **Voxel City**,
*   **Eu quero** realizar saltos acrobáticos em rampas com câmera lenta cinematográfica, interagir com obstáculos destrutíveis como cones e hidrantes físicos com vazamento de água realista, ouvir efeitos sonoros dinâmicos de motores, sirenes e colisões gerados em tempo real, e derrapar pelas curvas acumulando Nitro para acelerações rápidas,
*   **Para que** a exploração e a jogabilidade do mundo aberto ganhem profundidade tática, sensação de velocidade imersiva, feedback sensorial ("juiciness") premium e alto nível de engajamento competitivo.

---

## 🎯 Critérios de Aceitação

1.  **Rampas de Acrobacias (Stunt Jumps) & Efeito Bullet-Time**:
    *   **Posicionamento das Rampas**: Espalhar estrategicamente 4 rampas neon tridimensionais (inclinadas em ~25 graus) pelos cruzamentos e avenidas do mapa 3D (ex: próximas à praça central ou em longas retas).
    *   **Ativação do Stunt Jump**: Quando o carro do jogador sobe a rampa com velocidade superior a $18\text{ unidades/segundo}$, disparar o modo "Stunt Jump".
    *   **Efeito Bullet-Time**: Durante o tempo em que o carro estiver no ar (fórmula de detecção de contato com o solo nulo), desacelerar a física de simulação e o tempo global por um fator de escala (Time Dilation Factor = 0.3x) para criar um efeito slow-motion cinematográfico.
    *   **Câmera Cinemática**: Ajustar dinamicamente a câmera do jogo para um ângulo lateral dramático orbitando o carro em câmera lenta.
    *   **Aterrissagem e Bônus**: Ao tocar o solo com as quatro rodas, restaurar a câmera e a escala de tempo originais. Se a aterrissagem for bem-sucedida (chassi não colidir com ângulo excessivo), conceder $150 de bônus ("STUNT JUMP LANDED!") com faíscas neon na suspensão. Se falhar (bater de cabeça ou capotar), aplicar penalidade física e dano ao chassi.

2.  **Obstáculos Físicos Destrutíveis (Props com Física Reativa)**:
    *   **Cones de Sinalização Voxel**: Instalar grupos de cones laranja/branco nas calçadas e zonas de obras. Se colididos pelo carro, eles devem ser lançados com velocidade vetorial elástica calculada com base na força do impacto, girando no espaço 3D (pitch/yaw/roll) e desacelerando por atrito no asfalto até parar.
    *   **Hidrantes de Incêndio Destrutíveis**:
        *   Posicionar hidrantes vermelhos de voxel em esquinas e calçadas.
        *   Ao colidir e derrubar um hidrante, ele deve liberar um **Jato de Água Vertical pressurized** contínuo e volumétrico composto por partículas 3D azuis e brancas translúcidas subindo e caindo por gravidade.
        *   **Efeito de Hidroplanagem**: A água no chão reduz a aderência dos pneus do carro em 50% em um raio de 8 unidades do hidrante quebrado, facilitando derrapagens (drift).

3.  **Mecânica de Drift e Barra de Nitro**:
    *   **Acionamento do Drift**: Ao segurar `Space` durante uma curva em velocidade alta ($>10\text{ u/s}$), o carro entra em modo de derrapagem (drift). A traseira do veículo deve escorregar (aumentar o vetor de deslize lateral) e deixar marcas pretas de pneu (skidmarks) no asfalto.
    *   **Partículas de Fumaça**: Emitir fumaça de pneu (partículas cinza e brancas em expansão com fade out) das rodas traseiras.
    *   **Acúmulo de Nitro**: Manter o drift acumula uma barra de **Nitro** na HUD.
    *   **Nitro Boost**: Quando a barra de Nitro estiver cheia ($>100\%$) e o drift for finalizado, o jogador pode apertar `Shift` para liberar o Nitro. Isso dobra a aceleração do carro por 3 segundos, altera a cor dos faróis e escapamento para um brilho azul intenso e aplica um efeito visual de distorção de FOV (Field of View) na câmera ("efeito túnel de velocidade").

4.  **Motor de Áudio Procedural via Web Audio API**:
    *   **Som do Motor (Engine Synthesizer)**:
        *   Sintetizar o som do motor usando uma onda dente de serra (Sawtooth) de baixa frequência filtrada por passa-baixa.
        *   Modular a frequência do oscilador proporcionalmente às RPMs e velocidade do veículo em tempo real (de 80Hz em marcha lenta a 450Hz na velocidade máxima).
    *   **Sirenes da Polícia (Siren FM Synthesis)**:
        *   Quando o Wanted Level for superior a 1 estrela, adicionar som de sirene oscilante modulado em frequência (600Hz a 1200Hz) com efeito Doppler baseado na distância das viaturas policiais em relação ao jogador.
    *   **Efeitos Adicionais**:
        *   *Drift Screech*: Som de pneu cantando usando osciladores triangulares combinados com um filtro passa-alta e ruído branco de alta frequência durante derrapagens.
        *   *Water Fountain*: Ruído branco filtrado com ressonância dinâmica para simular o spray de água do hidrante quebrado.
        *   *Nitro Roar*: Chiado grave e intenso de jato sintetizado com ruído filtrado de alta amplitude durante o Boost.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/voxel_city/index.html` (e diretório `/voxel_city/TASKS/`).

### 1. Escala de Tempo e Câmera Cinemática (Bullet-Time)
Para desacelerar a física sem quebrar a lógica de renderização a 60 FPS, todas as atualizações de movimento (carro do jogador, viaturas da polícia, partículas) devem ser multiplicadas por um fator `timeScale` dinâmico (armazenado no `state.timeScale`):
*   Fórmula básica: `const dt = clock.getDelta() * state.timeScale;`
*   No ar, `state.timeScale` transiciona suavemente de $1.0$ para $0.3$ usando interpolação linear (`THREE.MathUtils.lerp`).
*   A câmera deve alternar o seu `target` e `offset` para uma posição lateral orbital inclinada enquanto o carro estiver flutuando na fase aérea de um Stunt Jump.

### 2. Lógica de Colisão de Props (Cones e Hidrantes)
Criar uma classe `DestructibleProp` para gerenciar objetos interativos no cenário 3D:
*   Cada prop possui um mesh do Three.js, uma bounding box `THREE.Box3`, e propriedades físicas como `velocity` (Vector3), `angularVelocity` (Vector3) e `isDestroyed` (boolean).
*   Se o carro colidir com um prop:
    *   Se for um **Cone**: Aplicar $V_{cone} = V_{car} \cdot 1.5$ na direção de colisão, com elevação positiva no eixo $Y$ ($V_y \approx 4 + |V_{car}| \cdot 0.3$). O cone deve rotacionar livremente nos eixos X e Z e quicar com fricção de $0.92$ até repousar.
    *   Se for um **Hidrante**: Alterar estado para destruído, aplicar força para derrubá-lo e spawnar um gerador de partículas de água no ponto de colisão. O jato de água deve emitir 15 partículas por frame direcionadas para cima com dispersão cônica e gravidade descendente.

### 3. Síntese Sonora Procedural (Web Audio API)
Implementar os osciladores e nós na classe global ou helper de áudio:
```javascript
class ProceduralAudioEngine {
    constructor() {
        this.ctx = audioCtx;
        this.engineOsc = null;
        this.engineGain = null;
        this.sirenOsc = null;
        this.sirenGain = null;
        this.waterNoiseNode = null;
        this.driftOsc = null;
    }
    
    startEngine() {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 250;
        
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.05;
        
        this.engineOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
    }
    
    updateEngineRPM(speedRatio) {
        if (!this.engineOsc) return;
        const targetFreq = 70 + (speedRatio * 320);
        this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
        this.engineFilter.frequency.setTargetAtTime(200 + (speedRatio * 400), this.ctx.currentTime, 0.05);
    }
}
```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Adiciona elementos clássicos de jogabilidade arcade que tornam a exploração 3D da cidade extremamente viciante).
*   **Esforço Estimado**: Alta (Implementar física elástica secundária de objetos 3D, sintetizadores de áudio complexos e controle de tempo desacelerado).
*   **Área**: Computação Gráfica 3D (Three.js) / Áudio Web / Lógica de Gameplay & Física.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Modelagem de Dados do Estado de Jogo (Data Modeling)
Para suportar o novo escopo dinâmico, as seguintes variáveis serão integradas no objeto global `state` dentro do arquivo `index.html`:
*   `state.timeScale`: Fator multiplicador de tempo dinâmico (default: `1.0`). Em saltos de rampas (`stunt jumps`), esse fator transiciona de forma linear (`THREE.MathUtils.lerp`) para `0.3`, e retorna para `1.0` no pouso.
*   `state.stuntJumpActive`: Flag booleana que controla o estado de salto acrobático.
*   `state.stuntJumpTime`: Tempo acumulado no ar durante o salto atual.
*   `state.nitroCharge`: Quantidade atual de Nitro carregada (de `0` a `100`).
*   `state.nitroActive`: Booleano para rastrear se o Boost supersônico de Nitro está ativado.
*   `state.nitroTimeLeft`: Tempo restante do boost de Nitro (duração fixa de `3.0` segundos).
*   `state.driftActive`: Flag booleana indicando se o carro está derrapando ativamente.
*   `state.destructibleProps`: Coleção contendo instâncias de `DestructibleProp` ativas no mapa.
*   `state.waterParticles`: Pool de partículas 3D de água de hidrantes ativos.
*   `state.smokeParticles`: Pool de partículas de fumaça de derrapagem do carro.

### 2. Estratégias de Object Pooling (Memory Optimization)
A renderização em tempo real de dezenas de partículas e objetos móveis no WebGL sem pools dedicados causa picos de garbage collection (GC) e travamentos perceptíveis. Para evitar isso:
*   **Partículas de Água e Fumaça**: Utilizaremos uma classe `ParticlePool` que aloca previamente um número máximo fixo de geometrias leves (ex: `THREE.BufferGeometry` estático com posições dinâmicas atualizadas na GPU ou meshes reaproveitáveis usando translação controlada). O número de partículas ativas na tela é limitado a 300 para o jato do hidrante e 150 para a fumaça de drift.
*   **Props Destrutíveis (Cones e Hidrantes)**: Em vez de instanciar novos blocos de colisão e meshes a cada batida, instanciamos todos os 4 cones e 4 hidrantes durante o setup inicial do mundo (`world.generateCity()`), salvando-os em um array reutilizável. Quando colididos, eles ativam seu estado físico de movimentação linear/angular ao invés de serem criados sob demanda.
*   **Skidmarks (Marcas de Pneu)**: Em vez de criar infinitos objetos de linha, implementamos um buffer circular de marcas de pneu (`THREE.LineSegments` ou pequenos planos de asfalto). A malha pré-aloca 500 segmentos. Quando novos segmentos são adicionados no final do array e o limite é excedido, os mais antigos são reposicionados e reescritos na memória da GPU para evitar vazamento.

### 3. Física de Salto, Drift e Câmera Cinemática
Durante a subida e decolagem de uma rampa:
*   **Detecção de Decolagem**: Detectar se o carro perdeu contato com o asfalto após cruzar os limites de uma das 4 rampas neon 3D (`THREE.Box3` de colisão). A gravidade é reduzida multiplicando a gravidade padrão pelo fator `dt` desacelerado por `state.timeScale`.
*   **Câmera Orbital Suave**: A câmera migra suavemente de sua posição em terceira pessoa convencional para uma câmera cinematográfica lateral inclinada calculada como:
    $$\vec{P}_{cam} = \vec{P}_{car} - \vec{D}_{car} \cdot D_{offset} \cdot \cos(45^\circ) + \vec{R}_{car} \cdot D_{offset} \cdot \sin(45^\circ) + (0, 4, 0)$$
    A transição é realizada via LERP para manter o deslocamento fluído.
*   **Detecção de Derrapagem (Drift)**: Ao segurar `Space` durante a movimentação em alta velocidade com ângulo de curva pronunciado, modificamos o coeficiente de tração lateral. O drift é ativo se a velocidade lateral exceder $2.5\text{ u/s}$. A barra de nitro é carregada em uma taxa de $35\%$ por segundo durante a derrapagem contínua.

### 4. Áudio Procedural Sintetizado (FM & Noise Synthesis)
*   **Som do Motor**: Oscilador Sawtooth de frequência modulada (`OscillatorNode`). A frequência e filtro passa-baixa acompanham a velocidade linear e torque do carro.
*   **Sirenes Policiais**: Oscilador FM baseado em onda senoidal pura modulada com frequência de LFO (600Hz a 1200Hz) multiplicada pelo efeito Doppler relativo:
    $$f_{percebido} = f_{emitido} \cdot \left(\frac{v_{som} + v_{jogador}}{v_{som} - v_{viatura}}\right)$$
*   **Chiado de Drift e Nitro**: Gerador de ruído branco procedural (Buffer preenchido com valores entre `-1.0` e `1.0` em JS) acoplado a um `BiquadFilterNode` passa-alta com ressonância controlada para simular o spray de água do hidrante, boost do Nitro e canto de pneu de drift.

### 5. Layout HUD e Visual Glassmorphism da Barra de Nitro
*   Adicionar um contêiner no HTML index.html sob a HUD principal para renderizar a barra de Nitro.
*   O layout deve seguir a estética de neon cyberpunk e glassmorphism do restante da UI:
```html
<div id="nitro-hud" style="position: absolute; bottom: 20px; left: 20px; width: 220px; background: rgba(0, 0, 0, 0.7); border: 2px solid #00f0ff; border-radius: 8px; padding: 10px; color: white; display: flex; flex-direction: column; gap: 5px; box-shadow: 0 0 15px rgba(0, 240, 255, 0.3); backdrop-filter: blur(8px);">
    <div style="font-size: 14px; font-weight: bold; letter-spacing: 1px; color: #00f0ff; text-shadow: 0 0 5px #00f0ff;">NITRO CHARGE</div>
    <div style="width: 100%; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; border: 1px solid rgba(0, 240, 255, 0.3);">
        <div id="nitro-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #0077ff, #00f0ff); box-shadow: 0 0 8px #00f0ff; transition: width 0.1s ease;"></div>
    </div>
</div>
```

---


## ✅ Status da Implementação
- **Status Geral**: 🟢 Concluído
- [x] **Rampas de Acrobacias & Bullet-Time**: Posicionamento de 4 rampas neon 3D, detecção de decolagem em alta velocidade, ativação de câmera lenta cinematográfica suave (Time Dilation 0.3x) e órbita de câmera, concessão de bônus financeiro e efeito visual de faíscas ao aterrissar com sucesso.
- [x] **Obstáculos Físicos Destrutíveis**: Spawn de cones e hidrantes voxel reativos, física de colisão secundária (lançamento elástico e rotação livre dos cones), efeito volumétrico de jato de água para hidrantes destruídos e mecânica de hidroplanagem (perda de tração temporária do carro na área molhada).
- [x] **Derrapagem (Drift) & Nitro Boost**: Detecção de derrapagem sob pressão de freio de mão (`Space`), marcas de pneu (skidmarks) no asfalto e emissores de fumaça cinza, carregamento de barra de Nitro na HUD e ativação de Boost supersônico com Shift (aceleração duplicada, luzes de escape azuis e distorção dinâmica de FOV).
- [x] **Áudio Procedural via Web Audio API**: Gerador e oscilador procedural de rotações por minuto do motor do carro, sirenes policiais FM com efeito Doppler espacial reativo, ruído de spray de água pressurizada para hidrantes quebrados e chiados sintetizados para canto de pneu (drift) e queima de Nitro.

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Simulação Física Vertical**: **Decisão:** Implemente um vetor simples `vy` na classe do veículo. Quando o veículo entra num "stunt jump", adicione um `vy` positivo baseado na velocidade de subida e diminua usando o valor da gravidade a cada frame até bater no chão.
2. **Critério de Pouso**: **Decisão:** O critério de alinhamento do vetor up do veículo vs vetor `(0,1,0)` é correto. Se o vetor Up do carro tiver inclinação (tilt) considerável em Roll/Pitch no momento em que a coordenada $Y \le 0$, considere como acidente/dano.
3. **Inicialização do Autoplay**: **Decisão:** Associe no primeiro input de controle ou botão de "Start" na tela principal para criar/resumir o `audioCtx`. 
4. **Rotação das Rampas**: **Decisão:** Paralelamente aos eixos X/Z nas extremidades de quarteirões para encaixar de forma limpa na malha urbana existente de Voxel City, com rotação discreta (`0, 90, 180, 270`).

---

## 🔍 Code Review

- **Data da Revisão**: 2026-08-02
- **Revisor**: Tech Lead (TL)
- **Resultado**: ✅ **Aprovado para QA (Ready for QA)**

### 📊 Avaliação Geral do Código
1. **Arquitetura & Clean Code**: Excelente estrutura em WebGL/Three.js modular. Utilização eficiente de pools de partículas (`WaterParticlePool`, `SmokeParticlePool`, `SparkParticlePool`) e gerenciamento reutilizável de marcas de pneus (`SkidmarkManager`), evitando alocações excessivas e travamentos por Garbage Collection.
2. **Síntese de Áudio Procedural**: Classe `ProceduralAudioEngine` implementada com alta maestria técnica via Web Audio API pura, cobrindo variações de RPM do motor, sirene policial FM com atenuação espacial Doppler, ruídos de spray de água, drift screech e Nitro boost.
3. **Mecânicas & Game Feel**: Integração completa de Stunt Jumps com câmera orbital cinematográfica e Bullet-Time (Time Dilation 0.3x), derrapagem de drift com acúmulo de Nitro, e física elástica secundária para cones e hidrantes destrutíveis com efeito de hidroplanagem.
4. **Ajuste Técnico Efetuado**: Identificado e corrigido desalinhamento pontual nos IDs DOM da HUD de Nitro (`nitro-bar-fill` e `nitro-text-prompt`), garantindo que o progresso visual de carga e os avisos na tela funcionem em perfeita sintonia com a lógica do jogo.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `voxel_city`
* **Status do Backlog**: Transicionado para `Ready for QA` em `BACKLOG.md`.


