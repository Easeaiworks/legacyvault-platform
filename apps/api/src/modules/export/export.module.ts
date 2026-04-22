import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { EstateBinderService } from './estate-binder.service';

@Module({
  controllers: [ExportController],
  providers: [EstateBinderService],
})
export class ExportModule {}
