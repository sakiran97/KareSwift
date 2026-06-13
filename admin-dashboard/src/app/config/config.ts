import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';

interface ConfigItem {
  key: string;
  value: string;
  description: string | null;
  pendingValue?: string; // used for tracking unsaved updates
}

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config.html',
  styleUrl: './config.scss'
})
export class ConfigComponent implements OnInit {
  configs = signal<ConfigItem[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  
  savingKey = signal<string | null>(null);

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.fetchConfig();
  }

  fetchConfig() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.adminService.getConfig().subscribe({
      next: (res) => {
        const items = res.map((item) => ({
          ...item,
          pendingValue: item.value
        }));
        this.configs.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Failed to retrieve system settings.');
        this.loading.set(false);
      }
    });
  }

  isBooleanKey(key: string): boolean {
    return ['booking_enabled', 'same_day_booking', 'upi_enabled', 'cash_enabled', 'qr_enabled', 'review_mandatory'].includes(key);
  }

  isNumericKey(key: string): boolean {
    return ['max_bookings_per_day'].includes(key);
  }

  getBooleanValue(item: ConfigItem): boolean {
    return item.pendingValue === 'true';
  }

  setBooleanValue(item: ConfigItem, val: boolean) {
    item.pendingValue = val ? 'true' : 'false';
  }

  saveItem(item: ConfigItem) {
    if (item.pendingValue === undefined || item.pendingValue === item.value) return;

    // Validate inputs
    if (this.isNumericKey(item.key)) {
      const numVal = Number(item.pendingValue);
      if (isNaN(numVal) || numVal <= 0 || !Number.isInteger(numVal)) {
        this.errorMsg.set(`Invalid value for ${item.key}. Must be a positive integer.`);
        return;
      }
    } else if (item.key === 'qr_image_url') {
      if (!item.pendingValue.trim()) {
        this.errorMsg.set(`Invalid value for ${item.key}. Cannot be empty.`);
        return;
      }
    } else if (this.isBooleanKey(item.key)) {
      if (item.pendingValue !== 'true' && item.pendingValue !== 'false') {
        this.errorMsg.set(`Invalid value for ${item.key}. Must be a boolean (true/false).`);
        return;
      }
    }

    this.savingKey.set(item.key);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.adminService.updateConfig(item.key, item.pendingValue).subscribe({
      next: (res) => {
        item.value = res.value;
        this.savingKey.set(null);
        this.successMsg.set(`Setting '${item.key}' updated successfully to ${res.value}.`);
      },
      error: (err) => {
        this.savingKey.set(null);
        this.errorMsg.set(err.error?.message || `Failed to update settings for ${item.key}.`);
      }
    });
  }

  resetItem(item: ConfigItem) {
    item.pendingValue = item.value;
  }
}
