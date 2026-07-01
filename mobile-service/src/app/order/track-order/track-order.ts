import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { SseService, SseEvent } from '../../services/sse.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from '../../services/app-config.service';

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './track-order.html',
  styleUrl: './track-order.scss',
})
export class TrackOrder implements OnInit, OnDestroy {
  orderId = '';
  isCancelled = false;
  currentStepIndex = 0;
  isLoading = true;
  
  // Status Steps for KareSwift
  statusSteps: { key: string, label: string, desc: string }[] = [];

  doorstepSteps = [
    { key: 'BOOKED', label: 'Booked', desc: 'Repair request successfully received.' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Booking confirmed by service coordinator.' },
    { key: 'CUSTOMER_CONTACTED', label: 'Contacted', desc: 'We contacted you to verify repair details.' },
    { key: 'DIAGNOSIS_COMPLETED', label: 'Diagnosed', desc: 'Device diagnosed and repair path identified.' },
    { key: 'VISIT_SCHEDULED', label: 'Visit Scheduled', desc: 'Expert technician doorstep visit scheduled.' },
    { key: 'IN_PROGRESS', label: 'Repair In Progress', desc: 'We are repairing your device at your doorstep.' },
    { key: 'PRICE_FINALIZED', label: 'Price Finalized', desc: 'Final repair pricing has been determined.' },
    { key: 'COMPLETED', label: 'Completed', desc: 'Repair verified and completed successfully.' }
  ];

  pickupDropSteps = [
    { key: 'BOOKED', label: 'Booked', desc: 'Repair request successfully received.' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Booking confirmed by service coordinator.' },
    { key: 'OUT_FOR_PICKUP', label: 'Out for Pickup', desc: 'Executive is on the way to pick up your device.' },
    { key: 'PICKED_UP', label: 'Picked Up', desc: 'Device has been securely picked up.' },
    { key: 'DIAGNOSIS_COMPLETED', label: 'Diagnosed', desc: 'Device diagnosed at our lab.' },
    { key: 'PRICE_FINALIZED', label: 'Price Finalized', desc: 'Final repair pricing has been determined.' },
    { key: 'AT_LAB', label: 'Repairing at Lab', desc: 'Device is being repaired by our experts.' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Repaired device is out for delivery.' },
    { key: 'COMPLETED', label: 'Delivered & Completed', desc: 'Device delivered and repair completed successfully.' }
  ];

  // Pricing & OTP flow state
  finalAmount: number | null = null;
  paymentMethod: string | null = null;
  completionOtp: string | null = null;
  repairNotes: string | null = null;
  travelCharge = 0;
  
  // Chat state
  chatMessages: any[] = [];
  newMessage = '';
  chatOpen = false;
  
  pollInterval: any;
  private sseSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private sse: SseService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    public config: AppConfigService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.orderId = params.get('id') || '';
      this.fetchOrderDetails();
      this.fetchChatHistory();
      this.setupRealtimeTracking();
      this.startPolling();
    });
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  mapStatusToStepIndex(status: string): number {
    const s = status ? status.toUpperCase() : '';
    return this.statusSteps.findIndex(step => step.key === s);
  }

  updateOrderData(order: any): void {
    if (order.finalAmount) {
      this.finalAmount = Number(order.finalAmount);
    }
    if (order.paymentMethod) {
      this.paymentMethod = order.paymentMethod;
    }
    if (order.completionOtp) {
      this.completionOtp = order.completionOtp;
    }
    if (order.repairNotes) {
      this.repairNotes = order.repairNotes;
    }
    if (order.travelCharge) {
      this.travelCharge = Number(order.travelCharge);
    }
    this.cdr.detectChanges();
  }

  fetchOrderDetails(): void {
    this.orderService.getOrderStatus(this.orderId).subscribe({
      next: (res: any) => {
        this.isCancelled = (res.status === 'CANCELLED');
        
        // Setup steps based on serviceType
        if (res.order?.serviceType === 'PICKUP_DROP' || res.serviceType === 'PICKUP_DROP') {
          this.statusSteps = this.pickupDropSteps;
        } else {
          this.statusSteps = this.doorstepSteps;
        }

        const step = this.mapStatusToStepIndex(res.status || '');
        if (step !== -1) {
          this.currentStepIndex = step;
        }
        this.updateOrderData(res);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to fetch order details', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setupRealtimeTracking(): void {
    this.sseSub = this.sse.connect().subscribe({
      next: (event: SseEvent) => {
        if (event.type === 'order-update') {
          const orderId = String(event.data.id || event.data.orderId || '');
          const cleanId = this.orderId.replace('ORD-', '');
          if (orderId === this.orderId || orderId === cleanId) {
            const status = event.data.status || '';
            this.isCancelled = (status === 'CANCELLED');
            
            if (event.data.serviceType === 'PICKUP_DROP') {
              this.statusSteps = this.pickupDropSteps;
            } else if (event.data.serviceType === 'DOORSTEP') {
              this.statusSteps = this.doorstepSteps;
            }

            const stepIndex = this.mapStatusToStepIndex(status);
            if (stepIndex !== -1) {
              this.currentStepIndex = stepIndex;
            }
            this.updateOrderData(event.data);
            this.cdr.detectChanges();
          }
        } else if (event.type === 'chat-message') {
          const orderId = String(event.data.orderId || '');
          const cleanId = this.orderId.replace('ORD-', '');
          if (orderId === this.orderId || orderId === cleanId) {
            // Check if message already exists
            const exists = this.chatMessages.find(m => m.id === event.data.id);
            if (!exists) {
              this.chatMessages.push(event.data);
              this.cdr.detectChanges();
              this.scrollToBottom();
            }
          }
        }
      },
    });
  }

  startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.orderService.getOrderStatus(this.orderId).subscribe({
        next: (res: any) => {
          const status = res.status || '';
          this.isCancelled = (status === 'CANCELLED');

          if (res.order?.serviceType === 'PICKUP_DROP' || res.serviceType === 'PICKUP_DROP') {
            this.statusSteps = this.pickupDropSteps;
          } else {
            this.statusSteps = this.doorstepSteps;
          }

          const step = this.mapStatusToStepIndex(status);
          if (step !== -1) {
            this.currentStepIndex = step;
          }
          this.updateOrderData(res);
          this.cdr.detectChanges();
        },
        error: () => {}
      });
    }, 4000);
  }

  navigateToFeedback(): void {
    this.router.navigate([`/order/feedback/${this.orderId}`]);
  }

  // Chat methods
  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  fetchChatHistory(): void {
    const cleanId = this.orderId.replace('ORD-', '');
    this.http.get<any[]>(`/api/chat/order/${cleanId}`).subscribe({
      next: (msgs: any) => {
        this.chatMessages = msgs || [];
        this.cdr.detectChanges();
        if (this.chatOpen) this.scrollToBottom();
      },
      error: (err: any) => console.error('Failed to load chat', err)
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    
    const cleanId = this.orderId.replace('ORD-', '');
    const msg = this.newMessage;
    this.newMessage = ''; // clear instantly
    
    this.http.post<any>(`/api/chat/order/${cleanId}`, { message: msg, sender: 'customer' }).subscribe({
      next: (res: any) => {
        // SSE will push it, but we can optimistically add it if SSE takes time
        const exists = this.chatMessages.find(m => m.id === res.id);
        if (!exists) {
          this.chatMessages.push(res);
          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      },
      error: (err: any) => {
        console.error('Failed to send message', err);
        // revert logic or show error
      }
    });
  }

  scrollToBottom(): void {
    const el = document.getElementById('chat-messages-container');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
