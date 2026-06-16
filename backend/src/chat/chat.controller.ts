import { Controller, Get, Post, Body, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('order/:orderId')
  getMessages(@Param('orderId') orderId: string) {
    return this.chatService.getMessagesByOrderId(Number(orderId));
  }

  @Post('order/:orderId')
  sendMessage(
    @Param('orderId') orderId: string,
    @Body() body: { message: string, sender?: string }
  ) {
    const sender = body.sender || 'customer';
    return this.chatService.sendMessage(Number(orderId), sender as 'customer' | 'admin', body.message);
  }
}
