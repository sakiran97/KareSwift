import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  // Always set withCredentials for API calls to send HttpOnly cookies
  let cloned = req;
  if (req.url.includes('/api')) {
    cloned = req.clone({
      withCredentials: true
    });
  }
  
  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      // Prevent infinite loops if the refresh call itself fails
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/session')) {
        // Attempt silent refresh
        return http.post('/api/auth/refresh', {}, { withCredentials: true }).pipe(
          switchMap(() => {
            // Retry original request
            return next(cloned);
          }),
          catchError((refreshErr) => {
            localStorage.removeItem('admin_user');
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
