# 📝 TASK-DED-004: Especialização de Classes, Quadro de Missões Secundárias e Level Design Tático (Portas Seladas & Alavancas)

## 👤 User Story
*   **Como** jogador entusiasta de RPG no minijogo **RPG Adventure Quest**,
*   **Eu quero** poder especializar minha classe ao subir de nível, aceitar missões secundárias com objetivos dinâmicos e explorar a masmorra superando barreiras físicas trancadas que exigem a ativação de alavancas ocultas,
*   **Para que** a progressão do meu personagem pareça única e o level design da masmorra se torne mais tático, desafiador e recompensador.

---

## 🎯 Critérios de Aceitação

1.  **Especialização de Classes (Prestige Classes)**:
    *   **Gatilho de Nível**: Ao atingir **Nível 3** (ou acumular mais de **150 XP**), o jogador deve poder especializar seu personagem em uma subclasse temática com duas habilidades adicionais exclusivas. A UI deve apresentar uma modal premium glassmorphic de "Especialização Disponível!".
    *   **Opções de Subclasses**:
        *   **Guerreiro (Warrior)**:
            *   *Paladino*: Recebe a habilidade **Escudo Sagrado** (concede HP temporário igual a `10 + mod_CON`, recarga de 3 turnos) e o ataque **Golpe Sagrado** (causa `dano_arma + mod_FOR + 1d6` radiante, e cura `1d6` HP do jogador).
            *   *Berserker*: Recebe a habilidade **Fúria Berserker** (dobra o dano físico do jogador por 3 turnos, mas reduz a Classe de Armadura (AC) em 2 pontos) e o ataque **Golpe Devastador** (causa `dano_arma + (2 * mod_FOR)` de dano físico, recarga de 2 turnos).
        *   **Mago (Wizard)**:
            *   *Arcanista*: Recebe a habilidade **Barreira de Mana** (consome 1 ponto de Mana para absorver 2 pontos de dano físico recebido, ativa/desativa livremente) e o feitiço **Explosão Arcana** (causa `3d6 + mod_INT` de dano mágico).
            *   *Necromante*: Recebe o feitiço **Drenar Vida** (causa `1d10 + mod_INT` de dano necrótico e cura o jogador no mesmo valor, custa 1 Mana) e o feitiço **Invocar Esqueleto** (invoca um lacaio que ataca automaticamente no final de cada turno causando `1d4 + 1` de dano, ativo até o fim do combate).
        *   **Ladino (Rogue)**:
            *   *Assassino*: Recebe a habilidade **Lâmina Envenenada** (golpes físicos aplicam veneno por 3 turnos, causando `2` de dano por turno ao inimigo) e o ataque **Golpe de Misericórdia** (causa `3 * dano_arma + mod_DES` se o alvo estiver com HP abaixo de 40%, recarga de 4 turnos).
            *   *Dançarino das Sombras*: Recebe a habilidade **Passo de Sombra** (esconde-se nas sombras garantindo evasão total contra o próximo ataque físico recebido, recarga de 3 turnos) e o ataque **Ataque Sorrateiro** (causa `dano_arma + mod_DES` e aumenta a AC do jogador em 3 pontos por 2 turnos).

2.  **Quadro de Missões Secundárias (Quest System & Journal)**:
    *   **Diário de Missões**: Adicionar um botão retrátil na HUD lateral para abrir o "Diário de Missões" com visual rúnico, separando missões Ativas e Concluídas.
    *   **Missões Iniciais**:
        *   *Missão 1: O Amuleto do Mercador*: O Mercador da Cripta pede para recuperar seu Amuleto de Ferro perdido. O jogador deve examinar os sarcófagos tortos até encontrar o amuleto. Recompensa: `+150 Ouro`, `+40 XP` e uma `Poção de Cura`.
        *   *Missão 2: Purificação das Sombras*: Derrotar o Espectro na Crypt. Recompensa: `+100 Ouro` e `+50 XP`.
        *   *Missão 3: Decifrador de Runas*: Encontrar e decifrar 3 antigas runas gravadas nas paredes de salas específicas (`crystal_chamber`, `lake_search` e `crypt`). Requer testes bem-sucedidos de INT ou LUCK. Recompensa: `+2` permanentes no atributo principal do jogador.

3.  **Level Design Tático: Portas Trancadas e Alavancas**:
    *   **Passagens Trancadas**: Os nós que levam ao chefe final (`final_chamber_entrance`) e à parte profunda da cripta (`crypt_puzzle_entrance`) começam trancados por barreiras mágicas neon.
    *   **Alavancas Escondidas**: O jogador deve localizar e ativar fisicamente **2 alavancas** espalhadas pelas cenas da masmorra (ex: uma escondida na `crystal_chamber` vasculhando cristais, e outra na `lake_search` inspecionando a beira do lago).
    *   **Feedback de Desbloqueio**: Ao interagir com uma alavanca, a interface emite um feedback visual neon no minimapa (revelando o estado da alavanca) e emite sons metálicos. Quando ambas são ativadas, a barreira correspondente se desfaz e permite a passagem.

4.  **Juiciness Premium e Expansão Sonora (Web Audio API)**:
    *   **Floaters de Textos**: Exibir números flutuantes de XP e Ouro ganhos na tela ao completar missões ou combates.
    *   **Síntese de Novas Habilidades**:
        *   *Escudo/Barreira*: Sweep senoidal ascendente rápido com filtro passa-altas para simular o brilho mágico defensivo.
        *   *Fúria Berserker*: Som áspero gerado por ruído branco filtrado com passa-baixas e ganho oscilante (efeito trêmulo).
        *   *Drenar Vida*: Varredura descendente de frequência acompanhada de um decay de volume mais lento.
        *   *Veneno*: Tons agudos curtos e repetidos em frequências aleatórias baixas para simular bolhas ácidas.
        *   *Quest Complete*: Fanfarra harmônica triunfal utilizando ondas triangulares em arpejo rápido.

---

## 🛠️ Detalhes Técnicos e Arquitetura

*   **Arquivos Alvo**: `/ded/index.html`, `/ded/assets/scenes.json`.
*   **Modelo de Estado de Missões e Alavancas**:
    Integrar ao `gameState` global as variáveis de controle persistentes:
    ```javascript
    gameState.quests = {
        "merchant_amulet": { status: "inactive", progress: 0 }, // "inactive" | "active" | "completed"
        "purify_crypt": { status: "inactive", progress: 0 },
        "decode_runes": { status: "inactive", progress: 0, runesFound: [] }
    };
    gameState.levers = {
        lever_crystal: false, // false = inativa, true = ativada
        lever_lake: false
    };
    gameState.player.specialization = null; // null | "Paladin" | "Berserker" | etc.
    ```
*   **Estrutura Rúnica da UI de Especialização (HTML/CSS)**:
    ```html
    <div id="specialization-modal" class="modal hidden">
        <div class="modal-content class-spec-box">
            <h2>✨ Escolha sua Especialização!</h2>
            <p>Você provou seu valor e atingiu o ápice de sua classe básica. Selecione seu caminho de prestígio:</p>
            <div class="spec-choices-grid" id="spec-options-container">
                <!-- Opções injetadas dinamicamente de acordo com a classe básica -->
            </div>
        </div>
    </div>
    ```

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Adiciona valor de gameplay imenso, replayability e senso tático de exploração de mapas).
*   **Esforço Estimado**: Média-Alta (Exige refatoração das ações em turnos do combate de TASK_003 e gerenciamento de estado persistente de missões).
*   **Área**: Lógica de Gameplay / UI Design / Web Audio API.

---

## 🛠️ Refinamento Técnico (Technical Refinement)

### 1. Sistema de Especialização e Cálculo das Novas Fórmulas
*   Ao atualizar a experiência via `changeXP()`, verificar se o total ultrapassou 150 e se o nível foi incrementado para 3. Se `gameState.player.specialization === null`, abrir a modal `#specialization-modal`.
*   **Lógica de Cooldowns de Habilidades**:
    Armazenar no loop de turno a contagem de cooldowns no final do turno do jogador:
    ```javascript
    if (gameState.combat.cooldowns.heroShield > 0) gameState.combat.cooldowns.heroShield--;
    ```
*   **Cálculo da Habilidade "Barreira de Mana"**:
    Se ativa (`gameState.player.manaBarrierActive === true`), antes de infligir dano ao HP do jogador:
    $$\text{dano\_final} = \text{dano\_recebido} - (\text{mana\_gasta} \times 2)$$
    Deduzir da mana do jogador e reduzir o dano final correspondente. Se a mana chegar a 0, desativar a barreira automaticamente e enviar aviso ao log.

### 2. Fluxo das Missões no Arquivo de Cenas (Quest Event Handlers)
*   **Ativação de Quests**:
    No `onEnter` das cenas correspondentes (ex: `crypt_merchant` para a Quest 1), verificar se a missão está no status `"inactive"`. Se sim, mudar para `"active"` e atualizar o Diário:
    ```javascript
    if (gameState.quests.merchant_amulet.status === "inactive") {
        gameState.quests.merchant_amulet.status = "active";
        addToLog("📋 Nova missão adicionada: O Amuleto do Mercador");
    }
    ```
*   **Checagem nos Sarcófagos**:
    Na cena `crypt_sarcophagus_open_success`, verificar se a Quest 1 está ativa. Se sim, injetar a probabilidade de encontrar o Amuleto além do saque padrão (50% de chance caso faça um teste bem-sucedido). Adicionar o item `"Amuleto do Mercador"` ao inventário.
*   **Resolução de Missões**:
    Na interação com o Mercador com o item no inventário, disparar o callback de conclusão, remover o amuleto, conceder as recompensas e mudar o status para `"completed"`.

### 3. Integração de Alavancas no Grafo do Minimapa
*   O minimapa em SVG deve renderizar indicadores visuais para os nós que contêm alavancas (ex: um mini-ícone de engrenagem ⚙️ ou alavanca 🎚️ ao lado do círculo).
*   Se a alavanca for puxada, o ícone no minimapa muda de cor (de vermelho escuro para ciano brilhante) para sinalizar que o circuito foi completado.
*   O nó `final_chamber_entrance` deve interceptar a ação de clique do jogador no mapa. Caso `gameState.levers.lever_crystal` ou `gameState.levers.lever_lake` sejam falsas, impedir a navegação, exibir a mensagem explicativa no log de exploração e tocar o som de barreira mágica selada.

---

## 🚀 Status da Implementação (Implementation Status)
*   **Status**: `✅ Refined`
*   **Refinado por**: Tech Lead (TL) - Antigravity
*   **Data do Refinamento**: 2026-08-02

---

## 🛡️ Diretrizes de Arquitetura e Segurança do Tech Lead (TL)

### 1. Prevenção de Abuso de Loops de Seleção e Modal Lock
*   Ao abrir a modal de Especialização (`#specialization-modal`), o estado global do jogo deve ser pausado temporariamente (`gameState.isPaused = true`), impedindo teclas de atalho de exploração de mapas, movimentação de nós ou abertura de outras telas (como compras na loja) até que a escolha da subclasse seja confirmada pelo jogador.
*   Uma vez escolhida a subclasse, desativar a pausa e persistir a especialização no `gameState.player.specialization`.

### 2. Persistência de Dados e Serialização Limpa (LocalStorage)
*   Todos os estados de missões (`quests`), alavancas (`levers`) e especializações de prestígio adicionados ao `gameState` devem ser serializados de forma limpa pelo método `saveGame()` e desserializados corretamente em `loadGame()`.
*   A inclusão das subclasses e suas modificações de atributos não deve sobrescrever os atributos originais básicos do jogador, permitindo rollback ou checagem limpa em caso de efeitos negativos temporários.

### 3. Isolamento e Throttling na Síntese de Efeitos Sonoros (Web Audio API)
*   Habilidades passivas (como veneno agindo a cada tick) ou invocações de lacaios não devem saturar o barramento de áudio com múltiplos osciladores simultâneos. Estabelece-se uma restrição de polifonia máxima de 2 vozes para habilidades especiais de prestígio.
*   Implementar a destruição explícita dos nós de áudio (`osc.disconnect()`, `gain.disconnect()`) no callback `onended` de cada sintetizador procedural para prevenir vazamentos de recursos de memória de áudio do browser.

