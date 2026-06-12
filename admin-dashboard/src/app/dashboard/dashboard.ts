import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';

interface Stats {
  totalTechnicians: number;
  pendingKycCount: number;
  activeOrders: number;
  onlineTechnicians: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  stats = signal<Stats | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.fetchStats();
  }

  fetchStats() {
    this.loading.set(true);
    this.adminService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Failed to fetch dashboard statistics.');
        this.loading.set(false);
      }
    });
  }
}
