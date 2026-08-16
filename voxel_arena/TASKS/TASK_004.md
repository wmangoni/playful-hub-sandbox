# 📝 TASK-VOXEL_ARENA: Seleção de Classes de Heróis (Paladino, Arquimago & Assassino), Sistema de Relíquias Místicas Equipáveis, Arenas Biomáticas com Hazards Únicos e Sintetizador Áudio Procedural Expandido

## 👤 User Story
* **Como** guerreiro lendário e estrategista no universo ciber-medieval do minijogo **Voxel Arena** em Three.js,
* **Eu quero** escolher entre 3 classes de heróis jogáveis (Paladino Templário, Arquimago Elemental e Assassino Sombrio) com modelos 3D em voxel e conjuntos de habilidades exclusivas, encontrar e equipar relíquias místicas passivas em baús espalhados pela arena, e combater em 3 biomas alternativos (Masmorra Sombria, Templo de Lava e Cripta de Gelo) com perigos ambientais dinâmicos e áudio procedural expandido,
* **Para que** a experiência de combate atinja o auge de variabilidade estratégica de builds (Build Variety), rejogabilidade, profundidade tática de level design e excelência estética 3D ciber-medieval em HTML5.

---

## 🎯 Critérios de Aceitação

### 1. Sistema de Seleção de Classes de Heróis (Hero Class Selection System)
* **Interface de Seleção**: Inserir um painel glassmorphic de seleção de classe no Menu Inicial (`#start-screen`) permitindo ao jogador escolher o arquétipo antes de iniciar a partida.
* **🛡️ Paladino Templário Voxel**:
  * *Visual 3D*: Armadura prateada e dourada em voxels (`#d4af37`), capa vermelha e aura sagrada amarelada no solo.
  * *Modificadores de Atributo*: +30% Max HP (130 HP base), +20% Armadura (redução de dano passiva), -15% Velocidade de Movimento.
  * *Habilidades Exclusivas*:
    * `1` **Spin Radiante**: Golpe giratório com rastro dourado causando 35 de dano radiante em raio de 4 unidades.
    * `2` **Investida Sagrada (Shield Charge)**: Dash com escudo projetando repulsão física nos inimigos atingidos e reduzindo dano recebido em 50% durante a carga.
    * `3` **Prece da Luz**: Restaura 40 HP instantaneamente e concede invulnerabilidade divina por 1.5s com feixes de luz ascendentes.
    * `4` **Martelo de Titã (Ultimate)**: Invoca um martelo gigante de energia dourada caindo do céu no ponto de mira (`0,0,0`), causando 120 de dano massivo em raio de 12 unidades e estunando sobreviventes por 2.0s.
* **🔮 Arquimago Elemental Voxel**:
  * *Visual 3D*: Túnica ciano e violeta brilhante (`#00e5ff`, `#bd00ff`), cajado místico com cristal rotativo no topo emitindo luz pulsante.
  * *Modificadores de Atributo*: HP Base 80, +35% Regeneração de Stamina, Cooldowns de Habilidades reduzidos em 20%, Alcance de Magias +30%.
  * *Habilidades Exclusivas*:
    * `1` **Nova Arcana**: Dispara 8 esferas mágicas ciano em 360° a partir do jogador, perfurando o primeiro inimigo atingido.
    * `2` **Teletransporte Psíquico (Blink & Decoy)**: Teletransporta o mago 10 unidades na direção do movimento, deixando uma imagem ilusória holográfica que atrai a atenção dos monstros por 2.5s.
    * `3` **Barreira de Mana**: Consome 30% de stamina para erguer um escudo energético absorvendo até 50 de dano por 5 segundos.
    * `4` **Chuva de Meteoros Starlight (Ultimate)**: Conjura uma tempestade arcana caindo 10 meteoros incandescentes violetas na arena ao longo de 4 segundos.
* **🗡️ Assassino Sombrio Voxel**:
  * *Visual 3D*: Capuz negro e verde neon (`#00ff88`), adagas duplas cintilantes e rastro de fumaça sombria nos calcanhares.
  * *Modificadores de Atributo*: HP Base 90, +35% Velocidade de Movimento, +25% Chance de Acerto Crítico (multiplicador de dano crítico 2.5x).
  * *Habilidades Exclusivas*:
    * `1` **Dança das Lâminas**: Lança 3 adagas envenenadas em leque frontal infligindo dano de veneno contínuo (5 dano/s por 4s).
    * `2` **Passo das Sombras**: Dash invisível de alta velocidade atravessando inimigos sem colidir e garantindo 100% de acerto crítico no próximo golpe desferido em até 3s.
    * `3` **Preparação Furtiva**: Regenera 50 de stamina e reseta instantaneamente o tempo de recarga do *Passo das Sombras*.
    * `4` **Tempestade de Adagas Executora (Ultimate)**: Teletransporta-se em milissegundos entre os 5 inimigos mais próximos, desferindo golpes letais instantâneos com congelamento de impacto (hitstop) e partículas cortantes.

### 2. Sistema de Relíquias Místicas Equipáveis (Mystic Artifacts System)
* **Baús de Relíquias (Relic Chests)**:
  * A cada 2 ondas concluídas ou ao derrotar Inimigos Elites/Chefe, um Baú de Relíquia em voxel dourado (`#ffd700`) com feixe de luz vertical fluorescente surge na arena.
  * Aproximar-se do baú e pressionar `E` (ou colidir) abre uma modal glassmorphic de seleção de relíquia (pausando a simulação).
* **Pool de Relíquias Passivas (Escolha 1 entre 3)**:
  * 💎 **Coração de Voxel**: +30% de HP Máximo e regeneração passiva de 2 HP a cada segundo.
  * ⚡ **Anel do Trovão**: Ataques básicos e habilidades disparam faíscas elétricas em cadeia (*Chain Lightning*) atingindo até 3 inimigos próximos com 15 de dano elétrico.
  * 🩸 **Cálice Vampírico**: Concede 6% de Roubo de Vida (*Lifesteal*) em todo dano causado pelo jogador.
  * 👁️ **Olho do Dragão**: Aumenta a Chance de Crítico em +20% e revela a barra de vida numérica de todos os inimigos na arena.
  * 🛡️ **Égide da Tempestade**: Dispara uma onda de choque de repulsão massiva com 25 de dano sempre que a vida do jogador cai abaixo de 30%.
  * ⏳ **Ampulheta Arcana**: Reduz o tempo de recarga de todas as habilidades ativas em 25%.
* **HUD de Relíquias Equipadas**: Exibir os ícones SVG das relíquias ativas no canto inferior esquerdo do HUD.

### 3. Biomas Biomáticos & Hazards Dinâmicos de Arena (Biomes & Unique Hazards)
Permitir a seleção do Bioma no Menu Inicial antes de entrar na partida:
* 🏰 **Masmorra Sombria (Dark Catacombs - Padrão)**:
  * Bioma clássico de pedra negra e tochas violetas com o *Gravity Nexus* ativo no centro.
* 🌋 **Templo de Lava (Lava Sanctuary)**:
  * *Visual*: Solo de cinzas vulcânicas com rios e poças de lava incandescente em luz vermelha/laranja emissiva (`#ff3300`).
  * *Hazard de Lava*: Pisar na lava causa 6 de dano de queimadura por segundo.
  * *Erupções de Geysers*: Colunas de fogo verticais surgem em pontos aleatórios marcados com círculos de aviso 2s antes.
* ❄️ **Cripta de Gelo (Glacial Tomb)**:
  * *Visual*: Piso de gelo ciano translúcido cristalino (`#00e5ff`) com reflexos especulares e névoa gelada.
  * *Física de Gelo*: Atrito reduzido em 40% (o jogador derrapa levemente ao mudar de direção, exigindo controle preciso).
  * *Queda de Estalactites*: Cones de gelo afiados caem do teto da cripta. Círculos vermelhos de aviso surgem no solo 1.5s antes do impacto (causa 20 de dano e diminui a velocidade do jogador em 30% por 3s).

### 4. Áudio Sintetizado Procedural Expandido (Web Audio API)
Sem dependência de arquivos de áudio externos MP3/WAV:
* **Nova Arcana / Magia Arcana**: Varredura de frequência senoidal ascendente em $600\text{ Hz} - 2200\text{ Hz}$ com envelope de decaimento suave.
* **Passo das Sombras / Adagas**: Chiado agudo por ruído branco filtrado com passa-banda e corte rápido.
* **Impacto Radiante do Paladino**: Acorde harmônico consonante em escala maior com oscilador dente-de-serra modulado.
* **Abertura de Baú de Relíquias**: Arpejo triunfal de 4 notas ascendentes na escala pentatônica com brilho senoidal.
* **Queda de Estalactite**: Som de cristal ruidoso em alta frequência seguido por estrondo grave de impacto no gelo.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivos Alvo**: `/voxel_arena/index.html`.
* **Framework**: Three.js (WebGL 3D) & Web Audio API nativa.
* **Estruturas de Dados Globais**:
  ```javascript
  let selectedClass = 'paladin'; // 'paladin', 'mage', 'rogue'
  let selectedBiome = 'catacombs'; // 'catacombs', 'lava', 'glacier'
  let activeRelics = []; // Array de relíquias coletadas
  ```
* **Gerenciamento de Instâncias e Pooling**:
  * Utilizar Object Pooling para projéteis de magias, partículas de relíquias e estalactites de gelo.
  * Garantir descarte correto com `.dispose()` em geometrias e materiais dinâmicos.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Introduce variedade imensa de gameplay com 3 classes distintas, sistema de relíquias com sinergias e biomas com físicas únicas).
* **Esforço Estimado**: Alta (Exige refatoração da seleção de heróis, física de gelo/atrito no Three.js, gerador de relíquias e receitas completas de áudio sintetizado).
* **Área**: Computação Gráfica 3D (Three.js) / Game Design / Web Audio API / Interface CSS Glassmorphism.

---

## 🏗️ Refinamento Técnico (Technical Refinement pelo Tech Lead)

### 1. Definição do Objeto de Configuração `HERO_CLASSES` e Construtor Voxel
```javascript
const HERO_CLASSES = {
    paladin: {
        name: "Paladino Templário",
        hp: 130, speed: 5.2, armor: 0.20, staminaRegen: 1.0,
        colorArmor: 0xd4af37, colorCape: 0xc0392b, colorAura: 0xffd700,
        skills: { spin: "Spin Radiante", dash: "Investida Sagrada", heal: "Prece da Luz", ult: "Martelo de Titã" }
    },
    mage: {
        name: "Arquimago Elemental",
        hp: 80, speed: 6.0, armor: 0.0, staminaRegen: 1.35,
        colorArmor: 0xbd00ff, colorCape: 0x00e5ff, colorAura: 0x00ffff,
        skills: { spin: "Nova Arcana", dash: "Teletransporte Psíquico", heal: "Barreira de Mana", ult: "Chuva de Meteoros" }
    },
    rogue: {
        name: "Assassino Sombrio",
        hp: 90, speed: 8.5, armor: 0.05, staminaRegen: 1.15, critChance: 0.25,
        colorArmor: 0x111111, colorCape: 0x00ff88, colorAura: 0x00ff88,
        skills: { spin: "Dança das Lâminas", dash: "Passo das Sombras", heal: "Preparação Furtiva", ult: "Tempestade de Adagas" }
    }
};
```

### 2. Algoritmo de Raios Elétricos em Cadeia (Chain Lightning - Anel do Trovão)
```javascript
function triggerChainLightning(startPos, initialTarget, damage, depth = 3) {
    let currentPos = startPos.clone();
    let currentTarget = initialTarget;
    const visited = new Set();

    for (let i = 0; i < depth; i++) {
        if (!currentTarget) break;
        visited.add(currentTarget);

        // Renderizar raio elétrico visual entre currentPos e target
        createLightningMesh(currentPos, currentTarget.mesh.position);
        currentTarget.takeDamage(damage, '#00ffff');
        playChainLightningSound();

        currentPos = currentTarget.mesh.position.clone();
        
        // Encontrar próximo inimigo mais próximo não visitado
        let nextTarget = null;
        let minDist = 8.0; // Alcance máximo do salto elétrico
        enemies.forEach(e => {
            if (!visited.has(e) && e.hp > 0) {
                const d = currentPos.distanceTo(e.mesh.position);
                if (d < minDist) {
                    minDist = d;
                    nextTarget = e;
                }
            }
        });
        currentTarget = nextTarget;
    }
}
```

### 3. Física de Atrito em Piso de Gelo (Glacial Tomb)
```javascript
function updateIcePhysics(playerVelocity, moveDirection, dt) {
    if (selectedBiome === 'glacier') {
        const iceFriction = 0.94; // Baixo atrito
        const iceAcceleration = 22.0;
        
        playerVelocity.x = playerVelocity.x * iceFriction + moveDirection.x * iceAcceleration * dt;
        playerVelocity.z = playerVelocity.z * iceFriction + moveDirection.z * iceAcceleration * dt;
    } else {
        // Atrito normal de solo firme
        playerVelocity.x = moveDirection.x * playerSpeed;
        playerVelocity.z = moveDirection.z * playerSpeed;
    }
}
```

### 4. Arpejo Triunfal de Abertura de Baú via Web Audio API
```javascript
function playChestOpenSound() {
    if (!audioCtx) return;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
        setTimeout(() => {
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
            } catch (e) {}
        }, idx * 80);
    });
}
```

---

## ❓ Dúvidas para o TL ou o PO

1. **Acúmulo de Relíquias de Mesma Espécie**:
   * *Dúvida*: O jogador pode selecionar a mesma relíquia mais de uma vez para somar seus efeitos (ex: pegar 2 *Corações de Voxel* para ter +60% HP)?
   * *Proposta do PO*: **Sim, permitir stacking de até 3x.** Isso possibilita criar builds focadas (ex: Full Lifesteal ou Full Crit).
2. **Troca de Bioma durante a Partida**:
   * *Dúvida*: O bioma pode ser trocado entre as ondas ou fica travado durante toda a run selecionada no menu inicial?
   * *Proposta do PO*: **Travado durante a run.** A seleção do bioma define a identidade daquela partida no Start Screen.
3. **Desbloqueio de Classes**:
   * *Dúvida*: As 3 classes devem estar desbloqueadas desde o início ou o Arquimago e o Assassino exigem conquistas prévias (ex: sobreviver à Onda 3)?
   * *Proposta do PO*: **Todas desbloqueadas desde o início.** Priorizar a agência do jogador para testar os 3 estilos de jogo imediatamente.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

1. **Stacking de Relíquias (Aprovado)**:
   * **Decisão**: Permitido stacking até 3x por relíquia, multiplicando ou somando os atributos base no `playerState`.
2. **Isolamento de Bioma (Aprovado)**:
   * **Decisão**: O bioma é configurado na inicialização da cena Three.js via `selectedBiome` e permanece imutável até o Game Over ou Reinício.
3. **Acesso Livre de Classes (Aprovado)**:
   * **Decisão**: Paladino, Arquimago e Assassino 100% disponíveis na tela inicial com cards descritivos dos atributos.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

* **Identificação do Jogo**: `voxel_arena` (Voxel Arena)
* **Ação**: Especificação técnica refinada e adicionada ao backlog global.
* **Status no BACKLOG.md**: `✅ Refined`.
* **Próximo Passo**: Pronto para codificação por desenvolvedor.

*Assinado: Antigravity - Senior Game Product Owner (PO)*
