import { z } from 'zod';

/** The value shipped in `.env.example`: copying the file unedited must not boot a BFF anyone can call. */
const BFF_ACCESS_TOKEN_PLACEHOLDER = 'replace-with-a-long-random-string';

const envSchema = z.object({
  GARMIN_PERSONAL_API_KEY: z.string({ error: 'is required' }).min(1, 'must not be empty'),
  BFF_ACCESS_TOKEN: z
    .string({ error: 'is required' })
    .min(32, 'must be at least 32 characters')
    .refine((token) => token !== BFF_ACCESS_TOKEN_PLACEHOLDER, 'is still the .env.example placeholder, set a real secret'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export interface Env {
  garminPersonalApiKey: string;
  bffAccessToken: string;
  port: number;
}

/**
 * Validates the process environment once, on boot. Throws a message naming every
 * missing or invalid variable (never their values) so the BFF fails fast.
 */
export function loadEnv(raw: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment, the BFF cannot start. ${problems.join('; ')}`);
  }
  return {
    garminPersonalApiKey: parsed.data.GARMIN_PERSONAL_API_KEY,
    bffAccessToken: parsed.data.BFF_ACCESS_TOKEN,
    port: parsed.data.PORT,
  };
}
