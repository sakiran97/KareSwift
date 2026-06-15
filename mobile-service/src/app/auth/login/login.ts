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
  // 'new_password_only': showing only new password input (accessed via recovery link)
  forgotPasswordState: 'none' | 'email' | 'new_password_only' = 'none';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
      password: ['', [Validators.required, Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]]
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
      newPassword: ['']
    });

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      
      if (urlParams.get('type') === 'recovery' || hash.includes('type=recovery')) {
        this.forgotPasswordState = 'new_password_only';
        this.forgotPasswordForm.get('newPassword')?.setValidators([Validators.required, Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]);
        this.forgotPasswordForm.get('newPassword')?.updateValueAndValidity();
      } else if (hash.includes('access_token') || window.location.search.includes('code=')) {
        this.isRedirecting = true;
        setTimeout(() => {
          this.isRedirecting = false;
          this.cdr.detectChanges();
        }, 5000);
      }
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
    
    // If we are currently in recovery mode, ensure we destroy the hidden Supabase session
    if (typeof window !== 'undefined' && (window.location.search.includes('type=recovery') || window.location.hash.includes('type=recovery'))) {
      this.authService.logout();
      this.router.navigate(['/auth/login']); // Clean the URL
    }
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
    
    this.authService.checkEmail(emailCtrl?.value).subscribe({
      next: (res) => {
        if (!res.exists) {
          this.isLoading = false;
          this.errorMessage = 'No account found with this email address. Please sign up first.';
          this.cdr.detectChanges();
          return;
        }
        
        // Email exists, request reset link
        this.authService.requestPasswordResetOTP(emailCtrl?.value).subscribe({
          next: ({ error }) => {
            this.isLoading = false;
            if (error) {
              this.errorMessage = error.message;
            } else {
              this.successMessage = 'Password reset link sent! Please check your inbox and click the link.';
              // We do NOT change state to otp or new_password here.
              // They must click the link in their email.
            }
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            this.isLoading = false;
            this.errorMessage = err.message || 'Failed to send reset link.';
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to verify account. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  updatePassword(): void {
    const newPasswordCtrl = this.forgotPasswordForm.get('newPassword');
    if (newPasswordCtrl?.invalid) {
      newPasswordCtrl.markAsTouched();
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;
    
    this.authService.updateUserPassword(newPasswordCtrl?.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Password updated successfully! Please log in with your new password.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.authService.logout(); // Destroy the hidden recovery session securely
          this.forgotPasswordState = 'none';
          this.forgotPasswordForm.reset();
          this.router.navigate(['/auth/login']).then(() => {
             // Force a tiny reload of state if needed, or just let the router clear the URL
             window.location.href = '/auth/login';
          });
        }, 2000);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Failed to update password.';
        this.cdr.detectChanges();
      }
    });
  }
}
