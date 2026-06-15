import { Component, ChangeDetectorRef, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  forgotPasswordForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;
  otpRequested = false;
  isRedirecting = false;
  
  // 'none': showing login form
  // 'email': showing email input for OTP
  // 'otp': showing OTP and new password inputs
  forgotPasswordState: 'none' | 'email' | 'otp' = 'none';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      otp: [''],
      newPassword: ['']
    });

    if (typeof window !== 'undefined' && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
      this.isRedirecting = true;
      setTimeout(() => {
        this.isRedirecting = false;
        this.cdr.detectChanges();
      }, 5000);
    }

    effect(() => {
      if (this.authService.isLoggedIn()) {
        const user = this.authService.getCurrentUser();
        if (user && user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/order/device-select']);
        }
      }
    });
  }

  signInWithGoogle(): void {
    this.isLoading = true;
    this.errorMessage = null;
    localStorage.removeItem('user');
    this.authService.signInWithGoogle().subscribe({
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Google Sign-in failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const { email, password } = this.loginForm.value;
    localStorage.removeItem('user');

    this.authService.signInWithPassword(email, password).subscribe({
      next: (res: LoginResponse) => {
        this.isLoading = false;
        if (res.user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/order/device-select']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || err.message || 'Invalid email or password. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Forgot Password Flow ──────────────────────────────────────────

  initForgotPassword(): void {
    this.forgotPasswordState = 'email';
    this.errorMessage = null;
    this.successMessage = null;
    this.forgotPasswordForm.reset();
    // Pre-fill email if already entered in login form
    const loginEmail = this.loginForm.get('email')?.value;
    if (loginEmail) {
      this.forgotPasswordForm.patchValue({ email: loginEmail });
    }
  }

  cancelForgotPassword(): void {
    this.forgotPasswordState = 'none';
    this.errorMessage = null;
    this.successMessage = null;
  }

  requestOTP(): void {
    const emailCtrl = this.forgotPasswordForm.get('email');
    if (emailCtrl?.invalid) {
      emailCtrl.markAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    
    this.authService.requestPasswordResetOTP(emailCtrl?.value).subscribe({
      next: ({ error }) => {
        this.isLoading = false;
        if (error) {
          this.errorMessage = error.message;
        } else {
          this.successMessage = 'OTP sent to your email. Please check your inbox.';
          this.forgotPasswordState = 'otp';
          this.forgotPasswordForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6)]);
          this.forgotPasswordForm.get('newPassword')?.setValidators([Validators.required, Validators.minLength(6)]);
          this.forgotPasswordForm.get('otp')?.updateValueAndValidity();
          this.forgotPasswordForm.get('newPassword')?.updateValueAndValidity();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Failed to send OTP.';
        this.cdr.detectChanges();
      }
    });
  }

  verifyOTP(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    
    const { email, otp, newPassword } = this.forgotPasswordForm.value;
    
    this.authService.verifyResetOTPAndSetPassword(email, otp, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Password updated successfully! Redirecting...';
        this.cdr.detectChanges();
        // The service already updates the session if successful. 
        // We can just rely on the auth listener or navigate manually.
        setTimeout(() => {
          this.cancelForgotPassword();
          // Optionally, sign them in with the new password, or rely on Supabase session
          this.authService.signInWithPassword(email, newPassword).subscribe({
            next: (res) => {
              if (res.user.role === 'admin') {
                this.router.navigate(['/admin']);
              } else {
                this.router.navigate(['/order/device-select']);
              }
            }
          });
        }, 1500);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Invalid OTP or failed to update password.';
        this.cdr.detectChanges();
      }
    });
  }
}
