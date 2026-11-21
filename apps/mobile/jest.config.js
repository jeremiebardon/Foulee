/** @type {import('jest').Config} */
module.exports = {
  // jest-expo maps the `@/` alias from tsconfig `paths` and transpiles React Native and Expo packages.
  preset: 'jest-expo',
  // Tests sit next to the code they test.
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.{ts,tsx}'],
  // Write fakes start each test with no recorded calls.
  clearMocks: true,
  collectCoverage: true,
  /*
   * Coverage scope (ADR 0003). Every file under src/ counts, so new code is in scope by default.
   * This list is the only place code leaves it: inline ignore hints fail lint (eslint.config.js).
   * - Repository modules, the database layer and the route files: excluded by ADR 0003.
   *   Repositories and src/db read and write through expo-sqlite, whose native live queries
   *   cannot run under Jest; screen tests mock the repositories instead. Route files in src/app
   *   only re-export screens, which are tested in their features. Maestro flows cover all three.
   * - src/devtools: development-only wiring of Rozenite and Drizzle Studio, required behind
   *   `__DEV__` and absent from every shipped bundle (e2e builds included). It has no logic of
   *   its own; a Jest test could only check that mocked hooks were called.
   * - src/test and *.test.*: test code (fakes, fixtures, helpers), not app code. It runs in
   *   every test that uses it.
   * - *.d.ts: type declarations, nothing runs.
   * Code outside src/ (app.config.ts, metro, babel, eslint configs) is build configuration;
   * its one piece of logic, variant resolution, lives in src/shared/config and is in scope.
   */
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.repository.ts',
    '!src/db/**',
    '!src/app/**',
    '!src/devtools/**',
    '!src/test/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
  ],
  // Below 100% on any metric, `jest` (and so `pnpm test`, `turbo run test` and CI) exits non-zero.
  coverageThreshold: {
    global: { lines: 100, branches: 100, functions: 100, statements: 100 },
  },
};
