document.addEventListener('DOMContentLoaded', () => {

    let selectedBuilding = null;
    let selectedUnit = null;
    let gold = 100;
    let food = 100;
    let seconds = 0;
    let difficultyLevel = 1;
    let gameTimerInterval;
    let resourceInterval;
    let eventInterval;
    let barbarianInterval;
    let templeActive = false;

    let entities = [];
    let activeBlessings = { earth: false, trade: false, strength: false };
    let audioCtx = null;

    const map = document.getElementById('map');
    const goldDisplay = document.getElementById('gold');
    const foodDisplay = document.getElementById('food');
    const timerDisplay = document.getElementById('game-timer');
    const eventLog = document.getElementById('event-log');
    const buildButtons = document.querySelectorAll('.build-button');
    const recruitButtons = document.querySelectorAll('.recruit-button');
    const templeButton = document.getElementById('temple-button');
    const statusMessage = document.getElementById('status-message');
    const winScreen = document.getElementById('win-screen');
    const winMessage = document.getElementById('win-message');
    const restartButton = document.getElementById('restart-button');
    const nextLevelScreen = document.getElementById('next-level-screen');
    const nextLevelMessage = document.getElementById('next-level-message');
    const nextLevelButton = document.getElementById('next-level-button');
    const gameLevelDisplay = document.getElementById('game-level');
    
    const tutorialScreen = document.getElementById('tutorial-screen');
    const startGameButton = document.getElementById('start-game-button');
    
    const eventOverlay = document.getElementById('event-overlay');
    const eventIcon = document.getElementById('event-icon');

    const blessingModal = document.getElementById('blessing-modal');
    const blessingCards = document.querySelectorAll('.blessing-card');
    const activeBlessingsDisplay = document.getElementById('active-blessings');

    // EXPLICITAMENTE MOSTRA A TELA DO TUTORIAL QUANDO A PÁGINA CARREGA
    tutorialScreen.style.display = 'flex';

    const costs = {
        castle: { gold: 110, food: 100 },
        farm: { gold: 50, food: 0 },
        barracks: { gold: 75, food: 25 },
        wall: { gold: 25, food: 20 },
        mine: { gold: 100, food: 50 },
        lumbercamp: { gold: 20, food: 30 },
        temple: { gold: 10, food: 60 }
    };

    const UNIT_SPECS = {
        scout: { name: 'Batedor', cost: { gold: 40, food: 20 }, maxMoves: 2, vision: 3, combatPower: 1, icon: '🕵️' },
        soldier: { name: 'Soldado', cost: { gold: 60, food: 40 }, maxMoves: 1, vision: 2, combatPower: 3, icon: '⚔️' },
        trebuchet: { name: 'Catapulta', cost: { gold: 100, food: 60 }, maxMoves: 1, vision: 1, combatPower: 6, icon: '🎯', range: 2 },
        barbarian: { name: 'Saqueador Bárbaro', maxMoves: 1, combatPower: 2, icon: '🪓' },
        camp: { name: 'Acampamento Bárbaro', combatPower: 4, icon: '⛺' }
    };

    // Síntese Procedural de Áudio com Web Audio API
    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playCombatSound() {
        try {
            const ctx = getAudioContext();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(150, ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(300, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + 0.2);
            osc2.stop(ctx.currentTime + 0.2);
        } catch(e){}
    }

    function playTrebuchetSound() {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);

            gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch(e){}
    }

    function playRelicSound() {
        try {
            const ctx = getAudioContext();
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.4);

                osc.connect(gainNode);
                gainNode.connect(ctx.destination);

                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
            });
        } catch(e){}
    }

    function triggerScreenShake(durationMs = 200) {
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, durationMs);
    }

    const EVENTS = [
        { name: 'raid', text: 'Bandits raid your kingdom!', type: 'bad', icon: '💀', execute: () => {
            const defense = document.querySelectorAll('[data-type="barracks"]').length + document.querySelectorAll('[data-type="wall"]').length;
            if (defense < Math.floor(Math.random() * 8) + 1) {
                const value = Math.floor(Math.random() * 20) + 40;
                gold = Math.max(0, gold - value);
                addEvent(`Lost ${value} gold to bandits!`);
            } else {
                addEvent('The bandits were repelled!');
            }
        }},
        { name: 'boom', text: 'Trade caravan brings bonus gold!', type: 'good', icon: '💰', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 50;
            gold += amount;
            addEvent(`Gained ${amount} gold.`);
        }},
        { name: 'plague', text: 'Crop plague destroys food!', type: 'bad', icon: '🦠', execute: () => {
            food = Math.max(0, food - (Math.floor(Math.random() * 10) + 25));
            const farms = document.querySelectorAll('[data-type="farm"]');
            if (farms.length > 0) {
                farms[0].dataset.type = 'grass';
                addEvent('Lost 1 farm due to plague.');
            }
            addEvent('Lost food to plague.');
        }},
        { name: 'drought', text: 'A severe drought reduces water supplies!', type: 'bad', icon: '🥵', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            const lostFood = Math.max(0, Math.floor(Math.random() * 50) + 1 - (templeCount * 10));
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food.`);
        }},
        { name: 'festival', text: 'A grand festival boosts morale!', type: 'good', icon: '🎉', execute: () => {
            const amount = Math.floor(Math.random() * 20) + 30;
            food += amount;
            addEvent(`Gained ${amount} food.`);
        }},
        { name: 'rebellion', text: 'Disgruntled peasants start a rebellion!', type: 'bad', icon: '😡', execute: () => {
            const defense = document.querySelectorAll('[data-type="barracks"]').length + document.querySelectorAll('[data-type="wall"]').length;
            let lostFood = 5;
            if (defense < Math.floor(Math.random() * 12) + 1) {
                lostFood = document.querySelectorAll('[data-type="castle"]').length >= 1 ?
                    Math.floor(Math.random() * 20) + 1 :
                    Math.floor(Math.random() * 40) + 20;
            }
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food to rebellion.`);
            const barracks = document.querySelectorAll('[data-type="barracks"]');
            if (barracks.length > 0) {
                barracks[0].dataset.type = 'grass';
                addEvent('Lost 1 barracks due to rebellion.');
            }
        }},
        { name: 'discovery', text: 'Miners uncover a rich vein of ore!', type: 'good', icon: '💎', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 20;
            gold += amount;
            addEvent(`Found ${amount} gold.`);
        }},
        { name: 'storm', text: 'A violent storm damages your defenses!', type: 'bad', icon: '🌩️', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            const lostFood = Math.max(0, Math.floor(Math.random() * 50) + 1 - (templeCount * 10));
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food.`);
        }},
        { name: 'alliance', text: 'A neighboring kingdom offers a powerful alliance!', type: 'good', icon: '🤝', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 50;
            gold += amount;
            addEvent(`Gained ${amount} gold.`);
        }},
        { name: 'betrayal', text: 'A trusted advisor betrays you!', type: 'bad', icon: '🔪', execute: () => {
            const barracksCount = document.querySelectorAll('[data-type="barracks"]').length;
            let lostGold, lostFood;
            if (barracksCount < 3) {
                lostGold = Math.floor(Math.random() * 50) + 20;
                lostFood = Math.floor(Math.random() * 50) + 20;
            } else {
                lostGold = Math.floor(Math.random() * 20) + 5;
                lostFood = Math.floor(Math.random() * 20) + 5;
            }
            gold = Math.max(0, gold - lostGold);
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food and ${lostGold} gold.`);
        }},
        { name: 'invasion', text: 'A rival kingdom launches a sudden invasion!', type: 'bad', icon: '🛡️', execute: () => {
            const castleCount = document.querySelectorAll('[data-type="castle"]').length;
            const lostFood = Math.max(0, Math.floor(Math.random() * 50) - (castleCount * 5));
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food.`);
        }},
        { name: 'bumperHarvest', text: 'An unusually bountiful harvest!', type: 'good', icon: '🍎', execute: () => {
            const farmCount = document.querySelectorAll('[data-type="farm"]').length;
            const amount = Math.floor(Math.random() * 50) + (farmCount * 10);
            food += amount;
            addEvent(`Gained ${amount} food.`);
        }},
        { name: 'earthquake', text: 'An earthquake topples buildings!', type: 'bad', icon: '🌍', execute: () => {
            const walls = document.querySelectorAll('[data-type="wall"]');
            if (walls.length > 0) {
                walls[0].dataset.type = 'grass';
                addEvent('Lost 1 wall to the earthquake.');
            }
        }},
        { name: 'refugees', text: 'Refugees flood your borders!', type: 'neutral', icon: '🚶', execute: () => {
            const lostFood = Math.floor(Math.random() * 50) + 1;
            food = Math.max(0, food - lostFood);
            gold += Math.max(0, lostFood);
            addEvent(`Lost ${lostFood} food but gained ${lostFood} gold.`);
        }},
        { name: 'spy', text: 'A spy is caught, revealing enemy plans!', type: 'good', icon: '🕵️', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            let lostGold;
            if (templeCount === 0) {
                lostGold = Math.floor(Math.random() * 50) + 20;
            } else if (templeCount === 1) {
                lostGold = Math.floor(Math.random() * 20) + 5;
            } else {
                lostGold = Math.floor(Math.random() * 5) + 1;
            }
            gold = Math.max(0, gold - lostGold);
            addEvent(`Lost ${lostGold} gold.`);
        }},
        { name: 'flood', text: 'Heavy rains flood your farmlands!', type: 'bad', icon: '🌊', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            let lostFood;
            if (templeCount === 0) {
                lostFood = Math.floor(Math.random() * 50) + 20;
            } else if (templeCount === 1) {
                lostFood = Math.floor(Math.random() * 20) + 5;
            } else {
                lostFood = Math.floor(Math.random() * 5) + 1;
            }
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food.`);
        }},
        { name: 'innovation', text: 'A brilliant scholar invents a new technology!', type: 'good', icon: '💡', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 20;
            gold += amount;
            addEvent(`Gained ${amount} gold.`);
        }},
        { name: 'disease', text: 'A mysterious illness spreads!', type: 'bad', icon: '😷', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            let lostFood;
            if (templeCount === 0) {
                lostFood = Math.floor(Math.random() * 50) + 20;
            } else if (templeCount === 1) {
                lostFood = Math.floor(Math.random() * 20) + 5;
            } else {
                lostFood = Math.floor(Math.random() * 5) + 1;
            }
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food.`);
        }},
        { name: 'pilgrimage', text: 'Pilgrims visit a holy site!', type: 'good', icon: '🙏', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            const amount = templeCount > 0 ?
                Math.floor(Math.random() * 50) + (templeCount * 10) :
                Math.floor(Math.random() * 20) + 5;
            gold += amount;
            addEvent(`Gained ${amount} gold.`);
        }},
        { name: 'wildfire', text: 'A wildfire rages through your forests!', type: 'bad', icon: '🔥', execute: () => {
            const lostFood = Math.floor(Math.random() * 50) + 10;
            food = Math.max(0, food - lostFood);
            addEvent(`Lost ${lostFood} food.`);
            const farms = document.querySelectorAll('[data-type="farm"]');
            if (farms.length > 0) {
                farms[0].dataset.type = 'grass';
                addEvent('Lost 1 farm due to wildfire.');
            }
        }},
        { name: 'luckyFind', text: 'A lucky peasant found a forgotten gold stash!', type: 'good', icon: '🍀', execute: () => {
            const amount = Math.floor(Math.random() * 20) + 30;
            gold += amount;
            addEvent(`Gained ${amount} gold.`);
        }},
        { name: 'mineCollapse', text: 'A mine collapsed!', type: 'bad', icon: '⛏️', execute: () => {
            const mines = document.querySelectorAll('[data-type="mine"]');
            if (mines.length > 0) {
                mines[0].dataset.type = 'grass';
                gold = Math.max(0, gold - 50);
                addEvent('Lost 1 mine to the collapse and 50 gold.');
            }
        }},
        { name: 'forestFire', text: 'A forest fire started near your lumber camp!', type: 'bad', icon: '🔥', execute: () => {
            const camps = document.querySelectorAll('[data-type="lumbercamp"]');
            if (camps.length > 0) {
                camps[0].dataset.type = 'grass';
                food = Math.max(0, food - 50);
                addEvent('Lost 1 lumber camp to the fire and 50 food.');
            }
        }},
        { name: 'nobleDonation', text: 'A wealthy noble donates to your cause!', type: 'good', icon: '👑', execute: () => {
            const amount = Math.floor(Math.random() * 100) + 50;
            gold += amount;
            food += amount;
            addEvent(`A noble donated ${amount} gold and food!`);
        }}
    ];

    function initGame(resetLevel = true) {
        if (resetLevel) {
            difficultyLevel = 1;
        }
        gold = 100 + (difficultyLevel - 1) * 20;
        food = 100 + (difficultyLevel - 1) * 20;
        seconds = 0;
        templeActive = false;
        selectedBuilding = null;
        selectedUnit = null;
        entities = [];
        activeBlessings = { earth: false, trade: false, strength: false };
        updateActiveBlessingsUI();

        map.innerHTML = '';
        eventLog.innerHTML = '';
        statusMessage.style.display = 'none';
        winScreen.classList.add('hidden');
        winScreen.style.display = 'none';
        nextLevelScreen.classList.add('hidden');
        nextLevelScreen.style.display = 'none';
        blessingModal.classList.add('hidden');

        document.querySelectorAll('.build-button').forEach(b => b.classList.remove('selected'));
        templeButton.classList.add('hidden');
        updateLevelDisplay();

        const waterTiles = new Set();
        while(waterTiles.size < 25) {
            waterTiles.add(Math.floor(Math.random() * (15 * 20)));
        }

        const tilesArray = [];
        for (let i = 0; i < 15 * 20; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.index = i;
            if (waterTiles.has(i)) {
                tile.dataset.type = 'water';
            } else {
                tile.dataset.type = 'grass';
            }
            tile.addEventListener('click', () => handleTileClick(tile, i));
            map.appendChild(tile);
            tilesArray.push(tile);
        }
        
        // Gerar Acampamentos Bárbaros em tiles distantes
        spawnBarbarianCamps(tilesArray);

        console.log('--- Jogo Inicializado ---');
        console.log(`Dificuldade: Nível ${difficultyLevel}`);
        console.log(`Recursos Iniciais: Gold: ${gold}, Food: ${food}`);

        updateResources();
        renderEntities();
        addEvent(`Game started! Welcome to Level ${difficultyLevel}!`);

        clearIntervals();
        gameTimerInterval = setInterval(updateTimer, 1000);
        resourceInterval = setInterval(updateResources, 5000);
        eventInterval = setInterval(handleRandomEvent, 10000);
        barbarianInterval = setInterval(updateBarbariansTurn, 15000);
    }

    function updateLevelDisplay() {
        if (difficultyLevel < 10) {
            gameLevelDisplay.textContent = `Level ${difficultyLevel}: Build ${difficultyLevel} Castle${difficultyLevel > 1 ? 's' : ''} to advance!`;
        } else {
            gameLevelDisplay.textContent = 'Level 10: Build 10 Castles to WIN!';
        }
    }

    function clearIntervals() {
        clearInterval(gameTimerInterval);
        clearInterval(resourceInterval);
        clearInterval(eventInterval);
        clearInterval(barbarianInterval);
    }

    function updateTimer() {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerDisplay.textContent = `Time: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateResources() {
        const farms = document.querySelectorAll('[data-type="farm"]').length;
        const temples = document.querySelectorAll('[data-type="temple"]').length;
        const castles = document.querySelectorAll('[data-type="castle"]').length;
        const barracks = document.querySelectorAll('[data-type="barracks"]').length;
        const mines = document.querySelectorAll('[data-type="mine"]').length;
        const lumbercamps = document.querySelectorAll('[data-type="lumbercamp"]').length;

        let farmFood = farms * 3;
        if (activeBlessings.earth) farmFood = Math.floor(farmFood * 1.2);

        let castleMineGold = (castles * 4) + (mines * 10);
        if (activeBlessings.trade) castleMineGold = Math.floor(castleMineGold * 1.2);

        gold += castleMineGold + (temples * 1) + (farms * 4) + (lumbercamps * 1) - (barracks * 1);
        food += farmFood + (lumbercamps * 10) - (barracks * 1);

        goldDisplay.textContent = `Gold: ${gold}`;
        foodDisplay.textContent = `Food: ${food}`;

        // Restaurar movimento das unidades do jogador a cada tick de recursos
        entities.forEach(ent => {
            if (ent.owner === 'player') {
                ent.movesLeft = UNIT_SPECS[ent.type].maxMoves;
            }
        });
        renderEntities();
    }

    // Spawn de 2-3 Acampamentos Bárbaros longe do spawn
    function spawnBarbarianCamps(tilesArray) {
        const numCamps = Math.floor(Math.random() * 2) + 2;
        let spawned = 0;
        let attempts = 0;
        while (spawned < numCamps && attempts < 100) {
            attempts++;
            const candidateIdx = Math.floor(Math.random() * (15 * 20));
            const y = Math.floor(candidateIdx / 20);
            const x = candidateIdx % 20;

            // Distância >= 4 da zona inicial (0,0)
            if (x >= 4 && y >= 4 && tilesArray[candidateIdx].dataset.type === 'grass') {
                tilesArray[candidateIdx].dataset.type = 'barbarian-camp';
                entities.push({
                    id: 'camp_' + candidateIdx,
                    type: 'camp',
                    owner: 'barbarian',
                    tileIndex: candidateIdx,
                    combatPower: 4
                });
                spawned++;
            }
        }
    }

    // Atualização de Saqueadores Bárbaros
    function updateBarbariansTurn() {
        // 1. Cada acampamento ativo tem 20% de chance de spawnar Saqueador
        entities.filter(e => e.type === 'camp').forEach(camp => {
            if (Math.random() < 0.20) {
                const emptyAdjacent = findAdjacentPassableTile(camp.tileIndex);
                if (emptyAdjacent !== null) {
                    entities.push({
                        id: 'raider_' + Date.now() + '_' + Math.random(),
                        type: 'barbarian',
                        owner: 'barbarian',
                        tileIndex: emptyAdjacent,
                        movesLeft: 1,
                        maxMoves: 1,
                        combatPower: 2
                    });
                    addEvent('🪓 A Barbarian Raider emerged from a camp!');
                }
            }
        });

        // 2. Movimentação dos Saqueadores
        const raiders = entities.filter(e => e.type === 'barbarian');
        const tiles = document.querySelectorAll('.tile');

        raiders.forEach(raider => {
            const targetBuilding = findClosestPlayerBuilding(raider.tileIndex);
            if (!targetBuilding) return;

            const curX = raider.tileIndex % 20;
            const curY = Math.floor(raider.tileIndex / 20);
            const tgtX = targetBuilding.index % 20;
            const tgtY = Math.floor(targetBuilding.index / 20);

            const dx = Math.sign(tgtX - curX);
            const dy = Math.sign(tgtY - curY);
            const nextIdx = (curY + dy) * 20 + (curX + dx);

            const nextTile = tiles[nextIdx];
            if (nextTile && nextTile.dataset.type !== 'water') {
                // Checa se o próximo tile atinge o prédio
                if (nextIdx === targetBuilding.index) {
                    // Saqueia o prédio!
                    nextTile.dataset.type = 'grass';
                    gold = Math.max(0, gold - 50);
                    food = Math.max(0, food - 50);
                    updateResources();
                    triggerScreenShake(200);
                    addEvent(`🪓 Barbarian Raider pillaged your ${targetBuilding.type}! (-50 Gold, -50 Food)`);
                    eliminateEntity(raider);
                } else {
                    // Checa se tem unidade do jogador no próximo tile
                    const playerUnit = entities.find(e => e.tileIndex === nextIdx && e.owner === 'player');
                    if (playerUnit) {
                        resolveTacticalCombat(raider, playerUnit);
                    } else {
                        raider.tileIndex = nextIdx;
                    }
                }
            }
        });

        renderEntities();
    }

    function findClosestPlayerBuilding(fromIndex) {
        const tiles = document.querySelectorAll('.tile');
        const buildingTypes = ['castle', 'farm', 'barracks', 'wall', 'mine', 'lumbercamp', 'temple'];
        const castlesCount = document.querySelectorAll('[data-type="castle"]').length;
        const totalBuildings = Array.from(tiles).filter(t => buildingTypes.includes(t.dataset.type));
        
        let closest = null;
        let minDistance = Infinity;

        const fromX = fromIndex % 20;
        const fromY = Math.floor(fromIndex / 20);

        tiles.forEach((tile, idx) => {
            const bType = tile.dataset.type;
            if (buildingTypes.includes(bType)) {
                // Evita destruir o único castelo restante se for o último prédio do jogador (segurança TL)
                if (bType === 'castle' && castlesCount === 1 && totalBuildings.length > 1) {
                    return;
                }
                const toX = idx % 20;
                const toY = Math.floor(idx / 20);
                const dist = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = { index: idx, type: bType };
                }
            }
        });

        return closest;
    }

    function findAdjacentPassableTile(index) {
        const tiles = document.querySelectorAll('.tile');
        const curX = index % 20;
        const curY = Math.floor(index / 20);
        const neighbors = [
            { x: curX + 1, y: curY }, { x: curX - 1, y: curY },
            { x: curX, y: curY + 1 }, { x: curX, y: curY - 1 }
        ];

        for (let n of neighbors) {
            if (n.x >= 0 && n.x < 20 && n.y >= 0 && n.y < 15) {
                const idx = n.y * 20 + n.x;
                if (tiles[idx] && tiles[idx].dataset.type !== 'water' && !entities.some(e => e.tileIndex === idx)) {
                    return idx;
                }
            }
        }
        return null;
    }

    function renderEntities() {
        // Remover tokens anteriores
        document.querySelectorAll('.unit-token').forEach(el => el.remove());
        document.querySelectorAll('.tile.unit-selected').forEach(el => el.classList.remove('unit-selected'));

        const tiles = document.querySelectorAll('.tile');

        entities.forEach(ent => {
            const tile = tiles[ent.tileIndex];
            if (!tile) return;

            const token = document.createElement('div');
            token.className = `unit-token unit-${ent.owner}`;
            token.textContent = UNIT_SPECS[ent.type].icon;

            if (ent.hasRelic) {
                const badge = document.createElement('div');
                badge.className = 'relic-badge';
                badge.textContent = '🏆';
                token.appendChild(badge);
            }

            tile.appendChild(token);
        });

        if (selectedUnit) {
            const selTile = tiles[selectedUnit.tileIndex];
            if (selTile) selTile.classList.add('unit-selected');
        }
    }

    function handleTileClick(tile, index) {
        getAudioContext(); // ativa áudio na interação

        // 1. Modo Construção Ativo
        if (selectedBuilding) {
            placeBuilding(tile);
            return;
        }

        // 2. Se houver unidade do jogador selecionada
        if (selectedUnit) {
            const curX = selectedUnit.tileIndex % 20;
            const curY = Math.floor(selectedUnit.tileIndex / 20);
            const tgtX = index % 20;
            const tgtY = Math.floor(index / 20);
            const distance = Math.max(Math.abs(tgtX - curX), Math.abs(tgtY - curY));

            // Ataque à distância da Catapulta (Alcance 2)
            if (selectedUnit.type === 'trebuchet' && distance <= 2 && selectedUnit.movesLeft > 0) {
                const enemyTarget = entities.find(e => e.tileIndex === index && e.owner === 'barbarian');
                if (enemyTarget) {
                    playTrebuchetSound();
                    resolveTacticalCombat(selectedUnit, enemyTarget);
                    selectedUnit.movesLeft = 0;
                    selectedUnit = null;
                    renderEntities();
                    return;
                }
            }

            // Movimentação ou Combate Melee (alcance <= movesLeft)
            if (distance <= selectedUnit.movesLeft && distance > 0 && tile.dataset.type !== 'water') {
                const enemyTarget = entities.find(e => e.tileIndex === index && e.owner === 'barbarian');
                if (enemyTarget) {
                    resolveTacticalCombat(selectedUnit, enemyTarget);
                    selectedUnit.movesLeft = 0;
                    selectedUnit = null;
                } else {
                    // Mover unidade
                    selectedUnit.tileIndex = index;
                    selectedUnit.movesLeft -= distance;

                    // Captura de Relíquia
                    if (tile.dataset.type === 'relic' && (selectedUnit.type === 'scout' || selectedUnit.type === 'soldier')) {
                        selectedUnit.hasRelic = true;
                        tile.dataset.type = 'grass';
                        playRelicSound();
                        addEvent(`🏆 ${UNIT_SPECS[selectedUnit.type].name} collected a Sacred Relic! Escort it to a Temple!`);
                    }

                    // Depósito de Relíquia em Templo
                    if (tile.dataset.type === 'temple' && selectedUnit.hasRelic) {
                        selectedUnit.hasRelic = false;
                        playRelicSound();
                        blessingModal.classList.remove('hidden');
                        addEvent('🏆 Sacred Relic deposited in Temple! Choose a Divine Blessing!');
                    }

                    selectedUnit = null;
                }
                renderEntities();
                return;
            }

            // Clicar no mesmo tile deseleciona
            if (selectedUnit.tileIndex === index) {
                selectedUnit = null;
                renderEntities();
                return;
            }
        }

        // 3. Seleção de Unidade do Jogador
        const unitOnTile = entities.find(e => e.tileIndex === index && e.owner === 'player');
        if (unitOnTile) {
            selectedUnit = unitOnTile;
            renderEntities();
            return;
        }

        // Caso nenhum tratamento acima tenha ocorrido, deseleciona
        selectedUnit = null;
        renderEntities();
    }

    function resolveTacticalCombat(attacker, defender) {
        let attackPower = UNIT_SPECS[attacker.type].combatPower;
        let defensePower = UNIT_SPECS[defender.type].combatPower;

        const defenderTile = document.querySelectorAll('.tile')[defender.tileIndex];
        if (defenderTile && defenderTile.dataset.type === 'wall') {
            defensePower += 2;
            addEvent('🧱 Wall grants +2 defense bonus to defender!');
        }

        if (attacker.owner === 'player' && activeBlessings.strength) attackPower += 1;
        if (defender.owner === 'player' && activeBlessings.strength) defensePower += 1;

        addEvent(`⚔️ Combat! Attacker (${UNIT_SPECS[attacker.type].name}: ${attackPower}) vs Defender (${UNIT_SPECS[defender.type].name}: ${defensePower})`);

        if (attackPower >= defensePower) {
            eliminateEntity(defender);
            if (attacker.type !== 'trebuchet') {
                attacker.tileIndex = defender.tileIndex;
            }
            triggerScreenShake(200);
            playCombatSound();
            addEvent(`🎉 Victory! ${UNIT_SPECS[attacker.type].name} defeated ${UNIT_SPECS[defender.type].name}!`);

            if (defender.type === 'camp') {
                defenderTile.dataset.type = 'relic';
                addEvent('🏆 Barbarian Camp destroyed! A Sacred Relic appeared!');
            }
        } else {
            eliminateEntity(attacker);
            triggerScreenShake(150);
            playCombatSound();
            addEvent(`💀 Defeat! ${UNIT_SPECS[attacker.type].name} was repelled by ${UNIT_SPECS[defender.type].name}!`);
        }

        renderEntities();
    }

    function eliminateEntity(entity) {
        entities = entities.filter(e => e !== entity);
    }

    function placeBuilding(tile) {
        if (!selectedBuilding) {
            showStatusMessage('Please select a building first!');
            return;
        }

        if (tile.dataset.type !== 'grass') {
            showStatusMessage('You can only build on grass!');
            return;
        }

        const buildingCost = costs[selectedBuilding];
        if (gold >= buildingCost.gold && food >= buildingCost.food) {
            gold -= buildingCost.gold;
            food -= buildingCost.food;
            tile.dataset.type = selectedBuilding;
            updateResources();
            addEvent(`Built a ${selectedBuilding}!`);

            if (document.querySelectorAll('[data-type="castle"]').length >= 1 && !templeActive) {
                templeButton.classList.remove('hidden');
                templeActive = true;
                showStatusMessage('🏛️ The Temple is now available!');
            }

            if (selectedBuilding === 'castle') {
                checkWinCondition();
            }
        } else {
            showStatusMessage('Not enough resources!');
        }
    }

    // Recrutamento Militar
    recruitButtons.forEach(button => {
        button.addEventListener('click', () => {
            const uType = button.dataset.unit;
            const spec = UNIT_SPECS[uType];

            const barracksCount = document.querySelectorAll('[data-type="barracks"]').length;
            if (barracksCount === 0) {
                showStatusMessage('Você precisa construir um Quartel (Barracks) para recrutar unidades!');
                return;
            }

            if (gold < spec.cost.gold || food < spec.cost.food) {
                showStatusMessage(`Recursos insuficientes! Requer ${spec.cost.gold} 🪙 e ${spec.cost.food} 🍎.`);
                return;
            }

            // Achar um tile do quartel para spawnar
            const barracksTile = document.querySelector('[data-type="barracks"]');
            if (!barracksTile) return;

            const bIndex = parseInt(barracksTile.dataset.index);
            const spawnIndex = findAdjacentPassableTile(bIndex) !== null ? findAdjacentPassableTile(bIndex) : bIndex;

            gold -= spec.cost.gold;
            food -= spec.cost.food;
            updateResources();

            entities.push({
                id: 'unit_' + Date.now(),
                type: uType,
                owner: 'player',
                tileIndex: spawnIndex,
                movesLeft: spec.maxMoves,
                maxMoves: spec.maxMoves,
                combatPower: spec.combatPower,
                hasRelic: false
            });

            renderEntities();
            addEvent(`🎖️ Recruited a ${spec.name}!`);
        });
    });

    // Bênçãos Divinas
    blessingCards.forEach(card => {
        card.addEventListener('click', () => {
            const bType = card.dataset.blessing;
            activeBlessings[bType] = true;
            blessingModal.classList.add('hidden');
            updateActiveBlessingsUI();
            updateResources();
            addEvent(`✨ Activated Divine Blessing: ${card.querySelector('h3').textContent}!`);
        });
    });

    function updateActiveBlessingsUI() {
        const activeNames = [];
        if (activeBlessings.earth) activeNames.push('🌾 Terra (+20% Comida)');
        if (activeBlessings.trade) activeNames.push('🪙 Comércio (+20% Ouro)');
        if (activeBlessings.strength) activeNames.push('⚔️ Força (+1 Combate)');

        activeBlessingsDisplay.textContent = activeNames.length > 0 ?
            `Bênçãos Ativas: ${activeNames.join(' | ')}` : '';
    }

    function addEvent(text) {
        const event = document.createElement('div');
        event.className = 'event';
        event.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        eventLog.prepend(event);
        if (eventLog.children.length > 50) {
            eventLog.removeChild(eventLog.lastChild);
        }
    }
    
    function showStatusMessage(text) {
        statusMessage.textContent = text;
        statusMessage.style.display = 'block';
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }

    function showEventAnimation(type, icon) {
        document.body.classList.add(`flash-${type}`);
        eventOverlay.style.display = 'flex';
        eventIcon.textContent = icon;
        eventIcon.classList.add(`event-${type}`);
        
        setTimeout(() => {
            document.body.classList.remove(`flash-${type}`);
            eventIcon.classList.remove(`event-${type}`);
            eventOverlay.style.display = 'none';
        }, 1500); 
    }

    function handleRandomEvent() {
        if (Math.random() <= 0.3) {
            const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            event.execute();
            showEventAnimation(event.type, event.icon);
        }
    }

    function checkWinCondition() {
        const castlesBuilt = document.querySelectorAll('[data-type="castle"]').length;
        if (castlesBuilt >= difficultyLevel) {
            if (difficultyLevel >= 10) {
                endGame();
            } else {
                advanceLevel();
            }
        }
    }

    function advanceLevel() {
        clearIntervals();
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        nextLevelMessage.textContent = `Level ${difficultyLevel} completed in ${minutes}m${remainingSeconds}s!`;
        nextLevelScreen.classList.remove('hidden');
        nextLevelScreen.style.display = 'flex';
        difficultyLevel++;
    }

    function endGame() {
        clearIntervals();
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        winMessage.textContent = `You won the game in ${minutes}m${remainingSeconds}s!`;
        winScreen.classList.remove('hidden');
        winScreen.style.display = 'flex';
    }

    buildButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedBuilding = button.dataset.building;
            buildButtons.forEach(b => b.classList.remove('selected'));
            button.classList.add('selected');
        });
    });

    restartButton.addEventListener('click', () => {
        initGame(true);
    });

    nextLevelButton.addEventListener('click', () => {
        initGame(false);
    });

    startGameButton.addEventListener('click', () => {
        tutorialScreen.style.display = 'none';
        initGame();
    });
});