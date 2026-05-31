# 📝 TASK-ARCHER: Vento Lateral Dinâmico, Balões Especiais e Multiplicador de Combo

## 👤 User Story
*   **Como** arqueiro no minijogo **The Archer**,
*   **Eu quero** enfrentar a influência de ventos dinâmicos na trajetória das flechas, estourar balões especiais com efeitos únicos e acumular multiplicadores por acertos consecutivos,
*   **Para que** a física do jogo seja mais realista e a pontuação incentive precisão e consistência.

---

## 🎯 Critérios de Aceitação
1.  **Indicador e Influência de Vento Lateral**:
    *   Exibir na interface de usuário (HUD) um indicador visual da força e direção do vento (ex: seta de vento e valor em m/s de -5 a +5).
    *   O vento deve mudar de intensidade e direção a cada 3 tiros ou a cada rodada.
    *   A física da flecha disparada deve sofrer uma força lateral contínua igual à velocidade do vento multiplicada por um fator de sensibilidade, curvando sua trajetória horizontalmente.
2.  **Balões com Efeitos Especiais**:
    *   Adicionar 3 novos tipos de balões que sobem de forma aleatória:
        1.  *Balão de Hélio Instável (Explosivo - Vermelho com Faíscas)*: Ao ser estourado, destrói todos os balões em um raio de 100 pixels.
        2.  *Balão Criogênico (Azul Escuro)*: Reduz em 60% a velocidade de subida de todos os balões ativos na tela por 6 segundos.
        3.  *Balão da Fortuna (Dourado)*: Move-se muito mais rápido e concede pontuação bônus multiplicada por 5.
3.  **Sistema de Combo Streak**:
    *   Cada balão destruído consecutivamente sem errar tiros incrementa a barra de combo.
    *   Adicionar multiplicadores de pontuação visíveis na tela: 2x (a partir de 3 acertos), 3x (a partir de 6 acertos) e 5x (a partir de 10 acertos).
    *   Se qualquer flecha disparada sair da tela ou cair no chão sem atingir nenhum balão, o combo retorna imediatamente a 1x.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/archer/index.html`.
*   **Ajuste da Física**:
    *   Na função de atualização da física da flecha (`arrow.update()` ou similar), aplicar a força do vento sobre o eixo X:
        `arrow.x += arrow.vx + windSpeed * deltaTime;`
*   **Renderização e Estilos**:
    *   Criar um componente de HUD flutuante no topo mostrando uma biruta de vento animada baseada na intensidade (`windSpeed`).
    *   Utilizar sprites ou efeitos CSS `@keyframes` pulsantes para diferenciar os balões especiais dos balões vermelhos convencionais.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Média-Alta (Eleva a jogabilidade básica de casual para competitiva).
*   **Esforço Estimado**: Média (Requer alterações na física básica de projéteis e pooling de objetos para efeitos visuais).
*   **Área**: Front-end / Motor de Física 2D / UI.
