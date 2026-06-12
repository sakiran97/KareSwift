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
    platform_commission_rate: { value: '15', description: 'Platform commission percentage for cash orders' },
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
   * List all config entries (admin view). Merges DB values with mock defaults.
   */
  async findAll(): Promise<{ key: string; value: string; description: string | null }[]> {
    if (!this.useMock) {
      try {
        const dbConfigs = await this.prisma.appConfig.findMany({
          select: { key: true, value: true, description: true },
          orderBy: { key: 'asc' },
        });
        
        // Merge with mockConfig defaults
        const result = Object.entries(this.mockConfig).map(([key, def]) => {
          const dbConf = dbConfigs.find(c => c.key === key);
          return dbConf || { key, value: def.value, description: def.description || null };
        });
        return result;
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
   * Update a config value (admin only). Uses upsert to create it if it doesn't exist.
   */
  async update(key: string, value: string): Promise<{ key: string; value: string; description: string | null }> {
    if (!this.useMock) {
      try {
        const mockDef = this.mockConfig[key];
        const description = mockDef ? mockDef.description : null;

        const updated = await this.prisma.appConfig.upsert({
          where: { key },
          update: { value },
          create: {
            key,
            value,
            description,
          },
          select: { key: true, value: true, description: true },
        });
        return updated;
      } catch (err: any) {
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
