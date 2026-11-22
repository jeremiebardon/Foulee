/** @type {import('jest').Config} */
module.exports = {
  // jest-expo maps the `@/` alias from tsconfig `paths` and transpiles React Native and Expo packages.
  preset: 'jest-expo',
  // Tests live in a __tests__ folder next to the code they test (AGENTS.md); lint fails any other place.
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  // Write fakes start each test with no recorded calls.
  clearMocks: true,
  collectCoverage: true,
  /*
   * Coverage scope (ADR 0003). Every file under src/ counts, so new code is in scope by default.
   * This list is the only place code leaves it: inline ignore hints fail lint (eslint.config.js).
   * - Repository modules (a feature's data/*.repository.ts), the database layer and the route files:
   *   excluded by ADR 0003. Repositories and src/db read and write through expo-sqlite, whose native live queries
   *   cannot run under Jest; screen tests mock the repositories instead. Route files in src/app
   *   only compose (re-export a screen, forward a call, wire navigators); any decision of their
   *   own belongs in a covered module (ADR 0003 addendum).
   *   Maestro flows cover all three.
   * - src/devtools (ADR 0003 addendum): development-only wiring of Rozenite and Drizzle Studio,
   *   required behind `__DEV__` and absent from every shipped bundle (e2e builds included), so no
   *   Maestro flow reaches it either. It has no logic of its own; a Jest test could only check
   *   that mocked hooks were called.
   * - src/test and __tests__ folders (ADR 0003 addendum): test code (fakes, fixtures, helpers), not app
   *   code. It runs in every test that uses it.
   * - *.d.ts: type declarations, nothing runs.
   * Code outside src/ (app.config.ts, metro, babel, eslint configs) is build configuration;
   * its logic (variant resolution, the e2e build guard) lives in src/shared/config and is in scope.
   * The node --test self-tests in __tests__/ (next to eslint.config.js and app.config.ts) run in `pnpm lint` (ADR 0003 addendum).
   */
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/features/*/data/*.repository.ts',
    '!src/db/**',
    '!src/app/**',
    '!src/devtools/**',
    '!src/test/**',
    '!**/__tests__/**',
    '!**/*.d.ts',
  ],
  // Below 100% on any metric, `jest` (and so `pnpm test`, `turbo run test` and CI) exits non-zero.
  coverageThreshold: {
    global: { lines: 100, branches: 100, functions: 100, statements: 100 },
  },
};
