import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { PrismaService } from '../prisma.service';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [AppConfigModule],
  providers: [GeoService, PrismaService],
  exports: [GeoService],
})
export class GeoModule {}
