import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Query, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { TechnicianKycService } from '../technician-kyc/technician-kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly kycService: TechnicianKycService,
  ) {}

  /**
   * GET /admin/dashboard/stats — Overview statistics
   */
  @Get('dashboard/stats')
  async getStats() {
    return this.adminService.getStats();
  }

  /**
   * GET /admin/kyc/pending — Pending KYC reviews
   */
  @Get('kyc/pending')
  async getPendingKyc() {
    return this.kycService.getPendingKycReviews();
  }

  /**
   * GET /admin/kyc/:userId — Full KYC details for a technician
   */
  @Get('kyc/:userId')
  async getKycDetails(@Param('userId') userId: string) {
    return this.adminService.getTechnicianKycDetails(Number(userId));
  }

  /**
   * POST /admin/kyc/:userId/approve — Approve KYC
   */
  @Post('kyc/:userId/approve')
  async approveKyc(@Req() req: any, @Param('userId') userId: string) {
    const adminUserId = req.user.id;
    return this.kycService.approveKyc(Number(userId), Number(adminUserId));
  }

  /**
   * POST /admin/kyc/:userId/reject — Reject KYC
   */
  @Post('kyc/:userId/reject')
  async rejectKyc(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }
    const adminUserId = req.user.id;
    return this.kycService.rejectKyc(Number(userId), Number(adminUserId), reason.trim());
  }

  /**
   * GET /admin/shops/pending — Pending shop verifications
   */
  @Get('shops/pending')
  async getPendingShops() {
    return this.kycService.getPendingShopReviews();
  }

  /**
   * POST /admin/shops/:userId/approve — Approve shop
   */
  @Post('shops/:userId/approve')
  async approveShop(@Param('userId') userId: string) {
    return this.kycService.approveShop(Number(userId));
  }

  /**
   * POST /admin/shops/:userId/reject — Reject shop
   */
  @Post('shops/:userId/reject')
  async rejectShop(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }
    return this.kycService.rejectShop(Number(userId), reason.trim());
  }

  /**
   * GET /admin/technicians — List all technicians with optional status filters
   */
  @Get('technicians')
  async getTechnicians(@Query('kycStatus') kycStatus?: string) {
    return this.kycService.getAllTechnicians(kycStatus ? { kycStatus } : undefined);
  }

  /**
   * PATCH /admin/technicians/:userId/suspend — Suspend a technician
   */
  @Patch('technicians/:userId/suspend')
  async suspendTechnician(@Param('userId') userId: string) {
    return this.adminService.suspendTechnician(Number(userId));
  }

  /**
   * PATCH /admin/technicians/:userId/activate — Reactivate a technician
   */
  @Patch('technicians/:userId/activate')
  async activateTechnician(@Param('userId') userId: string) {
    return this.adminService.activateTechnician(Number(userId));
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
