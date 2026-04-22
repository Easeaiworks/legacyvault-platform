import { z } from 'zod';

export const RelationshipEnum = z.enum([
  'SPOUSE','CHILD','STEPCHILD','PARENT','SIBLING','GRANDCHILD','GRANDPARENT',
  'EXECUTOR','ATTORNEY','ACCOUNTANT','FINANCIAL_ADVISOR','GUARDIAN','TRUSTEE',
  'FRIEND','CHARITY','OTHER',
]);

export const CreatePersonSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  relationship: RelationshipEnum,
  email: z.string().email().max(254).optional(),
  phone: z.string().max(32).optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});
export type CreatePerson = z.infer<typeof CreatePersonSchema>;
