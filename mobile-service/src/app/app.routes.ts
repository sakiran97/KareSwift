import { Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';
import { AuthGuard } from './guards/auth.guard';
import { About } from './components/about/about';
import { Contact } from './components/contact/contact';
import { Help } from './components/help/help';
import { ProfileComponent } from './components/profile/profile';
import { HomeComponent } from './components/home/home';

export const routes: Routes = [
  { path: '', redirectTo: 'order/device-select', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'auth', loadChildren: () => import('./auth/auth-module').then(m => m.AuthModule) },
  { path: 'order', loadChildren: () => import('./order/order-module').then(m => m.OrderModule) },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'help', component: Help },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'order/device-select' }
];
