# 📝 TASK-3D_SHOOTER: Melhoria Visual e Sistema de Partículas Dinâmicas

## 👤 User Story
*   **Como** jogador do minijogo **3D Shooter**,
*   **Eu quero** que os disparos da arma gerem flashes luminosos e os impactos gerem partículas físicas/faíscas,
*   **Para que** o combate em primeira pessoa pareça mais impactante, responsivo e visualmente imersivo.

---

## 🎯 Critérios de Aceitação
1.  **Muzzle Flash (Clarão do Disparo)**:
    *   Sempre que o jogador disparar a arma, deve haver um efeito rápido de flash amarelo/laranja semi-transparente na ponta do sprite da arma.
    *   O flash deve durar no máximo 2 a 3 quadros (frames) para não atrapalhar a visibilidade.
2.  **Sistema de Partículas de Impacto**:
    *   Ao atingir uma parede sólida, um grupo de 8 a 15 partículas amarelas/laranjas (faíscas) deve ser expelido da posição do impacto.
    *   As partículas devem ter gravidade simulada e ir desaparecendo gradualmente (fade out).
    *   Ao atingir um inimigo, deve ocorrer um efeito visual diferenciado (por exemplo, partículas vermelhas representando dano).
3.  **Otimização e Performance**:
    *   O jogo deve continuar rodando de forma estável a **60 FPS** em navegadores modernos.
    *   Deve ser implementado um mecanismo simples de *Object Pooling* para as partículas, evitando alocações excessivas e travamentos por Garbage Collection.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivo Alvo**: `/3d_shooter/index.html` (e/ou scripts associados).
*   **Classe/Função de Partícula**:
    *   Criar uma classe ou estrutura simples `Particle` com propriedades: `x`, `y`, `z`, `vx`, `vy`, `vz`, `life`, `maxLife`, `color` e `size`.
    *   Método `update()` para aplicar física básica de velocidade e gravidade, reduzindo a vida (`life`).
    *   Método `draw()` que projeta os pontos 3D na tela 2D usando a mesma lógica de projeção do motor de renderização raycasting ou pseudo-3D do jogo.
*   **Pool de Objetos**:
    *   Manter um array global pré-alocado `particlePool` com um tamanho fixo (ex: 200 partículas).
    *   Reciclar as partículas inativas (onde `life <= 0`) em vez de instanciar novos objetos a cada tiro.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Alta (Melhoria direta de Core Gameplay/Feedback Visual).
*   **Esforço Estimado**: Média (Requires 3D coordinates projection adjustments).
*   **Área**: Front-end / Canvas 2D Engine.

---

## 🏗️ Refinamento Técnico

Para atingir a excelência visual desejada pelo Product Owner e garantir o cumprimento dos critérios de aceitação com **60 FPS estáveis**, a seguinte arquitetura e lógica técnica foram definidas para implementação.

### 1. Estrutura de Dados da Partícula (`Particle`)
A estrutura de cada partícula deve suportar posicionamento e física no espaço 3D (para a projeção no motor de raycasting) de forma leve.

```typescript
interface Particle {
  active: boolean;      // Indica se a partícula está ativa e deve ser atualizada/desenhada
  x: number;            // Posição X no mundo (grade 2D horizontal do mapa)
  y: number;            // Posição Y no mundo (grade 2D horizontal do mapa)
  z: number;            // Posição Z (altura física no mundo, variando de 0.0 a 1.0)
  vx: number;           // Velocidade no eixo X
  vy: number;           // Velocidade no eixo Y
  vz: number;           // Velocidade no eixo Z (para física de pulo/gravidade)
  r: number;            // Canal vermelho (0-255)
  g: number;            // Canal verde (0-255)
  b: number;            // Canal azul (0-255)
  alpha: number;        // Opacidade atual (1.0 -> 0.0)
  life: number;         // Tempo de vida restante em segundos
  maxLife: number;      // Tempo de vida inicial (para calcular o decaimento do alfa)
  size: number;         // Tamanho base da partícula
}
```

### 2. Mecanismo de Object Pooling (`particlePool`)
Para evitar travamentos causados pelo coletor de lixo (*Garbage Collection*) devido a alocações e liberações constantes de dezenas de partículas em cada tiro, será implementado um **Object Pool** fixo:

*   **Tamanho do Pool**: Fixo em `250` partículas (constante `MAX_PARTICLES = 250`).
*   **Inicialização**: O array global `particles` será populado com 250 objetos literais desativados (`active: false`) na função `initializeGame()`.
*   **Alocação Dinâmica**: Em vez de `particles.push()`, criaremos uma função auxiliar para reutilizar partículas inativas do pool:
    ```javascript
    function spawnParticle(x, y, z, vx, vy, vz, r, g, b, size, life) {
      const p = particlePool.find(item => !item.active);
      if (!p) return; // Se o pool estiver lotado, ignora o spawn para preservar a performance
      
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = vx;
      p.vy = vy;
      p.vz = vz;
      p.r = r;
      p.g = g;
      p.b = b;
      p.size = size;
      p.life = life;
      p.maxLife = life;
      p.alpha = 1.0;
    }
    ```

### 3. Física Avançada e Gravidade (Eixo Z)
No loop de atualização (`updateParticles`), simularemos uma gravidade constante no eixo `z` e colisão de quique com o solo.

*   **Constante de Gravidade**: `const GRAVITY = 12.0;`
*   **Loop de Atualização**:
    ```javascript
    function updateParticles(dt) {
      for (let i = 0; i < particlePool.length; i++) {
        const p = particlePool[i];
        if (!p.active) continue;
        
        // Aplica velocidade nos eixos X e Y
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        
        // Aplica gravidade e velocidade no eixo Z (altura)
        p.vz -= GRAVITY * dt;
        p.z += p.vz * dt;
        
        // Colisão com o solo (Z = 0)
        if (p.z <= 0) {
          p.z = 0;
          p.vz = -p.vz * 0.35; // Quique com perda de energia (restituição)
          p.vx *= 0.7;        // Fricção horizontal
          p.vy *= 0.7;
        }
        
        // Reduz a vida da partícula
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          // Desvanecimento linear gradual
          p.alpha = Math.max(0, p.life / p.maxLife);
        }
      }
    }
    ```

### 4. Projeção Visual Pseudo-3D (Mapeamento de Coordenadas)
Para renderizar as partículas corretamente no Canvas do motor pseudo-3D, a coordenada `Z` física real da partícula deve ser projetada na vertical da tela, considerando a altura dos olhos do jogador (assumida como `0.5` no motor).

*   **Lógica de Projeção**:
    1.  Calcular a distância relativa do jogador à partícula: `dx = p.x - player.x` e `dy = p.y - player.y`.
    2.  Calcular o ângulo no mundo e o ângulo relativo à visão do jogador.
    3.  Se a partícula estiver dentro do campo de visão (FOV), calcular a distância perpendicular (`perpDist`) para evitar distorção de olho de peixe: `perpDist = dist * Math.cos(angleDiff)`.
    4.  Calcular a posição horizontal projetada `screenX`:
        ```javascript
        const screenX = Math.tan(angleDiff) * (screenWidth / 2) / Math.tan(FOV / 2) + screenWidth / 2;
        ```
    5.  **Cálculo da Altura Vertical Projetada (`projectedY`)** com base na perspectiva 3D e no `Z` físico:
        ```javascript
        const relativeZ = p.z - 0.5; // Altura dos olhos do jogador é 0.5
        const projectedY = (screenHeight / 2) - (relativeZ / perpDist) * (screenHeight / 2 / Math.tan(FOV / 2));
        ```
    6.  **Oclusão 3D (zBuffer)**: Validar contra a parede mais próxima desenhada na coluna correspondente:
        ```javascript
        const screenXInt = Math.floor(screenX);
        if (screenXInt >= 0 && screenXInt < screenWidth && perpDist < zBuffer[screenXInt]) {
          // Renderiza a partícula com tamanho proporcional à distância e cor com transparência
          const particleSize = Math.max(1, Math.min(8, (p.size / perpDist) * (screenHeight / 2 / Math.tan(FOV / 2)) * 0.05));
          
          ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(screenX, projectedY, particleSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ```

### 5. Controle de Duração do Muzzle Flash (Clarão do Disparo)
Para evitar obscurecer a visão do jogador e simular um feedback rápido de combate rápido estilo anos 90:
- O Muzzle Flash será controlado por uma variável `player.muzzleFlashTimer` que receberá o valor em segundos (`0.05` segundos ou ~3 frames a 60 FPS) sempre que a arma disparar.
- A função de atualização reduzirá o timer: `player.muzzleFlashTimer = Math.max(0, player.muzzleFlashTimer - dt)`.
- Na função `renderWeapon()`, o flash só será desenhado se `player.muzzleFlashTimer > 0`, utilizando o gradiente radial amarelo e branco no centro da tela.

### 6. Diferenciação Visual de Impactos
- **Impacto em Parede**:
  - **Sparks**: 8 a 15 partículas por impacto.
  - **Cores**: Mistura de amarelo, laranja e branco (`#FFFFDD`, `#FFA500`, `#FF4500`).
  - **Comportamento**: Velocidades iniciais horizontais e verticais médias/altas, quicam no chão e desaparecem rápido (vida: 0.3 a 0.6s).
- **Impacto em Inimigos**:
  - **Blood Splatter**: 10 a 18 partículas por impacto.
  - **Cores**: Vermelho escuro e escarlate visceral (`#8B0000`, `#B22222`, `#FF0000`).
  - **Comportamento**: Velocidades iniciais moderadas, espalhamento cônico na direção contrária ao disparo, alta gravidade, sem quicar muito (restituição de 0.1).

