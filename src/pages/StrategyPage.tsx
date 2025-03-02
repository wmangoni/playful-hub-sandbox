
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Define types
interface BuildingCost {
  gold: number;
  food: number;
}

interface Event {
  type: 'raid' | 'boom' | 'plague';
  text: string;
}

interface GameEvent {
  text: string;
  timestamp: string;
}

const StrategyPage = () => {
  // Game state
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [gold, setGold] = useState(100);
  const [food, setFood] = useState(100);
  const [seconds, setSeconds] = useState(0);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  
  // Refs for intervals
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create water tiles
  const waterTiles = useRef<number[]>([]);
  const { toast } = useToast();
  
  // Initialize water tiles
  useEffect(() => {
    waterTiles.current = [];
    for (let x = 0; x < 25; x++) {
      waterTiles.current.push(Math.floor(Math.random() * (15*20)) + 1);
    }
  }, []);
  
  // Initialize game timers
  useEffect(() => {
    // Game logic timer
    gameTimerRef.current = setInterval(() => {
      if (Math.random() <= 0.3) {
        const events: Event[] = [
          { type: 'raid', text: 'Bandits raid your kingdom!' },
          { type: 'boom', text: 'Trade caravan brings bonus gold!' },
          { type: 'plague', text: 'Crop plague destroys food!' }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        addEvent(event.text);
        
        switch(event.type) {
          case 'raid':
            const knights = document.querySelectorAll('[data-type="barracks"]').length;
            const walls = document.querySelectorAll('[data-type="wall"]').length;
            if (knights + walls < 3) {
              setGold(prev => Math.max(0, prev - 50));
              addEvent('Lost 50 gold to bandits!');
            }
            break;
          case 'boom':
            setGold(prev => prev + 75);
            break;
          case 'plague':
            setFood(prev => Math.max(0, prev - 30));
            break;
        }
      }
      
      const castles = document.querySelectorAll('[data-type="castle"]').length;
      setGold(prev => prev + (castles * 5));
      
      const farms = document.querySelectorAll('[data-type="farm"]').length;
      setFood(prev => prev + (farms * 2));
      
    }, 2667);
    
    // Timer for seconds
    timerIntervalRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    
    addEvent('Game started! Build quickly!');
    
    // Clean up timers on unmount
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);
  
  // Update resource displays
  const updateResources = () => {
    // This function is now handled by React state updates
  };
  
  // Add event to the log
  const addEvent = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setGameEvents(prev => [{text, timestamp}, ...prev]);
  };
  
  // Place building on tile
  const placeBuilding = (tile: HTMLDivElement) => {
    if (!selectedBuilding) return;
    
    const costs: Record<string, BuildingCost> = {
      castle: { gold: 100, food: 100 },
      farm: { gold: 50, food: 0 },
      barracks: { gold: 75, food: 25 },
      wall: { gold: 25, food: 20 }
    };
    
    if (gold >= costs[selectedBuilding].gold && food >= costs[selectedBuilding].food) {
      setGold(prev => prev - costs[selectedBuilding]!.gold);
      setFood(prev => prev - costs[selectedBuilding]!.food);
      
      // Update tile
      tile.dataset.type = selectedBuilding;
      
      addEvent(`Built ${selectedBuilding}`);
      
      // Check win condition
      if (document.querySelectorAll('[data-type="castle"]').length >= 3) {
        toast({
          title: "Victory!",
          description: `You won in ${Math.floor(seconds/60)}m${seconds%60}s!`
        });
        
        if (gameTimerRef.current) clearInterval(gameTimerRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    } else {
      toast({
        title: "Cannot Build",
        description: "Not enough resources!",
        variant: "destructive"
      });
    }
  };
  
  // Format time for display
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Select building
  const handleSelectBuilding = (building: string) => {
    setSelectedBuilding(building);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-[#2a2a2a] text-[#f0f0d8]">
      <h1 className="text-3xl font-bold mb-6">Realm Builder ⏱️ Speed</h1>
      
      <div className="flex flex-col md:flex-row w-full max-w-[1200px] gap-5">
        {/* Map Grid */}
        <div className="grid grid-cols-[repeat(20,30px)] grid-rows-[repeat(15,30px)] gap-[1px] bg-[#b8864c] border-2 border-[#666]">
          {Array.from({ length: 15 * 20 }).map((_, i) => (
            <div
              key={i}
              className={`w-[30px] h-[30px] cursor-pointer relative transition-transform duration-100 hover:scale-110 hover:z-10 ${
                waterTiles.current.includes(i) ? 'bg-[#3388aa] before:content-["🌊"]' : 'bg-[#88aa33]'
              }`}
              data-type={waterTiles.current.includes(i) ? 'water' : 'grass'}
              onClick={(e) => placeBuilding(e.currentTarget)}
            ></div>
          ))}
        </div>
        
        {/* Info Panel */}
        <div className="bg-[#333333] p-5 rounded-md border-2 border-[#666] flex-1">
          {/* Resources */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-[#444] p-2 rounded text-center">Gold: {gold}</div>
            <div className="bg-[#444] p-2 rounded text-center">Food: {food}</div>
            <div className="bg-[#444] p-2 rounded text-center font-bold text-[#ffd700]">
              Time: {formatTime(seconds)}
            </div>
          </div>
          
          {/* Build Options */}
          <div className="mt-5">
            <button
              className={`w-full p-2 mb-2 text-white transition-colors ${selectedBuilding === 'castle' ? 'bg-[#777]' : 'bg-[#555] hover:bg-[#666]'}`}
              onClick={() => handleSelectBuilding('castle')}
            >
              🏰 Castle (100🪙) / (100🍎)
            </button>
            <button
              className={`w-full p-2 mb-2 text-white transition-colors ${selectedBuilding === 'farm' ? 'bg-[#777]' : 'bg-[#555] hover:bg-[#666]'}`}
              onClick={() => handleSelectBuilding('farm')}
            >
              🌾 Farm (50🪙) / (0🍎)
            </button>
            <button
              className={`w-full p-2 mb-2 text-white transition-colors ${selectedBuilding === 'barracks' ? 'bg-[#777]' : 'bg-[#555] hover:bg-[#666]'}`}
              onClick={() => handleSelectBuilding('barracks')}
            >
              ⚔️ Barracks (75🪙) / (25🍎)
            </button>
            <button
              className={`w-full p-2 mb-2 text-white transition-colors ${selectedBuilding === 'wall' ? 'bg-[#777]' : 'bg-[#555] hover:bg-[#666]'}`}
              onClick={() => handleSelectBuilding('wall')}
            >
              🧱 Wall (25🪙) / (20🍎)
            </button>
          </div>
          
          {/* Event Log */}
          <div className="mt-5 h-[200px] overflow-y-auto bg-[#222] p-2 rounded">
            {gameEvents.map((event, index) => (
              <div key={index} className="my-1 p-1 bg-[#333] rounded">
                [{event.timestamp}] {event.text}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Link 
        to="/" 
        className="mt-8 inline-flex items-center px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
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
      
      {/* Custom styles */}
      <style jsx global>{`
        .tile[data-type="water"] { 
          background: #3388aa; 
        }
        .tile[data-type="water"]::before {
          content: "🌊";
          font-size: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .tile[data-type="castle"],
        div[data-type="castle"] { 
          background: #aa3333 !important; 
        }
        .tile[data-type="castle"]::before,
        div[data-type="castle"]::before {
          content: "🏰";
          font-size: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .tile[data-type="farm"],
        div[data-type="farm"] { 
          background: #aaff33 !important; 
        }
        .tile[data-type="farm"]::before,
        div[data-type="farm"]::before {
          content: "🌾";
          font-size: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .tile[data-type="barracks"],
        div[data-type="barracks"] { 
          background: #666666 !important; 
        }
        .tile[data-type="barracks"]::before,
        div[data-type="barracks"]::before {
          content: "⚔️";
          font-size: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .tile[data-type="wall"],
        div[data-type="wall"] { 
          background: #999999 !important; 
        }
        .tile[data-type="wall"]::before,
        div[data-type="wall"]::before {
          content: "🧱";
          font-size: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .tile[data-type="water"]::before,
        div[data-type="water"]::before {
          animation: wave 2s infinite;
        }

        @keyframes wave {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          50% { transform: translate(-50%, -50%) rotate(10deg); }
        }
      `}</style>
    </div>
  );
};

export default StrategyPage;
