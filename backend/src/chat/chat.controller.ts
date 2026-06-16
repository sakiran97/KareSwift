import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('order/:orderId')
  getMessages(@Param('orderId') orderId: string) {
    return this.chatService.getMessagesByOrderId(Number(orderId));
  }

  @Post('order/:orderId')
  sendMessage(
    @Param('orderId') orderId: string,
    @Body() body: { message: string },
    @Request() req: any
  ) {
    // Determine sender based on role (admin or customer)
    const sender = req.user.role === 'admin' ? 'admin' : 'customer';
    return this.chatService.sendMessage(Number(orderId), sender, body.message);
  }
}
