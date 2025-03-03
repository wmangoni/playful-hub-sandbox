import { useState, useEffect } from 'react';
import './App.css'; // Create this file with the provided CSS

const puzzles = [/* Keep the puzzles array exactly as in the original */];

const narrativeTexts = [/* Keep the narrativeTexts array exactly as in the original */];

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
