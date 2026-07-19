'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FlagToggle } from '@/components/flag-toggle';

// Compound-interest visualizer. Universal — no jurisdiction dependency.
// Educational estimate; not investment advice.

const SCENARIOS = [
  { key: 'CONSERVATIVE', label: 'Conservative', rate: 0.04, color: '#7A9673' },
  { key: 'BALANCED', label: 'Balanced', rate: 0.06, color: '#C9962B' },
  { key: 'GROWTH', label: 'Growth', rate: 0.08, color: '#1E3A5F' },
] as const;

function futureValue(monthly: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

export default function CompoundSavingsPage() {
  const [monthly, setMonthly] = useState(200);
  const [currentAge, setCurrentAge] = useState(30);
  const [retireAge, setRetireAge] = useState(65);

  const years = Math.max(1, retireAge - currentAge);
  const totalContributions = monthly * 12 * years;

  const results = useMemo(
    () =>
      SCENARIOS.map((s) => ({
        ...s,
        value: futureValue(monthly, s.rate, years),
      })),
    [monthly, years],
  );

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
            Compound savings visualizer
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            What ${monthly.toLocaleString()} a month becomes.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-700">
            The single most powerful variable in retirement math is time. Move the sliders and
            watch what {years} years of steady saving compounds into.
          </p>
        </div>
      </section>

      <section className="bg-paper px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[380px_1fr]">
          {/* Inputs */}
          <div className="space-y-6 rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
                Monthly contribution
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg text-ink-700">$</span>
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={monthly}
                  onChange={(e) => setMonthly(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm text-navy-900"
                />
              </div>
              <input
                type="range"
                min="25"
                max="2500"
                step="25"
                value={monthly}
                onChange={(e) => setMonthly(Number(e.target.value))}
                className="mt-3 w-full accent-navy-700"
              />
              <div className="mt-1 flex justify-between text-xs text-ink-500">
                <span>$25</span>
                <span>$2,500</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
                Current age
              </label>
              <input
                type="number"
                min="18"
                max="80"
                value={currentAge}
                onChange={(e) =>
                  setCurrentAge(Math.min(80, Math.max(18, Number(e.target.value))))
                }
                className="mt-2 w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm text-navy-900"
              />
              <input
                type="range"
                min="18"
                max="80"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="mt-3 w-full accent-navy-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
                Retirement age
              </label>
              <input
                type="number"
                min={currentAge + 1}
                max="90"
                value={retireAge}
                onChange={(e) =>
                  setRetireAge(Math.min(90, Math.max(currentAge + 1, Number(e.target.value))))
                }
                className="mt-2 w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm text-navy-900"
              />
              <input
                type="range"
                min={currentAge + 1}
                max="90"
                value={retireAge}
                onChange={(e) => setRetireAge(Number(e.target.value))}
                className="mt-3 w-full accent-navy-700"
              />
            </div>

            <div className="rounded-lg bg-paper-warm p-4 text-sm">
              <div className="text-ink-500">You&apos;ll contribute</div>
              <div className="mt-1 font-serif text-2xl text-navy-900">
                ${totalContributions.toLocaleString()}
              </div>
              <div className="text-xs text-ink-500">
                over {years} years ($
                {monthly.toLocaleString()}/mo × 12 × {years})
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              {results.map((r) => (
                <div
                  key={r.key}
                  className="rounded-3xl border border-ink-200 bg-paper p-6 shadow-soft"
                >
                  <div
                    className="mb-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: r.color }}
                  >
                    {r.label} · {(r.rate * 100).toFixed(0)}%
                  </div>
                  <div className="font-serif text-3xl font-medium text-navy-900">
                    ${Math.round(r.value).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-ink-500">
                    growth: ${Math.round(r.value - totalContributions).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Static viral table */}
            <div className="mt-8 rounded-3xl border border-ink-200 bg-paper p-6 shadow-soft">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
                For sharing — the classic table (6% balanced)
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-ink-500">
                    <th className="py-2">Monthly</th>
                    <th className="py-2">10 yr</th>
                    <th className="py-2">20 yr</th>
                    <th className="py-2">30 yr</th>
                    <th className="py-2">40 yr</th>
                  </tr>
                </thead>
                <tbody>
                  {[100, 200, 300, 500, 750, 1000].map((m) => (
                    <tr key={m} className="border-b border-ink-100">
                      <td className="py-2 font-medium text-navy-900">${m}</td>
                      {[10, 20, 30, 40].map((yr) => (
                        <td key={yr} className="py-2 text-ink-700">
                          ${Math.round(futureValue(m, 0.06, yr)).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTAs */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/guides/what-200-a-month-becomes"
                className="rounded-2xl border-2 border-sage-300 bg-sage-100/40 p-6 shadow-soft transition-colors hover:border-sage-500"
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-sage-700">
                  Read the essay
                </div>
                <div className="font-serif text-lg text-navy-900">
                  What $200 a month actually becomes →
                </div>
              </Link>
              <Link
                href="/guides/find-a-financial-planner"
                className="rounded-2xl border-2 border-accent-300 bg-accent-100/60 p-6 shadow-soft transition-colors hover:border-accent-500"
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-700">
                  Get help
                </div>
                <div className="font-serif text-lg text-navy-900">
                  Find a fee-only fiduciary planner →
                </div>
              </Link>
            </div>

            <p className="mt-8 text-xs text-ink-500">
              Educational estimate only. Historical average returns vary by allocation and time
              period; the next 40 years will not look exactly like the last 40. Not investment,
              tax, or financial advice.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-navy-900 py-16 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <div className="font-serif text-4xl font-medium tracking-tight text-paper">
            Take good care.
          </div>
        </div>
      </footer>
    </div>
  );
}
