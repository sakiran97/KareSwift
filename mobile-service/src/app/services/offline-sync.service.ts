import { Injectable } from '@angular/core';
import { Network, ConnectionStatus } from '@capacitor/network';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';

export interface SyncRequest {
  id: number;
  url: string;
  method: string;
  body: string;
  headers: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private sqlite: SQLiteConnection;
  private db!: SQLiteDBConnection;
  private isOnline$ = new BehaviorSubject<boolean>(true);

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initNetworkMonitoring();
    this.initDatabase();
  }

  get isOnline() {
    return this.isOnline$.asObservable();
  }

  private async initNetworkMonitoring() {
    const status = await Network.getStatus();
    this.isOnline$.next(status.connected);

    Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      console.log('Network status changed', status);
      this.isOnline$.next(status.connected);
      
      if (status.connected) {
        this.processSyncQueue();
      }
    });
  }

  private async initDatabase() {
    try {
      this.db = await this.sqlite.createConnection('offline_sync', false, 'no-encryption', 1, false);
      await this.db.open();
      
      const schema = `
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          method TEXT NOT NULL,
          body TEXT,
          headers TEXT,
          createdAt INTEGER NOT NULL
        );
      `;
      await this.db.execute(schema);
      console.log('Offline SQLite DB Initialized');
    } catch (err) {
      console.error('Failed to initialize offline database', err);
    }
  }

  async queueRequest(url: string, method: string, body: any, headers: any): Promise<void> {
    const timestamp = Date.now();
    const query = `INSERT INTO sync_queue (url, method, body, headers, createdAt) VALUES (?, ?, ?, ?, ?)`;
    const values = [url, method, JSON.stringify(body), JSON.stringify(headers), timestamp];
    
    await this.db.run(query, values);
    console.log(`Queued ${method} request for ${url} locally.`);
  }

  private async processSyncQueue() {
    if (!this.db) return;

    try {
      const res = await this.db.query('SELECT * FROM sync_queue ORDER BY createdAt ASC');
      const queue: SyncRequest[] = res.values || [];

      if (queue.length === 0) return;
      console.log(`Processing ${queue.length} offline requests...`);

      for (const req of queue) {
        try {
          // Perform the actual HTTP fetch replay
          const response = await fetch(req.url, {
            method: req.method,
            headers: JSON.parse(req.headers || '{}'),
            body: req.body ? req.body : undefined
          });

          if (response.ok) {
            // Remove from queue if successful
            await this.db.run('DELETE FROM sync_queue WHERE id = ?', [req.id]);
            console.log(`Successfully synced offline request to ${req.url}`);
          }
        } catch (fetchErr) {
          console.error(`Failed to sync queued request to ${req.url}, will retry later`, fetchErr);
          // Stop processing if we hit another network error, wait for next network event
          break;
        }
      }
    } catch (err) {
      console.error('Error processing sync queue', err);
    }
  }
}
