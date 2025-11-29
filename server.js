const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs'); // Adicionado para verificar a existência do arquivo ads.txt

// Habilitar CORS para todas as rotas
const allowedOrigins = [
  'http://localhost:3000', 
  'https://playfulhub.com.br',
  'https://www.playfulhub.com.br',
  'https://playfulhub.herokuapp.com',
  'https://playfulhub.netlify.app'
];
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

// Servir arquivos estáticos da pasta raiz com cache
app.use(express.static('./', {
    maxAge: '1h', // Cache de 1 hora para assets estáticos
    etag: true,
    lastModified: true
}));

// Cache headers para páginas HTML
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path.startsWith('/jogos/')) {
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos para HTML
    }
    next();
});

// Rota específica para ads.txt (importante para AdSense)
app.get('/ads.txt', (req, res) => {
    // Headers específicos para ads.txt
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permitir acesso de qualquer origem
    
    // Log para debug
    console.log(`[ADS.TXT] Requisição de: ${req.ip} - ${req.get('User-Agent')}`);
    
    // Verificar se o arquivo existe
    const adsPath = path.join(__dirname, 'ads.txt');
    if (fs.existsSync(adsPath)) {
        res.sendFile(adsPath);
    } else {
        // Fallback: enviar conteúdo direto
        const adsContent = 'google.com, pub-6741914590073026, DIRECT, f08c47fec0942fa0';
        res.send(adsContent);
    }
});

// Rota específica para robots.txt (importante para crawlers)
app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const robotsPath = path.join(__dirname, 'robots.txt');
    if (fs.existsSync(robotsPath)) {
        res.sendFile(robotsPath);
    } else {
        // Fallback mínimo permissivo
        res.send('User-agent: *\nAllow: /');
    }
});

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

// Rotas para páginas de jogos otimizadas (SEO-friendly)
createHtmlRoute('/jogos/puzzle', 'jogos/puzzle.html');
createHtmlRoute('/jogos/space_shooter', 'jogos/space_shooter.html');
createHtmlRoute('/jogos/ded', 'jogos/ded.html');
createHtmlRoute('/jogos/3d_shooter', 'jogos/3d_shooter.html');
createHtmlRoute('/jogos/chess', 'jogos/chess.html');
createHtmlRoute('/jogos/tetris', 'jogos/tetris.html');
createHtmlRoute('/jogos/snake', 'jogos/snake.html');
createHtmlRoute('/jogos/strategy_game', 'jogos/strategy_game.html');
createHtmlRoute('/jogos/rubiks_cube', 'jogos/rubiks_cube.html');
createHtmlRoute('/jogos/archer', 'jogos/archer.html');
createHtmlRoute('/jogos/lazy_gardner', 'jogos/lazy_gardner.html');
createHtmlRoute('/jogos/gameoflife', 'jogos/gameoflife.html');
createHtmlRoute('/jogos/driving_simulator', 'jogos/driving_simulator.html');
createHtmlRoute('/jogos/visual_effects', 'jogos/visual_effects.html');
createHtmlRoute('/jogos/poker', 'jogos/poker.html');
createHtmlRoute('/jogos/it_simulator', 'jogos/it_simulator.html');
createHtmlRoute('/jogos/tabuleiro_galton', 'jogos/tabuleiro_galton.html');
createHtmlRoute('/jogos/pinball', 'jogos/pinball.html');
createHtmlRoute('/jogos/voxel_city', 'jogos/voxel_city.html');

// Rotas legadas para compatibilidade (redirecionam para as novas)
createHtmlRoute('/ded', 'ded/index.html');
createHtmlRoute('/ded/index_new', 'ded/index_new.html');
createHtmlRoute('/3d_shooter', '3d_shooter/index.html');
createHtmlRoute('/driving_simulator', 'driving_simulator/index.html');
createHtmlRoute('/poker', 'poker/index.html');
createHtmlRoute('/game_of_life', 'gameoflife/index.html');
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
createHtmlRoute('/chess', 'chess/index.html');
createHtmlRoute('/lazy_gardner', 'lazy_gardner/index.html');
createHtmlRoute('/voxel_city', 'voxel_city/index.html');


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

// Adicionar health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        ads_txt_available: fs.existsSync(path.join(__dirname, 'ads.txt')),
        domain: req.get('host')
    });
});

// Iniciar o servidor (não iniciar durante testes)
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
        console.log(`Jogo acessível em http://localhost:${port}/jogo`);
    });
}

module.exports = app;