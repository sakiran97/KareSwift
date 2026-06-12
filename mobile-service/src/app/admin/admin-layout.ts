import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  template: ` <div class="admin-context"><router-outlet></router-outlet></div> `,
  standalone: true,
  imports: [RouterOutlet],
})
export class AdminLayout {}
