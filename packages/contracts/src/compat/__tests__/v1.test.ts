import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import * as contracts from '../../index';
import { toJsonSchemaSnapshot, v1Contract } from '../index';

const snapshotPath = join(__dirname, '..', '..', '..', 'json-schema', 'v1.json');

/** Whether `needle` appears as `haystack` itself or anywhere inside it. */
function contains(haystack: unknown, needle: unknown): boolean {
  if (isDeepStrictEqual(haystack, needle)) return true;
  if (typeof haystack !== 'object' || haystack === null) return false;
  return Object.values(haystack).some((child) => contains(child, needle));
}

describe('v1Contract', () => {
  it('matches the committed json-schema/v1.json, which CI compares against main', () => {
    const committed: unknown = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    if (!isDeepStrictEqual(committed, toJsonSchemaSnapshot(v1Contract))) {
      throw new Error(
        'json-schema/v1.json is out of date: run `pnpm --filter @foulee/contracts export:json-schema` and commit it.',
      );
    }
  });

  it('covers every schema the package exports, on its own or inside another one', () => {
    const snapshot = toJsonSchemaSnapshot(v1Contract);
    const exported = Object.entries(contracts).filter(([, value]) => value instanceof z.ZodType);
    expect(exported.length).toBeGreaterThan(0);
    for (const [name, schema] of exported) {
      const jsonSchema = toJsonSchemaSnapshot({ [name]: schema as z.ZodType })[name];
      expect({ name, covered: contains(snapshot, jsonSchema) }).toEqual({ name, covered: true });
    }
  });
});
