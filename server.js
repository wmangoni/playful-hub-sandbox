const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 3000;

// Habilitar CORS para todas as rotas
const allowedOrigins = ['http://localhost:3000', 'https://seudominio.com']; // Adicione seus domínios
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (como Postman, apps mobile, ou same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'A política de CORS para este site não permite acesso da Origem especificada.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

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

app.use(helmet());

// Você pode precisar configurar o helmet, especialmente o CSP,
// para permitir que seus scripts e assets funcionem corretamente.
// Exemplo básico (PODE PRECISAR DE AJUSTES):
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"], // Permite carregar recursos do mesmo domínio
      scriptSrc: ["'self'", "'unsafe-inline'"], // Permite scripts do mesmo domínio e inline (AJUSTE CONFORME NECESSÁRIO)
      // Adicione outras diretivas conforme necessário (styleSrc, imgSrc, etc.)
    },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 requisições por janela (windowMs)
  standardHeaders: true, // Retorna info do limite nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  message: 'Muitas requisições criadas a partir deste IP, por favor tente novamente após 15 minutos'
});

// Aplica o rate limiting a todas as requisições
app.use(limiter);
// Ou aplique apenas a rotas específicas: app.use('/api/', limiter); 

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Jogo acessível em http://localhost:${port}/jogo`);
});