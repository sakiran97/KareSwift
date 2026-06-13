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

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadReviews();
  }

  loadReviews() {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getReviews().subscribe({
      next: (res) => {
        this.reviews.set(res || []);
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
