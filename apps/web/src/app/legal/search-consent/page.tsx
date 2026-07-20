import Link from 'next/link';
import { FlagToggle } from '@/components/flag-toggle';

export const metadata = {
  title: 'Unclaimed-asset search consent — LegacyVault',
  description:
    'The consent framework for searching public unclaimed-property registries on behalf of you and your deceased relatives.',
};

export default function SearchConsentPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Legal
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            Unclaimed-asset search consent
          </h1>
          <p className="mt-4 text-sm text-ink-500">
            Last updated: July 20, 2026 · Draft — awaiting final counsel review
          </p>
        </div>
      </section>

      <section className="bg-paper px-6 py-14">
        <article className="prose mx-auto max-w-3xl text-ink-900">
          <p className="text-lg text-ink-700">
            This document explains what happens when you ask LegacyVault to search for unclaimed
            assets that may be owed to you or to the estate of a deceased relative. Before we
            run any search on your behalf, we require you to affirmatively consent to the terms
            below.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">1. What we search</h2>
          <p>
            When you consent to unclaimed-asset search and provide information about a deceased
            relative (or about yourself), we may query the following public registries where you
            or the deceased relative may have had connection:
          </p>

          <h3 className="mt-4 font-serif text-lg text-navy-900">United States</h3>
          <ul>
            <li>MissingMoney.com (participating US states and provinces)</li>
            <li>Individual state unclaimed-property databases (all 50 states)</li>
            <li>Pension Benefit Guaranty Corporation (PBGC) missing participant search</li>
            <li>Federal Deposit Insurance Corporation (FDIC) unclaimed funds</li>
            <li>US Treasury Hunt (savings bonds)</li>
            <li>National Association of Insurance Commissioners (NAIC) life insurance policy locator</li>
            <li>Social Security Administration Death Master File (limited-access commercial version, for identity verification and death confirmation only)</li>
            <li>Department of Veterans Affairs benefits lookup (with military-service authorization)</li>
          </ul>

          <h3 className="mt-4 font-serif text-lg text-navy-900">Canada</h3>
          <ul>
            <li>Bank of Canada unclaimed balances registry</li>
            <li>Provincial unclaimed-property programs (Alberta, BC, Quebec)</li>
            <li>Canada Revenue Agency uncashed cheque lookup</li>
            <li>Veterans Affairs Canada death and disability benefits</li>
            <li>Employment and Social Development Canada — Canada Pension Plan / Old Age Security</li>
            <li>Provincial WSIB / WCB registries where applicable</li>
          </ul>

          <p>
            This list is not exhaustive; new registries may be added over time. You will be
            notified before we add any new source that requires additional information from you.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">2. What we do with the information you provide</h2>
          <p>Information you provide about a deceased relative may include:</p>
          <ul>
            <li>Legal names (including prior names and maiden names)</li>
            <li>Dates of birth and death</li>
            <li>Last known residence and previous addresses</li>
            <li>Employers</li>
            <li>Financial institutions used</li>
            <li>Last four digits of SSN (US) or SIN (Canada), and optionally the full SSN (US) for federal death-record matching</li>
          </ul>
          <p>
            We use this information solely to construct queries against the registries above and
            to match returned results. We do not share deceased-relative information with any
            third party except (a) the registry being queried, (b) legal counsel we engage on
            your behalf (only if you request it), and (c) as required by law.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">3. Your representation</h2>
          <p>By consenting to searches on behalf of a deceased relative, you represent that:</p>
          <ul>
            <li>You have a legitimate familial or legal relationship to the deceased relative;</li>
            <li>You are entitled, under the laws of your jurisdiction, to receive information about assets in that person's name (typically as an heir, executor, or immediate family member);</li>
            <li>The information you have provided is accurate to the best of your knowledge;</li>
            <li>You will not use search results to make fraudulent claims.</li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">4. Search results and next steps</h2>
          <p>
            If we identify a potential match, we will notify you with the details we have
            (institution name, approximate value if disclosed, filing deadline if any) and any
            documentation the paying registry requires. In most cases, LegacyVault will not
            claim the asset on your behalf — the claim is filed by you or your estate's
            representative directly with the registry.
          </p>
          <p>
            Where we do assist with a claim (e.g., matching multiple relatives, coordinating
            with an executor, or engaging counsel), our fees will be disclosed in writing before
            any work begins, and in no case will fees exceed the statutory caps set by the
            jurisdiction in question. In Alberta, heir-finder fees are capped by the Unclaimed
            Personal Property and Vested Property Act; we comply with that cap for any
            Alberta-based assets.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">5. No guarantees</h2>
          <p>
            Search is a best-effort service. Registries update at their own pace; some assets
            never appear in a searchable registry; some matches are ambiguous and require
            verification we cannot perform on your behalf. We make no representation or warranty
            that any particular search will find any particular asset, that reported matches
            will be paid, or that any specific amount will result.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">6. Your right to revoke consent</h2>
          <p>
            You may revoke your consent to searches at any time from your account settings. On
            revocation, we will stop running new searches and will delete deceased-relative
            records within 30 days on your request. Records may be retained where necessary to
            complete a claim already in progress or where retention is required by law.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">7. Jurisdictional notes</h2>
          <p>
            Heir-finder and asset-recovery services are regulated differently in different
            jurisdictions. Notable examples:
          </p>
          <ul>
            <li><strong>Alberta:</strong> Statutory cap on heir-finder fees; disclosure requirements before any fee agreement is binding.</li>
            <li><strong>California:</strong> Heir-finder contracts must be in writing; fee caps for property under specific thresholds.</li>
            <li><strong>Texas, Illinois, and New York:</strong> Specific statutory requirements for heir-finder registrations and disclosures.</li>
            <li><strong>Quebec:</strong> Heir-finder activities may be subject to notarial practice requirements; we work with a Quebec-licensed notary for any Quebec matter.</li>
          </ul>
          <p>
            We operate only in compliance with all licensing and disclosure requirements
            applicable to your jurisdiction. If we are unable to lawfully operate a search in
            your jurisdiction, we will not run the search and will notify you.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">8. Contact</h2>
          <p>
            Questions about search consent or to withdraw consent:{' '}
            <Link href="mailto:search@legacyvault.app" className="underline">
              search@legacyvault.app
            </Link>
          </p>

          <div className="mt-16 rounded-lg border border-terracotta-300 bg-terracotta-100/40 p-6 text-sm">
            <strong>Draft notice.</strong> This document is a working draft prepared in-house.
            It has not been reviewed by external counsel with heir-finder-licensing expertise;
            jurisdiction-specific fee caps and disclosure requirements will be verified with
            counsel in each state and province before we operate a fee-based search product in
            that jurisdiction.
          </div>
        </article>
      </section>

      <PublicFooter />
    </div>
  );
}

function PublicNav() {
  return (
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
      </div>
    </footer>
  );
}
