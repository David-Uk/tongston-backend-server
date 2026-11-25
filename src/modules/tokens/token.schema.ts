import { z } from 'zod';
import { MOCK_ASSETS } from './contract-conversion.model.js';

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const tokenHistoryQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['EARN', 'CONVERT', 'WITHDRAW']).optional(),
});

export const convertBodySchema = z.object({
  toAsset: z.enum(MOCK_ASSETS),
  amount: z.number().int().positive(),
});

export const withdrawBodySchema = z.object({
  conversionId: objectId,
});

export const grantBodySchema = z.object({
  userId: objectId,
  amount: z.number().int().positive(),
});

export const objectIdParamSchema = z.object({ id: objectId });
export const userIdQuerySchema = z.object({ userId: objectId });

export type HistoryInput = z.infer<typeof tokenHistoryQuerySchema>;
export type ConvertInput = z.infer<typeof convertBodySchema>;
export type WithdrawInput = z.infer<typeof withdrawBodySchema>;
export type GrantInput = z.infer<typeof grantBodySchema>;
export type PaginationInput = z.infer<typeof paginationQuerySchema>;
