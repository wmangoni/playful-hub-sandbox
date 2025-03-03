
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Game data for our cards
const games = [
  {
    id: 1,
    title: "Puzzle Master",
    description: "Challenge your mind with intricate puzzles and brain teasers.",
    color: "from-blue-400 to-indigo-500",
    icon: "🧩",
    route: "/puzzle"
  },
  {
    id: 2,
    title: "Arcade Classic",
    description: "Relive the golden age of gaming with these timeless classics.",
    color: "from-red-400 to-pink-500",
    icon: "🎮",
    route: "/arcade"
  },
  {
    id: 3,
    title: "Strategy Empire",
    description: "Build, conquer, and outsmart opponents in strategic gameplay.",
    color: "from-amber-400 to-orange-500",
    icon: "🏰",
    route: "/strategy"
  },
  {
    id: 4,
    title: "Adventure Quest",
    description: "Embark on an epic journey through mysterious lands and quests.",
    color: "from-emerald-400 to-teal-500",
    icon: "🗺️",
    route: "/adventure"
  }
];

const Index = () => {
  // State for animation triggers
  const [isLoaded, setIsLoaded] = useState(false);

  // Trigger animations after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="home min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
      {/* Background with subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-background to-secondary opacity-80 -z-10"></div>
      
      {/* Animated circles for background interest */}
      <div className="fixed top-1/4 right-1/4 w-96 h-96 rounded-full bg-primary opacity-5 blur-3xl -z-10 animate-float"></div>
      <div className="fixed bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-blue-300 opacity-5 blur-3xl -z-10 animate-float" style={{ animationDelay: '2s' }}></div>
      
      {/* Main Content */}
      <div className={`max-w-6xl w-full transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-block mb-3 px-3 py-1 bg-secondary rounded-full text-sm font-medium text-primary animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Game Collection
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight animate-fade-up" style={{ animationDelay: '0.3s' }}>
            Playful Hub
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.4s' }}>
            Discover a collection of beautifully crafted games designed for your enjoyment.
            Select any game to begin your experience.
          </p>
        </header>
        
        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {games.map((game, index) => (
            <Link 
              to={game.route} 
              key={game.id} 
              className={`
                relative group rounded-xl overflow-hidden card-transition
                bg-card border border-border shadow-sm  
                hover:shadow-lg hover:-translate-y-1 
                animate-fade-up
              `}
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              {/* Card gradient hover effect */}
              <div className={`
                absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
                bg-gradient-to-br ${game.color}
              `}></div>
              
              {/* Card content */}
              <div className="p-6 flex flex-col h-full">
                {/* Icon with background */}
                <div className={`
                  w-12 h-12 rounded-full mb-4 flex items-center justify-center text-2xl
                  bg-gradient-to-br ${game.color} shadow-sm
                `}>
                  <span className="card-transition group-hover:scale-110">
                    {game.icon}
                  </span>
                </div>
                
                {/* Game title and description */}
                <h2 className="text-xl font-semibold mb-2 card-transition group-hover:text-primary">
                  {game.title}
                </h2>
                <p className="text-muted-foreground text-sm flex-grow mb-4">
                  {game.description}
                </p>
                
                {/* Play button */}
                <div className="
                  flex items-center text-sm font-medium text-primary
                  transition-transform transform group-hover:translate-x-1
                ">
                  Play Now
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 ml-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '1s' }}>
          <p>Designed with simplicity and elegance in mind</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
