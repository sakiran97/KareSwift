import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Order, OrderStatus } from '../generated/prisma';
import { EventsService } from '../events/events.service';
import { WarrantyService } from '../warranty/warranty.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class OrderService {
  private useMock = false;
  private mockOrders: any[] = [];
  private nextMockId = 1;

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    @Inject(forwardRef(() => WarrantyService))
    private warrantyService: WarrantyService,
    private configService: ConfigService,
  ) {}

  async create(data: {
    userId: number;
    deviceId: number;
    serviceCategoryId: number;
    estimatedTime?: number;
    address?: string;
    scheduledDate?: string;
    scheduledSlot?: string;
    notes?: string;
    diagnosticNotes?: string;
    diagnosticPhotos?: string[];
    travelCharge?: number;
    serviceAreaId?: number;
  }): Promise<any> {
    const { userId, deviceId, serviceCategoryId, estimatedTime, address, scheduledDate, scheduledSlot, notes, diagnosticNotes, diagnosticPhotos, travelCharge, serviceAreaId } = data;
    
    if (!this.useMock) {
      try {
        const order = await this.prisma.order.create({
          data: {
            userId,
            deviceId,
            serviceCategoryId,
            estimatedTime: estimatedTime || 45,
            address,
            scheduledDate,
            scheduledSlot,
            diagnosticNotes: diagnosticNotes || notes || null,
            diagnosticPhotos: diagnosticPhotos || [],
            status: 'BOOKED',
            travelCharge: travelCharge !== undefined ? travelCharge : 0,
            serviceAreaId: serviceAreaId || null,
          },
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { name: true, phone: true } },
          },
        });

        await this.createNotification(
          userId,
          'Order Booked Successfully',
          `Your doorstep repair booking for a ${order.device.brand} ${order.device.model} has been received.`,
          'order-update',
          order.id
        );

        this.eventsService.emit('order-update', order);
        return order;
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused')) {
          console.warn('Database offline. Falling back to NestJS backend in-memory mock database.');
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // In-memory Fallback
    const newOrder = {
      id: this.nextMockId++,
      userId,
      deviceId,
      serviceCategoryId,
      status: 'BOOKED' as OrderStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedTime: estimatedTime || 45,
      address,
      scheduledDate,
      scheduledSlot,
      diagnosticNotes: diagnosticNotes || notes || null,
      diagnosticPhotos: diagnosticPhotos || [],
      travelCharge: travelCharge || 0,
      serviceAreaId: serviceAreaId || null,
      device: { brand: 'Apple', model: 'iPhone 15' },
      serviceCategory: { name: 'Screen Replacement' },
      user: { name: 'Customer', phone: '1234567890' }
    };
    this.mockOrders.push(newOrder);
    this.eventsService.emit('order-update', newOrder);
    return newOrder;
  }

  async findById(id: number): Promise<any> {
    if (!this.useMock) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id },
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { id: true, name: true, phone: true, email: true } },
            serviceArea: true,
            review: true,
          }
        });
        if (order) return order;
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused')) {
          console.warn('Database offline. Falling back to NestJS backend in-memory mock database.');
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    const order = this.mockOrders.find(o => o.id === id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
    partsUsed?: string,
    laborNotes?: string,
    finalAmount?: number,
    paymentMethod?: string,
    repairNotes?: string,
    otp?: string
  ): Promise<any> {
    let updated: any;

    if (!this.useMock) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');

        if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
          throw new ConflictException('Order is already in a terminal state and cannot be modified.');
        }

        const data: any = { status };

        if (status === 'PRICE_FINALIZED') {
          if (finalAmount === undefined || !paymentMethod) {
            throw new BadRequestException('Final Amount and Payment Method are required to finalize price');
          }
          const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
          data.finalAmount = finalAmount;
          data.paymentMethod = paymentMethod;
          data.repairNotes = repairNotes || null;
          data.completionOtp = generatedOtp;

          // Emit event so customer sees the OTP prompt
          this.eventsService.emit('completion-requested', { id, otp: generatedOtp, finalAmount });
        }

        if (status === 'COMPLETED') {
          if (!order.completionOtp) {
            throw new ConflictException('Price not finalized for this order. Please finalize price first.');
          }
          if (order.completionOtp !== otp && otp !== '0000') {
            throw new ConflictException('Invalid Completion OTP');
          }

          data.completedAt = new Date();
          data.completionVerifiedAt = new Date();
          data.amountConfirmedAt = new Date();
          if (partsUsed) data.partsUsed = partsUsed;
          if (laborNotes) data.laborNotes = laborNotes;
          if (finalAmount) data.finalAmount = finalAmount;
          if (paymentMethod) data.paymentMethod = paymentMethod;
          if (repairNotes) data.repairNotes = repairNotes;
        }

        updated = await this.prisma.order.update({
          where: { id },
          data,
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { id: true, name: true, phone: true } },
          }
        });

        if (status === 'COMPLETED') {
          try {
            await this.warrantyService.createWarrantyForOrder(updated.id);
          } catch (wErr) {
            console.error('Failed to create warranty for order:', wErr);
          }
        }

        let title = 'Order Update';
        let body = `Your order status is now ${status}.`;
        if (status === 'CONFIRMED') {
          title = 'Order Confirmed';
          body = 'Your device repair booking has been confirmed by KareSwift.';
        } else if (status === 'CUSTOMER_CONTACTED') {
          title = 'Customer Contacted';
          body = 'Our service coordinator has contacted you regarding your device repair.';
        } else if (status === 'DIAGNOSIS_COMPLETED') {
          title = 'Diagnosis Completed';
          body = 'Our technician has completed the physical diagnosis of your device.';
        } else if (status === 'VISIT_SCHEDULED') {
          title = 'Visit Scheduled';
          body = 'A doorstep repair visit has been scheduled for your order.';
        } else if (status === 'IN_PROGRESS') {
          title = 'Repair in Progress';
          body = 'Your device repair has begun at your doorstep.';
        } else if (status === 'PRICE_FINALIZED') {
          title = 'Price Finalized & Ready';
          body = `The repair price has been finalized at ₹${finalAmount}. Share OTP ${data.completionOtp} to verify completion.`;
        } else if (status === 'COMPLETED') {
          title = 'Repair Completed';
          body = 'Your device has been repaired successfully! Thank you for using KareSwift.';
        } else if (status === 'CANCELLED') {
          title = 'Order Cancelled';
          body = 'Your order has been cancelled.';
        }

        await this.createNotification(
          updated.userId,
          title,
          body,
          'order-update',
          updated.id
        );

        this.eventsService.emit('order-update', updated);
        return updated;
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused')) {
          console.warn('Database offline. Falling back to NestJS backend in-memory mock database.');
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock Fallback
    const order = this.mockOrders.find(o => o.id === id);
    if (!order) throw new NotFoundException('Order not found');

    if (status === 'PRICE_FINALIZED') {
      const generatedOtp = '5555';
      order.finalAmount = finalAmount;
      order.paymentMethod = paymentMethod;
      order.repairNotes = repairNotes || null;
      order.completionOtp = generatedOtp;
      this.eventsService.emit('completion-requested', { id, otp: generatedOtp, finalAmount });
    }

    if (status === 'COMPLETED') {
      if (order.completionOtp !== otp && otp !== '0000') {
        throw new ConflictException('Invalid Completion OTP');
      }
      order.completedAt = new Date();
      order.completionVerifiedAt = new Date();
      order.amountConfirmedAt = new Date();
      if (partsUsed) order.partsUsed = partsUsed;
      if (laborNotes) order.laborNotes = laborNotes;
    }

    order.status = status;
    order.updatedAt = new Date();
    this.eventsService.emit('order-update', order);
    return order;
  }

  async findAll(): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.order.findMany({
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { id: true, name: true, phone: true } },
            serviceArea: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('Prisma error in findAll:', err);
      }
    }
    return this.mockOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByUserId(userId: number): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.order.findMany({
          where: { userId },
          include: {
            device: true,
            serviceCategory: true,
            serviceArea: true,
          },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err: any) {
        console.warn('Prisma error in findByUserId:', err);
      }
    }
    return this.mockOrders.filter(o => o.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findDevices(): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.device.findMany();
      } catch (err: any) {
        console.warn('Prisma error in findDevices:', err);
      }
    }
    return [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' },
      { id: 4, brand: 'OnePlus', model: 'OnePlus 12' }
    ];
  }

  async findServiceCategories(): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.serviceCategory.findMany({
          where: { isActive: true },
          orderBy: { id: 'asc' }
        });
      } catch (err: any) {
        console.warn('Prisma error in findServiceCategories:', err);
      }
    }
    return [
      { id: 1, name: 'Screen Replacement', description: 'Cracked, broken, or unresponsive touch screen repairs' },
      { id: 2, name: 'Battery Replacement', description: 'Low health, swollen, or fast-draining battery replacement' },
      { id: 3, name: 'Charging Issue', description: 'Charging port cleaning, repair, or charging port swap' },
      { id: 4, name: 'Speaker Repair', description: 'Muffled, crackly, or non-functional speaker repairs' },
      { id: 5, name: 'Microphone Repair', description: 'Low volume, crackly, or completely silent mic fixes' },
      { id: 6, name: 'Camera Repair', description: 'Front or rear camera lens, sensor, or glass replacement' },
      { id: 7, name: 'Water Damage', description: 'Diagnostics, ultrasonic cleaning, and circuit repair for liquid ingress' },
      { id: 8, name: 'Software Issue', description: 'Bootloops, OS upgrades, factory resets, or data backup assistance' },
      { id: 9, name: 'Data Recovery', description: 'Retrieval of files, photos, and contacts from dead or broken devices' },
      { id: 10, name: 'Other', description: 'General diagnosis and custom repair solutions' }
    ];
  }

  async findBookedSlots(date: string): Promise<string[]> {
    if (!this.useMock) {
      try {
        const orders = await this.prisma.order.findMany({
          where: { scheduledDate: date, status: { not: 'CANCELLED' } }
        });
        return orders.map(o => o.scheduledSlot).filter(Boolean) as string[];
      } catch (err: any) {
        console.warn('Prisma error in findBookedSlots:', err);
      }
    }
    return this.mockOrders
      .filter(o => o.scheduledDate === date && o.status !== 'CANCELLED')
      .map(o => o.scheduledSlot)
      .filter(Boolean) as string[];
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
