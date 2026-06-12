import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SseService, SseEvent } from '../../services/sse.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-technician-new-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './technician-new-orders.html',
  styleUrl: './technician-new-orders.scss',
})
export class TechnicianNewOrders implements OnInit, OnDestroy {
  availableOrders: any[] = [];
  loading = true;
  acceptingId: number | null = null;
  hasActiveOrder = false;
  private sseSub?: Subscription;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sse: SseService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    setTimeout(() => {
      if (this.loading) { this.loading = false; this.cdr.detectChanges(); }
    }, 8000);

    this.checkActiveOrder();
    this.loadAvailableOrders();

    this.sseSub = this.sse.connect().subscribe({
      next: (event: SseEvent) => {
        if (event.type === 'order-available') {
          this.loadAvailableOrders();
          this.cdr.detectChanges();
        }
        if (event.type === 'order-accepted') {
          this.loadAvailableOrders();
          this.checkActiveOrder();
          this.cdr.detectChanges();
        }
      },
    });
  }

  private checkActiveOrder() {
    this.http.get('/api/technician/orders').subscribe({
      next: (res: any) => {
        const orders = res || [];
        this.hasActiveOrder = orders.some(
          (o: any) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'EN_ROUTE' || o.status === 'IN_PROGRESS'
        );
        this.cdr.detectChanges();
      },
    });
  }

  private loadAvailableOrders() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.fetchOrders(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          this.fetchOrders();
        }
      );
    } else {
      this.fetchOrders();
    }
  }

  private fetchOrders(latitude?: number, longitude?: number) {
    let url = '/api/technician/orders/available';
    if (latitude != null && longitude != null) {
      url += `?latitude=${latitude}&longitude=${longitude}`;
    }
    this.http.get(url).subscribe({
      next: (res: any) => {
        this.availableOrders = res || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  acceptOrder(orderId: number) {
    this.acceptingId = orderId;
    this.http.post(`/api/technician/orders/${orderId}/accept`, {}).subscribe({
      next: (res: any) => {
        this.toast.show(`You accepted Order #${orderId}!`, 'success', 6000);
        this.acceptingId = null;
        this.loadAvailableOrders();
        this.checkActiveOrder();
      },
      error: (err: any) => {
        this.acceptingId = null;
        const msg = err.error?.message || 'Failed to accept order. It may have been taken by another technician.';
        this.toast.show(msg, 'error', 5000);
        this.loadAvailableOrders();
        this.cdr.detectChanges();
      },
    });
  }

  getDeviceLabel(order: any): string {
    if (order.device) return `${order.device.brand || ''} ${order.device.model || ''}`.trim();
    return 'Device';
  }

  getServiceLabel(order: any): string {
    if (order.serviceCategory) return order.serviceCategory.name || '';
    return 'Service';
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
  }
}
