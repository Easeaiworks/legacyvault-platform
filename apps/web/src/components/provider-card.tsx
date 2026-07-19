import type { Provider } from '@prisma/client';

const FEE_LABEL: Record<string, string> = {
  HOURLY: 'Hourly',
  FLAT: 'Flat fee',
  AUM_PCT: '% of assets',
  COMMISSION: 'Commission',
  SUBSCRIPTION: 'Subscription',
  FREE: 'Free',
  MIXED: 'Mixed',
};

function formatDollarRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n === 0 ? '$0' : n >= 10000 ? `$${(n / 100).toLocaleString()}` : `$${(n / 100).toFixed(2)}`;
  if (min === max) return fmt(min ?? 0);
  return `${fmt(min ?? 0)} – ${fmt(max ?? 0)}`;
}

export function ProviderCard({ p }: { p: Provider }) {
  const badges: string[] = [];
  if (p.isFiduciary) badges.push('Fiduciary');
  if (p.isFeeOnly) badges.push('Fee-only');
  if (p.kind === 'REFERRAL_SERVICE') badges.push('Referral service');

  const feeRange = formatDollarRange(p.feeRangeMin, p.feeRangeMax);
  const feeModel = p.feeModel ? FEE_LABEL[p.feeModel] : null;

  const sources = p.vettingSourcesJson as Record<string, unknown>;
  const sourceEntries = Object.entries(sources).slice(0, 3);

  return (
    <a
      href={p.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-ink-200 bg-paper p-6 shadow-soft transition-colors hover:border-navy-300"
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <div className="font-serif text-xl font-medium text-navy-900 group-hover:text-navy-700">
            {p.displayName}
          </div>
          {p.firmName && p.firmName !== p.displayName && (
            <div className="text-sm text-ink-500">{p.firmName}</div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {badges.map((b) => (
            <span
              key={b}
              className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {p.description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-700">{p.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-500">
        {feeModel && (
          <span>
            <span className="font-semibold text-navy-900">Fees:</span> {feeModel}
            {feeRange && ` (${feeRange})`}
          </span>
        )}
        <span>
          <span className="font-semibold text-navy-900">Serves:</span>{' '}
          {p.regions.includes('ALL')
            ? p.country === 'CA'
              ? 'All of Canada'
              : 'All U.S. states'
            : p.regions.join(', ')}
        </span>
        {sourceEntries.length > 0 && (
          <span>
            <span className="font-semibold text-navy-900">Verified:</span>{' '}
            {sourceEntries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
          </span>
        )}
      </div>

      <div className="mt-4 text-sm text-navy-700 group-hover:text-navy-900">
        {p.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')} →
      </div>
    </a>
  );
}
