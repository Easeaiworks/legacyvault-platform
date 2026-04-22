import { z } from 'zod';

export const DocumentCategoryEnum = z.enum([
  'WILL','TRUST','POWER_OF_ATTORNEY','HEALTHCARE_DIRECTIVE','LIVING_WILL',
  'DEED','TITLE','ACCOUNT_STATEMENT','INSURANCE_POLICY','TAX_RETURN',
  'BIRTH_CERTIFICATE','MARRIAGE_CERTIFICATE','DIVORCE_DECREE','DEATH_CERTIFICATE',
  'PASSPORT','DRIVERS_LICENSE','MILITARY_RECORD','NATURALIZATION',
  'BENEFICIARY_FORM','PRENUP','CUSTODY_AGREEMENT','LETTER_OF_WISHES',
  'PHOTO_ID','OTHER_LEGAL','OTHER_FINANCIAL','OTHER',
]);

export const CreateDocumentUploadSchema = z.object({
  category: DocumentCategoryEnum,
  title: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(127),
  sizeBytes: z.number().int().positive().max(500 * 1024 * 1024), // 500 MB cap
  contentSha256: z.string().length(64).regex(/^[a-f0-9]+$/),
  documentDate: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});
export type CreateDocumentUpload = z.infer<typeof CreateDocumentUploadSchema>;
