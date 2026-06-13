import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('public')
  async findPublic() {
    return this.reviewService.findPublicReviews();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() data: any) {
    const userId = Number(req.user.id);
    return this.reviewService.submitReview(userId, data);
  }

  // Admin Review Management
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    return this.reviewService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/verify')
  async verify(@Param('id') id: string, @Body('isVerified') isVerified: boolean) {
    return this.reviewService.verifyReview(Number(id), isVerified);
  }
}
