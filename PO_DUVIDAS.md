# ❓ Relatório de Dúvidas e Percalços do Product Owner (PO)

Olá! Como PO experiente, fiz uma varredura cuidadosa no backlog e nas bases de código dos minijogos existentes no **Playful Hub**. Encontrei um percalço de design/alinhamento crítico que precisa de sua atenção, além de ter completado com sucesso a especificação de outra tarefa.

Abaixo estão os detalhes das minhas observações e as dúvidas estratégicas que precisamos sanar.

---

## 🚨 1. Percalço Crítico: Incompatibilidade Funcional no Voxel City (TASK-VOXEL_CITY)

Durante a análise para selecionar qual tarefa refinar, identifiquei uma discrepância severa entre a especificação da tarefa e a base de código real para o jogo **Voxel City**:

*   **O que diz a Especificação ([TASK_002.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_city/TASKS/TASK_002.md))**:
    A tarefa descreve o jogo como um **Construtor de Cidades Sandbox (SimCity Clone)**, onde o jogador age como um "prefeito virtual", gerencia a demanda **RCI (Residencial, Comercial, Industrial)**, configura impostos de 0% a 20%, posiciona Corpo de Bombeiros e Delegacias para conter criminalidade e apagar incêndios, e defende a cidade contra terremotos e desastres naturais.
*   **O que a Base de Código Real faz ([index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_city/index.html))**:
    A base de código em Three.js é, na verdade, um **Simulador de Entrega de Carga 3D em Mundo Aberto (Estilo GTA V / Crazy Taxi)**. O jogador controla um personagem voxel em 3D, pode andar pelas calçadas, entrar e dirigir um carro, interagir com semáforos, semear pedestres e coletar pacotes de um pedestre verde neon para entregar a outro pedestre vermelho. Não existe qualquer mecânica de construção de blocos, zoneamento, prefeitura ou simulação urbana sistêmica.

### ✅ Perguntas para Alinhamento (Respondidas e Aprovadas pelo Tech Lead):

1.  **Mudança de Gênero do Jogo (Resolvido)**: **Não pivotaremos para Construtor de Cidades**. Seria extremamente ineficiente e arriscado refazer 90% da engine gráfica em Three.js. Vamos preservar e valorizar o excelente trabalho já feito no simulador 3D de mundo aberto e condução de veículos.
2.  **Solução Recomendada pelo PO (Aprovada pelo Tech Lead) - ✅ LIDA E CONFIRMADA**: Aprovada com louvor! Manteremos a temática de **Entrega/Mundo Aberto (GTA / Crazy Taxi)**. A especificação da `TASK_002.md` do Voxel City deve ser inteiramente redefinida pelo PO para focar nos seguintes pilares de jogabilidade e mecânicas:
    *   **Sistema de Reputação e Nível de Procura Policial (Wanted Level)**: Perseguição policial ativa caso o jogador cause muitos danos ou atropele pedestres, adicionando adrenalina.
    *   **Hangar/Garagem e Upgrade de Veículos**: Utilização do dinheiro recebido nas entregas para comprar veículos novos com atributos específicos (velocidade máxima, tração, frenagem e resistência a colisões).
    *   **Tipos Especiais de Cargas e Clientes**: Cargas frágeis (com barra de integridade física), entregas expressas de altíssima velocidade, ou passageiros VIP exigentes.

> [!TIP]
> **Próximo Passo para o PO**: Pode prosseguir com a reescrita completa da [TASK_002.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_city/TASKS/TASK_002.md) focando nessas mecânicas de condução/entrega/perseguição. O backlog global de `Voxel City` será atualizado para refletir esse novo escopo!

---

> [!WARNING]
> Devido a essa severa incompatibilidade, **optei por não refinar a TASK-VOXEL_CITY** neste momento, mantendo-a em `📋 Backlog` até que você possa decidir o direcionamento estratégico do jogo.

---

## 🛰️ 2. Especificação e Refinamento Concluídos: Three.js Earth (TASK-THREEJS_EARTH)

Para manter o fluxo de trabalho ativo e produtivo, selecionei o jogo **Three.js Earth** que estava no `📋 Backlog` e realizei seu refinamento técnico completo no arquivo [TASK_002.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/threejs-earth-main/TASKS/TASK_002.md):

*   **O que foi feito**: 
    *   Mapeei e detalhei a **modelagem matemática e geométrica tridimensional** (`THREE.Group` procedurais) dos satélites artificiais e seus painéis solares neon para garantir performance premium a 60 FPS sem assets externos.
    *   Escrevi as equações físicas para **diferentes órbitas** (Equatorial, Polar, e Inclinadas) e os métodos de translação angular e orientação dinâmica de mira dos satélites para o centro do globo.
    *   Desenhei a arquitetura de **geolocalização IP assíncrona com fallback robusto** para São Paulo/BR e a fórmula matemática exata de conversão de coordenadas geográficas (Latitude e Longitude) em coordenadas cartesianas 3D $(x,y,z)$ alinhadas ao mapeamento UV da textura esférica do Three.js.
    *   Projetei a pulsação de feedback neon e a oscilação da atmosfera usando as uniforms do material Fresnel em tempo de execução.
*   **Transição de Status**: O status da tarefa no [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) foi oficialmente movido de `📋 Backlog` ➡️ `🔍 Refining` ➡️ `✅ Refined`.

Aguardo seu feedback sobre novos direcionamentos se houver, mas a pendência do Voxel City foi inteiramente sanada!

---

## 🏎️ 3. Resolução da Incompatibilidade e Refinamento de Voxel City (TASK-VOXEL_CITY)

Conforme aprovado e alinhado com o Tech Lead, elaborei e refinei com sucesso a especificação de **Voxel City** na [TASK_002.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_city/TASKS/TASK_002.md):

*   **O que foi feito**:
    *   **Substituição completa do escopo de SimCity** para o verdadeiro gênero do minijogo: **Simulador 3D de Entrega / Mundo Aberto**.
    *   Desenhei a especificação e a lógica para o **Wanted Level (Estrelas Policiais de 0 a 5)** com ativações por infrações (atropelar pedestres ou bater em carros civis) e IA de perseguição de viaturas policiais com giroflex piscando e algoritmos de aproximação inteligentes.
    *   Estruturei as especificações do **Tuning de Veículos (Garagem)**, com atributos como Velocidade (Motor), Aceleração (Turbo), Handling (Freio/Tração) e Blindagem (Chassis), além de customização de cor neon do carro.
    *   Desenhei o design sistêmico das **Cargas Especiais**: Cargas Frágeis (com barra de integridade física reativa a colisões), Entregas Expressas (com timer dedicado e bônus de pagamento) e Clientes VIP (que fogem e cancelam a missão sob perseguição).
*   **Transição de Status**: A tarefa foi movida com sucesso de `📋 Backlog` ➡️ `✅ Refined` no arquivo [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md).

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ✅ 4. Novo Percalço Identificado: Minijogos Órfãos na Base de Código (LIDO E RESOLVIDO)

Durante a análise exploratória da raiz do repositório para a criação da nova tarefa, identifiquei uma inconsistência crítica na contagem e registro de minijogos na plataforma:

*   **O que diz o Sistema de Controle (`games_control.json` e `BACKLOG.md`)**:
    O projeto declara ter exatamente **19 minijogos** oficiais sob rastreamento e desenvolvimento.
*   **O que está presente fisicamente no Repositório**:
    Existem **22 diretórios de jogos** com bases de código completas e funcionais em HTML5/Canvas/Three.js!
*   **Os 3 Minijogos Órfãos Identificados**:
    1.  **Pinball** ([pinball](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/pinball)): Um jogo de Pinball completo com física de colisão 2D, buffers e pontuação, contendo apenas o arquivo de refinamento básico `/pinball/TASKS/TASK_001.md`.
    2.  **Puzzle** ([puzzle](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/puzzle)): Um jogo de quebra-cabeça clássico funcional com apenas `/puzzle/TASKS/TASK_001.md`.
    3.  **Voxel Arena** ([voxel_arena](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_arena)): Um jogo de combate 3D funcional com apenas `/voxel_arena/TASKS/TASK_001.md`.

### ✅ Perguntas de Alinhamento para o Desenvolvedor / TL (Respondidas pelo Tech Lead):
*   `✅` **Devemos integrar estes 3 minijogos no arquivo central `games_control.json` e no `BACKLOG.md` global?** Sim, com certeza! É crucial para a consistência e evolução da plataforma que todos os jogos sob o diretório do repositório sejam mapeados na base global.
*   `✅` **Qual deve ser a ordem de prioridade de entrega deles?** A ordem definida pelo TL é:
    1. **Voxel Arena** (Prioridade: Alta - por ser um jogo 3D de alta fidelidade visual em Three.js, o que agrega imenso valor estético).
    2. **Pinball** (Prioridade: Média - excelente clássico com física 2D divertida).
    3. **Puzzle** (Prioridade: Média - jogo clássico e casual muito estável).

### 💬 Decisão e Direcionamento do Tech Lead (TL):
1.  **Mapeamento Global**: O PO está autorizado a cadastrar os 3 minijogos no arquivo central `games_control.json` e criar suas respectivas linhas iniciais no `BACKLOG.md` (no status inicial `📋 Backlog` ou com tarefas básicas de refinamento).
2.  **Esteira de Evolução**: Eles receberão suas tarefas `TASK_002.md` de evolução conforme a prioridade estabelecida, integrando-se organicamente ao nosso ecossistema de desenvolvimento.

---

## 🧩 5. Elaboração e Criação de Nova Tarefa: Tetris (TASK_003) - ✅ LIDA

Para dar continuidade à evolução de qualidade da plataforma **Playful Hub**, elaborei e criei formalmente a tarefa **TASK_003** para o jogo **Tetris**, focando em mecânicas clássicas e de alto impacto de Game Design e Retenção do Jogador:

*   **O que foi feito**:
    *   Criei a especificação detalhada em [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/tetris/TASKS/TASK_003.md).
    *   **Progresso e Gravidade Inteligente**: Curva de queda exponencial clássica e animação premium neon de "LEVEL UP!".
    *   **Mapeamento de T-Spin e Combo**: Algoritmo matemático preciso da "Regra dos 3 Cantos" para T-Spin e multiplicador progressivo de combos de linhas eliminadas, com floaters textuais de feedback de pontuação neon de altíssimo impacto visual no Canvas.
    *   **Modo Sobrevivência sob Pressão**: Grade inicial com blocos de lixo (garbage rows) e deslocamento vertical periódico com contador de tensão regressivo e alertas de áudio para aumentar o engajamento e a adrenalina.
*   **Transição de Status**: A tarefa foi inserida com sucesso na base de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status inicial `📋 Backlog`, aguardando refinamento técnico detalhado e desenvolvimento pelos próximos agentes da esteira.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏎️ 6. Elaboração e Criação de Nova Tarefa: Driving Simulator (TASK_003) - ✅ LIDA

Para expandir as possibilidades de jogabilidade e refinar o level design do **Driving Simulator**, criei e elaborei formalmente a especificação técnica de **TASK_003** focada na retenção do jogador e interações premium em Three.js 3D:

*   **O que foi feito**:
    *   Criei e detalhei as especificações em [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/driving_simulator/TASKS/TASK_003.md).
    *   **Level Design Dinâmico**: Projetei física de impulso elástico para cones destrutíveis tridimensionais, efeito de spin-out de 360° em poças de óleo e trajetória de saltos em rampas parabólicas neon com câmera lenta global (Bullet-Time) e tremor de tela para alto impacto visual.
    *   **Mecânica de Pit Stop (Damage & Fuel)**: Incorporei barra de integridade estrutural (danos ativos com emissão procedural de fumaça cinza/preta e fogo e corte de 40% da velocidade máxima), gerenciamento de combustível por aceleração e acostamentos iluminados com Pads neon de reabastecimento e reparo progressivo.
    *   **Modo Time Trial com Drift Ghost**: Adicionei um cronômetro milimétrico por voltas e modelagem do Carro Fantasma Holográfico (Ghost Car) que replica o melhor tempo anterior do jogador para alimentar um ciclo competitivo saudável.
*   **Transição de Status**: A tarefa foi inserida no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido ao nível cirúrgico de detalhamento técnico fornecido, estando 100% pronta para ser puxada por um desenvolvedor.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🐍 7. Elaboração e Criação de Nova Tarefa: Snake Game (TASK_003) - ✅ LIDA

Como PO experiente em level design e focado na experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o **Snake Game** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/snake/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Portais Dimensionais (Grid Portals)**: Desenhei uma mecânica espacial tática de teletransporte usando portais neon Azul e Laranja/Âmbar no grid, ativos quando o jogador atinge 10 pontos. O teletransporte preserva a direção do movimento da cobra e adiciona um efeito pulsante dinâmico.
    *   **Cobra Rival IA (Evolutive AI Rival)**: Planejei a introdução de uma cobra adversária inteligente de grid a partir de 20 pontos, que compete ativamente por comida usando heurística de distância Manhattan com desvio básico de colisões. Se ela colidir ou for derrotada pelo jogador, seus segmentos explodem em **Golden Apples** valendo **3 pontos** cada, criando um loop tático de risco e recompensa fantástico!
    *   **Estética de Juiciness Premium**: Projetei um sistema dinâmico de **Partículas Neon (Neon Trails)** emitido na ponta da cauda e curvas da cobra, aliado a efeitos de **Screen Shake (Tremor de Tela)** reativos para acentuar impactos cruciais (teleportes, consumo de comida especial/dourada e explosão da IA rival).
*   **Transição de Status**: A tarefa foi inserida com sucesso no banco de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`, pronta para que o time de desenvolvimento a assuma.

Não encontrei nenhum percalço ou inconsistência ao criar a tarefa; a base do Snake Game é muito estável e ideal para a implementação deste escopo altamente imersivo e premium!

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ⚔️ 8. Elaboração e Criação de Nova Tarefa: Voxel Arena (TASK_002) - ✅ LIDA

Como PO experiente em jogos e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_002** para o **Voxel Arena** no arquivo [TASK_002.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_arena/TASKS/TASK_002.md):

*   **O que foi feito**:
    *   **Progresso e Ondas Dinâmicas**: Projetei um sistema de 5 ondas dinâmicas progressivas de 60 segundos com banners DOM neon premium.
    *   **Tipos de Inimigos Elites & Rápidos**: Criei especificações para "Voxel Brutes" (grandes com HP alto, dano pesado e olhos amarelos glowing) e "Voxel Stalkers" (pequenos, rápidos e com ataques frequentes com olhos ciano glowing) para enriquecer o level design e a variedade de combate.
    *   **XP Orbs com Magnetismo Dinâmico**: Projetei a coleta magnética física em Three.js 3D para cristais octaedros dourados brilhantes, proporcionando feedback de poder satisfatório ao jogador.
    *   **Draft de Upgrades Roguelite**: Criei uma modal de Luxo glassmorphism com 3 cartas de upgrades aleatórios (HP Máximo, dano de arma, velocidade de movimento, cooldowns/multiplicadores de habilidades) pausando o jogo no "level up" (Estilo Vampire Survivors / Hades).
    *   **Mecânica de Stamina Ativa**: Desenhei regras rígidas de consumo de stamina para ataques básicos, defesa e habilidades especiais, forçando gestão tática do jogador.
*   **Transição de Status**: A tarefa foi inserida com sucesso no banco de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) diretamente no status `✅ Refined` devido ao alto nível de detalhamento técnico e à arquitetura de Clean Code fornecida nas seções refinadas.

Não encontrei nenhum percalço técnico na base de código do Voxel Arena; o projeto está muito bem estruturado e estável para a implementação deste ciclo viciante de progresso ciber-medieval.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🚀 9. Elaboração e Criação de Nova Tarefa: Space Shooter (TASK_003) - ✅ LIDA

Como PO sênior especializado em jogos e game feel, elaborei e criei com sucesso a especificação de **TASK_003** para o jogo **Space Shooter** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/space_shooter/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Dreadnought Prime (Chefe Multiestágio)**: Projetei uma batalha de chefe em 3 fases dinâmicas. Na primeira fase, o jogador deve destruir 3 geradores orbitais em coordenadas polares que garantem invulnerabilidade ao chefe. Na segunda fase, o chefe abre seu núcleo e ativa padrões de "bullet hell" senoidais e lança mísseis termoguiados. Na terceira fase, o chefe carrega e dispara um canhão de plasma estelar massivo (Hyperbeam) de 80px de largura com linha vermelha de aviso e empuxo de repulsão física.
    *   **Campos de Meteoros Fragmentáveis**: Introduzi meteoros instáveis de alta resistência que caem diagonalmente e, quando destruídos pelo jogador, se quebram proceduralmente em 2 ou 3 meteoros menores mais velozes.
    *   **Formações de Esquadrão**: Estabeleci o spawn tático de inimigos em formações geométricas organizadas (V-Shape, colunas laterais paralelas para flanqueamento e pontas de lança).
    *   **Efeitos de Juiciness Premium**: Projetei rastros de partículas dinâmicas neon em tempo de execução para os motores do caça e do reator do chefe, magnitudes de tremores de tela reativos aos impactos de jogo, e vinheta luminosa avermelhada pulsante acoplada a bipes sintetizados na Web Audio API em caso de HP crítico (abaixo de 30%).
*   **Transição de Status**: A nova especificação foi inserida com sucesso no banco de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) com o status `✅ Refined` devido à riqueza analítica, código limpo de referência para física orbital, fragmentação e sistemas de partículas.

Não foram detectados percalços durante o refinamento; a base do Space Shooter no HTML5/SVG/DOM está perfeitamente apta a hospedar esse arsenal de feedback visual.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 👑 10. Elaboração e Criação de Nova Tarefa: Chess (TASK_003) - ✅ LIDA

Como PO sênior de jogos focado em game feel, mecânicas competitivas e retenção de jogadores, elaborei e criei com sucesso a especificação de **TASK_003** para o jogo **Chess** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/chess/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Relógio de Xadrez Dinâmico (Chess Clock)**: Projetei um sistema de relógio duplo neon/glassmorphism com presets de tempo clássicos (Bullet 1+0, Blitz 3+2, Blitz 5+0, Rápido 10+0) e o Modo Zen (sem tempo). O relógio conta milissegundos e ativa o "Critical Time Alert" vibrante (vermelho neon pulsante) com efeito sonoro de tique-taque quando restam menos de 10 segundos, além de vitória por estouro de tempo (flagged).
    *   **Biblioteca de Desafios Táticos (Modo Puzzle)**: Desenhei uma suite inicial de 3 puzzles clássicos em FEN com validação ativa de lances do jogador (Xeque-Mate do Pastor, Xeque-Mate do Corredor e Garfo Tático de Cavalo). Acertos desencadeiam bônus de rating e fanfarras de sucesso, enquanto erros reiniciam a FEN do desafio.
    *   **Áudio Sintetizado Dinâmico via Web Audio API**: Resolvi o percalço de políticas de reprodução de áudio dos navegadores projetando a síntese de som procedural em tempo real com osciladores (normal, captura, xeque e fanfarra triunfal).
    *   **Estética Premium de Juiciness (Game Feel)**: Adicionei especificações detalhadas de Screen Shake (tremor de tela) ao capturar peças pesadas ou dar xeque, rastro neon dinâmico nas últimas jogadas e explosão física de partículas SVG na coordenada cartesiana exata da captura.
*   **Transição de Status**: A nova especificação foi inserida com sucesso no banco de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

Não detectei nenhum percalço ou inconsistência física ao analisar a base do xadrez; a integração das bibliotecas Chessboard.js e Chess.js é madura e perfeitamente apta para este refinamento estético e competitivo de nível profissional!

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🧩 11. Identificação de Inconsistências e Criação de Nova Tarefa: Puzzle (TASK_002) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente e sênior em jogos, analisei detalhadamente a base de código do minijogo **Puzzle (Mind Labyrinth)** no arquivo [index.html](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/puzzle/index.html) e identifiquei dois percalços lógicos importantes que afetam diretamente a experiência do usuário:

*   **O que identifiquei na Base de Código Real**:
    1.  **Inconsistência Lógica (Logic Enigma)**: O puzzle de lógica declara no código (`check: (answer) => answer === '◆'`) que o símbolo da losango/diamante (`◆`) é a resposta certa. Contudo, ao resolver as premissas fornecidas no enunciado sob a condição explícita de que apenas uma runa é verdadeira, o losango viola as regras (tornando a premissa de exclusão nula), e a única resposta logicamente consistente é o triângulo (`▲`).
    2.  **Validação Incompleta (Perspective Enigma)**: O puzzle tridimensional do cubo aceita qualquer rotação final onde uma face esteja alinhada (todas as faces estão encadeadas por operadores `||` na checagem do `isCorrect`), invalidando a instrução descritiva de fazer o jogador rotacionar até encontrar a face secreta da estrela (`★`). Qualquer clique aleatório nas rotações permite passar o enigma no "Check".
*   **Decisão e Ação do PO**:
    Relatei esses problemas nas seções de resoluções recomendadas do Tech Lead no arquivo [TASK_002.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/puzzle/TASKS/TASK_002.md) para que o desenvolvedor realize a higienização dos dados do puzzle antigo ao implementar o motor dinâmico procedural da nova tarefa.

*   **O que foi feito na TASK_002**:
    *   **Geração Procedural de Enigmas**: Desenhei o motor `ProceduralGenerator` com algoritmos coerentes para gerar sequências matemáticas infinitas, grids 3x3 e 4x4 de reconhecimento de padrões, grids de memória escaláveis de 2x2 a 6x6 e sentenças de lógica consistentes de tabela verdade.
    *   **Sistema de Foco Mental (Sanidade)**: Introduzi a barra de Foco Mental de 100% que pune respostas erradas e uso de dicas (hints), disparando Game Over caso o foco chegue a 0%.
    *   **Modos de Jogo (Endless & Time Attack)**: Criei a especificação de um Menu Rúnico glassmorphic permitindo a escolha de novos modos com loops competitivos locais (Modo Endless e Tempo Regressivo).
    *   **Áudio Procedural com Web Audio API**: Projetei a síntese sonora sem dependência de assets para tocar drones de sintetizador ambientais em tempo real, além de tons dinâmicos de sucesso, erro e alerta de batimentos cardíacos para foco baixo.
*   **Transição de Status**: A nova especificação foi inserida com sucesso no banco de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido à riqueza matemática e arquitetura fornecida.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🦠 12. Elaboração e Criação de Nova Tarefa: Conway's Game of Life (TASK_003) - ✅ LIDA

Como PO experiente em level design e focado na experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o **Conway's Game of Life** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/gameoflife/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Modo Desafio / Puzzles de Autômatos**: Desenhei a introdução de uma modalidade de quebra-cabeça com 3 níveis pré-configurados que transformam o simulador passivo em um jogo estratégico ativo. O jogador posiciona células estrategicamente antes de disparar a simulação para cumprir condições (Defletir Glider para um alvo ciano neon 3x3, estabilizar padrões caóticos centrais com cliques limitados, ou cultivar uma colmeia com mais de 50 células vivas em 40 gerações).
    *   **Eventos de Caos Dinâmicos e Anomalias**: Adicionei suporte a anomalias de grade sob controle deslizante para intensidade de caos. Os **Raios Cósmicos** provocam feixes de radiação 3x3 que modificam células e o **Buraco Negro** atua como uma barreira física gravitacional roxa neon no centro que puxa e devora células a cada tick.
    *   **Música Generativa Sintetizada em Tempo Real**: Desenhei o motor sonoro Web Audio API nativo que faz varredura de colunas ativas para gerar notas harmônicas baseadas na escala pentatônica. O sistema prioriza as células mais antigas para criar melodias procedurais relaxantes e limita a polifonia (max 4 vozes) e frequência de ticks (intervalo mínimo de 120ms) para evitar distorções de áudio.
*   **Transição de Status**: A tarefa foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) diretamente como `✅ Refined` devido à profundidade e aos detalhes técnicos fornecidos (fórmulas de colisão do buraco negro, envelope de sintetizadores e callbacks de checagem de vitória).

Não foram identificadas inconsistências ou percalços na base de código do Conway's Game of Life, que se mostrou muito bem implementada e estável.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏹 13. Elaboração e Criação de Nova Tarefa: The Archer (TASK_003) - ✅ LIDA

Como PO experiente em level design e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **The Archer** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/archer/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Obstáculos Físicos Dinâmicos**: Projetei obstáculos móveis no cenário como *Nuvens de Tempestade* (que se movem oscilando e desintegram as flechas com faíscas elétricas) e *Escudos Rotativos de Madeira* (que refletem elasticamente a velocidade da flecha e geram ricochete físico real e queda livre giratória até o solo).
    *   **Arsenal de Flechas Especiais**: Adicionei suporte para inventário de flechas especiais com limites de uso (Flecha Tripla disparando em leque de 3, Flecha de Fogo que atravessa múltiplos balões comuns, e Flecha Gravitacional que é imune ao vento lateral e atrai balões magneticamente).
    *   **Câmera Lenta Bullet-Time**: Criei a lógica para desaceleração temporal (0.25x da velocidade normal) em momentos de grande dramaticidade (última flecha em iminência de colisão com balão ou acerto de balão dourado em alta velocidade) acompanhada de filtro visual de contraste/saturação e limitador de tempo de 3 segundos.
    *   **Sintetizador de Áudio Procedural**: Projetei os efeitos sonoros gerados em tempo real pela Web Audio API para simular a tensão do arco, twang de disparo, estouro do balão, ricochete no escudo e erro de mira.
*   **Transição de Status**: A tarefa foi inserida no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido ao alto nível de refinamento físico e arquitetura fornecidos.

Não foram encontrados novos percalços técnicos ou inconsistências estruturais na base de código do jogo, e o arquivo index.html está apto a receber essa rica atualização estética e de jogabilidade após a consolidação da TASK_002.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🌿 14. Elaboração e Criação de Nova Tarefa: Lazy Gardener (TASK_003) - ✅ LIDA

Como PO experiente em jogos e focado na experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **Lazy Gardener** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/lazy_gardner/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Estufas de Biomas Especiais**: Projetei 3 novas estufas desbloqueáveis com ouro (Deserto, Glacial e Ciber-Glow) que modificam dinamicamente a estética visual (iluminação global, materiais do chão e do céu dome no Three.js) e aplicam bônus ou penalidades nas taxas de crescimento das sementes.
    *   **Cruzamento Genético (Crossbreeding)**: Desenhei uma mecânica espacial de polinização cruzada para plantas maduras de espécies diferentes a uma distância de até 1.8 unidades. O cruzamento gera sementes híbridas lendárias com flores em gradientes neon cintilantes que valem 4.0x o ouro base.
    *   **Exposição Anual de Jardinagem (Flower Show)**: Desenhei um mini-concurso de jardinagem periódico com cooldown. Uma modal glassmorphism avalia a raridade, a saúde e o fator estético (escala e tamanho) da planta inscrita pelo jogador, distribuindo medalhas (Bronze, Prata, Ouro) e buffs de crescimento global.
    *   **Juiciness Premium (Animações WebGL)**: Projetei o fluxo de partículas neon de polinização, o efeito elástico pop-in para o avanço dos estágios das plantas e um zoom dinâmico de celebração na câmera do Three.js para colheitas lendárias.
*   **Transição de Status**: A tarefa foi inserida com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) diretamente como `✅ Refined` devido à alta fidelidade e riqueza dos detalhes matemáticos e de design especificados.

Não foram encontrados percalços ou inconsistências na base de código do Lazy Gardener, que é modular e escalável.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🃏 15. Elaboração e Criação de Nova Tarefa: Poker Texas Hold'em (TASK_003) - ✅ LIDA

Como PO experiente em jogos, focado em game feel, mecânicas competitivas e na jornada do jogador, elaborei e criei a especificação técnica da **TASK_003** para o jogo **Poker Texas Hold'em** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/poker/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Circuito de Torneios Progressivo (Tournament Mode)**: Criei uma campanha com 3 etapas (*Bronze Pub*, *Cyber-Silver Club*, *Imperial Gold Cup*) contendo regras de blinds crescentes (baseadas em quantidade de mãos jogadas para evitar bugs de tempo real), mecânica de Ante e buy-ins persistidos no `localStorage`.
    *   **Novas IAs Competitivas**: Projetei Diana "The Adaptable" 🦊 e Erik "The Legend" 👑 com comportamentos avançados que ajustam agressividade e blefes dinamicamente dependendo do pote e da rodada.
    *   **Tells Psicológicos e Temporização da IA**: Implementamos um sistema de pistas visuais de blefe ou armadilhas da IA (através de micro-expressões de avatar e tempos de reação realistas) integrando uma barra de "Leitura Mental" no HUD.
    *   **Stacks de Fichas CSS3 & dealer tokens**: Desenhei a modelagem visual de fichas empilhadas tridimensionalmente em tempo real com distribuição dinâmica de valores e indicadores físicos de Dealer (D), Small Blind (SB) e Big Blind (BB).
    *   **Animações Premium 3D de Cartas**: Projetei o voo rotacional de distribuição e giros 3D (flip) de cartas com fallbacks.
*   **Transição de Status**: A tarefa foi devidamente adicionada ao backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) com o status `✅ Refined` devido ao alto nível de especificação de design de mecânicas, modelagem de dados, diagramas de fluxo de animação e diretrizes arquiteturais limpas.

Não foram detectados percalços que impeçam a implementação da tarefa; a base de código do poker é estável e está pronta para receber essas mecânicas de gameplay polidas.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🧩 16. Limitação Técnica Identificada e Criação de Nova Tarefa: Rubik's Cube (TASK_003) - ✅ LIDA E CONFIRMADA

Como PO focado na experiência do usuário e no fluxo do jogo, elaborei a **TASK_003** do **Rubik's Cube** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/rubiks_cube/TASKS/TASK_003.md) e a registrei no backlog global como `✅ Refined`.

No entanto, durante a análise da base de código e da entrega da **TASK_002**, identifiquei um **percalço técnico e limitação arquitetural** importante que comunico aqui:

*   **O Percalço**: O desenvolvedor optou por resolver o auto-solver da TASK_002 usando a abordagem de "gravar e reverter" (`moveHistory`). Isso funciona perfeitamente para desfazer movimentos criados na sessão do usuário. No entanto, na **TASK_003**, estamos introduzindo o **Gerador de Embaralhamento Oficial WCA** e a **Importação de Strings de Embaralhamento Customizadas**.
*   **O Impacto**: Com a lógica atual de reversão de histórico, se o usuário carregar uma string de embaralhamento externa ou se o cubo iniciar de um estado randômico não gravado, o "Auto-Solver" **não funcionará**, pois ele não possui um resolvedor lógico matricial (como Kociemba ou LBL estruturado) capaz de computar a solução de um estado arbitrário.
*   **Mitigação no Refinamento**: Na especificação da TASK_003, adicionei diretrizes técnicas explícitas para a leitura lógica do estado do cubo 3D (mapeamento de facelets para coordenadas cartesianas) e destaquei que a engine do solver precisará evoluir para aceitar e computar resoluções de estados arbitrários, integrando bibliotecas leves ou o método clássico de camadas (LBL).

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ⚔️ 17. Elaboração e Criação de Nova Tarefa: RPG Adventure Quest (TASK_003) - ✅ LIDA

Como PO experiente em level design e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **RPG Adventure Quest (ded)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/ded/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Combate Interativo por Turnos (Combat Screen)**: Substituição do loop `do-while` síncrono por uma tela dedicada de combate por turnos com barra de HP interativa do inimigo e seleção ativa de habilidades baseadas na classe (ex: *Golpe Heroico* com vantagem para Guerreiro, *Míssil Mágico* de acerto garantido para Mago e *Ataque Furtivo* para Ladino).
    *   **Minimapa de Exploração Dinâmico**: Projetei um mapa visual em SVG/Canvas exibindo nós de salas (Combates ⚔️, Mercador 🪙, Mistérios ❓, Chefes 💀) com névoa de guerra progressiva baseada no estado global (`visitedNodes`).
    *   **Web Audio API & Juiciness**: Especificação de receitas de síntese analógica pura para reproduzir efeitos de corte de espada, feitiço arcano, arpejo de cura, fuga e fanfarra de vitória/derrota sem carregar arquivos MP3 externos.
*   **Decisões Importantes Resolvidas**:
    *   *Inserção de Sabedoria (WIS)*: Atributo ausente nos arquétipos originais mas essencial para feitiços de cura. Decidido sua inclusão com valores iniciais correspondentes (Warrior: 10, Wizard: 14, Rogue: 12) e cálculo dinâmico de modificadores.
    *   *Uso de Consumíveis*: Devido ao fluxo síncrono original da engine de diálogo, poções só podem ser usadas fora de combate. Durante lutas ou rolagens, os slots de inventário passam a ser exibidos como desabilitados (opacidade reduzida e cursor proibitivo) com log de feedback apropriado.
    *   *Ficha de Personagem*: Decidida a exibição completa de todos os 6 atributos clássicos de D&D e Sorte (LUCK) no painel compacto lateral para transparência com o jogador.
*   **Transição de Status**: A nova especificação foi inserida com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🔮 18. Elaboração e Criação de Nova Tarefa: Galton Board (TASK_003) - ✅ LIDA

Como PO experiente em level design e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o simulador **Galton Board (tabuleiro_galton)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/tabuleiro_galton/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Modo Desafio (Target Fitting)**: Transformei o simulador passivo em um jogo interativo com 3 desafios de distribuição estatística (Curva Inclinada à Direita com checagem de MSE, Divisão Bimodal "Twin Peaks" com preenchimento tático de colunas, e Grade Uniforme Perfeita com tolerância rígida de dispersão). O progresso do desafio e a porcentagem de Match são exibidos em tempo real.
    *   **Pinos Especiais (Interactive Peg Modifiers)**: Projetei pinos com comportamentos dinâmicos adicionais no Canvas: Pinos de Teletransporte (Azul Neon/Laranja Neon), Pino Multiplicador (Roxo Neon, dividindo a bolinha em duas verdes) e Pino Gravitacional (Vortex Ciano Neon que atrai bolinhas adjacentes).
    *   **Sintetizador Web Audio API**: Desenhei a modelagem de síntese sonora procedural nativa para reproduzir notas musicais baseadas na escala pentatônica a cada colisão de bolinha com os pinos (altura da nota baseada no eixo X da colisão), além de efeitos sonoros dedicados para teletransporte, multiplicação e vitória.
*   **Transição de Status**: A nova especificação foi inserida com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

## 🔫 19. Elaboração e Criação de Nova Tarefa: 3D Shooter (TASK_003) - ✅ LIDA E CONFIRMADA

Como PO experiente em level design e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **3D Shooter (3d_shooter)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/3d_shooter/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Arsenal de Armas Avançado**: Desenhei as especificações para o *Rifle de Plasma* (alta cadência, projéteis ciano neon lentos baseados em física, consumo de munição específica) e o *Lançador de Mísseis* (baixa cadência, projéteis explosivos físicos com *Splash Damage* radial, tremor de tela dinâmico e partículas incandescentes).
    *   **Cyber-Imp (Inimigo à Distância)**: Projetei a IA de comportamento tático que recua/strafa para manter uma distância ideal de 5 unidades e conjura esferas mágicas roxas desviáveis em direção ao jogador a cada 2.5–3.5s.
    *   **Minimapa Tático Neon**: Projetei um mini-radar HUD glassmorphic para exibir o layout do mapa 2D centralizado no jogador (modo compacto) ou o mapa inteiro (modo expandido/estático) usando as cores de contorno neon ciano, exibindo posições de projéteis, pickups e inimigos ativos.
    *   **Áudio Procedural com Web Audio API**: Desenhei a síntese de tom pura (laser peew-peew, estrondo de explosão por ruído branco e carregamento mágico) para que os efeitos de combate funcionem sem dependências externas.
*   **Percalços Técnicos Identificados (Direcionamento)**:
    1.  *Transição de Hitscan para Projéteis Físicos*: O motor de combate nativo do jogo foi inteiramente construído com base em detecção instantânea (*Hitscan*) via Raycasting. A introdução de projéteis físicos (plasma e mísseis) exigirá que a função `shoot()` seja interceptada para spawnar objetos dinâmicos e que o loop principal implemente uma rotina de translação e colisão baseada na grade de mapa.
    2.  *Ausência de Estrutura de Projéteis Inimigos*: Atualmente, os inimigos atacam exclusivamente corpo a corpo infligindo dano direto na hitbox. A adição de projéteis do Cyber-Imp requer a inicialização de projéteis de autoria hostil (`owner: 'enemy'`) com verificação contra a hitbox do jogador.
    3.  *Dualidade de Áudio (Placeholder vs Synth)*: O sistema de som existente no *3D Shooter* depende de carregamento e reprodução de buffers MP3 estáticos para disparos das armas. A especificação sugere que os novos efeitos utilizem a síntese procedural via osciladores, o que exige que o desenvolvedor organize e harmonize o mixer de ganho (`masterGain`) para aceitar ambos os fluxos (analógico e reprodução de arquivo).
*   **Transição de Status**: A nova especificação foi inserida com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🌍 20. Elaboração e Criação de Nova Tarefa: Three.js Earth (TASK_003) - ✅ LIDA

Como PO experiente em level design e focado na imersão do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o simulador **Three.js Earth (threejs-earth-main)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/threejs-earth-main/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Seleção Interativa de Alvos e HUD de Telemetria**: Planejei o posicionamento de 3 estações de observação famosas (Cabo Canaveral, Baikonur e Kourou) convertidas em 3D, suporte a clique (`THREE.Raycaster`) em satélites/estações/pinos, e animação suave de aproximação de câmera (LERP) com exibição de telemetria glassmorphism detalhada.
    *   **Vento Solar, Auroras Polares e Tempestade Geomagnética**: Desenhei efeitos de partículas para vento solar e torus tridimensionais semitransparentes com glow verde/ciano para as auroras boreais/austrais. Adicionei um slider de intensidade de tempestade solar que afeta a velocidade das partículas, brilho das auroras e injeta um efeito glitch analógico na HUD.
    *   **Lixo Espacial e Alerta de Proximidade com Sintetizador**: Projetei órbitas caóticas para 30-50 detritos de lixo espacial. Caso entrem na zona de risco de um satélite ($d < 0.15$), acionam um indicador de alerta, anel vermelho piscante e alarme sonoro Web Audio API sintetizado.
*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Poluição Visual no Canvas*: A inserção de 30 a 50 partículas de lixo espacial, órbitas, satélites e anéis de aurora pode poluir visualmente a cena e reduzir a performance. É recomendável adicionar toggles específicos na HUD lateral para que o usuário possa ativar/desativar a renderização dos detritos espaciais e das auroras separadamente.
    2.  *Comportamento de Câmera Travada (Focus Lock)*: Ao centralizar o foco da câmera em um satélite em translação rápida, os OrbitControls podem dificultar o controle do usuário. O desenvolvedor deve garantir que o botão "Liberar Foco" retorne as coordenadas suavemente para a Terra (0,0,0) de forma limpa e restaure a liberdade total da câmera.
    3.  *Mitigação de Autoplay de Áudio*: Devido a restrições modernas de navegadores contra autoplay de som, o sintetizador do alarme sonoro não deve ser instanciado até que haja o primeiro clique de interação na página.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ☄️ 21. Elaboração e Criação de Nova Tarefa: Pinball (TASK_003) - ✅ LIDA

Como PO experiente em level design e focado na imersão do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o minijogo **Pinball (pinball)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/pinball/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Batalha contra o Chefe (Rogue AI Core)**: Projetei um chefe centralizado no topo (`x: 200, y: 80`) com 300 HP e 3 escudos orbitais giratórios de 50 HP cada. O chefe possui mecânicas de ataque ativas, como o *Glitch Pulse* (área de retardo temporal que reduz a velocidade linear da bola em 30% e deforma visualmente o canvas), *EMP Shockwave* (que desabilita um dos flippers por 2.0 segundos, sinalizando com luz amarela) e *Firewall Barriers* (bricks destrutíveis que surgem na mesa).
    *   **Skill Shot de Precisão**: Adicionei um indicador linear de precisão ao plunger. Se o jogador lançar a bola exatamente na zona verde de 75% a 85% de força da mola e cruzar o sensor da calha superior em até 1.5s, ganha o *Critical Skill Shot* (+3.000 pts e incremento de multiplicador).
    *   **Sintetizador Web Audio API Procedural**: Projetei a síntese sonora em tempo real sem arquivos estáticos (flipper, bumper hits sintonizados por notas, glitch sweep de dano do chefe e trilha sonora harmônica com oscilador triangular que modula de acordo com a velocidade das bolas ativas).
*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Ausência de Áudio Nativo (UX Limitation)*: Identifiquei que a base do jogo é silenciosa e depende inteiramente de placeholders vazios. A implementação de síntese de oscilador via Web Audio API elimina a necessidade de assets externos e contorna políticas rígidas de reprodução em navegadores modernos.
    2.  *Comportamento de EMP no Flipper*: Em caso de desativação por pulso elétrico, o flipper afetado deve obrigatoriamente regressar para a posição de descanso (`restAngle`) com opacidade de 50%. Se ele travar ativo (levantado), a bola pode rolar sob ele e drenar injustamente, gerando frustração extrema.
    3.  *Sobrecarga de Áudio no Multiball*: A alta frequência de colisões com múltiplas bolas na mesa exige uma lógica de limitador de taxa (throttling de 60ms) para as chamadas de som, evitando saturação de ganho (clipping) ou degradação na performance de processamento de sinais de áudio.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🧩 22. Elaboração e Criação de Nova Tarefa: Puzzle (TASK_003) - ✅ LIDA

Como PO experiente em level design e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **Puzzle (Mind Labyrinth)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/puzzle/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Enigma de Conexão Estelar (Celestial Constellations Connect)**: Criei um novo enigma tátil e lógico onde o jogador liga estrelas brilhantes piscantes desenhadas em canvas seguindo regras astrológicas (por temperatura de espectro, ordem rúnica ou diâmetro/brilho), com feedbacks visuais de linhas de neon e explosões de partículas estelares.
    *   **Grimório de Relíquias Místicas**: Desenhei um painel overlay glassmorphic com 6 relíquias colecionáveis desbloqueadas por feitos nos modos de jogo (Astrolábio Quebrado, Lente do Foco Celestial, Cálice do Infinito, Filtro de Éter, Pena de Fênix, Tábula de Esmeralda), oferecendo bônus passivos limitados a **2 slots equipáveis simultaneamente** (conforme regras do TL) para adicionar decisões estratégicas antes do gameplay.
    *   **Notificação de Conquistas (Achievements)**: Implementei toasts na HUD com bordas douradas neon para celebrar instantaneamente os desbloqueios das relíquias com textos de lore mística e fanfarras procedurais.
    *   **Síntese de Áudio no Web Audio API**: Projetei notas e acordes estelares de harpa pura e o som de fogo ascendente (ruído branco varrendo frequências com BiquadFilter passa-banda) da Pena de Fênix em conformidade com as regras do TL.
*   **Transição de Status**: A tarefa foi devidamente adicionada ao backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`, pronta para desenvolvimento.

Não encontrei nenhum percalço ou inconsistência ao desenhar a tarefa.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏛️ 23. Elaboração e Criação de Nova Tarefa: Strategy Empire (TASK_003) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o minijogo **Strategy Empire (strategy_game)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Recrutamento e Comando de Unidades Militares**: Projetei um sistema de treinamento para 3 tipos de unidades a partir do quartel (*Barracks*): Batedores (🕵️), Soldados (⚔️) e Catapultas (🎯). Cada uma com atributos táticos bem balanceados (custo, movimento por turno, raio de visão e força de ataque) e comportamento de seleção (borda neon ciano) e movimentação tátil no grid.
    *   **Acampamentos Bárbaros e Saqueadores**: Criei uma mecânica de ameaças ativas em tempo real. Acampamentos bárbaros (⛺) escondidos sob a névoa de guerra cinza spawnam Saqueadores (🪓) que se movem de forma inteligente usando distância Chebyshev para interceptar e destruir construções do jogador ou das IAs, roubando recursos.
    *   **Captura e Depósito de Relíquias Sagradas**: A destruição de acampamentos bárbaros revela uma Relíquia (🏆) que pode ser carregada por unidades até um Templo (🏛️). O depósito abre uma interface de seleção de Bênçãos Permanentes que concedem buffs estratégicos à economia ou poder militar.
    *   **Combate Tático e Juiciness**: Implementei lógica de combate baseada em poder e bônus de terreno (como muralhas). Vitória/derrota ou saques ativam partículas vermelhas neon no Canvas de sobreposição e tremores de tela reativos de 200ms.
    *   **Áudio Procedural via Web Audio API**: Desenhei a síntese pura para disparo de catapultas, choques de espada em combate e arpejos pentatônicos ao depositar relíquias.
*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Preservação do Terreno no Grid DOM*: O grid é modelado por atributos no DOM (`tile.dataset.type`). O desenvolvedor deve evitar alterar o tipo do tile para representar as unidades militares em movimento (ex: mudar de `'grass'` para `'soldier'`). As unidades **devem** ser injetadas como filhos absolutos dentro do tile correspondente para preservar o terreno subjacente e estruturas físicas.
    2.  *Escalonamento do Recurso Madeira na Inicialização*: A madeira (introduzida na TASK_002) precisa ser corretamente balanceada em `initGame()` com escalonamento por nível de dificuldade, assim como o Ouro e Comida, para garantir a consistência das mecânicas econômicas da TASK_003.
    3.  *Mitigação de Políticas de Autoplay de Áudio*: O mixer de som procedural do AudioContext só deve ser instanciado ou ativado após a primeira interação real do usuário (clique) na página do jogo.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🎸 24. Elaboração e Criação de Nova Tarefa: String Catcher (TASK_003) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o minijogo **String Catcher (visual_effects)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/visual_effects/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Menu de Temas Visuais Dinâmicos (Estilos Gráficos)**: Desenhei 3 novos estilos gráficos de fundo em tempo real: *Retro Cyberpunk* (grade 3D convergente pulsando verticalmente com os graves), *Vaporwave Sunset* (sol aramado e gradientes suaves com bolhas translúcidas) e *Cosmic Nebula* (nebulosa interestelar fluida com estrelas cadentes reativas).
    *   **Novas Notas Especiais e Modo Frenesi**: Projetei a *Frenzy Note* (arco-íris cintilante com 5% de chance) que ativa 8 segundos de dobro de pontos, cordas em gradiente e banner animado; e a *Shield Note* (coração esmeralda com 8% de chance) que concede um escudo neon protetor capaz de absorver a perda de uma nota ou o clique em uma mina.
    *   **Sintetizador de Áudio Procedural Integrado**: Especifiquei a síntese sonora em tempo real via Web Audio API (`OscillatorNode`) tocando notas harmônicas baseadas na escala pentatônica menor (Lá Menor) mapeada proporcionalmente às cordas (lanes), permitindo escolher entre ondas *Sine*, *Triangle* e *Sawtooth*.
    *   **Game Feel Avançado (Juiciness)**: Planejei a *Distorção Física da Corda (Ripple Effect)* (perturbação física ondulatória propagada de forma senoidal atenuada para as cordas adjacentes) e *Screen Shake* de 250ms reativo a eventos de alta tensão (modo frenesi, escudo quebrado ou colisão com mina).
*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏎️ 25. Elaboração e Criação de Nova Tarefa: Voxel City (TASK_003) - ✅ LIDA

Como PO experiente em level design e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **Voxel City (voxel_city)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_city/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Rampas de Acrobacias (Stunt Jumps) & Efeito Bullet-Time**: Projetei a inclusão de 4 rampas neon 3D espalhadas pela malha urbana. Ao passar pelas rampas em alta velocidade ($>18\text{ u/s}$), o carro entra em órbita aérea e ativa o efeito slow-motion (Bullet-Time, Time Dilation de 0.3x) e órbita dinâmica de câmera cinematográfica. Ao aterrissar com sucesso, o jogador recebe bônus de \$150 e faíscas neon na suspensão.
    *   **Obstáculos Físicos Destrutíveis (Cones e Hidrantes Reativos)**: Desenhei grupos de cones destrutíveis tridimensionais voxel que são arremessados elasticamente e rotacionam nos eixos, e hidrantes vermelhos de voxel que explodem gerando um jato de água volumétrico e translúcido composto de partículas ascendentes/descendentes. O asfalto molhado ao redor do hidrante reduz a aderência dos pneus do carro em 50% (hidroplanagem), auxiliando na derrapagem.
    *   **Mecânica de Drift e Nitro Boost**: Implementei derrapagem ativa segurando `Space` ao curvar em velocidade, gerando marcas de pneu (skidmarks) no asfalto e partículas de fumaça, acumulando uma barra de Nitro. Quando cheia, apertar `Shift` aciona o Nitro Boost, duplicando a aceleração por 3 segundos, adicionando luzes azuis nos faróis/escapamento e aplicando distorção de FOV na câmera.
    *   **Sintetizador de Áudio Procedural via Web Audio API**: Projetei sintetizadores dinâmicos para marcha e aceleração do motor do carro, sirenes de polícia FM espaciais reativas com efeito Doppler, barulho de spray de água pressurizada do hidrante quebrado, e chiados de drift e nitro boost.
*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ⚔️ 26. Elaboração e Criação de Nova Tarefa: Voxel Arena (TASK_003) - ✅ LIDA

Como PO experiente em level design e priorizando a experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **Voxel Arena (voxel_arena)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_arena/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Encontro Épico com Chefe Multi-Fase (Colosso Voxel)**: Projetei a batalha final que se inicia após as 5 ondas padrão. Ao zerar o tempo, o cronômetro é substituído pelo aviso "BOSS ENCOUNTER", transicionando a atmosfera para violeta/carmesim. O Colosso possui 3 fases de combate com mecânicas próprias: escudos orbitais de cristal destruíveis, feixe de energia Hyperbeam giratório cilíndrico, e modo sobrecarga de alta velocidade invocando servos voxels.
    *   **Armadilhas Ambientais Ativas**: Inseri dois perigos dinâmicos no campo de batalha: Poças de Lava Volcânica (com colunas de fogo ativas que causam dano a jogadores e monstros, permitindo uso estratégico) e Fendas Gravitacionais (que exercem força física de atração baseada na distância).
    *   **Feedback de Impacto Visual e Físico (Juiciness)**: Planejei a injeção de Hitstop (tempo de congelamento de 80ms em acertos críticos ou danos pesados para conferir peso ao combate), Screen Shake Direcional de câmera e números de dano flutuantes (Cyan para dano normal, Ouro para críticos e Vermelho para dano no jogador) projetados de 3D para o plano 2D da tela.
    *   **Sintetizador de Áudio via Web Audio API**: Projetei a síntese sonora em tempo real para os rugidos de spawn do Colosso, varreduras de carga do hyperbeam e quebra de cristais orbitais.
*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🧬 27. Elaboração e Criação de Nova Tarefa: Rede Neural Evolutiva (TASK_003) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na experiência interativa do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o simulador **Rede Neural Evolutiva (rede_neural_evolutiva)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/rede_neural_evolutiva/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Painel de Hiperparâmetros da Evolução (Tempo Real)**: Projetei um painel glassmorphism elegante com sliders dinâmicos para taxa de mutação ($0.0 \to 1.0$), intensidade de mutação ($0.05 \to 2.0$), elitismo ($0.05 \to 0.5$) e fator de aceleração da simulação ($1\text{x} \to 5\text{x}$). Adicionei um seletor para trocar dinamicamente a função de ativação da camada oculta entre `ReLU`, `Sigmoid` e `Tanh` com aplicação instantânea na propagação direta (`feedForward`).
    *   **Modo Sandbox (Editor de Nível e Obstáculos)**: Criei uma mecânica interativa que suspende o spawn automático de obstáculos e permite ao usuário clicar no `#gameCanvas` para adicionar obstáculos personalizados (definindo largura, altura e velocidade física).
    *   **Motor de Eventos e Extinção em Massa**: Desenhei um mecanismo (manual por botão, ou automático após 5 gerações sem superação do recorde) que elimina 80% dos piores indivíduos da população, dobra temporariamente a intensidade de mutação dos 20% sobreviventes para escapar de vales de fitness, treme o canvas (`screen-shake`), exibe banners de alerta e gera tons de sirene cibernética dinâmicos.
    *   **Sintetizador de Áudio via Web Audio API**: Projetei osciladores nativos para reproduzir efeitos de pulo (varredura ascendente curta), colisão/morte (impacto combinando onda dente de serra descendente com ruído branco), novo recorde (arpejo triangular ascendente) e alarme de extinção.
*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Retrocompatibilidade de Genomas*: Se no futuro decidirmos mudar as dimensões de entrada/saída do cérebro (por exemplo, adicionar saídas para abaixar/desviar de drones), a rotina de validação e importação JSON definida na TASK_002 precisará ser atualizada de forma correspondente, fornecendo fallbacks automáticos (como preenchimento de pesos vazios com zeros) para manter a retrocompatibilidade com cérebros exportados anteriormente.
    2.  *Estabilidade Física no Modo Turbo*: O multiplicador de velocidade da simulação ($1\text{x} \to 5\text{x}$) pode causar "teletransporte" ou tunelamento de colisão se os passos de integração física não forem divididos corretamente (substepping) no loop do canvas. O desenvolvedor deve rodar múltiplas atualizações lógicas por frame em vez de multiplicar a velocidade linear dos vetores, garantindo a integridade física em alta velocidade.
*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido à riqueza matemática e detalhamento técnico fornecido.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏢 28. Elaboração e Criação de Nova Tarefa: Company Simulator (TASK_003) - ✅ LIDA

Como PO experiente em level design, focado na imersão estratégica e na experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o jogo **Company Simulator (it_simulator)** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/it_simulator/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Sistema de Licitação e Projetos Ativos (Quadro de Contratos)**: Substituí a ação genérica "Develop Product" por um quadro de 3 contratos rotativos (com prazos, esforço em pontos, recompensas e multas por atraso) e suporte para aceleração (Rushing) com o dobro de entrega em troca de 15% de estresse para os devs e acúmulo de Dívida Técnica.
    *   **Mecânica de Dívida Técnica (Tech Debt)**: Adicionei o indicador de Tech Debt (0% a 100%) que se acumula ao usar freelancers ou apressar entregas, resultando em aumento de custos mensais operacionais (Expenses), redução na velocidade de entrega e aumento de risco de vazamento de dados. Desenhei a nova ação de "Refactor Systems ($15.000)" para reduzir a dívida em 25%.
    *   **Áudio Procedural via Web Audio API**: Desenhei a arquitetura de síntese sonora pura nativa (sem arquivos MP3 externos) contendo uma trilha sonora de fundo lo-fi relaxante em loop e efeitos sonoros para cliques, assinatura de contratos, sucesso de entrega, falhas por prazo e burnout de desenvolvedores.
*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Divisão de Esforço*: O desenvolvedor deve programar uma distribuição de pontos justa caso haja múltiplos projetos ativos. A implementação sugere a divisão igualitária da força de entrega final entre todos os contratos ativos no turno.
    2.  *Validação de Requisitos de Skills*: Ao assinar um contrato, o sistema deve validar se o cargo atual do jogador ou suas skills técnicas atendem ao nível mínimo exigido pelo cliente, gerando logs explicativos em caso de impedimento.
    3.  *Mitigação de Autoplay de Áudio*: A inicialização do `AudioContext` do sintetizador deve ser executada apenas após o primeiro clique do usuário na tela (ao iniciar a empresa ou ao alternar o controle de som) para evitar bloqueios de segurança dos navegadores.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido à riqueza do detalhamento técnico, mockups e lógica fornecida.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🧩 29. Elaboração e Criação de Nova Tarefa: Tetris (TASK_004) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Tetris (tetris)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/tetris/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Interface de Duelo em Tela Dividida (Split Screen Dual HUD)**: Projetei o layout dual-screen responsivo em CSS Flexbox/Grid para comportar o tabuleiro do jogador (esquerda) e da CPU (direita) em tempo real a 60 FPS, contendo mini-painéis individuais de status, filas de ataque neon e avisos visuais.
    *   **Inteligência Artificial (Heurística baseada em Pierre Dellacherie)**: Estruturei a IA da CPU baseada em 4 pesos heurísticos (Alturas Acumuladas, Linhas Limpas, Buracos e Irregularidade). Estabeleci a simulação de movimentos intervalados (UX Rule de 80ms-120ms por ação) para evitar teletransporte imediato e dar verossimilhança ao comportamento do bot.
    *   **Sistema de Envio e Cancelamento de Linhas de Lixo (Garbage Attack & Counter)**: Desenhei a lógica clássica competitiva onde combos, T-Spins e eliminações de múltiplas linhas enviam linhas cinzas de lixo ao oponente. Planejei a mecânica tática de defesa ativa (Garbage Cancellation 1:1) baseada em uma fila de lixo pendente que pode ser cancelada antes de entrar no tabuleiro.
*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Otimização e Garbage Collection (GC)*: Avaliar exaustivamente todas as posições ($x$) e rotações ($r$) para cada peça que surge pode gerar milhares de alocações temporárias de matrizes na memória, causando engasgos do Garbage Collector. Recomenda-se reutilizar arrays e matrizes de teste (Object Pooling/Pre-allocation) e rodar a rotina de avaliação da IA somente no frame exato em que uma nova peça entra em jogo.
    2.  *Priorização Sonora e Prevenção de Clippings*: Dois motores de jogo executando consolidations e eliminando linhas ao mesmo tempo podem dobrar a ocorrência de sons, gerando distorções sonoras. O desenvolvedor deve manter os sons de rotação e queda da CPU desligados ou atenuá-los drasticamente (ex: -12dB com filtro passa-baixa) para focar a experiência auditiva nas ações diretas do jogador.
    3.  *Paridade Esportiva (Sincronismo de Seeds)*: Para garantir um duelo justo, as peças de ambos os lados devem seguir a mesma ordem. A implementação deve instanciar um gerador compartilhado ou alimentá-los com uma semente de número pseudo-aleatório (seed) idêntica a cada início de partida.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🐍 23. Elaboração e Criação de Nova Tarefa: Snake Game (TASK_004) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Snake Game** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/snake/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Estrutura de Campanha com Fases Progressivas (4 Sectores)**: Projetei o arco de fases com metas incrementais de pontuação e introdução progressiva de mecânicas (Fase 1: Grid Limpo, Fase 2: Barreiras móveis que oscilam no tabuleiro, Fase 3: Invasão da IA Rival e Portais, Fase 4: Boss Fight).
    *   **Batalha de Chefe (Medusa Grid Core)**: Desenhei uma mecânica inovadora de combate para o gênero Snake clássico. A Medusa Grid Core ocupa uma área física 2x2 no Canvas e ataca com feixes de Eye Laser temporariamente intransitáveis e orbes corrompidos que ricocheteiam nas bordas do grid. O jogador deve manobrar para coletar Frutas Detonadoras (D-Fruits) que geram cargas elétricas explosivas em sua cauda para descarregar no núcleo do chefe.
    *   **Cyber-Shop & Economia Integrada (Upgrades e Skins)**: Desenvolvi o ecossistema com Ciber-Moedas (C-Coins) persistidas localmente no browser (`localStorage`), permitindo a compra de skins premium (RGB Pulsante e Transparência Ghost) e consumíveis de partida ativos (Escudo de Colisão, Ímã de Frutas e Time Warp).
    *   **Web Audio API Synth Adaptativa**: Modelei a estrutura sonora procedural adaptativa que transiciona dinamicamente de arpejos minimalistas nas fases normais para uma trilha Cyberpunk tensa baseada em osciladores dente-de-serra modulados durante o combate de chefe.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Gerenciamento e Destruição de Estado de Fase*: Cada mudança de fase exige o reset limpo de entidades concorrentes (IA rival, Golden Apples, orbes, lasers, timers de carregamento, partículas). O desenvolvedor deve implementar uma rotina centralizada de inicialização de fase para evitar sobreposição ou vazamentos de referências e loops órfãos.
    2.  *Colisão Complexa de Entidades 2x2*: O Medusa Grid Core ocupa um bloco 2x2, rompendo o modelo tradicional de verificação de coordenadas unitárias do grid. Recomenda-se realizar verificações por intervalos de bounding box (e.g. `head.x >= boss.x && head.x < boss.x + 2`) para todas as colisões do jogador e detonações de D-Fruta.
    3.  *Inicialização do AudioContext por Ação do Jogador*: Browsers modernos barram a inicialização de áudio sem interações prévias. O AudioContext da Web Audio API deve ser criado ou resumido (`resume()`) estritamente em eventos de toque/clique nas opções do menu principal de seleção de modo de jogo.

*   **Transição de Status**: A nova especificação foi devidamente registrada na planilha central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🃏 24. Elaboração e Criação de Nova Tarefa: Poker Texas Hold'em (TASK_004) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Poker Texas Hold'em (poker)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/poker/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Clube de Customização VIP (Environment & Skins Shop)**: Desenhei uma modal glassmorphic de loja que permite comprar feltros temáticos (Verde Clássico, Ciber-Glow roxo/ciano neon, e Casino Gold Royale preto/ouro) e versos de cartas estilizados (Classic Navy, Vector Matrix ciano, e Imperial Gold com gradiente dourado metálico) usando o saldo acumulado da carteira do jogador, persistindo no `localStorage`.
    *   **Dealer Virtual Ativo (Croupier Proativo)**: Projetei um Dealer animado por emoji no topo central da mesa, com balões de diálogo que narram os principais momentos da partida (distribuição, abertura do bordo, jogadas e showdown) e oferecem dicas de jogo úteis no turno do jogador.
    *   **Analisador Visual de Replay (Hand Replay Analyzer)**: Especifiquei um reprodutor de replays da rodada recém-concluída, permitindo avançar e retroceder passo a passo por cada rodada de aposta com as cartas das IAs exibidas semitransparentes para fins didáticos.
    *   **Síntese de Áudio no Web Audio API**: Projetei a geração procedural de áudio para o embaralhamento de cartas (com ruído rosa filtrado e oscilação rápida de amplitude), distribuição (sweep senoidal de decay rápido) e impacto de fichas (tons agudos em frequências próximas e decays rápidos), além de fanfarra de vitória.
    *   **Juiciness Premium**: Projetei ondas de brilho neon no feltro ao ocorrer All-In ou potes grandes e um confete de pequenas fichas e estrelas caindo na mesa em vitória do jogador.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Limitação da Estrutura de Histórico*: A base de código atual de Poker registra apenas resumos estáticos textuais de fim de rodada em `addToHistory()`. Para viabilizar a funcionalidade de Replay Visual detalhado passo a passo, o motor de jogo precisará registrar um objeto estruturado de log (`gameState.lastHandLog`) contendo o log sequencial completo de apostas, cartas comunitárias, cartas fechadas dos oponentes e saldos iniciais/finais a cada rodada de jogo.
    2.  *Redefinição de Variáveis de Cores*: Para que a customização do feltro se sinta verdadeiramente "VIP", a classe de tema injetada no `<body>` deve alterar não apenas o feltro, mas a paleta de cores secundárias dos painéis e dos botões secundários para manter harmonia visual.
    3.  *Mitigação de Bloqueio de AudioContext*: Em conformidade com navegadores modernos, a inicialização ou restauração do `AudioContext` da Web Audio API deve ser vinculada à primeira ação física de clique do usuário (como fechar o Clube VIP ou iniciar a partida).

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*
## 🌍 25. Elaboração e Criação de Nova Tarefa: Three.js Earth (TASK_004) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Three.js Earth (threejs-earth-main)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/threejs-earth-main/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Ameaça de Asteroides (Procedural Asteroid Spawning)**: Projetei a geração dinâmica de asteroides no espaço profundo ($d \ge 5.0$), com deformações geométricas aleatórias para criar silhuetas rochosas e atrito simulado com rastro de partículas neon.
    *   **Escudo Defletor Energético Global (Forcefield Shield)**: Especifiquei um escudo esférico aramado ciano ($d = 1.15$) que pulsa e aumenta de opacidade sob colisão (ripple effect), associado a um medidor de integridade (0-100%) que, se zerado, faz com que asteroides atinjam a superfície e criem crateras térmicas vermelhas neon.
    *   **Canhão Interceptor Laser**: Desenhei a mecânica de intercepção ativa. Ao selecionar satélites ou estações e disparar o laser, um feixe neon conecta o emissor ao asteroide por 150ms, culminando em uma explosão de partículas douradas radiais e destruição do alvo.
    *   **Sintetizador de Áudio via Web Audio API**: Projetei osciladores dedicados para carregamento do laser (pitch sweep ascendente), disparo (sweep dente-de-serra + ruído), impacto no escudo (ressonância senoidal de baixas frequências) e explosão (ruído branco filtrado com passa-baixas).

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Otimização de GPU e Memória (GC)*: A renderização de múltiplos fragmentos de asteroides e as partículas de explosão simultâneas podem degradar a performance em dispositivos de baixo custo. Recomenda-se pré-alocar buffers e geometrias (`THREE.BufferGeometry`), reutilizando instâncias de material para evitar vazamentos de memória (Memory Leaks).
    2.  *Controle de Colisão e Limpeza*: Se o asteroide ultrapassar o planeta sem colidir devido a desvios cartesianos ou saltos de frame, o loop de animação deve destruí-lo automaticamente assim que a distância começar a aumentar novamente e passar de 2.0 unidades.
    3.  *Bloqueio de AudioContext*: Para evitar erros de segurança dos navegadores, a inicialização do `AudioContext` deve ser ativada sob a primeira interação do mouse ou toque na página (evento `click` global).

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🚀 26. Elaboração e Criação de Nova Tarefa: Space Shooter (TASK_004) - ✅ LIDA

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Space Shooter (space_shooter)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/space_shooter/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Anomalias Gravitacionais (Buracos Negros)**: Projetei vórtices gravitacionais periódicos que exercem atração física centrípeta em todas as entidades móveis (naves do jogador e inimigas, meteoros e detritos) inversamente proporcional à distância, além de distorcer de forma curvilínea os feixes de laser. Se sugadas para o núcleo de morte central (<20px), as entidades sofrem danos extremos.
    *   **Customização de Arsenal no Hangar (Weapon Loadouts)**: Especifiquei a introdução de uma aba de ajuste de armamentos na interface do Hangar, permitindo aos jogadores desbloquear e selecionar novas armas táticas: *Vulcan Blaster* (tiro padrão rápido), *Plasma Cannon* (orbes lentos e pesados com Splash Damage em área de 60px) e *Tesla Lightning* (relâmpagos elétricos instantâneos que encadeiam e ricocheteiam por até 3 alvos vizinhos).
    *   **Modo Escolta de Comboio (Escort Mission)**: Criei uma mecânica alternativa para as fases ímpares (a partir da Fase 3), onde o jogador deve defender uma nave de carga aliada passiva e de movimentação lenta (Goliath Transport) com barra de vida exclusiva. A IA hostil foca estrategicamente em emboscar a Goliath, exigindo comportamento defensivo ativo por parte do jogador.
    *   **Síntese de Áudio no Web Audio API**: Projetei a geração sonora procedural em tempo real para os disparos e explosões de plasma, descargas estáticas elétricas da Tesla e modulação dinâmica sub-grave do vórtice gravitacional, além de BGM adaptativo que acelera e eleva o pitch em situações de vida crítica do comboio ou do jogador.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Refatoração de Trajetória Linear para Vetorial*: O motor de jogo atual processa disparos de lasers de forma linear e estritamente vertical (`y -= speed`). Para viabilizar a atração curvilínea do Buraco Negro, a estrutura de projéteis deve ser refatorada para operar com componentes vetoriais reais (`speedX` e `speedY`), que sofrem incrementos de aceleração a cada frame no loop físico.
    2.  *Integração de UI no Hangar*: A inclusão da aba de armas no Hangar de seleção de naves deve ser feita de forma limpa, compartilhando a economia centralizada na chave `spaceShooterCoins` do `localStorage`. Deve-se evitar colisões na escrita e leitura do storage garantindo serialização JSON robusta para as chaves `spaceShooterUnlockedWeapons` e `spaceShooterActiveWeapon`.
    3.  *Exclusão de Fogo Amigo (Splash Damage)*: O motor de colisões deve garantir estritamente que os danos em área gerados pela explosão do Canhão de Plasma verifiquem apenas elementos com a classe `.enemy`. Caso contrário, a proximidade com o jogador ou a Goliath geraria mortes acidentais extremamente frustrantes para o usuário.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 👑 27. Elaboração e Criação de Nova Tarefa: Chess (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Chess (chess)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/chess/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Modo Duelo Pass-and-Play com Rotação 3D do Tabuleiro**: Projetei um modo local face-a-face de dois jogadores onde o tabuleiro `#myBoard` rotaciona suavemente 180° no final de cada lance. Especifiquei a contra-rotação das peças e da notação lateral para manter a orientação de leitura correta.
    *   **Análise Pós-Jogo e Classificação de Lances (Game Review)**: Projetei a integração com o Stockfish.js Web Worker para analisar cada lance da partida após o término e classificá-lo nos padrões oficiais FIDE adaptados (Brilhante, Excelente, Bom, Imprecisão, Erro, Erro Crítico/Blunder) com badges e efeitos visuais neon no replay.
    *   **Mural de Conquistas e Desafios (Achievements Panel)**: Criei a lógica para persistência e desbloqueio de 5 conquistas de xadrez (ex: "Relâmpago Neon", "Resiliência do Rei", etc.) no `localStorage`, acompanhados de toasts na HUD e fanfarra sintetizada na Web Audio API.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Distorção de Proporção nas Coordenadas*: A rotação 3D inverte as anotações textuais nas bordas. Recomendei aplicar uma classe CSS de contra-rotação para manter a leitura vertical transparente.
    2.  *Limite de Lances Analisáveis*: Partidas longas podem congelar a interface. Recomendei usar uma fila de promessas de análise em lote e expor uma barra de progresso com botão de cancelamento.
    3.  *Paridade de Estilo de Áudio*: O som de conquista deve reaproveitar os osciladores sintetizados do AudioContext na Web Audio API criado em Task 3, sem dependência de assets.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🔫 28. Elaboração e Criação de Nova Tarefa: 3D Shooter (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **3D Shooter (3d_shooter)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/3d_shooter/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Portas de Correr Deslizantes (Sliding Doors)**: Desenhei uma mecânica clássica de portas (Comuns, Vermelha e Azul) que abrem ao pressionar a tecla `E`. A renderização de raycasting projeta o progresso de abertura fazendo a textura da parede deslizar lateralmente.
    *   **Cartões de Acesso (Keycards & Inventory)**: Adicionei chaves vermelha e azul como pickups no cenário e criei um design de inventário com glassmorphism neon para a HUD. Portas coloridas requerem seus respectivos cartões para abrir, tocando sons de acesso negado proceduralmente em caso de falta.
    *   **Paredes Secretas Camufladas (Pushwalls)**: Introduzi a mecânica clássica de paredes falsas ocultas no cenário que começam a dissolver (reduzindo o canal alfa gradualmente no raycaster) quando o jogador interage ('E') próximo a elas, tocando um chime de segredo e revelando salas escondidas de suprimentos.
    *   **Barris Explosivos Toxicos (Hazards)**: Criei entidades de barris verdes neon com pontos de vida próprios. Ao serem destruídos, causam uma explosão verde com física de splash damage radial reativa, podendo gerar reações em cadeia e deixando uma poça tóxica ácida temporária que causa dano periódico a entidades que passarem por ela.
    *   **Áudio Procedural com Web Audio API**: Projetei as receitas sonoras detalhadas de osciladores e envelopes para sintetizar os efeitos de abertura de porta, acesso negado, segredo revelado e explosão ácida.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Mapeamento da Tecla de Interação*: A tecla `E` / `KeyE` precisa ser registrada no input listener do arquivo index.html. O desenvolvedor deve integrá-la ao objeto `keys` para processamento correto.
    2.  *Raycasting DDA Adaptável para Portas*: Para simular o deslizamento suave, o raycaster precisará verificar o valor da coordenada horizontal de colisão do raio com a face da porta (`wallX`). Se a colisão ocorrer antes do limite de progresso de abertura, o DDA deve ignorar a colisão e prosseguir.
    3.  *Mitigação de Esmagamento de Entidades*: Ao fechar uma porta automaticamente, deve-se implementar uma validação contínua na célula correspondente para impedir que inimigos ou o jogador fiquem presos fisicamente no bloco do mapa. Se houver entidade, a porta deve reverter imediatamente para o estado de abertura.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ⚔️ 29. Elaboração e Criação de Nova Tarefa: RPG Adventure Quest (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **RPG Adventure Quest (ded)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/ded/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Especialização de Classes (Prestige Classes)**: Projetei a transição de personagens para subclasses temáticas (Paladino/Berserker, Arcanista/Necromante, Assassino/Dançarino das Sombras) ao atingirem o nível 3 (XP >= 150), adicionando novas habilidades passivas e ativas com dinâmicas de cooldown e buffs temporários na AC e HP.
    *   **Quadro de Missões Secundárias (Quest System & Journal)**: Criei um diário de missões retrátil na HUD e projetei 3 missões iniciais dinâmicas ligadas ao level design (encontrar o amuleto do mercador nos sarcófagos, purificar a cripta derrotando monstros e decifrar runas ancestrais nas paredes).
    *   **Level Design Tático com Portas e Alavancas (Locked Gates & Levers)**: Especifiquei barreiras mágicas neon bloqueando passagens-chave que exigem a ativação física de 2 alavancas ocultas em outras áreas da masmorra, integradas dinamicamente ao grafo do minimapa em SVG com chaves de estado visual.
    *   **Áudio Procedural via Web Audio API**: Projetei as receitas sonoras detalhadas de osciladores, filtros passa-altas/passa-baixas e envelopes para as novas habilidades de especialização (Fúria, Escudos, Drenagem de vida) e fanfarra triunfal de conclusão de missões.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Abuso de Input e Estado Compartilhado*: Ao abrir a modal de seleção de especialização, o loop principal de exploração deve ser temporariamente travado para impedir que cliques paralelos mudem o nó de cena ou abram o inventário concorrentemente.
    2.  *Descarte Limpo de Nós de Áudio*: Devido às múltiplas novas habilidades de prestígio gerando áudio procedural, é vital chamar explicitamente `disconnect()` em todos os osciladores e gainNodes no callback `onended` para mitigar vazamentos de memória (Memory Leaks) e uso excessivo de recursos no AudioContext.
    3.  *Persistência de Objetos de Quests*: Para manter o salvamento/carregamento robusto via `localStorage`, o estado de progresso de cada missão deve ser serializado de forma limpa, evitando referências circulares ou perdas de dados no objeto `gameState.quests`.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏎️ 30. Elaboração e Criação de Nova Tarefa: Driving Simulator (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Driving Simulator (driving_simulator)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/driving_simulator/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Sistema de Nitro NOS com Motion Blur e Distorção de FOV**: Projetei a mecânica de carga de Nitro via ações de pilotagem de risco (drifts, ultrapassagens finas de tráfego a menos de 1.8 unidades e decolagem em rampas). A ativação multiplica a velocidade por 1.6x, expande dinamicamente o campo de visão (FOV de 60° a 85°) no Three.js via LERP e injeta partículas de chamas neon nos escapamentos.
    *   **Perseguição Policial e Faixas de Espinhos (Spike Strips)**: Desenhei um sistema de nível de procura (Heat Level 1 a 5 estrelas) acionado por colisões intencionais com tráfego. Adicionei viaturas de polícia com giroflex pulsante e IA de manobra de interceptação em V, além de faixas de espinhos na pista que estouram os pneus, reduzindo a tração lateral em 65% até o reparo no Pit Stop Pad.
    *   **Clima Dinâmico e Aquaplanagem**: Projetei a transição de clima para chuva neon e névoa densa. Na chuva, o roughness do asfalto diminui para 0.15 para reflexos especulares intensos e a aderência cai 35%, com efeito de aquaplanagem e borrifos de água nas rodas.
    *   **Bifurcação de Rotas e Túnel Ciber-Neon**: Desenhei ramificações de pista permitindo escolher entre a Pista da Costa, o Túnel Ciber-Neon (com acústica e luzes neon) e o Atalho Off-Road de Cascalho.
    *   **Áudio Adaptativo Sintetizado (Web Audio API)**: Projetei a síntese sonora procedural nativa sem assets externos para som do motor varrendo de 80Hz a 650Hz, válvula de alívio do turbo (Blow-Off Valve "pshhht"), cantar de pneus e sirenes policiais.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Gerenciamento de Autoplay da Web Audio API*: Para respeitar as políticas de navegadores modernos, a inicialização do AudioContext do motor não deve ocorrer na carga da página, mas sim no primeiro evento de clique ou tecla pressionada pelo jogador.
    2.  *Descarte de Instâncias no Clima Dinâmico*: A alternância entre sol me chuva pode acumular partículas de chuva órfãs. Recomendei reaproveitar o array `rainParticles` e invocar `.dispose()` em geometrias e materiais ao desativar o efeito.
    3.  *Isolamento de Viaturas no Time Trial*: Para garantir a competitividade das voltas rápidas no modo Time Trial, as viaturas policiais e Spike Strips devem ficar desativadas durante este modo, mantendo o Nitro liberado.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏛️ 31. Elaboração e Criação de Nova Tarefa: Strategy Empire (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Strategy Empire (strategy_game)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/strategy_game/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Árvore de Tecnologias por Eras (Tech Tree & Age Progression)**: Desenhei o avanço tecnológico através de 3 eras distintas (Bronze, Ferro e Imperial) com um painel glassmorphic da Árvore Tecnológica. Cada era desbloqueia melhorias econômicas e militares (ex: Irrigação, Mineração, Armaduras, Balística Superior e Estradas Pavimentadas).
    *   **Maravilha do Império (Imperial Wonder 🏛️/⚡) & Evento de Cerco Final**: Criei a mecânica clímax de vitória por hegemonia. A construção da Maravilha ocupa uma área 2x2 no grid e dispara um **Evento de Cerco Final (60 segundos / 12 ticks)**, forçando todas as IAs rivais e acampamentos bárbaros a romper tréguas e lançarem uma marcha massiva desesperada para tentar destruir a estrutura antes da conclusão.
    *   **Unidade Heroica (Campeão Imperial 🛡️/👑)**: Especifiquei a convocação do Campeão Imperial na Era Imperial com aura dourada cintilante e a habilidade ativa *Grito de Guerra (War Cry)* (tecla `W`), que emite uma onda de choque radial no Canvas e concede `+2 de Força de Combate` para tropas aliadas adjacentes por 2 turnos.
    *   **Modo Campanha Tática (3 Capítulos de Level Design)**: Desenhei 3 cenários táticos pré-configurados (*O Cerco de Valoria*, *A Rota das Relíquias* e *A Guerra dos Três Tronos*) para oferecer desafios de level design focados com persistência de progresso em `localStorage`.
    *   **Áudio Adaptativo e Juiciness no Web Audio API**: Projetei a síntese sonora procedural com transição dinâmica de arranjos acústicos tranquilos para batidas arpejadas Cyber-Sintéticas aceleradas durante o cerco final, além de efeitos dedicados para o Grito de Guerra e subida de era.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Injeção e Bounding Box 2x2 da Maravilha*: A estrutura 2x2 ocupa 4 células no CSS Grid. O desenvolvedor deve ancorar a renderização no tile superior-esquerdo e atribuir a classe `.wonder-tile-group` cobrindo as 4 células, atribuindo o dataset `dataset.building = 'wonder'` a todos os 4 tiles para compartilhamento de HP.
    2.  *Pathfinding Eficiente durante o Cerco Final*: Com múltiplos saqueadores e tropas de IAs marchando simultaneamente rumo à Maravilha, a movimentação deve utilizar vetor cartesiano direto (distância Manhattan) contornando apenas tiles de água para evitar sobrecarga no loop de frames.
    3.  *Reparo Manual da Maravilha*: A Maravilha não deve regenerar HP automaticamente. O jogador pode interagir e gastar `50 Madeira` e `50 Ouro` para restaurar `50 HP` com tempo de recarga de 5 segundos.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ⚔️ 32. Elaboração e Criação de Nova Tarefa: Voxel Arena (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o jogo **Voxel Arena (voxel_arena)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_arena/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Seleção de Classes de Heróis (Paladino, Arquimago & Assassino)**: Projetei 3 classes jogáveis selecionáveis no menu inicial com modelos voxel 3D distintos e kits completos de habilidades exclusivas (ex: *Martelo de Titã* para Paladino, *Nova Arcana* e *Blink Holográfico* para Arquimago, e *Passo das Sombras* e *Tempestade de Adagas Executora* para Assassino).
    *   **Sistema de Relíquias Místicas Equipáveis (Mystic Relics System)**: Introduzi a mecânica de baús de relíquias surgindo na arena que oferecem escolhas passivas estratégicas (ex: *Coração de Voxel*, *Anel do Trovão* com relâmpagos em cadeia, *Cálice Vampírico* com Roubo de Vida, e *Ampulheta Arcana*).
    *   **Biomas Biomáticos & Hazards Dinâmicos de Arena**: Desenhei suporte para 3 arenas selecionáveis no menu principal (*Masmorra Sombria*, *Templo de Lava* com dano contínuo ao pisar na lava e geysers de fogo, e *Cripta de Gelo* com física de atrito reduzido/derrapagem em 40% e queda de estalactites do teto com aviso de área).
    *   **Sintetizador Áudio Procedural Expandido (Web Audio API)**: Projetei a síntese sonora procedural nativa sem assets externos para conjuração de magias arcanas, chiado de adagas furtivas, impactos sagrados, arpejo triunfal de abertura de baú e estrondo de estalactites caindo no gelo.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Atrito Físico no Piso de Gelo*: A física de derrapagem na Cripta de Gelo exige interpolação escalar no vetor de velocidade do jogador (`playerVelocity.x * 0.94 + dir.x * accel * dt`) para dar a sensação de escorregar sem descontrolar a câmera.
    2.  *Descarte Limpo de Malhas de Raios Elétricos*: A animação do *Anel do Trovão* (Chain Lightning) cria linhas dinâmicas de luz entre inimigos. Recomendei invocar `.dispose()` nas geometrias e materiais dos raios após 150ms para evitar estouro de memória no Three.js.
    3.  *Stacking de Relíquias de Mesma Espécie*: As relíquias podem ser acumuladas em até 3x, exigindo que a rotina `applyRelicEffects()` revalide os multiplicadores acumulados no `playerState`.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🌿 33. Elaboração e Criação de Nova Tarefa: Lazy Gardener (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o minijogo **Lazy Gardener (lazy_gardner)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/lazy_gardner/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Sistema de Automação Ciber-Botânica (Drones de Irrigação & Colheita)**: Projetei drones voxel 3D (`IrrigationDrone` e `HarvestDrone`) com patrulha procedural, raio trator e cones de água para transformar o loop idle em uma fábrica botânica automatizada (Botanic Factory Tycoon).
    *   **Mutação Genética Radioativa (Sementes Mutantes Starfall)**: Introduzi o evento noturno de queda de meteoritos radioativos no jardim, gerando espécimes lendárias (*Lótus Quântica*, *Bambu de Plasma*, *Cacto Antigravitacional*) com pétalas levitantes em Three.js e valor 6.0x.
    *   **Mercado B2B Corporativo (Corporate Botanic Contracts)**: Criei o sistema de contratos com megacorporações ciberpunk com metas de entrega por tempo limitado, recompensas massivas em ouro, XP de prestígio e prorrogação de contrato.
    *   **Feira Noturna Neon & Festivais Bioluminescentes**: Implementei o ciclo Dia/Noite dinâmico com shaders emissivos bioluminescentes, multiplicador de vendas 2.0x e trilha sonora lofi chillout sintetizada via Web Audio API.

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Performance com Luzes Dinâmicas*: Para evitar queda de FPS no Three.js durante a Feira Noturna com muitas plantas emissivas, recomenda-se limitar as luzes reais (`THREE.PointLight`) a no máximo 6 instâncias principais, utilizando `emissiveIntensity` nos materiais para as demais.
    2.  *Descarte Limpo do Meteorito Starfall*: O meteorito radioativo deve ser removido e desmembrado da cena após 90s, liberando o cristal *Star Fragment* interativo por Raycaster.
    3.  *Navegação LERP dos Drones*: A translação dos drones sobre os canteiros deve usar interpolação vetorial LERP para evitar movimentações rígidas e garantir suavidade visual.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ☄️ 34. Elaboração e Criação de Nova Tarefa: Pinball (TASK_004) - ✅ LIDA E CONFIRMADA PELO TECH LEAD

Como PO experiente em level design e focado na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o minijogo **Pinball (pinball)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/pinball/TASKS/TASK_004.md):

*   **O que foi feito**:
    *   **Mesa Expandida Multinível (Upper Deck)**: Projetei a expansão espacial da mesa adicionando um andar superior (`y: 30` a `y: 130`) acessado por uma rampa helicoidal neon. A área possui 2 mini-flippers superiores acoplados aos botões principais e 3 alvos de hack ("Override Targets") que liberam o *Upper Deck Jackpot* (+2.500 pts).
    *   **Obstáculos Magnéticos Gravitacionais (Mag-Traps / Vórtex)**: Introduzi 2 vórtex eletromagnéticos laterais no centro da mesa que capturam a bola por 1.5s, acelerando seu giro orbital em 360° com emissão de partículas ciano/magenta e disparando-a em super-velocidade ($1.8\times$).
    *   **Modo Mago Ciberpunk (Cyberpunk Wizard Mode - "MATRIX OVERLOAD")**: Desenhei o clímax definitivo de febre arcade ativado ao derrotar o Boss + 2 Missões + Upper Jackpot. Durante 30 segundos, a mesa libera 4 bolas simultâneas em febre neon, fixa o multiplicador em 5x, ativa shader de chuva matricial (Matrix Rain) e modula a trilha sonora sintetizada para Synthwave a 160 BPM.
    *   **Tabela de Recordes Local (High-Score Leaderboard & Badges)**: Implementei a persistência em `localStorage` para os 5 melhores recordes de todos os tempos com modal glassmorphic de 3 iniciais (estilo arcade retrô), datas e insígnias de conquistas (ex: 🛡️ *Boss Slayer*, 🎯 *Skill Master*, 🔮 *Wizard Master*, ⚡ *Multiball King*).

*   **Percalços Técnicos Identificados (Recomendações)**:
    1.  *Acoplamento de Controles dos Mini-Flippers*: Recomendado o acoplamento direto das teclas dos flippers principais (`Z`/`LeftArrow` e `RightArrow`) para controlar simultaneamente os flippers do Upper Deck, mantendo a jogabilidade intuitiva e minimalista.
    2.  *Retorno de Segurança do Upper Deck*: A queda de bola no Upper Deck não deve penalizar vidas. O fluxo deságua diretamente na área central da mesa principal (`y: 140`) sobre os bumpers.
    3.  *Tratamento de Performance do Shader Matrix Rain*: A chuva matricial é desenhada de forma leve no Canvas 2D limitando o array de partículas a no máximo 40 instâncias para garantir 60 FPS fluídos.
    4.  *Fallback Gracioso de LocalStorage*: Em navegadores com restrições rígidas de privacidade ou modo anônimo, a rotina de recordes chaveia suavemente para um estado em memória sem emitir erros no console.

*   **Transição de Status**: A nova especificação foi registrada com sucesso no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

### 35. Elaboração e Especificação de Level Design: Rede Neural Evolutiva (`TASK_004.md`)

Como PO experiente em level design e focado no game feel, na interatividade tátil e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o minijogo **Rede Neural Evolutiva (rede_neural_evolutiva)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/rede_neural_evolutiva/TASKS/TASK_004.md):

*   **O que foi projetado e especificado**:
    *   **Modo Duelo Humano vs IA (Human vs AI Race/Survival)**: Desenhei um modo de corrida e sobrevivência em tempo real onde o jogador humano assume o controle direto de um bloco (`Player Alpha` ciano brilhante com indicador flutuante `"YOU"`) controlado por `Espaço`/`Seta para Cima`/`W`. O humano compete simultaneamente na mesma pista contra a população de IA (ou contra o cérebro carregado da elite), com placar dinâmico de liderança e banner de vitória ao quebrar o recorde histórico.
    *   **Mecanismo de Especiação por Nichos Ecológicos (NEAT Speciation & Island Model)**: Implementei a medição de distância genética $D(g_1, g_2)$ entre os pesos e vieses da MLP, agrupando a população em até 4 espécies genéticas com auras coloridas exclusivas (Ciano, Magenta, Esmeralda, Âmbar). Apliquei a partilha de fitness ($f'_i = f_i / \sqrt{N_{species}}$) para evitar a convergência prematura em mínimos locais e garantir diversidade genética continuada.
    *   **Chefe Obstáculo Dinâmico ("Titanus Core")**: Projetei um evento de chefe arcade que surge a cada 1000 pontos acumulados. O robô obstáculo possui linha guia de aviso amarela subterrânea, feixe de plasma horizontal de 15px de altura e capacidade de fragmentação em mini-jumpers de velocidades alternadas, disparando alertas visuais e sonoros táticos (`"WARNING: TITANUS CORE APPROACHING"`).
    *   **Visualizador de Topologia Neon 3D & Genetic Cluster Map 2D**: Atualizei o painel visualizador da rede neural para renderizar os neurônios em projeção 3D isométrica com feixes de luz neon pulsantes proporcionais à magnitude dos pesos ($|w|$), além de um minimapa de clusters 2D que plota a evolução e dispersão das espécies no espaço genético.
    *   **Sintetizador de Áudio e Feedback de Combate**: Efeitos procedurais via Web Audio API para o pulso do humano, laser de plasma do chefe, alarme bitonal e fanfarra triunfal em escala maior de 4 notas.

*   **Percalços Técnicos Identificados (Direcionamentos & Soluções)**:
    1.  *Sincronização de FPS no Modo Duelo*: Ao ativar o Modo Duelo Humano vs IA, a velocidade de simulação é travada automaticamente em `1x` para evitar que a aceleração do jogo prejudique os tempo de reação do ser humano.
    2.  *Paridade de Regras e Spectator Mode*: O jogador humano tem 1 vida por geração. Se ele colidir, permanece com 40% de opacidade espectando o restante da rodada da IA até a próxima geração recomeçar.
    3.  *Estabilidade do Cluster Map*: A limitação fixada em 4 espécies neon garante clareza visual no minimapa sem sobrecarregar a UI ou causar confusão de cores.

*   **Transição de Status**: A especificação foi integrada e registrada no backlog central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🎵 36. Elaboração e Especificação de Level Design: String Catcher (`TASK_004.md`)

Como PO experiente em level design e focado no game feel, no feedback tátil, na imersão e na excelente experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o minijogo **String Catcher (visual_effects)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/visual_effects/TASKS/TASK_004.md):

*   **O que foi projetado e especificado**:
    *   **Modo Campanha de Level Design Rítmico ("Synth Odyssey")**: Desenhei uma campanha temática artesanal de 5 fases (*Neon Genesis*, *Cyber Highway*, *Warp Acceleration*, *Quantum Glitch*, e *Cybernetic Kraken*) com curvas de aprendizado progressivas, Zonas Gravitacionais Warp (oscilação senoidal da velocidade das notas) e Glitch Inverted Notes.
    *   **Batalha de Chefe Final ("Cybernetic Kraken")**: Projetei um chefe em 3 estágios com tentáculos bioluminescentes que bloqueiam cordas taticamente, barra de HP dedicada na HUD superior e desfecho viciante acionado pelo *Hyper Beam* do Overdrive.
    *   **Editor Visual de Fases (Beatmap Studio & Creator)**: Criei uma suite modal/painel glassmorphism com timeline rítmica rolável (Grid Snapping em 1/4, 1/8, 1/16, BPM ajustável), paleta de pincéis de notas (Normal, Hold, Mina, Frenzy, Shield), Playtest instantâneo em 1 clique (`Espaço`) e exportação/importação de beatmaps em JSON simples.
    *   **Sistema de Precisão Milimétrica (Hit Windows) & Offset Floaters**: Especifiquei a classificação matemática de acertos (🌟 *MARVELOUS* $\le \pm 22\text{ms}$, ✨ *PERFECT* $\le \pm 45\text{ms}$, 🎵 *GREAT* $\le \pm 80\text{ms}$, ❌ *MISS* $> 80\text{ms}$) com floaters visuais em tempo real indicando offset exato (ex: `-14ms` Early, `+9ms` Late) e Ranks finais de desempenho (S+, S, A, B, C, F).
    *   **Mecânica de Super Carga OVERDRIVE**: Projetei a barra de carga ativada com 100% de energia, oferecendo 10s de pontuação quadruplicada (**4x**), Bullet-Time visual no canvas, emissão de ondas de plasma dourado e sub-bass sweep procedural sintetizado via Web Audio API.

*   **Percalços Técnicos Identificados (Direcionamentos & Soluções)**:
    1.  *Usabilidade do Editor em Telas Menores*: A timeline do Beatmap Studio pode ser extensa em notebooks/monitores compactos. Recomendei incluir um botão de toggle "Collapse Studio" para ocultar os seletores secundários e priorizar a visão do canvas das cordas.
    2.  *Descarte Limpo de Hit Floaters*: Para manter a taxa de quadros travada em 60 FPS no Canvas 2D durante sequências densas de notas, a lista `activeHitFloaters` faz descarte automático de instâncias expiradas (`life <= 0`).
    3.  *Persistência de Fases Customizadas*: Os mapas criados no editor usam chaveamento seguro no `localStorage` com tratamento de erro gracioso caso o armazenamento local atinja limites de quota.

*   **Transição de Status**: A especificação foi devidamente registrada e integrada no backlog central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🦠 37. Elaboração e Especificação de Level Design: Conway's Game of Life (`TASK_004.md`)

Como PO experiente em level design, focado no game feel, interatividade e experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_004** para o minijogo **Conway's Game of Life (gameoflife)** no arquivo [TASK_004.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/gameoflife/TASKS/TASK_004.md):

*   **O que foi projetado e especificamente elaborado**:
    *   **Simulação Multi-Espécies (Conway Bio-Wars - Eco-Territorial Rules)**: Criei mecânicas ecológicas de coexistência e competição espacial entre 3 espécies de células distintas (Ciano Neon `#00f3ff`, Magenta Neon `#ff00aa` e Dourado Neon `#ffcc00`). Adicionei voto de maioria para determinação da espécie no nascimento e assimilação territorial ("conquista") caso 4 ou mais vizinhos de uma única espécie adversária cerquem a célula. Inclui HUD com barra de biodiversidade e dominância populacional.
    *   **Suíte de Pincéis Avançados (Automa Brush Suite)**: Desenhei novos seletores de pincel: Spray Caótico (distribuição aleatória em raio 1x1 a 5x5), Lançador de Gliders Orientável, Paredes Indestrutíveis (`grid[r][c] = 99` - obstáculo metálico com contorno neon que bloqueia contagem de vizinhos) e Borracha Neon Ativa.
    *   **Filtros Neon Shaders & Pós-Processamento no Canvas**: Projetei opções estéticas como o Bloom Neon Glow (`ctx.filter`), Rastro de Fosfato Retiniano (CRT Motion Blur via `rgba(7, 9, 19, 0.22)`) e o Fundo Holográfico Matrix Rain com chuva binária.
    *   **Importador e Exportador Universal RLE (LifeWiki Standard)**: Desenhei o parser e modal glassmorphic para colar arquivos no padrão `.rle` da comunidade global do Game of Life (descompactando repetições `b`, `o`, `$` e `!`), além de exportação direta do tabuleiro para RLE em 1 clique e download de Snapshot PNG.
    *   **Áudio Adaptativo Multi-Espécies (Web Audio API Engine)**: Mapeei timbres sintetizados exclusivos para cada espécie (Senoidal para Ciano, Triangular para Magenta, Dente de Serra passa-baixa para Dourado) mantendo throttle de 120ms e limite de 4 vozes para prevenir cacofonia.

*   **Percalços Técnicos Identificados & Soluções Recomendadas**:
    1.  *Persistência de Paredes no Randomize*: Recomendo que o botão "Aleatório" preserve as paredes indestrutíveis desenhadas pelo jogador, preenchendo apenas células vivas nos espaços vazios, para permitir a criação de labirintos e batalhas territoriais estruturadas.
    2.  *Imunidade das Paredes ao Buraco Negro*: Paredes indestrutíveis não devem ser devoradas pelo Buraco Negro da TASK_003, servindo como escudos táticos.
    3.  *Exportação RLE x Multi-Espécies*: Como a especificação RLE padrão da LifeWiki lê apenas 2 estados (vivo/morto), a exportação RLE converterá todas as espécies para células vivas `o`. Para preservar os tipos e paredes, recomendei uma exportação secundária em formato JSON.

*   **Transição de Status**: A tarefa foi inserida no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status inicial `📋 Backlog` para ser puxada e refinada na esteira de desenvolvimento.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🎯 38. Elaboração e Criação de Nova Tarefa: 3D Shooter (`TASK_005.md`)

Como PO experiente em jogos, focado em melhores práticas de level design e priorizando a experiência e imersão do jogador, elaborei e criei formalmente a especificação técnica da **TASK_005** para o minijogo **3D Shooter (3d_shooter)** no arquivo [TASK_005.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/3d_shooter/TASKS/TASK_005.md):

*   **O que foi projetado e especificado**:
    *   **Modo Arena Survival por Ondas (Wave Survival Mode)**: Introdução de um modo de sobrevivência selecionável no menu inicial com escalada de dificuldade por ondas (1 a 10+), arena dedicada 24x24 com colunas de cobertura e geradores de spawn neon, 10s de fase de preparação entre ondas com spawn de kits médicos e munições, e HUD Glassmorphic com contagem de inimigos e combos.
    *   **Inimigos Voadores Drones Anti-Gravidade (Tipo 13)**: Novo tipo de monstro voador com oscilação senoidal de altura no motor Raycaster DDA (`spriteYOffset`), movimentação helicoidal evasiva para desviar de mísseis e ataque com disparo duplo de lasers ciano paralelos.
    *   **Elevadores Físicos de Nível (Tile Tipo 14)**: Plataformas de elevação que elevam a altura da visão e câmera do jogador (`player.eyeZ` de 0.0 a 1.2 unidades), permitindo vantage points elevados (*High Ground Advantage*) para disparar por cima de paredes da arena e acessar pickups estratégicos.
    *   **Chefe Colossal "Cyber-Demon Core" (Multistage Boss)**: Batalha em 3 fases: Fase 1 (Escudo Hexagonal Defletor que exige destruir 2 geradores nos elevadores), Fase 2 (Mísseis termoguiados e Onda de Choque Sísmica de solo que força o jogador a saltar ou subir no elevador), e Fase 3 (Modo Berserker vermelho neon com varredura contínua de Hyper-Beam).
    *   **Áudio Procedural via Web Audio API**: Zumbidos de levitação de drones, ruído mecânico de elevador subindo, rugido/onda de choque do boss e fanfarra triunfal de conclusão de onda sem carregar assets externos.

*   **Percalços Técnicos Identificados & Soluções Recomendadas**:
    1.  *Matemática de Y-Offset no Raycaster*: A introdução de elevadores (`player.eyeZ`) e drones voadores (`sprite.yOffset`) exige que o algoritmo `renderSprites()` calcule o deslocamento vertical proporcional à distância do raio (`transformY`), garantindo que o drone pareça voar acima do solo sem distorção perspectiva.
    2.  *Evitando Furos no High Ground*: Quando o jogador se eleva no elevador ($eyeZ = 1.2$), paredes de 1.0 unidade de altura devem permitir visão por cima. O algoritmo de rendering do Raycasting deve desenhar o topo das paredes baixas quando vistas de cima para evitar vazamento visual no frustum.
    3.  *Persistência de High Score*: Criada a chave `3dShooterSurvivalHighScore` no `localStorage` para salvar o recorde de onda e pontuação máxima do jogador.

*   **Transição de Status**: A tarefa foi inserida com sucesso no backlog central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🐉 39. Elaboração e Especificação de Level Design: RPG Adventure Quest (`TASK_005.md`)

Como PO experiente em level design e focado na imersão, game feel e retenção do jogador, elaborei e criei formalmente a especificação técnica de **TASK_005** para o jogo **RPG Adventure Quest (ded)** no arquivo [TASK_005.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/ded/TASKS/TASK_005.md):

*   **O que foi projetado e especificado**:
    *   **Sistema de Companheiros/Mascotes de Combate (Pet System)**: Adote 3 tipos de companheiros no Santuário Ancestral: Coruja Arcana (Aethelgard - regeneração de Mana e Visão Astral), Lobo das Sombras (Fenris - ataques automáticos por turno e Mordida Dilacerante) e Golem de Pedra (Granite - absorção de dano físico e Provocação Rochosa). HUD dedicada ao lado do painel de combate com barra de energia e cooldown de habilidade ativa.
    *   **Laboratório de Alquimia & Forja de Runas (Crafting System)**: Coleta de ingredientes rúnicos (*Erva Sangrenta*, *Pó Arcano*, *Minério de Obscuriana*, *Escama de Vulcano*) para forjar Elixires de Vida, Poções de Fúria e Encantamentos Rúnicos de Fogo/Proteção na modal glassmorphic de Crafting (`#crafting-modal`).
    *   **Masmorra Volcânica & Batalha contra Pyrothrax**: Expansão do minimapa com 3 novas cenas em ambiente vulcânico (Ponte de Basalto com teste de DES, Ninho de Vivernes e Covil do Dragão). Batalha multi-fase contra o chefe *Pyrothrax, o Flagelo de Magma* (150 HP), com sopro de chamas telegrafado e modo Berserker com faíscas incandescentes no teto.
    *   **Partículas & Sintetizador Web Audio API**: Motor de partículas de brasas incandescentes flutuando no Canvas, martelada de forja sintetizada, rugido grave de dragão ($120\text{Hz} \to 50\text{Hz}$), sopro de fogo e efeitos vocais nativos dos mascotes.

*   **Percalços Técnicos Identificados & Soluções Recomendadas**:
    1.  *Gestão de Inventário*: Para evitar poluição dos slots limitados de poções/equipamentos de combate do jogador, recomendei que os ingredientes de crafting sejam mantidos em uma estrutura separada (`gameState.crafting.materials`).
    2.  *Troca de Mascotes no Santuário*: O jogador pode retornar ao nó `pet_sanctuary` para alterar seu companheiro livremente fora de combate, com a ressalva de que a lealdade/cooldown do novo mascote é iniciada do zero para evitar exploits de troca imediata.
    3.  *Visual Incandescente no Minimapa*: Nós da Masmorra Volcânica devem ser renderizados no minimapa SVG com bordas de neon carmesim pulsante para alertar o jogador sobre o nível extremo de perigo.

*   **Transição de Status**: A nova especificação foi registrada e inserida com sucesso no backlog central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🛸 40. Elaboração e Criação de Nova Tarefa: Space Shooter (`TASK_005.md`)

Como PO experiente em jogos, focado em melhores práticas de level design, game feel e na experiência do jogador, elaborei e criei formalmente a especificação técnica da **TASK_005** para o minijogo **Space Shooter (space_shooter)** no arquivo [TASK_005.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/space_shooter/TASKS/TASK_005.md):

*   **O que foi projetado e especificado**:
    *   **Sistema de Drones Orbitais de Apoio (Wingman Support Drones)**: Adição da aba "Drones de Apoio" no Hangar permitindo equipar até 2 drones simultâneos (1 Aegis + 1 Striker) com órbita circular trigonométrica em torno da nave ($R = 45\text{px}, \omega = 2.0\text{rad/s}$). O Drone Aegis intercepta projéteis inimigos em um raio de $25\text{px}$ ativando ondas de dispersão e o Drone Striker dispara lasers automatizados a cada $800\text{ms}$ contra o alvo de menor HP.
    *   **Modo Swarm Siege (Invasão de Enxames Xenomórficos)**: Introdução de ondas massivas de 12 a 24 mini-drones (*Xeno Swarmers*) com IA de bando baseada nas equações de Craig Reynolds (Separação, Coesão e Alinhamento) aliada a atração ao jogador. Explosões em cadeia geram floaters de combo neon e juiciness em tempo real.
    *   **Chefe Titânico "Star-Devourer Leviathan" (Boss Fight Modular)**: Batalha modular em 3 fases com sub-partes destrutíveis independentes (Asa Esquerda $150\text{ HP}$, Asa Direita $150\text{ HP}$ e Núcleo Central $350\text{ HP}$ protegido por escudo holográfico invulnerável até a destruição de ambas as asas). Quando o núcleo atinge $<40\%\text{ HP}$, ativa o *Vórtice Abissal* telegrafado com repulsão magnética.
    *   **Áudio Procedural com Web Audio API**: Síntese analógica nativa sem dependência de assets para absorção de escudo, laser duplo do drone striker, explosão de boids em cadeia e queda de tom sub-grave ($150\text{Hz} \to 30\text{Hz}$) ao quebrar partes do chefe.

*   **Percalços Técnicos Identificados & Soluções Recomendadas**:
    1.  *Desempenho de Boids Flocking*: O cálculo de distância $O(N^2)$ para 24 boids no DOM pode impactar a taxa de quadros em navegadores legados. Recomendo limitar o raio de vizinhança a $80\text{px}$ e utilizar throttle de amostragem de vizinhos em frames alternados.
    2.  *Órbita Trigonômétrica dos Drones*: Para evitar travamentos ao pausar o jogo ou redimensionar a tela, o cálculo do ângulo orbital usa delta de tempo normalizado (`timestamp * 0.003`) acoplado ao loop principal `requestAnimationFrame`.
    3.  *Persistência de Drones no LocalStorage*: Os estados `spaceShooterUnlockedDrones` e `spaceShooterActiveDrones` foram padronizados em arrays JSON serializados de forma compatível com a economia existente `spaceShooterCoins`.

*   **Transição de Status**: A nova especificação foi registrada e inserida com sucesso no backlog central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏎️ 41. Elaboração e Especificação de Level Design: Driving Simulator (`TASK_005.md`)

Como PO experiente em jogos, focado em melhores práticas de level design, game feel e na jornada do jogador, elaborei e criei formalmente a especificação técnica da **TASK_005** para o minijogo **Driving Simulator (driving_simulator)** no arquivo [TASK_005.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/driving_simulator/TASKS/TASK_005.md):

*   **O que foi projetado e especificado**:
    *   **Sistema de Pistas Temáticas Multi-Bioma (Multi-Track Level Design)**: Projetei a expansão do jogo com 3 pistas temáticas selecionáveis no menu/garagem:
        *   *Pista 1: Neon City Flyovers (Metrópole Cyberpunk)*: Viadutos 3D elevados (`y = 15`), curvas inclinadas e Boost Pads neon ciano (+40% velocidade instantânea).
        *   *Pista 2: Vulcano Ridge Pass (Cânion Vulcânico)*: Terreno acidentado com poças de lava incandescentes (dano contínuo de -15% integridade/s e fumaça preta) e queda de rochas abrasivas (Rockfall Hazards) telegrafadas por sombras no solo.
        *   *Pista 3: Sub-Zero Glacier Sprint (Passagem da Geleira)*: Pista em túneis de gelo reflexivo (`roughness = 0.05`) reduzindo a aderência em 60%, paredes de gelo cristalino destruíveis por Nitro para revelar atalhos ocultos e tempestade de neve (Blizzard FX).
    *   **Personalização Visual no Hangar 3D (Visual Tuning System)**: Especifiquei a adição de luzes *Neon Underglow* sob o chassi (com paleta Ciano, Magenta, Matrix, Dourado e ciclo RGB), *Spoilers 3D equipáveis* (*Sport Wing*, *Cyber GT* e *Titan Dual-Blade*) e *Acabamentos de Lataria* (Fosco, Brilhante e Metálico Cromado) com persistência em `localStorage`.
    *   **Combate Veicular Tático & Takedowns Cinemáticos (Burnout Takedown Engine)**: Criei a mecânica de *Side Slam* (teclas `Q`/`E` para empurrão lateral) que, ao colidir rivais ou viaturas contra muretas ou perigos do cenário, aciona Bullet-Time de 600ms (`timeScale = 0.3`), tremor direcional de câmera, faíscas neon e bônus de +50% Nitro + 500 moedas.
    *   **Batalha contra Chefe Colossal "Titan Rig" (18-Wheeler Boss Fight)**: Desenhei a batalha final contra um caminhão blindado gigante com barra de vida de 100 HP na HUD, que ataca com minas magnéticas, manchas de óleo em chamas e abalroamentos. O jogador deve desferir *Side Slams* nos tanques laterais de combustível energizados destacados em neon vermelho.
    *   **Trilha Sonora Adaptativa Procedural Synthwave (Web Audio API Engine)**: Projetei a geração sonora em tempo real sem assets para linha de baixo pulsante em colcheias a 130 BPM, arpejos senoidais Synthwave adaptativos à velocidade, bateria sintetizada analógica e filtro de áudio abafado (*Muffle Filter*) durante derrapagens.

*   **Percalços Técnicos Identificados & Soluções Recomendadas**:
    1.  *Descarte Limpo de Fragmentos de Gelo*: Ao destruir barreiras de gelo na pista da geleira, o loop de animação deve invocar obrigatoriamente `.dispose()` em geometrias e materiais para prevenir vazamentos de memória no WebGL.
    2.  *Desempenho da Síntese Synthwave*: A geração de múltiplos osciladores e envelopes em tempo real pode sobrecarregar threads de CPU em navegadores com hardware reduzido. Recomendei adicionar a opção "Áudio Synth: Alto / Baixo" no menu para atenuar vozes secundárias se necessário.
    3.  *Persistência da Garagem Customizada*: A chave `driving_custom_garage` no `localStorage` serializa com segurança os estados visuais dos veículos sem interferir na carteira de moedas existente.

*   **Transição de Status**: A nova especificação foi registrada e inserida com sucesso no backlog central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🚁 42. Elaboração e Especificação de Level Design: Voxel City (`TASK_005.md`)

Como PO experiente em jogos, focado nas melhores práticas de level design e na primazia da experiência do jogador, elaborei e criei formalmente a especificação técnica da **TASK_005** para o minijogo **Voxel City (voxel_city)** no arquivo [TASK_005.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/voxel_city/TASKS/TASK_005.md):

*   **O que foi projetado e especificado**:
    *   **Pilotagem Aérea com Helicóptero Voxel (Air Operations & Helipad 🚁)**: Introduzi a navegação no eixo `Y` com o controle de altitude, guinada e inclinação do Helicóptero de Resgate Voxel 3D. O helicóptero possui rotores animados em tempo real, holofote de busca ciano orientável (`THREE.SpotLight`) e acesso pelo heliponto do arranha-céu central.
    *   **Caminhão Guincho & Cabo Magnético (Tow Truck & Magnet Crane 🚛🧲)**: Adicionei o veículo de resgate veicular com cabo estendível de partículas e ímã ativável (`Shift` / `Espaço`) para rebocar carros civis quebrados até a Garagem Central em missões de resgate remuneradas (`+ $400 TOW BONUS`).
    *   **Purga de Nitro Neon & Vácuo Aerodinâmico (Slipstream / Drafting 💨⚡)**: Projetei a manobra de purga visual de fumaça neon (`Tecla F`) para conceder tração limpa e aceleração inicial de 1.5s, além do vácuo aerodinâmico ao colar atrás de carros civis (ganho de +20% velocidade máxima e recarga 50% mais rápida do Nitro).
    *   **Modo Desastre Urbano (Incêndios & Terremoto 🔥🏗️)**: Eventos aleatórios a cada 120s com sirene e foco de fogo neon nos edifícios voxel. O jogador combate o incêndio com o canhão de água 3D do Caminhão de Bombeiros ou com o balde de água do Helicóptero antes que a integridade da estrutura zere.
    *   **Sintetizador de Áudio Procedural Web Audio API Engine**: Síntese procedural nativa para pás de helicóptero modulando ruído rosa via LFO ($8\text{Hz} \to 16\text{Hz}$), sopro de purga de ar comprimido, jorro pressurizado de água e sirene bitonal.

*   **Percalços Técnicos Identificados & Soluções Recomendadas**:
    1.  *Alcance de Câmera e Frustum de Visão Aérea*: A altitude de voo ($Y \approx 45$) pode cortar edifícios se `camera.far` for curto. Recomendei estender suavemente `camera.far = 500` e `scene.fog.far = 400` durante a pilotagem aérea.
    2.  *Física de Colisão de Aeronaves*: Para evitar mortes punitivas, colisões aéreas em prédios causam ricochete elástico com perda de 20 HP e faíscas neon em vez de falha imediata.
    3.  *Pool de Partículas de Água e Fogo*: O canhão de água reutiliza um buffer fixo de 250 instâncias de `THREE.Points` para manter a taxa de quadros em 60 FPS cravados.

*   **Transição de Status**: A nova especificação foi registrada e inserida com sucesso no backlog central [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

*Assinado: Antigravity - Senior Game Product Owner (PO)*















