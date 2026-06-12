import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { PrismaService } from '../prisma.service';
import { AppConfigModule } from '../config/config.module';
import { GeoController } from './geo.controller';

@Module({
  imports: [AppConfigModule],
  controllers: [GeoController],
  providers: [GeoService, PrismaService],
  exports: [GeoService],
})
export class GeoModule {}
