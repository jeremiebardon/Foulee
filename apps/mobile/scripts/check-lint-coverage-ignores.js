// Proves the coverage-ignore lint rule in eslint.config.js (#17) still bites: the coverage
// threshold in jest.config.js is only honest if no file can opt lines out of it inline.
// Runs as part of `pnpm lint` through `node --test`, outside the app's test runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { ESLint } = require('eslint');

const eslint = new ESLint({ cwd: path.join(__dirname, '..') });
const RULE = 'coverage/no-ignore-comments';

async function ignoreErrors(filePath, code) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === RULE);
}

const fails = async (code, filePath = 'src/features/plans/plan.ts') => {
  const errors = await ignoreErrors(filePath, code);
  assert.equal(errors.length, 1, `${filePath} should fail once: ${code}`);
  assert.equal(errors[0].severity, 2, 'an ignore comment is an error, so lint exits non-zero');
};
const passes = async (code, filePath = 'src/features/plans/plan.ts') =>
  assert.deepEqual(await ignoreErrors(filePath, code), []);

test('istanbul hints (Jest babel coverage) fail lint', async () => {
  await fails('/* istanbul ignore next */\nexport const a = 1;');
  await fails('export const a = 1; // istanbul ignore else');
  await fails('/* istanbul ignore file */\nexport const a = 1;');
  await fails('/*   istanbul \t ignore   if */\nexport const a = 1;');
  await fails('/* istanbul ignore next @preserve */\nexport const a = 1;');
  await fails('/** istanbul ignore next */\nexport const a = 1;');
});

test('V8 coverage hints fail lint', async () => {
  await fails('/* c8 ignore next */\nexport const a = 1;');
  await fails('/* v8 ignore start */\nexport const a = 1;\n');
  await fails('/* node:coverage ignore next */\nexport const a = 1;');
});

test('hints fail in screens, tests and anywhere else in the app', async () => {
  await fails('export const A = () => <>{/* istanbul ignore next */}</>;', 'src/features/plans/PlanPicker.tsx');
  await fails('/* istanbul ignore next */\nexport const a = 1;', 'src/shared/ui/kit.tsx');
  await fails('/* istanbul ignore next */\nexport const a = 1;', 'src/features/plans/plan.test.ts');
});

test('ordinary comments and prose about the rule pass', async () => {
  await passes('// Ignore the next session when it is a rest day.\nexport const a = 1;');
  await passes('// No inline istanbul ignore hints: see jest.config.js.\nexport const a = 1;');
  await passes('/* v8 engine detail */\nexport const a = 1;');
});
