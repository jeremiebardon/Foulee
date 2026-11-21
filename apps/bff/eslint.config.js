const { defineConfig } = require('eslint/config');
const nodeConfig = require('@foulee/eslint-config/node');

const outerLayers = [
  { group: ['**/infrastructure', '**/infrastructure/**'], message: 'The inside of the hexagon must not depend on infrastructure.' },
  { group: ['**/interface', '**/interface/**'], message: 'The inside of the hexagon must not depend on the HTTP interface.' },
];
const noFramework = {
  group: ['@nestjs/*', 'express', 'express/**'],
  message: 'domain/ and application/ are plain TypeScript: no NestJS or web framework.',
};

// Hexagonal boundaries (spec #1): domain and application never reach outward, and
// domain never reaches into application.
module.exports = defineConfig([
  nodeConfig,
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noFramework,
            ...outerLayers,
            { group: ['**/application', '**/application/**'], message: 'domain/ must not depend on application/.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noFramework, ...outerLayers] }],
    },
  },
]);
