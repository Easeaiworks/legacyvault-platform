import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FieldCryptoService } from '../../common/crypto/field-crypto.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';
import type { CreateTrustedContactInput } from './types';

@Injectable()
export class TrustedContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldCryptoService,
  ) {}

  async listForUser(user: RequestUser) {
    return this.prisma.trustedContact.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, email: true, relationship: true } },
        accessGrants: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async create(user: RequestUser, input: CreateTrustedContactInput) {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
    });
    if (!principal) throw new ForbiddenException('No principal exists for this tenant');

    const person = await this.prisma.person.findFirst({
      where: { id: input.personId, principalId: principal.id, deletedAt: null },
    });
    if (!person) throw new NotFoundException('Person not found');

    return this.prisma.trustedContact.create({
      data: {
        principalId: principal.id,
        personId: input.personId,
        accessTier: input.accessTier,
        triggerType: input.triggerType ?? 'CHECK_IN_MISSED',
        waitingPeriodDays: input.waitingPeriodDays ?? 7,
        notifyOnTrigger: input.notifyOnTrigger ?? true,
        letterToContactEncrypted: this.crypto.encrypt(input.letterToContact ?? null),
      },
    });
  }

  async update(user: RequestUser, id: string, input: Partial<CreateTrustedContactInput>) {
    const current = await this.prisma.trustedContact.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!current) throw new NotFoundException('Trusted contact not found');

    const patch: Record<string, unknown> = { ...input };
    if ('letterToContact' in input) {
      patch.letterToContactEncrypted = this.crypto.encrypt(input.letterToContact ?? null);
      delete patch.letterToContact;
    }
    delete patch.personId; // Not updatable; create a new contact instead.

    return this.prisma.trustedContact.update({ where: { id }, data: patch as never });
  }

  async softDelete(user: RequestUser, id: string) {
    const current = await this.prisma.trustedContact.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!current) throw new NotFoundException('Trusted contact not found');
    return this.prisma.trustedContact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
