const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

// Habilitar CORS para todas as rotas
app.use(cors());

// Middleware para processar JSON
app.use(express.json());

// Servir arquivos estáticos da pasta raiz
app.use(express.static('./'));

// Função auxiliar para criar rotas de páginas HTML
const createHtmlRoute = (route, filename) => {
    app.get(route, (req, res) => {
        console.log(`Body: ${req.body}`);
        console.log(`Headers: ${req.headers}`);
        console.log(`Servindo arquivo: ${filename}`);
        res.sendFile(path.join(__dirname, filename));
    });
};

// Rota hello world
app.get('/api/hello', (req, res) => {
    res.json({ "hello": "world" });
});

// Criar rotas para as páginas HTML
createHtmlRoute('/', 'index.html');
createHtmlRoute('/ded', 'ded/index.html');
createHtmlRoute('/ded/index_new', 'ded/index_new.html');
createHtmlRoute('/3d_shooter', '3d_shooter/index.html');
createHtmlRoute('/driving_simulator', 'driving_simulator/index.html');
createHtmlRoute('/poker', 'poker/index.html');
createHtmlRoute('/game_of_life', 'game_of_life/index.html');
createHtmlRoute('/it_simulator', 'it_simulator/index.html');
createHtmlRoute('/archer', 'archer/index.html');
createHtmlRoute('/pinball', 'pinball/index.html');
createHtmlRoute('/puzzle', 'puzzle/index.html');
createHtmlRoute('/rubiks_cube', 'rubiks_cube/index.html');
createHtmlRoute('/snake', 'snake/index.html');
createHtmlRoute('/space_shooter', 'space_shooter/index.html');
createHtmlRoute('/strategy_game', 'strategy_game/index.html');
createHtmlRoute('/tetris', 'tetris/index.html');
createHtmlRoute('/tabuleiro_galton', 'tabuleiro_galton/index.html');
createHtmlRoute('/visual_effects', 'visual_effects/index.html');


app.use('/3d_shooter/assets', express.static(path.join(__dirname, '3d_shooter/assets')));
app.use('/ded/assets', express.static(path.join(__dirname, 'ded/assets')));
app.use('/driving_simulator/assets', express.static(path.join(__dirname, 'driving_simulator/assets')));

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Jogo acessível em http://localhost:${port}/jogo`);
}); 