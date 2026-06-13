import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './dashboard/dashboard';
import { ConfigComponent } from './config/config';
import { OrdersComponent } from './orders/orders';
import { ServiceAreasComponent } from './service-areas/service-areas';
import { SlotsComponent } from './slots/slots';
import { ServicesListComponent } from './services-list/services-list';
import { ReviewsComponent } from './reviews/reviews';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'service-areas', component: ServiceAreasComponent },
      { path: 'slots', component: SlotsComponent },
      { path: 'services', component: ServicesListComponent },
      { path: 'reviews', component: ReviewsComponent },
      { path: 'config', component: ConfigComponent }
    ]
  },
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  { path: '**', redirectTo: 'admin' }
];
