import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const ArcadePage = () => {
  const [gameStarted, setGameStarted] = useState(false);

  const startGame = () => {
    setGameStarted(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      {!gameStarted ? (
        <div className="text-center bg-gray-900 p-10 rounded-lg shadow-2xl max-w-2xl">
          <h1 className="text-4xl font-bold mb-4 text-white">Space Shooter</h1>
          <p className="text-muted-foreground mb-8 text-gray-300">
            Navigate your spaceship with arrow keys, and shoot with spacebar. Survive as long as possible!
          </p>
          <button
            onClick={startGame}
            className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors text-lg"
          >
            Start Game
          </button>
          <div className="mt-8 text-gray-400 text-sm">
            <p>Controls:</p>
            <p>Arrow Keys/WASD - Move ship</p>
            <p>Spacebar - Fire (Special fire if available)</p>
            <p>Touch/Drag - Control on mobile</p>
          </div>
        </div>
      ) : (
        <SpaceShooterGame />
      )}

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
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
  );
};

interface StarElement extends HTMLDivElement {
  speed: number;
}

interface EnemyElement extends HTMLDivElement {
  speed: number;
}

interface PowerUpElement extends HTMLDivElement {
  speed: number;
}

interface BulletElement extends HTMLDivElement {
  speedX: number;
  speedY: number;
}

const SpaceShooterGame = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SVGSVGElement>(null);
  const scoreElementRef = useRef<HTMLDivElement>(null);
  const livesElementRef = useRef<HTMLDivElement>(null);
  const specialShotsElementRef = useRef<HTMLDivElement>(null);
  const gameOverScreenRef = useRef<HTMLDivElement>(null);
  const finalScoreElementRef = useRef<HTMLDivElement>(null);

  const bulletsRef = useRef<BulletElement[]>([]);
  const enemiesRef = useRef<EnemyElement[]>([]);
  const powerUpsRef = useRef<PowerUpElement[]>([]);
  const starsRef = useRef<StarElement[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const isGameOverRef = useRef(false);
  const gameLoopIdRef = useRef<number | null>(null);

  const isLeftPressedRef = useRef(false);
  const isRightPressedRef = useRef(false);
  const lastFireTimeRef = useRef(0);
  const playerXRef = useRef(0);
  const playerYRef = useRef(0);
  const containerWidthRef = useRef(0);
  const containerHeightRef = useRef(0);
  const playerWidthRef = useRef(40);
  const playerHeightRef = useRef(40);
  const [specialShots, setSpecialShots] = useState(0);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const gameContainer = gameContainerRef.current;
    containerWidthRef.current = gameContainer.offsetWidth;
    containerHeightRef.current = gameContainer.offsetHeight;
    playerXRef.current = containerWidthRef.current / 2 - playerWidthRef.current / 2;
    playerYRef.current = containerHeightRef.current - playerHeightRef.current - 20;

    resetGame();

    return () => {
      if (gameLoopIdRef.current) {
        cancelAnimationFrame(gameLoopIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Sincroniza o elemento DOM com o estado specialShots
    if (specialShotsElementRef.current) {
      specialShotsElementRef.current.textContent = `Special Shots: ${specialShots}`;
    }
  }, [specialShots]);

  const createStars = () => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) return;

    for (let i = 0; i < 100; i++) {
      const star = document.createElement("div") as StarElement;
      star.className = "star";
      star.style.left = `${Math.random() * containerWidthRef.current}px`;
      star.style.top = `${Math.random() * containerHeightRef.current}px`;
      star.style.opacity = `${Math.random() * 0.8 + 0.2}`;
      star.speed = Math.random() * 0.5 + 0.1;
      gameContainer.appendChild(star);
      starsRef.current.push(star);
    }
  };

  const updatePlayer = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isLeftPressedRef.current && playerXRef.current > 0) {
      playerXRef.current -= 7;
    }
    if (isRightPressedRef.current && playerXRef.current < containerWidthRef.current - playerWidthRef.current) {
      playerXRef.current += 7;
    }
    player.style.left = `${playerXRef.current}px`;
    player.style.top = `${playerYRef.current}px`;
  };

  const fireBullet = (useSpecial = false) => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) return;

    const currentTime = Date.now();
    if (currentTime - lastFireTimeRef.current < 150) return;

    if (useSpecial && specialShots > 0) {
      const bullet1 = document.createElement("div") as BulletElement;
      bullet1.className = "bullet special-bullet";
      bullet1.style.left = `${playerXRef.current + playerWidthRef.current / 2 - 5}px`;
      bullet1.style.top = `${playerYRef.current - 15}px`;
      bullet1.speedX = 0;
      bullet1.speedY = -10;
      gameContainer.appendChild(bullet1);
      bulletsRef.current.push(bullet1);

      const bullet2 = document.createElement("div") as BulletElement;
      bullet2.className = "bullet special-bullet";
      bullet2.style.left = `${playerXRef.current + playerWidthRef.current / 2 - 15}px`;
      bullet2.style.top = `${playerYRef.current - 10}px`;
      bullet2.speedX = -2;
      bullet2.speedY = -9;
      gameContainer.appendChild(bullet2);
      bulletsRef.current.push(bullet2);

      const bullet3 = document.createElement("div") as BulletElement;
      bullet3.className = "bullet special-bullet";
      bullet3.style.left = `${playerXRef.current + playerWidthRef.current / 2 + 5}px`;
      bullet3.style.top = `${playerYRef.current - 10}px`;
      bullet3.speedX = 2;
      bullet3.speedY = -9;
      gameContainer.appendChild(bullet3);
      bulletsRef.current.push(bullet3);

      setSpecialShots((prev) => {
        console.log("Special shots decreased from", prev, "to", prev - 1);
        return prev - 1;
      });
    } else {
      const bullet = document.createElement("div") as BulletElement;
      bullet.className = "bullet";
      bullet.style.left = `${playerXRef.current + playerWidthRef.current / 2 - 5}px`;
      bullet.style.top = `${playerYRef.current - 15}px`;
      bullet.speedX = 0;
      bullet.speedY = -10;
      gameContainer.appendChild(bullet);
      bulletsRef.current.push(bullet);
    }

    lastFireTimeRef.current = currentTime;
  };

  const enableAutoFire = () => {
    setInterval(() => {
      if (!isGameOverRef.current) {
        fireBullet(false);
      }
    }, 300);
  };

  const updateBullets = () => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) return;

    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const bullet = bulletsRef.current[i];
      const y = bullet.offsetTop + bullet.speedY;
      const x = bullet.offsetLeft + bullet.speedX;

      if (y < 0 || x < 0 || x > containerWidthRef.current) {
        gameContainer.removeChild(bullet);
        bulletsRef.current.splice(i, 1);
      } else {
        bullet.style.top = `${y}px`;
        bullet.style.left = `${x}px`;
      }
    }
  };

  const createPowerUp = () => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) return;

    if (Math.random() < 0.05) { // Aumentado temporariamente para testes
      const powerUp = document.createElement("div") as PowerUpElement;
      powerUp.className = "power-up";
      powerUp.style.left = `${Math.random() * (containerWidthRef.current - 20)}px`;
      powerUp.style.top = "0px";
      powerUp.speed = 1;
      gameContainer.appendChild(powerUp);
      powerUpsRef.current.push(powerUp);
      console.log("Power-up criado em", powerUp.style.left, powerUp.style.top);
    }
  };

  const updatePowerUps = () => {
    const gameContainer = gameContainerRef.current;
    const player = playerRef.current;
    if (!gameContainer || !player) return;

    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
      const powerUp = powerUpsRef.current[i];
      const y = powerUp.offsetTop + powerUp.speed;

      if (y > containerHeightRef.current) {
        gameContainer.removeChild(powerUp);
        powerUpsRef.current.splice(i, 1);
      } else {
        powerUp.style.top = `${y}px`;

        const playerRect = player.getBoundingClientRect();
        const powerUpRect = powerUp.getBoundingClientRect();
        const containerRect = gameContainer.getBoundingClientRect();

        // Ajustar coordenadas relativas ao gameContainer
        const playerLeft = playerRect.left - containerRect.left;
        const playerRight = playerRect.right - containerRect.left;
        const playerTop = playerRect.top - containerRect.top;
        const playerBottom = playerRect.bottom - containerRect.top;

        const powerUpLeft = powerUpRect.left - containerRect.left;
        const powerUpRight = powerUpRect.right - containerRect.left;
        const powerUpTop = powerUpRect.top - containerRect.top;
        const powerUpBottom = powerUpRect.bottom - containerRect.top;

        if (
          powerUpLeft < playerRight &&
          powerUpRight > playerLeft &&
          powerUpTop < playerBottom &&
          powerUpBottom > playerTop
        ) {
          console.log("Colisão detectada com power-up em", powerUpLeft, powerUpTop);
          gameContainer.removeChild(powerUp);
          powerUpsRef.current.splice(i, 1);
          setSpecialShots((prev) => {
            console.log("Special shots aumentado de", prev, "para", prev + 1);
            return prev + 1;
          });
        }
      }
    }
  };

  const createEnemy = () => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer || enemiesRef.current.length >= 8) return;

    if (Math.random() < 0.02) {
      const enemy = document.createElement("div") as EnemyElement;
      enemy.className = "enemy";
      const enemyType = Math.floor(Math.random() * 3);
      enemy.innerHTML = `<svg viewBox="0 0 100 100">
        ${
          enemyType === 0
            ? '<circle cx="50" cy="50" r="40" fill="#e74c3c" /><circle cx="30" cy="40" r="10" fill="#000" /><circle cx="70" cy="40" r="10" fill="#000" />'
            : enemyType === 1
            ? '<polygon points="10,50 50,10 90,50 50,90" fill="#9b59b6" /><circle cx="35" cy="45" r="8" fill="#000" /><circle cx="65" cy="45" r="8" fill="#000" />'
            : '<rect x="10" y="10" width="80" height="80" fill="#f39c12" /><rect x="25" y="30" width="15" height="15" fill="#000" /><rect x="60" y="30" width="15" height="15" fill="#000" />'
        }
      </svg>`;
      enemy.style.left = `${Math.random() * (containerWidthRef.current - 30)}px`;
      enemy.style.top = "0px";
      enemy.speed = Math.random() * 1 + 0.5;
      gameContainer.appendChild(enemy);
      enemiesRef.current.push(enemy);
    }
  };

  const updateEnemies = () => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) return;

    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const enemy = enemiesRef.current[i];
      const y = enemy.offsetTop + enemy.speed;

      if (y > containerHeightRef.current) {
        gameContainer.removeChild(enemy);
        enemiesRef.current.splice(i, 1);
      } else {
        enemy.style.top = `${y}px`;
      }
    }
  };

  const updateStars = () => {
    for (let i = 0; i < starsRef.current.length; i++) {
      const star = starsRef.current[i];
      let y = parseFloat(star.style.top) + star.speed;
      if (y > containerHeightRef.current) y = 0;
      star.style.top = `${y}px`;
    }
  };

  const checkCollisions = () => {
    const gameContainer = gameContainerRef.current;
    const player = playerRef.current;
    const scoreElement = scoreElementRef.current;
    const livesElement = livesElementRef.current;
    if (!gameContainer || !player || !scoreElement || !livesElement) return;

    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const bullet = bulletsRef.current[i];
      const bulletRect = bullet.getBoundingClientRect();

      for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
        const enemy = enemiesRef.current[j];
        const enemyRect = enemy.getBoundingClientRect();

        if (
          bulletRect.left < enemyRect.right + 5 &&
          bulletRect.right > enemyRect.left - 5 &&
          bulletRect.top < enemyRect.bottom + 5 &&
          bulletRect.bottom > enemyRect.top - 5
        ) {
          gameContainer.removeChild(bullet);
          gameContainer.removeChild(enemy);
          bulletsRef.current.splice(i, 1);
          enemiesRef.current.splice(j, 1);
          scoreRef.current += 10;
          scoreElement.textContent = `Score: ${scoreRef.current}`;
          break;
        }
      }
    }

    const playerRect = player.getBoundingClientRect();
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const enemy = enemiesRef.current[i];
      const enemyRect = enemy.getBoundingClientRect();

      if (
        playerRect.left < enemyRect.right &&
        playerRect.right > enemyRect.left &&
        playerRect.top < enemyRect.bottom &&
        playerRect.bottom > enemyRect.top
      ) {
        gameContainer.removeChild(enemy);
        enemiesRef.current.splice(i, 1);
        livesRef.current--;
        livesElement.textContent = `Lives: ${livesRef.current}`;
        if (livesRef.current <= 0) gameOver();
        break;
      }
    }
  };

  const gameOver = () => {
    const gameOverScreen = gameOverScreenRef.current;
    const finalScoreElement = finalScoreElementRef.current;
    if (!gameOverScreen || !finalScoreElement) return;

    isGameOverRef.current = true;
    finalScoreElement.textContent = `Score: ${scoreRef.current}`;
    gameOverScreen.style.display = "flex";
    cancelAnimationFrame(gameLoopIdRef.current);
  };

  const resetGame = () => {
    const gameContainer = gameContainerRef.current;
    const scoreElement = scoreElementRef.current;
    const livesElement = livesElementRef.current;
    const specialShotsElement = specialShotsElementRef.current;
    const gameOverScreen = gameOverScreenRef.current;
    if (!gameContainer || !scoreElement || !livesElement || !specialShotsElement || !gameOverScreen) return;

    while (bulletsRef.current.length > 0) {
      gameContainer.removeChild(bulletsRef.current[0]);
      bulletsRef.current.shift();
    }
    while (enemiesRef.current.length > 0) {
      gameContainer.removeChild(enemiesRef.current[0]);
      enemiesRef.current.shift();
    }
    while (powerUpsRef.current.length > 0) {
      gameContainer.removeChild(powerUpsRef.current[0]);
      powerUpsRef.current.shift();
    }
    while (starsRef.current.length > 0) {
      gameContainer.removeChild(starsRef.current[0]);
      starsRef.current.shift();
    }

    playerXRef.current = containerWidthRef.current / 2 - playerWidthRef.current / 2;
    playerYRef.current = containerHeightRef.current - playerHeightRef.current - 20;
    scoreRef.current = 0;
    livesRef.current = 5;
    setSpecialShots(0);
    isGameOverRef.current = false;

    scoreElement.textContent = `Score: ${scoreRef.current}`;
    livesElement.textContent = `Lives: ${livesRef.current}`;
    specialShotsElement.textContent = `Special Shots: ${specialShots}`;
    gameOverScreen.style.display = "none";

    createStars();
    startGame();
  };

  const gameLoop = () => {
    if (!isGameOverRef.current) {
      updatePlayer();
      updateBullets();
      createEnemy();
      updateEnemies();
      createPowerUp();
      updatePowerUps();
      updateStars();
      checkCollisions();
      gameLoopIdRef.current = requestAnimationFrame(gameLoop);
    }
  };

  const setupControls = () => {
    const gameContainer = gameContainerRef.current;
    const restartButton = document.getElementById("restart-button");
    if (!gameContainer || !restartButton) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") isLeftPressedRef.current = true;
      if (e.key === "ArrowRight" || e.key === "d") isRightPressedRef.current = true;
      if (e.key === " ") {
        if (specialShots > 0) {
          fireBullet(true);
        } else {
          fireBullet(false);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") isLeftPressedRef.current = false;
      if (e.key === "ArrowRight" || e.key === "d") isRightPressedRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const handleTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const containerRect = gameContainer.getBoundingClientRect();
      const touchX = touch.clientX - containerRect.left;
      playerXRef.current = touchX - playerWidthRef.current / 2;
      if (playerXRef.current < 0) playerXRef.current = 0;
      if (playerXRef.current > containerWidthRef.current - playerWidthRef.current)
        playerXRef.current = containerWidthRef.current - playerWidthRef.current;
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      if (specialShots > 0) fireBullet(true);
      else fireBullet(false);
    };

    gameContainer.addEventListener("touchmove", handleTouchMove);
    gameContainer.addEventListener("touchstart", handleTouchStart);
    restartButton.addEventListener("click", resetGame);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gameContainer.removeEventListener("touchmove", handleTouchMove);
      gameContainer.removeEventListener("touchstart", handleTouchStart);
      restartButton.removeEventListener("click", resetGame);
    };
  };

  const startGame = () => {
    setupControls();
    enableAutoFire();
    gameLoopIdRef.current = requestAnimationFrame(gameLoop);
  };

  return (
    <div className="flex flex-col items-center">
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
        <div
          id="special-shots"
          ref={specialShotsElementRef}
          className="absolute top-2.5 left-1/2 transform -translate-x-1/2 text-white text-lg"
        >
          Special Shots: {specialShots}
        </div>
        <svg
          id="player"
          ref={playerRef}
          className="absolute w-10 h-10"
          style={{ left: `${playerXRef.current}px`, top: `${playerYRef.current}px` }}
          viewBox="0 0 100 100"
        >
          <polygon points="50,0 100,100 50,70 0,100" fill="#3498db" />
          <rect x="45" y="70" width="10" height="20" fill="#e74c3c" />
        </svg>
        <div
          id="game-over"
          ref={gameOverScreenRef}
          className="absolute top-0 left-0 w-full h-full bg-black/80 text-white hidden flex-col justify-center items-center text-2xl z-10"
        >
          <div>Game Over</div>
          <div id="final-score" ref={finalScoreElementRef}>
            Score: 0
          </div>
          <button
            id="restart-button"
            className="mt-5 px-5 py-2.5 text-lg bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
          >
            Play Again
          </button>
        </div>
      </div>

      <style jsx>{`
        .power-up {
          position: absolute;
          width: 20px;
          height: 20px;
          background-color: #00ff00;
          border-radius: 50%;
        }
        .enemy {
          position: absolute;
          width: 30px;
          height: 30px;
        }
        .bullet {
          position: absolute;
          width: 10px;
          height: 20px;
          background-color: yellow;
        }
        .special-bullet {
          background-color: orange;
        }
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background-color: white;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
};

export default ArcadePage;