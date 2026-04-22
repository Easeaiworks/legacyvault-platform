import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UsePipes,
} from '@nestjs/common';
import { CreateDocumentUpload, CreateDocumentUploadSchema } from '@legacyvault/shared';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DocumentsService } from './documents.service';

@Controller('documents')
@Roles('VAULT_OWNER', 'EXECUTOR', 'VAULT_VIEWER')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.documents.listForUser(user);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.getById(user, id);
  }

  /**
   * Two-phase upload: (1) client POSTs metadata + checksum, API returns a presigned
   * PUT URL, (2) client uploads the bytes directly to S3, then (3) confirms.
   *
   * Phase 1:
   */
  @Post('upload-init')
  @Roles('VAULT_OWNER')
  @UsePipes(new ZodValidationPipe(CreateDocumentUploadSchema))
  @Audit({ event: 'document.upload_initiated', resourceType: 'Document', resourceIdFrom: 'result.documentId' })
  initUpload(@CurrentUser() user: RequestUser, @Body() body: CreateDocumentUpload) {
    return this.documents.initUpload(user, body);
  }

  /** Phase 3: client confirms the upload completed and the checksum matches. */
  @Post(':id/upload-confirm')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'document.upload_confirmed', resourceType: 'Document', resourceIdFrom: 'params.id' })
  confirmUpload(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.confirmUpload(user, id);
  }

  @Get(':id/download-url')
  @Audit({ event: 'document.download_url_issued', resourceType: 'Document', resourceIdFrom: 'params.id' })
  downloadUrl(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.getDownloadUrl(user, id);
  }

  @Delete(':id')
  @Roles('VAULT_OWNER')
  @Audit({ event: 'document.deleted', resourceType: 'Document', resourceIdFrom: 'params.id' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.softDelete(user, id);
  }
}
