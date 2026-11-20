const { defineConfig } = require('eslint/config');
const expoConfig = require('@foulee/eslint-config/expo');

module.exports = defineConfig([expoConfig, { ignores: ['src/db/migrations/*'] }]);
