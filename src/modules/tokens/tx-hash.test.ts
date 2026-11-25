import { describe, expect, it } from 'vitest';
import { mockTxHash } from './tx-hash.js';

describe('mockTxHash', () => {
  it('returns a deterministic 0x-prefixed 32-byte hex hash', () => {
    const hash = mockTxHash('record-1', 'secret');
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(mockTxHash('record-1', 'secret')).toBe(hash);
    expect(mockTxHash('record-2', 'secret')).not.toBe(hash);
  });
});
