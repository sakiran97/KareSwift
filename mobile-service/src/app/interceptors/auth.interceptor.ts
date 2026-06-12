import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

const PUBLIC_AUTH_PATHS = [
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/login',
  '/auth/request-otp',
  '/auth/verify-phone-otp',
  '/auth/register-technician',
  '/technician/kyc/send-aadhaar-otp',
  '/technician/kyc/verify-aadhaar-otp',
  '/technician/kyc/upload-file',
  '/auth/check-email',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('jwt');

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
            localStorage.removeItem('jwt');
            localStorage.removeItem('user');
            inject(Router).navigate(['/auth/login']);
          }
        }
      })
    );
  }

  return next(req);
};
