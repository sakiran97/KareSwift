import { Controller, Get, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  async getLoyaltyAccount(@Req() req: any) {
    const userId = Number(req.user.id);
    return this.loyaltyService.getAccount(userId);
  }

  @Post('redeem')
  async redeemPoints(@Req() req: any, @Body() body: { optionId: string }) {
    if (!body.optionId) throw new BadRequestException('Reward optionId is required');
    const userId = Number(req.user.id);
    return this.loyaltyService.redeemPoints(userId, body.optionId);
  }
}
