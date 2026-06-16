import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService
  ) {}

  async getMessagesByOrderId(orderId: number) {
    try {
      return await this.prisma.chatMessage.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (e) {
      console.error('Failed to get chat messages', e);
      return [];
    }
  }

  async sendMessage(orderId: number, sender: 'customer' | 'admin', message: string) {
    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
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
      return chatMessage;
    } catch (e) {
      console.error('Failed to send chat message', e);
      throw e;
    }
  }
}
