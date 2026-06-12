import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const token = this.auth.getToken();
    if (!token) {
      return this.router.createUrlTree(['/auth/login']);
    }
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role && payload.role === 'admin') {
      return true;
    }
    // redirect non‑admin users to a safe page (e.g., order selection)
    return this.router.createUrlTree(['/order/device-select']);
  }
}
