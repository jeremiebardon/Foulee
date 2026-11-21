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
  // Feature and shared code only (ADR 0003). Repositories read through expo-sqlite's native
  // live queries and cannot run under Jest: screen tests mock them, Maestro flows exercise them.
  collectCoverageFrom: ['src/{features,shared}/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}', '!**/*.repository.ts'],
};
