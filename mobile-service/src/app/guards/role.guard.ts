import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const user = this.auth.getCurrentUser();
    if (!user) {
      return this.router.createUrlTree(['/auth/login']);
    }
    if (user.role === 'admin') {
      return true;
    }
    // redirect non‑admin users to a safe page (e.g., order selection)
    return this.router.createUrlTree(['/order/device-select']);
  }
}
