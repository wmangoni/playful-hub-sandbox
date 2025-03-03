import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

// Define types for game state and puzzles
interface GameState {
  level: number;
  score: number;
  currentPuzzle: Puzzle | null;
  puzzlesSolved: number;
  narrativeProgress: number;
}

interface Puzzle {
  type: string;
  title: string;
  description: string;
  setup: () => HTMLDivElement;
  check: (answer?: string) => boolean;
}

const PuzzlePage = () => {
  const [gameActive, setGameActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  
  const startGame = () => {
    setGameActive(true);
    setShowWelcome(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#2d2b42] text-[#e8e6f0] overflow-x-hidden">
      {showWelcome && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-bold mb-4 text-[#e8e6f0]">Mind Labyrinth</h1>
            <p className="text-muted-foreground mb-8">
              A challenging puzzle adventure that will test your cognitive abilities.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button 
                onClick={startGame}
                className="inline-flex items-center px-4 py-2 rounded-md bg-[#8a7fb0] text-white hover:bg-[#5a4a7f] transition-colors"
              >
                Begin Journey
              </button>
              <Link 
                to="/" 
                className="inline-flex items-center px-4 py-2 rounded-md border border-[#8a7fb0] text-[#e8e6f0] hover:bg-[#5a4a7f] transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 19l-7-7 7-7" 
                  />
                </svg>
                Return to Game Hub
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {gameActive && <MindLabyrinth />}
    </div>
  );
};

const MindLabyrinth = () => {
  // Game state using React state
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    currentPuzzle: null,
    puzzlesSolved: 0,
    narrativeProgress: 0
  });
  
  // Refs for DOM elements
  const puzzleContainerRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  
  // Narrative text pieces
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
  
  // Puzzles definition
  const puzzles = useRef<Puzzle[]>([
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
            const target = document.getElementById('pattern-target');
            if (target) {
              target.textContent = symbol;
              setTimeout(() => {
                checkPatternAnswer(symbol);
              }, 500);
            }
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
        let flippedCards: HTMLDivElement[] = [];
        let matchedPairs = 0;
        
        pairs.forEach((symbol, index) => {
          const cell = document.createElement('div');
          cell.className = 'memory-cell';
          cell.dataset.symbol = symbol;
          cell.dataset.index = index.toString();
          
          cell.addEventListener('click', function(this: HTMLDivElement) {
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
        
        // Store rotation state in the dataset
        cube.dataset.rotationX = '0';
        cube.dataset.rotationY = '0';
        
        rotations.forEach(rotation => {
          const button = document.createElement('button');
          button.className = 'btn';
          button.textContent = rotation.name;
          button.addEventListener('click', () => {
            let rotX = parseInt(cube.dataset.rotationX || '0', 10);
            let rotY = parseInt(cube.dataset.rotationY || '0', 10);
            
            if (rotation.name === '↺ X') {
              rotX -= 90;
            } else if (rotation.name === '↻ X') {
              rotX += 90;
            } else if (rotation.name === '↺ Y') {
              rotY -= 90;
            } else if (rotation.name === '↻ Y') {
              rotY += 90;
            }
            
            cube.dataset.rotationX = rotX.toString();
            cube.dataset.rotationY = rotY.toString();
            cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
          });
          controls.appendChild(button);
        });
        
        const checkButton = document.createElement('button');
        checkButton.className = 'btn btn-primary';
        checkButton.textContent = 'Check';
        checkButton.addEventListener('click', () => {
          // The solution is to align the cube
          const rotX = parseInt(cube.dataset.rotationX || '0', 10);
          const rotY = parseInt(cube.dataset.rotationY || '0', 10);
          
          const isCorrect = 
            (rotX % 360 === 0 && rotY % 360 === 0) || // front (□)
            (rotX % 360 === 0 && Math.abs(rotY % 360) === 180) || // back (△)
            (rotX % 360 === 0 && Math.abs(rotY % 360) === 90) || // right (○)
            (rotX % 360 === 0 && Math.abs(rotY % 360) === 270) || // left (★)
            (Math.abs(rotX % 360) === 90 && rotY % 360 === 0) || // top (♦)
            (Math.abs(rotX % 360) === 270 && rotY % 360 === 0); // bottom (♥)
          
          completePuzzle(isCorrect);
        });
        controls.appendChild(checkButton);
        
        perspectiveContainer.appendChild(cube);
        perspectiveContainer.appendChild(controls);
        
        return perspectiveContainer;
      },
      check: () => true // The check is handled inside the setup function
    }
  ]).current;
  
  // Function to check sequence answer
  const checkSequenceAnswer = useCallback((answer: string) => {
    if (gameState.currentPuzzle) {
      const isCorrect = gameState.currentPuzzle.check(answer);
      completePuzzle(isCorrect);
    }
  }, [gameState.currentPuzzle]);
  
  // Function to check pattern answer
  const checkPatternAnswer = useCallback((answer: string) => {
    if (gameState.currentPuzzle) {
      const isCorrect = gameState.currentPuzzle.check(answer);
      completePuzzle(isCorrect);
    }
  }, [gameState.currentPuzzle]);
  
  // Function to check logic answer
  const checkLogicAnswer = useCallback((answer: string) => {
    if (gameState.currentPuzzle) {
      const isCorrect = gameState.currentPuzzle.check(answer);
      completePuzzle(isCorrect);
    }
  }, [gameState.currentPuzzle]);
  
  // Function to handle puzzle completion
  const completePuzzle = useCallback((success: boolean) => {
    const feedbackElement = feedbackRef.current;
    if (feedbackElement) {
      feedbackElement.style.display = 'block';
      if (success) {
        feedbackElement.textContent = 'Correct! The path forward reveals itself...';
        feedbackElement.className = 'feedback-message feedback-success';
        setGameState(prev => ({
          ...prev,
          score: prev.score + 100,
          puzzlesSolved: prev.puzzlesSolved + 1,
          narrativeProgress: Math.min(prev.narrativeProgress + 1, narrativeTexts.length - 1)
        }));
      } else {
        feedbackElement.textContent = 'Incorrect. The walls seem to shift around you...';
        feedbackElement.className = 'feedback-message feedback-error';
        setGameState(prev => ({
          ...prev,
          score: Math.max(0, prev.score - 50)
        }));
      }
      
      if (success) {
        setTimeout(() => {
          setGameState(prev => {
            if (prev.puzzlesSolved < puzzles.length) {
              loadPuzzle(prev.puzzlesSolved);
              return prev;
            } else {
              showCompletion();
              return prev;
            }
          });
        }, 2000);
      }
    }
  }, [narrativeTexts.length, puzzles.length]);
  
  // Function to load a puzzle
  const loadPuzzle = useCallback((index: number) => {
    if (index >= puzzles.length) {
      // Game completed
      showCompletion();
      return;
    }
    
    const puzzle = puzzles[index];
    setGameState(prev => ({
      ...prev,
      currentPuzzle: puzzle,
      level: index + 1
    }));
    
    // Clear puzzle container and append new content
    const container = puzzleContainerRef.current;
    if (container) {
      container.innerHTML = '';
      
      // Add puzzle title and description
      const titleElement = document.createElement('div');
      titleElement.className = 'puzzle-title';
      titleElement.textContent = puzzle.title;
      container.appendChild(titleElement);
      
      const descriptionElement = document.createElement('div');
      descriptionElement.className = 'puzzle-description';
      descriptionElement.textContent = puzzle.description;
      container.appendChild(descriptionElement);
      
      // Setup puzzle content
      const puzzleContent = puzzle.setup();
      container.appendChild(puzzleContent);
    }
  }, [puzzles]);
  
  // Function to show game completion
  const showCompletion = useCallback(() => {
    const container = puzzleContainerRef.current;
    if (container) {
      container.innerHTML = '';
      const completionDiv = document.createElement('div');
      completionDiv.className = 'completion-container';
      
      const completionText = document.createElement('div');
      completionText.className = 'puzzle-title';
      completionText.textContent = 'Library of Wisdom Unlocked';
      
      const finalScore = document.createElement('div');
      finalScore.className = 'score-indicator';
      finalScore.textContent = `Final Score: ${gameState.score}`;
      
      const restartButton = document.createElement('button');
      restartButton.className = 'btn btn-primary';
      restartButton.textContent = 'Begin Anew';
      restartButton.addEventListener('click', () => {
        startGame();
      });
      
      completionDiv.appendChild(completionText);
      completionDiv.appendChild(finalScore);
      completionDiv.appendChild(restartButton);
      container.appendChild(completionDiv);
    }
  }, [gameState.score]);
  
  // Function to start the game
  const startGame = useCallback(() => {
    // Reset game state
    setGameState({
      level: 1,
      score: 0,
      currentPuzzle: null,
      puzzlesSolved: 0,
      narrativeProgress: 0
    });
    
    // Load first puzzle
    loadPuzzle(0);
  }, [loadPuzzle]);
  
  // Initialize game on component mount
  useEffect(() => {
    startGame();
    
    // Expose functions to window for DOM interactions
    window.checkSequenceAnswer = checkSequenceAnswer;
    window.checkPatternAnswer = checkPatternAnswer;
    window.checkLogicAnswer = checkLogicAnswer;
    window.completePuzzle = completePuzzle;
    
    // Cleanup
    return () => {
      // @ts-ignore
      window.checkSequenceAnswer = undefined;
      // @ts-ignore
      window.checkPatternAnswer = undefined;
      // @ts-ignore
      window.checkLogicAnswer = undefined;
      // @ts-ignore
      window.completePuzzle = undefined;
    };
  }, [startGame, checkSequenceAnswer, checkPatternAnswer, checkLogicAnswer, completePuzzle]);
  
  return (
    <>
      <style>
        {`
          :root {
            --primary-color: #2d2b42;
            --secondary-color: #5a4a7f;
            --accent-color: #8a7fb0;
            --light-color: #e8e6f0;
            --success-color: #4caf50;
            --error-color: #f44336;
          }
          
          .game-container {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 2rem;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
            width: 100%;
            max-width: 800px;
            position: relative;
            overflow: hidden;
          }
          
          .game-ui {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--accent-color);
          }
          
          .level-indicator, .score-indicator {
            font-size: 1.2rem;
            background-color: rgba(0, 0, 0, 0.3);
            padding: 0.5rem 1rem;
            border-radius: 5px;
          }
          
          .puzzle-container {
            margin: 1rem 0;
            min-height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          
          .puzzle-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--accent-color);
          }
          
          .puzzle-description {
            margin-bottom: 2rem;
            text-align: center;
            line-height: 1.6;
          }
          
          .btn {
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
          
          .btn:hover {
            background-color: var(--accent-color);
            transform: translateY(-2px);
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
          }
          
          .btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          }
          
          .btn-primary {
            background-color: var(--accent-color);
          }
          
          .btn-success {
            background-color: var(--success-color);
          }
          
          .control-panel {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 1rem;
          }
          
          .pattern-grid {
            display: grid;
            grid-template-columns: repeat(3, 80px);
            grid-template-rows: repeat(3, 80px);
            gap: 10px;
          }
          
          .pattern-cell {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .pattern-cell:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
          
          .pattern-cell.selected {
            background-color: var(--accent-color);
            transform: scale(1.05);
            box-shadow: 0 0 10px var(--accent-color);
          }
          
          .pattern-options {
            display: flex;
            margin-top: 20px;
            gap: 15px;
          }
          
          .pattern-option {
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
          
          .pattern-option:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
          }
          
          .memory-grid {
            display: grid;
            grid-template-columns: repeat(4, 80px);
            grid-template-rows: repeat(4, 80px);
            gap: 10px;
          }
          
          .memory-cell {
            background-color: var(--secondary-color);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .memory-cell:hover {
            background-color: var(--accent-color);
          }
          
          .memory-cell.revealed {
            background-color: var(--light-color);
            color: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            font-weight: bold;
          }
          
          .memory-cell.matched {
            background-color: var(--success-color);
            cursor: default;
          }
          
          .logic-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-gap: 10px;
            margin-bottom: 20px;
          }
          
          .logic-statement {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 5px;
            text-align: center;
          }
          
          .logic-options {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
          }
          
          .logic-symbol {
            width: 30px;
            height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            margin: 0 5px;
            background-color: var(--accent-color);
          }
          
          .completion-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .feedback-message {
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 5px;
            text-align: center;
            transition: all 0.3s ease;
          }
          
          .feedback-success {
            background-color: rgba(76, 175, 80, 0.3);
            color: #b9f6ca;
          }
          
          .feedback-error {
            background-color: rgba(244, 67, 54, 0.3);
            color: #ffcdd2;
          }
          
          .hint-text {
            margin-top: 1rem;
            font-style: italic;
            color: var(--accent-color);
            text-align: center;
          }
          
          .narrative-text {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 1.5rem;
            border-radius: 5px;
            margin: 1rem 0;
            border-left: 4px solid var(--accent-color);
            font-style: italic;
            line-height: 1.6;
          }
          
          .sequence-puzzle {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .sequence-display {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .sequence-item {
            width: 60px;
            height: 60px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
          }
          
          .sequence-options {
            display: flex;
            gap: 15px;
          }
          
          .sequence-option {
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
          
          .sequence-option:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
          }
          
          .perspective-puzzle {
            perspective: 800px;
          }
          
          .rotating-cube {
            width: 200px;
            height: 200px;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 1s ease;
            margin: 50px auto;
          }
          
          .rotating-cube div {
            position: absolute;
            width: 200px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            opacity: 0.8;
          }
          
          .rotating-cube .front {
            transform: translateZ(100px);
            background-color: rgba(76, 175, 80, 0.5);
          }
          
          .rotating-cube .back {
            transform: rotateY(180deg) translateZ(100px);
            background-color: rgba(244, 67, 54, 0.5);
          }
          
          .rotating-cube .left {
            transform: rotateY(-90deg) translateZ(100px);
            background-color: rgba(33, 150, 243, 0.5);
          }
          
          .rotating-cube .right {
            transform: rotateY(90deg) translateZ(100px);
            background-color: rgba(255, 235, 59, 0.5);
          }
          
          .rotating-cube .top {
            transform: rotateX(90deg) translateZ(100px);
            background-color: rgba(156, 39, 176, 0.5);
          }
          
          .rotating-cube .bottom {
            transform: rotateX(-90deg) translateZ(100px);
            background-color: rgba(255, 152, 0, 0.5);
          }
          
          .cube-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
          }
          
          @media (max-width: 600px) {
            .pattern-grid {
              grid-template-columns: repeat(3, 60px);
              grid-template-rows: repeat(3, 60px);
            }
            
            .memory-grid {
              grid-template-columns: repeat(4, 60px);
              grid-template-rows: repeat(4, 60px);
            }
            
            .pattern-option, .sequence-item {
              width: 50px;
              height: 50px;
            }
            
            .sequence-option {
              width: 40px;
              height: 40px;
            }
          }
        `}
      </style>
      
      <header className="bg-black/30 p-4 text-center shadow-md">
        <h1 className="m-0 text-4xl text-[#e8e6f0] shadow-text">Mind Labyrinth</h1>
      </header>
      
      <main className="flex-1 flex flex-col items-center p-8">
        <div className="game-container">
          <div className="game-ui">
            <div className="level-indicator">Level: <span id="level">{gameState.level}</span></div>
            <div className="score-indicator">Score: <span id="score">{gameState.score}</span></div>
          </div>
          
          <div className="narrative-text" id="narrative">
            {narrativeTexts[gameState.narrativeProgress]}
          </div>
          
          <div className="puzzle-container" id="puzzle-container" ref={puzzleContainerRef}>
            {/* Puzzle content is dynamically inserted here */}
          </div>
          
          <div id="feedback" className="feedback-message" style={{ display: 'none' }} ref={feedbackRef}></div>
          
          <div className="control-panel">
            <Link 
              to="/" 
              className="inline-flex items-center px-4 py-2 rounded-md border border-[#8a7fb0] text-[#e8e6f0] hover:bg-[#5a4a7f] transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 19l-7-7 7-7" 
                />
              </svg>
              Return to Game Hub
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="text-center p-4 bg-black/30 text-sm">
        Mind Labyrinth &copy; 2025 - A Puzzle Adventure
      </footer>
    </>
  );
};

// Define window type extensions
declare global {
  interface Window {
    checkSequenceAnswer?: (answer: string) => void;
    checkPatternAnswer?: (answer: string) => void;
    checkLogicAnswer?: (answer: string) => void;
    completePuzzle?: (success: boolean) => void;
  }
}

export default PuzzlePage;
