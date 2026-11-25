import type { RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';
import { BadRequestError } from '../utils/AppError.js';

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

/** Validates and strips unknown fields from body/query/params into `req.validated`. */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      req.validated = {
        body: schemas.body?.parse(req.body),
        query: schemas.query?.parse(req.query),
        params: schemas.params?.parse(req.params),
      };
      // Safe to replace: unlike req.query/req.params, req.body is writable.
      if (req.validated.body !== undefined) req.body = req.validated.body;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new BadRequestError(
            'Validation failed',
            error.issues.map((issue) => ({
              field: issue.path.join('.') || '(root)',
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(error);
    }
  };
}
