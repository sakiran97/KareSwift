import { Component, EventEmitter, Output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LocationService } from '../../services/location.service';

import { MapSelector, MapSelection } from '../map-selector/map-selector';

@Component({
  selector: 'app-location-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MapSelector],
  templateUrl: './location-modal.html',
  styleUrls: ['./location-modal.scss']
})
export class LocationModal implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  searchQuery = '';
  searchResults = signal<any[]>([]);
  isDetecting = signal(false);
  isSearching = signal(false);
  showMapModal = false;

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(private locationService: LocationService) {}

  ngOnInit() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe(query => {
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

  detectLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    this.isDetecting.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        this.locationService.reverseGeocode(lat, lng).subscribe({
          next: (address: string) => {
            this.locationService.setLocation({ address, lat, lng });
            this.isDetecting.set(false);
            this.closeModal();
          },
          error: () => {
            alert('Failed to get address from coordinates.');
            this.isDetecting.set(false);
          }
        });
      },
      (error) => {
        alert('Location access denied. Please search manually.');
        this.isDetecting.set(false);
      },
      { timeout: 10000 }
    );
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
    this.closeModal();
  }

  openMapSelector() {
    this.showMapModal = true;
  }

  handleMapSelection(selection: MapSelection) {
    this.showMapModal = false;
    this.locationService.setLocation({ 
      address: selection.fullAddress || `${selection.street}, ${selection.area}`, 
      lat: selection.lat, 
      lng: selection.lng 
    });
    this.closeModal();
  }
}
