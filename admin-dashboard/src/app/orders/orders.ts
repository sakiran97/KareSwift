import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss']
})
export class OrdersComponent implements OnInit {
  Number = Number;
  orders = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  // Finalize Price Modal State
  showFinalizeModal = signal(false);
  finalizeOrderId = signal<number | null>(null);
  finalAmount = 0;
  paymentMethod = 'upi';
  repairNotes = '';

  // Complete Order (OTP) Modal State
  showCompleteModal = signal(false);
  completeOrderId = signal<number | null>(null);
  completeOtp = '';

  // Cancel Order Modal State
  showCancelModal = signal(false);
  cancelOrderId = signal<number | null>(null);
  cancelReason = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getAllOrders().subscribe({
      next: (res: any[]) => {
        this.orders.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load orders.');
        this.loading.set(false);
      }
    });
  }

  updateStatus(orderId: number, nextStatus: string) {
    this.adminService.updateOrderStatus(orderId, nextStatus).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to update order status.');
      }
    });
  }

  // Finalize Modal
  openFinalizeModal(orderId: number) {
    this.finalizeOrderId.set(orderId);
    this.finalAmount = 0;
    this.paymentMethod = 'upi';
    this.repairNotes = '';
    this.showFinalizeModal.set(true);
  }

  closeFinalizeModal() {
    this.showFinalizeModal.set(false);
    this.finalizeOrderId.set(null);
  }

  submitFinalizePrice() {
    const id = this.finalizeOrderId();
    if (!id || this.finalAmount <= 0) return;

    this.adminService.updateOrderStatus(id, 'PRICE_FINALIZED', {
      finalAmount: this.finalAmount,
      paymentMethod: this.paymentMethod,
      repairNotes: this.repairNotes
    }).subscribe({
      next: () => {
        this.closeFinalizeModal();
        this.loadOrders();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to finalize price.');
      }
    });
  }

  // Complete Modal
  openCompleteModal(orderId: number) {
    this.completeOrderId.set(orderId);
    this.completeOtp = '';
    this.showCompleteModal.set(true);
  }

  closeCompleteModal() {
    this.showCompleteModal.set(false);
    this.completeOrderId.set(null);
  }

  submitCompleteOrder() {
    const id = this.completeOrderId();
    const otp = this.completeOtp.trim();
    if (!id || !otp) return;

    this.adminService.updateOrderStatus(id, 'COMPLETED', {
      otp: otp
    }).subscribe({
      next: () => {
        this.closeCompleteModal();
        this.loadOrders();
      },
      error: (err) => {
        alert(err.error?.message || 'Invalid completion OTP. Verification failed.');
      }
    });
  }

  // Cancel Modal
  openCancelModal(orderId: number) {
    this.cancelOrderId.set(orderId);
    this.cancelReason = '';
    this.showCancelModal.set(true);
  }

  closeCancelModal() {
    this.showCancelModal.set(false);
    this.cancelOrderId.set(null);
  }

  submitCancelOrder() {
    const id = this.cancelOrderId();
    const reason = this.cancelReason.trim();
    if (!id || !reason) return;

    this.adminService.cancelOrder(id, reason).subscribe({
      next: () => {
        this.closeCancelModal();
        this.loadOrders();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to cancel order.');
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const s = status ? status.toUpperCase() : '';
    if (s === 'BOOKED') return 'badge-booked';
    if (s === 'CONFIRMED') return 'badge-confirmed';
    if (s === 'CUSTOMER_CONTACTED') return 'badge-contacted';
    if (s === 'DIAGNOSIS_COMPLETED') return 'badge-diagnosed';
    if (s === 'VISIT_SCHEDULED') return 'badge-visit';
    if (s === 'IN_PROGRESS') return 'badge-progress';
    if (s === 'PRICE_FINALIZED') return 'badge-finalized';
    if (s === 'COMPLETED') return 'badge-completed';
    if (s === 'CANCELLED') return 'badge-cancelled';
    return 'badge-booked';
  }

  getNextStatusText(status: string): string {
    const s = status ? status.toUpperCase() : '';
    if (s === 'BOOKED') return 'Confirm Order';
    if (s === 'CONFIRMED') return 'Mark Contacted';
    if (s === 'CUSTOMER_CONTACTED') return 'Mark Diagnosed';
    if (s === 'DIAGNOSIS_COMPLETED') return 'Schedule Doorstep Visit';
    if (s === 'VISIT_SCHEDULED') return 'Start Repair';
    return '';
  }

  getNextStatusValue(status: string): string {
    const s = status ? status.toUpperCase() : '';
    if (s === 'BOOKED') return 'CONFIRMED';
    if (s === 'CONFIRMED') return 'CUSTOMER_CONTACTED';
    if (s === 'CUSTOMER_CONTACTED') return 'DIAGNOSIS_COMPLETED';
    if (s === 'DIAGNOSIS_COMPLETED') return 'VISIT_SCHEDULED';
    if (s === 'VISIT_SCHEDULED') return 'IN_PROGRESS';
    return '';
  }
}
