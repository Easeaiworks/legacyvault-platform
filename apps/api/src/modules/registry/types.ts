export type RegistryVisibility =
  | 'INSTITUTIONS_VERIFIED_ONLY'
  | 'ATTORNEYS_AND_INSTITUTIONS'
  | 'FAMILY_WITH_VERIFICATION'
  | 'PRIVATE';

export interface NameVariation {
  firstName: string;
  lastName: string;
  middleName?: string;
  type?: 'maiden' | 'previous' | 'nickname' | 'transliteration';
  usedFrom?: string;
  usedTo?: string;
}

export interface AddressHistoryItem {
  /** ISO 3166-1 alpha-2 (US, CA). */
  country: string;
  /** US state / CA province. */
  region?: string;
  city?: string;
  from?: string;
  to?: string;
}

export interface RegistryOptInInput {
  /** User must tick the consent checkbox. */
  consentAcknowledged: boolean;
  nameVariations?: NameVariation[];
  addressHistory?: AddressHistoryItem[];
  visibility?: RegistryVisibility;
}

export interface RegistryUpdateInput {
  nameVariations?: NameVariation[];
  addressHistory?: AddressHistoryItem[];
  visibility?: RegistryVisibility;
}
