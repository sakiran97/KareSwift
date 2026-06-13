import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, ParamMap, RouterLink } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { SseService, SseEvent } from '../../services/sse.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './track-order.html',
  styleUrl: './track-order.scss',
})
export class TrackOrder implements OnInit, OnDestroy {
  orderId = '';
  isCancelled = false;
  currentStepIndex = 0;
  
  // Status Steps for KareSwift Operator Model
  statusSteps = [
    { key: 'BOOKED', label: 'Booked', desc: 'Repair request successfully received.' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Booking confirmed by service coordinator.' },
    { key: 'CUSTOMER_CONTACTED', label: 'Contacted', desc: 'We contacted you to verify repair details.' },
    { key: 'DIAGNOSIS_COMPLETED', label: 'Diagnosed', desc: 'Device diagnosed and repair path identified.' },
    { key: 'VISIT_SCHEDULED', label: 'Visit Scheduled', desc: 'Expert technician doorstep visit scheduled.' },
    { key: 'IN_PROGRESS', label: 'Repair In Progress', desc: 'We are repairing your device at your doorstep.' },
    { key: 'PRICE_FINALIZED', label: 'Price Finalized', desc: 'Final repair pricing has been determined.' },
    { key: 'COMPLETED', label: 'Completed', desc: 'Repair verified and completed successfully.' }
  ];

  // Pricing & OTP flow state
  finalAmount: number | null = null;
  paymentMethod: string | null = null;
  completionOtp: string | null = null;
  repairNotes: string | null = null;
  travelCharge = 0;
  
  pollInterval: any;
  private sseSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private sse: SseService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.orderId = params.get('id') || '';
      this.fetchOrderDetails();
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
    if (s === 'BOOKED') return 0;
    if (s === 'CONFIRMED') return 1;
    if (s === 'CUSTOMER_CONTACTED') return 2;
    if (s === 'DIAGNOSIS_COMPLETED') return 3;
    if (s === 'VISIT_SCHEDULED') return 4;
    if (s === 'IN_PROGRESS') return 5;
    if (s === 'PRICE_FINALIZED') return 6;
    if (s === 'COMPLETED') return 7;
    return -1;
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
        const step = this.mapStatusToStepIndex(res.status || '');
        if (step !== -1) {
          this.currentStepIndex = step;
        }
        this.updateOrderData(res);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to fetch order details', err);
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
            const stepIndex = this.mapStatusToStepIndex(status);
            if (stepIndex !== -1) {
              this.currentStepIndex = stepIndex;
            }
            this.updateOrderData(event.data);
            this.cdr.detectChanges();
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
}
