import { Controller, Get, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { EstateBinderService } from './estate-binder.service';

@Controller('export')
@Roles('VAULT_OWNER', 'EXECUTOR')
export class ExportController {
  constructor(private readonly binder: EstateBinderService) {}

  @Get('estate-binder.pdf')
  @Audit({ event: 'export.estate_binder_generated' })
  async estateBinder(@CurrentUser() user: RequestUser, @Res() res: FastifyReply) {
    const pdf = await this.binder.generate(user);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="estate-binder-${Date.now()}.pdf"`)
      .header('Cache-Control', 'private, no-store')
      .send(pdf);
  }
}
