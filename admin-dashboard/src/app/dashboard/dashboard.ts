import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';

interface Stats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
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
      next: (res: any) => {
        this.stats.set({
          totalOrders: Number(res.totalOrders || 0),
          activeOrders: Number(res.activeOrders || 0),
          completedOrders: Number(res.completedOrders || 0),
          cancelledOrders: Number(res.cancelledOrders || 0),
          totalRevenue: Number(res.totalRevenue || 0)
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Failed to fetch dashboard statistics.');
        this.loading.set(false);
      }
    });
  }
}
