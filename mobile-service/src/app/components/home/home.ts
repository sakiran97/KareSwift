import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface PublicReview {
  id: number;
  overallRating: number;
  comments: string | null;
  customerName: string;
  device: string;
  service: string;
  createdAt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  reviews = signal<PublicReview[]>([]);
  isLoggedIn = signal(false);

  servicesList = [
    { name: 'Screen Replacement', icon: '📱', desc: 'Cracked, bleeding, or unresponsive touch screens fixed in under 45 minutes.' },
    { name: 'Battery Replacement', icon: '🔋', desc: 'Low backup, heating, or swollen battery replacement with original parts.' },
    { name: 'Charging Port Fix', icon: '🔌', desc: 'Device not charging or connecting? Fast port cleanup and connector replacement.' },
    { name: 'Camera Repair', icon: '📷', desc: 'Blurry photos, broken lenses, or focus issues resolved with new modules.' },
    { name: 'Water Damage', icon: '💧', desc: 'Accidental drop in liquid? Ultrasonic cleaning and logic board diagnosis.' },
    { name: 'Speaker & Mic', icon: '🔊', desc: 'Muffled call audio, low speaker sound, or microphone issues fixed.' }
  ];

  howItWorks = [
    { step: 1, title: 'Book Online', desc: 'Select your device, model, specify the repair needed, and pick a convenient date & slot.' },
    { step: 2, title: 'Doorstep Diagnosis', desc: 'Our certified expert arrives at your home/office and diagnoses the device right in front of you.' },
    { step: 3, title: 'OTP Secured Handover', desc: 'Verify the repair and finalize payment. The job is marked complete using a secure OTP code.' }
  ];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.checkLoginStatus();
    this.fetchPublicReviews();
  }

  checkLoginStatus() {
    this.isLoggedIn.set(localStorage.getItem('jwt') !== null);
  }

  fetchPublicReviews() {
    this.http.get<PublicReview[]>('/api/reviews/public').subscribe({
      next: (res: any) => {
        this.reviews.set(res || []);
      },
      error: () => {
        // Fallback static reviews for demo when API is unreachable
        this.reviews.set([
          {
            id: 1,
            overallRating: 5,
            comments: 'Outstanding service! Replaced my iPhone 14 Pro screen right in my living room in 30 minutes. Extremely professional.',
            customerName: 'Rahul K.',
            device: 'Apple iPhone 14 Pro',
            service: 'Screen Replacement',
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            overallRating: 5,
            comments: 'Very convenient doorstep service. The diagnostic was transparent and pricing was very fair. Recommended!',
            customerName: 'Sneha M.',
            device: 'Samsung Galaxy S23',
            service: 'Battery Replacement',
            createdAt: new Date().toISOString()
          }
        ]);
      }
    });
  }

  bookNow() {
    if (this.isLoggedIn()) {
      this.router.navigate(['/order/device-select']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
}
