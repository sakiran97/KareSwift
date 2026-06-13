import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(user: any) {
    const payload: any = { sub: user.id, email: user.email, role: user.role || 'customer' };
    if (user.name) payload.name = user.name;
    if (user.phone) payload.phone = user.phone;
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: String(user.id),
        email: user.email,
        phone: user.phone || undefined,
        name: user.name || 'User',
        role: user.role || 'customer',
      },
    };
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
    return !!user;
  }
}
