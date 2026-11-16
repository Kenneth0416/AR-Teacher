import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `base: './'` keeps every URL relative so the build works on GitHub Pages under /<repo>/.
// `npm run dev:https` (vite --mode https) serves a self-signed HTTPS dev server so a phone on the
// same Wi-Fi can open the camera (getUserMedia requires a secure context).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'https' ? [basicSsl()] : [],
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        compile: resolve(import.meta.dirname, 'compile.html'),
      },
    },
  },
}));
