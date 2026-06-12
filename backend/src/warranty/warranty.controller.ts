import { Controller, Get, Post, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { WarrantyService } from './warranty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('warranty')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Get()
  async getWarranties(@Req() req: any) {
    const userId = Number(req.user.id);
    return this.warrantyService.listWarranties(userId);
  }

  @Get(':orderId')
  async getWarrantyDetails(@Param('orderId') orderId: string, @Req() req: any) {
    const parsedOrderId = Number(orderId);
    if (isNaN(parsedOrderId)) throw new BadRequestException('Invalid order ID');
    const userId = Number(req.user.id);
    return this.warrantyService.getWarranty(parsedOrderId, userId);
  }

  @Post(':orderId/claim')
  async claimWarranty(@Param('orderId') orderId: string, @Req() req: any) {
    const parsedOrderId = Number(orderId);
    if (isNaN(parsedOrderId)) throw new BadRequestException('Invalid order ID');
    const userId = Number(req.user.id);
    return this.warrantyService.claimWarranty(parsedOrderId, userId);
  }
}
