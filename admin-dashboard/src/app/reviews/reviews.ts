import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.scss']
})
export class ReviewsComponent implements OnInit {
  reviews = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  
  // Expandable Row
  expandedReviewId = signal<number | null>(null);

  // Image Modal State
  showImageModal = signal(false);
  selectedImageUrl = signal<string>('');

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadReviews();
  }

  toggleExpand(reviewId: number) {
    if (this.expandedReviewId() === reviewId) {
      this.expandedReviewId.set(null);
    } else {
      this.expandedReviewId.set(reviewId);
    }
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

  loadReviews() {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getReviews().subscribe({
      next: (res: any) => {
        this.reviews.set(Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load customer reviews.');
        this.loading.set(false);
      }
    });
  }

  toggleVerify(reviewItem: any) {
    this.adminService.verifyReview(reviewItem.id, !reviewItem.isVerified).subscribe({
      next: () => {
        this.loadReviews();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to update review verification status.');
      }
    });
  }
}
