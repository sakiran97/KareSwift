import { Controller, Get, Patch, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('technician', 'admin')
@Controller('technician')
export class TechnicianController {
  constructor(private readonly technicianService: TechnicianService) {}

  @Get('orders/available')
  async getAvailableOrders(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    const lat = latitude ? Number(latitude) : undefined;
    const lon = longitude ? Number(longitude) : undefined;
    return this.technicianService.getAvailableOrders(lat, lon);
  }

  @Post('orders/:id/accept')
  async acceptOrder(@Req() req: any, @Param('id') id: string) {
    return this.technicianService.acceptOrder(req.user.id, Number(id));
  }

  @Get('orders')
  async getAssignedOrders(@Req() req: any) {
    return this.technicianService.getAssignedOrders(Number(req.user.id));
  }

  @Post('orders/:id/request-completion')
  async requestCompletion(
     @Req() req: any,
     @Param('id') id: string,
     @Body('finalAmount') finalAmount: number,
  ) {
    return this.technicianService.requestCompletion(Number(req.user.id), Number(id), finalAmount);
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
     @Req() req: any,
     @Param('id') id: string,
     @Body('status') status: string,
     @Body('partsUsed') partsUsed?: string,
     @Body('laborNotes') laborNotes?: string,
     @Body('finalAmount') finalAmount?: number,
     @Body('otp') otp?: string,
  ) {
    return this.technicianService.updateOrderStatus(Number(req.user.id), Number(id), status, partsUsed, laborNotes, finalAmount, otp);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.technicianService.getProfile(Number(req.user.id));
  }

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body('name') name: string) {
    return this.technicianService.updateProfile(Number(req.user.id), { name });
  }

  @Get('earnings/today')
  async getDailyEarnings(@Req() req: any) {
    return this.technicianService.getDailyEarnings(Number(req.user.id));
  }
}
