import type { RequestHandler } from 'express';
import { findAuthUser, verifyToken } from '../modules/auth/auth.service.js';
import type { UserRole } from '../modules/auth/user.model.js';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError.js';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Bearer token required');

    const { sub } = verifyToken(header.slice(7).trim());
    const user = await findAuthUser(sub);
    if (!user) throw new UnauthorizedError('User no longer exists');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/** Use after requireAuth: requireRole('admin') blocks non-admin users. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

export const requireAdmin = requireRole('admin');
