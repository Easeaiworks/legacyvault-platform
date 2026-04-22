export const APP_NAME = 'LegacyVault';
export const SUPPORTED_COUNTRIES = ['US', 'CA'] as const;
export const SUPPORTED_LOCALES = ['en-US', 'en-CA', 'fr-CA'] as const;

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR',
] as const;

export const CA_PROVINCES = [
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
] as const;

/// Share is stored in basis points (10000 = 100%). Helpers:
export const SHARE_BPS_TOTAL = 10000;
export const bpsToPercent = (bps: number) => bps / 100;
export const percentToBps = (pct: number) => Math.round(pct * 100);
