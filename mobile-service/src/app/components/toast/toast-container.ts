import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast, ToastAction } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
})
export class ToastContainer implements OnInit, OnDestroy {
  toasts: (Toast & { visible: boolean })[] = [];
  private sub!: Subscription;

  constructor(private toastService: ToastService) {}

  private readonly PERSISTENT_TIMEOUT = 30000;

  ngOnInit() {
    this.sub = this.toastService.toasts$.subscribe((toast: Toast) => {
      const item = { ...toast, visible: true };
      this.toasts.push(item);
      const timeout = toast.persistent ? this.PERSISTENT_TIMEOUT : toast.duration;
      if (timeout > 0) {
        setTimeout(() => {
          const idx = this.toasts.indexOf(item);
          if (idx !== -1) {
            this.toasts[idx].visible = false;
            setTimeout(() => { this.toasts.splice(idx, 1); }, 300);
          }
        }, timeout);
      }
    });
  }

  onAction(toast: Toast & { visible: boolean }, action: ToastAction) {
    action.callback();
  }

  dismiss(toast: Toast & { visible: boolean }) {
    toast.visible = false;
    setTimeout(() => {
      const idx = this.toasts.indexOf(toast);
      if (idx !== -1) this.toasts.splice(idx, 1);
    }, 300);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
