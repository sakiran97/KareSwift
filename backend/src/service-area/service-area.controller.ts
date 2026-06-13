import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ServiceAreaService } from './service-area.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('service-areas')
export class ServiceAreaController {
  constructor(private readonly serviceAreaService: ServiceAreaService) {}

  @Get('active')
  async findActive() {
    return this.serviceAreaService.findAll(true);
  }

  @Get('check')
  async check(@Query('addressId') addressId: string) {
    return this.serviceAreaService.checkAvailability(Number(addressId));
  }

  // Admin Configuration Endpoints
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin')
  async adminFindAll() {
    return this.serviceAreaService.findAll(false);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() data: any) {
    return this.serviceAreaService.create(data);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.serviceAreaService.update(Number(id), data);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.serviceAreaService.remove(Number(id));
  }
}
