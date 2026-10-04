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
    let bannerTimeout = null;

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
    const tutorialOpenBtn = document.getElementById('tutorial-open-btn');
    
    const eventOverlay = document.getElementById('event-overlay');
    const eventIcon = document.getElementById('event-icon');

    const eventBanner = document.getElementById('event-banner');
    const bannerSeal = document.getElementById('banner-seal');
    const bannerTitle = document.getElementById('banner-title');
    const bannerDesc = document.getElementById('banner-desc');

    const blessingModal = document.getElementById('blessing-modal');
    const blessingCards = document.querySelectorAll('.blessing-card');
    const activeBlessingsDisplay = document.getElementById('active-blessings');

    const goldRateDisplay = document.getElementById('gold-rate');
    const foodRateDisplay = document.getElementById('food-rate');
    const gameMusic = document.getElementById('game-music');
    const musicToggleBtn = document.getElementById('music-toggle-btn');

    // Mostra o tutorial inicial na primeira carga
    if (tutorialScreen) {
        tutorialScreen.style.display = 'flex';
    }

    const costs = {
        castle: { gold: 110, food: 100 },
        farm: { gold: 50, food: 0 },
        barracks: { gold: 75, food: 25 },
        wall: { gold: 25, food: 20 },
        mine: { gold: 100, food: 50 },
        lumbercamp: { gold: 20, food: 30 },
        temple: { gold: 10, food: 60 }
    };

    const BUILDING_NAMES = {
        castle: 'Castelo Imperial',
        farm: 'Fazenda Fértil',
        barracks: 'Quartel de Guerra',
        wall: 'Muralha de Pedra',
        mine: 'Mina Aurífera',
        lumbercamp: 'Madeireira Real',
        temple: 'Templo Sagrado'
    };

    const UNIT_SPECS = {
        scout: { name: 'Batedor Real', cost: { gold: 40, food: 20 }, maxMoves: 2, vision: 3, combatPower: 1, icon: '🕵️' },
        soldier: { name: 'Guarda de Infantaria', cost: { gold: 60, food: 40 }, maxMoves: 1, vision: 2, combatPower: 3, icon: '⚔️' },
        trebuchet: { name: 'Catapulta de Cerco', cost: { gold: 100, food: 60 }, maxMoves: 1, vision: 1, combatPower: 6, icon: '🎯', range: 2 },
        barbarian: { name: 'Saqueador Bárbaro', maxMoves: 1, combatPower: 2, icon: '🪓' },
        camp: { name: 'Acampamento Bárbaro', combatPower: 4, icon: '⛺' }
    };

    // Controle de Áudio Medieval
    if (musicToggleBtn && gameMusic) {
        musicToggleBtn.addEventListener('click', () => {
            if (gameMusic.paused) {
                gameMusic.play().then(() => {
                    const label = musicToggleBtn.querySelector('.btn-label');
                    const icon = musicToggleBtn.querySelector('.btn-icon');
                    if (label) label.textContent = 'Música: On';
                    if (icon) icon.textContent = '🎵';
                }).catch(() => {});
            } else {
                gameMusic.pause();
                const label = musicToggleBtn.querySelector('.btn-label');
                const icon = musicToggleBtn.querySelector('.btn-icon');
                if (label) label.textContent = 'Música: Mudo';
                if (icon) icon.textContent = '🔇';
            }
        });
    }

    if (tutorialOpenBtn && tutorialScreen) {
        tutorialOpenBtn.addEventListener('click', () => {
            tutorialScreen.style.display = 'flex';
        });
    }

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

    function playTriumphSound() {
        try {
            const ctx = getAudioContext();
            const fanfare = [
                { f: 261.63, t: 0, d: 0.15 },
                { f: 329.63, t: 0.15, d: 0.15 },
                { f: 392.00, t: 0.30, d: 0.18 },
                { f: 523.25, t: 0.48, d: 0.55 }
            ];
            fanfare.forEach(note => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note.f, ctx.currentTime + note.t);
                gain.gain.setValueAtTime(0.28, ctx.currentTime + note.t);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.t + note.d);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + note.t);
                osc.stop(ctx.currentTime + note.t + note.d);
            });
        } catch(e){}
    }

    function triggerScreenShake(durationMs = 200) {
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, durationMs);
    }

    function spawnFloatingText(tileIndex, text, type = 'good') {
        const tiles = document.querySelectorAll('.tile');
        const tile = tiles[tileIndex];
        if (!tile) return;
        const floatEl = document.createElement('div');
        floatEl.className = `floating-text float-${type}`;
        floatEl.textContent = text;
        tile.appendChild(floatEl);
        setTimeout(() => floatEl.remove(), 1100);
    }

    const EVENTS = [
        { name: 'raid', title: 'Incursão de Bandidos!', text: 'Bandidos atacaram vosso reino!', type: 'bad', icon: '💀', execute: () => {
            const defense = document.querySelectorAll('[data-type="barracks"]').length + document.querySelectorAll('[data-type="wall"]').length;
            if (defense < Math.floor(Math.random() * 8) + 1) {
                const value = Math.floor(Math.random() * 20) + 40;
                gold = Math.max(0, gold - value);
                addEvent(`Perdeu ${value} ouro para saqueadores!`);
            } else {
                addEvent('Os bandidos foram rechaçados com sucesso pela guarda!');
            }
        }},
        { name: 'boom', title: 'Caravana Comercial!', text: 'Mercadores trouxeram ouro extra à coroa!', type: 'good', icon: '💰', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 50;
            gold += amount;
            addEvent(`Recebeu ${amount} ouro em tributos e comércio.`);
        }},
        { name: 'plague', title: 'Praga nas Lavouras!', text: 'Uma praga dizimou plantações e colheitas!', type: 'bad', icon: '🦠', execute: () => {
            food = Math.max(0, food - (Math.floor(Math.random() * 10) + 25));
            const farms = document.querySelectorAll('[data-type="farm"]');
            if (farms.length > 0) {
                farms[0].dataset.type = 'grass';
                addEvent('Perdeu 1 fazenda devido à praga severa.');
            }
            addEvent('Perdeu suprimentos para a praga.');
        }},
        { name: 'drought', title: 'Estiagem e Seca!', text: 'A seca reduziu os recursos hídricos e celeiros!', type: 'bad', icon: '🥵', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            const lostFood = Math.max(0, Math.floor(Math.random() * 50) + 1 - (templeCount * 10));
            food = Math.max(0, food - lostFood);
            addEvent(`Perdeu ${lostFood} suprimentos de comida.`);
        }},
        { name: 'festival', title: 'Grande Festival Real!', text: 'Celebrações populares aumentaram a moral do reino!', type: 'good', icon: '🎉', execute: () => {
            const amount = Math.floor(Math.random() * 20) + 30;
            food += amount;
            addEvent(`Recebeu ${amount} suprimentos da fartura festiva.`);
        }},
        { name: 'rebellion', title: 'Rebelião Camponesa!', text: 'Camponeses descontentes iniciaram um levante!', type: 'bad', icon: '😡', execute: () => {
            const defense = document.querySelectorAll('[data-type="barracks"]').length + document.querySelectorAll('[data-type="wall"]').length;
            let lostFood = 5;
            if (defense < Math.floor(Math.random() * 12) + 1) {
                lostFood = document.querySelectorAll('[data-type="castle"]').length >= 1 ?
                    Math.floor(Math.random() * 20) + 1 :
                    Math.floor(Math.random() * 40) + 20;
            }
            food = Math.max(0, food - lostFood);
            addEvent(`Perdeu ${lostFood} comida durante o levante.`);
            const barracks = document.querySelectorAll('[data-type="barracks"]');
            if (barracks.length > 0) {
                barracks[0].dataset.type = 'grass';
                addEvent('Perdeu 1 quartel para a rebelião.');
            }
        }},
        { name: 'discovery', title: 'Veio Aurífero Encontrado!', text: 'Mineradores descobriram ricas jazidas de ouro!', type: 'good', icon: '💎', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 20;
            gold += amount;
            addEvent(`Encontrou ${amount} de ouro nas galerias.`);
        }},
        { name: 'storm', title: 'Tempestade Violenta!', text: 'Raios e vendavais atingiram as fortificações!', type: 'bad', icon: '🌩️', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            const lostFood = Math.max(0, Math.floor(Math.random() * 50) + 1 - (templeCount * 10));
            food = Math.max(0, food - lostFood);
            addEvent(`Perdeu ${lostFood} comida durante a tempestade.`);
        }},
        { name: 'alliance', title: 'Aliança Real Firmada!', text: 'Um ducado vizinho selou pacto de cooperação!', type: 'good', icon: '🤝', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 50;
            gold += amount;
            addEvent(`Recebeu ${amount} ouro em dotes de aliança.`);
        }},
        { name: 'betrayal', title: 'Traição na Corte!', text: 'Um conselheiro desleal desviou tributos!', type: 'bad', icon: '🔪', execute: () => {
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
            addEvent(`Perdeu ${lostFood} comida e ${lostGold} ouro.`);
        }},
        { name: 'invasion', title: 'Incursão Inimiga!', text: 'Um feudo rival tentou violar as fronteiras!', type: 'bad', icon: '🛡️', execute: () => {
            const castleCount = document.querySelectorAll('[data-type="castle"]').length;
            const lostFood = Math.max(0, Math.floor(Math.random() * 50) - (castleCount * 5));
            food = Math.max(0, food - lostFood);
            addEvent(`Perdeu ${lostFood} suprimentos na incursão.`);
        }},
        { name: 'bumperHarvest', title: 'Colheita Abençoada!', text: 'Uma safra recorde encheu os silos reais!', type: 'good', icon: '🍎', execute: () => {
            const farmCount = document.querySelectorAll('[data-type="farm"]').length;
            const amount = Math.floor(Math.random() * 50) + (farmCount * 10);
            food += amount;
            addEvent(`Colheu ${amount} suprimentos extras.`);
        }},
        { name: 'earthquake', title: 'Terremoto!', text: 'Abalos sísmicos danificaram estruturas de pedra!', type: 'bad', icon: '🌍', execute: () => {
            const walls = document.querySelectorAll('[data-type="wall"]');
            if (walls.length > 0) {
                walls[0].dataset.type = 'grass';
                addEvent('Perdeu 1 muralha para o tremor.');
            }
        }},
        { name: 'refugees', title: 'Refugiados de Guerra!', text: 'Imigrantes chegam às fronteiras com riquezas!', type: 'neutral', icon: '🚶', execute: () => {
            const lostFood = Math.floor(Math.random() * 50) + 1;
            food = Math.max(0, food - lostFood);
            gold += Math.max(0, lostFood);
            addEvent(`Consumiu ${lostFood} comida mas acolheu ${lostFood} ouro.`);
        }},
        { name: 'spy', title: 'Espião Capturado!', text: 'Um espião foi interrogado e segredos revelados!', type: 'good', icon: '🕵️', execute: () => {
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
            addEvent(`Prejuízo de espionagem mitigado para ${lostGold} ouro.`);
        }},
        { name: 'flood', title: 'Inundação das Terras Baixas!', text: 'Rios transbordaram sobre os vales férteis!', type: 'bad', icon: '🌊', execute: () => {
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
            addEvent(`Perdeu ${lostFood} comida nas cheias.`);
        }},
        { name: 'innovation', title: 'Inovação dos Alquimistas!', text: 'Eruditos da corte criaram métodos de refinamento!', type: 'good', icon: '💡', execute: () => {
            const amount = Math.floor(Math.random() * 50) + 20;
            gold += amount;
            addEvent(`Recebeu ${amount} ouro em inovações.`);
        }},
        { name: 'disease', title: 'Surto Epidêmico!', text: 'Uma enfermidade reduziu a produtividade feudal!', type: 'bad', icon: '😷', execute: () => {
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
            addEvent(`Perdeu ${lostFood} comida com a epidemia.`);
        }},
        { name: 'pilgrimage', title: 'Peregrinação Sagrada!', text: 'Devotos visitam o santuário com ricas oferendas!', type: 'good', icon: '🙏', execute: () => {
            const templeCount = document.querySelectorAll('[data-type="temple"]').length;
            const amount = templeCount > 0 ?
                Math.floor(Math.random() * 50) + (templeCount * 10) :
                Math.floor(Math.random() * 20) + 5;
            gold += amount;
            addEvent(`Recebeu ${amount} ouro em dízimos de peregrinos.`);
        }},
        { name: 'wildfire', title: 'Fogo nas Matas!', text: 'Incêndios florestais ameaçam os arredores!', type: 'bad', icon: '🔥', execute: () => {
            const lostFood = Math.floor(Math.random() * 50) + 10;
            food = Math.max(0, food - lostFood);
            addEvent(`Perdeu ${lostFood} suprimentos com o fogo.`);
            const farms = document.querySelectorAll('[data-type="farm"]');
            if (farms.length > 0) {
                farms[0].dataset.type = 'grass';
                addEvent('Perdeu 1 fazenda para o fogo.');
            }
        }},
        { name: 'luckyFind', title: 'Baú de Relíquias Perdido!', text: 'Camponeses encontraram um tesouro esquecido!', type: 'good', icon: '🍀', execute: () => {
            const amount = Math.floor(Math.random() * 20) + 30;
            gold += amount;
            addEvent(`Encontrou ${amount} ouro no tesouro oculto.`);
        }},
        { name: 'mineCollapse', title: 'Desmoronamento na Mina!', text: 'Uma galeria de extração cedeu!', type: 'bad', icon: '⛏️', execute: () => {
            const mines = document.querySelectorAll('[data-type="mine"]');
            if (mines.length > 0) {
                mines[0].dataset.type = 'grass';
                gold = Math.max(0, gold - 50);
                addEvent('Perdeu 1 mina e 50 ouro no desabamento.');
            }
        }},
        { name: 'forestFire', title: 'Chamas no Acampamento!', text: 'Fogo atingiu a serraria da madeireira!', type: 'bad', icon: '🔥', execute: () => {
            const camps = document.querySelectorAll('[data-type="lumbercamp"]');
            if (camps.length > 0) {
                camps[0].dataset.type = 'grass';
                food = Math.max(0, food - 50);
                addEvent('Perdeu 1 madeireira e 50 comida.');
            }
        }},
        { name: 'nobleDonation', title: 'Dote da Nobreza!', text: 'Um nobre mecenas investiu no império!', type: 'good', icon: '👑', execute: () => {
            const amount = Math.floor(Math.random() * 100) + 50;
            gold += amount;
            food += amount;
            addEvent(`Um lorde doou ${amount} de ouro e comida!`);
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

        updateResources();
        renderEntities();
        addEvent(`Campanha iniciada! Bem-vindo ao Nível ${difficultyLevel}!`);

        clearIntervals();
        gameTimerInterval = setInterval(updateTimer, 1000);
        resourceInterval = setInterval(updateResources, 5000);
        eventInterval = setInterval(handleRandomEvent, 10000);
        barbarianInterval = setInterval(updateBarbariansTurn, 15000);
    }

    function updateLevelDisplay() {
        if (gameLevelDisplay) {
            if (difficultyLevel < 10) {
                gameLevelDisplay.textContent = `Nível ${difficultyLevel}: Construa ${difficultyLevel} Castelo${difficultyLevel > 1 ? 's' : ''} para avançar!`;
            } else {
                gameLevelDisplay.textContent = 'Nível 10: Construa 10 Castelos para a VITÓRIA SUPREMA!';
            }
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
        if (timerDisplay) {
            timerDisplay.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
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

        const netGold = castleMineGold + (temples * 1) + (farms * 4) + (lumbercamps * 1) - (barracks * 1);
        const netFood = farmFood + (lumbercamps * 10) - (barracks * 1);

        gold += netGold;
        food += netFood;

        if (goldDisplay) goldDisplay.textContent = gold;
        if (foodDisplay) foodDisplay.textContent = food;

        if (goldRateDisplay) {
            goldRateDisplay.textContent = (netGold >= 0 ? `+${netGold}` : `${netGold}`) + '/5s';
            goldRateDisplay.className = 'res-rate ' + (netGold >= 0 ? '' : 'negative');
        }
        if (foodRateDisplay) {
            foodRateDisplay.textContent = (netFood >= 0 ? `+${netFood}` : `${netFood}`) + '/5s';
            foodRateDisplay.className = 'res-rate ' + (netFood >= 0 ? '' : 'negative');
        }

        updateButtonAffordability();

        // Restaurar movimento das unidades do jogador a cada tick de recursos
        entities.forEach(ent => {
            if (ent.owner === 'player') {
                ent.movesLeft = UNIT_SPECS[ent.type].maxMoves;
            }
        });
        renderEntities();
    }

    function updateButtonAffordability() {
        buildButtons.forEach(btn => {
            const bType = btn.dataset.building;
            const cost = costs[bType];
            if (cost) {
                if (gold < cost.gold || food < cost.food) {
                    btn.classList.add('unaffordable');
                } else {
                    btn.classList.remove('unaffordable');
                }
            }
        });

        recruitButtons.forEach(btn => {
            const uType = btn.dataset.unit;
            const spec = UNIT_SPECS[uType];
            if (spec) {
                if (gold < spec.cost.gold || food < spec.cost.food) {
                    btn.classList.add('unaffordable');
                } else {
                    btn.classList.remove('unaffordable');
                }
            }
        });
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
                    addEvent('🪓 Um Saqueador Bárbaro emergiu do acampamento!');
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
                if (nextIdx === targetBuilding.index) {
                    // Saqueia o prédio!
                    nextTile.dataset.type = 'grass';
                    gold = Math.max(0, gold - 50);
                    food = Math.max(0, food - 50);
                    updateResources();
                    triggerScreenShake(200);
                    spawnFloatingText(targetBuilding.index, '💥 -50🪙 -50🍎', 'bad');
                    addEvent(`🪓 Saqueador Bárbaro pilhou vosso(a) ${BUILDING_NAMES[targetBuilding.type] || targetBuilding.type}! (-50 Ouro, -50 Comida)`);
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
        getAudioContext();

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
                        spawnFloatingText(index, '🏆 COLETADA!', 'good');
                        addEvent(`🏆 ${UNIT_SPECS[selectedUnit.type].name} resgatou uma Relíquia Sagrada! Escorte-a até um Templo!`);
                    }

                    // Depósito de Relíquia em Templo
                    if (tile.dataset.type === 'temple' && selectedUnit.hasRelic) {
                        selectedUnit.hasRelic = false;
                        playRelicSound();
                        spawnFloatingText(index, '✨ CONSAGRADA!', 'good');
                        blessingModal.classList.remove('hidden');
                        addEvent('🏆 Relíquia Sagrada depositada no Templo! Escolha uma Bênção Divina!');
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

        selectedUnit = null;
        renderEntities();
    }

    function resolveTacticalCombat(attacker, defender) {
        let attackPower = UNIT_SPECS[attacker.type].combatPower;
        let defensePower = UNIT_SPECS[defender.type].combatPower;

        const defenderTile = document.querySelectorAll('.tile')[defender.tileIndex];
        if (defenderTile && defenderTile.dataset.type === 'wall') {
            defensePower += 2;
            addEvent('🧱 Muralha concede +2 de bônus defensivo à tropa acantonada!');
        }

        if (attacker.owner === 'player' && activeBlessings.strength) attackPower += 1;
        if (defender.owner === 'player' && activeBlessings.strength) defensePower += 1;

        addEvent(`⚔️ Combate! Atacante (${UNIT_SPECS[attacker.type].name}: ${attackPower}) vs Defensor (${UNIT_SPECS[defender.type].name}: ${defensePower})`);

        if (attackPower >= defensePower) {
            eliminateEntity(defender);
            if (attacker.type !== 'trebuchet') {
                attacker.tileIndex = defender.tileIndex;
            }
            triggerScreenShake(200);
            playCombatSound();
            spawnFloatingText(defender.tileIndex, '⚔️ VITÓRIA!', 'combat');
            addEvent(`🎉 Vitória! ${UNIT_SPECS[attacker.type].name} derrotou ${UNIT_SPECS[defender.type].name}!`);

            if (defender.type === 'camp') {
                defenderTile.dataset.type = 'relic';
                spawnFloatingText(defender.tileIndex, '🏆 RELÍQUIA!', 'good');
                addEvent('🏆 Acampamento Bárbaro destruído! Uma Relíquia Sagrada reluz nas ruínas!');
            }
        } else {
            eliminateEntity(attacker);
            triggerScreenShake(150);
            playCombatSound();
            spawnFloatingText(defender.tileIndex, '💀 DERROTA!', 'bad');
            addEvent(`💀 Derrota! ${UNIT_SPECS[attacker.type].name} foi rechaçado por ${UNIT_SPECS[defender.type].name}!`);
        }

        renderEntities();
    }

    function eliminateEntity(entity) {
        entities = entities.filter(e => e !== entity);
    }

    function placeBuilding(tile) {
        if (!selectedBuilding) {
            showStatusMessage('Por favor, selecione uma construção primeiro!');
            return;
        }

        if (tile.dataset.type !== 'grass') {
            showStatusMessage('Você só pode construir em planícies férteis (grama)!');
            return;
        }

        const buildingCost = costs[selectedBuilding];
        if (gold >= buildingCost.gold && food >= buildingCost.food) {
            gold -= buildingCost.gold;
            food -= buildingCost.food;
            tile.dataset.type = selectedBuilding;
            
            // Efeito visual de construção
            tile.classList.add('building-spawn');
            setTimeout(() => tile.classList.remove('building-spawn'), 400);
            spawnFloatingText(parseInt(tile.dataset.index), `-${buildingCost.gold}🪙`, 'cost');

            updateResources();
            addEvent(`Ergueu um(a) ${BUILDING_NAMES[selectedBuilding] || selectedBuilding}!`);

            if (document.querySelectorAll('[data-type="castle"]').length >= 1 && !templeActive) {
                templeButton.classList.remove('hidden');
                templeActive = true;
                showStatusMessage('🏛️ O Templo Sagrado agora está disponível para o vosso Império!');
            }

            if (selectedBuilding === 'castle') {
                checkWinCondition();
            }
        } else {
            showStatusMessage('Recursos insuficientes nos cofres reais!');
        }
    }

    // Recrutamento Militar
    recruitButtons.forEach(button => {
        button.addEventListener('click', () => {
            const uType = button.dataset.unit;
            const spec = UNIT_SPECS[uType];

            const barracksCount = document.querySelectorAll('[data-type="barracks"]').length;
            if (barracksCount === 0) {
                showStatusMessage('Vossa majestade necessita de um Quartel de Guerra para treinar tropas!');
                return;
            }

            if (gold < spec.cost.gold || food < spec.cost.food) {
                showStatusMessage(`Recursos insuficientes! Requer ${spec.cost.gold} 🪙 e ${spec.cost.food} 🍎.`);
                return;
            }

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

            spawnFloatingText(spawnIndex, `-${spec.cost.gold}🪙`, 'cost');
            renderEntities();
            addEvent(`🎖️ Recrutou um ${spec.name}!`);
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
            addEvent(`✨ Bênção Divina Consagrada: ${card.querySelector('h3').textContent}!`);
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

    function showEventAnimation(type, icon, title = 'Crônica de Guerra', text = '') {
        document.body.classList.add(`flash-${type}`);
        if (eventOverlay && eventIcon) {
            eventOverlay.style.display = 'flex';
            eventIcon.textContent = icon;
            eventIcon.classList.add(`event-${type}`);
        }

        if (eventBanner) {
            if (bannerSeal) bannerSeal.textContent = icon;
            if (bannerTitle) bannerTitle.textContent = title;
            if (bannerDesc) bannerDesc.textContent = text;
            eventBanner.classList.remove('hidden');
            clearTimeout(bannerTimeout);
            bannerTimeout = setTimeout(() => {
                eventBanner.classList.add('hidden');
            }, 3500);
        }
        
        setTimeout(() => {
            document.body.classList.remove(`flash-${type}`);
            if (eventIcon) eventIcon.classList.remove(`event-${type}`);
            if (eventOverlay) eventOverlay.style.display = 'none';
        }, 1500); 
    }

    function handleRandomEvent() {
        if (Math.random() <= 0.3) {
            const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            event.execute();
            showEventAnimation(event.type, event.icon, event.title, event.text);
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
        playTriumphSound();
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        nextLevelMessage.textContent = `Nível ${difficultyLevel} completado com honra em ${minutes}m${remainingSeconds}s!`;
        nextLevelScreen.classList.remove('hidden');
        nextLevelScreen.style.display = 'flex';
        difficultyLevel++;
    }

    function endGame() {
        clearIntervals();
        playTriumphSound();
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        winMessage.textContent = `Vossa Majestade Venceu a Campanha em ${minutes}m${remainingSeconds}s!`;
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
        getAudioContext();
        if (gameMusic && gameMusic.paused) {
            gameMusic.play().then(() => {
                if (musicToggleBtn) {
                    const label = musicToggleBtn.querySelector('.btn-label');
                    const icon = musicToggleBtn.querySelector('.btn-icon');
                    if (label) label.textContent = 'Música: On';
                    if (icon) icon.textContent = '🎵';
                }
            }).catch(() => {});
        }
        initGame();
    });
});