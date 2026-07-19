/**
 * Cost of Dying calculator — jurisdiction-driven formulas for the fees and
 * costs a family typically faces before receiving a dollar of inheritance.
 *
 * Everything is educational estimate only. Actual costs depend on complexity,
 * chosen professionals, and jurisdiction-specific quirks. Every source is
 * documented in the formula comment.
 */

export type Country = 'US' | 'CA';

// --- provinces / states ------------------------------------------------

export const CA_PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'QC', name: 'Quebec (notarial will)' },
  { code: 'QC_NON_NOTARIAL', name: 'Quebec (non-notarial will)' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'PE', name: 'Prince Edward Island' },
] as const;

export const US_STATES = [
  { code: 'CA', name: 'California' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'NY', name: 'New York' },
  { code: 'IL', name: 'Illinois' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'OH', name: 'Ohio' },
  { code: 'GA', name: 'Georgia' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'MI', name: 'Michigan' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'CO', name: 'Colorado' },
  { code: 'OR', name: 'Oregon' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'OTHER_US', name: 'Other U.S. state (typical range)' },
] as const;

export interface CalcInput {
  country: Country;
  region: string;
  estateValueUsd: number; // treat CA input as CAD; separate labeling
  hasWill: boolean;
  hasSpouse: boolean;
  numChildren: number;
}

export interface CalcLineItem {
  label: string;
  amountLow: number;
  amountHigh: number;
  note?: string;
}

export interface CalcResult {
  currency: 'USD' | 'CAD';
  lines: CalcLineItem[];
  totalLow: number;
  totalHigh: number;
  jurisdictionName: string;
  disclaimer: string;
}

// --- probate formulas --------------------------------------------------

/**
 * Ontario Estate Administration Tax (EAT):
 *   $0 on the first $50,000, then $15 per $1,000 (or fraction thereof) above.
 *   Source: Estate Administration Tax Act, 1998, s. 2(1); O. Reg. 379/17
 */
function probateOntario(estate: number): number {
  if (estate <= 50000) return 0;
  const above = estate - 50000;
  return Math.ceil(above / 1000) * 15;
}

/**
 * BC probate fee schedule (Probate Fee Act, s. 2):
 *   $0 up to $25k
 *   $6 per $1,000 (or part) from $25k–$50k
 *   $14 per $1,000 (or part) above $50k
 *   Plus $200 filing fee if estate > $25k.
 */
function probateBC(estate: number): number {
  if (estate <= 25000) return 0;
  const filing = 200;
  const tier1 = Math.min(estate - 25000, 25000);
  const tier2 = Math.max(estate - 50000, 0);
  return filing + Math.ceil(tier1 / 1000) * 6 + Math.ceil(tier2 / 1000) * 14;
}

/**
 * Alberta Surrogate Rules 2019 fee schedule — flat, capped at $525.
 *   Up to $10k: $35 · $10k–25k: $135 · $25k–125k: $275
 *   $125k–250k: $400 · > $250k: $525
 */
function probateAlberta(estate: number): number {
  if (estate <= 10000) return 35;
  if (estate <= 25000) return 135;
  if (estate <= 125000) return 275;
  if (estate <= 250000) return 400;
  return 525;
}

/** Quebec: notarial will bypasses probate entirely; non-notarial ~$120 verification fee. */
function probateQuebec(estate: number, notarial: boolean): number {
  return notarial ? 0 : 120;
}

/**
 * California statutory attorney fee schedule (Cal. Prob. Code § 10810):
 *   4% first $100k · 3% next $100k · 2% next $800k
 *   1% next $9M · 0.5% next $15M · court sets above $25M
 * Court also charges filing fees (~$465 for petition + $65 objection).
 */
function attorneyFeeCA(estate: number): number {
  let fee = 0;
  const brackets: Array<[number, number]> = [
    [100_000, 0.04],
    [100_000, 0.03],
    [800_000, 0.02],
    [9_000_000, 0.01],
    [15_000_000, 0.005],
  ];
  let remaining = estate;
  for (const [size, rate] of brackets) {
    const take = Math.min(remaining, size);
    fee += take * rate;
    remaining -= take;
    if (remaining <= 0) break;
  }
  return fee + 465; // add petition filing
}

/**
 * Florida statutory attorney fee schedule (Fla. Stat. § 733.6171):
 *   3% first $1M · 2.5% next $2M · 2% next $2M · 1.5% next $5M · 1% above
 */
function attorneyFeeFL(estate: number): number {
  let fee = 0;
  const brackets: Array<[number, number]> = [
    [1_000_000, 0.03],
    [2_000_000, 0.025],
    [2_000_000, 0.02],
    [5_000_000, 0.015],
  ];
  let remaining = estate;
  for (const [size, rate] of brackets) {
    const take = Math.min(remaining, size);
    fee += take * rate;
    remaining -= take;
    if (remaining <= 0) break;
  }
  if (remaining > 0) fee += remaining * 0.01;
  return fee;
}

/**
 * New York SCPA 2307 executor commission schedule — used here as a proxy for
 * combined attorney + executor costs since NY doesn't set attorney fees:
 *   5% first $100k · 4% next $200k · 3% next $700k · 2.5% next $4M · 2% above
 */
function attorneyFeeNY(estate: number): number {
  let fee = 0;
  const brackets: Array<[number, number]> = [
    [100_000, 0.05],
    [200_000, 0.04],
    [700_000, 0.03],
    [4_000_000, 0.025],
  ];
  let remaining = estate;
  for (const [size, rate] of brackets) {
    const take = Math.min(remaining, size);
    fee += take * rate;
    remaining -= take;
    if (remaining <= 0) break;
  }
  if (remaining > 0) fee += remaining * 0.02;
  return fee;
}

// --- main calculator ---------------------------------------------------

export function computeCostOfDying(input: CalcInput): CalcResult {
  const { country, region, estateValueUsd, hasWill, hasSpouse } = input;
  const currency = country === 'CA' ? 'CAD' : 'USD';

  const lines: CalcLineItem[] = [];

  // 1) Funeral & burial
  lines.push({
    label: 'Funeral & burial / cremation',
    amountLow: 5000,
    amountHigh: 20000,
    note: 'Cremation cheaper than burial. National average ~$8,000.',
  });

  // 2) Probate / court fees
  const probateBounds = probateForRegion(country, region, estateValueUsd);
  lines.push(probateBounds);

  // 3) Legal fees for administration (varies dramatically by jurisdiction)
  const legalBounds = legalFeesForRegion(country, region, estateValueUsd, hasWill);
  lines.push(legalBounds);

  // 4) Executor compensation (typical 2.5%–5% of estate; often waived by family executors)
  const execLow = Math.max(0, Math.round(estateValueUsd * 0.01)); // low = many families waive
  const execHigh = Math.round(estateValueUsd * 0.05);
  lines.push({
    label: 'Executor compensation',
    amountLow: execLow,
    amountHigh: execHigh,
    note: 'Family members serving as executor often waive compensation.',
  });

  // 5) Final tax return / accounting
  lines.push({
    label: 'Final tax return & accounting',
    amountLow: 1000,
    amountHigh: 5000,
    note: country === 'CA' ? 'Higher if RRSP/RRIF triggers tax at death.' : 'Higher for federal estate-tax filers.',
  });

  // 6) Property maintenance during administration
  const monthsLow = 3;
  const monthsHigh = country === 'CA' && !hasWill ? 24 : 12;
  lines.push({
    label: `Property maintenance (${monthsLow}–${monthsHigh} months)`,
    amountLow: 500 * monthsLow,
    amountHigh: 2000 * monthsHigh,
    note: 'House must be maintained, insured, heated until sold or transferred.',
  });

  // 7) Immediate access buffer (bills that keep arriving)
  if (!hasSpouse) {
    lines.push({
      label: 'Bridging funds for household bills',
      amountLow: 2000,
      amountHigh: 8000,
      note: 'Without a spouse to keep autopay running, family fronts these while probate opens.',
    });
  }

  const totalLow = lines.reduce((s, l) => s + l.amountLow, 0);
  const totalHigh = lines.reduce((s, l) => s + l.amountHigh, 0);

  return {
    currency,
    lines,
    totalLow,
    totalHigh,
    jurisdictionName: jurisdictionLabel(country, region),
    disclaimer:
      'Educational estimate only. Actual costs vary based on jurisdiction, family circumstances, complexity, and chosen professionals. Not legal, financial, or tax advice.',
  };
}

function probateForRegion(country: Country, region: string, estate: number): CalcLineItem {
  if (country === 'CA') {
    if (region === 'ON') {
      const f = probateOntario(estate);
      return { label: 'Ontario Estate Administration Tax (probate)', amountLow: f, amountHigh: f, note: '1.5% on value over $50,000.' };
    }
    if (region === 'BC') {
      const f = probateBC(estate);
      return { label: 'BC probate fees', amountLow: f, amountHigh: f, note: '~1.4% of estate value above $50k, plus $200 filing.' };
    }
    if (region === 'AB') {
      const f = probateAlberta(estate);
      return { label: 'Alberta probate fees', amountLow: f, amountHigh: f, note: 'Flat schedule, capped at $525.' };
    }
    if (region === 'QC') {
      return { label: 'Quebec probate (notarial will)', amountLow: 0, amountHigh: 0, note: 'Notarial wills bypass probate entirely.' };
    }
    if (region === 'QC_NON_NOTARIAL') {
      return { label: 'Quebec verification fee', amountLow: 120, amountHigh: 200, note: 'Non-notarial wills require court verification (~$120–$200).' };
    }
    // Other CA provinces — rough range
    return { label: `${jurisdictionLabel(country, region)} probate fees`, amountLow: 100, amountHigh: 5000, note: 'Sliding scale by province; typical range shown.' };
  }
  // US
  if (region === 'CA' || region === 'FL' || region === 'NY') {
    // Attorney fee schedule covers a lot of what "probate" means in these states
    return { label: 'Court filing & probate fees', amountLow: 500, amountHigh: 2000, note: 'Attorney fees for these states are separately calculated below.' };
  }
  if (region === 'TX') {
    return { label: 'Texas probate filing fees', amountLow: 300, amountHigh: 800, note: 'Independent administration is common and cheap; contested probate expensive.' };
  }
  // Generic US
  return { label: 'US probate filing fees', amountLow: 300, amountHigh: 1500, note: 'Varies by state and county.' };
}

function legalFeesForRegion(country: Country, region: string, estate: number, hasWill: boolean): CalcLineItem {
  if (country === 'US') {
    if (region === 'CA') {
      const fee = attorneyFeeCA(estate);
      return { label: 'California statutory attorney fee', amountLow: Math.round(fee * 0.9), amountHigh: Math.round(fee * 1.1), note: 'Set by Cal. Prob. Code § 10810; percentage of gross estate.' };
    }
    if (region === 'FL') {
      const fee = attorneyFeeFL(estate);
      return { label: 'Florida statutory attorney fee', amountLow: Math.round(fee * 0.9), amountHigh: Math.round(fee * 1.1), note: 'Fla. Stat. § 733.6171 schedule.' };
    }
    if (region === 'NY') {
      const fee = attorneyFeeNY(estate);
      return { label: 'New York attorney & executor combined', amountLow: Math.round(fee * 0.8), amountHigh: Math.round(fee * 1.2), note: 'Attorney fees + SCPA 2307 executor commission.' };
    }
    // Generic US: hourly, roughly 2%–5% of estate typical for probate
    return { label: 'Legal fees for estate administration', amountLow: Math.max(3000, Math.round(estate * 0.02)), amountHigh: Math.max(15000, Math.round(estate * 0.05)), note: hasWill ? 'Typical for a will-based probate.' : 'Higher without a will — add $3,000–$10,000.' };
  }
  // CA
  const willBoost = hasWill ? 0 : 5000;
  return {
    label: 'Legal fees for estate administration',
    amountLow: 3000 + willBoost,
    amountHigh: (estate > 500000 ? 20000 : 15000) + willBoost,
    note: hasWill ? 'Typical range for a will-based estate.' : 'Higher without a will — add $5,000–$15,000.',
  };
}

function jurisdictionLabel(country: Country, region: string): string {
  const list = country === 'CA' ? CA_PROVINCES : US_STATES;
  const found = list.find((p) => p.code === region);
  return found ? found.name : region;
}
