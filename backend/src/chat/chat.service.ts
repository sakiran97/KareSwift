import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsService } from '../events/events.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private notificationService: NotificationService
  ) {}

  async getMessagesByOrderId(orderId: number) {
    try {
      return await this.prisma.chatMessage.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (e) {
      this.logger.error('Failed to get chat messages', e);
      return [];
    }
  }

  async sendMessage(orderId: number, sender: 'customer' | 'admin', message: string) {
    try {
      const order = await this.prisma.order.findUnique({ 
        where: { id: orderId },
        include: { user: true }
      });
      if (!order) throw new NotFoundException('Order not found');

      const chatMessage = await this.prisma.chatMessage.create({
        data: {
          orderId,
          sender,
          message
        }
      });

      // Emit event so other side gets it immediately
      this.eventsService.emit('chat-message', chatMessage);

      // Create Notification
      const snippet = message.length > 30 ? message.substring(0, 30) + '...' : message;
      if (sender === 'customer') {
        const admins = await this.prisma.user.findMany({ where: { role: 'admin' } });
        const customerName = order.user?.name || 'Customer';
        for (const admin of admins) {
          await this.notificationService.create(
            admin.id, 
            `New Message on ORD-${orderId}`, 
            `${customerName}: ${snippet}`, 
            'CHAT_MESSAGE', 
            orderId
          );
        }
      } else {
        await this.notificationService.create(
          order.userId, 
          `Support Replied`, 
          `Tech Support: ${snippet}`, 
          'CHAT_MESSAGE', 
          orderId
        );
      }

      return chatMessage;
    } catch (e) {
      this.logger.error('Failed to send chat message', e);
      throw e;
    }
  }
}
