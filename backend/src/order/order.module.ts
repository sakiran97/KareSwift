import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ServiceCategoryController } from './service-category.controller';
import { AuthModule } from '../auth/auth.module';
import { WarrantyModule } from '../warranty/warranty.module';
import { AppConfigModule } from '../config/config.module';
import { SlotModule } from '../slot/slot.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => WarrantyModule),
    AppConfigModule,
    SlotModule,
  ],
  providers: [OrderService, PrismaService],
  controllers: [OrderController, ServiceCategoryController],
  exports: [OrderService],
})
export class OrderModule {}


