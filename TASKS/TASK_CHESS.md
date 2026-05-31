# 📝 TASK-CHESS: Motor de Análise (Stockfish.js), Importador/Exportador PGN e Temas de Tabuleiro

## 👤 User Story
*   **Como** enxadrista no minijogo **Chess**,
*   **Eu quero** visualizar a análise tática de meus lances com uma barra de vantagem em tempo real, poder importar ou exportar partidas no formato oficial PGN e alterar a skin visual do tabuleiro e peças,
*   **Para que** eu possa treinar táticas de xadrez de forma analítica, registrar e estudar minhas jogadas e personalizar a estética do jogo.

---

## 🎯 Critérios de Aceitação
1.  **Motor de Análise em Tempo Real (Stockfish.js)**:
    *   Integrar de forma assíncrona o **Stockfish.js** (executado localmente em um Web Worker para não travar a UI).
    *   Exibir uma "Barra de Vantagem" vertical ao lado do tabuleiro mostrando a avaliação estrita da posição (ex: +2.4 para Brancas, -1.5 para Pretas ou "#M3" para mate em 3).
    *   Exibir uma seta sutil no tabuleiro indicando qual é o lance tático recomendado pelo motor para o jogador no turno corrente.
2.  **Importador e Exportador PGN/FEN (Game History)**:
    *   Disponibilizar botões para:
        *   *Copiar FEN*: Copia a string de notação posicional do estado atual do jogo.
        *   *Exportar PGN*: Gera a string PGN contendo o histórico numerado de todos os lances realizados na partida ativa.
        *   *Carregar Partida (PGN/FEN)*: Caixa de texto para colar uma FEN ou PGN existente e carregar instantaneamente o estado no tabuleiro para replay passo a passo.
3.  **Hangar de Temas Visuais (Skins)**:
    *   Adicionar um dropdown de seleção de temas gráficos:
        *   *Classic Wood (Tradicional)*: Tabuleiro de madeira texturizado e peças esculpidas tradicionais.
        *   *Glassmorphism (Moderno)*: Elementos translúcidos estilo vidro fosco com brilho de bordas.
        *   *Neon Cyber (Playful Hub)*: Cores vibrantes verde e roxo neon com efeito glow nos blocos selecionados.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/chess/index.html`.
*   **Integração do Web Worker**:
    *   Instanciar o Stockfish via Worker: `const stockfish = new Worker('stockfish.js')` (ou apontando para uma CDN pública estável do Stockfish.js).
    *   Enviar comandos no padrão **UCI (Universal Chess Interface)**: `position fen ...` seguido por `go depth 10`.
*   **Parser de Histórico**:
    *   Utilizar ou estender uma biblioteca simples de xadrez em JS (como `chess.js`) para validar lances, detectar empates por repetição ou insuficiência de material e realizar o mapeamento PGN fiel.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (A elevação de uma IA simples de xadrez para uma suite analítica completa atrai enxadristas sérios).
*   **Esforço Estimado**: Alta (Sincronizar a engine assíncrona em Web Worker e gerenciar o histórico PGN sem quebrar a renderização manual exige alta proficiência).
*   **Área**: Front-end / Web Workers / Motores de Inteligência Artificial.
