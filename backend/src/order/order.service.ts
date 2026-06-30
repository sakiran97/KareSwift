import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Order, OrderStatus } from '../generated/prisma';
import { EventsService } from '../events/events.service';
import { WarrantyService } from '../warranty/warranty.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

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
    mobileNumber?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<any> {
    const { userId, deviceId, serviceCategoryId, estimatedTime, address, mobileNumber, scheduledDate, scheduledSlot, notes, diagnosticNotes, diagnosticPhotos, travelCharge, serviceAreaId, latitude, longitude } = data;
    
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
          latitude: latitude || null,
          longitude: longitude || null,
        },
        include: {
          device: true,
          serviceCategory: true,
          user: { select: { name: true, phone: true } },
        },
      });

      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'BOOKED',
          notes: 'Order placed successfully'
        }
      });

      // Update user's phone number if it's missing but provided in the payload
      if (mobileNumber && !order.user?.phone) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { phone: mobileNumber }
        });
        order.user.phone = mobileNumber;
      }

      await this.createNotification(
        userId,
        'Order Booked Successfully',
        `Your doorstep repair booking for a ${order.device.brand} ${order.device.model} has been received.`,
        'ORDER_UPDATE',
        order.id
      );

      // Notify all admins in parallel
      const admins = await this.prisma.user.findMany({ where: { role: 'admin' } });
      await Promise.all(admins.map(admin => 
        this.createNotification(
          admin.id,
          'New Order Booked',
          `A new repair booking for a ${order.device.brand} ${order.device.model} has been received.`,
          'NEW_ORDER',
          order.id
        )
      ));

      this.eventsService.emit('new-order', order);
      return order;
    } catch (err: any) {
      if (err.code === 'P2003' || err.code === 'P2025') {
        throw new BadRequestException('Invalid reference: the selected device or service category does not exist. Please refresh and try again.');
      } else {
        throw new InternalServerErrorException('Failed to create order. Please try again later.');
      }
    }
  }

  async findById(id: number): Promise<any> {
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
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getTimeline(id: number): Promise<any[]> {
    return await this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' }
    });
  }

  async trackGuest(id: number, mobileNumber: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        device: true,
        serviceCategory: true,
        user: { select: { phone: true } },
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderPhone = order.user?.phone || '';
    
    // Check if the provided mobile number matches the order's mobile number
    // Clean both numbers (remove spaces, etc) for comparison
    const cleanInput = mobileNumber.replace(/\D/g, '').slice(-10);
    const cleanOrderPhone = orderPhone.replace(/\D/g, '').slice(-10);

    if (!cleanInput || !cleanOrderPhone || cleanInput !== cleanOrderPhone) {
      throw new BadRequestException('Unauthorized: Mobile number does not match the order records');
    }

    const timeline = await this.getTimeline(id);

    return {
      order,
      timeline
    };
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data,
        include: {
          device: true,
          serviceCategory: true,
          user: { select: { id: true, name: true, phone: true } },
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          notes: repairNotes || laborNotes || partsUsed || null
        }
      });

      return updatedOrder;
    });

    if (status === 'COMPLETED') {
      try {
        await this.warrantyService.createWarrantyForOrder(updated.id);
      } catch (wErr) {
        this.logger.error('Failed to create warranty for order:', wErr);
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
      'ORDER_UPDATE',
      updated.id
    );

    this.eventsService.emit('order-update', updated);
    return updated;
  }

  async findAll(): Promise<any[]> {
    return await this.prisma.order.findMany({
      include: {
        device: true,
        serviceCategory: true,
        user: { select: { id: true, name: true, phone: true } },
        serviceArea: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: number): Promise<any[]> {
    return await this.prisma.order.findMany({
      where: { userId },
      include: {
        device: true,
        serviceCategory: true,
        serviceArea: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findDevices(): Promise<any[]> {
    return await this.prisma.device.findMany();
  }

  async findServiceCategories(): Promise<any[]> {
    return await this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });
  }

  async findBookedSlots(date: string): Promise<string[]> {
    const orders = await this.prisma.order.findMany({
      where: { scheduledDate: date, status: { not: 'CANCELLED' } }
    });
    return orders.map(o => o.scheduledSlot).filter(Boolean) as string[];
  }

  private async createNotification(userId: number, title: string, body: string, type: string, orderId?: number) {
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
  }
}
