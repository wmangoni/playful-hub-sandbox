/**
 * Particiona o catálogo de combate em arquivos por letra inicial (a.json ... z.json),
 * holy_avenger.json e gera o indice.json leve.
 *
 * Uso: node ded_make_character/tools/particionar-catalogo.js [caminho-catalogo.json] [dir-saida]
 */
const fs = require('fs');
const path = require('path');

const LETRAS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function normalizarNome(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extrairLetra(nome) {
  const norm = normalizarNome(nome);
  const m = norm.match(/[a-z]/);
  return m ? m[0] : 'a';
}

function itemDoIndice(c, arquivo, letra) {
  return {
    id: c.id,
    nome: c.nome,
    nome_original: c.nome_original ?? null,
    categoria: c.categoria,
    nd: c.nd,
    nivel: c.nivel,
    tipo: c.tipo,
    subtipos: Array.isArray(c.subtipos) ? [...c.subtipos] : [],
    tamanho: c.tamanho,
    pv: c.pv,
    ca: {
      total: c.ca.total,
      toque: c.ca.toque,
      surpresa: c.ca.surpresa,
    },
    letra,
    arquivo,
  };
}

function particionarCatalogo(catalogo, outDir) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const monstrosPorLetra = Object.fromEntries(LETRAS.map(l => [l, []]));
  const monstros = catalogo.monstros || [];
  const holyAvenger = catalogo.holy_avenger || [];

  for (const m of monstros) {
    const letra = extrairLetra(m.nome);
    if (!monstrosPorLetra[letra]) monstrosPorLetra[letra] = [];
    monstrosPorLetra[letra].push(m);
  }

  // Ordena os monstros dentro de cada letra
  for (const l of Object.keys(monstrosPorLetra)) {
    monstrosPorLetra[l].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  // Salva a.json até z.json
  for (const l of LETRAS) {
    const filePath = path.join(outDir, `${l}.json`);
    fs.writeFileSync(filePath, JSON.stringify(monstrosPorLetra[l], null, 2) + '\n', 'utf8');
  }

  // Salva holy_avenger.json
  const haPath = path.join(outDir, 'holy_avenger.json');
  fs.writeFileSync(haPath, JSON.stringify(holyAvenger, null, 2) + '\n', 'utf8');

  // Gera indice.json
  const indice = [];
  for (const l of LETRAS) {
    for (const m of monstrosPorLetra[l]) {
      indice.push(itemDoIndice(m, `${l}.json`, l));
    }
  }
  for (const ha of holyAvenger) {
    const letra = extrairLetra(ha.nome);
    indice.push(itemDoIndice(ha, 'holy_avenger.json', letra));
  }

  // Ordena índice por nome em pt-BR
  indice.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const indicePath = path.join(outDir, 'indice.json');
  fs.writeFileSync(indicePath, JSON.stringify(indice, null, 2) + '\n', 'utf8');

  return {
    totalMonstros: monstros.length,
    totalHolyAvenger: holyAvenger.length,
    totalIndice: indice.length,
    letrasComMonstros: Object.entries(monstrosPorLetra).filter(([, v]) => v.length > 0).map(([k]) => k),
  };
}

module.exports = { particionarCatalogo, normalizarNome, extrairLetra, itemDoIndice };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const catPath = process.argv[2] || path.join(root, 'data', 'catalogo-combate.json');
  const outDir = process.argv[3] || path.join(root, 'data', 'monstros');

  console.log(`Lendo catálogo de: ${catPath}`);
  const catalogo = JSON.parse(fs.readFileSync(catPath, 'utf8'));

  const res = particionarCatalogo(catalogo, outDir);
  console.log(`Catálogo particionado com sucesso em: ${outDir}`);
  console.log(`  - Monstros: ${res.totalMonstros} (distribuídos em ${res.letrasComMonstros.length} letras: ${res.letrasComMonstros.join(', ')})`);
  console.log(`  - Holy Avenger: ${res.totalHolyAvenger} (salvos em holy_avenger.json)`);
  console.log(`  - Índice geral: ${res.totalIndice} combatentes (salvos em indice.json)`);
}
