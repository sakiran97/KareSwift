import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /config — List all config entries (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    return this.configService.findAll();
  }

  /**
   * GET /config/:key — Get a specific config value (any authenticated user)
   */
  @Get(':key')
  async findOne(@Param('key') key: string) {
    const value = await this.configService.get(key);
    return { key, value };
  }

  /**
   * PATCH /config/:key — Update a config value (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':key')
  async update(@Param('key') key: string, @Body('value') value: string) {
    return this.configService.update(key, value);
  }
}
