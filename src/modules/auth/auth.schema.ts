import { z } from 'zod';

// Trim/normalise first, then validate — keeps stored emails consistent.
const email = z.string().trim().toLowerCase().pipe(z.email());
const password = z.string().min(8).max(128);

export const registerBodySchema = z.object({ email, password });
export const loginBodySchema = z.object({ email, password });

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
