import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { TrustedContactsService } from './trusted-contacts.service';
import { CheckInService } from './check-in.service';
import type { CreateTrustedContactInput } from './types';

@Controller('trusted-contacts')
@Roles('VAULT_OWNER', 'EXECUTOR', 'VAULT_VIEWER')
export class TrustedContactsController {
  constructor(
    private readonly tc: TrustedContactsService,
    private readonly checkIn: CheckInService,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.tc.listForUser(user);
  }

  @Post()
  @Roles('VAULT_OWNER')
  @Audit({ event: 'trusted_contact.created', resourceType: 'TrustedContact', resourceIdFrom: 'result.id' })
  create(@CurrentUser() user: RequestUser, @Body() body: CreateTrustedContactInput) {
    return this.tc.create(user, body);
  }

  @Patch(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'trusted_contact.updated', resourceType: 'TrustedContact', resourceIdFrom: 'params.id' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<CreateTrustedContactInput>,
  ) {
    return this.tc.update(user, id, body);
  }

  @Delete(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'trusted_contact.deleted', resourceType: 'TrustedContact', resourceIdFrom: 'params.id' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tc.softDelete(user, id);
  }

  // ---- Dead-man's-switch ----

  @Post('check-in')
  @Audit({ event: 'trusted_contact.check_in' })
  checkInNow(@CurrentUser() user: RequestUser) {
    return this.checkIn.checkIn(user.id);
  }

  @Get('check-in/status')
  status(@CurrentUser() user: RequestUser) {
    return this.checkIn.getStatus(user.id);
  }

  /**
   * Called by a trusted contact to request an emergency unlock.
   * Begins the waiting-period countdown.
   */
  @Post(':id/request-emergency-unlock')
  @Audit({ event: 'trusted_contact.emergency_unlock_requested', resourceType: 'TrustedContact', resourceIdFrom: 'params.id' })
  requestEmergencyUnlock(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.checkIn.requestEmergencyUnlock(user.id, id, reason);
  }
}
