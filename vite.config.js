import { defineConfig } from 'vite';
export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'assets',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
