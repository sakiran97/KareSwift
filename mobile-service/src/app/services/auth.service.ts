import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  access_token: string;
  user: { id: string; email?: string; phone?: string; name?: string; role: string };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private supabase: SupabaseClient;
  
  isLoggedIn = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('type=recovery') || window.location.hash.includes('type=recovery')) {
        // If they are on the password recovery screen, destroy any lingering session
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        this.isLoggedIn.set(false);
      } else {
        this.isLoggedIn.set(localStorage.getItem('jwt') !== null);
      }
    }
    
    this.listenToAuthChanges();
  }

  private listenToAuthChanges(): void {
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State Change:', event);
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked recovery link. Redirect to login with recovery flag to set new password.
        window.location.href = '/auth/login?type=recovery';
        return;
      }
      
      // Do not process session into visual login state if we are in the middle of password recovery
      if (typeof window !== 'undefined' && (window.location.search.includes('type=recovery') || window.location.hash.includes('type=recovery'))) {
        return;
      }
      
      if (session) {
        const token = session.access_token;
        const currentToken = localStorage.getItem('jwt');
        if (currentToken !== token) {
          localStorage.setItem('jwt', token);
        }
        localStorage.removeItem('user');
        this.http.get<any>(`${this.apiUrl}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: (profile) => {
            const user = {
              id: profile.id,
              email: profile.email,
              phone: profile.phone,
              name: profile.name,
              role: profile.role,
            };
            localStorage.setItem('user', JSON.stringify(user));
            this.isLoggedIn.set(true);
          },
          error: () => {
            const fallbackUser = { id: '', email: session.user?.email, role: 'customer' };
            localStorage.setItem('user', JSON.stringify(fallbackUser));
            this.isLoggedIn.set(true);
          }
        });
      }
    });
  }

  // ─── Password & Google Auth (Supabase) ─────────────────────────────

  checkEmail(email: string): Observable<{ exists: boolean }> {
    return this.http.post<{exists: boolean}>(`${this.apiUrl}/check-email`, { email });
  }

  signUpWithPassword(email: string, password: string, name: string, phone?: string): Observable<LoginResponse> {
    return this.checkEmail(email).pipe(
      switchMap((res: { exists: boolean }) => {
        console.log('[Auth] checkEmail result:', email, res);
        if (res.exists) {
          return throwError(() => new HttpErrorResponse({ error: { message: 'User already exists. Please login instead.' } }));
        }
        return from(this.supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone: phone || ''
            }
          }
        })).pipe(
          switchMap(({ data, error }) => {
            if (error) {
              console.log('[Auth] supabase signUp error:', error);
              throw error;
            }
            const session = data.session;
            const user = data.user;
            const token = session?.access_token;

            if (token) {
              return this.http.get<any>(`${this.apiUrl}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
              }).pipe(
                map((profile: any) => {
                  const loginRes: LoginResponse = {
                    access_token: token,
                    user: {
                      id: profile.id,
                      email: profile.email,
                      phone: profile.phone,
                      name: profile.name,
                      role: profile.role,
                    }
                  };
                  this.persistLogin(loginRes);
                  return loginRes;
                }),
                catchError(() => {
                  const fallbackRes: LoginResponse = {
                    access_token: token,
                    user: {
                      id: user?.id || '',
                      email: user?.email || email,
                      role: 'customer'
                    }
                  };
                  this.persistLogin(fallbackRes);
                  return from([fallbackRes]);
                })
              );
            } else {
              return throwError(() => new HttpErrorResponse({ error: { message: 'Signup successful! Please check your email for confirmation link.' } }));
            }
          })
        );
      })
    );
  }

  signInWithPassword(email: string, password: string): Observable<LoginResponse> {
    return from(this.supabase.auth.signInWithPassword({ email, password })).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        const session = data.session;
        if (!session) throw new Error('No session returned');

        const token = session.access_token;
        const user = session.user;

        return this.http.get<any>(`${this.apiUrl}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }).pipe(
          map((profile: any) => {
            const loginRes: LoginResponse = {
              access_token: token,
              user: {
                id: profile.id,
                email: profile.email,
                phone: profile.phone,
                name: profile.name,
                role: profile.role,
              }
            };
            this.persistLogin(loginRes);
            return loginRes;
          }),
          catchError(() => {
            const fallbackRes: LoginResponse = {
              access_token: token,
              user: {
                id: user.id,
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

  signInWithGoogle(): Observable<any> {
    return from(this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/login'
      }
    }));
  }

  // ─── Forgot Password / OTP ──────────────────────────────────────────

  requestPasswordResetOTP(email: string): Observable<any> {
    return from(this.supabase.auth.resetPasswordForEmail(email));
  }

  verifyResetOTPAndSetPassword(email: string, token: string, newPassword: string): Observable<any> {
    return from(this.supabase.auth.verifyOtp({ email, token, type: 'recovery' })).pipe(
      switchMap(({ data, error }) => {
        if (error) throw error;
        // After successful verification, the user session is created
        return from(this.supabase.auth.updateUser({ password: newPassword })).pipe(
          map(({ error: updateError }) => {
            if (updateError) throw updateError;
            return data;
          })
        );
      })
    );
  }

  updateUserPassword(newPassword: string): Observable<any> {
    return from(this.supabase.auth.updateUser({ password: newPassword })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private persistLogin(res: LoginResponse): LoginResponse {
    localStorage.setItem('jwt', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.isLoggedIn.set(true);
    return res;
  }

  getCurrentUser(): any | null {
    const raw = localStorage.getItem('user');
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  logout(): void {
    this.supabase.auth.signOut();
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    this.isLoggedIn.set(false);
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  updateProfile(data: { name?: string; phone?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/profile`, data);
  }

}
