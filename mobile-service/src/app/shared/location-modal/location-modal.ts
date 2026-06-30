import { Component, EventEmitter, Output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LocationService } from '../../services/location.service';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-location-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-modal.html',
  styleUrls: ['./location-modal.scss']
})
export class LocationModal implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  searchQuery = '';
  searchResults = signal<any[]>([]);
  isDetecting = signal(false);
  isSearching = signal(false);

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(private locationService: LocationService) {}

  ngOnInit() {
    this.searchSubscription = this.searchSubject.asObservable().pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe((query: string) => {
      this.executeSearch(query);
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  closeModal() {
    this.close.emit();
  }

  async detectLocation() {
    this.isDetecting.set(true);
    await Haptics.impact({ style: ImpactStyle.Light });

    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        await Geolocation.requestPermissions();
      }

      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      this.locationService.reverseGeocode(lat, lng).subscribe({
        next: async (address: string) => {
          this.locationService.setLocation({ address, lat, lng });
          this.isDetecting.set(false);
          await Haptics.impact({ style: ImpactStyle.Medium });
          this.closeModal();
        },
        error: () => {
          alert('Failed to get address from coordinates.');
          this.isDetecting.set(false);
        }
      });
    } catch (error) {
      alert('Location access denied or unavailable. Please search manually.');
      this.isDetecting.set(false);
    }
  }

  onSearchChange() {
    if (this.searchQuery.length < 3) {
      this.searchResults.set([]);
      return;
    }
    this.isSearching.set(true);
    this.searchSubject.next(this.searchQuery);
  }

  private executeSearch(query: string) {
    this.locationService.searchLocation(query).subscribe({
      next: (results: any[]) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
      },
      error: () => {
        this.isSearching.set(false);
      }
    });
  }

  selectLocation(result: any) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Format a clean address string
    let cleanAddress = result.display_name;
    const parts = cleanAddress.split(', ');
    if (parts.length > 3) {
      cleanAddress = parts.slice(0, 3).join(', ');
    }

    this.locationService.setLocation({ address: cleanAddress, lat, lng });
    Haptics.impact({ style: ImpactStyle.Medium });
    this.closeModal();
  }
}
