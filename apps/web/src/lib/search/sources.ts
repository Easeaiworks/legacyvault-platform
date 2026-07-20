/**
 * Registry of external unclaimed-property sources we run scrapers against.
 *
 * Each source declares:
 *   - id                 stable slug used in SearchJob.source
 *   - tier               1..5 per framework (public API vs. deep research)
 *   - country            'US' | 'CA' | 'MULTI'
 *   - region             optional state/province filter
 *   - name               human-readable
 *   - homepageUrl        where a user can verify a match
 *   - queryStrategy      how the scraper builds its request
 *   - description        one-line description
 *   - status             'active' | 'in-development' | 'planned'
 *
 * The actual scraper implementations live in ./scrapers/. Sources listed here
 * without a matching scraper still show up in the sources catalog for
 * transparency; jobs against them are marked SKIPPED.
 */

export type SourceTier = 1 | 2 | 3 | 4 | 5;
export type SourceStatus = 'active' | 'in-development' | 'planned';
export type SourceCountry = 'US' | 'CA' | 'MULTI';

export interface SearchSource {
  id: string;
  tier: SourceTier;
  country: SourceCountry;
  region?: string;
  name: string;
  homepageUrl: string;
  queryStrategy: 'get' | 'form-post' | 'api' | 'manual';
  description: string;
  status: SourceStatus;
}

export const SEARCH_SOURCES: SearchSource[] = [
  // ============ US TIER 1 ============
  {
    id: 'missingmoney',
    tier: 1,
    country: 'MULTI',
    name: 'MissingMoney.com (NAUPA)',
    homepageUrl: 'https://www.missingmoney.com',
    queryStrategy: 'form-post',
    description: 'Consolidated multi-state US + participating Canadian provinces.',
    status: 'in-development',
  },
  {
    id: 'us-treasury-hunt',
    tier: 1,
    country: 'US',
    name: 'US Treasury Hunt',
    homepageUrl: 'https://www.treasurydirect.gov/tools/treasuryhunt',
    queryStrategy: 'form-post',
    description: 'Matured US savings bonds no longer earning interest.',
    status: 'planned',
  },
  {
    id: 'pbgc-missing-participants',
    tier: 1,
    country: 'US',
    name: 'PBGC Missing Participants',
    homepageUrl: 'https://www.pbgc.gov/wr/find-an-unclaimed-pension',
    queryStrategy: 'form-post',
    description: 'Unclaimed defined-benefit pensions for terminated plans.',
    status: 'planned',
  },
  {
    id: 'fdic-unclaimed',
    tier: 1,
    country: 'US',
    name: 'FDIC Unclaimed Funds',
    homepageUrl: 'https://closedbanks.fdic.gov/funds/',
    queryStrategy: 'form-post',
    description: 'Funds from failed banks that were never claimed.',
    status: 'planned',
  },
  {
    id: 'naic-life-policy',
    tier: 1,
    country: 'US',
    name: 'NAIC Life Insurance Policy Locator',
    homepageUrl: 'https://www.naic.org/policy_locator_svc.htm',
    queryStrategy: 'form-post',
    description: 'Cross-carrier life insurance policy search for beneficiaries.',
    status: 'planned',
  },

  // ============ CA TIER 1 ============
  {
    id: 'bank-of-canada-unclaimed',
    tier: 1,
    country: 'CA',
    name: 'Bank of Canada — Unclaimed Balances',
    homepageUrl: 'https://www.bankofcanada.ca/unclaimed-balances/',
    queryStrategy: 'form-post',
    description: 'Federally-regulated bank balances inactive 10+ years.',
    status: 'in-development',
  },
  {
    id: 'alberta-tra-unclaimed',
    tier: 1,
    country: 'CA',
    region: 'AB',
    name: 'Alberta Tax and Revenue Administration — Unclaimed Property',
    homepageUrl: 'https://tra.alberta.ca/unclaimed-property.html',
    queryStrategy: 'get',
    description: 'Provincial unclaimed property registry for Alberta.',
    status: 'planned',
  },
  {
    id: 'bc-unclaimed-property',
    tier: 1,
    country: 'CA',
    region: 'BC',
    name: 'BC Unclaimed Property Society',
    homepageUrl: 'https://unclaimedpropertybc.ca/',
    queryStrategy: 'get',
    description: 'BC provincial unclaimed property.',
    status: 'planned',
  },
  {
    id: 'quebec-unclaimed',
    tier: 1,
    country: 'CA',
    region: 'QC',
    name: 'Revenu Québec — Biens non réclamés',
    homepageUrl: 'https://www.revenuquebec.ca/en/unclaimed-property/',
    queryStrategy: 'get',
    description: 'Quebec unclaimed-property registry.',
    status: 'planned',
  },
  {
    id: 'cra-uncashed-cheques',
    tier: 1,
    country: 'CA',
    name: 'CRA — Uncashed cheques',
    homepageUrl: 'https://www.canada.ca/en/revenue-agency/campaigns/uncashed-cheque.html',
    queryStrategy: 'manual',
    description: 'Uncashed tax refund / benefit cheques from the CRA.',
    status: 'planned',
  },

  // ============ TIER 2 — form submission ============
  // Individual US state registries — populated on demand.
  {
    id: 'state-ny',
    tier: 2,
    country: 'US',
    region: 'NY',
    name: 'New York State Comptroller — Office of Unclaimed Funds',
    homepageUrl: 'https://ouf.osc.state.ny.us/',
    queryStrategy: 'form-post',
    description: 'New York State unclaimed funds.',
    status: 'planned',
  },
  {
    id: 'state-ca',
    tier: 2,
    country: 'US',
    region: 'CA',
    name: 'California State Controller — Unclaimed Property',
    homepageUrl: 'https://ucpi.sco.ca.gov/en/Property/SearchIndex',
    queryStrategy: 'form-post',
    description: 'California unclaimed property.',
    status: 'planned',
  },
];

export function sourcesForCountry(country: 'US' | 'CA'): SearchSource[] {
  return SEARCH_SOURCES.filter((s) => s.country === country || s.country === 'MULTI');
}

export function activeSources(): SearchSource[] {
  return SEARCH_SOURCES.filter((s) => s.status === 'active' || s.status === 'in-development');
}

export function getSource(id: string): SearchSource | undefined {
  return SEARCH_SOURCES.find((s) => s.id === id);
}
