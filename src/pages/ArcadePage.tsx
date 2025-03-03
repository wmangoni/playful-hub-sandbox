import React, { useState, useEffect, useRef } from "react";

const SpaceShooterGame = () => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [specialCharges, setSpecialCharges] = useState(3);
  const [isSpecialActive, setIsSpecialActive] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameContainerRef = useRef(null);
  const playerRef = useRef(null);
  const scoreElementRef = useRef(null);
  const livesElementRef = useRef(null);
  const specialChargesElementRef = useRef(null);
  const levelElementRef = useRef(null);
  const specialActiveElementRef = useRef(null);
  const specialBarFillRef = useRef(null);
  const gameOverScreenRef = useRef(null);
  const finalScoreElementRef = useRef(null);

  const containerWidthRef = useRef(600);
  const containerHeightRef = useRef(400);
  const playerWidthRef = useRef(40);
  const playerHeightRef = useRef(40);

  const playerXRef = useRef(containerWidthRef.current / 2 - playerWidthRef.current / 2);
  const playerYRef = useRef(containerHeightRef.current - playerHeightRef.current - 20);

  const bulletsRef = useRef([]);
  const enemiesRef = useRef([]);
  const starsRef = useRef([]);

  const isLeftPressedRef = useRef(false);
  const isRightPressedRef = useRef(false);
  const isFirePressedRef = useRef(false);
  const isSpecialPressedRef = useRef(false);
  const lastFireTimeRef = useRef(0);
  const specialTimerRef = useRef(null);
  const specialTimeLeftRef = useRef(0);

  // Initialize stars
  const createStars = () => {
    for (let i = 0; i < 100; i++) {
      const star = document.createElement("div");
      star.className = "star";
      star.style.left = `${Math.random() * containerWidthRef.current}px`;
      star.style.top = `${Math.random() * containerHeightRef.current}px`;
      star.style.opacity = `${Math.random() * 0.8 + 0.2}`;
      star.speed = Math.random() * 0.5 + 0.1;
      gameContainerRef.current.appendChild(star);
      starsRef.current.push(star);
    }
  };

  // Update player position
  const updatePlayer = () => {
    if (isLeftPressedRef.current && playerXRef.current > 0) {
      playerXRef.current -= 7;
    }
    if (isRightPressedRef.current && playerXRef.current < containerWidthRef.current - playerWidthRef.current) {
      playerXRef.current += 7;
    }
    playerRef.current.style.left = `${playerXRef.current}px`;
  };

  // Fire a bullet
  const fireBullet = () => {
    const currentTime = Date.now();
    if (currentTime - lastFireTimeRef.current < 150) return;

    if (isSpecialActive) {
      // Triple special shot
      const bullet1 = document.createElement("div");
      bullet1.className = "special-bullet";
      bullet1.style.left = `${playerXRef.current + playerWidthRef.current / 2 - 5}px`;
      bullet1.style.top = `${playerYRef.current - 15}px`;
      bullet1.speedX = 0;
      bullet1.speedY = -10;
      gameContainerRef.current.appendChild(bullet1);
      bulletsRef.current.push(bullet1);

      const bullet2 = document.createElement("div");
      bullet2.className = "special-bullet";
      bullet2.style.left = `${playerXRef.current + playerWidthRef.current / 2 - 15}px`;
      bullet2.style.top = `${playerYRef.current - 10}px`;
      bullet2.speedX = -2;
      bullet2.speedY = -9;
      gameContainerRef.current.appendChild(bullet2);
      bulletsRef.current.push(bullet2);

      const bullet3 = document.createElement("div");
      bullet3.className = "special-bullet";
      bullet3.style.left = `${playerXRef.current + playerWidthRef.current / 2 + 5}px`;
      bullet3.style.top = `${playerYRef.current - 10}px`;
      bullet3.speedX = 2;
      bullet3.speedY = -9;
      gameContainerRef.current.appendChild(bullet3);
      bulletsRef.current.push(bullet3);
    } else {
      // Regular bullet
      const bullet = document.createElement("div");
      bullet.className = "bullet";
      bullet.style.left = `${playerXRef.current + playerWidthRef.current / 2 - 5}px`;
      bullet.style.top = `${playerYRef.current - 15}px`;
      bullet.speedX = 0;
      bullet.speedY = -10;
      gameContainerRef.current.appendChild(bullet);
      bulletsRef.current.push(bullet);
    }

    lastFireTimeRef.current = currentTime;
  };

  // Activate special shot
  const activateSpecial = () => {
    if (specialCharges > 0 && !isSpecialActive) {
      setIsSpecialActive(true);
      setSpecialCharges((prev) => prev - 1);
      specialActiveElementRef.current.style.display = "block";
      specialTimeLeftRef.current = 2000;

      if (specialTimerRef.current) {
        clearInterval(specialTimerRef.current);
      }

      specialTimerRef.current = setInterval(() => {
        specialTimeLeftRef.current -= 100;
        const percentage = (specialTimeLeftRef.current / 2000) * 100;
        specialBarFillRef.current.style.width = `${percentage}%`;

        if (specialTimeLeftRef.current <= 0) {
          deactivateSpecial();
        }
      }, 100);
    }
  };

  // Deactivate special shot
  const deactivateSpecial = () => {
    setIsSpecialActive(false);
    specialActiveElementRef.current.style.display = "none";
    specialBarFillRef.current.style.width = "0%";

    if (specialTimerRef.current) {
      clearInterval(specialTimerRef.current);
      specialTimerRef.current = null;
    }
  };

  // Update bullets position
  const updateBullets = () => {
    for (let i = 0; i < bulletsRef.current.length; i++) {
      const bullet = bulletsRef.current[i];
      const x = parseFloat(bullet.style.left) + (bullet.speedX || 0);
      const y = parseFloat(bullet.style.top) + (bullet.speedY || -10);

      if (y < 0 || x < 0 || x > containerWidthRef.current) {
        gameContainerRef.current.removeChild(bullet);
        bulletsRef.current.splice(i, 1);
        i--;
      } else {
        bullet.style.left = `${x}px`;
        bullet.style.top = `${y}px`;
      }
    }
  };

  // Create an enemy
  const createEnemy = () => {
    const spawnRate = 0.02 + (difficultyLevel - 1) * 0.005;
    const maxEnemies = 8 + Math.floor((difficultyLevel - 1) / 2);

    if (Math.random() < spawnRate && enemiesRef.current.length < maxEnemies) {
      const enemy = document.createElement("div");
      enemy.className = "enemy";
      enemy.innerHTML = `
        <svg viewBox="0 0 100 100">
          ${Math.floor(Math.random() * 3) === 0 ? '<circle cx="50" cy="50" r="40" fill="#e74c3c" /><circle cx="30" cy="40" r="10" fill="#000" /><circle cx="70" cy="40" r="10" fill="#000" />' : 
           Math.floor(Math.random() * 3) === 1 ? '<polygon points="10,50 50,10 90,50 50,90" fill="#9b59b6" /><circle cx="35" cy="45" r="8" fill="#000" /><circle cx="65" cy="45" r="8" fill="#000" />' :
           '<rect x="10" y="10" width="80" height="80" fill="#f39c12" /><rect x="25" y="30" width="15" height="15" fill="#000" /><rect x="60" y="30" width="15" height="15" fill="#000" />'}
        </svg>
      `;
      enemy.style.left = `${Math.random() * (containerWidthRef.current - 30)}px`;
      enemy.style.top = "0px";
      enemy.speed = Math.random() * 1 + (0.5 + (difficultyLevel - 1) * 0.2);
      gameContainerRef.current.appendChild(enemy);
      enemiesRef.current.push(enemy);
    }
  };

  // Update enemies position
  const updateEnemies = () => {
    for (let i = 0; i < enemiesRef.current.length; i++) {
      const enemy = enemiesRef.current[i];
      let x = parseFloat(enemy.style.left);
      let y = parseFloat(enemy.style.top) + enemy.speed;

      if (y > containerHeightRef.current) {
        gameContainerRef.current.removeChild(enemy);
        enemiesRef.current.splice(i, 1);
        i--;

        if (difficultyLevel >= 3) {
          setLives((prev) => prev - 1);
          if (lives <= 1) {
            gameOver();
          }
        }
      } else {
        enemy.style.left = `${x}px`;
        enemy.style.top = `${y}px`;
      }
    }
  };

  // Update stars position
  const updateStars = () => {
    for (let i = 0; i < starsRef.current.length; i++) {
      const star = starsRef.current[i];
      let y = parseFloat(star.style.top) + star.speed;

      if (y > containerHeightRef.current) {
        y = 0;
      }

      star.style.top = `${y}px`;
    }
  };

  // Check for collisions
  const checkCollisions = () => {
    // Bullet-enemy collisions
    for (let i = 0; i < bulletsRef.current.length; i++) {
      const bullet = bulletsRef.current[i];
      const bulletRect = bullet.getBoundingClientRect();

      for (let j = 0; j < enemiesRef.current.length; j++) {
        const enemy = enemiesRef.current[j];
        const enemyRect = enemy.getBoundingClientRect();

        if (
          bulletRect.left < enemyRect.right + 5 &&
          bulletRect.right > enemyRect.left - 5 &&
          bulletRect.top < enemyRect.bottom + 5 &&
          bulletRect.bottom > enemyRect.top - 5
        ) {
          gameContainerRef.current.removeChild(bullet);
          gameContainerRef.current.removeChild(enemy);
          bulletsRef.current.splice(i, 1);
          enemiesRef.current.splice(j, 1);
          setScore((prev) => prev + 10 * difficultyLevel);

          const newLevel = 1 + Math.floor(score / 150);
          if (newLevel > difficultyLevel) {
            setDifficultyLevel(newLevel);
            if (newLevel % 2 === 0 && specialCharges < 3) {
              setSpecialCharges((prev) => prev + 1);
            }
          }

          i--;
          break;
        }
      }
    }

    // Player-enemy collisions
    const playerRect = playerRef.current.getBoundingClientRect();
    for (let i = 0; i < enemiesRef.current.length; i++) {
      const enemy = enemiesRef.current[i];
      const enemyRect = enemy.getBoundingClientRect();

      if (
        playerRect.left < enemyRect.right &&
        playerRect.right > enemyRect.left &&
        playerRect.top < enemyRect.bottom &&
        playerRect.bottom > enemyRect.top
      ) {
        gameContainerRef.current.removeChild(enemy);
        enemiesRef.current.splice(i, 1);
        setLives((prev) => prev - 1);
        if (lives <= 1) {
          gameOver();
        }
        break;
      }
    }
  };

  // Game over function
  const gameOver = () => {
    setIsGameOver(true);
    finalScoreElementRef.current.textContent = `Score: ${score}`;
    gameOverScreenRef.current.style.display = "flex";
    deactivateSpecial();
  };

  // Reset game state
  const resetGame = () => {
    while (bulletsRef.current.length > 0) {
      gameContainerRef.current.removeChild(bulletsRef.current[0]);
      bulletsRef.current.shift();
    }
    while (enemiesRef.current.length > 0) {
      gameContainerRef.current.removeChild(enemiesRef.current[0]);
      enemiesRef.current.shift();
    }
    while (starsRef.current.length > 0) {
      gameContainerRef.current.removeChild(starsRef.current[0]);
      starsRef.current.shift();
    }

    playerXRef.current = containerWidthRef.current / 2 - playerWidthRef.current / 2;
    playerYRef.current = containerHeightRef.current - playerHeightRef.current - 20;
    setScore(0);
    setLives(5);
    setDifficultyLevel(1);
    setSpecialCharges(3);
    setIsGameOver(false);
    setIsSpecialActive(false);

    scoreElementRef.current.textContent = "Score: 0";
    livesElementRef.current.textContent = "Lives: 5";
    levelElementRef.current.textContent = "Nível: 1";
    specialChargesElementRef.current.textContent = "Tiro Especial: 3";
    gameOverScreenRef.current.style.display = "none";
    specialActiveElementRef.current.style.display = "none";
    specialBarFillRef.current.style.width = "0%";

    createStars();
    startGame();
  };

  // Auto-fire
  const enableAutoFire = () => {
    setInterval(() => {
      if (!isGameOver) {
        fireBullet();
      }
    }, 300);
  };

  // Main game loop
  const gameLoop = () => {
    if (!isGameOver) {
      updatePlayer();
      if (isFirePressedRef.current) {
        fireBullet();
      }
      if (isSpecialPressedRef.current && !isSpecialActive && specialCharges > 0) {
        activateSpecial();
        isSpecialPressedRef.current = false;
      }
      updateBullets();
      createEnemy();
      updateEnemies();
      updateStars();
      checkCollisions();
      requestAnimationFrame(gameLoop);
    }
  };

  // Handle keyboard events
  const setupControls = () => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") {
        isLeftPressedRef.current = true;
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        isRightPressedRef.current = true;
      }
      if (e.key === "ArrowUp" || e.key === "w") {
        isFirePressedRef.current = true;
      }
      if (e.key === " " && !isSpecialPressedRef.current) {
        isSpecialPressedRef.current = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") {
        isLeftPressedRef.current = false;
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        isRightPressedRef.current = false;
      }
      if (e.key === "ArrowUp" || e.key === "w") {
        isFirePressedRef.current = false;
      }
      if (e.key === " ") {
        isSpecialPressedRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  };

  // Start the game
  const startGame = () => {
    setupControls();
    enableAutoFire();
    requestAnimationFrame(gameLoop);
  };

  // Initialize the game
  useEffect(() => {
    resetGame();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div
        id="game-container"
        ref={gameContainerRef}
        className="relative w-[600px] h-[400px] border-2 border-[#333] bg-black overflow-hidden"
      >
        <div id="score" ref={scoreElementRef} className="absolute top-2.5 left-2.5 text-white text-lg">
          Score: 0
        </div>
        <div id="lives" ref={livesElementRef} className="absolute top-2.5 right-2.5 text-white text-lg">
          Lives: 5
        </div>
        <div id="special-charges" ref={specialChargesElementRef} className="absolute top-10 right-2.5 text-[#00ffff] text-lg">
          Tiro Especial: 3
        </div>
        <div id="level" ref={levelElementRef} className="absolute top-10 left-2.5 text-[#ff9900] text-lg">
          Nível: 1
        </div>
        <div id="special-active" ref={specialActiveElementRef} className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-[#00ffff] text-lg hidden">
          TIRO TRIPLO ATIVO!
        </div>
        <div id="special-bar" className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-[100px] h-[10px] bg-[#333] rounded">
          <div id="special-bar-fill" ref={specialBarFillRef} className="h-full w-0 bg-[#00ffff] rounded transition-all"></div>
        </div>
        <svg
          id="player"
          ref={playerRef}
          className="absolute"
          style={{
            left: `${playerXRef.current}px`,
            top: `${playerYRef.current}px`,
            width: `${playerWidthRef.current}px`,
            height: `${playerHeightRef.current}px`,
          }}
          viewBox="0 0 100 100"
          dangerouslySetInnerHTML={{
            __html: `
              <polygon points="50,10 90,90 10,90" fill="#00ff00" />
              <rect x="40" y="20" width="20" height="40" fill="#009900" />
              <circle cx="50" cy="90" r="10" fill="#00cc00" />
            `,
          }}
        />
        <div
          id="game-over-screen"
          ref={gameOverScreenRef}
          className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center hidden"
        >
          <h2 className="text-white text-4xl mb-5">Game Over</h2>
          <div
            id="final-score"
            ref={finalScoreElementRef}
            className="text-white text-2xl mb-5"
          >
            Score: {score}
          </div>
          <button
            onClick={resetGame}
            className="bg-[#00ff00] text-black text-lg px-5 py-2.5 rounded cursor-pointer hover:bg-[#00cc00]"
          >
            Jogar Novamente
          </button>
        </div>
      </div>
      <style>{`
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
        }
        .bullet {
          position: absolute;
          width: 10px;
          height: 15px;
          background: #ff0000;
          border-radius: 5px;
        }
        .special-bullet {
          position: absolute;
          width: 12px;
          height: 18px;
          background: #00ffff;
          border-radius: 6px;
          box-shadow: 0 0 5px #00ffff;
        }
        .enemy {
          position: absolute;
          width: 30px;
          height: 30px;
        }
        .enemy svg {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default SpaceShooterGame;