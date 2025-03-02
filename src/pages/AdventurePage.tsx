import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

interface Scene {
  id: string;
  title: string;
  description: string;
  image?: string;
  choices?: Choice[];
  onEnter?: () => void;
}

interface Choice {
  text: string;
  nextScene: string;
  condition?: (gameState: GameState) => boolean;
}

interface GameState {
  currentSceneId: string;
  inventory: string[];
  health: number;
  hasKey: boolean;
  hasMap: boolean;
  hasSword: boolean;
  hasVisitedLibrary: boolean;
  hasFoundClue: boolean;
  dragonDefeated: boolean;
}

const AdventurePage = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    currentSceneId: 'start',
    inventory: [],
    health: 100,
    hasKey: false,
    hasMap: false,
    hasSword: false,
    hasVisitedLibrary: false,
    hasFoundClue: false,
    dragonDefeated: false
  });

  const scenes: { [key: string]: Scene } = {
    start: {
      id: 'start',
      title: 'The Beginning',
      description: 'You stand at the entrance of an ancient castle. Its weathered stones tell tales of forgotten ages. The heavy wooden door before you is slightly ajar.',
      choices: [
        { text: 'Enter the castle', nextScene: 'mainHall' },
        { text: 'Examine the surroundings', nextScene: 'castleExterior' }
      ]
    },
    castleExterior: {
      id: 'castleExterior',
      title: 'Castle Grounds',
      description: 'The castle looms above you, its spires piercing the cloudy sky. You notice a worn path leading to a garden, and what appears to be an old map partially buried in the soil.',
      choices: [
        { text: 'Pick up the map', nextScene: 'getMap' },
        { text: 'Enter the castle', nextScene: 'mainHall' },
        { text: 'Explore the garden', nextScene: 'garden' }
      ]
    },
    getMap: {
      id: 'getMap',
      title: 'Found Map',
      description: 'You retrieve the old map from the ground. It shows the castle\'s layout, including some secret passages!',
      onEnter: () => {
        setGameState(prev => ({
          ...prev,
          hasMap: true,
          inventory: [...prev.inventory, 'Ancient Map']
        }));
      },
      choices: [
        { text: 'Enter the castle', nextScene: 'mainHall' },
        { text: 'Explore the garden', nextScene: 'garden' }
      ]
    },
    garden: {
      id: 'garden',
      title: 'Overgrown Garden',
      description: 'The castle garden is wild and overgrown. Among the thorny vines, you spot a glint of metal - an old key!',
      choices: [
        { text: 'Take the key', nextScene: 'getKey' },
        { text: 'Return to castle entrance', nextScene: 'start' }
      ]
    },
    getKey: {
      id: 'getKey',
      title: 'Found Key',
      description: 'You carefully retrieve the key from the thorny vines. It looks important!',
      onEnter: () => {
        setGameState(prev => ({
          ...prev,
          hasKey: true,
          inventory: [...prev.inventory, 'Mysterious Key']
        }));
      },
      choices: [
        { text: 'Enter the castle', nextScene: 'mainHall' },
        { text: 'Explore more of the garden', nextScene: 'garden' }
      ]
    },
    mainHall: {
      id: 'mainHall',
      title: 'Grand Hall',
      description: 'You stand in a vast hall with a sweeping staircase. Dusty portraits line the walls. There are doors leading to various rooms, including a locked door to what appears to be a library.',
      choices: [
        { 
          text: 'Try the library door',
          nextScene: 'library',
          condition: (state) => state.hasKey
        },
        { text: 'Climb the stairs', nextScene: 'upperHall' },
        { text: 'Examine the portraits', nextScene: 'portraits' },
        { text: 'Return outside', nextScene: 'start' }
      ]
    },
    portraits: {
      id: 'portraits',
      title: 'Ancient Portraits',
      description: 'The portraits show generations of noble families. One portrait catches your eye - a knight holding a magnificent sword, standing before a dragon.',
      choices: [
        { text: 'Return to the hall', nextScene: 'mainHall' },
        { text: 'Look closer at the knight portrait', nextScene: 'knightPortrait' }
      ]
    },
    knightPortrait: {
      id: 'knightPortrait',
      title: 'Knight\'s Portrait',
      description: 'Behind the portrait, you find a hidden compartment containing an ancient sword!',
      onEnter: () => {
        setGameState(prev => ({
          ...prev,
          hasSword: true,
          inventory: [...prev.inventory, 'Ancient Sword']
        }));
      },
      choices: [
        { text: 'Return to the hall', nextScene: 'mainHall' }
      ]
    },
    library: {
      id: 'library',
      title: 'Ancient Library',
      description: 'Rows of dusty books fill this circular room. A strange symbol glows on one of the shelves.',
      onEnter: () => {
        setGameState(prev => ({
          ...prev,
          hasVisitedLibrary: true
        }));
      },
      choices: [
        { text: 'Examine the glowing symbol', nextScene: 'findClue' },
        { text: 'Return to the hall', nextScene: 'mainHall' }
      ]
    },
    findClue: {
      id: 'findClue',
      title: 'Ancient Secret',
      description: 'You find an ancient text revealing the dragon\'s weakness - its scales are vulnerable to enchanted weapons!',
      onEnter: () => {
        setGameState(prev => ({
          ...prev,
          hasFoundClue: true
        }));
      },
      choices: [
        { text: 'Return to the library', nextScene: 'library' }
      ]
    },
    upperHall: {
      id: 'upperHall',
      title: 'Upper Hall',
      description: 'The upper hall is dark and foreboding. You hear a distant roar from the tower.',
      choices: [
        { 
          text: 'Enter the tower',
          nextScene: 'dragonConfrontation',
          condition: (state) => state.hasSword
        },
        { text: 'Return downstairs', nextScene: 'mainHall' }
      ]
    },
    dragonConfrontation: {
      id: 'dragonConfrontation',
      title: 'The Dragon\'s Lair',
      description: 'You face an enormous dragon! Its scales gleam in the torchlight.',
      choices: [
        { 
          text: 'Attack with the ancient sword',
          nextScene: 'victory',
          condition: (state) => state.hasFoundClue && state.hasSword
        },
        { text: 'Retreat', nextScene: 'upperHall' }
      ]
    },
    victory: {
      id: 'victory',
      title: 'Victory!',
      description: 'With the knowledge from the library and the ancient sword, you defeat the dragon! The castle\'s curse is lifted.',
      onEnter: () => {
        setGameState(prev => ({
          ...prev,
          dragonDefeated: true
        }));
      },
      choices: [
        { text: 'Start a new adventure', nextScene: 'start' }
      ]
    }
  };

  const startGame = () => {
    setGameStarted(true);
    enterScene('start');
  };

  const enterScene = (sceneId: string) => {
    const newScene = scenes[sceneId];
    setCurrentScene(newScene);
    setGameState(prev => ({
      ...prev,
      currentSceneId: sceneId
    }));
    
    if (newScene && 'onEnter' in newScene && typeof newScene.onEnter === 'function') {
      newScene.onEnter();
    }
  };

  const handleChoice = (choice: Choice) => {
    if (!choice.condition || choice.condition(gameState)) {
      enterScene(choice.nextScene);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {!gameStarted ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-bold mb-4">Castle of Shadows</h1>
            <p className="text-gray-300 mb-8">
              Embark on an epic adventure through a mysterious castle filled with danger and ancient secrets.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button 
                onClick={startGame}
                className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Begin Adventure
              </button>
              <Link 
                to="/" 
                className="inline-flex items-center px-4 py-2 rounded-md border border-purple-600 text-white hover:bg-purple-900 transition-colors"
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
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#2a2a4a] rounded-lg shadow-xl p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">{currentScene?.title}</h2>
              <p className="text-gray-300 mb-6">{currentScene?.description}</p>
              
              <div className="space-y-4">
                {currentScene?.choices?.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoice(choice)}
                    disabled={choice.condition && !choice.condition(gameState)}
                    className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                      choice.condition && !choice.condition(gameState)
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-[#2a2a4a] rounded-lg shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Inventory</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {gameState.inventory.map((item, index) => (
                  <div key={index} className="bg-[#3a3a5a] p-2 rounded">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <Link 
                to="/" 
                className="inline-flex items-center px-4 py-2 rounded-md border border-purple-600 text-white hover:bg-purple-900 transition-colors"
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
    </div>
  );
};

export default AdventurePage;
