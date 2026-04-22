import { z } from 'zod';

export const CreateBeneficiarySchema = z.object({
  assetId: z.string().uuid(),
  personId: z.string().uuid(),
  designation: z.enum(['PRIMARY', 'CONTINGENT', 'TERTIARY']).default('PRIMARY'),
  shareBps: z.number().int().min(1).max(10000),
  conditions: z.string().max(2000).optional(),
  sourceDocumentId: z.string().uuid().optional(),
});
export type CreateBeneficiary = z.infer<typeof CreateBeneficiarySchema>;
