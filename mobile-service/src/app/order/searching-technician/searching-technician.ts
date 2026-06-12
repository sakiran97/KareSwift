import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SseService } from '../../services/sse.service';
import { ToastService } from '../../services/toast.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-searching-technician',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searching-technician.html',
  styleUrl: './searching-technician.scss',
})
export class SearchingTechnician implements OnInit, OnDestroy {
  orderId!: string;
  loading = true;
  dots = '.';
  timeoutSeconds = 120;
  secondsRemaining = 120;
  
  private sseSub?: Subscription;
  private timerSub?: Subscription;
  private dotsSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sse: SseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.orderId) {
      this.toast.show('Invalid order ID', 'error', 4000);
      this.router.navigate(['/order/device-select']);
      return;
    }

    this.checkOrderStatus();
    this.setupSse();
    this.startCountdown();
    this.animateDots();
  }

  checkOrderStatus(): void {
    this.http.get(`/api/orders/${this.orderId}`).subscribe({
      next: (order: any) => {
        if (order.technicianId) {
          this.toast.show(`Technician ${order.technician?.name || ''} has already accepted!`, 'success', 5000);
          this.router.navigate([`/order/track/${this.orderId}`]);
        }
      },
      error: () => {}
    });
  }

  setupSse(): void {
    this.sseSub = this.sse.connect().subscribe({
      next: (event: any) => {
        if (event.type === 'order-accepted' && String(event.data?.id) === String(this.orderId)) {
          this.toast.show(`Technician assigned: ${event.data?.acceptedBy || 'Specialist'}!`, 'success', 5000);
          this.router.navigate([`/order/track/${this.orderId}`]);
        }
      }
    });
  }

  startCountdown(): void {
    this.timerSub = timer(1000, 1000).subscribe(() => {
      this.secondsRemaining--;
      if (this.secondsRemaining <= 0) {
        this.timeoutSearch();
      }
      this.cdr.detectChanges();
    });
  }

  animateDots(): void {
    this.dotsSub = timer(500, 500).subscribe(() => {
      this.dots = this.dots.length >= 3 ? '.' : this.dots + '.';
      this.cdr.detectChanges();
    });
  }

  timeoutSearch(): void {
    this.toast.show('No technicians accepted in your area. Please try scheduling again.', 'warning', 6000);
    this.cancelSearch(false);
  }

  cancelSearch(userTriggered = true): void {
    this.cleanup();
    this.http.patch(`/api/orders/${this.orderId}/status`, { status: 'CANCELLED' }).subscribe({
      next: () => {
        if (userTriggered) {
          this.toast.show('Search cancelled successfully.', 'info', 4000);
        }
        this.router.navigate(['/order/device-select']);
      },
      error: () => {
        this.router.navigate(['/order/device-select']);
      }
    });
  }

  cleanup(): void {
    this.sseSub?.unsubscribe();
    this.timerSub?.unsubscribe();
    this.dotsSub?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
