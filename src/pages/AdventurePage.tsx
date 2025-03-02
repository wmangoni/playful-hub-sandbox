
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const AdventurePage = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

  // Dice roll state
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [showDice, setShowDice] = useState(false);
  const [resultMessage, setResultMessage] = useState({ text: "", type: "" });

  // Game state
  const [gameState, setGameState] = useState({
    player: {
      class: "",
      health: 20,
      maxHealth: 20,
      gold: 5,
      xp: 0,
      inventory: [] as string[],
      stats: {} as any,
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
      bba: 1,
    },
    log: [] as string[],
    pendingCheck: null,
    checkDifficulty: 10,
  });

  // Utility functions
  const addToLog = (message: string) => {
    setGameState(prev => ({
      ...prev,
      log: [...prev.log, message],
    }));
  };

  const updateStatsDisplay = () => {
    // Update display (handled by React state)
  };

  const updateInventoryDisplay = () => {
    // No need to do anything - React will update the display based on state
  };

  const changeGold = (amount: number) => {
    setGameState(prev => {
      const newGold = prev.player.gold + amount;
      return {
        ...prev,
        player: {
          ...prev.player,
          gold: newGold < 0 ? 0 : newGold // No negative gold
        }
      };
    });
    updateStatsDisplay();
  };

  const changeXP = (amount: number) => {
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        xp: prev.player.xp + amount
      }
    }));
    updateStatsDisplay();
    addToLog(`Ganhou ${amount} de experiência!`);
  };

  const addToInventory = (item: string) => {
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        inventory: [...prev.player.inventory, item]
      }
    }));
    updateInventoryDisplay();
    addToLog(`Adicionado ${item} ao inventário.`);
  };

  const removeFromInventory = (item: string) => {
    setGameState(prev => {
      const index = prev.player.inventory.indexOf(item);
      if (index > -1) {
        const newInventory = [...prev.player.inventory];
        newInventory.splice(index, 1);
        return {
          ...prev,
          player: {
            ...prev.player,
            inventory: newInventory
          }
        };
      }
      return prev;
    });
    updateInventoryDisplay();
    addToLog(`Removido ${item} do inventário.`);
  };

  const haveMoney = (amount: number) => {
    if (amount < gameState.player.gold) {
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold - amount
        }
      }));
      return true;
    }
    return false;
  };

  const changeHealth = (amount: number) => {
    setGameState(prev => {
      let newHealth = prev.player.health + amount;
      
      // Cap health at max health
      if (newHealth > prev.player.maxHealth) {
        newHealth = prev.player.maxHealth;
      }
      
      // Check for death
      if (newHealth <= 0) {
        addToLog("Você morreu!");
        return {
          ...prev,
          player: {
            ...prev.player,
            health: 0
          },
          currentScene: "death"
        };
      }
      
      return {
        ...prev,
        player: {
          ...prev.player,
          health: newHealth
        }
      };
    });
  };

  // Character stats
  const characterStats = {
    warrior: {
      str: 16,
      dex: 12,
      con: 15,
      int: 8,
      luck: 8,
      bba: 2,
      armor: 6,
    },
    wizard: {
      str: 8,
      dex: 14,
      con: 10,
      int: 17,
      luck: 12,
      bba: 1,
      armor: 2,
    },
    rogue: {
      str: 10,
      dex: 17,
      con: 12,
      int: 14,
      luck: 10,
      bba: 1,
      armor: 4,
    },
  };

  // Game scenes
  const scenes = {
    start: {
      text: "Você está na entrada da antiga Masmorra de Drakmor. Degraus de pedra esculpida levam para a escuridão. Lendas falam de tesouros dentro, mas também de armadilhas mortais e monstros temíveis. O ar está frio contra sua pele enquanto você observa a penumbra.",
      choices: [
        {
          text: "Entrar na masmorra",
          nextScene: "corridor",
        },
        {
          text: "Inspecionar a entrada para armadilhas",
          nextScene: "entrance_inspection",
        },
        {
          text: "Verificar seus suprimentos antes de entrar",
          nextScene: "check_supplies",
        },
      ],
    },
    entrance_inspection: {
      text: "Você examina cuidadosamente a entrada. A alvenaria é antiga, mas sólida. Você nota algumas marcas de arranhões perto do chão - talvez de criaturas arrastando algo... ou alguém. Não parece haver nenhuma armadilha na entrada em si.",
      choices: [
        {
          text: "Entrar na masmorra",
          nextScene: "corridor",
        },
        {
          text: "Verificar seus suprimentos antes de entrar",
          nextScene: "check_supplies",
        },
      ],
    },
    check_supplies: {
      text: "Você faz um balanço de seus suprimentos escassos. Um pequeno cantil de água, um pouco de carne seca, um isqueiro para iniciar fogo e sua arma confiável. Você espera que seja o suficiente para o que quer que esteja esperando abaixo.",
      choices: [
        {
          text: "Entrar na masmorra",
          nextScene: "corridor",
        },
      ],
      onEnter: function () {
        addToInventory("Cantil de Água");
        addToInventory("Carne Seca");
        addToInventory("Isqueiro");
      },
    },
    corridor: {
      text: "O corredor se estende à sua frente, mal iluminado por fungos fosforescentes nas paredes. O ar é úmido e bolorento. Depois de caminhar por alguns minutos, você chega a uma bifurcação no caminho.",
      choices: [
        {
          text: "Pegar o caminho da esquerda",
          nextScene: "goblin_encounter",
        },
        {
          text: "Pegar o caminho da direita",
          nextScene: "treasure_room",
        },
      ],
    },
    goblin_encounter: {
      text: "Ao virar uma esquina, você fica cara a cara com um goblin rosnando! Ele é pequeno, mas cruel, empunhando um punhal enferrujado e vestindo uma armadura de couro esfarrapada. Ele sibila e se prepara para atacar!",
      choices: [
        {
          text: "Lutar contra o goblin",
          nextScene: "goblin_fight",
          requiresCheck: true,
          checkType: "combat",
        },
        {
          text: "Tentar passar furtivamente",
          nextScene: "goblin_stealth",
          requiresCheck: true,
          checkType: "stealth",
        },
        {
          text: "Tentar argumentar com ele",
          nextScene: "goblin_talk",
          requiresCheck: true,
          checkType: "persuasion",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          mem: {
            ...prev.mem,
            nextSceneSuccess: "goblin_fight_success"
          },
          currentEnemy: {
            name: "Goblin",
            ac: 10,
            hp: 12,
            max_hp: 12,
            str: 10,
            dex: 10,
            con: 10,
            bba: 1,
          }
        }));
      },
    },
    goblin_stealth: {
      text: "Você passa pelo goblin sem problemas!",
      choices: [
        {
          text: "Continuar pelo corredor",
          nextScene: "dark_chamber",
        },
        {
          text: "Voltar e lutar contra o goblin",
          nextScene: "goblin_fight",
          requiresCheck: true,
          checkType: "combat",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          mem: {
            ...prev.mem,
            nextSceneSuccess: "goblin_fight_success"
          },
          currentEnemy: {
            name: "Goblin",
            ac: 10,
            hp: 12,
            max_hp: 12,
            str: 10,
            dex: 10,
            con: 10,
            bba: 1,
          }
        }));
      },
    },
    goblin_fight_success: {
      text: "Você se mantém firme e se defende dos ataques do goblin. Após uma luta breve, mas intensa, o goblin tomba sangrando dando seu último suspiro.",
      choices: [
        {
          text: "Continuar pelo corredor",
          nextScene: "dark_chamber",
        },
      ],
      onEnter: function () {
        changeXP(25);
      },
    },
    treasure_room: {
      text: "O ar fica pesado com o cheiro de madeira envelhecida e metal polido quando você abre a porta rangendo. Diante de você, uma câmara brilha com a luz quente de mil reflexos dourados. Pilhas de moedas caem em cascata como cachoeiras congeladas, suas superfícies captando o brilho de antigas lanternas encantadas. No centro, um pedestal sustenta um único baú ornamentado, sua superfície gravada com runas que pulsam fracamente com energia arcana.",
      choices: [
        {
          text: "Pegar todos os tesouros!!!",
          nextScene: "getting_trasure",
        },
      ],
      onEnter: function () {
        addToInventory("Cristais da Caverna");
        addToInventory("Braceletes de ouro");
        changeGold(800);
      },
    },
    getting_trasure: {
      text: "Depois de pegar todas as coisas e colocar em sua mochila, um rosnado baixo e gutural ressoa atrás de você, enviando um arrepio pela sua espinha. Você se vira lentamente, sua respiração presa enquanto um lobo enorme emerge das sombras, com o pelo eriçado e os dentes à mostra em um rosnado. Seus olhos amarelos penetrantes se fixam nos seus, músculos tensos como molas, prontos para atacar ao menor movimento.",
      choices: [
        {
          text: "Tentar acalmar o lobo",
          nextScene: "wolf_calm",
          requiresCheck: true,
          checkType: "luck",
        },
        {
          text: "Lutar contra o lobo",
          nextScene: "wolf_fight",
          requiresCheck: true,
          checkType: "combat",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          mem: {
            ...prev.mem,
            nextSceneSuccess: "wolf_fight_success"
          },
          currentEnemy: {
            name: "Wolf",
            ac: 14,
            hp: 10,
            max_hp: 10,
            str: 12,
            dex: 8,
            con: 10,
            bba: 1,
          }
        }));
      },
    },
    wolf_fight_success: {
      text: "O lobo não aguenta os ferimentos e tomba perdendo a consciência aos seus pés.",
      choices: [
        {
          text: "Fugir de volta para a câmara",
          nextScene: "dark_chamber",
        },
      ],
      onEnter: function () {
        changeXP(25);
      },
    },
    wolf_fight_failure: {
      text: "O lobo da caverna é um inimigo formidável. Apesar de seus melhores esforços, ele o domina, infligindo feridas profundas. Você mal consegue escapar com vida, recuando pelo caminho que veio.",
      choices: [
        {
          text: "Fugir de volta para a câmara",
          nextScene: "dark_chamber",
        },
      ],
    },
    wolf_calm_success: {
      text: "Você estende a mão lentamente, falando em tons suaves. O lobo, surpreso com sua falta de agressão, hesita. Você nota o espinho em sua pata e se oferece para ajudar. Cautelosamente, ele permite que você remova o espinho. O alívio toma conta do lobo, e ele lambe sua mão em gratidão antes de recuar para o interior da caverna.",
      choices: [
        {
          text: "Atravessar o riacho agora",
          nextScene: "cavern_crossing",
          requiresCheck: true,
          checkType: "dex",
        },
        {
          text: "Retornar para a câmara",
          nextScene: "dark_chamber",
        },
      ],
      onEnter: function () {
        changeXP(20);
      },
    },
    wolf_calm_failure: {
      text: "O lobo não responde às suas tentativas de acalmá-lo. Ele permanece cauteloso e hostil, rosnando profundamente. Parece que ele não está disposto a confiar em você.",
      choices: [
        {
          text: "Lutar contra o lobo",
          nextScene: "wolf_fight",
          requiresCheck: true,
          checkType: "combat",
        },
        {
          text: "Recuar lentamente em direção a caverna sem desviar o olhar do lobo",
          nextScene: "cavern",
          requiresCheck: true,
          checkType: "luck",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          currentEnemy: {
            name: "Wolf",
            ac: 14,
            hp: 10,
            max_hp: 10,
            str: 12,
            dex: 8,
            con: 10,
            bba: 1,
          }
        }));
      },
    },
    dark_chamber: {
      text: "Você continua descendo a passagem, caminhando lentamente por 20 metros mais ou menos e à sua frente você tem uma câmara escura. Lá dentro não tem nada de interessante, apenas 2 portas de madeira antigas à sua frente",
      choices: [
        {
          text: "Porta esquerda",
          nextScene: "cavern",
        },
        {
          text: "Porta direita",
          nextScene: "cavern",
        },
      ],
    },
    cavern: {
      text: "Você caminha por um tempo até a entrada de um corredor escuro",
      choices: [
        {
          text: "Vá em frente e atravesse a caverna",
          nextScene: "cavern_crossing",
          requiresCheck: true,
          checkType: "dex",
        },
        {
          text: "Voltar para a câmara escura",
          nextScene: "dark_chamber",
        },
      ],
    },
    cavern_crossing_success: {
      text: "Você navega cuidadosamente pelas pedras escorregadias e pela correnteza rápida do riacho subterrâneo. Você chega ao outro lado, levemente molhado, mas ileso. Uma passagem estreita continua adiante a partir daqui.",
      choices: [
        {
          text: "Continue na passagem",
          nextScene: "crystal_cave",
        },
      ],
      onEnter: function () {
        changeXP(10);
      },
    },
    cavern_crossing_failure: {
      text: "Você erra um passo e escorrega nas pedras molhadas, mergulhando no riacho frio! Você consegue chegar ao outro lado, encharcado e tremendo. A passagem à frente parece pouco convidativa, mas voltar é tão frio quanto.",
      choices: [
        {
          text: "Continue na passagem, apesar de estar molhado",
          nextScene: "crystal_cave",
        },
        {
          text: "Retorne à câmara, pingando água",
          nextScene: "dark_chamber",
        },
      ],
      onEnter: function () {
        changeHealth(-2); // Penalidade menor de saúde por água fria
      },
    },
    crystal_cave: {
      text: "A passagem estreita se abre para uma caverna de cristal de tirar o fôlego. Paredes, teto e chão são cobertos por cristais brilhantes de vários tamanhos e cores, refletindo sua luz em um show deslumbrante. Mais adentro, você vê um caminho fraco serpenteando pelos cristais.",
      choices: [
        {
          text: "Siga o caminho mais fundo",
          nextScene: "crystal_path",
        },
        {
          text: "Examine os cristais mais de perto",
          nextScene: "crystal_examine",
        },
        {
          text: "Retorne ao riacho da caverna",
          nextScene: "cavern_crossing",
        },
      ],
    },
    crystal_path: {
      text: "Você segue o caminho sinuoso, os cristais se tornando mais densos e magníficos. O caminho leva a uma abertura maior - você sente que está se aproximando de algo significativo.",
      choices: [
        {
          text: "Prossiga com cautela",
          nextScene: "crystal_chamber",
        },
      ],
    },
    crystal_examine: {
      text: "Você tira um momento para examinar os cristais mais de perto. Eles são de qualidade excepcional, alguns irradiando uma leve luz interior. Você provavelmente poderia arrancar alguns...",
      choices: [
        {
          text: "Tente coletar alguns cristais",
          nextScene: "crystal_collect",
          requiresCheck: true,
          checkType: "dex",
        },
        {
          text: "Siga o caminho mais fundo",
          nextScene: "crystal_path",
        },
        {
          text: "Retorne ao riacho da caverna",
          nextScene: "cavern_crossing",
        },
      ],
    },
    crystal_collect_success: {
      text: "Trabalhando cuidadosamente para soltar alguns dos cristais mais acessíveis, você consegue coletar um punhado de belas joias. Elas são frias ao toque e podem valer uma pequena fortuna.",
      choices: [
        {
          text: "Continue mais fundo na caverna",
          nextScene: "crystal_path",
        },
      ],
      onEnter: function () {
        addToInventory("Cristais da Caverna");
        changeGold(8); // Valor estimado
      },
    },
    crystal_collect_failure: {
      text: "Ao tentar arrancar um cristal, você desaloja um pedaço maior de rocha. Ele cai, por pouco não atingindo seu pé e fazendo um barulho alto pela caverna. O barulho pode atrair atenção indesejada...",
      choices: [
        {
          text: "Continue mais fundo rapidamente",
          nextScene: "crystal_path",
        },
        {
          text: "Pare de coletar e apenas continue",
          nextScene: "crystal_path",
        },
      ],
    },
    crystal_chamber: {
      text: "O caminho se abre para uma grande câmara de cristal. Enormes formações de pilares de cristal se erguem do chão e pendem do teto, criando uma floresta de luz sobrenatural. No centro, em um estrado elevado de cristal puro, você vê um objeto cintilante. Este deve ser um tesouro significativo!",
      choices: [
        {
          text: "Aproxime-se do estrado",
          nextScene: "crystal_treasure_approach",
        },
        {
          text: "Procure outras saídas",
          nextScene: "crystal_cave_exits",
        },
      ],
    },
    crystal_cave_exits: {
      text: "Você examina as paredes da câmara de cristal. Além do caminho de onde você veio, você vê uma abertura estreita perto do chão, quase escondida atrás de um aglomerado de cristais maiores.",
      choices: [
        {
          text: "Investigue a abertura estreita",
          nextScene: "secret_passage_entrance",
        },
        {
          text: "Vasculhar aglomerado de cristais",
          nextScene: "crystal_treasure_approach",
        },
      ],
    },
    crystal_treasure_approach: {
      text: "Você vasculha o aglomerado de cristais e um tentáculo roxo e gosmento sai dentro do monte de criatis e agarra-lhe repentinamente",
      choices: [
        {
          text: "Arrebentar o tentaculo na força bruta",
          nextScene: "destroy_tentacle",
        },
        {
          text: "Cortar o tentaculo",
          nextScene: "cutting_tentacle",
        },
        {
          text: "Cortar seu próprio braço para escapar",
          nextScene: "cutting_arm",
        },
        {
          text: "Colocar o obejto mais próximo no tentaculo pra ver o que acontece",
          nextScene: "lost_money_tentacle",
        },
      ],
    },
    lost_money_tentacle: {
      text: "O objecto mais próximo é sua própria algibeira e é ela que você coloca no tentáculo para ver se ela te solta",
      choices: [
        {
          text: "Remover o tentáculo",
          nextScene: "remove_tentacle",
          requiresCheck: true,
          checkType: "luck",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          checkDifficulty: haveMoney(100) ? 4 : 14
        }));
      },
    },
    remove_tentacle_success: {
      text: "A algibeira pesada de moeadas chama a atenção do tentáculo fazendo-o lagar seu braço.",
      choices: [
        {
          text: "Se afastar dos tentáculos",
          nextScene: "tentacle_result_success",
        },
      ],
      onEnter: function () {
        changeXP(50);
      },
    },
    destroy_tentacle: {
      text: "Você segura firme o tentáculo e o puxa com toda a sua força na esperança de arrebentá-lo brutalmente.",
      choices: [
        {
          text: "E agora?",
          nextScene: "tentacle_result",
          requiresCheck: true,
          checkType: "str",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          checkDifficulty: 20
        }));
      },
    },
    cutting_tentacle: {
      text: "Você pega sua arma rapidamente sem pensar duas vezes e acerta o tentáculo na tentativa de corta-lo.",
      choices: [
        {
          text: "E agora?",
          nextScene: "tentacle_result",
          requiresCheck: true,
          checkType: "str",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          checkDifficulty: 16
        }));
      },
    },
    cutting_arm: {
      text: "Você não pensa duas vezes em cortar seu próprio braço na tentativa de se salvar, pois percebe rapidamente que o tentáculo é absurdamente forte e resistente e tentar golpeá-lo seria perda de tempo e você certamente morreria tentando.",
      choices: [
        {
          text: "E agora?",
          nextScene: "tentacle_result",
          requiresCheck: true,
          checkType: "str",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          checkDifficulty: 6
        }));
        changeHealth(-13);
      },
    },
    tentacle_result_success: {
      text: "Você conseuiu escapar da morte certa por muito pouco",
      choices: [
        {
          text: "Investigue a abertura estreita",
          nextScene: "secret_passage_entrance",
        },
      ],
      onEnter: function () {
        changeXP(20);
      },
    },
    tentacle_result_failure: {
      text: "Você subestimou a força do tentáculo e ele te puxa pra dentro do aglomerado de cristais onde outros tentáculos te agarram e espremem com força!",
      choices: [
        {
          text: "Gritar por socorro",
          nextScene: "death",
        },
      ],
    },
    secret_passage_entrance: {
      text: "A abertura estreita parece levar a um túnel toscamente esculpido. É escuro e apertado, mas pode oferecer um caminho alternativo... ou para outra parte da masmorra.",
      choices: [
        {
          text: "Aventure-se na passagem secreta",
          nextScene: "secret_passage",
        },
        {
          text: "Retorne ao centro da câmara de cristal",
          nextScene: "crystal_chamber",
        },
      ],
    },
    secret_passage: {
      text: "A passagem secreta é realmente apertada e empoeirada, mas parece inclinar para baixo. Depois de algum arrastar pela escuridão, o túnel começa a se alargar e você ouve o som distante de água pingando.",
      choices: [
        {
          text: "Continue mais fundo na passagem",
          nextScene: "underground_lake",
        },
      ],
    },
    underground_lake: {
      text: "A passagem se abre para uma grande caverna dominada por um lago subterrâneo. A água é escura e parada, refletindo a luz fraca do musgo fosforescente no teto. Uma jangada de madeira de aparência instável está amarrada a uma rocha perto da costa.",
      choices: [
        {
          text: "Pegue a jangada para atravessar o lago",
          nextScene: "lake_raft",
          requiresCheck: true,
          checkType: "dex",
        },
        {
          text: "Procure outro caminho ao redor do lago",
          nextScene: "lake_search",
        },
        {
          text: "Retorne à câmara de cristal",
          nextScene: "crystal_chamber",
        },
      ],
    },
    lake_raft_success: {
      text: "Equilibrando-se cuidadosamente na velha jangada, você usa uma vara improvisada para navegar pelo lago escuro. É uma jornada lenta e precária, mas você chega à costa oposta em segurança. A entrada de um túnel escuro espera.",
      choices: [
        {
          text: "Entre no túnel",
          nextScene: "final_chamber_entrance",
        },
      ],
      onEnter: function () {
        changeXP(20);
      },
    },
    lake_raft_failure: {
      text: "A jangada está mais podre do que parecia. No meio do lago, ela começa a se desfazer! Você mergulha na água gelada, lutando para nadar até a costa oposta. Você consegue, mas está congelando e perdeu alguns suprimentos.",
      choices: [
        {
          text: "Continue no túnel, tremendo",
          nextScene: "final_chamber_entrance",
        },
        {
          text: "Retorne à câmara de cristal, molhado e derrotado",
          nextScene: "crystal_chamber",
        },
      ],
      onEnter: function () {
        changeHealth(-5);
        removeFromInventory("Carne Seca"); // Perdeu alguns suprimentos
      },
    },
    lake_search: {
      text: "Você procura na beira do lago subterrâneo por outro caminho. Depois de algum tempo, você encontra uma saliência estreita ao longo da parede da caverna, logo acima do nível da água. Parece traiçoeiro.",
      choices: [
        {
          text: "Tente atravessar usando a saliência",
          nextScene: "lake_ledge_cross",
          requiresCheck: true,
          checkType: "dex",
        },
        {
          text: "Volte e pegue a jangada",
          nextScene: "lake_raft",
          requiresCheck: true,
          checkType: "dex",
        },
        {
          text: "Retorne à câmara de cristal",
          nextScene: "crystal_chamber",
        },
      ],
    },
    lake_ledge_cross_success: {
      text: "Com passos cuidadosos e pressionado contra a parede úmida da caverna, você segue pela saliência estreita. É uma caminhada estressante, mas você chega ao outro lado com sucesso, evitando a água fria completamente.",
      choices: [
        {
          text: "Entre no túnel à frente",
          nextScene: "final_chamber_entrance",
        },
      ],
      onEnter: function () {
        changeXP(25);
      },
    },
    lake_ledge_cross_failure: {
      text: "A saliência é muito estreita e escorregadia. No meio do caminho, seu pé escorrega e você perde o equilíbrio, caindo no lago gelado abaixo! Você nada até a costa oposta, encharcado e derrotado.",
      choices: [
        {
          text: "Continue no túnel, tremendo",
          nextScene: "final_chamber_entrance",
        },
        {
          text: "Retorne à câmara de cristal, admitindo a derrota",
          nextScene: "crystal_chamber",
        },
      ],
      onEnter: function () {
        changeHealth(-6);
      },
    },
    final_chamber_entrance: {
      text: "O túnel leva a uma câmara final e imponente. Tochas tremulam em arandelas de parede, lançando sombras dançantes pelas paredes ricamente decoradas. No centro da câmara, no topo de um estrado elevado, está um grande cofre ornamentado. Este deve ser o lendário tesouro de Drakmor!",
      choices: [
        {
          text: "Aproxime-se do cofre",
          nextScene: "final_treasure_approach_careful_failure",
        },
        {
          text: "Procure armadilhas na câmara primeiro",
          nextScene: "final_chamber_search",
          requiresCheck: true,
          checkType: "int",
        },
      ],
    },
    final_chamber_search_success: {
      text: "Seus olhos atentos notam linhas fracas gravadas no chão ao redor do estrado e pequenos buracos nas paredes perto do cofre. Mecanismos de armadilha, provavelmente placas de pressão e lançadores de dardos. Você anota cuidadosamente suas localizações.",
      choices: [
        {
          text: "Aproxime-se cuidadosamente do cofre",
          nextScene: "final_treasure_approach_careful",
          requiresCheck: true,
          checkType: "dex",
        },
      ],
      onEnter: function () {
        changeXP(20);
      },
    },
    final_chamber_search_failure: {
      text: "Você procura por armadilhas, mas a câmara está cheia de sombras e sua luz não é forte o suficiente para penetrá-las totalmente. Você não pode ter certeza se há alguma armadilha ou não.",
      choices: [
        {
          text: "Aproxime-se do cofre com cautela mesmo assim",
          nextScene: "final_treasure_approach",
        },
        {
          text: "Não corra riscos e retorne à câmara de cristal",
          nextScene: "crystal_chamber",
        },
      ],
    },
    final_treasure_approach: {
      text: "Respirando fundo, você decide se aproximar do cofre diretamente. Você caminha em direção ao estrado, seus sentidos em alerta máximo...",
      choices: [
        {
          text: "Continue até o cofre",
          nextScene: "final_treasure_open",
          requiresCheck: true,
          checkType: "luck",
        }, // Teste de sorte, pois você está indo às cegas para as armadilhas.
      ],
    },
    final_treasure_approach_careful_success: {
      text: "Usando seu conhecimento da localização das armadilhas, você cuidadosamente contorna as placas de pressão e evita acionar os lançadores de dardos. Você chega ao estrado e ao cofre em segurança. Sua cautela valeu a pena!",
      choices: [
        {
          text: "Abra o cofre",
          nextScene: "final_treasure_open_success",
        },
      ],
      onEnter: function () {
        changeXP(30);
      },
    },
    final_treasure_approach_careful_failure: {
      text: "Apesar de seus passos cuidadosos, você calcula mal a posição de uma placa de pressão. Há um clique e uma saraivada de dardos é disparada em sua direção de aberturas escondidas nas paredes! Você é atingido, mas consegue cambalear até o estrado.",
      choices: [
        {
          text: "Abra o cofre rapidamente!",
          nextScene: "final_treasure_open_success",
        },
      ],
      onEnter: function () {
        changeHealth(-5);
      },
    },
    final_treasure_open_success: {
      text: "Com um baque pesado, a tampa do cofre se abre! Dentro, aninhada em almofadas de veludo, está uma magnífica espada de joias. Ela irradia poder e magia ancestral. Moedas de ouro e joias se espalham ao redor dela, mais riqueza do que você jamais sonhou!",
      choices: [
        {
          text: "Reivindique o tesouro!",
          nextScene: "last_fight",
        },
      ],
      onEnter: function () {
        addToInventory("Espada Joia de Drakmor");
        changeGold(5000);
        changeXP(50);
        setGameState(prev => ({
          ...prev,
          player: {
            ...prev.player,
            maxHealth: prev.player.maxHealth + 40,
            health: prev.player.maxHealth + 40,
            stats: {
              ...prev.player.stats,
              str: (prev.player.stats.str || 0) + 4,
              bba: (prev.player.stats.bba || 0) + 2
            }
          }
        }));
      },
    },
    final_treasure_open_failure: {
      text: "Ao alcançar o cofre, o estrado abaixo de você cede! Você mergulha na escuridão, caindo com força em um poço escondido. O cofre e o tesouro permanecem tentadoramente fora de alcance acima de você.",
      choices: [
        {
          text: "Tente sair do poço",
          nextScene: "pit_escape",
          requiresCheck: true,
          checkType: "str",
        },
        {
          text: "Aceite a derrota e tente encontrar outra saída",
          nextScene: "crypt", // Assumindo que a cripta é outro caminho de saída.
        },
      ],
    },
    pit_escape_success: {
      text: "Usando toda a sua força, você encontra pontos de apoio nas paredes do poço e consegue subir de volta para o chão da câmara, machucado e ferido, mas determinado.",
      choices: [
        {
          text: "Tente abrir o cofre novamente",
          nextScene: "final_treasure_open",
        },
        {
          text: "Talvez este tesouro não valha a pena. Recue.",
          nextScene: "dark_chamber",
        },
      ],
      onEnter: function () {
        changeHealth(-3); // Lesão por cair no poço
      },
    },
    pit_escape_failure: {
      text: "As paredes do poço são muito lisas e íngremes para escalar. Você luta, mas não encontra apoio. Você está preso, sem como alcançar o tesouro acima.",
      choices: [
        {
          text: "Peça ajuda (se alguém puder ouvi-lo...)",
          nextScene: "death",
        }, // Final ruim - preso
        {
          text: "Procure outra saída no poço",
          nextScene: "death",
        }, // Outro final ruim - preso e desistindo
      ],
      onEnter: function () {
        changeHealth(-2); // Ferimentos leves por tentativa de fuga fracassada
      },
    },
    crypt: {
      text: "A saída direita da câmara escura leva a uma cripta. Sarcófagos de pedra revestem as paredes e o ar é pesado com o cheiro de poeira e pedra velha. A luz da lua entra pelas rachaduras no teto, lançando sombras misteriosas. Uma pesada porta de pedra está localizada na parede oposta.",
      choices: [
        {
          text: "Tente abrir a porta de pedra",
          nextScene: "crypt_door",
          requiresCheck: true,
          checkType: "str",
        },
        {
          text: "Examine os sarcófagos",
          nextScene: "crypt_sarcophagi",
        },
        {
          text: "Retorne à câmara escura",
          nextScene: "dark_chamber",
        },
      ],
    },
    crypt_door_success: {
      text: "Com um grunhido de esforço, você consegue mover a pesada porta de pedra. Ela se abre lentamente, revelando uma passagem escura além. Você ouve um leve sussurro de vento vindo de dentro.",
      choices: [
        {
          text: "Entre na passagem além",
          nextScene: "crypt_puzzle_entrance",
        },
      ],
      onEnter: function () {
        changeXP(15);
      },
    },
    crypt_door_failure: {
      text: "A porta de pedra é muito pesada e inflexível. Você se esforça contra ela, mas ela não se move. Parece selada.",
      choices: [
        {
          text: "Procure outra maneira de abri-la",
          nextScene: "crypt_puzzle_entrance",
        }, // Assumindo que haja um caminho de quebra-cabeça mesmo se a força falhar
        {
          text: "Examine os sarcófagos novamente",
          nextScene: "crypt_sarcophagi",
        },
        {
          text: "Retorne à câmara escura",
          nextScene: "dark_chamber",
        },
      ],
    },
    crypt_sarcophagi: {
      text: "Você examina os sarcófagos. Eles são feitos de pedra fria e cinza, alguns esculpidos com imagens de guerreiros de rosto severo e figuras vestidas com mantos. A tampa de um sarcófago parece ligeiramente torta...",
      choices: [
        {
          text: "Tente abrir o sarcófago torto",
          nextScene: "crypt_sarcophagus_open",
          requiresCheck: true,
          checkType: "intelligence",
        }, // Percepção para notar algo incomum
        {
          text: "Tente abrir a porta de pedra novamente",
          nextScene: "crypt_door",
          requiresCheck: true,
          checkType: "str",
        },
        {
          text: "Retorne à câmara escura",
          nextScene: "dark_chamber",
        },
      ],
    },
    crypt_sarcophagus_open_success: {
      text: "Com cuidado, você tenta levantar a tampa torta. Ela se move com surpreendente facilidade, revelando não ossos, mas um compartimento escondido! Dentro há uma pequena caixa ornamentada e um pergaminho enrolado.",
      choices: [
        {
          text: "Abra a caixa",
          nextScene: "crypt_box_open",
        },
        {
          text: "Leia o pergaminho",
          nextScene: "crypt_parchment_read",
        },
      ],
      onEnter: function () {
        changeXP(20);
      },
    },
    crypt_sarcophagus_open_failure: {
      text: "Você tenta abrir o sarcófago, mas ele é mais pesado do que parece. A tampa se move ligeiramente, mas permanece quase totalmente selada. Você não pode forçá-la a abrir sem fazer muito barulho.",
      choices: [
        {
          text: "Tente abrir a porta de pedra novamente",
          nextScene: "crypt_door",
          requiresCheck: true,
          checkType: "str",
        },
        {
          text: "Retorne à câmara escura",
          nextScene: "dark_chamber",
        },
      ],
    },
    crypt_box_open: {
      text: "Dentro da caixa ornamentada, você encontra uma chave de prata brilhante e um punhado de pedras preciosas.",
      choices: [
        {
          text: "Pegue a chave e as pedras preciosas",
          nextScene: "crypt_treasure_claimed",
        },
      ],
      onEnter: function () {
        addToInventory("Chave de Prata");
        addToInventory("Pedras Preciosas");
        changeGold(15); // Valor das pedras preciosas
        changeXP(25);
      },
    },
    crypt_parchment_read: {
      text: "O pergaminho é uma charada, escrita em uma caligrafia elegante: 'Eu tenho cidades, mas nenhuma casa; florestas, mas nenhuma árvore; água, mas nenhum peixe. O que eu sou?'",
      choices: [
        {
          text: "Resolver a charada",
          nextScene: "crypt_puzzle",
        },
        {
          text: "Deixe o pergaminho e tente a caixa",
          nextScene: "crypt_box_open",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          pendingCheck: "riddle" // Sinalizador para resolução de charadas na próxima cena
        }));
      },
    },
    crypt_puzzle_entrance: {
      text: "Atrás da pesada porta de pedra ou talvez acionada pela charada, uma seção da parede desliza para abrir, revelando uma câmara oculta. Símbolos estranhos estão gravados nas paredes e um padrão complexo de ladrilhos cobre o chão.",
      choices: [
        {
          text: "Tente resolver o quebra-cabeça de ladrilhos",
          nextScene: "crypt_puzzle",
          requiresCheck: true,
          checkType: "int",
        },
        {
          text: "Ignore o quebra-cabeça e retorne à cripta",
          nextScene: "crypt",
        },
      ],
      onEnter: function () {
        const isRiddleSolved = gameState.pendingCheck === "riddle";
        setGameState(prev => ({
          ...prev,
          checkDifficulty: isRiddleSolved ? 15 : 18 // Teste mais difícil se a charada for resolvida.
        }));
      },
    },
    crypt_puzzle: {
      text: "O quebra-cabeça de ladrilhos consiste em uma grade de símbolos. Você sente que pisar no ladrilho errado acionará uma armadilha. Você consegue discernir o caminho correto?",
      choices: [
        {
          text: "Tente resolver o quebra-cabeça",
          nextScene: "crypt_puzzle_result",
          requiresCheck: true,
          checkType: "int",
        },
      ], // Tipo de teste "puzzle" para resolver charadas/quebra-cabeças.
    },
    crypt_puzzle_result_success: {
      text: "Com cuidado ou talvez um lampejo de insight, você resolve o quebra-cabeça! Os ladrilhos se encaixam e você ouve um mecanismo se desativando. Uma porta secreta se abre nas proximidades, revelando uma câmara de tesouro!",
      choices: [
        {
          text: "Entre na câmara de tesouro",
          nextScene: "crypt_treasure_room",
        },
      ],
      onEnter: function () {
        changeXP(40);
      },
    },
    crypt_puzzle_result_failure: {
      text: "Você pisa no ladrilho errado! O chão treme e você ouve um clique. Dardos são disparados das paredes ou os ladrilhos sob seus pés se retraem, jogando você em um poço raso! Você evita o pior por pouco, mas definitivamente está em pior estado.",
      choices: [
        {
          text: "Tente resolver o quebra-cabeça novamente",
          nextScene: "crypt_puzzle",
          requiresCheck: true,
          checkType: "int",
        },
        {
          text: "Recue cautelosamente para a cripta",
          nextScene: "crypt",
        },
      ],
      onEnter: function () {
        changeHealth(-4);
      },
    },
    crypt_treasure_room: {
      text: "Você entra em uma pequena câmara cheia de tesouros brilhantes! Moedas de ouro estão empilhadas, baús transbordando de joias e artefatos antigos brilham à luz da tocha. É um tesouro digno de um rei ou de um aventureiro muito bem-sucedido!",
      choices: [
        {
          text: "Reúna o tesouro",
          nextScene: "crypt_treasure_gather",
        },
        {
          text: "Seja cauteloso, verifique se há mais armadilhas",
          nextScene: "crypt_treasure_traps",
          requiresCheck: true,
          checkType: "int",
        },
        {
          text: "Retorne à cripta",
          nextScene: "crypt",
        },
      ],
    },
    crypt_treasure_traps_success: {
      text: "Sua cautela se mostra sábia. Após uma inspeção mais detalhada, você descobre placas de pressão sutis ao redor das pilhas de tesouro e fios finos quase invisíveis contra o ouro brilhante. Você desarma cuidadosamente as armadilhas mais óbvias.",
      choices: [
        {
          text: "Agora reúna o tesouro",
          nextScene: "crypt_treasure_gather",
        },
      ],
      onEnter: function () {
        changeXP(30);
      },
    },
    crypt_treasure_traps_failure: {
      text: "Apesar de suas tentativas de encontrar armadilhas, você não vê uma placa de pressão oculta. Ao entrar mais na câmara de tesouro, você ouve um estalo agudo! Uma rede cai do teto, prendendo você!",
      choices: [
        {
          text: "Lute contra a rede",
          nextScene: "crypt_net_escape",
          requiresCheck: true,
          checkType: "strength",
        },
        {
          text: "Tente desembaraçar a rede com cuidado",
          nextScene: "crypt_net_untangle",
          requiresCheck: true,
          checkType: "dex",
        },
      ],
      onEnter: function () {
        changeHealth(-2); // Dano leve da armadilha de rede
      },
    },
    crypt_net_escape_success: {
      text: "Com força bruta, você se esforça contra a rede, testando seus pontos fracos. Cordas se partem e rasgam, e você consegue se libertar, embora a rede agora esteja em farrapos.",
      choices: [
        {
          text: "Finalmente reúna o tesouro!",
          nextScene: "crypt_treasure_gather",
        },
      ],
      onEnter: function () {
        changeHealth(-3); // Esforço adicional para escapar da rede
      },
    },
    crypt_net_escape_failure: {
      text: "Você luta contra a rede, mas ela é muito forte. Quanto mais você se debate, mais apertada ela parece prendê-lo. Você está preso, pelo menos por enquanto.",
      choices: [
        {
          text: "Tente desembaraçar a rede com mais cuidado",
          nextScene: "crypt_net_untangle",
          requiresCheck: true,
          checkType: "dex",
        },
        {
          text: "Desista do tesouro e tente escapar da rede",
          nextScene: "crypt_net_escape_give_up",
        }, // Nova rota de fuga se o tesouro for abandonado
      ],
      onEnter: function () {
        changeHealth(-4); // Mais dano por lutar
      },
    },
    crypt_net_untangle_success: {
      text: "Com dedos ágeis e movimentos cuidadosos, você trabalha nos nós da rede. Lentamente, mas com segurança, você cria folga e, eventualmente, se liberta. Levou tempo e paciência, mas você não está mais preso.",
      choices: [
        {
          text: "Agora, cautelosamente, reúna o tesouro",
          nextScene: "crypt_treasure_gather",
        },
      ],
      onEnter: function () {
        changeXP(20); // XP por inteligência
      },
    },
    crypt_net_untangle_failure: {
      text: "Os nós da rede são muito complexos ou seus dedos são muito desajeitados em sua pressa e pânico. Você parece não conseguir se desembaraçar. A rede permanece firmemente no lugar.",
      choices: [
        {
          text: "Lute novamente com força bruta",
          nextScene: "crypt_net_escape",
          requiresCheck: true,
          checkType: "str",
        },
        {
          text: "Desista do tesouro e tente escapar da rede",
          nextScene: "crypt_net_escape_give_up",
        },
      ],
    },
    crypt_net_escape_give_up: {
      text: "Percebendo que o tesouro pode ser muito arriscado, você concentra todos os seus esforços em apenas escapar da rede. Você procura um mecanismo de liberação ou outra fraqueza na armadilha...",
      choices: [
        {
          text: "Aceite seu destino...",
          nextScene: "death_net_trap",
        },
      ],
      onEnter: function () {
        changeHealth(-5); // Dano final da armadilha e desespero
      },
    },
    death_net_trap: {
      text: "Preso e exausto, você sucumbe aos seus ferimentos ou aos outros perigos da masmorra. Sua aventura termina aqui, em uma câmara de tesouro que você não conseguiu reivindicar.",
      choices: [], // Sem escolhas em uma cena de morte. Fim de jogo.
    },
    crypt_treasure_gather: {
      text: "Você cuidadosamente junta punhados de moedas de ouro, coloca joias em suas bolsas e admira os artefatos antigos. Você acumulou um tesouro significativo da cripta!",
      choices: [
        {
          text: "Deixe a cripta, carregado de tesouro",
          nextScene: "crypt_exit",
        },
      ],
      onEnter: function () {
        changeGold(100); // Grande recompensa de ouro pelo tesouro da cripta
        addToInventory("Artefatos Antigos");
        changeXP(50); // Grande XP por tesouro!
      },
    },
    crypt_exit: {
      text: "Você retorna sobre seus passos, deixando a cripta e voltando para a câmara escura...",
      choices: [
        {
          text: "Continue explorando a masmorra",
          nextScene: "crystal_chamber",
        },
        {
          text: "Deixe a masmorra com seu saque",
          nextScene: "victory_partial",
        },
      ],
    },
    victory_partial: {
      text: "Você emerge da Masmorra de Drakmor, piscando sob a luz do sol. Você está cansado e talvez ferido, mas também significativamente mais rico e experiente. Você enfrentou a masmorra e reivindicou uma parte de seu tesouro. Talvez você retorne um dia para se aprofundar mais...",
      choices: [], // Fim deste caminho por enquanto.
    },
    last_fight: {
      text: "De repente, um grito estridente ecoou pela masmorra, interrompendo o silêncio sepulcral. Um arrepio percorreu a espinha do aventureiro, e ele se virou para ver o que causou o barulho. \nAtrás dele, na escuridão que se estendia além da luz da tocha, uma figura fantasmagórica emergiu das sombras. Era alto, emaciado, com olhos vermelhos brilhantes e uma estrutura esquelética. Sua pele era pálida e translúcida, revelando as veias e os músculos por baixo. \nEle usava vestes esfarrapadas e carregava uma foice pingando sangue. Ele se movia com uma graça sobrenatural, seus passos silenciosos e seus movimentos rápidos. \nA presença do espectro encheu o ar com um sentimento palpável de maldade e terror. O espectro avançou, seu olhar fixo no aventureiro. Ele ergueu sua foice, pronto para atacar.",
      choices: [
        {
          text: "Lutar contra o fantasma de Drakmor",
          nextScene: "pre_victory",
          requiresCheck: true,
          checkType: "combat",
        },
      ],
      onEnter: function () {
        setGameState(prev => ({
          ...prev,
          currentEnemy: {
            name: "Fantasma de Drakmor",
            ac: 18,
            hp: 40,
            max_hp: 40,
            str: 16,
            dex: 14,
            con: 10,
            bba: 4,
          }
        }));
      },
    },
    pre_victory: {
      text: "O último golpe mortal é desferido no fantasma fazendo-o urrar de dor em seu último lamento da eternidade! O fantasma brilha forte antes de explodir em uma esfera de energia magnética que faz a caverna estremecer e começar a desmoronar!",
      choices: [
        {
          text: "Fugir correndo da caverna",
          nextScene: "victory",
        },
      ],
    },
    victory: {
      text: "Você está triunfante na câmara, com a Espada Joia de Drakmor em sua mão e uma riqueza incomensurável a seus pés. Você superou os desafios da Masmorra de Drakmor e reivindicou seu maior tesouro! Lendas serão cantadas sobre seu nome!",
      choices: [], // Vitória verdadeira, fim de jogo.
    },
    death: {
      text: "Sua saúde diminui para zero. A escuridão o reivindica enquanto você sucumbe aos seus ferimentos ou aos perigos da masmorra. Sua aventura termina aqui...",
      choices: [], // Fim de jogo
    },
    crypt_treasure_claimed: {
      text: "Você guarda cuidadosamente os tesouros encontrados em sua bolsa.",
      choices: [
        {
          text: "Ler o pergaminho agora",
          nextScene: "crypt_parchment_read",
        },
        {
          text: "Retornar à cripta",
          nextScene: "crypt",
        },
      ],
    },
    tentacle_result: {
      // Scene for success/failure handling of tentacle checks
      text: "Você luta contra o tentáculo com toda sua força!",
      choices: [],
      // This is a transitional scene, will be redirected based on check results
    },
  };

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
    setGameState((prev) => ({
      ...prev,
      player: {
        ...prev.player,
        class: selectedCharacter,
        stats: characterStats[selectedCharacter as keyof typeof characterStats],
        health: 20,
        maxHealth: 20,
      },
      currentScene: "start",
    }));

    setGameStarted(true);
  };

  // Load a scene
  const loadScene = (sceneName: string) => {
    console.log("Loading scene:", sceneName);
    setGameState((prev) => ({
      ...prev,
      currentScene: sceneName,
    }));

    // Execute onEnter function if it exists for the scene
    setTimeout(() => {
      const scene = scenes[sceneName as keyof typeof scenes];
      if (scene && scene.onEnter && typeof scene.onEnter === 'function') {
        scene.onEnter();
      }
    }, 0);

    // Reset dice and result message
    setShowDice(false);
    setDiceResult(null);
    setResultMessage({ text: "", type: "" });
  };

  // Handle choice selection
  const handleChoice = (choice: any) => {
    if (choice.requiresCheck) {
      setGameState((prev) => ({
        ...prev,
        mem: {
          ...prev.mem,
          nextSceneSuccess: scenes[`${choice.nextScene}_success`]
            ? `${choice.nextScene}_success`
            : choice.nextScene,
          nextSceneFailure: scenes[`${choice.nextScene}_failure`]
            ? `${choice.nextScene}_failure`
            : choice.nextScene,
          checkType: choice.checkType,
        },
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

  useEffect(() => {
    console.log("Adventure Quest game loaded");
  }, []);

  // Current scene data
  const currentScene =
    scenes[gameState.currentScene as keyof typeof scenes] || scenes.start;

  return (
    <div className="min-h-screen font-serif bg-[#f5f1e6] text-[#333] p-5">
      <div className="max-w-3xl mx-auto bg-white border-2 border-[#7a5c3d] rounded-lg p-6 shadow-lg">
        <h1 className="text-4xl font-bold text-center text-[#8b0000] mb-2">
          A Masmorra de Drakmor
        </h1>
        <p className="text-center italic text-gray-600 mb-8">
          Uma Aventura Simples de D&D
        </p>

        {!gameStarted ? (
          // Character selection screen
          <div id="character-select">
            <h2 className="text-2xl font-bold text-center mb-6">
              Escolha o Seu Personagem
            </h2>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {Object.keys(characterStats).map((charClass) => (
                <div
                  key={charClass}
                  className={`border-2 border-[#7a5c3d] rounded-md p-4 text-center cursor-pointer w-[180px] transition-all hover:-translate-y-1 hover:shadow-md ${
                    selectedCharacter === charClass
                      ? "border-[#8b0000] bg-[#f9e9e9]"
                      : ""
                  }`}
                  onClick={() => handleSelectCharacter(charClass)}
                >
                  <h3 className="font-bold capitalize mb-2">
                    {charClass === "warrior"
                      ? "Guerreiro"
                      : charClass === "wizard"
                      ? "Mago"
                      : charClass === "rogue"
                      ? "Ladino"
                      : charClass}
                  </h3>
                  <p className="text-sm mb-2">
                    {charClass === "warrior"
                      ? "Força e saúde elevadas, habilidoso com armas"
                      : charClass === "wizard"
                      ? "Mestre em magia arcana com feitiços poderosos"
                      : charClass === "rogue"
                      ? "Ágil e astuto, habilidoso em furtividade"
                      : ""}
                  </p>
                  <p className="text-xs">
                    <strong>FOR:</strong>{" "}
                    {
                      characterStats[charClass as keyof typeof characterStats]
                        .str
                    }{" "}
                    <strong>DES:</strong>{" "}
                    {
                      characterStats[charClass as keyof typeof characterStats]
                        .dex
                    }{" "}
                    <br />
                    <strong>CON:</strong>{" "}
                    {
                      characterStats[charClass as keyof typeof characterStats]
                        .con
                    }{" "}
                    <strong>INT:</strong>{" "}
                    {
                      characterStats[charClass as keyof typeof characterStats]
                        .int
                    }
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
                <div className="font-bold text-lg">
                  {gameState.player.health}
                </div>
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
              <div
                className={`p-4 my-4 rounded-md font-bold ${
                  resultMessage.type === "success"
                    ? "bg-[#d4edda] text-[#155724]"
                    : resultMessage.type === "failure"
                    ? "bg-[#f8d7da] text-[#721c24]"
                    : ""
                }`}
              >
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
              {(gameState.currentScene === "victory" ||
                gameState.currentScene === "death") && (
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
