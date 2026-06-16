import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [ConfigController],
  providers: [ConfigService, PrismaService],
  exports: [ConfigService],
})
export class AppConfigModule {}
