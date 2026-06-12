import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  user: AdminUser;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private userSubject = new BehaviorSubject<AdminUser | null>(null);
  public currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadPersistedUser();
  }

  private loadPersistedUser() {
    const raw = localStorage.getItem('admin_user');
    if (raw) {
      try {
        this.userSubject.next(JSON.parse(raw));
      } catch {
        localStorage.removeItem('admin_user');
      }
    }
  }

  // Auth Operations
  sendOtp(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/send-otp', { email });
  }

  verifyOtp(email: string, otp: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/verify-otp', { email, otp }).pipe(
      map(res => {
        if (res.user.role !== 'admin') {
          throw new Error('Access denied: User is not an admin');
        }
        localStorage.setItem('jwt', res.access_token);
        localStorage.setItem('admin_user', JSON.stringify(res.user));
        this.userSubject.next(res.user);
        return res;
      })
    );
  }

  logout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('admin_user');
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('jwt') && this.userSubject.value?.role === 'admin';
  }

  getCurrentUser(): AdminUser | null {
    return this.userSubject.value;
  }

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

  // Configuration Panel
  getConfig(): Observable<any[]> {
    return this.http.get<any[]>('/api/config');
  }

  updateConfig(key: string, value: string): Observable<any> {
    return this.http.patch<any>(`/api/config/${key}`, { value });
  }
}
