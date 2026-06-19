import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AdminService, AdminUser } from '../services/admin.service';
import { SseService, SseEvent } from '../services/sse.service';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent implements OnInit {
  user: AdminUser | null = null;
  sidebarOpen = typeof window !== 'undefined' ? window.innerWidth > 1024 : true;
  newOrderAlert: any = null;

  isNotificationOpen = false;
  notifications: any[] = [];
  unreadNotificationsCount = 0;

  constructor(
    private adminService: AdminService,
    private sseService: SseService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.user = this.adminService.getCurrentUser();
    
    this.sseService.connect().pipe(
      filter((e: SseEvent) => e.type === 'new-order' || e.type === 'notification')
    ).subscribe(event => {
      if (event.type === 'new-order') {
        this.newOrderAlert = event.data;
        setTimeout(() => this.dismissAlert(), 5000);
      } else if (event.type === 'notification') {
        if (!this.notifications.some(n => n.id === event.data.id)) {
          this.notifications.unshift(event.data);
          this.unreadNotificationsCount++;
          this.cdr.detectChanges();
        }
      }
    });

    this.loadNotifications();
  }

  loadNotifications() {
    this.http.get<any[]>('/api/notifications').subscribe({
      next: (res: any) => {
        this.notifications = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
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

  clearNotification(note: any, event: Event) {
    event.stopPropagation();
    this.http.delete(`/api/notifications/${note.id}`).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== note.id);
        this.unreadNotificationsCount = this.notifications.filter(n => !n.isRead).length;
        this.cdr.detectChanges();
      }
    });
  }

  clearAllNotifications(event: Event) {
    event.stopPropagation();
    this.http.delete('/api/notifications/clear-all').subscribe({
      next: () => {
        this.notifications = [];
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
      this.router.navigate(['/admin/orders']);
    }
  }

  dismissAlert() {
    this.newOrderAlert = null;
  }

  logout() {
    this.adminService.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
