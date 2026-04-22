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
import { CreatePerson, CreatePersonSchema } from '@legacyvault/shared';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PersonsService } from './persons.service';

@Controller('persons')
@Roles('VAULT_OWNER', 'EXECUTOR', 'VAULT_VIEWER')
export class PersonsController {
  constructor(private readonly persons: PersonsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.persons.listForUser(user);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.persons.getById(user, id);
  }

  @Post()
  @Roles('VAULT_OWNER')
  @UsePipes(new ZodValidationPipe(CreatePersonSchema))
  @Audit({ event: 'person.created', resourceType: 'Person', resourceIdFrom: 'result.id' })
  create(@CurrentUser() user: RequestUser, @Body() body: CreatePerson) {
    return this.persons.create(user, body);
  }

  @Patch(':id')
  @Roles('VAULT_OWNER')
  @UsePipes(new ZodValidationPipe(CreatePersonSchema.partial()))
  @Audit({ event: 'person.updated', resourceType: 'Person', resourceIdFrom: 'params.id' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<CreatePerson>,
  ) {
    return this.persons.update(user, id, body);
  }

  @Delete(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'person.deleted', resourceType: 'Person', resourceIdFrom: 'params.id' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.persons.softDelete(user, id);
  }
}
