import { Component, signal, OnInit, OnDestroy, NgZone, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Location } from '@angular/common';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
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
  private location = inject(Location);

  private readonly resetEvents = ['mousemove', 'keydown', 'wheel', 'touchstart'];
  private resetTimeoutBound = this.resetTimeout.bind(this);

  constructor() {
    // Handle global SSE notifications based on login state
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.sseService.connect().pipe(
          filter((e: SseEvent) => e.type === 'notification')
        ).subscribe((event: any) => {
          if (event.data && event.data.title && event.data.body) {
            // Show in-app toast
            this.toastService.show(`${event.data.title}: ${event.data.body}`, 'info', 6000);
            
            // Trigger native device push notification
            LocalNotifications.schedule({
              notifications: [
                {
                  title: event.data.title,
                  body: event.data.body,
                  id: Math.floor(Math.random() * 1000000),
                  schedule: { at: new Date(Date.now() + 100) },
                  actionTypeId: ""
                }
              ]
            });
          }
        });
      } else {
        this.sseService.disconnect();
      }
    });
  }

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      this.resetEvents.forEach(event => {
        window.addEventListener(event, this.resetTimeoutBound, { passive: true });
      });
    });
    this.resetTimeout();

    // Register Capacitor Hardware Back Button listener
    CapApp.addListener('backButton', ({ canGoBack }) => {
      this.ngZone.run(() => {
        if (canGoBack) {
          this.location.back();
        } else {
          CapApp.exitApp();
        }
      });
    });

    // Request permissions for Local Notifications
    LocalNotifications.requestPermissions();

    // Network Status Monitoring
    Network.addListener('networkStatusChange', status => {
      this.ngZone.run(() => {
        if (!status.connected) {
          this.toastService.show('You are offline. Please check your internet connection.', 'error', 10000);
        } else {
          // If we reconnect, show success message and refresh SSE if logged in
          this.toastService.show('Back online!', 'success', 3000);
          if (this.authService.isLoggedIn()) {
            this.sseService.connect();
          }
        }
      });
    });

    // Check initial status
    Network.getStatus().then(status => {
      if (!status.connected) {
        this.toastService.show('You are offline. Please check your internet connection.', 'error', 10000);
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
