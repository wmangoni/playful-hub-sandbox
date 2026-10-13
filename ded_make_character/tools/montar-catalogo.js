/**
 * Monta o catálogo de combate unificado (data/catalogo-combate.json)
 * a partir dos arquivos particionados em data/monstros/ ([a-z].json e holy_avenger.json).
 *
 * Uso: node ded_make_character/tools/montar-catalogo.js [dir-monstros] [caminho-saida]
 */
const fs = require('fs');
const path = require('path');

const LETRAS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function montarCatalogo(dirMonstros, catalogoExistente = null) {
  const monstros = [];
  for (const l of LETRAS) {
    const filePath = path.join(dirMonstros, `${l}.json`);
    if (fs.existsSync(filePath)) {
      const lista = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(lista)) {
        monstros.push(...lista);
      }
    }
  }

  // Se já havia um catálogo, preserva a ordem dos monstros existentes e anexa os novos ordenados por ND e nome
  if (catalogoExistente?.monstros?.length) {
    const ordemOriginal = new Map(catalogoExistente.monstros.map((m, i) => [m.id, i]));
    monstros.sort((a, b) => {
      const ia = ordemOriginal.has(a.id) ? ordemOriginal.get(a.id) : 999999;
      const ib = ordemOriginal.has(b.id) ? ordemOriginal.get(b.id) : 999999;
      if (ia !== ib) return ia - ib;
      return (a.nd - b.nd) || a.nome.localeCompare(b.nome, 'pt-BR');
    });
  } else {
    monstros.sort((a, b) => (a.nd - b.nd) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  let holyAvenger = [];
  const haPath = path.join(dirMonstros, 'holy_avenger.json');
  if (fs.existsSync(haPath)) {
    const lista = JSON.parse(fs.readFileSync(haPath, 'utf8'));
    if (Array.isArray(lista)) {
      holyAvenger = lista;
    }
  }

  const versao = catalogoExistente?.versao ?? 2;
  const descricao = catalogoExistente?.descricao ??
    `Catálogo de combate do D&D Make Character para D&D 3.5 (Edição Revisada), com ${monstros.length} monstros do Livro dos Monstros 3.5 e ${holyAvenger.length} combatentes adaptados de Tormenta D20 / Holy Avenger.`;

  return {
    versao,
    descricao,
    monstros,
    holy_avenger: holyAvenger,
  };
}

module.exports = { montarCatalogo };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const dirMonstros = process.argv[2] || path.join(root, 'data', 'monstros');
  const outPath = process.argv[3] || path.join(root, 'data', 'catalogo-combate.json');

  let existente = null;
  if (fs.existsSync(outPath)) {
    try {
      existente = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    } catch {
      existente = null;
    }
  }

  console.log(`Montando catálogo a partir de: ${dirMonstros}`);
  const catalogo = montarCatalogo(dirMonstros, existente);

  fs.writeFileSync(outPath, JSON.stringify(catalogo, null, 2) + '\n', 'utf8');
  console.log(`Catálogo montado com sucesso em: ${outPath}`);
  console.log(`  - Monstros: ${catalogo.monstros.length}`);
  console.log(`  - Holy Avenger: ${catalogo.holy_avenger.length}`);
}
