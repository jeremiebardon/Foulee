// Test files live in a __tests__ folder next to the code they test (AGENTS.md, ADR 0003).
// End-to-end flows are YAML (apps/mobile/.maestro) and are not linted.
module.exports = {
  files: ['**/*.test.*', '**/*.spec.*'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: 'Program', message: 'Move this test into a __tests__ folder next to the code it tests.' },
    ],
  },
};
