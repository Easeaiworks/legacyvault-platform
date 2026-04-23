import Link from 'next/link';
import Image from 'next/image';
import { PendingReviewBadge } from '@/components/pending-review-badge';

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="border-b border-ink-200 bg-ink-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-serif text-xl tracking-tight text-navy-900">
            LegacyVault
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/for-professionals" className="text-sm text-navy-700 hover:text-navy-900">
              For professionals
            </Link>
            <Link href="/login" className="text-sm text-navy-700 hover:text-navy-900">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-navy-900"
            >
              Register — it&apos;s free
            </Link>
          </div>
        </div>
      </nav>

      {/* REGISTRY HERO — first impression */}
      <section className="bg-gradient-to-b from-ink-50 to-ink-100 px-6 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div className="text-left">
            <div className="mb-4 inline-block rounded-full bg-accent-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-accent-700">
              Free registration · Identity-verified · You control visibility
            </div>
            <h1 className="font-serif text-5xl leading-tight text-navy-900 md:text-6xl">
              Register yourself.
              <br />
              <span className="text-accent-700">Then plan your legacy.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-500">
              LegacyVault starts with a free, identity-verified registration. That&apos;s your key
              to the full platform: secure estate planning, document vault, beneficiary management,
              and trusted-contact controls. You&apos;re in charge of every piece of it.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="rounded-md bg-navy-700 px-6 py-3 font-medium text-ink-50 hover:bg-navy-900"
              >
                Register for free
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-md border border-ink-300 px-6 py-3 font-medium text-navy-900 hover:bg-ink-100"
              >
                How it works
              </Link>
            </div>
            <p className="mt-6 max-w-xl text-sm text-ink-500">
              Registration is always free. Paid plans unlock the full estate-planning workspace —
              detail below.
            </p>
          </div>

          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-ink-200 md:aspect-[4/5]">
            <Image
              src="https://images.pexels.com/photos/8260452/pexels-photo-8260452.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="A mother and her daughter stand together in their kitchen — the people you plan for."
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/60 to-transparent p-4 text-xs text-ink-50/90">
              Photo: Tiger Lily on Pexels
            </div>
          </div>
        </div>
      </section>

      {/* What's included free vs. paid */}
      <section id="how-it-works" className="border-t border-ink-200 bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-serif text-3xl text-navy-900">What you get</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <Tier
              price="Free"
              name="Registry"
              tag="Everyone"
              items={[
                'Identity-verified listing',
                'You control who can find you',
                'Notifications if anyone ever searches for you',
                'Full audit log of all queries',
                'Opt-out anytime — permanent',
                'Access to the LegacyVault app suite',
              ]}
              cta={{ label: 'Register now', href: '/register' }}
            />
            <Tier
              price="From $8 / month"
              name="LegacyVault"
              tag="For planners"
              items={[
                'Encrypted asset inventory',
                'Document vault with E2E encryption',
                'Beneficiary management with conflict detection',
                'Trusted-contact dead-man\'s-switch',
                'Letters and wishes',
                'Estate-binder PDF export',
                'US (401k/IRA) + Canadian (RRSP/TFSA) coverage',
              ]}
              cta={{ label: 'See the app', href: '/signup' }}
              highlight
            />
          </div>
        </div>
      </section>

      {/* The "added value" pending legal review */}
      <section className="bg-ink-50 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center font-serif text-2xl text-navy-900">
            Why register at all?
          </h2>
          <div className="space-y-4 text-ink-700">
            <p>
              The registry is a safeguard. By verifying your identity once and controlling who can
              find you, you make it dramatically easier for the right people — attorneys
              administering an estate, verified institutions, or family members — to reach you
              when it matters.
            </p>
            <p>
              Nothing in this page promises outcomes, matching, or money recovery. The registry is
              a trust layer; the value we&apos;re designing on top of it is described below and is
              not live until legal counsel has reviewed every claim.
            </p>
          </div>

          <div className="mt-8">
            <PendingReviewBadge>
              <strong>Being designed:</strong> once counsel approves, registered users may be
              notified if a verified institution or estate attorney searches for a person matching
              their identity — for example, during probate of an estranged relative or when a
              dormant account is being investigated. We&apos;re not claiming this happens today,
              and we will not charge consumers for registration to enable it. This section is
              intentionally shown in draft for attorney review.
            </PendingReviewBadge>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-white px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <Feature
            title="Bank-grade security"
            body="AES-256 field-level encryption, SOC 2 ready, immutable audit log. Your data is yours."
          />
          <Feature
            title="US & Canada aware"
            body="Purpose-built for RRSPs, TFSAs, 401(k)s, IRAs, and every asset type that matters."
          />
          <Feature
            title="Dead-man's switch"
            body="Trusted contacts gain access only when they need it, only with your permission, only after the waiting period you set."
          />
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-ink-50 py-10 text-center text-sm text-ink-500">
        © {new Date().getFullYear()} LegacyVault. Not a law firm. Not a financial advisor.
        <br />
        Registration is free for consumers. Paid features are priced as described above.
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
      className={`rounded-lg border-2 p-8 ${
        highlight ? 'border-navy-700 bg-navy-700/5' : 'border-ink-200 bg-white'
      }`}
    >
      <div className="mb-1 text-xs uppercase tracking-wider text-ink-500">{tag}</div>
      <div className="mb-1 font-serif text-2xl text-navy-900">{name}</div>
      <div className="mb-6 font-serif text-3xl text-navy-900">{price}</div>
      <ul className="mb-6 space-y-2 text-sm text-ink-700">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-accent-700">✓</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`block rounded-md px-4 py-2 text-center font-medium ${
          highlight
            ? 'bg-navy-700 text-ink-50 hover:bg-navy-900'
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
      <h3 className="font-serif text-xl text-navy-900">{title}</h3>
      <p className="mt-2 text-ink-500">{body}</p>
    </div>
  );
}
