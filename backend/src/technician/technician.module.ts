import { Module } from '@nestjs/common';
import { TechnicianController } from './technician.controller';
import { TechnicianService } from './technician.service';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [AuthModule, OrderModule],
  controllers: [TechnicianController],
  providers: [TechnicianService, PrismaService],
})
export class TechnicianModule {}
