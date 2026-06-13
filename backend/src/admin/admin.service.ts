import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderService } from '../order/order.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
  ) {}

  /**
   * Get overview statistics for the admin dashboard.
   */
  async getStats() {
    const totalOrders = await this.prisma.order.count();

    const activeOrders = await this.prisma.order.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    const completedOrders = await this.prisma.order.count({
      where: { status: 'COMPLETED' },
    });

    const cancelledOrders = await this.prisma.order.count({
      where: { status: 'CANCELLED' },
    });

    const revenueResult = await this.prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { finalAmount: true },
    });

    const totalRevenue = Number(revenueResult._sum.finalAmount || 0);

    return {
      totalOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
    };
  }

  /**
   * Get all orders with full detail (admin overview).
   */
  async getAllOrders() {
    return this.orderService.findAll();
  }

  /**
   * Cancel an order by admin with a reason.
   */
  async cancelOrder(orderId: number, reason: string): Promise<any> {
    const order = await this.orderService.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.orderService.updateStatus(orderId, 'CANCELLED' as any, undefined, reason);
  }
}
