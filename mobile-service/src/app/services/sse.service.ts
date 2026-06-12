import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface SseEvent {
  type: 'new-order' | 'order-update' | 'order-available' | 'order-accepted' | 'chat-message' | 'notification' | 'keepalive' | 'new-technician-pending' | 'completion-requested';
  data: any;
  timestamp: string;
  userId?: number;
  userRole?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SseService implements OnDestroy {
  private eventSubject = new Subject<SseEvent>();
  private eventSource: EventSource | null = null;
  private shared$: Observable<SseEvent> | null = null;

  constructor(private zone: NgZone) {}

  connect(): Observable<SseEvent> {
    if (!this.shared$ || (!this.eventSource && localStorage.getItem('jwt'))) {
      this.establishConnection();
    }
    return this.shared$ || (this.shared$ = this.eventSubject.asObservable());
  }

  private establishConnection() {
    const token = localStorage.getItem('jwt');
    if (!token) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.eventSource = new EventSource(`/api/sse/events?token=${encodeURIComponent(token)}`);

      this.eventSource.onmessage = (event) => {
        this.zone.run(() => {
          try {
            const parsed: SseEvent = JSON.parse(event.data);
            if (parsed.type !== 'keepalive') {
              this.eventSubject.next(parsed);
            }
          } catch {}
        });
      };

      // EventSource auto-reconnects on transient errors; no action needed here
    });
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
    this.shared$ = null;
  }

  ngOnDestroy() {
    this.disconnect();
    this.eventSubject.complete();
  }
}