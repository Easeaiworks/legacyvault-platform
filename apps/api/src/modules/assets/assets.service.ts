import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAsset, UpdateAsset } from '@legacyvault/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FieldCryptoService } from '../../common/crypto/field-crypto.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';

/**
 * AssetsService — CRUD on Assets, scoped to the acting user's tenant.
 *
 * Tenancy: every query filters by principal.tenantId = user.tenantId.
 * This is defense-in-depth; Postgres Row-Level-Security policies in a later
 * migration provide the ultimate enforcement.
 */
@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldCryptoService,
  ) {}

  async listForUser(user: RequestUser) {
    return this.prisma.asset.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      orderBy: [{ category: 'asc' }, { nickname: 'asc' }],
    });
  }

  async getById(user: RequestUser, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(user: RequestUser, input: CreateAsset) {
    // Resolve the principal. For Phase-1 consumer tenants we assume a single
    // Principal per tenant (created at signup). Family plans will resolve by
    // explicit principalId passed from the UI.
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!principal) {
      throw new ForbiddenException('No principal exists for this tenant');
    }

    const { last4, ciphertext } = this.crypto.encryptAccountNumber(input.accountNumber ?? null);

    return this.prisma.asset.create({
      data: {
        principalId: principal.id,
        category: input.category,
        type: input.type,
        nickname: input.nickname,
        institutionName: input.institutionName ?? null,
        accountLast4: last4,
        accountNumberEncrypted: ciphertext,
        estimatedValueCents: input.estimatedValueCents ?? null,
        currency: input.currency,
        location: input.location ?? null,
        notes: input.notes ?? null,
        metadata: (input.metadata ?? {}) as never,
      },
    });
  }

  async update(user: RequestUser, id: string, input: UpdateAsset) {
    await this.getById(user, id); // existence + tenancy check
    const patch: Record<string, unknown> = { ...input };
    if ('accountNumber' in input && input.accountNumber !== undefined) {
      const { last4, ciphertext } = this.crypto.encryptAccountNumber(input.accountNumber);
      patch.accountLast4 = last4;
      patch.accountNumberEncrypted = ciphertext;
      delete patch.accountNumber;
    }
    return this.prisma.asset.update({ where: { id }, data: patch as never });
  }

  async softDelete(user: RequestUser, id: string) {
    await this.getById(user, id);
    return this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
