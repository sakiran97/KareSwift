import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-technicians',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './technicians.html',
  styleUrl: './technicians.scss'
})
export class TechniciansComponent implements OnInit {
  technicians = signal<any[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  searchTerm = signal('');
  kycFilter = signal('all');

  filteredTechnicians = computed(() => {
    let list = this.technicians();

    if (this.kycFilter() !== 'all') {
      list = list.filter((tech: any) => tech.kycStatus === this.kycFilter());
    }

    const query = this.searchTerm().trim().toLowerCase();
    if (query) {
      list = list.filter((tech: any) =>
        (tech.user?.name || '').toLowerCase().includes(query) ||
        (tech.user?.email || '').toLowerCase().includes(query) ||
        (tech.user?.phone || '').includes(query) ||
        (tech.user?.technicianId || '').toLowerCase().includes(query)
      );
    }

    return list;
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.fetchTechnicians();
  }

  fetchTechnicians() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.adminService.getTechnicians().subscribe({
      next: (res: any[]) => {
        this.technicians.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMsg.set('Failed to retrieve technicians list.');
        this.loading.set(false);
      }
    });
  }

  suspend(tech: any) {
    if (!confirm(`Are you sure you want to suspend technician ${tech.user?.name || 'Technician'}?`)) return;

    this.adminService.suspendTechnician(tech.userId).subscribe({
      next: (res: any) => {
        this.successMsg.set(`Technician ${tech.user?.name || 'Technician'} has been suspended.`);
        this.fetchTechnicians();
      },
      error: (err: any) => {
        this.errorMsg.set(err.error?.message || 'Failed to suspend technician.');
      }
    });
  }

  activate(tech: any) {
    this.adminService.activateTechnician(tech.userId).subscribe({
      next: (res: any) => {
        this.successMsg.set(`Technician ${tech.user?.name || 'Technician'} has been reactivated.`);
        this.fetchTechnicians();
      },
      error: (err: any) => {
        this.errorMsg.set(err.error?.message || 'Failed to reactivate technician.');
      }
    });
  }
}
