import dotenv from 'dotenv';
import { envSchema, type Env } from './env.schema.js';

dotenv.config();

export type Config = Omit<Env, 'CORS_ORIGINS' | 'ALLOWED_MIME_TYPES'> & {
  corsOrigins: string[];
  allowedMimeTypes: string[];
};

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Pure validation — safe to call from tests. */
export function parseConfig(raw: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const lines = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid or missing environment variables:\n${lines}\n\n` +
        'Copy .env.example to .env and fill in the required values.',
    );
  }

  const env = result.data;
  return {
    ...env,
    corsOrigins: splitList(env.CORS_ORIGINS),
    allowedMimeTypes: splitList(env.ALLOWED_MIME_TYPES),
  };
}

let cached: Config | undefined;

/** Boot-time loader. Prints a readable message and exits on bad config. */
export function loadConfig(): Config {
  if (cached) return cached;

  try {
    cached = parseConfig();
  } catch (error) {
    console.error(`[config] ${(error as Error).message}`);
    process.exit(1);
  }

  return cached as Config;
}

export function resetConfigCache(): void {
  cached = undefined;
}
