import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  async create(@Req() req: any, @Body() data: any) {
    const userId = Number(req.user.id);
    return this.addressService.create(userId, data);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = Number(req.user.id);
    return this.addressService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id);
    return this.addressService.findOne(Number(id), userId);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    const userId = Number(req.user.id);
    return this.addressService.update(Number(id), userId, data);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id);
    return this.addressService.remove(Number(id), userId);
  }

  @Patch(':id/default')
  async setDefault(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id);
    return this.addressService.setDefault(Number(id), userId);
  }
}
