import Link from 'next/link';
import { ReactNode } from 'react';
import { AuthGate } from '@/components/auth-gate';

// Authenticated shell for the LegacyVault app.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-ink-50">
        <aside className="fixed inset-y-0 left-0 w-60 border-r border-ink-200 bg-white p-6">
          <Link href="/app" className="mb-8 block font-serif text-xl text-navy-900">
            LegacyVault
          </Link>
          <nav className="flex flex-col gap-1 text-sm">
            <NavLink href="/app">Overview</NavLink>
            <NavLink href="/app/registry">Registry</NavLink>
            <NavLink href="/app/assets">Assets</NavLink>
            <NavLink href="/app/people">People</NavLink>
            <NavLink href="/app/documents">Documents</NavLink>
            <NavLink href="/app/beneficiaries">Beneficiaries</NavLink>
            <NavLink href="/app/contacts">Trusted contacts</NavLink>
            <NavLink href="/app/instructions">Letters &amp; wishes</NavLink>
            <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
              Legacy
            </div>
            <NavLink href="/app/messages">Messages</NavLink>
          </nav>
        </aside>
        <main className="ml-60 p-10">{children}</main>
      </div>
    </AuthGate>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-2 text-ink-700 hover:bg-ink-100">
      {children}
    </Link>
  );
}
