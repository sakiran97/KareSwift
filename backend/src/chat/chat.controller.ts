import { Controller, Get, Post, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post(':orderId/messages')
  async sendMessage(
    @Param('orderId') orderId: string,
    @Req() req: any,
    @Body('content') content: string,
  ) {
    const parsedOrderId = Number(orderId);
    if (isNaN(parsedOrderId)) throw new BadRequestException('Invalid order ID');
    if (!content?.trim()) throw new BadRequestException('Message content is required');

    const senderId = Number(req.user.id);
    const senderRole = req.user.role || 'customer';
    return this.chatService.sendMessage(parsedOrderId, senderId, senderRole, content.trim());
  }

  @Get(':orderId/messages')
  async getMessages(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const parsedOrderId = Number(orderId);
    if (isNaN(parsedOrderId)) throw new BadRequestException('Invalid order ID');

    const userId = Number(req.user.id);
    return this.chatService.getMessages(parsedOrderId, userId);
  }
}
