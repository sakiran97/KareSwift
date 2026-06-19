import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (typeof window === 'undefined') {
      return true;
    }
    const user = this.auth.getCurrentUser();
    if (!user) {
      return this.router.createUrlTree(['/auth/login']);
    }
    return true;
  }
}
