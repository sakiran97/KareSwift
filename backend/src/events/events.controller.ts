import { Controller, Sse, UnauthorizedException, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { merge, Observable, timer } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { EventsService, SseEvent } from './events.service';

@Controller('sse')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  @Sse('events')
  events(@Req() req: Request, @Res({ passthrough: true }) res: Response): Observable<MessageEvent> {
    res.setHeader('X-Accel-Buffering', 'no');
    const token = req.cookies && req.cookies['access_token'];
    
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    let user: { id: number; role: string };
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long'
      });
      user = { id: payload.sub, role: payload.role || 'customer' };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return merge(
      this.eventsService.events$.pipe(
        filter((event: SseEvent) => {
          if (event.type === 'notification') {
            return event.data?.targetUserId === user.id;
          }
          if (event.type === 'kyc-status-update') {
            return event.data?.userId === user.id;
          }
          if (event.type === 'order-available') {
            if (user.role !== 'technician') return false;
            // If targetTechnicianIds list exists, gate it
            if (event.data?.targetTechnicianIds) {
              return event.data.targetTechnicianIds.includes(user.id);
            }
            return true;
          }
          if (event.type === 'order-accepted') {
            return user.role === 'technician' || event.data?.userId === user.id;
          }
          if (event.type === 'order-update') {
            return user.role === 'admin' || event.data?.userId === user.id || event.data?.technicianId === user.id;
          }
          if (event.type === 'chat-message') {
            return event.data?.order?.userId === user.id || event.data?.order?.technicianId === user.id;
          }
          if (event.type === 'new-technician-pending') {
            return user.role === 'admin';
          }
          if (event.type === 'completion-requested') {
            return true; // Let everyone get it for now, or filter by order.userId if available
          }
          return true;
        }),
        map((event: SseEvent) => ({
          data: JSON.stringify({ ...event, userId: user.id, userRole: user.role }),
        } as MessageEvent)),
      ),
      timer(30000, 30000).pipe(
        map(() => ({
          data: JSON.stringify({ type: 'keepalive', timestamp: new Date().toISOString() }),
        } as MessageEvent)),
      ),
    );
  }
}
