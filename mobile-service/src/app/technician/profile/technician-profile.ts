import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-technician-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './technician-profile.html',
  styleUrl: './technician-profile.scss',
})
export class TechnicianProfile implements OnInit {
  profile: any = null;
  loading = true;
  saving = false;
  profileForm: FormGroup;
  message = '';

  constructor(private http: HttpClient, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit() {
    setTimeout(() => {
      if (this.loading) { this.loading = false; this.cdr.detectChanges(); }
    }, 8000);

    this.http.get('/api/technician/profile').subscribe({
      next: (res: any) => {
        this.profile = res;
        this.profileForm.patchValue({ name: res?.name });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  save() {
    if (this.profileForm.invalid) return;
    this.saving = true;
    this.message = '';
    this.http.patch('/api/technician/profile', this.profileForm.value).subscribe({
      next: () => {
        this.message = 'Profile updated successfully';
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.message = 'Failed to update profile';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
