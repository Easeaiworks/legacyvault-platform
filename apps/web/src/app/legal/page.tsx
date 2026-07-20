import Link from 'next/link';
import { FlagToggle } from '@/components/flag-toggle';

export const metadata = {
  title: 'Legal — LegacyVault',
  description: 'Terms, privacy, and search consent documents.',
};

export default function LegalIndexPage() {
  const docs = [
    {
      href: '/legal/terms',
      title: 'Terms of Service',
      description: 'The terms that govern your use of LegacyVault.',
    },
    {
      href: '/legal/privacy',
      title: 'Privacy Policy',
      description:
        'What we collect, why, how we protect it, and — most importantly — what we will never do with it.',
    },
    {
      href: '/legal/search-consent',
      title: 'Unclaimed-asset search consent',
      description:
        'What happens when you ask us to search for unclaimed assets on your behalf or on behalf of a deceased relative.',
    },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Legal
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            The rules of the road
          </h1>
          <p className="mt-4 text-lg text-ink-700">
            The commitments we make to you, and the commitments we ask from you.
          </p>
        </div>
      </section>

      <section className="bg-paper-warm px-6 py-14">
        <div className="mx-auto grid max-w-3xl gap-4">
          {docs.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group rounded-2xl border border-ink-200 bg-paper p-6 shadow-soft hover:border-navy-300"
            >
              <div className="font-serif text-2xl text-navy-900 group-hover:text-navy-700">
                {d.title}
              </div>
              <div className="mt-1 text-ink-700">{d.description}</div>
              <div className="mt-3 text-sm text-accent-700">Read →</div>
            </Link>
          ))}
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
