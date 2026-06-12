import { Controller, Get, Post, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post(':orderId')
  async submitFeedback(
    @Param('orderId') orderId: string,
    @Req() req: any,
    @Body() body: { rating: number; comment?: string; tags?: string[] },
  ) {
    const parsedOrderId = Number(orderId);
    if (isNaN(parsedOrderId)) throw new BadRequestException('Invalid order ID');
    const userId = Number(req.user.id);
    return this.feedbackService.submitFeedback(parsedOrderId, userId, body.rating, body.comment, body.tags);
  }

  @Get('technician/:technicianId')
  async getTechnicianReviews(@Param('technicianId') technicianId: string) {
    return this.feedbackService.getTechnicianReviews(Number(technicianId));
  }
}
