import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderService } from '../order/order.service';

@Injectable()
export class WarrantyService {

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
  ) {}

  async createWarrantyForOrder(orderId: number, warrantyDays = 90) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + warrantyDays);

    const existing = await this.prisma.warranty.findUnique({ where: { orderId } });
    if (existing) return existing;

    return await this.prisma.warranty.create({
      data: {
        orderId,
        warrantyDays,
        expiresAt,
        claimCount: 0,
      },
    });
  }

  async listWarranties(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        warranty: { isNot: null },
      },
      include: {
        warranty: true,
        device: true,
        serviceCategory: true,
      },
    });

    return orders.map(o => ({
      orderId: o.id,
      device: `${o.device.brand} ${o.device.model}`,
      service: o.serviceCategory.name,
      warrantyDays: o.warranty!.warrantyDays,
      expiresAt: o.warranty!.expiresAt,
      claimCount: o.warranty!.claimCount,
      completedAt: o.completedAt || o.updatedAt,
    }));
  }

  async getWarranty(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        warranty: true,
        device: true,
        serviceCategory: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new BadRequestException('Unauthorized access to warranty');
    if (!order.warranty) throw new NotFoundException('No warranty active for this order');

    return {
      orderId: order.id,
      device: `${order.device.brand} ${order.device.model}`,
      service: order.serviceCategory.name,
      warrantyDays: order.warranty.warrantyDays,
      expiresAt: order.warranty.expiresAt,
      claimCount: order.warranty.claimCount,
      completedAt: order.completedAt || order.updatedAt,
    };
  }

  async claimWarranty(orderId: number, userId: number, description?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { warranty: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new BadRequestException('Unauthorized claim request');
    if (!order.warranty) throw new BadRequestException('No active warranty for this order');

    const now = new Date();
    if (now > new Date(order.warranty.expiresAt)) {
      throw new BadRequestException('Warranty has expired');
    }

    // Increment claim count
    await this.prisma.warranty.update({
      where: { orderId },
      data: { claimCount: { increment: 1 } },
    });

    const baseNotes = `Warranty claim for order #${orderId}`;
    const claimNotes = description ? `${baseNotes}. Issue: ${description}` : baseNotes;

    // Create new order as warranty claim
    const claimOrder = await this.orderService.create({
      userId,
      deviceId: order.deviceId,
      serviceCategoryId: order.serviceCategoryId,
      address: order.address || undefined,
      notes: claimNotes,
      diagnosticNotes: claimNotes,
    });

    return {
      message: 'Warranty claim submitted successfully',
      claimOrderId: claimOrder.id,
    };
  }
}
