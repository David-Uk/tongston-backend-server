import { createHash } from 'node:crypto';

/** Mock 32-byte hex hash, deterministic from a record id and optional secret. */
export function mockTxHash(seed: string, secret = ''): string {
  return `0x${createHash('sha256').update(`${seed}:${secret}`).digest('hex')}`;
}
