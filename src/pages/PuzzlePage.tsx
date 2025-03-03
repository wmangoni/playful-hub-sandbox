
import React from 'react';

function ComponenteComIframeHTMLInline() {
  const htmlEmbutido = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mind Labyrinth: A Puzzle Adventure</title>
    <style>
        .puzzle-page :root {
            --primary-color: #2d2b42;
            --secondary-color: #5a4a7f;
            --accent-color: #8a7fb0;
            --light-color: #e8e6f0;
            --success-color: #4caf50;
            --error-color: #f44336;
        }
        
        body.puzzle-page  {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--primary-color);
            color: var(--light-color);
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .puzzle-page  header {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 1rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        .puzzle-page  h1 {
            margin: 0;
            font-size: 2.5rem;
            color: var(--light-color);
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .puzzle-page  main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
        }
        
        .puzzle-page  .game-container {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 2rem;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
            width: 100%;
            max-width: 800px;
            position: relative;
            overflow: hidden;
        }
        
        .puzzle-page  .game-ui {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--accent-color);
        }
        
        .puzzle-page  .level-indicator, .score-indicator {
            font-size: 1.2rem;
            background-color: rgba(0, 0, 0, 0.3);
            padding: 0.5rem 1rem;
            border-radius: 5px;
        }
        
        .puzzle-page .puzzle-container {
            margin: 1rem 0;
            min-height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .puzzle-page .puzzle-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--accent-color);
        }
        
        .puzzle-page .puzzle-description {
            margin-bottom: 2rem;
            text-align: center;
            line-height: 1.6;
        }
        
        .puzzle-page .btn {
            background-color: var(--secondary-color);
            color: var(--light-color);
            border: none;
            padding: 0.8rem 1.5rem;
            font-size: 1rem;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 0.5rem;
        }
        
        .puzzle-page .btn:hover {
            background-color: var(--accent-color);
            transform: translateY(-2px);
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }
        
        .puzzle-page .btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        
        .puzzle-page .btn-primary {
            background-color: var(--accent-color);
        }
        
        .puzzle-page .btn-success {
            background-color: var(--success-color);
        }
        
        .puzzle-page .control-panel {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 1rem;
        }
        
        .puzzle-page .pattern-grid {
            display: grid;
            grid-template-columns: repeat(3, 80px);
            grid-template-rows: repeat(3, 80px);
            gap: 10px;
        }
        
        .puzzle-page .pattern-cell {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .puzzle-page .pattern-cell:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .puzzle-page .pattern-cell.selected {
            background-color: var(--accent-color);
            transform: scale(1.05);
            box-shadow: 0 0 10px var(--accent-color);
        }
        
        .puzzle-page .pattern-options {
            display: flex;
            margin-top: 20px;
            gap: 15px;
        }
        
        .puzzle-page .pattern-option {
            width: 60px;
            height: 60px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .puzzle-page .pattern-option:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
        }
        
        .puzzle-page .memory-grid {
            display: grid;
            grid-template-columns: repeat(4, 80px);
            grid-template-rows: repeat(4, 80px);
            gap: 10px;
        }
        
        .puzzle-page .memory-cell {
            background-color: var(--secondary-color);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .puzzle-page .memory-cell:hover {
            background-color: var(--accent-color);
        }
        
        .puzzle-page .memory-cell.revealed {
            background-color: var(--light-color);
            color: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            font-weight: bold;
        }
        
        .puzzle-page .memory-cell.matched {
            background-color: var(--success-color);
            cursor: default;
        }
        
        .puzzle-page .logic-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-gap: 10px;
            margin-bottom: 20px;
        }
        
        .puzzle-page .logic-statement {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        
        .puzzle-page .logic-options {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }
        
        .puzzle-page .logic-symbol {
            width: 30px;
            height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            margin: 0 5px;
            background-color: var(--accent-color);
        }
        
        .puzzle-page .completion-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        
        .puzzle-page .feedback-message {
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 5px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .puzzle-page .feedback-success {
            background-color: rgba(76, 175, 80, 0.3);
            color: #b9f6ca;
        }
        
        .puzzle-page .feedback-error {
            background-color: rgba(244, 67, 54, 0.3);
            color: #ffcdd2;
        }
        
        .puzzle-page .hint-text {
            margin-top: 1rem;
            font-style: italic;
            color: var(--accent-color);
            text-align: center;
        }
        
        .puzzle-page .narrative-text {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 1.5rem;
            border-radius: 5px;
            margin: 1rem 0;
            border-left: 4px solid var(--accent-color);
            font-style: italic;
            line-height: 1.6;
        }
        
        .puzzle-page .sequence-puzzle {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .puzzle-page .sequence-display {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .puzzle-page .sequence-item {
            width: 60px;
            height: 60px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
        }
        
        .puzzle-page .sequence-options {
            display: flex;
            gap: 15px;
        }
        
        .puzzle-page .sequence-option {
            width: 50px;
            height: 50px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .puzzle-page .sequence-option:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
        }
        
        .puzzle-page .perspective-puzzle {
            perspective: 800px;
        }
        
        .puzzle-page .rotating-cube {
            width: 200px;
            height: 200px;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 1s ease;
            margin: 50px auto;
        }
        
        .puzzle-page .rotating-cube div {
            position: absolute;
            width: 200px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            opacity: 0.8;
        }
        
        .puzzle-page .rotating-cube .front {
            transform: translateZ(100px);
            background-color: rgba(76, 175, 80, 0.5);
        }
        
        .puzzle-page .rotating-cube .back {
            transform: rotateY(180deg) translateZ(100px);
            background-color: rgba(244, 67, 54, 0.5);
        }
        
        .puzzle-page .rotating-cube .left {
            transform: rotateY(-90deg) translateZ(100px);
            background-color: rgba(33, 150, 243, 0.5);
        }
        
        .puzzle-page .puzzle-page .rotating-cube .right {
            transform: rotateY(90deg) translateZ(100px);
            background-color: rgba(255, 235, 59, 0.5);
        }
        
        .puzzle-page .rotating-cube .top {
            transform: rotateX(90deg) translateZ(100px);
            background-color: rgba(156, 39, 176, 0.5);
        }
        
        .puzzle-page .rotating-cube .bottom {
            transform: rotateX(-90deg) translateZ(100px);
            background-color: rgba(255, 152, 0, 0.5);
        }
        
        .puzzle-page .cube-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
        
        .puzzle-page footer {
            text-align: center;
            padding: 1rem;
            background-color: rgba(0, 0, 0, 0.3);
            font-size: 0.9rem;
        }

        @media (max-width: 600px) {
            .puzzle-page .game-container {
                padding: 1rem;
            }
            
            .puzzle-page .pattern-grid {
                grid-template-columns: repeat(3, 60px);
                grid-template-rows: repeat(3, 60px);
            }
            
            .puzzle-page .memory-grid {
                grid-template-columns: repeat(4, 60px);
                grid-template-rows: repeat(4, 60px);
            }
            
            .puzzle-page .pattern-option, .sequence-item {
                width: 50px;
                height: 50px;
            }
            
            .puzzle-page .sequence-option {
                width: 40px;
                height: 40px;
            }
        }
    </style>
</head>
<body class="puzzle-page">
    <header>
        <h1>Mind Labyrinth</h1>
    </header>
    
    <main>
        <div class="game-container">
            <div class="game-ui">
                <div class="level-indicator">Level: <span id="level">1</span></div>
                <div class="score-indicator">Score: <span id="score">0</span></div>
            </div>
            
            <div class="narrative-text" id="narrative">
                You find yourself in a mysterious ancient library. The air is thick with dust and mystery. Before you stands a series of puzzles, each protecting a fragment of forgotten knowledge. "To proceed," whispers an unseen voice, "you must prove your mind worthy..."
            </div>
            
            <div class="puzzle-container" id="puzzle-container">
                <!-- Puzzle content will be dynamically inserted here -->
            </div>
            
            <div id="feedback" class="feedback-message" style="display: none;"></div>
            
            <div class="control-panel" id="control-panel">
                <button class="btn btn-primary" id="start-button">Begin Journey</button>
            </div>
        </div>
    </main>
    
    <footer>
        Mind Labyrinth &copy; 2025 - A Puzzle Adventure
    </footer>
    
    <script>
        // Game state
        const gameState = {
            level: 1,
            score: 0,
            currentPuzzle: null,
            puzzlesSolved: 0,
            narrativeProgress: 0
        };
        
        // DOM elements
        const levelElement = document.getElementById('level');
        const scoreElement = document.getElementById('score');
        const puzzleContainer = document.getElementById('puzzle-container');
        const controlPanel = document.getElementById('control-panel');
        const startButton = document.getElementById('start-button');
        const narrativeElement = document.getElementById('narrative');
        const feedbackElement = document.getElementById('feedback');
        
        // Narrative text pieces
        const narrativeTexts = [
            "You find yourself in a mysterious ancient library. The air is thick with dust and mystery. Before you stands a series of puzzles, each protecting a fragment of forgotten knowledge. \\"To proceed,\\" whispers an unseen voice, \\"you must prove your mind worthy...\\"",
            "As you solve the first puzzle, a soft glow illuminates a nearby scroll. It depicts an ancient civilization that discovered patterns within the very fabric of reality.",
            "The second challenge yields another scroll fragment. It speaks of a society that learned to perceive truths beyond the obvious, hidden in plain sight.",
            "With each puzzle solved, you begin to understand that this library was created to preserve knowledge too powerful to be freely shared. The creators feared its misuse.",
            "You've uncovered half of the library's secrets now. The scrolls reveal that the knowledge hidden here could reshape perception itself, allowing minds to transcend ordinary limits.",
            "The voices grow clearer as you progress. \\"Few have made it this far,\\" they whisper. \\"Continue, and you may join those who see beyond the veil.\\"",
            "Almost there now. The final scrolls reveal why the library was sealed: its creators discovered a truth so fundamental that it changed them forever. They chose to protect it with puzzles that only the worthy could solve.",
            "You've completed all challenges. The library's purpose is now clear: to find minds capable of handling the responsibility of transcendent knowledge. \\"You have proven yourself,\\" the voices say. \\"The knowledge is now yours to carry forward.\\""
        ];
        
        // Puzzles
        const puzzles = [
            {
                type: 'sequence',
                title: 'Sequence Completion',
                description: 'Identify the pattern and select the next symbol in the sequence.',
                setup: () => {
                    const sequenceContainer = document.createElement('div');
                    sequenceContainer.className = 'sequence-puzzle';
                    
                    const sequenceDisplay = document.createElement('div');
                    sequenceDisplay.className = 'sequence-display';
                    
                    const sequence = ['△', '□', '○', '△', '□', '?'];
                    
                    sequence.forEach(symbol => {
                        const item = document.createElement('div');
                        item.className = 'sequence-item';
                        item.textContent = symbol;
                        sequenceDisplay.appendChild(item);
                    });
                    
                    const optionsContainer = document.createElement('div');
                    optionsContainer.className = 'sequence-options';
                    
                    const options = ['△', '□', '○', '♦'];
                    
                    options.forEach(symbol => {
                        const option = document.createElement('div');
                        option.className = 'sequence-option';
                        option.textContent = symbol;
                        option.addEventListener('click', () => {
                            checkSequenceAnswer(symbol);
                        });
                        optionsContainer.appendChild(option);
                    });
                    
                    sequenceContainer.appendChild(sequenceDisplay);
                    sequenceContainer.appendChild(optionsContainer);
                    
                    return sequenceContainer;
                },
                check: (answer) => answer === '○'
            },
            {
                type: 'pattern',
                title: 'Pattern Recognition',
                description: 'Complete the pattern by selecting the correct cell.',
                setup: () => {
                    const gridContainer = document.createElement('div');
                    gridContainer.className = 'pattern-grid';
                    
                    const symbols = [
                        '★', '○', '★',
                        '○', '★', '○',
                        '★', '○', '?'
                    ];
                    
                    symbols.forEach((symbol, index) => {
                        const cell = document.createElement('div');
                        cell.className = 'pattern-cell';
                        cell.textContent = symbol;
                        
                        if (symbol === '?') {
                            cell.textContent = '';
                            cell.id = 'pattern-target';
                        }
                        
                        gridContainer.appendChild(cell);
                    });
                    
                    const optionsContainer = document.createElement('div');
                    optionsContainer.className = 'pattern-options';
                    
                    const options = ['★', '○', '□', '△'];
                    
                    options.forEach(symbol => {
                        const option = document.createElement('div');
                        option.className = 'pattern-option';
                        option.textContent = symbol;
                        option.addEventListener('click', () => {
                            document.getElementById('pattern-target').textContent = symbol;
                            setTimeout(() => {
                                checkPatternAnswer(symbol);
                            }, 500);
                        });
                        optionsContainer.appendChild(option);
                    });
                    
                    const patternContainer = document.createElement('div');
                    patternContainer.appendChild(gridContainer);
                    patternContainer.appendChild(optionsContainer);
                    
                    return patternContainer;
                },
                check: (answer) => answer === '★'
            },
            {
                type: 'memory',
                title: 'Memory Challenge',
                description: 'Find all matching pairs in the grid.',
                setup: () => {
                    const memoryContainer = document.createElement('div');
                    
                    // Create a 4x4 grid for memory matching
                    const grid = document.createElement('div');
                    grid.className = 'memory-grid';
                    
                    // Create symbol pairs
                    const symbols = ['★', '○', '□', '△', '♦', '♥', '♠', '♣'];
                    // Double them to create pairs
                    const pairs = [...symbols, ...symbols];
                    
                    // Shuffle the array
                    for (let i = pairs.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
                    }
                    
                    // Keep track of flipped cards
                    let flippedCards = [];
                    let matchedPairs = 0;
                    
                    pairs.forEach((symbol, index) => {
                        const cell = document.createElement('div');
                        cell.className = 'memory-cell';
                        cell.dataset.symbol = symbol;
                        cell.dataset.index = index;
                        
                        cell.addEventListener('click', function() {
                            // Prevent clicking on already matched or revealed cards
                            if (this.classList.contains('matched') || 
                                this.classList.contains('revealed') ||
                                flippedCards.length >= 2) {
                                return;
                            }
                            
                            // Reveal the card
                            this.classList.add('revealed');
                            this.textContent = symbol;
                            flippedCards.push(this);
                            
                            // Check for match if two cards are flipped
                            if (flippedCards.length === 2) {
                                if (flippedCards[0].dataset.symbol === flippedCards[1].dataset.symbol) {
                                    // Match found
                                    setTimeout(() => {
                                        flippedCards[0].classList.add('matched');
                                        flippedCards[1].classList.add('matched');
                                        flippedCards = [];
                                        matchedPairs++;
                                        
                                        // Check if all pairs are matched
                                        if (matchedPairs === symbols.length) {
                                            // All matches found, puzzle solved
                                            completePuzzle(true);
                                        }
                                    }, 500);
                                } else {
                                    // No match
                                    setTimeout(() => {
                                        flippedCards[0].classList.remove('revealed');
                                        flippedCards[1].classList.remove('revealed');
                                        flippedCards[0].textContent = '';
                                        flippedCards[1].textContent = '';
                                        flippedCards = [];
                                    }, 1000);
                                }
                            }
                        });
                        
                        grid.appendChild(cell);
                    });
                    
                    memoryContainer.appendChild(grid);
                    return memoryContainer;
                },
                check: () => true // The check is handled inside the setup function
            },
            {
                type: 'logic',
                title: 'Logic Puzzle',
                description: 'Determine which symbol is true based on the given statements.',
                setup: () => {
                    const logicContainer = document.createElement('div');
                    
                    const statementsGrid = document.createElement('div');
                    statementsGrid.className = 'logic-grid';
                    
                    const statements = [
                        "If ◆ is true, then ■ is false.",
                        "Either ● is true or ▲ is true, but not both.",
                        "If ▲ is false, then ◆ is true.",
                        "■ and ● cannot both be true."
                    ];
                    
                    statements.forEach(statement => {
                        const div = document.createElement('div');
                        div.className = 'logic-statement';
                        div.textContent = statement;
                        statementsGrid.appendChild(div);
                    });
                    
                    const hint = document.createElement('div');
                    hint.className = 'hint-text';
                    hint.textContent = "One and only one symbol is true. Which one?";
                    
                    const optionsContainer = document.createElement('div');
                    optionsContainer.className = 'logic-options';
                    
                    const options = ['◆', '■', '●', '▲'];
                    
                    options.forEach(symbol => {
                        const button = document.createElement('button');
                        button.className = 'btn';
                        button.textContent = symbol;
                        button.addEventListener('click', () => {
                            checkLogicAnswer(symbol);
                        });
                        optionsContainer.appendChild(button);
                    });
                    
                    logicContainer.appendChild(statementsGrid);
                    logicContainer.appendChild(hint);
                    logicContainer.appendChild(optionsContainer);
                    
                    return logicContainer;
                },
                check: (answer) => answer === '◆'
            },
            {
                type: 'perspective',
                title: 'Perspective Puzzle',
                description: 'Rotate the cube to find the hidden pattern. Click "Check" when all symbols align.',
                setup: () => {
                    const perspectiveContainer = document.createElement('div');
                    perspectiveContainer.className = 'perspective-puzzle';
                    
                    const cube = document.createElement('div');
                    cube.className = 'rotating-cube';
                    
                    const faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
                    const symbols = ['□', '△', '○', '★', '♦', '♥'];
                    
                    faces.forEach((face, index) => {
                        const div = document.createElement('div');
                        div.className = face;
                        div.textContent = symbols[index];
                        cube.appendChild(div);
                    });
                    
                    const controls = document.createElement('div');
                    controls.className = 'cube-controls';
                    
                    const rotations = [
                        { name: '↺ X', transform: 'rotateX(-90deg)' },
                        { name: '↻ X', transform: 'rotateX(90deg)' },
                        { name: '↺ Y', transform: 'rotateY(-90deg)' },
                        { name: '↻ Y', transform: 'rotateY(90deg)' }
                    ];
                    
                    let currentRotation = { x: 0, y: 0 };
                    
                    rotations.forEach(rotation => {
                        const button = document.createElement('button');
                        button.className = 'btn';
                        button.textContent = rotation.name;
                        button.addEventListener('click', () => {
                            if (rotation.name === '↺ X') {
                                currentRotation.x -= 90;
                            } else if (rotation.name === '↻ X') {
                                currentRotation.x += 90;
                            } else if (rotation.name === '↺ Y') {
                                currentRotation.y -= 90;
                            } else if (rotation.name === '↻ Y') {
                                currentRotation.y += 90;
                            }
                            
                            cube.style.transform = "rotateX(" + currentRotation.x + "deg) rotateY(" + currentRotation.y + "deg)";
                        });
                        controls.appendChild(button);
                    });
                    
                    const checkButton = document.createElement('button');
                    checkButton.className = 'btn btn-primary';
                    checkButton.textContent = 'Check';
                    checkButton.addEventListener('click', () => {
                        // The solution is to align the cube so the star is visible
                        const isCorrect = 
                            (currentRotation.x % 360 === 0 && currentRotation.y % 360 === 0) || // front (□)
                            (currentRotation.x % 360 === 0 && Math.abs(currentRotation.y % 360) === 180) || // back (△)
                            (currentRotation.x % 360 === 0 && Math.abs(currentRotation.y % 360) === 90) || // right (○)
                            (currentRotation.x % 360 === 0 && Math.abs(currentRotation.y % 360) === 270) || // left (★)
                            (Math.abs(currentRotation.x % 360) === 90 && currentRotation.y % 360 === 0) || // top (♦)
                            (Math.abs(currentRotation.x % 360) === 270 && currentRotation.y % 360 === 0); // bottom (♥)
                        
                        completePuzzle(isCorrect);
                    });
                    controls.appendChild(checkButton);
                    
                    perspectiveContainer.appendChild(cube);
                    perspectiveContainer.appendChild(controls);
                    
                    return perspectiveContainer;
                },
                check: () => true // The check is handled inside the setup function
            }
        ];
        
        // Initialize game
        startButton.addEventListener('click', startGame);
        
        function startGame() {
            startButton.style.display = 'none';
            gameState.level = 1;
            gameState.score = 0;
            gameState.puzzlesSolved = 0;
            updateGameUI();
            loadPuzzle(0);
        }
        
        function loadPuzzle(index) {
            if (index >= puzzles.length) {
                // Game completed
                showCompletion();
                return;
            }
            
            const puzzle = puzzles[index];
            gameState.currentPuzzle = puzzle;
            
            // Clear puzzle container
            puzzleContainer.innerHTML = '';
            
            // Add puzzle title and description
            const titleElement = document.createElement('div');
            titleElement.className = 'puzzle-title';
            titleElement.textContent = puzzle.title;
            puzzleContainer.appendChild(titleElement);
            
            const descriptionElement = document.createElement('div');
            descriptionElement.className = 'puzzle-description';
            descriptionElement.textContent = puzzle.description;
            puzzleContainer.appendChild(descriptionElement);
            
            // Setup puzzle content
            const puzzleContent = puzzle.setup();
            puzzleContainer.appendChild(puzzleContent);
            
            // Update level display
            gameState.level = index + 1;
            updateGameUI();
        }
        
        function checkSequenceAnswer(answer) {
            const isCorrect = gameState.currentPuzzle.check(answer);
            completePuzzle(isCorrect);
        }
        
        function checkPatternAnswer(answer) {
            const isCorrect = gameState.currentPuzzle.check(answer);
            completePuzzle(isCorrect);
        }
        
        function checkLogicAnswer(answer) {
            const isCorrect = gameState.currentPuzzle.check(answer);
            completePuzzle(isCorrect);
        }
        
        function completePuzzle(success) {
            feedbackElement.style.display = 'block';
            if (success) {
                feedbackElement.textContent = 'Correct! The path forward reveals itself...';
                feedbackElement.className = 'feedback-message feedback-success';
                gameState.score += 100;
                gameState.puzzlesSolved++;
                updateNarrative();
            } else {
                feedbackElement.textContent = 'Incorrect. The walls seem to shift around you...';
                feedbackElement.className = 'feedback-message feedback-error';
                gameState.score = Math.max(0, gameState.score - 50);
            }
            
            updateGameUI();
            
            if (success) {
                setTimeout(() => {
                    if (gameState.puzzlesSolved < puzzles.length) {
                        loadPuzzle(gameState.puzzlesSolved);
                    } else {
                        showCompletion();
                    }
                }, 2000);
            }
        }
        
        function updateGameUI() {
            levelElement.textContent = gameState.level;
            scoreElement.textContent = gameState.score;
        }
        
        function updateNarrative() {
            if (gameState.narrativeProgress < narrativeTexts.length - 1) {
                gameState.narrativeProgress = Math.min(
                    gameState.narrativeProgress + 1,
                    narrativeTexts.length - 1
                );
                narrativeElement.textContent = narrativeTexts[gameState.narrativeProgress];
            }
        }
        
        function showCompletion() {
            puzzleContainer.innerHTML = '';
            const completionDiv = document.createElement('div');
            completionDiv.className = 'completion-container';
            
            const completionText = document.createElement('div');
            completionText.className = 'puzzle-title';
            completionText.textContent = 'Library of Wisdom Unlocked';
            
            const finalScore = document.createElement('div');
            finalScore.className = 'score-indicator';
            finalScore.textContent = "Final Score: " + gameState.score;
            
            const restartButton = document.createElement('button');
            restartButton.className = 'btn btn-primary';
            restartButton.textContent = 'Begin Anew';
            restartButton.addEventListener('click', () => {
                startGame();
            });
            
            completionDiv.appendChild(completionText);
            completionDiv.appendChild(finalScore);
            completionDiv.appendChild(restartButton);
            puzzleContainer.appendChild(completionDiv);
        }
    </script>
  `;

  return (
    <div>
      <h2>Iframe com HTML Embutido (usando srcDoc)</h2>
      <iframe
        srcDoc={htmlEmbutido} // Usamos srcDoc e passamos a string HTML
        width="1300"
        height="800"
        title="Iframe com HTML Inline"
        style={{ border: '1px solid #eee' }} // Estilo para visualização do iframe
      ></iframe>
    </div>
  );
}

export default ComponenteComIframeHTMLInline;
