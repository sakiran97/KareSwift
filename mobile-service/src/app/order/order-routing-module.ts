import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeviceSelect } from './device-select/device-select';
import { CreateOrder } from './create-order/create-order';
import { TrackOrder } from './track-order/track-order';
import { Feedback } from './feedback/feedback';
import { OrderHistory } from './order-history/order-history';
import { OrderChat } from './chat/order-chat';
import { Diagnostic } from './diagnostic/diagnostic';
import { WarrantyList } from './warranty/warranty-list';
import { SearchingTechnician } from './searching-technician/searching-technician';

const routes: Routes = [
  { path: 'device-select', component: DeviceSelect },
  { path: 'create', component: CreateOrder },
  { path: 'searching-technician/:id', component: SearchingTechnician },
  { path: 'track/:id', component: TrackOrder },
  { path: 'feedback/:id', component: Feedback },
  { path: 'history', component: OrderHistory },
  { path: 'chat/:id', component: OrderChat },
  { path: 'diagnostic', component: Diagnostic },
  { path: 'warranty', component: WarrantyList },
  { path: '', redirectTo: 'device-select', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrderRoutingModule {}
