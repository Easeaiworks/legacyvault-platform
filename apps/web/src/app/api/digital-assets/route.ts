import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

type DigitalAssetKind =
  | 'ACCOUNT_LOGIN'
  | 'SUBSCRIPTION'
  | 'DEVICE'
  | 'DOMAIN_NAME'
  | 'CRYPTO_WALLET'
  | 'SOCIAL_MEDIA'
  | 'PET_CARE_INSTRUCTIONS'
  | 'HOUSEHOLD_INSTRUCTIONS'
  | 'OTHER';

type DigitalAssetAction =
  | 'CANCEL'
  | 'TRANSFER'
  | 'MEMORIALIZE'
  | 'DELETE'
  | 'PRESERVE'
  | 'UNCERTAIN';

const VALID_KINDS: DigitalAssetKind[] = [
  'ACCOUNT_LOGIN',
  'SUBSCRIPTION',
  'DEVICE',
  'DOMAIN_NAME',
  'CRYPTO_WALLET',
  'SOCIAL_MEDIA',
  'PET_CARE_INSTRUCTIONS',
  'HOUSEHOLD_INSTRUCTIONS',
  'OTHER',
];

const VALID_ACTIONS: DigitalAssetAction[] = [
  'CANCEL',
  'TRANSFER',
  'MEMORIALIZE',
  'DELETE',
  'PRESERVE',
  'UNCERTAIN',
];

/**
 * GET /api/digital-assets
 * List digital assets for current principal. Optional ?kind= filter.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json([]);

    const kind = req.nextUrl.searchParams.get('kind');
    const assets = await prisma.digitalAsset.findMany({
      where: {
        tenantId: user.tenantId,
        principalId: principal.id,
        deletedAt: null,
        ...(kind && VALID_KINDS.includes(kind as DigitalAssetKind)
          ? { kind: kind as DigitalAssetKind }
          : {}),
      },
      include: {
        preferredHeir: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ priorityOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(assets);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * POST /api/digital-assets
 * Create a digital asset entry.
 * Body: { kind, label, provider?, identifier?, passwordHint?, intendedAction?,
 *         preferredHeirId?, instructions?, instructionsEncrypted?, priorityOrder? }
 *
 * IMPORTANT: rejects any `password` field. We do not store passwords.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) {
      return NextResponse.json({ error: 'No principal for this tenant' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Safety net: refuse any attempt to store passwords
    if ('password' in body || 'passwordPlain' in body || 'pwd' in body) {
      return NextResponse.json(
        {
          error:
            'Digital Goodbye does not store passwords. Use passwordHint to point to your password manager instead.',
        },
        { status: 400 },
      );
    }

    const {
      kind,
      label,
      provider,
      identifier,
      passwordHint,
      intendedAction,
      preferredHeirId,
      instructions,
      instructionsEncrypted,
      priorityOrder,
    } = body as {
      kind?: DigitalAssetKind;
      label?: string;
      provider?: string;
      identifier?: string;
      passwordHint?: string;
      intendedAction?: DigitalAssetAction;
      preferredHeirId?: string;
      instructions?: string;
      instructionsEncrypted?: string;
      priorityOrder?: number;
    };

    if (!kind || !VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: 'kind is required and must be valid' }, { status: 400 });
    }
    if (!label || typeof label !== 'string') {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }
    if (intendedAction && !VALID_ACTIONS.includes(intendedAction)) {
      return NextResponse.json({ error: 'intendedAction must be valid' }, { status: 400 });
    }

    // If TRANSFER, verify the preferredHeirId belongs to this principal
    if (preferredHeirId) {
      const person = await prisma.person.findFirst({
        where: { id: preferredHeirId, principalId: principal.id, deletedAt: null },
      });
      if (!person) {
        return NextResponse.json(
          { error: 'preferredHeirId must reference a Person in your contacts' },
          { status: 400 },
        );
      }
    }

    const asset = await prisma.digitalAsset.create({
      data: {
        tenantId: user.tenantId,
        principalId: principal.id,
        kind,
        label,
        provider: provider ?? null,
        identifier: identifier ?? null,
        passwordHint: passwordHint ?? null,
        intendedAction: intendedAction ?? 'UNCERTAIN',
        preferredHeirId: preferredHeirId ?? null,
        instructions: instructions ?? null,
        instructionsEncrypted: instructionsEncrypted ?? null,
        priorityOrder: priorityOrder ?? 0,
      },
      include: {
        preferredHeir: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'digital_asset.created',
        resourceType: 'DigitalAsset',
        resourceId: asset.id,
        afterJson: { kind: asset.kind, label: asset.label, intendedAction: asset.intendedAction },
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
