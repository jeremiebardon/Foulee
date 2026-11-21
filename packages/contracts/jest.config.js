/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  roots: ['<rootDir>/src'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
