import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseConfig } from '../../config/index.js';
import { OpenRouterProvider } from './openrouter.provider.js';

const config = parseConfig({
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017',
  MONGODB_DB_NAME: 't_world_test',
  JWT_SECRET: 'a-test-secret-that-is-definitely-long-enough',
  OPENROUTER_BASE_URL: 'https://openrouter.test/api/v1',
  OPENROUTER_MODEL: 'liquid/lfm-3-1.7b:free',
  OPENROUTER_API_KEY: 'test-openrouter-key',
});

const input = {
  title: 'A title',
  body: 'Some body',
  tone: 'neutral' as const,
  length: 'short' as const,
  prompt: 'Summarise this',
};
const signal = new AbortController().signal;

afterEach(() => vi.unstubAllGlobals());

describe('OpenRouterProvider', () => {
  it('posts a chat completion with the API key and parses the reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'A summary' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new OpenRouterProvider(config).summarize(input, signal);

    expect(result.text).toBe('A summary');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.test/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-openrouter-key' }),
      }),
    );
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.model).toBe('liquid/lfm-3-1.7b:free');
    expect(sent.messages).toEqual([{ role: 'user', content: 'Summarise this' }]);
    expect(sent.stream).toBe(false);
  });

  it('classifies server errors as retryable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(new OpenRouterProvider(config).summarize(input, signal)).rejects.toMatchObject({
      transient: true,
    });
  });
});
