import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './diagnostic.html',
  styleUrl: './diagnostic.scss'
})
export class Diagnostic implements OnInit {
  step = 1;
  
  // Category Selection
  categories = [
    { id: 1, name: 'Screen Replacement', icon: '📱', desc: 'Cracked, flickering, or unresponsive display' },
    { id: 2, name: 'Battery Swap', icon: '🔋', desc: 'Fast draining, swelling, or won\'t charge' },
    { id: 3, name: 'Software Fix', icon: '⚙️', desc: 'Boot loops, freezing, or OS glitches' },
    { id: 4, name: 'Water Damage Repair', icon: '💧', desc: 'Liquid exposure, corrosion, or short circuit' },
    { id: 5, name: 'Charging Port Fix', icon: '🔌', desc: 'Loose port, slow charging, or no connection' },
    { id: 6, name: 'Camera Repair', icon: '📷', desc: 'Blurry lens, autofocus failure, or black screen' }
  ];
  selectedCategoryId: number | null = null;
  
  // Symptoms
  symptoms: string[] = [];
  notes = '';
  
  // Pre-checks
  restarted = false;
  updated = false;
  originalCharger = false;

  // Diagnosis Estimate
  diagnosedIssue = '';
  estimatedTime = 45;
  estimatedCostRange = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  selectCategory(id: number): void {
    this.selectedCategoryId = id;
    this.step = 2;
    this.cdr.detectChanges();
  }

  nextStep(): void {
    if (this.step === 2) {
      this.step = 3;
    } else if (this.step === 3) {
      this.calculateDiagnosis();
      this.step = 4;
    }
    this.cdr.detectChanges();
  }

  prevStep(): void {
    if (this.step > 1) {
      this.step--;
    }
    this.cdr.detectChanges();
  }

  calculateDiagnosis(): void {
    const category = this.categories.find(c => c.id === this.selectedCategoryId);
    if (!category) return;

    this.diagnosedIssue = category.name + ' Issue Detected';
    
    // Estimate details based on category
    switch (this.selectedCategoryId) {
      case 1:
        this.diagnosedIssue = 'Glass & Panel Replacement required';
        this.estimatedTime = 30;
        this.estimatedCostRange = '₹1,500 - ₹3,500';
        break;
      case 2:
        this.diagnosedIssue = 'Battery cell degradation detected';
        this.estimatedTime = 20;
        this.estimatedCostRange = '₹999 - ₹1,800';
        break;
      case 3:
        this.diagnosedIssue = 'Firmware/OS flashing needed';
        this.estimatedTime = 45;
        this.estimatedCostRange = '₹499 - ₹899';
        break;
      case 4:
        this.diagnosedIssue = 'Motherboard dehydration & cleaning required';
        this.estimatedTime = 90;
        this.estimatedCostRange = '₹1,800 - ₹4,500';
        break;
      case 5:
        this.diagnosedIssue = 'Charging flex sub-board corrosion/loose connection';
        this.estimatedTime = 30;
        this.estimatedCostRange = '₹799 - ₹1,200';
        break;
      case 6:
        this.diagnosedIssue = 'Camera module sensor failure';
        this.estimatedTime = 40;
        this.estimatedCostRange = '₹1,200 - ₹2,500';
        break;
      default:
        this.diagnosedIssue = 'General hardware diagnosis required';
        this.estimatedTime = 60;
        this.estimatedCostRange = '₹500 - ₹1,500';
    }
  }

  bookRepair(): void {
    // Navigate to create order with query params prefilled
    this.router.navigate(['/order/create'], {
      queryParams: {
        category: this.selectedCategoryId,
        notes: `AI Auto-Diagnosis: ${this.diagnosedIssue}. Details: ${this.notes}`
      }
    });
  }
}
