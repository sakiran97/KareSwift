import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing-module';
import { AdminLayout } from './admin-layout';

@NgModule({
  imports: [CommonModule, AdminRoutingModule, AdminLayout],
})
export class AdminModule {}
