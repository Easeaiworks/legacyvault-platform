import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FieldCryptoService } from '../../common/crypto/field-crypto.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';
import type { CreateInstructionInput } from './instructions.controller';

@Injectable()
export class InstructionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldCryptoService,
  ) {}

  async listForUser(user: RequestUser) {
    const rows = await this.prisma.instruction.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      // Omit the body from list views — decrypt only on detail fetch.
      select: {
        id: true,
        category: true,
        title: true,
        recipientPersonId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
    return rows;
  }

  async getById(user: RequestUser, id: string) {
    const inst = await this.prisma.instruction.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!inst) throw new NotFoundException('Instruction not found');
    return {
      ...inst,
      body: this.crypto.decrypt(inst.bodyEncrypted),
      bodyEncrypted: undefined,
    };
  }

  async create(user: RequestUser, input: CreateInstructionInput) {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
    });
    if (!principal) throw new ForbiddenException('No principal exists for this tenant');

    return this.prisma.instruction.create({
      data: {
        principalId: principal.id,
        category: input.category,
        title: input.title,
        bodyEncrypted: this.crypto.encrypt(input.body) ?? '',
        recipientPersonId: input.recipientPersonId ?? null,
      },
    });
  }

  async update(user: RequestUser, id: string, input: Partial<CreateInstructionInput>) {
    await this.getById(user, id);
    const patch: Record<string, unknown> = { ...input };
    if ('body' in input && typeof input.body === 'string') {
      patch.bodyEncrypted = this.crypto.encrypt(input.body);
      delete patch.body;
    }
    return this.prisma.instruction.update({ where: { id }, data: patch as never });
  }

  async softDelete(user: RequestUser, id: string) {
    await this.getById(user, id);
    return this.prisma.instruction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
