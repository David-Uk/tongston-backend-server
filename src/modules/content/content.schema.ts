import { z } from 'zod';

export const createContentBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string(),
  tags: z.array(z.string().trim().min(1)).max(50).default([]),
});

export const listContentQuerySchema = z.object({
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const contentIdSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid content id'),
});

export type CreateContentInput = z.infer<typeof createContentBodySchema>;
export type ListContentInput = z.infer<typeof listContentQuerySchema>;
