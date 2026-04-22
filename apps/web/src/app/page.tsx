import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="border-b border-ink-200 bg-ink-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-serif text-xl tracking-tight text-navy-900">
            LegacyVault
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-navy-700 hover:text-navy-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-navy-900"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="font-serif text-5xl leading-tight text-navy-900 md:text-6xl">
          Give the people you love <span className="text-accent-700">clarity</span>
          <br />
          when they need it most.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-500">
          Securely document your assets, beneficiaries, and final wishes in one place.
          Share exactly what matters, with exactly the people who need it — on your terms.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-navy-700 px-6 py-3 font-medium text-ink-50 hover:bg-navy-900"
          >
            Start your vault
          </Link>
          <Link
            href="/for-professionals"
            className="rounded-md border border-ink-300 px-6 py-3 font-medium text-navy-900 hover:bg-ink-100"
          >
            For estate attorneys
          </Link>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-100">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 md:grid-cols-3">
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

      <footer className="border-t border-ink-200 bg-ink-50 py-8 text-center text-sm text-ink-500">
        © {new Date().getFullYear()} LegacyVault. Not a law firm. Not a financial advisor.
      </footer>
    </main>
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
