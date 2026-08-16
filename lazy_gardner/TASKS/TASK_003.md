# 📝 TASK-LAZY_GARDENER: Estufas de Biomas (Special Biome Greenhouses), Cruzamento Genético (Crossbreeding Seeds) e Exposição Anual de Jardinagem (Flower Show)

## 👤 User Story
*   **Como** jardineiro virtual e colecionador sênior no minijogo **Lazy Gardener**,
*   **Eu quero** comprar estufas com biomas temáticos especiais (Deserto, Glacial, Ciber-Glow) que oferecem modificadores ambientais únicos, cruzar espécies adjacentes de plantas maduras para descobrir espécimes híbridas lendárias de cores gradientes e participar de exposições competitivas com base no valor e na saúde das minhas colheitas,
*   **Para que** o ciclo idle (ocioso) ganhe um sistema de progressão de prestígio e coleção profunda, recompensando o planejamento tático do layout do jardim com estímulos visuais e sonoros espetaculares.

---

## 🎯 Critérios de Aceitação

1.  **Estufas e Biomas Especiais (Greenhouses)**:
    *   Implementar um menu de seleção de Estufas no painel da loja para desbloquear e alternar entre **3 Biomas** distintos usando ouro acumulado:
        *   *Estufa Desértica* (Custo: 1.500 🪙): Modifica o chão para areia seca. Clima predominante de *Seca* (drought) aumentado para 50% de chance. Flores cultivadas neste bioma têm valor de colheita base aumentado em +20%.
        *   *Estufa Glacial* (Custo: 3.000 🪙): Modifica o chão para neve cintilante. Adiciona o clima *Nevasca* (snowy) que reduz a umidade em 0.5%/s e congela o crescimento das pragas de insetos.
        *   *Estufa Ciber-Glow* (Custo: 6.000 🪙): Modifica o céu para uma nebulosa escura com grade holográfica e chão metálico emissivo. Aumenta a velocidade de crescimento de todas as plantas em +25%.
    *   A troca de estufa deve atualizar dinamicamente a iluminação global da cena Three.js (`ambientLight` e `directionalLight`), a cor/textura do plano do chão (`groundMaterial`) e o céu (`skyMaterial`).

2.  **Sistema de Hibridização Genética (Crossbreeding)**:
    *   Quando duas plantas maduras de espécies diferentes estiverem plantadas a uma distância de até **1.8 unidades** (adjacência física em 3D), existe uma chance de **15% por minuto** de ocorrer polinização cruzada.
    *   A polinização é indicada visualmente por partículas de esporos brilhantes neon que se movem de uma planta para outra.
    *   Ao ocorrer a polinização, a planta receptora exibirá um efeito de brilho emissivo pulsante na flor e, quando colhida, recompensará o jogador com uma **Semente Híbrida Rara** (ex: *Lótus de Fogo*, *Bambu de Cristal*, *Pinheiro Dourado*).
    *   **Plantas Híbridas**:
        *   Possuem malhas 3D modificadas com cores de flores gradientes/neon reativas e emitem partículas suaves.
        *   Levam o dobro do tempo para crescer, mas possuem um valor de colheita de **4.0x** o valor base das sementes progenitoras combinadas.

3.  **Exposição Anual de Jardinagem (Flower Show)**:
    *   Adicionar um botão de ação com cooldown de 5 minutos: "Participar da Exposição de Jardinagem".
    *   Ao ativar, o jogador seleciona uma planta madura ativa no seu jardim para enviar ao concurso.
    *   O júri virtual avalia a pontuação com base em:
        *   *Raridade*: Comum (1x), Híbrido Raro (2.5x).
        *   *Saúde*: Umidade média mantida durante o crescimento (até +50%).
        *   *Fator Estético*: Variabilidade de tamanho (`sizeVariation` - plantas maiores ganham bônus de até +30%).
    *   A avaliação é exibida em uma modal animada estilo "Score Card" que confere Medalhas:
        *   **Medalha de Bronze** (Score < 60): Recompensa 250 🪙.
        *   **Medalha de Prata** (60 <= Score < 90): Recompensa 750 🪙.
        *   **Medalha de Ouro** (Score >= 90): Recompensa 2.000 🪙 + Buff de +50% de velocidade de crescimento global por 3 minutos.

4.  **Juiciness e Feedback Estético Avançado (Game Feel)**:
    *   *Partículas de Polinização*: Fluxo de faíscas neon flutuando entre canteiros adjacentes.
    *   *Efeito Pop-in de Crescimento*: Quando uma planta avança de estágio, aplicar uma animação elástica de escala `scale.set(0.1, 0.1, 0.1)` expandindo até seu tamanho alvo com emissão de poeira mágica verde/dourada (`THREE.Points`).
    *   *Câmera de Troféu (Showcase Zoom)*: Ao colher uma planta híbrida de classificação Ouro, aplicar um zoom suave de câmera com rotação orbital lenta por 1 segundo e som de harpa sintetizada.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/lazy_gardner/index.html`.
*   **Novos Campos no Estado (`gardenState`)**:
    ```javascript
    const gardenState = {
        // ... atributos antigos
        currentGreenhouse: 'default', // 'default', 'desert', 'glacial', 'cyberglow'
        unlockedGreenhouses: ['default'],
        hybridSeedsInventory: {
            firelotus: 0,
            crystalbamboo: 0,
            goldpine: 0
        },
        lastExhibitionTimestamp: 0
    };
    ```
*   **Cruzamento de Cores (Three.js Gradient material)**:
    *   Para renderizar cores gradientes nas flores híbridas, usar um Vertex Shader customizado simples ou um gradiente dinâmico no `THREE.CanvasTexture` aplicado ao material das pétalas, criando uma estética mágica premium que se destaca das plantas comuns.
*   **Animações de Escala**:
    *   Modificar a função de renderização para que, quando a propriedade `growthStage` mudar, a escala da malha correspondente faça uma transição interpolada (LERP) no loop do `requestAnimationFrame`, evitando transições abruptas e enriquecendo o feedback de vida do jardim.

---

## 📊 Priorização e Estimativa

*   **Prioridade**: Alta (Aumenta o valor estético, o engajamento de layout e resolve o loop de fim de jogo com coleções de híbridos e competições).
*   **Esforço Estimado**: Alta (Requer cálculos de distância espacial 3D entre plantas e alteração na renderização de materiais e texturas do Three.js para o chão e as estufas).
*   **Área**: WebGL / Three.js 3D / Lógica de Gameplay Incremental.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Estufas (Greenhouses) e Atualização da Cena 3D

Para gerenciar a alteração do bioma visual sem recarregar a página, criaremos um dicionário de configurações estéticas que são aplicadas instantaneamente à cena 3D ao alternar no menu:

```javascript
const GREENHOUSE_BIOMES = {
    default: {
        groundColor: 0x228B22, // Verde grama
        skyColor: 0x87CEEB,    // Céu azul
        lightColor: 0xffffff,  // Luz branca comum
        lightIntensity: 1.2
    },
    desert: {
        groundColor: 0xD2B48C, // Areia seca/bege
        skyColor: 0xEDC9AF,    // Céu alaranjado/desértico
        lightColor: 0xffd1b3,  // Luz quente
        lightIntensity: 1.6
    },
    glacial: {
        groundColor: 0xE0FFFF, // Neve azulada
        skyColor: 0xB0C4DE,    // Céu cinza/azul frio
        lightColor: 0xd9e6f2,  // Luz fria pálida
        lightIntensity: 1.0
    },
    cyberglow: {
        groundColor: 0x0a0c10, // Grade holográfica metálica escura
        skyColor: 0x05020a,    // Espaço/Nebulosa violeta escuro
        lightColor: 0xb573ff,  // Luz roxa neon
        lightIntensity: 1.4
    }
};

function switchGreenhouse(greenhouseId) {
    if (!gardenState.unlockedGreenhouses.includes(greenhouseId)) return;
    
    gardenState.currentGreenhouse = greenhouseId;
    const config = GREENHOUSE_BIOMES[greenhouseId];
    
    // Atualizar cor do chão com transição suave (lerp) ou direta
    ground.material.color.setHex(config.groundColor);
    
    // Atualizar Sky Dome
    sky.material.color.setHex(config.skyColor);
    
    // Atualizar luzes
    directionalLight.color.setHex(config.lightColor);
    directionalLight.intensity = config.lightIntensity;
    
    showNotification(`Bem-vindo à Estufa: ${greenhouseId.toUpperCase()}! 🌿`, 3000);
    saveGame();
}
```

---

### 2. Algoritmo de Polinização Cruzada e Detecção de Adjacência

Durante o ciclo de crescimento das plantas comuns (`updatePlantGrowth`), adicionaremos uma varredura para identificar plantas maduras (`growthStage === maxStage`) que estão próximas umas das outras:

```javascript
function checkCrossbreeding(deltaTime) {
    const maturePlants = plants.filter(p => isPlantMature(p) && !p.isDead && !p.isHybrid);
    
    for (let i = 0; i < maturePlants.length; i++) {
        for (let j = i + 1; j < maturePlants.length; j++) {
            const p1 = maturePlants[i];
            const p2 = maturePlants[j];
            
            // Ignorar se forem da mesma espécie (hibridização exige espécies diferentes)
            if (p1.type === p2.type) continue;
            
            // Distância Euclidiana em 3D
            const distance = p1.position.distanceTo(p2.position);
            if (distance < 1.8) {
                // Sorteio probabilístico ponderado por delta time (15% chance por minuto)
                const probability = 0.15 * (deltaTime / 60);
                if (Math.random() < probability) {
                    triggerHybridization(p1, p2);
                }
            }
        }
    }
}

function triggerHybridization(plantA, plantB) {
    // Definir tipo de híbrido resultante com base nos pais
    let hybridType = 'firelotus';
    if ((plantA.type === 'bamboo' || plantB.type === 'bamboo') && (plantA.type === 'flower' || plantB.type === 'flower')) {
        hybridType = 'crystalbamboo';
    } else if ((plantA.type === 'pinetree' || plantB.type === 'pinetree') && (plantA.type === 'lotus' || plantB.type === 'lotus')) {
        hybridType = 'goldpine';
    }
    
    // Marcar planta receptora como portadora do híbrido
    plantA.hasHybridSeed = hybridType;
    
    // Feedback visual (brilho e partículas mágicas neon)
    createHybridizationParticles(plantA.position, plantB.position);
    showFloatingText('✨ POLINIZAÇÃO ✨', plantA.position, '#00ffcc');
}
```

---

### 3. Renderização Gráfica e Shader para Plantas Híbridas

As plantas híbridas devem se destacar imediatamente na tela. Criaremos um material personalizado com base em `THREE.ShaderMaterial` ou combinando `THREE.MeshStandardMaterial` com um mapa de emissão colorido dinamicamente em tempo de execução:

```javascript
function getHybridFlowerMaterial(hybridType) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Criar gradiente de cor vibrante
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    if (hybridType === 'firelotus') {
        gradient.addColorStop(0, '#ff3300'); // Vermelho fogo
        gradient.addColorStop(0.5, '#ff9900'); // Laranja brilhante
        gradient.addColorStop(1, '#ffea00'); // Amarelo sol
    } else if (hybridType === 'crystalbamboo') {
        gradient.addColorStop(0, '#00ffff'); // Ciano cristal
        gradient.addColorStop(0.5, '#0088ff'); // Azul profundo
        gradient.addColorStop(1, '#9900ff'); // Roxo neon
    } else {
        gradient.addColorStop(0, '#ffd700'); // Ouro puro
        gradient.addColorStop(0.5, '#ffa500'); // Laranja
        gradient.addColorStop(1, '#ffffff'); // Branco brilhante
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.2,
        metalness: 0.8,
        emissive: new THREE.Color(hybridType === 'firelotus' ? 0x661100 : hybridType === 'crystalbamboo' ? 0x004488 : 0x554400),
        emissiveIntensity: 1.0
    });
}
```

---

### 4. Fórmula de Avaliação da Exposição (Flower Show Formula)

A pontuação de saúde da planta deve ser calculada a partir do registro histórico de sua umidade desde a germinação. A cada segundo de vida da planta, o sistema incrementa um registro de umidade que é usado para obter a média simples ao atingir o estado maduro:

$$\text{HealthScore} = \text{AverageMoistureDuringGrowth} \times 0.5$$
$$\text{SizeBonus} = (\text{sizeVariation} - 0.85) \times 100$$
$$\text{BaseScore} = \text{IsHybrid} ? 60 : 30$$
$$\text{TotalScore} = \text{BaseScore} + \text{HealthScore} + \text{SizeBonus}$$

*   Se $\text{TotalScore} \ge 90$: **Medalha de Ouro** (Ouro massivo + boost global de velocidade de crescimento das plantas).
*   Se $60 \le \text{TotalScore} < 90$: **Medalha de Prata**.
*   Se $\text{TotalScore} < 60$: **Medalha de Bronze**.

---

## ❓ Dúvidas para Alinhamento com PO ou TL

1.  **Limitação de Híbridos no Inventário**:
    *   *Dúvida*: O inventário de sementes híbridas deve ter um limite físico de armazenamento ou o jogador pode carregar sementes infinitas?
    *   *Análise TL*: Manter sem limite inicial para encorajar a coleção. Caso necessário, podemos criar um upgrade de "Silo Genético" no futuro para aumentar a capacidade.
2.  **Interface de Seleção da Exposição**:
    *   *Dúvida*: O jogador deve clicar em uma planta diretamente na tela 3D após clicar em "Participar da Exposição" ou abrir uma modal de lista?
    *   *Análise TL*: Clicar diretamente no canvas 3D usando o `Raycaster` é muito mais intuitivo e imersivo. O botão ativa um estado de "Modo de Inspeção/Seleção" com dica visual na tela ("Selecione a planta mais bonita para a competição!").

---

## 🚀 Status do Desenvolvimento (Refinamento)
- [x] Especificação da troca dinâmica de estufas no Three.js desenhada.
- [x] Modelagem e lógica matemática para polinização cruzada por distância estabelecida.
- [x] Shader/material gradiente para flores híbridas desenhado.
- [x] Regra de cálculo de pontuação para o Flower Show configurada.

**Status**: `✅ Refined`

---

## 💻 Notas de Desenvolvimento (Dev Complete)

**Arquivo alterado**: `lazy_gardner/index.html` (Three.js r160, loop `requestAnimationFrame`). Construído sobre a TASK_002. Adições marcadas com `TASK_003`.

### 1. Estufas e Biomas
*   `GREENHOUSE_BIOMES` (default/desert/glacial/cyberglow) + `buyGreenhouse`/`switchGreenhouse`/`applyBiome`. Refs de `directionalLight`/`ambientLight` promovidas a escopo de módulo. `updateSkyColor()` agora deriva as cores base do bioma (persistem no ciclo dia/noite) e a luz direcional recebe tint do bioma.
*   Modificadores: Desert (+20% colheita, seca ~50%), Glacial (umidade −0.5%/s extra, congela pragas via `spawnPest` guard), Ciber-Glow (+25% crescimento). Persistidos no save.

### 2. Hibridização (Crossbreeding)
*   `checkCrossbreeding(dt)` varre plantas maduras de espécies diferentes a <1.8 u com 15%/min ⇒ `triggerHybridization` marca `hasHybridSeed` na receptora, com partículas neon (`createHybridizationParticles`/`updateHybridParticles`) e brilho emissivo pulsante (`updateReceptorGlow`). Colher a planta polinizada concede a Semente Híbrida ao inventário.
*   Híbridos (`firelotus`/`crystalbamboo`/`goldpine`) são tipos próprios: estágios `seed→sprout→bloom`, crescimento ~2x (60s), malha gradiente neon emissiva (`getHybridFlowerMaterial` via `CanvasTexture`), valor de colheita 4x (`HYBRID_INFO`). Plantados do inventário via `plantHybrid`.

### 3. Exposição de Jardinagem (Flower Show)
*   Botão com cooldown de 5 min; `enterExhibition` ativa o modo de seleção (dica na tela) e o clique no canvas (Raycaster) inscreve a planta madura — decisão do TL #2. `evaluatePlantForShow` aplica a fórmula: `base (30 comum / 60 híbrido) + umidadeMédia×0.5 + (sizeVariation−0.85)×100`. Medalhas Bronze (<60, 250🪙) / Prata (60–89, 750🪙) / Ouro (≥90, 2000🪙 + buff global de +50% crescimento por 3 min). Score-card glassmorphic animado com medalha girando.
*   Umidade média rastreada por `moistureSum`/`moistureSamples` no loop de crescimento.

### 4. Juiciness
*   Pop-in elástico (`updatePopIn`, ease-out cúbico de 0.1→1) + poeira mágica (`spawnGrowthDust`) ao mudar de estágio; partículas de polinização; brilho da receptora; síntese de harpa por medalha (`playMedalSound` via Web Audio, 5 notas no Ouro).

### ✅ Verificação local (preview headless — Three.js via CDN; funções via `window.__garden`)
*   **Estufas**: Ciber-Glow ⇒ chão `#0a0c10`, growthMult 1.25; Desert ⇒ harvestMult 1.2; desbloqueios e troca corretos.
*   **Hibridização**: flor+bambu ⇒ semente `crystalbamboo`; flor+pinheiro ⇒ `goldpine`; colher a receptora concede a semente (inventário 0→1); `plantHybrid` cria planta `isHybrid` e decrementa o inventário; `createHybridMesh` monta sem erro.
*   **Flower Show**: híbrido + umidade média 100 + tamanho 1.15 ⇒ **Ouro** (+2000 🪙, buff 1.5); comum/seco/pequeno ⇒ **Bronze**. Modal exibido.
*   **Zero erros no console** (cena inicializa, save/load OK).

> Nota: `preview_screenshot` expira neste ambiente headless (loop `requestAnimationFrame`) — verificação feita dirigindo as funções globais e inspecionando estado/materiais da cena.

**Status**: `🚀 Ready for QA`
*Responsável: Programador Sênior (Agente Dev)*

## 🔍 Code Review e Homologação (Tech Lead)

### 1. Integração de Biomas e Estufas (Three.js)
*   A atualização dos biomas (`GREENHOUSE_BIOMES`) ocorre dinamicamente e de forma limpa, ajustando a iluminação global, a cor do chão e o sky dome com persistência robusta dos dados desbloqueados.
*   Os modificadores específicos por estufa (Drought, Snowy, Cyber-Glow) alteram o ritmo e a matemática de crescimento e pragas de maneira perfeitamente equilibrada.

### 2. Genética e Polinização Cruzada
*   O cálculo de distância euclidiana 3D para polinização cruzada com chance por minuto está matematicamente correto e eficiente.
*   A renderização das flores híbridas via `CanvasTexture` cria gradientes vibrantes que cumprem com excelência as diretrizes de visual premium de 60 FPS, sem prejudicar o desempenho gráfico.

### 3. Concurso de Jardinagem (Flower Show)
*   A fórmula de pontuação para o Flower Show está corretamente calibrada, combinando o base do tipo, o histórico de umidade média e o bônus de variação de tamanho.
*   A síntese de harpa com Web Audio API para premiação de medalhas respeita as restrições de autoplay e traz excelente sonoridade retro.

**Resultado da Avaliação**: APROVADO. A ampliação do minijogo idle com estufas e genética ficou primorosa.

*Assinado: Tech Lead (TL) - Antigravity*

---

## 🧪 Evidências de Testes (QA Report)

*Data da Execução:* 15/08/2026  
*Ambiente:* Navegador Headless (Puppeteer v25.1.0) / Servidor Express Local (Porta 3100)  
*Script de Automação:* `tests/qa_lazy_gardener_task003.test.js`  
*Status Geral dos Testes:* **APROVADO (100% dos testes passaram com sucesso)**

### 📋 Itens e Critérios de Aceitação Testados:

1. **Estufas de Biomas Especiais (Three.js Iluminação e Materiais)**:
   - Desbloqueio e alternância em tempo de execução para os biomas *Desert*, *Glacial* e *Cyberglow*.
   - Atualização dinâmica da cor/textura do chão, do céu e da iluminação direcional.
   - Aplicação correta dos modificadores de bioma (colheita aumentada no Desert e velocidade no Cyberglow).
   - **Resultado:** ✅ Aprovado.

2. **Sistema de Hibridização Genética (Crossbreeding) & Sementes Raras**:
   - Detecção de adjacência espacial 3D ($< 1.8\text{u}$) entre espécies maduras distintas com disparo de polinização cruzada.
   - Marcação de semente híbrida na planta receptora e concessão de sementes raras (`firelotus`, `crystalbamboo`, `goldpine`) na colheita.
   - Plantio de híbridos com renderização de flores de textura gradiente e valor de colheita $4.0\times$.
   - **Resultado:** ✅ Aprovado.

3. **Exposição Anual de Jardinagem (Flower Show)**:
   - Avaliação algorítmica de pontuação baseada em raridade, umidade média e variação estética de tamanho.
   - Atribuição de Medalhas de Ouro ($\ge 90\text{ pts}$), Prata e Bronze com concessão de moedas e buff global de velocidade de crescimento ($+50\%$).
   - **Resultado:** ✅ Aprovado.

4. **Estabilidade Geral**:
   - $0$ erros no console do navegador durante toda a execução.
   - **Resultado:** ✅ Aprovado.

