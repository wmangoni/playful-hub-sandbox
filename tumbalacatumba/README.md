# Tumbalacatumba — Contos do Vale Assombrado

RPG de missões num mundo aberto com visual cartunesco "à la Tim Burton" (terror engraçado),
feito em **three.js**, que roda num **único arquivo HTML** — sem servidor, sem internet, sem instalar nada.

## Jogar

Abra **`Tumbalacatumba.html`** no navegador (Chrome, Edge ou Firefox). Só isso.

> O progresso é salvo automaticamente no navegador (`localStorage`). Na tela de título aparece **Continuar**.

## Controles (de MMO clássico)

| Ação | Tecla / mouse |
|---|---|
| Andar / recuar | `W` / `S` (ou setas) |
| Girar o personagem | `A` / `D` |
| Passo lateral | `Q` / `E` (ou `A`/`D` segurando o botão direito) |
| Girar só a câmera | segurar o **botão esquerdo** e arrastar |
| Girar câmera + personagem | segurar o **botão direito** e arrastar |
| Andar com o mouse | segurar **os dois botões** |
| Zoom | roda do mouse |
| Pular | `Espaço` |
| Correr sozinho | `R` ou `NumLock` |
| Conversar / pegar / usar | **clique direito** (ou `F` perto do alvo) |
| Selecionar alvo | clique esquerdo · `Tab` alterna alvos (criaturas primeiro) |
| Atacar | `7` (Lanternada) ou **clique direito** na criatura · liga o ataque automático |
| Barra de ações | `1`–`8` (Buu!, Dança, Lanterna, Pet, Vassoura, Lápide de Regresso, Lanternada, Voar) |
| Voar (com a capinha) | `8` · no ar, `Espaço` sobe e `X` desce · segure `X` rente ao chão para pousar, ou `8` para descer planando |
| Diário de missões / Mapa / Mochila | `L` / `M` / `B` |
| Chat | `Enter` (comandos: `/ajuda`, `/dançar`, `/buu`, `/sentar`, `/acenar`, `/hora`) |
| Sentar | `X` |
| Esconder a interface | `Z` |
| Menu, opções e controles | `Esc` |

### No celular ou tablet (tela de toque)

Jogue com o aparelho deitado. O modo toque liga sozinho em telas de toque, e dá para mudar em Opções → Controles de toque.

| Ação | Toque |
|---|---|
| Andar | arrastar o **lado esquerdo** da tela (joystick): o personagem anda para onde você aponta |
| Girar a câmera | arrastar o **lado direito** da tela |
| Zoom | pinça com dois dedos |
| Conversar / pegar / usar | **tocar** em alguém ou em algo perto (longe: só seleciona) |
| Atacar | tocar na criatura para selecionar e de novo para atacar, ou o `7` da barra |
| O que é isso? | **toque longo** mostra a dica |
| Pular / voar | botão **Pular** (voando: **Subir** e **Descer**; segure Descer rente ao chão para pousar) |

## O que tem no vale

- **17 missões** com PNJs: o Prefeito Abóbora (cuja cabeça gira entre a cara feliz e a preocupada),
  Dona Aranhilda e seu gato de três olhos, o esqueleto Juvenal que se desmontou no baile,
  o Seu Custódio e o ovo de avestruz demônio que você precisa **chocar sentando nele**,
  o espantalho insone, o Conde Dentúcio que perdeu a dentadura (um sapo está usando),
  a bruxa Madame Vesga, o fantasma apaixonado Suspiro e a Lady Névoa…
- **5 continuações** que levam às regiões de criaturas: *Cuspe de Fogo* (Seu Custódio, pimentas nas Fendas),
  *Baile de Arromba* (Juvenal, caveiras no cemitério), *Poção Cabeluda* (Vesga, pelos das aranhas do bosque),
  *Despejo no Sótão* (Conde, morcegos da mansão) e *Casamento no Farol* (Suspiro e Lady Névoa: marujos e
  o farol apagado há cem anos).
- **A Mansão Dentúcio por dentro**: entre pela porta da frente e conheça os 12 cômodos em 4 andares —
  saguão com escadaria, armaduras e vitral, sala de jantar, sala da lareira, cozinha, sala de música com órgão,
  biblioteca, quarto do Conde com cama-caixão, banheiro, cripta da família, lavanderia do Anselmo, adega e
  sótão —, cheios de móveis e objetos para examinar (clique direito) e com minimapa por andar.
- ***A Capa Sumida*** (Conde, depois de *Despejo no Sótão*): a capa nova que o Conde ganhou de presente sumiu
  dentro da mansão. Siga as 3 pistas (com a ajuda do mordomo Anselmo e dos antepassados na cripta) até o baú do
  sótão e ganhe a **capinha**, que dá o poder de **voar**.
- Recompensas que mudam o jogo: **chapéu de abóbora**, **pet** Belzebuzinho que te segue e, depois do
  mingau ardido, **cospe bolas de fogo** nas criaturas que brigam com você (dano baixo, só uma ajudinha),
  **vassoura voadora** (+65% de velocidade), lanterna de vaga-lumes, **tônico** que cura 40 de vida
  (recarga de 60 s), dinheiro e níveis 1→7.
- **Combate**: a **Lanternada** gira a lanterna num arco à frente (acerta o alvo e, com 60% do dano,
  até mais duas criaturas grudadas nele), com ataque automático, críticos e números de dano flutuando.
  O **Buu!** agora também faz as criaturas fugirem de medo por 2,5 s. Cada nível deixa o Vicente mais forte
  (vida, dano, crítico, velocidade do golpe e resistência — passe o mouse no retrato para ver a ficha).
  Fora de combate a vida volta sozinha (sentado, bem mais rápido); se cair, é só voltar à praça.
- **Criaturas por região** (o nível aparece ao entrar na zona e no mapa):

  | Região | Nível | Criatura | Comportamento |
  |---|---|---|---|
  | Sítio do Seu Custódio | 1–2 | Corvo Debochado | neutro |
  | Colina Espiral | 1–2 | Rato-Zumbi | hostil |
  | Cemitério Sorridente | 2–3 | Caveira Saltitante | hostil, anda em bando |
  | Pântano dos Sapos Tristes | 3 | Sapo Tristonho | neutro |
  | Bosque Retorcido | 3–4 | Aranha Cabeluda | hostil, anda em bando |
  | Mansão Dentúcio | 4–5 | Morcego Dentuço | hostil, anda em bando |
  | Farol Desalinhado | 4–5 | Marujo Afogado | hostil, anda em bando |

  Hostis atacam quem chega perto; neutros só brigam se forem atacados, ou em 15% das vezes em que
  alguém chega perto demais e eles se sentem incomodados.
- **Ciclo de dia e noite** (12 min por dia, ajustável): lua gigante nascendo atrás da Colina Espiral,
  estrelas, janelas e postes acendendo, vaga-lumes, morcegos, névoa rasteira, fumaça nas chaminés.
  Uma missão só pode ser feita à noite (o coveiro deixa você "cochilar" até escurecer).
- **Interface de caderno de contos costurado**: retrato 3D ao vivo num camafeu de borda listrada, minimapa com marcadores
  `!` / `?`, áreas de objetivo e setas, rastreador de missões, diálogos em pergaminho, diário,
  mapa-múndi, mochila, barra de ações com recarga, barra de XP, barra de conjuração, chat,
  balões de fala, placas de nome, texto de zona ao entrar em cada área e tela de título.
- Trilha e efeitos **100% procedurais** em WebAudio (valsa em ré menor, coral fantasma à noite).

## Desenvolvimento

```bash
npm install
npm run dev      # servidor de desenvolvimento em http://127.0.0.1:5178
npm run build    # gera dist/index.html e Tumbalacatumba.html (arquivo único)
```

Parâmetros úteis de URL no modo dev: `?play` (pula o título), `?t=21.5` (hora do dia),
`?pos=x,z` (posição inicial), `?q=baixa|media|alta` (qualidade gráfica), `?notut` (sem tutorial),
`?peaceful` (criaturas não atacam).

### Estrutura

```
src/
  game.js              orquestra tudo (render, loop, fluxo título → jogo, salvar)
  world/               terreno procedural, céu, água, dia/noite, layout do mapa, colisão, props
  render/              materiais toon, construtor de geometria, pós-processamento (contorno de tinta, bloom)
  entities/            jogador, câmera de terceira pessoa, rig de animação, modelos de PNJs e criaturas
  combat/              golpe do jogador, atributos por nível, IA e tipos das criaturas
  quests/              dados das missões, progresso/salvamento, interação, lógica das missões no mundo
  world/interior/      a Mansão Dentúcio por dentro: planta, arquitetura, móveis e decoração dos cômodos
  ui/                  HUD (quadros, minimapa, rastreador, chat, janelas), ícones e retratos 3D
  fx/                  partículas, halos de luz, varal de luzinhas
  audio/               música e efeitos procedurais
```

Todo o conteúdo visual (casas tortas, árvores retorcidas, personagens, ícones, placas) é gerado por
código — não há modelos 3D, texturas ou sons externos.
