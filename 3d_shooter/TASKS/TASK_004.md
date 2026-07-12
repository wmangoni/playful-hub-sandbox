# 📝 TASK-3D_SHOOTER: Elementos Interativos de Level Design: Portas com Chaves, Paredes Secretas e Barris Explosivos

## 👤 User Story
* **Como** jogador do minijogo **3D Shooter** que busca uma experiência tática de exploração e level design clássico retrô,
* **Eu quero** interagir com portas de correr que exigem cartões de acesso coloridos, descobrir paredes secretas empurráveis que ocultam compartimentos de suprimentos e detonar barris explosivos tóxicos de forma estratégica,
* **Para que** o combate em primeira pessoa apresente maior profundidade estratégica de navegação (loops de chave e fechadura), segredos recompensadores de exploração e perigos ambientais interativos.

---

## 🎯 Critérios de Aceitação

1. **Sistema de Portas de Correr (Sliding Doors)**:
   * Adicionar suporte a portas no grid do mapa:
     * **Porta Comum (Tipo 9)**: Abre livremente.
     * **Porta de Acesso Vermelha (Tipo 10)**: Requer o Cartão de Acesso Vermelho.
     * **Porta de Acesso Azul (Tipo 11)**: Requer o Cartão de Acesso Azul.
   * **Mecânica de Interação**: O jogador pode interagir com as portas pressionando a tecla `E` (ou botão de interação) estando a menos de 1.5 unidades de distância da porta.
   * **Comportamento Lógico**:
     * A ativação transiciona a porta do estado `'closed'` para `'opening'`.
     * A abertura dura exatamente 1.0 segundo. O progresso (`progress` variando de 0.0 a 1.0) deve ser refletido na renderização 3D como um deslizamento lateral.
     * Uma vez aberta (`'open'`), a porta permanece aberta por 5.0 segundos antes de transicionar para `'closing'`.
     * **Detecção de Obstrução**: Se o jogador ou um inimigo estiver localizado fisicamente na célula da porta durante o estado `'closing'`, a porta deve imediatamente parar de fechar e reabrir (`'opening'`), evitando que as entidades fiquem presas.
     * **Física e Visibilidade**: Portas abertas (`status === 'open'`) não devem registrar colisão em `isWall()` nem obstruir raycasts/linhas de visão dos inimigos, permitindo tráfego e disparos diretos através da fenda da porta.

2. **Cartões de Acesso (Keycards & Inventory Indicator)**:
   * Criar dois novos itens colecionáveis (pickups):
     * **Red Keycard (Pickup Tipo 7)**: Representado no mundo por um cartão neon vermelho brilhante (`#ff3333`).
     * **Blue Keycard (Pickup Tipo 8)**: Representado no mundo por um cartão neon azul brilhante (`#3333ff`).
   * **Inventário**: Ao colidir com esses itens, eles são coletados, alterando `player.hasRedKey` ou `player.hasBlueKey` para `true` e disparando um som de coleta de item especial.
   * **Gating e Avisos no HUD**:
     * Tentar abrir uma Porta Vermelha (Tipo 10) sem o cartão correspondente deve manter a porta trancada, disparar na HUD um texto piscante vermelho "RED KEY REQUIRED!" por 2.0 segundos e tocar um som de acesso negado (lock buzzer).
     * Tentar abrir uma Porta Azul (Tipo 11) sem o cartão azul deve exibir a mensagem "BLUE KEY REQUIRED!" em azul neon na HUD e tocar o mesmo som de acesso negado.
     * Adicionar no HUD (ao lado dos indicadores de saúde/munição) dois pequenos slots neon correspondentes às chaves. Quando o jogador possuir um cartão, o slot correspondente deve brilhar intensamente em sua respectiva cor (`#ff3333` ou `#3333ff`).

3. **Paredes Secretas Camufladas (Pushwalls)**:
   * Adicionar suporte a paredes secretas (Tipo 12).
   * **Estética de Camuflagem**: A parede secreta deve ser renderizada usando a mesma textura/padrão de uma parede normal adjacente (ex: Tipo 1 - tijolos marrons) para ficar perfeitamente oculta.
   * **Ativação e Movimento**:
     * Quando o jogador se aproximar a menos de 1.5 unidades de distância da parede secreta e pressionar a tecla `E`, a parede secreta é revelada.
     * Tocar uma melodia/chime clássico de segredo encontrado e exibir na HUD um banner temporário ciano neon: "SECRET AREA REVEALED!".
     * A parede deve dissolver gradualmente (reduzindo sua opacidade `alpha` de 1.0 a 0.0 ao longo de 1.5 segundos).
     * Ao final da dissolução, a célula da parede secreta no grid `map` é convertida em `0` (espaço vazio), permitindo que o jogador passe e colete suprimentos anteriormente inacessíveis.

4. **Barris Explosivos Tóxicos (Environmental Hazards)**:
   * Criar um novo tipo de entidade no jogo: `toxic_barrel` (HP: 20, tamanho/raio: 0.4, cor: verde tóxico brilhante `#39ff14`).
   * **Mecânica Destrutível**: O barril pode receber disparos das armas do jogador, projéteis de inimigos ou sofrer impacto de outras explosões.
   * **Explosão e Splash Damage**:
     * Ao ter seu HP reduzido a 0, o barril explode, tornando-se inativo (`active = false`).
     * Disparar uma explosão que causa danos em área radial (raio de 2.0 unidades). O dano no centro é de 80 HP, decaindo linearmente a 0 na borda do raio de 2.0 unidades.
     * A explosão de um barril pode ferir inimigos, o jogador, e danificar outros barris adjacentes no raio, criando uma reação em cadeia de detonações.
     * **Poça Tóxica Temporária**: Na coordenada exata da explosão do barril, criar uma área circular tóxica verde neon visível no chão que dura 4.0 segundos. Qualquer entidade (jogador ou inimigo) que pisar ou permanecer sobre a poça tóxica perde 5 HP por segundo.
     * Efeito visual: Ejetar de 15 a 20 partículas dinâmicas verdes neon com efeito de fumaça verde e aplicar um leve tremor de tela.

5. **Efeitos de Som Procedurais (Web Audio API)**:
   * Sintetizar proceduralmente os efeitos sonoros em tempo real, eliminando dependência de arquivos externos:
     * *Abertura/Fechamento de Porta*: Ruído metálico de motor gerado por oscilador de dente de serra passa-baixa sofrendo rampa senoidal de frequência de 80Hz a 180Hz com ganho constante de 0.15.
     * *Acesso Negado (Lock Buzzer)*: Dois pulsos rápidos (80ms) de onda quadrada a 130Hz simulando um buzzer de trava elétrica.
     * *Segredo Revelado (Secret Chime)*: Um arpejo ascendente de 4 notas brilhantes usando ondas senoidais puras na escala maior de Dó (C4 -> E4 -> G4 -> C5) com reverb/eco simulado por envelope de ganho suave.
     * *Explosão do Barril Tóxico*: Ruído branco concentrado com declínio exponencial combinado com um filtro passa-baixa que varre de 400Hz para 40Hz em 0.6s, simulando uma detonação úmida e gasosa.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/3d_shooter/index.html` (e/ou scripts integrados).
* **Array de Portas e Segredos**:
  * Para gerenciar as portas do mapa dinamicamente, criar um array global `doorsList = []` mapeando suas posições e estados no início do jogo:
    ```javascript
    let doorsList = [];
    
    function initializeDoors() {
        doorsList = [];
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const cell = map[y][x];
                if (cell === 9 || cell === 10 || cell === 11) {
                    doorsList.push({
                        x: x,
                        y: y,
                        type: cell, // 9, 10 ou 11
                        status: 'closed', // 'closed', 'opening', 'open', 'closing'
                        progress: 0.0, // 0.0 (totalmente fechada) a 1.0 (totalmente aberta)
                        openTimer: 0.0
                    });
                }
            }
        }
    }
    ```
* **Adaptação no Raycasting (Sliding Door Rendering)**:
  * No loop DDA do `castRay()`, ao cruzar uma célula com tipo `9`, `10` ou `11`, verificar a lista `doorsList`:
    * Encontrar a porta no índice correspondente.
    * Calcular o ponto de intersecção exato na face da porta (`wallX`, parte fracionária do eixo X ou Y).
    * Se `wallX < door.progress`, o raio passou pela abertura. O DDA deve ignorar a colisão nesta etapa e continuar a travessia.
    * Se `wallX >= door.progress`, ocorre o impacto físico. Para simular a porta correndo lateralmente, ajustar a coordenada horizontal do mapeamento de textura da porta subtraindo `door.progress`.
* **Ação de Interação ('E')**:
  * Adicionar a tecla `e` (`KeyE`) no mapeamento de input do jogador (`keys`).
  * Na função `updatePlayer(dt)`, monitorar a ativação da tecla de interação. Ao pressionar, disparar uma checagem de proximidade em cone de visão:
    ```javascript
    function checkPlayerInteraction() {
        const interactDist = 1.5;
        // Calcular coordenada da célula diretamente em frente ao jogador
        const targetX = Math.floor(player.x + Math.cos(player.angle) * interactDist);
        const targetY = Math.floor(player.y + Math.sin(player.angle) * interactDist);
        
        // Verificar se há porta ou parede secreta
        const cell = map[targetY]?.[targetX];
        if (cell === 9 || cell === 10 || cell === 11) {
            interactWithDoor(targetX, targetY);
        } else if (cell === 12) {
            revealSecretWall(targetX, targetY);
        }
    }
    ```
* **Gerenciamento de Entidades do Barril**:
  * Adicionar no array de sprites globais os objetos do tipo `barrel` para que o motor de renderização `renderSprites()` desenhe-os com Z-sorting de distância.
  * Lógica de impacto do barril:
    * Na rotina de colisões e hitscan de disparos de arma, verificar se a linha do tiro cruza a hitbox do barril. Reduzir seu HP e desencadear a detonação ao zerar a vida.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Introduz gating estratégico clássico do gênero FPS retrô, elementos de exploração ambiental e perigos de combate ativos).
* **Esforço Estimado**: Média-Alta (Exige adaptação matemática fina no algoritmo de raycasting DDA para suportar colisões fracionárias de portas deslizantes e Z-sorting de entidades de barris interativos).
* **Área**: Front-end / Raycaster Engine Math / Game Design / Web Audio API.

---

## 🏗️ Refinamento Técnico (Technical Refinement)

### 1. Raycasting DDA com Portas Deslizantes (Sliding Progress)
Para renderizar a porta deslizando para o lado esquerdo (no sentido da coordenada horizontal da face do bloco), quando o raio intercepta o plano da porta, realizamos as seguintes manipulações matemáticas:

```javascript
// DENTRO DO LOOP DDA EM castRay(originX, originY, angle)
if (map[mapY][mapX] === 9 || map[mapY][mapX] === 10 || map[mapY][mapX] === 11) {
    const door = doorsList.find(d => d.x === mapX && d.y === mapY);
    if (door) {
        // Calcular onde o raio bateu no plano do grid (0.0 a 1.0)
        let hitCoord = 0;
        if (side === 0) { // Impacto na face vertical do grid (X constante)
            hitCoord = rayY - Math.floor(rayY);
        } else { // Impacto na face horizontal do grid (Y constante)
            hitCoord = rayX - Math.floor(rayX);
        }
        
        // Se a posição da colisão é menor que o progresso de abertura, o raio passa direto!
        if (hitCoord < door.progress) {
            // Ignorar colisão e continuar o loop DDA
            continue; 
        }
        
        // Caso contrário, colide! Ajusta wallX para simular a textura deslizando lateralmente
        let wallX = hitCoord - door.progress;
        // Retornar as informações do raio indicando que atingiu a porta
        return { distance, hit: map[mapX][mapY], wallX, side };
    }
}
```

### 2. Controle do Fluxo de Portas (Update Doors)
No loop de física de cada frame (`update`), atualizar o progresso de movimentação e contadores de tempo das portas:

```javascript
function updateDoors(dt) {
    doorsList.forEach(door => {
        if (door.status === 'opening') {
            door.progress += dt / 1.0; // Abre em 1 segundo
            if (door.progress >= 1.0) {
                door.progress = 1.0;
                door.status = 'open';
                door.openTimer = 5.0; // Permanece aberta por 5 segundos
            }
        } else if (door.status === 'open') {
            door.openTimer -= dt;
            if (door.openTimer <= 0) {
                // Checar se jogador ou inimigo obstrui a célula da porta antes de fechar
                const entitiesOnCell = checkEntitiesOnCell(door.x, door.y);
                if (!entitiesOnCell) {
                    door.status = 'closing';
                } else {
                    door.openTimer = 2.0; // Aguarda mais 2 segundos antes de tentar novamente
                }
            }
        } else if (door.status === 'closing') {
            // Se uma entidade entrar na porta enquanto ela estiver fechando, reabre imediatamente
            const entitiesOnCell = checkEntitiesOnCell(door.x, door.y);
            if (entitiesOnCell) {
                door.status = 'opening';
                return;
            }
            
            door.progress -= dt / 1.0; // Fecha em 1 segundo
            if (door.progress <= 0.0) {
                door.progress = 0.0;
                door.status = 'closed';
            }
        }
    });
}
```

### 3. Explosão e Splash Damage de Barril
Lógica matemática para infligir danos de explosão radial e propagação de reações em cadeia:

```javascript
function explodeBarrel(ex, ey) {
    const splashRadius = 2.0;
    const maxDamage = 80;
    
    // Tocar síntese de som de explosão e tremor de tela
    playToxicExplosionSound();
    triggerScreenShake(8, 0.4);
    
    // 1. Dano ao Jogador
    const distPlay = Math.sqrt(Math.pow(player.x - ex, 2) + Math.pow(player.y - ey, 2));
    if (distPlay <= splashRadius) {
        const damage = Math.round(maxDamage * (1.0 - distPlay / splashRadius));
        if (damage > 0) {
            damagePlayer(damage);
        }
    }
    
    // 2. Dano a Inimigos no Raio
    enemies.forEach(enemy => {
        if (enemy.state === 'dead' || enemy.state === 'dying') return;
        const distEnemy = Math.sqrt(Math.pow(enemy.x - ex, 2) + Math.pow(enemy.y - ey, 2));
        if (distEnemy <= splashRadius) {
            const damage = Math.round(maxDamage * (1.0 - distEnemy / splashRadius));
            if (damage > 0) {
                damageEnemy(enemy, damage);
            }
        }
    });
    
    // 3. Reação em Cadeia (Dano a outros barris no raio)
    barrels.forEach(otherBarrel => {
        if (!otherBarrel.active || (otherBarrel.x === ex && otherBarrel.y === ey)) return;
        const distBarrel = Math.sqrt(Math.pow(otherBarrel.x - ex, 2) + Math.pow(otherBarrel.y - ey, 2));
        if (distBarrel <= splashRadius) {
            const damage = Math.round(maxDamage * (1.0 - distBarrel / splashRadius));
            otherBarrel.health -= damage;
            if (otherBarrel.health <= 0) {
                // Detonar o próximo barril com pequeno delay de frames para game feel (chain link delay)
                setTimeout(() => {
                    if (otherBarrel.active) {
                        otherBarrel.active = false;
                        explodeBarrel(otherBarrel.x, otherBarrel.y);
                    }
                }, 150);
            }
        }
    });
    
    // Spawnar a poça tóxica no mapa
    spawnToxicPuddle(ex, ey);
}
```

### 4. Renderização do Indicador de Cartões de Acesso (HUD Glassmorphism)
Criar dois indicadores estéticos neon no HUD inferior ou lateral:

```javascript
function drawKeycardHUD(ctx, x, y) {
    const boxSize = 24;
    
    // Red Key Indicator
    ctx.strokeStyle = player.hasRedKey ? '#ff3333' : 'rgba(100, 20, 20, 0.3)';
    ctx.fillStyle = player.hasRedKey ? 'rgba(255, 51, 51, 0.25)' : 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, boxSize, boxSize);
    ctx.strokeRect(x, y, boxSize, boxSize);
    if (player.hasRedKey) {
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('R', x + 8, y + 17);
    }
    
    // Blue Key Indicator
    ctx.strokeStyle = player.hasBlueKey ? '#3333ff' : 'rgba(20, 20, 100, 0.3)';
    ctx.fillStyle = player.hasBlueKey ? 'rgba(51, 51, 255, 0.25)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x + 30, y, boxSize, boxSize);
    ctx.strokeRect(x + 30, y, boxSize, boxSize);
    if (player.hasBlueKey) {
        ctx.fillStyle = '#3333ff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('B', x + 38, y + 17);
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

Para garantir que o fluxo de desenvolvimento e a experiência do jogador estejam 100% alinhados, apresentamos as seguintes dúvidas arquiteturais:

1. **Inserção dos Cartões e Portas no Layout de Mapa Atual**:
   * *Dúvida*: Como devemos modificar o layout do mapa `mapData` para testar os cartões e as portas de correr? Devemos criar salas trancadas com as chaves guardadas no extremo oposto do labirinto ou apenas colocar um exemplo de cada na área central de spawn?
   * *Proposta*: Reorganizar a seção sudeste do mapa, criando uma sala trancada contendo uma super arma ou pickup de HP máximo, guardada por uma Porta Vermelha, com o Cartão Vermelho posicionado em uma sala secreta a noroeste do mapa.
2. **Tempo de Resposta para Obstrução de Portas**:
   * *Dúvida*: Quando a porta reabrir devido à presença do jogador/inimigo, ela deve permanecer aberta pelo tempo completo de 5 segundos novamente, ou deve tentar fechar após um tempo menor (ex: 2 segundos) para manter o ritmo rápido?
   * *Proposta*: Manter 2 segundos de retenção caso reaberta por obstrução de forma a otimizar a velocidade de navegação.
3. **Persistência das Poças Tóxicas**:
   * *Dúvida*: As poças de veneno deixadas pelas explosões de barris devem persistir indefinidamente no chão ou expirar após um tempo determinado para evitar lag de sprites e facilitar o level design?
   * *Proposta*: Expiração rígida após 4.0 segundos com decaimento visual (fade out de alfa).

---

## 💡 Decisões e Resoluções do Tech Lead (TL)
*(Seção a ser preenchida pelo Tech Lead durante o refinamento)*

---

## 💻 Notas de Desenvolvimento (Dev complete)
*(Seção a ser preenchida pelo Programador ao finalizar a tarefa)*

---

## 🔍 Code Review e Aprovação (TL)
*(Seção a ser preenchida pelo Tech Lead durante a revisão de código)*
