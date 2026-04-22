// Human-readable labels for asset categories and types, grouped by country.
// Drives the onboarding wizard and asset form pickers.

export type Country = 'US' | 'CA';

export const CATEGORY_LABELS: Record<string, string> = {
  BANKING: 'Banking',
  INVESTMENT: 'Investment',
  RETIREMENT: 'Retirement',
  REAL_ESTATE: 'Real estate',
  INSURANCE: 'Insurance',
  BUSINESS: 'Business',
  PHYSICAL: 'Physical',
  DIGITAL: 'Digital',
  CRYPTO: 'Crypto',
  DEBT: 'Debt',
  OTHER: 'Other',
};

export const TYPES_BY_CATEGORY: Record<string, Array<{ value: string; label: string; country?: Country[] }>> = {
  BANKING: [
    { value: 'CHECKING', label: 'Checking account' },
    { value: 'SAVINGS', label: 'Savings account' },
    { value: 'CERTIFICATE_OF_DEPOSIT', label: 'Certificate of deposit (CD)' },
    { value: 'MONEY_MARKET', label: 'Money market account' },
  ],
  INVESTMENT: [
    { value: 'BROKERAGE', label: 'Brokerage account' },
    { value: 'MUTUAL_FUND', label: 'Mutual fund' },
    { value: 'STOCKS_DIRECT', label: 'Directly-held stocks' },
    { value: 'BONDS', label: 'Bonds' },
  ],
  RETIREMENT: [
    { value: 'IRA_TRADITIONAL', label: 'Traditional IRA', country: ['US'] },
    { value: 'IRA_ROTH', label: 'Roth IRA', country: ['US'] },
    { value: 'K401', label: '401(k)', country: ['US'] },
    { value: 'K403B', label: '403(b)', country: ['US'] },
    { value: 'K457', label: '457 plan', country: ['US'] },
    { value: 'SEP_IRA', label: 'SEP-IRA', country: ['US'] },
    { value: 'SIMPLE_IRA', label: 'SIMPLE IRA', country: ['US'] },
    { value: 'PENSION_US', label: 'Pension (US)', country: ['US'] },
    { value: 'RRSP', label: 'RRSP', country: ['CA'] },
    { value: 'RRIF', label: 'RRIF', country: ['CA'] },
    { value: 'TFSA', label: 'TFSA', country: ['CA'] },
    { value: 'RESP', label: 'RESP', country: ['CA'] },
    { value: 'LIRA', label: 'LIRA', country: ['CA'] },
    { value: 'LIF', label: 'LIF', country: ['CA'] },
    { value: 'RDSP', label: 'RDSP', country: ['CA'] },
    { value: 'PENSION_CA', label: 'Pension (CA)', country: ['CA'] },
    { value: 'CPP', label: 'CPP', country: ['CA'] },
    { value: 'OAS', label: 'OAS', country: ['CA'] },
  ],
  REAL_ESTATE: [
    { value: 'PRIMARY_RESIDENCE', label: 'Primary residence' },
    { value: 'SECONDARY_RESIDENCE', label: 'Secondary residence' },
    { value: 'RENTAL_PROPERTY', label: 'Rental property' },
    { value: 'LAND', label: 'Land' },
    { value: 'TIMESHARE', label: 'Timeshare' },
  ],
  INSURANCE: [
    { value: 'LIFE_INSURANCE_TERM', label: 'Term life insurance' },
    { value: 'LIFE_INSURANCE_WHOLE', label: 'Whole life insurance' },
    { value: 'LIFE_INSURANCE_UNIVERSAL', label: 'Universal life insurance' },
    { value: 'ANNUITY', label: 'Annuity' },
    { value: 'DISABILITY_INSURANCE', label: 'Disability insurance' },
    { value: 'LTC_INSURANCE', label: 'Long-term care insurance' },
  ],
  BUSINESS: [
    { value: 'SOLE_PROPRIETORSHIP', label: 'Sole proprietorship' },
    { value: 'PARTNERSHIP_INTEREST', label: 'Partnership interest' },
    { value: 'LLC_INTEREST', label: 'LLC interest' },
    { value: 'CORP_SHARES_PRIVATE', label: 'Private corporation shares' },
  ],
  PHYSICAL: [
    { value: 'VEHICLE', label: 'Vehicle' },
    { value: 'JEWELRY', label: 'Jewelry' },
    { value: 'ART', label: 'Art' },
    { value: 'COLLECTIBLES', label: 'Collectibles' },
    { value: 'FIREARM', label: 'Firearm' },
    { value: 'SAFE_DEPOSIT_BOX', label: 'Safe deposit box' },
  ],
  DIGITAL: [
    { value: 'DOMAIN_NAME', label: 'Domain name' },
    { value: 'ONLINE_ACCOUNT', label: 'Online account' },
    { value: 'LOYALTY_PROGRAM', label: 'Loyalty program / points' },
    { value: 'INTELLECTUAL_PROPERTY', label: 'Intellectual property' },
  ],
  CRYPTO: [
    { value: 'CRYPTO_CUSTODIAL', label: 'Exchange-held crypto' },
    { value: 'CRYPTO_SELF_CUSTODY', label: 'Self-custody crypto' },
  ],
  DEBT: [
    { value: 'MORTGAGE', label: 'Mortgage' },
    { value: 'AUTO_LOAN', label: 'Auto loan' },
    { value: 'STUDENT_LOAN', label: 'Student loan' },
    { value: 'CREDIT_CARD', label: 'Credit card' },
    { value: 'PERSONAL_LOAN', label: 'Personal loan' },
  ],
  OTHER: [{ value: 'OTHER_ASSET', label: 'Other' }],
};

export function typesForCountry(category: string, country: Country | 'ALL' = 'ALL') {
  const all = TYPES_BY_CATEGORY[category] ?? [];
  if (country === 'ALL') return all;
  return all.filter((t) => !t.country || t.country.includes(country));
}

export const RELATIONSHIP_LABELS: Record<string, string> = {
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  STEPCHILD: 'Stepchild',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  GRANDCHILD: 'Grandchild',
  GRANDPARENT: 'Grandparent',
  EXECUTOR: 'Executor',
  ATTORNEY: 'Attorney',
  ACCOUNTANT: 'Accountant',
  FINANCIAL_ADVISOR: 'Financial advisor',
  GUARDIAN: 'Guardian',
  TRUSTEE: 'Trustee',
  FRIEND: 'Friend',
  CHARITY: 'Charity',
  OTHER: 'Other',
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  WILL: 'Will',
  TRUST: 'Trust document',
  POWER_OF_ATTORNEY: 'Power of attorney',
  HEALTHCARE_DIRECTIVE: 'Healthcare directive',
  LIVING_WILL: 'Living will',
  DEED: 'Deed',
  TITLE: 'Title',
  ACCOUNT_STATEMENT: 'Account statement',
  INSURANCE_POLICY: 'Insurance policy',
  TAX_RETURN: 'Tax return',
  BIRTH_CERTIFICATE: 'Birth certificate',
  MARRIAGE_CERTIFICATE: 'Marriage certificate',
  DIVORCE_DECREE: 'Divorce decree',
  DEATH_CERTIFICATE: 'Death certificate',
  PASSPORT: 'Passport',
  DRIVERS_LICENSE: "Driver's license",
  MILITARY_RECORD: 'Military record',
  NATURALIZATION: 'Naturalization',
  BENEFICIARY_FORM: 'Beneficiary form',
  PRENUP: 'Prenuptial agreement',
  CUSTODY_AGREEMENT: 'Custody agreement',
  LETTER_OF_WISHES: 'Letter of wishes',
  PHOTO_ID: 'Photo ID',
  OTHER_LEGAL: 'Other legal',
  OTHER_FINANCIAL: 'Other financial',
  OTHER: 'Other',
};

export const INSTRUCTION_CATEGORY_LABELS: Record<string, string> = {
  LETTER_OF_WISHES: 'Letter of wishes',
  FUNERAL_PREFERENCES: 'Funeral preferences',
  ORGAN_DONATION: 'Organ donation',
  PET_CARE: 'Pet care',
  DIGITAL_ACCOUNT_DISPOSITION: 'Digital accounts',
  PERSONAL_MESSAGE: 'Personal message',
  OTHER: 'Other',
};

export const ACCESS_TIER_LABELS: Record<string, string> = {
  INDEX_ONLY: 'Index only — can see what exists, not the contents',
  VIEW_GENERAL: 'View general — non-sensitive assets and documents',
  EXECUTOR: 'Executor — full access on unlock',
  EMERGENCY: 'Emergency — can initiate unlock',
};
