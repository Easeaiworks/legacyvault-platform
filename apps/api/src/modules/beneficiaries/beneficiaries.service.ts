import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateBeneficiary } from '@legacyvault/shared';
import { SHARE_BPS_TOTAL } from '@legacyvault/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: RequestUser) {
    return this.prisma.beneficiary.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      include: {
        asset: { select: { id: true, nickname: true, category: true, type: true } },
        person: { select: { id: true, firstName: true, lastName: true, relationship: true } },
      },
      orderBy: [{ assetId: 'asc' }, { designation: 'asc' }],
    });
  }

  async create(user: RequestUser, input: CreateBeneficiary) {
    // Validate the asset and person belong to this tenant.
    const [asset, person] = await Promise.all([
      this.prisma.asset.findFirst({
        where: { id: input.assetId, principal: { tenantId: user.tenantId } },
        select: { id: true, principalId: true },
      }),
      this.prisma.person.findFirst({
        where: { id: input.personId, principal: { tenantId: user.tenantId } },
        select: { id: true, principalId: true },
      }),
    ]);
    if (!asset) throw new NotFoundException('Asset not found');
    if (!person) throw new NotFoundException('Person not found');
    if (asset.principalId !== person.principalId) {
      throw new ForbiddenException('Asset and person must share the same principal');
    }

    // Share-sum validation within the same (assetId, designation) band.
    await this.assertShareSumOk(input.assetId, input.designation, input.shareBps);

    return this.prisma.beneficiary.create({
      data: {
        principalId: asset.principalId,
        assetId: input.assetId,
        personId: input.personId,
        designation: input.designation,
        shareBps: input.shareBps,
        conditions: input.conditions ?? null,
        sourceDocumentId: input.sourceDocumentId ?? null,
      },
    });
  }

  async update(user: RequestUser, id: string, input: Partial<CreateBeneficiary>) {
    const current = await this.prisma.beneficiary.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!current) throw new NotFoundException('Beneficiary not found');

    if (input.shareBps !== undefined || input.designation !== undefined) {
      await this.assertShareSumOk(
        current.assetId,
        input.designation ?? current.designation,
        input.shareBps ?? current.shareBps,
        id,
      );
    }

    return this.prisma.beneficiary.update({
      where: { id },
      data: {
        designation: input.designation,
        shareBps: input.shareBps,
        conditions: input.conditions,
        sourceDocumentId: input.sourceDocumentId,
      },
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const current = await this.prisma.beneficiary.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!current) throw new NotFoundException('Beneficiary not found');
    return this.prisma.beneficiary.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Ensures the shares for an (asset, designation) combo don't exceed 100%. */
  private async assertShareSumOk(
    assetId: string,
    designation: string,
    newShareBps: number,
    excludeBeneficiaryId?: string,
  ) {
    const siblings = await this.prisma.beneficiary.findMany({
      where: {
        assetId,
        designation: designation as never,
        deletedAt: null,
        ...(excludeBeneficiaryId ? { NOT: { id: excludeBeneficiaryId } } : {}),
      },
      select: { shareBps: true },
    });
    const total = siblings.reduce((sum, b) => sum + b.shareBps, 0) + newShareBps;
    if (total > SHARE_BPS_TOTAL) {
      throw new BadRequestException(
        `Share total ${total / 100}% exceeds 100% for this asset and designation`,
      );
    }
  }
}
