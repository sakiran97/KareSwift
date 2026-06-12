import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ScrollAnimateDirective } from '../../directives/scroll-animate.directive';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollAnimateDirective],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  isLoggedIn(): boolean {
    return localStorage.getItem('jwt') !== null;
  }
}
