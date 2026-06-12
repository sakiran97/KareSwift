import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class OrdersComponent implements OnInit {
  orders = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  showCancelModal = signal(false);
  cancelOrderId = signal<number | null>(null);
  cancelReason = signal('');

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getAllOrders().subscribe({
      next: (res: any[]) => {
        this.orders.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load orders.');
        this.loading.set(false);
      },
    });
  }

  openCancelModal(orderId: number) {
    this.cancelOrderId.set(orderId);
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  closeCancelModal() {
    this.showCancelModal.set(false);
    this.cancelOrderId.set(null);
    this.cancelReason.set('');
  }

  confirmCancel() {
    const id = this.cancelOrderId();
    const reason = this.cancelReason().trim();
    if (!id || !reason) return;

    this.adminService.cancelOrder(id, reason).subscribe({
      next: () => {
        this.closeCancelModal();
        this.loadOrders();
      },
      error: () => {
        alert('Failed to cancel order. Please try again.');
      },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-pending';
      case 'CONFIRMED': return 'badge-confirmed';
      case 'EN_ROUTE': return 'badge-enroute';
      case 'IN_PROGRESS': return 'badge-progress';
      case 'COMPLETED': return 'badge-completed';
      case 'CANCELLED': return 'badge-cancelled';
      default: return 'badge-pending';
    }
  }
}
