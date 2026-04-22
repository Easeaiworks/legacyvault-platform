import { Module } from '@nestjs/common';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';
import { ConflictDetectionService } from './conflict-detection.service';

@Module({
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService, ConflictDetectionService],
  exports: [BeneficiariesService, ConflictDetectionService],
})
export class BeneficiariesModule {}
