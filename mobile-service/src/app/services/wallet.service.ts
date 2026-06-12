import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WalletTransaction {
  id: number;
  walletId: number;
  amount: string;
  type: 'credit' | 'debit';
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface Wallet {
  id: number;
  userId: number;
  balance: string;
  currency: string;
  transactions: WalletTransaction[];
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  constructor(private http: HttpClient) {}

  getBalance(): Observable<Wallet> {
    return this.http.get<Wallet>('/api/wallet/balance');
  }

  addFunds(amount: number, paymentProvider: string = 'razorpay'): Observable<Wallet> {
    return this.http.post<Wallet>('/api/wallet/add-funds', { amount, paymentProvider });
  }

  payOrder(orderId: number, method: 'wallet' | 'cash' = 'wallet'): Observable<{ success: boolean, method: string, wallet?: Wallet }> {
    return this.http.post<{ success: boolean, method: string, wallet?: Wallet }>(`/api/wallet/pay-order/${orderId}`, { method });
  }
}
