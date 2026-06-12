import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  constructor(private http: HttpClient) {}

  diagnoseDevice(issueDescription: string, photos?: string[]): Observable<{ result: string }> {
    return this.http.post<{ result: string }>('/api/ai/diagnose', { issueDescription, photos });
  }

  supportChat(message: string): Observable<{ result: string }> {
    return this.http.post<{ result: string }>('/api/ai/chat', { message });
  }
}
