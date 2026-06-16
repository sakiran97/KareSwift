import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://apqtqdnjgrusomauvuqc.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
    );
  }

  async generateTokenPair(user: any) {
    const payload: any = { sub: user.id, email: user.email, role: user.role || 'customer' };
    if (user.name) payload.name = user.name;
    if (user.phone) payload.phone = user.phone;

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { access_token: accessToken, refresh_token: refreshToken, user };
  }

  async verifySupabaseToken(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid Supabase token');
    }

    const { email } = data.user;
    if (!email) throw new UnauthorizedException('Email required in token');

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          role: 'customer',
        }
      });
    }

    return user;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');
      
      return this.generateTokenPair(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── Profile ────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: number, data: { name?: string; phone?: string }) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { ...(data.name !== undefined && { name: data.name }), ...(data.phone !== undefined && { phone: data.phone }) },
      });
      return { ...user, message: 'Profile updated successfully' };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new BadRequestException('Phone already in use');
      throw err;
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const exists = !!user;
    this.logger.log(`[checkEmailExists] email=${email} exists=${exists}`);
    return exists;
  }
}
