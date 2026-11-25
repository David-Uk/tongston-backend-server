import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { HydratedDocument } from 'mongoose';
import { loadConfig } from '../../config/index.js';
import type { AuthUser } from '../../types/express.js';
import { ConflictError, UnauthorizedError } from '../../utils/AppError.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';
import { UserModel, USER_ROLES, type User, type UserRole } from './user.model.js';

export interface AuthResult {
  token: string;
  user: AuthUser;
}

interface TokenPayload {
  sub: string;
  role: UserRole;
}

const isDuplicateEmail = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

/** The only place that reads a Mongoose user into a response-safe object. */
export function toAuthUser(user: HydratedDocument<User>): AuthUser {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role as UserRole,
    tokenBalance: user.tokenBalance,
  };
}

export function signToken(user: { id: string; role: UserRole }): string {
  const { JWT_SECRET, JWT_EXPIRES_IN } = loadConfig();
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  const { JWT_SECRET } = loadConfig();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      !USER_ROLES.includes(payload.role as UserRole)
    ) {
      throw new Error('Malformed token payload');
    }
    return { sub: payload.sub, role: payload.role as UserRole };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const passwordHash = await bcrypt.hash(input.password, loadConfig().BCRYPT_ROUNDS);
  try {
    const user = await UserModel.create({ email: input.email, passwordHash });
    return toAuthUser(user);
  } catch (error) {
    // Unique index is the source of truth; this also covers concurrent signups.
    if (isDuplicateEmail(error)) throw new ConflictError('Email is already registered');
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  // Same error for unknown email and wrong password — no account enumeration.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }
  const publicUser = toAuthUser(user);
  return { token: signToken(publicUser), user: publicUser };
}

/** Re-read on each request so a changed role/balance takes effect immediately. */
export async function findAuthUser(id: string): Promise<AuthUser | null> {
  const user = await UserModel.findById(id);
  return user ? toAuthUser(user) : null;
}
