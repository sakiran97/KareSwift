import { Controller, Get, Patch, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  /**
   * GET /admin/dashboard/stats — Overview statistics
   */
  @Get('dashboard/stats')
  async getStats() {
    return this.adminService.getStats();
  }

  /**
   * GET /admin/orders — List all orders (admin overview)
   */
  @Get('orders')
  async getAllOrders() {
    return this.adminService.getAllOrders();
  }

  /**
   * PATCH /admin/orders/:id/cancel — Cancel an order with reason
   */
  @Patch('orders/:id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('Cancellation reason is required');
    }
    return this.adminService.cancelOrder(Number(id), reason.trim());
  }
}
