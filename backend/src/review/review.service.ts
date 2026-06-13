import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async submitReview(userId: number, data: {
    orderId: number;
    overallRating: number;
    serviceQuality: number;
    timeliness: number;
    professionalism: number;
    comments?: string;
    photos?: string[];
  }) {
    const { orderId, overallRating, serviceQuality, timeliness, professionalism, comments, photos } = data;

    if (overallRating < 1 || overallRating > 5) throw new BadRequestException('Rating must be between 1 and 5');
    if (serviceQuality < 1 || serviceQuality > 5) throw new BadRequestException('Quality rating must be between 1 and 5');
    if (timeliness < 1 || timeliness > 5) throw new BadRequestException('Timeliness rating must be between 1 and 5');
    if (professionalism < 1 || professionalism > 5) throw new BadRequestException('Professionalism rating must be between 1 and 5');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new BadRequestException('This order does not belong to you');
    if (order.status !== 'COMPLETED') throw new BadRequestException('You can only review completed orders');

    // Check if review already exists
    const existing = await this.prisma.review.findUnique({ where: { orderId } });
    if (existing) throw new BadRequestException('Review already submitted for this order');

    return this.prisma.review.create({
      data: {
        orderId,
        overallRating,
        serviceQuality,
        timeliness,
        professionalism,
        comments: comments || null,
        photos: photos || [],
        isVerified: true,
      },
      include: {
        order: {
          include: {
            user: { select: { name: true } },
            device: true,
            serviceCategory: true,
          },
        },
      },
    });
  }

  async findPublicReviews() {
    const reviews = await this.prisma.review.findMany({
      where: { isVerified: true },
      include: {
        order: {
          include: {
            user: { select: { name: true } },
            device: true,
            serviceCategory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 6, // Limit to 6 recent verified reviews for public homepage
    });

    return reviews.map(r => ({
      id: r.id,
      overallRating: r.overallRating,
      serviceQuality: r.serviceQuality,
      timeliness: r.timeliness,
      professionalism: r.professionalism,
      comments: r.comments,
      photos: r.photos,
      customerName: r.order.user.name || 'Anonymous Customer',
      device: `${r.order.device.brand} ${r.order.device.model}`,
      service: r.order.serviceCategory.name,
      createdAt: r.createdAt,
    }));
  }

  async findAll() {
    return this.prisma.review.findMany({
      include: {
        order: {
          include: {
            user: { select: { name: true } },
            device: true,
            serviceCategory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyReview(id: number, isVerified: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id },
      data: { isVerified },
    });
  }
}
