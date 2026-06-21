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

## 🧩 5. Elaboração e Criação de Nova Tarefa: Tetris (TASK_003)

Para dar continuidade à evolução de qualidade da plataforma **Playful Hub**, elaborei e criei formalmente a tarefa **TASK_003** para o jogo **Tetris**, focando em mecânicas clássicas e de alto impacto de Game Design e Retenção do Jogador:

*   **O que foi feito**:
    *   Criei a especificação detalhada em [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/tetris/TASKS/TASK_003.md).
    *   **Progresso e Gravidade Inteligente**: Curva de queda exponencial clássica e animação premium neon de "LEVEL UP!".
    *   **Mapeamento de T-Spin e Combo**: Algoritmo matemático preciso da "Regra dos 3 Cantos" para T-Spin e multiplicador progressivo de combos de linhas eliminadas, com floaters textuais de feedback de pontuação neon de altíssimo impacto visual no Canvas.
    *   **Modo Sobrevivência sob Pressão**: Grade inicial com blocos de lixo (garbage rows) e deslocamento vertical periódico com contador de tensão regressivo e alertas de áudio para aumentar o engajamento e a adrenalina.
*   **Transição de Status**: A tarefa foi inserida com sucesso na base de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status inicial `📋 Backlog`, aguardando refinamento técnico detalhado e desenvolvimento pelos próximos agentes da esteira.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🏎️ 6. Elaboração e Criação de Nova Tarefa: Driving Simulator (TASK_003)

Para expandir as possibilidades de jogabilidade e refinar o level design do **Driving Simulator**, criei e elaborei formalmente a especificação técnica de **TASK_003** focada na retenção do jogador e interações premium em Three.js 3D:

*   **O que foi feito**:
    *   Criei e detalhei as especificações em [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/driving_simulator/TASKS/TASK_003.md).
    *   **Level Design Dinâmico**: Projetei física de impulso elástico para cones destrutíveis tridimensionais, efeito de spin-out de 360° em poças de óleo e trajetória de saltos em rampas parabólicas neon com câmera lenta global (Bullet-Time) e tremor de tela para alto impacto visual.
    *   **Mecânica de Pit Stop (Damage & Fuel)**: Incorporei barra de integridade estrutural (danos ativos com emissão procedural de fumaça cinza/preta e fogo e corte de 40% da velocidade máxima), gerenciamento de combustível por aceleração e acostamentos iluminados com Pads neon de reabastecimento e reparo progressivo.
    *   **Modo Time Trial com Drift Ghost**: Adicionei um cronômetro milimétrico por voltas e modelagem do Carro Fantasma Holográfico (Ghost Car) que replica o melhor tempo anterior do jogador para alimentar um ciclo competitivo saudável.
*   **Transição de Status**: A tarefa foi inserida no backlog global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `✅ Refined` devido ao nível cirúrgico de detalhamento técnico fornecido, estando 100% pronta para ser puxada por um desenvolvedor.

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## 🐍 7. Elaboração e Criação de Nova Tarefa: Snake Game (TASK_003)

Como PO experiente em level design e focado na experiência do jogador, elaborei e criei formalmente a especificação técnica de **TASK_003** para o **Snake Game** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/snake/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Portais Dimensionais (Grid Portals)**: Desenhei uma mecânica espacial tática de teletransporte usando portais neon Azul e Laranja/Âmbar no grid, ativos quando o jogador atinge 10 pontos. O teletransporte preserva a direção do movimento da cobra e adiciona um efeito pulsante dinâmico.
    *   **Cobra Rival IA (Evolutive AI Rival)**: Planejei a introdução de uma cobra adversária inteligente de grid a partir de 20 pontos, que compete ativamente por comida usando heurística de distância Manhattan com desvio básico de colisões. Se ela colidir ou for derrotada pelo jogador, seus segmentos explodem em **Golden Apples** valendo **3 pontos** cada, criando um loop tático de risco e recompensa fantástico!
    *   **Estética de Juiciness Premium**: Projetei um sistema dinâmico de **Partículas Neon (Neon Trails)** emitido na ponta da cauda e curvas da cobra, aliado a efeitos de **Screen Shake (Tremor de Tela)** reativos para acentuar impactos cruciais (teleportes, consumo de comida especial/dourada e explosão da IA rival).
*   **Transição de Status**: A tarefa foi inserida com sucesso no banco de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`, pronta para que o time de desenvolvimento a assuma.

Não encontrei nenhum percalço ou inconsistência ao criar a tarefa; a base do Snake Game é muito estável e ideal para a implementação deste escopo altamente imersivo e premium!

*Assinado: Antigravity - Senior Game Product Owner (PO)*

---

## ⚔️ 8. Elaboração e Criação de Nova Tarefa: Voxel Arena (TASK_002)

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

## 🚀 9. Elaboração e Criação de Nova Tarefa: Space Shooter (TASK_003)

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

## 👑 10. Elaboração e Criação de Nova Tarefa: Chess (TASK_003)

Como PO sênior de jogos focado em game feel, mecânicas competitivas e retenção de jogadores, elaborei e criei com sucesso a especificação de **TASK_003** para o jogo **Chess** no arquivo [TASK_003.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/chess/TASKS/TASK_003.md):

*   **O que foi feito**:
    *   **Relógio de Xadrez Dinâmico (Chess Clock)**: Projetei um sistema de relógio duplo neon/glassmorphism com presets de tempo clássicos (Bullet 1+0, Blitz 3+2, Blitz 5+0, Rápido 10+0) e o Modo Zen (sem tempo). O relógio conta milissegundos e ativa o "Critical Time Alert" vibrante (vermelho neon pulsante) com efeito sonoro de tique-taque quando restam menos de 10 segundos, além de vitória por estouro de tempo (flagged).
    *   **Biblioteca de Desafios Táticos (Modo Puzzle)**: Desenhei uma suite inicial de 3 puzzles clássicos em FEN com validação ativa de lances do jogador (Xeque-Mate do Pastor, Xeque-Mate do Corredor e Garfo Tático de Cavalo). Acertos desencadeiam bônus de rating e fanfarras de sucesso, enquanto erros reiniciam a FEN do desafio.
    *   **Áudio Sintetizado Dinâmico via Web Audio API**: Resolvi o percalço de políticas de reprodução de áudio dos navegadores projetando a síntese de som procedural em tempo real com osciladores (normal, captura, xeque e fanfarra triunfal).
    *   **Estética Premium de Juiciness (Game Feel)**: Adicionei especificações detalhadas de Screen Shake (tremor de tela) ao capturar peças pesadas ou dar xeque, rastro neon dinâmico nas últimas jogadas e explosão física de partículas SVG na coordenada cartesiana exata da captura.
*   **Transição de Status**: A nova especificação foi inserida com sucesso no banco de dados global [BACKLOG.md](file:///d:/Users/Home/Documents/repos/playful-hub-sandbox/BACKLOG.md) no status `📋 Backlog`.

Não detectei nenhum percalço ou inconsistência física ao analisar a base do xadrez; a integração das bibliotecas Chessboard.js e Chess.js é madura e perfeitamente apta para este refinamento estético e competitivo de nível profissional!

*Assinado: Antigravity - Senior Game Product Owner (PO)*






