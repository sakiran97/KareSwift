import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private http: HttpClient) {}

  // Dashboard Stats
  getStats(): Observable<any> {
    return this.http.get<any>('/api/admin/dashboard/stats');
  }

  // KYC Operations
  getPendingKyc(): Observable<any[]> {
    return this.http.get<any[]>('/api/admin/kyc/pending');
  }

  getKycDetails(userId: number): Observable<any> {
    return this.http.get<any>(`/api/admin/kyc/${userId}`);
  }

  approveKyc(userId: number): Observable<any> {
    return this.http.post<any>(`/api/admin/kyc/${userId}/approve`, {});
  }

  rejectKyc(userId: number, reason: string): Observable<any> {
    return this.http.post<any>(`/api/admin/kyc/${userId}/reject`, { reason });
  }

  // Shop Operations
  getPendingShops(): Observable<any[]> {
    return this.http.get<any[]>('/api/admin/shops/pending');
  }

  approveShop(userId: number): Observable<any> {
    return this.http.post<any>(`/api/admin/shops/${userId}/approve`, {});
  }

  rejectShop(userId: number, reason: string): Observable<any> {
    return this.http.post<any>(`/api/admin/shops/${userId}/reject`, { reason });
  }

  // Technician Management
  getTechnicians(kycStatus?: string): Observable<any[]> {
    const url = kycStatus ? `/api/admin/technicians?kycStatus=${kycStatus}` : '/api/admin/technicians';
    return this.http.get<any[]>(url);
  }

  suspendTechnician(userId: number): Observable<any> {
    return this.http.patch<any>(`/api/admin/technicians/${userId}/suspend`, {});
  }

  activateTechnician(userId: number): Observable<any> {
    return this.http.patch<any>(`/api/admin/technicians/${userId}/activate`, {});
  }

  // Order Management
  getAllOrders(): Observable<any[]> {
    return this.http.get<any[]>('/api/admin/orders');
  }

  cancelOrder(orderId: number, reason: string): Observable<any> {
    return this.http.patch<any>(`/api/admin/orders/${orderId}/cancel`, { reason });
  }

  // Configuration Panel
  getConfig(): Observable<any[]> {
    return this.http.get<any[]>('/api/config');
  }

  updateConfig(key: string, value: string): Observable<any> {
    return this.http.patch<any>(`/api/config/${key}`, { value });
  }
}
