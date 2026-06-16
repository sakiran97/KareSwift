import { Controller, Get, Patch, Delete, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(
    @Req() req: any, 
    @Query('unread') unread?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = Number(req.user.id);
    const onlyUnread = unread === 'true';
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(Math.max(1, parseInt(limit, 10)), 100) : 20;
    
    return this.notificationService.findByUser(userId, onlyUnread, pageNum, limitNum);
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

  @Delete('clear-all')
  async clearAll(@Req() req: any) {
    const userId = Number(req.user.id);
    return this.notificationService.clearAll(userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const userId = Number(req.user.id);
    return this.notificationService.delete(Number(id), userId);
  }
}
