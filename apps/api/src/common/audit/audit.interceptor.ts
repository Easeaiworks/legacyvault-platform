import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_METADATA_KEY, AuditMetadata } from './audit.decorator';

/**
 * Reads @Audit() decorators on controllers/handlers and emits audit_log rows
 * when the handler completes successfully. Failed requests are logged via the
 * global exception filter (see filters/all-exceptions.filter.ts).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata>(AUDIT_METADATA_KEY, ctx.getHandler());
    if (!meta) {
      return next.handle();
    }

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id?: string; tenantId?: string } | undefined;
    const requestId = req.id ?? req.headers?.['x-request-id'];
    const ipAddress = req.ip;
    const userAgent = req.headers?.['user-agent'];

    return next.handle().pipe(
      tap((result) => {
        void this.audit.record({
          event: meta.event,
          resourceType: meta.resourceType ?? null,
          resourceId: meta.resourceIdFrom
            ? this.extractId(result, req, meta.resourceIdFrom)
            : null,
          userId: user?.id ?? null,
          tenantId: user?.tenantId ?? null,
          afterJson: meta.captureResult ? this.redact(result) : undefined,
          ipAddress,
          userAgent,
          requestId,
        });
      }),
    );
  }

  private extractId(result: unknown, req: any, from: string): string | null {
    // Dotted-path getter: 'result.id' | 'params.id' | 'body.assetId' | etc.
    const root = from.startsWith('result.')
      ? result
      : from.startsWith('params.')
        ? req.params
        : from.startsWith('body.')
          ? req.body
          : null;
    if (!root) return null;
    const key = from.split('.').slice(1).join('.');
    return (root as Record<string, unknown>)[key] as string | null;
  }

  /** Strips encrypted fields and obvious secrets before persisting to audit_logs. */
  private redact(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    const clone = JSON.parse(JSON.stringify(value));
    const walk = (node: Record<string, unknown>) => {
      for (const k of Object.keys(node)) {
        if (/encrypted|password|secret|token|ssn|sin|govId|accountNumber/i.test(k)) {
          node[k] = '[REDACTED]';
        } else if (node[k] && typeof node[k] === 'object') {
          walk(node[k] as Record<string, unknown>);
        }
      }
    };
    walk(clone);
    return clone;
  }
}
