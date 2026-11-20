import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Only pure domain code is unit-tested: no React Native in these files.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
});
