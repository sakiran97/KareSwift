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
  
  overallRating = 0;
  hoverOverall = 0;

  serviceQuality = 0;
  hoverQuality = 0;

  timeliness = 0;
  hoverTimeliness = 0;

  professionalism = 0;
  hoverProfessionalism = 0;

  comments = '';
  uploadedPhotos: string[] = [];
  
  isLoading = false;
  isSubmitted = false;
  errorMessage: string | null = null;

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

  setRating(category: 'overall' | 'quality' | 'timeliness' | 'professionalism', val: number): void {
    if (category === 'overall') this.overallRating = val;
    if (category === 'quality') this.serviceQuality = val;
    if (category === 'timeliness') this.timeliness = val;
    if (category === 'professionalism') this.professionalism = val;
    this.cdr.detectChanges();
  }

  setHoverRating(category: 'overall' | 'quality' | 'timeliness' | 'professionalism', val: number): void {
    if (category === 'overall') this.hoverOverall = val;
    if (category === 'quality') this.hoverQuality = val;
    if (category === 'timeliness') this.hoverTimeliness = val;
    if (category === 'professionalism') this.hoverProfessionalism = val;
    this.cdr.detectChanges();
  }

  triggerPhotoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.uploadedPhotos.push(e.target.result);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removePhoto(index: number): void {
    this.uploadedPhotos.splice(index, 1);
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.overallRating === 0 || this.serviceQuality === 0 || this.timeliness === 0 || this.professionalism === 0) {
      this.errorMessage = 'Please provide ratings for all service criteria.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    const payload = {
      orderId: Number(this.orderId),
      overallRating: this.overallRating,
      serviceQuality: this.serviceQuality,
      timeliness: this.timeliness,
      professionalism: this.professionalism,
      comments: this.comments,
      photos: this.uploadedPhotos
    };

    this.http.post('/api/reviews', payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSubmitted = true;
        localStorage.removeItem('activeOrderId');
        localStorage.removeItem('selectedDeviceCategory');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to submit review', err);
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to submit review. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/order/device-select']);
  }
}
