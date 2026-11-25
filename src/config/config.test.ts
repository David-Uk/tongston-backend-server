import { describe, expect, it } from 'vitest';
import { parseConfig } from './index.js';

const validEnv = {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017',
  MONGODB_DB_NAME: 't_world_test',
  JWT_SECRET: 'a-test-secret-that-is-definitely-long-enough',
  CORS_ORIGINS: 'http://localhost:5173, http://localhost:3000',
  OPENROUTER_API_KEY: 'test-openrouter-key',
};

describe('parseConfig', () => {
  it('applies documented defaults and splits comma-separated lists', () => {
    const config = parseConfig(validEnv);

    expect(config.PORT).toBe(4000);
    expect(config.AI_PROVIDER).toBe('openrouter');
    expect(config.TOKENS_PER_AI_RUN).toBe(5);
    expect(config.RATE_TOKENS_PER_MOCK_ETH).toBe(20000);
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'http://localhost:3000']);
  });

  it('rejects missing required variables with a readable message', () => {
    expect(() => parseConfig({})).toThrow('Invalid or missing environment variables');
    expect(() => parseConfig({ ...validEnv, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET: must be at least 32 characters/,
    );
  });

  it('uses the OpenRouter endpoint and validates its key', () => {
    const config = parseConfig(validEnv);
    expect(config.OPENROUTER_BASE_URL).toBe('https://openrouter.ai/api/v1');
    expect(config.OPENROUTER_MODEL).toBe('liquid/lfm-3-1.7b:free');
    expect(() => parseConfig({ ...validEnv, OPENROUTER_BASE_URL: 'not-a-url' })).toThrow(
      /OPENROUTER_BASE_URL/,
    );
    expect(() => parseConfig({ ...validEnv, OPENROUTER_API_KEY: '' })).toThrow(
      /OPENROUTER_API_KEY/,
    );
    expect(() =>
      parseConfig({ ...validEnv, AI_PROVIDER: 'mock', OPENROUTER_API_KEY: '' }),
    ).not.toThrow();
  });
});
