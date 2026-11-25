import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { BadRequestError } from '../utils/AppError.js';
import { validate } from './validate.js';

const schema = z.object({ email: z.email() });

const requestWith = (body: unknown): Request => ({ body, validated: {} }) as unknown as Request;

describe('validate', () => {
  it('parses input, strips unknown fields and exposes it on req.validated', () => {
    const req = requestWith({ email: 'user@example.com', extra: 'ignored' });
    const next = vi.fn<NextFunction>();

    validate({ body: schema })(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.validated.body).toEqual({ email: 'user@example.com' });
    expect(req.body).toEqual({ email: 'user@example.com' });
  });

  it('reports invalid input through the standard error type', () => {
    const req = requestWith({ email: 'not-an-email' });
    const next = vi.fn<NextFunction>();

    validate({ body: schema })(req, {} as Response, next);

    const error = next.mock.calls[0][0] as BadRequestError;
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.details).toEqual([{ field: 'email', message: expect.any(String) }]);
  });
});
