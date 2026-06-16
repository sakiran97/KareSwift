import { Component, EventEmitter, Output, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';

export interface MapSelection {
  lat: number;
  lng: number;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
}

@Component({
  selector: 'app-map-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-selector.html',
  styleUrls: ['./map-selector.scss']
})
export class MapSelector implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement') mapElement!: ElementRef;
  @Output() selectionConfirmed = new EventEmitter<MapSelection>();
  @Output() close = new EventEmitter<void>();

  private map!: L.Map;
  private marker!: L.Marker;
  
  isLocating = false;
  isFetchingAddress = false;
  currentSelection: MapSelection | null = null;
  errorMessage: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Fix leaflet default icon path issues
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    // Default to a central location (e.g., Hyderabad)
    const defaultLat = 17.3850;
    const defaultLng = 78.4867;

    this.map = L.map(this.mapElement.nativeElement).setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.fetchAddressDetails(pos.lat, pos.lng);
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.fetchAddressDetails(e.latlng.lat, e.latlng.lng);
    });

    // Try to get user's actual location
    this.detectCurrentLocation();
  }

  detectCurrentLocation() {
    if (!navigator.geolocation) {
      this.errorMessage = 'Geolocation is not supported by your browser.';
      return;
    }

    this.isLocating = true;
    this.errorMessage = null;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating = false;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        this.map.setView([lat, lng], 16);
        this.marker.setLatLng([lat, lng]);
        this.fetchAddressDetails(lat, lng);
      },
      (error) => {
        this.isLocating = false;
        this.errorMessage = 'Could not get your location. Please drag the pin manually.';
      },
      { timeout: 10000 }
    );
  }

  private fetchAddressDetails(lat: number, lng: number) {
    this.isFetchingAddress = true;
    this.errorMessage = null;
    
    this.http.get<any>(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`).subscribe({
      next: (res: any) => {
        this.isFetchingAddress = false;
        if (res && res.address) {
          const addr = res.address;
          this.currentSelection = {
            lat,
            lng,
            street: addr.road || addr.street || '',
            area: addr.suburb || addr.neighbourhood || addr.village || '',
            city: addr.city || addr.town || addr.county || '',
            state: addr.state || '',
            pincode: addr.postcode || '',
            fullAddress: res.display_name
          };
        } else {
          this.errorMessage = 'Could not determine address details from this location.';
          this.currentSelection = null;
        }
      },
      error: () => {
        this.isFetchingAddress = false;
        this.errorMessage = 'Failed to fetch address details. Please try again or enter manually.';
        this.currentSelection = null;
      }
    });
  }

  confirmSelection() {
    if (this.currentSelection) {
      this.selectionConfirmed.emit(this.currentSelection);
    }
  }

  closeModal() {
    this.close.emit();
  }
}
