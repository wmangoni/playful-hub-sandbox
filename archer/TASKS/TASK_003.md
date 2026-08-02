# 📝 TASK-ARCHER: Obstáculos Físicos Dinâmicos, Arsenal de Flechas Especiais e Câmera Lenta Bullet-Time com Sintetizador de Áudio Procedural

## 👤 User Story
*   **Como** atirador experiente no minijogo **The Archer**,
*   **Eu quero** selecionar e disparar flechas especiais (Flecha Tripla, Flecha de Fogo Perfurante e Flecha Gravitacional), desviar de obstáculos móveis desafiadores (Nuvens de Tempestade Elétricas e Escudos Rotativos) e experimentar feedback sensorial imersivo de câmera lenta Bullet-Time e áudio procedural sintetizado,
*   **Para que** o game feel seja extremamente gratificante, exigindo planejamento tático e maior precisão técnica na pontuação.

---

## 🎯 Critérios de Aceitação
1.  **Obstáculos Físicos Dinâmicos**:
    *   *Nuvens de Tempestade (Storm Clouds)*: Spawnar nuvens escuras no topo do cenário que flutuam em velocidade constante. Se a flecha colidir com uma nuvem de tempestade, a flecha é desintegrada e partículas de centelhas elétricas são emitidas no local.
    *   *Escudos Rotativos (Wooden Shields)*: Posicionar escudos de madeira rotativos na trajetória média dos balões. Se a flecha colidir com eles, ela deve ricochetear fisicamente, mudando sua trajetória horizontal/vertical e caindo de forma realista até o solo.
2.  **Arsenal de Flechas Especiais (Special Arrow Inventory)**:
    *   O jogador pode selecionar entre 3 tipos de flechas especiais clicando em ícones dedicados no HUD ou pressionando as teclas numéricas `1` (Normal), `2` (Tripla), `3` (Fogo) e `4` (Gravitacional).
    *   O limite de flechas especiais é definido por partida: 3 cargas de **Flecha Tripla (Split Shot)**, 2 cargas de **Flecha de Fogo (Fire Arrow)** e 2 cargas de **Flecha Gravitacional (Gravity Arrow)**.
    *   *Flecha Tripla (Split Shot)*: Dispara 3 flechas em leque (+/- 10 graus de dispersão angular) de uma única vez, consumindo 1 carga e 1 flecha padrão.
    *   *Flecha de Fogo (Fire Arrow)*: Atravessa balões comuns sem ser destruída, estourando todos em sua trajetória. É dissipada apenas ao sair do canvas ou colidir com nuvens de tempestade.
    *   *Flecha Gravitacional (Gravity Arrow)*: Imune a ventos laterais. Possui um campo magnético leve que atrai fisicamente balões a até 60px de distância em direção à ponta da flecha.
3.  **Câmera Lenta de Ação (Bullet-Time)**:
    *   A simulação deve entrar em câmera lenta (0.25x da velocidade normal) quando a última flecha da partida (`arrowsLeft === 1`) for disparada e estiver a menos de 80px de colidir com qualquer balão, ou quando o balão da fortuna (dourado) for atingido em alta velocidade.
    *   A tela deve receber uma vinheta escura suave e redução cromática durante a câmera lenta, restaurando o tempo normal ao finalizar o frame ou após a colisão.
4.  **Sintetizador de Áudio Procedural (Web Audio API)**:
    *   Implementar efeitos sonoros procedurais gerados dinamicamente via sintetizador Web Audio API:
      *   *Puxar corda (Tension)*: Frequência ascendente de onda triangular imitando tensão de corda.
      *   *Disparo (Launch)*: Onda senoidal descendente curta com leve ruído branco ("twang").
      *   *Estouro (Pop)*: Onda de choque sonora arpejada de alta frequência com decay rápido.
      *   *Ricochete (Bounce)*: Som metálico curto de clique com pitch variável.
      *   *Erro/Combo Break*: Tom grave e descendente.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/archer/index.html`.
*   **Controle de Múltiplas Flechas**:
    *   Substituir a flecha única por um array de flechas ativas `activeArrows = []` para possibilitar a flecha tripla.
    *   No gameLoop, varrer `activeArrows` atualizando a física, verificando limites e colisões de cada flecha.
*   **Mecanismo de Ricochete**:
    *   Calcular a distância entre o centro do escudo rotativo (círculo ou retângulo) e a ponta da flecha.
    *   Ao colidir, aplicar a reflexão do vetor de velocidade: `vx = -vx * 0.5` e `vy = -vy * 0.3` e aplicar rotação livre de rota de queda.
*   **Web Audio API Synth**:
    *   Instanciar um `AudioContext` global `audioCtx` que inicia no primeiro clique do usuário no canvas.
    *   Criar funções auxiliares de oscilação e ganho (`playTensionSound`, `playLaunchSound`, `playPopSound`, `playBounceSound`).

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Garante o game feel premium de alto impacto estético e inovação técnica de áudio nativo).
*   **Esforço Estimado**: Alta (Requer refatoração do motor de flecha única para array e modelagem física de ricochetes).
*   **Área**: Front-end / Motor de Física / Síntese de Áudio / UI-UX.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Modelagem Física dos Obstáculos Móveis
*   **Nuvens de Tempestade**:
    Representadas pelo objeto `stormCloud = { x: 300, y: 50, vx: 1.5, width: 100, height: 40 }`.
    Movimentam-se no topo da tela (entre 50px e 120px de bottom) oscilando de lado a lado.
    Se `detectRectCollision(arrow, stormCloud)` for verdadeiro:
    - Destruir a flecha.
    - Disparar `createElectricSparkEffect(arrow.x, arrow.y)`.
    - Tocar o efeito de faísca elétrica.
*   **Escudos de Madeira Rotativos**:
    Representados por `woodenShield = { x: 500, y: 250, radius: 30, angle: 0, speed: 0.05 }`.
    O escudo gira ao redor do seu centro físico.
    Ao colidir com a flecha, aplicamos a colisão elástica:
    ```javascript
    function handleShieldCollision(arrow, shield) {
        // Inverte velocidade horizontal
        arrow.vx = -arrow.vx * 0.5;
        // Adiciona componente vertical descendente ou ascendente dependendo do impacto
        arrow.vy = (arrow.vy > 0 ? -1 : 1) * Math.abs(arrow.vy) * 0.3;
        arrow.isRicocheted = true; // Permite a flecha girar descontroladamente na queda
        createWoodSparks(arrow.x, arrow.y);
        playBounceSound();
    }
    ```

### 2. Arsenal de Flechas Especiais e Gerenciamento de Array
A classe de disparo deve instanciar múltiplos objetos de flecha no vetor global `activeArrows`:
```javascript
let activeArrows = [];
let selectedArrowType = 'normal'; // 'normal', 'split', 'fire', 'gravity'
let arrowAmmo = {
    split: 3,
    fire: 2,
    gravity: 2
};

function fireSelectedArrow() {
    if (arrowsLeft <= 0) return;
    
    if (selectedArrowType === 'normal') {
        spawnArrow(arrowAngle, arrowSpeed);
    } else if (selectedArrowType === 'split' && arrowAmmo.split > 0) {
        spawnArrow(arrowAngle - 0.15, arrowSpeed);
        spawnArrow(arrowAngle, arrowSpeed);
        spawnArrow(arrowAngle + 0.15, arrowSpeed);
        arrowAmmo.split--;
    } else if (selectedArrowType === 'fire' && arrowAmmo.fire > 0) {
        const arrowObj = spawnArrow(arrowAngle, arrowSpeed);
        arrowObj.type = 'fire';
        arrowAmmo.fire--;
    } else if (selectedArrowType === 'gravity' && arrowAmmo.gravity > 0) {
        const arrowObj = spawnArrow(arrowAngle, arrowSpeed);
        arrowObj.type = 'gravity';
        arrowAmmo.gravity--;
    }
    
    updateAmmoHUD();
}
```

### 3. Mecanismo de Magnetismo da Flecha Gravitacional
Para a `Gravity Arrow`, o motor de física varre a lista de balões ativos. Se a distância até a flecha for menor que 60px, aplica-se uma aceleração gravitacional no balão em direção à ponta da flecha:
```javascript
function applyGravityArrowPull(arrow) {
    if (arrow.type !== 'gravity') return;
    
    activeBalloons.forEach(b => {
        const dx = arrow.x - b.x;
        const dy = arrow.y - b.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 60) {
            // Puxa o balão levemente na direção da flecha
            const force = (60 - distance) * 0.05;
            b.x += (dx / distance) * force;
            b.y += (dy / distance) * force;
        }
    });
}
```

### 4. Câmera Lenta Bullet-Time
O loop de renderização e física do jogo utilizará um multiplicador de tempo dinâmico `timeScale` (por padrão `1.0`):
```javascript
let timeScale = 1.0;
let isBulletTime = false;

function updatePhysics() {
    const dt = 16.66 * timeScale; // Aplica escala de tempo no deltaTime
    
    // Atualizar posição das flechas ativas
    activeArrows.forEach(arrow => {
        if (arrow.type === 'gravity') {
            applyGravityArrowPull(arrow);
        }
        
        // Aplicação da gravidade e vento escalados
        arrow.vy -= gravity * (dt / 16.66);
        arrow.x += (arrow.vx + (windSpeed * windSensitivity)) * (dt / 16.66);
        arrow.y += arrow.vy * (dt / 16.66);
        
        // Ativação de Bullet-Time
        if (arrowsLeft === 1 && !isBulletTime) {
            const distanceToTarget = checkCloseDistanceToBalloons(arrow);
            if (distanceToTarget < 80) {
                activateBulletTime();
            }
        }
    });
}

function activateBulletTime() {
    isBulletTime = true;
    timeScale = 0.25;
    document.getElementById('game-container').style.filter = 'saturate(0.5) contrast(1.2)';
    document.getElementById('game-container').style.boxShadow = '0 0 25px rgba(0,0,0,0.8)';
}

function deactivateBulletTime() {
    isBulletTime = false;
    timeScale = 1.0;
    document.getElementById('game-container').style.filter = 'none';
    document.getElementById('game-container').style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
}
```

### 5. Áudio Procedural Synthesizer
Estruturação da Web Audio API para tocar ruídos e osciladores sintetizados em tempo real:
```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playPopSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function playBounceSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
}
```

---

## ❓ Dúvidas para o TL ou o PO
1.  **Refill de Flechas Especiais**: O jogador pode recuperar cargas de flechas especiais durante a partida (ex: estourando o Balão da Fortuna ou atingindo um Combo Streak de 10 acertos)?
    *   *Opção A*: Sim. Atingir 10x de combo ou estourar o balão dourado concede +1 carga de flecha especial aleatória.
    *   *Opção B*: Não. As cargas são estritamente limitadas por partida para incentivar o uso racional da munição.
    *   *Recomendação do PO*: **Opção A**. Isso promove momentos de recompensa dinâmicos e melhora o engajamento do jogador.
2.  **Duração de Bullet-Time**: O Bullet-Time deve ter um tempo máximo de encerramento automático caso a flecha não acerte nada?
    *   *Recomendação do PO*: Sim, limite o Bullet-Time a um máximo de **3 segundos de tempo real** para evitar que o jogo permaneça em câmera lenta indefinidamente se a flecha errar e continuar subindo no horizonte.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)
1.  **Refill de Flechas Especiais**: **Aprovado o cenário de Opção A**. Sempre que o jogador estourar o Balão da Fortuna ou atingir múltiplos de 5 no combo (5, 10, 15, etc.), ele receberá +1 de carga em uma das flechas especiais aleatoriamente.
2.  **Duração de Bullet-Time**: **Aprovado**. Limitar a câmera lenta a **3 segundos** ou até que todas as flechas ativas caiam/desapareçam da tela. Isso mantém o dinamismo clássico do arcade intacto.
3.  **Mixagem e Segurança de Som**: A ativação do `AudioContext` deve ser atrelada estritamente ao evento de interação do usuário (`mousedown` ou `touchstart` de puxada do arco) para contornar restrições de reprodução automática dos navegadores modernos.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Refatoração de Código Duplicado em `index.html`**: **Decisão:** Sim, a refatoração deve ser feita antes. Unifique as funções duplicadas e os event listeners redundantes. Um código limpo e modular é pré-requisito para as novas features (flechas múltiplas, etc.).
2. **Estrutura de Atributos/Variáveis para Flechas Especiais**: **Decisão:** Sim. Elimine completamente o uso de variáveis escalares (como `arrowFired`, `arrowVelocityX`) e consolide o loop físico para iterar apenas sobre `activeArrows`.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `archer` (The Archer)
* **Ação**: Resolução de dúvidas técnicas do desenvolvedor.
* **Status do Backlog**: Transicionado para `✅ Refined` em `BACKLOG.md`.

---

## 💻 Notas de Desenvolvimento (Desenvolvedor)

* **Refatoração realizada**: Código duplicado limpo e unificado em `index.html`.
* **Gerenciamento de Flechas**: Sistema refatorado para operar com o array `activeArrows`.
* **Arsenal de Flechas Especiais**:
  * Implementadas as flechas **Tripla (Split Shot)**, **Fogo (Fire Arrow)** e **Gravitacional (Gravity Arrow)** com visualização no HUD e seletores por teclado (`1`, `2`, `3`, `4`).
  * Sistema de recarga ativado ao acertar o Balão Dourado ou combos múltiplos de 5.
* **Obstáculos Físicos**:
  * **Nuvem de Tempestade**: Desintegra a flecha ao impacto com efeito de faíscas elétricas e áudio de sizzle.
  * **Escudo Rotativo de Madeira**: Ricocheteia a flecha com inversão de velocidade e física de queda tumbling.
* **Câmera Lenta Bullet-Time**: Ativada a 0.25x quando a última flecha está próxima do balão ou ao atingir o Balão Dourado em alta velocidade, limitada a 3 segundos.
* **Áudio Procedural**: Web Audio API integrado para puxada do arco, disparo, estouro de balão, ricochete, faíscas e combo break.

---

## 🔍 Code Review (Tech Lead)

### 📋 Avaliação Geral
* **Status**: ✅ **APROVADO (Ready for QA)**
* **Arquivos Analisados**: `/archer/index.html`

### 🎯 Validação dos Critérios de Aceitação:
1. **Obstáculos Físicos Dinâmicos**: 
   - ✅ Nuvens de tempestade oscilando e desintegrando a flecha com faíscas ciano e efeito sonoro de sizzle (`playCloudHitSound`).
   - ✅ Escudo rotativo de madeira retratado em SVG com rotação contínua e colisão elástica com inversão de vetor e tumbling physics (`isRicocheted`).
2. **Arsenal de Flechas Especiais**:
   - ✅ Seleção por teclado (`1`-`4`) e por slots visuais no HUD.
   - ✅ Munição por partida com recarga dinâmica em Balão Dourado e múltiplos de 5 no combo.
   - ✅ Flechas Tripla (em leque), Fogo (perfurante) e Gravitacional (campo magnético em balões) funcionando perfeitamente.
3. **Câmera Lenta Bullet-Time**:
   - ✅ Ativação a 0.25x quando a última flecha se aproxima do alvo (< 85px) ou em hits de alta velocidade no Balão Dourado.
   - ✅ Banner pulsante e desaturação/contraste aplicados no container, com timeout automático de 3s.
4. **Áudio Procedural (Web Audio API)**:
   - ✅ Síntese limpa com osciladores e envelopes sem dependência de assets externos.
   - ✅ Inicialização amigável de `AudioContext` no primeiro evento do usuário.

### 🏛️ Qualidade da Arquitetura & Código:
- Código limpo, modular e sem duplicações.
- Gerenciamento eficiente do array `activeArrows`.
- Transição de status efetuada no `BACKLOG.md` de `In review` para `Ready for QA`.



