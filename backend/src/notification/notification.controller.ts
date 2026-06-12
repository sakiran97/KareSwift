import { Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Req() req: any, @Query('unread') unread?: string) {
    const userId = Number(req.user.id);
    const onlyUnread = unread === 'true';
    return this.notificationService.findByUser(userId, onlyUnread);
  }

  @Get('count')
  async getUnreadCount(@Req() req: any) {
    const userId = Number(req.user.id);
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = Number(req.user.id);
    return this.notificationService.markAsRead(Number(id), userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = Number(req.user.id);
    return this.notificationService.markAllAsRead(userId);
  }
}
