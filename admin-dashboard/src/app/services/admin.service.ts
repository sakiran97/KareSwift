import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from, concat, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
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

import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private userSubject = new BehaviorSubject<AdminUser | null>(null);
  public currentUser$ = this.userSubject.asObservable();
  private supabase: SupabaseClient;
  
  // Data Cache
  private cache: { [key: string]: any } = {};

  constructor(private http: HttpClient) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
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

        // Establish backend session with cookies
        return this.http.post<any>('/api/auth/session', { supabaseToken: token }, { withCredentials: true }).pipe(
          map(res => {
            const profile = res.user;
            if (profile.role !== 'admin') {
              throw new Error('Access denied: User is not an admin');
            }
            const loginRes: LoginResponse = {
              access_token: token,
              user: {
                id: profile.id,
                email: profile.email,
                name: profile.name || 'Admin',
                role: profile.role
              }
            };
            localStorage.setItem('admin_user', JSON.stringify(loginRes.user));
            this.userSubject.next(loginRes.user);
            return loginRes;
          })
        );
      })
    );
  }

  logout() {
    this.supabase.auth.signOut();
    this.http.post('/api/auth/logout', {}, { withCredentials: true }).subscribe({
      next: () => {},
      error: () => {}
    });
    localStorage.removeItem('admin_user');
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    // If we have an admin user in subject, we assume logged in (cookie handles actual auth)
    return !!this.userSubject.value && this.userSubject.value.role === 'admin';
  }

  getCurrentUser(): AdminUser | null {
    return this.userSubject.value;
  }

  // Dashboard Stats
  getStats(): Observable<any> {
    const req = this.http.get<any>('/api/admin/dashboard/stats').pipe(tap(res => this.cache['stats'] = res));
    return this.cache['stats'] ? concat(of(this.cache['stats']), req) : req;
  }

  // Orders Operations
  getAllOrders(params?: { page?: number; limit?: number; search?: string; status?: string }): Observable<any> {
    let url = '/api/admin/orders';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const req = this.http.get<any>(url).pipe(tap(res => this.cache['orders'] = res));
    return this.cache['orders'] ? concat(of(this.cache['orders']), req) : req;
  }

  updateOrderStatus(
    id: number,
    status: string,
    payload: {
      partsUsed?: string;
      laborNotes?: string;
      finalAmount?: number;
      paymentMethod?: string;
      repairNotes?: string;
      otp?: string;
    } = {}
  ): Observable<any> {
    return this.http.patch<any>(`/api/orders/${id}/status`, { status, ...payload });
  }

  cancelOrder(id: number, reason: string): Observable<any> {
    return this.http.patch<any>(`/api/admin/orders/${id}/cancel`, { reason });
  }

  // Service Areas Operations
  getServiceAreas(): Observable<any[]> {
    return this.http.get<any[]>('/api/service-areas/admin');
  }

  createServiceArea(data: { name: string; city: string; travelCharge: number; isActive?: boolean }): Observable<any> {
    return this.http.post<any>('/api/service-areas', data);
  }

  updateServiceArea(id: number, data: { name?: string; city?: string; travelCharge?: number; isActive?: boolean }): Observable<any> {
    return this.http.put<any>(`/api/service-areas/${id}`, data);
  }

  deleteServiceArea(id: number): Observable<any> {
    return this.http.delete<any>(`/api/service-areas/${id}`);
  }

  // Slots Operations
  getSlots(): Observable<any[]> {
    return this.http.get<any[]>('/api/slots/admin');
  }

  createSlot(data: { name: string; startTime: string; endTime: string; maxBookings?: number; isActive?: boolean }): Observable<any> {
    return this.http.post<any>('/api/slots', data);
  }

  updateSlot(id: number, data: { name?: string; startTime?: string; endTime?: string; maxBookings?: number; isActive?: boolean }): Observable<any> {
    return this.http.put<any>(`/api/slots/${id}`, data);
  }

  deleteSlot(id: number): Observable<any> {
    return this.http.delete<any>(`/api/slots/${id}`);
  }

  // Service Categories Operations
  getServiceCategories(): Observable<any[]> {
    return this.http.get<any[]>('/api/service-categories/admin');
  }

  createServiceCategory(data: { name: string; description?: string; isActive?: boolean }): Observable<any> {
    return this.http.post<any>('/api/service-categories', data);
  }

  updateServiceCategory(id: number, data: { name?: string; description?: string; isActive?: boolean }): Observable<any> {
    return this.http.put<any>(`/api/service-categories/${id}`, data);
  }

  deleteServiceCategory(id: number): Observable<any> {
    return this.http.delete<any>(`/api/service-categories/${id}`);
  }

  // Reviews Operations
  getReviews(): Observable<any[]> {
    return this.http.get<any[]>('/api/reviews');
  }

  verifyReview(id: number, isVerified: boolean): Observable<any> {
    return this.http.patch<any>(`/api/reviews/${id}/verify`, { isVerified });
  }

  // Configuration Panel
  getConfig(): Observable<any[]> {
    return this.http.get<any[]>('/api/config');
  }

  updateConfig(key: string, value: string): Observable<any> {
    return this.http.patch<any>(`/api/config/${key}`, { value });
  }

  // Chat Operations
  getChatMessages(orderId: number): Observable<any[]> {
    return this.http.get<any[]>(`/api/chat/order/${orderId}`);
  }

  sendChatMessage(orderId: number, message: string): Observable<any> {
    return this.http.post<any>(`/api/chat/order/${orderId}`, { message, sender: 'admin' });
  }
}
