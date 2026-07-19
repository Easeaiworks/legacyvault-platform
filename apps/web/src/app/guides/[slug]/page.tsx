import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getGuide, listAllSlugs, type Country, type WithoutWith } from '@/lib/guides';
import { FlagToggle } from '@/components/flag-toggle';

export async function generateStaticParams() {
  return listAllSlugs().map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const country = await readCountryFromCookies();
  const guide = getGuide(slug, country);
  if (!guide) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      {/* Hero */}
      <article>
        <header className="border-b border-ink-200 bg-paper px-6 pt-16 pb-14">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/guides"
              className="mb-6 inline-block text-sm text-navy-700 hover:text-navy-900"
            >
              ← All guides
            </Link>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
              {country === 'CA' ? 'Canada' : 'United States'} · {guide.readTimeMinutes}-minute
              read
            </div>
            <h1 className="font-serif text-5xl font-medium leading-tight tracking-tight text-navy-900 md:text-6xl">
              {guide.title}
            </h1>
            {guide.subtitle && (
              <p className="mt-4 text-xl text-ink-700">{guide.subtitle}</p>
            )}
          </div>
        </header>

        {/* WITHOUT/WITH table */}
        {guide.withoutWith && (
          <section className="border-b border-ink-200 bg-paper-warm px-6 py-14">
            <div className="mx-auto max-w-4xl">
              <WithoutWithTable data={guide.withoutWith} />
            </div>
          </section>
        )}

        {/* Body */}
        <section className="bg-paper px-6 py-16">
          <div className="prose-guide mx-auto max-w-3xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {guide.bodyMarkdown}
            </ReactMarkdown>
          </div>
        </section>

        {/* Scenario callout */}
        {guide.scenario && (
          <section className="border-y border-ink-200 bg-paper-warm px-6 py-14">
            <div className="mx-auto max-w-3xl">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
                A scenario we see
              </div>
              <blockquote className="border-l-4 border-accent-500 bg-paper p-6 font-serif text-lg italic leading-relaxed text-ink-900 shadow-soft">
                {guide.scenario}
              </blockquote>
            </div>
          </section>
        )}

        {/* CTAs */}
        <section className="bg-paper px-6 py-14">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {guide.nextInApp && (
              <div className="rounded-2xl border-2 border-sage-300 bg-sage-100/40 p-8 shadow-soft">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-sage-700">
                  What to do next in LegacyVault
                </div>
                <div className="mb-6 font-serif text-xl text-navy-900">
                  {guide.nextInApp.label}
                </div>
                <Link
                  href={guide.nextInApp.href}
                  className="inline-block rounded-md bg-navy-700 px-6 py-3 text-sm font-medium text-paper hover:bg-navy-900"
                >
                  Go to your vault →
                </Link>
              </div>
            )}
            {guide.professionalCta && (
              <div className="rounded-2xl border-2 border-accent-300 bg-accent-100/60 p-8 shadow-soft">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-700">
                  When to hire a professional
                </div>
                <div className="mb-6 font-serif text-xl text-navy-900">
                  {guide.professionalCta.label}
                </div>
                <Link
                  href={guide.professionalCta.href}
                  className="inline-block rounded-md border border-navy-700 px-6 py-3 text-sm font-medium text-navy-900 hover:bg-navy-700 hover:text-paper"
                >
                  See the directory →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="bg-paper-warm px-6 py-10">
          <div className="mx-auto max-w-3xl text-center text-sm text-ink-500">
            LegacyVault does not provide legal, financial, or tax advice. This is educational
            content, not a substitute for advice from a qualified attorney, financial planner, or
            accountant licensed in your jurisdiction. Estate planning laws vary by
            {country === 'CA' ? ' province' : ' state'}. Consult a professional for advice
            specific to your situation.
          </div>
        </section>
      </article>

      <PublicFooter />
    </div>
  );
}

function WithoutWithTable({ data }: { data: WithoutWith }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-200 bg-paper shadow-soft">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_1fr]">
        {/* Header */}
        <div className="border-b border-ink-200 bg-paper p-6 font-serif text-lg font-medium text-ink-500">
          {data.document}
        </div>
        <div className="border-b border-ink-200 bg-terracotta-100 p-6 font-serif text-lg font-medium text-terracotta-700">
          WITHOUT this document
        </div>
        <div className="border-b border-ink-200 bg-sage-100 p-6 font-serif text-lg font-medium text-sage-700">
          WITH this document
        </div>

        {/* What happens */}
        <div className="border-b border-ink-200 bg-ink-50 px-6 py-5 text-xs font-semibold uppercase tracking-widest text-ink-500">
          What happens
        </div>
        <div className="border-b border-ink-200 bg-terracotta-100/25 p-6 text-[15px] leading-relaxed text-ink-700">
          {data.without.what}
        </div>
        <div className="border-b border-ink-200 bg-sage-100/25 p-6 text-[15px] leading-relaxed text-ink-700">
          {data.with.what}
        </div>

        {/* Cost */}
        <div className="border-b border-ink-200 bg-ink-50 px-6 py-5 text-xs font-semibold uppercase tracking-widest text-ink-500">
          Estimated cost
        </div>
        <div className="border-b border-ink-200 bg-terracotta-100/25 p-6 text-[15px] leading-relaxed text-ink-700">
          {data.without.cost}
        </div>
        <div className="border-b border-ink-200 bg-sage-100/25 p-6 text-[15px] leading-relaxed text-ink-700">
          {data.with.cost}
        </div>

        {/* Timeline */}
        <div className="bg-ink-50 px-6 py-5 text-xs font-semibold uppercase tracking-widest text-ink-500">
          Timeline
        </div>
        <div className="bg-terracotta-100/25 p-6 text-[15px] leading-relaxed text-ink-700">
          {data.without.timeline}
        </div>
        <div className="bg-sage-100/25 p-6 text-[15px] leading-relaxed text-ink-700">
          {data.with.timeline}
        </div>
      </div>
    </div>
  );
}

async function readCountryFromCookies(): Promise<Country> {
  const c = await cookies();
  const v = c.get('lv_country')?.value;
  return v === 'CA' ? 'CA' : 'US';
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
          <Link
            href="/guides"
            className="text-sm text-navy-700 hover:text-navy-900"
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
      </div>
    </footer>
  );
}
