// Copia o HTML standalone gerado para a raiz com um nome amigável
import { copyFileSync, statSync } from 'node:fs';
copyFileSync('dist/index.html', 'Tumbalacatumba.html');
const kb = (statSync('Tumbalacatumba.html').size / 1024).toFixed(0);
console.log(`\n✔ Tumbalacatumba.html gerado (${kb} KB) — abra direto no navegador.`);
