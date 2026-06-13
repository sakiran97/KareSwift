import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('service-categories')
export class ServiceCategoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  async findAllAdmin() {
    return this.prisma.serviceCategory.findMany({
      orderBy: { id: 'asc' },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() data: { name: string; description?: string; isActive?: boolean }) {
    return this.prisma.serviceCategory.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; isActive?: boolean }
  ) {
    return this.prisma.serviceCategory.update({
      where: { id: Number(id) },
      data,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.order.updateMany({
      where: { serviceCategoryId: Number(id) },
      data: { serviceAreaId: null } // Clean up references if needed, or simply delete.
    });
    return this.prisma.serviceCategory.delete({
      where: { id: Number(id) },
    });
  }
}
