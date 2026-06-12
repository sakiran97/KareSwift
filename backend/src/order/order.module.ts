import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AuthModule } from '../auth/auth.module';
import { WarrantyModule } from '../warranty/warranty.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { AppConfigModule } from '../config/config.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => WarrantyModule),
    forwardRef(() => LoyaltyModule),
    AppConfigModule,
    GeoModule,
  ],
  providers: [OrderService, PrismaService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}


