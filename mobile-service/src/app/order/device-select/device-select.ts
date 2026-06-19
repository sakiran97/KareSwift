import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ScrollAnimateDirective } from '../../directives/scroll-animate.directive';

@Component({
  selector: 'app-device-select',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollAnimateDirective, FormsModule],
  templateUrl: './device-select.html',
  styleUrl: './device-select.scss',
})
export class DeviceSelect implements OnInit, OnDestroy {
  heroImages = [
    'assets/images/hero-1.png',
    'assets/images/hero-2.png',
    'assets/images/hero-3.png'
  ];
  currentHeroIndex = 0;
  private carouselInterval: any;

  // Pincode checker
  pincodeInput = '';
  pincodeResult: 'available' | 'unavailable' | null = null;
  pincodeChecking = false;

  // Video modal
  showVideoModal = false;

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.requestCurrentLocation();
    this.startCarousel();
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  startCarousel(): void {
    if (typeof window !== 'undefined') {
      this.carouselInterval = setInterval(() => {
        this.currentHeroIndex = (this.currentHeroIndex + 1) % this.heroImages.length;
      }, 4000);
    }
  }

  requestCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          localStorage.setItem('pinnedLatitude', String(lat));
          localStorage.setItem('pinnedLongitude', String(lng));

          fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              const address = data.display_name || 'Ahmedguda, Secunderabad, Telangana 501302';
              localStorage.setItem('pinnedAddress', address);
              console.log('Location geocoded successfully:', address);
            })
            .catch(err => {
              console.warn('Reverse geocoding failed. Using user fallback.', err);
              localStorage.setItem('pinnedAddress', 'Ahmedguda, Secunderabad, Telangana 501302');
            });
        },
        (error) => {
          console.warn('Geolocation prompt rejected or failed. Using user coordinates fallback.', error);
          // Set user fallback coordinates for seamless local testing in Secunderabad, Telangana
          localStorage.setItem('pinnedLatitude', '17.4589');
          localStorage.setItem('pinnedLongitude', '78.6189');
          localStorage.setItem('pinnedAddress', 'Ahmedguda, Secunderabad, Telangana 501302');
        }
      );
    }
  }

  onSelectDevice(deviceType: string): void {
    localStorage.setItem('selectedDeviceCategory', deviceType);
    this.router.navigate(['/order/create']);
  }

  checkPincode(): void {
    if (!this.pincodeInput || this.pincodeInput.length !== 6) return;
    this.pincodeChecking = true;
    this.pincodeResult = null;

    this.http.get<any>(`/api/service-areas/check-pincode/${this.pincodeInput}`).subscribe({
      next: (res: any) => {
        this.pincodeChecking = false;
        this.pincodeResult = res.available ? 'available' : 'unavailable';
        this.cdr.detectChanges();
      },
      error: () => {
        this.pincodeChecking = false;
        this.pincodeResult = 'unavailable';
        this.cdr.detectChanges();
      }
    });
  }

  openVideoModal(): void {
    this.showVideoModal = true;
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
  }
}
