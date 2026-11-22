import { z } from 'zod';
import { findBreakingChanges, toJsonSchemaSnapshot, type Direction } from '../index';

type Schemas = Record<string, z.ZodType>;

const travelling = (direction: Direction, schemas: Schemas) =>
  Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, { direction, schema }]));

/** Exports both contracts the way CI does, every schema travelling in `direction`, then compares them. */
function compareIn(direction: Direction, base: Schemas, head: Schemas) {
  return findBreakingChanges(toJsonSchemaSnapshot(travelling(direction, base)), toJsonSchemaSnapshot(travelling(direction, head)));
}

/** What an installed app sends and a newer BFF parses: the BFF must accept all it accepted. */
const compare = (base: Schemas, head: Schemas) => compareIn('request', base, head);

/** What a newer BFF sends and an installed app parses: the app must accept all it is sent. */
const compareResponse = (base: Schemas, head: Schemas) => compareIn('response', base, head);

const activity = z.object({
  id: z.string(),
  distanceMeters: z.number().positive(),
  heartRate: z.number().int().optional(),
});

describe('findBreakingChanges on a request', () => {
  it('finds nothing when the contract is unchanged', () => {
    expect(compare({ activity }, { activity })).toEqual([]);
  });

  it('fails when a field is removed', () => {
    const head = activity.omit({ distanceMeters: true });
    expect(compare({ activity }, { activity: head })).toEqual([
      { path: 'activity.distanceMeters', message: 'field removed' },
    ]);
  });

  it('fails when a field is renamed, reporting the old name as removed', () => {
    const head = activity.omit({ distanceMeters: true }).extend({ distance: z.number().positive() });
    expect(compare({ activity }, { activity: head })).toContainEqual({
      path: 'activity.distanceMeters',
      message: 'field removed',
    });
  });

  it('fails when an optional field becomes required', () => {
    const head = activity.extend({ heartRate: z.number().int() });
    expect(compare({ activity }, { activity: head })).toEqual([
      { path: 'activity.heartRate', message: 'field became required' },
    ]);
  });

  it('fails when a required field is added', () => {
    const head = activity.extend({ cadence: z.number() });
    expect(compare({ activity }, { activity: head })).toEqual([
      { path: 'activity.cadence', message: 'field became required' },
    ]);
  });

  it('passes when an optional field is added', () => {
    const head = activity.extend({ cadence: z.number().optional() });
    expect(compare({ activity }, { activity: head })).toEqual([]);
  });

  it('passes when a new endpoint is added', () => {
    expect(compare({ activity }, { activity, other: z.object({ id: z.string() }) })).toEqual([]);
  });

  describe('enums', () => {
    const code = z.enum(['unauthorized', 'not_found', 'garmin_access_expired']);

    it('fails when a value is removed', () => {
      expect(compare({ code }, { code: code.exclude(['not_found']) })).toEqual([
        { path: 'code', message: 'enum value "not_found" removed' },
      ]);
    });

    it('passes when a value is added', () => {
      expect(compare({ code }, { code: z.enum([...code.options, 'teapot']) })).toEqual([]);
    });

    it('fails when a free string becomes an enum', () => {
      expect(compare({ code: z.string() }, { code })).toEqual([
        { path: 'code', message: 'restricted to the values "unauthorized", "not_found", "garmin_access_expired"' },
      ]);
    });

    it('fails when a literal changes', () => {
      expect(compare({ kind: z.literal('running') }, { kind: z.literal('trail_running') })).toEqual([
        { path: 'kind', message: 'enum value "running" removed' },
      ]);
    });

    it('finds a narrowed enum deep inside objects and arrays', () => {
      const page = (kind: z.ZodType) => z.object({ activities: z.array(z.object({ kind })) });
      expect(
        compare({ page: page(z.enum(['running', 'trail_running'])) }, { page: page(z.enum(['running'])) }),
      ).toEqual([{ path: 'page.activities[].kind', message: 'enum value "trail_running" removed' }]);
    });
  });

  describe('types', () => {
    it('fails when the type changes', () => {
      expect(compare({ id: z.string() }, { id: z.number() })).toEqual([
        { path: 'id', message: 'type "string" no longer accepted' },
      ]);
    });

    it('fails when a number is narrowed to an integer', () => {
      expect(compare({ n: z.number() }, { n: z.int() })).toEqual([
        { path: 'n', message: 'type "number" no longer accepted' },
      ]);
    });

    it('passes when an integer is widened to a number', () => {
      expect(compare({ n: z.int() }, { n: z.number().max(Number.MAX_SAFE_INTEGER) })).toEqual([]);
    });

    it('fails when a field is no longer nullable', () => {
      expect(compare({ cursor: z.string().nullable() }, { cursor: z.string() })).toEqual([
        { path: 'cursor', message: 'type "null" no longer accepted' },
      ]);
    });

    it('passes when a field becomes nullable', () => {
      expect(compare({ cursor: z.string() }, { cursor: z.string().nullable() })).toEqual([]);
    });

    it('fails when the non-null side of a nullable field changes type', () => {
      expect(compare({ n: z.number().nullable() }, { n: z.string().nullable() })).toEqual([
        { path: 'n', message: 'type "number" no longer accepted' },
      ]);
    });

    it('fails when a nullable cursor stops being nullable', () => {
      expect(compare({ nextCursor: z.iso.datetime().nullable() }, { nextCursor: z.iso.datetime() })).toEqual([
        { path: 'nextCursor', message: 'type "null" no longer accepted' },
      ]);
    });

    it('looks inside a nullable object', () => {
      const base = z.object({ id: z.string(), name: z.string() }).nullable();
      const head = z.object({ id: z.string() }).nullable();
      expect(compare({ owner: base }, { owner: head })).toEqual([
        { path: 'owner.name', message: 'field removed' },
      ]);
    });

    it('passes when a typed value becomes unknown', () => {
      expect(compare({ meta: z.string() }, { meta: z.unknown() })).toEqual([]);
    });

    it('fails when an untyped value gets a type', () => {
      expect(compare({ meta: z.unknown() }, { meta: z.string() })).toEqual([
        { path: 'meta', message: 'restricted to the type "string"' },
      ]);
    });
  });

  describe('constraints', () => {
    it.each([
      ['a positive number now at least 1', z.number().positive(), z.number().min(1), 'lower bound raised to >= 1 (was > 0)'],
      ['a non-negative number now positive', z.number().nonnegative(), z.number().positive(), 'lower bound raised to > 0 (was >= 0)'],
      ['an unbounded number now positive', z.number(), z.number().positive(), 'lower bound raised to > 0 (was none)'],
      ['a maximum lowered', z.number().max(300), z.number().lt(300), 'upper bound lowered to < 300 (was <= 300)'],
      ['a lower maximum', z.number().max(10), z.number().max(5), 'upper bound lowered to <= 5 (was <= 10)'],
      ['a different format', z.email(), z.uuid(), 'format changed to "uuid" (was "email")'],
      ['an unbounded number now capped', z.number(), z.number().max(10), 'upper bound lowered to <= 10 (was none)'],
      ['a longer minimum length', z.string().min(1), z.string().min(2), 'minLength raised to 2 (was 1)'],
      ['a new maximum length', z.string(), z.string().max(64), 'maxLength lowered to 64 (was none)'],
      ['a non-empty array', z.array(z.string()), z.array(z.string()).nonempty(), 'minItems raised to 1 (was none)'],
      ['a new pattern', z.string(), z.string().regex(/^\d+$/), 'pattern changed'],
      ['a new format', z.string(), z.uuid(), 'format changed to "uuid" (was none)'],
      ['a new multipleOf', z.number(), z.number().multipleOf(5), 'multipleOf changed to 5 (was none)'],
    ])('fails on %s', (_, base, head, message) => {
      expect(compare({ value: base }, { value: head })).toContainEqual({ path: 'value', message });
    });

    it('reads the tighter of an inclusive and an exclusive bound set together', () => {
      // zod never sets both, but JSON Schema allows it: `minimum: 5` wins over `exclusiveMinimum: 0`.
      const entry = (schema: Record<string, unknown>) => ({ value: { direction: 'request' as const, schema } });
      const both = entry({ type: 'number', minimum: 5, exclusiveMinimum: 0 });
      expect(findBreakingChanges(entry({ type: 'number', minimum: 5 }), both)).toEqual([]);
      expect(findBreakingChanges(entry({ type: 'number', exclusiveMinimum: 0 }), both)).toEqual([
        { path: 'value', message: 'lower bound raised to >= 5 (was > 0)' },
      ]);
    });

    it('fails when a datetime no longer accepts a timezone offset', () => {
      expect(compare({ at: z.iso.datetime({ offset: true }) }, { at: z.iso.datetime() })).toEqual([
        { path: 'at', message: 'pattern changed' },
      ]);
    });

    it.each([
      ['a minimum lowered', z.number().min(1), z.number().nonnegative()],
      ['a positive number now non-negative', z.number().positive(), z.number().nonnegative()],
      ['a maximum removed', z.number().max(10), z.number()],
      ['a higher maximum', z.number().max(10), z.number().max(20)],
      ['a maximum raised', z.string().max(10), z.string().max(20)],
      ['a minimum length removed', z.string().min(1), z.string()],
      ['a format removed', z.uuid(), z.string()],
    ])('passes on %s', (_, base, head) => {
      expect(compare({ value: base }, { value: head })).toEqual([]);
    });
  });

  describe('keywords the check does not model', () => {
    it('fails when one of them changes, rather than letting the change through unchecked', () => {
      const base = z.record(z.string(), z.number());
      const head = z.record(z.string(), z.string());
      expect(compare({ splits: base }, { splits: head })).toEqual([
        { path: 'splits', message: '"additionalProperties" changed and cannot be checked automatically' },
      ]);
    });

    it('passes when they are unchanged', () => {
      const splits = z.record(z.string(), z.number());
      expect(compare({ splits }, { splits })).toEqual([]);
    });

    it('ignores annotations such as descriptions', () => {
      expect(compare({ id: z.string() }, { id: z.string().describe('Garmin activity id') })).toEqual([]);
    });
  });

  it('fails when an endpoint is removed', () => {
    expect(compare({ activity, other: z.string() }, { activity })).toEqual([
      { path: 'other', message: 'schema removed' },
    ]);
  });
});

describe('findBreakingChanges on a response', () => {
  it('finds nothing when the contract is unchanged', () => {
    expect(compareResponse({ activity }, { activity })).toEqual([]);
  });

  it('passes when an optional field is added, which the app strips as an unknown key', () => {
    const head = activity.extend({ cadence: z.number().optional() });
    expect(compareResponse({ activity }, { activity: head })).toEqual([]);
  });

  it('passes when a required field is added, which the app strips as an unknown key', () => {
    const head = activity.extend({ cadence: z.number() });
    expect(compareResponse({ activity }, { activity: head })).toEqual([]);
  });

  it('fails when a field is added to a strict object, which the app rejects', () => {
    const base = z.strictObject({ id: z.string() });
    expect(compareResponse({ activity: base }, { activity: base.extend({ name: z.string().optional() }) })).toEqual([
      { path: 'activity.name', message: 'field added to an object that rejects unknown keys' },
    ]);
  });

  it('fails when a field is removed', () => {
    const head = activity.omit({ distanceMeters: true });
    expect(compareResponse({ activity }, { activity: head })).toEqual([
      { path: 'activity.distanceMeters', message: 'field removed' },
    ]);
  });

  it('fails when a field is renamed, reporting the old name as removed', () => {
    const head = activity.omit({ distanceMeters: true }).extend({ distance: z.number().positive() });
    expect(compareResponse({ activity }, { activity: head })).toEqual([
      { path: 'activity.distanceMeters', message: 'field removed' },
    ]);
  });

  it('fails when a required field becomes optional', () => {
    const head = activity.extend({ id: z.string().optional() });
    expect(compareResponse({ activity }, { activity: head })).toEqual([
      { path: 'activity.id', message: 'field became optional' },
    ]);
  });

  it('passes when an optional field becomes required', () => {
    const head = activity.extend({ heartRate: z.number().int() });
    expect(compareResponse({ activity }, { activity: head })).toEqual([]);
  });

  it('fails when a field becomes nullable', () => {
    expect(compareResponse({ cursor: z.string() }, { cursor: z.string().nullable() })).toEqual([
      { path: 'cursor', message: 'type "null" added' },
    ]);
  });

  it('passes when a field is no longer nullable', () => {
    expect(compareResponse({ cursor: z.string().nullable() }, { cursor: z.string() })).toEqual([]);
  });

  it('fails when an enum value is added', () => {
    const code = z.enum(['unauthorized', 'not_found']);
    expect(compareResponse({ code }, { code: z.enum([...code.options, 'teapot']) })).toEqual([
      { path: 'code', message: 'enum value "teapot" added' },
    ]);
  });

  it('passes when an enum value is removed', () => {
    const code = z.enum(['unauthorized', 'not_found']);
    expect(compareResponse({ code }, { code: code.exclude(['not_found']) })).toEqual([]);
  });

  it('fails when an enum becomes a free string', () => {
    expect(compareResponse({ code: z.enum(['a', 'b']) }, { code: z.string() })).toEqual([
      { path: 'code', message: 'no longer restricted to the values "a", "b"' },
    ]);
  });

  it('fails when an integer is widened to a number', () => {
    expect(compareResponse({ n: z.int() }, { n: z.number().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER) })).toEqual([
      { path: 'n', message: 'type "number" added' },
    ]);
  });

  it('fails when a type is widened to a union', () => {
    expect(compareResponse({ id: z.string() }, { id: z.union([z.string(), z.number()]) })).toEqual([
      { path: 'id', message: 'type "number" added' },
    ]);
  });

  it('fails when a typed value becomes unknown', () => {
    expect(compareResponse({ meta: z.string() }, { meta: z.unknown() })).toEqual([
      { path: 'meta', message: 'no longer restricted to the type "string"' },
    ]);
  });

  it('finds a widened enum deep inside objects and arrays', () => {
    const page = (kind: z.ZodType) => z.object({ activities: z.array(z.object({ kind })) });
    expect(
      compareResponse({ page: page(z.enum(['running'])) }, { page: page(z.enum(['running', 'trail_running'])) }),
    ).toEqual([{ path: 'page.activities[].kind', message: 'enum value "trail_running" added' }]);
  });

  it.each([
    ['a positive number now non-negative', z.number().positive(), z.number().nonnegative(), 'lower bound lowered to >= 0 (was > 0)'],
    ['a maximum removed', z.number().max(10), z.number(), 'upper bound removed (was <= 10)'],
    ['a higher maximum', z.number().max(10), z.number().max(20), 'upper bound raised to <= 20 (was <= 10)'],
    ['a minimum length removed', z.string().min(1), z.string(), 'minLength removed (was 1)'],
    ['a longer maximum length', z.string().max(10), z.string().max(20), 'maxLength raised to 20 (was 10)'],
    ['a format removed', z.uuid(), z.string(), 'format changed to none (was "uuid")'],
    ['a changed pattern', z.string().regex(/^\d+$/), z.string().regex(/^\w+$/), 'pattern changed'],
  ])('fails on %s', (_, base, head, message) => {
    expect(compareResponse({ value: base }, { value: head })).toContainEqual({ path: 'value', message });
  });

  it.each([
    ['a raised minimum', z.number().nonnegative(), z.number().positive()],
    ['a new maximum', z.number(), z.number().max(10)],
    ['a new format', z.string(), z.uuid()],
  ])('passes on %s', (_, base, head) => {
    expect(compareResponse({ value: base }, { value: head })).toEqual([]);
  });

  it('fails when an endpoint is removed', () => {
    expect(compareResponse({ activity, other: z.string() }, { activity })).toEqual([
      { path: 'other', message: 'schema removed' },
    ]);
  });
});

describe('findBreakingChanges across directions', () => {
  it('fails when a schema changes direction, which would change the rule it is checked against', () => {
    const before = toJsonSchemaSnapshot({ body: { direction: 'response', schema: z.string() } });
    const after = toJsonSchemaSnapshot({ body: { direction: 'request', schema: z.string() } });
    expect(findBreakingChanges(before, after)).toEqual([
      { path: 'body', message: 'direction changed to request (was response)' },
    ]);
  });
});
