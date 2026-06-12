import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TechnicianKycService } from '../services/technician.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TechnicianGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private kycService: TechnicianKycService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const token = this.auth.getToken();
    if (!token) {
      return this.router.createUrlTree(['/technician/login']);
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'technician' && payload.role !== 'admin') {
        return this.router.createUrlTree(['/technician/login']);
      }
    } catch {
      return this.router.createUrlTree(['/technician/login']);
    }

    // Allow access to verification-pending page
    if (state.url.includes('/verification-pending')) {
      return true;
    }

    // Gate all other routes based on KYC and shop approval
    return this.kycService.getKycStatus().pipe(
      map((status: any) => {
        if (status.kycStatus === 'approved' && status.shopVerified) {
          return true;
        }
        return this.router.createUrlTree(['/technician/verification-pending']);
      }),
      catchError(() => {
        // Safe fallback in case of errors
        return of(true);
      })
    );
  }
}
