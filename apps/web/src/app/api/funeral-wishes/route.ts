import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';

const SERVICE_TYPES = [
  'BURIAL',
  'CREMATION',
  'GREEN_BURIAL',
  'NATURAL_ORGANIC_REDUCTION',
  'BODY_DONATION',
  'NO_SERVICE',
  'OTHER',
] as const;
type ServiceType = (typeof SERVICE_TYPES)[number];

const RELIGIOUS_TRADITIONS = [
  'SECULAR',
  'CHRISTIAN',
  'CATHOLIC',
  'JEWISH',
  'MUSLIM',
  'HINDU',
  'BUDDHIST',
  'SIKH',
  'INTERFAITH',
  'OTHER',
] as const;
type ReligiousTradition = (typeof RELIGIOUS_TRADITIONS)[number];

/**
 * Field-level completion scorer. The form has 12 sections; each filled section
 * earns roughly 1/12. We calculate client-displayable "X of 12 sections" here
 * so the scoring is centralized and doesn't drift between UI and API.
 */
function calculateCompletion(w: {
  serviceType?: ServiceType | null;
  locationPreference?: string | null;
  religiousTradition?: ReligiousTradition | null;
  officiantPreference?: string | null;
  musicSelections?: unknown[] | null;
  readingsSelections?: unknown[] | null;
  attireNotes?: string | null;
  gatheringNotes?: string | null;
  cateringOrDietaryNotes?: string | null;
  obituaryDraft?: string | null;
  executorInstructions?: string | null;
  financialResponsibility?: string | null;
}) {
  const sections = [
    !!w.serviceType,
    !!w.locationPreference,
    !!w.religiousTradition,
    !!w.officiantPreference,
    Array.isArray(w.musicSelections) && w.musicSelections.length > 0,
    Array.isArray(w.readingsSelections) && w.readingsSelections.length > 0,
    !!w.attireNotes,
    !!w.gatheringNotes,
    !!w.cateringOrDietaryNotes,
    !!w.obituaryDraft,
    !!w.executorInstructions,
    !!w.financialResponsibility,
  ];
  const done = sections.filter(Boolean).length;
  return Math.round((done / sections.length) * 100);
}

/**
 * GET /api/funeral-wishes — fetch the current principal's wishes, or null if not yet started.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json(null);

    const wishes = await prisma.funeralWishes.findFirst({
      where: { principalId: principal.id, deletedAt: null },
    });
    return NextResponse.json(wishes);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/**
 * PUT /api/funeral-wishes — upsert. One record per principal.
 * Body: any subset of wishes fields.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) {
      return NextResponse.json({ error: 'No principal for this tenant' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Validate enum fields if present
    if (body.serviceType != null && !SERVICE_TYPES.includes(body.serviceType as ServiceType)) {
      return NextResponse.json({ error: 'invalid serviceType' }, { status: 400 });
    }
    if (
      body.religiousTradition != null &&
      !RELIGIOUS_TRADITIONS.includes(body.religiousTradition as ReligiousTradition)
    ) {
      return NextResponse.json({ error: 'invalid religiousTradition' }, { status: 400 });
    }

    const {
      serviceType,
      serviceNotes,
      locationPreference,
      religiousTradition,
      religiousOrSecularNotes,
      officiantPreference,
      musicSelections,
      readingsSelections,
      attireNotes,
      gatheringNotes,
      cateringOrDietaryNotes,
      obituaryDraft,
      obituaryDraftEncrypted,
      executorInstructions,
      financialResponsibility,
    } = body as Partial<{
      serviceType: ServiceType | null;
      serviceNotes: string | null;
      locationPreference: string | null;
      religiousTradition: ReligiousTradition | null;
      religiousOrSecularNotes: string | null;
      officiantPreference: string | null;
      musicSelections: unknown[];
      readingsSelections: unknown[];
      attireNotes: string | null;
      gatheringNotes: string | null;
      cateringOrDietaryNotes: string | null;
      obituaryDraft: string | null;
      obituaryDraftEncrypted: string | null;
      executorInstructions: string | null;
      financialResponsibility: string | null;
    }>;

    // Merge with existing for completion scoring
    const existing = await prisma.funeralWishes.findFirst({
      where: { principalId: principal.id, deletedAt: null },
    });

    const merged = {
      serviceType: serviceType !== undefined ? serviceType : existing?.serviceType,
      locationPreference:
        locationPreference !== undefined ? locationPreference : existing?.locationPreference,
      religiousTradition:
        religiousTradition !== undefined ? religiousTradition : existing?.religiousTradition,
      officiantPreference:
        officiantPreference !== undefined ? officiantPreference : existing?.officiantPreference,
      musicSelections:
        musicSelections !== undefined
          ? musicSelections
          : (existing?.musicSelections as unknown[] | null),
      readingsSelections:
        readingsSelections !== undefined
          ? readingsSelections
          : (existing?.readingsSelections as unknown[] | null),
      attireNotes: attireNotes !== undefined ? attireNotes : existing?.attireNotes,
      gatheringNotes: gatheringNotes !== undefined ? gatheringNotes : existing?.gatheringNotes,
      cateringOrDietaryNotes:
        cateringOrDietaryNotes !== undefined
          ? cateringOrDietaryNotes
          : existing?.cateringOrDietaryNotes,
      obituaryDraft: obituaryDraft !== undefined ? obituaryDraft : existing?.obituaryDraft,
      executorInstructions:
        executorInstructions !== undefined
          ? executorInstructions
          : existing?.executorInstructions,
      financialResponsibility:
        financialResponsibility !== undefined
          ? financialResponsibility
          : existing?.financialResponsibility,
    };
    const completionPercentage = calculateCompletion(merged);

    const data = {
      tenantId: user.tenantId,
      principalId: principal.id,
      ...(serviceType !== undefined ? { serviceType } : {}),
      ...(serviceNotes !== undefined ? { serviceNotes } : {}),
      ...(locationPreference !== undefined ? { locationPreference } : {}),
      ...(religiousTradition !== undefined ? { religiousTradition } : {}),
      ...(religiousOrSecularNotes !== undefined ? { religiousOrSecularNotes } : {}),
      ...(officiantPreference !== undefined ? { officiantPreference } : {}),
      ...(musicSelections !== undefined
        ? { musicSelections: musicSelections as object }
        : {}),
      ...(readingsSelections !== undefined
        ? { readingsSelections: readingsSelections as object }
        : {}),
      ...(attireNotes !== undefined ? { attireNotes } : {}),
      ...(gatheringNotes !== undefined ? { gatheringNotes } : {}),
      ...(cateringOrDietaryNotes !== undefined ? { cateringOrDietaryNotes } : {}),
      ...(obituaryDraft !== undefined ? { obituaryDraft } : {}),
      ...(obituaryDraftEncrypted !== undefined ? { obituaryDraftEncrypted } : {}),
      ...(executorInstructions !== undefined ? { executorInstructions } : {}),
      ...(financialResponsibility !== undefined ? { financialResponsibility } : {}),
      completionPercentage,
    };

    const wishes = existing
      ? await prisma.funeralWishes.update({ where: { id: existing.id }, data })
      : await prisma.funeralWishes.create({ data });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: existing ? 'funeral_wishes.updated' : 'funeral_wishes.created',
        resourceType: 'FuneralWishes',
        resourceId: wishes.id,
      },
    });

    return NextResponse.json(wishes);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

/** DELETE /api/funeral-wishes — soft-delete the document. */
export async function DELETE() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = await prisma.funeralWishes.findFirst({
      where: { principalId: principal.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.funeralWishes.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        event: 'funeral_wishes.deleted',
        resourceType: 'FuneralWishes',
        resourceId: existing.id,
      },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
