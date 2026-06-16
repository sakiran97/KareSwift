import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly LOCATION_KEY = 'kareswift_user_location';
  
  // Reactive state for the currently selected location
  currentLocation = signal<LocationData | null>(this.getSavedLocation());

  constructor(private http: HttpClient) {}

  private getSavedLocation(): LocationData | null {
    const saved = localStorage.getItem(this.LOCATION_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  setLocation(data: LocationData) {
    localStorage.setItem(this.LOCATION_KEY, JSON.stringify(data));
    this.currentLocation.set(data);
  }

  clearLocation() {
    localStorage.removeItem(this.LOCATION_KEY);
    this.currentLocation.set(null);
  }

  // Reverse geocoding using Nominatim
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&email=admin@kareswift.com`;
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        if (res && res.address) {
          const addr = res.address;
          const components = [
            addr.neighbourhood || addr.suburb || addr.village,
            addr.city || addr.town || addr.county,
            addr.state
          ].filter(Boolean);
          return components.join(', ') || res.display_name;
        }
        return 'Unknown Location';
      }),
      catchError(() => of('Unknown Location'))
    );
  }

  // Search locations
  searchLocation(query: string): Observable<any[]> {
    if (!query.trim()) return of([]);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in&email=admin@kareswift.com`;
    return this.http.get<any[]>(url).pipe(
      catchError(() => of([]))
    );
  }
}
