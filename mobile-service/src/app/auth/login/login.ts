import { Component, ChangeDetectorRef } from '@angular/core';
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
        this.errorMessage = err.error?.message || err.message || 'Invalid email or password. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
