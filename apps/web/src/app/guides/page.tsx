import Link from 'next/link';
import { cookies } from 'next/headers';
import { listGuides, type Country } from '@/lib/guides';
import { FlagToggle } from '@/components/flag-toggle';

// Public library index. Server-renders based on the user's cookie-persisted
// country choice; defaults to US if unset. Client-side FlagToggle updates the
// cookie and refetches the appropriate list.
export default async function GuidesIndex() {
  const country = await readCountryFromCookies();
  const guides = listGuides(country);

  // Group by category
  const byCategory = guides.reduce<Record<string, typeof guides>>((acc, g) => {
    (acc[g.category] ??= []).push(g);
    return acc;
  }, {});

  const categoryOrder: Array<[string, string]> = [
    ['ESSENTIAL_DOCUMENTS', 'Essential documents'],
    ['FINANCIAL', 'Financial planning'],
    ['DIGITAL', 'Digital wind-down'],
    ['PRACTICAL', 'Practical guides'],
  ];

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav country={country} />

      <section className="border-b border-ink-200 bg-paper px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Estate planning guides
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            What the documents actually do — and what happens without them.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-700">
            Plain-English essays on the pieces of a proper estate plan, written for the
            jurisdiction you actually live in.{' '}
            {country === 'CA'
              ? 'Currently showing Canadian guides.'
              : 'Currently showing US guides.'}{' '}
            <span className="text-ink-500">Toggle at top-right to switch.</span>
          </p>
        </div>
      </section>

      <section className="border-b border-ink-200 bg-paper-warm px-6 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between rounded-2xl border border-ink-200 bg-paper p-6 shadow-soft">
          <div>
            <div className="font-serif text-xl text-navy-900">Estate planning glossary</div>
            <div className="mt-1 text-sm text-ink-500">
              Every term you&apos;ll hear from a lawyer or planner, defined in plain English.
            </div>
          </div>
          <Link
            href="/guides/glossary"
            className="rounded-md border border-ink-300 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-ink-100"
          >
            Open glossary →
          </Link>
        </div>
      </section>

      {categoryOrder.map(([key, label]) => {
        const items = byCategory[key];
        if (!items || items.length === 0) return null;
        return (
          <section key={key} className="border-b border-ink-200 bg-paper-warm px-6 py-14">
            <div className="mx-auto max-w-4xl">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-700">
                {label}
              </div>
              <div className="mt-6 grid gap-4">
                {items.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="group flex items-start justify-between gap-6 rounded-2xl border border-ink-200 bg-paper p-6 shadow-soft transition-colors hover:border-navy-300"
                  >
                    <div className="flex-1">
                      <div className="font-serif text-2xl font-medium leading-tight text-navy-900 group-hover:text-navy-700">
                        {g.title}
                      </div>
                      {g.subtitle && (
                        <div className="mt-1 text-ink-700">{g.subtitle}</div>
                      )}
                      <div className="mt-3 text-sm text-ink-500">
                        {g.readTimeMinutes}-minute read
                      </div>
                    </div>
                    <div className="mt-2 text-2xl text-ink-300 group-hover:text-navy-700">→</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <PublicFooter />
    </div>
  );
}

async function readCountryFromCookies(): Promise<Country> {
  const c = await cookies();
  const v = c.get('lv_country')?.value;
  return v === 'CA' ? 'CA' : 'US';
}

function PublicNav({ country: _country }: { country: Country }) {
  return (
    <nav className="border-b border-ink-200 bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-serif text-2xl tracking-tight text-navy-900 hover:text-navy-700"
        >
          LegacyVault
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/guides"
            className="text-sm font-medium text-navy-900 hover:text-navy-700"
          >
            Guides
          </Link>
          <Link
            href="/calculators/cost-of-dying"
            className="text-sm text-navy-700 hover:text-navy-900"
          >
            Calculators
          </Link>
          <FlagToggle />
          <Link href="/login" className="text-sm text-navy-700 hover:text-navy-900">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-paper hover:bg-navy-900"
          >
            Register — free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-navy-900 py-16 text-center">
      <div className="mx-auto max-w-3xl px-6">
        <div className="font-serif text-4xl font-medium tracking-tight text-paper">
          Take good care.
        </div>
        <div className="mt-3 text-sm text-ink-300">
          The trust layer beneath everything you&apos;ll leave behind.
        </div>
        <div className="mt-10 text-xs text-ink-500">
          LegacyVault does not provide legal, financial, or tax advice. Content on this site
          is educational only. Consult a qualified attorney, financial planner, or accountant
          licensed in your jurisdiction for advice specific to your situation.
        </div>
      </div>
    </footer>
  );
}
