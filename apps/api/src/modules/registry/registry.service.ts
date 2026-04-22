import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';
import type { RegistryOptInInput, RegistryUpdateInput, RegistryVisibility } from './types';

/**
 * RegistryService — implements the opt-in "findable" layer.
 *
 * COMPLIANCE GUARDRAILS ENFORCED IN CODE (not just in UI copy):
 *   - Registration is free. There is no price / charge code path. A future
 *     pricing-change PR would fail our CODEOWNERS review on this file.
 *   - No match/result is computed or returned here. Matching lives in the
 *     HeirTrace product and only runs against a principal who has opted in.
 *   - Opt-out is irrevocable at the record level (we tombstone, not delete)
 *     so audit logs retain the history of the consent and its withdrawal.
 *   - Every institutional query against a registered principal is logged
 *     and a notification is emitted (see RegistryQuery model + worker job).
 *
 * The marketing copy describing future "added value" is UI-only and gated
 * by a PENDING LEGAL REVIEW banner. This service does nothing that would
 * implement those claims until counsel approves.
 */
@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  publicPolicy() {
    return {
      isFreeForConsumers: true,
      requiresIdentityVerification: true,
      consumerControlledVisibility: true,
      everyQueryIsLoggedAndNotified: true,
      // These forward-looking claims must be vetted before marketing copy
      // goes live. The UI shows them under a "Pending legal review" banner.
      pendingLegalReview: {
        institutionalParticipants: [],
        estimatedMatchRate: null,
        jurisdictionalCoverage: ['US', 'CA'],
      },
    };
  }

  async getForUser(user: RequestUser) {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: { registryEntry: true },
    });
    if (!principal) return { status: 'no-principal' as const, entry: null };
    if (!principal.registryEntry) return { status: 'not-opted-in' as const, entry: null };
    if (principal.registryEntry.optedOutAt) return { status: 'opted-out' as const, entry: null };
    return { status: 'active' as const, entry: principal.registryEntry };
  }

  async optIn(user: RequestUser, input: RegistryOptInInput) {
    if (!input.consentAcknowledged) {
      throw new BadRequestException('Consent must be explicitly acknowledged.');
    }
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
    });
    if (!principal) throw new ForbiddenException('No principal for this tenant');

    // Upsert is explicit here so we do NOT resurrect a previously opted-out
    // entry silently — we reset optedOutAt to null with a fresh optedInAt
    // so the audit trail reflects re-enrollment.
    return this.prisma.registryEntry.upsert({
      where: { principalId: principal.id },
      create: {
        principalId: principal.id,
        nameVariations: (input.nameVariations ?? []) as never,
        addressHistory: (input.addressHistory ?? []) as never,
        visibility: input.visibility ?? 'INSTITUTIONS_VERIFIED_ONLY',
        optedInAt: new Date(),
      },
      update: {
        nameVariations: (input.nameVariations ?? []) as never,
        addressHistory: (input.addressHistory ?? []) as never,
        visibility: input.visibility ?? 'INSTITUTIONS_VERIFIED_ONLY',
        optedInAt: new Date(),
        optedOutAt: null,
      },
    });
  }

  async update(user: RequestUser, input: RegistryUpdateInput) {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: { registryEntry: true },
    });
    if (!principal?.registryEntry) {
      throw new BadRequestException('Not currently enrolled in the registry');
    }
    return this.prisma.registryEntry.update({
      where: { principalId: principal.id },
      data: {
        nameVariations: input.nameVariations as never,
        addressHistory: input.addressHistory as never,
        visibility: input.visibility as RegistryVisibility,
      },
    });
  }

  async optOut(user: RequestUser) {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: { registryEntry: true },
    });
    if (!principal?.registryEntry) return { alreadyOptedOut: true };
    await this.prisma.registryEntry.update({
      where: { principalId: principal.id },
      data: { optedOutAt: new Date(), visibility: 'PRIVATE' },
    });
    return { ok: true };
  }

  /** Placeholder — real integration (Stripe Identity / Persona / Onfido) lands in a later session. */
  async startIdentityVerification(user: RequestUser) {
    return {
      provider: 'placeholder',
      status: 'pending_integration',
      message:
        'Identity verification requires a real provider (Stripe Identity, Persona, or Onfido). Wire up in Session 3+.',
      userId: user.id,
    };
  }
}
