import { Controller, Get, Patch, Body, UseGuards, Req, Res, Post, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreateSessionDto, UpdateProfileDto, CheckEmailDto } from '../common/dto/auth.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('session')
  async createSession(@Body() createSessionDto: CreateSessionDto, @Res({ passthrough: true }) res: Response) {
    const { supabaseToken } = createSessionDto;
    if (!supabaseToken) throw new UnauthorizedException('Missing Supabase token');
    
    const user = await this.authService.verifySupabaseToken(supabaseToken);
    const tokens = await this.authService.generateTokenPair(user);

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none', // Allow cross-site requests
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none', // Allow cross-site requests
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return { message: 'Session created', user: tokens.user, access_token: tokens.access_token, refresh_token: tokens.refresh_token };
  }

  @Post('refresh')
  async refreshSession(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('No refresh token provided');

    const tokens = await this.authService.refreshToken(refreshToken);

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none', // Allow cross-site requests
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none', // Allow cross-site requests
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return { message: 'Session refreshed', access_token: tokens.access_token, refresh_token: tokens.refresh_token };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const
    };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = req.user.id;
    return this.authService.updateProfile(userId, updateProfileDto);
  }

  @Post('check-email')
  async checkEmail(@Body() checkEmailDto: CheckEmailDto) {
    const exists = await this.authService.checkEmailExists(checkEmailDto.email);
    return { exists };
  }
}
