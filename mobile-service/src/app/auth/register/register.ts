import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { TechnicianKycService } from '../../services/technician.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  otpRequested = false;
  isTechnician = false;
  currentStep = 1;

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private kycService: TechnicianKycService,
    private toast: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      technicianId: [''],
      password: [''],
      otp: [''],
      
      // KYC Docs Step
      govtIdType: ['aadhaar'],
      govtIdNumber: [''],
      govtIdFrontUrl: [''],
      govtIdBackUrl: [''],
      
      // Shop Step
      shopName: [''],
      shopAddress: [''],
      shopLatitude: [null],
      shopLongitude: [null],
      shopPhotos: [''],
    });

    // Reset verification status and uploaded file details on ID type change
    this.registerForm.get('govtIdType')?.valueChanges.subscribe((type: any) => {
      this.isAadhaarOtpVerified = false;
      this.aadhaarOtpSent = false;
      this.aadhaarDevOtp = '';
      this.govtIdFrontName = '';
      this.govtIdBackName = '';

      this.registerForm.patchValue({
        govtIdNumber: '',
        govtIdFrontUrl: '',
        govtIdBackUrl: '',
      }, { emitEvent: false });

      // Update validators for the new type (only for technicians)
      const numberCtrl = this.registerForm.get('govtIdNumber');
      numberCtrl?.clearValidators();
      if (this.isTechnician) {
        if (type === 'aadhaar') {
          numberCtrl?.setValidators([Validators.required, Validators.pattern(/^\d{12}$/)]);
        } else if (type === 'pan') {
          numberCtrl?.setValidators([Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]);
        } else {
          numberCtrl?.setValidators([Validators.required, Validators.minLength(5)]);
        }
      }
      numberCtrl?.updateValueAndValidity({ emitEvent: false });
      this.cdr.detectChanges();
    });
  }

  toggleRole(): void {
    this.isTechnician = !this.isTechnician;
    const techIdControl = this.registerForm.get('technicianId');
    const pwdControl = this.registerForm.get('password');
    const govtIdCtrl = this.registerForm.get('govtIdNumber');
    const frontCtrl = this.registerForm.get('govtIdFrontUrl');
    const shopNameCtrl = this.registerForm.get('shopName');
    const shopAddrCtrl = this.registerForm.get('shopAddress');

    if (this.isTechnician) {
      techIdControl?.setValidators([Validators.required]);
      pwdControl?.setValidators([Validators.required, Validators.minLength(6)]);
      // KYC validators set on nextStep, leave them for now
    } else {
      techIdControl?.clearValidators();
      pwdControl?.clearValidators();
      govtIdCtrl?.clearValidators();
      frontCtrl?.clearValidators();
      shopNameCtrl?.clearValidators();
      shopAddrCtrl?.clearValidators();
    }
    techIdControl?.updateValueAndValidity();
    pwdControl?.updateValueAndValidity();
    govtIdCtrl?.updateValueAndValidity();
    frontCtrl?.updateValueAndValidity();
    shopNameCtrl?.updateValueAndValidity();
    shopAddrCtrl?.updateValueAndValidity();

    // Reset Aadhaar states on role toggle
    this.isAadhaarOtpVerified = false;
    this.aadhaarOtpSent = false;
    this.aadhaarDevOtp = '';
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
          this.registerForm.patchValue({ govtIdFrontUrl: res.url });
        } else if (controlName === 'govtIdBackUrl') {
          this.govtIdBackUploading = false;
          this.govtIdBackName = file.name;
          this.registerForm.patchValue({ govtIdBackUrl: res.url });
        } else if (controlName === 'shopPhotos') {
          this.shopPhotosUploading = false;
          this.shopPhotosName = file.name;
          this.registerForm.patchValue({ shopPhotos: res.url });
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
    const aadhaarNum = this.registerForm.get('govtIdNumber')?.value;
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

    const aadhaarNum = this.registerForm.get('govtIdNumber')?.value;
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

  get canRequestOtp(): boolean {
    const email = this.registerForm.get('email');
    const name = this.registerForm.get('name');
    if (email?.invalid || name?.invalid) return false;
    if (this.isTechnician) {
      const techId = this.registerForm.get('technicianId');
      const pwd = this.registerForm.get('password');
      if (techId?.invalid || pwd?.invalid) return false;
    }
    return true;
  }

  nextStep(): void {
    this.errorMessage = null;

    if (this.currentStep === 1) {
      const name = this.registerForm.get('name');
      const email = this.registerForm.get('email');
      const phone = this.registerForm.get('phone');
      const techId = this.registerForm.get('technicianId');
      const pwd = this.registerForm.get('password');

      name?.markAsTouched();
      email?.markAsTouched();
      phone?.markAsTouched();
      if (this.isTechnician) {
        techId?.markAsTouched();
        pwd?.markAsTouched();
      }

      if (name?.invalid || email?.invalid || phone?.invalid) return;
      if (this.isTechnician && (techId?.invalid || pwd?.invalid)) return;

      if (this.isTechnician) {
        // Enforce validators for Step 2
        this.registerForm.get('govtIdNumber')?.setValidators([Validators.required]);
        this.registerForm.get('govtIdFrontUrl')?.setValidators([Validators.required]);
        this.registerForm.get('govtIdNumber')?.updateValueAndValidity();
        this.registerForm.get('govtIdFrontUrl')?.updateValueAndValidity();
        this.currentStep = 2;
      } else {
        this.onRequestOtp();
      }
    } else if (this.currentStep === 2) {
      const type = this.registerForm.get('govtIdType')?.value;
      const numCtrl = this.registerForm.get('govtIdNumber');
      const frontCtrl = this.registerForm.get('govtIdFrontUrl');

      numCtrl?.markAsTouched();
      frontCtrl?.markAsTouched();

      // Inline validation
      if (type === 'aadhaar' && numCtrl?.value && !/^\d{12}$/.test(numCtrl.value)) {
        this.errorMessage = 'Aadhaar must be exactly 12 digits';
        return;
      }
      if (type === 'pan' && numCtrl?.value && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(numCtrl.value)) {
        this.errorMessage = 'PAN must be XXXXX0000X format';
        return;
      }

      if (numCtrl?.invalid || frontCtrl?.invalid) return;

      // Enforce validators for Step 3
      this.registerForm.get('shopName')?.setValidators([Validators.required]);
      this.registerForm.get('shopAddress')?.setValidators([Validators.required]);
      this.registerForm.get('shopName')?.updateValueAndValidity();
      this.registerForm.get('shopAddress')?.updateValueAndValidity();
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      const nameCtrl = this.registerForm.get('shopName');
      const addrCtrl = this.registerForm.get('shopAddress');

      nameCtrl?.markAsTouched();
      addrCtrl?.markAsTouched();

      if (nameCtrl?.invalid || addrCtrl?.invalid) return;

      this.onRequestOtp();
    }
  }

  prevStep(): void {
    this.errorMessage = null;
    if (this.currentStep === 4) {
      this.currentStep = this.isTechnician ? 3 : 1;
      this.otpRequested = false;
    } else if (this.currentStep === 3) {
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      this.currentStep = 1;
    }
  }

  captureLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.registerForm.patchValue({
            shopLatitude: pos.coords.latitude,
            shopLongitude: pos.coords.longitude,
          });
          this.toast.show('GPS coordinates captured!', 'success', 3000);
          this.cdr.detectChanges();
        },
        () => {
          this.toast.show('Could not access location details.', 'error', 3000);
        }
      );
    }
  }

  onRequestOtp(): void {
    this.isLoading = true;
    this.errorMessage = null;
    const email = this.registerForm.get('email')?.value;

    this.authService.sendOtp(email, 'register').subscribe({
      next: () => {
        this.isLoading = false;
        this.otpRequested = true;
        const otpControl = this.registerForm.get('otp');
        otpControl?.setValidators([Validators.required, Validators.pattern('^[0-9]{6}$')]);
        otpControl?.updateValueAndValidity();
        this.currentStep = 4;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const { name, email, phone, otp, technicianId, password } = this.registerForm.value;

    const extras: any = { name };
    if (phone) extras.phone = phone;
    if (this.isTechnician) {
      extras.role = 'technician';
      extras.technicianId = technicianId?.trim();
      extras.password = password;
    }

    this.authService.verifyOtp(email, otp, extras).subscribe({
      next: (res: LoginResponse) => {
        if (res.user.role === 'technician') {
          // Upload documents
          const formVal = this.registerForm.value;
          const kycPayload: any = {
            govtIdType: formVal.govtIdType,
            govtIdNumber: formVal.govtIdNumber,
            govtIdFrontUrl: formVal.govtIdFrontUrl || 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&q=80&w=200',
            govtIdBackUrl: formVal.govtIdBackUrl || undefined,
          };
          if (formVal.govtIdType === 'aadhaar') kycPayload.aadhaarNumber = formVal.govtIdNumber;
          else if (formVal.govtIdType === 'pan') kycPayload.panNumber = formVal.govtIdNumber;

          this.kycService.uploadKycDocuments(kycPayload).subscribe({
            next: () => {
              const shopPhotos = formVal.shopPhotos ? [formVal.shopPhotos] : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400'];
              this.kycService.uploadShopDetails({
                shopName: formVal.shopName || 'Shop Name',
                shopAddress: formVal.shopAddress || 'Shop Address',
                shopLatitude: formVal.shopLatitude || undefined,
                shopLongitude: formVal.shopLongitude || undefined,
                shopPhotos
              }).subscribe({
                next: () => {
                  this.isLoading = false;
                  this.router.navigate(['/technician/verification-pending']);
                },
                error: () => {
                  this.isLoading = false;
                  this.router.navigate(['/technician/verification-pending']);
                }
              });
            },
            error: () => {
              this.isLoading = false;
              this.router.navigate(['/technician/verification-pending']);
            }
          });
        } else {
          this.isLoading = false;
          this.router.navigate(['/order/device-select']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Verification failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
