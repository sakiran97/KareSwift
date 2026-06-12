import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class NotificationService {
  private useMock = false;
  private mockNotifications: any[] = [];
  private nextMockId = 1;

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async create(userId: number, title: string, body: string, type: string, orderId?: number) {
    let notification: any;

    if (!this.useMock) {
      try {
        notification = await this.prisma.notification.create({
          data: { userId, title, body, type, orderId },
        });
        this.eventsService.emit('notification', { ...notification, targetUserId: userId });
        return notification;
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    notification = {
      id: this.nextMockId++,
      userId,
      title,
      body,
      type,
      isRead: false,
      orderId: orderId || null,
      createdAt: new Date(),
    };
    this.mockNotifications.push(notification);
    this.eventsService.emit('notification', { ...notification, targetUserId: userId });
    return notification;
  }

  async findByUser(userId: number, onlyUnread = false) {
    if (!this.useMock) {
      try {
        const where: any = { userId };
        if (onlyUnread) where.isRead = false;
        return await this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    let result = this.mockNotifications.filter(n => n.userId === userId);
    if (onlyUnread) result = result.filter(n => !n.isRead);
    return result.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);
  }

  async getUnreadCount(userId: number) {
    if (!this.useMock) {
      try {
        return await this.prisma.notification.count({
          where: { userId, isRead: false },
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }
    return this.mockNotifications.filter(n => n.userId === userId && !n.isRead).length;
  }

  async markAsRead(id: number, userId: number) {
    if (!this.useMock) {
      try {
        const notification = await this.prisma.notification.findUnique({ where: { id } });
        if (!notification || notification.userId !== userId) {
          throw new NotFoundException('Notification not found');
        }
        return await this.prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    const n = this.mockNotifications.find(n => n.id === id && n.userId === userId);
    if (!n) throw new NotFoundException('Notification not found');
    n.isRead = true;
    return n;
  }

  async markAllAsRead(userId: number) {
    if (!this.useMock) {
      try {
        await this.prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        });
        return { message: 'All notifications marked as read' };
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    this.mockNotifications
      .filter(n => n.userId === userId && !n.isRead)
      .forEach(n => (n.isRead = true));
    return { message: 'All notifications marked as read' };
  }

  private isDbOffline(err: any) {
    return err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused');
  }
}
