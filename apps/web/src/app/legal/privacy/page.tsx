import Link from 'next/link';
import { FlagToggle } from '@/components/flag-toggle';

export const metadata = {
  title: 'Privacy Policy — LegacyVault',
  description:
    'How LegacyVault collects, uses, protects, and never sells your personal data. Last updated July 2026.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Legal
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-ink-500">
            Last updated: July 20, 2026 · Draft — awaiting final counsel review
          </p>
        </div>
      </section>

      <section className="bg-paper px-6 py-14">
        <article className="prose mx-auto max-w-3xl text-ink-900">
          <p className="text-lg text-ink-700">
            Your data is yours. We built LegacyVault on the principle that estate-planning
            information is uniquely sensitive: it names the people you love, describes what you
            own, and encodes decisions that will not be made again. This policy explains what we
            collect, why, how we protect it, and — most importantly — what we will never do
            with it.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">What we will never do</h2>
          <ul>
            <li><strong>We will never sell your data</strong> to advertisers, data brokers, or any third party.</li>
            <li><strong>We will never use your data to train machine-learning models</strong>, ours or anyone else's.</li>
            <li><strong>We will never share your vault contents</strong> with insurance companies, employers, credit agencies, or marketing partners.</li>
            <li><strong>We will never scan your documents for advertising signal.</strong></li>
            <li><strong>We will never read your credential vault.</strong> We can't — it's encrypted client-side with a key derived from your master password, which we do not store.</li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">1. Information we collect</h2>

          <h3 className="mt-6 font-serif text-xl text-navy-900">Account information</h3>
          <ul>
            <li>Email address (required, for account access and communications)</li>
            <li>Full legal name (required, so your estate plan is legally meaningful)</li>
            <li>Country and region of residence (required, to serve you jurisdictionally correct content)</li>
            <li>Password (stored as a bcrypt hash — the plaintext is never retained)</li>
          </ul>

          <h3 className="mt-6 font-serif text-xl text-navy-900">Content you upload</h3>
          <ul>
            <li>Documents (wills, POAs, insurance policies, deeds, etc.)</li>
            <li>Structured asset information (accounts, real estate, insurance)</li>
            <li>Contacts (family, executors, professionals)</li>
            <li>Deceased-relative records, if you use the unclaimed-asset search feature</li>
            <li>Credentials in the credential vault (encrypted client-side; we do not have the key)</li>
            <li>Messages and instructions for post-death delivery</li>
          </ul>

          <h3 className="mt-6 font-serif text-xl text-navy-900">Usage data</h3>
          <ul>
            <li>Access logs (IP address, timestamp, endpoint accessed) — retained 90 days for security</li>
            <li>Feature usage metrics, aggregated and de-identified where possible</li>
            <li>Support ticket contents if you contact us</li>
          </ul>

          <h3 className="mt-6 font-serif text-xl text-navy-900">Payment information</h3>
          <p>
            If you subscribe to a paid plan, payment card details are handled directly by our
            payment processor (Stripe). We store only your subscription status and the last four
            digits of the card for reference; we do not store full card numbers.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">2. How we use your information</h2>
          <ul>
            <li>To operate the Service — store your vault, deliver messages, serve jurisdictionally correct content.</li>
            <li>To communicate with you — service updates, security alerts, subscription notices, and (only if you opt in) educational content.</li>
            <li>To provide unclaimed-asset search, if you've opted into that feature and provided consent for deceased-relative records.</li>
            <li>To secure the Service — detect and prevent fraud, unauthorized access, and abuse.</li>
            <li>To comply with legal obligations — respond to lawful process, meet regulatory requirements.</li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">3. Encryption and security</h2>
          <p><strong>At rest:</strong> AES-256 encryption for all stored data.</p>
          <p>
            <strong>In transit:</strong> TLS 1.2 or higher for all connections between your
            device and our servers.
          </p>
          <p>
            <strong>Zero-knowledge credential vault:</strong> Passwords stored in the credential
            vault are encrypted on your device with a Vault Master Key derived from your master
            password via PBKDF2-SHA256 with 600,000 iterations. The server never sees your
            master password or the plaintext credentials. If you lose your master password, we
            cannot recover your credentials — a design tradeoff we chose deliberately.
          </p>
          <p>
            <strong>Field-level encryption:</strong> Highly sensitive fields (full SSN/SIN,
            certain medical directives) are encrypted with a separate app-tier key using
            AES-256-GCM, with an immutable audit log of every access.
          </p>
          <p>
            <strong>Immutable audit log:</strong> Every access to your vault is logged in a
            database-level append-only table with UPDATE and DELETE explicitly revoked. You can
            view your audit log at any time from your account settings.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">4. Who we share information with</h2>

          <h3 className="mt-6 font-serif text-xl text-navy-900">Subprocessors</h3>
          <p>
            We work with a small number of infrastructure providers, each under a data
            processing agreement that binds them to standards at least as strict as this policy:
          </p>
          <ul>
            <li><strong>Vercel</strong> — application hosting (US, EU regions)</li>
            <li><strong>Supabase</strong> — managed PostgreSQL database (US region for US accounts; Canadian region for Canadian accounts)</li>
            <li><strong>AWS S3</strong> — document storage (with SSE-KMS encryption)</li>
            <li><strong>Stripe</strong> — payment processing (for paid tier subscribers only)</li>
            <li><strong>Postmark</strong> — transactional email delivery</li>
            <li><strong>Sentry</strong> — error monitoring (with PII scrubbing enabled)</li>
          </ul>
          <p>
            The current subprocessor list, with data residency details, is published at{' '}
            <Link href="/legal/subprocessors" className="underline">/legal/subprocessors</Link>.
            We will notify existing users at least 30 days before adding a subprocessor with
            access to user content.
          </p>

          <h3 className="mt-6 font-serif text-xl text-navy-900">People you authorize</h3>
          <p>
            Trusted contacts and executors you designate may access defined portions of your
            vault under the conditions you specify. You control the scope, the delay period, and
            the trigger conditions.
          </p>

          <h3 className="mt-6 font-serif text-xl text-navy-900">Legal process</h3>
          <p>
            If we receive a subpoena, court order, or other lawful process, we will respond in
            accordance with applicable law. We will notify you before complying unless we are
            legally prohibited from doing so.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">5. Data residency</h2>
          <p>
            US accounts are stored in US-hosted infrastructure (Vercel US and Supabase US-East).
            Canadian accounts are stored in Canadian-hosted infrastructure (Supabase Canada
            region). This is a first-class design constraint of the platform.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">6. Retention</h2>
          <p>
            We retain your data as long as you have an active account. If you delete your
            account, we delete your vault contents within 30 days except:
          </p>
          <ul>
            <li>Audit log entries are retained for 7 years (industry standard).</li>
            <li>Financial records related to payment are retained for the period required by tax law (7 years).</li>
            <li>Data subject to legal hold is retained until the hold is released.</li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">7. Your rights</h2>

          <h3 className="mt-6 font-serif text-xl text-navy-900">Under GDPR, CCPA, PIPEDA, and provincial equivalents</h3>
          <ul>
            <li><strong>Access:</strong> You can export a complete copy of your data at any time from account settings.</li>
            <li><strong>Correction:</strong> You can edit or remove any information from your account.</li>
            <li><strong>Deletion:</strong> You can delete your account, which removes all your content within 30 days.</li>
            <li><strong>Portability:</strong> Data exports are provided in a machine-readable format (JSON + original file uploads).</li>
            <li><strong>Objection and restriction:</strong> You may object to specific processing or request restriction; contact us at privacy@legacyvault.app.</li>
            <li><strong>Complaint:</strong> You may lodge a complaint with your data protection authority (the ICO in the UK, the CNIL in France, provincial commissioners in Canada, state attorneys general in the US).</li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">8. Children</h2>
          <p>
            The Service is not intended for anyone under 18. We do not knowingly collect
            information from minors. If you believe we have inadvertently collected information
            from a minor, contact us and we will delete it.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">9. Breach notification</h2>
          <p>
            In the event of a data breach that materially affects your data, we will notify
            affected users within 72 hours of confirming the breach, in accordance with GDPR
            Article 33, PIPEDA breach reporting requirements, and applicable state and
            provincial notification laws. Notification will include the nature of the breach,
            what data was affected, steps we are taking, and steps you can take to protect
            yourself.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">10. Changes to this policy</h2>
          <p>
            Material changes take effect 30 days after we notify you. We will notify by email
            and via prominent notice in the Service.
          </p>

          <h2 className="mt-10 font-serif text-2xl text-navy-900">11. Contact</h2>
          <p>
            Privacy questions and requests:{' '}
            <Link href="mailto:privacy@legacyvault.app" className="underline">
              privacy@legacyvault.app
            </Link>
          </p>
          <p>
            Data Protection Officer contact information:{' '}
            <Link href="mailto:dpo@legacyvault.app" className="underline">dpo@legacyvault.app</Link>
          </p>

          <div className="mt-16 rounded-lg border border-terracotta-300 bg-terracotta-100/40 p-6 text-sm">
            <strong>Draft notice.</strong> This document is a working draft prepared in-house.
            It has not yet been reviewed by external legal counsel or by a Data Protection
            Officer. Final policy may differ in material respects; a specific breach notification
            procedure, provincial commissioner references, and DPO appointment will be finalized
            with counsel.
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
