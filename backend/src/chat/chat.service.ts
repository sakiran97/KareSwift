import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class ChatService {
  private useMock = false;
  private mockMessages: any[] = [];
  private nextMockId = 1;

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async sendMessage(orderId: number, senderId: number, senderRole: string, content: string) {
    let message: any;

    if (!this.useMock) {
      try {
        // Verify user has access to this order
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== senderId && order.technicianId !== senderId) {
          throw new ForbiddenException('You do not have access to this order');
        }

        message = await this.prisma.chatMessage.create({
          data: { orderId, senderId, senderRole, content },
          include: {
            sender: { select: { id: true, name: true, role: true } },
            order: { select: { userId: true, technicianId: true } },
          },
        });

        // Create notification for the other party
        const recipientId = senderRole === 'customer' ? order.technicianId : order.userId;
        if (recipientId) {
          try {
            await this.prisma.notification.create({
              data: {
                userId: recipientId,
                title: 'New Message',
                body: content.length > 100 ? content.substring(0, 100) + '...' : content,
                type: 'chat',
                orderId,
              },
            });
          } catch { /* notification creation is non-critical */ }
        }

        this.eventsService.emit('chat-message', { ...message, orderId });
        return message;
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback
    message = {
      id: this.nextMockId++,
      orderId,
      senderId,
      senderRole,
      content,
      createdAt: new Date(),
      sender: { id: senderId, name: senderRole === 'customer' ? 'Customer' : 'Technician', role: senderRole },
      order: { userId: senderRole === 'customer' ? senderId : 2, technicianId: senderRole === 'technician' ? senderId : null }
    };
    this.mockMessages.push(message);
    this.eventsService.emit('chat-message', { ...message, orderId });
    return message;
  }

  async getMessages(orderId: number, userId: number) {
    if (!this.useMock) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId && order.technicianId !== userId) {
          throw new ForbiddenException('You do not have access to this order');
        }

        return await this.prisma.chatMessage.findMany({
          where: { orderId },
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        });
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    return this.mockMessages.filter(m => m.orderId === orderId);
  }

  private isDbOffline(err: any) {
    return err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused');
  }
}
