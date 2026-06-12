import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-technician',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-technician.html',
  styleUrl: './create-technician.scss',
})
export class CreateTechnician {
  form: FormGroup;
  loading = false;
  message = '';
  createdTechnician: any = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.message = '';
    this.createdTechnician = null;

    this.authService.registerTechnician(
      this.form.value.email,
      this.form.value.password,
      this.form.value.name,
    ).subscribe({
      next: (res: any) => {
        this.createdTechnician = res;
        this.message = `Technician created successfully! ID: ${res.technicianId}`;
        this.loading = false;
        this.form.reset();
      },
      error: (err: any) => {
        this.message = err.error?.message || 'Failed to create technician';
        this.loading = false;
      }
    });
  }
}
