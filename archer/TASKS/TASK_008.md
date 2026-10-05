# 📝 TASK-ARCHER-008: Etapa 4 - Batalha de Chefe, Modos Extras e Polimento Final

## 👤 User Story
* **Como** jogador do minijogo **The Archer**,
* **Eu quero** enfrentar uma batalha de chefe épica na Onda 10 contra o "Titã dos Céus", experimentar modos de jogo adicionais como Rush 60s (frenético e infinito) e Desafios Trickshot (quebra-cabeças balísticos de ricochete), além de efeitos de impacto dinâmicos como Screen Shake,
* **Para que** o jogo ofereça um clímax emocionante para a campanha principal, variedades ricas de gameplay para diferentes estilos de jogadores e o mais alto nível de fator de replay.

---

## 🎯 Critérios de Aceitação Cumpridos

1. **Batalha de Chefe: "O Titã dos Céus" (Onda 10)**:
   - Configuração especial na Onda 10 em `WAVE_CONFIG`: balão único com atributos de chefe (`isBoss: true`, 5 HP, dimensões ampliadas 62x80px com aura cósmica dourada/roxa e coroa real).
   - Componente de HUD dedicado `#boss-bar-container` com barra de HP em tempo real e valor numérico.
   - Movimentação bidimensional oscilatória (flutuação vertical e deriva horizontal senoidal).
   - Mecânica de dano estratégico:
     - Flechas normais causam 1 de dano com som metálico de impacto (`playMetalHitSound`).
     - Flechas de fogo causam 2 de dano (dano duplo crítico) com efeito de explosão térmica (`playExplosionSound`).
     - Flechas penetram e impactam o chefe com consumo seguro sem múltiplos ticks por quadro.
   - Derrota triunfal do chefe:
     - Efeito explosivo em área com 60 partículas douradas.
     - Screen shake prolongado (700ms).
     - Recompensa massiva: +1.000 pontos e +25 moedas de ouro.
     - Conquistas desbloqueadas: `boss_slayer` e `wave_10`.
     - Transição suave para a tela de Vitória Épica.

2. **Modo Rush 60 Segundos**:
   - Modo de ação rápida com tempo cronometrado regressivo de 60 segundos (`#timer-container`).
   - Flechas infinitas: HUD indica `'∞'` e o contador de flechas é preservado continuamente em 999.
   - Respawn ágil contínuo de balões a cada 220ms após estouro, sem banners de transição.
   - Conquista `rush_master` desbloqueada automaticamente ao pontuar 1.500+ pontos dentro do tempo limite.
   - Finalização com título temático `⚡ TEMPO ESGOTADO!` ou `⚡ RUSH CONCLUÍDO!` e registro no ranking de recordes.

3. **Modo Desafio Trickshot (Quebra-cabeças Balísticos)**:
   - 3 fases artesanais de desafio balístico em `TRICKSHOT_LEVELS` onde o trajeto direto é bloqueado por nuvens de tempestade.
   - O único caminho viável para atingir o balão requer o cálculo preciso de ricochete no escudo giratório de madeira.
   - Munição limitada por desafio (1 a 2 flechas) exigindo precisão milimétrica.
   - Progressão automática entre os 3 níveis ao estourar o alvo e celebração final com título `🏆 TRICKSHOT CONCLUÍDO!` e conquista `trickshot_ace`.

4. **Modal de Seleção de Modos de Jogo**:
   - Acessível pelo botão `🎮 Modos` na barra de metagame do HUD e no painel de Game Over / Vitória.
   - Cards visuais estilizados para Campanha (10 Ondas), Rush 60s e Trickshot com destaque ativo para o modo em execução.
   - Fechamento suave via botão de fechar e clique fora no overlay.

5. **Screen Shake FX e Polimento Audiovisual**:
   - Animação CSS `.screen-shake` de vibração de câmera dinâmica acionada em:
     - Impactos diretos no Titã dos Céus (280ms normal / 450ms fogo).
     - Derrota final do Chefe (700ms).
     - Detonações de Balões TNT (420ms).
   - Gerenciamento robusto de temporizadores (`balloonSpawnTimer`, `waveTransitionTimer`, `rushInterval`) impedindo vazamentos de memória ou colisões temporais entre reinicializações de partida.

6. **Validação e Suíte de Testes Automatizada**:
   - Criação da suíte `tests/qa_archer_etapa4_climax.test.js` cobrindo 6 baterias completas de teste via Puppeteer.
   - Execução com 100% de aprovação (6/6 testes passando).
   - Execução integral das 6 suítes de teste do projeto (`qa_archer_arrow_physics`, `qa_archer_task003`, `qa_archer_etapa1_waves`, `qa_archer_etapa2_tactical`, `qa_archer_etapa3_metagame`, `qa_archer_etapa4_climax`) com 0 erros no console e zero regressões.
