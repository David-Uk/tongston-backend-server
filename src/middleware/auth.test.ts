import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError.js';

vi.mock('../modules/auth/auth.service.js', () => ({
  verifyToken: vi.fn(),
  findAuthUser: vi.fn(),
}));

import { findAuthUser, verifyToken } from '../modules/auth/auth.service.js';
import { requireAdmin, requireAuth } from './auth.js';

const user = { id: 'u1', email: 'user@example.com', role: 'user' as const, tokenBalance: 0 };

const setup = (authorization?: string) => {
  const req = { headers: authorization ? { authorization } : {} } as unknown as Request;
  const next = vi.fn<NextFunction>();
  return { req, next, res: {} as Response };
};

describe('requireAuth / requireRole', () => {
  beforeEach(() => {
    vi.mocked(verifyToken).mockReturnValue({ sub: user.id, role: user.role });
    vi.mocked(findAuthUser).mockResolvedValue(user);
  });

  it('rejects requests without a bearer token', async () => {
    const { req, next, res } = setup();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('attaches the current user to the request', async () => {
    const { req, next, res } = setup('Bearer valid-token');
    await requireAuth(req, res, next);
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks non-admin users from admin routes', () => {
    const { req, next, res } = setup();
    req.user = user;
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('allows admin users through', () => {
    const { req, next, res } = setup();
    req.user = { ...user, role: 'admin' };
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
