import { Component, ChangeDetectorRef, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
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

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  signUpWithGoogle(): void {
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
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const { name, email, phone, password } = this.registerForm.value;

    this.authService.signUpWithPassword(email, password, name, phone).subscribe({
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
      error: (err: any) => {
        this.isLoading = false;
        const msg = err.error?.message || err.message || '';
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already_registered')) {
          this.errorMessage = 'This email address is already registered. Please click "Sign in here" below to log in.';
        } else {
          this.errorMessage = msg || 'Registration failed. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
