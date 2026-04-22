import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import { CreateBeneficiary, CreateBeneficiarySchema } from '@legacyvault/shared';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BeneficiariesService } from './beneficiaries.service';
import { ConflictDetectionService } from './conflict-detection.service';

@Controller('beneficiaries')
@Roles('VAULT_OWNER', 'EXECUTOR', 'VAULT_VIEWER')
export class BeneficiariesController {
  constructor(
    private readonly beneficiaries: BeneficiariesService,
    private readonly conflicts: ConflictDetectionService,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.beneficiaries.listForUser(user);
  }

  @Get('conflicts')
  async getConflicts(@CurrentUser() user: RequestUser) {
    return this.conflicts.detect(user);
  }

  @Post()
  @Roles('VAULT_OWNER')
  @UsePipes(new ZodValidationPipe(CreateBeneficiarySchema))
  @Audit({ event: 'beneficiary.created', resourceType: 'Beneficiary', resourceIdFrom: 'result.id' })
  create(@CurrentUser() user: RequestUser, @Body() body: CreateBeneficiary) {
    return this.beneficiaries.create(user, body);
  }

  @Patch(':id')
  @Roles('VAULT_OWNER')
  @UsePipes(new ZodValidationPipe(CreateBeneficiarySchema.partial()))
  @Audit({ event: 'beneficiary.updated', resourceType: 'Beneficiary', resourceIdFrom: 'params.id' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<CreateBeneficiary>,
  ) {
    return this.beneficiaries.update(user, id, body);
  }

  @Delete(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'beneficiary.deleted', resourceType: 'Beneficiary', resourceIdFrom: 'params.id' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.beneficiaries.softDelete(user, id);
  }
}
