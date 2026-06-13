import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-order.html',
  styleUrl: './create-order.scss',
})
export class CreateOrder implements OnInit {
  orderForm: FormGroup;
  addressForm: FormGroup;
  
  currentStep = 1;
  isLoading = false;
  isLocating = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  addressError: string | null = null;
  addressSuccess: string | null = null;

  // Catalog data
  brands = ['Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Other'];
  models: string[] = [];
  devices: any[] = [];
  categories: any[] = [];
  addresses: any[] = [];
  availableSlots: any[] = [];
  
  // Custom brand/model state
  isCustomModel = false;
  showNewAddressForm = false;

  // Selected address availability state
  isServiceAvailable = false;
  travelCharge = 0;
  serviceAreaId: number | null = null;

  // Images upload mock
  uploadedImages: string[] = [];
  minDate = '';

  brandLogos: { [brand: string]: string } = {
    'Apple': 'https://ongofix.com/storage/brands/Tbu65WUjuzMlTzKKyjgZBJQq7h4IRhI1SI2rkEVd.png',
    'Samsung': 'https://ongofix.com/storage/brands/HHyWPFSDz2Qtvi2t85xUPieVXzYDXimc7B11LNDs.png',
    'OnePlus': 'https://ongofix.com/storage/brands/A6K7RiDUQtrZ1surLxWJUoLi3O168LYmP03zz2ph.jpg',
    'Vivo': 'https://ongofix.com/storage/brands/vKJs5drAtRLsHY1Hwmu81VAcDeskef4T0uaB6qP8.png',
    'Oppo': 'https://ongofix.com/storage/brands/0qrtIcyezOMmh1legKHoqleq5Tvyj9XIDzbTWgCt.jpg',
    'Xiaomi': 'https://ongofix.com/storage/brands/R7bNslfIXeaDxjDVqLgKqadbvYOt7bb0ALoIc7KU.jpg',
    'Realme': 'https://ongofix.com/storage/brands/SJc85mf28ZdcRE6448sPpGdBXj4UU9h0uubZuIl2.jpg',
    'Other': 'assets/generic-brand.png'
  };

  modelCatalog: { [brand: string]: string[] } = {
    'Apple': ['iPhone 12', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 16', 'iPhone 16 Pro', 'Other / Custom Model'],
    'Samsung': ['Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy S23 Ultra', 'Galaxy S24', 'Galaxy S24 Ultra', 'Galaxy A54', 'Other / Custom Model'],
    'OnePlus': ['OnePlus 10 Pro', 'OnePlus 11', 'OnePlus 12', 'OnePlus 12R', 'OnePlus Nord 3', 'Other / Custom Model'],
    'Vivo': ['Vivo V27', 'Vivo V29 Pro', 'Vivo V30', 'Vivo V30 Pro', 'Vivo Y200', 'Other / Custom Model'],
    'Oppo': ['Oppo Reno 10', 'Oppo Reno 11 Pro', 'Oppo F25 Pro', 'Oppo A78', 'Other / Custom Model'],
    'Xiaomi': ['Redmi Note 12', 'Redmi Note 13 Pro', 'Xiaomi 13 Pro', 'Xiaomi 14', 'Other / Custom Model'],
    'Realme': ['Realme 11 Pro', 'Realme 12 Pro+', 'Realme C67', 'Other / Custom Model'],
    'Other': ['Other / Custom Model']
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.orderForm = this.fb.group({
      brand: ['', Validators.required],
      model: ['', Validators.required],
      customModel: [''],
      serviceCategoryId: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(5)]],
      addressId: ['', Validators.required],
      scheduledDate: ['', Validators.required],
      scheduledSlot: ['', Validators.required],
      acknowledged: [false, Validators.requiredTrue]
    });

    this.addressForm = this.fb.group({
      fullName: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      houseNumber: ['', Validators.required],
      street: ['', Validators.required],
      area: ['', Validators.required],
      landmark: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      isDefault: [false]
    });
  }

  ngOnInit(): void {
    // Set minDate to current date to block past dates
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    this.orderForm.patchValue({ scheduledDate: tomorrowStr });

    this.loadDevices();
    this.loadCategories();
    this.loadAddresses();
    this.loadAvailableSlots(tomorrowStr);

    // Watch brand changes to update model list
    this.orderForm.get('brand')?.valueChanges.subscribe((brand: any) => {
      this.setupModels(brand);
    });

    // Watch model changes to check if custom
    this.orderForm.get('model')?.valueChanges.subscribe((model: any) => {
      this.isCustomModel = model === 'Other / Custom Model' || this.orderForm.get('brand')?.value === 'Other';
      if (this.isCustomModel) {
        this.orderForm.get('customModel')?.setValidators([Validators.required, Validators.minLength(2)]);
      } else {
        this.orderForm.get('customModel')?.clearValidators();
      }
      this.orderForm.get('customModel')?.updateValueAndValidity();
    });

    // Watch date changes to reload slots
    this.orderForm.get('scheduledDate')?.valueChanges.subscribe((dateStr: any) => {
      if (dateStr) {
        this.loadAvailableSlots(dateStr);
      }
    });

    // Watch address changes to check service availability & travel charge
    this.orderForm.get('addressId')?.valueChanges.subscribe((addrId: any) => {
      if (addrId && addrId !== 'new') {
        this.checkAvailability(Number(addrId));
      } else {
        this.isServiceAvailable = false;
        this.travelCharge = 0;
        this.serviceAreaId = null;
      }
    });
  }

  setupModels(brand: string): void {
    this.models = this.modelCatalog[brand] || ['Other / Custom Model'];
    this.orderForm.patchValue({ model: this.models[0] });
    this.cdr.detectChanges();
  }

  selectBrand(brand: string): void {
    this.orderForm.get('brand')?.setValue(brand);
    this.nextStep();
  }

  selectModel(model: string): void {
    this.orderForm.get('model')?.setValue(model);
    if (model !== 'Other / Custom Model') {
      this.nextStep();
    }
  }

  selectCategory(catId: number): void {
    this.orderForm.get('serviceCategoryId')?.setValue(catId);
    this.nextStep();
  }

  loadDevices(): void {
    this.orderService.getDevices().subscribe({
      next: (res: any) => {
        this.devices = res || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load devices', err);
      }
    });
  }

  loadCategories(): void {
    this.orderService.getCategories().subscribe({
      next: (res: any) => {
        this.categories = res || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load service categories', err);
      }
    });
  }

  loadAddresses(): void {
    this.http.get<any[]>('/api/addresses').subscribe({
      next: (res: any) => {
        this.addresses = res || [];
        
        // Auto-select default address if available
        const defaultAddr = this.addresses.find(a => a.isDefault);
        if (defaultAddr) {
          this.orderForm.patchValue({ addressId: defaultAddr.id });
        } else if (this.addresses.length > 0) {
          this.orderForm.patchValue({ addressId: this.addresses[0].id });
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load addresses', err);
      }
    });
  }

  loadAvailableSlots(dateStr: string): void {
    this.orderService.getAvailableSlots(dateStr).subscribe({
      next: (slots: any) => {
        this.availableSlots = slots || [];
        const firstAvail = this.availableSlots.find(s => s.available);
        if (firstAvail) {
          this.orderForm.patchValue({ scheduledSlot: firstAvail.slot });
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load slots', err);
        // Fallback slots
        this.availableSlots = [
          { slot: "09:00 AM", available: true },
          { slot: "11:00 AM", available: true },
          { slot: "01:00 PM", available: true },
          { slot: "03:00 PM", available: true },
          { slot: "05:00 PM", available: true }
        ];
        this.orderForm.patchValue({ scheduledSlot: '09:00 AM' });
        this.cdr.detectChanges();
      }
    });
  }

  checkAvailability(addressId: number): void {
    this.isLocating = true;
    this.errorMessage = null;
    this.orderService.checkServiceAreaAvailability(addressId).subscribe({
      next: (res: any) => {
        this.isLocating = false;
        if (res.available) {
          this.isServiceAvailable = true;
          this.travelCharge = Number(res.travelCharge);
          this.serviceAreaId = res.serviceAreaId || null;
        } else {
          this.isServiceAvailable = false;
          this.travelCharge = 0;
          this.serviceAreaId = null;
          this.errorMessage = 'Sorry, KareSwift mobile repairs are not available at this address. Please select or add an address in ECIL, Hitech City, Tarnaka, etc.';
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLocating = false;
        this.isServiceAvailable = true; // Fallback to true in dev
        this.travelCharge = 0;
        this.cdr.detectChanges();
      }
    });
  }

  triggerImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Simulate file upload by converting to mockup URL
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.uploadedImages.push(e.target.result);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeUploadedImage(index: number): void {
    this.uploadedImages.splice(index, 1);
    this.cdr.detectChanges();
  }

  saveInlineAddress(): void {
    if (this.addressForm.invalid) return;
    this.isLoading = true;
    this.addressError = null;
    this.addressSuccess = null;
    
    this.http.post<any>('/api/addresses', this.addressForm.value).subscribe({
      next: (newAddr: any) => {
        this.isLoading = false;
        this.addressSuccess = 'Address added successfully!';
        this.addressForm.reset();
        this.showNewAddressForm = false;
        
        // Reload addresses and select the new one
        this.http.get<any[]>('/api/addresses').subscribe((list: any) => {
          this.addresses = list || [];
          const added = this.addresses.find(a => a.fullName === newAddr.fullName && a.mobileNumber === newAddr.mobileNumber);
          if (added) {
            this.orderForm.patchValue({ addressId: added.id });
          }
          this.addressSuccess = null;
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.addressError = err.error?.message || 'Failed to save address';
        this.cdr.detectChanges();
      }
    });
  }

  nextStep(): void {
    if (this.currentStep === 1 && !this.orderForm.value.brand) return;
    if (this.currentStep === 2 && !this.orderForm.value.model) return;
    if (this.currentStep === 2 && this.isCustomModel && !this.orderForm.value.customModel) return;
    if (this.currentStep === 3 && !this.orderForm.value.serviceCategoryId) return;
    if (this.currentStep === 4 && this.orderForm.get('description')?.invalid) return;
    if (this.currentStep === 6) {
      if (!this.orderForm.value.addressId) return;
      if (!this.isServiceAvailable) {
        this.errorMessage = 'Cannot proceed: Service is unavailable in this area.';
        return;
      }
    }
    if (this.currentStep === 7 && !this.orderForm.value.scheduledDate) return;
    if (this.currentStep === 8 && !this.orderForm.value.scheduledSlot) return;

    this.errorMessage = null;
    this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.detectChanges();
    }
  }

  getSelectedCategoryName(): string {
    const cat = this.categories.find(c => c.id === Number(this.orderForm.value.serviceCategoryId));
    return cat ? cat.name : 'Unknown Service';
  }

  getSelectedAddressText(): string {
    const addr = this.addresses.find(a => a.id === Number(this.orderForm.value.addressId));
    if (!addr) return '';
    return `${addr.houseNumber}, ${addr.street}, ${addr.area}, ${addr.city} - ${addr.pincode}`;
  }

  onSubmit(): void {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { brand, model, customModel, serviceCategoryId, description, addressId, scheduledDate, scheduledSlot } = this.orderForm.value;
    const finalModel = model === 'Other / Custom Model' ? customModel : model;

    const matchedDevice = this.devices.find(
      d => d.brand?.toLowerCase() === brand?.toLowerCase() && d.model?.toLowerCase() === finalModel?.toLowerCase()
    );
    const deviceId = matchedDevice ? matchedDevice.id : (this.devices.length > 0 ? this.devices[0].id : 1);
    
    const selectedAddress = this.addresses.find(a => a.id === Number(addressId));

    const payload = {
      deviceId,
      serviceCategoryId: Number(serviceCategoryId),
      notes: `${brand} ${finalModel} - ${description}`,
      address: this.getSelectedAddressText(),
      scheduledDate,
      scheduledSlot,
      travelCharge: this.travelCharge,
      serviceAreaId: this.serviceAreaId,
      diagnosticPhotos: this.uploadedImages
    };

    this.orderService.createOrder('1', payload).subscribe({
      next: (res: OrderResponse) => {
        this.isLoading = false;
        const orderId = res.id || res.orderId;
        localStorage.setItem('activeOrderId', String(orderId));
        this.router.navigate([`/order/track/${orderId}`]);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to submit doorstep service request. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
