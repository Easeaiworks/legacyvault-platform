import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit:metadata';

export interface AuditMetadata {
  /** Machine-readable event name, e.g. "asset.created", "document.downloaded". */
  event: string;
  /** Resource type, e.g. "Asset", "Document". */
  resourceType?: string;
  /** Where to extract the resource id from. e.g. "result.id", "params.id", "body.assetId". */
  resourceIdFrom?: string;
  /** If true, the (redacted) handler result is stored in afterJson. Default false. */
  captureResult?: boolean;
}

/**
 * Mark a controller method for audit logging.
 *
 * @example
 *   @Audit({ event: 'asset.created', resourceType: 'Asset', resourceIdFrom: 'result.id' })
 *   async create(...) { ... }
 */
export const Audit = (meta: AuditMetadata) => SetMetadata(AUDIT_METADATA_KEY, meta);
