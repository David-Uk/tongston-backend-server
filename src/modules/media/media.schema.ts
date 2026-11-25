import { z } from 'zod';

export const mediaIdSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid media id'),
});
