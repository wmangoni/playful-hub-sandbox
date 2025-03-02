import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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

const ArcadePage = () => {
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
            <h1 className="text-4xl font-bold mb-4 text-[#e8e6f0]">Arcade Games</h1>
            <p className="text-muted-foreground mb-8">
              Classic arcade games reimagined for modern times.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button 
                onClick={startGame}
                className="inline-flex items-center px-4 py-2 rounded-md bg-[#8a7fb0] text-white hover:bg-[#5a4a7f] transition-colors"
              >
                Start Playing
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
      
      {gameActive && <ArcadeGames />}
    </div>
  );
};

const ArcadeGames = () => {
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState({
    score: 0,
    level: 1,
    lives: 3,
    gameOver: false
  });

  return (
    <>
      <style>
        {`
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
          
          .game-canvas {
            background: #000;
            border-radius: 8px;
            margin: 20px auto;
            display: block;
          }
          
          .game-controls {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
          }
          
          .control-btn {
            background: rgba(138, 127, 176, 0.2);
            border: 2px solid #8a7fb0;
            color: #e8e6f0;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .control-btn:hover {
            background: rgba(138, 127, 176, 0.4);
          }
          
          .score-display {
            font-size: 24px;
            color: #e8e6f0;
            text-align: center;
            margin: 20px 0;
          }
          
          .lives-display {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 10px 0;
          }
          
          .life-icon {
            width: 20px;
            height: 20px;
            background: #e8e6f0;
            border-radius: 50%;
          }
          
          .game-over {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
          }
        `}
      </style>
      
      <header className="bg-black/30 p-4 text-center shadow-md">
        <h1 className="m-0 text-4xl text-[#e8e6f0] shadow-text">Arcade Games</h1>
      </header>
      
      <main className="flex-1 flex flex-col items-center p-8">
        <div className="game-container">
          <div className="game-ui">
            <div className="score-display">Score: {gameState.score}</div>
            <div className="lives-display">
              {[...Array(gameState.lives)].map((_, i) => (
                <div key={i} className="life-icon" />
              ))}
            </div>
          </div>
          
          <canvas className="game-canvas" width="640" height="480" />
          
          <div className="game-controls">
            <button className="control-btn">←</button>
            <button className="control-btn">→</button>
            <button className="control-btn">Space</button>
          </div>
          
          {gameState.gameOver && (
            <div className="game-over">
              <h2>Game Over</h2>
              <p>Final Score: {gameState.score}</p>
              <button 
                onClick={() => setGameState({
                  score: 0,
                  level: 1,
                  lives: 3,
                  gameOver: false
                })}
                className="control-btn"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </main>
      
      <footer className="text-center p-4 bg-black/30 text-sm">
        Arcade Games &copy; 2025 - Classic Gaming Reimagined
      </footer>
    </>
  );
};

export default ArcadePage;
