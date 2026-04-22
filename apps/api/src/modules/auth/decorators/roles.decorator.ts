import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'auth:roles';

/**
 * Require one of the given roles to access this handler.
 * Use with RolesGuard.
 *
 * @example
 *   @Roles('VAULT_OWNER', 'EXECUTOR')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
