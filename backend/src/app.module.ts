import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { TechnicianModule } from './technician/technician.module';
import { EventsModule } from './events/events.module';
import { EmailModule } from './email/email.module';
import { PrismaModule } from './prisma.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notification/notification.module';
import { FeedbackModule } from './feedback/feedback.module';
import { WarrantyModule } from './warranty/warranty.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { AppConfigModule } from './config/config.module';
import { GeoModule } from './geo/geo.module';
import { TechnicianKycModule } from './technician-kyc/technician-kyc.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { PaymentModule } from './payment/payment.module';
import { WalletModule } from './wallet/wallet.module';
import { SearchModule } from './search/search.module';
import { FranchiseModule } from './franchise/franchise.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'admin-dashboard', 'dist', 'admin-dashboard', 'browser'),
      serveRoot: '/admin',
    }),
    PrismaModule,
    AuthModule,
    OrderModule,
    TechnicianModule,
    EventsModule,
    EmailModule,
    ChatModule,
    NotificationModule,
    FeedbackModule,
    WarrantyModule,
    LoyaltyModule,
    AppConfigModule,
    GeoModule,
    TechnicianKycModule,
    AdminModule,
    AiModule,
    PaymentModule,
    WalletModule,
    SearchModule,
    FranchiseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

