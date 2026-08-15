# 📝 TASK-ARCHER: Chefe Sky Leviathan (Dragão dos Céus), Rajadas de Vento Dinâmicas, Armaria de Arcos Equipáveis e Skill Shot Zoom

## 👤 User Story
*   **Como** jogador sênior e mestre arqueiro no minijogo **The Archer**,
*   **Eu quero** enfrentar o épico Chefe Sky Leviathan com hitboxes múltiplas e ataques de esferas de fogo, gerenciar rajadas dinâmicas de vento imprevisíveis, equipar arcos ciber e élficos com atributos únicos na Armaria, e sentir a emoção do Skill Shot Zoom e rugido de sintetizador procedural,
*   **Para que** a experiência de jogo atinja o nível máximo de imersão, complexidade tática e qualidade visual/sonora digna de um arcade AAA em HTML5.

---

## 🎯 Critérios de Aceitação

1.  **Batalha Epica de Chefe: Sky Leviathan (O Dragão dos Céus)**:
    *   *Gatilho de Surgimento*: O Chefe Sky Leviathan surge ao atingir **500 pontos** ou ao completar 5 rodadas com sucesso.
    *   *Hitboxes Múltiplas*: O chefe cruza o topo da tela em movimento senoidal suave com 3 áreas de colisão distintas:
        *   **Cabeça (Head)**: Dano standard ($1.0\times$ do dano base da flecha).
        *   **Asas de Dragão (Wings)**: Dano reduzido ($0.5\times$ do dano base).
        *   **Coração Dourado / Ponto Fraco (Heart)**: Dano crítico ($3.0\times$ do dano base), emitindo feixes de luz neon dourada e som de acerto crítico.
    *   *Ataque Ativo de Esferas de Fogo (Fireball Projectiles)*: A cada $4.0 - 6.0$ segundos, o chefe conjura 1 a 2 esferas de fogo em direção ao arqueiro. O jogador pode neutralizar a esfera de fogo acertando-a com uma **Flecha de Fogo** ou **Flecha Gravitacional**, ou desviá-la antes que cause perda imediata de 1 flecha do inventário.

2.  **Rajadas Dinâmicas de Vento Mudantes (Dynamic Wind Gusts)**:
    *   O indicador de vento passa a simular vento orgânico e instável com rajadas periódicas baseadas em interpolação senoidal e perturbação de ruído.
    *   O HUD de vento ganha uma **Biruta Visual (Wind Vane)** animada que inclina em tempo real para a esquerda ou direita e altera sua opacidade e tom de cor de acordo com a intensidade instantânea da rajada ($0.0$ a $5.0$).

3.  **Armaria de Arcos Equipáveis (Bow Workshop / Armaria)**:
    *   Disponibilizar uma modal glassmorphic de **Armaria (Workshop)** acessível pela tela inicial ou pelo HUD antes de iniciar o disparo.
    *   Opções de Arcos desbloqueáveis por pontuação máxima histórica (`localStorage`):
        *   🎯 **Arco Recurvo Clássico** (Padrão - Desbloqueado): Velocidade $1.0\times$, Sensibilidade ao Vento $1.0\times$.
        *   ⚡ **Arco de Titânio Ciber** (Requer 300 pts): Velocidade de flecha $+25\%$ ($1.25\times$), trajetória mais plana, cor azul neon.
        *   🍃 **Arco Élfico do Vento** (Requer 600 pts): Redução de $50\%$ no efeito de desvio por vento (Resistência ao Vento $+50\%$), cor verde neon.

4.  **Skill Shot Zoom & Câmera Dinâmica (Hit-Cam Zoom)**:
    *   Ao acertar o **Coração do Chefe** ou realizar um disparo de longa distância ($\text{distância} > 550\text{px}$), o container do jogo aplica uma aceleração suave de Zoom e Pan (`scale(1.12)` centrado no ponto de colisão) durante $600\text{ms}$.
    *   Efeito de vinheta brilhante dourada e desaceleração sutil de tempo durante o zoom para maximizar o *game feel*.

5.  **Áudio Procedural Synthesizer Ampliado (Web Audio API)**:
    *   *Rugido do Leviathan (Roar)*: Frequência grave de oscilador `sawtooth` modulada por um `BiquadFilterNode` tipo `lowpass` com varredura de corte.
    *   *Esfera de Fogo (Fireball Charge & Launch)*: Efeito de chiado por ruído branco modulado e estouro de colisão.
    *   *Fanfarra de Vitória*: Sequência triunfal de notas arpejadas na escala pentatônica ao derrotar o chefe.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/archer/index.html`.
*   **Padrão de Game State & Composite Objects**:
    *   Estrutura do objeto `bossState`:
        ```javascript
        let bossState = {
            active: false,
            hp: 300,
            maxHp: 300,
            x: 800,
            y: 100,
            baseY: 100,
            phase: 1,
            time: 0,
            fireballs: [],
            hitboxes: {
                head: { offsetX: -40, offsetY: 0, radius: 25, mult: 1.0 },
                heart: { offsetX: 0, offsetY: 15, radius: 16, mult: 3.0 },
                wings: { offsetX: 50, offsetY: -10, radius: 35, mult: 0.5 }
            }
        };
        ```
*   **Equipamento de Arcos (Strategy Pattern)**:
    *   Definição da tabela de atributos `BOW_TYPES`:
        ```javascript
        const BOW_TYPES = {
            classic: { name: "Arco Recurvo Clássico", speedMult: 1.0, windSens: 1.0, color: "#8B4513", reqScore: 0 },
            titanium: { name: "Arco de Titânio Ciber", speedMult: 1.25, windSens: 1.0, color: "#00e5ff", reqScore: 300 },
            elfin: { name: "Arco Élfico do Vento", speedMult: 1.0, windSens: 0.5, color: "#00ff66", reqScore: 600 }
        };
        let currentBowKey = 'classic';
        ```
*   **Lógica do Vento Dinâmico com Rajadas**:
    ```javascript
    function calculateDynamicWind(t) {
        // Base de vento estática + onda de rajada + ruido de alta frequencia
        const gust = Math.sin(t * 0.002) * 1.5 + (Math.random() * 0.4 - 0.2);
        return parseFloat((windBaseSpeed + gust).toFixed(1));
    }
    ```

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Introduce combate contra chefe, armaria de arcos e câmera dinâmica, transformando o jogo em uma experiência completa de nível profissional).
*   **Esforço Estimado**: Alta (Exige refatoração do motor de vento, gerenciamento do chefe de múltiplas hitboxes e sintetizador áudio expandido).
*   **Área**: Front-end / Motor de Física 2D / UX-UI / Web Audio API.

---

## 🛠️ Refinamento Técnico (Technical Refinement pelo Tech Lead)

### 1. Arquitetura do Chefe Sky Leviathan e Projéteis Ativos
O Chefe opera como uma máquina de estados finita (FSM):
*   **Fase 1 (HP 100% a 50%)**: Translação horizontal suave com oscilação vertical senoidal $y(t) = y_{base} + 30 \cdot \sin(0.003 \cdot t)$. Dispara 1 esfera de fogo a cada $5.0\text{s}$.
*   **Fase 2 (HP < 50% - Rage Mode)**: Velocidade de translação aumentada em $+40\%$, oscilação senoidal dupla $y(t) = y_{base} + 45 \cdot \sin(0.006 \cdot t)$, dispara 2 esferas de fogo simultâneas com aviso de rugido.

```javascript
function updateSkyLeviathan(dt) {
    if (!bossState.active) return;
    bossState.time += dt;
    
    // Movimento senoidal do Boss
    const speedMult = bossState.hp < (bossState.maxHp * 0.5) ? 1.4 : 1.0;
    bossState.x -= 1.2 * speedMult;
    if (bossState.x < -150) bossState.x = 850; // Loop na tela
    
    bossState.y = bossState.baseY + Math.sin(bossState.time * 0.003 * speedMult) * 35;
    
    // Renderizar e atualizar hitboxes do Leviathan
    renderBossSVG(bossState.x, bossState.y);
    
    // Gerenciamento de Esferas de Fogo
    updateFireballs(dt);
}
```

### 2. Algoritmo de Trajetória e Colisão com Hitboxes
Ao processar a física das flechas em `activeArrows`, a verificação contra o chefe testa cada uma das 3 hitboxes circulares para aplicar o multiplicador de dano correto:
```javascript
function checkArrowBossCollision(arrow) {
    if (!bossState.active) return false;
    
    for (const [part, hb] of Object.entries(bossState.hitboxes)) {
        const hbx = bossState.x + hb.offsetX;
        const hby = bossState.y + hb.offsetY;
        const dist = Math.hypot(arrow.x - hbx, arrow.y - hby);
        
        if (dist < hb.radius) {
            const baseDamage = 25;
            const finalDamage = baseDamage * hb.mult;
            bossState.hp = Math.max(0, bossState.hp - finalDamage);
            
            if (part === 'heart') {
                triggerHitCamZoom(arrow.x, arrow.y);
                createCriticalSparks(arrow.x, arrow.y);
                spawnFloatingText(arrow.x, arrow.y, "CRITICAL HEART! -75", "#ffd700");
                playPopSound(true); // Fanfarra
            } else {
                spawnFloatingText(arrow.x, arrow.y, `-${finalDamage} (${part.toUpperCase()})`, "#ff4500");
                playPopSound(false);
            }
            
            if (bossState.hp <= 0) {
                defeatSkyLeviathan();
            }
            return true; // Destruir flecha
        }
    }
    return false;
}
```

### 3. Câmera Dinâmica (Hit-Cam Zoom)
Aplicação de transformação de matriz suave no container do jogo sem provocar repintura pesada (GPU accelerated via `transform: scale() translate()`):
```javascript
function triggerHitCamZoom(targetX, targetY) {
    const container = document.getElementById('game-container');
    const originX = (targetX / 800) * 100;
    const originY = (targetY / 500) * 100;
    
    container.style.transformOrigin = `${originX}% ${originY}%`;
    container.style.transform = 'scale(1.10)';
    container.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    setTimeout(() => {
        container.style.transform = 'scale(1.0)';
        container.style.transformOrigin = 'center center';
    }, 600);
}
```

### 4. Rugido do Leviathan via Sintetizador Web Audio API
```javascript
function playLeviathanRoarSound() {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.8);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.4);
        filter.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.8);
        
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.85);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.85);
    } catch (e) {}
}
```

---

## ❓ Dúvidas para o TL ou o PO

1.  **Persistência dos Arcos Desbloqueados**:
    *   *Dúvida*: Como devemos armazenar o progresso de desbloqueio dos novos arcos?
    *   *Proposta*: Salvar no `localStorage` sob a chave `archerUnlockedBows` como um array JSON (`['classic', 'titanium', 'elfin']`), revalidando sempre contra a pontuação máxima recorde `archerHighScore`.
2.  **Comportamento ao Derrotar o Sky Leviathan**:
    *   *Dúvida*: Derrotar o chefe deve encerrar a partida com vitória instantânea ou conceder um bônus maciço de pontos (+500 pts) e recarga total de 5 flechas para o jogador continuar a pontuar no modo infinito?
    *   *Proposta*: Conceder **+500 pontos bônus**, **recarga total de flechas** e efeito visual de explosão de confetis neon, mantendo o jogador no fluxo de gameplay.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1.  **Persistência dos Arcos (Aprovada)**:
    *   **Decisão**: Utilizar `localStorage` com chave `archerUnlockedBows` com validação síncrona no carregamento da página. Se a pontuação recorde `archerHighScore` for maior que o requisito ($300$ ou $600$), o arco deve ser marcado automaticamente como desbloqueado na Armaria.
2.  **Fluxo de Vitória do Chefe (Aprovado)**:
    *   **Decisão**: **Conceder +500 pts**, restaurar o contador de flechas para o máximo ($5$ flechas) e recarregar $+1$ munição de cada flecha especial, disparando o rugido de derrota e explosão física de partículas SVG.
3.  **Segurança de Desempenho e Áudio**:
    *   **Diretriz**: Garantir o encerramento rígido dos nós de áudio com `osc.onended = () => { osc.disconnect(); gain.disconnect(); }` para evitar vazamentos de memória na Web Audio API em rajadas longas de combate.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

*   **Status da Especificação**: ✅ **Aprovado pelo Tech Lead** - Especificação técnica completa, com arquitetura limpa, modelagem matemática rigorosa e pronta para ser assumida pelo desenvolvedor.
