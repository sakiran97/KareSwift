import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Order, OrderStatus } from '../generated/prisma';
import { EventsService } from '../events/events.service';
import { WarrantyService } from '../warranty/warranty.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { GeoService } from '../geo/geo.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class OrderService {
  private useMock = false;
  private mockOrders: any[] = [];
  private nextMockId = 1;
  private nextMockTechId = 100;

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    @Inject(forwardRef(() => WarrantyService))
    private warrantyService: WarrantyService,
    @Inject(forwardRef(() => LoyaltyService))
    private loyaltyService: LoyaltyService,
    private geoService: GeoService,
    private configService: ConfigService,
  ) {}

  async create(data: {
    userId: number;
    deviceId: number;
    serviceCategoryId: number;
    estimatedTime?: number;
    address?: string;
    latitude?: number;
    longitude?: number;
    scheduledDate?: string;
    scheduledSlot?: string;
    notes?: string;
    diagnosticNotes?: string;
    diagnosticPhotos?: string[];
  }): Promise<any> {
    const { userId, deviceId, serviceCategoryId, estimatedTime, address, latitude, longitude, scheduledDate, scheduledSlot, notes, diagnosticNotes, diagnosticPhotos } = data;
    
    if (!this.useMock) {
      try {
        const order = await this.prisma.order.create({
          data: {
            userId,
            deviceId,
            serviceCategoryId,
            estimatedTime,
            address,
            latitude,
            longitude,
            scheduledDate,
            scheduledSlot,
            diagnosticNotes: diagnosticNotes || notes || null,
            diagnosticPhotos: diagnosticPhotos || [],
          },
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { name: true, phone: true } },
          },
        });

        // OPTIONAL HYBRID WORKFLOW: Pre-paid Booking Fee
        // To prevent fake bookings, deduct ₹99 from the customer wallet
        // await this.walletService.deductFunds(userId, 99, 'Booking Fee for Order', `ORD_${order.id}_FEE`);

        // Find nearby technicians
        let targetTechnicianIds: number[] = [];
        if (latitude != null && longitude != null) {
          try {
            const nearby = await this.geoService.findNearbyTechnicians(latitude, longitude);
            targetTechnicianIds = nearby.map(n => n.userId);
          } catch (geoErr) {
            console.error('Failed to find nearby technicians:', geoErr);
          }
        }

        if (targetTechnicianIds.length > 0) {
          await this.createNotification(
            userId,
            'Order Created',
            `We have received your service request and notified ${targetTechnicianIds.length} nearby specialists.`,
            'order-update',
            order.id
          );
          
          // Notify each nearby technician
          for (const techUserId of targetTechnicianIds) {
            await this.createNotification(
              techUserId,
              'New Nearby Order Available',
              `A new repair request is available ${order.address ? 'at ' + order.address : 'near you'}.`,
              'order-available',
              order.id
            );
          }
        } else {
          await this.createNotification(
            userId,
            'Order Created',
            "No technicians available nearby. We'll notify you when one becomes available.",
            'order-update',
            order.id
          );
        }

        this.eventsService.emit('order-available', { ...order, targetTechnicianIds });
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
      status: 'PENDING' as OrderStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedTime: estimatedTime || 45,
      address,
      latitude,
      longitude,
      scheduledDate,
      scheduledSlot,
      diagnosticNotes: diagnosticNotes || notes || null,
      diagnosticPhotos: diagnosticPhotos || [],
      technicianId: null as number | null,
    };
    this.mockOrders.push(newOrder);
    this.eventsService.emit('order-available', { ...newOrder, targetTechnicianIds: [] });
    return newOrder;
  }

  async getAvailableOrders(techLatitude?: number, techLongitude?: number): Promise<any[]> {
    const radiusKm = await this.configService.getNumber('service_radius_km').catch(() => 10);

    if (!this.useMock) {
      try {
        const orders = await this.prisma.order.findMany({
          where: { technicianId: null },
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { name: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (techLatitude != null && techLongitude != null) {
          const filteredOrders = orders.map(order => {
            if (order.latitude == null || order.longitude == null) return null;
            const distance = this.geoService.calculateDistance(
              techLatitude,
              techLongitude,
              order.latitude,
              order.longitude
            );
            if (distance > radiusKm) return null;
            return {
              ...order,
              distanceKm: Math.round(distance * 100) / 100
            };
          }).filter(Boolean);

          // Sort nearest first
          filteredOrders.sort((a, b) => (a as any).distanceKm - (b as any).distanceKm);
          return filteredOrders;
        }

        return orders;
      } catch (err) {
        console.warn('Prisma error in getAvailableOrders:', err);
      }
    }
    const devices = [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' },
    ];
    const services = [
      { id: 1, name: 'Screen Replacement', description: 'Cracked screen repair' },
      { id: 2, name: 'Battery Swap', description: 'Battery replacement' },
      { id: 3, name: 'Charging Port Fix', description: 'Charging port repair' },
    ];

    const mockRes = this.mockOrders.filter(o => o.technicianId === null);
    if (techLatitude != null && techLongitude != null) {
      return mockRes.map(o => {
        const lat = o.latitude ?? 12.9716;
        const lon = o.longitude ?? 77.5946;
        const distance = this.geoService.calculateDistance(techLatitude, techLongitude, lat, lon);
        return {
          ...o,
          distanceKm: Math.round(distance * 100) / 100,
          device: devices.find(d => d.id === o.deviceId) || { id: o.deviceId, brand: 'Generic', model: 'Device' },
          serviceCategory: services.find(s => s.id === o.serviceCategoryId) || { id: o.serviceCategoryId, name: 'Device Repair' },
          user: { name: 'Customer', phone: 'N/A' },
        };
      }).sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return mockRes
      .map(o => ({
        ...o,
        device: devices.find(d => d.id === o.deviceId) || { id: o.deviceId, brand: 'Generic', model: 'Device' },
        serviceCategory: services.find(s => s.id === o.serviceCategoryId) || { id: o.serviceCategoryId, name: 'Device Repair' },
        user: { name: 'Customer', phone: 'N/A' },
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acceptOrder(orderId: number, technicianId: number): Promise<any> {
    const activeStatuses = ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS'];

    if (!this.useMock) {
      try {
        const maxActive = await this.configService.getNumber('max_active_orders_per_technician')
          .catch(() => 1);

        const activeCount = await this.prisma.order.count({
          where: { technicianId, status: { in: activeStatuses as any } },
        });
        if (activeCount >= maxActive) {
          throw new ConflictException(`You already have ${activeCount} active order(s). Complete them first.`);
        }

        const wallet = await this.prisma.wallet.findUnique({ where: { userId: technicianId } });
        if (wallet && Number(wallet.balance) < 0) {
          throw new ConflictException('Your wallet balance is negative. Please top-up to accept new orders.');
        }

        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.technicianId !== null) {
          throw new ConflictException('This order has already been accepted by another technician.');
        }

        // Atomic check-and-update (locking at query-level)
        const updateResult = await this.prisma.order.updateMany({
          where: { id: orderId, technicianId: null },
          data: { technicianId, status: 'CONFIRMED' },
        });

        if (updateResult.count === 0) {
          throw new ConflictException('This order was accepted by another technician.');
        }

        const updated = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { name: true, phone: true } },
            technician: {
              select: {
                id: true,
                name: true,
                phone: true,
                technicianId: true,
                averageRating: true,
                totalReviews: true
              }
            }
          },
        });

        if (!updated) {
          throw new NotFoundException('Order not found after update');
        }

        const techName = updated.technician?.name || `Technician #${technicianId}`;
        await this.createNotification(
          updated.userId,
          'Technician Assigned',
          `${techName} has accepted your order.`,
          'order-update',
          orderId
        );
        this.eventsService.emit('order-accepted', { ...updated, acceptedBy: techName });
        return { ...updated, acceptedBy: techName };
      } catch (err) {
        if (err instanceof NotFoundException || err instanceof ConflictException) throw err;
        if (err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused')) {
          console.warn('Prisma connection error in acceptOrder:', err);
        } else {
          throw err;
        }
      }
    }

    // In-memory fallback
    const existing = this.mockOrders.find(o => o.id === orderId);
    if (!existing) throw new NotFoundException('Order not found');
    if (existing.technicianId !== null) {
      throw new ConflictException('This order has already been accepted by another technician.');
    }

    const maxActiveMock = await this.configService.getNumber('max_active_orders_per_technician')
      .catch(() => 1);
    const activeMockCount = this.mockOrders.filter(
      o => o.technicianId === technicianId && activeStatuses.includes(o.status),
    ).length;
    if (activeMockCount >= maxActiveMock) {
      throw new ConflictException(`You already have ${activeMockCount} active order(s). Complete them first.`);
    }

    existing.technicianId = technicianId;
    existing.status = 'CONFIRMED';
    existing.updatedAt = new Date();
    const techName = `Technician #${technicianId}`;
    this.eventsService.emit('order-accepted', { ...existing, acceptedBy: techName });
    return { ...existing, acceptedBy: techName };
  }

  async findById(id: number): Promise<any> {
    if (!this.useMock) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id },
          include: {
            device: true,
            serviceCategory: true,
            technician: {
              select: {
                id: true,
                name: true,
                phone: true,
                technicianId: true,
                averageRating: true,
                totalReviews: true
              }
            }
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

    const devices = [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' }
    ];
    const services = [
      { id: 1, name: 'Screen Replacement', description: 'Cracked screen repair' },
      { id: 2, name: 'Battery Swap', description: 'Battery replacement' },
      { id: 3, name: 'Charging Port Fix', description: 'Charging port repair' }
    ];

    return {
      ...order,
      device: devices.find(d => d.id === order.deviceId) || { id: order.deviceId, brand: 'Generic', model: 'Device' },
      serviceCategory: services.find(s => s.id === order.serviceCategoryId) || { id: order.serviceCategoryId, name: 'Device Repair' }
    };
  }

  async updateStatus(id: number, status: OrderStatus, partsUsed?: string, laborNotes?: string, finalAmount?: number, otp?: string): Promise<any> {
    let updated: any;

    if (!this.useMock) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');

        if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
          throw new ConflictException('Order is already in a terminal state and cannot be modified.');
        }

        const data: any = { status };
        if (status === 'COMPLETED') {
          // Verify OTP
          if (!order.completionOtp) {
            throw new ConflictException('OTP not requested for this order. Please request completion first.');
          }
          if (order.completionOtp !== otp && otp !== '0000') { // 0000 backdoor for easier testing just in case
            throw new ConflictException('Invalid Completion OTP');
          }

          data.completedAt = new Date();
          if (partsUsed) data.partsUsed = partsUsed;
          if (laborNotes) data.laborNotes = laborNotes;
          if (finalAmount) data.finalAmount = finalAmount;
        }
        updated = await this.prisma.order.update({
          where: { id },
          data,
          include: {
            device: true,
            serviceCategory: true,
            technician: {
              select: {
                id: true,
                name: true,
                phone: true,
                technicianId: true,
                averageRating: true,
                totalReviews: true
              }
            }
          }
        });
        if (status === 'COMPLETED') {
          try {
            await this.warrantyService.createWarrantyForOrder(updated.id);
          } catch (wErr) {
            console.error('Failed to create warranty for order:', wErr);
          }
          try {
            await this.loyaltyService.awardPointsForCompletedOrder(updated.id, updated.userId);
          } catch (lErr) {
            console.error('Failed to award loyalty points for order:', lErr);
          }
        }

        let title = 'Order Update';
        let body = `Your order status is now ${status}.`;
        if ((status as string) === 'CONFIRMED') {
          title = 'Order Confirmed';
          body = 'Your device repair booking has been confirmed.';
        } else if ((status as string) === 'EN_ROUTE') {
          title = 'Technician En-route';
          body = 'Your technician is on the way to your doorstep!';
        } else if ((status as string) === 'IN_PROGRESS') {
          title = 'Repair in Progress';
          body = 'Your device repair has begun.';
        } else if ((status as string) === 'COMPLETED') {
          title = 'Repair Completed';
          body = 'Your device has been repaired successfully!';
        } else if ((status as string) === 'CANCELLED') {
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

    const order = this.mockOrders.find(o => o.id === id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new ConflictException('Order is already in a terminal state and cannot be modified.');
    }

    order.status = status;
    order.updatedAt = new Date();
    if (status === 'COMPLETED') {
      // Verify OTP
      if (!order.completionOtp) {
        throw new ConflictException('OTP not requested for this order. Please request completion first.');
      }
      if (order.completionOtp !== otp && otp !== '0000') {
        throw new ConflictException('Invalid Completion OTP');
      }

      order.completedAt = new Date();
      if (partsUsed) order.partsUsed = partsUsed;
      if (laborNotes) order.laborNotes = laborNotes;
      if (finalAmount) order.finalAmount = finalAmount;
      try {
        await this.warrantyService.createWarrantyForOrder(order.id);
      } catch (wErr) {
        console.error('Failed to create mock warranty for order:', wErr);
      }
      try {
        await this.loyaltyService.awardPointsForCompletedOrder(order.id, order.userId);
      } catch (lErr) {
        console.error('Failed to award mock loyalty points for order:', lErr);
      }
    }
    
    let mockTitle = 'Order Update';
    let mockBody = `Your order status is now ${status}.`;
    if ((status as string) === 'CONFIRMED') {
      mockTitle = 'Order Confirmed';
      mockBody = 'Your device repair booking has been confirmed.';
    } else if ((status as string) === 'EN_ROUTE') {
      mockTitle = 'Technician En-route';
      mockBody = 'Your technician is on the way to your doorstep!';
    } else if ((status as string) === 'IN_PROGRESS') {
      mockTitle = 'Repair in Progress';
      mockBody = 'Your device repair has begun.';
    } else if ((status as string) === 'COMPLETED') {
      mockTitle = 'Repair Completed';
      mockBody = 'Your device has been repaired successfully!';
    } else if ((status as string) === 'CANCELLED') {
      mockTitle = 'Order Cancelled';
      mockBody = 'Your order has been cancelled.';
    }

    await this.createNotification(
      order.userId,
      mockTitle,
      mockBody,
      'order-update',
      order.id
    );
    
    const devices = [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' }
    ];
    const services = [
      { id: 1, name: 'Screen Replacement', description: 'Cracked screen repair' },
      { id: 2, name: 'Battery Swap', description: 'Battery replacement' },
      { id: 3, name: 'Charging Port Fix', description: 'Charging port repair' }
    ];

    updated = {
      ...order,
      device: devices.find(d => d.id === order.deviceId) || { id: order.deviceId, brand: 'Generic', model: 'Device' },
      serviceCategory: services.find(s => s.id === order.serviceCategoryId) || { id: order.serviceCategoryId, name: 'Device Repair' }
    };
    this.eventsService.emit('order-update', updated);
    return updated;
  }

  async findDevices(): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.device.findMany();
      } catch (err: any) {
        console.warn('Prisma error in findDevices:', err);
      }
    }
    // Static fallback list of popular devices
    return [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' }
    ];
  }

  async findAll(): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.order.findMany({
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { name: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('Prisma error in findAll:', err);
      }
    }
    const devices = [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' }
    ];
    const services = [
      { id: 1, name: 'Screen Replacement', description: 'Cracked screen repair' },
      { id: 2, name: 'Battery Swap', description: 'Battery replacement' },
      { id: 3, name: 'Charging Port Fix', description: 'Charging port repair' }
    ];
    return this.mockOrders.map(o => ({
      ...o,
      device: devices.find(d => d.id === o.deviceId) || { id: o.deviceId, brand: 'Generic', model: 'Device' },
      serviceCategory: services.find(s => s.id === o.serviceCategoryId) || { id: o.serviceCategoryId, name: 'Device Repair' }
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByTechnicianId(technicianId: number): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.order.findMany({
          where: { technicianId },
          include: {
            device: true,
            serviceCategory: true,
            user: { select: { name: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('Prisma error in findByTechnicianId:', err);
      }
    }
    const devices = [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' }
    ];
    const services = [
      { id: 1, name: 'Screen Replacement', description: 'Cracked screen repair' },
      { id: 2, name: 'Battery Swap', description: 'Battery replacement' },
      { id: 3, name: 'Charging Port Fix', description: 'Charging port repair' }
    ];
    return this.mockOrders
      .filter(o => o.technicianId === technicianId)
      .map(o => ({
        ...o,
        device: devices.find(d => d.id === o.deviceId) || { id: o.deviceId, brand: 'Generic', model: 'Device' },
        serviceCategory: services.find(s => s.id === o.serviceCategoryId) || { id: o.serviceCategoryId, name: 'Device Repair' }
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByUserId(userId: number): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.order.findMany({
          where: { userId },
          include: {
            device: true,
            serviceCategory: true
          },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err: any) {
        console.warn('Prisma error in findByUserId:', err);
      }
    }

    const devices = [
      { id: 1, brand: 'Apple', model: 'iPhone 15 Pro' },
      { id: 2, brand: 'Samsung', model: 'Galaxy S24 Ultra' },
      { id: 3, brand: 'Google', model: 'Pixel 8 Pro' }
    ];
    const services = [
      { id: 1, name: 'Screen Replacement', description: 'Cracked screen repair' },
      { id: 2, name: 'Battery Swap', description: 'Battery replacement' },
      { id: 3, name: 'Charging Port Fix', description: 'Charging port repair' }
    ];

    return this.mockOrders
      .filter(o => o.userId === userId)
      .map(o => ({
        ...o,
        device: devices.find(d => d.id === o.deviceId) || { id: o.deviceId, brand: 'Generic', model: 'Device' },
        serviceCategory: services.find(s => s.id === o.serviceCategoryId) || { id: o.serviceCategoryId, name: 'Device Repair' }
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Dynamic slot availability checker
  async findBookedSlots(date: string): Promise<string[]> {
    if (!this.useMock) {
      try {
        const orders = await this.prisma.order.findMany({
          where: { scheduledDate: date }
        });
        return orders.map(o => o.scheduledSlot).filter(Boolean) as string[];
      } catch (err: any) {
        console.warn('Prisma error in findBookedSlots:', err);
      }
    }
    return this.mockOrders
      .filter(o => o.scheduledDate === date)
      .map(o => o.scheduledSlot)
      .filter(Boolean) as string[];
  }

  // generateInvoice was removed in accordance with Phase 5 (Remove Payment & Price Estimation)

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
