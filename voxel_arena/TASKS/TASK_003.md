# ⚔️ TASK-VOXEL_ARENA: Batalha Final contra o Colosso Voxel (Boss Fight), Armadilhas Ambientais Ativas & Feedback de Impacto (Hitstop & Popups)

## 👤 User Story
* **Como** guerreiro lendário e sobrevivente da mortal **Voxel Arena**,
* **Eu quero** enfrentar um chefe colossal de múltiplas fases (O Colosso Voxel) após sobreviver às 5 ondas básicas, lidar com armadilhas ambientais dinâmicas na arena (como poças de lava e anomalias gravitacionais) e experimentar o peso físico dos combates através de congelamentos de impacto (hitstop), tremores direcionais de câmera e números de dano flutuantes em tempo real,
* **Para que** a batalha final seja uma experiência extremamente épica, visualmente espetacular, audivelmente imersiva e que forneça um clímax recompensador e de alta qualidade à minha jornada de sobrevivência.

---

## 🎯 Critérios de Aceitação

### 1. Encontro Épico: O Colosso Voxel (Boss Battle System)
* **Gatilho de Spawn**: Quando o temporizador da Onda 5 atingir `00:00` (fim dos 300 segundos originais), a partida **não** deve terminar como vitória imediata. Em vez disso:
  * O temporizador do HUD deve ser ocultado ou substituído por uma etiqueta pulsante `"BOSS ENCOUNTER"` em vermelho neon.
  * Pausar permanentemente o spawn normal de inimigos comuns da Onda 5.
  * Eliminar ou afastar todos os inimigos menores ativos instantaneamente para limpar a arena.
  * Injetar o **Colosso Voxel** no centro exato da arena (`0, 0, 0`).
* **Mudança Climática Atmosférica**:
  * Transicionar a cor do background da cena e da névoa (`scene.background` e `scene.fog.color`) suavemente de `#0a0c16` (azul escuro de catacumba) para um violeta-avermelhado escuro abissal (`#1c052e`, com densidade de névoa ligeiramente aumentada para `0.038`) ao longo de 3 segundos.
* **Barra de HP do Chefe**:
  * Renderizar um container de vida dedicado no topo da tela chamado `"COLOSSO VOXEL"` com moldura dourada glassmorphism e preenchimento em gradiente carmesim brilhante (`linear-gradient(90deg, #8b0000, #ff3333)`).
* **Estrutura de Combate de 3 Fases**:
  * **Fase 1: Escudo de Cristais Estelares (Orbital Crystals)**:
    * *Modelo do Chefe*: Um grupo de voxels gigante (escala base 4.5x) em tons de obsidiana e ametista (`#1a0f30`), com olhos brilhantes vermelhos colossais.
    * *Defesa*: Protegido por 3 cristais geométricos flutuantes (`THREE.IcosahedronGeometry` de raio 1.2, cor violeta neon `#bd00ff`) girando em órbita circular ao redor do seu torso.
    * *Invulnerabilidade*: Enquanto pelo menos um cristal estiver ativo (vida: 80 HP por cristal), o Colosso recebe **90% a menos de dano** e uma cúpula translúcida violeta de wireframe o envolve.
    * *Ataque*: O Colosso smasha os braços no chão a cada 6.0s, gerando uma onda de choque luminosa (`THREE.RingGeometry` expandindo até raio 20) que causa 18 de dano e arremessa o jogador para trás.
  * **Fase 2: Hyperbeam de Fusão (Nuclear Laser Sweep)**:
    * *Gatilho*: Ativado assim que os 3 cristais orbitais forem destruídos.
    * *Lógica*: O Colosso abre seu peito revelando um núcleo de cristal ciano (`#00ffff`, com emissiveIntensity de 5.0 e PointLight acoplado).
    * *Ataque Canalizado*: A cada 12.0s, o Colosso entra em estado imóvel por 2.0s (partículas ciano são sugadas para o núcleo). Em seguida, ele projeta um gigantesco cilindro translúcido ciano (`THREE.CylinderGeometry` de raio 1.5, altura 100, rotacionado horizontalmente) que atua como um feixe laser de destruição. O feixe rotaciona lentamente 180 graus na arena durante 4.0s. Tocar no laser causa 25 de dano por segundo.
  * **Fase 3: Modo Sobrecarga Enraivecida (Overdrive Fury)**:
    * *Gatilho*: Ativado quando a vida do Colosso cai abaixo de 35% de seu HP máximo.
    * *Visual*: A armadura externa de obsidiana se rompe (peças caem na arena com gravidade física). O núcleo central agora brilha em vermelho vivo instável, e a fumaça de partículas aditivas escapa de seu corpo.
    * *Mecânica*: A velocidade de movimento do chefe aumenta em 55%. Ele persegue o jogador incessantemente. A cada 8.0s, ele invoca 3 Servos Voxel rápidos (com modelo simplificado e 15 HP) que surgem da terra, e dispara sequências rápidas de projéteis de energia teleguiados em formato de cubos flamejantes.

### 2. Armadilhas Ambientais Dinâmicas (Active Hazards)
Para elevar o nível de design tático, a arena deve apresentar perigos dinâmicos que forçam a movimentação inteligente do jogador:
* **Poças de Lava Volcânica (Lava Geysers)**:
  * A partir da Onda 3, e amplificado na Onda do Chefe, circles de aviso pontilhados amarelos surgem aleatoriamente no chão da arena.
  * *Ciclo*: 2 segundos de aviso de aquecimento (círculo pisca rapidamente) $\rightarrow$ 6 segundos de coluna ativa de fogo composto por partículas ascendentes vermelhas e laranjas.
  * *Dano*: Causa 8 de dano a cada 0.5s a qualquer entidade dentro do círculo (afeta tanto o jogador quanto os monstros, permitindo usá-las estrategicamente para queimar hordas).
* **Fenda Singular Gravitacional (Gravity Nexus)**:
  * Ativa nas Ondas 4 e 6 (Boss). Uma anomalia esférica roxa escura surge no centro da arena (`0, 0.5, 0`) com efeito de pulsação e glow.
  * *Força de Sucção*: Aplica uma força física constante puxando jogador, monstros e XP orbs em direção ao centro. A força deve seguir a física de campo gravitacional inverso:
    $$\vec{F}_{grav} = \frac{G \cdot \vec{d}}{d^3}$$
    Onde $\vec{d}$ é o vetor de distância entre a entidade e a anomalia. O jogador consegue escapar correndo na direção oposta ou usando o *Dash*.

### 3. Game Feel e Feedback de Impacto (Sensação Física)
Transformar a sensação de combate utilizando mecânicas clássicas de "Juiciness" de jogos de ação premium:
* **Hitstop (Temporal Impact Lock)**:
  * Toda vez que o jogador acertar o golpe final de uma habilidade especial (como *Ultimate* ou *Spin Attack*) em múltiplos inimigos, ou quando o jogador sofrer um ataque massivo ($>15$ de dano), o loop de atualização do jogo deve congelar temporariamente por **80ms**. A renderização continua a 60 FPS, mas a movimentação das posições e animações fica congelada ($dt = 0$), criando uma percepção nítida de peso físico e impacto.
* **Tremor de Tela Direcional (Advanced Screen Shake)**:
  * Acoplado ao sistema de câmera. Eventos de alto impacto (receber dano, explosão do Ultimate, pisada do Colosso) disparam um vetor de offset de tremor que decai exponencialmente:
    $$\vec{offset}_{shake}(t) = \vec{dir} \cdot A \cdot e^{-\lambda t} \cdot \cos(\omega t)$$
    O tremor deve ser direcional, chacoalhando a câmera na direção oposta ao golpe para dar senso de inércia.
* **Números de Dano Flutuantes (Popup Numbers)**:
  * Exibir mensagens flutuantes textuais animadas em 3D sobre as coordenadas espaciais das entidades atingidas.
  * *Tipos e Estilos*:
    * *Dano do Jogador a Inimigos*: Texto ciano brilhante (`#00ffff`), fonte monoespaçada estilizada, flutuando para cima com leve dispersão lateral.
    * *Ataque Crítico (Critical Hits)*: Texto em tamanho dobrado, cor amarelo ouro (`#ffd700`) com sombra de glow neon, surgindo com animação pop (escala rápida de 0 a 1.5 e decaimento para 1.0).
    * *Dano Recebido pelo Jogador*: Texto vermelho carmesim (`#ff0033`) posicionado próximo à cabeça do jogador.
    * *Ações Bloqueadas (Exaustão/Sem Stamina)*: Popup escrito `"SEM STAMINA!"` em cinza/vermelho com tremor local.

### 4. Áudio Sintetizado Expandido (Web Audio API)
Toda a sonorização do chefe e do game feel deve seguir a arquitetura de sintetizadores de AudioContext sem carregar arquivos MP3/WAV externos:
* **Rugido de Spawn do Colosso**: Modulador FM composto por um oscilador de onda dente-de-serra grave varrendo de $180\text{ Hz}$ até $45\text{ Hz}$ em 1.5 segundos, alimentado através de um `BiquadFilterNode` passa-baixas com ressonância elevada, e somado com um gerador de ruído de baixa frequência para simular um tremor de terra estrondoso.
* **Laser Charge & Hyperbeam**: Sweep linear ascendente senoidal de $200\text{ Hz}$ até $1800\text{ Hz}$ durante a fase de carga, seguido por um som estático e crepitante contínuo de alta amplitude (ruído branco filtrado com passa-banda em $800\text{ Hz}$ e distorção de ganho) durante o disparo do laser.
* **Quebra de Cristal Orbital**: Som de vidro quebrando modelado por 4 osciladores de onda triangular em frequências inarmônicas altas ($2200\text{ Hz}$, $2750\text{ Hz}$, $3100\text{ Hz}$, $4120\text{ Hz}$) com tempos de decaimento de envelope curtos e exponenciais ($0.15\text{s}$), seguidos por um ruído de faísca elétrica rápida.

---

## 🛠️ Detalhes Técnicos e Arquitetura Detalhada

* **Classe Principal do Chefe**: `VoxelBoss` (derivado ou estruturado similarmente a `Enemy`, mas com gerenciamento interno de estados de fase: `'crystal_shield'`, `'nuclear_laser'`, `'enraged'`).
* **Estrutura de Cristais**: Mantidos em uma lista de meshes filhas ligadas ao grupo do chefe, orbitando através de cálculo trigonométrico em $Y$:
  $$x = x_{boss} + R \cdot \cos(\theta)$$
  $$z = z_{boss} + R \cdot \sin(\theta)$$
  Onde $\theta$ é incrementado por frame pelo delta time.
* **Pipeline do Hitstop**:
  Implementar um acumulador de pausa de impacto `hitstopTimer` na classe `Game`. Quando ativo, o método `animate` passa a decrementar o temporizador e ignora os passos de física e IA, mantendo o rendering:
  ```javascript
  animate() {
      requestAnimationFrame(() => this.animate());
      let dt = this.clock.getDelta();
      
      // Update visual only during hitstop
      if (this.hitstopTimer > 0) {
          this.hitstopTimer -= dt;
          // Renderiza a cena para não congelar animações visuais puras ou tremores
          updateVFX(this.scene, dt); 
          this.renderer.render(this.scene, this.camera);
          return; 
      }
      
      // Lógica padrão do jogo continua aqui...
  }
  ```
* **Floating Text Renderer**:
  Utilizar elementos DOM absolutos injetados em um contêiner overlay `#popup-container` e posicionados via projeção 3D-para-2D usando o método `.project(camera)` do Three.js:
  ```javascript
  const screenPos = worldPos.clone().project(camera);
  const x = (screenPos.x * .5 + .5) * window.innerWidth;
  const y = (-(screenPos.y * .5) + .5) * window.innerHeight;
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  ```

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Introduce a batalha climática que amarra a progressão de ondas, adiciona dinâmicas espaciais cruciais e melhora expressivamente o game-feel tátil do combate).
* **Esforço Estimado**: Alta (Implementação de lógica de chefe multi-fase complexa, física de campo gravitacional dinâmico, renderização de popups projetados em coordenadas de tela e sincronização fina de Web Audio API).
* **Área**: Computação Gráfica 3D (Three.js) / Design UI-UX Dinâmico (CSS & Projeção 3D) / Game Feel & Game Design Avançado.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Product Owner e Tech Lead do Hub de Jogos, detalho abaixo os trechos arquiteturais e fórmulas que deverão guiar o programador na codificação de fidelidade AAA:

### 1. Física e Renderização do Hyperbeam Cilíndrico
O feixe de laser da Fase 2 deve ser composto por um cilindro wireframe duplo com materiais aditivos e emissivos para dar profundidade de plasma. A colisão é computada checando a distância perpendicular do jogador ao segmento do raio de laser projetado no plano horizontal $(X, Z)$:

```javascript
// Colisão Jogador vs Linha Infinita do Feixe
checkLaserCollision(playerPos, bossPos, laserAngle) {
    const laserDir = new THREE.Vector3(Math.cos(laserAngle), 0, Math.sin(laserAngle));
    const toPlayer = playerPos.clone().sub(bossPos);
    toPlayer.y = 0; // focar no plano 2D
    
    // Projeção escalar
    const projection = toPlayer.dot(laserDir);
    const closestPoint = bossPos.clone().addScaledVector(laserDir, projection);
    
    const distanceToLaser = playerPos.distanceTo(closestPoint);
    // Raio do cilindro é 1.5, tolerância física de colisão é 2.0
    return (distanceToLaser < 2.0 && projection > 0 && projection < 50);
}
```

### 2. Efeito de Tremor de Câmera (Screen Shake Manager)
Adicionar suporte a tremores direcionais decrescentes na atualização de câmera da classe `Player`:

```javascript
class ScreenShakeManager {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.timer = 0;
        this.direction = new THREE.Vector3();
    }
    
    trigger(direction, intensity, duration) {
        this.direction.copy(direction).normalize();
        this.intensity = intensity;
        this.duration = duration;
        this.timer = duration;
    }
    
    update(dt, cameraPosition) {
        if (this.timer > 0) {
            this.timer -= dt;
            const progress = this.timer / this.duration; // 1.0 -> 0.0
            const decay = Math.pow(progress, 2); // curva exponencial suave
            const frequency = 45; // Hz de oscilação
            const offsetDist = Math.sin(this.timer * frequency) * this.intensity * decay;
            
            // Chacoalha perpendicularmente ou ao longo do vetor de impacto
            const shakeOffset = this.direction.clone().multiplyScalar(offsetDist);
            cameraPosition.add(shakeOffset);
        }
    }
}
```

### 3. CSS e Estilização dos Popups de Dano Glassmorphic
Adicionar as seguintes regras CSS para animação e visual dos números flutuantes:

```css
#popup-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 100;
}

.damage-popup {
    position: absolute;
    transform: translate(-50%, -50%);
    font-family: 'Cinzel', serif;
    font-weight: 900;
    font-size: 1.6rem;
    pointer-events: none;
    text-shadow: 0 0 8px rgba(0, 0, 0, 0.9), 0 0 15px currentColor;
    animation: popupFloat 1.0s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}

.damage-popup.critical {
    font-size: 2.5rem;
    letter-spacing: 2px;
    animation: popupCriticalFloat 1.2s cubic-bezier(0.18, 0.89, 0.32, 1.5) forwards;
}

.damage-popup.stamina-alert {
    color: #ff3333 !important;
    font-size: 1.2rem;
    animation: popupStaminaFloat 0.8s ease-out forwards;
}

@keyframes popupFloat {
    0% {
        opacity: 0;
        transform: translate(-50%, 0) scale(0.5);
    }
    15% {
        opacity: 1;
        transform: translate(-50%, -40px) scale(1.1);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -100px) scale(0.9);
    }
}

@keyframes popupCriticalFloat {
    0% {
        opacity: 0;
        transform: translate(-50%, 0) scale(0.2) rotate(-15deg);
    }
    20% {
        opacity: 1;
        transform: translate(-50%, -50px) scale(1.3) rotate(5deg);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -140px) scale(1.0) rotate(-5deg);
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Destruição do Colosso e Encerramento**: Ao derrotar o Colosso Voxel, a tela de vitória deve exibir estatísticas especiais da batalha (tempo levado, acertos críticos desferidos, XP total acumulado) ou apenas carregar o modal padrão?
   * *Proposta do PO*: **Sim, exibir estatísticas de batalha.** Isso agrega um forte apelo competitivo para speedruns e rejogabilidade.
2. **Lava Geysers e IA dos Monstros**: Os inimigos menores da Fase 3 devem ativamente evitar as Poças de Lava Volcânica, ou eles caminharão cegamente sobre elas?
   * *Proposta do PO*: **Deixar que caminhem cegamente.** Como PO, priorizo a agência do jogador (Player Agency). Permitir que o jogador "baite" ou atraia os monstros para dentro do fogo é uma tática de combate extremamente divertida, satisfatória e gratificante.
3. **Escalar o Colosso com Dificuldade**: A quantidade de HP do Colosso e dos cristais deve escalar dinamicamente baseado no nível alcançado pelo jogador ou nos upgrades roguelite selecionados?
   * *Proposta do PO*: **Sim, leve escala.** Se o jogador atingir um nível alto (ex: > Nível 8) devido a uma build de alto rendimento, o Colosso deve ganhar um multiplicador sutil de vida ($+8\%$ por nível acima do Nível 5) para manter o desafio interessante.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

Abaixo estão homologadas as resoluções técnicas para execução direta:

1. **Design de Partição dos Voxels do Colosso (Aprovado)**: A malha tridimensional do Colosso será uma composição hierárquica em `THREE.Group()`, contendo sub-meshes geométricas representando torso, braços gigantescos articulados e núcleo de energia. No início da Fase 3, as peças externas da armadura devem ser desmembradas definindo matrizes de velocidade independentes com força de gravidade no eixo Y para efeito cênico de "Armadura Quebrada", seguido de remoção em 2.5 segundos.
2. **Gerenciamento de Frequência do Popups DOM (Garbage Collector)**: Para evitar lentidão de layout (reflows) com muitos popups simultâneos de dano, o contêiner DOM deve ser limpo de forma síncrona. Elementos DOM de popups expirados **devem** ser excluídos ativamente com `.remove()` na finalização do callback de animação.
3. **Volume e Conexões de Áudio Procedurais**: O AudioContext deve passar por um nó de ganho mestre regulado em `0.45` para evitar saturação harmônica (clipping) ao misturar o rugido pesado do chefe com explosões de habilidades do jogador.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `voxel_arena` (Voxel Arena)
* **Ação**: Nova tarefa de level design e arquitetura adicionada ao backlog global.
* **Status do Backlog**: Transicionado para `📋 Backlog` no [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md).
* **Destino**: Pronto para ser refinado ou diretamente desenvolvido pelas equipes.

*Assinado: Antigravity - Senior Game Product Owner (PO)*
