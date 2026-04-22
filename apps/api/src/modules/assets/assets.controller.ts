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
import { CreateAsset, CreateAssetSchema, UpdateAsset, UpdateAssetSchema } from '@legacyvault/shared';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AssetsService } from './assets.service';

@Controller('assets')
@Roles('VAULT_OWNER', 'EXECUTOR', 'VAULT_VIEWER')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return this.assets.listForUser(user);
  }

  @Get(':id')
  async getById(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assets.getById(user, id);
  }

  @Post()
  @Roles('VAULT_OWNER')
  @UsePipes(new ZodValidationPipe(CreateAssetSchema))
  @Audit({ event: 'asset.created', resourceType: 'Asset', resourceIdFrom: 'result.id', captureResult: true })
  async create(@CurrentUser() user: RequestUser, @Body() body: CreateAsset) {
    return this.assets.create(user, body);
  }

  @Patch(':id')
  @Roles('VAULT_OWNER')
  @UsePipes(new ZodValidationPipe(UpdateAssetSchema))
  @Audit({ event: 'asset.updated', resourceType: 'Asset', resourceIdFrom: 'params.id' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAsset,
  ) {
    return this.assets.update(user, id, body);
  }

  @Delete(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'asset.deleted', resourceType: 'Asset', resourceIdFrom: 'params.id' })
  async remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assets.softDelete(user, id);
  }
}
