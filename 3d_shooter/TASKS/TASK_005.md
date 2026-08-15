# 📝 TASK-3D_SHOOTER-005: Modo Arena Survival por Ondas, Inimigos Drones Voadores Anti-Gravidade, Elevadores Físicos de Nível e Batalha Boss Cyber-Demon Colossal

## 👤 User Story
* **Como** jogador apaixonado por FPS retrô e combate tático no minijogo **3D Shooter**,
* **Eu quero** enfrentar hordas progressivas de inimigos no modo Arena Survival, combater drones voadores com física de anti-gravidade, utilizar elevadores de nível para alcançar passarelas elevadas (High Ground) e encarar o confronto multiestágio contra o colossal Cyber-Demon,
* **Para que** a experiência de tiro em primeira pessoa atinja o ápice de profundidade tática de level design, variedade de combates ambientais, engajamento e imersão audiovisual premium sem dependência de assets externos.

---

## 🎯 Critérios de Aceitação

1. **Modo Arena Survival por Ondas (Wave Survival Mode)**:
   * **Seleção no Menu Inicial**: Adicionar no menu de início a escolha entre **Modo Campanha** e **Modo Arena Survival**.
   * **Design do Mapa da Arena**:
     * Grid retangular 24x24 com colunas centrais de cobertura, 4 plataformas elevadas e 4 pontos de spawn neon (`spawn_point_1` a `4`) nos cantos da arena.
     * Entre as ondas, o jogo entra em **Fase de Preparação (10 segundos)**, exibindo no centro da tela um cronômetro regressivo neon e fazendo spawn de pacotes de munição e medkits na arena.
   * **Escalada de Dificuldade (Waves 1 a 10+)**:
     * A cada nova onda, a quantidade de inimigos aumenta (+2 por onda) e seu HP base é multiplicado por $+12\%$.
     * Introdução progressiva de novos tipos de inimigos: soldados básicos (Onda 1), Cyber-Imps (Onda 2), Drones Voadores (Onda 3) e o Chefe Cyber-Demon (Ondas 5 e 10).
   * **HUD Glassmorphic de Ondas**:
     * Indicador superior exibindo a onda atual (`WAVE 04/10`), contagem de inimigos vivos (`ENEMIES: 05/18`) e multiplicador de combo de pontuação.
     * Banner flutuante pulsante com animação de entrada ao concluir a onda: *"WAVE COMPLETED! PREPARE FOR THE NEXT ASSAULT"*.

2. **Inimigos Voadores Drones Anti-Gravidade (Anti-Gravity Drones - Tipo 13)**:
   * **Visual 3D**: Sprite de drone metálico ciberpunk com núcleo ciano brilhante e rotores de luz neon (`#00e5ff`).
   * **Comportamento Tático e Movimentação**:
     * O drone flutua a uma altura variável entre 0.8 e 1.5 unidades acima do solo, utilizando uma oscilação senoidal suave em tempo real ($y_{offset} = \sin(t \cdot 3.0) \cdot 0.3$).
     * Mantém uma distância tática de 4 a 6 unidades do jogador, realizando strafe lateral helicoidal para esquivar de projéteis lentos (como os mísseis).
   * **Ataque Laser Duplo**:
     * A cada 1.8 segundos, dispara 2 projéteis lasers ciano paralelos de alta velocidade ($12\text{ unidades/s}$) em direção à posição atual do jogador.
   * **Renderização Raycaster (Sprite Height Offset)**:
     * O algoritmo de renderização de sprites `renderSprites()` deve aceitar uma propriedade `yOffset` para deslocar verticalmente o sprite do drone no buffer de tela, simulando voo real em 3D.

3. **Elevadores Físicos de Nível e Plataformas Móveis (Level Elevators - Tipo 14)**:
   * **Bloco de Elevador (Tipo 14)**:
     * Renderizado no grid com textura de plataforma metálica com faixas de aviso amarelo e preto neon.
   * **Mecânica de Elevação do Jogador**:
     * Quando a posição do jogador entra no raio da célula do elevador ($d < 0.6$), a plataforma é ativada.
     * A elevação visual e física transiciona o `player.eyeZ` (altura dos olhos) de $0.0$ para $1.2$ unidades ao longo de 1.5 segundos (velocidade constante).
     * Enquanto elevado, o jogador ganha acesso visual sobre as paredes baixas da arena ($1.0$ unidade de altura), podendo disparar de cima para baixo contra os inimigos na arena inferior (*High Ground Advantage*).
   * **Descida Automática**:
     * Após permanecer 4.0 segundos no topo, o elevador desce suavemente de volta ao nível do solo.

4. **Batalha contra o Chefe Colossal "Cyber-Demon Core" (Multistage Boss)**:
   * Surge nas Ondas 5 e 10 na área central da arena (Tamanho visual 2.5x maior que um soldado padrão, HP Base: 500).
   * **Fase 1: Escudo Energético Defletor (HP 500 - 350)**:
     * O chefe inicia envolvido por um campo de força hexagonal rotativo azul (`#0088ff`). Disparos diretos no escudo são refletidos sem causar dano.
     * Para desativar o escudo, o jogador deve usar as passarelas ou elevadores para acessar e destruir 2 **Geradores de Energia** nas plataformas elevadas dos cantos.
   * **Fase 2: Barragem de Mísseis e Onda de Choque Sísmica (HP 350 - 150)**:
     * Com o escudo desativado, o chefe lança periodicamente 3 mísseis termoguiados em arco.
     * A cada 5.0 segundos, ele pisa fortemente no solo, criando uma **Onda de Choque Sísmica** expansiva (raio de 4.0 unidades). Jogadores no nível do solo dentro do raio recebem 25 de dano. A onda pode ser evitada saltando ou subindo no elevador.
   * **Fase 3: Modo Berserker Hyper-Beam (HP 150 - 0)**:
     * O chefe brilha em vermelho sangue neon (`#ff0033`), aumenta sua velocidade de perseguição em $+40\%$ e carrega um feixe contínuo **Hyper-Beam** de plasma que varre 180° à sua frente.

5. **Áudio Procedural Sintetizado (Web Audio API)**:
   * **Zumbido dos Drones**: Oscilador senoidal com modulação de frequência LFO de 6Hz simulando motores de levitação anti-gravidade.
   * **Elevador em Movimento**: Som mecânico grave de rampa senoidal ($50\text{Hz} \to 110\text{Hz}$) com filtro passa-baixa e ruído de roldanas.
   * **Rugido e Onda de Choque do Boss**: Ruído branco denso com varredura exponencial passa-baixa ($450\text{Hz} \to 30\text{Hz}$) acompanhado de tremor de tela de 400ms.
   * **Vitória de Onda (Wave Clear)**: Fanfarra arpejada triunfal de 4 notas ascendentes na escala pentatônica maior.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/3d_shooter/index.html` (e scripts de engine integrados).
* **Estrutura de Estado da Arena Survival**:
  ```javascript
  let gameMode = 'campaign'; // 'campaign' ou 'survival'
  let survivalState = {
      wave: 1,
      maxWaves: 10,
      enemiesRemaining: 0,
      totalEnemiesInWave: 0,
      prepTimer: 10.0,
      isPrepPhase: false,
      scoreMultiplier: 1.0
  };
  
  let bossState = {
      active: false,
      phase: 1, // 1, 2 ou 3
      shieldActive: true,
      generatorsLeft: 2,
      shockwaveTimer: 0.0,
      hyperBeamActive: false
  };
  ```

* **Renderização de Sprites com Height Offset no Raycaster**:
  No loop de renderização de sprites `renderSprites()`, incorporar a elevação vertical do drone e a altura da câmera do jogador:
  ```javascript
  // Modificação no cálculo do Y de renderização do sprite no Canvas
  const spriteHeight = Math.abs(Math.floor(canvas.height / transformY));
  const spriteYOffset = (sprite.yOffset || 0) * spriteHeight; // Deslocamento de voo do drone
  const playerEyeOffset = (player.eyeZ || 0) * spriteHeight; // Elevação da câmera no elevador
  
  const spriteScreenY = Math.floor((canvas.height - spriteHeight) / 2) - spriteYOffset + playerEyeOffset;
  ```

* **Lógica de Colisão e Atualização do Elevador**:
  ```javascript
  function updateElevators(dt) {
      const playerCellX = Math.floor(player.x);
      const playerCellY = Math.floor(player.y);
      
      if (map[playerCellY]?.[playerCellX] === 14) {
          // Jogador está sobre o tile do elevador
          if (player.eyeZ < 1.2) {
              player.eyeZ = Math.min(1.2, player.eyeZ + dt * 0.8);
              playElevatorSound();
          }
      } else {
          // Descida gradual ao sair do elevador
          if (player.eyeZ > 0.0) {
              player.eyeZ = Math.max(0.0, player.eyeZ - dt * 1.0);
          }
      }
  }
  ```

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Introduz replayability ilimitada com o modo Survival por ondas, elevação vertical 3D em raycaster e uma batalha de chefe memorável em 3 estágios).
* **Esforço Estimado**: Alta (Exige ajustes na matemática de projeção de Y no Raycaster DDA para suporte a sprites voadores e altura de olho variável, além da máquina de estados do boss e gerador de áudio).
* **Área**: Front-end / Raycaster 3D Math Engine / Game Design / Web Audio API.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Ondas e Tabela de Spawn Dinâmico
```javascript
const WAVE_CONFIG = [
    { wave: 1, enemies: { soldier: 6, imp: 0, drone: 0 }, prepTime: 10 },
    { wave: 2, enemies: { soldier: 8, imp: 3, drone: 0 }, prepTime: 10 },
    { wave: 3, enemies: { soldier: 6, imp: 4, drone: 4 }, prepTime: 10 },
    { wave: 4, enemies: { soldier: 8, imp: 6, drone: 6 }, prepTime: 10 },
    { wave: 5, enemies: { soldier: 4, imp: 4, drone: 4, boss: 1 }, prepTime: 15 },
    // Ondas 6 a 10 escalam a densidade em +20%
];

function startNextWave() {
    survivalState.wave++;
    survivalState.isPrepPhase = false;
    const config = WAVE_CONFIG[Math.min(survivalState.wave - 1, WAVE_CONFIG.length - 1)];
    
    spawnWaveEnemies(config.enemies);
    playWaveStartSound();
    showHUDNotification(`WAVE ${survivalState.wave} STARTED!`, '#00e5ff');
}
```

### 2. Algoritmo de Flutuação e IA do Drone Voador
```javascript
function updateDrones(dt) {
    const time = performance.now() * 0.001;
    enemies.forEach(enemy => {
        if (enemy.type === 13 && enemy.health > 0) { // Anti-Gravity Drone
            // 1. Oscilação Senoidal Vertical
            enemy.yOffset = 0.5 + Math.sin(time * 3.0 + enemy.x) * 0.3;
            
            // 2. Mantém Distância Tática e Strafe Lateral
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5.0) {
                // Aproxima do jogador
                enemy.x += (dx / dist) * enemy.speed * dt;
                enemy.y += (dy / dist) * enemy.speed * dt;
            } else if (dist < 3.0) {
                // Recua se o jogador se aproximar muito
                enemy.x -= (dx / dist) * enemy.speed * dt;
                enemy.y -= (dy / dist) * enemy.speed * dt;
            } else {
                // Strafe lateral helicoidal
                const strafeX = -dy / dist;
                const strafeY = dx / dist;
                enemy.x += strafeX * Math.sin(time * 2.0) * enemy.speed * dt;
                enemy.y += strafeY * Math.sin(time * 2.0) * enemy.speed * dt;
            }
            
            // 3. Disparo Laser Duplo
            enemy.attackTimer -= dt;
            if (enemy.attackTimer <= 0) {
                shootDualLaser(enemy);
                enemy.attackTimer = 1.8;
            }
        }
    });
}
```

### 3. Máquina de Estados e Disparo da Onda de Choque do Cyber-Demon
```javascript
function updateBoss(dt) {
    if (!bossState.active || boss.health <= 0) return;
    
    // Transição de Fases por HP
    if (boss.health > 350) {
        bossState.phase = 1;
    } else if (boss.health > 150) {
        if (bossState.phase === 1) {
            bossState.phase = 2;
            bossState.shieldActive = false;
            showHUDNotification("BOSS SHIELD SHATTERED!", '#ff9900');
        }
    } else {
        if (bossState.phase !== 3) {
            bossState.phase = 3;
            boss.speed *= 1.4;
            showHUDNotification("BOSS BERSERKER MODE!", '#ff0033');
        }
    }
    
    // Onda de Choque Sísmica (Fase 2 e 3)
    if (bossState.phase >= 2) {
        bossState.shockwaveTimer -= dt;
        if (bossState.shockwaveTimer <= 0) {
            triggerBossShockwave();
            bossState.shockwaveTimer = 5.0;
        }
    }
}

function triggerBossShockwave() {
    playBossRoarSound();
    triggerScreenShake(12, 0.5);
    
    const distToPlayer = Math.sqrt(Math.pow(player.x - boss.x, 2) + Math.pow(player.y - boss.y, 2));
    // Se o jogador estiver no nível do solo (eyeZ < 0.3) e dentro do raio de 4.0 unidades, recebe dano!
    if (distToPlayer <= 4.0 && player.eyeZ < 0.3) {
        damagePlayer(25);
        showHUDNotification("SEISMIC SHOCKWAVE HIT! USE ELEVATORS!", '#ff0000');
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Atribuição de Teclas para Seleção do Modo Arena**:
   * *Dúvida*: A seleção do Modo Arena deve ser feita através de botões na interface HTML/CSS da tela inicial ou via atalho de teclado (ex: tecla `M`)?
   * *Proposta*: Incluir dois botões retrô com brilho neon na tela inicial: `[ CAMPAIGN MODE ]` e `[ ARENA SURVIVAL ]`.
2. **Tempo de Duração do Hyper-Beam do Chefe**:
   * *Dúvida*: O feixe contínuo da Fase 3 deve durar quanto tempo e qual a frequência da varredura?
   * *Proposta*: O feixe deve durar 2.0 segundos varrendo um arco de 180°, com aviso luminoso vermelho piscando no chão 1.0s antes da ativação.
3. **Persistência de Recordes da Arena (High-Scores)**:
   * *Dúvida*: A onda máxima alcançada e a pontuação total devem ser salvas no `localStorage`?
   * *Proposta*: Sim, salvar a chave `3dShooterSurvivalHighScore` exibindo o recorde no painel superior da HUD.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Interface de Seleção de Modo (Aprovado)**:
   * **Decisão**: Aprovada a inclusão dos dois botões de modo na tela inicial HTML/CSS com estilo retrô neon.
2. **Varredura e Aviso do Hyper-Beam (Aprovado)**:
   * **Decisão**: O aviso prévio com linha guia vermelha laser por 1.0s é essencial para manter a justiça do desafio (*Fair Play*), seguido por 2.0s de emissão do feixe de dano.
3. **Persistência do High-Score (Aprovado)**:
   * **Decisão**: Salvar a maior onda e a maior pontuação acumulada no `localStorage`.

---

## 🚀 Status da Especificação

* **Identificação do Jogo**: `3d_shooter` (3D Shooter)
* **Ação**: Especificação técnica e critérios de aceitação validados e aprovados pelo Tech Lead.
* **Status no BACKLOG.md**: `✅ Refined`
* **Próximo Passo**: Pronto para desenvolvimento e codificação por um Software Engineer.

*Assinado: Antigravity - Senior Game Product Owner (PO)*  
*Refinado por: Antigravity - Senior Tech Lead*
