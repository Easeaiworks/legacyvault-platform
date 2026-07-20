import Link from 'next/link';
import { FlagToggle } from '@/components/flag-toggle';

export const metadata = {
  title: 'Terms of Service — LegacyVault',
  description:
    'The terms that govern your use of LegacyVault. Written in plain English; reviewed by counsel; last updated July 2026.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Legal
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-ink-500">
            Last updated: July 20, 2026 · Draft — awaiting final counsel review
          </p>
        </div>
      </section>

      <section className="bg-paper px-6 py-14">
        <article className="prose mx-auto max-w-3xl text-ink-900">
          <p className="text-lg text-ink-700">
            These Terms govern your use of LegacyVault (&quot;the Service&quot;), operated by
            LegacyVault Inc. (&quot;LegacyVault,&quot; &quot;we,&quot; or &quot;us&quot;). By
            creating an account or using the Service, you agree to these Terms. If you do not
            agree, do not use the Service.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">1. Who we are</h2>
          <p>
            LegacyVault is a digital estate-planning platform providing document storage, asset
            inventory, credential vaulting, education, and unclaimed-asset search services for
            residents of the United States and Canada. We are not a law firm, a licensed
            financial advisor, an accountant, or an insurance agent. Nothing on the Service is
            legal, tax, financial, or investment advice.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">2. Account eligibility</h2>
          <p>
            You must be at least 18 years old and a resident of the United States or Canada to
            create an account. You must provide accurate, current information. You are
            responsible for maintaining the confidentiality of your password and for all activity
            under your account. Notify us immediately of any unauthorized access.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">3. What the Service does</h2>
          <p>The Service allows you to:</p>
          <ul>
            <li>Store documents, contacts, and asset information in your personal vault;</li>
            <li>Store credentials in a zero-knowledge vault we cannot decrypt;</li>
            <li>Designate trusted contacts and executors who may access defined portions of your vault under specified conditions;</li>
            <li>Read educational content about estate planning topics;</li>
            <li>Use calculators to estimate costs, insurance needs, and retirement projections;</li>
            <li>Optionally, request that we search public unclaimed-property databases and monitor for heir-search notices related to deceased relatives you identify.</li>
          </ul>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">4. What the Service is NOT</h2>
          <p>
            The Service does not draft, review, execute, witness, or notarize legal documents.
            It does not file documents with courts, provincial or state registries, or any other
            authority. It does not provide personalized legal, tax, financial, insurance, or
            investment advice. We do not act as your fiduciary. Nothing you read on the Service
            creates an attorney-client, accountant-client, financial-advisor-client, or
            fiduciary relationship between you and us.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">5. Your content and ownership</h2>
          <p>
            You retain all rights to the content you upload — documents, notes, credentials,
            asset information, and messages. You grant us a limited license to store, back up,
            and process that content solely for the purpose of providing the Service to you.
          </p>
          <p>
            We do not sell your content. We do not use your content to train machine-learning
            models. We do not share your content with third parties except (a) with subprocessors
            listed in our Privacy Policy, (b) with parties you explicitly authorize, (c) in
            response to valid legal process, or (d) to protect the safety of any person.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">6. Security and encryption</h2>
          <p>
            We use AES-256 encryption for data at rest and TLS 1.2+ for data in transit.
            Credentials stored in the credential vault are encrypted client-side with a key
            derived from your master password using PBKDF2-SHA256 with 600,000 iterations; the
            server never sees plaintext credentials, and we cannot recover them if you lose your
            master password. Other user data (documents, notes, personal information) is
            encrypted at rest and accessible to LegacyVault infrastructure only as required to
            provide the Service.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">7. Trusted contacts and post-death access</h2>
          <p>
            You may designate one or more trusted contacts and configure conditions under which
            they may access defined portions of your vault. Access requests trigger a waiting
            period during which you are notified and may cancel. In the event of your death, a
            trusted contact who submits acceptable evidence (typically a death certificate) may
            request emergency access; our review process is designed to balance urgency with
            fraud prevention. We reserve the right to require additional verification, including
            correspondence with named executors or legal counsel, before releasing access.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">8. Unclaimed-asset search</h2>
          <p>
            Where you provide information about deceased relatives and consent to searching, we
            may query public registries in the United States and Canada — including but not
            limited to Bank of Canada unclaimed balances, MissingMoney.com, provincial escheat
            databases, Pension Benefit Guaranty Corporation, and Social Security Administration
            Death Master File where lawful. Results are provided as-is. We do not represent that
            we will find all unclaimed property, that reported matches will be paid, or that any
            particular amount will result. In jurisdictions with heir-finder fee caps (including
            Alberta), our fees will not exceed the statutory maximum. In jurisdictions requiring
            heir-finder licensing, we operate only in compliance with applicable licensing
            requirements.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">9. Fees and payment</h2>
          <p>
            LegacyVault offers free and paid tiers. Current pricing is on the pricing page. We
            may change pricing on 30 days' notice; changes apply at your next renewal. All
            payments are non-refundable except as required by law. You may cancel at any time;
            your account remains in free tier after cancellation.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">10. Prohibited use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Upload content you do not have the legal right to store;</li>
            <li>Attempt to gain unauthorized access to any other user's vault;</li>
            <li>Use the Service to impersonate another person;</li>
            <li>Reverse-engineer, decompile, or attempt to derive source code from the Service;</li>
            <li>Use automated tools to scrape or extract data at rates that impact service performance for other users;</li>
            <li>Use the Service in violation of any applicable law.</li>
          </ul>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">11. Termination</h2>
          <p>
            You may delete your account at any time from your account settings. We may suspend
            or terminate accounts that violate these Terms, that show signs of fraudulent
            activity, or in response to valid legal process. Upon termination, we will delete
            your data within 30 days except where retention is required by law.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">12. Disclaimers</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available.&quot; We do not
            warrant that the Service will be uninterrupted, error-free, or that content on the
            Service is accurate or complete. We disclaim all warranties, express or implied, to
            the maximum extent permitted by law.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">13. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, LegacyVault's total liability for any claim
            arising out of these Terms or your use of the Service is limited to the amount you
            paid us in the twelve months preceding the claim, or $100, whichever is greater. We
            are not liable for indirect, consequential, or punitive damages.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">14. Indemnification</h2>
          <p>
            You agree to indemnify and hold LegacyVault harmless from any claim arising out of
            your violation of these Terms, your violation of any law, or your violation of the
            rights of any third party.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">15. Governing law and dispute resolution</h2>
          <p>
            These Terms are governed by the laws of the State of Delaware (for US users) or the
            Province of Ontario (for Canadian users), without regard to conflict-of-laws
            principles. Disputes will be resolved by binding arbitration in Wilmington, Delaware
            or Toronto, Ontario as applicable, under the rules of the American Arbitration
            Association or the ADR Institute of Canada respectively. You waive the right to
            participate in a class action.
          </p>
          <p className="text-sm text-ink-500">
            <strong>Note:</strong> Arbitration clauses are not enforceable in all consumer
            contexts in every jurisdiction; provisions may be modified in your jurisdiction to
            comply with local law.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">16. Changes to these Terms</h2>
          <p>
            We may update these Terms occasionally. Material changes take effect 30 days after
            posting; we will notify you by email at the address on file. Continued use of the
            Service after the effective date constitutes acceptance of the updated Terms.
          </p>

          <h2 className="mt-8 font-serif text-2xl text-navy-900">17. Contact</h2>
          <p>
            Questions about these Terms: <Link href="mailto:legal@legacyvault.app" className="underline">legal@legacyvault.app</Link>
          </p>

          <div className="mt-16 rounded-lg border border-terracotta-300 bg-terracotta-100/40 p-6 text-sm">
            <strong>Draft notice.</strong> This document is a working draft prepared in-house.
            It has not yet been reviewed by external legal counsel. Final terms may differ in
            material respects. Users who signed up prior to counsel review will be notified of
            material changes before they take effect.
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
