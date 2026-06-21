import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';
import { SseService, SseEvent } from '../services/sse.service';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss']
})
export class OrdersComponent implements OnInit {
  Math = Math;
  Number = Number;
  orders = signal<any[]>([]);
  loading = signal(true);
  updatingOrderId = signal<number | null>(null);
  error = signal('');
  
  // Pagination & Filters
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  searchQuery = signal('');
  statusFilter = signal('');

  get pages(): number[] {
    return Array(this.totalPages()).fill(0).map((x, i) => i + 1);
  }

  expandedOrderId = signal<number | null>(null);

  toggleExpand(orderId: number) {
    this.expandedOrderId.set(this.expandedOrderId() === orderId ? null : orderId);
  }
  
  // Payment Options Config
  upiEnabled = true;
  cashEnabled = true;
  qrEnabled = true;

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

  // Chat Modal State
  showChatModal = signal(false);
  chatOrderId = signal<number | null>(null);
  chatMessages = signal<any[]>([]);
  chatInput = '';

  // QR Modal State
  showQrModal = signal(false);
  qrAmount = signal<number>(0);

  // Image Modal State
  showImageModal = signal(false);
  selectedImageUrl = signal<string>('');
  
  private sseSub?: Subscription;

  constructor(private adminService: AdminService, private sse: SseService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.loadConfigs();
    this.loadOrders();
    
    // Listen for new chat messages
    this.sseSub = this.sse.connect().subscribe({
      next: (event: SseEvent) => {
        if (event.type === 'chat-message') {
          const cid = this.chatOrderId();
          if (cid && event.data.orderId === cid) {
            const msgs = this.chatMessages();
            const exists = msgs.find(m => m.id === event.data.id);
            if (!exists) {
              this.chatMessages.set([...msgs, event.data]);
              setTimeout(() => this.scrollToBottom(), 100);
            }
          }
        }
      }
    });
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
  }

  loadConfigs() {
    this.adminService.getConfig().subscribe({
      next: (configs: any[]) => {
        const upi = configs.find(c => c.key === 'upi_enabled');
        const cash = configs.find(c => c.key === 'cash_enabled');
        const qr = configs.find(c => c.key === 'qr_enabled');
        
        if (upi) this.upiEnabled = upi.value === 'true';
        if (cash) this.cashEnabled = cash.value === 'true';
        if (qr) this.qrEnabled = qr.value === 'true';
      },
      error: () => {}
    });
  }

  loadOrders() {
    this.loading.set(true);
    this.error.set('');
    
    // Pass query params to service
    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      status: this.statusFilter()
    };
    
    this.adminService.getAllOrders(params).subscribe({
      next: (res: any) => {
        // API now returns { data, meta }
        if (res && Array.isArray(res.data)) {
          this.orders.set(res.data);
          this.totalPages.set(res.meta?.totalPages || 1);
        } else if (Array.isArray(res)) {
          this.orders.set(res);
          this.totalPages.set(1);
        } else {
          // Fallback if backend isn't updated yet or returns invalid format
          this.orders.set([]);
          this.totalPages.set(1);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load orders.');
        this.loading.set(false);
      }
    });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadOrders();
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadOrders();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadOrders();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadOrders();
    }
  }

  updateStatus(orderId: number, nextStatus: string) {
    this.updatingOrderId.set(orderId);
    this.adminService.updateOrderStatus(orderId, nextStatus).subscribe({
      next: () => {
        this.updatingOrderId.set(null);
        this.loadOrders();
      },
      error: (err) => {
        this.updatingOrderId.set(null);
        alert(err.error?.message || 'Failed to update order status.');
      }
    });
  }

  // Finalize Modal
  openFinalizeModal(orderId: number) {
    this.finalizeOrderId.set(orderId);
    this.finalAmount = 0;
    
    // Default to first enabled method
    if (this.upiEnabled) this.paymentMethod = 'upi';
    else if (this.cashEnabled) this.paymentMethod = 'cash';
    else if (this.qrEnabled) this.paymentMethod = 'qr';
    else this.paymentMethod = 'other';
    
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

    this.updatingOrderId.set(id);
    this.adminService.updateOrderStatus(id, 'PRICE_FINALIZED', {
      finalAmount: this.finalAmount,
      paymentMethod: this.paymentMethod,
      repairNotes: this.repairNotes
    }).subscribe({
      next: () => {
        this.updatingOrderId.set(null);
        this.closeFinalizeModal();
        this.loadOrders();
      },
      error: (err) => {
        this.updatingOrderId.set(null);
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

    this.updatingOrderId.set(id);
    this.adminService.updateOrderStatus(id, 'COMPLETED', {
      otp: otp
    }).subscribe({
      next: () => {
        this.updatingOrderId.set(null);
        this.closeCompleteModal();
        this.loadOrders();
      },
      error: (err) => {
        this.updatingOrderId.set(null);
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

    this.updatingOrderId.set(id);
    this.adminService.cancelOrder(id, reason).subscribe({
      next: () => {
        this.updatingOrderId.set(null);
        this.closeCancelModal();
        this.loadOrders();
      },
      error: (err) => {
        this.updatingOrderId.set(null);
        alert(err.error?.message || 'Failed to cancel order.');
      }
    });
  }

  // Chat Modal
  openChatModal(orderId: number) {
    this.chatOrderId.set(orderId);
    this.showChatModal.set(true);
    this.chatMessages.set([]);
    
    this.adminService.getChatMessages(orderId).subscribe({
      next: (msgs) => {
        this.chatMessages.set(msgs || []);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => alert('Failed to load chat history')
    });
  }

  closeChatModal() {
    this.showChatModal.set(false);
    this.chatOrderId.set(null);
  }

  // QR Modal
  openQrModal(amount: number) {
    this.qrAmount.set(amount);
    this.showQrModal.set(true);
  }

  closeQrModal() {
    this.showQrModal.set(false);
    this.qrAmount.set(0);
  }

  // Image Modal
  openImageModal(url: string, event: Event) {
    event.preventDefault(); // prevent navigation
    this.selectedImageUrl.set(url);
    this.showImageModal.set(true);
  }

  closeImageModal() {
    this.showImageModal.set(false);
    this.selectedImageUrl.set('');
  }

  sendChatMessage() {
    const id = this.chatOrderId();
    if (!id || !this.chatInput.trim()) return;

    const msg = this.chatInput;
    this.chatInput = ''; // clear instantly
    
    this.adminService.sendChatMessage(id, msg).subscribe({
      next: (res) => {
        const msgs = this.chatMessages();
        const exists = msgs.find(m => m.id === res.id);
        if (!exists) {
          this.chatMessages.set([...msgs, res]);
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: () => alert('Failed to send message')
    });
  }

  scrollToBottom() {
    const el = document.getElementById('admin-chat-messages');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
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

  getMapUrl(lat: number, lng: number): SafeResourceUrl {
    const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
