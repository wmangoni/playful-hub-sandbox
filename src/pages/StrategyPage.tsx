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

const StrategyPage = () => {
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
            <h1 className="text-4xl font-bold mb-4 text-[#e8e6f0]">Strategy Game</h1>
            <p className="text-muted-foreground mb-8">
              Test your strategic thinking in this challenging game.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button 
                onClick={startGame}
                className="inline-flex items-center px-4 py-2 rounded-md bg-[#8a7fb0] text-white hover:bg-[#5a4a7f] transition-colors"
              >
                Begin Game
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
      
      {gameActive && <StrategyGame />}
    </div>
  );
};

const StrategyGame = () => {
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState({
    score: 0,
    level: 1,
    resources: {
      gold: 100,
      wood: 50,
      stone: 30
    },
    buildings: []
  });

  return (
    <>
      <style>
        {`
          .game-container {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .resources-panel {
            display: flex;
            gap: 2rem;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            margin-bottom: 2rem;
          }
          
          .resource-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .resource-icon {
            width: 24px;
            height: 24px;
          }
          
          .building-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            padding: 1rem;
          }
          
          .building-card {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .building-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>
      
      <div className="game-container">
        <div className="resources-panel">
          <div className="resource-item">
            <span className="resource-icon">💰</span>
            <span>{gameState.resources.gold}</span>
          </div>
          <div className="resource-item">
            <span className="resource-icon">🪵</span>
            <span>{gameState.resources.wood}</span>
          </div>
          <div className="resource-item">
            <span className="resource-icon">🪨</span>
            <span>{gameState.resources.stone}</span>
          </div>
        </div>
        
        <div className="building-grid">
          {/* Building cards will be rendered here */}
        </div>
      </div>
    </>
  );
};

export default StrategyPage;
