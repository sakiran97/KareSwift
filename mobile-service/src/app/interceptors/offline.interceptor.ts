import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { OfflineSyncService } from '../services/offline-sync.service';

@Injectable()
export class OfflineInterceptor implements HttpInterceptor {
  constructor(private syncService: OfflineSyncService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only intercept mutating operations (POST, PUT, DELETE)
    const isMutation = ['POST', 'PUT', 'DELETE'].includes(request.method.toUpperCase());

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if the error is due to network failure (status 0)
        if (error.status === 0 && isMutation) {
          console.warn('Network offline. Queuing request for background sync.');
          
          // Convert Angular headers to a plain object
          const headersObj: any = {};
          request.headers.keys().forEach(key => {
            headersObj[key] = request.headers.get(key);
          });

          // Queue the request
          return from(this.syncService.queueRequest(request.urlWithParams, request.method, request.body, headersObj)).pipe(
            switchMap(() => {
              // Return a dummy success response so the app UI thinks it worked
              return throwError(() => new Error('OFFLINE_QUEUED'));
            })
          );
        }

        // If it's a real server error or a GET request, pass it through
        return throwError(() => error);
      })
    );
  }
}
