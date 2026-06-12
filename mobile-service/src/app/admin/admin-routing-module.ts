import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayout } from './admin-layout';
import { CreateTechnician } from './create-technician/create-technician';
import { DashboardComponent } from './dashboard/dashboard';
import { KycReviewComponent } from './kyc-review/kyc-review';
import { ShopReviewComponent } from './shop-review/shop-review';
import { TechniciansComponent } from './technicians/technicians';
import { ConfigComponent } from './config/config';
import { OrdersComponent } from './orders/orders';

const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'create-technician', component: CreateTechnician },
      { path: 'kyc-review', component: KycReviewComponent },
      { path: 'shop-review', component: ShopReviewComponent },
      { path: 'technicians', component: TechniciansComponent },
      { path: 'config', component: ConfigComponent },
      { path: 'orders', component: OrdersComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
