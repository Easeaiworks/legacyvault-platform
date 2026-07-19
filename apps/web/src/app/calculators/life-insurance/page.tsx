'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FlagToggle } from '@/components/flag-toggle';

// DIME method: Debt + Income (× replacement years) + Mortgage + Education
// Universal math with jurisdiction-flavored copy.

export default function LifeInsurancePage() {
  const [income, setIncome] = useState(100000);
  const [replacementYears, setReplacementYears] = useState(12);
  const [mortgage, setMortgage] = useState(300000);
  const [otherDebt, setOtherDebt] = useState(20000);
  const [numKids, setNumKids] = useState(2);
  const [costPerChild, setCostPerChild] = useState(120000);
  const [existingCoverage, setExistingCoverage] = useState(150000);
  const [liquidSavings, setLiquidSavings] = useState(50000);

  const calc = useMemo(() => {
    const income_component = income * replacementYears * 0.7; // after-tax approx
    const debt = mortgage + otherDebt;
    const education = numKids * costPerChild;
    const gross = income_component + debt + education;
    const netNeeded = Math.max(0, gross - existingCoverage - liquidSavings);
    // Round up to nearest $100k
    const rounded = Math.ceil(netNeeded / 100000) * 100000;
    return { income_component, debt, education, gross, netNeeded, rounded };
  }, [
    income,
    replacementYears,
    mortgage,
    otherDebt,
    numKids,
    costPerChild,
    existingCoverage,
    liquidSavings,
  ]);

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
            Life insurance need estimator
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            How much life insurance do you actually need?
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-700">
            The DIME method: <strong>D</strong>ebt + <strong>I</strong>ncome replacement +{' '}
            <strong>M</strong>ortgage + <strong>E</strong>ducation costs. Simple, honest, and used
            by fee-only planners.
          </p>
        </div>
      </section>

      <section className="bg-paper px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[380px_1fr]">
          {/* Inputs */}
          <div className="space-y-5 rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft">
            <NumberField
              label="Your annual income (before tax)"
              value={income}
              onChange={setIncome}
              prefix="$"
              step={5000}
            />
            <NumberField
              label="Years of income to replace"
              value={replacementYears}
              onChange={setReplacementYears}
              min={0}
              max={30}
              suffix="years"
            />
            <NumberField
              label="Mortgage balance"
              value={mortgage}
              onChange={setMortgage}
              prefix="$"
              step={10000}
            />
            <NumberField
              label="Other debt (loans, credit cards)"
              value={otherDebt}
              onChange={setOtherDebt}
              prefix="$"
              step={1000}
            />
            <NumberField
              label="Number of children"
              value={numKids}
              onChange={setNumKids}
              min={0}
              max={10}
            />
            <NumberField
              label="Education cost per child"
              value={costPerChild}
              onChange={setCostPerChild}
              prefix="$"
              step={10000}
            />
            <NumberField
              label="Existing life insurance coverage"
              value={existingCoverage}
              onChange={setExistingCoverage}
              prefix="$"
              step={10000}
            />
            <NumberField
              label="Liquid savings your family could use"
              value={liquidSavings}
              onChange={setLiquidSavings}
              prefix="$"
              step={5000}
            />
          </div>

          {/* Results */}
          <div>
            <div className="rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft">
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-700">
                Recommended coverage
              </div>
              <div className="mt-2 font-serif text-6xl font-medium tracking-tight text-navy-900">
                ${calc.rounded.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-ink-500">
                Rounded up from a raw calculation of ${Math.round(calc.netNeeded).toLocaleString()}
              </div>

              <hr className="my-6 border-ink-200" />

              <dl className="space-y-3 text-sm">
                <Row label="Income replacement (0.7 × income × years)" value={calc.income_component} />
                <Row label="Mortgage + other debt" value={calc.debt} />
                <Row label="Education for kids" value={calc.education} />
                <hr className="border-ink-200" />
                <Row label="Gross need" value={calc.gross} bold />
                <Row label="− Existing coverage" value={-existingCoverage} />
                <Row label="− Liquid savings" value={-liquidSavings} />
                <hr className="border-ink-200" />
                <Row label="Net need" value={calc.netNeeded} bold />
              </dl>
            </div>

            {/* CTAs */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/guides/how-much-life-insurance"
                className="rounded-2xl border-2 border-sage-300 bg-sage-100/40 p-6 shadow-soft transition-colors hover:border-sage-500"
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-sage-700">
                  Read the essay
                </div>
                <div className="font-serif text-lg text-navy-900">
                  How much life insurance you actually need →
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
                  Find an independent broker →
                </div>
              </Link>
            </div>

            <p className="mt-8 text-xs text-ink-500">
              Educational estimate only. The DIME method is a widely-used starting point, not a
              precise number for your situation. An independent broker will refine this based on
              your health, age, tax bracket, and specific family goals. Not tax or financial
              advice.
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

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        {prefix && <span className="text-lg text-ink-700">{prefix}</span>}
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            const bounded = max != null ? Math.min(max, Math.max(min, v)) : Math.max(min, v);
            onChange(bounded);
          }}
          className="w-full rounded-md border border-ink-300 bg-paper px-3 py-2.5 text-sm text-navy-900"
        />
        {suffix && <span className="text-sm text-ink-500">{suffix}</span>}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const cls = bold ? 'font-serif text-lg font-medium text-navy-900' : 'text-navy-900';
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-700">{label}</dt>
      <dd className={cls}>
        {value < 0 ? '−' : ''}${Math.abs(Math.round(value)).toLocaleString()}
      </dd>
    </div>
  );
}
