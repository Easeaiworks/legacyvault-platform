import { z } from 'zod';

export const LoginStartSchema = z.object({
  email: z.string().email().max(254),
  redirectTo: z.string().optional(),
});
export type LoginStart = z.infer<typeof LoginStartSchema>;

export const CallbackSchema = z.object({
  code: z.string().min(8),
  state: z.string().min(8),
});
