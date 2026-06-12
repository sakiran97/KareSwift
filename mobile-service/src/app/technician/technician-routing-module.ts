import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TechnicianLogin } from './login/technician-login';
import { TechnicianDashboard } from './dashboard/technician-dashboard';
import { TechnicianOrders } from './orders/technician-orders';
import { OrderDetail } from './orders/order-detail';
import { TechnicianProfile } from './profile/technician-profile';
import { TechnicianNewOrders } from './new-orders/technician-new-orders';
import { TechnicianGuard } from '../guards/technician.guard';
import { VerificationPending } from './verification-pending/verification-pending';

const routes: Routes = [
  { path: 'login', component: TechnicianLogin },
  { path: 'dashboard', component: TechnicianDashboard, canActivate: [TechnicianGuard] },
  { path: 'orders', component: TechnicianOrders, canActivate: [TechnicianGuard] },
  { path: 'orders/:id', component: OrderDetail, canActivate: [TechnicianGuard] },
  { path: 'new-orders', component: TechnicianNewOrders, canActivate: [TechnicianGuard] },
  { path: 'profile', component: TechnicianProfile, canActivate: [TechnicianGuard] },
  { path: 'verification-pending', component: VerificationPending, canActivate: [TechnicianGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TechnicianRoutingModule {}
