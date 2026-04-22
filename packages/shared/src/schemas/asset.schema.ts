import { z } from 'zod';

export const AssetCategoryEnum = z.enum([
  'BANKING', 'INVESTMENT', 'RETIREMENT', 'REAL_ESTATE', 'INSURANCE',
  'BUSINESS', 'PHYSICAL', 'DIGITAL', 'CRYPTO', 'DEBT', 'OTHER',
]);

export const AssetTypeEnum = z.enum([
  'CHECKING','SAVINGS','CERTIFICATE_OF_DEPOSIT','MONEY_MARKET',
  'BROKERAGE','MUTUAL_FUND','STOCKS_DIRECT','BONDS',
  'IRA_TRADITIONAL','IRA_ROTH','K401','K403B','K457','SEP_IRA','SIMPLE_IRA','PENSION_US',
  'RRSP','RRIF','TFSA','RESP','LIRA','LIF','RDSP','PENSION_CA','CPP','OAS',
  'PRIMARY_RESIDENCE','SECONDARY_RESIDENCE','RENTAL_PROPERTY','LAND','TIMESHARE',
  'LIFE_INSURANCE_TERM','LIFE_INSURANCE_WHOLE','LIFE_INSURANCE_UNIVERSAL','ANNUITY','DISABILITY_INSURANCE','LTC_INSURANCE',
  'SOLE_PROPRIETORSHIP','PARTNERSHIP_INTEREST','LLC_INTEREST','CORP_SHARES_PRIVATE',
  'VEHICLE','JEWELRY','ART','COLLECTIBLES','FIREARM','SAFE_DEPOSIT_BOX',
  'DOMAIN_NAME','ONLINE_ACCOUNT','LOYALTY_PROGRAM','INTELLECTUAL_PROPERTY',
  'CRYPTO_CUSTODIAL','CRYPTO_SELF_CUSTODY',
  'MORTGAGE','AUTO_LOAN','STUDENT_LOAN','CREDIT_CARD','PERSONAL_LOAN',
  'OTHER_ASSET',
]);

export const CreateAssetSchema = z.object({
  category: AssetCategoryEnum,
  type: AssetTypeEnum,
  nickname: z.string().min(1).max(255),
  institutionName: z.string().max(255).optional(),
  accountNumber: z.string().max(64).optional(), // will be split into last4 + encrypted
  estimatedValueCents: z.bigint().nullable().optional(),
  currency: z.string().length(3).default('USD'),
  location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateAsset = z.infer<typeof CreateAssetSchema>;

export const UpdateAssetSchema = CreateAssetSchema.partial();
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
