import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ScrollAnimateDirective } from '../../directives/scroll-animate.directive';

@Component({
  selector: 'app-device-select',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollAnimateDirective],
  templateUrl: './device-select.html',
  styleUrl: './device-select.scss',
})
export class DeviceSelect implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.requestCurrentLocation();
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
}
