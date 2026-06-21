# ⚔️ TASK-VOXEL_ARENA: Progressão Roguelite: Ondas Dinâmicas de Inimigos Elites, Sistema de XP Orbs & Draft de Upgrades de Atributos e Habilidades

## 👤 User Story
* **Como** guerreiro calejado no minijogo **Voxel Arena**,
* **Eu quero** enfrentar hordas progressivas de inimigos com comportamentos distintos (incluindo Elites lentas e letais, e Stalkers ágeis), coletar esferas de XP brilhantes com atração magnética, e escolher entre upgrades de atributos e habilidades em um painel roguelite de luxo ao subir de nível,
* **Para que** cada sessão de jogo seja única, estratégica, dinâmica e forneça uma curva de progresso altamente viciante e satisfatória.

---

## 🎯 Critérios de Aceitação

1. **Sistema de Ondas Dinâmicas (Wave System & Progression)**:
   * **Fluxo de Ondas**: Substituir o spawn contínuo e estático por um sistema estruturado de **5 Ondas Progressivas**, com duração de 60 segundos cada.
   * **Banners de Alerta Neon**: A cada transição de onda, exibir no HUD um banner flutuante em CSS com animação de escala e brilho ("WAVE 1", "WAVE 2", etc.), com tipografia medieval premium.
   * **Parâmetros de Onda**:
     * *Onda 1*: Dificuldade Baixa (Apenas inimigos Básicos, spawn rate de 3.0s, máximo de 8 inimigos ativos).
     * *Onda 2*: Introdução de Elites (Basic e Brutes, spawn rate de 2.5s, máximo de 12 inimigos).
     * *Onda 3*: Introdução de Stalkers (Basic, Brutes e Stalkers, spawn rate de 2.0s, máximo de 15 inimigos).
     * *Onda 4*: Ritmo Frenético (Inimigos mistos, spawn rate de 1.5s, máximo de 18 inimigos).
     * *Onda 5 (Sobrevivência Final)*: Horda Máxima (Spawn rate de 1.0s, máximo de 25 inimigos ativos, agressividade de IA aumentada).
   * **Vitória por Tempo**: O jogo é vencido se o jogador sobreviver até o fim do cronômetro da Onda 5 (300 segundos totais).

2. **Novos Inimigos Dinâmicos (Voxel Brutes & Shadow Stalkers)**:
   * **Voxel Brute (Elite - Onda 2+)**:
     * *Aparência*: Geometria de escala aumentada (1.8x). Material de armadura vermelho sangue escuro (`#4a0a0a`), com dois grandes olhos brilhantes em amarelo neon (`#ffcc00`, `emissiveIntensity: 3.5`).
     * *Atributos*: Vida monumental (120 HP), velocidade lenta (3 unidades/s), e dano pesado de impacto (15 HP por golpe).
   * **Voxel Stalker (Rápido - Onda 3+)**:
     * *Aparência*: Geometria compacta e esguia (escala 0.7x). Material de armadura verde ácido escuro/sombra (`#052410`), com olhos brilhantes em azul ciano neon (`#00ffff`, `emissiveIntensity: 3.5`).
     * *Atributos*: Vida frágil (25 HP), velocidade ultra rápida (9 unidades/s), e dano rápido e irritante (6 HP por golpe, mas com cooldown de ataque reduzido de 1.5s para 0.8s).

3. **Mecânica de XP Orbs e Atração Magnética (Physics & Collection)**:
   * **Spawn de Orbs**: Toda vez que um inimigo for eliminado, instanciar na cena 3D um **XP Orb** no local da morte física.
   * **Aparência**: Um pequeno cristal procedural giratório (`THREE.OctahedronGeometry` com raio 0.3) envolto por uma luz sutil neon amarela/ouro (`#ffd700`, blending aditivo, rotação procedural constante).
   * **Física de Magnetismo**: Implementar uma força magnética reativa. Se o XP Orb estiver a uma distância de até **8.0 unidades** do jogador, ele deve ser atraído ativamente pelo jogador, voando e acelerando em sua direção.
   * **Absorção de XP**: Ao colidir com o jogador (distância < 1.2), conceder XP ao jogador e remover a mesh com segurança:
     * Inimigo Básico: +15 XP
     * Inimigo Stalker: +20 XP
     * Inimigo Brute (Elite): +40 XP
   * **Atualização do HUD**: A barra `xp-fill` deve ser preenchida de forma animada até 100%.

4. **Painel de Upgrades Roguelite (Draft System Modal)**:
   * **Gatilho de Level Up**: Ao preencher a barra de XP (Fórmula: $XP_{req} = level \times 120$), o jogador sobe de nível.
   * **Pausa Sistêmica**: O loop de física e atualização do jogo é pausado instantaneamente (`this.isRunning = false`).
   * **Interface Draft Premium**: Exibir uma modal suspensa com desfoque de fundo extremo (`backdrop-filter: blur(12px)`) e **3 cartas de upgrade aleatórias**. As cartas devem ter hover dinâmico em 3D, bordas douradas rúnicas e gradientes neon vibrantes.
   * **Pool de Upgrades Estilo Roguelite**:
     * *Lâmina do Caçador*: Dano de ataque básico aumentado em +15%.
     * *Armadura do Gigante*: Aumenta o HP Máximo em +20 e cura instantaneamente +40 HP.
     * *Manto do Vento*: Velocidade de movimento aumentada em +12%.
     * *Foco Rúnico*: Regeneração de Stamina acelerada em +25%.
     * *Fúria Giratória*: Reduz o cooldown do *Spin Attack* (Skill 1) em 20%.
     * *Estela Relâmpago*: Aumenta o alcance e reduz em 15% o cooldown do *Dash* (Skill 2).
     * *Cálice Divino*: Aumenta a eficácia da cura do *Heal* (Skill 3) em +30%.
     * *Cúpula Solar*: Aumenta o raio e dano da explosão da *Ultimate* (Skill 4) em +25%.
   * **Confirmação**: Ao selecionar o upgrade, aplicar o modificador nos atributos do jogador, resetar o XP atual com o excedente mantido, incrementar o nível e retomar o jogo perfeitamente.

5. **Combate Tático & Gestão de Stamina**:
   * **Custos de Ação**: Atividades de combate passam a consumir a barra de Stamina (`stamina-fill` azul):
     * *Ataque Básico (Left Click)*: Consome 8 Stamina.
     * *Defesa Ativa (Right Click)*: Consome 15 Stamina por segundo ativa.
     * *Spin Attack (1)*: Consome 20 Stamina.
     * *Dash (2)*: Consome 15 Stamina.
     * *Heal (3)*: Consome 30 Stamina.
     * *Ultimate (4)*: Consome 50 Stamina.
   * **Fórmula de Regeneração**: A Stamina regenera a uma taxa de 25 por segundo naturalmente. Se o jogador ficar imóvel por mais de 1.0s, a taxa de regeneração sobe para 45 por segundo.
   * **Feedback de Exaustão**: Se o jogador tentar conjurar uma habilidade ou desferir um golpe sem Stamina suficiente, a ação é bloqueada, a barra de Stamina pisca rapidamente em vermelho neon no HUD (`@keyframes staminaPulse`) e um efeito curto de som ou aviso visual sutil é exibido.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivo Alvo**: `/voxel_arena/index.html`.
* **Framework**: Three.js (WebGL) e Vanilla JS/CSS.
* **Arquitetura de Gerenciamento de Entidades**:
  Adicionar a classe `XpOrb` para controle do ciclo de vida, renderização e atração magnética.
* **Estrutura de Gestão de Ondas**:
  Implementar no `Game` a estrutura `WaveSystem` para orquestrar as frequências e limites de spawn, bem como o banner flutuante no DOM.
* **Modelo Roguelite**:
  Adicionar propriedades de modificadores ao `Player` (ex: `damageMultiplier = 1.0`, `speedMultiplier = 1.0`, `staminaRegenBonus = 1.0`, etc.) aplicados dinamicamente nos cálculos matemáticos.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Modifica fundamentalmente a jogabilidade básica de Voxel Arena de um sandbox monótono para um loop roguelite imersivo e competitivo).
* **Esforço Estimado**: Alta (Requer integração física de atração de vetores 3D, gerenciamento estruturado de waves, injeção de múltiplos inimigos na IA e painel HTML/CSS reativo com estado pausado).
* **Área**: Game Design / Lógica 3D / Física de Vetores (Three.js) / Design UI-UX (Modal & Anim).

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Product Owner experiente em level design e em estreito alinhamento com o Tech Lead, estabeleci a arquitetura de dados e os algoritmos exatos de movimentação física e gestão de ondas para garantir máxima performance a 60 FPS estáveis:

### 1. Modelagem do XP Orb e Atração Magnética de Vetores
Para garantir uma atração suave e fisicamente verossímil das esferas de XP, utilizaremos atração vetorial com velocidade progressiva. O vetor de aceleração é direcionado ao centro do jogador, aumentando à medida que o orb se aproxima:

```javascript
class XpOrb {
    constructor(scene, position, xpValue) {
        this.scene = scene;
        this.xpValue = xpValue;
        this.active = true;
        this.mesh = this.createMesh(position);
        this.scene.add(this.mesh);

        // Física e Rotação
        this.time = Math.random() * 100;
        this.magneticSpeed = 0;
    }

    createMesh(position) {
        const geo = new THREE.OctahedronGeometry(0.3);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xcc9900,
            emissiveIntensity: 1.5,
            roughness: 0.2,
            metalness: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 0.6; // Altura do chão flutuante
        mesh.castShadow = true;
        return mesh;
    }

    update(dt, playerPosition) {
        if (!this.active) return;

        // Rotação procedural suave
        this.mesh.rotation.y += dt * 2.5;
        this.mesh.rotation.x += dt * 1.2;
        this.time += dt * 3.0;
        this.mesh.position.y = 0.6 + Math.sin(this.time) * 0.15; // Flutuação senoidal

        // Distância até o jogador
        const toPlayer = playerPosition.clone().sub(this.mesh.position);
        const distance = toPlayer.length();

        const magneticRange = 8.0;
        if (distance < magneticRange) {
            // Aceleração magnética progressiva
            this.magneticSpeed += dt * 30.0; // Aceleração
            const direction = toPlayer.normalize();
            this.mesh.position.addScaledVector(direction, this.magneticSpeed * dt);
        }
    }

    destroy() {
        this.active = false;
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
    }
}
```

No `ItemManager` (ou um novo `XpOrbManager`), a detecção de absorção é simples:
```javascript
update(dt) {
    this.orbs.forEach(orb => {
        orb.update(dt, this.player.mesh.position);
        
        // Coleta quando estiver colado ao guerreiro
        if (orb.mesh.position.distanceTo(this.player.mesh.position) < 1.2) {
            this.player.gainXP(orb.xpValue);
            orb.destroy();
            // Injetar efeito de faísca dourada sutil se desejável
        }
    });
    this.orbs = this.orbs.filter(o => o.active);
}
```

### 2. Especificação do Sistema de Ondas (Wave Configuration Table)
A orquestração do jogo passa a seguir um dicionário estrito de configuração de dificuldades para escalabilidade modular:

```javascript
const WAVE_CONFIG = {
    1: { duration: 60, spawnInterval: 3.0, maxEnemies: 8,  ratios: { basic: 1.0, brute: 0.0, stalker: 0.0 } },
    2: { duration: 60, spawnInterval: 2.5, maxEnemies: 12, ratios: { basic: 0.8, brute: 0.2, stalker: 0.0 } },
    3: { duration: 60, spawnInterval: 2.0, maxEnemies: 15, ratios: { basic: 0.6, brute: 0.2, stalker: 0.2 } },
    4: { duration: 60, spawnInterval: 1.5, maxEnemies: 18, ratios: { basic: 0.4, brute: 0.3, stalker: 0.3 } },
    5: { duration: 60, spawnInterval: 1.0, maxEnemies: 25, ratios: { basic: 0.3, brute: 0.35, stalker: 0.35 } }
};
```

Algoritmo de seleção ponderada de inimigos para o spawn do `EnemyManager`:
```javascript
selectEnemyType(wave) {
    const config = WAVE_CONFIG[wave];
    if (!config) return 'basic';

    const rand = Math.random();
    const r = config.ratios;

    if (rand < r.basic) {
        return 'basic';
    } else if (rand < r.basic + r.brute) {
        return 'brute';
    } else {
        return 'stalker';
    }
}
```

### 3. Integração do Estado de Pausa e Draft CSS de Upgrades
Ao subir de nível, interrompemos a atualização física para evitar que o jogador morra com o menu aberto, capturando e tratando cliques de forma 100% segura:

```javascript
// No Player class
gainXP(amount) {
    this.xp += amount;
    const xpNeeded = this.level * 120;
    if (this.xp >= xpNeeded) {
        this.xp -= xpNeeded;
        this.levelUp();
    }
    this.updateXPBar();
}

levelUp() {
    this.level++;
    // Disparar luz e som de subida de nível se houver
    this.scene.game.triggerUpgradeDraft();
}
```

Abaixo está o CSS necessário para renderizar as cartas de draft premium na modal do jogo:

```css
/* Glassmorphism Upgrade Screen */
#upgrade-modal {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(6, 9, 15, 0.96) 0%, rgba(2, 3, 5, 0.99) 100%);
    backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 20;
}

#upgrade-title-container {
    text-align: center;
    margin-bottom: 40px;
}

.level-badge {
    background: linear-gradient(135deg, #ffd700, #b8860b);
    color: #000;
    font-weight: bold;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 16px;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
    display: inline-block;
    margin-bottom: 10px;
    font-family: 'Outfit', sans-serif;
}

#cards-wrapper {
    display: flex;
    gap: 30px;
    perspective: 1000px; /* Efeito 3D nos cards */
}

.upgrade-card {
    width: 240px;
    height: 340px;
    background: rgba(15, 20, 32, 0.75);
    border: 2px solid rgba(211, 175, 55, 0.3);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.02);
    transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), 
                border-color 0.4s, 
                box-shadow 0.4s;
    backdrop-filter: blur(10px);
    pointer-events: auto;
}

.upgrade-card:hover {
    transform: translateY(-15px) rotateY(5deg);
    border-color: rgba(229, 193, 88, 0.9);
    box-shadow: 0 20px 40px rgba(229, 193, 88, 0.25), 0 0 30px rgba(229, 193, 88, 0.15);
}

.upgrade-card .icon-placeholder {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(229, 193, 88, 0.1);
    border: 1px solid rgba(229, 193, 88, 0.3);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #e5c158;
    font-size: 28px;
    margin-top: 15px;
    transition: background 0.3s;
}

.upgrade-card:hover .icon-placeholder {
    background: rgba(229, 193, 88, 0.25);
    box-shadow: 0 0 15px rgba(229, 193, 88, 0.4);
}

.upgrade-card h3 {
    font-family: 'Cinzel', serif;
    color: #e5c158;
    font-size: 20px;
    margin: 15px 0 10px 0;
    text-transform: uppercase;
}

.upgrade-card p {
    font-family: 'Outfit', sans-serif;
    color: #bdc3c7;
    font-size: 14px;
    line-height: 1.5;
    flex-grow: 1;
}

.upgrade-rarity {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: bold;
    color: #95a5a6;
    margin-bottom: 10px;
}
```

---

## ❓ Dúvidas para o TL ou o PO

Abaixo estão listadas duas dúvidas cruciais para alinhamento físico e visual da mecânica de XP:

1. **Magnetismo Dinâmico ou Sucção Linear?**
   * *Dúvida*: Para a atração magnética das orbs de XP, devemos usar uma força física real que acelera (aumentando a velocidade gradativamente dependendo do delta tempo) ou simplesmente teletransportar linearmente via interpolação LERP?
   * *Proposta do TL*: **Física Dinâmica com Aceleração.** Acelerar a orb de forma quadrática na direção do jogador cria um feedback visual de "sucção" e poder extremamente luxuoso, imitando os melhores jogos do gênero. O LERP puro pode parecer rígido demais.

2. **Destaque Visual das Waves no Three.js**:
   * *Dúvida*: No início de cada onda, além do banner textual DOM, devemos aplicar uma rápida mudança de tom na luz ambiente/névoa tridimensional do WebGL para alertar o jogador sensorialmente (ex: flash roxo ou avermelhado)?
   * *Proposta do TL*: **Sim, excelente!** Um flash rápido e transitório no fog/ambient light (ex: névoa muda de `#0a0c16` para `#3a0000` por 500ms na entrada de Elites) cria uma sensação tátil espetacular de invasão e perigo iminente.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

As diretrizes arquiteturais para a implementação segura de Roguelite e Stamina são:

### 1. Gestão Rigorosa de Performance das Orbs
Para evitar que centenas de orbs ativas na arena saturem a GPU com draw calls redundantes, limitaremos o número máximo de orbs no chão a **40**. Se uma 41ª orb for gerada, a orb mais antiga no chão é automaticamente destruída de forma limpa (`dispose` geométrico e material) para liberar a memória WebGL ativa.

### 2. Controle de Fricção e Aceleração de Movimento
O multiplicador de velocidade ganho no draft roguelite (`speedMultiplier`) deve atuar diretamente sobre a velocidade final no loop de input do `Player`. No entanto, para evitar que o Dash saia do mapa devido a modificadores acumulativos de velocidade, a distância física do Dash deve ser fixa por um valor base (`10 unidades`) e escalável apenas pelo modificador específico do Dash obtido no draft, de forma a manter o balanceamento.

---

## 🚀 Status do Refinamento Técnico (Tech Lead Aprovou)

*   **Identificação do Jogo**: `voxel_arena` (Voxel Arena)
*   **Ação**: Criação e refinamento da especificação de progressão e sobrevivência roguelite concluída com louvor.
*   **Status do Backlog**: Cadastrado com sucesso no [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido à profundidade e precisão matemática do design técnico detalhado.
*   **Destino**: O arquivo `TASK_002.md` está pronto e homologado para ser puxado para desenvolvimento.

*Assinado: Product Owner (PO) - Antigravity*
