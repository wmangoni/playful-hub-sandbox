import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build gera um único dist/index.html com JS, CSS e fontes embutidos (roda via file://)
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 10_000,
    reportCompressedSize: false,
  },
  server: { host: '127.0.0.1', port: 5178, strictPort: true },
  preview: { host: '127.0.0.1', port: 5179, strictPort: true },
});
