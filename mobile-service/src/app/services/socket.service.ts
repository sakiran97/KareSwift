import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  // Socket.IO is deprecated in favor of SSE for real-time updates.
  // Backend does not have a Socket.IO server installed.
  // All real-time functionality is handled by SseService.
  // See: SseService, track-order.ts, technician-dashboard.ts
}
