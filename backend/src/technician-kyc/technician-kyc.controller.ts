import { Controller, Get, Post, Body, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { TechnicianKycService } from './technician-kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('technician/kyc')
export class TechnicianKycController {
  constructor(private readonly kycService: TechnicianKycService) {}

  // ─── File Uploading ────────────────────────────────────────

  /**
   * POST /technician/kyc/upload-file — Upload a single KYC document/photo (Public)
   */
  @Post('upload-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = join(__dirname, '..', '..', 'uploads');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `file-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return cb(new BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed.'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded or file rejected by validation.');
    }
    return { url: `/uploads/${file.filename}` };
  }

  // ─── Aadhaar OTP Verification ─────────────────────────────

  /**
   * POST /technician/kyc/send-aadhaar-otp — Request Aadhaar verification OTP (Optional Auth)
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('send-aadhaar-otp')
  async sendAadhaarOtp(
    @Req() req: any,
    @Body('aadhaarNumber') aadhaarNumber: string,
  ) {
    const userId = req.user ? req.user.id : null;
    return this.kycService.sendAadhaarOtp(userId, aadhaarNumber);
  }

  /**
   * POST /technician/kyc/verify-aadhaar-otp — Verify Aadhaar OTP code (Optional Auth)
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('verify-aadhaar-otp')
  async verifyAadhaarOtp(
    @Req() req: any,
    @Body('otp') otp: string,
    @Body('aadhaarNumber') aadhaarNumber?: string,
  ) {
    const userId = req.user ? req.user.id : null;
    return this.kycService.verifyAadhaarOtp(userId, otp, aadhaarNumber);
  }

  // ─── Technician Endpoints ─────────────────────────────────

  /**
   * POST /technician/kyc/upload — Upload KYC documents (Auth required)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician')
  @Post('upload')
  async uploadDocuments(
    @Req() req: any,
    @Body() body: {
      govtIdType: string;
      govtIdNumber: string;
      aadhaarNumber?: string;
      panNumber?: string;
      govtIdFrontUrl?: string;
      govtIdBackUrl?: string;
    },
  ) {
    return this.kycService.uploadDocuments(req.user.id, body);
  }

  /**
   * GET /technician/kyc/status — Check KYC verification status (Auth required)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician')
  @Get('status')
  async getStatus(@Req() req: any) {
    return this.kycService.getKycStatus(req.user.id);
  }

  /**
   * POST /technician/kyc/shop — Upload workshop/shop details (Auth required)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician')
  @Post('shop')
  async uploadShopDetails(
    @Req() req: any,
    @Body() body: {
      shopName: string;
      shopAddress: string;
      shopLatitude?: number;
      shopLongitude?: number;
      shopPhotos?: string[];
    },
  ) {
    return this.kycService.uploadShopDetails(req.user.id, body);
  }

  /**
   * POST /technician/kyc/location — Update live GPS location (Auth required)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician')
  @Post('location')
  async updateLocation(
    @Req() req: any,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.kycService.updateLocation(req.user.id, latitude, longitude);
  }

  /**
   * POST /technician/kyc/toggle-online — Toggle online/offline status (Auth required)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician')
  @Post('toggle-online')
  async toggleOnline(
    @Req() req: any,
    @Body('online') online: boolean,
  ) {
    return this.kycService.toggleOnline(req.user.id, online);
  }
}
