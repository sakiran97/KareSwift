import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { CommonModule } from '@angular/common';

export interface BrandCatalog {
  [brand: string]: string[];
}

export interface CategoryCatalog {
  [category: string]: BrandCatalog;
}

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-order.html',
  styleUrl: './create-order.scss',
})
export class CreateOrder implements OnInit {
  orderForm: FormGroup;
  selectedCategory = '';
  estimatedPrice = 0;
  isLoading = false;
  errorMessage: string | null = null;
  currentStep = 1;

  brands: string[] = [];
  models: string[] = [];
  isCustomModel = false;

  deviceCatalog: CategoryCatalog = {
    smartphone: {
      'Apple': [
        'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus', 'iPhone 7', 'iPhone 7 Plus',
        'iPhone 8', 'iPhone 8 Plus', 'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
        'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max', 'iPhone SE (2nd Gen)', 'iPhone 12 Mini',
        'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max', 'iPhone 13 Mini', 'iPhone 13',
        'iPhone 13 Pro', 'iPhone 13 Pro Max', 'iPhone SE (3rd Gen)', 'iPhone 14', 'iPhone 14 Plus',
        'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro',
        'iPhone 15 Pro Max', 'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
        'Other / Custom Model'
      ],
      'Google': [
        'Pixel 3', 'Pixel 3 XL', 'Pixel 3a', 'Pixel 3a XL', 'Pixel 4', 'Pixel 4 XL', 'Pixel 4a',
        'Pixel 4a (5G)', 'Pixel 5', 'Pixel 5a', 'Pixel 6', 'Pixel 6 Pro', 'Pixel 6a', 'Pixel 7',
        'Pixel 7 Pro', 'Pixel 7a', 'Pixel Fold', 'Pixel 8', 'Pixel 8 Pro', 'Pixel 8a', 'Pixel 9',
        'Pixel 9 Pro', 'Pixel 9 Pro XL', 'Pixel 9 Pro Fold', 'Other / Custom Model'
      ],
      'Motorola': [
        'Moto G Power (2021)', 'Moto G Stylus (2021)', 'Edge (2021)', 'Edge 30 Pro', 'Razr (2022)',
        'Edge 40 Pro', 'Razr 40 Ultra', 'Edge 50 Ultra', 'Razr 50 Ultra', 'Other / Custom Model'
      ],
      'OnePlus': [
        'OnePlus 6', 'OnePlus 6T', 'OnePlus 7', 'OnePlus 7 Pro', 'OnePlus 7T', 'OnePlus 7T Pro',
        'OnePlus 8', 'OnePlus 8 Pro', 'OnePlus 8T', 'OnePlus Nord', 'OnePlus 9', 'OnePlus 9 Pro',
        'OnePlus 9R', 'OnePlus Nord 2', 'OnePlus 10 Pro', 'OnePlus 10T', 'OnePlus 11',
        'OnePlus Nord 3', 'OnePlus Open', 'OnePlus 12', 'OnePlus 12R', 'OnePlus Nord 4',
        'Other / Custom Model'
      ],
      'Samsung': [
        'Galaxy S9', 'Galaxy S9+', 'Galaxy Note 9', 'Galaxy S10', 'Galaxy S10+', 'Galaxy Note 10',
        'Galaxy S20', 'Galaxy S20+', 'Galaxy S20 Ultra', 'Galaxy S20 FE', 'Galaxy Note 20',
        'Galaxy Note 20 Ultra', 'Galaxy Z Fold 2', 'Galaxy Z Flip', 'Galaxy S21', 'Galaxy S21+',
        'Galaxy S21 Ultra', 'Galaxy S21 FE', 'Galaxy Z Fold 3', 'Galaxy Z Flip 3', 'Galaxy S22',
        'Galaxy S22+', 'Galaxy S22 Ultra', 'Galaxy Z Fold 4', 'Galaxy Z Flip 4', 'Galaxy S23',
        'Galaxy S23+', 'Galaxy S23 Ultra', 'Galaxy S23 FE', 'Galaxy Z Fold 5', 'Galaxy Z Flip 5',
        'Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra', 'Galaxy Z Fold 6', 'Galaxy Z Flip 6',
        'Other / Custom Model'
      ],
      'Sony': [
        'Xperia 1 II', 'Xperia 5 II', 'Xperia 1 III', 'Xperia 5 III', 'Xperia 1 IV', 'Xperia 5 IV',
        'Xperia 1 V', 'Xperia 5 V', 'Xperia 1 VI', 'Other / Custom Model'
      ],
      'Xiaomi': [
        'Redmi Note 9', 'Redmi Note 10', 'Redmi Note 10 Pro', 'Xiaomi 11T Pro', 'Redmi Note 11',
        'Redmi Note 11 Pro', 'Xiaomi 12 Pro', 'Redmi Note 12', 'Redmi Note 12 Pro', 'Xiaomi 13 Pro',
        'Xiaomi 13 Ultra', 'Redmi Note 13', 'Redmi Note 13 Pro', 'Xiaomi 14', 'Xiaomi 14 Pro',
        'Xiaomi 14 Ultra', 'Other / Custom Model'
      ]
    },
    tablet: {
      'Amazon Fire': [
        'Fire 7 (9th Gen)', 'Fire HD 8 (10th Gen)', 'Fire HD 10 (11th Gen)', 'Fire HD 8 (12th Gen)',
        'Fire HD 10 (13th Gen)', 'Fire Max 11', 'Other / Custom Model'
      ],
      'Apple (iPad)': [
        'iPad Air 3', 'iPad Mini 5', 'iPad 7th Gen', 'iPad Pro 11-inch (2nd Gen)',
        'iPad Pro 12.9-inch (4th Gen)', 'iPad 8th Gen', 'iPad Air 4', 'iPad Pro 11-inch (3rd Gen)',
        'iPad Pro 12.9-inch (5th Gen)', 'iPad Mini 6', 'iPad 9th Gen', 'iPad Air 5', 'iPad 10th Gen',
        'iPad Pro 11-inch (4th Gen)', 'iPad Pro 12.9-inch (6th Gen)', 'iPad Air 11-inch (M2)',
        'iPad Air 13-inch (M2)', 'iPad Pro 11-inch (M4)', 'iPad Pro 13-inch (M4)', 'Other / Custom Model'
      ],
      'Google': [
        'Pixel C', 'Nexus 9', 'Pixel Slate', 'Pixel Tablet', 'Other / Custom Model'
      ],
      'Lenovo': [
        'Tab M8', 'Tab M10 Plus', 'Tab P11', 'Tab P11 Pro', 'Yoga Tab 11', 'Yoga Tab 13',
        'Tab P12 Pro', 'Tab Extreme', 'Other / Custom Model'
      ],
      'Samsung': [
        'Galaxy Tab S6', 'Galaxy Tab S6 Lite', 'Galaxy Tab S7', 'Galaxy Tab S7+', 'Galaxy Tab A7',
        'Galaxy Tab S7 FE', 'Galaxy Tab A8', 'Galaxy Tab S8', 'Galaxy Tab S8+', 'Galaxy Tab S8 Ultra',
        'Galaxy Tab S9', 'Galaxy Tab S9+', 'Galaxy Tab S9 Ultra', 'Galaxy Tab S9 FE', 'Galaxy Tab A9+',
        'Other / Custom Model'
      ]
    },
    laptop: {
      'Acer': [
        'Aspire 5', 'Swift 3', 'Nitro 5', 'Predator Helios 300', 'Swift Edge', 'Predator Helios 16',
        'Other / Custom Model'
      ],
      'Apple (MacBook)': [
        'MacBook Air (Retina 2018)', 'MacBook Pro 13-inch (2019)', 'MacBook Pro 16-inch (Intel 2019)',
        'MacBook Air (M1 2020)', 'MacBook Pro 13-inch (M1 2020)', 'MacBook Pro 14-inch (M1 Pro/Max 2021)',
        'MacBook Pro 16-inch (M1 Pro/Max 2021)', 'MacBook Air (M2 2022)', 'MacBook Pro 13-inch (M2 2022)',
        'MacBook Pro 14-inch (M2 Pro/Max 2023)', 'MacBook Pro 16-inch (M2 Pro/Max 2023)',
        'MacBook Air 15-inch (M2 2023)', 'MacBook Pro 14-inch (M3/Pro/Max late 2023)',
        'MacBook Pro 16-inch (M3 Pro/Max late 2023)', 'MacBook Air 13-inch (M3 2024)',
        'MacBook Air 15-inch (M3 2024)', 'Other / Custom Model'
      ],
      'ASUS': [
        'VivoBook 15', 'ZenBook 13', 'ROG Zephyrus G14 (2021)', 'TUF Gaming A15', 'ZenBook 14 OLED',
        'ROG Zephyrus G14 (2023)', 'ZenBook Duo (2024)', 'ROG Zephyrus G16 (2024)', 'Other / Custom Model'
      ],
      'Dell': [
        'Inspiron 15', 'Latitude 5420', 'XPS 13 (9310)', 'XPS 15 (9510)', 'XPS 13 Plus (9320)',
        'XPS 15 (9530)', 'Alienware m16', 'XPS 14 (9440)', 'XPS 16 (9640)', 'Other / Custom Model'
      ],
      'HP': [
        'Pavilion 15', 'Envy x360', 'Spectre x360 14', 'EliteBook 840 G8', 'OMEN 16', 'Victus 16',
        'Spectre x360 16 (2024)', 'Other / Custom Model'
      ],
      'Lenovo': [
        'IdeaPad 3', 'Yoga 7i', 'ThinkPad T14 Gen 2', 'ThinkPad X1 Carbon Gen 9', 'Legion 5 Pro (2021)',
        'Yoga 9i', 'ThinkPad T14 Gen 4', 'ThinkPad X1 Carbon Gen 11', 'Legion Slim 5 (2023)',
        'Legion Pro 7i (2024)', 'ThinkPad X1 Carbon Gen 12', 'Other / Custom Model'
      ],
      'Microsoft Surface': [
        'Surface Laptop 3', 'Surface Pro 7', 'Surface Book 3', 'Surface Laptop 4', 'Surface Pro 8',
        'Surface Laptop Studio', 'Surface Pro 9', 'Surface Laptop 5', 'Surface Laptop Studio 2',
        'Surface Pro 10', 'Surface Laptop 6', 'Surface Pro 11', 'Surface Laptop 7', 'Other / Custom Model'
      ]
    },
    smartwatch: {
      'Apple Watch': [
        'Series 4', 'Series 5', 'Series 6', 'SE (1st Gen)', 'Series 7', 'SE (2nd Gen)', 'Series 8',
        'Ultra', 'Series 9', 'Ultra 2', 'Series 10', 'Other / Custom Model'
      ],
      'Fitbit': [
        'Charge 4', 'Versa 3', 'Sense', 'Charge 5', 'Luxe', 'Versa 4', 'Sense 2', 'Charge 6',
        'Other / Custom Model'
      ],
      'Garmin': [
        'Forerunner 245', 'Venu', 'Fenix 6', 'Vivoactive 4', 'Instinct', 'Venu 2', 'Forerunner 55',
        'Forerunner 955', 'Fenix 7', 'Venu 3', 'Forerunner 265', 'Forerunner 965', 'Fenix 7 Pro',
        'Epix Pro', 'Other / Custom Model'
      ],
      'Google': [
        'Pixel Watch', 'Pixel Watch 2', 'Pixel Watch 3', 'Other / Custom Model'
      ],
      'Samsung Galaxy Watch': [
        'Active 2', 'Watch 3', 'Watch 4', 'Watch 4 Classic', 'Watch 5', 'Watch 5 Pro',
        'Watch 6', 'Watch 6 Classic', 'Watch 7', 'Watch Ultra', 'Other / Custom Model'
      ]
    }
  };

  services = [
    { id: 1, name: 'Screen Replacement', basePrice: 120, time: 45 },
    { id: 2, name: 'Battery Swap', basePrice: 60, time: 30 },
    { id: 3, name: 'Software Fix', basePrice: 50, time: 60 },
    { id: 4, name: 'Water Damage Repair', basePrice: 150, time: 90 },
    { id: 5, name: 'Charging Port Fix', basePrice: 70, time: 40 },
    { id: 6, name: 'Camera Repair', basePrice: 90, time: 45 },
  ];

  brandLogos: { [brand: string]: string } = {
    'Apple': 'https://ongofix.com/storage/brands/Tbu65WUjuzMlTzKKyjgZBJQq7h4IRhI1SI2rkEVd.png',
    'Apple (iPad)': 'https://ongofix.com/storage/brands/Tbu65WUjuzMlTzKKyjgZBJQq7h4IRhI1SI2rkEVd.png',
    'Apple (MacBook)': 'https://ongofix.com/storage/brands/Tbu65WUjuzMlTzKKyjgZBJQq7h4IRhI1SI2rkEVd.png',
    'Apple Watch': 'https://ongofix.com/storage/brands/Tbu65WUjuzMlTzKKyjgZBJQq7h4IRhI1SI2rkEVd.png',
    'Xiaomi': 'https://ongofix.com/storage/brands/R7bNslfIXeaDxjDVqLgKqadbvYOt7bb0ALoIc7KU.jpg',
    'Samsung': 'https://ongofix.com/storage/brands/HHyWPFSDz2Qtvi2t85xUPieVXzYDXimc7B11LNDs.png',
    'Samsung Galaxy Watch': 'https://ongofix.com/storage/brands/HHyWPFSDz2Qtvi2t85xUPieVXzYDXimc7B11LNDs.png',
    'Vivo': 'https://ongofix.com/storage/brands/vKJs5drAtRLsHY1Hwmu81VAcDeskef4T0uaB6qP8.png',
    'OnePlus': 'https://ongofix.com/storage/brands/A6K7RiDUQtrZ1surLxWJUoLi3O168LYmP03zz2ph.jpg',
    'Oppo': 'https://ongofix.com/storage/brands/0qrtIcyezOMmh1legKHoqleq5Tvyj9XIDzbTWgCt.jpg',
    'Google': 'https://ongofix.com/storage/brands/CUgDmjW3DDT5csGKKvXUjjjLcrIzsywP98PMLTi7.jpg',
    'Realme': 'https://ongofix.com/storage/brands/SJc85mf28ZdcRE6448sPpGdBXj4UU9h0uubZuIl2.jpg',
    'Motorola': 'https://ongofix.com/storage/brands/pGV90fNEkiAxAjzZZYYg3jcp4Zf2T38m5ayBT5fc.png',
    'iQOO': 'https://ongofix.com/storage/brands/IH1mtyrskY640SqHYQt3SkhzA4GzQLw5GFdTD561.png',
    'Poco': 'https://ongofix.com/storage/brands/CQOau2xWl7zqbqcRmsoKzHa4nB6xVnR5tJEvpL0K.png',
    'Tecno': 'https://ongofix.com/storage/brands/nZQcgP6nga8y1ZXMC7Qqhl4iAtkLfPWqZ0BEuyuj.png',
    'Nothing': 'https://ongofix.com/storage/brands/HTBsDQuqlU5hVWWYQ02XPvx1Vu1eVoXCezmzcznS.png',
    'Nokia': 'https://ongofix.com/storage/brands/El6eS3NSQFSyxDijiubLLyZtwB7BL4TsSZTpas0F.jpg',
    'Honor': 'https://ongofix.com/storage/brands/16gzQ4TNYcNph6Kxjn9sjjtujXVoDlYkyRH9uTxj.png',
    'Asus': 'https://ongofix.com/storage/brands/Rcq1Ep9U5JZpPSlf2hIZ40V6vUyF4kOaIJnIJzlu.png',
    'ASUS': 'https://ongofix.com/storage/brands/Rcq1Ep9U5JZpPSlf2hIZ40V6vUyF4kOaIJnIJzlu.png',
    'Huawei': 'https://ongofix.com/storage/brands/uGsH3im6Xlab6eRdoYyTDTtcMjap0Q7sYgVAK6e6.png',
    'Acer': 'https://ongofix.com/storage/brands/Rcq1Ep9U5JZpPSlf2hIZ40V6vUyF4kOaIJnIJzlu.png',
    'Lenovo': 'https://ongofix.com/storage/brands/nZQcgP6nga8y1ZXMC7Qqhl4iAtkLfPWqZ0BEuyuj.png',
    'Dell': 'https://ongofix.com/storage/brands/R7bNslfIXeaDxjDVqLgKqadbvYOt7bb0ALoIc7KU.jpg',
    'HP': 'https://ongofix.com/storage/brands/CQOau2xWl7zqbqcRmsoKzHa4nB6xVnR5tJEvpL0K.png',
    'Amazon Fire': 'https://ongofix.com/storage/brands/SJc85mf28ZdcRE6448sPpGdBXj4UU9h0uubZuIl2.jpg',
    'Microsoft Surface': 'https://ongofix.com/storage/brands/CUgDmjW3DDT5csGKKvXUjjjLcrIzsywP98PMLTi7.jpg',
    'Fitbit': 'https://ongofix.com/storage/brands/16gzQ4TNYcNph6Kxjn9sjjtujXVoDlYkyRH9uTxj.png',
    'Garmin': 'https://ongofix.com/storage/brands/IH1mtyrskY640SqHYQt3SkhzA4GzQLw5GFdTD561.png',
    'Sony': 'https://ongofix.com/storage/brands/El6eS3NSQFSyxDijiubLLyZtwB7BL4TsSZTpas0F.jpg'
  };

  availableSlots: { slot: string, available: boolean }[] = [];
  isLocating = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.orderForm = this.fb.group({
      brand: ['', Validators.required],
      model: ['', Validators.required],
      customModel: [''],
      serviceId: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      scheduledDate: ['', Validators.required],
      scheduledSlot: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.selectedCategory = localStorage.getItem('selectedDeviceCategory') || 'smartphone';
    this.setupBrands();
    this.setupModels();
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    this.orderForm.patchValue({ scheduledDate: tomorrowStr });

    // Load initial slots
    this.loadAvailableSlots(tomorrowStr);

    // Pre-fill location if stored in localStorage
    const savedAddress = localStorage.getItem('pinnedAddress');
    const savedLat = localStorage.getItem('pinnedLatitude');
    const savedLng = localStorage.getItem('pinnedLongitude');
    if (savedAddress) {
      this.orderForm.patchValue({ address: savedAddress });
    }
    if (savedLat) {
      this.orderForm.patchValue({ latitude: Number(savedLat) });
    }
    if (savedLng) {
      this.orderForm.patchValue({ longitude: Number(savedLng) });
    }

    // Check query params for diagnostic prefill
    this.route.queryParams.subscribe((params: any) => {
      if (params['category']) {
        const catId = Number(params['category']);
        this.orderForm.patchValue({ serviceId: catId });
      }
      if (params['notes']) {
        this.orderForm.patchValue({ description: params['notes'] });
      }
      this.cdr.detectChanges();
    });

    // Listen to brand updates
    this.orderForm.get('brand')?.valueChanges.subscribe(() => {
      this.setupModels();
    });

    this.orderForm.get('model')?.valueChanges.subscribe((val: string | null) => {
      this.isCustomModel = val === 'Other / Custom Model';
      if (this.isCustomModel) {
        this.orderForm.get('customModel')?.setValidators([Validators.required, Validators.minLength(2)]);
      } else {
        this.orderForm.get('customModel')?.clearValidators();
      }
      this.orderForm.get('customModel')?.updateValueAndValidity();
    });

    // Listen to date changes to reload available slots
    this.orderForm.get('scheduledDate')?.valueChanges.subscribe((dateStr: string | null) => {
      if (dateStr) {
        this.loadAvailableSlots(dateStr);
      }
    });
  }

  selectBrand(brand: string): void {
    this.orderForm.get('brand')?.setValue(brand);
  }

  setupBrands(): void {
    const categoryBrands = this.deviceCatalog[this.selectedCategory];
    if (categoryBrands) {
      this.brands = Object.keys(categoryBrands).sort();
    }
    if (this.brands.length > 0) {
      this.orderForm.patchValue({ brand: this.brands[0] }, { emitEvent: false });
    }
  }

  setupModels(): void {
    const brand = this.orderForm.get('brand')?.value;
    const categoryBrands = this.deviceCatalog[this.selectedCategory];
    if (categoryBrands && brand && categoryBrands[brand]) {
      this.models = categoryBrands[brand];
      this.orderForm.patchValue({ model: this.models[0] }, { emitEvent: false });
    }
  }

  // calculatePrice was removed in accordance with Phase 5 (Remove Payment & Price Estimation)

  loadAvailableSlots(dateStr: string): void {
    this.orderService.getAvailableSlots(dateStr).subscribe({
      next: (slots: { slot: string, available: boolean }[]) => {
        this.availableSlots = slots;
        // Auto-select first available slot
        const firstAvailable = slots.find((s: { slot: string, available: boolean }) => s.available);
        if (firstAvailable) {
          this.orderForm.patchValue({ scheduledSlot: firstAvailable.slot });
        } else {
          this.orderForm.patchValue({ scheduledSlot: '' });
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.warn('Failed to load dynamic slots. Using local fallback slots.', err);
        this.availableSlots = [
          { slot: "09:00 AM - 11:00 AM", available: true },
          { slot: "11:00 AM - 01:00 PM", available: true },
          { slot: "01:00 PM - 03:00 PM", available: true },
          { slot: "03:00 PM - 05:00 PM", available: true },
          { slot: "05:00 PM - 07:00 PM", available: true }
        ];
        this.orderForm.patchValue({ scheduledSlot: this.availableSlots[0].slot });
        this.cdr.detectChanges();
      }
    });
  }

  getCurrentLocation(): void {
    this.isLocating = true;
    this.cdr.detectChanges();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.orderForm.patchValue({
            latitude: lat,
            longitude: lng
          });

          fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              this.isLocating = false;
              const address = data.display_name || 'Ahmedguda, Secunderabad, Telangana 501302';
              this.orderForm.patchValue({ address });
              this.cdr.detectChanges();
            })
            .catch(err => {
              console.warn('Reverse geocoding failed. Using user fallback.', err);
              this.isLocating = false;
              this.orderForm.patchValue({ address: 'Ahmedguda, Secunderabad, Telangana 501302' });
              this.cdr.detectChanges();
            });
        },
        (error) => {
          console.warn('Geolocation failed. Generating mockup coordinates.', error);
          setTimeout(() => {
            this.isLocating = false;
            // Fallback user location coords in Secunderabad, Telangana (approx lat 17.4589, lng 78.6189)
            const mockLat = 17.4589 + (Math.random() - 0.5) * 0.01;
            const mockLng = 78.6189 + (Math.random() - 0.5) * 0.01;
            this.orderForm.patchValue({
              latitude: parseFloat(mockLat.toFixed(6)),
              longitude: parseFloat(mockLng.toFixed(6)),
              address: 'Ahmedguda, Secunderabad, Telangana 501302'
            });
            this.cdr.detectChanges();
          }, 800);
        }
      );
    } else {
      this.isLocating = false;
      this.cdr.detectChanges();
    }
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      this.orderForm.get('brand')?.markAsTouched();
      this.orderForm.get('model')?.markAsTouched();
      if (this.orderForm.get('brand')?.invalid || this.orderForm.get('model')?.invalid || (this.isCustomModel && this.orderForm.get('customModel')?.invalid)) return;
    }
    if (this.currentStep === 2) {
      this.orderForm.get('serviceId')?.markAsTouched();
      this.orderForm.get('description')?.markAsTouched();
      if (this.orderForm.get('serviceId')?.invalid || this.orderForm.get('description')?.invalid) return;
    }
    if (this.currentStep === 3) {
      this.orderForm.get('address')?.markAsTouched();
      this.orderForm.get('latitude')?.markAsTouched();
      this.orderForm.get('scheduledDate')?.markAsTouched();
      this.orderForm.get('scheduledSlot')?.markAsTouched();
      if (this.orderForm.get('address')?.invalid || this.orderForm.get('latitude')?.invalid || this.orderForm.get('scheduledDate')?.invalid || this.orderForm.get('scheduledSlot')?.invalid) return;
      
      this.isLocating = true;
      const lat = this.orderForm.get('latitude')?.value;
      const lng = this.orderForm.get('longitude')?.value;
      
      this.orderService.checkServiceAvailability(lat, lng).subscribe({
        next: (res: any) => {
          this.isLocating = false;
          if (!res.available) {
            this.errorMessage = 'Service is currently unavailable in your area. We do not have any registered technicians nearby.';
            this.cdr.detectChanges();
          } else {
            this.errorMessage = null;
            this.currentStep++;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.isLocating = false;
          this.errorMessage = null;
          this.currentStep++;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.cdr.detectChanges();
        }
      });
      return;
    }
    this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevStep(): void {
    this.currentStep--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSubmit(): void {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { brand, model, customModel, serviceId, description, address, latitude, longitude, scheduledDate, scheduledSlot } = this.orderForm.value;
    const finalModel = model === 'Other / Custom Model' ? customModel : model;
    const selectedService = this.services.find(s => s.id === Number(serviceId));

    const payload = {
      userId: 1, // mock
      deviceId: 1, // mock
      serviceCategoryId: Number(serviceId),
      estimatedTime: selectedService?.time || 30,
      notes: `${brand} ${finalModel} - ${description}`,
      address,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      scheduledDate,
      scheduledSlot
    };

    this.orderService.createOrder(String(payload.deviceId), payload).subscribe({
      next: (res: OrderResponse) => {
        this.isLoading = false;
        const orderId = res.id || res.orderId;
        localStorage.setItem('activeOrderId', String(orderId));
        this.router.navigate([`/order/searching-technician/${orderId}`]);
      },
      error: (err: any) => {
        console.warn('Backend order creation failed, running demo fallback...', err);
        // Demo fallback: simulate success
        setTimeout(() => {
          this.isLoading = false;
          const mockOrderId = String(Math.floor(100000 + Math.random() * 900000));
          localStorage.setItem('activeOrderId', mockOrderId);
          this.router.navigate([`/order/searching-technician/${mockOrderId}`]);
        }, 1000);
      }
    });
  }
}
