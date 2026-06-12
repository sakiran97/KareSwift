import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LoginResponse {
  access_token: string;
  user: { id: string; email?: string; phone?: string; name?: string; role: string; technicianId?: string };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  // ─── Persist helpers ──────────────────────────────────────────────

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
    // Fallback: decode JWT
    const token = localStorage.getItem('jwt');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { id: payload.sub, email: payload.email, name: payload.name, phone: payload.phone, role: payload.role || 'customer', technicianId: payload.technicianId };
      } catch {}
    }
    return null;
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('jwt') !== null;
  }

  // ─── Unified Email OTP ────────────────────────────────────────────

  sendOtp(email: string, type?: 'login' | 'register'): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/send-otp`, { email, type });
  }

  verifyOtp(email: string, otp: string, extras?: { name?: string; phone?: string; role?: string; technicianId?: string; password?: string }): Observable<LoginResponse> {
    const body: any = { email, otp };
    if (extras?.name) body.name = extras.name;
    if (extras?.phone) body.phone = extras.phone;
    if (extras?.role) body.role = extras.role;
    if (extras?.technicianId) body.technicianId = extras.technicianId;
    if (extras?.password) body.password = extras.password;
    return this.http.post<LoginResponse>(`${this.apiUrl}/verify-otp`, body).pipe(
      map((res: LoginResponse) => this.persistLogin(res))
    );
  }

  // ─── Technician Password Login ────────────────────────────────────

  login(technicianId: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { technicianId, password }).pipe(
      map((res: LoginResponse) => this.persistLogin(res))
    );
  }

  // ─── Legacy: Phone OTP ────────────────────────────────────────────

  requestOtp(phone: string): Observable<{ otpCode: string; message: string }> {
    return this.http.post<{ otpCode: string; message: string }>(`${this.apiUrl}/request-otp`, { phone });
  }

  verifyPhoneOtp(phone: string, otp: string, name?: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/verify-phone-otp`, { phone, otp, name }).pipe(
      map((res: LoginResponse) => this.persistLogin(res))
    );
  }

  registerTechnician(email: string, password: string, name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register-technician`, { email, password, name });
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  updateProfile(data: { name?: string; phone?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/profile`, data);
  }

  logout(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  forgotPassword(payload: { email?: string; technicianId?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, payload);
  }

  resetPassword(payload: { email?: string; technicianId?: string; otp: string; newPassword?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, payload);
  }
}

