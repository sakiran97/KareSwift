import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderService } from '../order/order.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
    private eventsService: EventsService,
  ) {}

  /**
   * Get overview statistics for the admin dashboard.
   */
  async getStats() {
    const CACHE_KEY = 'admin:dashboard:stats';
    const cached = await this.eventsService.getCache(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

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

    const stats = {
      totalOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
    };

    await this.eventsService.setCache(CACHE_KEY, JSON.stringify(stats), 60);

    return stats;
  }

  /**
   * Get all orders with full detail (admin overview).
   */
  async getAllOrders(page = 1, limit = 20, search?: string, status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      const searchNum = parseInt(search, 10);
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
      if (!isNaN(searchNum)) {
        where.OR.push({ id: searchNum });
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          device: true,
          serviceCategory: true,
          user: { select: { id: true, name: true, phone: true } },
          serviceArea: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
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
