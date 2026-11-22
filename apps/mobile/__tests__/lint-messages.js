// Shared by the lint self-tests (__tests__/lint-*.test.js): lints `code` as if it sat at `filePath`
// with the app's real ESLint config, and returns the messages of one rule.
const path = require('node:path');
const { ESLint } = require('eslint');

const eslint = new ESLint({ cwd: path.join(__dirname, '..') });

async function lintMessages(ruleId, filePath, code) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === ruleId);
}

module.exports = { lintMessages };
