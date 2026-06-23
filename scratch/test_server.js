const app = require('../server');
const http = require('http');

// Capture express/process errors
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

const server = http.createServer(app);
server.listen(3099, '127.0.0.1', () => {
  console.log('Diagnostic server listening on 3099...');
  
  const req = http.get('http://127.0.0.1:3099/threejs-earth-main/index.js', res => {
    console.log('STATUS CODE:', res.statusCode);
    console.log('HEADERS:', res.headers);
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('BODY LENGTH:', data.length);
      console.log('BODY SAMPLE:', data.substring(0, 500));
      server.close();
      process.exit(0);
    });
  });
  
  req.on('error', err => {
    console.error('Request error:', err);
    server.close();
    process.exit(1);
  });
});
