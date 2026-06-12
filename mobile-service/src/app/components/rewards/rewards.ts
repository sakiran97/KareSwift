import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoyaltyService, LoyaltyAccount } from '../../services/loyalty.service';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rewards.html',
  styleUrl: './rewards.scss'
})
export class Rewards implements OnInit {
  account: LoyaltyAccount | null = null;
  loading = true;
  error = '';
  
  // Redeem state
  redeemLoadingOptionId: string | null = null;
  redeemedCode = '';
  redeemedLabel = '';

  rewardOptions = [
    { id: 'option-1', points: 100, label: '₹100 Off Repair Coupon', description: 'Redeem 100 points for a ₹100 discount code on your next repair.' },
    { id: 'option-2', points: 300, label: 'Free Screen Guard / Charging Cable', description: 'Get a free premium tempered glass or braided cable at your doorstep.' },
    { id: 'option-3', points: 500, label: '₹600 Off Repair Coupon', description: 'Save big! Redeem 500 points for a ₹600 discount code.' },
  ];

  constructor(
    private loyaltyService: LoyaltyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadLoyaltyAccount();
  }

  loadLoyaltyAccount() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.loyaltyService.getLoyaltyAccount().subscribe({
      next: (res: LoyaltyAccount) => {
        this.account = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load loyalty account', err);
        this.error = 'Failed to load rewards account. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPointsToNextTier(): number {
    if (!this.account) return 0;
    const pts = this.account.points;
    if (pts < 500) return 500 - pts;
    if (pts < 2000) return 2000 - pts;
    if (pts < 5000) return 5000 - pts;
    return 0;
  }

  getNextTierName(): string {
    if (!this.account) return '';
    const tier = this.account.tier;
    if (tier === 'Bronze') return 'Silver';
    if (tier === 'Silver') return 'Gold';
    if (tier === 'Gold') return 'Platinum';
    return 'Platinum';
  }

  getTierProgressPercentage(): number {
    if (!this.account) return 0;
    const pts = this.account.points;
    if (pts < 500) return Math.round((pts / 500) * 100);
    if (pts < 2000) return Math.round(((pts - 500) / 1500) * 100);
    if (pts < 5000) return Math.round(((pts - 2000) / 3000) * 100);
    return 100;
  }

  getTierColor(tier?: string): string {
    const t = tier || this.account?.tier || 'Bronze';
    if (t === 'Platinum') return 'linear-gradient(135deg, #e5e9f0 0%, #a3be8c 100%)';
    if (t === 'Gold') return 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)';
    if (t === 'Silver') return 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)';
    return 'linear-gradient(135deg, #cd7f32 0%, #8b4513 100%)'; // Bronze
  }

  redeem(optionId: string, label: string) {
    if (this.redeemLoadingOptionId) return;
    this.redeemLoadingOptionId = optionId;
    this.error = '';
    this.redeemedCode = '';
    this.cdr.detectChanges();

    this.loyaltyService.redeemPoints(optionId).subscribe({
      next: (res: any) => {
        this.redeemLoadingOptionId = null;
        this.redeemedCode = res.promoCode;
        this.redeemedLabel = label;
        this.loadLoyaltyAccount(); // reload points and tier
      },
      error: (err: any) => {
        console.error('Redemption failed', err);
        this.error = err.error?.message || 'Points redemption failed. Please try again.';
        this.redeemLoadingOptionId = null;
        this.cdr.detectChanges();
      }
    });
  }

  dismissSuccess() {
    this.redeemedCode = '';
    this.redeemedLabel = '';
    this.cdr.detectChanges();
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Promo code copied to clipboard!');
    });
  }
}
