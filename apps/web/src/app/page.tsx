import Link from 'next/link';
import Image from 'next/image';
import { PendingReviewBadge } from '@/components/pending-review-badge';
import { FlagToggle } from '@/components/flag-toggle';

export default function Home() {
  return (
    <main className="min-h-screen bg-paper">
      {/* NAV */}
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
              href="/for-professionals"
              className="hidden text-sm text-navy-700 hover:text-navy-900 sm:inline"
            >
              For professionals
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

      {/* HERO */}
      <section className="border-b border-ink-200 bg-paper px-6 py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
          <div className="text-left">
            <div className="mb-6 inline-block rounded-full bg-accent-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-700">
              Free registration · Identity-verified · You control visibility
            </div>
            <h1 className="font-serif text-5xl font-medium leading-[1.02] tracking-tight text-navy-900 md:text-7xl">
              Register yourself.
              <br />
              <span className="text-accent-700">Then plan your legacy.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-700">
              Estate planning that meets you where you live — Canada and the United States,
              jurisdiction-aware from the first click. Wills, powers of attorney, beneficiary
              audits, and everything your family will need to find.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="rounded-md bg-navy-700 px-7 py-3.5 text-base font-medium text-paper transition-colors hover:bg-navy-900"
              >
                Get started free
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-md border border-ink-300 px-7 py-3.5 text-base font-medium text-navy-900 transition-colors hover:bg-ink-100"
              >
                How it works
              </Link>
            </div>
            <p className="mt-6 max-w-xl text-sm text-ink-500">
              Registration is always free. Full estate workspace from $12/month.
            </p>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-raised ring-1 ring-ink-200">
            <Image
              src="https://images.pexels.com/photos/8260452/pexels-photo-8260452.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="A mother and her daughter stand together in their kitchen — the people you plan for."
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/60 to-transparent p-4 text-xs text-paper/90">
              Photo: Tiger Lily on Pexels
            </div>
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section id="how-it-works" className="border-b border-ink-200 bg-paper-warm px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-accent-700">
            What you get
          </div>
          <h2 className="mb-16 text-center font-serif text-4xl font-medium text-navy-900">
            Two ways to protect your people.
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Tier
              price="Free"
              name="Registry"
              tag="Everyone"
              items={[
                'Identity-verified listing',
                'You control who can find you',
                'Notifications if anyone ever searches for you',
                'Full audit log of every query',
                'Opt-out anytime — permanent',
                'Access to the LegacyVault workspace',
              ]}
              cta={{ label: 'Register now', href: '/register' }}
            />
            <Tier
              price="From $12 / month"
              name="LegacyVault"
              tag="For planners"
              items={[
                'Encrypted asset inventory',
                'Document vault with field-level encryption',
                'Beneficiary audit (catches out-of-date designations)',
                'Trusted-contact dead-man\'s-switch',
                'Letters, messages, and funeral wishes',
                'Estate-binder PDF export',
                'Bi-national coverage — US 401(k)/IRA + Canadian RRSP/TFSA',
              ]}
              cta={{ label: 'See the app', href: '/signup' }}
              highlight
            />
          </div>
        </div>
      </section>

      {/* WHY REGISTER */}
      <section className="border-b border-ink-200 bg-paper px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-accent-700">
            The registry, honestly
          </div>
          <h2 className="mb-8 text-center font-serif text-3xl font-medium text-navy-900">
            Why register at all?
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-ink-700">
            <p>
              The registry is a safeguard. By verifying your identity once and controlling who
              can find you, you make it dramatically easier for the right people &mdash;
              attorneys administering an estate, verified institutions, or family members
              &mdash; to reach you when it matters.
            </p>
            <p>
              Nothing on this page promises outcomes, matching, or money recovery. The registry
              is a trust layer; the value we&apos;re designing on top of it is described below
              and is not live until legal counsel has reviewed every claim.
            </p>
          </div>

          <div className="mt-10">
            <PendingReviewBadge>
              <strong>Being designed:</strong> once counsel approves, registered users may be
              notified if a verified institution or estate attorney searches for a person
              matching their identity &mdash; for example, during probate of an estranged
              relative or when a dormant account is being investigated. We&apos;re not claiming
              this happens today, and we will not charge consumers for registration to enable
              it. This section is intentionally shown in draft for attorney review.
            </PendingReviewBadge>
          </div>
        </div>
      </section>

      {/* FEATURES ROW */}
      <section className="border-b border-ink-200 bg-paper-warm px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          <Feature
            title="Bank-grade security"
            body="AES-256 field-level encryption, SOC 2 ready, immutable audit log. Your data stays yours."
          />
          <Feature
            title="US & Canada aware"
            body="Purpose-built for RRSPs, TFSAs, 401(k)s, IRAs, and every asset type that matters — jurisdiction picks up automatically."
          />
          <Feature
            title="Dead-man's switch"
            body="Trusted contacts gain access only when they need it, only with your permission, only after the waiting period you set."
          />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-navy-900 py-16 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <div className="font-serif text-4xl font-medium tracking-tight text-paper">
            Take good care.
          </div>
          <div className="mt-3 text-sm text-ink-300">
            The trust layer beneath everything you&apos;ll leave behind.
          </div>
          <div className="mt-10 text-xs text-ink-500">
            &copy; {new Date().getFullYear()} LegacyVault. Not a law firm. Not a financial
            advisor. Registration is free for consumers.
          </div>
        </div>
      </footer>
    </main>
  );
}

function Tier({
  price,
  name,
  tag,
  items,
  cta,
  highlight,
}: {
  price: string;
  name: string;
  tag: string;
  items: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 shadow-soft transition-all ${
        highlight
          ? 'border-navy-700 bg-paper ring-1 ring-navy-700/10'
          : 'border-ink-200 bg-paper'
      }`}
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-500">
        {tag}
      </div>
      <div className="mb-2 font-serif text-2xl font-medium text-navy-900">{name}</div>
      <div className="mb-8 font-serif text-4xl font-medium text-navy-900">{price}</div>
      <ul className="mb-8 space-y-3 text-[15px] text-ink-700">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-1 text-accent-700">✓</span>
            <span className="leading-snug">{i}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`block rounded-md px-4 py-3 text-center text-sm font-medium transition-colors ${
          highlight
            ? 'bg-navy-700 text-paper hover:bg-navy-900'
            : 'border border-ink-300 text-navy-900 hover:bg-ink-100'
        }`}
      >
        {cta.label}
      </Link>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-serif text-xl font-medium text-navy-900">{title}</h3>
      <p className="mt-3 leading-relaxed text-ink-700">{body}</p>
    </div>
  );
}
