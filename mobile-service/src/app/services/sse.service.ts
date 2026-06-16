import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface SseEvent {
  type: 'new-order' | 'order-update' | 'order-available' | 'order-accepted' | 'chat-message' | 'notification' | 'keepalive' | 'new-technician-pending' | 'completion-requested' | 'config-updated';
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
    if (!this.shared$ || !this.eventSource) {
      this.establishConnection();
    }
    return this.shared$ || (this.shared$ = this.eventSubject.asObservable());
  }

  private establishConnection(retryCount = 0) {
    this.zone.runOutsideAngular(() => {
      this.eventSource = new EventSource(`/api/sse/events`, { withCredentials: true });

      this.eventSource.onmessage = (event) => {
        // Reset retry count on successful message reception
        retryCount = 0;
        this.zone.run(() => {
          try {
            const parsed: SseEvent = JSON.parse(event.data);
            if (parsed.type !== 'keepalive') {
              this.eventSubject.next(parsed);
            }
          } catch {}
        });
      };

      this.eventSource.onerror = (error) => {
        this.eventSource?.close();
        
        // Exponential backoff
        const timeout = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setTimeout(() => {
          if (this.shared$) { // Only reconnect if still subscribed
            this.establishConnection(retryCount + 1);
          }
        }, timeout);
      };
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