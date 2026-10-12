import { defineConfig } from 'vite';
export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'assets',
  build: { outDir: 'dist', assetsInlineLimit: 0, rollupOptions: { input: {game:'index.html',art:'art-preview.html'} } },
});
