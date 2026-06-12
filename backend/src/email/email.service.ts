import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      console.warn('[EmailService] GMAIL_USER / GMAIL_PASS not set. Emails will be logged to console only.');
    }
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Your DeviceFix OTP Code';
    const body = `Your OTP code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n- DeviceFix Team`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"DeviceFix" <${process.env.GMAIL_USER}>`,
          to,
          subject,
          text: body,
        });
        console.log(`[EmailService] OTP sent to ${to}`);
        return;
      } catch (err: any) {
        console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
      }
    }

    console.log(`[EmailService] [DEV] OTP for ${to}: ${otp}`);
  }

  async sendPasswordResetEmail(to: string, otp: string): Promise<void> {
    const subject = 'Reset Your DeviceFix Password';
    const body = `You requested a password reset. Your OTP verification code is:\n\n${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n- DeviceFix Team`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"DeviceFix" <${process.env.GMAIL_USER}>`,
          to,
          subject,
          text: body,
        });
        console.log(`[EmailService] Password reset OTP sent to ${to}`);
        return;
      } catch (err: any) {
        console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
      }
    }

    console.log(`[EmailService] [DEV] Password Reset OTP for ${to}: ${otp}`);
  }
}
