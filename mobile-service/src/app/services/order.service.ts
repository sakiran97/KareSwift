import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Device {
  id: string;
  name: string;
  description: string;
}

export interface OrderResponse {
  orderId: string;
  id?: number;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = '/api/orders';

  constructor(private http: HttpClient) {}

  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.apiUrl}/devices`);
  }

  createOrder(deviceId: string, details: any): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.apiUrl, details);
  }

  getOrderStatus(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/${orderId}`);
  }

  getAvailableSlots(date: string): Observable<{ slot: string, available: boolean }[]> {
    return this.http.get<{ slot: string, available: boolean }[]>(`${this.apiUrl}/available-slots`, {
      params: { date }
    });
  }

  getUserOrders(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // getInvoice was removed in accordance with Phase 5
}
