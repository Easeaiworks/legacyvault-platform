import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUuid } from '@/lib/ids';

/**
 * POST /api/death-verifications
 * PUBLIC endpoint (called from a trusted-contact grant page).
 *
 * Body: {
 *   trustedContactId: string;    // the recipient of the future access
 *   submitterEmail: string;      // used to verify the submitter is the linked person
 *   supportingEvidence?: string; // URL to obituary or funeral notice
 *   submitterNotes?: string;
 *   documentId?: string;         // reference to previously-uploaded death cert
 * }
 *
 * Creates a DeathVerification with status = SUBMITTED. Ops team reviews.
 * On VERIFIED, a separate flow (not in this endpoint) will create
 * TrustedContactGrant rows for all matching TrustedContacts for the same Principal.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      trustedContactId?: string;
      submitterEmail?: string;
      supportingEvidence?: string;
      submitterNotes?: string;
      documentId?: string;
    };

    const { trustedContactId, submitterEmail, supportingEvidence, submitterNotes, documentId } =
      body;

    if (!trustedContactId || !submitterEmail) {
      return NextResponse.json(
        { error: 'trustedContactId and submitterEmail are required' },
        { status: 400 },
      );
    }
    if (!isUuid(trustedContactId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const tc = await prisma.trustedContact.findFirst({
      where: { id: trustedContactId, deletedAt: null },
      include: {
        principal: { select: { id: true, tenantId: true } },
        person: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!tc) {
      return NextResponse.json({ error: 'Trusted contact link not found' }, { status: 404 });
    }

    // Verify the submitter's email matches the trusted contact's Person.
    // (In prod we'd also send a magic-link token to prove control of the email.)
    if (
      !tc.person.email ||
      tc.person.email.toLowerCase() !== submitterEmail.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: 'Submitter email does not match the trusted contact on file' },
        { status: 403 },
      );
    }

    // Idempotency: if there is already a pending submission for this principal
    // by this person, return that record instead of creating a duplicate.
    const existing = await prisma.deathVerification.findFirst({
      where: {
        principalId: tc.principal.id,
        submittedByPersonId: tc.person.id,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
    });
    if (existing) return NextResponse.json(existing);

    const dv = await prisma.deathVerification.create({
      data: {
        tenantId: tc.principal.tenantId,
        principalId: tc.principal.id,
        submittedByPersonId: tc.person.id,
        documentId: documentId ?? null,
        supportingEvidence: supportingEvidence ?? null,
        submitterNotes: submitterNotes ?? null,
        status: 'SUBMITTED',
      },
    });

    // Audit log — no userId because this is a public unauthenticated action.
    await prisma.auditLog.create({
      data: {
        tenantId: tc.principal.tenantId,
        userId: null,
        event: 'death_verification.submitted',
        resourceType: 'DeathVerification',
        resourceId: dv.id,
        afterJson: {
          principalId: tc.principal.id,
          submittedByPersonId: tc.person.id,
          via: 'grant_page',
        },
      },
    });

    return NextResponse.json(
      {
        id: dv.id,
        status: dv.status,
        message:
          'Your submission has been received. We will review within 2 business days and notify you at the email on file. Access will unlock according to the waiting period set by the account holder.',
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
