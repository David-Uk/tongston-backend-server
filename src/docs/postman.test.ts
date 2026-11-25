import { describe, expect, it } from 'vitest';
import { postmanCollection } from './postman.js';

describe('Postman collection', () => {
  it('derives bearer-authenticated requests from the OpenAPI document', () => {
    expect(postmanCollection.auth.type).toBe('bearer');
    const folders = postmanCollection.item as Array<{ name: string; item: unknown[] }>;
    expect(folders.length).toBeGreaterThan(0);
    expect(folders.reduce((count, folder) => count + folder.item.length, 0)).toBeGreaterThan(20);
  });
});
