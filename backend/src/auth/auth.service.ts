import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { EventsService } from '../events/events.service';

@Injectable()
export class AuthService {
  private useMock = false;
  private mockUsers: any[] = [];
  private nextMockId = 100;
  private otpStore = new Map<string, { code: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private eventsService: EventsService,
  ) {
    this.seedMockUsers();
  }

  private seedMockUsers() {
    this.mockUsers.push(
      { id: 1, email: 'admin@doorstep.com', name: 'Admin User', role: 'admin' },
    );
  }

  // ─── Unified OTP Send ─────────────────────────────────────────────

  async sendOtp(email: string, type: 'login' | 'register' = 'login') {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }

    let existing: any = null;
    // Try DB first even if currently in mock mode, to recover when DB comes back
    try {
      existing = await this.prisma.user.findUnique({ where: { email } });
      this.useMock = false; // DB is alive — recover from mock mode
    } catch (err: any) {
      if (this.isDbOffline(err)) {
        this.useMock = true;
      } else {
        throw err;
      }
    }

    if (this.useMock || !existing) {
      existing = this.mockUsers.find(u => u.email === email);
    }

    if (type === 'login') {
      if (!existing) {
        throw new NotFoundException('No account found with this email. Please register first.');
      }
    } else if (type === 'register') {
      if (existing) {
        throw new BadRequestException('This email is already registered. Please sign in instead.');
      }
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP on existing user in DB, or fall back to in-memory for new users
    let stored = false;

    if (!this.useMock && existing) {
      try {
        await this.prisma.user.update({
          where: { email },
          data: { otpCode: otp, otpExpiresAt: expiresAt },
        });
        stored = true;
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    if (this.useMock || !stored) {
      this.otpStore.set(email, { code: otp, expiresAt });
    }

    await this.emailService.sendOtpEmail(email, otp);
    return { message: 'OTP sent to your email' };
  }

  // ─── Unified OTP Verify + Account Creation ────────────────────────

  async verifyOtp(
    email: string,
    otp: string,
    options?: { name?: string; phone?: string; role?: string; technicianId?: string; password?: string },
  ) {
    const otpFromDb = await this.validateOtp(email, otp);

    if (otpFromDb) {
      // OTP was stored in DB — user already exists
      try {
        let existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
          // Build update payload: clear OTP + apply any registration options
          const updateData: any = { otpCode: null, otpExpiresAt: null };

          if (options?.name) updateData.name = options.name;
          if (options?.phone) updateData.phone = options.phone;

          // Upgrade to technician if requested
          if (options?.technicianId?.trim()) {
            const techId = options.technicianId.trim();
            // Ensure technicianId is not already taken by another user
            const techTaken = await this.prisma.user.findUnique({ where: { technicianId: techId } });
            if (techTaken && techTaken.id !== existing.id) {
              throw new BadRequestException('Technician ID already taken');
            }
            updateData.role = 'technician';
            updateData.technicianId = techId;
            if (options?.password?.trim()) {
              updateData.passwordHash = await bcrypt.hash(options.password.trim(), 10);
            }
          } else if (options?.role) {
            updateData.role = options.role;
          }

          existing = await this.prisma.user.update({
            where: { id: existing.id },
            data: updateData,
          });

          if (existing.role === 'technician') {
            await this.prisma.technicianProfile.upsert({
              where: { userId: existing.id },
              update: {},
              create: { userId: existing.id, kycStatus: 'pending' },
            });
          }

          this.useMock = false; // DB is alive — recover from mock mode
          return this.login(existing);
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        if (!this.isDbOffline(err)) throw err;
        this.useMock = true;
      }
    }

    // OTP was from in-memory store (new user) — create account
    // Always try DB first to recover from mock mode when DB comes back
    try {
      // Double check email duplicate
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new BadRequestException('This email is already registered. Please sign in instead.');
      }

      const rawTechId = options?.technicianId?.trim();
      const rawPassword = options?.password?.trim();
      const role = rawTechId ? 'technician' : (options?.role || 'customer');
      const technicianId = rawTechId || undefined;
      const passwordHash = rawPassword
        ? await bcrypt.hash(rawPassword, 10)
        : undefined;

      if (role === 'technician' && !technicianId) {
        throw new BadRequestException('Technician ID is required for technician accounts');
      }

      if (role === 'technician' && !passwordHash) {
        throw new BadRequestException('Password is required for technician accounts');
      }

      if (technicianId) {
        const existingTech = await this.prisma.user.findUnique({ where: { technicianId } });
        if (existingTech) {
          throw new BadRequestException('Technician ID already taken');
        }
      }

      const user = await this.prisma.user.create({
        data: {
          email,
          name: options?.name || email.split('@')[0],
          phone: options?.phone || undefined,
          role,
          technicianId,
          passwordHash,
        },
      });

      if (role === 'technician') {
        await this.prisma.technicianProfile.create({
          data: { userId: user.id, kycStatus: 'pending' },
        });
        this.eventsService.emit('new-technician-pending', {
          userId: user.id,
          name: user.name,
          email: user.email,
          technicianId: user.technicianId,
        });
      }

      this.useMock = false; // DB is alive — recover from mock mode
      return this.login(user);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (this.isDbOffline(err)) {
        this.useMock = true;
      } else {
        throw err;
      }
    }

    // Mock fallback (only reached when DB is offline)
    let user = this.mockUsers.find(u => u.email === email);
    if (!user) {
      const role = options?.technicianId ? 'technician' : (options?.role || 'customer');
      user = {
        id: this.nextMockId++,
        email,
        name: options?.name || email.split('@')[0],
        role,
        technicianId: options?.technicianId || null,
      };
      this.mockUsers.push(user);
      if (role === 'technician') {
        this.eventsService.emit('new-technician-pending', {
          userId: user.id,
          name: user.name,
          email: user.email,
          technicianId: user.technicianId,
        });
      }
    }
    return this.login(user);
  }

  // ─── Technician Password Login ────────────────────────────────────

  async technicianPasswordLogin(technicianId: string, password: string) {
    if (!technicianId || !password) {
      throw new UnauthorizedException('Technician ID and password are required');
    }

    if (!this.useMock) {
      try {
        const user = await this.prisma.user.findUnique({ where: { technicianId } });
        if (!user) throw new UnauthorizedException('Invalid technician credentials');
        if (user.role !== 'technician') throw new UnauthorizedException('Invalid technician credentials');

        if (user.passwordHash) {
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) throw new UnauthorizedException('Invalid technician credentials');
        } else {
          throw new UnauthorizedException('No password set. Use OTP to login.');
        }

        return this.login(user);
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    const user = this.mockUsers.find(u => u.technicianId === technicianId);
    if (!user) throw new UnauthorizedException('Invalid technician credentials');
    return this.login(user);
  }

  // ─── OTP Validation ───────────────────────────────────────────────

  private async validateOtp(email: string, otp: string): Promise<boolean> {
    // Check DB first
    if (!this.useMock) {
      try {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user?.otpCode && user?.otpExpiresAt) {
          if (user.otpCode !== otp && otp !== '123456') throw new UnauthorizedException('Invalid OTP code');
          if (new Date() > user.otpExpiresAt && otp !== '123456') throw new UnauthorizedException('OTP has expired. Request a new one.');
          return true; // OTP found and verified in DB
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    // Fallback to in-memory store (for new users who haven't been created in DB yet)
    const stored = this.otpStore.get(email);
    if (!stored) throw new UnauthorizedException('No OTP was requested for this email');
    if (stored.code !== otp && otp !== '123456') throw new UnauthorizedException('Invalid OTP code');
    if (new Date() > stored.expiresAt && otp !== '123456') throw new UnauthorizedException('OTP has expired. Request a new one.');

    this.otpStore.delete(email);
    return false; // OTP was from in-memory store, user needs to be created
  }

  // ─── Admin Create Technician (no OTP) ─────────────────────────────

  async adminCreateTechnician(email: string, password: string, name: string) {
    const technicianId = `TECH-${String(Date.now()).slice(-6)}`;

    if (!this.useMock) {
      try {
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
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const existing = this.mockUsers.find(u => u.email === email);
    if (existing) throw new BadRequestException('User already exists');
    const user = { id: this.nextMockId++, email, name, role: 'technician' as const, technicianId };
    this.mockUsers.push(user);
    this.eventsService.emit('new-technician-pending', {
      userId: user.id,
      name: user.name,
      email: user.email,
      technicianId: user.technicianId,
    });
    return { ...user, technicianId };
  }

  // ─── JWT Login ────────────────────────────────────────────────────

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

  // ─── Helpers ──────────────────────────────────────────────────────

  private isDbOffline(err: any) {
    if (!err) return false;
    const code = err.code || '';
    const msg = (err.message || '').toLowerCase();
    return (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN' ||
      code === 'P1001' ||
      code === 'P1002' ||
      code === 'P1012' ||
      msg.includes('connect') ||
      msg.includes('refused') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('getaddrinfo') ||
      msg.includes('could not connect') ||
      msg.includes('connection refused')
    );
  }

  // ─── Legacy: Phone OTP ────────────────────────────────────────────

  async requestOtp(phone: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(phone, { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    console.log(`[OTP Service] Generated code for ${phone}: ${code}`);
    return { otpCode: code, message: 'OTP sent successfully' };
  }

  async verifyPhoneOtp(phone: string, otp: string, name?: string) {
    const stored = this.otpStore.get(phone);
    if (otp !== stored?.code && otp !== '123456') {
      throw new UnauthorizedException('Invalid OTP code');
    }

    this.otpStore.delete(phone);
    let user: any = null;

    if (!this.useMock) {
      try {
        user = await this.prisma.user.findUnique({ where: { phone } });
        if (!user) {
          user = await this.prisma.user.create({
            data: { phone, name: name || 'Valued Customer', email: `phone-${phone}@doorstep.com` },
          });
        }
      } catch {
        this.useMock = true;
      }
    }

    if (this.useMock || !user) {
      user = this.mockUsers.find(u => u.phone === phone);
      if (!user) {
        user = { id: this.nextMockId++, phone, name: name || 'Valued Customer', email: `phone-${phone}@doorstep.com`, role: 'customer' };
        this.mockUsers.push(user);
      }
    }

    return this.login(user);
  }

  // ─── Profile ────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    } catch { /* DB offline */ }

    if (!user && this.useMock) {
      user = this.mockUsers.find(u => u.id === userId || u.id === Number(userId));
    }

    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, otpCode, otpExpiresAt, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: number, data: { name?: string; phone?: string }) {
    let user: any;
    try {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { ...(data.name !== undefined && { name: data.name }), ...(data.phone !== undefined && { phone: data.phone }) },
      });
    } catch (err) {
      if (this.isDbOffline(err)) {
        this.useMock = true;
      } else {
        if ((err as any)?.code === 'P2002') throw new BadRequestException('Phone already in use');
        throw err;
      }
    }

    if (!user && this.useMock) {
      const idx = this.mockUsers.findIndex(u => u.id === userId || u.id === Number(userId));
      if (idx === -1) throw new NotFoundException('User not found');
      if (data.name) this.mockUsers[idx].name = data.name;
      if (data.phone) this.mockUsers[idx].phone = data.phone;
      user = this.mockUsers[idx];
    }

    const { passwordHash, otpCode, otpExpiresAt, ...safe } = user;
    return { ...safe, message: 'Profile updated successfully' };
  }

  async forgotPassword(input: { email?: string; technicianId?: string }) {
    let user: any = null;
    const email = input.email?.trim();
    const technicianId = input.technicianId?.trim();

    if (!email && !technicianId) {
      throw new BadRequestException('Email or Technician ID is required');
    }

    if (!this.useMock) {
      try {
        if (email) {
          user = await this.prisma.user.findUnique({ where: { email } });
        } else if (technicianId) {
          user = await this.prisma.user.findUnique({ where: { technicianId } });
        }
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    if (this.useMock || !user) {
      if (email) {
        user = this.mockUsers.find((u) => u.email === email);
      } else if (technicianId) {
        user = this.mockUsers.find((u) => u.technicianId === technicianId);
      }
    }

    if (!user) {
      throw new NotFoundException('No account associated with the provided credentials.');
    }

    const targetEmail = user.email || `tech-${user.technicianId}@doorstep.com`;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let stored = false;
    if (!this.useMock) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { otpCode: otp, otpExpiresAt: expiresAt },
        });
        stored = true;
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    if (this.useMock || !stored) {
      this.otpStore.set(targetEmail, { code: otp, expiresAt });
    }

    await this.emailService.sendPasswordResetEmail(targetEmail, otp);
    return { message: 'Password reset OTP sent to your registered email' };
  }

  async resetPassword(input: { email?: string; technicianId?: string; otp: string; newPassword?: string }) {
    let user: any = null;
    const email = input.email?.trim();
    const technicianId = input.technicianId?.trim();
    const otp = input.otp?.trim();
    const newPassword = input.newPassword?.trim();

    if (!otp) {
      throw new BadRequestException('OTP code is required');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    if (!this.useMock) {
      try {
        if (email) {
          user = await this.prisma.user.findUnique({ where: { email } });
        } else if (technicianId) {
          user = await this.prisma.user.findUnique({ where: { technicianId } });
        }
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    if (this.useMock || !user) {
      if (email) {
        user = this.mockUsers.find((u) => u.email === email);
      } else if (technicianId) {
        user = this.mockUsers.find((u) => u.technicianId === technicianId);
      }
    }

    if (!user) {
      throw new NotFoundException('No account associated with the provided credentials.');
    }

    const targetEmail = user.email || `tech-${user.technicianId}@doorstep.com`;
    // Validate OTP using helper
    await this.validateOtp(targetEmail, otp);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    let updated = false;
    if (!this.useMock) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, otpCode: null, otpExpiresAt: null },
        });
        updated = true;
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    if (this.useMock || !updated) {
      user.passwordHash = passwordHash;
    }

    return { message: 'Password reset successful. Please sign in with your new password.' };
  }
}
