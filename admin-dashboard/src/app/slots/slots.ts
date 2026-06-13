import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-slots',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './slots.html',
  styleUrls: ['./slots.scss']
})
export class SlotsComponent implements OnInit {
  slots = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  slotForm: FormGroup;
  isEditing = false;
  editingSlotId: number | null = null;
  formError = '';
  formSuccess = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService
  ) {
    this.slotForm = this.fb.group({
      name: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      maxBookings: [5, [Validators.required, Validators.min(1)]],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadSlots();
  }

  loadSlots() {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getSlots().subscribe({
      next: (res) => {
        this.slots.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load slots.');
        this.loading.set(false);
      }
    });
  }

  showForm(slot: any = null) {
    this.isEditing = true;
    this.formError = '';
    this.formSuccess = '';
    if (slot) {
      this.editingSlotId = slot.id;
      this.slotForm.patchValue({
        name: slot.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxBookings: slot.maxBookings,
        isActive: slot.isActive
      });
    } else {
      this.editingSlotId = null;
      this.slotForm.reset({
        name: '',
        startTime: '',
        endTime: '',
        maxBookings: 5,
        isActive: true
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingSlotId = null;
    this.slotForm.reset();
  }

  saveSlot() {
    if (this.slotForm.invalid) return;
    const data = this.slotForm.value;

    const request = this.editingSlotId
      ? this.adminService.updateSlot(this.editingSlotId, data)
      : this.adminService.createSlot(data);

    request.subscribe({
      next: () => {
        this.formSuccess = this.editingSlotId ? 'Slot updated successfully.' : 'Slot added successfully.';
        this.loadSlots();
        setTimeout(() => {
          this.cancelEdit();
        }, 1000);
      },
      error: (err) => {
        this.formError = err.error?.message || 'Failed to save slot.';
      }
    });
  }

  deleteSlot(id: number) {
    if (!confirm('Are you sure you want to delete this booking slot?')) return;

    this.adminService.deleteSlot(id).subscribe({
      next: () => {
        this.loadSlots();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete slot.');
      }
    });
  }

  toggleActiveStatus(slot: any) {
    this.adminService.updateSlot(slot.id, { isActive: !slot.isActive }).subscribe({
      next: () => {
        this.loadSlots();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to update status.');
      }
    });
  }
}
