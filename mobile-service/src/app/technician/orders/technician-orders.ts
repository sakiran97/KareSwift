import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { SseService, SseEvent } from '../../services/sse.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-technician-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './technician-orders.html',
  styleUrl: './technician-orders.scss',
})
export class TechnicianOrders implements OnInit, OnDestroy {
  orders: any[] = [];
  loading = true;
  private sseSub?: Subscription;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sse: SseService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit() {
    setTimeout(() => {
      if (this.loading) { this.loading = false; this.cdr.detectChanges(); }
    }, 8000);

    this.loadOrders();

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
        this.orders = res || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load technician orders:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
  }
}
