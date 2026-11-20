// Shared ESLint flat config for Expo apps in this monorepo.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [...expoConfig, { ignores: ['dist/*', '.expo/*'] }];
