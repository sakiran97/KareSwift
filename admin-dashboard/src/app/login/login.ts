import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  email = '';
  otp = '';
  otpSent = signal(false);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  sendOtp() {
    if (!this.email || !this.email.includes('@')) {
      this.errorMsg.set('Please enter a valid email address.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.adminService.sendOtp(this.email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.otpSent.set(true);
        this.successMsg.set('OTP sent successfully to ' + this.email);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to send OTP. Please check backend connection.');
      }
    });
  }

  verifyOtp() {
    if (!this.otp || this.otp.length < 6) {
      this.errorMsg.set('Please enter the 6-digit OTP code.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    this.adminService.verifyOtp(this.email, this.otp).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.message || err.error?.message || 'Invalid OTP or access denied.');
      }
    });
  }

  backToEmail() {
    this.otpSent.set(false);
    this.otp = '';
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }
}
