document.addEventListener('DOMContentLoaded', () => {

    let selectedBuilding = null;
    let gold = 100;
    let food = 100;
    let seconds = 0;
    let difficultyLevel = 1;
    let gameTimerInterval;
    let resourceInterval;
    let eventInterval;
    let templeActive = false;

    const map = document.getElementById('map');
    const goldDisplay = document.getElementById('gold');
    const foodDisplay = document.getElementById('food');
    const timerDisplay = document.getElementById('game-timer');
    const eventLog = document.getElementById('event-log');
    const buildButtons = document.querySelectorAll('.build-button');
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
        map.innerHTML = '';
        eventLog.innerHTML = '';
        statusMessage.style.display = 'none';
        winScreen.classList.add('hidden');
        winScreen.style.display = 'none';
        nextLevelScreen.classList.add('hidden');
        nextLevelScreen.style.display = 'none';
        document.querySelectorAll('.build-button').forEach(b => b.classList.remove('selected'));
        templeButton.classList.add('hidden');
        updateLevelDisplay();

        const waterTiles = new Set();
        while(waterTiles.size < 25) {
            waterTiles.add(Math.floor(Math.random() * (15 * 20)));
        }

        for (let i = 0; i < 15 * 20; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            if (waterTiles.has(i)) {
                tile.dataset.type = 'water';
            } else {
                tile.dataset.type = 'grass';
            }
            tile.addEventListener('click', () => placeBuilding(tile));
            map.appendChild(tile);
        }

        updateResources();
        addEvent(`Game started! Welcome to Level ${difficultyLevel}!`);

        clearIntervals();
        gameTimerInterval = setInterval(updateTimer, 1000);
        
        resourceInterval = setInterval(updateResources, 5000);
        
        eventInterval = setInterval(handleRandomEvent, 10000);
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

        food += (farms * 3) + (lumbercamps * 10) - (barracks * 1);
        gold += (castles * 4) + (temples * 1) + (mines * 10) - (barracks * 1);

        goldDisplay.textContent = `Gold: ${gold}`;
        foodDisplay.textContent = `Food: ${food}`;
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

    restartButton.addEventListener('click', () => initGame(true));
    nextLevelButton.addEventListener('click', () => initGame(false));

    startGameButton.addEventListener('click', () => {
        tutorialScreen.style.display = 'none';
        initGame();
    });
});