import { z } from 'zod';

/** A JSON Schema document, as produced by `z.toJSONSchema`. */
export type JsonSchema = { [keyword: string]: unknown };

/**
 * Which way a schema travels, which decides who must keep accepting what (see the README):
 * - `request`: an installed app sends it and a newer BFF parses it, so the BFF may only accept more.
 * - `response`: a newer BFF sends it and an installed app parses it, so the BFF may only send less.
 */
export type Direction = 'request' | 'response';

/** A schema of the contract and the way it travels. */
export type ContractEntry = { direction: Direction; schema: z.ZodType };
export type Contract = Record<string, ContractEntry>;

/** A contract entry exported to JSON Schema. */
export type SnapshotEntry = { direction: Direction; schema: JsonSchema };

/** Every schema of a contract, by name, exported to JSON Schema. Committed as `json-schema/v1.json`. */
export type JsonSchemaSnapshot = Record<string, SnapshotEntry>;

/**
 * Exports each schema as the input it accepts (`io: 'input'`): that is what `parse` checks on both
 * sides of the wire. Throws on anything JSON Schema cannot express, so the check never silently
 * skips a schema.
 */
export function toJsonSchemaSnapshot(contract: Contract): JsonSchemaSnapshot {
  return Object.fromEntries(
    Object.entries(contract).map(([name, { direction, schema }]) => {
      const jsonSchema: JsonSchema = { ...z.toJSONSchema(schema, { io: 'input' }) };
      delete jsonSchema.$schema; // the same dialect for every entry: noise in the committed file
      return [name, { direction, schema: jsonSchema }];
    }),
  );
}
