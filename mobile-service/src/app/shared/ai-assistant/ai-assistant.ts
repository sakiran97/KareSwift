import { Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  isActionable?: boolean;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ]),
    trigger('messageFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  isOpen = false;
  isMaximized = false;
  inputText = '';
  isLoading = false;

  messages: ChatMessage[] = [
    { sender: 'ai', text: 'Hi! I am your AI Diagnostics Assistant. How can I help you fix your device today?' }
  ];

  constructor(
    private aiService: AiService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  toggleMaximize(event: Event) {
    event.stopPropagation();
    this.isMaximized = !this.isMaximized;
  }

  closeChat(event: Event) {
    event.stopPropagation();
    this.isOpen = false;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  async sendMessage() {
    if (!this.inputText.trim()) return;

    const userMessage = this.inputText;
    this.messages.push({ sender: 'user', text: userMessage });
    this.inputText = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      // Determine if it's a diagnostic query or general chat
      const isDiagnostic = userMessage.toLowerCase().includes('broken') || 
                           userMessage.toLowerCase().includes('screen') ||
                           userMessage.toLowerCase().includes('battery') ||
                           userMessage.toLowerCase().includes('fix');

      let response: { result: string };
      if (isDiagnostic) {
        response = await firstValueFrom(this.aiService.diagnoseDevice(userMessage));
      } else {
        response = await firstValueFrom(this.aiService.supportChat(userMessage));
      }

      this.messages.push({ 
        sender: 'ai', 
        text: response?.result || 'I encountered an error. Please try again.',
        isActionable: isDiagnostic // Add book repair button if diagnostic
      });
    } catch (error) {
      this.messages.push({ sender: 'ai', text: 'Sorry, I am currently unable to reach the diagnostic server.' });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  bookRepair() {
    this.isOpen = false;
    this.router.navigate(['/order/create']);
  }
}
