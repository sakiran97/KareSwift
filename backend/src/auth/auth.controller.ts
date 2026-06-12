import { Controller, Get, Post, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Unified Email OTP ────────────────────────────────────────────

  @Post('send-otp')
  async sendOtp(@Body('email') email: string, @Body('type') type?: 'login' | 'register') {
    return this.authService.sendOtp(email, type);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Body('name') name?: string,
    @Body('phone') phone?: string,
    @Body('role') role?: string,
    @Body('technicianId') technicianId?: string,
    @Body('password') password?: string,
  ) {
    return this.authService.verifyOtp(email, otp, { name, phone, role, technicianId, password });
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email?: string,
    @Body('technicianId') technicianId?: string,
  ) {
    return this.authService.forgotPassword({ email, technicianId });
  }

  @Post('reset-password')
  async resetPassword(
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
    @Body('email') email?: string,
    @Body('technicianId') technicianId?: string,
  ) {
    return this.authService.resetPassword({ email, technicianId, otp, newPassword });
  }

  // ─── Technician Password Login ────────────────────────────────────

  @Post('login')
  async login(
    @Body('technicianId') technicianId: string,
    @Body('password') password: string,
  ) {
    return this.authService.technicianPasswordLogin(technicianId, password);
  }

  // ─── Legacy: Phone OTP ────────────────────────────────────────────

  @Post('request-otp')
  async requestOtp(@Body('phone') phone: string) {
    return this.authService.requestOtp(phone);
  }

  @Post('verify-phone-otp')
  async verifyPhoneOtp(
    @Body('phone') phone: string,
    @Body('otp') otp: string,
    @Body('name') name?: string,
  ) {
    return this.authService.verifyPhoneOtp(phone, otp, name);
  }

  // ─── Admin Create Technician (no OTP required) ────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('register-technician')
  async registerTechnician(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
  ) {
    return this.authService.adminCreateTechnician(email, password, name);
  }

  // ─── Profile ───────────────────────────────────────────────────────

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
    @Body('name') name?: string,
    @Body('phone') phone?: string,
  ) {
    const userId = req.user.id;
    return this.authService.updateProfile(userId, { name, phone });
  }
}
