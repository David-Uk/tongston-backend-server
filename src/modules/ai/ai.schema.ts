import { z } from 'zod';

export const TONES = ['neutral', 'formal', 'casual', 'persuasive'] as const;
export const LENGTHS = ['short', 'medium', 'long'] as const;

export const summarizeBodySchema = z.object({
  tone: z.enum(TONES).default('neutral'),
  length: z.enum(LENGTHS).default('medium'),
});

export const listAiRunsQuerySchema = z.object({
  contentId: z
    .string()
    .regex(/^[0-9a-f]{24}$/i, 'Invalid content id')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id'),
});

export type Tone = (typeof TONES)[number];
export type Length = (typeof LENGTHS)[number];
export type SummarizeInputDto = z.infer<typeof summarizeBodySchema>;
export type ListAiRunsInput = z.infer<typeof listAiRunsQuerySchema>;
