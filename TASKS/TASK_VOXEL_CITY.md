# 📝 TASK-VOXEL_CITY: Lógica RCI (Demanda), Simulação de Impostos e Desastres em Voxel

## 👤 User Story
*   **Como** prefeito virtual no construtor 3D de blocos **Voxel City**,
*   **Eu quero** gerenciar a economia de impostos, balancear as necessidades das zonas habitacionais através do indicador RCI e defender a cidade contra desastres dinâmicos instalando serviços de bombeiros e polícia,
*   **Para que** a experiência de sandbox visual em blocos ganhe a complexidade e a diversão tática de simuladores clássicos de gerenciamento de cidades (como SimCity).

---

## 🎯 Critérios de Aceitação
1.  **Indicador de Demanda RCI e Impostos**:
    *   Exibir barras de demanda de zonas na interface: **R** (Residencial - Verde), **C** (Comercial - Azul), **I** (Industrial - Amarelo).
    *   A demanda flutua com base no desbalanceamento (ex: muitas casas sem indústrias para trabalhar aumenta a demanda Industrial).
    *   Criar menu financeiro para ajustar a alíquota de Impostos (0% a 20%). Impostos > 12% causam declínio migratório e zeram as demandas RCI.
2.  **Rede de Serviços Públicos (Bombeiros e Polícia)**:
    *   Adicionar 2 novos edifícios de serviço público na barra de construção:
        1.  *Corpo de Bombeiros (Custo: 500 moedas)*: Previne a propagação de incêndios em um raio de 6 blocos.
        2.  *Delegacia de Polícia (Custo: 600 moedas)*: Reduz a criminalidade na vizinhança, permitindo que edifícios residenciais façam upgrade automático para arranha-céus de alta densidade.
3.  **Desastres Naturais Aleatórios**:
    *   Eventos surpresa podem ocorrer a cada 3 minutos (exibir aviso na tela "ALERTA DE DESASTRE"):
        *   *Incêndio Florestal/Urbano*: Um bloco residencial ou industrial começa a emitir partículas de fumaça e fogo. Se houver cobertura de bombeiros, o fogo apaga em breve. Se não houver, o bloco é destruído e vira "Escombros", exigindo demolição pelo jogador.
        *   *Terremoto*: Tremor visual na tela (sacudida de câmera no canvas 3D) destruindo instantaneamente 2 a 4 edifícios aleatórios em áreas sem suporte de infraestrutura.

---

## 🛠️ Detalhes Técnicos e Arquitetura
*   **Arquivos Alvo**: `/voxel_city/index.html`.
*   **Simulação de Ciclo Econômico (Tick System)**:
    *   Implementar uma função `economicTick()` que roda a cada 4 segundos na simulação, coletando impostos das zonas de acordo com a população e descontando os custos de manutenção da polícia/bombeiros.
*   **Renderização Voxel**:
    *   As partículas de fumaça e fogo dos desastres devem ser renderizadas como pequenos cubos voxel vermelhos/laranjas flutuantes no canvas 3D para manter a fidelidade estética original do minijogo.

---

## 📊 Priorização e Estimativa
*   **Prioridade**: Muito Alta (Muda a proposta do minijogo de um colocador estático de blocos para um verdadeiro construtor dinâmico de SimCity).
*   **Esforço Estimado**: Alta (Requer sincronização da engine lógica de RCI/Impostos com a renderização em perspectiva 3D dos escombros e partículas).
*   **Área**: Front-end / Computação Gráfica 3D Canvas / Economia de Simulação.
