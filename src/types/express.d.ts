import type { UserRole } from '../modules/auth/user.model.js';

/** Public user shape — never includes the password hash. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tokenBalance: number;
}

/** Parsed values produced by the validate middleware. */
export interface ValidatedData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

declare global {
  namespace Express {
    interface Request {
      validated: ValidatedData;
      user?: AuthUser;
    }
  }
}

export {};
