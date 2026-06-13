import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ConfigService {
  private useMock = false;
  // In-memory defaults used when DB is offline
  private mockConfig: Record<string, { value: string; description?: string }> = {
    booking_enabled: { value: 'true', description: 'Enable or disable customer bookings' },
    same_day_booking: { value: 'true', description: 'Allow customer to book same-day repairs' },
    max_bookings_per_day: { value: '10', description: 'Maximum customer bookings allowed per day' },
    upi_enabled: { value: 'true', description: 'Enable or disable UPI payment option' },
    cash_enabled: { value: 'true', description: 'Enable or disable cash payment option' },
    qr_enabled: { value: 'true', description: 'Enable or disable QR payment option' },
    qr_image_url: { value: 'assets/qr-code-placeholder.png', description: 'URL or path to static QR Code image' },
    review_mandatory: { value: 'false', description: 'Require reviews after successful repair completion' },
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
        
        // Merge DB configurations and mock defaults
        const dbKeys = new Set(dbConfigs.map(c => c.key));
        const merged = [...dbConfigs];
        for (const [key, def] of Object.entries(this.mockConfig)) {
          if (!dbKeys.has(key)) {
            merged.push({ key, value: def.value, description: def.description || null });
          }
        }
        return merged.sort((a, b) => a.key.localeCompare(b.key));
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
    })).sort((a, b) => a.key.localeCompare(b.key));
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
