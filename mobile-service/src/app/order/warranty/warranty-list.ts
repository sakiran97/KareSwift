import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WarrantyService, WarrantyInfo } from '../../services/warranty.service';

@Component({
  selector: 'app-warranty-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './warranty-list.html',
  styleUrl: './warranty-list.scss'
})
export class WarrantyList implements OnInit {
  warranties: WarrantyInfo[] = [];
  loading = true;
  error = '';
  claimLoadingOrderId: number | null = null;
  claimSuccessMessage = '';

  constructor(
    private warrantyService: WarrantyService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadWarranties();
  }

  loadWarranties() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.warrantyService.getWarranties().subscribe({
      next: (res: WarrantyInfo[]) => {
        this.warranties = res || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load warranties', err);
        this.error = 'Unable to fetch warranties. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getDaysRemaining(expiresAt: string): number {
    const expiry = new Date(expiresAt);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  getProgressPercentage(expiresAt: string, warrantyDays: number): number {
    const remaining = this.getDaysRemaining(expiresAt);
    const pct = (remaining / warrantyDays) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  getProgressColor(expiresAt: string, warrantyDays: number): string {
    const pct = this.getProgressPercentage(expiresAt, warrantyDays);
    if (pct > 50) return '#00C851'; // green
    if (pct > 20) return '#ffbb33'; // warning orange
    return '#ff4444'; // critical red
  }

  isExpired(expiresAt: string): boolean {
    return this.getDaysRemaining(expiresAt) <= 0;
  }

  claimWarranty(orderId: number) {
    if (this.claimLoadingOrderId !== null) return;
    this.claimLoadingOrderId = orderId;
    this.error = '';
    this.claimSuccessMessage = '';
    this.cdr.detectChanges();

    this.warrantyService.claimWarranty(orderId).subscribe({
      next: (res: any) => {
        this.claimLoadingOrderId = null;
        this.claimSuccessMessage = 'Warranty claim submitted successfully! Redirecting...';
        this.cdr.detectChanges();

        // Redirect to track the new order
        setTimeout(() => {
          this.router.navigate(['/order/track', res.claimOrderId]);
        }, 2000);
      },
      error: (err: any) => {
        console.error('Failed to claim warranty', err);
        this.error = err.error?.message || 'Failed to submit warranty claim. Please try again.';
        this.claimLoadingOrderId = null;
        this.cdr.detectChanges();
      }
    });
  }
}
