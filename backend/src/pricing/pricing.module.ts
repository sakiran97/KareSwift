import { Global, Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CommissionService } from './commission.service';

@Global()
@Module({
  providers: [PricingService, CommissionService],
  exports: [PricingService, CommissionService],
})
export class PricingModule {}
