import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AdminService, AdminUser } from '../services/admin.service';
import { SseService, SseEvent } from '../services/sse.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent implements OnInit {
  user: AdminUser | null = null;
  sidebarOpen = true;
  newOrderAlert: any = null;

  constructor(
    private adminService: AdminService,
    private sseService: SseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.adminService.getCurrentUser();
    
    this.sseService.connect().pipe(
      filter((e: SseEvent) => e.type === 'new-order')
    ).subscribe(event => {
      this.newOrderAlert = event.data;
      // Auto-hide after 5 seconds
      setTimeout(() => this.dismissAlert(), 5000);
    });
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
