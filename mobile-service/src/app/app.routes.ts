import { Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';
import { About } from './components/about/about';
import { Contact } from './components/contact/contact';
import { Help } from './components/help/help';
import { ProfileComponent } from './components/profile/profile';
import { Rewards } from './components/rewards/rewards';
import { WalletComponent } from './components/wallet/wallet';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('./auth/auth-module').then(m => m.AuthModule) },
  { path: 'order', loadChildren: () => import('./order/order-module').then(m => m.OrderModule) },
  { path: 'technician', loadChildren: () => import('./technician/technician-module').then(m => m.TechnicianModule) },
  { path: 'admin', loadChildren: () => import('./admin/admin-module').then(m => m.AdminModule), canActivate: [RoleGuard] },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'help', component: Help },
  { path: 'profile', component: ProfileComponent },
  { path: 'rewards', component: Rewards },
  { path: 'wallet', component: WalletComponent },
];
