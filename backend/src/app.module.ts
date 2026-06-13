import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { EventsModule } from './events/events.module';
import { EmailModule } from './email/email.module';
import { PrismaModule } from './prisma.module';
import { NotificationModule } from './notification/notification.module';
import { WarrantyModule } from './warranty/warranty.module';
import { AppConfigModule } from './config/config.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { SearchModule } from './search/search.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// New V2 Core Modules
import { AddressModule } from './address/address.module';
import { ServiceAreaModule } from './service-area/service-area.module';
import { SlotModule } from './slot/slot.module';
import { ReviewModule } from './review/review.module';

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
    EventsModule,
    EmailModule,
    NotificationModule,
    WarrantyModule,
    AppConfigModule,
    AdminModule,
    AiModule,
    SearchModule,
    AddressModule,
    ServiceAreaModule,
    SlotModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

