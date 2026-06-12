import { Module } from '@nestjs/common';
import { TechnicianKycController } from './technician-kyc.controller';
import { TechnicianKycService } from './technician-kyc.service';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [TechnicianKycController],
  providers: [TechnicianKycService, PrismaService],
  exports: [TechnicianKycService],
})
export class TechnicianKycModule {}
