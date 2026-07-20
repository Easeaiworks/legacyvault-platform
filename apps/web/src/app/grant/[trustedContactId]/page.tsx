import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isUuid } from '@/lib/ids';
import { GrantForm } from './grant-form';

type PageProps = { params: Promise<{ trustedContactId: string }> };

export const dynamic = 'force-dynamic';

/**
 * Public page shown to a designated trusted contact when they navigate to
 * `/grant/<trustedContactId>`. Confirms the account holder's identity and
 * lets the contact submit a death-verification request.
 *
 * This page is intentionally minimal on account-holder info: name only.
 * Full vault access does NOT open here — it opens after LegacyVault operations
 * has verified the death certificate and the waiting period elapses.
 */
export default async function GrantPage({ params }: PageProps) {
  const { trustedContactId } = await params;
  if (!isUuid(trustedContactId)) notFound();

  const tc = await prisma.trustedContact.findFirst({
    where: { id: trustedContactId, deletedAt: null },
    include: {
      principal: {
        select: {
          legalFirstName: true,
          legalLastName: true,
          residenceCountry: true,
        },
      },
      person: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!tc) notFound();

  const principalName = `${tc.principal.legalFirstName} ${tc.principal.legalLastName}`;

  // Current state of this contact's access + any in-flight verification, so a
  // returning contact sees status instead of being asked to submit again.
  let [activeGrant, latestVerification] = await Promise.all([
    prisma.trustedContactGrant.findFirst({
      where: { trustedContactId: tc.id, status: { in: ['TRIGGERED', 'UNLOCKED'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.deathVerification.findFirst({
      where: {
        principalId: tc.principalId,
        submittedByPersonId: tc.personId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Lazily flip TRIGGERED -> UNLOCKED once the waiting period has elapsed.
  if (
    activeGrant &&
    activeGrant.status === 'TRIGGERED' &&
    activeGrant.unlocksAt &&
    activeGrant.unlocksAt.getTime() <= Date.now()
  ) {
    activeGrant = await prisma.trustedContactGrant.update({
      where: { id: activeGrant.id },
      data: { status: 'UNLOCKED' },
    });
  }

  return (
    <div className="min-h-screen bg-paper">
      <nav className="border-b border-ink-200 bg-paper">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight text-navy-900">
            LegacyVault
          </Link>
        </div>
      </nav>

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Trusted contact access
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-tight text-navy-900">
            You&apos;ve been designated by {principalName}
          </h1>
          <p className="mt-4 text-ink-700">
            {principalName} added you as a trusted contact for their LegacyVault account. If they
            have passed away, submit their death certificate below and we&apos;ll begin the
            verification process. Access to their vault opens after verification and a{' '}
            {tc.waitingPeriodDays}-day waiting period during which {tc.principal.legalFirstName}
            {' '}is notified — to protect against fraud.
          </p>
        </div>
      </section>

      <section className="bg-paper-warm px-6 py-14">
        <div className="mx-auto max-w-2xl rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft">
          {activeGrant?.status === 'UNLOCKED' ? (
            <>
              <h2 className="font-serif text-2xl text-navy-900">Your access is open</h2>
              <p className="mt-2 text-sm text-ink-700">
                The verification process is complete and your access to {principalName}&apos;s
                vault has unlocked. Our team will contact you at the email on file with
                sign-in instructions. We&apos;re sorry for your loss.
              </p>
            </>
          ) : activeGrant?.status === 'TRIGGERED' ? (
            <>
              <h2 className="font-serif text-2xl text-navy-900">Verification complete</h2>
              <p className="mt-2 text-sm text-ink-700">
                The death of {principalName} has been verified. As a protection against fraud,
                access opens after the waiting period they chose
                {activeGrant.unlocksAt
                  ? ` — on ${activeGrant.unlocksAt.toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}`
                  : ''}
                . We&apos;ll notify you at the email on file when it opens. Nothing more is
                needed from you.
              </p>
            </>
          ) : latestVerification ? (
            <>
              <h2 className="font-serif text-2xl text-navy-900">Submission received</h2>
              <p className="mt-2 text-sm text-ink-700">
                Your death-verification submission for {principalName} is{' '}
                {latestVerification.status === 'UNDER_REVIEW'
                  ? 'being reviewed by our team'
                  : 'in our review queue'}
                . We review within 2 business days and will contact you at the email on file.
                No further action is needed.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-navy-900">Submit death certificate</h2>
              <p className="mt-2 text-sm text-ink-500">
                Only submit if {principalName} has passed away. Fraudulent submissions are logged
                and may be referred to law enforcement.
              </p>

              <GrantForm trustedContactId={tc.id} contactEmailHint={tc.person.email ?? ''} />
            </>
          )}
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
