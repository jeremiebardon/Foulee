import { z } from 'zod';
import { findBreakingChanges, toJsonSchemaSnapshot } from '../index';

/** Exports both contracts the way CI does, then compares them. */
function compare(base: Record<string, z.ZodType>, head: Record<string, z.ZodType>) {
  return findBreakingChanges(toJsonSchemaSnapshot(base), toJsonSchemaSnapshot(head));
}

const activity = z.object({
  id: z.string(),
  distanceMeters: z.number().positive(),
  heartRate: z.number().int().optional(),
});

describe('findBreakingChanges', () => {
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
