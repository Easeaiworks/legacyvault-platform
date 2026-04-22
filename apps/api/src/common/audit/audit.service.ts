import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecord {
  tenantId?: string | null;
  userId?: string | null;
  event: string;
  resourceType?: string | null;
  resourceId?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * AuditService writes to the append-only audit_logs table.
 * The table is protected by DB triggers + REVOKE; see the init migration.
 *
 * Redaction rule: callers MUST NOT pass raw sensitive fields (SSN/SIN, account numbers,
 * encrypted-field plaintext) into beforeJson / afterJson. Pass either ciphertext, masked
 * values (e.g. "****4532"), or metadata only.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(rec: AuditRecord): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: rec.tenantId ?? null,
          userId: rec.userId ?? null,
          event: rec.event,
          resourceType: rec.resourceType ?? null,
          resourceId: rec.resourceId ?? null,
          beforeJson: (rec.beforeJson as never) ?? undefined,
          afterJson: (rec.afterJson as never) ?? undefined,
          ipAddress: rec.ipAddress ?? null,
          userAgent: rec.userAgent ?? null,
          requestId: rec.requestId ?? null,
        },
      });
    } catch (err) {
      // Audit failure is a critical alert — surface but never block the request path.
      this.logger.error({ err, event: rec.event }, 'AUDIT_WRITE_FAILED');
    }
  }
}
