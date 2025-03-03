import { useState, useEffect } from 'react';
import './App.css'; // Create this file with the provided CSS

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
                            
                            cube.style.transform = `rotateX(${currentRotation.x}deg) rotateY(${currentRotation.y}deg)`;
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

const narrativeTexts = [
            "You find yourself in a mysterious ancient library. The air is thick with dust and mystery. Before you stands a series of puzzles, each protecting a fragment of forgotten knowledge. \"To proceed,\" whispers an unseen voice, \"you must prove your mind worthy...\"",
            "As you solve the first puzzle, a soft glow illuminates a nearby scroll. It depicts an ancient civilization that discovered patterns within the very fabric of reality.",
            "The second challenge yields another scroll fragment. It speaks of a society that learned to perceive truths beyond the obvious, hidden in plain sight.",
            "With each puzzle solved, you begin to understand that this library was created to preserve knowledge too powerful to be freely shared. The creators feared its misuse.",
            "You've uncovered half of the library's secrets now. The scrolls reveal that the knowledge hidden here could reshape perception itself, allowing minds to transcend ordinary limits.",
            "The voices grow clearer as you progress. \"Few have made it this far,\" they whisper. \"Continue, and you may join those who see beyond the veil.\"",
            "Almost there now. The final scrolls reveal why the library was sealed: its creators discovered a truth so fundamental that it changed them forever. They chose to protect it with puzzles that only the worthy could solve.",
            "You've completed all challenges. The library's purpose is now clear: to find minds capable of handling the responsibility of transcendent knowledge. \"You have proven yourself,\" the voices say. \"The knowledge is now yours to carry forward.\""
        ];

function App() {
  const [gameState, setGameState] = useState({
    level: 1,
    score: 0,
    currentPuzzleIndex: 0,
    puzzlesSolved: 0,
    narrativeProgress: 0,
    isGameStarted: false,
    feedback: { message: '', type: '' },
    isGameCompleted: false
  });

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      isGameStarted: true,
      level: 1,
      score: 0,
      puzzlesSolved: 0,
      narrativeProgress: 0,
      currentPuzzleIndex: 0,
      isGameCompleted: false
    }));
  };

  const completePuzzle = (success) => {
    setGameState(prev => {
      const newState = { ...prev };
      if (success) {
        newState.score += 100;
        newState.puzzlesSolved++;
        newState.feedback = {
          message: 'Correct! The path forward reveals itself...',
          type: 'success'
        };
        
        if (newState.puzzlesSolved >= puzzles.length) {
          newState.isGameCompleted = true;
        } else {
          newState.currentPuzzleIndex = newState.puzzlesSolved;
          newState.level = newState.puzzlesSolved + 1;
          newState.narrativeProgress = Math.min(
            newState.narrativeProgress + 1,
            narrativeTexts.length - 1
          );
        }
      } else {
        newState.score = Math.max(0, prev.score - 50);
        newState.feedback = {
          message: 'Incorrect. The walls seem to shift around you...',
          type: 'error'
        };
      }
      return newState;
    });
  };

  return (
    <div className="App">
      <header>
        <h1>Mind Labyrinth</h1>
      </header>
      
      <main>
        <div className="game-container">
          <div className="game-ui">
            <div className="level-indicator">Level: <span>{gameState.level}</span></div>
            <div className="score-indicator">Score: <span>{gameState.score}</span></div>
          </div>
          
          <div className="narrative-text">
            {narrativeTexts[gameState.narrativeProgress]}
          </div>
          
          {!gameState.isGameCompleted && gameState.isGameStarted && (
            <PuzzleDisplay 
              puzzle={puzzles[gameState.currentPuzzleIndex]} 
              completePuzzle={completePuzzle}
            />
          )}
          
          {gameState.feedback.message && (
            <div className={`feedback-message feedback-${gameState.feedback.type}`}>
              {gameState.feedback.message}
            </div>
          )}
          
          <div className="control-panel">
            {!gameState.isGameStarted && (
              <button className="btn btn-primary" onClick={startGame}>
                Begin Journey
              </button>
            )}
            {gameState.isGameCompleted && (
              <CompletionScreen 
                score={gameState.score} 
                restartGame={startGame} 
              />
            )}
          </div>
        </div>
      </main>
      
      <footer>
        Mind Labyrinth &copy; 2025 - A Puzzle Adventure
      </footer>
    </div>
  );
}

const PuzzleDisplay = ({ puzzle, completePuzzle }) => {
  switch(puzzle.type) {
    case 'sequence':
      return <SequencePuzzle puzzle={puzzle} completePuzzle={completePuzzle} />;
    case 'pattern':
      return <PatternPuzzle puzzle={puzzle} completePuzzle={completePuzzle} />;
    case 'memory':
      return <MemoryPuzzle puzzle={puzzle} completePuzzle={completePuzzle} />;
    case 'logic':
      return <LogicPuzzle puzzle={puzzle} completePuzzle={completePuzzle} />;
    case 'perspective':
      return <PerspectivePuzzle puzzle={puzzle} completePuzzle={completePuzzle} />;
    default:
      return null;
  }
};

// Create separate components for each puzzle type (SequencePuzzle, PatternPuzzle, etc.)
// Implement them using React state and hooks following the original logic

const CompletionScreen = ({ score, restartGame }) => (
  <div className="completion-container">
    <div className="puzzle-title">Library of Wisdom Unlocked</div>
    <div className="score-indicator">Final Score: {score}</div>
    <button className="btn btn-primary" onClick={restartGame}>
      Begin Anew
    </button>
  </div>
);

export default App;
