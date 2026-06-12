import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TechnicianKycService, KycStatusResponse } from '../../services/technician.service';
import { SseService } from '../../services/sse.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-verification-pending',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './verification-pending.html',
  styleUrl: './verification-pending.scss',
})
export class VerificationPending implements OnInit, OnDestroy {
  status: KycStatusResponse | null = null;
  loading = true;
  submittingKyc = false;
  submittingShop = false;
  showKycForm = false;
  showShopForm = false;

  kycForm: FormGroup;
  shopForm: FormGroup;

  // File uploading states
  govtIdFrontUploading = false;
  govtIdFrontName = '';
  govtIdBackUploading = false;
  govtIdBackName = '';
  shopPhotosUploading = false;
  shopPhotosName = '';

  // Aadhaar OTP verification states
  isAadhaarOtpVerified = false;
  aadhaarOtpSent = false;
  aadhaarDevOtp = '';
  aadhaarOtpLoading = false;

  private sseSub?: Subscription;

  constructor(
    private kycService: TechnicianKycService,
    private sseService: SseService,
    private toast: ToastService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.kycForm = this.fb.group({
      govtIdType: ['aadhaar', Validators.required],
      govtIdNumber: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      govtIdFrontUrl: ['', Validators.required],
      govtIdBackUrl: [''],
    });

    this.shopForm = this.fb.group({
      shopName: ['', Validators.required],
      shopAddress: ['', Validators.required],
      shopLatitude: [null],
      shopLongitude: [null],
      shopPhotos: [['']],
    });
  }

  ngOnInit(): void {
    this.loadStatus();
    this.setupSse();
  }

  loadStatus(): void {
    this.loading = true;
    this.kycService.getKycStatus().subscribe({
      next: (res: KycStatusResponse) => {
        this.status = res;
        this.loading = false;
        this.cdr.detectChanges();

        // Redirect automatically if fully approved and verified
        if (res.kycStatus === 'approved' && res.shopVerified) {
          this.toast.show('Verification complete! Redirecting...', 'success', 4000);
          this.router.navigate(['/technician/dashboard']);
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setupSse(): void {
    this.sseSub = this.sseService.connect().subscribe({
      next: (event: any) => {
        if (event.type === 'kyc-status-update') {
          this.toast.show(event.data?.message || 'Verification status updated!', 'info', 5000);
          this.loadStatus();
        }
      }
    });
  }

  onIdTypeChange(): void {
    const type = this.kycForm.get('govtIdType')?.value;
    const numberCtrl = this.kycForm.get('govtIdNumber');
    numberCtrl?.clearValidators();
    numberCtrl?.setValidators([Validators.required]);

    if (type === 'aadhaar') {
      numberCtrl?.setValidators([Validators.required, Validators.pattern(/^\d{12}$/)]);
    } else if (type === 'pan') {
      numberCtrl?.setValidators([Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]);
    } else {
      numberCtrl?.setValidators([Validators.required, Validators.minLength(5)]);
    }
    numberCtrl?.updateValueAndValidity();

    // Reset Aadhaar OTP state and clean up previous file selections when type changes
    this.isAadhaarOtpVerified = false;
    this.aadhaarOtpSent = false;
    this.aadhaarDevOtp = '';
    this.govtIdFrontName = '';
    this.govtIdBackName = '';

    this.kycForm.patchValue({
      govtIdNumber: '',
      govtIdFrontUrl: '',
      govtIdBackUrl: '',
    });
    this.cdr.detectChanges();
  }

  submitKyc(): void {
    if (this.kycForm.invalid) {
      this.kycForm.markAllAsTouched();
      return;
    }

    this.submittingKyc = true;
    const formVal = this.kycForm.value;
    const payload: any = {
      govtIdType: formVal.govtIdType,
      govtIdNumber: formVal.govtIdNumber,
      govtIdFrontUrl: formVal.govtIdFrontUrl,
      govtIdBackUrl: formVal.govtIdBackUrl || undefined,
    };

    if (formVal.govtIdType === 'aadhaar') {
      payload.aadhaarNumber = formVal.govtIdNumber;
    } else if (formVal.govtIdType === 'pan') {
      payload.panNumber = formVal.govtIdNumber;
    }

    this.kycService.uploadKycDocuments(payload).subscribe({
      next: () => {
        this.submittingKyc = false;
        this.showKycForm = false;
        this.toast.show('KYC documents submitted successfully', 'success', 5000);
        this.loadStatus();
      },
      error: (err: any) => {
        this.submittingKyc = false;
        const msg = err.error?.message || 'Failed to submit KYC documents';
        this.toast.show(msg, 'error', 5000);
        this.cdr.detectChanges();
      }
    });
  }

  captureLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.shopForm.patchValue({
            shopLatitude: pos.coords.latitude,
            shopLongitude: pos.coords.longitude,
          });
          this.toast.show('GPS Location captured successfully!', 'success', 3000);
          this.cdr.detectChanges();
        },
        () => {
          this.toast.show('Could not access your location. Please check browser permissions.', 'error', 4000);
        }
      );
    }
  }

  submitShop(): void {
    if (this.shopForm.invalid) {
      this.shopForm.markAllAsTouched();
      return;
    }

    this.submittingShop = true;
    const formVal = this.shopForm.value;
    
    const photos = formVal.shopPhotos
      ? (Array.isArray(formVal.shopPhotos) ? formVal.shopPhotos : [formVal.shopPhotos])
      : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400'];

    this.kycService.uploadShopDetails({
      shopName: formVal.shopName,
      shopAddress: formVal.shopAddress,
      shopLatitude: formVal.shopLatitude || undefined,
      shopLongitude: formVal.shopLongitude || undefined,
      shopPhotos: photos,
    }).subscribe({
      next: () => {
        this.submittingShop = false;
        this.showShopForm = false;
        this.toast.show('Shop details submitted successfully', 'success', 5000);
        this.loadStatus();
      },
      error: (err: any) => {
        this.submittingShop = false;
        const msg = err.error?.message || 'Failed to submit shop details';
        this.toast.show(msg, 'error', 5000);
        this.cdr.detectChanges();
      }
    });
  }

  // ─── File Upload Handler ──────────────────────────────────
  onFileSelected(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      this.toast.show('Only PDF, JPG, JPEG, and PNG files are allowed.', 'error', 4000);
      input.value = '';
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      this.toast.show('File size exceeds 10MB limit.', 'error', 4000);
      input.value = '';
      return;
    }

    // Set uploading state
    if (controlName === 'govtIdFrontUrl') {
      this.govtIdFrontUploading = true;
      this.govtIdFrontName = '';
    } else if (controlName === 'govtIdBackUrl') {
      this.govtIdBackUploading = true;
      this.govtIdBackName = '';
    } else if (controlName === 'shopPhotos') {
      this.shopPhotosUploading = true;
      this.shopPhotosName = '';
    }

    this.kycService.uploadFile(file).subscribe({
      next: (res: { url: string }) => {
        if (controlName === 'govtIdFrontUrl') {
          this.govtIdFrontUploading = false;
          this.govtIdFrontName = file.name;
          this.kycForm.patchValue({ govtIdFrontUrl: res.url });
        } else if (controlName === 'govtIdBackUrl') {
          this.govtIdBackUploading = false;
          this.govtIdBackName = file.name;
          this.kycForm.patchValue({ govtIdBackUrl: res.url });
        } else if (controlName === 'shopPhotos') {
          this.shopPhotosUploading = false;
          this.shopPhotosName = file.name;
          this.shopForm.patchValue({ shopPhotos: res.url });
        }
        this.toast.show(`${file.name} uploaded successfully!`, 'success', 3000);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (controlName === 'govtIdFrontUrl') this.govtIdFrontUploading = false;
        else if (controlName === 'govtIdBackUrl') this.govtIdBackUploading = false;
        else if (controlName === 'shopPhotos') this.shopPhotosUploading = false;

        const msg = err.error?.message || 'Failed to upload file.';
        this.toast.show(msg, 'error', 5000);
        input.value = '';
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Aadhaar OTP Verification ─────────────────────────────
  sendAadhaarOtp(): void {
    const aadhaarNum = this.kycForm.get('govtIdNumber')?.value;
    if (!aadhaarNum || !/^\d{12}$/.test(aadhaarNum)) {
      this.toast.show('Please enter a valid 12-digit Aadhaar number.', 'error', 4000);
      return;
    }

    this.aadhaarOtpLoading = true;
    this.kycService.sendAadhaarOtp(aadhaarNum).subscribe({
      next: (res: any) => {
        this.aadhaarOtpLoading = false;
        this.aadhaarOtpSent = true;
        this.aadhaarDevOtp = res.otpCode || '';
        this.toast.show('Aadhaar verification OTP sent!', 'success', 4000);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.aadhaarOtpLoading = false;
        const msg = err.error?.message || 'Failed to send Aadhaar verification OTP.';
        this.toast.show(msg, 'error', 5000);
        this.cdr.detectChanges();
      }
    });
  }

  verifyAadhaarOtp(otp: string): void {
    if (!otp || otp.length !== 6) {
      this.toast.show('Aadhaar OTP must be exactly 6 digits.', 'error', 4000);
      return;
    }

    const aadhaarNum = this.kycForm.get('govtIdNumber')?.value;
    this.aadhaarOtpLoading = true;
    this.kycService.verifyAadhaarOtp(otp, aadhaarNum).subscribe({
      next: () => {
        this.aadhaarOtpLoading = false;
        this.isAadhaarOtpVerified = true;
        this.toast.show('Aadhaar verified successfully via OTP!', 'success', 4000);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.aadhaarOtpLoading = false;
        const msg = err.error?.message || 'Invalid Aadhaar OTP code.';
        this.toast.show(msg, 'error', 5000);
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
  }
}
