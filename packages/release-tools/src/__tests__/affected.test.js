const assert = require('node:assert/strict');
const { test } = require('node:test');
const { affectedOutputs } = require('../affected');

const turboLs = (...names) => JSON.stringify({ packages: { count: names.length, items: names.map((name) => ({ name, path: `x/${name}` })) } });

test('says, for each output, whether turbo lists its package as affected', () => {
  assert.deepEqual(affectedOutputs(turboLs('mobile', 'bff'), { mobile: 'mobile', contracts: '@foulee/contracts' }), [
    'mobile=true',
    'contracts=false',
  ]);
});

test('reads the list past whatever pnpm or turbo printed before it', () => {
  const noisy = `• turbo 2.11.13\n  WARNING  no caches are enabled\n${turboLs('bff')}`;
  assert.deepEqual(affectedOutputs(noisy, { bff: 'bff' }), ['bff=true']);
});

test('fails loudly when turbo printed no list, rather than report nothing affected', () => {
  assert.throws(() => affectedOutputs('turbo: command not found', { bff: 'bff' }), /no package list/);
});
