import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService, Wallet } from '../../services/wallet.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss'
})
export class WalletComponent implements OnInit {
  wallet: Wallet | null = null;
  isLoading = true;
  addAmount: number = 0;
  selectedPaymentMethod: string = 'card';

  // Mock payment gateway variables
  showPaymentModal = false;
  isProcessingPayment = false;

  constructor(
    private walletService: WalletService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadWallet();
  }

  async loadWallet() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      this.wallet = await firstValueFrom(this.walletService.getBalance());
    } catch (err) {
      console.error('Failed to load wallet', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openPaymentModal() {
    if (this.addAmount <= 0) return;
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.isProcessingPayment = false;
    this.cdr.detectChanges();
  }

  async confirmPayment() {
    this.isProcessingPayment = true;
    this.cdr.detectChanges();
    
    // Simulate network delay for Razorpay/Stripe processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      this.wallet = await firstValueFrom(this.walletService.addFunds(this.addAmount, 'razorpay'));
      this.closePaymentModal();
      this.addAmount = 50; // reset
    } catch (err) {
      console.error('Payment failed', err);
      this.isProcessingPayment = false;
    } finally {
      this.cdr.detectChanges();
    }
  }
}
