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
  errorMessage: string | null = null;
  isLoading = false;
  otpRequested = false;
  isRedirecting = false;

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
        if (user) {
          if (user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else if (user.role === 'technician') {
            this.router.navigate(['/technician/dashboard']);
          } else {
            this.router.navigate(['/order/device-select']);
          }
        } else {
          this.router.navigate(['/order/device-select']);
        }
      }
    });
  }

  signInWithGoogle(): void {
    this.isLoading = true;
    this.errorMessage = null;
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

    this.authService.signInWithPassword(email, password).subscribe({
      next: (res: LoginResponse) => {
        this.isLoading = false;
        if (res.user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else if (res.user.role === 'technician') {
          this.router.navigate(['/technician/dashboard']);
        } else {
          this.router.navigate(['/order/device-select']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.authService.checkEmail(email).subscribe({
          next: (res: { exists: boolean }) => {
            if (!res.exists) {
              this.errorMessage = 'No account found with this email address. Please sign up first.';
            } else {
              this.errorMessage = err.error?.message || err.message || 'Invalid email or password. Please try again.';
            }
            this.cdr.detectChanges();
          },
          error: () => {
            this.errorMessage = err.error?.message || err.message || 'Invalid email or password. Please try again.';
            this.cdr.detectChanges();
          }
        });
      }
    });
  }
}
