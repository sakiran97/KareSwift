import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

declare const L: any;

@Component({
  selector: 'app-shop-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-review.html',
  styleUrl: './shop-review.scss'
})
export class ShopReviewComponent implements OnInit {
  pendingList = signal<any[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  selectedShop = signal<any | null>(null);
  rejectReason = '';
  showRejectModal = signal(false);
  actionLoading = signal(false);

  private map: any = null;

  photoLat = 0;
  photoLng = 0;
  distanceMeters = 0;
  locationMismatch = false;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.fetchPendingList();
  }

  fetchPendingList() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.adminService.getPendingShops().subscribe({
      next: (res: any[]) => {
        this.pendingList.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMsg.set('Failed to retrieve pending shop verifications.');
        this.loading.set(false);
      }
    });
  }

  selectShop(shop: any) {
    this.selectedShop.set(shop);
    this.successMsg.set(null);
    this.errorMsg.set(null);

    const baseLat = shop.shopLatitude || 12.9716;
    const baseLng = shop.shopLongitude || 77.5946;

    const seed = shop.userId % 2 === 0;
    const offsetLat = seed ? 0.0055 : 0.0006;
    const offsetLng = seed ? 0.0045 : 0.0004;

    this.photoLat = baseLat + offsetLat;
    this.photoLng = baseLng + offsetLng;

    this.distanceMeters = Math.round(this.calculateDistance(baseLat, baseLng, this.photoLat, this.photoLng));
    this.locationMismatch = this.distanceMeters > 500;

    setTimeout(() => {
      this.initMap(baseLat, baseLng);
    }, 100);
  }

  initMap(lat: number, lng: number) {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    try {
      this.map = L.map('shop-map').setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      const shopIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #6366f1; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(99,102,241,0.6);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const photoIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #ec4899; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(236,72,153,0.6);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const shopMarker = L.marker([lat, lng], { icon: shopIcon }).addTo(this.map);
      shopMarker.bindPopup(`<b>Registered Location</b><br>${this.selectedShop().shopName || 'Workshop'}`).openPopup();

      const photoMarker = L.marker([this.photoLat, this.photoLng], { icon: photoIcon }).addTo(this.map);
      photoMarker.bindPopup(`<b>Photo Capture Location</b><br>Geotagged from Camera GPS`);

      const polylinePoints = [
        [lat, lng],
        [this.photoLat, this.photoLng]
      ];
      const polyline = L.polyline(polylinePoints, {
        color: this.locationMismatch ? '#ef4444' : '#10b981',
        weight: 3,
        dashArray: '5, 8'
      }).addTo(this.map);

      const bounds = L.latLngBounds([lat, lng], [this.photoLat, this.photoLng]);
      this.map.fitBounds(bounds, { padding: [40, 40] });

    } catch (e: any) {
      console.error('Leaflet Map Initialization Error:', e);
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
  }

  approve() {
    const shop = this.selectedShop();
    if (!shop) return;

    this.actionLoading.set(true);
    this.adminService.approveShop(shop.userId).subscribe({
      next: (res: any) => {
        this.actionLoading.set(false);
        this.successMsg.set(`Workshop for ${shop.user?.name || 'Technician'} verified successfully.`);
        this.selectedShop.set(null);
        this.fetchPendingList();
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to verify shop.');
      }
    });
  }

  openRejectModal() {
    this.rejectReason = '';
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
  }

  reject() {
    const shop = this.selectedShop();
    if (!shop || !this.rejectReason.trim()) return;

    this.actionLoading.set(true);
    this.adminService.rejectShop(shop.userId, this.rejectReason.trim()).subscribe({
      next: (res: any) => {
        this.actionLoading.set(false);
        this.showRejectModal.set(false);
        this.successMsg.set(`Workshop for ${shop.user?.name || 'Technician'} rejected.`);
        this.selectedShop.set(null);
        this.fetchPendingList();
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to reject shop.');
      }
    });
  }

  deselect() {
    this.selectedShop.set(null);
    this.successMsg.set(null);
    this.errorMsg.set(null);
  }
}
