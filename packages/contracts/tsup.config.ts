import { defineConfig } from 'tsup';

// Dual ESM + CJS build with type declarations. Consumers: the BFF (CJS) and the
// Expo app (Metro, ESM-aware). `compat` is CI tooling for the bin/ scripts, not part of the
// package's exports.
export default defineConfig({
  entry: { index: 'src/index.ts', compat: 'src/compat/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  // Keep index self-contained, as before compat existed: no chunk shared with compat.
  splitting: false,
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.js' }),
});
