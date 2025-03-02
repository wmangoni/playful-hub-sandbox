<lov-code>
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const AdventurePage = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

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
        gameState.mem.nextSceneSuccess = "goblin_fight_success";
        gameState.currentEnemy = {
          name: "Goblin",
          ac: 10,
          hp: 12,
          max_hp: 12,
          str: 10,
          dex: 10,
          con: 10,
          bba: 1,
        };
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
        gameState.mem.nextSceneSuccess = "goblin_fight_success";
        gameState.currentEnemy = {
          name: "Goblin",
          ac: 10,
          hp: 12,
          max_hp: 12,
          str: 10,
          dex: 10,
          con: 10,
          bba: 1,
        };
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
        gameState.mem.nextSceneSuccess = "wolf_fight_success";
        gameState.currentEnemy = {
          name: "Wolf",
          ac: 14,
          hp: 10,
          max_hp: 10,
          str: 12,
          dex: 8,
          con: 10,
          bba: 1,
        };
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
        gameState.currentEnemy = {
          name: "Wolf",
          ac: 14,
          hp: 10,
          max_hp: 10,
          str: 12,
          dex: 8,
          con: 10,
          bba: 1,
        };
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
        if (haveMoney(100)) {
          gameState.checkDifficulty = 4;
        } else {
          gameState.checkDifficulty = 14;
        }
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
        gameState.checkDifficulty = 20;
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
        gameState.checkDifficulty = 16;
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
        gameState.checkDifficulty = 6;
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
        gameState.player.maxHealth += 40;
        gameState.player.health = gameState.player.maxHealth;
        gameState.player.stats.str += 4;
        gameState.player.stats.bba += 2;
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
          nextScene: "crypt", // Assumindo que a cripta é outro caminho de saída. Você pode precisar de uma cena alternativa diferente se a cripta não for acessível a partir do poço.
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
      text: "A saída direita
