import React, { useState, useEffect, useRef } from 'react';

const SpaceShooterGame = () => {
  // Game area dimensions
  const gameWidth = 800;
  const gameHeight = 600;
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [specialCooldown, setSpecialCooldown] = useState(0);
  const [specialReady, setSpecialReady] = useState(true);
  const [health, setHealth] = useState(100);

  // Game objects
  const [playerPosition, setPlayerPosition] = useState({ x: gameWidth / 2, y: gameHeight - 80 });
  const [playerBullets, setPlayerBullets] = useState([]);
  const [specialBullets, setSpecialBullets] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [stars, setStars] = useState([]);
  
  // Game loop and animation
  const requestRef = useRef();
  const previousTimeRef = useRef();
  const keysPressed = useRef({});
  const bulletIntervalRef = useRef();
  const enemyIntervalRef = useRef();
  
  // Initialize stars for parallax background
  useEffect(() => {
    const newStars = [];
    // Create three layers of stars for parallax effect
    for (let layer = 1; layer <= 3; layer++) {
      const layerSpeed = layer * 0.5;
      const starCount = 50 - (layer * 10); // More stars in slower layers
      
      for (let i = 0; i < starCount; i++) {
        newStars.push({
          x: Math.random() * gameWidth,
          y: Math.random() * gameHeight,
          size: Math.random() * 2 + 1,
          speed: layerSpeed,
          layer
        });
      }
    }
    setStars(newStars);
  }, []);

  // Start game
  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setLevel(1);
    setHealth(100);
    setSpecialCooldown(0);
    setSpecialReady(true);
    setPlayerPosition({ x: gameWidth / 2, y: gameHeight - 80 });
    setPlayerBullets([]);
    setSpecialBullets([]);
    setEnemies([]);
    
    // Start automatic firing
    bulletIntervalRef.current = setInterval(() => {
      if (!gameOver) {
        setPlayerBullets(prev => [
          ...prev,
          { x: playerPosition.x, y: playerPosition.y - 20, width: 3, height: 15 }
        ]);
      }
    }, 300);
    
    // Start enemy spawning
    spawnEnemies();
  };
  
  // Handle enemy spawning with increasing difficulty
  const spawnEnemies = () => {
    enemyIntervalRef.current = setInterval(() => {
      if (gameOver) return;
      
      const enemyCount = Math.min(3 + Math.floor(level / 2), 8);
      const newEnemies = [];
      
      for (let i = 0; i < enemyCount; i++) {
        newEnemies.push({
          x: Math.random() * (gameWidth - 40),
          y: -30,
          width: 40,
          height: 40,
          speed: 2 + (level * 0.5),
          health: 1 + Math.floor(level / 3)
        });
      }
      
      setEnemies(prev => [...prev, ...newEnemies]);
      
      // Increase level every 30 seconds
      setLevel(prev => prev + 1);
    }, 3000 - (level * 100 > 1000 ? 1000 : level * 100));
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      
      // Special fire on spacebar
      if (e.code === 'Space' && specialReady && gameStarted && !gameOver) {
        fireSpecialWeapon();
      }
    };
    
    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [specialReady, gameStarted, gameOver]);

  // Special weapon fire
  const fireSpecialWeapon = () => {
    setSpecialBullets(prev => [
      ...prev,
      { x: playerPosition.x - 40, y: playerPosition.y, width: 80, height: 30, power: 3 }
    ]);
    setSpecialReady(false);
    setSpecialCooldown(20);
    
    // Start cooldown timer
    const cooldownTimer = setInterval(() => {
      setSpecialCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimer);
          setSpecialReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Game loop
  const gameLoop = (time) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    
    const deltaTime = time - previousTimeRef.current;
    previousTimeRef.current = time;
    
    if (!gameStarted || gameOver) {
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    // Handle player movement
    const moveSpeed = 5;
    
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
      setPlayerPosition(prev => ({
        ...prev,
        x: Math.max(30, prev.x - moveSpeed)
      }));
    }
    
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
      setPlayerPosition(prev => ({
        ...prev,
        x: Math.min(gameWidth - 30, prev.x + moveSpeed)
      }));
    }
    
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
      setPlayerPosition(prev => ({
        ...prev,
        y: Math.max(30, prev.y - moveSpeed)
      }));
    }
    
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
      setPlayerPosition(prev => ({
        ...prev,
        y: Math.min(gameHeight - 30, prev.y + moveSpeed)
      }));
    }
    
    // Update star positions (parallax effect)
    setStars(prev => prev.map(star => {
      let newY = star.y + star.speed;
      if (newY > gameHeight) {
        newY = 0;
      }
      return { ...star, y: newY };
    }));
    
    // Update bullet positions
    setPlayerBullets(prev => {
      return prev
        .map(bullet => ({
          ...bullet,
          y: bullet.y - 8 // Bullet speed
        }))
        .filter(bullet => bullet.y > -bullet.height);
    });
    
    // Update special bullet positions
    setSpecialBullets(prev => {
      return prev
        .map(bullet => ({
          ...bullet,
          y: bullet.y - 6 // Special bullet speed
        }))
        .filter(bullet => bullet.y > -bullet.height);
    });
    
    // Update enemy positions
    setEnemies(prev => {
      return prev
        .map(enemy => ({
          ...enemy,
          y: enemy.y + enemy.speed
        }))
        .filter(enemy => enemy.y < gameHeight + enemy.height);
    });
    
    // Check for collisions
    
    // Player bullets hitting enemies
    const updatedEnemies = [...enemies];
    const updatedPlayerBullets = [...playerBullets];
    
    for (let i = updatedPlayerBullets.length - 1; i >= 0; i--) {
      const bullet = updatedPlayerBullets[i];
      
      for (let j = updatedEnemies.length - 1; j >= 0; j--) {
        const enemy = updatedEnemies[j];
        
        if (
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y
        ) {
          // Collision detected
          updatedEnemies[j] = { ...enemy, health: enemy.health - 1 };
          updatedPlayerBullets.splice(i, 1);
          
          if (updatedEnemies[j].health <= 0) {
            updatedEnemies.splice(j, 1);
            setScore(prev => prev + 10 * level);
          }
          
          break;
        }
      }
    }
    
    // Special bullets hitting enemies
    const updatedSpecialBullets = [...specialBullets];
    
    for (let i = updatedSpecialBullets.length - 1; i >= 0; i--) {
      const bullet = updatedSpecialBullets[i];
      let hitSomething = false;
      
      for (let j = updatedEnemies.length - 1; j >= 0; j--) {
        const enemy = updatedEnemies[j];
        
        if (
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y
        ) {
          // Special bullet hits all enemies it touches without being destroyed
          hitSomething = true;
          updatedEnemies[j] = { ...enemy, health: enemy.health - bullet.power };
          
          if (updatedEnemies[j].health <= 0) {
            updatedEnemies.splice(j, 1);
            setScore(prev => prev + 25 * level);
          }
        }
      }
      
      if (hitSomething && bullet.y < gameHeight / 2) {
        updatedSpecialBullets.splice(i, 1);
      }
    }
    
    setPlayerBullets(updatedPlayerBullets);
    setSpecialBullets(updatedSpecialBullets);
    setEnemies(updatedEnemies);
    
    // Check for enemies hitting player
    for (const enemy of enemies) {
      if (
        playerPosition.x - 25 < enemy.x + enemy.width &&
        playerPosition.x + 25 > enemy.x &&
        playerPosition.y - 25 < enemy.y + enemy.height &&
        playerPosition.y + 25 > enemy.y
      ) {
        // Player hit by enemy
        setHealth(prev => prev - 10);
        
        if (health <= 10) {
          endGame();
        }
        
        // Remove enemy after collision
        setEnemies(prev => prev.filter(e => e !== enemy));
        break;
      }
    }
    
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Start the game loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStarted, gameOver, playerPosition, playerBullets, specialBullets, enemies, health]);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      clearInterval(bulletIntervalRef.current);
      clearInterval(enemyIntervalRef.current);
    };
  }, []);

  // End game
  const endGame = () => {
    setGameOver(true);
    clearInterval(bulletIntervalRef.current);
    clearInterval(enemyIntervalRef.current);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <div className="mb-4 text-2xl">Space Shooter</div>
      
      <div className="relative" style={{ width: gameWidth, height: gameHeight, border: '2px solid #333' }}>
        {/* Parallax Stars Background */}
        {stars.map((star, index) => (
          <div 
            key={index}
            className="absolute bg-white rounded-full"
            style={{
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              opacity: star.layer === 1 ? 1 : star.layer === 2 ? 0.7 : 0.4
            }}
          />
        ))}
        
        {/* Player Ship */}
        {gameStarted && (
          <div 
            className="absolute bg-blue-500"
            style={{
              left: playerPosition.x - 25,
              top: playerPosition.y - 25,
              width: 50,
              height: 50,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
            }}
          />
        )}
        
        {/* Player Bullets */}
        {playerBullets.map((bullet, index) => (
          <div
            key={`bullet-${index}`}
            className="absolute bg-yellow-400"
            style={{
              left: bullet.x - bullet.width / 2,
              top: bullet.y,
              width: bullet.width,
              height: bullet.height
            }}
          />
        ))}
        
        {/* Special Bullets */}
        {specialBullets.map((bullet, index) => (
          <div
            key={`special-${index}`}
            className="absolute bg-red-500"
            style={{
              left: bullet.x,
              top: bullet.y,
              width: bullet.width,
              height: bullet.height,
              opacity: 0.8
            }}
          />
        ))}
        
        {/* Enemies */}
        {enemies.map((enemy, index) => (
          <div
            key={`enemy-${index}`}
            className="absolute bg-green-500"
            style={{
              left: enemy.x,
              top: enemy.y,
              width: enemy.width,
              height: enemy.height,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              transform: 'rotate(180deg)'
            }}
          />
        ))}
        
        {/* Game UI Overlays */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <button
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-xl"
              onClick={startGame}
            >
              Start Game
            </button>
          </div>
        )}
        
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70">
            <div className="text-3xl mb-4">Game Over</div>
            <div className="text-xl mb-6">Final Score: {score}</div>
            <button
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-xl"
              onClick={startGame}
            >
              Play Again
            </button>
          </div>
        )}
        
        {/* UI Elements */}
        <div className="absolute top-4 left-4 text-xl">Score: {score}</div>
        <div className="absolute top-4 right-4 text-xl">Level: {level}</div>
        
        {/* Health Bar */}
        <div className="absolute bottom-4 left-4 w-64 h-6 bg-gray-700 rounded-full">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${health}%`, 
              backgroundColor: health > 60 ? '#10B981' : health > 30 ? '#F59E0B' : '#EF4444'
            }}
          />
        </div>
        
        {/* Special Ability Cooldown */}
        <div className="absolute bottom-4 right-4 flex items-center">
          <div className="mr-2 text-sm">Special:</div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: specialReady ? 'rgba(59, 130, 246, 0.5)' : 'rgba(75, 85, 99, 0.5)'
            }}
          >
            {specialReady ? (
              <span className="text-xs">READY</span>
            ) : (
              <span className="text-xs">{specialCooldown}s</span>
            )}
          </div>
        </div>
        
        {/* Game Instructions (displayed initially) */}
        {!gameStarted && !gameOver && (
          <div className="absolute bottom-8 left-0 right-0 text-center text-sm">
            <p>Move: W, A, S, D | Fire: Automatic | Special Fire: SPACEBAR</p>
            <p className="mt-1">Difficulty increases over time. Good luck!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceShooterGame;