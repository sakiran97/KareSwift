import { Component, signal, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { ToastContainer } from './components/toast/toast-container';
import { AiAssistantComponent } from './shared/ai-assistant/ai-assistant';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';
import { LocationService } from './services/location.service';
import { LocationModal } from './shared/location-modal/location-modal';
import { SseService, SseEvent } from './services/sse.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, ToastContainer, AiAssistantComponent, LocationModal, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('mobile-service');
  
  private timeoutId: any;
  private readonly INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutes
  
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private sseService = inject(SseService);
  public locationService = inject(LocationService);
  
  showLocationModal = false;
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private readonly resetEvents = ['mousemove', 'keydown', 'wheel', 'touchstart'];
  private resetTimeoutBound = this.resetTimeout.bind(this);

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      this.resetEvents.forEach(event => {
        window.addEventListener(event, this.resetTimeoutBound, { passive: true });
      });
    });
    this.resetTimeout();

    // Listen to global notifications
    this.sseService.connect().pipe(
      filter((e: SseEvent) => e.type === 'notification')
    ).subscribe((event: any) => {
      if (event.data && event.data.title && event.data.body) {
        this.toastService.show(`${event.data.title}: ${event.data.body}`, 'info', 6000);
      }
    });

    // Auto popup location modal if no location is set and user is logged in
    setTimeout(() => {
      if (this.authService.isLoggedIn() && !this.locationService.currentLocation()) {
        this.showLocationModal = true;
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.resetEvents.forEach(event => {
      window.removeEventListener(event, this.resetTimeoutBound);
    });
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private resetTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.authService.isLoggedIn()) {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        });
      }, this.INACTIVITY_TIME);
    });
  }
}
