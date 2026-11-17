import { defineConfig } from 'vitest/config';

// Tests de l'API SANS port et SANS base de donnees (Session 22) : on importe app.js.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    env: {
      JWT_SECRET: 'test-secret-only-for-unit-tests',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});
