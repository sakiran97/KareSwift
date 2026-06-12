import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WarrantyInfo {
  orderId: number;
  device: string;
  service: string;
  warrantyDays: number;
  expiresAt: string;
  claimCount: number;
  completedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WarrantyService {
  private readonly apiUrl = '/api/warranty';

  constructor(private http: HttpClient) {}

  getWarranties(): Observable<WarrantyInfo[]> {
    return this.http.get<WarrantyInfo[]>(this.apiUrl);
  }

  getWarrantyDetails(orderId: number): Observable<WarrantyInfo> {
    return this.http.get<WarrantyInfo>(`${this.apiUrl}/${orderId}`);
  }

  claimWarranty(orderId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${orderId}/claim`, {});
  }
}
