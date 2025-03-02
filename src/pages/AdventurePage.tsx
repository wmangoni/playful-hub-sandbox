
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const AdventurePage = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  
  // Game state
  const [gameState, setGameState] = useState({
    player: {
      class: "",
      health: 20,
      maxHealth: 20,
      gold: 5,
      xp: 0,
      inventory: [] as string[],
      stats: {} as any
    },
    mem: {} as any,
    currentScene: "start",
    currentEnemy: {
      name: "Wolf",
      ac: 12,
      hp: 12,
      max_hp: 12,
      str: 10,
      dex: 10,
      con: 10,
      bba: 1
    },
    log: [] as string[],
    pendingCheck: null,
    checkDifficulty: 10
  });

  // Character stats
  const characterStats = {
    warrior: {
      str: 16,
      dex: 12,
      con: 15,
      int: 8,
      luck: 8,
      bba: 2,
      armor: 6
    },
    wizard: {
      str: 8,
      dex: 14,
      con: 10,
      int: 17,
      luck: 12,
      bba: 1,
      armor: 2
    },
    rogue: {
      str: 10,
      dex: 17,
      con: 12,
      int: 14,
      luck: 10,
      bba: 1,
      armor: 4
    }
  };

  // Game scenes
  const scenes = {
    start: {
      text: "Você está na entrada da antiga Masmorra de Drakmor. Degraus de pedra esculpida levam para a escuridão. Lendas falam de tesouros dentro, mas também de armadilhas mortais e monstros temíveis. O ar está frio contra sua pele enquanto você observa a penumbra.",
      choices: [{
        text: "Entrar na masmorra",
        nextScene: "corridor"
      }, {
        text: "Inspecionar a entrada para armadilhas",
        nextScene: "entrance_inspection"
      }, {
        text: "Verificar seus suprimentos antes de entrar",
        nextScene: "check_supplies"
      }]
    },
    entrance_inspection: {
      text: "Você examina cuidadosamente a entrada. A alvenaria é antiga, mas sólida. Você nota algumas marcas de arranhões perto do chão - talvez de criaturas arrastando algo... ou alguém. Não parece haver nenhuma armadilha na entrada em si.",
      choices: [{
        text: "Entrar na masmorra",
        nextScene: "corridor"
      }, {
        text: "Verificar seus suprimentos antes de entrar",
        nextScene: "check_supplies"
      }]
    },
    corridor: {
      text: "Você entra em um longo corredor escuro. Suas tochas lançam sombras dançantes nas paredes de pedra. Você ouve gotejamento de água ao longe e um leve assobio de vento.",
      choices: [{
        text: "Continuar pelo corredor",
        nextScene: "corridor_end"
      }, {
        text: "Voltar para a entrada",
        nextScene: "start"
      }]
    },
    check_supplies: {
      text: "Você verifica seus suprimentos: uma adaga afiada, um pequeno saco de provisões, um cantil de água e uma tocha. Não é muito, mas terá que servir.",
      choices: [{
        text: "Entrar na masmorra",
        nextScene: "corridor"
      }, {
        text: "Voltar para a entrada",
        nextScene: "start"
      }]
    },
    corridor_end: {
      text: "Você chega ao fim do corredor onde ele se divide em três caminhos. À esquerda, você ouve um som metálico distante. À direita, há um odor estranho. E em frente, o corredor continua na escuridão.",
      choices: [{
        text: "Seguir para a esquerda",
        nextScene: "left_path"
      }, {
        text: "Seguir para a direita",
        nextScene: "right_path"
      }, {
        text: "Continuar em frente",
        nextScene: "forward_path"
      }]
    },
    victory: {
      text: "Você está triunfante na câmara, com a Espada Joia de Drakmor em sua mão e uma riqueza incomensurável a seus pés. Você superou os desafios da Masmorra de Drakmor e reivindicou seu maior tesouro! Lendas serão cantadas sobre seu nome!",
      choices: []
    },
    death: {
      text: "Sua saúde diminui para zero. A escuridão o reivindica enquanto você sucumbe aos seus ferimentos ou aos perigos da masmorra. Sua aventura termina aqui...",
      choices: []
    }
  };

  // Dice roll state
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [showDice, setShowDice] = useState(false);
  const [resultMessage, setResultMessage] = useState({ text: "", type: "" });

  // Handle character selection
  const handleSelectCharacter = (characterClass: string) => {
    setSelectedCharacter(characterClass);
  };

  // Start the game
  const handleStartGame = () => {
    if (!selectedCharacter) {
      alert("Escolha um personagem antes de iniciar a aventura.");
      return;
    }

    // Initialize game state based on selected character
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        class: selectedCharacter,
        stats: characterStats[selectedCharacter as keyof typeof characterStats],
        health: 20,
        maxHealth: 20
      },
      currentScene: "start"
    }));

    setGameStarted(true);
  };

  // Load a scene
  const loadScene = (sceneName: string) => {
    console.log("Loading scene:", sceneName);
    setGameState(prev => ({
      ...prev,
      currentScene: sceneName
    }));

    // Reset dice and result message
    setShowDice(false);
    setDiceResult(null);
    setResultMessage({ text: "", type: "" });
  };

  // Handle choice selection
  const handleChoice = (choice: any) => {
    if (choice.requiresCheck) {
      setGameState(prev => ({
        ...prev,
        mem: {
          nextSceneSuccess: scenes[`${choice.nextScene}_success`] ? `${choice.nextScene}_success` : choice.nextScene,
          nextSceneFailure: scenes[`${choice.nextScene}_failure`] ? `${choice.nextScene}_failure` : choice.nextScene,
          checkType: choice.checkType
        }
      }));
      setShowDice(true);
    } else {
      loadScene(choice.nextScene);
    }
  };

  // Roll dice function
  const rollDice = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setDiceResult(roll);

    setTimeout(() => {
      let checkSuccess = false;
      const currentScene = gameState.currentScene;
      const mem = gameState.mem;

      if (mem.checkType === "combat") {
        // Handle combat
        checkSuccess = true;
        addToLog("Iniciando combate...");
      } else {
        // Handle skill check
        let logMessage = `Resultado da rolagem de dado: ${roll} para o teste.`;
        
        // Check if success
        if (roll >= gameState.checkDifficulty) {
          checkSuccess = true;
          setResultMessage({ text: "Sucesso!", type: "success" });
          logMessage += " Sucesso no teste!";
        } else {
          setResultMessage({ text: "Falha!", type: "failure" });
          logMessage += " Falha no teste!";
        }
        
        addToLog(logMessage);
      }

      // Load next scene after delay
      setTimeout(() => {
        if (checkSuccess) {
          loadScene(mem.nextSceneSuccess || `${currentScene}_success`);
        } else {
          loadScene(mem.nextSceneFailure || `${currentScene}_failure`);
        }
      }, 1500);
    }, 1500);
  };

  // Helper functions
  const addToLog = (message: string) => {
    setGameState(prev => ({
      ...prev,
      log: [...prev.log, message]
    }));
  };

  const updateStatsDisplay = () => {
    // Update display (handled by React state)
  };

  useEffect(() => {
    console.log("Adventure Quest game loaded");
  }, []);

  // Current scene data
  const currentScene = scenes[gameState.currentScene as keyof typeof scenes] || scenes.start;

  return (
    <div className="min-h-screen font-serif bg-[#f5f1e6] text-[#333] p-5">
      <div className="max-w-3xl mx-auto bg-white border-2 border-[#7a5c3d] rounded-lg p-6 shadow-lg">
        <h1 className="text-4xl font-bold text-center text-[#8b0000] mb-2">A Masmorra de Drakmor</h1>
        <p className="text-center italic text-gray-600 mb-8">Uma Aventura Simples de D&D</p>

        {!gameStarted ? (
          // Character selection screen
          <div id="character-select">
            <h2 className="text-2xl font-bold text-center mb-6">Escolha o Seu Personagem</h2>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {Object.keys(characterStats).map((charClass) => (
                <div 
                  key={charClass}
                  className={`border-2 border-[#7a5c3d] rounded-md p-4 text-center cursor-pointer w-[180px] transition-all hover:-translate-y-1 hover:shadow-md ${
                    selectedCharacter === charClass ? 'border-[#8b0000] bg-[#f9e9e9]' : ''
                  }`}
                  onClick={() => handleSelectCharacter(charClass)}
                >
                  <h3 className="font-bold capitalize mb-2">
                    {charClass === 'warrior' ? 'Guerreiro' : 
                     charClass === 'wizard' ? 'Mago' : 
                     charClass === 'rogue' ? 'Ladino' : charClass}
                  </h3>
                  <p className="text-sm mb-2">
                    {charClass === 'warrior' ? 'Força e saúde elevadas, habilidoso com armas' : 
                     charClass === 'wizard' ? 'Mestre em magia arcana com feitiços poderosos' : 
                     charClass === 'rogue' ? 'Ágil e astuto, habilidoso em furtividade' : ''}
                  </p>
                  <p className="text-xs">
                    <strong>FOR:</strong> {characterStats[charClass as keyof typeof characterStats].str} <strong>DES:</strong> {characterStats[charClass as keyof typeof characterStats].dex} <br />
                    <strong>CON:</strong> {characterStats[charClass as keyof typeof characterStats].con} <strong>INT:</strong> {characterStats[charClass as keyof typeof characterStats].int}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-6">
              <button 
                onClick={handleStartGame}
                className="bg-[#7a5c3d] text-white px-5 py-2 rounded hover:bg-[#8b0000] transition-colors"
              >
                Começar Aventura
              </button>
            </div>
          </div>
        ) : (
          // Game screen
          <div id="game-screen">
            {/* Stats display */}
            <div className="flex justify-between bg-[#eee8d9] p-3 rounded mb-4">
              <div className="text-center">
                <div>Vida</div>
                <div className="font-bold text-lg">{gameState.player.health}</div>
              </div>
              <div className="text-center">
                <div>Ouro</div>
                <div className="font-bold text-lg">{gameState.player.gold}</div>
              </div>
              <div className="text-center">
                <div>Experiência</div>
                <div className="font-bold text-lg">{gameState.player.xp}</div>
              </div>
            </div>

            {/* Scene description */}
            <div className="border-l-4 border-[#8b0000] p-3 bg-[#f9f5eb] mb-4">
              {currentScene.text}
            </div>

            {/* Dice roll area */}
            {showDice && (
              <div className="flex items-center justify-center my-5">
                <div className="w-16 h-16 bg-white border-2 border-gray-800 rounded flex items-center justify-center text-2xl font-bold mx-3">
                  {diceResult !== null ? diceResult : "?"}
                </div>
                <button 
                  onClick={rollDice}
                  className="bg-[#7a5c3d] text-white px-4 py-2 rounded ml-4 hover:bg-[#8b0000] transition-colors"
                >
                  Rolar d20
                </button>
              </div>
            )}

            {/* Result message */}
            {resultMessage.text && (
              <div className={`p-4 my-4 rounded-md font-bold ${
                resultMessage.type === 'success' ? 'bg-[#d4edda] text-[#155724]' : 
                resultMessage.type === 'failure' ? 'bg-[#f8d7da] text-[#721c24]' : ''
              }`}>
                {resultMessage.text}
              </div>
            )}

            {/* Choices */}
            <div className="flex flex-col gap-3 my-4">
              {currentScene.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoice(choice)}
                  className="bg-[#7a5c3d] text-white px-4 py-2 rounded hover:bg-[#8b0000] transition-colors"
                >
                  {choice.text}
                </button>
              ))}
              
              {/* Show restart button for victory/death scenes */}
              {(gameState.currentScene === "victory" || gameState.currentScene === "death") && (
                <button
                  onClick={() => setGameStarted(false)}
                  className="bg-[#7a5c3d] text-white px-4 py-2 rounded hover:bg-[#8b0000] transition-colors mt-4"
                >
                  Jogar Novamente
                </button>
              )}
            </div>

            {/* Inventory */}
            <div className="bg-[#eee8d9] p-3 rounded mt-4">
              <h3 className="font-bold text-[#7a5c3d] mb-2">Inventário</h3>
              <div>
                {gameState.player.inventory.length === 0 ? (
                  "Mochila vazia!"
                ) : (
                  <ul className="list-disc pl-5">
                    {gameState.player.inventory.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Game log */}
            <div className="max-h-40 overflow-y-auto border border-gray-300 p-3 mt-4 italic text-sm text-gray-600">
              {gameState.log.map((entry, index) => (
                <p key={index}>{entry}</p>
              ))}
            </div>
          </div>
        )}

        {/* Return to hub button */}
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
    </div>
  );
};

export default AdventurePage;
