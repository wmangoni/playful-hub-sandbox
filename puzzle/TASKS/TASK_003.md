# 🧩 TASK-PUZZLE: Templo Celestial de Constelações, Sistema de Conquistas (Achievements) e Coleção de Relíquias Místicas (Grimório de Lore)

## 👤 User Story
* **Como** decifrador de segredos no minijogo **Mind Labyrinth: A Puzzle Adventure**,
* **Eu quero** enfrentar um novo tipo de enigma chamado "Conexão Estelar" baseado em constelações e ordenação estelar tátil, e desbloquear relíquias lendárias permanentes com pequenos bônus passivos e fragmentos de história (lore) no meu Grimório de Relíquias ao realizar feitos de inteligência,
* **Para que** a experiência de jogo ganhe uma camada profunda de metaprogressão, recompensas colecionáveis cativantes, jogabilidade diversificada e feedbacks visuais e sonoros estelares e mágicos.

---

## 🎯 Critérios de Aceitação

### 1. Novo Enigma: Conexão Estelar (Celestial Constellations Connect)
* **Visual do Canvas**: Apresentar um céu noturno profundo e escuro com estrelas brilhantes piscantes renderizadas no canvas do enigma.
* **Componentes de Gameplay**:
  * Gerar proceduralmente entre **5 e 8 estrelas** em posições não sobrepostas no canvas do puzzle.
  * Cada estrela deve possuir um rótulo textual místico (ex: símbolos do zodíaco ou runas numéricas) e uma cor característica correspondente ao seu espectro de temperatura (Vermelho, Laranja, Amarelo, Branco, Azul).
  * As estrelas devem ter diâmetros ligeiramente distintos para denotar seu brilho/magnitude aparente.
* **Regras de Resolução (Lógica de Conexão)**:
  * Exibir no cabeçalho um dos três enigmas astrológicos gerados dinamicamente:
    1. *"Conecte as estrelas do espectro mais quente ao mais frio (Azul ➔ Branco ➔ Amarelo ➔ Laranja ➔ Vermelho)"*.
    2. *"Desenhe a constelação ordenando os símbolos rúnicos em ordem alfabética arcana"*.
    3. *"Ligue os nós celestes em ordem crescente de brilho e magnitude (do menor ao maior diâmetro)"*.
  * O jogador clica e arrasta para traçar uma linha contínua conectando as estrelas na ordem lógica determinada.
  * As linhas traçadas devem ter brilho neon ciano/dourado (`ctx.shadowBlur = 10`, `ctx.shadowColor = '#ffd700'`).
  * Se o jogador errar a sequência de conexão, a linha pisca em vermelho e se desfaz, tocando um som grave e aplicando tremor de tela suave.
  * Ao completar a conexão de todas as estrelas na ordem correta, disparar uma explosão de poeira estelar (partículas brilhantes) e aprovar o puzzle.

### 2. Grimório de Relíquias Místicas & Metaprogressão (Grimoire Panel)
* **Painel da UI (Grimório)**:
  * Adicionar um botão no topo ou lateral da tela chamado *"📜 Grimório de Relíquias"*.
  * Ao ser clicado, abre um painel em overlay estilo Glassmorphism Premium com o título *"Grimório de Relíquias Alquímicas"*.
  * O painel deve listar **6 slots de relíquias**, exibindo um ícone místico trancado (ex: `🔒`) ou a relíquia colorida com seu efeito ativo se já desbloqueada pelo jogador.
* **As 6 Relíquias e Seus Efeitos Passivos**:
  1. **Astrolábio Quebrado** (Desbloqueio: Resolver 5 sequências arcanas consecutivas no Endless):
     * *Efeito*: O custo de Foco de qualquer dica é reduzido de 10% para **5%**.
  2. **Lente do Foco Celestial** (Desbloqueio: Alcançar o Nível 5 no Modo Campanha):
     * *Efeito*: Regenera **+2% extras** de Foco Mental a cada acerto (total de +7% de regeneração).
  3. **Cálice do Infinito** (Desbloqueio: Alcançar 4.000 pontos no Modo Endless):
     * *Efeito*: Reduz as penalidades de Foco por resposta incorreta em **3%** (ex: de -20% para -17%).
  4. **Filtro de Éter** (Desbloqueio: Finalizar o Modo Time Attack com mais de 25 segundos restantes):
     * *Efeito*: No Modo Time Attack, cada enigma correto concede **+12 segundos** em vez de +10 segundos.
  5. **Pena de Fênix** (Desbloqueio: Acertar 8 enigmas consecutivos sem errar em qualquer modo):
     * *Efeito*: Salva da derrota uma única vez por partida! Ao zerar o Foco Mental, restaura imediatamente **25%** do Foco e quebra a Pena.
  6. **Tábula de Esmeralda** (Desbloqueio: Resolver todos os 5 tipos de enigmas clássicos no Modo Campanha):
     * *Efeito*: A cada 5 enigmas resolvidos, concede **1 dica grátis** (sem custo de foco ou tempo).
* **Persistência das Relíquias**:
  * As relíquias desbloqueadas devem ser salvas no `localStorage` sob a chave `mind_labyrinth_relics` para persistir entre sessões de jogo.

### 3. Sistema de Conquistas (Achievements HUD Toast)
* **Toast Notification**:
  * Ao cumprir o requisito de uma relíquia durante o jogo, disparar instantaneamente um banner popup limpo no canto superior direito da tela por 3.5 segundos.
  * O toast deve ter bordas neon douradas pulsantes, efeito blur de vidro, e exibir a mensagem: *"✨ CONQUISTA DESBLOQUEADA! Relíquia Ativada: [Nome da Relíquia]"* com o texto de lore sutil.
  * Tocar um efeito sonoro de fanfarra estelar mística no Web Audio API para celebrar o feito.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivo Alvo**: `/puzzle/index.html`.
* **Mecanismo de Desenho da Linha (Drag & Connect)**:
  * No puzzle de constelação, capturar eventos de mouse/toque (`mousedown`, `mousemove`, `mouseup` / `touchstart`, `touchmove`, `touchend`).
  * Armazenar o vetor de estrelas selecionadas em sequência: `let selectedStars = []`.
  * Detectar colisões circulares simples no movimento do ponteiro: se a distância entre o cursor e o centro da estrela $i$ for menor que o diâmetro do nó, adicionar a estrela à sequência se for a subsequente válida.
* **Integração das Relíquias com o Motor de Jogo (`gameState`)**:
  * Ao aplicar penalidades ou bônus no script do jogo, verificar a presença das relíquias ativas no array global `relicsActive` (carregado do `localStorage` no início).
  * Exemplo de injeção lógica:
    ```javascript
    const basePenalty = focusPenalty();
    const activePenalty = hasRelic('Cálice do Infinito') ? basePenalty - 3 : basePenalty;
    gameState.focus -= activePenalty;
    ```
* **Síntese Sonora (Web Audio API)**:
  * *Efeito de Harpa Celestial*: Gerar uma cascata de 5 notas senoides sequenciais muito rápidas (ex: frequências de um acorde maior de Dó em oitavas superiores: 523Hz, 659Hz, 784Hz, 1046Hz, 1318Hz) com tempos de decay de 0.15s e ganho moderado.
  * *Efeito de Fanfarra de Relíquia (Modo Lídio)*: Arpejo ascendente clássico em oitavas brilhantes adicionando a quarta aumentada (ex: Fá, Lá, Dó, Si, Fá oitava) com envelopes de amplitude ressonantes.

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Cria um fator de progressão viciante que conecta os modos de jogo e dá recompensas reais ao jogador).
* **Esforço Estimado**: Média-Alta (Exige controle fino de coordenadas e colisões no canvas, interface elegante de overlay e integração da lógica de bônus passivos no motor de estado existente).
* **Área**: Metaprogressão / Computação Gráfica (Canvas 2D) / Interface UI (HTML-CSS Glassmorphism) / Síntese Sonora.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Modelagem Matemática do Puzzle de Constelações

As estrelas serão posicionadas aleatoriamente em uma área de desenho de $400 \times 400$ pixels. Para evitar sobreposições desagradáveis, o algoritmo de spawn usará uma distância mínima euclidiana de exclusão radial de **60px**:

$$\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \ge 60$$

*   **Tabela de Cores de Temperatura Estelar**:
    Para dar realismo astronômico e wow factor, usaremos cores neon correspondentes ao espectro espectral (Morgan-Keenan):
    *   **Azul (Classe O)**: `#00f0ff` (Brilho intenso)
    *   **Branco-Azul (Classe B)**: `#aae5ff`
    *   **Branco (Classe A)**: `#ffffff`
    *   **Amarelo (Classe F/G)**: `#ffd700`
    *   **Laranja (Classe K)**: `#ff9000`
    *   **Vermelho (Classe M)**: `#ff3b3b`

*   **Lógica de Renderização do Canvas**:
    A cada frame do loop do puzzle de constelação, redesenhar o fundo espacial escuro e aplicar brilhos em pulsação nas estrelas usando uma função de seno harmônico baseada em tempo real (`performance.now()`):

    ```javascript
    function drawCelestialSky(ctx, stars) {
        ctx.fillStyle = '#0a0618';
        ctx.fillRect(0, 0, width, height);
        
        // Desenha linhas já conectadas
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        
        ctx.beginPath();
        for (let i = 0; i < selectedStars.length; i++) {
            const s = stars[selectedStars[i]];
            if (i === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
        
        // Desenha a linha de drag atual se aplicável
        if (isDragging && currentMousePos && selectedStars.length > 0) {
            const start = stars[selectedStars[selectedStars.length - 1]];
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(currentMousePos.x, currentMousePos.y);
            ctx.stroke();
        }

        // Desenha cada estrela com pulsação
        const t = performance.now() * 0.005;
        stars.forEach((star, index) => {
            const pulse = 1 + Math.sin(t + star.phase) * 0.15;
            const radius = star.radius * pulse;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.shadowColor = star.color;
            ctx.shadowBlur = 10 + Math.sin(t + star.phase) * 4;
            ctx.fill();
            
            // Desenha rótulo místico ao lado da estrela
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Cinzel Decorative';
            ctx.textAlign = 'center';
            ctx.fillText(star.label, star.x, star.y + radius + 15);
            ctx.restore();
        });
    }
    ```

### 2. Implementação das Lógicas de Desbloqueio e Bônus das Relíquias

As relíquias operam através de observadores simples acoplados aos eventos chaves do jogo. A estrutura do `localStorage` deve salvar as relíquias de forma simples:

```json
{
  "unlocked": ["Astrolábio Quebrado", "Lente do Foco Celestial"],
  "phoenixFeatherUsed": false
}
```

*   **Pena de Fênix (Lógica de Renascimento)**:
    Ao aplicar dano ao Foco Mental que o reduziria a $\le 0$:
    ```javascript
    function checkPhoenixFeather(damageAmount) {
        if (gameState.focus - damageAmount <= 0) {
            if (hasUnlockedRelic('Pena de Fênix') && !sessionStorage.getItem('relic_phoenix_used')) {
                sessionStorage.setItem('relic_phoenix_used', 'true');
                gameState.focus = 25; // Revive com 25%
                triggerAchievementToast('Pena de Fênix Ativada!', 'A relíquia da fênix se dissolveu, mas sua mente foi poupada das sombras.');
                audio.playPhoenixReviveSFX(); // Som de fogo e ascensão procedural
                return true; // Dano mitigado
            }
        }
        return false; // Dano normal
    }
    ```

---

## ❓ Dúvidas para o TL ou o PO

Abaixo estão listadas algumas questões de Game Feel e balanceamento tático para validação do Tech Lead:

1.  **Dificuldade de Conexão Estelar em Telas Touch**:
    *   *Dúvida*: Como o jogo é responsivo e pode ser jogado no celular, a colisão de clique de 15px de raio pode ser difícil de acertar com precisão com os dedos.
    *   *Proposta*: Aumentar a área de detecção (raio de colisão virtual) para **35px** exclusivamente quando eventos de toque (`touchstart`/`touchmove`) forem detectados, mantendo os 15px visuais do raio da estrela.
2.  **Limite de Relíquias Ativas Simultâneas**:
    *   *Dúvida*: Permitir que todas as 6 relíquias atuem de forma acumulada e passiva pode deixar o jogo excessivamente fácil nos níveis mais altos.
    *   *Proposta*: O jogador pode desbloquear todas as relíquias, mas só pode ter até **2 relíquias equipadas simultaneamente** no painel do Grimório, criando uma camada tática de escolha antes de iniciar os puzzles.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

Abaixo estão as definições de engenharia e regras de balanceamento homologadas pelo Tech Lead:

### 1. Adaptação para Telas Touch (Aprovado com Ressalvas)
*   **Decisão**: **Aprovado.** É vital garantir a jogabilidade tátil. O raio virtual de colisão deve ser de 30px em telas normais e expandido para **40px** em dispositivos móveis (verificado dinamicamente via detecção de toque ou largura de tela $< 768\text{px}$).

### 2. Mecânica de Slots no Grimório (Aprovado - Equipar até 2 Relíquias)
*   **Decisão**: **Aprovado.** Para manter o desafio e incentivar decisões táticas (ex: seletividade de bônus dependendo do modo de jogo), o jogador poderá equipar no máximo **2 relíquias simultaneamente**.
*   **Diretriz**:
  * Ao abrir o painel do Grimório, relíquias desbloqueadas terão botões de *"Ativar"* / *"Desativar"*.
  * Se o jogador tentar ativar uma terceira relíquia, o sistema bloqueia e exibe uma mensagem: *"Você só pode manter até 2 Relíquias sintonizadas simultaneamente!"*.
  * Salvar o array de relíquias sintonizadas no `localStorage` sob a chave `mind_labyrinth_active_relics`.

### 3. Síntese do Som de Fogo da Pena de Fênix
*   **Decisão**: **Sons Procedurais Sintetizados Organicamente.**
*   **Diretriz**:
  * O som de ativação da Pena de Fênix deve simular um sopro de fogo ascendente.
  * Criar isso gerando um ruído branco curto filtrado por um `BiquadFilter` passa-banda com frequência central varrendo rapidamente de $100\text{Hz}$ a $1800\text{Hz}$ com $Q$ alto ($Q=8.0$), acoplado a um envelope de ganho rápido e depois decaindo suavemente.

---

*Status do Refinamento Técnico: ✅ Refined (Pronto para Desenvolvimento)*
*Responsável Técnico: Antigravity - Tech Lead / PO*

---

## dúvidas

1. **Ordenação de Temperatura Estelar**: A especificação cita "Conecte as estrelas do espectro mais quente ao mais frio (Azul ➔ Branco ➔ Amarelo ➔ Laranja ➔ Vermelho)" nas regras de resolução, mas na Tabela de Cores inclui "Branco-Azul (Classe B)". Assumimos que no caso do enigma de temperatura estelar, se a estrela "Branco-Azul" for gerada, ela deve ficar entre a "Azul" e a "Branco" na ordenação correta (i.e. Azul ➔ Branco-Azul ➔ Branco ➔ Amarelo ➔ Laranja ➔ Vermelho).
2. **Pena de Fênix e Persistência**: A Pena de Fênix salva da derrota uma única vez por partida. Registraremos o seu uso em tempo de execução no `sessionStorage` (para redefinir a cada nova partida) e sincronizaremos com o `localStorage` no grimório geral de relíquias conquistadas.
3. **Limite de 2 Relíquias**: Conforme homologado pelo Tech Lead, a interface do Grimório trancará a ativação caso o jogador tente selecionar uma terceira relíquia, exibindo uma mensagem temporária de aviso.

## ✅ Status da Implementação
- **Status Geral**: 💻 Dev complete

