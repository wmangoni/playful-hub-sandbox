# 📂 Arquitetura e Padrões - Planning Poker

Um jogo de **Planning Poker** (Pôquer de Planejamento) para times de desenvolvimento estimarem tarefas em conjunto. O time inteiro acessa a mesma página em tempo real via WebSocket, cada participante vota de forma secreta no tamanho da tarefa (escala Fibonacci) e o moderador revela os votos.

## 🏗️ Arquitetura do Código

O jogo é dividido entre frontend estático e backend de salas:

- **`index.html`**: Contém toda a interface visual (tela de entrada, sala de votação, baralho de cartas) e o cliente WebSocket em JavaScript vanilla. Segue o padrão do repositório de jogos auto-contidos em um único arquivo.
- **`server.js` (raiz do repositório)**: Coexiste com o servidor Express existente. Um `WebSocketServer` (`ws`) é atrelado ao mesmo servidor HTTP, sem interferir no roteamento atual de páginas e assets.
- **Gerenciador de Salas (in-memory)**: Um `Map<roomId, Room>` mantém o estado de todas as salas ativas apenas em memória (sem persistência). Salas são removidas quando ficam vazias.

### Fluxo de Inicialização e Execução:
1. **Entrada**: O usuário informa um nome e clica em "Criar sala" (ou acessa diretamente uma URL com hash).
2. **Criação de Sala**: Sem hash na URL, o servidor gera um id curto único (6 chars base62), cria a sala e redireciona (`302`) para `/planning_poker/<id>`.
3. **Conexão**: O cliente abre o WebSocket nos parâmetros da URL, envia `join { name }` e o servidor responde com `room_state`.
4. **Votação**: Cada jogador seleciona uma carta (Fibonacci), que fica oculta; todos veem o status "votou ✓ / aguardando".
5. **Revelação**: `reveal` vira as cartas de todos; `reset` inicia uma nova rodada.

## 🧩 Padrões de Projeto Aplicados

- **Event-Driven (Programação Dirigida a Eventos)**: Cluster de mensagens tipadas `{ type, payload }` trafegando pelo WebSocket; o servidor roteia para o handler correspondente e o cliente atualiza o DOM reativamente ao estado recebido.
- **State Pattern (Padrão Estado)**: Cada `Room` possui `phase: 'voting' | 'revealed'`. Votos só podem ser alterados em `voting`; `reveal` é idempotente e `reset` volta ao início.
- **Single Source of Truth**: O **servidor** é a única fonte de verdade do estado. O cliente apenas renderiza o estado que recebe (nunca "deduz" o voto dos outros).
- **Room Registry (Registro de Salas)**: `Map` de salas em memória com geração de hash curto base62 e limpeza automática de salas/sessões órfãs via heartbeat.

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **Node.js + Express**: Servidor HTTP existente do Playful Hub.
- **`ws`**: Biblioteca WebSocket mínima para a camada de tempo real.
- **HTML5 & CSS3 Variables**: Interface escura neon, alinhada à identidade do hub, com variáveis CSS em `:root`.

## 🔑 Funções e Estruturas Principais (planejadas)

- Servidor:
  - `generateRoomId()`: Gera hash único de 6 chars base62, recalculando em caso de colisão.
  - `handleJoin / handleVote / handleReveal / handleReset`: Handlers das mensagens do protocolo.
  - `heartbeat(socket)`: `ping/pong` periódico para detectar e remover conexões mortas.
  - `broadcast(room, message)`: Envia o estado/evento a todos os membros da sala.
- Cliente:
  - `connect(url)`: Abre a conexão e registra handlers (`room_state`, `player_joined`, `player_left`, `vote_cast`, `revealed`, `error`).
  - `renderPlayers(players)`: Grid de jogadores com status de voto.
  - `renderDeck(phase)`: Baralho Fibonacci interativo, travado após a revelação.
  - `copyRoomLink()`: Copia `/planning_poker/<id>` para a área de transferência.