import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-history.html',
  styleUrl: './order-history.scss',
})
export class OrderHistory implements OnInit {
  orders: any[] = [];
  filteredOrders: any[] = [];
  loading = true;
  error = '';
  
  // Search & Filters
  searchQuery = '';
  statusFilter = 'ALL';

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getUserOrders().subscribe({
      next: (res: any[]) => {
        this.orders = res || [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load orders', err);
        this.error = 'Failed to load order history. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    this.filteredOrders = this.orders.filter(order => {
      // Filter by status
      let matchesStatus = true;
      if (this.statusFilter === 'ACTIVE') {
        matchesStatus = ['PENDING', 'CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS'].includes(order.status);
      } else if (this.statusFilter === 'COMPLETED') {
        matchesStatus = order.status === 'COMPLETED';
      } else if (this.statusFilter === 'CANCELLED') {
        matchesStatus = order.status === 'CANCELLED';
      }

      // Filter by search query
      let matchesSearch = true;
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const brand = (order.device?.brand || '').toLowerCase();
        const model = (order.device?.model || '').toLowerCase();
        const service = (order.serviceCategory?.name || '').toLowerCase();
        const address = (order.address || '').toLowerCase();
        const id = `ord-${order.id}`.toLowerCase();

        matchesSearch = brand.includes(query) || 
                        model.includes(query) || 
                        service.includes(query) || 
                        address.includes(query) ||
                        id.includes(query);
      }

      return matchesStatus && matchesSearch;
    });
    this.cdr.detectChanges();
  }

  onFilterChange(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  // Invoice modal handlers were removed in accordance with Phase 5 (Remove Payment & Price Estimation)

  getDaysRemaining(createdAt: string): number {
    const warrantyEnd = new Date(createdAt);
    warrantyEnd.setDate(warrantyEnd.getDate() + 90);
    const today = new Date();
    const diffTime = warrantyEnd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
}
