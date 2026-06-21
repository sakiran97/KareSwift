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
  Math = Math;
  
  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }
  orders: any[] = [];
  filteredOrders: any[] = [];
  loading = true;
  error = '';
  
  // Search & Filters
  searchQuery = '';
  statusFilter = 'ALL';

  // Pagination & Sorting
  currentPage = 1;
  pageSize = 5;
  sortColumn = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  totalPages = 1;
  totalFiltered = 0;

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
    let result = this.orders.filter(order => {
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

    // Sort the results
    result.sort((a, b) => {
      let valA, valB;
      switch (this.sortColumn) {
        case 'id':
          valA = a.id; valB = b.id;
          break;
        case 'status':
          valA = a.status; valB = b.status;
          break;
        case 'service':
          valA = a.serviceCategory?.name || ''; valB = b.serviceCategory?.name || '';
          break;
        case 'date':
        default:
          valA = new Date(a.createdAt || 0).getTime(); valB = new Date(b.createdAt || 0).getTime();
          break;
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.totalFiltered = result.length;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    // Paginate
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.filteredOrders = result.slice(startIndex, startIndex + this.pageSize);

    this.cdr.detectChanges();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'date' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
    }
  }

  onFilterChange(status: string): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
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
