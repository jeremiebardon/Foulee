import type { Direction, JsonSchema, JsonSchemaSnapshot } from './json-schema';

/** A change that would make an app build already installed stop working against the new contract. */
export type BreakingChange = { path: string; message: string };

/** Compares the contract on `main` (`base`) with the proposed one (`head`). */
export function findBreakingChanges(base: JsonSchemaSnapshot, head: JsonSchemaSnapshot): BreakingChange[] {
  return Object.entries(base).flatMap(([name, before]) => {
    const after = head[name];
    if (after === undefined) return [{ path: name, message: 'schema removed' }];
    if (after.direction !== before.direction) {
      return [{ path: name, message: `direction changed to ${after.direction} (was ${before.direction})` }];
    }
    const rules = directions[after.direction];
    return compareSchemas(name, rules.pair(before.schema, after.schema), rules);
  });
}

/**
 * One comparison, seen two ways: `base` and `head` are the schema on `main` and the proposed one;
 * `sent` and `accepted` are what the sending side may produce and what the receiving side parses.
 * A change breaks when `accepted` rejects something `sent` allows.
 */
type Pair = { base: JsonSchema; head: JsonSchema; sent: JsonSchema; accepted: JsonSchema };

/** Who sends what in each direction, and how a mismatch reads as a change from `base` to `head`. */
type Rules = {
  pair(base: JsonSchema, head: JsonSchema): Pair;
  /** A `sent` schema, matched to an `accepted` one, back into a pair. */
  match(sent: JsonSchema, accepted: JsonSchema): Pair;
  typeRejected(type: string): string;
  typeRestricted(types: string): string;
  valueRejected(value: string): string;
  valuesRestricted(values: string): string;
  /** A field the receiver requires and the sender no longer has to send. */
  requiredByReceiverOnly: string;
};

const directions: Record<Direction, Rules> = {
  // The installed app (base) sends, the newer BFF (head) parses: head may only accept more.
  request: {
    pair: (base, head) => ({ base, head, sent: base, accepted: head }),
    match: (sent, accepted) => ({ base: sent, head: accepted, sent, accepted }),
    typeRejected: (type) => `type "${type}" no longer accepted`,
    typeRestricted: (types) => `restricted to the type ${types}`,
    valueRejected: (value) => `enum value ${value} removed`,
    valuesRestricted: (values) => `restricted to the values ${values}`,
    requiredByReceiverOnly: 'field became required',
  },
  // The newer BFF (head) sends, the installed app (base) parses: head may only send less.
  response: {
    pair: (base, head) => ({ base, head, sent: head, accepted: base }),
    match: (sent, accepted) => ({ base: accepted, head: sent, sent, accepted }),
    typeRejected: (type) => `type "${type}" added`,
    typeRestricted: (types) => `no longer restricted to the type ${types}`,
    valueRejected: (value) => `enum value ${value} added`,
    valuesRestricted: (values) => `no longer restricted to the values ${values}`,
    requiredByReceiverOnly: 'field became optional',
  },
};

/**
 * A union (`anyOf`, which is how zod exports `.nullable()` and `.or()`) is read as its branches.
 * Each branch that may be sent must be accepted by some branch on the receiving side; when none
 * accepts it as is, the closest one explains why.
 */
function compareSchemas(path: string, { sent, accepted }: Pair, rules: Rules): BreakingChange[] {
  const acceptedBranches = branches(accepted);
  return branches(sent).flatMap((sentBranch) =>
    acceptedBranches
      .map((acceptedBranch) => compareBranches(path, rules.match(sentBranch, acceptedBranch), rules))
      .reduce((closest, changes) => (changes.length < closest.length ? changes : closest)),
  );
}

function branches(schema: JsonSchema): JsonSchema[] {
  const union = (schema.anyOf ?? schema.oneOf) as JsonSchema[] | undefined;
  return union === undefined ? [schema] : union.flatMap(branches);
}

function compareBranches(path: string, pair: Pair, rules: Rules): BreakingChange[] {
  const typeChanges = compareTypes(path, pair, rules);
  if (typeChanges.length > 0) return typeChanges;
  return [
    ...compareAllowedValues(path, pair, rules),
    ...compareBounds(path, pair),
    ...compareExactKeywords(path, pair),
    ...compareUnmodelledKeywords(path, pair),
    ...compareProperties(path, pair, rules),
    ...compareItems(path, pair, rules),
  ];
}

const quoted = (values: unknown[]) => values.map((value) => JSON.stringify(value)).join(', ');

function types(schema: JsonSchema): string[] | undefined {
  if (schema.type === undefined) return undefined;
  return Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
}

function compareTypes(path: string, { sent, accepted }: Pair, rules: Rules): BreakingChange[] {
  const acceptedTypes = types(accepted);
  if (acceptedTypes === undefined) return [];
  const sentTypes = types(sent);
  if (sentTypes === undefined) return [{ path, message: rules.typeRestricted(quoted(acceptedTypes)) }];
  const accepts = (type: string) =>
    acceptedTypes.includes(type) || (type === 'integer' && acceptedTypes.includes('number'));
  return sentTypes.filter((type) => !accepts(type)).map((type) => ({ path, message: rules.typeRejected(type) }));
}

/** `enum` and `const` (a zod literal) both restrict a value to a fixed list. */
function allowedValues(schema: JsonSchema): unknown[] | undefined {
  if ('const' in schema) return [schema.const];
  return schema.enum as unknown[] | undefined;
}

function compareAllowedValues(path: string, { sent, accepted }: Pair, rules: Rules): BreakingChange[] {
  const acceptedValues = allowedValues(accepted);
  if (acceptedValues === undefined) return [];
  const sentValues = allowedValues(sent);
  if (sentValues === undefined) return [{ path, message: rules.valuesRestricted(quoted(acceptedValues)) }];
  return sentValues
    .filter((value) => !acceptedValues.includes(value))
    .map((value) => ({ path, message: rules.valueRejected(JSON.stringify(value)) }));
}

/**
 * A family of keywords bounding a value from one side. `sign` is +1 for a lower bound (a higher
 * one lets fewer values through) and -1 for an upper bound. Lengths and counts are inclusive
 * bounds with no exclusive variant.
 */
type BoundFamily = { label: string; sign: 1 | -1; inclusive: string; exclusive?: string; operator?: '>' | '<' };
type Bound = { value: number; exclusive: boolean };

const boundFamilies: BoundFamily[] = [
  { label: 'lower bound', sign: 1, inclusive: 'minimum', exclusive: 'exclusiveMinimum', operator: '>' },
  { label: 'upper bound', sign: -1, inclusive: 'maximum', exclusive: 'exclusiveMaximum', operator: '<' },
  ...['Length', 'Items', 'Properties'].flatMap((counted): BoundFamily[] => [
    { label: `min${counted}`, sign: 1, inclusive: `min${counted}` },
    { label: `max${counted}`, sign: -1, inclusive: `max${counted}` },
  ]),
];
const boundKeywords = boundFamilies.flatMap((family) => [family.inclusive, family.exclusive ?? []].flat());

/**
 * Where a bound sits on the number line, for ordering: an exclusive bound sits just inside its
 * value, and a missing bound at the far end, letting everything through.
 */
function position(bound: Bound | undefined, family: BoundFamily): [number, number] {
  if (bound === undefined) return [-family.sign * Infinity, 0];
  return [bound.value, bound.exclusive ? family.sign : 0];
}

/** Positive when `a` sits higher than `b`. */
function order(a: Bound | undefined, b: Bound | undefined, family: BoundFamily): number {
  const [pa, pb] = [position(a, family), position(b, family)];
  return (pa[0] === pb[0] ? 0 : pa[0] - pb[0]) || pa[1] - pb[1];
}

/** Whether `a` lets fewer values through than `b`. */
const isTighter = (a: Bound | undefined, b: Bound | undefined, family: BoundFamily) => family.sign * order(a, b, family) > 0;

/** The tightest bound of the family a schema sets, if any. */
function bound(schema: JsonSchema, family: BoundFamily): Bound | undefined {
  const candidates = [
    { keyword: family.inclusive, exclusive: false },
    { keyword: family.exclusive, exclusive: true },
  ].flatMap(({ keyword, exclusive }) => {
    const value = keyword === undefined ? undefined : schema[keyword];
    return typeof value === 'number' ? [{ value, exclusive }] : [];
  });
  return candidates.reduce<Bound | undefined>((tightest, candidate) => (isTighter(candidate, tightest, family) ? candidate : tightest), undefined);
}

function describeBound(bound: Bound | undefined, family: BoundFamily): string {
  if (bound === undefined) return 'none';
  if (family.operator === undefined) return `${bound.value}`;
  return `${family.operator}${bound.exclusive ? '' : '='} ${bound.value}`;
}

/** A receiving side whose bound is tighter than the sending side's rejects values it is sent. */
function compareBounds(path: string, { base, head, sent, accepted }: Pair): BreakingChange[] {
  return boundFamilies.flatMap((family) => {
    if (!isTighter(bound(accepted, family), bound(sent, family), family)) return [];
    const [before, after] = [bound(base, family), bound(head, family)];
    const was = `(was ${describeBound(before, family)})`;
    if (after === undefined) return [{ path, message: `${family.label} removed ${was}` }];
    const verb = order(after, before, family) > 0 ? 'raised' : 'lowered';
    return [{ path, message: `${family.label} ${verb} to ${describeBound(after, family)} ${was}` }];
  });
}

/**
 * Keywords whose change cannot be proven harmless, so a receiving side that sets one the sending
 * side does not match fails. A changed pattern may accept less (it does when a datetime stops
 * accepting an offset), and two regular expressions cannot be compared.
 */
function compareExactKeywords(path: string, { base, head, sent, accepted }: Pair): BreakingChange[] {
  const describe = (value: unknown) => (value === undefined ? 'none' : JSON.stringify(value));
  return (['pattern', 'format', 'multipleOf'] as const)
    .filter((keyword) => accepted[keyword] !== undefined && accepted[keyword] !== sent[keyword])
    .map((keyword) => ({
      path,
      message: keyword === 'pattern' ? 'pattern changed' : `${keyword} changed to ${describe(head[keyword])} (was ${describe(base[keyword])})`,
    }));
}

/** Keywords this check understands (`anyOf`/`oneOf` are split into branches before reaching here). */
const modelledKeywords = new Set<string>([
  'type', 'enum', 'const', 'properties', 'required', 'items', ...boundKeywords, 'pattern', 'format', 'multipleOf',
]);

/** Annotations: they document a schema without changing what it accepts. */
const annotationKeywords = new Set<string>([
  '$schema', '$comment', 'title', 'description', 'default', 'examples', 'deprecated', 'readOnly', 'writeOnly',
]);

/** Any other keyword (`additionalProperties`, `allOf`, `$ref`…) fails closed when it changes. */
function compareUnmodelledKeywords(path: string, { base, head }: Pair): BreakingChange[] {
  const keywords = new Set([...Object.keys(base), ...Object.keys(head)]);
  return [...keywords]
    .filter((keyword) => !modelledKeywords.has(keyword) && !annotationKeywords.has(keyword))
    .filter((keyword) => JSON.stringify(base[keyword]) !== JSON.stringify(head[keyword]))
    .map((keyword) => ({ path, message: `"${keyword}" changed and cannot be checked automatically` }));
}

/**
 * A field removed fails either way. A field only the head has is fine: for a request, the BFF
 * does not require it; for a response, the app strips it as an unknown key (zod's `z.object`),
 * unless its object rejects unknown keys (`z.strictObject`).
 */
function compareProperties(path: string, { base, head, sent, accepted }: Pair, rules: Rules): BreakingChange[] {
  const properties = (schema: JsonSchema) => (schema.properties ?? {}) as Record<string, JsonSchema>;
  const required = (schema: JsonSchema) => new Set((schema.required ?? []) as string[]);
  const [baseProperties, headProperties] = [properties(base), properties(head)];
  const sentRequired = required(sent);
  const field = (key: string) => `${path}.${key}`;
  return [
    ...Object.keys(baseProperties).flatMap((key) =>
      key in headProperties
        ? compareSchemas(field(key), rules.match(properties(sent)[key], properties(accepted)[key]), rules)
        : [{ path: field(key), message: 'field removed' }],
    ),
    ...Object.keys(properties(sent))
      .filter((key) => !(key in properties(accepted)) && key in headProperties && accepted.additionalProperties === false)
      .map((key) => ({ path: field(key), message: 'field added to an object that rejects unknown keys' })),
    ...[...required(accepted)]
      .filter((key) => key in headProperties && !sentRequired.has(key))
      .map((key) => ({ path: field(key), message: rules.requiredByReceiverOnly })),
  ];
}

function compareItems(path: string, { sent, accepted }: Pair, rules: Rules): BreakingChange[] {
  if (sent.items === undefined || accepted.items === undefined) return [];
  return compareSchemas(`${path}[]`, rules.match(sent.items as JsonSchema, accepted.items as JsonSchema), rules);
}
