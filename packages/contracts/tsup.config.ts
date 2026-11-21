import { defineConfig } from 'tsup';

// Dual ESM + CJS build with type declarations. Consumers: the BFF (CJS) and the
// Expo app (Metro, ESM-aware).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.js' }),
});
