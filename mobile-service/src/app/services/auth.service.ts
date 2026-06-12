import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  access_token: string;
  user: { id: string; email?: string; phone?: string; name?: string; role: string; technicianId?: string };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private supabase: SupabaseClient;

  constructor(private http: HttpClient) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    // Supabase auto-persists sessions in localStorage.
  }

  // ─── Unified Email OTP (Supabase) ─────────────────────────────────

  sendOtp(email: string, type?: 'login' | 'register'): Observable<{ message: string }> {
    return from(this.supabase.auth.signInWithOtp({ email })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { message: 'OTP sent to your email' };
      })
    );
  }

  verifyOtp(email: string, otp: string, extras?: any): Observable<LoginResponse> {
    return from(this.supabase.auth.verifyOtp({ email, token: otp, type: 'email' })).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        const session = data.session;
        if (!session) throw new Error('No session returned');

        // Since Supabase manages the JWT, we use it directly.
        const token = session.access_token;
        const user = session.user;

        // If this is a registration and we have extras, we should ideally update the profile
        // but for now, we'll just fetch the synced profile from our backend.
        
        return this.http.get<any>(`${this.apiUrl}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }).pipe(
          map(profile => {
            const loginRes: LoginResponse = {
              access_token: token,
              user: {
                id: profile.id,
                email: profile.email,
                phone: profile.phone,
                name: profile.name,
                role: profile.role,
                technicianId: profile.technicianId
              }
            };
            this.persistLogin(loginRes);
            return loginRes;
          }),
          catchError(err => {
            // If the backend profile isn't synced yet (trigger delay), fallback to Supabase user
            const fallbackRes: LoginResponse = {
              access_token: token,
              user: {
                id: user.id, // Supabase UUID
                email: user.email,
                role: 'customer'
              }
            };
            this.persistLogin(fallbackRes);
            return from([fallbackRes]);
          })
        );
      })
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private persistLogin(res: LoginResponse): LoginResponse {
    localStorage.setItem('jwt', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  }

  getCurrentUser(): any | null {
    const raw = localStorage.getItem('user');
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return null;
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('jwt') !== null;
  }

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  logout(): void {
    this.supabase.auth.signOut();
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  updateProfile(data: { name?: string; phone?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/profile`, data);
  }
}
