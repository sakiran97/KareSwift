import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/check-email',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('jwt');
  const router = inject(Router);
  const authService = inject(AuthService);

  // Don't attach token to public auth endpoints (login, register, OTP)
  const isPublicAuth = PUBLIC_AUTH_PATHS.some(p => req.url.includes(p));
  if (isPublicAuth) {
    return next(req);
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned).pipe(
      tap({
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            authService.logout();
            router.navigate(['/auth/login']);
          }
        }
      })
    );
  }

  return next(req);
};
