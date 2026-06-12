import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  user: any = { name: 'Valued Customer', email: '', phone: '', role: 'customer' };
  editForm: FormGroup;
  isEditing = false;
  editError: string | null = null;
  editSuccess: string | null = null;
  isSaving = false;
  activeOrderId: string | null = null;
  pastOrders: any[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
    });
  }

  ngOnInit(): void {
    // Immediately load stored user data for instant display
    const storedUser = this.authService.getCurrentUser();
    if (storedUser) {
      this.user = { ...this.user, ...storedUser };
      this.editForm.patchValue({ name: storedUser.name || '', phone: storedUser.phone || '' });
    }
    this.loadProfile();
    this.loadOrders();
  }

  loadProfile(): void {
    this.authService.getProfile().subscribe({
      next: (u: any) => {
        this.user = u;
        this.editForm.patchValue({ name: u.name || '', phone: u.phone || '' });
        // Update stored user with fresh data from API
        localStorage.setItem('user', JSON.stringify(u));
        this.cdr.detectChanges();
      },
      error: () => {
        // Already loaded from stored user / JWT fallback in ngOnInit
      }
    });
  }

  loadOrders(): void {
    this.activeOrderId = localStorage.getItem('activeOrderId');
    this.orderService.getUserOrders().subscribe({
      next: (orders: any[]) => {
        if (orders?.length) {
          this.pastOrders = orders.slice(0, 3).map((o: any) => ({
            id: 'ORD-' + o.id,
            rawId: String(o.id),
            service: o.serviceCategory?.name || 'Device Repair',
            device: o.device ? `${o.device.brand} ${o.device.model}` : 'Registered Device',
            date: o.scheduledDate || new Date(o.createdAt).toLocaleDateString(),
            price: o.serviceCategoryId === 1 ? 149 : o.serviceCategoryId === 2 ? 89 : 69,
            status: o.status
          }));
          const active = orders.find((o: any) => o.status !== 'COMPLETED');
          if (active) {
            this.activeOrderId = String(active.id);
            localStorage.setItem('activeOrderId', this.activeOrderId);
          } else {
            this.activeOrderId = null;
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.editError = null;
    this.editSuccess = null;
    if (this.isEditing) {
      this.editForm.patchValue({ name: this.user.name || '', phone: this.user.phone || '' });
    }
  }

  saveProfile(): void {
    if (this.editForm.invalid) return;
    this.isSaving = true;
    this.editError = null;
    this.editSuccess = null;

    const data: any = {};
    if (this.editForm.value.name !== this.user.name) data.name = this.editForm.value.name;
    if (this.editForm.value.phone !== this.user.phone) data.phone = this.editForm.value.phone;

    if (!Object.keys(data).length) {
      this.isEditing = false;
      this.isSaving = false;
      return;
    }

    this.authService.updateProfile(data).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.editSuccess = 'Profile updated successfully';
        if (data.name) this.user.name = data.name;
        if (data.phone) this.user.phone = data.phone;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.isEditing = false;
          this.editSuccess = null;
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.editError = err.error?.message || 'Failed to update profile';
        this.cdr.detectChanges();
      }
    });
  }
}
