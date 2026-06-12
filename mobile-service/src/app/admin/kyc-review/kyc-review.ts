import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-kyc-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kyc-review.html',
  styleUrl: './kyc-review.scss'
})
export class KycReviewComponent implements OnInit {
  pendingList = signal<any[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  selectedTech = signal<any | null>(null);
  rejectReason = '';
  showRejectModal = signal(false);
  actionLoading = signal(false);

  zoomImgUrl = signal<string | null>(null);

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.fetchPendingList();
  }

  fetchPendingList() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.adminService.getPendingKyc().subscribe({
      next: (res: any[]) => {
        this.pendingList.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMsg.set('Failed to retrieve pending KYC reviews.');
        this.loading.set(false);
      }
    });
  }

  selectTechnician(tech: any) {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.adminService.getKycDetails(tech.userId).subscribe({
      next: (res: any) => {
        this.selectedTech.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMsg.set('Failed to fetch full details for technician.');
        this.loading.set(false);
      }
    });
  }

  approve() {
    const tech = this.selectedTech();
    if (!tech) return;

    this.actionLoading.set(true);
    this.adminService.approveKyc(tech.userId).subscribe({
      next: (res: any) => {
        this.actionLoading.set(false);
        this.successMsg.set(`KYC for ${tech.user?.name || 'Technician'} approved successfully.`);
        this.selectedTech.set(null);
        this.fetchPendingList();
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to approve KYC.');
      }
    });
  }

  openRejectModal() {
    this.rejectReason = '';
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
  }

  reject() {
    const tech = this.selectedTech();
    if (!tech || !this.rejectReason.trim()) return;

    this.actionLoading.set(true);
    this.adminService.rejectKyc(tech.userId, this.rejectReason.trim()).subscribe({
      next: (res: any) => {
        this.actionLoading.set(false);
        this.showRejectModal.set(false);
        this.successMsg.set(`KYC for ${tech.user?.name || 'Technician'} has been rejected.`);
        this.selectedTech.set(null);
        this.fetchPendingList();
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to reject KYC.');
      }
    });
  }

  zoomImage(url: string | null) {
    if (url) {
      this.zoomImgUrl.set(url);
    }
  }

  closeZoom() {
    this.zoomImgUrl.set(null);
  }

  deselect() {
    this.selectedTech.set(null);
    this.successMsg.set(null);
    this.errorMsg.set(null);
  }
}
