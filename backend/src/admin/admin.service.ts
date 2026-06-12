import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TechnicianKycService } from '../technician-kyc/technician-kyc.service';
import { OrderService } from '../order/order.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private kycService: TechnicianKycService,
    private orderService: OrderService,
  ) {}

  /**
   * Get overview statistics for the admin dashboard.
   */
  async getStats() {
    const totalTechnicians = await this.prisma.user.count({
      where: { role: 'technician' },
    });

    const pendingKycCount = await this.prisma.technicianProfile.count({
      where: { kycStatus: { in: ['pending', 'under_review'] } },
    });

    const activeOrders = await this.prisma.order.count({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS'] },
      },
    });

    const onlineTechnicians = await this.prisma.technicianProfile.count({
      where: { isOnline: true },
    });

    return {
      totalTechnicians,
      pendingKycCount,
      activeOrders,
      onlineTechnicians,
    };
  }

  /**
   * Get full details of a technician, including user profile and KYC profile.
   */
  async getTechnicianKycDetails(userId: number) {
    const profile = await this.prisma.technicianProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            technicianId: true,
            createdAt: true,
            averageRating: true,
            totalReviews: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Technician profile for User ID ${userId} not found`);
    }

    return profile;
  }

  /**
   * Suspend a technician, preventing them from going online.
   */
  async suspendTechnician(userId: number) {
    const profile = await this.prisma.technicianProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Technician profile not found');

    return this.prisma.technicianProfile.update({
      where: { userId },
      data: {
        kycStatus: 'suspended',
        isOnline: false, // Force offline on suspension
      },
    });
  }

  /**
   * Activate (unsuspend) a technician.
   */
  async activateTechnician(userId: number) {
    const profile = await this.prisma.technicianProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Technician profile not found');

    return this.prisma.technicianProfile.update({
      where: { userId },
      data: {
        kycStatus: 'approved',
      },
    });
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
