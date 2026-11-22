import { z } from 'zod';

/** A JSON Schema document, as produced by `z.toJSONSchema`. */
export type JsonSchema = { [keyword: string]: unknown };

/** Every schema of a contract, by name, exported to JSON Schema. Committed as `json-schema/v1.json`. */
export type JsonSchemaSnapshot = Record<string, JsonSchema>;

/**
 * Exports each schema as the input it accepts (`io: 'input'`): that is what `parse` checks on both
 * sides of the wire. Throws on anything JSON Schema cannot express, so the check never silently
 * skips a schema.
 */
export function toJsonSchemaSnapshot(contract: Record<string, z.ZodType>): JsonSchemaSnapshot {
  return Object.fromEntries(
    Object.entries(contract).map(([name, schema]) => {
      const jsonSchema: JsonSchema = { ...z.toJSONSchema(schema, { io: 'input' }) };
      delete jsonSchema.$schema; // the same dialect for every entry: noise in the committed file
      return [name, jsonSchema];
    }),
  );
}
