import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-guest-track',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './guest-track.html',
  styleUrls: ['./guest-track.scss']
})
export class GuestTrackComponent implements OnInit {
  trackForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  
  orderResult: any = null;
  timelineResult: any[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.trackForm = this.fb.group({
      orderId: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.trackForm.invalid) {
      this.trackForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.orderResult = null;
    this.timelineResult = [];

    const payload = this.trackForm.value;

    this.http.post<any>('/api/orders/track-guest', payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.orderResult = res.order;
        this.timelineResult = res.timeline;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Unable to track order. Please check the details and try again.';
      }
    });
  }

  getStepIcon(status: string): string {
    switch(status) {
      case 'BOOKED': return '📱';
      case 'CONFIRMED': return '✅';
      case 'VISIT_SCHEDULED': return '📅';
      case 'IN_PROGRESS': return '🔧';
      case 'DIAGNOSIS_COMPLETED': return '🔍';
      case 'PRICE_FINALIZED': return '💰';
      case 'COMPLETED': return '🎉';
      case 'CANCELLED': return '❌';
      default: return '➡️';
    }
  }

  resetSearch(): void {
    this.orderResult = null;
    this.timelineResult = [];
    this.trackForm.reset();
  }
}
