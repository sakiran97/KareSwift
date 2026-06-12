import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SseService, SseEvent } from '../../services/sse.service';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit, OnDestroy {
  isMenuOpen = false;
  newOrdersCount = 0;
  isScrolled = false;

  // Notifications state
  isNotificationOpen = false;
  notifications: any[] = [];
  unreadNotificationsCount = 0;

  private sseSub?: Subscription;

  constructor(
    private sse: SseService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.refreshNewOrdersCount();
    if (this.isLoggedIn()) {
      this.loadNotifications();
    }
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.sseSub = this.sse.connect().subscribe({
      next: (event: SseEvent) => {
        if (event.type === 'order-available') {
          this.newOrdersCount++;
          this.cdr.detectChanges();
        }
        if (event.type === 'order-accepted') {
          this.newOrdersCount = Math.max(0, this.newOrdersCount - 1);
          this.cdr.detectChanges();
        }
        if (event.type === 'notification') {
          const currentUser = this.getCurrentUser();
          if (currentUser && event.data.userId === currentUser.id) {
            if (!this.notifications.some(n => n.id === event.data.id)) {
              this.notifications.unshift(event.data);
              this.unreadNotificationsCount++;
              this.cdr.detectChanges();
            }
          }
        }
        if (event.type === 'new-technician-pending') {
          const tech = event.data;
          const alertMsg = `New technician registered: ${tech.name || tech.email} (${tech.technicianId || 'N/A'})`;
          alert(alertMsg);
          this.cdr.detectChanges();
        }
      },
    });
  }

  getCurrentUser(): any {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  loadNotifications() {
    this.http.get<any[]>('/api/notifications').subscribe({
      next: (res: any[]) => {
        this.notifications = res || [];
        this.unreadNotificationsCount = this.notifications.filter(n => !n.isRead).length;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Failed to load notifications', err)
    });
  }

  toggleNotifications() {
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) {
      this.loadNotifications();
    }
    this.cdr.detectChanges();
  }

  markNotificationRead(note: any, event: Event) {
    event.stopPropagation();
    this.http.patch(`/api/notifications/${note.id}/read`, {}).subscribe({
      next: () => {
        note.isRead = true;
        this.unreadNotificationsCount = Math.max(0, this.unreadNotificationsCount - 1);
        this.cdr.detectChanges();
      }
    });
  }

  markAllNotificationsRead() {
    this.http.patch('/api/notifications/read-all', {}).subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.unreadNotificationsCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  handleNotificationClick(note: any) {
    if (!note.isRead) {
      this.http.patch(`/api/notifications/${note.id}/read`, {}).subscribe({
        next: () => {
          note.isRead = true;
          this.unreadNotificationsCount = Math.max(0, this.unreadNotificationsCount - 1);
          this.cdr.detectChanges();
        }
      });
    }

    this.isNotificationOpen = false;
    this.cdr.detectChanges();

    if (note.orderId) {
      if (note.type === 'chat') {
        this.router.navigate(['/order/chat', note.orderId]);
      } else {
        const role = this.getUserRole();
        if (role === 'technician') {
          this.router.navigate(['/technician/orders', note.orderId]);
        } else {
          this.router.navigate(['/order/track', note.orderId]);
        }
      }
    }
  }

  private refreshNewOrdersCount() {
    const role = this.getUserRole();
    if (role !== 'technician' && role !== 'admin') return;
    this.http.get('/api/technician/orders/available').subscribe({
      next: (res: any) => {
        this.newOrdersCount = (res || []).length;
        this.cdr.detectChanges();
      },
    });
  }

  getDisplayCount(): string {
    return this.newOrdersCount > 9 ? '9+' : String(this.newOrdersCount);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('jwt') !== null;
  }

  private onScroll = () => {
    this.isScrolled = window.scrollY > 20;
    this.cdr.detectChanges();
  };

  getUserRole(): string | null {
    const token = localStorage.getItem('jwt');
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])).role || null;
    } catch {
      return null;
    }
  }

  isTechnician(): boolean {
    return this.getUserRole() === 'technician';
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  isCustomer(): boolean {
    const role = this.getUserRole();
    return role === 'customer' || role === null;
  }

  logout(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    localStorage.removeItem('activeOrderId');
    localStorage.removeItem('selectedDeviceCategory');
    this.closeMenu();
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
  }
}
