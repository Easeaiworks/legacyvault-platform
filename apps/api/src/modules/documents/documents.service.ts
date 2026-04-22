import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateDocumentUpload } from '@legacyvault/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listForUser(user: RequestUser) {
    return this.prisma.document.findMany({
      where: {
        deletedAt: null,
        principal: { tenantId: user.tenantId, deletedAt: null },
      },
      select: {
        id: true,
        title: true,
        category: true,
        sizeBytes: true,
        mimeType: true,
        documentDate: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getById(user: RequestUser, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, principal: { tenantId: user.tenantId } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async initUpload(user: RequestUser, input: CreateDocumentUpload) {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!principal) throw new ForbiddenException('No principal exists for this tenant');

    const s3Key = this.storage.buildKey(user.tenantId, input.title);

    const doc = await this.prisma.document.create({
      data: {
        principalId: principal.id,
        category: input.category,
        title: input.title,
        s3Key,
        contentSha256: input.contentSha256,
        sizeBytes: BigInt(input.sizeBytes),
        mimeType: input.mimeType,
        documentDate: input.documentDate ? new Date(input.documentDate) : null,
        tags: input.tags ?? [],
        uploadedById: user.id,
      },
    });

    const { url, expiresAt } = await this.storage.presignUpload({
      key: s3Key,
      contentType: input.mimeType,
      expiresInSeconds: 300,
    });

    return {
      documentId: doc.id,
      uploadUrl: url,
      expiresAt,
      s3Key,
      id: doc.id, // Duplicated so the audit interceptor can capture via result.id
    };
  }

  async confirmUpload(user: RequestUser, id: string) {
    const doc = await this.getById(user, id);
    // TODO: verify the S3 object exists (HeadObject) and the checksum matches
    // our stored contentSha256. For local dev we skip this — Session 3+ adds it
    // properly with integrity verification.
    return { confirmed: true, documentId: doc.id };
  }

  async getDownloadUrl(user: RequestUser, id: string) {
    const doc = await this.getById(user, id);
    const url = await this.storage.presignDownload({
      key: doc.s3Key,
      filename: doc.title,
      expiresInSeconds: 60,
    });
    return { url, expiresIn: 60 };
  }

  async softDelete(user: RequestUser, id: string) {
    await this.getById(user, id);
    // Soft-delete DB row; hard-delete the S3 object via a background sweeper
    // after the 30-day customer recovery window.
    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
