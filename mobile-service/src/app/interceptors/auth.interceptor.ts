import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

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
  const finalReq = req.clone({
    withCredentials: true
  });

  return next(finalReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Prevent infinite loops if the refresh call itself fails
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/session')) {
        // Attempt silent refresh
        return http.post('/api/auth/refresh', {}, { withCredentials: true }).pipe(
          switchMap(() => {
            // Retry original request
            return next(finalReq);
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
