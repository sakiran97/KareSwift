import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {
  order: any = null;
  loading = true;
  updating = false;
  error = '';

  finalAmount: number | null = null;
  otpInput: string = '';
  isOtpRequested: boolean = false;
  statusOptions = ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    setTimeout(() => {
      if (this.loading) { this.loading = false; this.cdr.detectChanges(); }
    }, 8000);

    if (id) {
      this.http.get(`/api/technician/orders`).subscribe({
        next: (res: any) => {
          const data = res || [];
          this.order = data.find((o: any) => String(o.id) === id);
          this.loading = false;
          if (!this.order) {
            this.error = 'Order not found';
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to load order:', err);
          this.loading = false;
          this.error = 'Failed to load order';
          this.cdr.detectChanges();
        }
      });
    }
  }

  requestCompletion() {
    if (!this.order || !this.finalAmount || this.finalAmount < 50) {
      this.error = 'Please enter a valid Final Amount (min ₹50).';
      return;
    }
    this.updating = true;
    this.error = '';
    
    this.http.post(`/api/technician/orders/${this.order.id}/request-completion`, { finalAmount: Number(this.finalAmount) }).subscribe({
      next: () => {
        this.isOtpRequested = true;
        this.updating = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to request OTP';
        this.updating = false;
        this.cdr.detectChanges();
      }
    });
  }

  isStatusDisabled(targetStatus: string): boolean {
    if (!this.order) return true;
    if (this.updating) return true;
    if (this.order.status === targetStatus) return true;

    // CANCELLED can be triggered anytime unless COMPLETED
    if (targetStatus === 'CANCELLED') {
      return this.order.status === 'COMPLETED' || this.order.status === 'CANCELLED';
    }

    // Linear progression rules
    const currentIndex = this.statusOptions.indexOf(this.order.status);
    const targetIndex = this.statusOptions.indexOf(targetStatus);

    // Disable if the target status is BEFORE or EQUAL TO the current status
    return targetIndex <= currentIndex;
  }

  updateStatus(status: string) {
    if (!this.order) return;
    
    if (status === 'COMPLETED' && (!this.finalAmount || !this.otpInput)) {
      this.error = 'Please enter the Completion OTP provided by the customer.';
      return;
    }

    this.updating = true;
    this.error = '';

    const payload: any = { status };
    if (status === 'COMPLETED') {
      payload.finalAmount = Number(this.finalAmount);
      payload.otp = String(this.otpInput);
    }

    this.http.patch(`/api/technician/orders/${this.order.id}/status`, payload).subscribe({
      next: (res: any) => {
        this.order.status = res.status;
        this.updating = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.updating = false;
        this.error = 'Failed to update status';
        this.cdr.detectChanges();
      }
    });
  }
}
