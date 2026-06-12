import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PointTransaction {
  id: number;
  userId: number;
  points: number;
  type: 'earned' | 'redeemed';
  description: string;
  orderId?: number;
  createdAt: string;
}

export interface LoyaltyAccount {
  userId: number;
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalOrders: number;
  totalSpent: number;
  updatedAt: string;
  transactions: PointTransaction[];
  user?: {
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  private readonly apiUrl = '/api/loyalty';

  constructor(private http: HttpClient) {}

  getLoyaltyAccount(): Observable<LoyaltyAccount> {
    return this.http.get<LoyaltyAccount>(this.apiUrl);
  }

  redeemPoints(optionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/redeem`, { optionId });
  }
}
