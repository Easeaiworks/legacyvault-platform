import Link from 'next/link';

// Session 2 will wire real signup through WorkOS AuthKit. For now, we point
// prospective users at the same sign-in flow (magic link creates the account).
export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="mb-2 font-serif text-3xl text-navy-900">Coming soon</h1>
        <p className="mb-6 text-ink-500">
          Self-serve signup opens in the next release. In the meantime, sign in with a magic link —
          we&apos;ll create your vault on first login.
        </p>
        <Link
          href="/login"
          className="rounded-md bg-navy-700 px-5 py-3 font-medium text-ink-50 hover:bg-navy-900"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
