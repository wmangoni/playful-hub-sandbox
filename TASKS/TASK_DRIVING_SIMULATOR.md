# 📝 TASK-DRIVING_SIMULATOR: Tráfego de Veículos com IA, Ciclo Dia/Noite e Hangar de Modelos de Carros

## 👤 User Story
*   **Como** piloto no minijogo **Driving Simulator**,
*   **Eu quero** desviar de outros veículos trafegando na estrada sob comportamentos de IA, dirigir sob transições dinâmicas de Dia e Noite acionando faróis funcionais e selecionar diferentes carros com atributos físicos únicos,
*   **Para que** a estrada cênica pareça viva, desafiadora e visualmente deslumbrante em todas as horas virtuais.

---

## 🎯 Critérios de Aceitação
1.  **Tráfego de Carros com IA**:
    *   Spawnar aleatoriamente outros veículos na estrada trafegando no mesmo sentido ou em sentido oposto (contra-fluxo).
    *   Os carros de IA devem ter comportamentos distintos: alguns trafegam de forma lenta na faixa direita, outros tentam ultrapassar mudando de faixa de forma inteligente.
    *   Colisões graves com o tráfego causam redução drástica de velocidade ou batida (Game Over).
2.  **Ciclo Dinâmico de Dia/Noite e Faróis (Headlights)**:
    *   Criar uma transição contínua de iluminação do cenário a cada 2 minutos (Dia -> Entardecer -> Noite -> Amanhecer).
    *   Durante a fase noturna, a tela escurece e a visibilidade dos limites da pista e obstáculos cai para 20%.
    *   Adicionar botão para acionar os faróis (ou acionamento automático por sensor de luz). Os faróis devem projetar um gradiente de luz cônico transparente à frente do carro no canvas, revelando a estrada de forma altamente realista.
3.  **Seleção de Modelos de Carros na Garagem**:
    *   Adicionar menu "Garagem" contendo 3 modelos de veículos:
        1.  *Apex Sport (Vermelho)*: Aceleração incrível e velocidade máxima de 240 km/h, porém sensível a derrapagens em curvas acentuadas.
        2.  *Cruiser Sedan (Azul)*: Direção estável, velocidade máxima de 180 km/h, manuseabilidade segura.
        3.  *Atlas SUV (Verde)*: Mais pesado, velocidade máxima de 150 km/h, resistente à grama (não perde velocidade se sair da estrada).

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/driving_simulator/index.html`.
*   **Física de Movimentação Pseudo-3D**:
    *   O jogo utiliza a clássica projeção de estrada pseudo-3D (estilo OutRun).
    *   Armazenar a coordenada Z de cada carro de IA para projetá-los em perspectiva 3D na tela com base no fator de escala: `scale = cameraDepth / (aiCar.z - playerZ)`.
*   **Gradiente de Iluminação**:
    *   Para os faróis, utilizar `canvasContext.createRadialGradient` ou `createLinearGradient` com cores semi-transparentes de tom amarelo/branco (`rgba(255, 255, 220, 0.4)` para `rgba(255, 255, 220, 0)`), criando o efeito de feixe de luz cortando a escuridão.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (A adição de tráfego e noite eleva a experiência clássica de simulador a outro nível).
*   **Esforço Estimado**: Alta (Implementar tráfego em perspectiva pseudo-3D com curvas exige cálculos trigonométricos avançados de projeção de câmera).
*   **Área**: Front-end / Computação Gráfica Pseudo-3D / Lógica de Física.
