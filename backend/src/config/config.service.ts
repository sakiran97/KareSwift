import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ConfigService {
  private useMock = false;
  // In-memory defaults used when DB is offline
  private mockConfig: Record<string, { value: string; description?: string }> = {
    service_radius_km: { value: '10', description: 'Max distance in km to match nearby technicians' },
    max_orders_per_slot: { value: '3', description: 'Max orders allowed per time slot' },
    max_active_orders_per_technician: { value: '1', description: 'Max active orders a technician can hold' },
    technician_location_ping_sec: { value: '30', description: 'Location update frequency in seconds' },
    search_timeout_sec: { value: '120', description: 'How long to search for nearby technicians' },
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Get a single config value by key. Returns the value string, or the default if not found.
   */
  async get(key: string): Promise<string> {
    if (!this.useMock) {
      try {
        const config = await this.prisma.appConfig.findUnique({ where: { key } });
        if (config) return config.value;
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    const mock = this.mockConfig[key];
    if (mock) return mock.value;
    throw new NotFoundException(`Config key '${key}' not found`);
  }

  /**
   * Get a config value as a number.
   */
  async getNumber(key: string): Promise<number> {
    const val = await this.get(key);
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Config '${key}' is not a valid number: '${val}'`);
    return num;
  }

  /**
   * List all config entries (admin view).
   */
  async findAll(): Promise<{ key: string; value: string; description: string | null }[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.appConfig.findMany({
          select: { key: true, value: true, description: true },
          orderBy: { key: 'asc' },
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    return Object.entries(this.mockConfig).map(([key, { value, description }]) => ({
      key,
      value,
      description: description || null,
    }));
  }

  /**
   * Update a config value (admin only).
   */
  async update(key: string, value: string): Promise<{ key: string; value: string; description: string | null }> {
    if (!this.useMock) {
      try {
        const existing = await this.prisma.appConfig.findUnique({ where: { key } });
        if (!existing) throw new NotFoundException(`Config key '${key}' not found`);

        const updated = await this.prisma.appConfig.update({
          where: { key },
          data: { value },
          select: { key: true, value: true, description: true },
        });
        return updated;
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    if (!this.mockConfig[key]) throw new NotFoundException(`Config key '${key}' not found`);
    this.mockConfig[key].value = value;
    return { key, value, description: this.mockConfig[key].description || null };
  }

  private isDbOffline(err: any): boolean {
    return err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused');
  }
}
