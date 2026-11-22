// Shared ESLint flat config for Expo apps in this monorepo.
const expoConfig = require('eslint-config-expo/flat');
const testLocation = require('./test-location');

module.exports = [...expoConfig, { ignores: ['dist/*', '.expo/*', 'coverage/*'] }, testLocation];
