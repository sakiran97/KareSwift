import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderService } from '../order/order.service';

@Injectable()
export class WarrantyService {
  private useMock = false;
  private mockWarranties: any[] = [];
  private nextMockId = 1;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
  ) {}

  private isDbOffline(err: any) {
    return err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused');
  }

  async createWarrantyForOrder(orderId: number, warrantyDays = 90) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + warrantyDays);

    if (!this.useMock) {
      try {
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
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    const mockWarranty = {
      id: this.nextMockId++,
      orderId,
      warrantyDays,
      expiresAt,
      claimCount: 0,
      createdAt: new Date(),
    };
    this.mockWarranties.push(mockWarranty);
    return mockWarranty;
  }

  async listWarranties(userId: number) {
    if (!this.useMock) {
      try {
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
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback
    // Try to get completed orders from order service
    let completedMockOrders: any[] = [];
    try {
      const allOrders = await this.orderService.findByUserId(userId);
      completedMockOrders = allOrders.filter((o: any) => o.status === 'COMPLETED');
    } catch {
      // Ignore if order service fails
    }

    // Map completed mock orders to our mock warranties or create them on the fly
    const result: any[] = [];
    for (const order of completedMockOrders) {
      let w = this.mockWarranties.find(mw => mw.orderId === order.id);
      if (!w) {
        // Create mock warranty on the fly
        const expiresAt = new Date(order.completedAt || order.updatedAt || new Date());
        expiresAt.setDate(expiresAt.getDate() + 90);
        w = {
          id: this.nextMockId++,
          orderId: order.id,
          warrantyDays: 90,
          expiresAt,
          claimCount: 0,
          createdAt: new Date(),
        };
        this.mockWarranties.push(w);
      }

      result.push({
        orderId: order.id,
        device: order.device ? `${order.device.brand} ${order.device.model}` : 'Mock Device',
        service: order.serviceCategory?.name || 'Mock Repair',
        warrantyDays: w.warrantyDays,
        expiresAt: w.expiresAt,
        claimCount: w.claimCount,
        completedAt: order.completedAt || order.updatedAt || new Date(),
      });
    }

    return result;
  }

  async getWarranty(orderId: number, userId: number) {
    if (!this.useMock) {
      try {
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
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback
    const w = this.mockWarranties.find(mw => mw.orderId === orderId);
    if (!w) throw new NotFoundException('Warranty not found');
    return {
      orderId: w.orderId,
      device: 'Mock Device',
      service: 'Mock Repair',
      warrantyDays: w.warrantyDays,
      expiresAt: w.expiresAt,
      claimCount: w.claimCount,
      completedAt: w.createdAt,
    };
  }

  async claimWarranty(orderId: number, userId: number) {
    if (!this.useMock) {
      try {
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

        // Create new order as warranty claim
        const claimOrder = await this.orderService.create({
          userId,
          deviceId: order.deviceId,
          serviceCategoryId: order.serviceCategoryId,
          address: order.address || undefined,
          latitude: order.latitude || undefined,
          longitude: order.longitude || undefined,
          notes: `Warranty claim for order #${orderId}`,
          diagnosticNotes: `Warranty claim for order #${orderId}`,
        });

        return {
          message: 'Warranty claim submitted successfully',
          claimOrderId: claimOrder.id,
        };
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback
    const w = this.mockWarranties.find(mw => mw.orderId === orderId);
    if (!w) throw new NotFoundException('Warranty not found');

    const now = new Date();
    if (now > new Date(w.expiresAt)) {
      throw new BadRequestException('Warranty has expired');
    }

    w.claimCount++;
    const mockClaimOrder = await this.orderService.create({
      userId,
      deviceId: 1, // Default or fetch
      serviceCategoryId: 1,
      notes: `Warranty claim for order #${orderId}`,
    });

    return {
      message: 'Warranty claim submitted successfully (Mock)',
      claimOrderId: mockClaimOrder.id,
    };
  }
}
