import { beforeAll, describe, expect, it } from 'vitest';
import { resetConfigCache } from '../../config/index.js';
import { UnauthorizedError } from '../../utils/AppError.js';
import { signToken, verifyToken } from './auth.service.js';

beforeAll(() => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017',
    MONGODB_DB_NAME: 't_world_test',
    JWT_SECRET: 'a-test-secret-that-is-definitely-long-enough',
    AI_PROVIDER: 'mock',
  });
  resetConfigCache();
});

describe('JWT tokens', () => {
  it('round-trips a signed token', () => {
    const token = signToken({ id: 'user-1', role: 'user' });
    expect(verifyToken(token)).toEqual({ sub: 'user-1', role: 'user' });
  });

  it('rejects a malformed token without leaking details', () => {
    expect(() => verifyToken('not-a-jwt')).toThrow(UnauthorizedError);
  });
});
