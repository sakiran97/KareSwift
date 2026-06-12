import { Module, forwardRef } from '@nestjs/common';
import { WarrantyController } from './warranty.controller';
import { WarrantyService } from './warranty.service';
import { PrismaService } from '../prisma.service';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [forwardRef(() => OrderModule)],
  controllers: [WarrantyController],
  providers: [WarrantyService, PrismaService],
  exports: [WarrantyService],
})
export class WarrantyModule {}
