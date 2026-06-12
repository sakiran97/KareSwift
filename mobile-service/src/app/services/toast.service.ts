import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface ToastAction {
  label: string;
  callback: () => void;
}

export interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration: number;
  persistent?: boolean;
  actions?: ToastAction[];
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  private nextId = 1;

  show(message: string, type: Toast['type'] = 'info', duration = 5000) {
    this.toastSubject.next({ id: this.nextId++, message, type, duration });
  }

  notify(message: string, type: Toast['type'] = 'info', actions?: ToastAction[]) {
    this.toastSubject.next({ id: this.nextId++, message, type, duration: 0, persistent: true, actions });
  }

  get toasts$(): Observable<Toast> {
    return this.toastSubject.asObservable();
  }
}
