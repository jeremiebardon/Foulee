/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '\\.(test|spec)\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/test-support/**'],
  // The hexagon's inside is fully covered; the Garmin adapter and the HTTP layer are
  // tested at their own seams (see ADR 0003 and the spec's Testing Decisions).
  coverageThreshold: {
    './src/domain/': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './src/application/': { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
