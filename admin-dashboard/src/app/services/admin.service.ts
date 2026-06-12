import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

const SUPABASE_URL = 'https://apqtqdnjgrusomauvuqc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXRxZG5qZ3J1c29tYXV2dXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDgxODcsImV4cCI6MjA5NjgyNDE4N30.oQV2Af4esBBR--SO1eEWYbZD5-vIlbblHRhbiqa5aKw';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private userSubject = new BehaviorSubject<AdminUser | null>(null);
  public currentUser$ = this.userSubject.asObservable();
  private supabase: SupabaseClient;

  constructor(private http: HttpClient) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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

  // Auth Operations (Supabase)
  sendOtp(email: string): Observable<{ message: string }> {
    return from(this.supabase.auth.signInWithOtp({ email })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { message: 'OTP sent successfully' };
      })
    );
  }

  verifyOtp(email: string, otp: string): Observable<LoginResponse> {
    return from(this.supabase.auth.verifyOtp({ email, token: otp, type: 'email' })).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        const session = data.session;
        if (!session) throw new Error('No session returned');

        const token = session.access_token;

        // Fetch user from our backend to verify admin role
        return this.http.get<any>('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }).pipe(
          map(profile => {
            if (profile.role !== 'admin') {
              throw new Error('Access denied: User is not an admin');
            }
            const res: LoginResponse = {
              access_token: token,
              user: {
                id: profile.id,
                email: profile.email,
                name: profile.name || 'Admin',
                role: profile.role
              }
            };
            localStorage.setItem('jwt', res.access_token);
            localStorage.setItem('admin_user', JSON.stringify(res.user));
            this.userSubject.next(res.user);
            return res;
          })
        );
      })
    );
  }

  logout() {
    this.supabase.auth.signOut();
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
