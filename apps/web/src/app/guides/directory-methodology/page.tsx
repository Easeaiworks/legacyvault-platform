import Link from 'next/link';
import { FlagToggle } from '@/components/flag-toggle';

export default function DirectoryMethodology() {
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

      <section className="bg-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            The methodology, published
          </div>
          <h1 className="mb-6 font-serif text-5xl font-medium tracking-tight text-navy-900">
            How we vet the directory.
          </h1>
          <div className="prose-guide">
            <p>
              The provider directory is our attempt to give you an honest starting point without
              becoming yet another lead-generation site that sells the top spot to whoever pays
              most. Here&apos;s exactly what we look at, and where we&apos;re still building.
            </p>

            <h2>What we look at</h2>

            <h3>Lawyers</h3>
            <ul>
              <li>
                <strong>Active bar admission verified</strong> via state bar / provincial law
                society registry, with a link on every profile so you can verify current standing
                yourself.
              </li>
              <li>
                <strong>Estate planning as a stated specialty</strong> — not a general
                practitioner who does a bit of everything.
              </li>
              <li>
                <strong>5+ years experience</strong> in estate work.
              </li>
              <li>
                <strong>Referral services from official bodies rank higher</strong> than individual
                practitioners in the launch set. The State Bar of Illinois has more accountability
                for its referrals than any individual firm.
              </li>
            </ul>

            <h3>Financial planners</h3>
            <ul>
              <li>
                <strong>Fee-only status verified</strong> via NAPFA (US) or Advocis / FP Canada
                membership.
              </li>
              <li>
                <strong>Fiduciary standard confirmed</strong> — legally required to put your
                interests first.
              </li>
              <li>
                <strong>CFP or equivalent designation.</strong>
              </li>
              <li>
                <strong>No commission-based compensation.</strong> Advisors paid by product
                companies are not in this directory.
              </li>
            </ul>

            <h3>Will services</h3>
            <ul>
              <li>
                <strong>BBB rating A- or higher</strong> (US) or no Consumer Reports flags.
              </li>
              <li>
                <strong>Google review floor of 4.2.</strong>
              </li>
              <li>
                <strong>Transparent pricing on their site</strong> — no bait and switch.
              </li>
              <li>
                <strong>Available in the user&apos;s jurisdiction.</strong> Online services cover
                different states/provinces.
              </li>
            </ul>

            <h3>Insurance advisors</h3>
            <ul>
              <li>
                <strong>Independent (not captive)</strong> — brokers who shop across multiple
                carriers, not agents locked to a single company.
              </li>
              <li>
                <strong>Licensed in the user&apos;s jurisdiction.</strong>
              </li>
              <li>
                <strong>Fee disclosure available.</strong>
              </li>
            </ul>

            <h2>What we deliberately don&apos;t do</h2>

            <p>
              <strong>No affiliate fees at launch.</strong> Every link goes through a plain
              redirect. We&apos;re not paid when you click.
            </p>

            <p>
              <strong>No paid placement.</strong> Ranking is entirely by public signals + our
              own priority weights, all of which are documented above.
            </p>

            <p>
              <strong>No fake five-star reviews.</strong> We don&apos;t generate reviews.
            </p>

            <p>
              <strong>No sponsored badges disguised as verification.</strong> If we ever accept
              affiliate arrangements post-launch, sponsored listings will carry a labelled{' '}
              <em>SPONSORED</em> badge per FTC (US) and Competition Bureau (Canada) guidelines.
            </p>

            <h2>Where we&apos;re still building</h2>

            <p>
              <strong>Individual local attorneys and financial planners</strong> — we don&apos;t
              yet list individual practitioners by name. Verifying every attorney or planner
              individually against our criteria is a manual, ongoing process. The launch directory
              deliberately favors official referral services from state bars, provincial law
              societies, NAPFA, and CFP boards — those bodies have already done the vetting and
              maintain it over time.
            </p>

            <p>
              As we grow, we&apos;ll add individual practitioners with clear verification metadata
              on each profile (bar admission date, disciplinary history check date, fee disclosure
              on file, etc.). We&apos;d rather have a small vetted directory than a big
              unaccountable one.
            </p>

            <h2>How to flag an error</h2>

            <p>
              If you see a listing you believe is inaccurate or misleading — a fee-only advisor
              actually taking commissions, a bar-admitted lawyer no longer in good standing, an
              online service that&apos;s degraded — please email us. We take these seriously and
              will unpublish anything that fails re-verification.
            </p>

            <h2>The philosophy</h2>

            <p>
              Trust in this space is a currency we can&apos;t print more of once we&apos;ve spent
              it. We&apos;d rather ship a smaller directory that&apos;s actually honest than a
              bigger one that quietly boosts whoever pays. That&apos;s worth doing even if it takes
              longer to grow.
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
