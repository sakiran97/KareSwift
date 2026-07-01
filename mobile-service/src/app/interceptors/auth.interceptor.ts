import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/check-email',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  // Don't attach cookies to external APIs like nominatim
  const isExternalApi = req.url.startsWith('http') && !req.url.includes('/api');
  if (isExternalApi) {
    return next(req);
  }

  // Always set withCredentials for API calls to send HttpOnly cookies
  let finalUrl = req.url;
  
  // If the URL is relative (starts with /api), prepend the environment API URL.
  // This is critical for Capacitor mobile apps, because they run on http://localhost internally
  // and need to reach out to the actual backend server (e.g. Render).
  if (req.url.startsWith('/api')) {
    finalUrl = `${environment.apiUrl}${req.url}`;
  }

  let headers = req.headers;
  const token = authService.getToken();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const finalReq = req.clone({
    url: finalUrl,
    withCredentials: true,
    headers: headers
  });

  return next(finalReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Prevent infinite loops if the refresh call itself fails
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/session')) {
        // Attempt silent refresh
        return http.post<any>('/api/auth/refresh', {}, { withCredentials: true }).pipe(
          switchMap((res) => {
            let retriedReq = finalReq;
            if (res && res.access_token) {
              localStorage.setItem('jwt', res.access_token);
              retriedReq = finalReq.clone({
                headers: finalReq.headers.set('Authorization', `Bearer ${res.access_token}`)
              });
            }
            // Retry original request
            return next(retriedReq);
          }),
          catchError((refreshErr) => {
            if (authService.isLoggedIn()) {
              authService.logout();
              router.navigate(['/auth/login']);
            }
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
