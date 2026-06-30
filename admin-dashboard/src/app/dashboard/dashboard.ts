import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { SseService } from '../services/sse.service';
import { Subscription } from 'rxjs';

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
export class DashboardComponent implements OnInit, OnDestroy {
  stats = signal<Stats | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  private sseSub?: Subscription;
  private pollInterval: any = null;

  constructor(
    private adminService: AdminService,
    private sseService: SseService
  ) {}

  ngOnInit() {
    this.fetchStats();
    this.sseSub = this.sseService.connect().subscribe(event => {
      if (event.type === 'new-order' || event.type === 'order-update') {
        this.fetchStats();
      }
    });
    this.pollInterval = setInterval(() => {
      this.fetchStats();
    }, 15000);
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
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
