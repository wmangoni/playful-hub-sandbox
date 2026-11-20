import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const DEV_INDEX_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='28' fill='%23f97316' stroke='%23fef08a' stroke-width='4'/%3E%3Ccircle cx='32' cy='32' r='16' fill='%23eab308'/%3E%3Cpath d='M20 20c8 8 8 16 0 24M44 20c-8 8-8 16 0 24' stroke='%23ffffff' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Beach Tennis Card Game (UBT) — PlayfulHub</title>
  </head>
  <body class="bg-slate-900 text-slate-100 min-h-screen select-none">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

async function run() {
  process.chdir(rootDir);

  // 1. Write source index.html so Vite can transform it cleanly
  fs.writeFileSync(path.join(rootDir, 'index.html'), DEV_INDEX_HTML, 'utf8');

  // 2. Typecheck
  const tscBin = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tscBin, '--noEmit'], { stdio: 'inherit', cwd: rootDir });

  // 3. Build client bundle via Vite with /beach_tennis/ base path
  await viteBuild({
    root: rootDir,
    base: '/beach_tennis/',
  });

  // 4. Copy dist/index.html -> index.html and dist/assets -> assets/
  const distDir = path.join(rootDir, 'dist');
  const assetsDir = path.join(rootDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const entry of fs.readdirSync(assetsDir)) {
      if (entry.startsWith('index-')) {
        fs.rmSync(path.join(assetsDir, entry), { force: true });
      }
    }
  }
  fs.cpSync(path.join(distDir, 'assets'), assetsDir, { recursive: true, force: true });
  fs.copyFileSync(path.join(distDir, 'index.html'), path.join(rootDir, 'index.html'));

  // 5. Build CommonJS server engine bundle -> server/engine.cjs
  const serverDir = path.join(rootDir, 'server');
  fs.mkdirSync(serverDir, { recursive: true });
  await esbuild({
    entryPoints: [path.join(rootDir, 'src', 'engine', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: path.join(serverDir, 'engine.cjs'),
  });

  console.log('✓ Build completo: cliente (/beach_tennis/) + motor CommonJS (server/engine.cjs)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
