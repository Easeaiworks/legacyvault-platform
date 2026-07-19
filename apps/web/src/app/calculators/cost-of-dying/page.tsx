'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CA_PROVINCES,
  US_STATES,
  computeCostOfDying,
  type Country,
} from '@/lib/cost-of-dying';
import { FlagToggle } from '@/components/flag-toggle';

export default function CostOfDyingCalculator() {
  const [country, setCountry] = useState<Country>('US');
  const [region, setRegion] = useState<string>('CA'); // default = California for US
  const [estateValue, setEstateValue] = useState<number>(750000);
  const [hasWill, setHasWill] = useState<boolean>(true);
  const [hasSpouse, setHasSpouse] = useState<boolean>(true);
  const [numChildren, setNumChildren] = useState<number>(2);

  // Read persisted country on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lv_country');
      if (stored === 'US' || stored === 'CA') {
        setCountry(stored);
        setRegion(stored === 'CA' ? 'ON' : 'CA');
      }
    } catch {
      /* ignore */
    }
  }, []);

  // When country changes, default region to a common one
  useEffect(() => {
    setRegion(country === 'CA' ? 'ON' : 'CA');
  }, [country]);

  const regions = country === 'CA' ? CA_PROVINCES : US_STATES;
  const result = useMemo(
    () =>
      computeCostOfDying({
        country,
        region,
        estateValueUsd: estateValue,
        hasWill,
        hasSpouse,
        numChildren,
      }),
    [country, region, estateValue, hasWill, hasSpouse, numChildren],
  );

  const currencySymbol = result.currency === 'CAD' ? 'C$' : '$';

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            The Cost of Dying — {country === 'CA' ? 'Canadian' : 'United States'} calculator
          </div>
          <h1 className="font-serif text-5xl font-medium leading-tight tracking-tight text-navy-900">
            How much will your family face before receiving a dollar?
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-700">
            An honest estimate of the fees, legal costs, and immediate expenses that come out
            of your estate before any beneficiary sees a cent. Numbers are jurisdiction-driven
            &mdash; probate fees in Ontario are wildly different from Alberta, and California is
            wildly different from Texas.
          </p>
        </div>
      </section>

      <section className="bg-paper px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[380px_1fr]">
          {/* Inputs */}
          <div className="space-y-6 rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
                Country
              </label>
              <div className="mt-2 flex gap-2">
                {(['US', 'CA'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCountry(c)}
                    className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      country === c
                        ? 'border-navy-700 bg-navy-700 text-paper'
                        : 'border-ink-300 bg-paper text-navy-900 hover:bg-ink-100'
                    }`}
                  >
                    {c === 'CA' ? '🇨🇦 Canada' : '🇺🇸 United States'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="region"
                className="block text-xs font-semibold uppercase tracking-widest text-ink-500"
              >
                {country === 'CA' ? 'Province' : 'State'}
              </label>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="mt-2 w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm text-navy-900"
              >
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="estate"
                className="block text-xs font-semibold uppercase tracking-widest text-ink-500"
              >
                Estate value ({result.currency})
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg text-ink-700">{currencySymbol}</span>
                <input
                  id="estate"
                  type="number"
                  step="10000"
                  min="0"
                  value={estateValue}
                  onChange={(e) => setEstateValue(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm text-navy-900"
                />
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="10000"
                value={estateValue}
                onChange={(e) => setEstateValue(Number(e.target.value))}
                className="mt-3 w-full accent-navy-700"
              />
              <div className="mt-1 flex justify-between text-xs text-ink-500">
                <span>{currencySymbol}50k</span>
                <span>{currencySymbol}5M</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
                Do you have a will?
              </label>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: 'Yes' },
                  { v: false, label: 'No' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => setHasWill(o.v)}
                    className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      hasWill === o.v
                        ? 'border-navy-700 bg-navy-700 text-paper'
                        : 'border-ink-300 bg-paper text-navy-900 hover:bg-ink-100'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
                Do you have a spouse or partner?
              </label>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: 'Yes' },
                  { v: false, label: 'No' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => setHasSpouse(o.v)}
                    className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      hasSpouse === o.v
                        ? 'border-navy-700 bg-navy-700 text-paper'
                        : 'border-ink-300 bg-paper text-navy-900 hover:bg-ink-100'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="kids"
                className="block text-xs font-semibold uppercase tracking-widest text-ink-500"
              >
                Number of children
              </label>
              <input
                id="kids"
                type="number"
                min="0"
                max="20"
                value={numChildren}
                onChange={(e) => setNumChildren(Math.max(0, Number(e.target.value)))}
                className="mt-2 w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm text-navy-900"
              />
            </div>
          </div>

          {/* Results */}
          <div>
            <div className="rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft">
              <div className="text-xs font-semibold uppercase tracking-widest text-terracotta-700">
                In {result.jurisdictionName}, your family will face
              </div>
              <div className="mt-2 font-serif text-5xl font-medium tracking-tight text-navy-900">
                {currencySymbol}
                {result.totalLow.toLocaleString()}
                <span className="text-ink-500"> &ndash; </span>
                {currencySymbol}
                {result.totalHigh.toLocaleString()}
              </div>
              <div className="mt-2 text-sm text-ink-500">
                before any beneficiary receives a dollar of inheritance.
              </div>

              <hr className="my-6 border-ink-200" />

              <ul className="space-y-4">
                {result.lines.map((line, i) => (
                  <li key={i} className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="text-[15px] font-medium text-navy-900">{line.label}</div>
                      {line.note && (
                        <div className="mt-0.5 text-xs text-ink-500">{line.note}</div>
                      )}
                    </div>
                    <div className="whitespace-nowrap font-serif text-lg text-navy-900">
                      {currencySymbol}
                      {line.amountLow.toLocaleString()}
                      {line.amountLow !== line.amountHigh && (
                        <>
                          <span className="text-ink-500"> &ndash; </span>
                          {currencySymbol}
                          {line.amountHigh.toLocaleString()}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/guides"
                className="rounded-2xl border-2 border-sage-300 bg-sage-100/40 p-6 shadow-soft transition-colors hover:border-sage-500"
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-sage-700">
                  Reduce this number
                </div>
                <div className="font-serif text-lg text-navy-900">
                  Read the essential-document guides →
                </div>
              </Link>
              <Link
                href="/register"
                className="rounded-2xl border-2 border-accent-300 bg-accent-100/60 p-6 shadow-soft transition-colors hover:border-accent-500"
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-700">
                  Get organized
                </div>
                <div className="font-serif text-lg text-navy-900">
                  Register for LegacyVault — free →
                </div>
              </Link>
            </div>

            {/* Disclaimer */}
            <div className="mt-8 text-xs text-ink-500">{result.disclaimer}</div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function PublicNav() {
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
          <Link href="/guides" className="text-sm text-navy-700 hover:text-navy-900">
            Guides
          </Link>
          <Link
            href="/calculators/cost-of-dying"
            className="text-sm font-medium text-navy-900 hover:text-navy-700"
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
      </div>
    </footer>
  );
}
