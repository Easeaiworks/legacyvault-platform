import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePerson } from '@legacyvault/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FieldCryptoService } from '../../common/crypto/field-crypto.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldCryptoService,
  ) {}

  async listForUser(user: RequestUser) {
    return this.prisma.person.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getById(user: RequestUser, id: string) {
    const person = await this.prisma.person.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!person) throw new NotFoundException('Person not found');
    return this.decorate(person);
  }

  async create(user: RequestUser, input: CreatePerson) {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!principal) throw new ForbiddenException('No principal exists for this tenant');

    return this.prisma.person.create({
      data: {
        principalId: principal.id,
        firstName: input.firstName,
        lastName: input.lastName,
        relationship: input.relationship,
        email: input.email ?? null,
        phoneEncrypted: this.crypto.encrypt(input.phone ?? null),
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        addressEncrypted: this.crypto.encrypt(input.address ?? null),
        notes: input.notes ?? null,
      },
    });
  }

  async update(user: RequestUser, id: string, input: Partial<CreatePerson>) {
    await this.getById(user, id);
    const patch: Record<string, unknown> = { ...input };
    if ('phone' in input) {
      patch.phoneEncrypted = this.crypto.encrypt(input.phone ?? null);
      delete patch.phone;
    }
    if ('address' in input) {
      patch.addressEncrypted = this.crypto.encrypt(input.address ?? null);
      delete patch.address;
    }
    if ('dateOfBirth' in input) {
      patch.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
    }
    return this.prisma.person.update({ where: { id }, data: patch as never });
  }

  async softDelete(user: RequestUser, id: string) {
    await this.getById(user, id);
    return this.prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Decrypts encrypted fields for the current response. Never returned in list views. */
  private decorate(person: {
    phoneEncrypted: string | null;
    addressEncrypted: string | null;
    [k: string]: unknown;
  }) {
    return {
      ...person,
      phone: this.crypto.decrypt(person.phoneEncrypted),
      address: this.crypto.decrypt(person.addressEncrypted),
    };
  }
}
