import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { SlotService } from './slot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('slots')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  @Get('available')
  async getAvailable(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('Date query parameter is required');
    }
    return this.slotService.getAvailableSlotsForDate(date);
  }

  // Admin Configuration Endpoints
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin')
  async adminFindAll() {
    return this.slotService.findAll(false);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() data: any) {
    return this.slotService.create(data);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.slotService.update(Number(id), data);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.slotService.remove(Number(id));
  }
}
