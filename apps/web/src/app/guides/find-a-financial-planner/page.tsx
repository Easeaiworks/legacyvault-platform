import Link from 'next/link';
import { cookies } from 'next/headers';
import { listProviders } from '@/lib/providers';
import { ProviderCard } from '@/components/provider-card';
import { FlagToggle } from '@/components/flag-toggle';

export default async function FindAFinancialPlanner() {
  const c = await cookies();
  const country: 'US' | 'CA' = c.get('lv_country')?.value === 'CA' ? 'CA' : 'US';

  const providers = await listProviders({
    kinds: ['FINANCIAL_PLANNER', 'REFERRAL_SERVICE', 'INSURANCE_ADVISOR'],
    country,
  });

  return (
    <div className="min-h-screen bg-paper">
      <nav className="border-b border-ink-200 bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight text-navy-900">
            LegacyVault
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/guides" className="text-sm text-navy-700 hover:text-navy-900">
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

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Find a financial planner
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            {country === 'CA'
              ? 'Financial planners in Canada'
              : 'Financial planners in the United States'}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-700">
            We prioritize <strong>fee-only fiduciary</strong> planners — advisors who charge you
            directly (not commissions from products they sell) and are legally required to put your
            interests first. Referral services from established professional bodies rank higher than
            individual firms in early launch.
          </p>
          <p className="mt-3 text-sm text-ink-500">
            <Link
              href="/guides/directory-methodology"
              className="underline underline-offset-2 hover:text-navy-700"
            >
              How we vet the directory →
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-paper-warm px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4">
            {providers.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-navy-900 py-16 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <div className="font-serif text-4xl font-medium tracking-tight text-paper">
            Take good care.
          </div>
          <div className="mt-10 text-xs text-ink-500">
            LegacyVault does not provide financial advice. Directory listings are informational
            only, not endorsements. Verify current standing directly with the certifying body.
          </div>
        </div>
      </footer>
    </div>
  );
}
