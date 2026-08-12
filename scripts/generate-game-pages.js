const fs = require('fs');
const path = require('path');

// Dados dos jogos com informações completas para SEO e monetização
const gamesData = {
    'puzzle': {
        title: 'Puzzle Master',
        description: 'Desafie sua mente com quebra-cabeças intricados e lógicos. Resolva puzzles únicos que testam sua capacidade de raciocínio e paciência.',
        keywords: 'puzzle, quebra-cabeça, lógica, jogo mental, desafio, PlayfulHub',
        genre: 'Quebra-cabeça',
        developer: 'PlayfulHub',
        features: 'Múltiplos níveis de dificuldade, interface intuitiva, sistema de pontuação',
        objective: 'Resolva todos os puzzles movendo as peças para formar a imagem correta.',
        controls: [
            { key: 'Mouse', action: 'Arrastar peças' },
            { key: 'Clique', action: 'Selecionar peça' },
            { key: 'R', action: 'Reiniciar puzzle' }
        ],
        tips: [
            'Comece pelas bordas do puzzle para ter uma base sólida',
            'Agrupe peças por cores ou padrões similares',
            'Use a imagem de referência como guia, mas não se limite a ela',
            'Se ficar travado, tente uma abordagem diferente - às vezes a solução está em outro lugar'
        ],
        tags: ['Puzzle', 'Lógica', 'Quebra-cabeça', 'Mental', 'Desafio'],
        relatedGames: ['rubiks_cube', 'strategy_game', 'chess']
    },
    'space_shooter': {
        title: 'Space Shooter',
        description: 'Reviva a era dourada dos jogos arcade com este shooter espacial clássico. Navegue pelo espaço, destrua inimigos e sobreviva às ondas de ataques alienígenas.',
        keywords: 'space shooter, arcade, nave espacial, tiro, ação, clássico, PlayfulHub',
        genre: 'Arcade / Ação',
        developer: 'PlayfulHub',
        features: 'Múltiplas armas, power-ups, sistema de pontuação, efeitos visuais',
        objective: 'Sobreviva às ondas de inimigos e alcance a maior pontuação possível.',
        controls: [
            { key: '⬅️➡️', action: 'Mover nave' },
            { key: 'Espaço', action: 'Atirar' },
            { key: 'P', action: 'Pausar jogo' }
        ],
        tips: [
            'Mantenha-se sempre em movimento para evitar tiros inimigos',
            'Colete power-ups sempre que possível para aumentar seu poder de fogo',
            'Priorize inimigos que se movem em padrões previsíveis',
            'Use as bordas da tela como vantagem tática'
        ],
        tags: ['Arcade', 'Ação', 'Espaço', 'Tiro', 'Clássico'],
        relatedGames: ['3d_shooter', 'visual_effects', 'snake']
    },
    'ded': {
        title: 'RPG Adventure Quest',
        description: 'Embarque em uma jornada épica estilo D&D. Explore masmorras, lute contra monstros e complete missões em um RPG de texto interativo.',
        keywords: 'RPG, aventura, D&D, masmorra, fantasia, roleplay, PlayfulHub',
        genre: 'RPG / Aventura',
        developer: 'PlayfulHub',
        features: 'Sistema de combate, inventário, múltiplas escolhas, narrativa rica',
        objective: 'Complete a aventura explorando masmorras e derrotando inimigos.',
        controls: [
            { key: 'Mouse', action: 'Navegar pelo jogo' },
            { key: 'Clique', action: 'Fazer escolhas' },
            { key: 'Números', action: 'Selecionar opções' }
        ],
        tips: [
            'Leia cuidadosamente todas as descrições para encontrar pistas importantes',
            'Gerencie seu inventário - alguns itens podem ser úteis mais tarde',
            'Nem todas as escolhas são óbvias - pense estrategicamente',
            'Explore todas as opções disponíveis antes de prosseguir'
        ],
        tags: ['RPG', 'Aventura', 'Fantasia', 'D&D', 'Narrativa'],
        relatedGames: ['strategy_game', 'chess', 'puzzle']
    },
    '3d_shooter': {
        title: '3D Shooter',
        description: 'First-person shooter no estilo clássico Doom. Navegue por um labirinto, atire em inimigos e sobreviva o máximo possível neste jogo de ação 3D.',
        keywords: '3D shooter, FPS, Doom, labirinto, ação, tiro, PlayfulHub',
        genre: 'FPS / Ação',
        developer: 'PlayfulHub',
        features: 'Gráficos 3D, múltiplas armas, labirinto complexo, sistema de vida',
        objective: 'Navegue pelo labirinto, elimine inimigos e sobreviva o máximo possível.',
        controls: [
            { key: 'WASD', action: 'Mover' },
            { key: 'Mouse', action: 'Mirar' },
            { key: 'Clique', action: 'Atirar' },
            { key: 'Shift', action: 'Correr' }
        ],
        tips: [
            'Use o som para localizar inimigos antes de vê-los',
            'Economize munição - nem sempre é necessário atirar',
            'Explore o labirinto para encontrar armas e itens úteis',
            'Mantenha-se em movimento para evitar ser pego de surpresa'
        ],
        tags: ['FPS', '3D', 'Ação', 'Tiro', 'Labirinto'],
        relatedGames: ['space_shooter', 'visual_effects', 'driving_simulator']
    },
    'chess': {
        title: 'Chess',
        description: 'Desafie sua mente em uma partida de xadrez contra uma IA com diferentes níveis de dificuldade. Melhore suas habilidades estratégicas neste jogo clássico.',
        keywords: 'xadrez, chess, estratégia, IA, inteligência artificial, tabuleiro, PlayfulHub',
        genre: 'Estratégia',
        developer: 'PlayfulHub',
        features: 'Múltiplos níveis de IA, interface intuitiva, sistema de movimentos legais',
        objective: 'Derrube o rei adversário usando estratégia e tática.',
        controls: [
            { key: 'Mouse', action: 'Selecionar e mover peças' },
            { key: 'Clique', action: 'Confirmar movimento' },
            { key: 'R', action: 'Reiniciar partida' }
        ],
        tips: [
            'Controle o centro do tabuleiro para ter mais opções táticas',
            'Desenvolva suas peças antes de atacar',
            'Proteja seu rei - a segurança é fundamental',
            'Estude padrões de abertura para começar bem suas partidas'
        ],
        tags: ['Xadrez', 'Estratégia', 'IA', 'Tabuleiro', 'Clássico'],
        relatedGames: ['strategy_game', 'puzzle', 'ded']
    },
    'tetris': {
        title: 'Tetris',
        description: 'O clássico dos anos 80 que nunca sai de moda! Organize as peças que caem e complete linhas para ganhar pontos neste jogo atemporal.',
        keywords: 'tetris, clássico, anos 80, puzzle, blocos, arcade, PlayfulHub',
        genre: 'Puzzle / Arcade',
        developer: 'PlayfulHub',
        features: 'Velocidade crescente, sistema de pontuação, efeitos visuais clássicos',
        objective: 'Complete linhas horizontais organizando as peças que caem.',
        controls: [
            { key: '⬅️➡️', action: 'Mover peça' },
            { key: '⬇️', action: 'Acelerar queda' },
            { key: '⬆️', action: 'Rotacionar peça' },
            { key: 'Espaço', action: 'Pausar' }
        ],
        tips: [
            'Mantenha a superfície plana - evite criar buracos',
            'Use a rotação para encaixar peças em espaços apertados',
            'Planeje alguns movimentos à frente',
            'Não tenha pressa - é melhor fazer movimentos corretos'
        ],
        tags: ['Tetris', 'Clássico', 'Puzzle', 'Arcade', 'Anos 80'],
        relatedGames: ['puzzle', 'snake', 'space_shooter']
    },
    'snake': {
        title: 'Snake Game',
        description: 'Jogo da cobrinha com visual moderno e mecânicas clássicas. Controle a cobra, colete comida e evite colidir com as paredes ou com seu próprio corpo.',
        keywords: 'snake, cobrinha, clássico, arcade, retro, moderno, PlayfulHub',
        genre: 'Arcade',
        developer: 'PlayfulHub',
        features: 'Visual moderno, controles suaves, sistema de pontuação, efeitos visuais',
        objective: 'Colete comida para crescer e alcance a maior pontuação possível.',
        controls: [
            { key: '⬅️➡️⬆️⬇️', action: 'Mover cobra' },
            { key: 'WASD', action: 'Mover cobra' },
            { key: 'Espaço', action: 'Pausar' }
        ],
        tips: [
            'Comece devagar para se acostumar com os controles',
            'Planeje seus movimentos para evitar se encurralar',
            'Use as bordas da tela como parte da estratégia',
            'Mantenha a calma quando a cobra ficar longa'
        ],
        tags: ['Snake', 'Cobrinha', 'Arcade', 'Retro', 'Clássico'],
        relatedGames: ['tetris', 'space_shooter', 'puzzle']
    },
    'strategy_game': {
        title: 'Strategy Empire',
        description: 'Construa, conquiste e supere oponentes neste jogo de estratégia. Gerencie recursos, construa impérios e domine o campo de batalha.',
        keywords: 'estratégia, império, construção, conquista, recursos, tático, PlayfulHub',
        genre: 'Estratégia',
        developer: 'PlayfulHub',
        features: 'Sistema de recursos, construção de edifícios, combate tático',
        objective: 'Construa um império forte e conquiste territórios inimigos.',
        controls: [
            { key: 'Mouse', action: 'Selecionar e mover unidades' },
            { key: 'Clique', action: 'Construir e atacar' },
            { key: 'Teclas 1-9', action: 'Selecionar grupos de unidades' }
        ],
        tips: [
            'Equilibre economia e militar - ambos são importantes',
            'Explore o mapa para encontrar recursos valiosos',
            'Use terreno elevado para vantagem tática',
            'Não subestime a importância de unidades de suporte'
        ],
        tags: ['Estratégia', 'Império', 'Construção', 'Tático', 'Recursos'],
        relatedGames: ['chess', 'ded', 'puzzle']
    },
    'rubiks_cube': {
        title: 'Rubiks Cube',
        description: 'Resolva o clássico cubo mágico em 3D! Gire as faces, organize as cores e teste suas habilidades de resolução de problemas.',
        keywords: 'rubik, cubo mágico, 3D, puzzle, cores, desafio, PlayfulHub',
        genre: 'Puzzle 3D',
        developer: 'PlayfulHub',
        features: 'Visualização 3D, rotação suave, sistema de embaralhamento',
        objective: 'Organize todas as faces do cubo para que cada uma tenha uma cor única.',
        controls: [
            { key: 'Mouse', action: 'Girar cubo' },
            { key: 'Clique + Arrastar', action: 'Rotacionar faces' },
            { key: 'R', action: 'Embaralhar' },
            { key: 'S', action: 'Resolver automaticamente' }
        ],
        tips: [
            'Comece resolvendo uma face completamente',
            'Aprenda algoritmos básicos para movimentos específicos',
            'Pratique a visualização espacial',
            'Não se desanime - o cubo é um desafio real!'
        ],
        tags: ['Rubik', 'Cubo Mágico', '3D', 'Puzzle', 'Cores'],
        relatedGames: ['puzzle', 'chess', 'strategy_game']
    },
    'archer': {
        title: 'The Archer',
        description: 'Teste sua pontaria neste jogo de arco e flecha! Acerte o balão vermelho e mostre suas habilidades de precisão e timing.',
        keywords: 'arco, flecha, pontaria, balão, precisão, timing, PlayfulHub',
        genre: 'Precisão / Arcade',
        developer: 'PlayfulHub',
        features: 'Física realista, sistema de pontuação, múltiplos alvos',
        objective: 'Acerte o balão vermelho com a flecha.',
        controls: [
            { key: 'Mouse', action: 'Ajustar ângulo' },
            { key: 'Clique + Arrastar', action: 'Ajustar força' },
            { key: 'Solte', action: 'Atirar flecha' }
        ],
        tips: [
            'Considere a gravidade e o vento ao mirar',
            'Pratique diferentes ângulos e forças',
            'Seja paciente - a precisão vem com a prática',
            'Observe o movimento do alvo antes de atirar'
        ],
        tags: ['Arco', 'Flecha', 'Pontaria', 'Precisão', 'Física'],
        relatedGames: ['space_shooter', '3d_shooter', 'visual_effects']
    },
    'lazy_gardner': {
        title: 'Lazy Gardener',
        description: 'Cultive um jardim zen pacífico que cresce com o tempo. Relaxe e observe sua criação florescer neste jogo meditativo.',
        keywords: 'jardim, zen, relaxante, meditativo, plantas, paz, PlayfulHub',
        genre: 'Simulação / Relaxante',
        developer: 'PlayfulHub',
        features: 'Crescimento automático, efeitos visuais suaves, música relaxante',
        objective: 'Cultive um belo jardim e observe-o crescer naturalmente.',
        controls: [
            { key: 'Mouse', action: 'Interagir com plantas' },
            { key: 'Clique', action: 'Plantar sementes' },
            { key: 'Scroll', action: 'Zoom in/out' }
        ],
        tips: [
            'Seja paciente - o crescimento leva tempo',
            'Experimente diferentes tipos de plantas',
            'Aproveite o momento - este jogo é sobre relaxar',
            'Observe os pequenos detalhes da natureza'
        ],
        tags: ['Jardim', 'Zen', 'Relaxante', 'Meditativo', 'Natureza'],
        relatedGames: ['gameoflife', 'visual_effects', 'puzzle']
    },
    'gameoflife': {
        title: 'Conways Game of Life',
        description: 'Simulação de autômatos celulares onde células vivem ou morrem baseadas em regras simples. Observe padrões complexos emergirem de regras simples.',
        keywords: 'conway, game of life, autômatos, celulares, simulação, matemática, PlayfulHub',
        genre: 'Simulação / Matemática',
        developer: 'PlayfulHub',
        features: 'Regras clássicas de Conway, padrões emergentes, controles de velocidade',
        objective: 'Observe como padrões complexos emergem de regras simples.',
        controls: [
            { key: 'Mouse', action: 'Adicionar/remover células' },
            { key: 'Espaço', action: 'Pausar/continuar' },
            { key: 'R', action: 'Reiniciar' },
            { key: '+/-', action: 'Ajustar velocidade' }
        ],
        tips: [
            'Comece com padrões simples e observe o que acontece',
            'Experimente diferentes configurações iniciais',
            'Alguns padrões são "voadores" - eles se movem pelo grid',
            'A beleza está na simplicidade das regras'
        ],
        tags: ['Conway', 'Autômatos', 'Simulação', 'Matemática', 'Padrões'],
        relatedGames: ['lazy_gardner', 'puzzle', 'strategy_game']
    },
    'driving_simulator': {
        title: 'Driving Simulator',
        description: 'Dirija pela cidade enquanto compete contra o computador para ver quem coleta mais moedas.',
        keywords: 'direção, simulador, carro, estrada, paisagem, PlayfulHub',
        genre: 'Simulação / Corrida',
        developer: 'PlayfulHub',
        features: 'Física de direção realista, paisagens bonitas, controles suaves',
        objective: 'Dirija com segurança e aproveite a paisagem.',
        controls: [
            { key: 'WASD', action: 'Acelerar/Frear/Steering' },
            { key: 'Espaço', action: 'Freio de mão' },
            { key: 'Shift', action: 'Marcha alta' }
        ],
        tips: [
            'Priorize as moedas mais próximas',
            'Observe onde as moedas reaparecem depois de um tempo',
            'Não se afaste muito da area central do mapa'
        ],
        tags: ['Direção', 'Simulador', 'Carro', 'Paisagem', 'Competitivo'],
        relatedGames: ['3d_shooter', 'visual_effects', 'lazy_gardner']
    },
    'visual_effects': {
        title: 'String Catcher',
        description: 'Capture notas musicais em cordas vibrantes neste jogo rítmico de arcade. Sincronize seus movimentos com a música e a física.',
        keywords: 'música, ritmo, cordas, notas, física, arcade, PlayfulHub',
        genre: 'Ritmo / Arcade',
        developer: 'PlayfulHub',
        features: 'Física de cordas realista, música sincronizada, efeitos visuais',
        objective: 'Capture as notas musicais que passam pelas cordas vibrantes.',
        controls: [
            { key: 'Mouse', action: 'Mover cursor' },
            { key: 'Clique', action: 'Capturar nota' },
            { key: 'Espaço', action: 'Pausar música' }
        ],
        tips: [
            'Sincronize seus movimentos com o ritmo da música',
            'Observe os padrões das cordas para prever onde as notas aparecerão',
            'Use a física a seu favor - as cordas se movem de forma previsível',
            'Relaxe e deixe a música guiar seus movimentos'
        ],
        tags: ['Música', 'Ritmo', 'Cordas', 'Física', 'Arcade'],
        relatedGames: ['space_shooter', 'archer', 'snake']
    },
    'poker': {
        title: 'Poker Texas Holdem',
        description: 'Jogue Poker Texas Holdem contra a IA ou online com amigos. Teste suas habilidades de blefe e estratégia neste clássico jogo de cartas.',
        keywords: 'poker, texas holdem, cartas, blefe, estratégia, IA, PlayfulHub',
        genre: 'Cartas / Estratégia',
        developer: 'PlayfulHub',
        features: 'IA inteligente, múltiplos jogadores, sistema de apostas',
        objective: 'Forme a melhor mão de poker e vença seus oponentes.',
        controls: [
            { key: 'Mouse', action: 'Selecionar ações' },
            { key: 'Clique', action: 'Apostar/Passar/Desistir' },
            { key: 'Números', action: 'Valor da aposta' }
        ],
        tips: [
            'Aprenda as mãos de poker e suas probabilidades',
            'Observe os padrões de jogo dos seus oponentes',
            'Não blefe demais - seja estratégico',
            'Gerencie seu bankroll cuidadosamente'
        ],
        tags: ['Poker', 'Cartas', 'Estratégia', 'Blefe', 'IA'],
        relatedGames: ['chess', 'strategy_game', 'ded']
    },
    'it_simulator': {
        title: 'Company Simulator',
        description: 'Um simulador simples e divertido do trabalho. Gerencie uma empresa, tome decisões e veja como suas escolhas afetam o negócio.',
        keywords: 'empresa, simulador, trabalho, gestão, decisões, negócio, PlayfulHub',
        genre: 'Simulação / Gestão',
        developer: 'PlayfulHub',
        features: 'Sistema de decisões, múltiplos departamentos, economia simulada',
        objective: 'Gerencie a empresa com sucesso tomando decisões estratégicas.',
        controls: [
            { key: 'Mouse', action: 'Navegar interface' },
            { key: 'Clique', action: 'Tomar decisões' },
            { key: 'Teclas 1-9', action: 'Ações rápidas' }
        ],
        tips: [
            'Equilibre diferentes aspectos da empresa',
            'Considere as consequências de longo prazo',
            'Mantenha os funcionários motivados',
            'Adapte-se às mudanças do mercado'
        ],
        tags: ['Empresa', 'Simulador', 'Gestão', 'Decisões', 'Negócio'],
        relatedGames: ['strategy_game', 'ded', 'chess']
    },
    'tabuleiro_galton': {
        title: 'Galton Board',
        description: 'Simulador simples do tabuleiro de Galton. Observe como as bolas se distribuem seguindo padrões probabilísticos fascinantes.',
        keywords: 'galton, tabuleiro, probabilidade, estatística, simulação, matemática, PlayfulHub',
        genre: 'Simulação / Matemática',
        developer: 'PlayfulHub',
        features: 'Física realista, visualização de probabilidades, múltiplas bolas',
        objective: 'Observe como as bolas se distribuem no tabuleiro de Galton.',
        controls: [
            { key: 'Mouse', action: 'Interagir com simulação' },
            { key: 'Espaço', action: 'Soltar bolas' },
            { key: 'R', action: 'Reiniciar simulação' }
        ],
        tips: [
            'Observe como a distribuição se aproxima de uma curva normal',
            'Experimente com diferentes números de bolas',
            'A probabilidade é fascinante - cada queda é aleatória',
            'A beleza está na repetição e nos padrões emergentes'
        ],
        tags: ['Galton', 'Probabilidade', 'Estatística', 'Simulação', 'Matemática'],
        relatedGames: ['gameoflife', 'puzzle', 'strategy_game']
    },
    'pinball': {
        title: 'Pinball',
        description: 'Jogue pinball clássico com física realista e múltiplos objetivos. Use as paletas para manter a bola em jogo e alcance a maior pontuação.',
        keywords: 'pinball, fliperama, paletas, física, arcade, clássico, PlayfulHub',
        genre: 'Arcade / Física',
        developer: 'PlayfulHub',
        features: 'Física realista, múltiplos objetivos, sistema de pontuação',
        objective: 'Mantenha a bola em jogo e alcance a maior pontuação possível.',
        controls: [
            { key: 'Z/X', action: 'Paletas esquerda/direita' },
            { key: 'Espaço', action: 'Lançar bola' },
            { key: 'Shift', action: 'Sacudir mesa' }
        ],
        tips: [
            'Timing é tudo - aprenda quando ativar as paletas',
            'Use o "nudge" (sacudir) com moderação',
            'Observe os padrões da bola para prever movimentos',
            'Foque em objetivos específicos para maximizar pontos'
        ],
        tags: ['Pinball', 'Fliperama', 'Física', 'Arcade', 'Clássico'],
        relatedGames: ['space_shooter', 'snake', 'tetris']
    },
    'voxel_city': {
        title: 'Voxel City Delivery',
        description: 'Explore uma vibrante cidade voxel, colete pacotes e entregue-os neste jogo 3D de mundo aberto. Dirija carros, ande a pé e complete missões de entrega!',
        keywords: 'voxel, cidade, delivery, entrega, 3D, mundo aberto, carros, simulação, PlayfulHub',
        genre: 'Mundo Aberto / Simulação',
        developer: 'PlayfulHub',
        features: 'Gráficos 3D voxel, ciclo dia/noite, veículos dirigíveis, minimapa, missões de entrega',
        objective: 'Encontre o alvo verde para pegar o pacote e entregue no alvo vermelho antes do tempo acabar!',
        controls: [
            { key: 'W/S', action: 'Mover frente/trás' },
            { key: 'A/D', action: 'Mover para os lados (a pé)' },
            { key: 'Mouse', action: 'Olhar ao redor / Girar' },
            { key: 'Espaço', action: 'Entrar/Sair do carro' },
            { key: 'Scroll', action: 'Zoom da câmera' }
        ],
        tips: [
            'Use o minimapa no canto inferior direito para localizar os alvos de coleta (verde) e entrega (vermelho)',
            'Carros são mais rápidos - aproxime-se de um e pressione Espaço para entrar',
            'Fique atento ao ciclo dia/noite - as luzes da cidade ajudam na navegação noturna',
            'Complete entregas rapidamente para acumular mais pontos!'
        ],
        tags: ['3D', 'Voxel', 'Mundo Aberto', 'Delivery', 'Carros', 'Simulação'],
        relatedGames: ['driving_simulator', '3d_shooter', 'strategy_game']
    },
    'voxel_arena': {
        title: 'Voxel Arena',
        description: 'Sobreviva em uma arena voxel vibrante neste hack n slash 3D. Enfrente ondas de inimigos, use habilidades especiais, evolua seu herói e derrote o boss final.',
        keywords: 'voxel, arena, hack and slash, ação, sobrevivência, 3D, habilidades, boss, PlayfulHub',
        genre: 'Ação / Hack n Slash',
        developer: 'PlayfulHub',
        features: 'Gráficos 3D voxel, ondas de inimigos, 4 habilidades especiais, upgrades roguelite, boss multi-fase',
        objective: 'Sobreviva às ondas de inimigos, suba de nível e derrote o boss final da arena.',
        controls: [
            { key: 'WASD', action: 'Mover o herói' },
            { key: 'Mouse', action: 'Mirar / girar câmera' },
            { key: 'Clique Esq.', action: 'Atacar' },
            { key: 'Clique Dir.', action: 'Defender' },
            { key: '1-4', action: 'Habilidades (Spin, Dash, Cura, Ultimate)' },
            { key: 'Scroll', action: 'Zoom da câmera' }
        ],
        tips: [
            'Use o Dash para escapar quando estiver cercado',
            'Guarde a Ultimate para grandes grupos de inimigos',
            'Fique em movimento para não ser encurralado',
            'Colete os orbes de XP para subir de nível e escolher upgrades'
        ],
        tags: ['3D', 'Voxel', 'Arena', 'Ação', 'Sobrevivência', 'Hack n Slash'],
        relatedGames: ['voxel_city', '3d_shooter', 'archer']
    }
};

// Função para gerar HTML dos controles
function generateControlsHTML(controls) {
    return controls.map(control => `
        <div class="control-item">
            <span class="control-key">${control.key}</span>
            <span>${control.action}</span>
        </div>
    `).join('');
}

// Função para gerar HTML das dicas
function generateTipsHTML(tips) {
    return tips.map((tip, index) => `
        <div class="tip-item">
            <span class="tip-number">${index + 1}</span>
            <span>${tip}</span>
        </div>
    `).join('');
}

// Função para gerar HTML das tags
function generateTagsHTML(tags) {
    return tags.map(tag => `<span class="tag">${tag}</span>`).join('');
}

// Função para gerar HTML dos jogos relacionados
function generateRelatedGamesHTML(relatedGames) {
    return relatedGames.map(gameId => {
        const game = gamesData[gameId];
        if (!game) return '';
        
        const iconMap = {
            'rubiks_cube': '🧩',
            'strategy_game': '🏰',
            'chess': '♟️',
            '3d_shooter': '🔫',
            'visual_effects': '🎵',
            'snake': '🐍',
            'space_shooter': '🚀',
            'archer': '🎯',
            'poker': '♠️',
            'it_simulator': '🏢',
            'tabuleiro_galton': '🧔',
            'pinball': '🎱',
            'voxel_city': '🏙️',
            'voxel_arena': '⚔️',
            'driving_simulator': '🚗'
        };
        
        return `
            <a href="/jogos/${gameId}" class="related-game">
                <div class="related-game-icon" style="background: linear-gradient(45deg, #e94560, #ff6b6b);">
                    ${iconMap[gameId] || '🎮'}
                </div>
                <div>
                    <div style="font-weight: bold;">${game.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${game.genre}</div>
                </div>
            </a>
        `;
    }).join('');
}

// Função para gerar uma página de jogo
function generateGamePage(gameId, gameData) {
    const template = fs.readFileSync(path.join(__dirname, '../templates/game-page-template.html'), 'utf8');
    
    const replacements = {
        '{{GAME_TITLE}}': gameData.title,
        '{{GAME_DESCRIPTION}}': gameData.description,
        '{{GAME_KEYWORDS}}': gameData.keywords,
        '{{GAME_GENRE}}': gameData.genre,
        '{{GAME_DEVELOPER}}': gameData.developer,
        '{{GAME_FEATURES}}': gameData.features,
        '{{GAME_OBJECTIVE}}': gameData.objective,
        // URL real do jogo (para onde o link deve levar)
        '{{GAME_PLAY_URL}}': `/${gameId}/`,
        '{{CONTROLS_HTML}}': generateControlsHTML(gameData.controls),
        '{{TIPS_HTML}}': generateTipsHTML(gameData.tips),
        '{{TAGS_HTML}}': generateTagsHTML(gameData.tags),
        '{{RELATED_GAMES_HTML}}': generateRelatedGamesHTML(gameData.relatedGames),
        '{{AD_SLOT_1}}': '1892478235', // Slot principal
        '{{AD_SLOT_2}}': '1892478236', // Slot secundário
        '{{GAME_IMAGE}}': `/assets/images/${gameId}_preview.png`,
        '{{GAME_PREVIEW_IMAGE}}': `../assets/images/${gameId}_preview.png`,
        // URL canônica da página de destino do jogo (SEO)
        '{{GAME_URL}}': `https://playfulhub.com.br/jogos/${gameId}`
    };
    
    let html = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
        html = html.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return html;
}

// Função principal para gerar todas as páginas
function generateAllGamePages() {
    const outputDir = path.join(__dirname, '../jogos');
    
    // Criar diretório se não existir
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Gerar páginas para cada jogo
    Object.entries(gamesData).forEach(([gameId, gameData]) => {
        const html = generateGamePage(gameId, gameData);
        const outputPath = path.join(outputDir, `${gameId}.html`);
        
        fs.writeFileSync(outputPath, html, 'utf8');
        console.log(`✅ Página gerada: ${gameId}.html`);
    });
    
    console.log(`\n🎉 Todas as ${Object.keys(gamesData).length} páginas de jogos foram geradas com sucesso!`);
    console.log(`📁 Páginas salvas em: ${outputDir}`);
}

// Executar se chamado diretamente
if (require.main === module) {
    generateAllGamePages();
}

module.exports = {
    gamesData,
    generateGamePage,
    generateAllGamePages
};
