import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, ParamMap, RouterLink } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { SseService, SseEvent } from '../../services/sse.service';
import { WalletService } from '../../services/wallet.service';
import { CommonModule } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './track-order.html',
  styleUrl: './track-order.scss',
})
export class TrackOrder implements OnInit, OnDestroy {
  orderId = '';
  statusSteps = [
    { key: 'RECEIVED', label: 'Order Received', desc: 'We have received your service request.' },
    { key: 'ASSIGNED', label: 'Technician Assigned', desc: 'A certified expert has been assigned to your order.' },
    { key: 'EN_ROUTE', label: 'Technician En-route', desc: 'Our technician is traveling to your doorstep.' },
    { key: 'REPAIRING', label: 'Repair in Progress', desc: 'The technician is diagnosing and repairing your device.' },
    { key: 'COMPLETED', label: 'Repair Completed', desc: 'Your device is fixed! Please verify and complete payment.' }
  ];
  
  currentStepIndex = 0;
  isCancelled = false;
  technician = {
    name: 'Alex Mercer',
    rating: 4.95,
    completedRepairs: 420,
    vehicle: 'Electric Van - Tech-12',
    avatar: 'AM'
  };

  isPaying = false;
  paymentError = '';
  hasPaid = false;
  paymentMethod = '';
  orderAmount = 50;
  completionOtp: string | null = null;

  demoTimer: any;
  pollInterval: any;
  private sseSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private sse: SseService,
    private walletService: WalletService,
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
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  mapStatusToStepIndex(status: string): number {
    const s = status ? status.toUpperCase() : '';
    if (s === 'PENDING' || s === 'RECEIVED') return 0;
    if (s === 'CONFIRMED' || s === 'ASSIGNED') return 1;
    if (s === 'EN_ROUTE') return 2;
    if (s === 'IN_PROGRESS' || s === 'REPAIRING') return 3;
    if (s === 'COMPLETED') return 4;
    return -1;
  }

  updateOrderData(order: any): void {
    if (order.finalAmount) {
      this.orderAmount = Number(order.finalAmount);
    }
    if (order.paymentMethod) {
      this.hasPaid = true;
      this.paymentMethod = order.paymentMethod;
    }
    if (order.completionOtp) {
      this.completionOtp = order.completionOtp;
    }
    this.updateTechnicianDetails(order);
  }

  updateTechnicianDetails(order: any): void {
    if (order && order.technician) {
      const tech = order.technician;
      const name = tech.name || 'Technician';
      
      // Calculate initials (avatar)
      const parts = name.trim().split(/\s+/);
      let initials = '';
      if (parts.length > 0) {
        initials += parts[0][0];
        if (parts.length > 1) {
          initials += parts[parts.length - 1][0];
        }
      }
      initials = initials.toUpperCase() || 'Tech';

      this.technician = {
        name: name,
        rating: tech.averageRating !== undefined && tech.averageRating !== null ? tech.averageRating : 4.95,
        completedRepairs: tech.totalReviews !== undefined && tech.totalReviews !== null ? tech.totalReviews : 420,
        vehicle: 'Electric Van - Tech-' + (tech.technicianId || tech.id || '12'),
        avatar: initials
      };
    } else if (order && order.acceptedBy) {
      const name = order.acceptedBy;
      const parts = name.trim().split(/\s+/);
      let initials = '';
      if (parts.length > 0) {
        initials += parts[0][0];
        if (parts.length > 1) {
          initials += parts[parts.length - 1][0];
        }
      }
      initials = initials.toUpperCase() || 'Tech';
      this.technician = {
        name: name,
        rating: order.technician?.averageRating !== undefined && order.technician?.averageRating !== null ? order.technician.averageRating : 4.95,
        completedRepairs: order.technician?.totalReviews !== undefined && order.technician?.totalReviews !== null ? order.technician.totalReviews : 420,
        vehicle: 'Electric Van - Tech-12',
        avatar: initials
      };
    }
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
      error: () => {
        this.startDemoTracking();
      }
    });
  }

  setupRealtimeTracking(): void {
    this.sseSub = this.sse.connect().subscribe({
      next: (event: SseEvent) => {
        if (event.type === 'order-update' || event.type === 'order-accepted') {
          const orderId = String(event.data.id || event.data.orderId || '');
          const cleanId = this.orderId.replace('ORD-', '');
          if (orderId === this.orderId || orderId === cleanId) {
            const status = event.data.status || '';
            this.isCancelled = (status === 'CANCELLED');
            const stepIndex = this.mapStatusToStepIndex(status);
            if (stepIndex !== -1) {
              this.currentStepIndex = stepIndex;
              if (this.demoTimer) {
                clearInterval(this.demoTimer);
                this.demoTimer = null;
              }
            }
            this.updateOrderData(event.data);
            this.cdr.detectChanges();
          }
        } else if (event.type === 'completion-requested') {
          const orderId = String(event.data.id || event.data.orderId || '');
          const cleanId = this.orderId.replace('ORD-', '');
          if (orderId === this.orderId || orderId === cleanId) {
            this.completionOtp = event.data.otp;
            if (event.data.finalAmount) {
              this.orderAmount = Number(event.data.finalAmount);
            }
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
          if (step !== -1 && step !== this.currentStepIndex) {
            this.currentStepIndex = step;
            if (this.demoTimer) {
              clearInterval(this.demoTimer);
              this.demoTimer = null;
            }
          }
          this.updateOrderData(res);
          this.cdr.detectChanges();
        },
        error: () => {}
      });
    }, 4000);
  }

  startDemoTracking(): void {
    this.currentStepIndex = 0;
    this.cdr.detectChanges();
    
    this.demoTimer = setInterval(() => {
      if (this.currentStepIndex < this.statusSteps.length - 1) {
        this.currentStepIndex++;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.demoTimer);
      }
    }, 12000);
  }

  navigateToFeedback(): void {
    this.router.navigate([`/order/feedback/${this.orderId}`]);
  }

  async payOrder(method: 'wallet' | 'cash'): Promise<void> {
    this.isPaying = true;
    this.paymentError = '';
    this.cdr.detectChanges();

    try {
      // Small simulated delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      const res = await firstValueFrom(this.walletService.payOrder(Number(this.orderId), method)) as any;
      if (res && res.success) {
        this.hasPaid = true;
        this.paymentMethod = method;
      }
    } catch (err: any) {
      if (err.error && err.error.message) {
        this.paymentError = err.error.message;
      } else {
        this.paymentError = 'Payment failed. Please try again.';
      }
    } finally {
      this.isPaying = false;
      this.cdr.detectChanges();
    }
  }
}
