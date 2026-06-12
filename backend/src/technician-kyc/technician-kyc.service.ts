import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class TechnicianKycService {
  private useMock = false;
  private mockProfiles: any[] = [];
  private aadhaarOtps = new Map<string, { otp: string; aadhaarNumber: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  // ─── Create Profile on Registration ───────────────────────
  async createProfile(userId: number): Promise<any> {
    if (!this.useMock) {
      try {
        const existing = await this.prisma.technicianProfile.findUnique({ where: { userId } });
        if (existing) return existing;

        return await this.prisma.technicianProfile.create({
          data: { userId, kycStatus: 'pending' },
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = { userId, kycStatus: 'pending', isOnline: false, shopVerified: false, shopPhotos: [], aadhaarVerified: false };
    this.mockProfiles.push(mock);
    return mock;
  }

  // ─── Aadhaar OTP Verification Logic ────────────────────────
  async sendAadhaarOtp(userId: number | null, aadhaarNumber: string): Promise<any> {
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      throw new BadRequestException('Aadhaar number must be exactly 12 digits');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const record = { otp, aadhaarNumber, expiresAt };
    this.aadhaarOtps.set(aadhaarNumber, record);
    if (userId) {
      this.aadhaarOtps.set(String(userId), record);
    }
    
    console.log(`[Aadhaar OTP Service] Generated OTP for Aadhaar ${aadhaarNumber}: ${otp}`);

    return { 
      message: 'Verification OTP sent to Aadhaar-linked mobile',
      otpCode: otp
    };
  }

  async verifyAadhaarOtp(userId: number | null, otp: string, aadhaarNumber?: string): Promise<any> {
    let record: any = null;
    let keyUsed = '';

    if (aadhaarNumber) {
      record = this.aadhaarOtps.get(aadhaarNumber);
      keyUsed = aadhaarNumber;
    }
    if (!record && userId) {
      record = this.aadhaarOtps.get(String(userId));
      keyUsed = String(userId);
    }

    if (!record) {
      throw new BadRequestException('No verification requested or OTP expired. Please send OTP again.');
    }

    if (new Date() > record.expiresAt) {
      this.aadhaarOtps.delete(keyUsed);
      throw new BadRequestException('Aadhaar verification OTP has expired. Please send OTP again.');
    }

    if (record.otp !== otp && otp !== '123456') { // Allow '123456' as back-door test OTP
      throw new BadRequestException('Invalid Aadhaar OTP code.');
    }

    const verifiedAadhaar = record.aadhaarNumber;
    this.aadhaarOtps.delete(verifiedAadhaar);
    if (userId) {
      this.aadhaarOtps.delete(String(userId));
    }

    // Save status only if we have a valid logged-in user
    if (userId) {
      if (!this.useMock) {
        try {
          await this.prisma.technicianProfile.update({
            where: { userId },
            data: {
              aadhaarVerified: true,
              govtIdType: 'aadhaar',
              govtIdNumber: verifiedAadhaar,
              aadhaarNumber: verifiedAadhaar,
            },
          });
        } catch (err: any) {
          if (this.isDbOffline(err)) {
            this.useMock = true;
          } else {
            throw err;
          }
        }
      }

      if (this.useMock) {
        const mock = this.mockProfiles.find(p => p.userId === userId);
        if (mock) {
          mock.aadhaarVerified = true;
          mock.govtIdType = 'aadhaar';
          mock.govtIdNumber = verifiedAadhaar;
          mock.aadhaarNumber = verifiedAadhaar;
        } else {
          this.mockProfiles.push({
            userId,
            aadhaarVerified: true,
            govtIdType: 'aadhaar',
            govtIdNumber: verifiedAadhaar,
            aadhaarNumber: verifiedAadhaar,
            kycStatus: 'pending',
          });
        }
      }
    }

    return { success: true, message: 'Aadhaar OTP verified successfully.', aadhaarNumber: verifiedAadhaar };
  }

  // ─── Upload KYC Documents ─────────────────────────────────
  async uploadDocuments(
    userId: number,
    data: {
      govtIdType: string;
      govtIdNumber: string;
      aadhaarNumber?: string;
      panNumber?: string;
      govtIdFrontUrl?: string;
      govtIdBackUrl?: string;
    },
  ): Promise<any> {
    // Validate Aadhaar OTP Verification was done first
    if (data.govtIdType === 'aadhaar') {
      let isVerified = false;
      if (!this.useMock) {
        try {
          const profile = await this.prisma.technicianProfile.findUnique({ where: { userId } });
          isVerified = !!profile?.aadhaarVerified;
        } catch (err: any) {
          if (this.isDbOffline(err)) this.useMock = true;
          else throw err;
        }
      }
      if (this.useMock) {
        const mock = this.mockProfiles.find(p => p.userId === userId);
        isVerified = !!mock?.aadhaarVerified;
      }
      if (!isVerified) {
        throw new BadRequestException('Aadhaar verification via OTP is required first.');
      }
    }

    // Validate document format
    if (data.govtIdType === 'aadhaar' && data.aadhaarNumber) {
      if (!/^\d{12}$/.test(data.aadhaarNumber)) {
        throw new BadRequestException('Aadhaar number must be exactly 12 digits');
      }
    }
    if (data.govtIdType === 'pan' && data.panNumber) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.panNumber)) {
        throw new BadRequestException('PAN must match format XXXXX0000X (5 letters, 4 digits, 1 letter)');
      }
    }

    if (!this.useMock) {
      try {
        const profile = await this.prisma.technicianProfile.findUnique({ where: { userId } });
        if (!profile) throw new NotFoundException('Technician profile not found. Register first.');

        return await this.prisma.technicianProfile.update({
          where: { userId },
          data: {
            govtIdType: data.govtIdType,
            govtIdNumber: data.govtIdNumber,
            aadhaarNumber: data.aadhaarNumber || null,
            panNumber: data.panNumber || null,
            govtIdFrontUrl: data.govtIdFrontUrl || null,
            govtIdBackUrl: data.govtIdBackUrl || null,
            kycStatus: 'under_review',
          },
        });
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    // Mock fallback
    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (!mock) throw new NotFoundException('Technician profile not found');
    Object.assign(mock, data, { kycStatus: 'under_review' });
    return mock;
  }

  // ─── Upload Shop Details ──────────────────────────────────
  async uploadShopDetails(
    userId: number,
    data: {
      shopName: string;
      shopAddress: string;
      shopLatitude?: number;
      shopLongitude?: number;
      shopPhotos?: string[];
    },
  ): Promise<any> {
    if (!data.shopName?.trim()) throw new BadRequestException('Shop name is required');
    if (!data.shopAddress?.trim()) throw new BadRequestException('Shop address is required');

    if (!this.useMock) {
      try {
        const profile = await this.prisma.technicianProfile.findUnique({ where: { userId } });
        if (!profile) throw new NotFoundException('Technician profile not found. Register first.');

        return await this.prisma.technicianProfile.update({
          where: { userId },
          data: {
            shopName: data.shopName.trim(),
            shopAddress: data.shopAddress.trim(),
            shopLatitude: data.shopLatitude ?? null,
            shopLongitude: data.shopLongitude ?? null,
            shopPhotos: data.shopPhotos || [],
          },
        });
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (!mock) throw new NotFoundException('Technician profile not found');
    Object.assign(mock, data);
    return mock;
  }

  // ─── Get KYC Status ───────────────────────────────────────
  async getKycStatus(userId: number): Promise<any> {
    if (!this.useMock) {
      try {
        const profile = await this.prisma.technicianProfile.findUnique({
          where: { userId },
          select: {
            kycStatus: true,
            kycReviewNotes: true,
            kycReviewedAt: true,
            shopVerified: true,
            shopReviewNotes: true,
            govtIdType: true,
            shopName: true,
            shopAddress: true,
            isOnline: true,
          },
        });
        if (!profile) throw new NotFoundException('Technician profile not found');
        return profile;
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (!mock) throw new NotFoundException('Technician profile not found');
    return {
      kycStatus: mock.kycStatus,
      kycReviewNotes: mock.kycReviewNotes || null,
      shopVerified: mock.shopVerified || false,
      shopReviewNotes: mock.shopReviewNotes || null,
      isOnline: mock.isOnline || false,
    };
  }

  // ─── Update Live Location ─────────────────────────────────
  async updateLocation(
    userId: number,
    latitude: number,
    longitude: number,
  ): Promise<{ success: boolean }> {
    if (!this.useMock) {
      try {
        await this.prisma.technicianProfile.update({
          where: { userId },
          data: {
            currentLatitude: latitude,
            currentLongitude: longitude,
            lastLocationAt: new Date(),
          },
        });
        return { success: true };
      } catch (err: any) {
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (mock) {
      mock.currentLatitude = latitude;
      mock.currentLongitude = longitude;
      mock.lastLocationAt = new Date();
    }
    return { success: true };
  }

  // ─── Toggle Online/Offline ────────────────────────────────
  async toggleOnline(userId: number, online: boolean): Promise<{ isOnline: boolean }> {
    if (!this.useMock) {
      try {
        const profile = await this.prisma.technicianProfile.findUnique({ where: { userId } });
        if (!profile) throw new NotFoundException('Technician profile not found');

        if (online && profile.kycStatus !== 'approved') {
          throw new ForbiddenException('Cannot go online: KYC not yet approved');
        }
        if (online && !profile.shopVerified) {
          throw new ForbiddenException('Cannot go online: Workshop not yet verified');
        }

        const updated = await this.prisma.technicianProfile.update({
          where: { userId },
          data: { isOnline: online },
        });
        return { isOnline: updated.isOnline };
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (!mock) throw new NotFoundException('Technician profile not found');
    if (online && mock.kycStatus !== 'approved') {
      throw new ForbiddenException('Cannot go online: KYC not yet approved');
    }
    mock.isOnline = online;
    return { isOnline: online };
  }

  // ─── Admin: Get Pending KYC Reviews ───────────────────────
  async getPendingKycReviews(): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.technicianProfile.findMany({
          where: {
            kycStatus: { in: ['pending', 'under_review'] },
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, technicianId: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }
    return this.mockProfiles.filter(p => p.kycStatus === 'pending' || p.kycStatus === 'under_review');
  }

  // ─── Admin: Approve KYC ───────────────────────────────────
  async approveKyc(userId: number, adminUserId: number): Promise<any> {
    if (!this.useMock) {
      try {
        const profile = await this.prisma.technicianProfile.findUnique({ where: { userId } });
        if (!profile) throw new NotFoundException('Technician profile not found');

        const updated = await this.prisma.technicianProfile.update({
          where: { userId },
          data: {
            kycStatus: 'approved',
            kycReviewedAt: new Date(),
            kycReviewedBy: adminUserId,
            kycReviewNotes: null,
          },
        });

        // Notify the technician
        this.eventsService.emit('kyc-status-update', {
          userId,
          kycStatus: 'approved',
          message: 'Your KYC has been approved! You can now go online and receive orders.',
        });

        // Also create a DB notification
        try {
          await this.prisma.notification.create({
            data: {
              userId,
              title: 'KYC Approved ✅',
              body: 'Your documents have been verified. You can now go online and start receiving repair orders!',
              type: 'kyc-update',
            },
          });
        } catch { /* notification creation is best-effort */ }

        return updated;
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (!mock) throw new NotFoundException('Technician profile not found');
    mock.kycStatus = 'approved';
    mock.kycReviewedAt = new Date();
    mock.kycReviewedBy = adminUserId;
    return mock;
  }

  // ─── Admin: Reject KYC ────────────────────────────────────
  async rejectKyc(userId: number, adminUserId: number, reason: string): Promise<any> {
    if (!this.useMock) {
      try {
        const profile = await this.prisma.technicianProfile.findUnique({ where: { userId } });
        if (!profile) throw new NotFoundException('Technician profile not found');

        const updated = await this.prisma.technicianProfile.update({
          where: { userId },
          data: {
            kycStatus: 'rejected',
            kycReviewedAt: new Date(),
            kycReviewedBy: adminUserId,
            kycReviewNotes: reason,
            isOnline: false, // force offline on rejection
          },
        });

        this.eventsService.emit('kyc-status-update', {
          userId,
          kycStatus: 'rejected',
          reason,
          message: `Your KYC was rejected: ${reason}`,
        });

        try {
          await this.prisma.notification.create({
            data: {
              userId,
              title: 'KYC Rejected ❌',
              body: `Your documents were rejected. Reason: ${reason}. Please re-submit.`,
              type: 'kyc-update',
            },
          });
        } catch { /* best-effort */ }

        return updated;
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err;
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (!mock) throw new NotFoundException('Technician profile not found');
    mock.kycStatus = 'rejected';
    mock.kycReviewNotes = reason;
    return mock;
  }

  // ─── Admin: Approve Shop ──────────────────────────────────
  async approveShop(userId: number): Promise<any> {
    if (!this.useMock) {
      try {
        const updated = await this.prisma.technicianProfile.update({
          where: { userId },
          data: {
            shopVerified: true,
            shopReviewedAt: new Date(),
            shopReviewNotes: null,
          },
        });

        this.eventsService.emit('kyc-status-update', {
          userId,
          shopVerified: true,
          message: 'Your workshop has been verified!',
        });

        return updated;
      } catch (err: any) {
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (mock) mock.shopVerified = true;
    return mock;
  }

  // ─── Admin: Reject Shop ───────────────────────────────────
  async rejectShop(userId: number, reason: string): Promise<any> {
    if (!this.useMock) {
      try {
        return await this.prisma.technicianProfile.update({
          where: { userId },
          data: {
            shopVerified: false,
            shopReviewedAt: new Date(),
            shopReviewNotes: reason,
          },
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }

    const mock = this.mockProfiles.find(p => p.userId === userId);
    if (mock) {
      mock.shopVerified = false;
      mock.shopReviewNotes = reason;
    }
    return mock;
  }

  // ─── Admin: Get Pending Shop Verifications ────────────────
  async getPendingShopReviews(): Promise<any[]> {
    if (!this.useMock) {
      try {
        return await this.prisma.technicianProfile.findMany({
          where: {
            shopVerified: false,
            shopName: { not: null },
            shopPhotos: { isEmpty: false },
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, technicianId: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }
    return this.mockProfiles.filter(p => !p.shopVerified && p.shopName);
  }

  // ─── Admin: Get All Technicians ───────────────────────────
  async getAllTechnicians(filter?: { kycStatus?: string }): Promise<any[]> {
    if (!this.useMock) {
      try {
        const where: any = {};
        if (filter?.kycStatus) where.kycStatus = filter.kycStatus;

        return await this.prisma.technicianProfile.findMany({
          where,
          include: {
            user: {
              select: {
                id: true, name: true, email: true, phone: true,
                technicianId: true, averageRating: true, totalReviews: true, createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err: any) {
        if (this.isDbOffline(err)) this.useMock = true;
        else throw err;
      }
    }
    return this.mockProfiles;
  }

  private isDbOffline(err: any): boolean {
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
}
