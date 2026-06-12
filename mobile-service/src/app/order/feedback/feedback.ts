import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class Feedback implements OnInit {
  orderId = '';
  rating = 0;
  hoverRating = 0;
  comment = '';
  tags = [
    { label: 'Fast Repair', selected: false },
    { label: 'Polite Technician', selected: false },
    { label: 'Great Communication', selected: false },
    { label: 'Fair Price', selected: false },
    { label: 'Clean Workspace', selected: false },
  ];
  
  isLoading = false;
  isSubmitted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.orderId = params.get('id') || '';
      this.cdr.detectChanges();
    });
  }

  setRating(val: number): void {
    this.rating = val;
    this.cdr.detectChanges();
  }

  setHoverRating(val: number): void {
    this.hoverRating = val;
    this.cdr.detectChanges();
  }

  toggleTag(index: number): void {
    this.tags[index].selected = !this.tags[index].selected;
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.rating === 0) return;

    this.isLoading = true;
    this.cdr.detectChanges();
    
    const selectedTags = this.tags.filter(t => t.selected).map(t => t.label);

    this.http.post(`/api/feedback/${this.orderId}`, {
      rating: this.rating,
      comment: this.comment,
      tags: selectedTags
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSubmitted = true;
        localStorage.removeItem('activeOrderId');
        localStorage.removeItem('selectedDeviceCategory');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to submit feedback', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/order/device-select']);
  }
}
