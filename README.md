# 🎮 Playful Hub - Playground Digital

Bem-vindo ao **Playful Hub**, um playground digital interativo que centraliza diversos minijogos, simuladores físicos e experimentos visuais criativos desenvolvidos com tecnologias web nativas (**HTML5, CSS3 e JavaScript**).

Criado e mantido por **[William Mangoni](https://www.linkedin.com/in/william-mangoni-754578a6/)**, este projeto serve como um rico portfólio de engenharia front-end e interatividade web.

---

## 🕹️ Modos de Navegação

O projeto conta com duas experiências distintas para exploração do catálogo:

1.  **Hub Moderno (`index.html`)**: Uma interface web de estética futurista com temas de jogos, efeitos de iluminação dinâmica (spots coloridos gerados via JS) e transições neon. Conta com um efeito imersivo de carregamento falso (*fake load*) de 7 segundos ao selecionar um jogo, aumentando o suspense e engajamento.
2.  **Modo Museu Interativo (`index2.html`)**: Uma galeria virtual retrô estilo 8-bit / pixel-art rodando em `<canvas>`, onde o usuário controla um personagem em visão superior (*top-down*) e interage com totens físicos de exposição para abrir os minijogos.

---

## 📦 Catálogo de Minijogos e Experimentos

O hub centraliza 19 minijogos e simuladores diferentes, acessíveis por rotas amigáveis e organizados em subdiretórios individuais:

1.  **3D Shooter (`/jogos/3d_shooter`)**: Tiro em primeira pessoa (FPS) 3D inspirado no clássico Doom, com labirintos e inimigos.
2.  **RPG Adventure Quest (`/jogos/ded`)**: Uma jornada de aventura inspirada no clássico RPG de mesa Dungeons & Dragons.
3.  **Space Shooter (`/jogos/space_shooter`)**: Clássico jogo de navinha estilo arcade para combater ondas de inimigos no espaço.
4.  **Strategy Empire (`/jogos/strategy_game`)**: Jogo de estratégia de conquista de reinos e expansão de impérios.
5.  **Company Simulator (`/jogos/it_simulator`)**: Simulador satírico e divertido sobre o cotidiano de trabalhar na área de TI.
6.  **The Archer (`/jogos/archer`)**: Teste de mira de arco e flecha para estourar balões vermelhos dinâmicos.
7.  **Tetris (`/jogos/tetris`)**: O clássico e viciante jogo de encaixe de blocos geométricos dos anos 80.
8.  **Poker Texas Hold'em (`/jogos/poker`)**: Jogue Poker Texas Hold'em contra Inteligência Artificial.
9.  **String Catcher (`/jogos/visual_effects`)**: Jogo rítmico arcade de capturar notas em cordas vibrantes com lindos efeitos ondulatórios.
10. **Snake Game (`/jogos/snake`)**: O tradicional jogo da cobrinha com mecânica fiel e um visual neon modernizado.
11. **Lazy Gardener (`/jogos/lazy_gardner`)**: Simulador relaxante e incremental de jardinagem que cresce de forma passiva.
12. **Conway's Game of Life (`/jogos/gameoflife`)**: Autômato celular que simula o nascimento e morte de células com base em regras matemáticas simples.
13. **Rubik's Cube (`/jogos/rubiks_cube`)**: Simulador 3D para resolver o clássico Cubo Mágico de forma interativa.
14. **Driving Simulator (`/jogos/driving_simulator`)**: Jogo de simulação de direção de carro por uma bela estrada cênica.
15. **Galton Board (`/jogos/tabuleiro_galton`)**: Simulador físico da máquina de Plinko/Galton mostrando probabilidade estatística.
16. **Chess (`/jogos/chess`)**: Jogo de xadrez clássico contra IA com múltiplos níveis de dificuldade.
17. **Voxel City (`/jogos/voxel_city`)**: Construtor e visualizador 3D de cidades em blocos estilo Voxel.
18. **Rede Neural Evolutiva (`/rede_neural_evolutiva`)**: Experimento científico que mostra agentes virtuais evoluindo de forma autônoma.
19. **Three.js Earth (`/threejs-earth-main`)**: Demonstração em 3D interativa do planeta Terra utilizando a biblioteca Three.js.

---

## 🛠️ Arquitetura e Estrutura Técnica

*   **Servidor Backend (`server.js`)**: Construído com **Express.js**. Inclui cabeçalhos de segurança via **Helmet**, controle de requisições maliciosas com **express-rate-limit**, e controle estrito de origens de requisição via **CORS**.
*   **Performance**: Entrega de assets estáticos com cabeçalho de cache de 1 hora (`maxAge: '1h'`) e cabeçalho ETag ativo. Páginas HTML têm 5 minutos de cache em cache-control.
*   **Otimização SEO & AdSense**: Roteamento limpo e amigável (SEO-friendly), monitoramento de performance com Google Analytics/Tag Manager, lazy loading de anúncios regulado por `IntersectionObserver` e suporte a `ads.txt` e `robots.txt`.
*   **Testes Integrados (`tests/`)**: Testes básicos de fumaça (*smoke tests*) para execução em pipelines de CI (`tests/smoke.test.js`).

---

## 🚀 Como Rodar o Projeto Localmente

Siga o passo a passo abaixo para configurar e executar o **Playful Hub** em sua máquina de desenvolvimento.

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
*   [Node.js](https://nodejs.org/) (Versão LTS recomendada, v18 ou superior)
*   [NPM](https://www.npmjs.com/) (Gerenciador de pacotes, instalado junto ao Node.js)

### Passo a Passo

1.  **Clonar o Repositório** (caso não tenha o código localmente):
    ```bash
    git clone https://github.com/wmangoni/playful-hub-sandbox.git
    cd playful-hub-sandbox
    ```

2.  **Instalar Dependências**:
    Instale os pacotes necessários configurados no `package.json` (Express, Helmet, Cors, etc.):
    ```bash
    npm install
    ```

3.  **Executar o Servidor**:

    *   **Modo de Produção / Padrão**:
        Inicia a aplicação de forma direta com o Node.js:
        ```bash
        npm start
        ```

    *   **Modo de Desenvolvimento**:
        Executa o servidor utilizando o **Nodemon**, reiniciando automaticamente o servidor a cada alteração feita nos arquivos backend:
        ```bash
        npm run dev
        ```

4.  **Acessar a Aplicação**:
    Abra seu navegador de preferência e acesse o endereço local:
    ```
    http://localhost:3000
    ```

### Rodando os Testes de Fumaça

Para validar rapidamente se o servidor inicializa e as principais rotas estão saudáveis, você pode rodar os testes utilizando:
```bash
npm run test:ci
```
