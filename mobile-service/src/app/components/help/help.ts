import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FAQ {
  question: string;
  answer: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './help.html',
  styleUrl: './help.scss'
})
export class Help {
  searchQuery = '';
  faqs: FAQ[] = [
    {
      question: 'How does doorstep device repair work?',
      answer: 'You select your device category (smartphone, laptop, etc.), specify the issue, and get a price estimate. Once you book, a certified technician is dispatched to your location and repairs the device on-site right in front of you.',
      isOpen: false
    },
    {
      question: 'Are the technicians certified?',
      answer: 'Yes! All KareSwift specialists are fully certified hardware engineers who undergo background checks and rigorous practical exams before joining our network.',
      isOpen: false
    },
    {
      question: 'Is my data safe during doorstep repairs?',
      answer: 'Absolutely. Because the repair takes place at your location, you can watch the entire process. Your device never leaves your sight, ensuring complete privacy.',
      isOpen: false
    },
    {
      question: 'What happens if you cannot fix my device?',
      answer: 'We operate on a "No Fix, No Fee" policy. If our technician is unable to diagnose or repair the issue on-site, you pay absolutely nothing.',
      isOpen: false
    },
    {
      question: 'Do you offer a warranty on repairs?',
      answer: 'Yes, we provide a 90-day comprehensive warranty on all parts and repair services. If any issue arises from our repair, we will come back and fix it free of charge.',
      isOpen: false
    }
  ];

  filteredFaqs(): FAQ[] {
    if (!this.searchQuery.trim()) {
      return this.faqs;
    }
    return this.faqs.filter(
      f =>
        f.question.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  toggleFaq(index: number): void {
    const faq = this.filteredFaqs()[index];
    // Find matching item in original list and toggle it
    const originalIndex = this.faqs.findIndex(f => f.question === faq.question);
    if (originalIndex !== -1) {
      this.faqs[originalIndex].isOpen = !this.faqs[originalIndex].isOpen;
    }
  }
}
