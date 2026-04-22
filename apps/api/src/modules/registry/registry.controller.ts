import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { RegistryService } from './registry.service';
import type { RegistryOptInInput, RegistryUpdateInput } from './types';

@Controller('registry')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  /**
   * Public endpoint: returns non-sensitive policy + stats so the marketing
   * landing page can render the registry hero consistently.
   */
  @Public()
  @Get('policy')
  policy() {
    return this.registry.publicPolicy();
  }

  @Roles('VAULT_OWNER', 'VAULT_VIEWER')
  @Get('me')
  getMyStatus(@CurrentUser() user: RequestUser) {
    return this.registry.getForUser(user);
  }

  @Roles('VAULT_OWNER')
  @Post('me/opt-in')
  @Audit({ event: 'registry.opt_in', resourceType: 'RegistryEntry', resourceIdFrom: 'result.id' })
  optIn(@CurrentUser() user: RequestUser, @Body() body: RegistryOptInInput) {
    return this.registry.optIn(user, body);
  }

  @Roles('VAULT_OWNER')
  @Patch('me')
  @Audit({ event: 'registry.updated', resourceType: 'RegistryEntry', resourceIdFrom: 'result.id' })
  update(@CurrentUser() user: RequestUser, @Body() body: RegistryUpdateInput) {
    return this.registry.update(user, body);
  }

  @Roles('VAULT_OWNER')
  @Delete('me')
  @Audit({ event: 'registry.opt_out' })
  optOut(@CurrentUser() user: RequestUser) {
    return this.registry.optOut(user);
  }

  /**
   * Kick off identity verification via Stripe Identity / Persona.
   * For now this returns a placeholder workflow ID; Session 3+ swaps in
   * the real provider.
   */
  @Roles('VAULT_OWNER')
  @Post('me/verify-identity')
  @Audit({ event: 'registry.identity_verification_started' })
  startIdentityVerification(@CurrentUser() user: RequestUser) {
    return this.registry.startIdentityVerification(user);
  }
}
