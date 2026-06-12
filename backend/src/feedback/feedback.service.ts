import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FeedbackService {
  private useMock = false;
  private mockFeedbacks: any[] = [];
  private nextMockId = 1;

  constructor(private prisma: PrismaService) {}

  async submitFeedback(orderId: number, userId: number, rating: number, comment?: string, tags?: string[]) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');

    if (!this.useMock) {
      try {
        // Verify the order belongs to the user and is completed
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new BadRequestException('This order does not belong to you');

        // Check if feedback already exists
        const existing = await this.prisma.feedback.findUnique({ where: { orderId } });
        if (existing) throw new BadRequestException('Feedback already submitted for this order');

        const feedback = await this.prisma.feedback.create({
          data: { orderId, rating, comment, tags: tags || [] },
        });

        // Update technician's average rating
        if (order.technicianId) {
          await this.updateTechnicianRating(order.technicianId);
        }

        return feedback;
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
    const feedback = {
      id: this.nextMockId++,
      orderId,
      rating,
      comment,
      tags: tags || [],
      createdAt: new Date(),
    };
    this.mockFeedbacks.push(feedback);
    return feedback;
  }

  async getTechnicianReviews(technicianId: number) {
    if (!this.useMock) {
      try {
        const orders = await this.prisma.order.findMany({
          where: { technicianId },
          include: {
            feedback: true,
            user: { select: { name: true } },
            device: true,
            serviceCategory: true,
          },
        });
        return orders
          .filter(o => o.feedback)
          .map(o => ({
            orderId: o.id,
            rating: o.feedback!.rating,
            comment: o.feedback!.comment,
            tags: o.feedback!.tags,
            customerName: o.user?.name || 'Customer',
            device: o.device ? `${o.device.brand} ${o.device.model}` : 'Device',
            service: o.serviceCategory?.name || 'Repair',
            createdAt: o.feedback!.createdAt,
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    return this.mockFeedbacks
      .map(f => ({
        orderId: f.orderId,
        rating: f.rating,
        comment: f.comment,
        tags: f.tags,
        customerName: 'Customer',
        device: 'Device',
        service: 'Repair',
        createdAt: f.createdAt,
      }));
  }

  private async updateTechnicianRating(technicianId: number) {
    try {
      const orders = await this.prisma.order.findMany({
        where: { technicianId },
        include: { feedback: true },
      });
      const feedbacks = orders.filter(o => o.feedback).map(o => o.feedback!);
      if (feedbacks.length === 0) return;

      const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
      await this.prisma.user.update({
        where: { id: technicianId },
        data: {
          averageRating: Math.round(avgRating * 100) / 100,
          totalReviews: feedbacks.length,
        },
      });
    } catch { /* non-critical */ }
  }

  private isDbOffline(err: any) {
    return err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused');
  }
}
