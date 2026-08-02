# ☄️ TASK-PINBALL: Batalha contra Chefe (Rogue AI Core), Sistema de Skill Shot e Áudio Procedural via Web Audio API

## 👤 User Story
* **Como** jogador competitivo e entusiasta de pinball do **Playful Hub**,
* **Eu quero** enfrentar um Chefe ativo (Rogue AI Core) no topo da mesa protegido por escudos orbitais dinâmicos e que ataca com pulsos Glitch e EMP, realizar lançamentos de alta precisão (Skill Shots) controlando a força da mola, e escutar efeitos sonoros e trilhas ambientais sintetizadas em tempo real via Web Audio API,
* **Para que** a mesa ganhe uma camada de gameplay profunda com objetivos de combate claros, feedbacks sensoriais retrô-futuristas de alto impacto (Juiciness) e loops de jogabilidade extremamente gratificantes.

---

## 🎯 Critérios de Aceitação

### 1. Sistema de Batalha contra Chefe (Rogue AI Core)
* **Gatilho de Início**: O Chefe (Rogue AI Core) desperta e surge no topo da mesa (coordenada central superior: `x: 200, y: 80`) ao atingir **15.000 pontos** cumulativos na partida ou após a bola cruzar as rampas/multiplicadores superiores 3 vezes.
* **Componentes Gráficos do Chefe**:
  * **O Núcleo (Core)**: Um polígono central giratório (ex: pentágono ou hexágono com raio 25) na cor vermelha/glitch emissiva (`#ff0033`).
  * **Barra de Vida (Boss HP)**: Exibida no topo central do HUD ou sobre o próprio Chefe, com 300 HP iniciais.
  * **Escudos Orbitais (Shield Segments)**: 3 pequenos círculos ou retângulos de escudo (raio 8, com 50 HP cada) rotacionando em uma órbita circular estável a 45 pixels de distância do centro do núcleo.
* **Física e Colisão do Combate**:
  * **Dano no Escudo**: Hitting (colidir com) qualquer segmento de escudo ativo com a bola causa -15 HP no escudo e gera faíscas ciano. Quando um escudo chega a 0 HP, ele é destruído com uma explosão de partículas.
  * **Dano no Núcleo**: O núcleo central é invulnerável enquanto houver pelo menos 1 escudo ativo. Uma vez que todos os 3 escudos forem destruídos, colisões diretas da bola contra o núcleo causam -50 HP ao Chefe.
  * **Ataques Ativos do Chefe**:
    1. *Glitch Pulse (Retardo Temporal)*: A cada 8 segundos, o núcleo emite um anel de partículas glitch vermelhas piscando. Se a bola tocar a área do anel (raio 75px), sua velocidade linear é reduzida em 30% instantaneamente, acompanhada de distorção visual temporária na tela (CSS Glitch).
    2. *EMP Shockwave (Desativação de Flippers)*: A cada 12 segundos, o chefe emite uma onda de choque. O jogador é notificado por um flash de luz amarela no flipper afetado, que é temporariamente desabilitado (não responde a inputs de teclado) por **2.0 segundos** (escolhido de forma alternada ou randômica entre o esquerdo e o direito).
    3. *Firewall Barrier (Bricks de Bloqueio)*: Se o Chefe ficar abaixo de 150 HP, ele spawna um obstáculo temporário em forma de tijolo no centro da mesa (`x: 200, y: 300`). O tijolo é destrutível após ser atingido 2 vezes pela bola.
* **Vitória contra o Chefe**:
  * Derrotar o Rogue AI Core (0 HP) concede **+15.000 pontos**, reconstrói 1 vida perdida (se menor que 3), gera uma grande explosão circular de 40 partículas douradas e concede uma skin dourada temporária de alto brilho para a bola.

### 2. Mecânica de Skill Shot de Precisão
* **Interface do Plunger**: Adicionar um marcador visual linear de precisão ao lado do Power Meter do lançador. O marcador exibe uma "Green Zone" (Zona Verde de Sucesso) correspondente a uma tração de mola de **75% a 85%** (`pullDistance` de 45px a 51px, considerando `maxPull: 60`).
* **Regra de Validação**:
  * Se o jogador carregar e soltar o lançador exatamente com a tração dentro da Green Zone, e a bola colidir com o pino sensor superior de entrada (`sensorTarget` localizado nas coordenadas `x: 350, y: 40` do topo direito da calha) dentro de **1.5 segundos** após o lançamento, é ativado o **CRITICAL SKILL SHOT**.
* **Prêmio**:
  * Concede **+3.000 pontos** imediatos, adiciona +1 ao multiplicador global de pontuação corrente daquela vida, e exibe no centro do Canvas uma mensagem neon flutuante estilizada: `CRITICAL SKILL SHOT!`.

### 3. Sintetizador de Áudio Procedural (Web Audio API)
* **Design de Som sem Assets**: Para evitar dependência de carregamento de arquivos de áudio externos (.mp3/.wav) e contornar bloqueios de autoplay dos navegadores, implementar um gerenciador de áudio (`SoundSynth`) que cria um `AudioContext` após o primeiro clique do usuário.
* **Efeitos Sonoros Sintetizados**:
  * *Flipper Flip (Z/ArrowLeft/ArrowRight)*: Um pulso curto de alta frequência (Frequência inicial: 600Hz decaindo a 100Hz em 0.05s) usando oscilador triangular com envelope de ganho rápido (click).
  * *Bumper Hit*: Um tom senoidal metálico de sino/chime cuja frequência escala dinamicamente com base no index do bumper atingido (ex: `bumpers[0]` = 440Hz, `bumpers[1]` = 523Hz, etc.) com decaimento suave de 0.3s.
  * *Dano no Chefe / Destruição de Escudo*: Um som ruidoso e glitchy sintetizado usando ruído branco (White Noise) misturado com oscilador de onda dente-de-serra (Sawtooth) em queda rápida (pitch sweep de 800Hz a 80Hz em 0.15s).
  * *Derrota do Chefe*: Um arpejo triunfal de ondas senoidais tocando acordes de sintetizador retrô de 0.6s.
  * *Trilha Sonora Ambiental Dinâmica (Cyber Drone)*: Uma onda triangular grave (frequência base: 55Hz - nota Lá/A1) tocando acordes harmônicos lentos em progressão menor (Am -> F -> C -> G) que mudam a cada 4.0 segundos no fundo, modulando seu filtro passa-baixas (Low-Pass Filter) com a velocidade atual das bolas ativas na mesa.

---

## 🛠️ Detalhes Técnicos e Arquitetura

* **Arquivo Alvo**: `/pinball/index.html` (Canvas 2D).
* **Estruturas de Dados do Chefe**:
```javascript
const bossState = {
    active: false,
    hp: 300,
    maxHp: 300,
    x: 200,
    y: 80,
    radius: 25,
    angle: 0,
    rotationSpeed: 0.02,
    shields: [], // Lista de objetos { id, hp, maxHp, angle, radius }
    activeEmpFlipper: null, // 'left' | 'right' | null
    empTimer: 0,
    glitchPulseTimer: 8.0,
    activeFirewall: null // { x, y, width, height, hp }
};
```
* **Mapeamento do Skill Shot**:
  * Adicionar variáveis `lastPlungerPull` e `launchTimestamp` ao escopo do `launcher`.
  * Adicionar lógica na função `launchBall()` para medir e armazenar a precisão e o tempo de colisão com a hitbox circular do sensor superior.
* **Gestão de Áudio procedural (`SoundSynth`)**:
  * Centralizar a inicialização do `AudioContext` de forma preguiçosa (Lazy Initialization) no primeiro evento de interação do usuário (Ex: clique na tela ou primeira pressão de tecla para iniciar o jogo).

---

## 📊 Priorização e Estimativa

* **Prioridade**: Alta (Entrega o "Fim de Jogo/Loop Principal" com a Batalha de Chefe, resolve o percalço crítico da ausência de áudio com a Web Audio API procedural e implementa a mecânica de precisão do Plunger).
* **Esforço Estimado**: Média-Alta (Exige modelagem física de colisões circulares orbitais móveis em 2D, controle estrito de timers de desativação de inputs do jogador e programação DSP de sintetizadores de áudio de baixo nível).
* **Área**: Game Design / Lógica de Colisão 2D / Síntese de Áudio Digital / Efeitos Visuais (Canvas 2D).

---

## 🛠️ Refinamento Técnico (Technical Refinement)

Como Product Owner experiente e sênior, defini a modelagem de dados física de colisões de órbitas e o encapsulamento do sintetizador de áudio digital a seguir para garantir compatibilidade completa e livre de latência com a física 2D existente no minijogo:

### 1. Colisão Circular Dinâmica das Orbitais do Chefe (Bola-Escudo)
Os escudos rotacionam ao redor do núcleo do Chefe. A posição cartesiana $(x_s, y_s)$ de cada escudo no frame é calculada dinamicamente com base em seu ângulo de órbita $\theta$ e o centro do chefe $(x_c, y_c)$:
$$x_s = x_c + d \cdot \cos(\theta)$$
$$y_s = y_c + d \cdot \sin(\theta)$$
Onde $d = 45px$. A colisão da bola com raio $R$ contra o escudo orbital com raio $r_s$ ocorre quando a distância euclidiana entre seus centros for menor que $R + r_s$. O cálculo da resposta física de ricochete (vetor normal e vetor de velocidade de saída) é idêntico ao tratamento elástico de bumpers, empurrando a bola para fora da intersecção geométrica:

```javascript
function updateBossShields(dt) {
    if (!bossState.active) return;
    
    bossState.angle += bossState.rotationSpeed;
    
    bossState.shields.forEach((shield, index) => {
        // Atualiza a posição orbital
        const currentAngle = bossState.angle + (index * (Math.PI * 2 / 3)); // Distribuição em 120 graus
        shield.x = bossState.x + 45 * Math.cos(currentAngle);
        shield.y = bossState.y + 45 * Math.sin(currentAngle);
    });
}
```

### 2. Lógica do Skill Shot e Sensor da Calha Superior
A colisão com o sensor na curva de entrada superior é medida assim que a bola atinge um círculo de checagem. Caso o tempo desde o lançamento seja inferior a 1.5 segundos e a tração do plunger estivesse na zona correta, o multiplicador e o score do jogador recebem o acréscimo instantâneo:

```javascript
const skillShotSensor = { x: 350, y: 40, radius: 15 };

function checkSkillShotSensor(ball) {
    if (!ball.isLaunched || ball.hasTriggeredSkillShot) return;
    
    const dx = ball.x - skillShotSensor.x;
    const dy = ball.y - skillShotSensor.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < ball.radius + skillShotSensor.radius) {
        ball.hasTriggeredSkillShot = true;
        
        // Verifica se cumpre os critérios
        const timeElapsed = (performance.now() - launcher.launchTimestamp) / 1000;
        const pullRatio = launcher.lastPlungerPull / launcher.maxPull;
        
        if (timeElapsed <= 1.5 && pullRatio >= 0.75 && pullRatio <= 0.85) {
            triggerCriticalSkillShot();
        }
    }
}
```

### 3. DSP do Sintetizador Procedural de Áudio (`SoundSynth`)
Encapsulamos toda a lógica de áudio em um Singleton seguro para evitar distorções de cliques auditivos com envelopes de ganho corretos:

```javascript
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.ambientOsc = null;
        this.ambientGain = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime); // volume mestre seguro
        this.masterVolume.connect(this.ctx.destination);
        this.startAmbientDrone();
    }

    playBumperHit(freq) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        // Envelope metálico rápido
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }

    playBossDamage() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Criação de White Noise para textura explosiva
        const bufferSize = this.ctx.sampleRate * 0.15; // 0.15 segundos
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        noiseNode.connect(noiseGain);
        noiseGain.connect(this.masterVolume);
        noiseNode.start();
    }
}
```

---

## ❓ Dúvidas para o TL ou o PO

Abaixo estão listadas duas dúvidas conceituais cruciais para alinhamento de game feel e equilíbrio:

1. **Retorno do Flipper EMP**:
   * *Dúvida*: Quando o Chefe desativa um flipper pelo EMP Shockwave, o flipper afetado deve cair na posição de descanso (`restAngle`) imediatamente e ficar travado nela, ou deve travar no ângulo em que estava no momento do disparo do pulso elétrico?
   * *Proposta do PO*: Recomendamos cair para o `restAngle` imediatamente. Se ele travar levantado, a bola pode rolar sob ele e criar um dreno injusto e incontrolável, o que frustraria gravemente a experiência do jogador. Ao cair para a posição de descanso, ela age como uma rampa estática segura que ainda permite que o jogador rebatido com o outro flipper tente salvar a bola.

2. **Acúmulo de Trilha Sonora Dinâmica**:
   * *Dúvida*: O sintetizador da trilha sonora de fundo (`startAmbientDrone()`) deve ser completamente pausado quando o jogo estiver no menu de Game Over ou pausado, ou deve modular para um tom mais grave e estático de baixa intensidade?
   * *Proposta do PO*: Deve modular para um tom grave estático com volume reduzido (5% do volume base) e filtro passa-baixas fechado em 150Hz. Isso mantém o ambiente do jogo imersivo e pulsante mesmo na derrota, convidando o jogador a pressionar 'Enter' para reiniciar instantaneamente.

3. **Duração da Skin Dourada da Bola**:
   * *Dúvida*: Qual a duração exata da skin dourada temporária obtida ao derrotar o Rogue AI Core? Ela dura um tempo fixo (ex: 15 segundos) ou até que o jogador perca a bola atual?
   * *Proposta do Dev*: Sugerimos que dure até o fim da bola atual ou por um período de 20 segundos (o que ocorrer primeiro), mantendo a recompensa visual ativa sem se tornar permanente.

4. **Representação Visual do Sensor do Skill Shot**:
   * *Dúvida*: O pino sensor do Skill Shot em `(350, 40)` deve ter alguma indicação visual na mesa, ou deve permanecer invisível ao jogador?
   * *Proposta do Dev*: Sugerimos desenhar um anel circular neon pulsante (cor amarela ou verde) com baixa opacidade para guiar visualmente o jogador sobre onde mirar no lançamento.

5. **Mecânica de Colisão com a Firewall Barrier**:
   * *Dúvida*: A barreira Firewall no centro deve se comportar como bumper (aplicando força de repulsão extra) ou como uma parede padrão (reflexão simples de velocidade elástica)?
   * *Proposta do Dev*: Sugerimos que se comporte como uma parede linear padrão com coeficiente de restituição de 0.5 (com faíscas laranja/vermelhas), apenas bloqueando o caminho e exigindo dois acertos para ser destruída.

6. **Implementação do Efeito CSS Glitch**:
   * *Dúvida*: Como deve ser o comportamento visual do CSS Glitch ao sofrer o Glitch Pulse do chefe?
   * *Proposta do Dev*: Sugerimos criar uma classe CSS com efeito de distorção de cor e tremores horizontais rápidos (usando transform e clip-path/filtros) aplicada temporariamente ao `#gameCanvas` por 0.5s para indicar o impacto visual do pulso.

---

## 💡 Decisões e Resoluções do Tech Lead (TL)

As resoluções e diretrizes arquiteturais para a implementação segura de Batalha e Áudio Procedural são:

### 1. Resolução do Flipper EMP
* **Decisão**: **Aprovada a recomendação do PO**. O flipper sob efeito de EMP deve zerar seu sinal de acionamento (`flipper.isActivating = false`), forçando o cálculo dinâmico de rotação a regressar para o `restAngle` e aplicando opacidade visual de 50% (`ctx.globalAlpha = 0.5`) e faíscas amarelas na palheta afetada no Canvas para total transparência visual com o jogador.

### 2. Controle de Frequência de Sons e Polifonia
* **Decisão**: Para evitar estouro de ganho ou sobrecarga de nós do `AudioContext` no Multiball (onde podem ocorrer 5 a 10 colisões em um único segundo), as chamadas para `playBumperHit()` e `playBossDamage()` devem ser limitadas por um bloqueador de taxa (throttling) de no mínimo 60 milissegundos entre efeitos de mesma assinatura. Caso contrário, ignore novos nós de áudio excedentes para preservar a fidelidade harmônica.

### 3. Gerenciamento de Memória e Desconexão de Nós de Áudio
* **Diretriz**: Para evitar vazamentos de memória (memory leaks) e acúmulo de nós órfãos de processamento DSP de áudio no navegador, todos os nós criados dinamicamente (como `OscillatorNode`, `GainNode` e `BufferSourceNode`) **devem** ser explicitamente parados e desconectados do mixer principal (`masterVolume` ou `AudioContext.destination`) após a conclusão do seu ciclo de reprodução. Utilize o callback `osc.onended = () => { osc.disconnect(); gain.disconnect(); }` para garantir a liberação segura de recursos.

### 4. Duração da Skin Dourada
* **Decisão**: Aprovada a sugestão. Duração fixa pelo fim da bola atual ou por 20 segundos (o que ocorrer primeiro).

### 5. Sensor do Skill Shot
* **Decisão**: Sim, desenhe um anel neon com baixa opacidade. A legibilidade visual para mecânicas de precisão é fundamental.

### 6. Mecânica de Firewall Barrier
* **Decisão**: Aprovado o uso de barreira linear elástica (`restitution = 0.5`) com destruição após 2 acertos, fornecendo bloqueio puro sem impulso de bumper.

### 7. Efeito CSS Glitch
* **Decisão**: Pode usar classes de CSS temporárias via `classList.add('glitch-effect')`. A manipulação DOM é ideal e leve para filtros nesse caso.

---

## ❓ Dúvidas e Observações do Desenvolvedor

* **Status da Tarefa**: Em Desenvolvimento (In Progress) ➡️ Concluído (Dev complete).
* **Observações Técnicas de Implementação**:
  1. **Batalha contra o Chefe (Rogue AI Core)**:
     - Implementado o objeto `bossState` com trigger ao atingir 15.000 pts ou 3 cruzamentos de rampas/multiplicadores superiores.
     - 3 Escudos orbitais com 50 HP cada rodando em ângulo a 45px do núcleo. Dano de -15 HP ao colidir a bola com faíscas ciano.
     - Núcleo invulnerável até a queda dos 3 escudos, após o qual sofre -50 HP por impacto direto da bola.
     - Ataque *Glitch Pulse* (8s): pulso vermelho que reduz 30% a velocidade da bola e aplica classe CSS `.glitch-effect` no canvas por 0.5s.
     - Ataque *EMP Shockwave* (12s): flash amarelo e desabilita flipper afetado (alternado/aleatório) por 2.0s retornando ao `restAngle` com opacidade 50%.
     - Ataque *Firewall Barrier*: tijolo central (`x: 200, y: 300`) ativado com HP < 150 do Boss, destruído com 2 acertos.
     - Vitória (+15.000 pts, +1 vida se < 3, explosão de 40 partículas douradas, skin dourada na bola por 20s ou até o fim da vida).
  2. **Skill Shot de Precisão**:
     - Marcador visual da Green Zone (75%-85% pull) no meter do plunger.
     - Anel neon indicador do sensor em `x: 350, y: 40`.
     - Validação dentro de 1.5s após disparo na Green Zone concedendo `CRITICAL SKILL SHOT!`, +3.000 pts e +1 ao multiplicador.
  3. **Sintetizador Web Audio API (`SoundSynth`)**:
     - Inicialização lazy no primeiro clique/tecla.
     - Sons proceduralmente sintetizados para Flipper Flip, Bumper Hit (com throttling de 60ms), Boss Damage (ruído branco + dente de serra), Vitória do Boss, Skill Shot e Cyber Drone de fundo modulado por velocidade da bola (com atenuação no Game Over).
     - Desconexão automática dos nós de áudio após finalização (`osc.onended`).

*Assinado: Software Engineer - Antigravity*

