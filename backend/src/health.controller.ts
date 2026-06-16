import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EventsService } from './events/events.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  @Get()
  async check() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'error';
      this.logger.error('Health check DB error', e);
    }

    const redisStatus = this.eventsService.getRedisStatus();

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: dbStatus === 'ok' ? 'ok' : 'error',
      uptime,
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
