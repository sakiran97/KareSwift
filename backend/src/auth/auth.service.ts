import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { EventsService } from '../events/events.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

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
}
