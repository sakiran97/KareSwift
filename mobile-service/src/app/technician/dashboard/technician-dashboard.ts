import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { SseService, SseEvent } from '../../services/sse.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './technician-dashboard.html',
  styleUrl: './technician-dashboard.scss',
})
export class TechnicianDashboard implements OnInit, OnDestroy {
  orders: any[] = [];
  stats = { pending: 0, inProgress: 0, completed: 0 };
  loading = true;
  errorMsg = '';
  isOnline = false;
  walletBalance: number = 0;
  dailyEarnings: number = 0;
  dailyCommission: number = 0;
  private sseSub?: Subscription;
  private locationInterval: any;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sse: SseService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit() {
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 8000);

    this.loadOrders();
    this.fetchKycStatus();
    this.setupLocationSync();

    this.sseSub = this.sse.connect().subscribe({
      next: (event: SseEvent) => {
        if (event.type === 'order-available') {
          const order = event.data;
          this.toast.notify(
            `New Order #${order.id}: ${this.getDeviceLabel(order)} — ${this.getServiceLabel(order)}`,
            'info',
            [{ label: 'Accept', callback: () => this.acceptFromToast(order.id) }],
          );
          this.cdr.detectChanges();
        }
        if (event.type === 'order-accepted') {
          const d = event.data;
          this.toast.show(`${d.acceptedBy} accepted Order #${d.id}`, 'info', 6000);
          if (d.technicianId) {
            this.loadOrders();
          }
          this.cdr.detectChanges();
        }
      },
    });
  }

  private getDeviceLabel(order: any): string {
    if (order.device) return `${order.device.brand || ''} ${order.device.model || ''}`.trim() || 'Device';
    return 'Device';
  }

  private getServiceLabel(order: any): string {
    if (order.serviceCategory) return order.serviceCategory.name || '';
    return 'Service';
  }

  private acceptFromToast(orderId: number) {
    this.http.post(`/api/technician/orders/${orderId}/accept`, {}).subscribe({
      next: () => {
        this.toast.show(`You accepted Order #${orderId}!`, 'success', 6000);
        this.loadOrders();
      },
      error: (err: any) => {
        this.toast.show(err.error?.message || 'Order already taken', 'error', 5000);
      },
    });
  }

  private loadOrders() {
    this.http.get('/api/technician/orders').subscribe({
      next: (res: any) => {
        const data = res || [];
        this.orders = data;
        this.stats.pending = data.filter((o: any) => o.status === 'PENDING' || o.status === 'CONFIRMED').length;
        this.stats.inProgress = data.filter((o: any) => o.status === 'IN_PROGRESS' || o.status === 'EN_ROUTE').length;
        this.stats.completed = data.filter((o: any) => o.status === 'COMPLETED').length;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Dashboard: failed to load orders', err);
        this.errorMsg = 'Failed to load orders. Is the backend running?';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  fetchKycStatus() {
    this.http.get('/api/technician/kyc/status').subscribe({
      next: (res: any) => {
        this.isOnline = res.isOnline || false;
        this.cdr.detectChanges();
      }
    });

    this.http.get('/api/wallet/balance').subscribe({
      next: (res: any) => {
        this.walletBalance = Number(res.balance);
        this.cdr.detectChanges();
      }
    });

    this.http.get('/api/technician/earnings/today').subscribe({
      next: (res: any) => {
        this.dailyEarnings = res.totalEarnings || 0;
        this.dailyCommission = res.totalCommission || 0;
        this.cdr.detectChanges();
      }
    });
  }

  toggleOnline() {
    if (this.walletBalance < 0) {
      this.toast.show('Cannot go online. Your wallet balance is negative.', 'error', 5000);
      return;
    }

    const target = !this.isOnline;
    this.http.post('/api/technician/kyc/toggle-online', { online: target }).subscribe({
      next: (res: any) => {
        this.isOnline = res.isOnline;
        this.toast.show(this.isOnline ? 'You are now ONLINE!' : 'You are now OFFLINE', 'info', 4000);
        if (this.isOnline) {
          this.sendCurrentLocation();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        const msg = err.error?.message || 'Failed to toggle online status';
        this.toast.show(msg, 'error', 5000);
      }
    });
  }

  setupLocationSync() {
    this.locationInterval = setInterval(() => {
      if (this.isOnline) {
        this.sendCurrentLocation();
      }
    }, 30000);
  }

  sendCurrentLocation() {
    Geolocation.getCurrentPosition().then(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      this.http.post('/api/technician/kyc/location', { latitude: lat, longitude: lon }).subscribe({
        error: (err: any) => console.error('Location sync failed', err)
      });
    }).catch(err => {
      console.warn('Capacitor GPS capture failed', err);
    });
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
    }
  }
}
