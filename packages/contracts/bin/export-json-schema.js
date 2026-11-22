#!/usr/bin/env node
// Writes the v1 contract as JSON Schema to json-schema/v1.json. Run it through
// `pnpm --filter @foulee/contracts export:json-schema`, which builds dist/ first, and commit the
// result: CI compares the current schemas with the copy on main (bin/check-compat.js).
const { writeFileSync, mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { toJsonSchemaSnapshot, v1Contract } = require('../dist/compat.js');

const target = join(__dirname, '..', 'json-schema', 'v1.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(toJsonSchemaSnapshot(v1Contract), null, 2)}\n`);
console.log(`Wrote ${target}`);
