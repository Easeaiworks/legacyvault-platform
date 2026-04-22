import { Module } from '@nestjs/common';
import { TrustedContactsController } from './trusted-contacts.controller';
import { TrustedContactsService } from './trusted-contacts.service';
import { CheckInService } from './check-in.service';

@Module({
  controllers: [TrustedContactsController],
  providers: [TrustedContactsService, CheckInService],
  exports: [TrustedContactsService, CheckInService],
})
export class TrustedContactsModule {}
