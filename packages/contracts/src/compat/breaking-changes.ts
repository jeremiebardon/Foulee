import type { JsonSchema, JsonSchemaSnapshot } from './json-schema';

/** A change that would make an app build already installed stop working against the new contract. */
export type BreakingChange = { path: string; message: string };

/** Compares the contract on `main` (`base`) with the proposed one (`head`). */
export function findBreakingChanges(base: JsonSchemaSnapshot, head: JsonSchemaSnapshot): BreakingChange[] {
  return Object.entries(base).flatMap(([name, schema]) =>
    name in head ? compareSchemas(name, schema, head[name]) : [{ path: name, message: 'schema removed' }],
  );
}

/**
 * A union (`anyOf`, which is how zod exports `.nullable()` and `.or()`) is read as its branches.
 * Each branch the base accepted must still be accepted by some head branch; when none accepts it
 * as is, the closest head branch explains why.
 */
function compareSchemas(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  const headBranches = branches(head);
  return branches(base).flatMap((baseBranch) =>
    headBranches
      .map((headBranch) => compareBranches(path, baseBranch, headBranch))
      .reduce((closest, changes) => (changes.length < closest.length ? changes : closest)),
  );
}

function branches(schema: JsonSchema): JsonSchema[] {
  const union = (schema.anyOf ?? schema.oneOf) as JsonSchema[] | undefined;
  return union === undefined ? [schema] : union.flatMap(branches);
}

function types(schema: JsonSchema): string[] | undefined {
  if (schema.type === undefined) return undefined;
  return Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
}

function compareTypes(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  const headTypes = types(head);
  if (headTypes === undefined) return [];
  const baseTypes = types(base);
  if (baseTypes === undefined) {
    return [{ path, message: `restricted to the type ${headTypes.map((t) => `"${t}"`).join(', ')}` }];
  }
  const accepts = (type: string) =>
    headTypes.includes(type) || (type === 'integer' && headTypes.includes('number'));
  return baseTypes
    .filter((type) => !accepts(type))
    .map((type) => ({ path, message: `type "${type}" no longer accepted` }));
}

function compareBranches(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  const typeChanges = compareTypes(path, base, head);
  if (typeChanges.length > 0) return typeChanges;
  return [
    ...compareAllowedValues(path, base, head),
    ...compareBounds(path, base, head),
    ...compareLimits(path, base, head),
    ...compareExactKeywords(path, base, head),
    ...compareUnmodelledKeywords(path, base, head),
    ...compareProperties(path, base, head),
    ...compareItems(path, base, head),
  ];
}

/** `enum` and `const` (a zod literal) both restrict a value to a fixed list. */
function allowedValues(schema: JsonSchema): unknown[] | undefined {
  if ('const' in schema) return [schema.const];
  return schema.enum as unknown[] | undefined;
}

function compareAllowedValues(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  const headValues = allowedValues(head);
  if (headValues === undefined) return [];
  const baseValues = allowedValues(base);
  if (baseValues === undefined) {
    const list = headValues.map((value) => JSON.stringify(value)).join(', ');
    return [{ path, message: `restricted to the values ${list}` }];
  }
  return baseValues
    .filter((value) => !headValues.includes(value))
    .map((value) => ({ path, message: `enum value ${JSON.stringify(value)} removed` }));
}

type Bound = { value: number; exclusive: boolean };

/** The tighter of `minimum`/`exclusiveMinimum` (or `maximum`/`exclusiveMaximum`), if any. */
function bound(schema: JsonSchema, side: 'lower' | 'upper'): Bound | undefined {
  const [inclusiveKey, exclusiveKey] = side === 'lower' ? ['minimum', 'exclusiveMinimum'] : ['maximum', 'exclusiveMaximum'];
  const candidates: Bound[] = [];
  if (typeof schema[inclusiveKey] === 'number') candidates.push({ value: schema[inclusiveKey], exclusive: false });
  if (typeof schema[exclusiveKey] === 'number') candidates.push({ value: schema[exclusiveKey], exclusive: true });
  return candidates.find((candidate) => candidates.every((other) => !isTighter(other, candidate, side)));
}

/** Whether `a` lets fewer values through than `b` (an absent bound lets everything through). */
function isTighter(a: Bound | undefined, b: Bound | undefined, side: 'lower' | 'upper'): boolean {
  if (a === undefined) return false;
  if (b === undefined) return true;
  if (a.value !== b.value) return side === 'lower' ? a.value > b.value : a.value < b.value;
  return a.exclusive && !b.exclusive;
}

function describeBound(bound: Bound | undefined, side: 'lower' | 'upper'): string {
  if (bound === undefined) return 'none';
  const operator = side === 'lower' ? '>' : '<';
  return `${operator}${bound.exclusive ? '' : '='} ${bound.value}`;
}

function compareBounds(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  return (['lower', 'upper'] as const).flatMap((side) => {
    const baseBound = bound(base, side);
    const headBound = bound(head, side);
    if (!isTighter(headBound, baseBound, side)) return [];
    const verb = side === 'lower' ? 'raised' : 'lowered';
    const message = `${side} bound ${verb} to ${describeBound(headBound, side)} (was ${describeBound(baseBound, side)})`;
    return [{ path, message }];
  });
}

/** Length and count keywords: a higher `min*` or a lower `max*` rejects values that used to pass. */
const limitKeywords = ['minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties'] as const;

function compareLimits(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  return limitKeywords.flatMap((keyword) => {
    const headLimit = head[keyword] as number | undefined;
    if (headLimit === undefined) return [];
    const baseLimit = base[keyword] as number | undefined;
    const isMin = keyword.startsWith('min');
    const narrowed = baseLimit === undefined || (isMin ? headLimit > baseLimit : headLimit < baseLimit);
    if (!narrowed) return [];
    return [{ path, message: `${keyword} ${isMin ? 'raised' : 'lowered'} to ${headLimit} (was ${baseLimit ?? 'none'})` }];
  });
}

/**
 * Keywords whose change cannot be proven harmless, so any new or different value fails. A changed
 * pattern may accept less (it does when a datetime stops accepting an offset), and two regular
 * expressions cannot be compared.
 */
function compareExactKeywords(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  const changes: BreakingChange[] = [];
  if (head.pattern !== undefined && head.pattern !== base.pattern) changes.push({ path, message: 'pattern changed' });
  for (const keyword of ['format', 'multipleOf'] as const) {
    if (head[keyword] === undefined || head[keyword] === base[keyword]) continue;
    const was = base[keyword] === undefined ? 'none' : JSON.stringify(base[keyword]);
    changes.push({ path, message: `${keyword} changed to ${JSON.stringify(head[keyword])} (was ${was})` });
  }
  return changes;
}

/** Keywords this check understands (`anyOf`/`oneOf` are split into branches before reaching here). */
const modelledKeywords = new Set<string>([
  'type', 'enum', 'const', 'properties', 'required', 'items',
  'minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum', ...limitKeywords,
  'pattern', 'format', 'multipleOf',
]);

/** Annotations: they document a schema without changing what it accepts. */
const annotationKeywords = new Set<string>([
  '$schema', '$comment', 'title', 'description', 'default', 'examples', 'deprecated', 'readOnly', 'writeOnly',
]);

/** Any other keyword (`additionalProperties`, `allOf`, `$ref`…) fails closed when it changes. */
function compareUnmodelledKeywords(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  const keywords = new Set([...Object.keys(base), ...Object.keys(head)]);
  return [...keywords]
    .filter((keyword) => !modelledKeywords.has(keyword) && !annotationKeywords.has(keyword))
    .filter((keyword) => JSON.stringify(base[keyword]) !== JSON.stringify(head[keyword]))
    .map((keyword) => ({ path, message: `"${keyword}" changed and cannot be checked automatically` }));
}

function compareProperties(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  const baseProperties = (base.properties ?? {}) as Record<string, JsonSchema>;
  const headProperties = (head.properties ?? {}) as Record<string, JsonSchema>;
  const baseRequired = new Set((base.required ?? []) as string[]);
  const headRequired = (head.required ?? []) as string[];
  return [
    ...Object.entries(baseProperties).flatMap(([key, schema]) =>
      key in headProperties
        ? compareSchemas(`${path}.${key}`, schema, headProperties[key])
        : [{ path: `${path}.${key}`, message: 'field removed' }],
    ),
    ...headRequired
      .filter((key) => !baseRequired.has(key))
      .map((key) => ({ path: `${path}.${key}`, message: 'field became required' })),
  ];
}

function compareItems(path: string, base: JsonSchema, head: JsonSchema): BreakingChange[] {
  if (base.items === undefined || head.items === undefined) return [];
  return compareSchemas(`${path}[]`, base.items as JsonSchema, head.items as JsonSchema);
}
