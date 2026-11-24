import { z } from 'zod';

/**
 * Single source of truth for every environment variable.
 * Defaults are safe for local development; secrets and infrastructure
 * values are deliberately left without defaults so a bad boot is loud.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CORS_ORIGINS: z.string().min(1).default('http://localhost:5173'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    MONGODB_URI: z.string().min(1),
    MONGODB_DB_NAME: z.string().min(1),

    JWT_SECRET: z.string().min(32, 'must be at least 32 characters long'),
    JWT_EXPIRES_IN: z.string().min(1).default('1h'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    AI_PROVIDER: z.enum(['mock', 'real']).default('mock'),
    AI_API_KEY: z.string().optional(),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    AI_MOCK_LATENCY_MS: z.coerce.number().int().min(0).default(1200),
    AI_MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),

    TOKENS_PER_AI_RUN: z.coerce.number().int().positive().default(5),
    RATE_TOKENS_PER_MOCK_USDT: z.coerce.number().int().positive().default(100),
    RATE_TOKENS_PER_MOCK_ETH: z.coerce.number().int().positive().default(20000),
    MIN_CONVERT_AMOUNT: z.coerce.number().int().positive().default(100),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    STORAGE_LONGTERM_MODE: z.enum(['s3', 'mock']).default('mock'),
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),

    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
    ALLOWED_MIME_TYPES: z
      .string()
      .min(1)
      .default('image/png,image/jpeg,image/webp,application/pdf'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === 'real' && !env.AI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['AI_API_KEY'],
        message: 'required when AI_PROVIDER=real',
      });
    }

    if (env.STORAGE_LONGTERM_MODE === 's3') {
      const required = {
        AWS_REGION: env.AWS_REGION,
        AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
        S3_BUCKET: env.S3_BUCKET,
      };
      for (const [key, value] of Object.entries(required)) {
        if (!value) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'required when STORAGE_LONGTERM_MODE=s3',
          });
        }
      }
    }

    if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith('replace-with-')) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'must be a real random secret in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
