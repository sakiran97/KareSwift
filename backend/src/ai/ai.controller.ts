import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(JwtAuthGuard)
  @Post('diagnose')
  async diagnose(@Body() body: { issueDescription: string; photos?: string[] }) {
    const result = await this.aiService.diagnoseDevice(body.issueDescription, body.photos || []);
    return { result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chat(@Body() body: { message: string }) {
    const result = await this.aiService.supportChat(body.message);
    return { result };
  }
}
