import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class NotificationService {

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async create(userId: number, title: string, body: string, type: 'SYSTEM' | 'ORDER_UPDATE' | 'CHAT_MESSAGE' | 'PROMOTIONAL' = 'SYSTEM', orderId?: number) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type, orderId },
    });
    this.eventsService.emit('notification', { ...notification, targetUserId: userId });
    return notification;
  }

  async findByUser(userId: number, onlyUnread = false, page = 1, limit = 20) {
    const where: any = { userId };
    if (onlyUnread) where.isRead = false;
    
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where })
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

  async getUnreadCount(userId: number) {
    return await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    return await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async delete(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }

  async clearAll(userId: number) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { message: 'All notifications deleted' };
  }
}
