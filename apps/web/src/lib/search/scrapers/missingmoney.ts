/**
 * MissingMoney.com scraper (proof-of-concept skeleton).
 *
 * MissingMoney.com is the NAUPA-endorsed consolidated search across
 * participating US states and Canadian provinces. The public search returns
 * results with holder + last known city + reported value (bucket).
 *
 * This is a POC implementation. It hits a public search endpoint via HTTP
 * fetch (no browser needed for the initial paginated JSON response). In
 * production we will:
 *   - Add polite rate limiting (max 1 req / 3 sec per source)
 *   - Rotate user agents and IP addresses (via proxy pool)
 *   - Add captcha-solving support when triggered
 *   - Move to Playwright when the site starts blocking pure fetch
 *
 * Right now this returns fake results for offline testing; when we point at
 * the real endpoint we swap in the real URL.
 */

import type { Candidate } from '../matcher';

export interface MMQuery {
  firstName: string;
  lastName: string;
  city?: string;
  region?: string; // 2-letter state / province code
}

export interface MMResult {
  holder: string;
  ownerFullName: string;
  city?: string;
  region?: string;
  reportedValue?: string;
  detailUrl?: string;
}

const MOCK = process.env.NODE_ENV !== 'production' || process.env.LV_SEARCH_MOCK === '1';

/**
 * Run a MissingMoney search. Returns raw results.
 */
export async function searchMissingMoney(q: MMQuery): Promise<MMResult[]> {
  if (MOCK) {
    // Return a deterministic mock so downstream code paths are exercised in dev.
    return [
      {
        holder: 'MOCK HOLDER — replace with real fetch',
        ownerFullName: `${q.firstName.toUpperCase()} ${q.lastName.toUpperCase()}`,
        city: q.city ?? 'Toronto',
        region: q.region ?? 'ON',
        reportedValue: '$100.00-$500.00',
        detailUrl: 'https://www.missingmoney.com/en/property/results',
      },
    ];
  }

  // Real implementation — TODO: replace URL with actual endpoint after robots.txt review.
  const url = new URL('https://www.missingmoney.com/en/api/v1/search');
  url.searchParams.set('firstName', q.firstName);
  url.searchParams.set('lastName', q.lastName);
  if (q.city) url.searchParams.set('city', q.city);
  if (q.region) url.searchParams.set('state', q.region);

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'LegacyVault-Search/1.0 (+https://legacyvault.app/search)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`missingmoney: ${res.status} ${res.statusText}`);

  // Placeholder — real response shape TBD by field probe.
  const json = (await res.json()) as { results?: MMResult[] };
  return json.results ?? [];
}

/** Convert an MMResult to a generic Candidate for the matcher. */
export function toCandidate(r: MMResult): Candidate {
  const parts = r.ownerFullName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined,
    city: r.city,
    region: r.region,
  };
}
