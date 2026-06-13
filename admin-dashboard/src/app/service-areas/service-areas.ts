import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-service-areas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './service-areas.html',
  styleUrls: ['./service-areas.scss']
})
export class ServiceAreasComponent implements OnInit {
  Number = Number;
  areas = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  areaForm: FormGroup;
  isEditing = false;
  editingAreaId: number | null = null;
  formError = '';
  formSuccess = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService
  ) {
    this.areaForm = this.fb.group({
      name: ['', Validators.required],
      city: ['Hyderabad', Validators.required],
      travelCharge: [0, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadAreas();
  }

  loadAreas() {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getServiceAreas().subscribe({
      next: (res) => {
        this.areas.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load service areas.');
        this.loading.set(false);
      }
    });
  }

  showForm(area: any = null) {
    this.isEditing = true;
    this.formError = '';
    this.formSuccess = '';
    if (area) {
      this.editingAreaId = area.id;
      this.areaForm.patchValue({
        name: area.name,
        city: area.city,
        travelCharge: Number(area.travelCharge),
        isActive: area.isActive
      });
    } else {
      this.editingAreaId = null;
      this.areaForm.reset({
        name: '',
        city: 'Hyderabad',
        travelCharge: 0,
        isActive: true
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingAreaId = null;
    this.areaForm.reset();
  }

  saveArea() {
    if (this.areaForm.invalid) return;
    const data = this.areaForm.value;

    const request = this.editingAreaId
      ? this.adminService.updateServiceArea(this.editingAreaId, data)
      : this.adminService.createServiceArea(data);

    request.subscribe({
      next: () => {
        this.formSuccess = this.editingAreaId ? 'Service Area updated successfully.' : 'Service Area added successfully.';
        this.loadAreas();
        setTimeout(() => {
          this.cancelEdit();
        }, 1000);
      },
      error: (err) => {
        this.formError = err.error?.message || 'Failed to save service area.';
      }
    });
  }

  deleteArea(id: number) {
    if (!confirm('Are you sure you want to delete this service area?')) return;

    this.adminService.deleteServiceArea(id).subscribe({
      next: () => {
        this.loadAreas();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete service area.');
      }
    });
  }

  toggleActiveStatus(area: any) {
    this.adminService.updateServiceArea(area.id, { isActive: !area.isActive }).subscribe({
      next: () => {
        this.loadAreas();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to update status.');
      }
    });
  }
}
