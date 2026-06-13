import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

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

  // Saved Address management variables
  addresses: any[] = [];
  addressForm: FormGroup;
  isEditingAddress = false;
  editingAddressId: number | null = null;
  addressError: string | null = null;
  addressSuccess: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private orderService: OrderService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
    });

    this.addressForm = this.fb.group({
      fullName: ['', [Validators.required]],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      houseNumber: ['', [Validators.required]],
      street: ['', [Validators.required]],
      area: ['', [Validators.required]],
      landmark: [''],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      pincode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      isDefault: [false]
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
    if (this.user.role === 'customer') {
      this.loadAddresses();
    }
  }

  loadProfile(): void {
    this.authService.getProfile().subscribe({
      next: (u: any) => {
        this.user = u;
        this.editForm.patchValue({ name: u.name || '', phone: u.phone || '' });
        // Update stored user with fresh data from API
        localStorage.setItem('user', JSON.stringify(u));
        if (this.user.role === 'customer') {
          this.loadAddresses();
        }
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
            price: o.finalAmount ? Number(o.finalAmount) : (o.travelCharge ? Number(o.travelCharge) : 0),
            status: o.status
          }));
          const active = orders.find((o: any) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
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

  // Address CRUD Operations
  loadAddresses() {
    this.http.get<any[]>('/api/addresses').subscribe({
      next: (res: any) => {
        this.addresses = res || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load addresses', err);
      }
    });
  }

  showAddressForm(addr: any = null) {
    this.isEditingAddress = true;
    this.addressError = null;
    this.addressSuccess = null;
    if (addr) {
      this.editingAddressId = addr.id;
      this.addressForm.patchValue(addr);
    } else {
      this.editingAddressId = null;
      this.addressForm.reset({ isDefault: false });
    }
    this.cdr.detectChanges();
  }

  cancelAddressEdit() {
    this.isEditingAddress = false;
    this.editingAddressId = null;
    this.addressForm.reset();
    this.cdr.detectChanges();
  }

  saveAddress() {
    if (this.addressForm.invalid) return;
    const data = this.addressForm.value;

    const request = this.editingAddressId
      ? this.http.put(`/api/addresses/${this.editingAddressId}`, data)
      : this.http.post('/api/addresses', data);

    request.subscribe({
      next: () => {
        this.addressSuccess = this.editingAddressId ? 'Address updated successfully' : 'Address added successfully';
        this.loadAddresses();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.cancelAddressEdit();
        }, 1000);
      },
      error: (err: any) => {
        this.addressError = err.error?.message || 'Failed to save address';
        this.cdr.detectChanges();
      }
    });
  }

  deleteAddress(id: number) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    this.http.delete(`/api/addresses/${id}`).subscribe({
      next: () => {
        this.loadAddresses();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to delete address');
      }
    });
  }

  setDefaultAddress(id: number) {
    this.http.patch(`/api/addresses/${id}/default`, {}).subscribe({
      next: () => {
        this.loadAddresses();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to set default address');
      }
    });
  }
}
