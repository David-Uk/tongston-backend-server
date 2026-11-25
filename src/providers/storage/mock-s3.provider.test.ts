import { describe, expect, it } from 'vitest';
import { MockS3Provider } from './mock-s3.provider.js';

describe('MockS3Provider', () => {
  it('stores, reads and removes an object locally', async () => {
    const provider = new MockS3Provider();
    const data = Buffer.from('hello mock s3');
    const stored = await provider.upload({ data, mimeType: 'text/plain' });

    expect(stored.id).toMatch(/^media\/\d{4}\/\d{2}\//);
    expect(stored.url).toBe(`mock-s3://${stored.id}`);
    expect(await provider.fetch(stored.id)).toEqual(data);

    await provider.delete(stored.id);
    await expect(provider.fetch(stored.id)).rejects.toThrow();
  });
});
