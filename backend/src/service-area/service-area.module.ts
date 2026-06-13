import { Module } from '@nestjs/common';
import { ServiceAreaService } from './service-area.service';
import { ServiceAreaController } from './service-area.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ServiceAreaController],
  providers: [ServiceAreaService, PrismaService],
  exports: [ServiceAreaService],
})
export class ServiceAreaModule {}
