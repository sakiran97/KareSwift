import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-technician-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './technician-login.html',
  styleUrl: './technician-login.scss',
})
export class TechnicianLogin {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  // Forgot Password state
  showForgotModal = false;
  resetOtpSent = false;
  modalLoading = false;
  resetInput = ''; // email or technicianId
  resetOtp = '';
  newPassword = '';
  modalError: string | null = null;
  modalSuccess: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      technicianId: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const { technicianId, password } = this.loginForm.value;

    this.authService.login(technicianId, password).subscribe({
      next: (res: LoginResponse) => {
        this.isLoading = false;
        this.router.navigate(['/technician/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Invalid technician ID or password.';
        this.cdr.detectChanges();
      }
    });
  }

  openForgotPassword() {
    this.showForgotModal = true;
    this.resetOtpSent = false;
    this.resetInput = '';
    this.resetOtp = '';
    this.newPassword = '';
    this.modalError = null;
    this.modalSuccess = null;
  }

  closeForgotPassword() {
    this.showForgotModal = false;
  }

  requestResetOtp() {
    if (!this.resetInput.trim()) {
      this.modalError = 'Technician ID or Email is required.';
      return;
    }
    this.modalLoading = true;
    this.modalError = null;
    this.modalSuccess = null;

    const payload: any = {};
    if (this.resetInput.includes('@')) {
      payload.email = this.resetInput.trim();
    } else {
      payload.technicianId = this.resetInput.trim();
    }

    this.authService.forgotPassword(payload).subscribe({
      next: (res: any) => {
        this.modalLoading = false;
        this.resetOtpSent = true;
        this.modalSuccess = 'Reset OTP code has been sent to your registered email.';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.modalLoading = false;
        this.modalError = err.error?.message || 'Failed to send password reset code. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  resetPasswordSubmit() {
    if (!this.resetOtp.trim()) {
      this.modalError = 'Verification OTP code is required.';
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.modalError = 'New password must be at least 6 characters.';
      return;
    }
    this.modalLoading = true;
    this.modalError = null;
    this.modalSuccess = null;

    const payload: any = {
      otp: this.resetOtp.trim(),
      newPassword: this.newPassword.trim()
    };
    if (this.resetInput.includes('@')) {
      payload.email = this.resetInput.trim();
    } else {
      payload.technicianId = this.resetInput.trim();
    }

    this.authService.resetPassword(payload).subscribe({
      next: (res: any) => {
        this.modalLoading = false;
        this.modalSuccess = 'Password reset successful! You can now close this modal and sign in.';
        this.resetOtp = '';
        this.newPassword = '';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.modalLoading = false;
        this.modalError = err.error?.message || 'Invalid OTP code or reset failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
