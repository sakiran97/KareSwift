import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma';
import { OrderService } from '../order/order.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class TechnicianService {
  private useMock = false;
  private mockOrders: any[] = [];
  private mockNextId = 100;

  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
    private eventsService: EventsService,
  ) {
    this.mockOrders.push({
      id: 101,
      userId: 1,
      deviceId: 1,
      serviceCategoryId: 1,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: '123 Main St',
      estimatedTime: 45,
      scheduledDate: null,
      scheduledSlot: null,
      technicianId: 2,
      latitude: null,
      longitude: null,
      user: { name: 'John Doe', phone: '1234567890' },
      device: { brand: 'Apple', model: 'iPhone 14' },
      serviceCategory: { name: 'Screen Replacement' },
    });
    this.mockOrders.push({
      id: 102,
      userId: 1,
      deviceId: 2,
      serviceCategoryId: 2,
      status: 'IN_PROGRESS',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: '456 Oak Ave',
      estimatedTime: 60,
      scheduledDate: null,
      scheduledSlot: null,
      technicianId: 2,
      latitude: null,
      longitude: null,
      user: { name: 'Jane Smith', phone: '0987654321' },
      device: { brand: 'Samsung', model: 'Galaxy S23' },
      serviceCategory: { name: 'Battery Replacement' },
    });
    this.mockOrders.push({
      id: 103,
      userId: 1,
      deviceId: 3,
      serviceCategoryId: 3,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: '789 Pine Rd',
      estimatedTime: 30,
      scheduledDate: null,
      scheduledSlot: null,
      technicianId: null,
      latitude: null,
      longitude: null,
      user: { name: 'Bob Wilson', phone: '5551234567' },
      device: { brand: 'Google', model: 'Pixel 8 Pro' },
      serviceCategory: { name: 'Charging Port Fix' },
    });
  }

  async getAvailableOrders(lat?: number, lon?: number): Promise<any[]> {
    return this.orderService.getAvailableOrders(lat, lon);
  }

  async acceptOrder(technicianId: number, orderId: number): Promise<any> {
    return this.orderService.acceptOrder(orderId, technicianId);
  }

  async getAssignedOrders(technicianId: number) {
    if (!this.useMock) {
      try {
        return await this.prisma.order.findMany({
          where: { technicianId },
          include: {
            user: { select: { name: true, phone: true } },
            device: true,
            serviceCategory: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('Prisma error in getAssignedOrders:', err);
        // Fall back to mock without permanently disabling DB
      }
    }
    return this.mockOrders.filter(o => o.technicianId === technicianId);
  }

  async requestCompletion(technicianId: number, orderId: number, finalAmount: number) {
    if (!this.useMock) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.technicianId !== technicianId) throw new ForbiddenException('Not your order');

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      await this.prisma.order.update({
        where: { id: orderId },
        data: { completionOtp: otp, finalAmount }
      });

      // Emit event so customer sees the OTP prompt
      this.eventsService.emit('completion-requested', { id: orderId, otp, finalAmount });

      return { success: true };
    }
    
    // Mock
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const order = this.mockOrders.find(o => o.id === orderId && o.technicianId === technicianId);
    if (order) {
      order.completionOtp = otp;
      order.finalAmount = finalAmount;
    }
    this.eventsService.emit('completion-requested', { id: orderId, otp, finalAmount });
    return { success: true };
  }

  async updateOrderStatus(technicianId: number, orderId: number, status: string, partsUsed?: string, laborNotes?: string, finalAmount?: number, otp?: string) {
    const validStatuses = ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new NotFoundException(`Invalid status: ${status}`);
    }

    if (!this.useMock) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.technicianId !== technicianId) {
          throw new ForbiddenException('This order is not assigned to you');
        }

        // Delegate status update to OrderService to handle notifications, warranties, loyalty points, etc.
        return await this.orderService.updateStatus(orderId, status as any, partsUsed, laborNotes, finalAmount, otp);
      } catch (err) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) throw err;
        console.warn('Prisma error in updateOrderStatus:', err);
      }
    }

    // Mock fallback
    const order = this.mockOrders.find(o => o.id === orderId && o.technicianId === technicianId);
    if (!order) throw new NotFoundException('Order not found');
    
    // Delegate status update to OrderService mock fallback
    return await this.orderService.updateStatus(orderId, status as any, partsUsed, laborNotes, finalAmount, otp);
  }

  async getProfile(technicianId: number) {
    if (!this.useMock) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: technicianId } });
        if (!user) throw new NotFoundException('Technician not found');
        const { passwordHash, ...result } = user;
        return result;
      } catch (err) {
        console.warn('Prisma error in getProfile:', err);
      }
    }
    return { id: technicianId, name: 'Demo Technician', email: 'tech@doorstep.com', role: 'technician', technicianId: 'TECH-001' };
  }

  async updateProfile(technicianId: number, data: { name?: string }) {
    if (!this.useMock) {
      try {
        const user = await this.prisma.user.update({
          where: { id: technicianId },
          data,
        });
        const { passwordHash, ...result } = user;
        return result;
      } catch (err) {
        console.warn('Prisma error in updateProfile:', err);
      }
    }
    return { id: technicianId, name: data.name || 'Demo Technician', role: 'technician', technicianId: 'TECH-001' };
  }

  async getDailyEarnings(technicianId: number) {
    if (!this.useMock) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const orders = await this.prisma.order.findMany({
          where: {
            technicianId,
            status: 'COMPLETED',
            completedAt: { gte: today },
          },
        });

        let totalEarnings = 0;
        let totalCommission = 0;

        for (const order of orders) {
          const amt = Number(order.finalAmount || 0);
          totalEarnings += amt;
          if (order.paymentMethod === 'cash') {
            totalCommission += amt * 0.15;
          }
        }

        return {
          totalEarnings,
          totalCommission,
        };
      } catch (err) {
        console.warn('Prisma error in getDailyEarnings:', err);
      }
    }
    return { totalEarnings: 1500, totalCommission: 225 };
  }

  private async createNotification(userId: number, title: string, body: string, type: string, orderId?: number) {
    if (!this.useMock) {
      try {
        const notification = await this.prisma.notification.create({
          data: {
            userId,
            title,
            body,
            type,
            orderId,
          }
        });
        this.eventsService.emit('notification', { ...notification, targetUserId: userId });
        return;
      } catch (err: any) {
        console.warn('Failed to create notification in DB:', err.message);
      }
    }
    // Mock / fallback emission
    this.eventsService.emit('notification', {
      id: Math.floor(Math.random() * 1000),
      userId,
      title,
      body,
      type,
      orderId,
      isRead: false,
      createdAt: new Date()
    });
  }
}
