import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Config de test : Session 22 (Vitest + jsdom + Testing Library)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true, // nettoyage automatique entre les tests
    setupFiles: './src/setupTests.js',
  },
});
