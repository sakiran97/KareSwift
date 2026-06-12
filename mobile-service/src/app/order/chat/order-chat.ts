import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SseService, SseEvent } from '../../services/sse.service';

@Component({
  selector: 'app-order-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-chat.html',
  styleUrl: './order-chat.scss'
})
export class OrderChat implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  orderId = '';
  currentUser: any = null;
  order: any = null;
  messages: any[] = [];
  newMessage = '';
  loading = true;
  error = '';
  sending = false;

  private sseSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private sseService: SseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    this.route.paramMap.subscribe((params: any) => {
      this.orderId = params.get('id') || '';
      if (this.orderId) {
        this.loadOrderDetails();
        this.loadMessages();
        this.setupRealtimeChat();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sseSub) {
      this.sseSub.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  loadOrderDetails(): void {
    this.http.get(`/api/orders/${this.orderId}`).subscribe({
      next: (res: any) => {
        this.order = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load order info:', err);
      }
    });
  }

  loadMessages(): void {
    this.loading = true;
    this.http.get<any[]>(`/api/chat/${this.orderId}/messages`).subscribe({
      next: (res: any[]) => {
        this.messages = res || [];
        this.loading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('Failed to load messages:', err);
        this.error = 'Failed to load chat history.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setupRealtimeChat(): void {
    this.sseSub = this.sseService.connect().subscribe({
      next: (event: SseEvent) => {
        if (event.type === 'chat-message') {
          const msg = event.data;
          if (String(msg.orderId) === this.orderId) {
            // Avoid duplicates
            if (!this.messages.some(m => m.id === msg.id)) {
              this.messages.push(msg);
              this.cdr.detectChanges();
              this.scrollToBottom();
            }
          }
        }
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.sending) return;

    const content = this.newMessage.trim();
    this.newMessage = '';
    this.sending = true;
    this.cdr.detectChanges();

    this.http.post(`/api/chat/${this.orderId}/messages`, { content }).subscribe({
      next: (res: any) => {
        this.sending = false;
        // Avoid duplicate push if SSE arrives first
        if (!this.messages.some(m => m.id === res.id)) {
          this.messages.push(res);
        }
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('Failed to send message:', err);
        this.sending = false;
        this.cdr.detectChanges();
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  getRecipientName(): string {
    if (!this.order) return 'Repair Support';
    if (this.currentUser?.role === 'technician') {
      return this.order.user?.name || 'Customer';
    } else {
      return this.order.technician?.name || 'Assigned Technician';
    }
  }

  getRecipientRole(): string {
    if (!this.order) return '';
    return this.currentUser?.role === 'technician' ? 'Customer' : 'Specialist';
  }

  getBackUrl(): string {
    if (this.currentUser?.role === 'technician') {
      return `/technician/orders/${this.orderId}`;
    }
    return `/order/track/${this.orderId}`;
  }
}
