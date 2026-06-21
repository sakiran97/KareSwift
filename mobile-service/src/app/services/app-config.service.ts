import { Injectable, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SseService, SseEvent } from './sse.service';
import { AuthService } from './auth.service';
import { catchError, filter } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  // Store all configs in a signal dictionary
  public config = signal<Record<string, string>>({});

  constructor(
    private http: HttpClient, 
    private sseService: SseService,
    private authService: AuthService
  ) {
    this.listenToConfigUpdates();
  }

  loadConfig(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<any[]>('/api/config').pipe(
        catchError(err => {
          console.warn('Failed to load app config:', err);
          return of([]);
        })
      ).subscribe((configs: any[]) => {
        const configMap: Record<string, string> = {};
        configs.forEach((c: any) => {
          configMap[c.key] = c.value;
        });
        this.config.set(configMap);
        resolve();
      });
    });
  }

  private listenToConfigUpdates() {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.sseService.connect().pipe(
          filter((event: any) => event.type === 'config-updated')
        ).subscribe((event: SseEvent) => {
          const data = event.data;
          if (data && data.key && data.value) {
            this.config.update(current => ({
              ...current,
              [data.key]: data.value
            }));
            console.log(`Config updated via SSE: ${data.key} = ${data.value}`);
          }
        });
      }
    });
  }

  get(key: string, defaultValue: string = ''): string {
    return this.config()[key] ?? defaultValue;
  }

  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const val = this.config()[key];
    if (val === undefined) return defaultValue;
    return val === 'true';
  }

  getNumber(key: string, defaultValue: number = 0): number {
    const val = this.config()[key];
    if (val === undefined) return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }
}
