import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './services-list.html',
  styleUrls: ['./services-list.scss']
})
export class ServicesListComponent implements OnInit {
  services = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  serviceForm: FormGroup;
  isEditing = false;
  editingServiceId: number | null = null;
  formError = '';
  formSuccess = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService
  ) {
    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getServiceCategories().subscribe({
      next: (res) => {
        this.services.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load service catalog.');
        this.loading.set(false);
      }
    });
  }

  showForm(serviceItem: any = null) {
    this.isEditing = true;
    this.formError = '';
    this.formSuccess = '';
    if (serviceItem) {
      this.editingServiceId = serviceItem.id;
      this.serviceForm.patchValue({
        name: serviceItem.name,
        description: serviceItem.description,
        isActive: serviceItem.isActive
      });
    } else {
      this.editingServiceId = null;
      this.serviceForm.reset({
        name: '',
        description: '',
        isActive: true
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingServiceId = null;
    this.serviceForm.reset();
  }

  saveService() {
    if (this.serviceForm.invalid) return;
    const data = this.serviceForm.value;

    const request = this.editingServiceId
      ? this.adminService.updateServiceCategory(this.editingServiceId, data)
      : this.adminService.createServiceCategory(data);

    request.subscribe({
      next: () => {
        this.formSuccess = this.editingServiceId ? 'Service updated successfully.' : 'Service added successfully.';
        this.loadServices();
        setTimeout(() => {
          this.cancelEdit();
        }, 1000);
      },
      error: (err) => {
        this.formError = err.error?.message || 'Failed to save service.';
      }
    });
  }

  deleteService(id: number) {
    if (!confirm('Are you sure you want to delete this service category? This will affect related bookings.')) return;

    this.adminService.deleteServiceCategory(id).subscribe({
      next: () => {
        this.loadServices();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete service.');
      }
    });
  }

  toggleActiveStatus(serviceItem: any) {
    this.adminService.updateServiceCategory(serviceItem.id, { isActive: !serviceItem.isActive }).subscribe({
      next: () => {
        this.loadServices();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to update status.');
      }
    });
  }
}
