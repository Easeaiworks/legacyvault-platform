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
import { InstructionsService } from './instructions.service';

export type InstructionCategory =
  | 'LETTER_OF_WISHES'
  | 'FUNERAL_PREFERENCES'
  | 'ORGAN_DONATION'
  | 'PET_CARE'
  | 'DIGITAL_ACCOUNT_DISPOSITION'
  | 'PERSONAL_MESSAGE'
  | 'OTHER';

export interface CreateInstructionInput {
  category: InstructionCategory;
  title: string;
  body: string;
  recipientPersonId?: string;
}

@Controller('instructions')
@Roles('VAULT_OWNER', 'EXECUTOR', 'VAULT_VIEWER')
export class InstructionsController {
  constructor(private readonly instructions: InstructionsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.instructions.listForUser(user);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.instructions.getById(user, id);
  }

  @Post()
  @Roles('VAULT_OWNER')
  @Audit({ event: 'instruction.created', resourceType: 'Instruction', resourceIdFrom: 'result.id' })
  create(@CurrentUser() user: RequestUser, @Body() body: CreateInstructionInput) {
    return this.instructions.create(user, body);
  }

  @Patch(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'instruction.updated', resourceType: 'Instruction', resourceIdFrom: 'params.id' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<CreateInstructionInput>,
  ) {
    return this.instructions.update(user, id, body);
  }

  @Delete(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'instruction.deleted', resourceType: 'Instruction', resourceIdFrom: 'params.id' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.instructions.softDelete(user, id);
  }
}
