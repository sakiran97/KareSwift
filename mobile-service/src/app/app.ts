import { Component, signal, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { ToastContainer } from './components/toast/toast-container';
import { AiAssistantComponent } from './shared/ai-assistant/ai-assistant';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, ToastContainer, AiAssistantComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('mobile-service');
  
  private timeoutId: any;
  private readonly INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutes
  
  private authService = inject(AuthService);
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
