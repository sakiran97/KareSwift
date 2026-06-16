import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';

export interface SseEvent {
  type: 'new-order' | 'order-update' | 'order-available' | 'order-accepted' | 'chat-message' | 'notification' | 'kyc-status-update' | 'new-technician-pending' | 'completion-requested' | 'config-updated';
  data: any;
  timestamp: string;
  sourceServer?: string;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private eventSubject = new Subject<SseEvent>();
  private publisher: Redis;
  private subscriber: Redis;
  private serverId = randomUUID();

  constructor() {
    const redisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.warn('[Redis] Connection failed. Using local in-memory events only.');
          return null; // Stop retrying to prevent crashing
        }
        return Math.min(times * 100, 2000);
      },
      maxRetriesPerRequest: null,
    };

    this.publisher = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);

    this.publisher.on('error', () => { /* Suppress unhandled error crash */ });
    this.subscriber.on('error', () => { /* Suppress unhandled error crash */ });
  }

  onModuleInit() {
    this.subscriber.subscribe('sse-events', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to Redis sse-events channel. Local events will still work.', err);
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'sse-events') {
        try {
          const event = JSON.parse(message) as SseEvent;
          // Only process events from OTHER servers
          if (event.sourceServer !== this.serverId) {
            this.eventSubject.next(event);
          }
        } catch (e) {
          this.logger.error('Failed to parse SSE event from Redis:', e);
        }
      }
    });
  }

  onModuleDestroy() {
    this.publisher.quit();
    this.subscriber.quit();
  }

  emit(type: SseEvent['type'], data: any) {
    const event: SseEvent = { type, data, timestamp: new Date().toISOString(), sourceServer: this.serverId };
    
    // 1. ALWAYS emit locally first (instant for connected clients on this server)
    this.eventSubject.next(event);

    // 2. Publish to Redis for OTHER servers in a multi-instance setup
    if (this.publisher.status === 'ready') {
      this.publisher.publish('sse-events', JSON.stringify(event)).catch(() => {
        // Ignore publish errors, local delivery already happened
      });
    }
  }

  get events$() {
    return this.eventSubject.asObservable();
  }

  getRedisStatus(): string {
    return this.publisher.status;
  }

  async getCache(key: string): Promise<string | null> {
    if (this.publisher.status === 'ready') {
      return await this.publisher.get(key);
    }
    return null;
  }

  async setCache(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.publisher.status === 'ready') {
      await this.publisher.setex(key, ttlSeconds, value);
    }
  }
}
