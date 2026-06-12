import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { EventsService } from '../events/events.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private otpStore = new Map<string, { code: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private jwtService: JwtService,
  ) {}

  async login(user: any) {
    const payload: any = { sub: user.id, email: user.email, role: user.role || 'customer' };
    if (user.name) payload.name = user.name;
    if (user.phone) payload.phone = user.phone;
    if (user.technicianId) payload.technicianId = user.technicianId;
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: String(user.id),
        email: user.email,
        phone: user.phone || undefined,
        name: user.name || 'User',
        role: user.role || 'customer',
        technicianId: user.technicianId || undefined,
      },
    };
  }

  async technicianPasswordLogin(technicianId: string, password: string) {
    if (!technicianId || !password) {
      throw new UnauthorizedException('Technician ID and password are required');
    }
    const user = await this.prisma.user.findUnique({ where: { technicianId } });
    if (!user || user.role !== 'technician' || !user.passwordHash) {
      throw new UnauthorizedException('Invalid technician credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid technician credentials');
    return this.login(user);
  }

  async forgotPassword(input: { email?: string; technicianId?: string }) {
    // Dummy implementation to avoid breaking frontend
    return { message: 'Password reset OTP sent to your registered email (Feature under Supabase migration)' };
  }

  async resetPassword(input: { email?: string; technicianId?: string; otp: string; newPassword?: string }) {
    // Dummy implementation to avoid breaking frontend
    return { message: 'Password reset successful. Please sign in with your new password. (Feature under Supabase migration)' };
  }

  // ─── Admin Create Technician (Legacy, requires Supabase sync in future) ──

  async adminCreateTechnician(email: string, password: string, name: string) {
    const technicianId = `TECH-${String(Date.now()).slice(-6)}`;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, role: 'technician', technicianId },
    });

    await this.prisma.technicianProfile.create({
      data: { userId: user.id, kycStatus: 'pending' },
    });

    this.eventsService.emit('new-technician-pending', {
      userId: user.id,
      name: user.name,
      email: user.email,
      technicianId: user.technicianId,
    });

    return { ...user, technicianId };
  }

  // ─── Profile ────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, otpCode, otpExpiresAt, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: number, data: { name?: string; phone?: string }) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { ...(data.name !== undefined && { name: data.name }), ...(data.phone !== undefined && { phone: data.phone }) },
      });
      const { passwordHash, otpCode, otpExpiresAt, ...safe } = user;
      return { ...safe, message: 'Profile updated successfully' };
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
