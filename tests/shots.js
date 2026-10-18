// Destino das capturas de evidência dos testes: SHOTS_DIR=<pasta> ou tests/out/
// (ignorada pelo git). Nunca grave capturas em caminhos versionados.
const fs = require('fs');
const path = require('path');

const SHOTS_DIR = path.resolve(process.env.SHOTS_DIR || path.join(__dirname, 'out'));

function shotPath(name) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  return path.join(SHOTS_DIR, name);
}

module.exports = { SHOTS_DIR, shotPath };
