import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private prisma: PrismaService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async getBalance(@Request() req: any) {
    return await this.walletService.getWallet(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-funds')
  async addFunds(@Request() req: any, @Body() body: { amount: number; paymentProvider: string }) {
    // In a real app, this would be a webhook callback from Stripe/Razorpay
    // after verifying the payment signature. For this MVP, we simulate success.
    const referenceId = `PAY_${Math.floor(Math.random() * 1000000)}`;
    return await this.walletService.addFunds(req.user.id, body.amount, referenceId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('pay-order/:id')
  async payOrder(@Request() req: any, @Param('id') orderIdStr: string, @Body('method') method: string = 'wallet') {
    const orderId = parseInt(orderIdStr, 10);
    
    // Fetch the order to get the finalAmount and technicianId
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const amount = Number(order.finalAmount || 50); // fallback to 50 if empty for testing

    if (method === 'wallet') {
      // Deduct funds from Customer's Wallet
      const wallet = await this.walletService.deductFunds(
        req.user.id, 
        amount, 
        `Paid for Order #${orderId} (Wallet)`, 
        `ORD_${orderId}`
      );
      
      // Update order to mark payment method
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentMethod: 'wallet' }
      });

      return { success: true, method: 'wallet', wallet };
    } else if (method === 'cash') {
      // Customer paid in cash directly to technician.
      // Deduct 15% commission from the Technician's Wallet.
      const commission = Number((amount * 0.15).toFixed(2));
      
      if (order.technicianId) {
        try {
          await this.walletService.deductFunds(
            order.technicianId,
            commission,
            `Commission for Cash Order #${orderId}`,
            `COMM_ORD_${orderId}`,
            true // allowNegative
          );
        } catch (err: any) {
          console.warn(`Failed to deduct commission from Technician ${order.technicianId}:`, err.message);
        }
      }

      // Update order
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentMethod: 'cash' }
      });

      return { success: true, method: 'cash' };
    }

    throw new Error('Invalid payment method');
  }
}
