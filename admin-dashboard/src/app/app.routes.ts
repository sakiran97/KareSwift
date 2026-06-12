import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './dashboard/dashboard';
import { KycReviewComponent } from './kyc-review/kyc-review';
import { ShopReviewComponent } from './shop-review/shop-review';
import { ConfigComponent } from './config/config';
import { TechniciansComponent } from './technicians/technicians';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'kyc-review', component: KycReviewComponent },
      { path: 'shop-review', component: ShopReviewComponent },
      { path: 'config', component: ConfigComponent },
      { path: 'technicians', component: TechniciansComponent }
    ]
  },
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  { path: '**', redirectTo: 'admin' }
];
